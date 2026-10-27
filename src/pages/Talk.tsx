import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { LlmClient, LoadProgress } from '../agent/llmClient';
import { absorbOwnerTurn, commitAgentTurn, planOpening, startAssessment, type Plan } from '../agent/orchestrator';
import { RuleBasedClient } from '../agent/ruleBasedClient';
import { getClient, switchToRuleBased, type ModeInfo } from '../agent/session';
import { topThree, weightedScore, riskGate } from '../engine/ranking';
import { STAGES } from '../knowledge/flow';
import { ACTIONS, STAGE_LABELS } from '../knowledge/persona';
import { getAssessmentForCase, getCase, getSettings, saveAssessment, saveSettings } from '../storage/db';
import { listen, speak, sttSupported, stopSpeaking, type Listener } from '../speech/speech';
import type { Assessment } from '../types';

const actionLabel = (id?: string) => ACTIONS.find((a) => a.id === id)?.label ?? '';

export default function Talk() {
  const { id } = useParams();
  const c = getCase(id || '');
  const [a, setA] = useState<Assessment | null>(null);
  const [mode, setMode] = useState<ModeInfo | null>(null);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(!getSettings().speakReplies);
  const [micError, setMicError] = useState('');
  const client = useRef<LlmClient | null>(null);
  const listener = useRef<Listener | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const say = (text: string) => {
    if (!muted) speak(text);
  };

  const run = async (assessment: Assessment, plan: Plan) => {
    setBusy(true);
    const active: LlmClient = client.current ?? new RuleBasedClient();
    const reply = await active.reply(plan, assessment.turns);
    commitAgentTurn(assessment, plan, reply);
    assessment.mode = client.current?.kind ?? 'rule';
    saveAssessment(assessment);
    setA(structuredClone(assessment));
    setBusy(false);
    say(reply.say);
  };

  // Boot: choose AI mode, load model if needed, then resume or open the conversation.
  useEffect(() => {
    if (!c) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const s = await getClient(setProgress);
      if (cancelled) return;
      setMode(s.info);
      try {
        await s.ready;
        client.current = s.client;
      } catch {
        const r = switchToRuleBased();
        client.current = r.client;
        setMode({ mode: 'rule', reason: 'טעינת המודל נכשלה — עברנו למצב כללים' });
      }
      if (cancelled) return;
      setLoading(false);
      const existing = getAssessmentForCase(c.id);
      if (existing && existing.status === 'active' && existing.flow) {
        setA(existing);
      } else {
        const fresh = startAssessment(c);
        await run(fresh, planOpening(c, fresh));
      }
    })();
    return () => {
      cancelled = true;
      listener.current?.stop();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Braces matter: newer browsers return a Promise from scrollIntoView, which React would treat as a cleanup.
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [a?.turns.length, interim]);

  if (!c) return <p>התיק לא נמצא. <Link to="/cases">חזרה לתיקים</Link></p>;

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || !a || busy || a.status === 'closed') return;
    stopSpeaking();
    client.current?.interrupt();
    setInput('');
    setInterim('');
    const work = structuredClone(a);
    const plan = absorbOwnerTurn(c, work, t);
    setA(structuredClone(work));
    await run(work, plan);
  };

  const toggleMic = () => {
    if (listening) {
      listener.current?.stop();
      return;
    }
    stopSpeaking(); // interrupting the agent
    client.current?.interrupt();
    setMicError('');
    listener.current = listen({
      onInterim: setInterim,
      onFinal: (t) => send(t),
      onSpeechStart: stopSpeaking,
      onEnd: () => setListening(false),
      onError: (m) => setMicError(m === 'not-allowed' ? 'אין הרשאה למיקרופון.' : `שגיאת זיהוי דיבור: ${m}`),
    });
    setListening(!!listener.current);
  };

  const restart = async () => {
    if (!confirm('להתחיל שיחה חדשה? השיחה הנוכחית תיסגר.')) return;
    if (a) saveAssessment({ ...a, status: 'closed' });
    const fresh = startAssessment(c);
    await run(fresh, planOpening(c, fresh));
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    if (m) stopSpeaking();
    saveSettings({ ...getSettings(), speakReplies: !m });
  };

  const ranked = a ? topThree(a.opportunities) : [];
  const stageIdx = a ? STAGES.indexOf(a.flow.stage) : 0;

  if (loading && mode?.mode === 'webllm') {
    const pct = Math.round((progress?.progress ?? 0) * 100);
    return (
      <section className="stack" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1>טוען את המודל המקומי</h1>
        <p>
          הסוכן רץ כולו על המכשיר שלך, בלי שרת ובלי מפתח API. בפעם הראשונה הדפדפן מוריד את המודל (מאות MB עד כמה GB), ואחר כך
          הוא נשמר במטמון ולא יורד שוב.
        </p>
        <div className="progress" aria-label="התקדמות הורדה">
          <div style={{ width: `${pct}%` }} />
        </div>
        <p className="small muted num">{pct}% · {progress?.text ?? 'מתחיל…'}</p>
        <button
          className="secondary"
          onClick={() => {
            const r = switchToRuleBased();
            client.current = r.client;
            setMode(r.info);
            setLoading(false);
            const existing = getAssessmentForCase(c.id);
            if (existing && existing.status === 'active' && existing.flow) setA(existing);
            else {
              const fresh = startAssessment(c);
              run(fresh, planOpening(c, fresh));
            }
          }}
        >
          להתחיל עכשיו במצב כללים (בלי להמתין)
        </button>
        <p className="small muted">אפשר לבחור מודל קטן יותר ב<Link to="/settings">הגדרות</Link> למכשירים חלשים.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>שיחה עם {c.name}</h1>
        <div className="row no-print">
          <Link className="btn secondary" to={`/case/${c.id}`}>התיק</Link>
          {a && <Link className="btn secondary" to={`/case/${c.id}/simulator`}>סימולטור</Link>}
          {a && <Link className="btn secondary" to={`/case/${c.id}/report`}>דוחות</Link>}
          <button className="secondary" onClick={restart}>שיחה חדשה</button>
        </div>
      </div>

      {mode && (
        <div className={`banner ${mode.mode === 'rule' ? 'warn' : ''}`}>
          {mode.mode === 'webllm' ? `מצב: ${client.current?.label ?? 'מודל מקומי'} · ${mode.reason}` : `מצב: מנוע כללים · ${mode.reason}. השיחה עובדת, רק פחות גמישה.`}
        </div>
      )}
      {!c.brief && <div className="banner warn">אין תדריך לתיק הזה — הסוכן יעבוד עם פחות הקשר. <Link to={`/case/${c.id}`}>ליצירת תדריך</Link></div>}

      <ol className="row small" style={{ listStyle: 'none', padding: 0, gap: '0.35rem' }} aria-label="שלבי השיחה">
        {STAGES.map((s, i) => (
          <li key={s} className={`pill ${i < stageIdx ? 'ok' : i === stageIdx ? '' : 'muted'}`} style={i > stageIdx ? { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' } : undefined}>
            {STAGE_LABELS[s]}
          </li>
        ))}
      </ol>

      <div className="talk-grid">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 420 }}>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '60vh' }} aria-live="polite">
            {a?.turns.map((t, i) => (
              <div key={i} style={{ margin: '0.5rem 0', textAlign: t.role === 'agent' ? 'start' : 'end' }}>
                <div
                  style={{
                    display: 'inline-block',
                    maxWidth: '85%',
                    padding: '0.55rem 0.8rem',
                    borderRadius: 12,
                    background: t.role === 'agent' ? 'var(--accent-soft)' : 'var(--bg)',
                    border: '1px solid var(--border)',
                    textAlign: 'start',
                  }}
                >
                  {t.text}
                  {t.role === 'agent' && t.action && <div className="small muted">{actionLabel(t.action)}</div>}
                </div>
              </div>
            ))}
            {interim && <p className="muted" style={{ textAlign: 'end' }}>{interim}…</p>}
            {busy && <p className="muted small">הסוכן חושב…</p>}
            <div ref={bottom} />
          </div>

          {a?.status === 'closed' ? (
            <div className="banner">
              השיחה הסתיימה. <Link to={`/case/${c.id}/report`}>לדוח ללקוח ולתיק של בארי</Link>
            </div>
          ) : (
            <div className="stack" style={{ marginTop: '0.75rem' }}>
              <div className="row">
                {sttSupported() ? (
                  <button onClick={toggleMic} aria-pressed={listening} className={listening ? 'danger' : ''}>
                    {listening ? '■ עצירה' : '🎤 דברו'}
                  </button>
                ) : null}
                <button className="secondary" onClick={toggleMute} aria-pressed={muted}>
                  {muted ? '🔇 קול כבוי' : '🔊 קול פעיל'}
                </button>
                <button className="secondary" onClick={() => stopSpeaking()}>
                  קטיעת הסוכן
                </button>
              </div>
              {!sttSupported() && <p className="small muted">זיהוי דיבור לא נתמך בדפדפן הזה (עובד הכי טוב ב-Chrome או Edge). אפשר להקליד.</p>}
              {micError && <p className="small" style={{ color: 'var(--danger)' }}>{micError}</p>}
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <input style={{ flex: 1, minWidth: 0 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="הקלידו תשובה…" aria-label="תשובה" />
                <button type="submit" disabled={busy || !input.trim()}>
                  שליחה
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <h3>הזדמנויות מובילות</h3>
            {ranked.length === 0 ? (
              <p className="small muted">עוד אין מספיק בסיס. הסוכן מקשיב קודם.</p>
            ) : (
              <ol className="small">
                {ranked.map((r) => (
                  <li key={r.opp.id} style={{ marginBottom: '0.5rem' }}>
                    <b>{r.opp.name}</b>
                    <div className="row">
                      <span className="pill num">{weightedScore(r.opp.scores)}</span>
                      <span className={`pill ${r.opp.status === 'interested' ? 'ok' : ''}`}>
                        {r.opp.status === 'interested' ? 'עניין' : r.opp.status === 'discussed' ? 'נדון' : 'השערה'}
                      </span>
                      {riskGate(r.opp.risks).status === 'review' && <span className="pill warn">דורש בדיקה</span>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="card small">
            <h3>מה הסוכן כבר יודע</h3>
            <p className="muted">פערים שנסגרו: {a?.flow.filledGaps.length ?? 0}</p>
            {a?.rejectedTemplates.length ? <p className="muted">כיוונים שנדחו: {a.rejectedTemplates.length}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { buildBrief, textToFacts } from '../intake/brief';
import { extractPdfText, fetchUrlText, readTextFile } from '../intake/extract';
import { INDUSTRIES } from '../knowledge/industries';
import { deleteCase, getCase, logAction, now, saveCase, uid, useStoreVersion } from '../storage/db';
import type { BusinessCase, Level, ProcessInfo, Source } from '../types';

const lines = (s: string) => s.split(/\n|,/).map((x) => x.trim()).filter(Boolean);

export default function CaseDetail() {
  useStoreVersion();
  const { id } = useParams();
  const nav = useNavigate();
  const c = getCase(id || '');
  const [url, setUrl] = useState('');
  const [pasted, setPasted] = useState('');
  const [permission, setPermission] = useState(true);
  const [reliability, setReliability] = useState<Level>('medium');
  const [status, setStatus] = useState('');
  const [proc, setProc] = useState({ name: '', steps: '', people: '', systems: '', volume: '', minutes: '' });

  if (!c) return <p>התיק לא נמצא. <Link to="/cases">חזרה לתיקים</Link></p>;
  const update = (patch: Partial<BusinessCase>) => saveCase({ ...c, ...patch });

  const addSource = (kind: Source['kind'], label: string, text: string, tags: string[] = []) => {
    if (!permission) {
      setStatus('יש לאשר שקיימת הרשאה לשימוש במקור לפני הוספה.');
      return;
    }
    const src: Source = { id: uid(), kind, label, addedAt: now(), permission, reliability, tags };
    const facts = textToFacts(text, src.id, src.id);
    const flagged = facts.filter((f) => f.flagged).length;
    update({ sources: [...c.sources, src], facts: [...c.facts, ...facts], brief: undefined });
    logAction('add-source', `${c.id}:${kind}:${label}`);
    setStatus(`נוסף מקור "${label}" עם ${facts.length} עובדות${flagged ? `, ${flagged} סומנו כהוראות חשודות ולא יבוצעו` : ''}.`);
  };

  const onUrl = async () => {
    if (!url.trim()) return;
    if (pasted.trim()) {
      addSource('url', url.trim(), pasted, ['אתר']);
      setPasted('');
      setUrl('');
      return;
    }
    setStatus('מנסה לקרוא את האתר…');
    const r = await fetchUrlText(url.trim());
    if (r.ok) {
      addSource('url', url.trim(), r.text, ['אתר']);
      setUrl('');
    } else {
      setStatus('האתר חוסם קריאה ישירה מהדפדפן (CORS). העתיקו את הטקסט מהאתר לתיבה למטה ולחצו שוב "הוספה".');
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      try {
        setStatus(`מחלץ טקסט מ-${f.name}…`);
        const text = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') ? await extractPdfText(f) : await readTextFile(f);
        addSource(f.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text', f.name, text, ['מסמך']);
      } catch (e) {
        setStatus(`לא הצלחתי לקרוא את ${f.name}: ${(e as Error).message}`);
      }
    }
  };

  const addProcess = () => {
    if (!proc.name.trim()) return;
    const p: ProcessInfo = {
      id: uid(),
      name: proc.name.trim(),
      steps: lines(proc.steps),
      people: lines(proc.people),
      systems: lines(proc.systems),
      decisionPoints: [],
      volumePerMonth: Number(proc.volume) || undefined,
      minutesPerAction: Number(proc.minutes) || undefined,
      sourceIds: ['barry'],
    };
    update({ processes: [...c.processes, p], brief: undefined });
    setProc({ name: '', steps: '', people: '', systems: '', volume: '', minutes: '' });
  };

  const genBrief = () => {
    update({ brief: buildBrief(c) });
    logAction('build-brief', c.id);
  };

  const srcLabel = (sid: string) => (sid === 'barry' ? 'בארי' : c.sources.find((s) => s.id === sid)?.label || sid);
  const b = c.brief;

  return (
    <section className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{c.name}</h1>
        <div className="row">
          <Link className="btn" to={`/case/${c.id}/talk`}>
            התחלת שיחה
          </Link>
          <button
            className="danger"
            onClick={() => {
              if (confirm('למחוק את התיק וכל המידע שנגזר ממנו?')) {
                deleteCase(c.id);
                nav('/cases');
              }
            }}
          >
            מחיקת תיק
          </button>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>פרטי העסק</h3>
          <div className="field">
            <label>ענף</label>
            <select value={c.industry} onChange={(e) => update({ industry: e.target.value as BusinessCase['industry'] })}>
              {INDUSTRIES.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>גודל</label>
            <input value={c.size} onChange={(e) => update({ size: e.target.value })} placeholder="למשל: 12 עובדים" />
          </div>
          <div className="field">
            <label>תיאור מוצר / שירות</label>
            <textarea value={c.description} onChange={(e) => update({ description: e.target.value })} />
          </div>
          <div className="field">
            <label>מערכות קיימות (פסיק בין ערכים)</label>
            <input value={c.systems.join(', ')} onChange={(e) => update({ systems: lines(e.target.value) })} />
          </div>
          <div className="field">
            <label>מטרות עסקיות (שורה לכל מטרה)</label>
            <textarea value={c.goals.join('\n')} onChange={(e) => update({ goals: e.target.value.split('\n') })} />
          </div>
          <div className="field">
            <label className="row">
              <input type="checkbox" style={{ width: 'auto' }} checked={c.consent.store} onChange={(e) => update({ consent: { ...c.consent, store: e.target.checked } })} />
              בעל העסק הסכים לשמירת המידע
            </label>
            <label className="row">
              <input type="checkbox" style={{ width: 'auto' }} checked={c.consent.transcript} onChange={(e) => update({ consent: { ...c.consent, transcript: e.target.checked } })} />
              בעל העסק הסכים לתמלול השיחה
            </label>
          </div>
        </div>

        <div className="card">
          <h3>מקורות מידע</h3>
          <p className="small muted">כל תוכן מאתר או ממסמך נשמר כמידע בלבד — לא כהוראות לסוכן. אין צורך בנתוני לקוחות אמיתיים בשלב זה.</p>
          <div className="field">
            <label>כתובת אתר ציבורית</label>
            <input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.co.il" />
          </div>
          <div className="field">
            <label>טקסט מהאתר / הערות (אם האתר חוסם קריאה)</label>
            <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} />
          </div>
          <div className="row" style={{ marginTop: '0.5rem' }}>
            <button onClick={onUrl}>הוספה</button>
            <button className="secondary" onClick={() => pasted.trim() && (addSource('text', 'הערות בארי', pasted), setPasted(''))}>
              הוספה כטקסט חופשי
            </button>
          </div>
          <div className="field">
            <label>העלאת PDF / קובץ טקסט (הצעות מחיר, קטלוג, תיאור תהליכים)</label>
            <input type="file" accept=".pdf,.txt,.md,.csv" multiple onChange={(e) => onFiles(e.target.files)} />
          </div>
          <div className="row small">
            <label className="row">
              <input type="checkbox" style={{ width: 'auto' }} checked={permission} onChange={(e) => setPermission(e.target.checked)} />
              יש הרשאה להשתמש במקור
            </label>
            <select style={{ width: 'auto' }} value={reliability} onChange={(e) => setReliability(e.target.value as Level)}>
              <option value="high">אמינות גבוהה</option>
              <option value="medium">אמינות בינונית</option>
              <option value="low">אמינות נמוכה</option>
            </select>
          </div>
          {status && <p className="banner small">{status}</p>}
          <ul className="small">
            {c.sources.map((s) => (
              <li key={s.id}>
                {s.label} <span className="pill">{s.kind}</span> · {c.facts.filter((f) => f.sourceId === s.id).length} עובדות
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <h3>תהליכים מרכזיים</h3>
        <div className="grid3">
          <div className="field">
            <label>שם התהליך</label>
            <input value={proc.name} onChange={(e) => setProc({ ...proc, name: e.target.value })} />
          </div>
          <div className="field">
            <label>שלבים (פסיק)</label>
            <input value={proc.steps} onChange={(e) => setProc({ ...proc, steps: e.target.value })} />
          </div>
          <div className="field">
            <label>מי מבצע (פסיק)</label>
            <input value={proc.people} onChange={(e) => setProc({ ...proc, people: e.target.value })} />
          </div>
          <div className="field">
            <label>מערכות (פסיק)</label>
            <input value={proc.systems} onChange={(e) => setProc({ ...proc, systems: e.target.value })} />
          </div>
          <div className="field">
            <label>נפח בחודש (אם ידוע)</label>
            <input inputMode="numeric" value={proc.volume} onChange={(e) => setProc({ ...proc, volume: e.target.value })} />
          </div>
          <div className="field">
            <label>דקות לפעולה (אם ידוע)</label>
            <input inputMode="numeric" value={proc.minutes} onChange={(e) => setProc({ ...proc, minutes: e.target.value })} />
          </div>
        </div>
        <button style={{ marginTop: '0.75rem' }} onClick={addProcess}>
          הוספת תהליך
        </button>
        <ul className="small">
          {c.processes.map((p) => (
            <li key={p.id}>
              <b>{p.name}</b> {p.steps.join(' ← ')} {p.people.length > 0 && `· ${p.people.join(', ')}`}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3>תדריך לפני השיחה</h3>
          <button onClick={genBrief}>{b ? 'עדכון תדריך' : 'יצירת תדריך'}</button>
        </div>
        {!b ? (
          <p className="muted">עוד לא נוצר תדריך.</p>
        ) : (
          <div className="grid2">
            <div>
              <h4>פרופיל עסקי</h4>
              <ul className="small">{b.profile.map((x, i) => <li key={i}>{x}</li>)}</ul>
              <h4>שרשרת ערך משוערת</h4>
              <ul className="small">{b.valueChain.map((x, i) => <li key={i}>{x}</li>)}</ul>
              <h4>תהליכים</h4>
              <ul className="small">{b.processes.length ? b.processes.map((x, i) => <li key={i}>{x}</li>) : <li>לא תועדו</li>}</ul>
            </div>
            <div>
              <h4>השערות הזדמנות ({b.hypotheses.length})</h4>
              <ul className="small">
                {b.hypotheses.map((h) => (
                  <li key={h.templateId}>
                    <b>{h.name}</b> — {h.why}
                    {h.sourceIds.length > 0 && <span className="muted"> מקור: {h.sourceIds.map(srcLabel).join(', ')}</span>}
                  </li>
                ))}
              </ul>
              <h4>שאלות אימות מותאמות</h4>
              <ul className="small">{b.questions.map((x, i) => <li key={i}>{x}</li>)}</ul>
              <h4>פערי מידע ומגבלות</h4>
              <ul className="small">{b.gaps.map((x, i) => <li key={i}>{x}</li>)}</ul>
              {b.flaggedContent.length > 0 && (
                <>
                  <h4>תוכן חשוד שסונן (לא יבוצע)</h4>
                  <ul className="small">{b.flaggedContent.map((x, i) => <li key={i} className="pill danger">{x}</li>)}</ul>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

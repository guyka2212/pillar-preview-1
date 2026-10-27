import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import RecommendationCard from '../components/RecommendationCard';
import { barryFile, clientReport, downloadJson } from '../reports/reports';
import { getAssessmentForCase, getCase, getLeads, logAction, now, saveLead, uid, useStoreVersion } from '../storage/db';
import { STAGE_LABELS } from '../knowledge/persona';

/** Placeholder until a scheduling tool is chosen (PRD section 19 open decision). */
const MEETING_LINK = '#/leads';

export default function Report() {
  useStoreVersion();
  const { id } = useParams();
  const c = getCase(id || '');
  const a = c ? getAssessmentForCase(c.id) : undefined;
  const [tab, setTab] = useState<'client' | 'barry'>('client');
  const [lead, setLead] = useState({ name: '', phone: '', email: '', consent: false });

  if (!c) return <p>התיק לא נמצא.</p>;
  if (!a) return <p>עוד לא התקיימה שיחה. <Link to={`/case/${c.id}/talk`}>להתחלת שיחה</Link></p>;
  const rep = clientReport(c, a);
  const file = barryFile(c, a);
  const existingLead = getLeads().find((l) => l.caseId === c.id);

  const createLead = () => {
    saveLead({ id: uid(), caseId: c.id, contactName: lead.name, contactPhone: lead.phone, contactEmail: lead.email, consent: lead.consent, status: 'new', advisor: 'בארי', createdAt: now(), notes: '' });
    logAction('create-lead', c.id);
  };

  return (
    <section className="stack">
      <div className="row no-print" style={{ justifyContent: 'space-between' }}>
        <div className="row">
          <button className={tab === 'client' ? '' : 'secondary'} onClick={() => setTab('client')}>דוח ללקוח</button>
          <button className={tab === 'barry' ? '' : 'secondary'} onClick={() => setTab('barry')}>התיק של בארי</button>
        </div>
        <div className="row">
          <button className="secondary" onClick={() => window.print()}>הדפסה / שמירה כ-PDF</button>
          {tab === 'barry' && <button className="secondary" onClick={() => downloadJson(`barry-${c.id}.json`, file)}>הורדת JSON</button>}
          <Link className="btn secondary" to={`/case/${c.id}/talk`}>לשיחה</Link>
        </div>
      </div>

      {tab === 'client' ? (
        <div className="stack" style={{ maxWidth: 820 }}>
          <h1>{c.name} — סיכום אבחון</h1>
          <p className="small muted">הוכן על ידי סוכן האבחון של Pillar Tech. זהו סיכום של שיחה, לא הצעת מחיר ולא התחייבות.</p>
          <div className="card">
            <h3>פרופיל עסקי בקצרה</h3>
            <ul className="small">{rep.profile.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
          <h2>{['אין עדיין אפשרויות מבוססות', 'אפשרות אחת', 'שתי אפשרויות', 'שלוש אפשרויות'][rep.options.length]}</h2>
          {rep.fewerThanThree && <p className="banner warn small">מצאנו פחות משלוש אפשרויות עם בסיס מספיק. העדפנו לסמן אי-ודאות מאשר להמציא.</p>}
          {rep.options.map((r, i) => (
            <RecommendationCard key={r.opp.id} opp={r.opp} rank={i + 1} scenario={a.scenarios.find((s) => s.opportunityId === r.opp.id)} />
          ))}
          <div className="card small">
            <h3>הנחות שעדיין לא אומתו</h3>
            <ul>{rep.assumptions.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
          <div className="card">
            <h3>צעד ראשון מומלץ</h3>
            <p>{rep.firstStep}</p>
            <p className="small">
              רוצים להמשיך? אפשר לקבוע שיחה עם בארי, מנהל הלקוחות שלנו — בלי שום התחייבות. <a href={MEETING_LINK}>קביעת שיחה</a>
            </p>
          </div>

          <div className="card no-print">
            <h3>העברה לבארי</h3>
            {existingLead ? (
              <p className="small">נוצר ליד ({existingLead.status}). <Link to="/leads">לתור הטיפול</Link></p>
            ) : (
              <>
                <div className="grid3">
                  <div className="field"><label>שם איש קשר</label><input value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} /></div>
                  <div className="field"><label>טלפון</label><input dir="ltr" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} /></div>
                  <div className="field"><label>אימייל</label><input dir="ltr" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} /></div>
                </div>
                <label className="row small" style={{ marginTop: '0.5rem' }}>
                  <input type="checkbox" style={{ width: 'auto' }} checked={lead.consent} onChange={(e) => setLead({ ...lead, consent: e.target.checked })} />
                  בעל העסק הסכים לשמירת פרטי הקשר ולחזרה מבארי
                </label>
                <button style={{ marginTop: '0.5rem' }} disabled={!lead.consent || !lead.name.trim()} onClick={createLead}>יצירת ליד</button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="stack">
          <h1>התיק של בארי — {c.name}</h1>
          <div className="grid2">
            <div className="card small">
              <h3>מקורות</h3>
              <ul>
                {file.sources.map((s) => (
                  <li key={s.id}>
                    {s.label} · {s.kind} · אמינות {s.reliability} · {s.facts} עובדות{s.permission ? '' : ' · ללא הרשאה'}
                    {s.flagged.length > 0 && <span className="pill danger"> {s.flagged.length} הוראות חשודות סוננו</span>}
                  </li>
                ))}
              </ul>
              <h3>מצב השיחה</h3>
              <p>סטטוס: {a.status === 'closed' ? 'הסתיימה' : 'פעילה'} · שלב: {STAGE_LABELS[a.flow.stage]} · מנוע: {a.mode === 'webllm' ? 'WebLLM' : 'כללים'}</p>
              <h3>פערים</h3>
              <ul>{file.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
              <h3>המשך טיפול</h3>
              <ul>{file.nextSteps.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div className="card small">
              <h3>כל ההזדמנויות שנבדקו</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>הזדמנות</th><th>סטטוס</th><th>ציון</th><th>שער סיכון</th><th>ביטחון</th></tr></thead>
                  <tbody>
                    {file.opportunities.map((o) => (
                      <tr key={o.name}>
                        <td>{o.name}</td>
                        <td>{o.status}</td>
                        <td className="num">{o.score}</td>
                        <td>{o.gate.status}{o.gate.reasons.length ? ` (${o.gate.reasons.join(', ')})` : ''}</td>
                        <td>{o.confidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {rep.options.map((r, i) => (
            <RecommendationCard key={r.opp.id} opp={r.opp} rank={i + 1} scenario={a.scenarios.find((s) => s.opportunityId === r.opp.id)} detailed />
          ))}
          <div className="card small">
            <h3>תמליל</h3>
            {typeof file.transcript === 'string' ? (
              <p className="muted">{file.transcript}</p>
            ) : (
              <ol>{file.transcript.map((t, i) => <li key={i}><b>{t.role === 'agent' ? 'סוכן' : 'בעל העסק'}:</b> {t.text}</li>)}</ol>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

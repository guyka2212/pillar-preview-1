import { CAPABILITIES } from '../knowledge/capabilities';
import { INDUSTRIES } from '../knowledge/industries';
import { ACTIONS, PERSONA_RULES, STAGE_LABELS } from '../knowledge/persona';
import { STAGES } from '../knowledge/flow';

export default function Knowledge() {
  return (
    <section className="stack">
      <h1>בסיס הידע של הסוכן</h1>
      <p className="muted">כללי הפרסונה, שלבי השיחה, יכולות הסוכן ובסיס הידע לחמשת הענפים הראשונים.</p>

      <div className="grid2">
        <div className="card">
          <h3>כללי התנהגות קבועים</h3>
          <ol className="small">
            {PERSONA_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </div>
        <div className="card">
          <h3>שלבי השיחה</h3>
          <ol>
            {STAGES.map((s) => (
              <li key={s}>{STAGE_LABELS[s]}</li>
            ))}
          </ol>
          <h3>פעולה אחת בכל תור</h3>
          <ul className="small">
            {ACTIONS.map((a) => (
              <li key={a.id}>
                <b>{a.label}</b> – {a.description}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <h3>יכולות הסוכן</h3>
        <div className="grid3">
          {CAPABILITIES.map((c) => (
            <div key={c.id}>
              <b>{c.name}</b>
              <p className="small muted">{c.description}</p>
            </div>
          ))}
        </div>
      </div>

      {INDUSTRIES.map((ind) => (
        <div className="card" key={ind.id}>
          <h3>{ind.name}</h3>
          <p className="small muted">תהליכים טיפוסיים: {ind.typicalProcesses.map((p) => p.name).join(' · ')}</p>
          <ul className="small">
            {ind.templates.map((t) => (
              <li key={t.id}>
                <b>{t.name}</b> — {t.problem}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

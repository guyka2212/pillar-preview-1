import { useEffect, useState } from 'react';
import type { LoadProgress } from '../agent/llmClient';
import { RuleBasedClient } from '../agent/ruleBasedClient';
import { getClient } from '../agent/session';
import { RUBRIC_LABELS, runScenario, type RubricKey, type ScenarioRun } from '../eval/runScenario';
import { SCENARIOS } from '../fixtures/scenarios';
import { INDUSTRIES } from '../knowledge/industries';
import { ACTIONS } from '../knowledge/persona';

const KEYS = Object.keys(RUBRIC_LABELS) as RubricKey[];
const avg = (r: ScenarioRun) => Math.round((KEYS.reduce((s, k) => s + r.rubric[k], 0) / KEYS.length) * 10) / 10;

export default function Evaluation() {
  const [runs, setRuns] = useState<ScenarioRun[]>([]);
  const [engine, setEngine] = useState('מנוע כללים');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [industry, setIndustry] = useState('all');

  const runAll = async (useModel: boolean) => {
    setBusy(true);
    let client = new RuleBasedClient() as import('../agent/llmClient').LlmClient;
    if (useModel) {
      const s = await getClient(setProgress);
      await s.ready.catch(() => undefined);
      client = s.client;
    }
    setEngine(client.label);
    const out: ScenarioRun[] = [];
    for (const sc of SCENARIOS) {
      out.push(await runScenario(sc, client));
      setRuns([...out]);
    }
    setBusy(false);
  };

  useEffect(() => {
    runAll(false);
  }, []);

  const shown = runs.filter((r) => industry === 'all' || r.scenario.industry === industry);
  const passed = shown.filter((r) => r.checks.every((c) => c.pass)).length;

  return (
    <section className="stack">
      <h1>הערכת איכות שיחה</h1>
      <p className="muted">
        {SCENARIOS.length} תרחישי בדיקה (10 לכל ענף, כולל מקרי קצה וניסיונות הזרקה), מול הציפיות ומחוון 1–5 של סעיף 16א. הציונים כאן הם הערכה אוטומטית — סקירה של מומחה
        לתהליכים עסקיים ומומחה למכירה ייעוצית עדיין נדרשת.
      </p>
      <div className="row no-print">
        <button disabled={busy} onClick={() => runAll(false)}>הרצה עם מנוע הכללים</button>
        <button className="secondary" disabled={busy} onClick={() => runAll(true)}>הרצה עם המודל המקומי (WebLLM)</button>
        <select style={{ width: 'auto' }} value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="all">כל הענפים</option>
          {INDUSTRIES.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>
      {busy && progress && progress.progress < 1 && <p className="small muted num">טוען מודל: {Math.round(progress.progress * 100)}%</p>}
      <div className="banner">
        מנוע: {engine} · עברו {passed}/{shown.length} תרחישים{busy ? ' · רץ…' : ''}
      </div>

      <div className="card table-wrap">
        <table className="small">
          <thead>
            <tr>
              <th>תרחיש</th>
              <th>סוג</th>
              <th>ציפיות</th>
              {KEYS.map((k) => <th key={k}>{RUBRIC_LABELS[k]}</th>)}
              <th>ממוצע</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const ok = r.checks.filter((c) => c.pass).length;
              return (
                <tr key={r.scenario.id}>
                  <td>
                    <details>
                      <summary>{r.scenario.id} · {r.scenario.title}</summary>
                      <ul>{r.checks.map((c) => <li key={c.expectation} style={{ color: c.pass ? 'var(--ok)' : 'var(--danger)' }}>{c.pass ? '✓' : '✗'} {c.expectation}: {c.detail}</li>)}</ul>
                      <ol>
                        {r.assessment.turns.map((t, i) => (
                          <li key={i}><b>{t.role === 'agent' ? `סוכן (${ACTIONS.find((x) => x.id === t.action)?.label ?? ''})` : 'בעל העסק'}:</b> {t.text}</li>
                        ))}
                      </ol>
                    </details>
                  </td>
                  <td><span className={`pill ${r.scenario.kind === 'injection' ? 'danger' : r.scenario.kind === 'edge' ? 'warn' : ''}`}>{r.scenario.kind}</span></td>
                  <td className="num" style={{ color: ok === r.checks.length ? 'var(--ok)' : 'var(--danger)' }}>{ok}/{r.checks.length}</td>
                  {KEYS.map((k) => <td key={k} className="num">{r.rubric[k]}</td>)}
                  <td className="num"><b>{avg(r)}</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card small">
        <h3>הרצה ידנית מול המודל המקומי</h3>
        <ol>
          <li>פתחו את האתר ב-Chrome או Edge במחשב עם WebGPU.</li>
          <li>בהגדרות בחרו מודל (או השאירו ברירת מחדל), ואז לחצו כאן "הרצה עם המודל המקומי". בפעם הראשונה המודל יורד.</li>
          <li>פתחו כל תרחיש ובדקו את התמליל לפי המחוון: הכנה, סקרנות, שאלות המשך, שיקוף, אפשרויות חדשות, בלי דחיפה מכירתית, שיתוף בעל העסק, שקיפות מספרית.</li>
          <li>תשובות של המודל שמפרות כללים נפסלות אוטומטית ומוחלפות בנוסח המתוכנן — כך שהבדיקה בודקת גם את שכבת ההגנה.</li>
        </ol>
      </div>
    </section>
  );
}

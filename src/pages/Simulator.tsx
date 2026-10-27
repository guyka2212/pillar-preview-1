import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { topThree } from '../engine/ranking';
import { computeAll, INPUT_LABELS, SCENARIO_LABELS } from '../engine/roi';
import { templateById } from '../knowledge/industries';
import { getAssessmentForCase, getCase, saveAssessment, useStoreVersion } from '../storage/db';
import type { RoiInputs, Scenario } from '../types';

const PERCENT_FIELDS: (keyof RoiInputs)[] = ['savingsRate', 'cashRealizableShare'];
const FIELDS = Object.keys(INPUT_LABELS) as (keyof RoiInputs)[];
const fmt = (n?: number) => (n === undefined ? '—' : Math.round(n).toLocaleString('he-IL'));

export default function Simulator() {
  useStoreVersion();
  const { id } = useParams();
  const c = getCase(id || '');
  const a = c ? getAssessmentForCase(c.id) : undefined;
  const options = a ? [...new Map([...a.opportunities.filter((o) => o.status === 'interested'), ...topThree(a.opportunities).map((r) => r.opp)].map((o) => [o.id, o])).values()] : [];
  const [oppId, setOppId] = useState(options[0]?.id ?? '');

  if (!c) return <p>התיק לא נמצא.</p>;
  if (!a) return <p>עוד לא התקיימה שיחה. <Link to={`/case/${c.id}/talk`}>להתחלת שיחה</Link></p>;
  const opp = a.opportunities.find((o) => o.id === oppId);
  const scenario: Scenario = a.scenarios.find((s) => s.opportunityId === oppId) ?? { opportunityId: oppId, inputs: {}, inputSources: {} };
  const results = computeAll(scenario.inputs);
  const base = results[1].result;

  const setInput = (k: keyof RoiInputs, raw: string) => {
    const v = raw.trim() === '' ? undefined : Number(raw) / (PERCENT_FIELDS.includes(k) ? 100 : 1);
    const next: Scenario = {
      ...scenario,
      inputs: { ...scenario.inputs, [k]: v !== undefined && Number.isFinite(v) ? v : undefined },
      inputSources: { ...scenario.inputSources, [k]: 'בעל העסק במסך הסימולטור' },
    };
    saveAssessment({ ...a, scenarios: [...a.scenarios.filter((s) => s.opportunityId !== oppId), next] });
  };
  const shown = (k: keyof RoiInputs) => {
    const v = scenario.inputs[k];
    return v === undefined ? '' : String(PERCENT_FIELDS.includes(k) ? Math.round(v * 1000) / 10 : v);
  };

  return (
    <section className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>סימולטור כלכלי משותף</h1>
        <Link className="btn secondary" to={`/case/${c.id}/talk`}>חזרה לשיחה</Link>
      </div>
      <p className="muted">כל מספר כאן הוא שלך או נאמר בשיחה, עם המקור שלו. החישוב שקוף ונעשה בקוד קבוע — לא על ידי המודל.</p>

      {options.length === 0 ? (
        <div className="banner warn">עוד אין הזדמנות שהובעה בה עניין. הסימולטור נפתח אחרי שבעל העסק מביע עניין ברעיון.</div>
      ) : (
        <>
          <div className="field" style={{ maxWidth: 480 }}>
            <label htmlFor="opp">הזדמנות</label>
            <select id="opp" value={oppId} onChange={(e) => setOppId(e.target.value)}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} {o.status === 'interested' ? '(עניין)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid2">
            <div className="card">
              <h3>הנחות (אפשר לשנות כל אחת)</h3>
              {FIELDS.map((k) => (
                <div className="field" key={k}>
                  <label htmlFor={k}>{INPUT_LABELS[k]}</label>
                  <input id={k} inputMode="decimal" className="num" value={shown(k)} onChange={(e) => setInput(k, e.target.value)} placeholder="לא הוזן" />
                  <span className="small muted">{scenario.inputSources[k] ? `מקור: ${scenario.inputSources[k]}` : 'אין עדיין מקור'}</span>
                </div>
              ))}
            </div>

            <div className="stack">
              <div className="card">
                <h3>תרחישים</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th></th>
                        {results.map((r) => (
                          <th key={r.scenario}>{SCENARIO_LABELS[r.scenario]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="num">
                      <tr>
                        <td>שעות שמתפנות בחודש</td>
                        {results.map((r) => <td key={r.scenario}>{r.result.hoursSaved ?? '—'}</td>)}
                      </tr>
                      <tr>
                        <td>ערך קיבולת (₪)</td>
                        {results.map((r) => <td key={r.scenario}>{fmt(r.result.capacityValue)}</td>)}
                      </tr>
                      <tr>
                        <td>חיסכון כספי בפועל (₪)</td>
                        {results.map((r) => <td key={r.scenario}>{fmt(r.result.cashSavings)}</td>)}
                      </tr>
                      <tr>
                        <td>תועלת נטו בחודש (₪)</td>
                        {results.map((r) => <td key={r.scenario}>{fmt(r.result.netMonthly)}</td>)}
                      </tr>
                      <tr>
                        <td>החזר השקעה (חודשים)</td>
                        {results.map((r) => <td key={r.scenario}>{r.result.paybackMonths ?? '—'}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="small muted">תרחיש שמרני מניח 60% מאחוז החיסכון וההכנסה שהזנת, אופטימי 125%. ערך קיבולת הוא זמן שמתפנה — לא כסף שנחסך.</p>
              </div>

              {base.missing.length > 0 && (
                <div className="banner warn">
                  כדי להשלים את החישוב חסר: {base.missing.map((k) => INPUT_LABELS[k]).join(' · ')}. לא נציג החזר השקעה בלי הנתונים האלה.
                </div>
              )}

              <div className="card small">
                <h3>איך זה חושב (תרחיש בסיס)</h3>
                {base.steps.length ? <ul>{base.steps.map((s, i) => <li key={i} className="num">{s}</li>)}</ul> : <p className="muted">אין עדיין מספיק נתונים לחישוב.</p>}
              </div>

              {opp && (
                <div className="card small">
                  <h3>ערך שאינו כספי</h3>
                  <ul>{(templateById(opp.templateId)?.nonMonetary ?? []).map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

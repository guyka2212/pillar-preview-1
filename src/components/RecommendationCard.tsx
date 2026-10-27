// One of the three recommendations, structured per PRD section 9.

import { confidence, riskGate, WEIGHT_LABELS, weightedScore } from '../engine/ranking';
import { computeRoi } from '../engine/roi';
import { templateById } from '../knowledge/industries';
import type { Opportunity, Scenario } from '../types';

// Hebrew adjectives agree in gender: "מורכבות" is feminine, "ביטחון" is masculine.
const LEVEL: Record<string, string> = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' };
const LEVEL_M: Record<string, string> = { low: 'נמוך', medium: 'בינוני', high: 'גבוה' };

export default function RecommendationCard({ opp, rank, scenario, detailed = false }: { opp: Opportunity; rank: number; scenario?: Scenario; detailed?: boolean }) {
  const gate = riskGate(opp.risks);
  const roi = scenario ? computeRoi(scenario.inputs) : undefined;
  const t = templateById(opp.templateId);
  return (
    <article className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>
          {rank}. {opp.name}
        </h3>
        <div className="row">
          <span className="pill num">ציון {weightedScore(opp.scores)}</span>
          <span className="pill">ביטחון {LEVEL_M[confidence(opp)]}</span>
          {gate.status === 'review' && <span className="pill warn">דורש בדיקה אנושית</span>}
        </div>
      </div>
      <p>{opp.problem}</p>
      <div className="grid2 small">
        <div>
          <b>היום</b>
          <p>{opp.today}</p>
        </div>
        <div>
          <b>אחרי</b>
          <p>{opp.after}</p>
        </div>
      </div>
      <p className="small">
        <b>תפקיד האדם:</b> {opp.humanRole} · <b>תפקיד הסוכן:</b> {opp.agentRole}
      </p>
      <p className="small">
        <b>מה צריך:</b> {opp.needs.join(' · ')}
      </p>
      <p className="small">
        <b>תועלת אפשרית ומדד:</b>{' '}
        {roi?.hoursSaved !== undefined ? `כ-${roi.hoursSaved} שעות בחודש (תרחיש בסיס, לפי ההנחות שלך)` : 'עוד לא כומת — חסרים נתונים'} · KPI: {opp.kpi}
        {t?.nonMonetary.length ? ` · ערך לא כספי: ${t.nonMonetary.join(', ')}` : ''}
      </p>
      <p className="small">
        <b>מורכבות ראשונית:</b> {LEVEL[opp.complexity]}. מחיר פיתוח יינתן רק אחרי בדיקה אנושית וטכנית.
      </p>
      <details className="small">
        <summary>הנחות, פערים וסיכונים</summary>
        <ul>
          {opp.assumptions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
          {gate.reasons.map((r, i) => (
            <li key={`g${i}`}>{r}</li>
          ))}
          {roi?.missing.length ? <li>נתונים חסרים לחישוב: {roi.missing.length}</li> : null}
          <li>ראיות: {opp.evidence.join(' | ') || 'אין'}</li>
        </ul>
      </details>
      {detailed && (
        <table className="small" style={{ marginTop: '0.5rem' }}>
          <tbody>
            {(Object.keys(WEIGHT_LABELS) as (keyof typeof WEIGHT_LABELS)[]).map((k) => (
              <tr key={k}>
                <td>{WEIGHT_LABELS[k]}</td>
                <td className="num">{opp.scores[k]}/5</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}

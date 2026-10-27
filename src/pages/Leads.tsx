import { Link } from 'react-router-dom';
import { getCase, getLeads, logAction, saveLead, useStoreVersion } from '../storage/db';
import type { Lead } from '../types';

const STATUS: Record<Lead['status'], string> = {
  new: 'חדש',
  'barry-review': 'בארי מאמת',
  'rafi-feasibility': 'רפי בודק היתכנות',
  'reut-commercial': 'רעות — תנאים מסחריים',
  closed: 'סגור',
};

export default function Leads() {
  useStoreVersion();
  const leads = getLeads().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const update = (l: Lead, patch: Partial<Lead>) => {
    saveLead({ ...l, ...patch });
    logAction('update-lead', `${l.id}:${patch.status ?? ''}`);
  };

  return (
    <section className="stack">
      <h1>תור טיפול בלידים</h1>
      <p className="muted">
        לידים שנוצרו מדוחות, בהסכמת בעל העסק. בארי מאמת ומנהל מעקב, רפי בודק היתכנות, רעות סוגרת תנאים. חיבור ל-CRM ולכלי קביעת פגישות — החלטה פתוחה.
      </p>
      {leads.length === 0 ? (
        <p className="muted">אין עדיין לידים.</p>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>עסק</th>
                <th>איש קשר</th>
                <th>סטטוס</th>
                <th>אחראי</th>
                <th>הערות</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>{getCase(l.caseId)?.name ?? 'נמחק'}</td>
                  <td className="small">
                    {l.contactName}
                    <br />
                    <span dir="ltr">{l.contactPhone}</span> <span dir="ltr">{l.contactEmail}</span>
                  </td>
                  <td>
                    <select value={l.status} onChange={(e) => update(l, { status: e.target.value as Lead['status'] })}>
                      {Object.entries(STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input value={l.advisor} onChange={(e) => update(l, { advisor: e.target.value })} />
                  </td>
                  <td>
                    <input value={l.notes} onChange={(e) => update(l, { notes: e.target.value })} />
                  </td>
                  <td className="small">
                    <Link to={`/case/${l.caseId}/report`}>דוח</Link>
                    <br />
                    <span className="muted">קביעת פגישה: יתווסף אחרי בחירת כלי</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildBrief, textToFacts } from '../intake/brief';
import { INDUSTRIES } from '../knowledge/industries';
import { getCases, logAction, now, saveCase, uid, useStoreVersion } from '../storage/db';
import type { BusinessCase, IndustryId } from '../types';

export function newCase(name: string, industry: IndustryId): BusinessCase {
  return {
    id: uid(),
    name,
    industry,
    size: '',
    description: '',
    systems: [],
    goals: [],
    sources: [],
    facts: [],
    processes: [],
    consent: { store: true, transcript: false },
    createdAt: now(),
  };
}

function demoCase(industry: IndustryId): BusinessCase {
  const ind = INDUSTRIES.find((i) => i.id === industry)!;
  const c = newCase(`דמו: ${ind.sample.business}`, industry);
  c.description = ind.sample.business;
  const src = { id: uid(), kind: 'text' as const, label: 'טקסט אתר לדוגמה', addedAt: now(), permission: true, reliability: 'medium' as const, tags: ['דמו'] };
  c.sources = [src];
  c.facts = textToFacts(ind.sample.siteText, src.id, src.id);
  c.goals = ['לפנות זמן לצוות בלי לפגוע בשירות'];
  c.brief = buildBrief(c);
  return c;
}

export default function Cases() {
  useStoreVersion();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState<IndustryId>('manufacturing');
  const cases = getCases().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const create = (c: BusinessCase) => {
    saveCase(c);
    logAction('create-case', c.id);
    nav(`/case/${c.id}`);
  };

  return (
    <section className="stack">
      <h1>תיקי עסקים — המסך של בארי</h1>
      <p className="muted">פותחים תיק לפני השיחה, מצרפים אתר ומסמכים בהרשאה, ומקבלים תדריך לסוכן.</p>

      <div className="card">
        <h3>תיק חדש</h3>
        <div className="grid2">
          <div className="field">
            <label htmlFor="cname">שם העסק</label>
            <input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: מסגרות כהן" />
          </div>
          <div className="field">
            <label htmlFor="cind">ענף</label>
            <select id="cind" value={industry} onChange={(e) => setIndustry(e.target.value as IndustryId)}>
              {INDUSTRIES.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button disabled={!name.trim()} onClick={() => create(newCase(name.trim(), industry))}>
            פתיחת תיק
          </button>
          <button className="secondary" onClick={() => create(demoCase(industry))}>
            תיק דמו לענף הזה
          </button>
        </div>
      </div>

      <div className="card">
        <h3>תיקים קיימים</h3>
        {cases.length === 0 ? (
          <p className="muted">אין עדיין תיקים.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>עסק</th>
                  <th>ענף</th>
                  <th>מקורות</th>
                  <th>תדריך</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/case/${c.id}`}>{c.name}</Link>
                    </td>
                    <td>{INDUSTRIES.find((i) => i.id === c.industry)?.name}</td>
                    <td>{c.sources.length}</td>
                    <td>{c.brief ? <span className="pill ok">מוכן</span> : <span className="pill warn">חסר</span>}</td>
                    <td>
                      <Link to={`/case/${c.id}/talk`}>לשיחה</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

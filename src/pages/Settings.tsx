import { useEffect, useState } from 'react';
import { hasWebGpu } from '../agent/llmClient';
import { detectMode } from '../agent/session';
import type { ModelOption } from '../agent/models';
import { getSettings, saveSettings, useStoreVersion } from '../storage/db';
import { hasHebrewVoice, sttSupported, ttsSupported } from '../speech/speech';

export default function Settings() {
  useStoreVersion();
  const s = getSettings();
  const [gpu, setGpu] = useState<{ ok: boolean; f16: boolean } | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const g = await hasWebGpu();
      setGpu(g);
      if (g.ok) {
        const { listModels } = await import('../agent/webllmClient');
        setModels(await listModels(g.f16));
      }
    })();
  }, []);

  const clearCache = async () => {
    const webllm = await import('@mlc-ai/web-llm');
    for (const m of models) await webllm.deleteModelAllInfoInCache(m.id).catch(() => undefined);
    setMsg('מטמון המודלים נמחק. בשיחה הבאה המודל יורד מחדש.');
  };

  return (
    <section className="stack" style={{ maxWidth: 720 }}>
      <h1>הגדרות</h1>

      <div className="card">
        <h3>מצב הבינה המלאכותית</h3>
        <p className="small">
          WebGPU: {gpu === null ? 'בודק…' : gpu.ok ? `זמין${gpu.f16 ? ' (עם f16)' : ' (בלי f16 — ייבחרו מודלי q4f32)'}` : 'לא זמין — האתר יעבוד במצב כללים'}
        </p>
        <label className="row">
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={s.forceRuleBased}
            onChange={(e) => {
              saveSettings({ ...s, forceRuleBased: e.target.checked });
              detectMode();
            }}
          />
          להשתמש תמיד במנוע הכללים (בלי להוריד מודל)
        </label>
        {models.length > 0 && (
          <div className="field">
            <label htmlFor="model">מודל מקומי (מתוך הרשימה של WebLLM)</label>
            <select id="model" value={s.modelId ?? ''} onChange={(e) => saveSettings({ ...s, modelId: e.target.value || undefined })}>
              <option value="">ברירת מחדל ({models.find((m) => !m.light)?.id ?? models[0].id})</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                  {m.vramMB ? ` · ~${Math.round(m.vramMB / 100) / 10}GB זיכרון גרפי` : ''}
                  {m.light ? ' · קל למכשירים חלשים' : ''}
                </option>
              ))}
            </select>
            <p className="small muted">שינוי מודל ייכנס לתוקף בשיחה הבאה. כל מודל יורד פעם אחת ונשמר בדפדפן.</p>
          </div>
        )}
        {models.length > 0 && (
          <button className="secondary" onClick={clearCache}>
            מחיקת מודלים שהורדו
          </button>
        )}
        {msg && <p className="banner small">{msg}</p>}
      </div>

      <div className="card">
        <h3>קול</h3>
        <p className="small">זיהוי דיבור: {sttSupported() ? 'נתמך' : 'לא נתמך בדפדפן הזה — עובד הכי טוב ב-Chrome או Edge'}</p>
        <p className="small">הקראה: {ttsSupported() ? (hasHebrewVoice() ? 'קול עברי זמין' : 'אין קול עברי מותקן — ההקראה עשויה להישמע לא טבעית') : 'לא נתמכת'}</p>
        <label className="row">
          <input type="checkbox" style={{ width: 'auto' }} checked={s.speakReplies} onChange={(e) => saveSettings({ ...s, speakReplies: e.target.checked })} />
          הסוכן מקריא את התשובות
        </label>
      </div>

      <div className="card small muted">
        אין כאן שדה למפתח API, ואין בו צורך: הכול רץ בדפדפן. לא נשלח מידע לשום שירות בינה מלאכותית בתשלום.
      </div>
    </section>
  );
}

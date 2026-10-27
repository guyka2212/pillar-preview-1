# Pillar Diagnostic Agent

A Hebrew (RTL) voice AI diagnostic agent prototype for Pillar Tech. It behaves like a great
consultative salesperson **who doesn't sell**: it prepares from the client's materials, listens,
asks one question at a time, and works with the business owner to find up to three real
opportunities to create value with AI agents.

Everything runs in the visitor's browser. There is no backend and no API key.

**Live site:** https://guyka2212.github.io/pillar-preview-1/

## How it works

| Area | Where |
|------|-------|
| Barry's intake: cases, URL/PDF/text sources, processes, pre-call brief | `src/pages/Cases.tsx`, `src/pages/CaseDetail.tsx`, `src/intake/` |
| Persona rules, flow state machine, capabilities, 5-industry knowledge base | `src/knowledge/` |
| Deterministic orchestrator (signals, gaps, numbers, one action per turn) | `src/agent/orchestrator.ts`, `src/agent/extraction.ts` |
| AI layer (one interface, two implementations) | `src/agent/llmClient.ts`, `webllmClient.ts` (+ `webllm.worker.ts`), `ruleBasedClient.ts` |
| Ranking (35/20/20/15/10 weights + risk gates) and ROI simulator | `src/engine/ranking.ts`, `src/engine/roi.ts` |
| Voice (Web Speech API, `he-IL`) | `src/speech/speech.ts` |
| Reports, Barry's file, leads queue | `src/reports/`, `src/pages/Report.tsx`, `src/pages/Leads.tsx` |
| Scenario evaluation | `src/fixtures/scenarios.ts`, `src/eval/`, `src/pages/Evaluation.tsx` |

**AI modes.** With WebGPU (Chrome/Edge on most laptops) the site runs a small open-source model with
WebLLM inside a Web Worker. The default is the first available of Qwen2.5-3B / Qwen3-4B / Gemma-2-2B /
Qwen3-1.7B / Qwen2.5-1.5B (q4), looked up in WebLLM's own prebuilt list; lighter models can be picked in
Settings. Weights download once from the Hugging Face CDN and are cached. Without WebGPU, a rule-based
engine runs the same flow, question bank and persona rules. A banner shows which mode is active.

**Safety by design.** The model never computes numbers and never decides the flow: the orchestrator
plans one action and a ready line, the model may only rephrase it, and `validateReply()` rejects anything
that breaks the rules. Website and document text is treated as data; instruction-like sentences are
flagged, shown to Barry and never reach the prompt as instructions.

## Run locally

```bash
npm install && npm run dev
```

Other scripts: `npm test` (Vitest: unit tests + all 50 conversation scenarios against the rule-based
engine), `npm run build` (type-check + production build), `npm run preview`.

### Evaluating against the local model

Open the **Evaluation** page (`#/eval`) in a WebGPU browser and click "הרצה עם המודל המקומי". Each
scenario shows its transcript, the expectation checks and automatic 1–5 rubric estimates for the
section 16a items. Review them by hand against the rubric.

## Deployment

`.github/workflows/deploy.yml` installs, tests, builds and publishes `dist/` to GitHub Pages on every
push to `main`. Pages must be set to **Settings → Pages → Source: GitHub Actions**.
Vite `base` is `/pillar-preview-1/`, and routing uses a hash router so refreshes never 404.

## Known limitations

- Static hosting: no server, so no automatic website crawling (CORS), no real multi-user roles, auth or
  encryption at rest, and no CRM or calendar integration. Data stays in the visitor's browser.
- Small local models are weaker in Hebrew than large cloud models; the first load is a large download.
  Each agent turn shows whether the model's wording was used or rejected in favour of the planned line.
- Model loading/generation can stall while the tab is in the background (browsers throttle WebGPU);
  keep the tab visible while the model loads.
- Speech recognition works best in Chrome/Edge; Hebrew TTS depends on the device's installed voices.
- Rubric scores on the Evaluation page are automatic estimates, not expert reviews.
- **Real-business trials (3–5 businesses) are a human step still to be done after this build**, together
  with expert review per PRD section 16a.

See `TODO.md` for the acceptance-criteria status and the open decisions from PRD section 19.

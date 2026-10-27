# TODO

## Open decisions (PRD section 19 — not decided in this build)

- [ ] Voice platform choice (this build uses the browser Web Speech API as a stand-in)
- [ ] Level of human prep needed before a call
- [ ] Allowed information sources
- [ ] CRM system (this build keeps leads in a local handling queue)
- [ ] Pricing model
- [ ] Who approves a report before it is sent
- [ ] Data retention period (this build stores everything in the browser until deleted)
- [ ] Whether video or screen sharing will be added later

## MVP acceptance criteria (PRD section 16)

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | Ingest a case with a website + a PDF and produce a pre-call brief | **partial** | PDF and text ingestion work in the browser (pdf.js). Direct website fetch is usually blocked by CORS on static hosting, so Barry pastes the page text. Automatic crawling needs a server-side ingestion service. |
| 2 | Hebrew voice conversation grounded in the case; interruption and typing fallback | **done** | Web Speech API (`he-IL`) for STT/TTS, interrupt button and barge-in on mic, typing always available. STT needs Chrome/Edge; Hebrew TTS depends on installed voices. Real-world Hebrew quality, latency and noise testing is still a human step. |
| 3 | Process identification and follow-ups without a rigid questionnaire or asking the client to define AI uses | **done** | Gap-driven question choice (`questionForNextGap`), forbidden-pattern guard, tested in 50 scenarios. |
| 4 | Three distinct, justified options when there's enough basis; may return fewer | **done** | `topThree()` needs evidence per option, prefers distinct capabilities, applies risk gates; returns fewer when evidence is thin. |
| 5 | Change simulator inputs mid-conversation with consistent numeric results | **done** | Numbers spoken in the conversation and typed on screen both feed the same deterministic `computeRoi()`; unit-tested. |
| 6 | Client report and Barry's file with sources, assumptions and open questions | **done** | Printable / save-as-PDF via the browser; Barry's file also downloads as JSON. |
| 7 | Lead creation and handoff to CRM / handling queue; option to schedule a meeting | **partial** | Leads + handling queue (Barry → Rafi → Reut) work locally. CRM handoff and real meeting scheduling wait on open decisions; the meeting link is a placeholder. |
| 8 | Tests of at least 10 scenarios for each of the first five industries, incl. edge cases and security | **done** | 50 fixtures (`src/fixtures/scenarios.ts`), run automatically against the rule-based engine (`src/eval/scenarios.test.ts`) and manually against WebLLM on the Evaluation page. |
| – | Multi-user permissions (Barry / Rafi / admin roles), encryption, per-client isolation | **not possible on static hosting** | Everything is per-browser localStorage. Real roles, auth, encryption at rest and audit storage need a backend. A local action log exists. |
| – | Expert review per section 16a and real-business trials | **human step** | The Evaluation page gives automatic rubric estimates only. |

## Known limitations

- Small local models are weaker than large cloud models, especially in Hebrew. The model only rephrases
  the orchestrator's planned line; `validateReply()` rejects wrong actions, sales pressure, more than one
  question, new numbers and instruction-like output, and falls back to the planned line.
- First model load downloads hundreds of MB to a few GB; WebGPU is required (otherwise rule-based mode).
- Owner signals (interest, rejection, impatience…) are detected with Hebrew keyword rules, so unusual
  phrasing can be missed.
- Data lives only in the visitor's browser; clearing site data deletes it.

## Build progress

- [x] Step 1 – Project setup and GitHub Pages deployment
- [x] Step 2 – Phase A: knowledge base, persona, flow, scenarios (50 fixtures in `src/fixtures/scenarios.ts`)
- [x] Step 3 – Phase B: intake and pre-call brief
- [x] Step 4 – Phase C: voice conversation, ranking, in-browser AI
- [x] Step 5 – Phase D: simulator, reports, Barry's interface
- [x] Step 6 – Phase E: testing, calibration, acceptance check
- [x] Step 7 – Final deployment check (2026-10-27)
  - Deploy workflow green; live site serves the built app.
  - Rule-based mode verified end to end on the live site (intake → brief → conversation → simulator → report).
  - Phone width (375px) verified: no horizontal scroll, conversation layout stacks.
  - WebLLM verified on the live site up to: WebGPU detection, model list, download with progress,
    caching, and loading in the Web Worker (Qwen2.5-0.5B).
  - [ ] **Still to check by hand:** a full conversation in WebLLM mode in a visible Chrome/Edge window,
    including how often the model's wording passes `validateReply()` (each turn now shows
    "ניסוח המודל" or "נוסח מתוכנן" with the rejection reason). During verification the model
    stalled when the browser tab was in the background.

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

## Build progress

- [x] Step 1 – Project setup and GitHub Pages deployment
- [x] Step 2 – Phase A: knowledge base, persona, flow, scenarios (50 fixtures in `src/fixtures/scenarios.ts`)
- [x] Step 3 – Phase B: intake and pre-call brief
  - Fetching a website directly from the browser is usually blocked by CORS. Barry pastes the page
    text instead; no third-party proxy is used. A real ingestion service is needed for automatic crawling.
- [x] Step 4 – Phase C: voice conversation, ranking, in-browser AI
  - The LLM only rephrases the orchestrator's planned line; `validateReply()` rejects wrong actions,
    sales pressure, >1 question, new numbers and instruction-like output, falling back to the planned line.
  - Hebrew TTS quality depends on the voices installed on the device; STT needs Chrome/Edge.
- [x] Step 5 – Phase D: simulator, reports, Barry's interface
  - Meeting scheduling is a placeholder link until a scheduling tool is chosen.
  - Leads live in a local handling queue; CRM handoff waits on the CRM decision.
  - PDF export uses the browser's print-to-PDF.
- [ ] Step 6 – Phase E: testing, calibration, acceptance check
- [ ] Step 7 – Final deployment check

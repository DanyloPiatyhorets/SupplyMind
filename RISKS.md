# Risk Register

## Integration Risks

| Risk | Probability | Impact | Mitigation | Fallback |
|---|---|---|---|---|
| OpenClaw has no public SDK | HIGH | Medium | Research first 30 min; build adapter | Document in README, custom adapter |
| VikingDB free tier not available in region | MEDIUM | Low | Check console immediately | ChromaDB — identical interface |
| ModelArk rate limits hit during demo | LOW | High | Enable Free Tokens Only mode; test ahead | Cache last run result |
| Railway free credits exhausted | LOW | High | Check credit balance before deploying | Render.com as backup |
| Web search returns blocked/no results | MEDIUM | Medium | Test Serper API early | DuckDuckGo → seeded market data |
| PDF chunking fails on complex layouts | LOW | Low | Test with demo PDF before submission | Pre-chunk demo PDF and hardcode |

## Time Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Async SSE takes too long to debug | MEDIUM | Medium | Switch to polling at 1 hour mark |
| VikingDB setup takes >1 hour | MEDIUM | Low | Hard cut at 30 min, use ChromaDB |
| Deployment fails/slow | MEDIUM | HIGH | Deploy early (Friday morning not evening) |
| Frontend CSS/layout rabbit hole | HIGH | Low | Use pre-built Tailwind patterns, don't perfect |

## Demo Day Risks

| Risk | Mitigation |
|---|---|
| Live search returns irrelevant data | Always have seed data as floor |
| ModelArk latency too slow for live demo | Cache a pre-run result; have it ready |
| Demo PDF upload fails | Pre-upload during setup, use doc_id directly |
| Network issues at demo location | Test on mobile hotspot; have screenshots ready |

---

## Hard Stops (Do Not Spend More Than X Minutes)

- **OpenClaw research:** 30 min max. Then use adapter pattern.
- **VikingDB setup:** 45 min max. Then ChromaDB.
- **Async SSE debugging:** 60 min max. Then polling.
- **Any single bug:** 30 min max. Then mock it and move on.
- **CSS polish:** 30 min total. Dark Tailwind theme only. No animations.

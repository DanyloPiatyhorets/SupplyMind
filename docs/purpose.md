# Purpose

## What Is SupplyMind?

SupplyMind is an **agentic procurement intelligence system** for enterprise
supply-chain decisions. A user inputs a procurement goal (e.g. *"Find the best
aluminium supplier for Q3 given our current contracts"*), optionally uploads
industry reports or supplier catalogues as PDFs, and the system autonomously:

1. Decomposes the goal into research questions
2. Searches live market data for current prices and supplier conditions
3. Cross-references uploaded documents via RAG
4. Analyses and corrects the existing contract database
5. Produces three decision variants ("flavours"): cheapest, lowest-risk, fastest
6. Generates a structured GTM-style analysis report
7. Presents everything in a HITL review interface for human approval

**Nothing is committed without human approval.** The agent is autonomous in
research and analysis, but the human is always in the loop before action.

---

## Why This Matters to BytePlus Judges

BytePlus sells AI infrastructure to enterprise clients. The judges are Solution
Architects who demo these capabilities to procurement, finance, and operations
teams every day. This submission speaks their language directly:

- **RAG over industry reports** = the exact VikingDB Knowledge Engine use case
- **Live market search** = agentic tool use they sell as a differentiator
- **Data correction** = enterprise clients' number one concern: "is my data stale?"
- **HITL approval flow** = what enterprise compliance teams require
- **Audit trail / trace panel** = what procurement managers need to justify decisions

The system is not impressive because it's complex. It's impressive because it
solves a real, specific enterprise problem that BytePlus's clients have.

---

## What the Judges Are Actually Evaluating

Based on the assessment brief, judges score on:

| Criterion | What They Look For |
|---|---|
| Agentic thinking | Agent plans and reasons, not just pipelines |
| Tool stack fluency | OpenClaw + Claude Code + BytePlus services visibly used |
| Architectural clarity | Can you explain your prompt structure and workflow? |
| Delivery | It runs. It's deployed. The demo works. |
| Speed/judgement | Did you make smart trade-offs under time pressure? |

---

## Scope Boundaries (What We Are NOT Building)

- Not a production SaaS — no auth, no billing, no multi-tenancy
- Not a fully autonomous agent — HITL is required before any write action
- Not a real procurement system — seed data is illustrative, not live ERP
- Not integrating Stripe or external ERPs — out of scope for demo

These exclusions should be stated explicitly in the README as "future work."

# Demo script – Agentic SDLC

Duration about 25 minutes. Persona switches: **Lotte Janssens** (Customer Service Lead, reports in Teams) and
**Sanne Peeters** (Product Owner, works in the Agentic SDLC app). Prepare per *Before every demo* in
[manual-steps.md](manual-steps.md).

Open tabs: Teams (Intake Agent) · Agentic SDLC app (SDLC Dashboard) · GitHub repo (Issues, Pull requests, Actions) ·
the portal https://robbertcegekacrm-dot.github.io/Agentic-SDLC/ (quote calculator).

## 0. Hook (1 min)
Dashboard: 25 stories, 60% of released stories delivered autonomously, autonomous lead time 45 minutes versus
59 hours on the human path. *"Today you'll see one go through live."*

## 1. Report the VAT issue in Teams (3 min)
Portal → Quote calculator → Solar panel 430 Wp × 10: the line says *VAT (21%)* but the amount is € 252,00 (12%)
instead of € 441,00. Teams, as Lotte:
> The VAT on a quote is wrong

Agent: *What happened?* → "The quote calculator adds 12% VAT, it should be 21%."
Agent: *Where, and what did you expect?* → "Quote calculator, 10 solar panels. Expected 21% VAT."
Card: **STY-1042** logged.

## 2. Triage on the dashboard (3 min)
Dashboard → activity feed: *Story created* (Intake) → *Triage completed* (Triage). Open STY-1042:
- Summary tab: Issue, Calculation, High, **Simple**, **Low** risk, confidence ≥ 80 → **Autonomous**.
- Triage tab: rationale and acceptance criteria written by the Triage Agent.
- Activity tab: *GitHub issue #n created* (Build).
Talking point: the decision rule is explicit and auditable.

## 3. GitHub: Copilot builds (5–15 min)
GitHub → Issues: `[STY-1042] …` assigned to Copilot, then a draft PR "STY-1042: …".
While waiting, walk through **STY-1038 "Wrong date format on invoice page"** (fallback): every step from intake to
release 1.0.6 in 42 minutes, including the human approval. (Seeded GitHub links of historical stories are
illustrative.)

## 4. Tests pass → approve (3 min)
CI posts *pr_opened* → status Testing, then *tests_passed* → **Awaiting approval**. On the story, command
**Approve release** opens the PR. Review the diff (VAT_RATE 0.12 → 0.21, new test, version 1.1.1), approve and merge.
Talking point: production stays human-in-the-loop.

## 5. Deploy → released (3 min)
Actions → Deploy portal → *deployed* callback: story **Released**, Release 1.0.7 created, lead time filled,
Teams message to Lotte: "STY-1042 is live in release 1.1.1". Refresh the portal: footer *Release 1.1.1*, VAT € 441,00 on 10 panels.

## 6. Feature request: print button (2 min)
Teams: "Request a feature" → New feature → "Add a Print quote button on the quote result" → "Customers want a
paper copy for their bank". Same autonomous path (show triage outcome; build continues in the background).

## 7. The login issue → routed to human (2 min)
Teams: "I can't log in, my session expires immediately after login". Triage: Authentication, **Complex**, risk
**High** → **Routed to human**, activity *Routed to human* with the reason. Lotte immediately gets a Teams message
that the story went to the development team, with the reason. *"Agents know their limits, and say so."*

## Fallbacks
- Copilot not assigned (activity Warning, shows GitHub's HTTP status and message): assign the issue to Copilot in
  GitHub manually.
- Copilot slow: continue with STY-1038 and show the PR later.
- Callback fails: check that the `PA_CALLBACK_URL` secret matches F3's URL and F3 is on.

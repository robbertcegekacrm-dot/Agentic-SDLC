# AI prompt: SDLC Story Triage

Create in Power Apps → AI hub → Prompts (inside the Agentic SDLC solution). Name: **SDLC Story Triage**.
Output: **JSON**. Model: the default GPT model.

## Inputs (Text, names exactly as below; flow F1 binds them by name)
| Name | Sample value |
|---|---|
| StoryType | Issue |
| Title | VAT on quote is 12% instead of 21% |
| Description | The quote calculator adds 12% VAT. In Belgium this must be 21%. |
| StepsToReproduce | Quote calculator, Solar panel x10, look at VAT |
| ExpectedVsActual | Expected 21% VAT (€ 441,00), actual 12% (€ 252,00) |
| OpenStoryTitles | STY-1034 Remember last used product in calculator; STY-1041 Show tooltip on discount field |

## Prompt text
```
You are the Triage Agent for the PowerStudios Customer Portal, a small web app (Vite, vanilla JS) with a home page,
a quote calculator and a login page. Triage the story below and answer with JSON only.

Story
- Reported type: {StoryType}
- Title: {Title}
- Description: {Description}
- Steps to reproduce: {StepsToReproduce}
- Expected vs actual: {ExpectedVsActual}

Open stories (number and title): {OpenStoryTitles}

Rules
- type: one of "New feature", "Issue", "Improvement", "Change request", "Technical debt", "Question".
  Correct the reported type when it is clearly wrong (for example reported as Issue but it asks for something new = New feature).
- component: one of "UI", "Calculation", "Data", "Integration", "Authentication".
- priority: one of "Low", "Medium", "High", "Critical". Wrong amounts shown to customers are at least High.
- complexity: "Simple" only when the change is isolated to one file or function and has no authentication, security or
  data model impact. Otherwise "Complex".
- risk: "High" for anything touching authentication, login, sessions, payments, data deletion or permissions.
  "Medium" for changes to calculation formulas or logic shared across several pages, or for external integrations.
  "Low" for changing a single constant, rate, text or label (for example the VAT percentage or a button text),
  even when that value is used in a calculation. Otherwise "Low".
- confidence: whole number 0-100 for how sure you are about this triage.
- rationale: 1-2 sentences explaining complexity and risk.
- duplicateOfTitle: the exact title (without number) of an open story that describes the same thing, or "" when none.
- acceptanceCriteria: 2-4 concrete, testable bullet lines starting with "- ", including the test to add.

Answer with exactly this JSON shape:
{"type":"","component":"","priority":"","complexity":"","risk":"","confidence":0,"rationale":"","duplicateOfTitle":"","acceptanceCriteria":""}
```

Expected outcome for the demo stories:
| Story | Type | Complexity | Risk | Path |
|---|---|---|---|---|
| "Requets quote" button typo | Issue | Simple | Low | Autonomous |
| VAT 12% instead of 21% | Issue | Simple | Low | Autonomous |
| VAT should be 18% (rate change) | Issue | Simple | Low | Autonomous |
| Print quote button | New feature | Simple | Low | Autonomous |
| Session expires right after login | Issue | Complex | High | Human |

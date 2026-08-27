# Facts

Measured on **2026-08-27**. Nothing here is quoted from another document in this repository: every
row was produced by running something or by reading the file named beside it.

This file exists to be checked rather than believed. Where something could not be verified, the row
says so instead of softening it.

---

## 1. The tests, counted

```bash
npm test        # node --test test/
```

| Suite | File | Tests |
|---|---|---:|
| Events, rules, the catalogue's own invariants | `test/core.test.js` | 24 |
| Reachability, closures, what a choice costs | `test/queries.test.js` | 18 |
| The strings the tools return | `test/tools.test.js` | 21 |
| Hostile input | `test/hostile.test.js` | 11 |
| Planning towards a goal | `test/solve.test.js` | 11 |
| **Total** | | **85** |

**Skipped: zero. Failing: zero.** No build step, no dependencies — `package.json` has no
`dependencies` or `devDependencies` at all, and the whole thing runs on Node's own test runner.

**1,373 lines** across eight modules in `app/`.

---

## 2. Every claim the README makes

| Claim | Implementation | Test | Verified |
|---|---|---|:---:|
| Every tool call is an event; state is the reduction | `app/events.js:64` `reduce` | `core.test.js` "events reduce to state" (5) | **yes** |
| Undo is replaying fewer events, not inverse logic | `app/events.js:108` `rewindTo` | `core.test.js` "undo is just reducing fewer events" | **yes** |
| The log cannot be rewritten by its holder | `app/events.js:83` returns a copy | `core.test.js` "cannot be rewritten through the array it hands out" | **yes** |
| A refusal carries what, why, remedy, rule, state | `app/rules.js:26` `refuse` | `core.test.js` "refuse() builds the shape the gate proved works" | **yes** |
| Six rules on adding, two on removing | `app/rules.js:79` `whyNotAdd`, `:156` `whyNotRemove` | `core.test.js` (10 tests) | **yes** |
| A mutation returns the resulting state, never "ok" | `app/rules.js:184` `describe` | `tools.test.js` "a mutation reports the state it produced" (4) | **yes** |
| `what_this_closes` is real reachability, not a stub | `app/queries.js:92` `whatThisCloses` | `queries.test.js` "one free slot, two futures" | **yes** |
| Planning towards a track only proposes legal plans | `app/solve.js:59` `planForTrack` | `solve.test.js` "nothing it proposes would be rejected by the rules" | **yes** |
| Infeasibility names the blocker and prices each way out | `app/solve.js:109` `explainInfeasible` | `solve.test.js` (4 tests) | **yes** |
| Caller input is bounded and quoted before reaching a model | `app/rules.js:46` `quoteInput` | `hostile.test.js` (8 tests) | **yes** |
| Ten tools registered with WebMCP | `app/tools.js` `TOOLS`, `registerAll` | measured in-browser: 10 | **yes** |
| The catalogue's graph is at least four deep | `app/catalogue.js` | `core.test.js` "at least four levels deep" | **yes** — deepest chain is 6 |

The catalogue also tests **itself**: every prerequisite names a course that exists, and no course
requires something taught later than itself. Those break silently when a row is added, and the
demo fails live rather than in CI.

---

## 3. What a real model does with the tools

`npm run eval` — full results and limits in [`EVAL.md`](EVAL.md).

| | |
|---|---|
| `gemini-2.5-flash`, five usability scenarios | **5/5** |
| `gemini-3.6-flash`, first scenario before quota ran out | **passed** — repaired a refusal by building the whole five-course chain |
| Three adversarial scenarios | **written, not run** — the free tier's quota ran out first |

Two results are worth more than a tick. The model found **`list_actions → undo_to`** unprompted,
because `undo_to` needs a step number and it worked out where those come from. And asked to enrol
in a course that does not exist, it **searched and said so** rather than claiming success.

---

## 4. What does not work, or is not proven

### 4.1 The greedy placer can say no when a smarter search would say yes

`app/queries.js:47` `canStillPlace` is greedy earliest-fit. A `false` from it means *this planner
found no way*, not *no way exists*. It is documented at the function, and the tools' wording
follows it — `explain_infeasibility` says "that is a gap in this planner, not a proof that nothing
would work" when it cannot identify a blocker. **No test proves the two differ on a real case**,
because constructing one means writing the optimal solver this deliberately is not.

### 4.2 The page cannot tell who called a tool

WebMCP hands the `execute` handler its arguments and an `AbortSignal`, and nothing else. An agent's
call and a `document.modelContext.executeTool` call arrive identical. The page marks its own calls
(`app/store.js:35` `asPage`) and **assumes** everything else came from an agent — the screen says
"assumed" rather than claiming to know.

**This shapes the design.** A page's rules cannot rest on *who* is asking, only on *what* is being
asked. Every rule here is of the second kind.

### 4.3 The catalogue is synthetic

Forty courses, invented. Real, in the sense that the prerequisite graph is six levels deep, the
timetable clashes are genuine and the tracks need chains rather than shopping lists. But it is not
any university's, and no student or registrar has looked at it.

### 4.4 Not tested in ChatGPT's in-app browser

The rules name two environments a judge may use:

> *"Download the ChatGPT desktop app and use its in-app browser, which supports WebMCP by default.
> Alternatively, download Google Chrome 149 or later, enable `chrome://flags/#enable-webmcp-testing`,
> and restart the browser."*

**Only the second has been done**: Chrome 151 with the flag, plus the WebMCP Inspector extension
driving Gemini. Asking `chatgpt.com` in an ordinary browser tab does not work and cannot — a web
page has no access to another tab's model context, and ChatGPT says so plainly when asked.

The rules also say judges *"are not required to test the Project and may choose to judge based
solely on the text description, images, and video"*. That is why the page carries a scripted
walk-through that calls the same tools by the same contract: the most likely way this is seen is
without any agent at all.

### 4.5 One model family

Gemini, twice. Not GPT, not Claude, not a small local model. The eval harness would take about
twenty minutes to point at another provider; it has not been done.

### 4.6 The undo is per-session and lives in memory

There is no persistence. Reloading the page empties the plan. That is a demo's honesty, not a
product's — and it is why there is no auth, no accounts and no server.

### 4.7 The UI has no automated test

`app/ui.js` is exercised by hand and by the scripted walk-through. The logic under it is covered;
the rendering is not.

---

## 5. What the API actually does

Seven findings, none of them in Chrome's documentation as of this date, three found by getting it
wrong first. Full list with the error each produced:
[`WEBMCP-API-NOTES.md`](WEBMCP-API-NOTES.md).

The one that shaped the product: **`execute` returns a string the model reads**, so those strings
are the interface. That is why a mutation returns the resulting state and a refusal carries its
remedy — and why they are tested as carefully as the logic underneath.

---

## 6. Open, in one list

1. Adversarial eval scenarios written but not run — quota.
2. Not tested in ChatGPT's in-app browser, which is one of the two environments the rules name.
3. One model family.
4. The greedy placer's false negatives are documented but not characterised.
5. Synthetic catalogue, no registrar has seen it.
6. No persistence, no accounts, no server — deliberate, but it means "your plan" is per-tab.
7. `app/ui.js` has no automated test.

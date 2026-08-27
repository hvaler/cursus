# Cursus

A course planner whose tools can **refuse**, can say **what a choice closes off** two years before
it bites, and can be **rewound**. Built for [The WebMCP Challenge](https://webmcp.devpost.com/).

**Live: <https://hvaler.github.io/cursus/>**

**Both environments the rules name were tested, and both produce real tool calls.** One of them
has a condition worth knowing before you judge it:

- **ChatGPT's in-app browser** — open the page, **be in Work mode**, and tell the assistant to
  use the tool:

  > *Use the open page's WebMCP tool `what_this_closes` with: course `NUM-201`, term `3`.*

  Outside Work mode the same request gets an answer read off this repository instead of a tool
  call — and a convincing one. The tell: with an empty plan, a real call says `NUM-201`
  **closes no track**; anything about Graphics and Animation came from reading.

  **On an Enterprise or Edu workspace this route is closed** — site tools are not available
  there at all ([OpenAI's documentation](https://learn.chatgpt.com/docs/webmcp)), and nothing
  on screen says so. Use Chrome.
- **Chrome 149+** with `chrome://flags/#enable-webmcp-testing` and a WebMCP client — the route in
  [GATE.md](docs/GATE.md). No plan, mode or workspace conditions.

The demo video is recorded in ChatGPT's in-app browser, because that is the one the rules name
first. The runbook for it, with the four failures it took to find the condition, is in
[CHATGPT-WORK-MODE.md](docs/CHATGPT-WORK-MODE.md).

Without an agent the page still works: the buttons and the scripted walk-through call the same
tools, by the same contract.

## The argument

Most pages that expose tools to an agent expose compliant ones: `add_thing`, `list_things`. An
agent could do that by reading the DOM and clicking. Those tools add nothing.

These do three things a rendered timetable cannot.

**They refuse.** `add_course('ADV-301')` comes back with *why*, and with what would unblock it. On
2026-08-27 that made `gemini-3.6-flash` stop reporting a failure and start proposing a fix — then
ask permission before applying it. Nothing instructed it to. See [`docs/GATE.md`](docs/GATE.md).

**They answer what the screen cannot.** `what_this_closes` is forward reachability over the
prerequisite graph under a credit budget. With terms 1–2 full and six credits left in term 3:

| taking | closes |
|---|---|
| `NUM-201` | **Graphics and Animation** — `GEOM-201` only ever runs in term 3, and the term is now full |
| `GEOM-201` | **Data and Machine Learning** — `NUM-201` is needed for `ML-202` and everything after |

One slot, two futures, and either choice forecloses the other. No timetable shows that, and it is
not recoverable once the term is full.

**They can be undone.** Every tool call is an event; the state is the reduction of the events; so
rewinding is the same reducer with a smaller number, not per-tool inverse logic. The timeline on
the page is the log with a cursor.

## And the page never claims an agent was here

Every call is logged with where it came from, and the count says plainly that the attribution is an
assumption: WebMCP gives the `execute` handler no caller identity, so a page can only be certain
about the calls it makes itself.

That looked like pedantry until it caught something. Asked what taking `NUM-201` in term 3 closes
off, an assistant answered correctly and in detail — naming the track, the blocking course and the
trade — **having called no tool at all**. It had read this repository, where the example is written
out. The page loads empty, so a real tool call would have had to answer *"closes no track"*.

Asked again in a fresh conversation it went further — *"I have opened the page"*, *"the state its
own planner shows"*, *"the page itself summarises it as…"*. All three false, all three with a
`github.com` citation beside them.

Being right made it harder to spot, not easier. And the corollary is uncomfortable: **this README
explains that fork well enough to answer the question, which is precisely what made reading it
cheaper than calling the tool.** [`docs/FACTS.md §4.4`](docs/FACTS.md) has the whole episode.

## Running it

```bash
npm test          # 118 tests, no build step, no dependencies
npm run eval      # puts a real model in front of the tools; needs GEMINI_API_KEY
```

There is no build. What is in the repository is what is served. Node 20 or later.

The other two ways to test it — in a browser without an agent, and with a real one — are in
[`docs/TESTING.md`](docs/TESTING.md).

`npm test` checks the logic. **`npm run eval` checks the part unit tests cannot**: whether a model
reads these tool descriptions and picks the right one, and whether it can act on a refusal. On
2026-08-27, 5/5 — including finding `list_actions → undo_to` unprompted, and refusing to invent a
course that does not exist. Results and limits in [`docs/EVAL.md`](docs/EVAL.md).

## Layout

**1,650 lines** across nine modules, none of them importing in a circle. The diagrams and the
call flow are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

| | |
|---|---|
| `app/catalogue.js` | 40 courses, 6 terms, 4 tracks, the 30-credit cap — no reasoning |
| `app/events.js` | the log and the reducer — the decision the rest rests on |
| `app/rules.js` | 7 rules on adding, 3 on removing, and `refuse()` which enforces the shape of saying no |
| `app/queries.js` | reachability, closures, and what a choice costs |
| `app/solve.js` | placement, planning towards a track, and pricing each way out |
| `app/store.js` | the one log everything reads from, and what the page can honestly say about callers |
| `app/policy.js` | the student's own limits, held against the agent |
| `app/tools.js` | the eleven tools, and the strings they return |
| `app/ui.js` | the screen, rendered from the same log |
| `gate.html` | the day-one gate that proved the API works at all |

## The documents

| | |
|---|---|
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | the modules, the call flow, and the one decision underneath |
| [`TESTING.md`](docs/TESTING.md) | four ways to test this, cheapest first |
| [`CHATGPT-WORK-MODE.md`](docs/CHATGPT-WORK-MODE.md) | getting the tools callable from ChatGPT, and the four attempts it took |
| [`FACTS.md`](docs/FACTS.md) | every claim, its code, its test, and what is not verified |
| [`GATE.md`](docs/GATE.md) | the traces from both environments |
| [`EVAL.md`](docs/EVAL.md) | a real model in front of the tools, and the limits of that |
| [`WEBMCP-API-NOTES.md`](docs/WEBMCP-API-NOTES.md) | nine things about the API, with the error each produced |

## What we learned about the API, by getting it wrong

None of this is in the Chrome documentation as of 2026-08-27.

- Registration is on **`document.modelContext`**, not `navigator.modelContext`.
- `execute` returns **a string the model reads**, not a structured object. So a mutating tool
  should return the resulting state, never an acknowledgement — otherwise the agent's idea of the
  state silently diverges from the page's.
- **`registerTool` returns `undefined`**, so it is not the source of the `RegisteredTool` handle
  that `executeTool` requires — that comes from **`getTools()`**. Passing the tool's name instead
  throws `TypeError: The provided value is not of type 'RegisteredTool'`.
- **`executeTool` wants its arguments as a JSON string**, not an object.
- **The page cannot tell who called a tool.** An agent and `executeTool` arrive identical, so a
  page's rules cannot rest on *who* is asking — only on *what* is being asked.

All nine, with the error each one produced, are in
[`docs/WEBMCP-API-NOTES.md`](docs/WEBMCP-API-NOTES.md). The last two came from ChatGPT's in-app
browser and are the only ones not reproducible from a button on the page.

## Status

**The gate is passed.** On 2026-08-27 `gemini-3.6-flash`, driven through the
[WebMCP Inspector](https://github.com/GoogleChromeLabs/webmcp-tools), was given one sentence —
*"Matricúlame en ADV-301"* (*"Enrol me in ADV-301"*) — chose the `enrol` tool on its own, was
refused, and answered by
explaining the prerequisite and **offering to enrol `CALC-101` first**. The full trace and what it
settles are in [`docs/GATE.md`](docs/GATE.md).

| | |
|---|---|
| Tools register | **yes**, Chrome 151 and Edge |
| An external client discovers them, with schemas | **yes** |
| An agent chooses the right tool unprompted | **yes** |
| A refusal reads well enough for the agent to repair the situation | **yes** — the finding |
| ChatGPT's in-app browser registers the tools | **yes**, all ten |
| ...and a model there calls one | **yes** in **Work mode** — and **no**, four times, outside it ([FACTS §4.4](docs/FACTS.md)) |

## Licence

Apache-2.0. See [`LICENSE`](LICENSE).

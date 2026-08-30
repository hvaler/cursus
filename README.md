# Cursus

A course planner whose tools **refuse**, say **what a choice closes off** two years before it
bites, **hold a limit you set** against the agent, and can be **rewound**. Built for
[The WebMCP Challenge](https://webmcp.devpost.com/).

**Live: <https://hvaler.github.io/cursus/>** — thirteen tools on `document.modelContext`.

**Both of the environments named in the challenge rules were tested, and a model makes real
tool calls in each.** To watch one happen:

- **ChatGPT's in-app browser, in Work mode.** Open the page and ask the assistant to use a tool.
  Work mode is the requirement, and Enterprise or Edu workspaces cannot do it at all.
  [CHATGPT-WORK-MODE.md](docs/CHATGPT-WORK-MODE.md) is the runbook — including how to tell a real
  tool call from a convincing answer, which turns out to matter.
- **Chrome 149+** with `chrome://flags/#enable-webmcp-testing` and a WebMCP client. No conditions;
  the trace is in [GATE.md](docs/GATE.md).

With no agent at all the page still works: the buttons and the scripted walk-through call the same
tools, by the same contract.

**The page shows its own tool-call log and a timeline, which a course planner for students would
not.** That is not an unfinished product showing its wiring — it is the argument. You can see which
calls an agent made, what each returned, what the page assumed about who was asking, and you can
rewind any of it. A version of this for a real registrar would hide all three. This one is built to
be checked.

## The problem, and who has it

**A student picks four courses for their third term because those are the ones that fit.** Two
years later a specialisation they wanted is out of reach — not because anything refused them, but
because the one course it needed runs in a single term, and that term filled up. No warning
appeared. The cost landed twenty-one months after the decision, and by then it was not a decision
any more.

An adviser can work this out with the handbook open and twenty minutes. Most students never think
to ask, and most advisers have more students than twenty-minute slots. **So the calculation that
decides which doors stay open is the one nobody performs** — not because it is hard to explain, but
because it has to be redone from scratch every time anything changes.

That is what these tools do, and it is why they belong to an agent rather than to a button: the
question is asked in the middle of choosing, in a person's own words, about a plan that is theirs.

## The argument

Most pages that expose tools to an agent expose compliant ones: `add_thing`, `list_things`. An
agent could do that by reading the DOM and clicking. Those tools add nothing.

These do five things a rendered timetable cannot.

**They refuse.** `add_course('ADV-301')` comes back with *why*, and with what would unblock it. On
2026-08-27 that made `gemini-3.6-flash` stop reporting a failure and start proposing a fix — then
ask permission before applying it. Nothing instructed it to. See [`docs/GATE.md`](docs/GATE.md).

**They hold a limit you set, against the agent.** Every other rule here belongs to the university:
prerequisites, clashes, a credit cap, the same for everyone. `protect_track` belongs to the person.
Say *keep Graphics open* and from then on any course that would close it is refused — **including
when you ask for it yourself an hour later** — and the refusal cites your own instruction rather
than the handbook. The planner will not route through it either.

**This is the part that is not really about courses.** Anyone handing work to an agent has the same
question: *how do I let it act for me without it doing the one thing I would have vetoed?* Prompts
are the usual answer, and a prompt is a request. A page that carries the user's policy and enforces
it structurally is a different answer — the limit lives with the state it protects, survives the
conversation that set it, and applies to whoever asks next. It cost almost nothing to build here,
because a protection is an event like any other: `undo_to` takes it back out and no code was
written to make that true.

**They answer what the screen cannot.** `what_this_closes` is forward reachability over the
prerequisite graph under a credit budget. With terms 1–2 full and six credits left in term 3:

| taking | closes |
|---|---|
| `NUM-201` | **Graphics and Animation** — `GEOM-201` only ever runs in term 3, and the term is now full |
| `GEOM-201` | **Data and Machine Learning** — `NUM-201` is needed for `ML-202` and everything after |

One slot, two futures, and either choice forecloses the other. No timetable shows that, and it is
not recoverable once the term is full.

**They price the way out.** Asked whether a specialisation is still possible, the page does not
answer *no*. `explain_infeasibility` names the course that blocks it, the rule behind it, and every
way to make room — with what each one costs. In the fixture above there are five ways and **every
one closes another specialisation**, which is more useful than a solver that shrugs.

**They can be undone.** Every tool call is an event; the state is the reduction of the events; so
rewinding is the same reducer with a smaller number, not per-tool inverse logic. The timeline on the
page is the log with a cursor.

## And the page never claims an agent was here

Every call is logged with where it came from, and the count says plainly that the attribution is an
assumption: WebMCP gives the `execute` handler no caller identity, so a page can only be certain
about the calls it makes itself.

That looked like pedantry until it caught something. Asked what taking `NUM-201` in term 3 closes
off, an assistant answered correctly and in detail — **having called no tool at all**. It had read
this repository. Asked again it claimed *"I have opened the page"*, with a `github.com` citation
beside the sentence. Being right made it harder to spot, not easier.

The corollary is uncomfortable and worth passing on: **this README explains that fork well enough
to answer the question, which is exactly what made reading it cheaper than calling the tool.** The
whole episode, and the tell that catches it, is in [`docs/FACTS.md §4.4`](docs/FACTS.md).

## Running it

```bash
npm test          # 157 tests, no build step, no dependencies
npm run eval      # puts a real model in front of the tools; needs GEMINI_API_KEY
```

There is no build. What is in the repository is what is served. Node 20 or later.

To open the page itself, **serve the folder** — any static server will do, and none of them need
installing anything:

```bash
npx serve .          # then open the address it prints
python -m http.server  # or this, then http://localhost:8000
```

**Do not open `index.html` by double-clicking it.** Browsers block ES module imports over `file://`,
so the page loads and stays blank — which looks exactly like a broken project and is not one. The
live copy at <https://hvaler.github.io/cursus/> needs none of this.

The other two ways to test it — in a browser without an agent, and with a real one — are in
[`docs/TESTING.md`](docs/TESTING.md).

`npm test` checks the logic. **`npm run eval` checks the part unit tests cannot**: whether a model
reads these tool descriptions and picks the right one, and whether it can act on a refusal. On
2026-08-27, **8/8 across thirteen tools** — including the three adversarial scenarios, finding
`list_actions → undo_to` unprompted, and refusing to invent a course that does not exist. Results and limits in [`docs/EVAL.md`](docs/EVAL.md).

## Layout

**1,993 lines** across ten modules, none of them importing in a circle. The diagrams and the
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
| `app/share.js` | a plan in a link, replayed back through the rules |
| `app/tools.js` | the thirteen tools, and the strings they return |
| `app/ui.js` | the screen, rendered from the same log |
| `gate.html` | the day-one gate that proved the API works at all |

## The documents

| | |
|---|---|
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | the modules, the call flow, and the one decision underneath |
| [`TESTING.md`](docs/TESTING.md) | four ways to test this, cheapest first |
| [`CHATGPT-WORK-MODE.md`](docs/CHATGPT-WORK-MODE.md) | getting the tools callable from ChatGPT, and the four attempts it took |
| [`demo/`](demo) | the video: script, checklist, narration, subtitles, and the two scripts that build them |
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
*"Matricúlame en ADV-301"* (*"Enrol me in ADV-301"*) — chose the tool on its own, was refused, and
answered by explaining the prerequisite and **offering to enrol `CALC-101` first**.

That ran against a deliberately tiny two-tool page, before any product code existed; it is still
here as [`gate.html`](gate.html). The full trace and what it settles are in
[`docs/GATE.md`](docs/GATE.md).

| | |
|---|---|
| Tools register | **yes**, Chrome 151 and Edge |
| An external client discovers them, with schemas | **yes** |
| An agent chooses the right tool unprompted | **yes** |
| A refusal reads well enough for the agent to repair the situation | **yes** — the finding |
| ChatGPT's in-app browser registers the tools | **yes**, every one |
| ...and a model there calls one | **yes**, in **Work mode** ([the runbook](docs/CHATGPT-WORK-MODE.md)) |

## Licence

Apache-2.0. See [`LICENSE`](LICENSE).

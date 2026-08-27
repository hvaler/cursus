# Devpost submission text

Ready to paste. The rules ask the description to cover four things — why the use case fits WebMCP,
how it improves the experience, **what people and agents can do together that was difficult or
impossible before**, and a brief implementation note. All four are here, in that order, under
headings a judge can skim.

Every figure below is measured, and re-measurable: `npm test`, `npm run eval`.

---

## Elevator pitch

```text
A course planner whose tools refuse, say what a choice closes off two years before it bites, and can be rewound — and that never claims an agent was here when it cannot know.
```

---

## The long text

### The problem

A university course planner shows you what you picked. That is all any timetable shows.

What it cannot show you is what picking it **costs**. Take one course in your third term and a
specialisation you were counting on becomes unreachable in your sixth — because a prerequisite runs
in one term only, and that term is now full. The consequence lands two years later. Nobody works it
out in their head, and no interface offers to.

### What Cursus does

Eleven tools, registered with `document.modelContext.registerTool`, that do five things a rendered
timetable cannot.

**They refuse.** Ask an agent to enrol you in Advanced Calculus and the page says no — naming the
missing prerequisites and, crucially, what would unblock them. That last clause changes the agent's
behaviour: it stops reporting a failure and starts proposing a fix. In our first end-to-end test it
went further and asked permission before applying it. Nothing instructed it to.

**They answer what the screen cannot.** `what_this_closes` is forward reachability over the
prerequisite graph under a credit budget. With terms 1–2 full and six credits left in term 3:

| taking | closes |
|---|---|
| `NUM-201` | Graphics and Animation — `GEOM-201` only ever runs in term 3, and the term is now full |
| `GEOM-201` | Data and Machine Learning — `NUM-201` is required for `ML-202` and everything after |

One slot, two futures, and either choice forecloses the other.

**They price the way out.** Asked whether a specialisation is still possible, the page does not
answer "no". It names the blocking course, the rule that stops it, and every way to make room —
with what each one costs. In that fixture there are five ways, and **every one of them closes
another specialisation.**

**They can be undone.** Every tool call is an event and the plan is the reduction of those events,
so rewinding is the same reducer with a smaller number rather than per-tool inverse logic. The
timeline on the page is the log with a cursor.

**And they hold the student's own limits against the agent.** This is the one that runs the other
way. Every rule above belongs to the university — a prerequisite, a clash, a credit cap, the same
for everyone. `protect_track` belongs to the person: say *"whatever else happens, do not close
Graphics"* and from then on **any course that would close it is refused, including when you ask for
it yourself an hour later**, and the refusal cites your own instruction rather than the handbook.
The planner will not even propose a route through it.

A tool surface that only exposes capability lets an agent do whatever the UI could do, faster. One
that also carries the user's policy lets them say **what they will not have done to their plan**,
and have it hold while they are not watching. It cost almost nothing to build, because a protection
is an event like any other — so `undo_to` unwinds it with everything else, and no code was written
to make that true.

### Why this fits WebMCP rather than an API

Three reasons, and they are properties of the standard rather than of this domain.

The tools **act in the user's own session, on the page they are looking at**, with no key to
provision and no account to link. The plan is theirs, in their tab, and they watch it change.

The tools are **things the DOM cannot do**. If an agent could get the same answer by reading the
page and clicking, the tool surface adds nothing. Reachability under a budget is not on the screen.

And the interface is **prose**. `execute` returns a string the model reads, so the strings are the
product. That is why every mutation returns the resulting plan instead of `ok` — otherwise the
agent's picture of the state silently drifts from the page's — and why every refusal carries a
remedy.

### What people and agents can do together here that was hard before

A student could always ask an adviser *"what am I giving up if I take this?"* and an adviser could
always work it out, slowly, with the handbook open. What was not possible was asking the **page**,
in the middle of choosing, and having it answer with a number instead of a shrug.

And the direction that matters is the other one: **the page can say no to the agent, in a way the
agent can act on.** A tool that refuses with a remedy turns an agent from something that either
succeeds or fails into something that negotiates — it repairs the situation and, in our tests,
asks before committing. That behaviour was not prompted. It came from the shape of the refusal.

### Where it was tested

**Both environments the rules name, and both produce real tool calls.**

**Chrome 149+** with the WebMCP flag and the Inspector extension: an agent chose the tool on its
own, was refused, and proposed the fix. That is the gate in `docs/GATE.md`, and it has no plan,
mode or workspace conditions.

**ChatGPT's in-app browser**: the page registers its tools and a model calls them — **in Work
mode**. Outside it, four different phrasings produced no call at all, and confident answers read off
our own README instead. Finding that out took an afternoon and is written up in
`docs/CHATGPT-WORK-MODE.md`, including the part a judge most needs: **site tools are not available
in Enterprise or Edu workspaces**, no setting changes it, and nothing on screen says so. On those,
use Chrome.

**The video is recorded in ChatGPT's in-app browser**, because that is the environment the rules
name first and the one most judges will reach for.

### How it is built

No build step, no dependencies, no server. Plain ES modules on GitHub Pages: what is in the
repository is what is served. The rules allow any provider, and with nothing to compile and nothing
to run server-side, a platform would have been a platform and not a capability — the tools act in
the user's own tab, which is the whole reason WebMCP fits this better than an API would.

The whole thing rests on one decision — **every tool call is an event, and the state is the
reduction of the events**. Refusing is the reducer rejecting an event before state changes. Undo is
replaying fewer of them. The audit trail is the list itself.

**118 tests**, none skipped, on Node's own test runner. `npm run eval` puts a real model in front of
the tools and asserts on what it *did*: 5/5, including finding `list_actions → undo_to` unprompted,
and refusing to invent a course that does not exist.

### What we found out about WebMCP

Nine things, none of them in Chrome's documentation, three found by getting them wrong first.
Registration is on `document`, not `navigator`. `registerTool` returns nothing, so the handle comes
from `getTools()`. `executeTool` wants its arguments as a JSON string. The client renames your
tools. And the one that shaped the product: `execute` returns a string, so the strings are the
interface.

The eighth came from the environment the rules themselves name, and cost four failed attempts.
A page reading **"WebMCP available — 10 tools registered"** has established that the API exists
in that browser and nothing more: **registration succeeding is not evidence a model can call
anything.** Zero calls is consistent with the host never bridging the tools, with a model seeing
them and declining, with no agent being present, and — as it turned out here — with the client
being in the wrong mode. **A page sees one number for all four.** So a WebMCP page cannot
diagnose its own silence, and has to tell the reader what to check on their side instead. Ours
now names the mode in its first paragraph, because four attempts went the other way first.

The ninth fell out of the same run. The host does not hand the model a page's tools and stop
there: it adds one of its own, **`webmcp_list_tools`**, which this page does not register and
which the model called first to enumerate the registry before calling into it. A page's names
share a namespace with the client's. They are all written up with the error each one produced.

### The thing we did not expect

Asked what taking `NUM-201` in term 3 closes off, an assistant answered correctly and in detail —
naming the track, the blocking course and the trade. Asked again, it said *"I have opened the page"*
and *"the page itself summarises it as…"*.

**It had called no tool at all.** It had read the repository, where that example is written out. The
proof is in the answer: the page loads with an empty plan, so a real tool call would have had to
say "closes no track".

Being right made it harder to notice, not easier. This is why the page counts calls by origin and
states plainly that the attribution is a guess — WebMCP gives the handler no caller identity, so a
page can only be sure about the calls it makes itself. It was written as a caveat and turned out to
be the only thing standing between a plausible answer and a false conclusion.

There is an uncomfortable corollary for anyone documenting a tool surface: our README explains that
fork well enough to answer the question, and that is exactly what made reading cheaper than calling.

### What it does not do

The catalogue is synthetic — real in structure, invented in content, and no registrar has seen it.
There is no persistence: reload and the plan is empty, which is why there is no auth and no server.
The planner is greedy with one repair pass, so a "no" from it means *this planner found no way*,
not *no way exists*. It has been evaluated against one model family, and only through Chrome: the five
scored scenarios all ran there. ChatGPT's in-app browser has two real calls to its name, not a
scenario set, and Codex — documented as a third surface — has never been tried.

---

## Built with

```text
webmcp, javascript, es-modules, github-pages, gemini, node, no-build, apache-2.0
```

## Links

- **Live**: https://hvaler.github.io/cursus/
- **Repository**: https://github.com/hvaler/cursus (Apache-2.0)
- **Video**: _pending_

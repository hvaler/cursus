# Video script

**Hard limit: under 3:00.** The rules say *"must be less than three (3) minutes"* — this targets
**2:40**, which leaves room for a slow start without a re-record.

Public on YouTube, with audio covering **what was built and how WebMCP was used**. No copyrighted
music, no third-party trademarks. Narration in English.

Narration is ~360 words. At an unhurried 135 words a minute that is about **2:40**, which leaves
room for pauses between shots without going over. The first draft was 413 words and came out at
3:04 read slowly — worth knowing before trusting a word count.

Every claim below is one the repository can back; nothing here is a promise.

---

## Before recording

- [ ] Chrome 151, `chrome://flags/#enable-webmcp-testing` on, restarted.
- [ ] **WebMCP Inspector** extension installed, Gemini API key set in it.
- [ ] <https://hvaler.github.io/cursus/> open, hard-reloaded, plan **empty**.
- [ ] A second tab with the repo, for the closing shot.
- [ ] Browser zoom so the trace panel text is readable at 1080p. Check by squinting.
- [ ] Close every other tab, notification, and the taskbar clock if it shows anything personal.
- [ ] One dry run of the whole thing, timed. If it runs over 2:50, cut the *explain_infeasibility*
      beat to a single line — it is the one that survives being shortened.

---

## The shots

### 0:00 – 0:18 · The problem

**On screen:** the plan, six terms, filling as you click four or five courses quickly.

> "A course planner. It shows what you picked — which is all any timetable shows. Not what
> picking it costs you two years from now."

### 0:18 – 0:42 · A tool that refuses

**On screen:** the Inspector panel. Type into the prompt: `Enrol me in ADV-301.` Let it run.
Trace panel fills, the refusal appears in red.

> "I asked an agent to enrol me in a course. The page refused — and the refusal names the
> missing prerequisite, and what would unblock it."

**On screen:** highlight `To unblock it: place CALC-102 and NUM-201 in a term before 5.`

> "That last sentence does the work. The agent stops reporting a failure and starts proposing a
> fix — and in our first test it asked permission before applying it. Nothing told it to."

### 0:42 – 1:18 · The question a screen cannot answer

**On screen:** click through the setup so terms 1 and 2 are full and term 3 has six credits left.
*(Or press the walk-through button and let it do the setup, then pause.)*

> "Now the interesting part. One slot left in term three."

**On screen:** ask the agent: `What do I give up if I take NUM-201 in term 3?`

> "Taking NUM-201 closes Graphics and Animation — because Geometry for Graphics only ever runs in
> term three, and term three is now full."

**On screen:** ask: `And if I take GEOM-201 instead?`

> "Geometry closes Data and Machine Learning instead. One slot, two futures, and either choice
> forecloses the other. That is reachability over a prerequisite graph under a credit budget.
> Nobody works it out in their head."

### 1:18 – 1:42 · When the goal is out of reach

**On screen:** ask: `Can I still complete the graphics track? If not, why?`

> "Asked whether a specialisation is still possible, it does not answer 'no'. It names the
> blocking course, the rule, and every way to make room — with what each one costs."

**On screen:** let the five priced repairs sit on screen for two seconds.

> "Five ways out. Every one closes another specialisation. There is no free version of this
> trade."

### 1:42 – 2:02 · Undoing it

**On screen:** the timeline. Click a step three or four back. The plan and the tracks re-render.

> "Everything the agent did is on a timeline, and any of it can be rewound. Every tool call is
> an event, the plan is the reduction of those events, so undo is the same reducer with a
> smaller number."

### 2:02 – 2:25 · How it is built

**On screen:** `app/tools.js`, scrolled to a `registerTool` call.

> "Ten tools, registered with `document dot modelContext dot registerTool`. The thing that
> shaped all of it: `execute` returns a **string the model reads**. These strings are the
> interface, not a serialisation of it."

**On screen:** the tool result text in the trace.

> "So a tool that changes something returns the resulting plan, never 'ok' — or the agent's
> picture of the state drifts from the page's, and neither of them knows."

### 2:25 – 2:40 · What the page will not claim

**On screen:** the trace counter, reading *"N calls, N attributed to an agent — the page cannot
verify that."*

> "Last thing. WebMCP gives a page no way to know who called it, so this page counts calls by
> origin and says the attribution is a guess."

**On screen:** cut to the README section about the agent that answered without calling anything.

> "That caught something. An assistant answered a question about this page correctly and in
> detail — having called no tool at all. It had read the repository. Being right made it
> harder to notice."

**End card:** `hvaler.github.io/cursus` · `github.com/hvaler/cursus` · Apache-2.0

---

## Things not to say

- Not *"it never hallucinates"*. The rules are in code; the agent's prose is not.
- Not *"it works in ChatGPT's in-app browser"* on its own. It does — **in Work mode**. Outside it,
  four prompts produced no call at all ([FACTS §4.4](../docs/FACTS.md)). The condition travels
  with the claim or the claim does not get made.
- Not *"the solver finds the optimal plan"*. It is greedy with one repair pass, and a `no` from it
  means *this planner found no way*.
- Not a specialisation count or a test count that has not been re-run that morning.

## If something goes wrong on the day

The page carries a scripted walk-through that calls the same tools by the same contract, labelled
`page` rather than `AGENT`. If the Inspector or the API key fails mid-record, press it and narrate
the same beats — then **say on camera that it is the scripted path, not an agent**. The rules allow
judges to score from the video alone; they do not allow the video to imply something that did not
happen.

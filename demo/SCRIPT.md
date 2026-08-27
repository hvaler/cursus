# Video script — recorded in ChatGPT's in-app browser

**Hard limit: under 3:00.** The rules say *"must be less than three (3) minutes"*. This targets
**2:40**.

Public on YouTube, audio covering **what was built and how WebMCP was used**. No copyrighted music,
no third-party trademarks beyond the app being visibly ChatGPT. Narration in English, ~350 words:
at an unhurried 135 words a minute that is about 2:35, leaving room for the pauses. An earlier
draft of 413 words came out at 3:04 read slowly — worth knowing before trusting a word count.

Recorded in ChatGPT desktop rather than Chrome, because that is the environment the rules point
judges at first, and because the split screen does the explaining: **the prompt on the left, the
page's live tool-call panel on the right**, reacting in the same frame. Nothing to introduce, no
extension to justify.

---

## The one constraint that shapes everything

**Tool calls through the in-app browser take a while.** Measured: **53 seconds** for the clean one,
3 minutes 18 for the first. Two live calls at that rate would be the whole video.

So the plan is:

- **Two agent calls, no more.** Both sped up in the edit, with the speed shown on screen.
- **The setup is done by hand**, by clicking the catalogue. It is instant, it is honest — the trace
  labels those `page`, never `AGENT` — and it happens to be the better story: the student does the
  picking, the agent does the reasoning nobody can do in their head.

Do not try to fill the plan by asking the agent. That is four or five calls and four or five
minutes.

---

## Before recording

- [ ] ChatGPT desktop, **Work mode on**. Without it there are no tool calls at all
      ([CHATGPT-WORK-MODE.md](../docs/CHATGPT-WORK-MODE.md)).
- [ ] **Not an Enterprise or Edu workspace.** Site tools do not exist there and no setting
      brings them back, so there is nothing to film. Record in Chrome instead.
- [ ] <https://hvaler.github.io/cursus/> open in the **in-app browser**, hard-reloaded, plan
      **empty**, status line green: *WebMCP available — 10 tools registered.*
- [ ] The page pane wide enough that **TOOL CALLS, LIVE** is readable at 1080p. Squint-test it.
- [ ] A second tab on the repo, for the closing shot.
- [ ] Sidebar collapsed — the conversation titles are personal.
- [ ] Notifications off, taskbar clock checked.
- [ ] **One full rehearsal, timed, with the real prompts.** Which prompt you use is decided by the
      rehearsal, not by this file. See below.

### Decide this in rehearsal, not on camera

The instruction known to work names the tool:

```text
Use the open page's WebMCP tool what_this_closes with: course NUM-201, term 3
```

A bare question — `What does taking NUM-201 in term 3 close off?` — has **never been tried inside
Work mode**. It is the stronger shot by far, because a model choosing the tool is the thing worth
filming.

**So rehearse the bare question first.** If it produces a call, use it and narrate it as what it
is. If it does not, fall back to naming the tool and **change the narration to match** — say the
tool was named. The unprompted choice is already on record from the Chrome run in
[GATE.md](../docs/GATE.md); this video does not have to carry it.

---

## The shots

### 0:00 – 0:16 · The problem

**On screen:** the whole window. ChatGPT on the left, the empty planner on the right. Six terms,
0/30 each. Four specialisations, all still reachable.

> "A course planner, open inside ChatGPT's browser. It shows what you picked — which is all any
> timetable shows. Not what picking it costs you two years from now."

### 0:16 – 0:38 · The student does the student part

**On screen:** click through the catalogue quickly, filling terms 1 and 2 and leaving **six credits
free in term 3**. The plan and the credit counters move. In the trace, each one appears tagged
`page`.

> "So I fill in my first year by hand. The page records every one of those as a tool call — the
> same tools an agent would use, tagged `page` rather than agent, because the page can only be
> certain about the calls it makes itself."

**On screen:** one slot left in term 3. Pause on it.

### 0:38 – 1:12 · The question a screen cannot answer

**On screen:** type into ChatGPT. Send. The right-hand panel stays in frame.

> "One slot left. Now the question no timetable answers."

**On screen:** the wait, **sped up, with `×6` in the corner**. Then `AGENT what_this_closes(...)`
appears in the panel and the answer lands on the left.

> "Taking NUM-201 closes Graphics and Animation — because Geometry for Graphics only ever runs in
> term three, and term three is now full. That is reachability across a prerequisite graph under a
> credit budget. It is not on the screen, and nobody works it out in their head."

**On screen:** hold on the `AGENT` tag for a beat.

### 1:12 – 1:45 · A tool that refuses

**On screen:** type `Enrol me in ADV-301.` Send. Sped up again.

> "Now something it cannot do. The page refuses — and the refusal names the missing prerequisites
> and says what would unblock them."

**On screen:** highlight `To unblock it: place CALC-102 and NUM-201 in a term before 5.`

> "That last sentence does the work. The agent stops reporting a failure and starts proposing a
> fix. In our first test it went further and asked permission before applying it. Nothing told it
> to."

### 1:45 – 2:05 · Undoing it

**On screen:** the timeline. Click a step three or four back. The plan, the credits and the
reachable tracks all re-render.

> "Everything on that timeline can be rewound. Every tool call is an event, the plan is the
> reduction of those events, so undo is the same reducer with a smaller number — not per-tool
> inverse logic."

### 2:05 – 2:25 · How it is built

**On screen:** second tab, `app/tools.js`, scrolled to a `registerTool` call.

> "Ten tools, registered with `document dot modelContext dot registerTool`. The thing that shaped
> all of it: `execute` returns **a string the model reads**. These strings are the interface, not a
> serialisation of it."

**On screen:** back to the page, on the tool result text in the trace.

> "So a tool that changes something returns the resulting plan, never 'ok' — or the agent's picture
> of the state drifts from the page's, and neither of them knows."

### 2:25 – 2:40 · What the page will not claim

**On screen:** the trace counter, reading *"N calls, N attributed to an agent — the page cannot
verify that."*

> "Last thing. WebMCP gives a page no way to know who called it, so this page counts calls by
> origin and says the attribution is a guess."

> "That caught something. An assistant answered a question about this page correctly and in
> detail — having called no tool at all. It had read the repository. Being right made it harder to
> notice."

**End card:** `hvaler.github.io/cursus` · `github.com/hvaler/cursus` · Apache-2.0

---

## Editing

**Say the speed-up on screen.** A `×6` badge in the corner during each wait, or a caption *"wait
sped up"*. The rules do not forbid editing, but a video that implies a 53-second call was instant
is claiming something that did not happen, and this project's whole argument is that it does not do
that.

**Do not cut between the prompt going in and the panel updating.** The value of this recording is
that both are in one frame: the instruction on the left, the `AGENT` line appearing on the right,
with no cut in between for anyone to wonder about.

---

## YouTube description, ready to paste

```text
Cursus - a course planner whose WebMCP tools refuse, say what a choice closes off two years
before it bites, and can be rewound.

Built for The WebMCP Challenge.

Live:  https://hvaler.github.io/cursus/
Code:  https://github.com/hvaler/cursus  (Apache-2.0)

Ten tools registered with document.modelContext.registerTool. Every tool call is an event and
the plan is the reduction of those events, so undo is the same reducer with a smaller number and
the audit trail is the list itself. The screen renders from that same log, so there is no second
source of truth for an agent and a person to disagree about.

Both environments the challenge rules name were tested and both make real tool calls:

  - Chrome 149+ with chrome://flags/#enable-webmcp-testing and the WebMCP Inspector, where an
    agent chose the tool unprompted and acted on a refusal.
  - ChatGPT's desktop in-app browser, which is what this video shows - in Work mode. Site tools
    are not available in Enterprise or Edu workspaces.

Waits between sending a prompt and the tool call landing are sped up; the speed is shown on
screen. Nothing else is edited.

89 tests, no build step, no dependencies, no server.
```

**Two things that description does on purpose.** It says both environments were tested and which
one you are watching, because the video only shows one. And it says the waits were sped up, in the
description as well as on screen, because someone who reads before watching should not have to
discover it.

---

## Things not to say

- Not *"it works in ChatGPT's in-app browser"* on its own. It does — **in Work mode**. Outside it,
  four prompts produced no call at all ([FACTS §4.4](../docs/FACTS.md)). The condition travels with
  the claim or the claim does not get made.
- Not *"the agent chose the tool"* unless it did, in the take you are using. If you named the tool
  in the prompt, say so.
- Not *"it never hallucinates"*. The rules are in code; the agent's prose is not.
- Not *"the solver finds the optimal plan"*. It is greedy with one repair pass, and a `no` from it
  means *this planner found no way*.
- Not a test count or a specialisation count that has not been re-run that morning.

---

## If it goes wrong on the day

**If no tool call happens**, check Work mode first. That is four out of four of the failures on
record.

**If it still does not**, two fallbacks, in order:

1. **Chrome 151** with `chrome://flags/#enable-webmcp-testing` and the WebMCP Inspector extension.
   This is the route in [GATE.md](../docs/GATE.md) and it is proven. The beats are identical; the
   trace panel is the Inspector's instead of ChatGPT's.
2. **The scripted walk-through** on the page, which calls the same tools by the same contract and
   is labelled `page`. Press it and narrate the same beats — then **say on camera that it is the
   scripted path, not an agent**. The rules allow judges to score from the video alone; they do not
   allow the video to imply something that did not happen.

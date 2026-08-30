# Video script — recorded in ChatGPT's in-app browser

**Hard limit: under 3:00.** The rules say *"must be less than three (3) minutes"*. **The narration
is already recorded and runs 2:31.6**, so the limit stopped being something to watch for and
became something measured. Twenty-eight seconds spare.

Public on YouTube, audio covering **what was built and how WebMCP was used**. No copyrighted music,
no third-party trademarks beyond the app being visibly ChatGPT.

**The narration is a file, not a performance.** 368 words read by **`en-GB-Studio-B`** at 0.95, in
`cursus-voz/narration.wav` — the same voice and rate a sibling project used, for a reason that
holds here too: a project whose argument is that nothing is guessed at should not narrate itself
with a vendor it does not otherwise use, and this one runs its evaluation on Gemini through the
same cloud. Studio voices also read long-form prose with sentence rhythm rather than the
word-by-word cadence that makes a demo sound automated.

Every timing below was measured from that file rather than planned, which is why they are odd
numbers: a shot is as long as its sentences turned out to be, plus the pause after it. The pauses
are not filler — they are the time to read what is on screen, and the longest of them sit where
there is most to read. **Record the screen silent and follow the clock.** An earlier
draft of 413 words came out at 3:04 read slowly — worth knowing before trusting a word count.

Recorded in ChatGPT desktop rather than Chrome, because that is the environment the rules point
judges at first, and because the split screen does the explaining: **the prompt on the left, the
page's live tool-call panel on the right**, reacting in the same frame. Nothing to introduce, no
extension to justify.

---

## What this version shows, and why it changed

An earlier cut spent two agent calls asking what each side of the fork costs, one course at a time.
`compare_options` answers both in one call, and the ~50 seconds that saves buys the beat this
project's whole argument rests on: **the student declares a limit and the page holds it against the
agent.**

So the shape is a story rather than a tour. *Here is the trade. I am not willing to lose that one.
Now the agent cannot take it, even when asked.*

**Three agent calls, and the third one is a refusal that quotes the user back to themselves.**

---

## The one constraint that shapes everything

**Tool calls through the in-app browser take a while.** Measured: **53 seconds** for the clean one,
3 minutes 18 for the first. Three live calls at that rate is most of an afternoon on screen.

So:

- **Three agent calls, no more.** All sped up in the edit, with the speed shown on screen.
- **The setup is done by hand**, by clicking the catalogue. It is instant, it is honest — the trace
  labels those `page`, never `AGENT` — and it happens to be the better story: the student does the
  picking, the agent does the reasoning nobody can do in their head.

Do not try to fill the plan by asking the agent. That is four or five calls and four or five
minutes.

---

## Before recording

- [ ] ChatGPT desktop, **Work mode on**. Without it there are no tool calls at all
      ([CHATGPT-WORK-MODE.md](../docs/CHATGPT-WORK-MODE.md)).
- [ ] **Not an Enterprise or Edu workspace.** Site tools do not exist there and no setting brings
      them back, so there is nothing to film in this browser. Record in Chrome instead.
- [ ] <https://hvaler.github.io/cursus/> open in the **in-app browser**, hard-reloaded, plan
      **empty**, status line green: *WebMCP available — 13 tools registered.*
- [ ] The page pane wide enough that **TOOL CALLS, LIVE** is readable at 1080p. Squint-test it.
- [ ] A second tab on the repo, for the closing shot.
- [ ] Sidebar collapsed — the conversation titles are personal.
- [ ] Notifications off, taskbar clock checked.
- [ ] **One full rehearsal, timed, with the real prompts.**

The tickable one-page version of all this, with the fourteen course codes and the three prompts, is
[CHECKLIST.md](CHECKLIST.md). Have that open while recording; this file is the reasoning behind it.

### Decide this in rehearsal, not on camera

Each of the three prompts can be asked plainly or with the tool named. **Plain is the stronger
shot** — a model choosing the right tool out of thirteen is the thing worth filming — and it has
never been tried inside Work mode.

Rehearse plain first. If a call happens, use it and narrate it as what it is. If it does not, name
the tool and **change the narration to match**: say the tool was named. The unprompted choice is
already on record from the Chrome run in [GATE.md](../docs/GATE.md); this video does not have to
carry it.

---

## The shots

### Clip 1 · 0:00 – 0:12 · The problem

**On screen:** the whole window. ChatGPT on the left, the empty planner on the right. Six terms,
0/30 each. Four specialisations, all still reachable.

> "A course planner, inside ChatGPT's browser. It shows what a student picked — all any timetable
> shows. Not what it cost them two years later, when a specialisation they wanted is quietly
> gone."

### Clip 2 · 0:12 – 0:25 · The student does the student part

**On screen:** click through the catalogue quickly, filling terms 1 and 2 and leaving **six credits
free in term 3**. In the trace, each one appears tagged `page`.

> "I fill in my first year by hand. Each click is a tool call — the same tools an agent would use,
> tagged `page`, because a page can only be sure about calls it makes itself."

**On screen:** one slot left in term 3. Pause on it.

### Clip 3 · 0:25 – 0:53 · The trade, in one call

**Type this**, and nothing more specific:

```text
I have one slot left in term 3. What are my options, and what does each one cost me?
```

**Deliberately vague.** Recording found that a model asked this way works out for itself which two
courses compete for the slot — and with the plan set up correctly those are `NUM-201` and
`GEOM-201`, the two the narration names. A model reaching that on its own is a better shot than one
handed the codes.

*If it does not*, the named form still gets there, and the narration survives it:

```text
One slot left in term 3. Compare NUM-201 and GEOM-201 for it — what does each one cost?
```

**On screen:** the prompt goes in, the right-hand panel stays in frame through the wait, then
`AGENT compare_options(...)`.

> "One slot, two courses that fit it. So I ask the page to weigh them."

**On screen:** the three lines land.

> "Numerical Methods closes Graphics and Animation. Geometry closes Data and Machine Learning.
> Neither is free — what costs is the slot, not the course. That is reachability over a
> prerequisite graph under a credit budget, and nobody does it in their head."

### Clip 4 · 0:53 – 1:03 · The student draws a line

**Type this:**

```text
Protect Graphics and Animation — I am not willing to lose that one.
```

**On screen:** `AGENT protect_track(...)` appears, and a **lock** shows next to that track on the
page. If no lock appears, the call did not happen.

> "Now the part that runs the other way. Every rule so far belongs to the university. This one is
> mine."

**On screen:** hold on *"Anything that would close it is refused from now on, including if you ask
for it yourself."*

### Clip 5 · 1:03 – 1:38 · And the page holds it

**Type this:**

```text
Add NUM-201 to term 3.
```

**On screen:** the refusal appears in the panel. Not a polite decline in prose — the four-part
string, with `Rule: PROTECTED_TRACK` at the end of it.

> "So I ask for the course that would close it anyway."

**On screen:** highlight *"which you asked to keep open"*.

> "Refused — and it quotes me back to myself, not the handbook. It offers the way out and prices
> it: I can lift my own limit, but the specialisation goes, and it does not come back."

**On screen:** stay on the refusal.

> "And that part is not really about courses. Anyone handing work to an agent has the same
> question, and the usual answer is a prompt — which is a request. This is a limit that outlives
> the conversation that set it."

### Clip 6 · 1:38 – 1:51 · Undoing it

**On screen:** the timeline. Click the step before the protection. The lock disappears; the tracks
re-render.

> "All of that is on a timeline and any of it rewinds — including the limit, because a limit is an
> event like any other. Undo is the same reducer over fewer events."

### Clip 7 · 1:51 – 2:11 · How it is built

**On screen:** the second tab, showing **`registerAll` in `app/tools.js`** — the `registerTool`
call with its five keys visible: `name`, `description`, `inputSchema`, `annotations`, `execute`.

This is the only shot that leaves the page, and it is nine seconds, so it should be open and
scrolled before the clip starts. A permalink that lands on exactly those lines and cannot drift:

```text
https://github.com/hvaler/cursus/blob/68ffc8e39444d5fa9408641cebfe61fa53e44fa6/app/tools.js#L558-L582
```

> "Thirteen tools, registered with `document dot modelContext dot registerTool`. What shaped all of
> it: `execute` returns **a string the model reads**. These strings are the interface."

**On screen:** back to the page, on a **tool result** in the trace — one of the long strings, not a
refusal. The point is that a mutation answers with the plan rather than with `ok`.

> "So a tool that changes something returns the resulting plan, never 'ok' — or the agent's picture
> of the state drifts from the page's."

### Clip 8 · 2:11 – 2:32 · What the page will not claim

**On screen:** the trace counter, reading *"N calls, N attributed to an agent — the page cannot
verify that."*

> "Last thing. WebMCP gives a page no way to know who called it, so this page counts calls by
> origin and says the attribution is a guess. That caught an assistant answering about this page
> correctly and in detail — having called no tool at all. It had read the repository."

**End card:** `hvaler.github.io/cursus` · `github.com/hvaler/cursus` · Apache-2.0

---

## Editing

**Say the speed-up on screen.** A `×6` badge in the corner during each wait, or a caption *"wait
sped up"*. The rules do not forbid editing, but a video that implies a 53-second call was instant is
claiming something that did not happen, and this project's whole argument is that it does not do
that.

**Do not cut between the prompt going in and the panel updating.** The value of this recording is
that both are in one frame: the instruction on the left, the `AGENT` line appearing on the right,
with no cut in between for anyone to wonder about.

---

## Subtitles

[`subtitles.en.srt`](subtitles.en.srt) and [`subtitles.es.srt`](subtitles.es.srt), **generated from
this file and from the Spanish working copy** rather than written separately — a subtitle track
typed by hand drifts from the narration on the first edit, and nobody notices until someone reads
it.

**Their timings are the script's, not the recording's.** They assume each shot runs exactly as long
as its heading says. After recording, open the SRT next to the video and nudge the cues; the text
will be right and only the clock will be wrong.

The English track is what the rules ask for. The Spanish one is not required and costs nothing.

## YouTube description, ready to paste

```text
Cursus - a course planner whose WebMCP tools refuse, say what a choice closes off two years
before it bites, hold a limit you set against the agent, and can be rewound.

Built for The WebMCP Challenge.

Live:  https://hvaler.github.io/cursus/
Code:  https://github.com/hvaler/cursus  (Apache-2.0)

Thirteen tools registered with document.modelContext.registerTool. Every tool call is an event
and the plan is the reduction of those events, so undo is the same reducer with a smaller number
and the audit trail is the list itself. The screen renders from that same log, so there is no
second source of truth for an agent and a person to disagree about.

The beat in the middle is the one worth watching: the student protects a specialisation, and
from then on the page refuses any course that would close it - including when the same person
asks. A protection is an event like any other, so undo takes it back out.

Both environments the challenge rules name were tested and both make real tool calls:

  - Chrome 149+ with chrome://flags/#enable-webmcp-testing and the WebMCP Inspector, where an
    agent chose the tool unprompted and acted on a refusal.
  - ChatGPT's desktop in-app browser, which is what this video shows - in Work mode. Site tools
    are not available in Enterprise or Edu workspaces.

Waits between sending a prompt and the tool call landing are sped up; the speed is shown on
screen. Nothing else is edited.

157 tests, no build step, no dependencies, no server.
```

**Two things that description does on purpose.** It says both environments were tested and which one
you are watching, because the video only shows one. And it says the waits were sped up, in the
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
- Not *"your plan is saved"*. Nothing is stored anywhere. `share_plan` puts the actions in a link,
  and a closed tab with no link copied is a lost plan.
- Not a test count or a specialisation count that has not been re-run that morning.

---

## If it goes wrong on the day

**If no tool call happens**, check Work mode first. That is four out of four of the failures on
record.

**If it still does not**, two fallbacks, in order:

1. **Chrome 151** with `chrome://flags/#enable-webmcp-testing` and the WebMCP Inspector extension.
   This is the route in [GATE.md](../docs/GATE.md) and it is proven. The beats are identical; the
   trace panel is the Inspector's instead of ChatGPT's.
2. **The scripted walk-through** on the page, which calls the same tools by the same contract and is
   labelled `page`. Press it and narrate the same beats — then **say on camera that it is the
   scripted path, not an agent**. The rules allow judges to score from the video alone; they do not
   allow the video to imply something that did not happen.

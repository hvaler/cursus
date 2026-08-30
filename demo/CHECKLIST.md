# Recording checklist

One page, in order. The reasoning is in [SCRIPT.md](SCRIPT.md); this is what to have open on a
second screen while recording.

---

## Before you press record

- [ ] **Not an Enterprise or Edu workspace.** Site tools do not exist there and no setting brings
      them back. If it is either, there is nothing to film in this browser — record in Chrome
      instead ([TESTING.md](../docs/TESTING.md)).
- [ ] ChatGPT desktop, **Work mode on**.
- [ ] *Settings → Browser → Permissions → Enable site tools* — **on**.
- [ ] <https://hvaler.github.io/cursus/> open in the **in-app browser**, hard-reloaded.
- [ ] Status line **green**: *WebMCP available — 13 tools registered.*
- [ ] Plan **empty**: six terms at 0/30, four specialisations all reachable, *"No tool has been
      called yet"*.
- [ ] Second browser tab **already open and scrolled** on the `registerTool` call — clip 7 is nine
      seconds on it, not enough to go looking. The permalink is in [SCRIPT.md](SCRIPT.md).
- [ ] ChatGPT **sidebar collapsed** — the conversation titles are personal.
- [ ] Notifications off. Taskbar clock checked.
- [ ] Panes sized so **TOOL CALLS, LIVE** is readable at 1080p. Squint at it.
- [ ] `npm test` run this morning, so any number you say out loud is today's. **157, 0 failing.**

## Record silent — eight clips, one per shot

**The narration already exists**: `cursus-voz/narration.wav`, 2:31.6, `en-GB-Studio-B`. Nothing is
read on camera. Every duration below was measured from that file, so each clip has a length it has
to cover.

**Record each shot as its own file.** A bad take costs one clip, not the whole video. Name them
`01.mp4` … `08.mp4` — I trim each to its exact window and join them.

**Overshoot every clip by two or three seconds.** Extra at the end is trimmed and costs nothing;
missing footage means re-recording. Start each clip with the screen already in position.

| # | File | Length | Shot | What is on screen |
|---:|---|---:|---|---|
| 1 | `01.mp4` | **12.5 s** | *The problem* | The whole window. ChatGPT left, empty planner right. Six terms at 0/30, four specialisations reachable. |
| 2 | `02.mp4` | **12.4 s** | *The student does the student part* | The fourteen clicks — **click steadily, not fast**; I speed this one to fit. Term 3 lands on 24/30. Hold on the free slot. |
| 3 | `03.mp4` | **27.8 s** | *The trade, in one call* | **Prompt 1** · the wait · `AGENT compare_options` · the three lines, held |
| 4 | `04.mp4` | **10.4 s** | *The student draws a line* | **Prompt 2** · the wait · `AGENT protect_track` · **the lock appears** · hold on *"including if you ask for it yourself"* |
| 5 | `05.mp4` | **35.1 s** | *And the page holds it* | **Prompt 3** · the wait · the refusal · **highlight *"which you asked to keep open"*** and hold |
| 6 | `06.mp4` | **12.6 s** | *Undoing it* | The timeline. Click the step **just before** the protection. Lock goes, tracks redraw. |
| 7 | `07.mp4` | **20.8 s** | *How it is built* | Second tab on **`registerAll` in `app/tools.js`** (permalink in [SCRIPT.md](SCRIPT.md)) — the five keys visible · then back to a **tool result** in the trace, not a refusal |
| 8 | `08.mp4` | **20.2 s** | *What the page will not claim* | The trace counter · the end card, held |

**The shot-by-shot detail is in [SCRIPT.md](SCRIPT.md)**, under the heading named in the *Shot*
column — every `**On screen:**` line there belongs to one of these clips.

**Clips 3, 4 and 5 each hold a real tool call**, which took about a minute through the in-app
browser. Record all three in real time and do not try to hit their lengths live: I speed each to
fit and burn the rate onto the picture. Clip 4's window is the tightest at 10.4 s, so if that call
runs a full minute it ends up around six times speed — the wait is a static screen, so it survives
it, but keep the typing and the result at the ends of the clip tight.

Clips 1, 2, 6, 7 and 8 are real time and should land near their lengths on their own.

## The rehearsal

- [ ] Run the three prompts once, plainly, without naming a tool. **8/8 says a model picks correctly
      out of thirteen** — but that was Vertex, not Work mode, so it is still worth one rehearsal.
- [ ] If a plain ask does not call, name the tool in the real take. Tell me, because the narration
      says *"I ask the page to weigh them"* and I would re-record that line.
- [ ] Time each call. If one runs far past 53 s, the sped-up segments need a different rate.
- [ ] Watch for the **lock** on Graphics after prompt 2 — fastest way to see a call really happened.
- [ ] Hard-reload and empty the plan before the real take.

---

## The setup: fourteen courses, clicked by hand

Do **not** press *Run the scripted walk-through* — it also runs the beats, and the trace would show
answers before you ask for them.

| Term | Courses |
|---:|---|
| 1 | `CALC-101` `ALG-101` `PROG-101` `DISC-101` `PHYS-101` |
| 2 | `CALC-102` `PROG-102` `STAT-101` `LOGIC-101` `CIRC-101` |
| 3 | `DS-201` `ARCH-201` `AUTO-201` `STAT-201` |

- [ ] Term 3 reads **24/30 cr**. Six credits free, four specialisations open.
- [ ] Every one shows as `page` in the trace, never `AGENT`.

**Click steadily, not fast.** Twelve seconds for fourteen courses is not a pace anyone is accurate
at, so this clip is sped to fit like the ones holding a call — take twenty or twenty-five seconds
and get them right. A misclick here cost two clips on the first attempt: `NUM-201` went in where
`AUTO-201` should have, and NUM-201 is the course the agent has to be asked about later, so it
cannot already be in the plan.

---

## The three prompts

**1 — the trade** (clip 3). Vague on purpose: recording showed a model works out for itself which
two courses compete for the slot, which is a better shot than handing it the codes.

```text
I have one slot left in term 3. What are my options, and what does each one cost me?
```

If it does not get there, fall back to naming them — the narration survives either:

```text
One slot left in term 3. Compare NUM-201 and GEOM-201 for it — what does each one cost?
```

> *Taking NUM-201 in term 3 closes "Graphics and Animation".*
> *Taking GEOM-201 in term 3 closes "Data and Machine Learning".*
> *Both cost a specialisation … **the slot is what costs, not the course.***

**2 — the line the student draws** (clip 4)

```text
Protect Graphics and Animation — I am not willing to lose that one.
```

> *Protecting "Graphics and Animation". **Anything that would close it is refused from now on,
> including if you ask for it yourself.***

A **lock** appears beside that track. If it does not, the call did not happen.

**3 — and the page holds it** (clip 5)

```text
Add NUM-201 to term 3.
```

> *Refused. Adding NUM-201 in term 3 would close "Graphics and Animation", **which you asked to
> keep open.** … **but then the specialisation goes, and it does not come back.** Rule:
> PROTECTED_TRACK. The plan was not changed.*

Highlight **"which you asked to keep open"** and hold. That is the shot the whole video is for.

All three come out of `execute()` verbatim. If the screen says something else, the call did not
happen.

---

## Two things not to get wrong

**The undo shot rewinds the protection, which the agent did set.** `protect_track` writes an event,
so *"including the limit"* is true. Prompts 1 and 3 wrote nothing — a query does not, and a refusal
deliberately does not — so click the step **just before the protection**, not further back, or you
are rewinding your own clicks and the line stops being about the agent.

**The counter at the end will read something like *"17 call(s), 3 attributed to an agent"***. Both
origins side by side, with the page saying it cannot verify the second number.

---

## After recording

- [ ] Watch it once **with the sound off**. Anything personal on screen? A notification, a tab
      title, the taskbar clock?
- [ ] Check each shot covers its window. Short is a problem; long is not.
- [ ] **Send me the file.** I assemble: narration, the two sped-up segments, the speed badge, the
      subtitles. They are already timed to the audio and need no adjusting.
- [ ] Nothing to upload yet — the cut comes back first.

## Then the submission

- [ ] Put the video URL into [DEVPOST.md](DEVPOST.md), replacing `_pending_`.
- [ ] Paste the long text from [DEVPOST.md](DEVPOST.md) into the Devpost form.
- [ ] Fields: live URL `https://hvaler.github.io/cursus/`, repo `https://github.com/hvaler/cursus`,
      video link, *Built with* line.
- [ ] Confirm the repo's **About** block shows **Apache-2.0** and the live link.
- [ ] Submit. **Deadline: 3 September 2026, 13:00 PDT.**

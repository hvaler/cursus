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
- [ ] Second browser tab on `github.com/hvaler/cursus/blob/main/app/tools.js`, scrolled to a
      `registerTool` call, for the 2:05 shot.
- [ ] ChatGPT **sidebar collapsed** — the conversation titles are personal.
- [ ] Notifications off. Taskbar clock checked.
- [ ] Panes sized so **TOOL CALLS, LIVE** is readable at 1080p. Squint at it.
- [ ] `npm test` run this morning, so any number you say out loud is today's. **157, 0 failing.**

## The rehearsal that decides one thing

- [ ] Run all three prompts once, timed, exactly as written below.
- [ ] Ask them **plainly** in the rehearsal, without naming a tool.
      - **It calls** → keep it, and narrate it as the model choosing out of thirteen. Much stronger.
      - **It does not** → name the tool in the real take, and **change the narration to say you
        named it**. Do not claim the model chose it.
- [ ] Time each call. Ours took **53 s** and **3 min 18 s**. You need those for the edit.
- [ ] Watch for the **lock** on Graphics after prompt 2 — that is the fastest way to see whether a
      call really happened.
- [ ] Hard-reload and empty the plan again before the real take.

---

## The setup: 14 courses, clicked by hand

Do **not** press *Run the scripted walk-through* — it also runs the beats, and the trace would
already show `what_this_closes NUM-201` before you ask for it.

Click these, in this order. Terms 1 and 2 fill to **30/30**, term 3 stops at **24/30**:

| Term | Courses |
|---:|---|
| 1 | `CALC-101` `ALG-101` `PROG-101` `DISC-101` `PHYS-101` |
| 2 | `CALC-102` `PROG-102` `STAT-101` `LOGIC-101` `CIRC-101` |
| 3 | `DS-201` `ARCH-201` `AUTO-201` `STAT-201` |

- [ ] Term 3 reads **24/30 cr**. Six credits free. All four specialisations still open.
- [ ] Every one of those shows as `page` in the trace, never `AGENT`.

Speed this segment up in the edit like the waits, with the same badge. Fourteen clicks at natural
speed is about twenty seconds of screen time you do not have.

---

## The three prompts

Each can be asked plainly or with the tool named. **Rehearse plain first** — a model choosing the
right tool out of thirteen is the shot worth having. If a plain ask does not produce a call, name
the tool and **change the narration to say you named it**.

**1 — the trade.** One call, not two.

```text
One slot left in term 3. Compare NUM-201 and GEOM-201 for it — what does each one cost?
```

Check on screen before keeping the take:

> *Taking NUM-201 in term 3 closes "Graphics and Animation".*
> *Taking GEOM-201 in term 3 closes "Data and Machine Learning".*
> *Both cost a specialisation, so there is no free version of this choice — **the slot is what
> costs, not the course.***

**2 — the line the student draws.**

```text
Protect Graphics and Animation — I am not willing to lose that one.
```

> *Protecting "Graphics and Animation". **Anything that would close it is refused from now on,
> including if you ask for it yourself.*** Protected: Graphics and Animation…*

A **lock** should appear beside that track on the page. If it does not, the call did not happen.

**3 — and the page holds it.**

```text
Add NUM-201 to term 3.
```

> *Refused. Adding NUM-201 in term 3 would close "Graphics and Animation", **which you asked to
> keep open.** To unblock it: either choose something that does not close it, or release the
> protection first … **but then the specialisation goes, and it does not come back.** Rule:
> PROTECTED_TRACK. The plan was not changed.*

Highlight **"which you asked to keep open"**. That is the whole point of the video.

---

## Two things not to get wrong on camera

**The undo shot rewinds the protection, which the agent did set.** That is new: `protect_track`
writes an event, so *"including the limit"* is true. Beat 1 and beat 3 wrote nothing — a query does
not, and a refusal deliberately does not — so click the step **just before the protection**, not
further back, or you are rewinding your own clicks and the line stops being about the agent.

**The counter at the end will read something like *"17 call(s), 3 attributed to an agent"***. That
is the shot: both origins side by side, with the page saying it cannot verify the second number.

---

## After recording

- [ ] Watch it once with the sound off. Anything personal on screen?
- [ ] Watch it once with your eyes shut. Does the narration claim anything the picture does not
      show?
- [ ] **Total under 3:00.** Not 3:00. Under.
- [ ] Speed badge (`×6` or similar) visible during **every** sped-up segment, including the
      fourteen clicks.
- [ ] Check the claims one last time against [SCRIPT.md](SCRIPT.md) *"Things not to say"* — in
      particular: not *"it works in ChatGPT's in-app browser"* without **in Work mode** attached.
- [ ] Upload to YouTube, **public**, not unlisted.
- [ ] Paste the description from [SCRIPT.md](SCRIPT.md) *"YouTube description, ready to paste"*.
- [ ] Open the link in a private window to confirm it really is public.

## Then the submission

- [ ] Put the video URL into [DEVPOST.md](DEVPOST.md), replacing `_pending_`.
- [ ] Paste the long text from [DEVPOST.md](DEVPOST.md) into the Devpost form.
- [ ] Fields: live URL `https://hvaler.github.io/cursus/`, repo `https://github.com/hvaler/cursus`,
      video link, *Built with* line.
- [ ] Confirm the repo's **About** block shows **Apache-2.0** and the live link.
- [ ] Submit. **Deadline: 3 September 2026, 13:00 PDT.**

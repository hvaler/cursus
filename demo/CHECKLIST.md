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
- [ ] Status line **green**: *WebMCP available — 12 tools registered.*
- [ ] Plan **empty**: six terms at 0/30, four specialisations all reachable, *"No tool has been
      called yet"*.
- [ ] Second browser tab on `github.com/hvaler/cursus/blob/main/app/tools.js`, scrolled to a
      `registerTool` call, for the 2:05 shot.
- [ ] ChatGPT **sidebar collapsed** — the conversation titles are personal.
- [ ] Notifications off. Taskbar clock checked.
- [ ] Panes sized so **TOOL CALLS, LIVE** is readable at 1080p. Squint at it.
- [ ] `npm test` run this morning, so any number you say out loud is today's. **138, 0 failing.**

## The rehearsal that decides one thing

- [ ] Run the whole thing once, timed.
- [ ] In that rehearsal, try the **bare question** first:
      `What does taking NUM-201 in term 3 close off?`
      - **It calls** → use it. Narrate it as the model choosing the tool. Much stronger shot.
      - **It does not** → use the named form below, and **change the narration to say the tool was
        named**. Do not claim the model chose it.
- [ ] Time the call. Ours took **53 s** and **3 min 18 s**. You need that number for the edit.
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

## The two prompts

**1 — the question.** Bare form if the rehearsal said it works, otherwise:

```text
Use the open page's WebMCP tool what_this_closes with: course NUM-201, term 3
```

Expected, and this is the sentence to check on screen before you keep the take:

> *Taking NUM-201 in term 3 would CLOSE "Graphics and Animation". Graphics and Animation would have
> 0 course(s) held and none still reachable.*

**2 — the refusal.**

```text
Enrol me in ADV-301.
```

Expected, verbatim from `app/tools.js`:

> *Refused. ADV-301 (Advanced Calculus) requires CALC-102 (Calculus II) and NUM-201 (Numerical
> Methods), and CALC-102 (Calculus II) and NUM-201 (Numerical Methods) are not in the plan. **To
> unblock it: place CALC-102 and NUM-201 in a term before 5.** Rule: PREREQ_NOT_MET. The plan was
> not changed.*

Highlight the bolded sentence. That is the beat.

---

## Two things not to get wrong on camera

**The undo shot rewinds your own clicks, not the agent's.** Neither agent call in this video writes
an event — a query does not, and the refusal deliberately does not. The scripted line
*"everything on that timeline can be rewound"* is true. **"Everything the agent did"** would not be.

**The counter at the end will read something like *"16 call(s), 2 attributed to an agent"***. That
is the shot: both origins, side by side, with the page saying it cannot verify the second number.

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

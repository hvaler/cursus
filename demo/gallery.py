#!/usr/bin/env python3
"""Build the submission gallery: captioned plates cut from the finished film.

    python demo/gallery.py ../cursus-voz/cursus.mp4

**Why the pictures are cut from the video rather than taken fresh.** Every plate here has to show
an `AGENT` badge, and the page only writes one when a real agent really called. A screenshot taken
by re-running the page myself would be labelled `page` — truthfully, and uselessly, because the
whole claim is about the other label. The film is the only recording of those calls, so it is the
source.

The plate is 1600x1067, which is Devpost's 3:2, on the page's own `--soft` ground with its own
monospace. The caption sits above the picture rather than under it: at gallery size the label is
read first and the screenshot second, and a caption below the fold of a card is not read at all.

Plates 13 to 15 are diagrams, not frames. They come from `diagrams.html` in this directory,
screenshotted at 1600x1067 the same way `thumbnail.html` is — a browser does the layout, because
the alternative is hand-placing forty boxes with drawtext.

Writes to demo/gallery/: 01.png ... 12.png, and captions.md for the Devpost caption fields.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "gallery"

W, H = 1600, 1067
MARGIN, LINE, CAP_TOP = 72, 46, 112
GROUND, RULE, INK, DIM = "#f2f1ec", "#dcdad3", "#15151a", "#6e6e78"

#: Devpost's caption field cuts off around here. Found by hitting it: a 130-character caption came
#: back five characters too long. The caption on the plate is under no such limit, which is why
#: every entry carries two — the long one is burned into the picture, the short one goes in the
#: field. Where a caption was already short enough both are the same string, deliberately: a second
#: wording that says the same thing is one more place for them to drift apart.
FIELD_LIMIT = 125

#: `at` is a second into the film; `crop` is w:h:x:y against its 1920x1080 frame. The page lays out
#: in two columns, so the crops are column-shaped — but it is scrolled to a different place in
#: every clip, which is why the y values disagree between plates that look alike.
PLATES = [
    (1, 52, "1338:560:566:236", "THE PLAN",
     "Fourteen courses, put there by hand. Term 3 has six credits left, and the page has "
     "registered its thirteen tools with the browser.",
     "Fourteen courses, put there by hand. Six credits left in term 3, and thirteen tools "
     "registered with the browser."),
    (2, 47, "555:760:0:60", "THE QUESTION",
     "The student asks in their own words, naming no tool: what are my options, and what does "
     "each one cost?",
     "The student asks in their own words, naming no tool: what are my options, and what does "
     "each one cost?"),
    (3, 47, "670:460:1234:575", "compare_options",
     "Both futures in one call. Either choice closes a specialisation — the slot is what "
     "costs, not the course.",
     "Both futures in one call. Either choice closes a specialisation — the slot is what "
     "costs, not the course."),
    (4, 60, "670:625:1234:236", "protect_track",
     "The student draws a line. Anything that would close Graphics is refused from now on, "
     "including if they ask for it themselves.",
     "The student draws a line. Anything that would close Graphics is now refused — "
     "including if they ask for it."),
    (5, 82, "665:830:566:236", "THE LIMIT, ON THE PLAN",
     "A lock beside the track, and a line naming who it binds. Every other rule here belongs to "
     "the university. This one belongs to the student.",
     "A lock beside the track. Every other rule here belongs to the university; this one "
     "belongs to the student."),
    (6, 82, "670:625:1234:236", "REFUSED",
     "The agent asks for NUM-201. The page refuses, citing the student's own instruction, and "
     "names both ways out.",
     "The agent asks for NUM-201. The page refuses, citing the student's own instruction, and "
     "names both ways out."),
    (7, 82, "555:690:0:120", "WHAT THE ASSISTANT SAW",
     "The refusal comes back as prose, so the agent reports it rather than retrying. Nothing "
     "instructed it to.",
     "The refusal comes back as prose, so the agent reports it rather than retrying. Nothing "
     "instructed it to."),
    (8, 105, "665:830:566:236", "REWIND",
     "Every call is an event and the plan is their reduction, so undo is replaying fewer of "
     "them. The protection unwinds with the rest.",
     "Every call is an event and the plan is their reduction, so undo is replaying fewer of "
     "them."),
    (9, 105, "670:625:1234:236", "THIRTEEN TOOLS",
     "Each description says when to reach for it. That string is the only thing a model has to "
     "choose on, so the strings are the product.",
     "Each description says when to reach for it. That string is all a model has to choose on."),
    (10, 115, "1334:800:566:250", "REGISTRATION",
     "registerAll, on document.modelContext. No build step, no dependencies, no server: what is "
     "in the repository is what is served.",
     "registerAll, on document.modelContext. No build step, no dependencies, no server."),
    (11, 82, "670:100:1234:245", "WHO CALLED",
     "The page counts calls by origin and states plainly that it cannot verify the second "
     "number. WebMCP gives the handler no caller identity.",
     "The page counts calls by origin, and says plainly that it cannot verify the second "
     "number."),
    (12, 150, "1570:640:350:230", "LIVE",
     "Apache-2.0, thirteen tools on document.modelContext, and no server behind any of it.",
     "Apache-2.0, thirteen tools on document.modelContext, and no server behind any of it."),
]

#: The three that are drawn rather than filmed, recorded here so captions.md is the whole gallery
#: and not just the part this script makes.
DIAGRAMS = [
    (13, "THE MODULES",
     "Eleven files, no build step and no dependencies. Every import points downward, which is "
     "the whole reason the layering is worth drawing.",
     "Eleven files, no build step, no dependencies. Every import points downward."),
    (14, "THE ONE DECISION",
     "Every tool call is an event, and the plan is the reduction of the events. Refusing, "
     "undoing and auditing all fall out of that; none of them was built.",
     "Every tool call is an event, and the plan is their reduction. Refusing, undoing and "
     "auditing all fall out of that."),
    (15, "WHERE IT WAS TESTED",
     "Both of the environments named in the challenge rules, and both make real tool calls. "
     "What separates them is what a page can tell you when they do not.",
     "Both environments named in the challenge rules, and both make real tool calls."),
]


def run(args: list[str], cwd: Path) -> None:
    exe = shutil.which(args[0])
    if not exe:
        sys.exit(f"{args[0]} is not on PATH")
    p = subprocess.run([exe, *args[1:]], cwd=cwd, capture_output=True, text=True)
    if p.returncode:
        sys.exit(f"\n{args[0]} failed:\n{p.stderr.strip()[-1200:]}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", nargs="?", default=str(HERE.parent.parent / "cursus-voz/cursus.mp4"))
    ap.add_argument("--font-dir", default="C:/Windows/Fonts",
                    help="where consola.ttf and consolab.ttf live")
    args = ap.parse_args()

    video = Path(args.video).resolve()
    if not video.exists():
        sys.exit(f"no film at {video}. It is not in the repository; assemble.py writes it.")

    OUT.mkdir(exist_ok=True)
    work = OUT / "_work"
    work.mkdir(exist_ok=True)
    # ffmpeg runs with cwd=work and refers to every path by name. Absolute Windows paths inside a
    # filter graph need their drive colon escaped, and getting that wrong fails silently enough to
    # waste an afternoon.
    for f in ("consola.ttf", "consolab.ttf"):
        shutil.copy(Path(args.font_dir) / f, work / f)

    for n, at, crop, label, caption, _ in PLATES:
        shot = f"shot{n:02d}.png"
        run(["ffmpeg", "-v", "error", "-ss", str(at), "-i", str(video), "-frames:v", "1",
             "-vf", f"crop={crop}", "-y", shot], work)

        lines = textwrap.wrap(caption, 78)
        (work / "label.txt").write_text(label, encoding="utf-8")
        for i, ln in enumerate(lines):
            (work / f"cap{i}.txt").write_text(ln, encoding="utf-8")

        # One drawtext per line at an explicit y. drawtext's own line advance is more than twice
        # fontsize + line_spacing, and trusting it once put a picture on top of its own caption.
        top = CAP_TOP + len(lines) * LINE + 44
        box_w, box_h = W - 2 * MARGIN, H - top - MARGIN

        fc = (f"[1]scale={box_w}:{box_h}:force_original_aspect_ratio=decrease,"
              f"pad=iw+2:ih+2:1:1:color={RULE}[pic];"
              # Centred in what is left, so a wide, short crop does not sit against its caption
              # with the rest of the plate empty under it.
              f"[0][pic]overlay=(W-w)/2:{top}+({box_h}-h)/2[s0];"
              f"[s0]drawtext=fontfile=consolab.ttf:textfile=label.txt:fontsize=27:"
              f"fontcolor={DIM}:x={MARGIN}:y=56[s1]")
        for i in range(len(lines)):
            nxt = f"[s{i + 2}]" if i < len(lines) - 1 else ""
            fc += (f";[s{i + 1}]drawtext=fontfile=consola.ttf:textfile=cap{i}.txt:fontsize=30:"
                   f"fontcolor={INK}:x={MARGIN}:y={CAP_TOP + i * LINE}{nxt}")

        run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", f"color=c={GROUND}:s={W}x{H}",
             "-i", shot, "-filter_complex", fc, "-frames:v", "1",
             "-y", str(OUT / f"{n:02d}.png")], work)
        print(f"{n:02d}  {label:24s} {at:>4}s  {len(lines)} line(s)")

    shutil.rmtree(work)

    entries = ([(n, label, short) for n, _, _, label, _, short in PLATES]
               + [(n, label, short) for n, label, _, short in DIAGRAMS])

    # Checked rather than trusted. The first version of this gallery was written without knowing
    # the field had a limit at all, and the form rejects a long caption rather than trimming it.
    too_long = [f"{n:02d} {label}: {len(s)} characters" for n, label, s in entries
                if len(s) > FIELD_LIMIT]
    if too_long:
        sys.exit(f"over Devpost's {FIELD_LIMIT}-character caption field:\n  "
                 + "\n  ".join(too_long))

    rows = "\n".join(f"| {n:02d} | {label} | {len(s):>3} | {s} |" for n, label, s in entries)
    (OUT / "captions.md").write_text(
        "# Gallery captions\n\n"
        "The long caption is burned into each plate. These are the short forms, for Devpost's own "
        f"caption field, which rejects anything past about {FIELD_LIMIT} characters. Upload the "
        "plates in this order; 13 to 15 come from [diagrams.html](../diagrams.html), "
        "screenshotted at 1600x1067.\n\n"
        "| # | Plate | Len | Caption |\n|---:|---|---:|---|\n" + rows + "\n",
        encoding="utf-8", newline="\n")

    print(f"\n{len(PLATES)} plates and captions.md in {OUT}")
    print(f"every caption inside {FIELD_LIMIT} characters "
          f"(longest is {max(len(s) for _, _, s in entries)})")
    print("13-15: screenshot demo/diagrams.html at 1600x1067")


if __name__ == "__main__":
    main()

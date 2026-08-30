#!/usr/bin/env python3
"""Join the eight silent clips to the narration and make the film.

    python demo/assemble.py path/to/clips [-o cursus.mp4]

**What it does and does not decide.** The narration is the clock: it exists, it was measured, and
every shot has a length taken from it rather than chosen. This script's whole job is to make each
clip occupy exactly its window, so the words land on the picture they describe.

Each clip is trimmed to its length. A clip that runs long loses its tail, which is why the
checklist says to overshoot. A clip that runs *short* is a problem the script cannot fix quietly,
so it does not try: it holds the last frame and says how much it had to invent, per clip, in the
output. Padding is visible in the log or it is a lie.

**The two waits.** Clips 3 and 5 contain a call to ChatGPT's in-app browser, which took 53 seconds
in the run this was built around. They are recorded in real time and sped up here — not to make the
video look faster, but because a viewer will not watch a static screen for a minute. The speed is
computed from what the clip actually is against what its window allows, and it is stamped on the
picture. A sped-up wait that does not say so is claiming something that did not happen.

Requires ffmpeg and ffprobe on PATH. Nothing else.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent

#: The shot windows, read from what wrote them. `make_narration.py` measures each block of
#: speech and adds the pause after it; keeping a second copy of those numbers here is how the
#: two drift apart, and a shot a tenth of a second out puts every word after it on the wrong
#: picture.
TIMING = HERE / "timing.json"


def shots() -> list[tuple[str, float, str]]:
    if not TIMING.exists():
        sys.exit(f"no {TIMING.name} — run demo/make_narration.py first, which writes it")
    blocks = json.loads(TIMING.read_text(encoding="utf-8"))
    windows: dict[str, list[float]] = {}
    order: list[str] = []
    for b in blocks:
        if b["shot"] not in windows:
            windows[b["shot"]] = [b["start"], 0.0]
            order.append(b["shot"])
        windows[b["shot"]][1] = b["end"] + b["gap"]
    return [(f"{i:02d}", z - a, name) for i, name in enumerate(order, 1)
            for a, z in [windows[name]]]

#: Clips that may run longer than their window and are sped to fit, with the rate burned into the
#: frame. Three of them hold a real tool call, which takes about a minute through ChatGPT's in-app
#: browser: comparing, protecting, and the add that gets refused.
#:
#: Clip 2 is here for a different reason. Fourteen courses clicked by hand does not fit in 12.4
#: seconds at a pace anyone can be accurate at, and rushing it is how NUM-201 got clicked instead of
#: AUTO-201 on the first attempt — which cost two clips. Click it steadily; the speed is honest and
#: it is stamped on the picture either way.
SPED_TO_FIT = {"02", "03", "04", "05"}

#: The master is the wav, which is fourteen megabytes and lives outside the repository. The mp3 is
#: committed so this runs from a clone; either will do, and `make_narration.py` writes both.
NARRATION = [REPO.parent / "cursus-voz" / "narration.wav",
             REPO.parent / "cursus-voz" / "narration.mp3",
             HERE / "narration.mp3"]


def run(*args: str) -> str:
    """ffmpeg, loudly on failure. A silent assembly failure is worse than a stack trace."""
    p = subprocess.run(args, capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit(f"\n{args[0]} failed:\n{p.stderr.strip()[-1500:]}")
    return p.stdout


def duration(path: Path) -> float:
    return float(run("ffprobe", "-v", "error", "-show_entries", "format=duration",
                     "-of", "csv=p=0", str(path)).strip())


def probe_size(path: Path) -> tuple[int, int]:
    # `-of csv=p=0` and split by hand: some ffprobe builds reject the `s=` separator option.
    out = run("ffprobe", "-v", "error", "-select_streams", "v:0",
              "-show_entries", "stream=width,height", "-of", "csv=p=0", str(path)).strip()
    w, h = out.replace("x", ",").split(",")[:2]
    return int(w), int(h)


def badge_font() -> str:
    """A font for the speed badge, escaped the way ffmpeg wants on Windows.

    Not optional. drawtext has no default font here, and a sped-up wait that does not say so is
    claiming the call was faster than it was.
    """
    for name in ("arial.ttf", "segoeui.ttf", "consola.ttf", "calibri.ttf"):
        p = Path("C:/Windows/Fonts") / name
        if p.exists():
            return "C" + chr(92) + ":/Windows/Fonts/" + name
    for p in (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
              Path("/System/Library/Fonts/Helvetica.ttc")):
        if p.exists():
            return str(p)
    sys.exit("no font found for the speed badge, and the badge is not optional")


def find_clip(folder: Path, n: str) -> Path:
    for ext in ("mp4", "mov", "mkv", "webm", "avi"):
        for name in (f"{n}.{ext}", f"clip{n}.{ext}", f"{int(n)}.{ext}"):
            p = folder / name
            if p.exists():
                return p
    sys.exit(f"clip {n} not found in {folder} — expected {n}.mp4 or similar")


def build(folder: Path, out: Path, width: int, height: int, fps: int) -> None:
    narration = next((p for p in NARRATION if p.exists()), None)
    if narration is None:
        sys.exit("no narration found. Run demo/make_narration.py, or put "
                 "narration.mp3 in demo/. Looked in: "
                 + ", ".join(str(p) for p in NARRATION))

    work = folder / "_assembled"
    work.mkdir(exist_ok=True)
    pieces, notes = [], []

    for n, window, title in shots():
        src = find_clip(folder, n)
        have = duration(src)
        dst = work / f"{n}.mp4"

        scale = (f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                 f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1")

        if n in SPED_TO_FIT and have > window + 0.5:
            # The clip is longer than its window because it contains a real wait. Speed the whole
            # clip rather than guessing where the wait starts: the rest of it is a person typing
            # and reading, which survives being a little quicker, and the badge tells the truth
            # about the whole shot rather than about a segment nobody can see the edges of.
            rate = have / window
            vf = (f"{scale},setpts=PTS/{rate:.6f},"
                  f"drawtext=fontfile='{badge_font()}':text='x {rate:.1f} speed':fontcolor=white:"
                  f"fontsize={max(18, height // 38)}:box=1:boxcolor=black@0.6:boxborderw=10:"
                  f"x=w-tw-28:y=28")
            run("ffmpeg", "-y", "-v", "error", "-i", str(src), "-an",
                "-vf", vf, "-r", str(fps), "-t", f"{window:.3f}",
                "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                "-pix_fmt", "yuv420p", str(dst))
            notes.append(f"  {n}  {title[:34]:34s} {have:6.1f}s -> {window:5.1f}s   sped x{rate:.1f}, badged")

        else:
            short = window - have
            if short > 0.05:
                # Hold the last frame. Said out loud below, because inventing picture quietly is
                # exactly the kind of thing this project does not do.
                vf = f"{scale},tpad=stop_mode=clone:stop_duration={short + 0.5:.3f}"
                notes.append(f"  {n}  {title[:34]:34s} {have:6.1f}s -> {window:5.1f}s   "
                             f"HELD LAST FRAME for {short:.1f}s")
            else:
                vf = scale
                notes.append(f"  {n}  {title[:34]:34s} {have:6.1f}s -> {window:5.1f}s   trimmed {have - window:.1f}s")
            run("ffmpeg", "-y", "-v", "error", "-i", str(src), "-an",
                "-vf", vf, "-r", str(fps), "-t", f"{window:.3f}",
                "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                "-pix_fmt", "yuv420p", str(dst))

        pieces.append(dst)

    listing = work / "list.txt"
    listing.write_text("".join(f"file '{p.as_posix()}'\n" for p in pieces), encoding="utf-8")

    silent = work / "picture.mp4"
    run("ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(listing),
        "-c", "copy", str(silent))

    run("ffmpeg", "-y", "-v", "error", "-i", str(silent), "-i", str(narration),
        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k", "-shortest", str(out))

    print("\n".join(notes))
    picture, sound, film = duration(silent), duration(narration), duration(out)
    print(f"\npicture {picture:6.2f}s\nsound   {sound:6.2f}s\nfilm    {film:6.2f}s"
          f"   ({int(film // 60)}:{film % 60:05.2f})")
    if film >= 180:
        sys.exit("\nOVER THREE MINUTES. The rules say less than three, and this is not less.")
    print(f"under the limit by {180 - film:.0f}s")
    if abs(picture - sound) > 0.5:
        print(f"\npicture and sound differ by {abs(picture - sound):.2f}s — the words will drift "
              f"from what they describe. Check the notes above for a clip that was held or trimmed.")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("clips", type=Path, help="folder holding 01.mp4 … 08.mp4")
    ap.add_argument("-o", "--out", type=Path, default=REPO / "demo" / "cursus.mp4")
    ap.add_argument("--fps", type=int, default=30)
    args = ap.parse_args()

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            sys.exit(f"{tool} is not on PATH")

    first = find_clip(args.clips, "01")
    width, height = probe_size(first)
    if height > 1080:
        width, height = round(width * 1080 / height / 2) * 2, 1080
    print(f"{width}x{height} at {args.fps} fps, from {first.name}\n")

    build(args.clips, args.out, width, height, args.fps)
    print(f"\n{args.out}")


if __name__ == "__main__":
    main()

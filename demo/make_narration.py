#!/usr/bin/env python3
"""Read the script, speak it, and write the clock everything else runs on.

    python demo/make_narration.py               # needs gcloud auth and a project with Cloud TTS
    python demo/make_narration.py --dry-run     # just print what it would say, and how long

**Why this exists rather than a folder of mp3s somebody made once.** The narration is the film's
clock: the shot lengths in `assemble.py` and every cue in the two subtitle files are measured from
it, not chosen. If the audio is a binary nobody can regenerate, then changing one sentence means
re-deriving all of that by hand, and the first thing to rot is whichever copy someone forgets.

So this is the only place the narration is defined. It reads the spoken lines out of
[`SCRIPT.md`](SCRIPT.md) — the same file a person reads — synthesises them, and writes:

    cursus-voz/narration.wav     the master
    cursus-voz/narration.mp3     what is committed, small enough to live in the repository
    demo/timing.json             what assemble.py reads, so the two cannot drift
    demo/subtitles.en.srt        cues from the measured audio, not estimated
    demo/subtitles.es.srt        the same windows, Spanish, from the working copy

**Why Google's speech API and not another.** Nothing in the rules restricts editing tools. But a
project whose argument is that nothing here is guessed at has no reason to narrate itself with a
vendor it does not otherwise use, and this one runs its evaluation on Gemini through the same
cloud. If a judge asks what the voice was, the answer should add to the story rather than need
explaining.

The voice is a Studio one. They read long-form prose with sentence rhythm instead of the
word-by-word cadence that makes a demo sound automated — `en-GB-Studio-B`, `en-GB-Studio-C`,
`en-US-Studio-O` and `en-US-Studio-Q` are the four that exist.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
VOICE, LANGUAGE, RATE = "en-GB-Studio-B", "en-GB", 0.95

#: The Spanish working copy, which carries a translation under each spoken line. Outside the
#: repository on purpose: the public repository stays in English.
SPANISH = REPO.parent / "CURSUS_GUION_GRABACION.md"
OUT = REPO.parent / "cursus-voz"

#: The pause after each block, in seconds, and what it is for. **These are the only numbers in the
#: film that were chosen rather than measured**, so they are the ones that need a reason.
#:
#: They are not filler. Each is the time a viewer needs to read what is on screen, which is why the
#: longest sit where there is most of it. An earlier cut had them uniform and ran fourteen seconds
#: shorter, which was worse: a viewer who cannot finish reading the refusal has been shown nothing.
GAPS = [
    (1,  1.5, "cut to the empty planner"),
    (2,  3.5, "hold on the one free slot in term 3"),
    (3,  5.0, "the sped-up wait for compare_options"),
    (4,  3.5, "the three lines are on screen and have to be read"),
    (5,  4.5, "'including if you ask for it yourself', and the lock appearing"),
    (6,  5.0, "the sped-up wait for the add that gets refused"),
    (7,  3.0, "highlight 'which you asked to keep open' — the shot the film is for"),
    (8,  2.0, "cut"),
    (9,  2.0, "the timeline redrawing"),
    (10, 2.0, "switch tab to the trace"),
    (11, 2.0, "cut to the counter"),
    (12, 4.5, "the end card, which is three lines to read"),
]


def run(*args: str) -> str:
    # Resolved through `which` because on Windows gcloud is a .cmd and subprocess does not
    # consult PATHEXT on its own — it reports that the file does not exist, which is misleading.
    exe = shutil.which(args[0])
    if not exe:
        sys.exit(f"{args[0]} is not on PATH")
    p = subprocess.run([exe, *args[1:]], capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit(f"\n{args[0]} failed:\n{p.stderr.strip()[-1200:]}")
    return p.stdout


def spoken(md: Path, marker: str, want_bold: bool | None) -> list[tuple[str, str]]:
    """The quoted lines under each shot heading, as (shot title, text).

    `want_bold` picks a side of the bilingual working copy: True for the English that is spoken,
    False for the Spanish gloss beneath it. None takes everything, which is what the English
    script needs.
    """
    text = md.read_text(encoding="utf-8")
    body = text.split(marker, 1)[1].split("\n---\n", 1)[0]
    out: list[tuple[str, str]] = []
    shot, buf = "", []

    def flush() -> None:
        if not buf:
            return
        raw = " ".join(buf)
        if want_bold is None or raw.strip().startswith("**") == want_bold:
            clean = re.sub(r"\s+", " ", re.sub(r"[*`]", "", raw)).strip().strip('"').strip()
            if clean:
                out.append((shot, clean))
        buf.clear()

    for line in body.split("\n"):
        head = re.match(r"^### (?:Clip \d+ · )?\d+:\d+ – \d+:\d+ · (.+)$", line)
        if head:
            flush()
            shot = head.group(1).strip()
        elif line.startswith("> "):
            buf.append(line[2:])
        else:
            flush()
    flush()
    return out


def synthesise(text: str, token: str, project: str) -> bytes:
    body = json.dumps({
        "input": {"text": text},
        "voice": {"languageCode": LANGUAGE, "name": VOICE},
        "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": 48000,
                        "speakingRate": RATE},
    }).encode()
    req = urllib.request.Request(
        "https://texttospeech.googleapis.com/v1/text:synthesize", data=body,
        headers={"Authorization": f"Bearer {token}", "x-goog-user-project": project,
                 "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return base64.b64decode(json.load(r)["audioContent"])
    except urllib.error.HTTPError as e:
        sys.exit(f"text-to-speech refused: {e.read().decode()[:400]}")


def duration(path: Path) -> float:
    return float(run("ffprobe", "-v", "error", "-show_entries", "format=duration",
                     "-of", "csv=p=0", str(path)).strip())


def srt(blocks: list[dict], texts: list[str], out: Path) -> int:
    """One cue per sentence, inside its block's measured window, two lines at most."""
    def sentences(t: str) -> list[str]:
        parts, cur = [], ""
        for p in re.split(r"(?<=[.?!])\s+", t):
            if cur and len(cur) + len(p) + 1 <= 84:
                cur += " " + p
            else:
                if cur:
                    parts.append(cur)
                cur = p
        if cur:
            parts.append(cur)
        return parts

    def wrap(t: str) -> str:
        if len(t) <= 44:
            return t
        words, a = t.split(), ""
        for i, w in enumerate(words):
            if a and len(a) + len(w) + 1 > len(t) // 2:
                return a + "\n" + " ".join(words[i:])
            a = (a + " " + w).strip()
        return t

    def stamp(x: float) -> str:
        m, s = divmod(int(x), 60)
        return f"00:{m:02d}:{s:02d},{round((x - int(x)) * 1000):03d}"

    cues, n = [], 0
    for text, blk in zip(texts, blocks):
        units = sentences(text)
        total = sum(len(u.split()) for u in units) or 1
        at, span = blk["start"], blk["end"] - blk["start"]
        for u in units:
            n += 1
            d = span * len(u.split()) / total
            cues.append(f"{n}\n{stamp(at)} --> {stamp(at + d)}\n{wrap(u)}\n")
            at += d
    out.write_text("\n".join(cues), encoding="utf-8", newline="\n")
    return n


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", default="atelier-hack", help="a project with Cloud TTS enabled")
    ap.add_argument("--dry-run", action="store_true", help="print the lines and stop")
    args = ap.parse_args()

    lines = spoken(HERE / "SCRIPT.md", "## The shots", None)
    if len(lines) != len(GAPS):
        sys.exit(f"{len(lines)} spoken blocks in SCRIPT.md but {len(GAPS)} gaps here. "
                 f"A block was added or removed and its pause has to be decided, not defaulted.")

    words = sum(len(t.split()) for _, t in lines)
    print(f"{len(lines)} blocks, {words} words, {VOICE} at {RATE}\n")
    if args.dry_run:
        for i, (shot, t) in enumerate(lines, 1):
            print(f"{i:2d}  {shot[:32]:32s} {len(t.split()):3d}w  {t[:60]}…")
        return

    OUT.mkdir(exist_ok=True)
    token = run("gcloud", "auth", "print-access-token").strip()
    parts = OUT / "_blocks"
    parts.mkdir(exist_ok=True)

    blocks, at, listing = [], 0.0, []
    for i, ((shot, text), (_, gap, why)) in enumerate(zip(lines, GAPS), 1):
        wav = parts / f"b{i:02d}.wav"
        wav.write_bytes(synthesise(text, token, args.project))
        d = duration(wav)
        blocks.append({"n": i, "shot": shot, "start": at, "end": at + d, "gap": gap,
                       "why": why, "text": text})
        listing.append(f"file '{wav.as_posix()}'")
        at += d

        sil = parts / f"sil-{str(gap).replace('.', '_')}.wav"
        if not sil.exists():
            run("ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono",
                "-t", str(gap), "-c:a", "pcm_s16le", str(sil))
        listing.append(f"file '{sil.as_posix()}'")
        at += gap
        print(f"{i:2d}  {shot[:32]:32s} {d:5.2f}s + {gap:.1f}s  ({why})")

    (parts / "list.txt").write_text("\n".join(listing) + "\n", encoding="utf-8", newline="\n")
    for ext, enc in (("wav", ["-c:a", "pcm_s16le"]), ("mp3", ["-b:a", "192k"])):
        run("ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
            "-i", str(parts / "list.txt"), *enc, str(OUT / f"narration.{ext}"))

    total = duration(OUT / "narration.wav")
    (HERE / "timing.json").write_text(json.dumps(blocks, ensure_ascii=False, indent=1),
                                      encoding="utf-8", newline="\n")

    en = srt(blocks, [t for _, t in lines], HERE / "subtitles.en.srt")
    es_lines = spoken(SPANISH, "## Los planos", False) if SPANISH.exists() else []
    if len(es_lines) == len(blocks):
        es = srt(blocks, [t for _, t in es_lines], HERE / "subtitles.es.srt")
        print(f"\nsubtitles: {en} cues English, {es} Spanish")
    else:
        print(f"\nsubtitles: {en} cues English. Spanish skipped — {SPANISH.name} has "
              f"{len(es_lines)} glosses against {len(blocks)} blocks.")

    print(f"\nnarration {int(total // 60)}:{total % 60:05.2f}   "
          f"({sum(b['end'] - b['start'] for b in blocks):.1f}s speech, {sum(g for _, g, _ in GAPS):.1f}s pause)")
    if total >= 180:
        sys.exit("that is three minutes or more, and the rules say less than three")
    print(f"under the limit by {180 - total:.0f}s")
    print("\nshot windows, which assemble.py reads from demo/timing.json:")
    seen: dict[str, list[float]] = {}
    for b in blocks:
        seen.setdefault(b["shot"], [b["start"], 0.0])[1] = b["end"] + b["gap"]
    for i, (shot, (a, z)) in enumerate(seen.items(), 1):
        print(f"  clip {i}  {shot[:34]:34s} {z - a:6.2f}s")


if __name__ == "__main__":
    main()

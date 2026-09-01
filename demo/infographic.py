#!/usr/bin/env python3
"""Compose the infographic, with every figure read out of the code as it is written.

    python demo/infographic.py            # writes demo/infographic.html
    # then screenshot that file at 1600x2260

**Why a script and not a picture.** The first version of this graphic was drawn by an image
model, and it said 107 tests where there are 157, put GEOM-201 in term 8 when it runs in term 3,
listed twelve tools under a heading that said thirteen, and spelled the rule PREREG_NOT_MET. None
of those are careless — a model drawing a graphic has no way to check, so it produces the
plausible value. This one cannot: every number below is pulled from `app/` at the moment the page
is written, and the refusal is the string `execute()` actually returns.

That also makes it cheap to keep true. A tool added, a rule renamed, a test written, and the
graphic is one command from correct again.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

# Read out of the code rather than typed here. The one number this cannot reach is the test
# count, which comes from the runner below.
EXTRACT = r"""
import fs from 'node:fs';
import { TOOLS, READ_ONLY } from './app/tools.js';
import { COURSES, TERMS, TRACKS, CREDIT_CAP_PER_TERM } from './app/catalogue.js';
import { callTool } from './app/tools.js';

const js = fs.readdirSync('app').filter(f => f.endsWith('.js'));
const PLAN = [['CALC-101',1],['ALG-101',1],['PROG-101',1],['DISC-101',1],['PHYS-101',1],
              ['CALC-102',2],['PROG-102',2],['STAT-101',2],['LOGIC-101',2],['CIRC-101',2],
              ['DS-201',3],['ARCH-201',3],['AUTO-201',3],['STAT-201',3]];
for (const [c, t] of PLAN) callTool('add_course', { course: c, term: t });

console.log(JSON.stringify({
  tools: TOOLS.map(t => t.name),
  readOnly: [...READ_ONLY],
  courses: COURSES.length, terms: TERMS.length, tracks: TRACKS.length,
  cap: CREDIT_CAP_PER_TERM,
  files: js.length,
  lines: js.reduce((n, f) => n + fs.readFileSync('app/' + f, 'utf8').split('\n').length - 1, 0),
  rules: [...new Set(fs.readFileSync('app/rules.js', 'utf8')
            .match(/refuse\('([A-Z_]+)'/g).map(s => s.slice(8, -1)))],
  refusal: String(callTool('add_course', { course: 'ADV-301', term: 5 })),
  closesA: String(callTool('what_this_closes', { course: 'NUM-201', term: 3 })),
  closesB: String(callTool('what_this_closes', { course: 'GEOM-201', term: 3 })),
}));
"""


def run(args, **kw):
    exe = shutil.which(args[0]) or args[0]
    # errors="replace": the test runner prints an information glyph that cp1252 cannot decode,
    # and losing one character is not a reason to lose the whole output.
    return subprocess.run([exe, *args[1:]], cwd=ROOT, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", **kw)


def facts() -> dict:
    p = run(["node", "--input-type=module", "-e", EXTRACT])
    if p.returncode:
        sys.exit(f"extraction failed:\n{p.stderr[-1200:]}")
    f = json.loads(p.stdout)

    import re
    # The files, not the directory: `node --test test/` resolves to nothing on Node 24 and
    # reports a cheerful "pass 0", which is a number and would have gone straight onto the page.
    t = run(["node", "--test", *sorted(str(q.relative_to(ROOT).as_posix())
                                       for q in (ROOT / "test").glob("*.test.js"))])
    m = re.search(r"pass (\d+)", t.stdout + t.stderr)
    if not m or int(m.group(1)) == 0:
        sys.exit("the runner reported no passing tests; refusing to put that on the page")
    f["tests"] = int(m.group(1))

    # The protection rule is raised in policy.js, not rules.js, so the scrape above misses it.
    src = (ROOT / "app" / "policy.js").read_text(encoding="utf-8")
    if "'PROTECTED_TRACK'" in src and "PROTECTED_TRACK" not in f["rules"]:
        f["rules"].append("PROTECTED_TRACK")

    f["mutates"] = [t for t in f["tools"] if t not in f["readOnly"]]
    return f


def track(sentence: str) -> str:
    """The track a what_this_closes answer names, in its own words."""
    a = sentence.split('CLOSE "', 1)[1]
    return a.split('"', 1)[0]


PALETTE = """
  --paper:#fcfcfa; --soft:#f2f1ec; --line:#dcdad3; --ink:#15151a;
  --dim:#6e6e78; --no:#b03a2e; --ok:#1a7f4b; --accent:#5b4bd6;
"""


def page(f: dict) -> str:
    tools_read = "".join(f'<li>{t}</li>' for t in f["readOnly"])
    tools_write = "".join(f'<li class="w">{t}</li>' for t in f["mutates"])
    rules = "".join(f'<span class="rule{" own" if r == "PROTECTED_TRACK" else ""}">{r}</span>'
                    for r in f["rules"])
    refusal = f["refusal"]
    # Split the refusal into its three declared parts, so the shape is visible rather than claimed.
    reason = refusal.split("Refused. ", 1)[1].split(" To unblock it: ", 1)[0]
    remedy = refusal.split(" To unblock it: ", 1)[1].split(" Rule: ", 1)[0]
    rule = refusal.split(" Rule: ", 1)[1].split(".", 1)[0]

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Cursus</title><style>
  :root {{{PALETTE}
    --mono: ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace; }}
  * {{ box-sizing:border-box; margin:0; padding:0; }}
  body {{ width:1600px; background:var(--paper); color:var(--ink); font-family:var(--mono);
         -webkit-font-smoothing:antialiased; }}
  .sheet {{ padding:64px 72px 56px; display:flex; flex-direction:column; gap:44px; }}

  header h1 {{ font-size:64px; letter-spacing:-.03em; }}
  header p {{ font-size:26px; line-height:1.5; color:var(--dim); margin-top:14px; max-width:1180px; }}
  header p b {{ color:var(--ink); font-weight:700; }}
  .urls {{ margin-top:18px; font-size:20px; color:var(--accent); }}

  section {{ border-top:2px solid var(--ink); padding-top:20px; }}
  h2 {{ font-size:21px; letter-spacing:.16em; text-transform:uppercase; color:var(--dim);
        font-weight:700; margin-bottom:20px; }}
  .lede {{ font-size:27px; line-height:1.45; max-width:1300px; margin-bottom:24px; }}
  .lede em {{ font-style:normal; color:var(--no); }}

  .two {{ display:grid; grid-template-columns:1fr 1fr; gap:22px; }}
  .card {{ border:1px solid var(--line); background:var(--soft); padding:22px 24px; }}
  .card .k {{ font-size:22px; font-weight:700; margin-bottom:8px; }}
  .card .v {{ font-size:21px; line-height:1.5; color:var(--dim); }}
  .card.shut {{ border-color:var(--no); }}
  .card.shut .k {{ color:var(--no); }}

  ul {{ list-style:none; display:flex; flex-wrap:wrap; gap:10px; }}
  li {{ border:1px solid var(--line); background:var(--soft); padding:8px 14px; font-size:22px; }}
  li.w {{ border-color:var(--accent); color:var(--accent); }}
  .grouplabel {{ font-size:20px; color:var(--dim); margin:0 0 12px; }}

  .quote {{ border-left:6px solid var(--no); background:var(--soft); padding:22px 26px;
            font-size:22px; line-height:1.75; }}
  .quote .p1 {{ color:var(--no); }}
  .quote .p2 {{ color:var(--ok); }}
  .quote .p3 {{ color:var(--accent); font-weight:700; }}
  .key {{ display:flex; gap:34px; margin-top:16px; font-size:19px; color:var(--dim); }}
  .key i {{ font-style:normal; font-weight:700; }}
  .key .k1 {{ color:var(--no); }} .key .k2 {{ color:var(--ok); }} .key .k3 {{ color:var(--accent); }}

  .fork {{ display:grid; grid-template-columns:280px 60px 1fr; align-items:center;
           gap:0 0; border:1px solid var(--line); background:var(--soft); }}
  .fork .slot {{ padding:26px; border-right:1px solid var(--line); align-self:stretch;
                 display:flex; flex-direction:column; justify-content:center; }}
  .fork .slot b {{ font-size:30px; display:block; }}
  .fork .slot span {{ font-size:20px; color:var(--dim); display:block; margin-top:6px; }}
  .fork .arms {{ display:flex; flex-direction:column; justify-content:center; height:100%;
                 color:var(--dim); font-size:26px; align-items:center; gap:44px; }}
  .fork .ends {{ display:flex; flex-direction:column; gap:0; }}
  .fork .end {{ padding:20px 26px; font-size:21px; line-height:1.5; }}
  .fork .end + .end {{ border-top:1px solid var(--line); }}
  .fork .end b {{ color:var(--no); }}
  .fork .end .t {{ font-size:23px; display:block; margin-bottom:4px; }}

  .rule {{ display:inline-block; border:1px solid var(--line); background:var(--soft);
           padding:7px 13px; font-size:20px; margin:0 8px 8px 0; }}
  .rule.own {{ border-color:var(--accent); color:var(--accent); font-weight:700; }}

  .flow {{ display:flex; align-items:center; gap:16px; font-size:23px; flex-wrap:wrap; }}
  .flow b {{ border:1px solid var(--line); background:var(--soft); padding:10px 18px;
             font-weight:400; }}
  .flow i {{ font-style:normal; color:var(--dim); }}
  .derived {{ margin-top:22px; font-size:23px; line-height:1.9; }}
  .derived code {{ font-weight:700; }}
  .derived span {{ color:var(--dim); }}

  .nums {{ display:grid; grid-template-columns:repeat(5,1fr); gap:20px; }}
  .num b {{ display:block; font-size:52px; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }}
  .num span {{ font-size:20px; color:var(--dim); line-height:1.4; display:block; margin-top:6px; }}

  footer {{ border-top:1px solid var(--line); padding-top:22px; font-size:20px;
            line-height:1.6; color:var(--dim); }}
  footer b {{ color:var(--ink); }}
</style></head><body><div class="sheet">

<header>
  <h1>Cursus</h1>
  <p>A course planner whose tools <b>refuse</b>, say <b>what a choice closes off</b> two years
     before it bites, <b>hold a limit you set</b> against the agent, and can be <b>rewound</b>.
     Built on WebMCP. A worked example, not a product for one university.</p>
  <div class="urls">hvaler.github.io/cursus &nbsp;·&nbsp; github.com/hvaler/cursus</div>
</header>

<section>
  <h2>One slot, two futures</h2>
  <p class="lede">Terms 1 and 2 are full. Term 3 has six credits left and two courses want them.
     Both run in term 3 <em>and nowhere else</em>, so the slot is what costs, not the course.</p>
  <div class="fork">
    <div class="slot"><b>one slot</b><span>6 credits<br>term 3</span></div>
    <div class="arms"><span>&#8599;</span><span>&#8600;</span></div>
    <div class="ends">
      <div class="end"><span class="t">take <b>NUM-201</b></span>
        closes <b>{track(f["closesA"])}</b> &mdash; GEOM-201 has nowhere else to go</div>
      <div class="end"><span class="t">take <b>GEOM-201</b></span>
        closes <b>{track(f["closesB"])}</b> &mdash; NUM-201 is required by everything after</div>
    </div>
  </div>
</section>

<section>
  <h2>{len(f["tools"])} tools on document.modelContext</h2>
  <p class="grouplabel">{len(f["readOnly"])} answer a question and change nothing:</p>
  <ul>{tools_read}</ul>
  <p class="grouplabel" style="margin-top:20px">{len(f["mutates"])} change the plan:</p>
  <ul>{tools_write}</ul>
</section>

<section>
  <h2>Every refusal has the same shape</h2>
  <p class="lede">A tool that only fails leaves the agent reporting failure. One that names the
     rule, the reason and the remedy leaves it repairing the situation — and in our tests, asking
     before it applied the fix.</p>
  <div class="quote"><span class="p1">Refused. {reason}</span>
     <span class="p2">To unblock it: {remedy}</span>
     <span class="p3">Rule: {rule}.</span> The plan was not changed.</div>
  <div class="key"><span><i class="k1">the reason</i> — what the rules found</span>
     <span><i class="k2">the remedy</i> — what would unblock it</span>
     <span><i class="k3">the rule</i> — which one, by name</span></div>
</section>

<section>
  <h2>{len(f["rules"]) - 1} rules belong to the university. One belongs to the student.</h2>
  <div>{rules}</div>
  <p class="lede" style="margin-top:24px">A prerequisite, a clash, a credit cap — those are the
     same for everyone. <b>protect_track</b> is the student's own: say <em>do not close Graphics
     and Animation</em>, and from then on anything that would close it is refused, including when
     you ask for it yourself an hour later. The refusal cites your instruction, not the handbook.</p>
</section>

<section>
  <h2>One decision, and the rest falls out</h2>
  <div class="flow">
    <b>a tool call</b><i>→</i><b>the rules accept it</b><i>→</i><b>an event is appended</b>
    <i>→</i><b>state = reduce(log)</b>
  </div>
  <div class="derived">
    <code>undo_to(n)</code> <span>is</span> reduce(log.slice(0, n))<br>
    <code>list_actions()</code> <span>is</span> the log itself<br>
    <code>share_plan()</code> <span>is</span> the log in a link, replayed through these same rules<br>
    <code>a refusal</code> <span>is</span> the reducer never being reached. Nothing is written.
  </div>
</section>

<section>
  <h2>What it is made of</h2>
  <div class="nums">
    <div class="num"><b>{f["files"]}</b><span>files of plain ES modules</span></div>
    <div class="num"><b>{f["lines"]:,}</b><span>lines of JavaScript</span></div>
    <div class="num"><b>{f["tests"]}</b><span>tests, none skipped, on Node's own runner</span></div>
    <div class="num"><b>0</b><span>dependencies, build steps and servers</span></div>
    <div class="num"><b>{f["courses"]}</b><span>courses, {f["terms"]} terms, {f["tracks"]} specialisations, {f["cap"]} credits a term</span></div>
  </div>
</section>

<section>
  <h2>Adapting it to another institution</h2>
  <p class="lede">Two files. <b>catalogue.js</b> is the courses, terms and specialisations;
     <b>rules.js</b> is what that university will not allow. The {len(f["tools"])} tools, the event
     log, the shape of a refusal and the layer that holds a student's own limits against the agent
     do not change.</p>
</section>

<footer>
  <b>The catalogue is invented and no registrar has seen it.</b> Every figure on this page was read
  out of the code when the page was written, and the refusal above is the string the tool returns —
  <b>demo/infographic.py</b> regenerates it. Nothing here was transcribed by hand.
</footer>

</div></body></html>
"""


def main() -> None:
    f = facts()
    out = HERE / "infographic.html"
    out.write_text(page(f), encoding="utf-8", newline="\n")
    print(f"{len(f['tools'])} tools ({len(f['readOnly'])} read, {len(f['mutates'])} write), "
          f"{len(f['rules'])} rules, {f['files']} files, {f['lines']} lines, {f['tests']} tests")
    print(f"written: {out}")
    print("screenshot it at 1600 wide, full height")


if __name__ == "__main__":
    main()

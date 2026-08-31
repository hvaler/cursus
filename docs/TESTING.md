# How to test this

Four ways, cheapest first. The first two need nothing but Node; the last two need a WebMCP client,
which is the part with the surprises in it.

**None of them needs an account on this page, a key, or a server.** The page has none of those.

**Both of the environments named in the challenge rules were tested, and both make real tool
calls** — ways 3 and 4 below. Neither is a claim about registration: a page cannot tell a
model calling its tools from a model that never saw them, which is why each one says what was
observed rather than what was available.

---

## 1. The logic — 30 seconds

```bash
git clone https://github.com/hvaler/cursus && cd cursus
npm test
```

**157 tests, none skipped, no dependencies to install.** `package.json` has no `dependencies` and no
`devDependencies`; the runner is Node's own (`node --test`). Node 20 or later.

| Suite | Covers |
|---|---|
| `test/core.test.js` (24) | the reducer, the 10 university rules, the catalogue's own invariants |
| `test/queries.test.js` (18) | reachability, closures, what a choice costs |
| `test/tools.test.js` (38) | the strings the tools return |
| `test/hostile.test.js` (13) | input that is trying something |
| `test/solve.test.js` (11) | planning towards a goal, and pricing the ways out |
| `test/registration.test.js` (4) | a host that attaches WebMCP late, or never |
| `test/policy.test.js` (16) | a limit the student set, and the ways round it that must not work |
| `test/ui.test.js` (13) | escaping, and the screen rendering from the same log |
| `test/share.test.js` (14) | a plan in a link, and links that were edited on the way |
| `test/docs.test.js` (6) | the documents, against the code they describe |

If a claim in [FACTS.md](FACTS.md) interests you, its row names the test that backs it and the
`file:line` that implements it. Those references are checked against the source, not written from
memory.

---

## 2. The part unit tests cannot check — a few minutes

A test can prove `what_this_closes` computes reachability correctly. It cannot prove a model
**picks that tool** when a student asks a question in their own words, or that it can **act on a
refusal**. That needs a model.

```bash
export GEMINI_API_KEY=...        # AI Studio: twenty requests a day, per model
npm run eval
```

**Twenty a day does not cover a full run**, which wants around twenty-six — so either slice it with
`EVAL_ONLY=adversarial` (or `usability`), or go through Vertex on a Google Cloud project, which has
no such cap and takes the identical request body:

```bash
EVAL_PROJECT=your-project GOOGLE_ACCESS_TOKEN=$(gcloud auth print-access-token) npm run eval
```

Eight scenarios, asserting on what the model *did* rather than on what it said. Last run
**8/8**, including finding `list_actions` then `undo_to` unprompted, and refusing to invent a
course that does not exist. Results, method and limits: [EVAL.md](EVAL.md).

The free tier's rate limit is low; the harness retries and reports a 429 as an error rather than as
a failing scenario, because calling it a failure would be a lie about the tools.

---

## 3. In the browser, without an agent — 1 minute

Open <https://hvaler.github.io/cursus/> in anything. Press **Run the scripted walk-through**.

To run the same page from a clone, **serve the folder** rather than opening the file:

```bash
npx serve .            # then open the address it prints
python -m http.server  # or this, then http://localhost:8000
```

**Double-clicking `index.html` gives a blank page.** Browsers refuse ES module imports over
`file://`, and the failure looks identical to a project that does not work. There is nothing to
install either way — the repository has no dependencies.

It calls the same tools, by the same contract, and is labelled `page` in the trace — **never
`AGENT`**. It exists because the rules say judges *"are not required to test the Project"*, so the
most likely way this is seen is with no agent at all.

There is also an **Inspect the API** button, which reads `document.modelContext` live and prints
what it finds. Every claim in [WEBMCP-API-NOTES.md](WEBMCP-API-NOTES.md) except the last two comes
from that button.

---

## 4. With a real agent

Two environments, both tested on 2026-08-27, both working. They fail in different ways, which is
worth knowing before you decide the page is broken.

**Start with ChatGPT's in-app browser if you have the choice.** It is the environment the rules
name first, it is the one the demo video shows, and it asks nothing of you — the Chrome route
below needs a model key of your own before an agent can say a word. Chrome is the better fallback
than a workaround: it has no plan, mode or workspace conditions at all.

**A plan to start from.** The questions worth asking — what a slot costs, what protecting a track
does — need a plan that is nearly full, and the page opens empty. Press **Run the scripted
walk-through**. Its setup is the same fourteen courses (`app/ui.js`, `SETUP`), so it leaves term 3
at 24/30 with all four specialisations open, and everything it does is labelled `page` — which is
what makes your agent's calls stand out against it afterwards.

It then runs five more calls of its own, two of them the `what_this_closes` pair, so the trace
already holds the answer to the first question below before you ask it. Watch the `AGENT` label
rather than the prose and it does not matter: the label is the thing under test, not the sentence.

### ChatGPT's in-app browser

**Be in Work mode.** This is the whole difficulty, and it cost four failed attempts to find:
outside Work mode the assistant cannot reach a page's tool registry, reads the rendered page
instead, and answers from that — fluently and, in our case, wrongly.

Also check *Settings → Browser → Permissions → Enable site tools*.

**And if your workspace is Enterprise or Edu, this route is closed to you.** Site tools are not
available there ([OpenAI's documentation](https://learn.chatgpt.com/docs/webmcp)), no setting
changes it, and the page will look exactly as it does when everything is fine. Use Chrome.

The runbook, with the failures and what each one looked like:
[CHATGPT-WORK-MODE.md](CHATGPT-WORK-MODE.md).

### Chrome

1. Chrome 149 or later. This was run on **151**.
2. `chrome://flags/#enable-webmcp-testing` → **Enabled** → restart.
3. Install **WebMCP - Model Context Tool Inspector**
   ([webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools)), open its side panel, and
   press **Update Gemini API key** to enter your own. The agent is the extension's, not the page's.
4. Open the page. The status line should read **WebMCP available - 13 tools registered.**
5. Ask, in *Interact with the Page*: `Enrol me in ADV-301.`

Expected: the agent picks `add_course`, is refused for a missing prerequisite, and proposes
`CALC-102` and `NUM-201` before term 5. The full trace is in [GATE.md](GATE.md).

The panel also lists all thirteen tools with their schemas and annotations, so `readOnlyHint` and
`untrustedContentHint` can be read without calling anything.

---

## How to tell a real call from a convincing answer

This page is documented well enough that a model can answer questions about it **without calling
anything**, and one did, three times, citing GitHub. Being right made it harder to notice.

So there is a tell, and it is worth knowing before you judge any WebMCP page:

> **The page loads with an empty plan.** Ask what taking `NUM-201` in term 3 closes off. A real
> call returns *"closes no track"*. An answer about **Graphics and Animation** came from reading
> the README, where that example is written out for a plan that is already half full.

And the page keeps its own count, in **TOOL CALLS, LIVE**, with the attribution it can and cannot
prove:

```text
1 call(s), 1 attributed to an agent - the page cannot verify that;
WebMCP gives the handler no caller identity
```

A call the page did not make itself shows as `AGENT`. That is an assumption, and the line says so.

---

## Reproducing the numbers in the documents

| Claim | Command |
|---|---|
| 157 tests, none skipped | `npm test` |
| 8/8 on the eval scenarios | `npm run eval` — `GEMINI_API_KEY` for AI Studio, or
  `EVAL_PROJECT` + `GOOGLE_ACCESS_TOKEN` for Vertex |
| 1,993 lines across ten modules | `wc -l app/*.js` |
| 40 courses, 4 tracks, 30-credit cap | `node -e "import('./app/catalogue.js').then(m=>console.log(m.COURSES.length, m.TRACKS.length, m.CREDIT_CAP_PER_TERM))"` |
| the string the in-app browser returned | `node -e "import('./app/tools.js').then(m=>m.TOOLS.find(t=>t.name==='what_this_closes').execute({course:'NUM-201',term:3})).then(console.log)"` |
| what the WebMCP API exposes | **Inspect the API** on the live page |

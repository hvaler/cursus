# What the WebMCP API actually does

Read off the live API on **2026-08-27**, in Chrome 151 and in the Chromium that ships with
Playwright. **None of the nine findings below is in the Chrome documentation**, and three of them
were found by getting it wrong first. The last two came from ChatGPT's in-app browser and are
the only ones not reproducible from a button on the page.

One qualification on finding 8, since this file is meant to be checked rather than believed: the
*requirement* that led to it - that the in-app browser exposes site tools to ChatGPT Work and to
Codex, and not at all in Enterprise or Edu workspaces - **is documented by OpenAI**, at
[learn.chatgpt.com/docs/webmcp](https://learn.chatgpt.com/docs/webmcp). We found that page after
four failed attempts, not before. The finding itself is about something else and stands: what a
page can and cannot observe about its own silence.

Reproduce any of them with the *Inspect the API* button on <https://hvaler.github.io/cursus/>.

---

## The surface

`document.modelContext` is an instance of **`ModelContext`**. Its prototype has exactly five
members and nothing else:

| Member | Arity |
|---|---:|
| `registerTool` | 1 |
| `getTools` | 0 |
| `executeTool` | 2 |
| `ontoolchange` | *(event handler)* |
| `constructor` | 0 |

There is no `unregisterTool`, no `tools` collection, no `provideContext`, no `listTools`.

**The specification agrees, and explains the gap.** There is no unregister *method* because
[the spec](https://webmachinelearning.github.io/webmcp/) unregisters through the **`AbortSignal`**
passed to `registerTool`, and fires `ontoolchange` when the set changes. Read off the live API, the
absence looks like an omission; it is a different design, and this page never needed it — its
thirteen tools are all valid all the time.

---

## 1. It is on `document`, not `navigator`

```js
document.modelContext.registerTool({ … })   // yes
navigator.modelContext                       // does not exist
```

## 2. `execute` returns a string the model reads

Not a structured object. The return value is text that goes into the agent's context.

**This has a design consequence.** A mutating tool that returns `"ok"` leaves the agent's idea of
the state to drift from the page's, silently. Every tool that changes something should return the
**resulting state**:

```js
// no
return 'ok';
// yes
return `Enrolled CALC-101. The plan now contains: CALC-101. Total credits: 6.`;
```

The same applies to a refusal — say what did *not* happen:

```js
return 'Refused. ADV-301 requires CALC-101, which is not in the plan. ' +
       'To unblock it: enrol CALC-101 first. Rule: PREREQ_NOT_MET. The plan was not changed.';
```

`The plan was not changed` is the part that matters. Without it the agent has to guess whether the
refusal left state behind.

## 3. `registerTool` returns `undefined`

So it is not where the `RegisteredTool` comes from. **The specification says so on purpose** —
`Promise<undefined>` in the IDL — which was worth knowing an hour earlier than we knew it.

```js
const h = await document.modelContext.registerTool({ name: 'ping', … });
h;   // undefined
```

## 4. The handle comes from `getTools()`

```js
const tools = await document.modelContext.getTools();
const ping  = [...tools].find(t => t.name === 'ping');
```

Returns plain objects carrying at least `name`. Passing a tool's **name** to `executeTool` instead
of the object throws:

```
TypeError: Failed to execute 'executeTool' on 'ModelContext':
The provided value is not of type 'RegisteredTool'.
```

## 5. `executeTool` wants its arguments as a **JSON string**

Measured, all four in the same page:

| Second argument | Result |
|---|---|
| `{}` | `UnknownError: Failed to parse input arguments` |
| `undefined` | same |
| `null` | same |
| **`'{}'`** | **works** |

```js
await document.modelContext.executeTool(ping, JSON.stringify(args));
```

**And the specification says the opposite.** Its IDL is
`executeTool(RegisteredTool tool, optional object inputObject = {}, …)` — an **object**, which is
the first thing we tried and the thing that produced `Failed to parse input arguments`.

So one of two things is true and this page cannot tell which: Chrome 151 diverges from the spec
here, or the spec moved after that build shipped. What is measured is the table above, in Chrome
151, on 2026-08-27. **If you are writing against this, try the object first** — it is what the
standard says — and keep the string as the fallback rather than the other way round.

---

## 6. The page cannot tell who called a tool

The `execute` handler receives the input and an `AbortSignal`. **Nothing identifies the caller.**
A call from a real agent and a call from `document.modelContext.executeTool` arrive
indistinguishable.

Found on 2026-08-27: one click on a button that called `executeTool` produced two log lines, one
tagged as coming from an agent, because the handler had no way to know better. The only caller a
page can identify is itself:

```js
let viaExecuteTool = false;
// around our own call
viaExecuteTool = true;
try { await mc.executeTool(tool, JSON.stringify(args)); } finally { viaExecuteTool = false; }
```

Everything else is *assumed* to be an agent, which is an assumption and not a measurement.

**This matters beyond a diagnostic.** A page whose rules depend on who is acting cannot get that
answer from WebMCP. Whatever governance a page enforces has to rest on what is being asked, not on
who is asking.

---

## 7. The client renames your tools

The names a page registers are not the names the model sees. Through the WebMCP Inspector,
`enrol` and `ping` reached Gemini as **`_0_enrol`** and **`_0_ping`** — prefixed by the client,
presumably per page or per frame.

Seen in the trace in [GATE.md](GATE.md) on 2026-08-27. A page must not assume its own tool names
survive the trip, and must not rely on them for anything it does itself.

---

## 8. Registration succeeding is not evidence the model can see the tools

`registerTool` resolving, `getTools()` returning what you registered, and a page reading
**"WebMCP available - 10 tools registered"** all describe one thing: the API exists in this
browser. **None of them says a model is in a position to call anything.**

Found on 2026-08-27 in ChatGPT desktop's in-app browser, which registered all ten tools and then
went four prompts without calling one - the fourth after saying it would rely on the page's tools
and not search the web. Full record in [FACTS 4.4](FACTS.md).

**The cause was none of the things the page could have guessed.** Not the API, not the
registration, and not a permission - *Enable site tools*, the setting that governs exactly this,
was already on. It was the **mode the client was in**. Asked directly, the assistant said so:
*"browser/WebMCP access requires Work mode, and you declined the switch."* In Work mode, with
the same page and the same settings, a one-line instruction produced the call in 53 seconds.

So the list of things a page cannot distinguish is longer than it first looks. Zero calls is
consistent with all of:

- the host never bridged the tools to a model,
- the model saw them and declined,
- **the model was never in a session that could reach them,** and
- there is no agent here at all.

A page sees one number for all four. This is [finding 6](#6-the-page-cannot-tell-who-called-a-tool)
extended: there a page could not tell *who* called, here it cannot tell *why nobody did* - and the
real reason was the one furthest from anything it can observe.

**What follows for a page.** Never report the presence of the API as readiness. This one says
**"10 tools registered"**, a fact about the page, and counts calls separately, a fact about what
happened. Both numbers are honest and neither is the interesting one. **The gap between them is not
diagnosable from inside the page**, which means a WebMCP page that wants to be usable has to say
what the reader should check on their side - the page cannot work it out for them.

---

## 9. The host adds a discovery tool of its own

The model does not receive a page's tools and nothing else. In ChatGPT's in-app browser on
2026-08-27, the conversation's *Sources* panel recorded two calls against `hvaler.github.io`:

```text
what_this_closes     once
webmcp_list_tools    once
```

`what_this_closes` is ours. **`webmcp_list_tools` is not** - it is in no version of this page's
registry. It is the host's own, and the order says what it is for: the model listed the
page's registry first, then called into it.

Two things follow. A page's tool names share a namespace with whatever the host injects, so a page
that registered `webmcp_list_tools` itself would be colliding with the client - which sits badly
next to [finding 7](#7-the-client-renames-your-tools), where the client renames what you register.
And **the host's ledger of calls is a better witness than the model's prose**: it is counted rather
than narrated, and in this case it is the only record that survived, because the page's own counter
was not captured before the window closed.

---

## Afterwards: the official guidance, and what it said about this page

The nine findings above were all made by getting something wrong first. Chrome publishes
[WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices), and it was
found **after** all of them — so this section is an audit rather than a source.

**Most of it we had already arrived at**, which is worth saying plainly because it is the cheapest
kind of validation and the easiest to overstate:

| Guidance | Here |
|---|---|
| *"Validate strictly in code, loosely in schema"* | `inputSchema` takes a string and a number; `rules.js` decides |
| Descriptive errors, so the model can self-correct | `refuse()` carries a remedy — the finding in [GATE.md](GATE.md) |
| Update the interface after a call, so the agent can plan | the screen renders from the same log the tools write |
| Evaluation-driven, with code checks and a model judge | [`tools/eval.mjs`](../tools/eval.mjs) |
| Natural-language values, not ids | `track: "graphics"`, never `track_id: 3` |
| One function per tool | thirteen tools, thirteen jobs |

**Three things it changed.**

*"Use positive language about capabilities, not limitations."* `add_course` opened with a list of
what makes it fail — *"May refuse — for a missing prerequisite, a timetable clash, a full term…"*.
Same information, wrong end first. It now says what it checks and that the answer names what would
unblock it. `remove_course` had the same shape.

*"Distinguish execution from initiation."* The guidance's own example is `create-event` against
`start-event-creation-process`. **`plan_for_track` proposed a route and applied none of it, and the
name did not say so** — while this repository's README claimed that proposing rather than applying
was a deliberate decision. If it is deliberate the name has to carry it, so it is
**`propose_plan_for_track`**.

**And two places this page knowingly differs.**

*"Be careful not to create overlapping tools, as the agent may be confused."* `what_this_closes`
and `compare_options` answer the same underlying question, one course or two. That is deliberate —
a call through ChatGPT's in-app browser took 53 seconds, and asking twice is a minute of a person's
life — and the descriptions separate them by situation rather than by mechanism. But it is the
overlap the guidance warns about, and **the eval that would show whether selection degraded could
not run**: quota, both models, fifteen of sixteen scenarios ([EVAL.md](EVAL.md)). The risk is
recorded, not measured.

*"Experiment to find the right number — more tools increase context use and completion time."* This
page went from ten to thirteen in one afternoon and measured nothing, for the same reason. Thirteen
is a guess.

---

## What `executeTool` is for

It appears in Chrome's **evaluation** documentation, not in the imperative API page. It is a way to
drive a tool without an agent, which makes it useful for tests and for a page that wants to offer a
no-agent fallback path. It is **not** needed for the normal flow: the page registers, and the agent
calls.

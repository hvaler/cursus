# What the WebMCP API actually does

Read off the live API on **2026-08-27**, in Chrome 151 and in the Chromium that ships with
Playwright. **None of the eight findings below is in the Chrome documentation**, and three of them
were found by getting it wrong first. Number 8 came from the environment the challenge rules
name, and is the only one not reproducible from a button on the page.

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

So it is not where the `RegisteredTool` comes from.

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

**The cause was none of the things the page could have guessed.** It was not the API, not the
registration, and not a permission - *Enable site tools*, the setting that governs exactly this, was
already on. The session simply had no browser tab **bound to the agent**. The page was open beside
the conversation rather than under it, so the model reached the rendered HTML and not the registry.
Bind the tab and the same tool call goes through and returns the same string the page's own buttons
produce.

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

## What `executeTool` is for

It appears in Chrome's **evaluation** documentation, not in the imperative API page. It is a way to
drive a tool without an agent, which makes it useful for tests and for a page that wants to offer a
no-agent fallback path. It is **not** needed for the normal flow: the page registers, and the agent
calls.

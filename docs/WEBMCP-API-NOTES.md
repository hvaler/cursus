# What the WebMCP API actually does

Read off the live API on **2026-08-27**, in Chrome 151 and in the Chromium that ships with
Playwright. **None of the five findings below is in the Chrome documentation**, and three of them
were found by getting it wrong first.

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

## What `executeTool` is for

It appears in Chrome's **evaluation** documentation, not in the imperative API page. It is a way to
drive a tool without an agent, which makes it useful for tests and for a page that wants to offer a
no-agent fallback path. It is **not** needed for the normal flow: the page registers, and the agent
calls.

# Cursus — WebMCP gate check

**Work in progress.** This is not the product yet. It is the day-one gate for an entry to
[The WebMCP Challenge](https://webmcp.devpost.com/), and it exists to answer two questions before
any product code is written:

1. Can an agent call a tool this page registers?
2. When a tool **refuses**, does the refusal read well enough for the agent to act on it?

The second question is the one the eventual project rests on.

## Live

<https://hvaler.github.io/cursus/>

Open it in ChatGPT's in-app browser, or in Chrome 149+ with
`chrome://flags/#enable-webmcp-testing` enabled.

## What the page does

Registers two tools through `document.modelContext.registerTool`:

| Tool | Behaviour |
|---|---|
| `ping` | Returns the time. Proves a call arrives and a result goes back |
| `enrol` | Takes a course code. **Refuses `ADV-301`** for a missing prerequisite, accepts anything else |

Every call is logged on the page, tagged by where it came from:

- **`AGENT`** — an agent decided to call it. This is the only tag that passes the gate
- **`webmcp`** — invoked through `document.modelContext.executeTool`
- **`button`** — a plain click on the page, no WebMCP involved

The tags exist because the first version of this page logged all three identically, which made the
one measurement it was built to take impossible to read.

## What we learned about the API, by getting it wrong

None of this is in the Chrome documentation as of 2026-08-27.

- Registration is on **`document.modelContext`**, not `navigator.modelContext`.
- `execute` returns **a string the model reads**, not a structured object. So a mutating tool
  should return the resulting state, never an acknowledgement — otherwise the agent's idea of the
  state silently diverges from the page's.
- **`registerTool` returns `undefined`**, so it is not the source of the `RegisteredTool` handle
  that `executeTool` requires. Passing the tool's name instead throws
  `TypeError: The provided value is not of type 'RegisteredTool'`.

## Status

| | |
|---|---|
| Tools register | **yes**, in Chrome 151 and Edge |
| A refusal reads as a normal result | **yes**, by construction |
| An agent has called a tool | **not yet** — that is what this deployment is for |

## Licence

Apache-2.0. See [`LICENSE`](LICENSE).

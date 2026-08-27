# Getting a WebMCP page callable from ChatGPT's in-app browser

The challenge rules point judges at two environments:

> *"Download the ChatGPT desktop app and use its in-app browser, which supports WebMCP by default.
> Alternatively, download Google Chrome 149 or later, enable `chrome://flags/#enable-webmcp-testing`,
> and restart the browser."*

The second is straightforward. **The first says "by default" and, in our experience, is not** — it
took four failed attempts to find the switch. This file is the runbook and the record of getting it
wrong, because the way it fails is silent and looks like the page's fault.

Everything below was observed on **2026-08-27**, ChatGPT desktop `OpenAI.ChatGPT-Desktop
1.2026.190.0` from the Microsoft Store, on Windows 11.

---

## What the official documentation says

Found **after** the four failed attempts below, not before. It confirms the requirement and adds
two things we had no way to discover ([Site tools, ChatGPT Learn](https://learn.chatgpt.com/docs/webmcp)):

> *"In the built-in browser in the ChatGPT desktop app, **ChatGPT Work and Codex** can discover and
> use these tools when they are available."*

> *"You can turn off **Enable site tools** in **Settings > Browser > Permissions**."*

> *"Site tools aren't available in **Enterprise or Edu** workspaces."*

**The last one has no workaround.** A judge on an Enterprise or Edu workspace cannot call this
page's tools from the in-app browser however they configure it, and nothing on screen will say so.
They need the Chrome route ([TESTING.md](TESTING.md)).

**And Codex is a second surface**, named in the same sentence as ChatGPT Work. We have not tested
it. It is listed under what is unknown, below, rather than claimed.

The order matters and is worth saying plainly: everything in this file was established by getting
it wrong first. The documentation was found afterwards and agreed.

---

## The short version

0. **Check the workspace is not Enterprise or Edu.** Site tools do not exist there, and no setting
   brings them back. If it is either, stop and use Chrome instead.
1. Open the page in the **in-app browser** (the tab pane beside the conversation), not in an
   ordinary browser and not by asking ChatGPT to browse to it.
2. Confirm the page says it registered its tools. Ours prints
   **"WebMCP available - 13 tools registered."**
3. **Be in Work mode.** This is the step that matters and the one nothing tells you about.
4. Tell the assistant to *use* the tool, naming it:

   ```text
   Use the open page's WebMCP tool what_this_closes with:
   course: NUM-201
   term: 3
   ```

That produced a real call in **53 seconds**. Without step 3, four different phrasings produced
none.

---

## Settings worth checking first

**Settings → Browser** (*Navegador*):

| Setting | Ours |
|---|---|
| *Allow ChatGPT to control the in-app browser* | on |
| **Permissions → Enable site tools** — *"Allow ChatGPT to discover and invoke site tools exposed by websites, including WebMCP"* | **on, by default** |
| Site permissions | no per-site overrides |
| Developer mode → full CDP access | off |

**Note that the WebMCP setting was already on and it changed nothing.** It is necessary, not
sufficient. Checking it first is still worth the ten seconds, because if an administrator policy
has greyed it out on a managed account, that is the whole answer and you can stop.

The browser's **⋮** menu has no entry for tools, permissions, or connecting a page to the model.
There is nothing to find there.

---

## How it fails, so you recognise it

All four of these ran with the page open in the in-app browser, its ten tools registered, and the
site-tools permission on. **Not one produced a tool call.**

| Asked | What came back |
|---|---|
| *"Open `<url>` and tell me what I close off by taking NUM-201 in term 3"* | a confident, detailed answer — sourced to **GitHub** |
| *"What does taking NUM-201 in term 3 close off?"* | the same answer, still sourced to **GitHub** |
| *"Use the tools this page registers. Do not search the web."* | *"Searching the web"* |
| the same instruction again | *"Understood. I will not use web search. I will rely only on the tools the page registers"* — **and then no call** |

The fourth is the dangerous one. It **stated it would use the tools and used none**, and nothing in
the conversation revealed that. Only the page's own call counter did.

Asked to call the tool by name, it explained the boundary precisely:

> *"I can't actually invoke `what_this_closes` from this chat interface. The page confirms that it
> registers tools, but the web access available to me exposes only the rendered page, not its live
> WebMCP tool registry. So I won't pretend I called it or substitute a web-search answer."*

And, once, it named the requirement outright:

> *"I can't run `what_this_closes` from this chat because browser/WebMCP access requires **Work
> mode**, and you declined the switch."*

**That is the sentence this whole file exists for.** The app offers the switch; declining it leaves
you in a session that can read the page and nothing more.

---

## What it looks like when it works

The assistant worked for 53 seconds and returned:

```text
Taking NUM-201 in term 3 closes no track. Every specialisation that is reachable now stays
reachable.
```

Three independent records agree.

**The page's own panel** — the only witness this repository treats as its own:

```text
TOOL CALLS, LIVE
1 call(s), 1 attributed to an agent - the page cannot verify that;
WebMCP gives the handler no caller identity

[AGENT] what_this_closes({"course":"NUM-201","term":3})
```

**The host's ledger**, in the conversation's *Sources* panel:

```text
hvaler.github.io
  what_this_closes     once
  webmcp_list_tools    once
```

`webmcp_list_tools` is **not one of this page's own tools**. It is the host's discovery tool:
the model listed the page's registry first, then called into it
([API notes, finding 9](WEBMCP-API-NOTES.md)).

**The string itself**, which is `app/tools.js:111` with the arguments substituted, character for
character, and reproducible offline:

```bash
node -e "import('./app/tools.js').then(m =>
  m.TOOLS.find(t => t.name === 'what_this_closes').execute({ course: 'NUM-201', term: 3 })
).then(console.log)"
```

---

## Why you cannot tell by looking at the page

A page can see two things: that its own `registerTool` calls resolved, and how many times its tools
were invoked. It cannot see anything in between.

Zero calls is equally consistent with:

- the host never bridging the tools to a model,
- the model seeing them and declining,
- there being no agent in the browser at all, and
- **the client being in the wrong mode** — which is what it was.

**A page sees one number for all four.** So a WebMCP page cannot diagnose its own silence, and the
only useful thing it can do is tell the reader what to check on their side. That is why the first
paragraph of this project's README names the mode.

---

## What is still unknown

- **How much of the naming was necessary.** The instruction that worked names the tool and its
  arguments. A bare question — *"what does taking NUM-201 in term 3 close off?"* — has not been
  tried inside Work mode.
- **Whether the model matters.** The failures ran on **GPT-5.6 Sol**, the successes on **5.6 Terra
  Medio**. Mode and model changed together. The assistant attributed the difference to the mode and
  the documentation agrees with it, but nothing here tests the model independently.
- **Codex.** Documented as able to discover and use site tools. Never tried here.
- **Any other operating system.** Windows 11 only, one app version, one afternoon.

Two things that *were* unknown when this file was first written are now answered, and by the
documentation rather than by us: the requirement is **ChatGPT Work**, and **Enterprise and Edu
workspaces are excluded outright**.

---

## If you are building a WebMCP page

Three things this cost us that you can have for free.

**Do not read `document.modelContext` once at boot.** A host may attach after your page renders. We
wait up to twelve seconds, show *"Looking for WebMCP…"* while waiting, then keep checking every
thirty seconds for ten minutes. Four tests cover it. As it turned out this was *not* the problem
here — the in-app browser attaches before load — but the page could not have known that, and the
failure would have looked identical.

**Count your own calls, and say what you cannot prove.** WebMCP gives the handler no caller
identity, so the honest line is *"1 attributed to an agent — the page cannot verify that"*. Written
as a caveat, it became the only thing that caught a model answering without calling.

**Assume good documentation will be used instead of your tools.** Our README explains the worked
example well enough to answer the question it exists to motivate, and a model read it and answered
correctly, three times, having called nothing. If your page has a state that makes a real call
distinguishable from a good guess — ours starts empty, so a real call must say *"closes no
track"* — write that down. It is the only test a reader can run from outside.

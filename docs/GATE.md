# The day-one gate, and what it proved

**2026-08-27.** Before writing any product code, one question had to be answered: can an agent call
a tool this page registers, and — the part that matters — **does a refusal read well enough that
the agent acts on it correctly?**

Both are now answered. This file is the evidence.

---

## How it was driven

Chrome 151, `chrome://flags/#enable-webmcp-testing`, page at <https://hvaler.github.io/cursus/>,
driven through the **WebMCP Model Context Tool Inspector** extension
([GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools)) with
`gemini-3.6-flash` behind it.

The only input was one sentence, in Spanish, naming no tool:

> Matricúlame en ADV-301.
>
> *("Enrol me in ADV-301.")*

## What the model did with it

**It chose the tool on its own.** Nothing in the prompt names `enrol`; the model picked it from the
description alone and supplied the argument:

```json
{ "name": "_0_enrol", "args": { "course": "ADV-301" } }
```

**The page refused**, returning a plain string:

```
Refused. ADV-301 (Advanced Calculus) requires CALC-101, which is not completed and not in
the plan. To unblock it: enrol CALC-101 first. Rule: PREREQ_NOT_MET. The plan was not changed.
```

**And the model acted on the refusal rather than reporting a failure:**

*(Translated below the quote, which is left in the language the model answered in.)*

> No ha sido posible matricularte en **ADV-301 (Advanced Calculus)** porque no cumples con el
> prerrequisito necesario: **CALC-101**.
>
> Para poder matricularte en ADV-301, primero debes completar o matricularte en **CALC-101**.
> ¿Deseas que intente matricularte primero en CALC-101?

> *Translation: "It was not possible to enrol you in **ADV-301 (Advanced Calculus)** because you
> do not meet the necessary prerequisite: **CALC-101**. To be able to enrol in ADV-301, you must
> first complete or enrol in **CALC-101**. Would you like me to try enrolling you in CALC-101
> first?"*

Three things happened there that were not asked for:

1. It **explained the rule**, not the error.
2. It **proposed the remedy** — which came from the `To unblock it:` clause in the refusal, not
   from any instruction.
3. It **asked before acting.** Nothing told it to. A refusal that carries a way forward seems to
   invite consent rather than autonomy, and that is the behaviour this project wants.

It also answered in Spanish a refusal written in English, unprompted.

## What this settles

| | |
|---|---|
| An agent can discover tools this page registers | **yes** — the Inspector reads both, with schemas |
| An agent will choose the right tool unprompted | **yes** — from the description alone |
| A refusal is a normal result, not an exception | **yes** — a string, handled like any other |
| A refusal can be written so the agent repairs the situation | **yes**, and this is the finding |

## The shape of a refusal that works

Four parts, and dropping any of them costs something:

```
Refused.  ADV-301 (Advanced Calculus) requires CALC-101, which is not completed and not in
          the plan.                                       ← what and why, in the domain's words
          To unblock it: enrol CALC-101 first.             ← the remedy, which is what the model acts on
          Rule: PREREQ_NOT_MET.                            ← a handle a human can search for
          The plan was not changed.                        ← the state, so the agent need not guess
```

`execute` returns a string the model reads, so this is not decoration: it is the whole interface.

## Still not tested

**ChatGPT's own in-app browser.** The submission asks for a URL reachable from *"ChatGPT's in-app
browser or Google Chrome with WebMCP enabled"*, and this was the second of those. Asking
`chatgpt.com` in an ordinary tab does not work and cannot: a web page has no access to another
tab's model context, and ChatGPT says so plainly when asked.

## Cost

Two round trips, 976 tokens in total, on `gemini-3.6-flash`.

---

## One more API detail

The client namespaces tool names. Ours arrived at the model as **`_0_enrol`** and **`_0_ping`**,
prefixed by the Inspector. A page should not assume the name it registers is the name the model
sees.

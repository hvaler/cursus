// @ts-check
/**
 * Does a real model use these tools well?
 *
 * The tool descriptions and the strings the tools return are the entire interface between this
 * page and any agent. They cannot be checked by unit tests: a description can be grammatical,
 * accurate and still leave a model unable to tell two tools apart. The only way to know is to put
 * a model in front of them.
 *
 * So this runs the same eight tools — imported, not reimplemented — through Gemini's function
 * calling, and asserts on what the model *did*, not on what it said.
 *
 *   GEMINI_API_KEY=… node tools/eval.mjs
 *   gcloud secrets versions access latest --secret=gemini-api-key --project atelier-hack \
 *     | GEMINI_API_KEY=$(cat) node tools/eval.mjs
 */

import { TOOLS, callFromPage } from '../app/tools.js';
import { log, trace } from '../app/store.js';

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.EVAL_MODEL ?? 'gemini-3.6-flash';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

if (!KEY) {
  console.error('GEMINI_API_KEY is not set. Nothing was evaluated — which is not the same as passing.');
  process.exit(2);
}

const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The free tier's limit is per minute, and a multi-turn conversation spends it in seconds.
 * A 429 here is not a failing scenario — reporting it as one would be a lie about the tools.
 * @param {() => Promise<Response>} fn
 */
async function withRetry(fn, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const res = await fn();
    if (res.status !== 429) return res;
    const wait = 4000 * (i + 1);
    process.stdout.write(`(rate-limited, waiting ${wait / 1000}s) `);
    await sleep(wait);
  }
  return fn();
}

const declarations = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  parametersJsonSchema: t.inputSchema,
}));

/**
 * One conversation, with the model free to call tools until it stops.
 * @param {string} prompt
 * @param {number} [maxTurns]
 */
async function converse(prompt, maxTurns = 8) {
  /** @type {any[]} */
  const contents = [{ role: 'user', parts: [{ text: prompt }] }];
  /** @type {{ tool: string, args: any }[]} */
  const called = [];
  let text = '';

  for (let turn = 0; turn < maxTurns; turn++) {
    const res = await withRetry(() => fetch(URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        contents,
        tools: [{ functionDeclarations: declarations }],
        systemInstruction: {
          parts: [{
            text: 'You are helping a student plan their degree on the page they are looking at. ' +
                  'Use the page tools rather than guessing. If a tool refuses, read the refusal ' +
                  'and act on it.',
          }],
        },
      }),
    }));
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
    const body = await res.json();
    const parts = body?.candidates?.[0]?.content?.parts ?? [];
    contents.push({ role: 'model', parts });

    const calls = parts.filter((/** @type {any} */ p) => p.functionCall).map((/** @type {any} */ p) => p.functionCall);
    if (calls.length === 0) {
      text = parts.map((/** @type {any} */ p) => p.text ?? '').join('').trim();
      break;
    }

    /** @type {any[]} */
    const responses = [];
    for (const c of calls) {
      called.push({ tool: c.name, args: c.args ?? {} });
      let result;
      try {
        result = String(await callFromPage(c.name, c.args ?? {}));
      } catch (err) {
        result = `The page could not run that: ${String(err)}`;
      }
      responses.push({ functionResponse: { name: c.name, response: { result } } });
    }
    contents.push({ role: 'user', parts: responses });
  }
  return { called, text };
}

/** @type {{name: string, setup?: [string, number][], prompt: string, expect: (r: {called: {tool:string,args:any}[], text: string}) => string|null}[]} */
const SCENARIOS = [
  {
    name: 'a refusal is repaired, not reported',
    prompt: 'Enrol me in ADV-301.',
    expect: ({ called, text }) => {
      if (!called.some((c) => c.tool === 'add_course' && String(c.args.course).toUpperCase() === 'ADV-301'))
        return 'never tried add_course for ADV-301';
      const mentions = /CALC-102|NUM-201/i.test(text);
      if (!mentions) return `did not name the missing prerequisite. Said: ${text.slice(0, 160)}`;
      return null;
    },
  },
  {
    name: 'the cost of a choice is looked up, not guessed',
    setup: [
      ['CALC-101', 1], ['ALG-101', 1], ['PROG-101', 1], ['DISC-101', 1], ['PHYS-101', 1],
      ['CALC-102', 2], ['PROG-102', 2], ['STAT-101', 2], ['LOGIC-101', 2], ['CIRC-101', 2],
      ['DS-201', 3], ['ARCH-201', 3], ['AUTO-201', 3], ['STAT-201', 3],
    ],
    prompt: 'I have one slot left in term 3. If I take NUM-201 there, what am I giving up?',
    expect: ({ called, text }) => {
      if (!called.some((c) => c.tool === 'what_this_closes')) return 'did not call what_this_closes';
      if (!/graphic/i.test(text)) return `did not name the track it closes. Said: ${text.slice(0, 160)}`;
      return null;
    },
  },
  {
    name: 'a chain is explained from the tool, not from memory',
    prompt: 'What do I need before I can take MLOPS-401? Be specific about how much.',
    expect: ({ called, text }) => {
      if (!called.some((c) => c.tool === 'explain_requirement')) return 'did not call explain_requirement';
      if (!/\d+\s*credits/i.test(text)) return `did not quote the cost. Said: ${text.slice(0, 160)}`;
      return null;
    },
  },
  {
    name: 'undo is found through the record rather than invented',
    setup: [['CALC-101', 1], ['ALG-101', 1], ['PROG-101', 1]],
    prompt: 'Actually, undo the last two things you did to my plan.',
    expect: ({ called }) => {
      if (!called.some((c) => c.tool === 'undo_to')) return 'did not call undo_to';
      return null;
    },
  },
  {
    name: 'it does not invent a course that is not in the catalogue',
    prompt: 'Enrol me in QUANTUM-999, the quantum computing course.',
    expect: ({ text }) => {
      if (/enrolled|added/i.test(text) && !/not|no course|does not/i.test(text))
        return `claimed to enrol a course that does not exist. Said: ${text.slice(0, 160)}`;
      return null;
    },
  },
];

let failures = 0;
console.log(`Evaluating ${TOOLS.length} tools against ${MODEL}\n`);

for (const sc of SCENARIOS) {
  log.rewindTo(0);
  trace.length = 0;
  for (const [course, term] of sc.setup ?? []) callFromPage('add_course', { course, term });

  await sleep(3000);              // the next conversation starts a fresh minute's worth
  process.stdout.write(`  ${sc.name} … `);
  try {
    const r = await converse(sc.prompt);
    const problem = sc.expect(r);
    if (problem) {
      failures++;
      console.log('FAILED');
      console.log(`      ${problem}`);
      console.log(`      tools called: ${r.called.map((c) => c.tool).join(' → ') || '(none)'}`);
    } else {
      console.log(`ok  (${r.called.map((c) => c.tool).join(' → ') || 'no tools'})`);
    }
  } catch (err) {
    failures++;
    console.log(`ERROR ${String(err).slice(0, 160)}`);
  }
}

console.log(`\n${SCENARIOS.length - failures}/${SCENARIOS.length} scenarios passed`);
process.exit(failures ? 1 : 0);

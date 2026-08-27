// @ts-check
/**
 * The documents, checked against the code they describe.
 *
 * A review on 2026-08-27 read every `file:line` reference in the documentation against the source
 * and found seven claims that had drifted: a line number pointing at a `push` where a getter was
 * promised, "six rules on adding, two on removing" where the code had seven and three, "the eight
 * tools" where there were ten, "all six findings" where there were nine.
 *
 * None of them was a lie when it was written. All of them were lies by the time anyone read them,
 * and this repository asks to be checked rather than believed — which only means anything if the
 * checking is cheap enough to happen every time.
 *
 * So the class of error is closed here instead of by being careful. `npm test` now fails if a
 * document says something about the code that the code does not say back.
 *
 * Each test below gathers **every** problem it finds and reports them together. Fixing stale
 * documentation one failure per run is how people stop running the check.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOOLS } from '../app/tools.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (/** @type {string} */ p) => readFileSync(join(ROOT, p), 'utf8');
const mdIn = (/** @type {string} */ dir) =>
  readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.md')).map((f) => `${dir}/${f}`);

/** Every markdown file in the repository, as [path, text]. */
const DOCS = ['README.md', ...mdIn('docs'), ...mdIn('demo')]
  .map((p) => /** @type {[string, string]} */ ([p, read(p)]));

const WORD = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14 };

/**
 * Lines that state a tool count **as history** — what was on the screen on 2026-08-27, when there
 * were ten. Changing them to match today's count would falsify a record of what was observed;
 * leaving them unexempted would fail this test forever.
 *
 * Each entry is an exact substring, so editing one of those lines stops its exemption matching and
 * the test fails. That is the right outcome: an edited record deserves a second look.
 */
const HISTORICAL = [
  'A page reading **"WebMCP available — 10 tools registered"** has established that the API exists',
  'All four of these ran with the page open in the in-app browser, its ten tools registered, and the',
  'registered all ten tools in that browser, so late attachment was never what stood in the way. The',
  '**"WebMCP available - 10 tools registered"** all describe one thing: the API exists in this',
  "Found on 2026-08-27 in ChatGPT desktop's in-app browser, which registered all ten tools and then",
  '**"10 tools registered"**, a fact about the page, and counts calls separately, a fact about what',
];

/**
 * Tests counted rather than run: every test in this repository is written as `  test(` at one level
 * of indentation inside a `describe`, and on 2026-08-27 that agreed with the runner's own count for
 * every suite including this one. Which is the reason the tests below gather their problems into a
 * list instead of generating a test per document: a file that builds assertions in a loop cannot be
 * counted by reading it, and this file has to be countable by its own rule.
 */
const SUITES = Object.fromEntries(
  readdirSync(join(ROOT, 'test'))
    .filter((f) => f.endsWith('.test.js'))
    .map((f) => [f, (read(`test/${f}`).match(/^ {2}test\(/gm) ?? []).length]));

const TOTAL = Object.values(SUITES).reduce((a, b) => a + b, 0);

/** @param {string[]} problems @param {string} what */
const report = (problems, what) =>
  assert.equal(problems.length, 0, `${problems.length} ${what}:\n  ${problems.join('\n  ')}`);

describe('the documents against the code', () => {
  test('every file:line reference resolves to a line that exists', () => {
    /** @type {string[]} */
    const problems = [];
    for (const [path, text] of DOCS) {
      for (const [, file, lineNo] of text.matchAll(/`?(app\/[a-z]+\.js):(\d+)`?/g)) {
        if (!existsSync(join(ROOT, file))) {
          problems.push(`${path} points at ${file}, which does not exist`);
          continue;
        }
        const lines = read(file).split('\n');
        const n = Number(lineNo);
        if (n < 1 || n > lines.length) {
          problems.push(`${path} points at ${file}:${n}, but that file has ${lines.length} lines`);
        } else if (lines[n - 1].trim() === '') {
          problems.push(`${path} points at ${file}:${n}, which is blank — the code moved`);
        }
      }
    }
    report(problems, 'stale code reference(s)');
  });

  test('every tool count matches what the code registers', () => {
    assert.equal(new Set(TOOLS.map((t) => t.name)).size, TOOLS.length, 'tool names must be unique');

    /** @type {string[]} */
    const problems = [];
    for (const [path, text] of DOCS) {
      for (const [i, line] of text.split('\n').entries()) {
        if (HISTORICAL.some((h) => line.includes(h))) continue;
        for (const m of line.matchAll(/\b(\d{1,2}|ten|eleven|twelve|thirteen|fourteen) tools\b/gi)) {
          const word = m[1].toLowerCase();
          const claimed = WORD[/** @type {keyof typeof WORD} */ (word)] ?? Number(word);
          if (claimed !== TOOLS.length) {
            problems.push(`${path}:${i + 1} says "${m[0]}"; the code registers ${TOOLS.length}`);
          }
        }
      }
    }
    report(problems, 'wrong tool count(s)');
  });

  test('every per-suite test count matches the suite', () => {
    /** @type {string[]} */
    const problems = [];
    const claim = /`test\/([a-z]+\.test\.js)`(?:[^\n|]*?\((\d+) tests?\)|\s*\|\s*(\d+)\s*\|)/g;
    for (const [path, text] of DOCS) {
      for (const m of text.matchAll(claim)) {
        const file = m[1];
        const claimed = Number(m[2] ?? m[3]);
        if (!(file in SUITES)) problems.push(`${path} names ${file}, which is not a suite`);
        else if (claimed !== SUITES[file]) {
          problems.push(`${path} says ${file} has ${claimed}; it has ${SUITES[file]}`);
        }
      }
    }
    report(problems, 'wrong suite count(s)');
  });

  test('every stated total matches the sum of the suites', () => {
    /** @type {string[]} */
    const problems = [];
    for (const [path, text] of DOCS) {
      for (const [i, line] of text.split('\n').entries()) {
        for (const m of line.matchAll(/\*{0,2}(\d{2,4})\*{0,2},? (?:tests|passing)\b/gi)) {
          // "(16 tests)" is a per-suite claim, checked above. A total is never parenthesised.
          if (/\((?:\*\*)?$/.test(line.slice(Math.max(0, m.index - 3), m.index))) continue;
          if (Number(m[1]) !== TOTAL) {
            problems.push(`${path}:${i + 1} says ${m[1]} tests; the suites hold ${TOTAL}`);
          }
        }
      }
    }
    report(problems, 'wrong total(s)');
  });
});

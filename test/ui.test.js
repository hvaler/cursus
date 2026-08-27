// @ts-check
/**
 * The screen, which was the last module in `app/` with no test of its own.
 *
 * Most of what a renderer does is not worth pinning: markup changes, and a test that asserts on
 * class names is a test that fails for good reasons. Two things here are worth pinning, and both
 * are about the same fact — **the strings on this screen come from an agent, and an agent can be
 * steered by whoever is talking to it.**
 *
 *   - `esc()` is the only thing between a tool argument and `innerHTML`.
 *   - the trace renders tool names, arguments and results, all three of which are caller-shaped.
 *
 * The rest is checked lightly: that the plan reflects the log, and that a protection is visible,
 * because a limit nobody can see is a limit nobody trusts.
 *
 * Run in Node against a fake `document`, the same way `registration.test.js` does — this tests the
 * rendering, not a browser.
 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { esc, renderAll } from '../app/ui.js';
import { log, trace, record, asPage } from '../app/store.js';
import { callTool } from '../app/tools.js';

/** @type {any} */
const g = globalThis;

/** Every id `ui.js` reaches for, as an object that remembers what was written to it. */
const IDS = ['plan', 'totals', 'tracks', 'trace', 'trace-count', 'timeline', 'catalogue'];

/** @type {Record<string, any>} */
let el = {};

beforeEach(() => {
  el = Object.fromEntries(IDS.map((id) => [id, {
    innerHTML: '', textContent: '', scrollTop: 0, scrollHeight: 0,
    // renderCatalogue wires click handlers onto what it just painted. Returning nothing is right:
    // what is under test is the markup, not the clicking.
    querySelectorAll: () => [],
  }]));
  g.document = { getElementById: (/** @type {string} */ id) => el[id] ?? null };
  log.rewindTo(0);
  trace.length = 0;
});

afterEach(() => { delete g.document; });

describe('esc, which is the whole defence', () => {
  test('every character that could break out is escaped', () => {
    assert.equal(esc('<>&"\''), '&lt;&gt;&amp;&quot;&#39;');
  });

  test('a script tag cannot survive it', () => {
    const out = esc('<script>alert(1)</script>');
    assert.doesNotMatch(out, /<script/);
    assert.match(out, /&lt;script&gt;/);
  });

  test('quotes are escaped too, because some of this lands inside an attribute', () => {
    // `title="${esc(...)}"` in renderPlan. Escaping angle brackets alone would leave the
    // attribute breakable, which is the classic half-fix.
    const out = esc('" onerror="alert(1)');
    assert.doesNotMatch(out, /"/, 'an unescaped quote closes the attribute');
    assert.match(out, /&quot;/);
  });

  test('it does not throw on things that are not strings', () => {
    for (const v of [null, undefined, 42, { a: 1 }, ['x']]) {
      assert.equal(typeof esc(v), 'string', `on ${JSON.stringify(v) ?? String(v)}`);
    }
  });
});

describe('the trace, where caller input reaches the screen', () => {
  test('a hostile tool name, argument and result are all escaped', () => {
    // record() takes all three from the call path, and add_course quotes its input into the
    // refusal — so a hostile code reaches innerHTML through two of these three.
    record('<img src=x onerror="alert(1)">', { course: '"><script>bad()</script>' },
      'result with <b>markup</b> and "quotes"', true);
    renderAll();

    const html = el.trace.innerHTML;
    assert.doesNotMatch(html, /<img/, 'the tool name reached the page as markup');
    assert.doesNotMatch(html, /<script/, 'the argument reached the page as markup');
    assert.doesNotMatch(html, /<b>markup<\/b>/, 'the result reached the page as markup');
    assert.match(html, /&lt;script&gt;/, 'and it is still legible as text');
  });

  test('the real path escapes too, not just a hand-built record', () => {
    callTool('add_course', { course: '<script>alert(1)</script>' });
    renderAll();
    assert.doesNotMatch(el.trace.innerHTML, /<script/);
  });

  test('the counter says what the page cannot verify', () => {
    callTool('add_course', { course: 'CALC-101', term: 1 });
    renderAll();
    assert.match(el['trace-count'].innerHTML, /1 call\(s\)/);
    assert.match(el['trace-count'].innerHTML, /cannot verify/,
      'the caveat is the point of the counter, not decoration on it');
  });

  test('a call the page made itself is labelled page, and one it did not is not', async () => {
    // The attribution comes from `asPage`, not from `callTool` — which is the whole of what a page
    // can honestly claim: it knows the calls it wrapped itself, and assumes the rest.
    await asPage(() => callTool('add_course', { course: 'CALC-101', term: 1 }));
    renderAll();
    assert.match(el.trace.innerHTML, />page</);
    assert.doesNotMatch(el.trace.innerHTML, />AGENT</);

    callTool('add_course', { course: 'ALG-101', term: 1 });
    renderAll();
    assert.match(el.trace.innerHTML, />AGENT</, 'anything unwrapped is assumed to be an agent');
  });

  test('an empty trace says so rather than rendering nothing', () => {
    renderAll();
    assert.match(el.trace.innerHTML, /No tool has been called yet/);
    assert.equal(el['trace-count'].innerHTML, '');
  });
});

describe('the screen renders from the log, not from a copy of it', () => {
  test('the plan reflects what the tools appended', () => {
    callTool('add_course', { course: 'CALC-101', term: 1 });
    callTool('add_course', { course: 'ALG-101', term: 1 });
    renderAll();

    assert.match(el.plan.innerHTML, /CALC-101/);
    assert.match(el.plan.innerHTML, /ALG-101/);
    assert.match(el.plan.innerHTML, /12\/30 cr/, 'two six-credit courses in term 1');
    assert.match(el.totals.textContent, /2 course\(s\) · 12 credits/);
  });

  test('rewinding the log rewinds the screen, because they are the same thing', () => {
    callTool('add_course', { course: 'CALC-101', term: 1 });
    renderAll();
    assert.match(el.plan.innerHTML, /CALC-101/);

    log.rewindTo(0);
    renderAll();
    assert.doesNotMatch(el.plan.innerHTML, /CALC-101/, 'the screen held state of its own');
    assert.match(el.totals.textContent, /0 course\(s\)/);
  });

  test('a protection is visible, and says what it does', () => {
    callTool('protect_track', { track: 'graphics' });
    renderAll();
    assert.match(el.tracks.innerHTML, /🔒/);
    assert.match(el.tracks.innerHTML, /the agent cannot close this/);
  });

  test('the timeline reads a protection as a person would', () => {
    callTool('protect_track', { track: 'graphics' });
    renderAll();
    assert.match(el.timeline.innerHTML, /protected graphics/);
    assert.doesNotMatch(el.timeline.innerHTML, /ConstraintSet/,
      'the event type name is not something to show a reader');
  });
});

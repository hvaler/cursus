// @ts-check
/**
 * These strings are the product. A model reads them and decides what to do next, so a test that
 * only checks "it did not throw" would be testing the wrong half.
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { callFromPage } from '../app/tools.js';
import { log, trace } from '../app/store.js';

const call = (/** @type {string} */ name, /** @type {any} */ args) =>
  String(callFromPage(name, args));

beforeEach(() => {
  log.rewindTo(0);
  trace.length = 0;
});

describe('a mutation reports the state it produced', () => {
  test('adding says what the plan now holds, not "ok"', () => {
    const out = call('add_course', { course: 'CALC-101', term: 1 });
    assert.match(out, /Added CALC-101 to term 1/);
    assert.match(out, /The plan now holds 1 course\(s\), 6 credits/);
    assert.doesNotMatch(out, /^ok$/i);
  });

  test('removing says what is left', () => {
    call('add_course', { course: 'CALC-101', term: 1 });
    const out = call('remove_course', { course: 'CALC-101' });
    assert.match(out, /Removed CALC-101/);
    assert.match(out, /The plan is empty/);
  });

  test('a lowercase code is accepted; the student is not a parser', () => {
    assert.match(call('add_course', { course: 'calc-101' }), /Added CALC-101/);
  });

  test('the term defaults to the one the course actually runs in', () => {
    assert.match(call('add_course', { course: 'CALC-101' }), /to term 1/);
  });
});

describe('a refusal carries everything the model needs to repair it', () => {
  test('a missing prerequisite names the remedy', () => {
    const out = call('add_course', { course: 'ADV-301', term: 5 });
    assert.match(out, /^Refused\./);
    assert.match(out, /requires CALC-102 \(Calculus II\) and NUM-201 \(Numerical Methods\)/,
      'names, not just codes — the student does not memorise codes');
    assert.match(out, /To unblock it: place CALC-102 and NUM-201 in a term before 5\./);
    assert.match(out, /Rule: PREREQ_NOT_MET\./);
    assert.match(out, /The plan was not changed\.$/);
  });

  test('a refusal really does not change the plan', () => {
    call('add_course', { course: 'ADV-301', term: 5 });
    assert.match(call('plan_status', {}), /The plan is empty/);
  });

  test('removing something depended upon names what blocks it', () => {
    call('add_course', { course: 'PROG-101', term: 1 });
    call('add_course', { course: 'DISC-101', term: 1 });
    call('add_course', { course: 'PROG-102', term: 2 });
    call('add_course', { course: 'DS-201', term: 3 });
    const out = call('remove_course', { course: 'PROG-102' });
    assert.match(out, /DS-201 \(Data Structures\) depends on PROG-102/);
    assert.match(out, /To unblock it: remove DS-201 first/);
  });

  test('an unknown step for undo is refused in the same shape', () => {
    const out = call('undo_to', { step: 99 });
    assert.match(out, /^Refused\./);
    assert.match(out, /To unblock it: call list_actions/);
    assert.match(out, /Rule: NO_SUCH_STEP\./);
  });
});

describe('the record, and rewinding it', () => {
  test('actions are numbered so undo_to has something to accept', () => {
    call('add_course', { course: 'CALC-101', term: 1 });
    call('add_course', { course: 'ALG-101', term: 1 });
    const out = call('list_actions', {});
    assert.match(out, /step 1: added CALC-101 to term 1/);
    assert.match(out, /step 2: added ALG-101 to term 1/);
    assert.match(out, /step 0 empties the plan/);
  });

  test('an empty plan says so rather than returning an empty list', () => {
    assert.match(call('list_actions', {}), /Nothing has been done to this plan yet/);
  });

  test('undo returns the resulting plan, because the caller is now out of date', () => {
    call('add_course', { course: 'CALC-101', term: 1 });
    call('add_course', { course: 'ALG-101', term: 1 });
    call('add_course', { course: 'PROG-101', term: 1 });

    const out = call('undo_to', { step: 1 });
    assert.match(out, /Rewound to step 1, discarding 2 action\(s\): ALG-101, PROG-101/);
    assert.match(out, /The plan now holds 1 course\(s\), 6 credits/,
      'the state comes back with it, so the agent need not guess');
  });

  test('rewinding to the latest step is honest about doing nothing', () => {
    call('add_course', { course: 'CALC-101', term: 1 });
    assert.match(call('undo_to', { step: 1 }), /Nothing to undo/);
  });

  test('rewinding to zero empties the plan', () => {
    call('add_course', { course: 'CALC-101', term: 1 });
    assert.match(call('undo_to', { step: 0 }), /The plan is empty/);
  });
});

describe('the question the screen cannot answer', () => {
  test('it names the track it would close, and says it is not reversible', () => {
    for (const [c, t] of /** @type {[string, number][]} */ ([
      ['CALC-101', 1], ['ALG-101', 1], ['PROG-101', 1], ['DISC-101', 1], ['PHYS-101', 1],
      ['CALC-102', 2], ['PROG-102', 2], ['STAT-101', 2], ['LOGIC-101', 2], ['CIRC-101', 2],
      ['DS-201', 3], ['ARCH-201', 3], ['AUTO-201', 3], ['STAT-201', 3],
    ])) call('add_course', { course: c, term: t });

    const out = call('what_this_closes', { course: 'NUM-201', term: 3 });
    assert.match(out, /would CLOSE "Graphics and Animation"/);
    assert.match(out, /not reversible once the term is full/);
  });

  test('a harmless choice says so plainly instead of hedging', () => {
    assert.match(call('what_this_closes', { course: 'CALC-101', term: 1 }), /closes no track/);
  });

  test('an unknown code does not pretend the answer is "nothing"', () => {
    assert.match(call('what_this_closes', { course: 'NOPE-999' }),
      /No course in the catalogue has the code "NOPE-999"/);
  });
});

describe('explaining a requirement', () => {
  test('it reports the depth and the credits behind it', () => {
    const out = call('explain_requirement', { course: 'MLOPS-401' });
    const depth = Number(out.match(/chain (\d+) deep/)?.[1]);
    assert.ok(depth >= 4, `chain depth was ${depth}; the graph should be deeper than that`);
    // The number that actually changes a decision: what the whole chain costs.
    const credits = Number(out.match(/That is (\d+) credits of prerequisites/)?.[1]);
    assert.ok(credits >= 60, `only ${credits} credits of prerequisites`);
    assert.match(out, /in the order they must be taken/);
  });

  test('once the chain is held, it says so', () => {
    call('add_course', { course: 'CALC-101', term: 1 });
    assert.match(call('explain_requirement', { course: 'CALC-102' }),
      /has everything it needs/);
  });
});

describe('search', () => {
  test('nothing found is a sentence, not an empty list', () => {
    assert.match(call('search_courses', { text: 'underwater basket weaving' }),
      /No course matches that/);
  });

  test('results carry credits, term and prerequisites', () => {
    const out = call('search_courses', { area: 'graphics' });
    assert.match(out, /GEOM-201 — Geometry for Graphics, 6 credits, term 3/);
    assert.match(out, /requires/);
  });
});

describe('every call is recorded', () => {
  test('the trace grows with each tool call, refusals included', () => {
    call('add_course', { course: 'CALC-101', term: 1 });
    call('add_course', { course: 'ADV-301', term: 5 });
    assert.equal(trace.length, 2);
    assert.equal(trace[0].refused, false);
    assert.equal(trace[1].refused, true);
  });
});

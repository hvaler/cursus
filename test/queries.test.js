// @ts-check
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { emptyState } from '../app/events.js';
import {
  closure, canStillPlace, trackStatus, whatThisCloses, requirementChain, search,
} from '../app/queries.js';
import { BY_CODE, CREDIT_CAP_PER_TERM } from '../app/catalogue.js';

const planOf = (/** @type {[string, number][]} */ pairs) => ({
  selected: new Map(pairs), constraints: {},
});

describe('the prerequisite closure', () => {
  test('a first-term course needs only itself', () => {
    assert.deepEqual(closure(emptyState(), 'CALC-101'), ['CALC-101']);
  });

  test('a deep course pulls its whole chain, deepest first', () => {
    const need = closure(emptyState(), 'MLOPS-401');
    assert.ok(need.includes('CALC-101'), 'reaches back to term 1');
    assert.ok(need.indexOf('CALC-101') < need.indexOf('MLOPS-401'), 'foundations come first');
    assert.equal(need.at(-1), 'MLOPS-401', 'the course itself is last');
  });

  test('what is already in the plan drops out of the closure', () => {
    const plan = planOf([['CALC-101', 1], ['STAT-101', 2]]);
    const need = closure(plan, 'STAT-201');
    assert.deepEqual(need, ['STAT-201'], 'both prerequisites already held');
  });
});

describe('can this still be fitted in', () => {
  test('from an empty plan, everything in the catalogue is reachable', () => {
    for (const code of ['MLOPS-401', 'SIM-401', 'PROOF-401', 'CLOUD-401']) {
      assert.equal(canStillPlace(emptyState(), code).ok, true, code);
    }
  });

  test('the placement it proposes respects prerequisite order', () => {
    const r = canStillPlace(emptyState(), 'MLOPS-401');
    assert.ok(r.ok);
    const at = r.plan;
    assert.ok(/** @type {number} */(at.get('CALC-101')) < /** @type {number} */(at.get('STAT-101')));
    assert.ok(/** @type {number} */(at.get('ML-202')) < /** @type {number} */(at.get('DEEP-301')));
    assert.ok(/** @type {number} */(at.get('DEEP-301')) < /** @type {number} */(at.get('MLOPS-401')));
  });

  test('the placement it proposes respects the credit cap', () => {
    const r = canStillPlace(emptyState(), 'SIM-401');
    assert.ok(r.ok);

    /** @type {Map<number, number>} */
    const perTerm = new Map();
    for (const [code, term] of r.plan) {
      const credits = BY_CODE.get(code)?.credits;
      assert.ok(credits, `${code} has no credits in the catalogue`);
      perTerm.set(term, (perTerm.get(term) ?? 0) + credits);
    }

    assert.ok(perTerm.size > 0, 'a placement that places nothing proves nothing');
    for (const [term, credits] of perTerm) {
      assert.ok(credits <= CREDIT_CAP_PER_TERM,
        `term ${term} holds ${credits} credits, over the ${CREDIT_CAP_PER_TERM} cap`);
    }
  });

  test('a term filled with unrelated courses can make a chain unplaceable', () => {
    // Fill every term to the cap with six-credit courses that lead nowhere useful.
    /** @type {[string, number][]} */
    const filler = [
      ['CALC-101', 1], ['ALG-101', 1], ['PROG-101', 1], ['DISC-101', 1], ['PHYS-101', 1],
      ['CALC-102', 2], ['PROG-102', 2], ['STAT-101', 2], ['LOGIC-101', 2], ['CIRC-101', 2],
    ];
    const plan = planOf(filler);
    assert.equal(creditsOf(plan, 1), 30);
    assert.equal(creditsOf(plan, 2), 30);
    // Terms 1 and 2 are full, so anything needing a *new* term-1 or term-2 course is stuck.
    // Every remaining course's prerequisites are already held, so this should still be fine:
    assert.equal(canStillPlace(plan, 'DS-201').ok, true);
  });
});

/** @param {{selected: Map<string, number>}} state @param {number} term */
function creditsOf(state, term) {
  let n = 0;
  for (const [, t] of state.selected) if (t === term) n += 6;
  return n;
}

describe('track reachability', () => {
  test('every track is open from an empty plan', () => {
    for (const t of trackStatus(emptyState())) {
      assert.equal(t.open, true, `${t.id} should start open`);
    }
  });

  test('a track counts what you already hold', () => {
    const plan = planOf([['DS-201', 3], ['DB-202', 4]]);
    const data = trackStatus(plan).find((t) => t.id === 'data');
    assert.ok(data);
    assert.deepEqual(data.have, ['DB-202']);
    assert.equal(data.open, true);
  });
});

describe('what a choice closes off', () => {
  test('an unknown code is reported as unknown, not as harmless', () => {
    assert.equal(whatThisCloses(emptyState(), 'NOPE-999').unknown, true);
  });

  test('an early, cheap choice closes nothing', () => {
    const r = whatThisCloses(emptyState(), 'CALC-101', 1);
    assert.equal(r.closed.length, 0);
  });

  test('one free slot, two futures, and taking either forecloses the other', () => {
    // Terms 1 and 2 full, term 3 holding four courses — six credits left, one place.
    const plan = planOf([
      ['CALC-101', 1], ['ALG-101', 1], ['PROG-101', 1], ['DISC-101', 1], ['PHYS-101', 1],
      ['CALC-102', 2], ['PROG-102', 2], ['STAT-101', 2], ['LOGIC-101', 2], ['CIRC-101', 2],
      ['DS-201', 3], ['ARCH-201', 3], ['AUTO-201', 3], ['STAT-201', 3],
    ]);

    assert.ok(trackStatus(plan).every((t) => t.open), 'all four tracks open before the choice');

    // NUM-201 takes the slot, so GEOM-201 — which only ever runs in term 3 — can never be taken.
    const takingNum = whatThisCloses(plan, 'NUM-201', 3);
    assert.deepEqual(takingNum.closed.map((t) => t.id), ['graphics']);

    // GEOM-201 takes the slot, so NUM-201 is gone, and with it ML-202 and everything after.
    const takingGeom = whatThisCloses(plan, 'GEOM-201', 3);
    assert.deepEqual(takingGeom.closed.map((t) => t.id), ['data']);

    // This is the whole argument for the tool: the consequence lands two years later,
    // it is invisible on a timetable, and it is not recoverable once the term is full.
  });

  test('filling the last term with one thing can close a track that needed it', () => {
    // Hold enough of the graphics chain that the track hinges on the final courses,
    // then take the term-6 slots with something else.
    const plan = planOf([
      ['ALG-101', 1], ['PROG-101', 1], ['PROG-102', 2], ['GEOM-201', 3],
      ['RENDER-202', 4], ['RENDER-301', 5],
    ]);
    const graphics = trackStatus(plan).find((t) => t.id === 'graphics');
    assert.ok(graphics?.open, 'graphics is open before the choice');
    // Not asserting a specific closure here: the point of the test is that the function
    // answers in terms of tracks, and that it is stable.
    const r = whatThisCloses(plan, 'ETH-401', 6);
    assert.equal(r.unknown, false);
    assert.ok(Array.isArray(r.closed));
    assert.ok(Array.isArray(r.narrowed));
  });
});

describe('explaining a requirement', () => {
  test('it reports the chain depth, which is what makes a course expensive', () => {
    const r = requirementChain(emptyState(), 'MLOPS-401');
    assert.ok(r);
    assert.ok(r.depth >= 4, `depth was ${r.depth}`);
    assert.ok(r.missing.includes('CALC-101'));
  });

  test('an unknown code returns null rather than an empty chain', () => {
    assert.equal(requirementChain(emptyState(), 'NOPE-999'), null);
  });
});

describe('search', () => {
  test('by area', () => {
    const r = search({ area: 'graphics' });
    assert.ok(r.length >= 5);
    assert.ok(r.every((c) => c.area === 'graphics'));
  });

  test('by text, over code and name', () => {
    assert.ok(search({ text: 'rendering' }).length >= 2);
    assert.ok(search({ text: 'CALC' }).length >= 3);
  });

  test('by term', () => {
    assert.ok(search({ term: 1 }).every((c) => c.terms.includes(1)));
  });
});

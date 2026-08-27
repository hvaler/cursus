// @ts-check
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { emptyState } from '../app/events.js';
import { place, planForTrack, explainInfeasible } from '../app/solve.js';
import { whyNotAdd, creditsIn } from '../app/rules.js';
import { CREDIT_CAP_PER_TERM } from '../app/catalogue.js';

const planOf = (/** @type {[string, number][]} */ p) => ({ selected: new Map(p), constraints: {} });

/** The plan filled with systems and theory, leaving one slot in term 3. */
const CROWDED = /** @type {[string, number][]} */ ([
  ['CALC-101', 1], ['ALG-101', 1], ['PROG-101', 1], ['DISC-101', 1], ['PHYS-101', 1],
  ['CALC-102', 2], ['PROG-102', 2], ['STAT-101', 2], ['LOGIC-101', 2], ['CIRC-101', 2],
  ['DS-201', 3], ['ARCH-201', 3], ['AUTO-201', 3], ['STAT-201', 3], ['NUM-201', 3],
]);

describe('placing a course and its chain', () => {
  test('from empty, a deep course brings its whole chain with it', () => {
    const r = place(emptyState(), 'MLOPS-401');
    assert.ok(r.ok);
    assert.ok(r.added.length > 10, `only placed ${r.added.length}`);
    assert.equal(r.added.at(-1)?.[0], 'MLOPS-401');
  });

  test('nothing it proposes would be rejected by the rules it is built on', () => {
    const r = place(emptyState(), 'SIM-401');
    assert.ok(r.ok);
    // Replay the proposal through the real validator, one course at a time.
    const s = emptyState();
    for (const [code, term] of r.added) {
      const no = whyNotAdd(s, code, term);
      assert.equal(no, null, `${code} at term ${term}: ${no?.text}`);
      s.selected.set(code, term);
    }
    for (let t = 1; t <= 6; t++) {
      assert.ok(creditsIn(s, t) <= CREDIT_CAP_PER_TERM, `term ${t} over the cap`);
    }
  });

  test('when it cannot place something, it names what stopped it', () => {
    const r = place(planOf(CROWDED), 'RENDER-301');
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.stuck, 'names the course it got stuck on');
      assert.match(r.why, /Rule: [A-Z_]+/, 'and carries the rule that stopped it');
    }
  });
});

describe('planning towards a track', () => {
  test('from empty, every track can be planned', () => {
    for (const id of ['data', 'systems', 'graphics', 'theory']) {
      const r = planForTrack(emptyState(), id);
      assert.equal(r.ok, true, `${id} should be plannable from nothing`);
      assert.ok(r.added.length > 0);
    }
  });

  test('a track already held needs no additions', () => {
    const r = planForTrack(planOf([['ML-202', 4], ['DB-202', 4], ['DEEP-301', 5]]), 'data');
    assert.equal(r.ok, true);
    assert.equal(r.added.length, 0);
  });

  test('an unknown track is reported, not silently planned', () => {
    assert.equal(planForTrack(emptyState(), 'quidditch').unknownTrack, true);
  });

  test('a crowded plan makes graphics unplannable, and it says so', () => {
    const r = planForTrack(planOf(CROWDED), 'graphics');
    assert.equal(r.ok, false);
    assert.ok(r.blockers.length > 0, 'a failure with no blocker explains nothing');
  });
});

describe('explaining why a goal is out of reach', () => {
  test('a reachable goal has nothing to explain', () => {
    assert.equal(explainInfeasible(emptyState(), 'graphics'), null);
  });

  test('it names the binding constraint and the rule behind it', () => {
    const r = explainInfeasible(planOf(CROWDED), 'graphics');
    assert.ok(r);
    assert.ok(r.blocker, 'there is a course it could not place');
    assert.match(r.blocker.why, /Rule: [A-Z_]+/);
  });

  test('it offers repairs, with the credits each one frees', () => {
    const r = explainInfeasible(planOf(CROWDED), 'graphics');
    assert.ok(r);
    assert.ok(r.repairs.length > 0, 'a blocker with no way out is a dead end, not an explanation');
    for (const rep of r.repairs) {
      assert.ok(rep.frees > 0, `dropping ${rep.drop} frees nothing`);
      assert.ok(rep.term >= 1 && rep.term <= 6);
    }
  });

  test('and it prices each repair, because a fix that closes another track is not free', () => {
    const r = explainInfeasible(planOf(CROWDED), 'graphics');
    assert.ok(r);
    // Not every repair must have a cost — but the field has to be computed, not omitted,
    // or the tool would be offering fixes without saying what they break.
    for (const rep of r.repairs) {
      assert.ok(Array.isArray(rep.closes), `${rep.drop} has no cost computed`);
    }
    const costly = r.repairs.filter((x) => x.closes.length > 0);
    // In this fixture at least one repair should hurt something; if that ever stops being
    // true the fixture has gone soft and the test is no longer testing the interesting case.
    assert.ok(costly.length > 0,
      'no repair costs anything here — the fixture is too easy to be worth explaining');
  });
});

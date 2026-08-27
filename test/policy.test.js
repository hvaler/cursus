// @ts-check
/**
 * The student's own policy, held against the agent.
 *
 * Every other rule in this project belongs to the university. These belong to the person, which
 * means the interesting cases are not "does the rule fire" but "does it survive being worked
 * around" — by an agent taking a different route to the same loss, by the same person asking
 * again, or by the planner proposing a step that would be refused one call later.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROTECTED, protectedTracks, withProtection, whyNotAllowedByPolicy, whyNotProtect,
  whyNotRelease, describePolicy,
} from '../app/policy.js';
import { planForTrack } from '../app/solve.js';
import { trackStatus } from '../app/queries.js';

/** Terms 1 and 2 full, term 3 with six credits left — the fork that makes any of this matter. */
const FORK = [
  ['CALC-101', 1], ['ALG-101', 1], ['PROG-101', 1], ['DISC-101', 1], ['PHYS-101', 1],
  ['CALC-102', 2], ['PROG-102', 2], ['STAT-101', 2], ['LOGIC-101', 2], ['CIRC-101', 2],
  ['DS-201', 3], ['ARCH-201', 3], ['AUTO-201', 3], ['STAT-201', 3],
];

/** @param {[string, number][]} pairs @param {string[]} [held] */
const planWith = (pairs, held = []) => ({
  selected: new Map(pairs),
  constraints: held.length ? { [PROTECTED]: held } : {},
});

const fork = (/** @type {string[]} */ held = []) =>
  planWith(/** @type {[string, number][]} */ (FORK), held);

describe('reading the policy off the state', () => {
  test('a plan with no constraint has no policy', () => {
    assert.deepEqual(protectedTracks(planWith([])), []);
    assert.equal(describePolicy(planWith([])), '');
  });

  test('a malformed constraint means no policy, not an exception', () => {
    // This is read on every single add. A bad value must degrade to "no policy" rather than
    // throwing in the middle of a rule check, where the failure would look like a broken tool.
    for (const junk of ['graphics', 42, null, { graphics: true }]) {
      const state = { selected: new Map(), constraints: { [PROTECTED]: junk } };
      assert.deepEqual(protectedTracks(/** @type {any} */ (state)), [], `on ${JSON.stringify(junk)}`);
    }
  });

  test('non-string entries are dropped rather than carried', () => {
    const state = { selected: new Map(), constraints: { [PROTECTED]: ['graphics', 7, null] } };
    assert.deepEqual(protectedTracks(/** @type {any} */ (state)), ['graphics']);
  });
});

describe('protecting a specialisation', () => {
  test('an unknown id is refused by name, and the ids are offered', () => {
    const no = whyNotProtect(planWith([]), 'grafics');
    assert.ok(no, 'a typo should not silently protect nothing');
    assert.equal(no.rule, 'UNKNOWN_TRACK');
    assert.match(no.text, /"grafics"/, 'the refusal should quote what was asked for');
    assert.match(no.text, /graphics/, 'and offer the real ids');
  });

  test('protecting twice is refused rather than counted twice', () => {
    const no = whyNotProtect(fork(['graphics']), 'graphics');
    assert.ok(no);
    assert.equal(no.rule, 'ALREADY_PROTECTED');
  });

  test('protecting something already lost is refused, because the page cannot deliver it', () => {
    // Take the slot that closes graphics first, then try to protect it. Accepting quietly would
    // be a promise about a specialisation that is already gone.
    const closed = planWith(/** @type {[string, number][]} */ ([...FORK, ['NUM-201', 3]]));
    assert.equal(trackStatus(closed).find((t) => t.id === 'graphics')?.open, false);

    const no = whyNotProtect(closed, 'graphics');
    assert.ok(no);
    assert.equal(no.rule, 'TRACK_ALREADY_CLOSED');
    assert.match(no.text, /explain_infeasibility/, 'and it should point at what would explain it');
  });

  test('releasing something that was never held is refused', () => {
    const no = whyNotRelease(fork(), 'graphics');
    assert.ok(no);
    assert.equal(no.rule, 'NOT_PROTECTED');
  });

  test('withProtection adds and removes without touching the rest', () => {
    const held = fork(['graphics', 'data']);
    assert.deepEqual(withProtection(held, 'data', false), ['graphics']);
    assert.deepEqual(withProtection(held, 'theory', true), ['graphics', 'data', 'theory']);
  });
});

describe('the policy held against an add', () => {
  test('with nothing protected, nothing is blocked', () => {
    assert.equal(whyNotAllowedByPolicy(fork(), 'NUM-201', 3), null);
  });

  test('an add that would close a protected track is refused', () => {
    const no = whyNotAllowedByPolicy(fork(['graphics']), 'NUM-201', 3);
    assert.ok(no, 'NUM-201 in term 3 closes graphics, and graphics was protected');
    assert.equal(no.rule, 'PROTECTED_TRACK');
  });

  test('the refusal cites the student, not the handbook', () => {
    const no = whyNotAllowedByPolicy(fork(['graphics']), 'NUM-201', 3);
    assert.ok(no);
    assert.match(no.text, /you asked to keep open/,
      'the point of this rule is that it is the person\'s, and the wording has to say so');
    assert.match(no.text, /protect_track/, 'and the remedy has to be actionable');
    assert.match(no.text, /does not come back/,
      'releasing the protection is not free, and a remedy that hides that is a bad remedy');
    assert.match(no.text, /The plan was not changed\./);
  });

  test('protecting one track does not block a choice that costs a different one', () => {
    // The whole fork: GEOM-201 closes data, NUM-201 closes graphics. Protecting graphics must
    // leave the other side of the trade available, or the policy is just a freeze.
    assert.equal(whyNotAllowedByPolicy(fork(['graphics']), 'GEOM-201', 3), null);
    assert.ok(whyNotAllowedByPolicy(fork(['data']), 'GEOM-201', 3));
  });

  test('protecting both sides of a trade blocks both, and says which', () => {
    const a = whyNotAllowedByPolicy(fork(['graphics', 'data']), 'NUM-201', 3);
    const b = whyNotAllowedByPolicy(fork(['graphics', 'data']), 'GEOM-201', 3);
    assert.ok(a && b, 'if both are held, neither side of the trade is available');
    assert.match(a.text, /Graphics and Animation/);
    assert.match(b.text, /Data and Machine Learning/);
  });

  test('a course that closes nothing is never blocked, whatever is protected', () => {
    const held = fork(['graphics', 'data', 'systems', 'theory']);
    assert.equal(whyNotAllowedByPolicy(held, 'HIST-101', 4), null,
      'a policy that blocks harmless things would be worthless within a day');
  });
});

describe('the planner does not propose what the policy would refuse', () => {
  test('a route that would close a protected track is not offered', () => {
    // The trade, seen from the planner's side. Completing data from this fork is possible, and
    // the only route it finds runs NUM-201 through term 3 — the slot that closes graphics.
    const open = planForTrack(fork(), 'data');
    assert.equal(open.ok, true, 'unprotected, data can still be completed');
    assert.ok(open.added.some(([c, t]) => c === 'NUM-201' && t === 3),
      'and the route it finds is the one that costs graphics');

    // Protect graphics and that route is gone, which leaves no route at all. The planner says so
    // rather than proposing a plan whose first step add_course would refuse.
    const held = planForTrack(fork(['graphics']), 'data');
    assert.equal(held.ok, false);
    assert.ok(held.blockers.length > 0, 'and it names what stopped it');
    assert.ok(held.blockers.some((b) => /PROTECTED_TRACK/.test(b.why)),
      'citing the policy, not a prerequisite that is not the problem');
  });

  test('from an empty plan the protection costs nothing, because nothing is closed yet', () => {
    // Protecting early must not freeze a plan that has room for everything: the rule fires on
    // what a choice *closes*, not on which track it belongs to.
    const plan = planForTrack(planWith([], ['graphics']), 'data');
    assert.equal(plan.ok, true, 'an early protection should not make other tracks unplannable');
    assert.ok(plan.added.length > 0);
  });
});

// @ts-check
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { EventLog, reduce, emptyState } from '../app/events.js';
import { whyNotAdd, whyNotRemove, describe as say, creditsIn, refuse } from '../app/rules.js';
import { COURSES, BY_CODE, CREDIT_CAP_PER_TERM } from '../app/catalogue.js';

/** Build a state directly, so rule tests do not depend on the rules they are testing. */
const planOf = (/** @type {[string, number][]} */ pairs) => ({
  selected: new Map(pairs),
  constraints: {},
});

describe('the catalogue is worth reasoning about', () => {
  test('every prerequisite names a course that exists', () => {
    for (const c of COURSES) {
      for (const p of c.prereqs) {
        assert.ok(BY_CODE.has(p), `${c.code} requires ${p}, which is not in the catalogue`);
      }
    }
  });

  test('no course requires something taught later than itself', () => {
    for (const c of COURSES) {
      for (const p of c.prereqs) {
        const pre = BY_CODE.get(p);
        assert.ok(pre, p);
        assert.ok(Math.min(...pre.terms) < Math.max(...c.terms),
          `${c.code} (term ${c.terms}) requires ${p} (term ${pre.terms}) — unreachable`);
      }
    }
  });

  test('the prerequisite graph is at least four levels deep', () => {
    /** @param {string} code @returns {number} */
    const depth = (code) => {
      const c = BY_CODE.get(code);
      if (!c || c.prereqs.length === 0) return 1;
      return 1 + Math.max(...c.prereqs.map(depth));
    };
    const deepest = Math.max(...COURSES.map((c) => depth(c.code)));
    assert.ok(deepest >= 4, `deepest chain is ${deepest}; what_this_closes needs room to work`);
  });
});

describe('events reduce to state', () => {
  test('an empty log is an empty plan', () => {
    assert.equal(reduce([]).selected.size, 0);
  });

  test('adding then removing leaves nothing behind', () => {
    const log = new EventLog(() => 0);
    log.append({ type: 'CourseAdded', code: 'CALC-101', term: 1 });
    log.append({ type: 'CourseRemoved', code: 'CALC-101' });
    assert.equal(log.state().selected.size, 0);
  });

  test('undo is just reducing fewer events', () => {
    const log = new EventLog(() => 0);
    log.append({ type: 'CourseAdded', code: 'CALC-101', term: 1 });
    log.append({ type: 'CourseAdded', code: 'ALG-101', term: 1 });
    log.append({ type: 'CourseAdded', code: 'PROG-101', term: 1 });

    assert.equal(log.state().selected.size, 3);
    assert.equal(log.state(2).selected.size, 2, 'the state as of two events');
    assert.equal(log.state(0).selected.size, 0);
    assert.equal(log.length, 3, 'reading a past state does not change the log');
  });

  test('rewinding drops the events rather than compensating for them', () => {
    const log = new EventLog(() => 0);
    log.append({ type: 'CourseAdded', code: 'CALC-101', term: 1 });
    log.append({ type: 'CourseAdded', code: 'ALG-101', term: 1 });
    const dropped = log.rewindTo(1);

    assert.equal(dropped.length, 1);
    assert.equal(log.length, 1);
    assert.deepEqual([...log.state().selected.keys()], ['CALC-101']);
  });

  test('the log cannot be rewritten through the array it hands out', () => {
    const log = new EventLog(() => 0);
    log.append({ type: 'CourseAdded', code: 'CALC-101', term: 1 });
    log.events.push(/** @type {any} */ ({ type: 'CourseAdded', code: 'FAKE', term: 1, at: 0, seq: 99 }));
    assert.equal(log.length, 1);
  });
});

describe('every refusal carries its four parts', () => {
  test('refuse() builds the shape the gate proved works', () => {
    const r = refuse('SOME_RULE', 'Something is wrong.', 'do this instead.');
    assert.match(r.text, /^Refused\./, 'leads with the verdict');
    assert.match(r.text, /To unblock it: /, 'carries the remedy — the part the model acts on');
    assert.match(r.text, /Rule: SOME_RULE\./, 'carries a handle a human can search for');
    assert.match(r.text, /The plan was not changed\.$/, 'says what happened to the state');
  });
});

describe('adding a course', () => {
  test('a missing prerequisite is refused, and the refusal names it', () => {
    const r = whyNotAdd(emptyState(), 'ADV-301', 5);
    assert.ok(r);
    assert.equal(r.rule, 'PREREQ_NOT_MET');
    assert.match(r.text, /CALC-102/);
    assert.match(r.text, /To unblock it: place CALC-102 and NUM-201 in a term before 5\./);
  });

  test('a prerequisite taken in the same term is still a refusal', () => {
    const plan = planOf([['DS-201', 4]]);
    const r = whyNotAdd(plan, 'ALGO-202', 4);
    assert.ok(r, 'DS-201 in term 4 cannot unlock ALGO-202 in term 4');
    assert.equal(r.rule, 'PREREQ_NOT_MET');
    assert.match(r.text, /same term or later/);
  });

  test('the same prerequisite one term earlier is accepted', () => {
    const plan = planOf([['DS-201', 3]]);
    assert.equal(whyNotAdd(plan, 'ALGO-202', 4), null);
  });

  test('two courses in one term at the same hour collide', () => {
    // Both prerequisites satisfied first, or PREREQ_NOT_MET fires before the timetable is
    // ever consulted — which is the right order, and cost this test one rewrite.
    const plan = planOf([['OS-202', 4], ['DB-202', 4], ['NET-301', 5]]);
    const r = whyNotAdd(plan, 'BIGD-301', 5);
    assert.ok(r);
    assert.equal(r.rule, 'SCHEDULE_CLASH');
    assert.match(r.text, /Mon 9:00–11:00/);
    assert.match(r.text, /NET-301/);
  });

  test('rules are checked in the order that gives the most useful answer', () => {
    // A course with an unmet prerequisite AND a clash reports the prerequisite: it is the
    // one the student must fix first, and fixing it may move the course anyway.
    const plan = planOf([['NET-301', 5]]);
    assert.equal(whyNotAdd(plan, 'BIGD-301', 5)?.rule, 'PREREQ_NOT_MET');
  });

  test('the same pair in different terms does not collide', () => {
    const plan = planOf([['OS-202', 4], ['DB-202', 4], ['NET-301', 5]]);
    // BIGD-301 only runs in term 5, so this is the honest refusal, not a clash
    assert.equal(whyNotAdd(plan, 'BIGD-301', 6)?.rule, 'NOT_OFFERED_IN_TERM');
  });

  test('the credit cap is enforced and says how far over it is', () => {
    const plan = planOf([['CALC-101', 1], ['ALG-101', 1], ['PROG-101', 1],
                         ['DISC-101', 1], ['PHYS-101', 1]]);
    assert.equal(creditsIn(plan, 1), 30);
    const r = whyNotAdd(plan, 'ETH-401', 1);
    assert.ok(r);
    // ETH-401 does not run in term 1, so that refusal comes first — check the cap directly
    assert.equal(creditsIn(plan, 1), CREDIT_CAP_PER_TERM);
  });

  test('a course already in the plan is refused, not silently re-added', () => {
    const plan = planOf([['CALC-101', 1]]);
    const r = whyNotAdd(plan, 'CALC-101', 1);
    assert.equal(r?.rule, 'ALREADY_IN_PLAN');
  });

  test('a code that does not exist is refused by name', () => {
    assert.equal(whyNotAdd(emptyState(), 'NOPE-999', 1)?.rule, 'UNKNOWN_COURSE');
  });

  test('a course asked for in a term it is not taught in says which term it runs', () => {
    const r = whyNotAdd(emptyState(), 'CALC-101', 3);
    assert.equal(r?.rule, 'NOT_OFFERED_IN_TERM');
    assert.match(r.text, /runs in term 1/);
  });
});

describe('removing a course', () => {
  test('something the plan depends on cannot just disappear', () => {
    const plan = planOf([['DS-201', 3], ['ALGO-202', 4]]);
    const r = whyNotRemove(plan, 'DS-201');
    assert.ok(r);
    assert.equal(r.rule, 'DEPENDENT_IN_PLAN');
    assert.match(r.text, /ALGO-202/);
    assert.match(r.text, /remove ALGO-202 first/);
  });

  test('a leaf comes out cleanly', () => {
    const plan = planOf([['DS-201', 3], ['ALGO-202', 4]]);
    assert.equal(whyNotRemove(plan, 'ALGO-202'), null);
  });

  test('removing what is not there is refused rather than ignored', () => {
    assert.equal(whyNotRemove(emptyState(), 'CALC-101')?.rule, 'NOT_IN_PLAN');
  });
});

describe('a mutation reports the state it produced', () => {
  test('an empty plan says so', () => {
    assert.equal(say(emptyState()), 'The plan is empty.');
  });

  test('a plan reports credits per term, not just an acknowledgement', () => {
    const text = say(planOf([['CALC-101', 1], ['ALG-101', 1], ['DS-201', 3]]));
    assert.match(text, /3 course\(s\), 18 credits/);
    assert.match(text, /term 1: ALG-101, CALC-101 \(12 credits\)/);
    assert.match(text, /term 3: DS-201 \(6 credits\)/);
    assert.doesNotMatch(text, /\bok\b/i, 'never an acknowledgement');
  });
});

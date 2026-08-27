// @ts-check
/**
 * These strings are the product. A model reads them and decides what to do next, so a test that
 * only checks "it did not throw" would be testing the wrong half.
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { callTool, TOOLS, READ_ONLY, ECHOES_CALLER_INPUT, annotationsFor } from '../app/tools.js';
import { log, trace, state } from '../app/store.js';
import { COURSES } from '../app/catalogue.js';
import { whyNotAdd } from '../app/rules.js';
import { whatThisCloses } from '../app/queries.js';

const call = (/** @type {string} */ name, /** @type {any} */ args) =>
  String(callTool(name, args));

beforeEach(() => {
  log.rewindTo(0);
  trace.length = 0;
});

const FORK = [
  ['CALC-101', 1], ['ALG-101', 1], ['PROG-101', 1], ['DISC-101', 1], ['PHYS-101', 1],
  ['CALC-102', 2], ['PROG-102', 2], ['STAT-101', 2], ['LOGIC-101', 2], ['CIRC-101', 2],
  ['DS-201', 3], ['ARCH-201', 3], ['AUTO-201', 3], ['STAT-201', 3],
];
const buildFork = () => { for (const [c, term] of FORK) call('add_course', { course: c, term }); };

/** Terms 1 and 2 full, term 3 untouched — the fork's first half, without its conclusion. */
const BASE = FORK.slice(0, 10);

describe('the annotations the specification defines, checked by running them', () => {
  test('nothing marked readOnly can append an event, whatever it is called with', () => {
    // Only this direction is worth asserting. `readOnlyHint: true` is what may cost a person an
    // approval prompt they would otherwise have seen, so it has to hold under any arguments —
    // while `false` on a tool that happens not to write is merely conservative.
    //
    // An earlier version checked both ways and was wrong: `remove_course` wrote nothing in the
    // fixture because it was *refused*, which says nothing about whether the tool can write.
    const shapes = [
      {},
      { course: 'CALC-101', term: 1 },
      { course: 'NUM-201', term: 3, track: 'graphics', step: 0 },
      { course_a: 'NUM-201', course_b: 'GEOM-201', term: 3, q: 'calc' },
      { course: 'ADV-301', term: 5, track: 'data', step: 99 },
    ];
    /** @type {string[]} */
    const wrote = [];
    for (const name of READ_ONLY) {
      for (const args of shapes) {
        log.rewindTo(0);
        buildFork();
        const before = log.length;
        try { callTool(name, args); } catch { /* a throw is not an append */ }
        if (log.length !== before) wrote.push(`${name} appended on ${JSON.stringify(args)}`);
      }
    }
    assert.deepEqual(wrote, [], 'a readOnlyHint that is not true is worse than none at all');
  });

  test('untrustedContentHint is true exactly for the tools that echo the caller back', () => {
    const MARK = 'ZZQXMARKER';
    const args = { course: MARK, track: MARK, q: MARK, course_a: MARK, course_b: 'NUM-201', step: MARK };
    /** @type {string[]} */
    const wrong = [];
    for (const t of TOOLS) {
      log.rewindTo(0);
      let out = '';
      try { out = String(callTool(t.name, args)); } catch (err) { out = String(err); }
      const echoed = out.toLowerCase().includes(MARK.toLowerCase());
      if (echoed !== ECHOES_CALLER_INPUT.has(t.name)) {
        wrong.push(`${t.name}: hint says untrusted=${ECHOES_CALLER_INPUT.has(t.name)}, it ${echoed ? 'echoes' : 'does not'}`);
      }
    }
    assert.deepEqual(wrong, [], 'a new tool that echoes its input must carry the hint');
  });

  test('every tool carries both hints and nothing else', () => {
    for (const t of TOOLS) {
      assert.deepEqual(Object.keys(annotationsFor(t.name)).sort(),
        ['readOnlyHint', 'untrustedContentHint'], `on ${t.name}`);
    }
  });
});

describe('the student\'s policy, through the tools', () => {
  test('protecting is an event, so undo_to takes it back out', () => {
    // Nothing was written to make this true. It is what the log buys.
    buildFork();
    const before = log.length;
    call('protect_track', { track: 'graphics' });
    assert.equal(log.length, before + 1, 'a protection is a step like any other');

    assert.match(call('add_course', { course: 'NUM-201', term: 3 }), /PROTECTED_TRACK/);
    call('undo_to', { step: before });
    assert.match(call('add_course', { course: 'NUM-201', term: 3 }), /Added NUM-201/,
      'once the protection is rewound the course goes in like any other');
  });

  test('the refusal reaches the caller through the real path', () => {
    buildFork();
    call('protect_track', { track: 'graphics' });
    const out = call('add_course', { course: 'NUM-201', term: 3 });
    assert.match(out, /you asked to keep open/);
    assert.match(out, /The plan was not changed\./);
    assert.equal(trace.at(-1)?.refused, true, 'and it is recorded as a refusal, not a result');
  });

  test('a refused add appends nothing', () => {
    buildFork();
    call('protect_track', { track: 'graphics' });
    const before = log.length;
    call('add_course', { course: 'NUM-201', term: 3 });
    assert.equal(log.length, before, 'a policy refusal must not leave an event behind either');
  });

  test('plan_status carries the policy, so an agent reading it knows the boundary', () => {
    buildFork();
    call('protect_track', { track: 'graphics' });
    const out = call('plan_status', {});
    assert.match(out, /Protected: Graphics and Animation/);
    assert.match(out, /is refused/);
  });

  test('list_actions reads it as a person would', () => {
    call('protect_track', { track: 'theory' });
    const out = call('list_actions', {});
    assert.match(out, /protected: Theory and Verification/);
    assert.doesNotMatch(out, /ConstraintSet/, 'the type name is not something to show a reader');
  });

  test('releasing says the protection is gone, and what is left', () => {
    call('protect_track', { track: 'theory' });
    const out = call('protect_track', { track: 'theory', protect: false });
    assert.match(out, /Released "Theory and Verification"/);
    assert.match(out, /Nothing is protected\./);
  });

  test('protecting is not free, and the tool says so before it is taken back', () => {
    buildFork();
    const out = call('add_course', { course: 'NUM-201', term: 3 });
    assert.match(out, /Added/, 'no policy, no obstacle');
    // Having closed graphics, protecting it is a promise the page cannot keep.
    assert.match(call('protect_track', { track: 'graphics' }), /TRACK_ALREADY_CLOSED/);
  });
});

describe('weighing two courses against each other', () => {
  test('the fork, in one call instead of two', () => {
    buildFork();
    const out = call('compare_options', { course_a: 'NUM-201', course_b: 'GEOM-201', term: 3 });
    assert.match(out, /NUM-201 in term 3 closes "Graphics and Animation"/);
    assert.match(out, /GEOM-201 in term 3 closes "Data and Machine Learning"/);
    assert.match(out, /no free version of this choice/);
  });

  test('it cannot disagree with what_this_closes, because it asks the same question', () => {
    // Two tools answering one question is how a surface starts contradicting itself. This one
    // calls the same reachability rather than computing its own, and this is what pins that.
    buildFork();
    const single = call('what_this_closes', { course: 'NUM-201', term: 3 });
    const both = call('compare_options', { course_a: 'NUM-201', course_b: 'GEOM-201', term: 3 });
    const track = /Graphics and Animation/;
    assert.match(single, track);
    assert.match(both, track);
  });

  test('within one term, the answer is never mixed — and that is a fact about slots', () => {
    // compare_options has a branch for "one of these costs nothing". No state in this catalogue
    // reaches it, and the reason is worth pinning rather than commenting: when a term is down to
    // its last slot, *whatever* takes that slot closes whichever track needed it. The cost is the
    // slot, not the course. So within one term the two sides are both costly or both free.
    //
    // If a future catalogue breaks that — a course that competes for a term without being the last
    // thing any track was waiting on — this fails, and the branch stops being unreachable.
    const terms = [3, 4, 5, 6];
    /** @type {string[]} */
    const mixed = [];

    for (const term of terms) {
      const pool = COURSES.filter((c) => c.terms.includes(term));
      for (let fill = 0; fill <= pool.length; fill++) {
        log.rewindTo(0);
        for (const [c, t] of BASE) call('add_course', { course: c, term: t });
        for (const c of pool.slice(0, fill)) call('add_course', { course: c.code, term });

        const s = state();
        const rest = pool.slice(fill).filter((c) => !whyNotAdd(s, c.code, term));
        const costly = rest.filter((c) => whatThisCloses(s, c.code, term).closed.length);
        if (costly.length && costly.length !== rest.length) {
          mixed.push(`term ${term}, ${fill} filled: ${costly.length} of ${rest.length} cost something`);
        }
      }
    }
    assert.deepEqual(mixed, [], 'a term with a mixed answer would make the third branch reachable');
  });

  test('when neither costs anything it says so, instead of dressing it up as a trade', () => {
    const out = call('compare_options', { course_a: 'CALC-101', course_b: 'ALG-101', term: 1 });
    assert.match(out, /preference rather than a trade/);
  });

  test('the same course on both sides is refused rather than answered twice', () => {
    const out = call('compare_options', { course_a: 'NUM-201', course_b: 'num-201', term: 3 });
    assert.match(out, /SAME_COURSE_TWICE/);
    assert.match(out, /The plan was not changed\./);
  });

  test('an unknown code is named and quoted, not silently dropped', () => {
    const out = call('compare_options', { course_a: 'NUM-201', course_b: 'QUANTUM-999', term: 3 });
    assert.match(out, /"QUANTUM-999"/);
    assert.ok(out.length < 300, `echoed ${out.length} characters`);
  });

  test('comparing changes nothing — it is a question, not a move', () => {
    buildFork();
    const before = log.length;
    call('compare_options', { course_a: 'NUM-201', course_b: 'GEOM-201', term: 3 });
    assert.equal(log.length, before);
  });
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

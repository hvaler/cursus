// @ts-check
/**
 * A plan in a link.
 *
 * The encoding is dull on purpose and there is not much to prove about it. What is worth proving
 * is the property the feature rests on: **a link is a list of actions, not a plan**, and reopening
 * one replays those actions through the same tools an agent uses.
 *
 * That is the difference between this and a persistence trick. A saved plan restored into state
 * would be a second way into the state, one that skips every rule — so a hand-edited link could
 * produce a plan the page had refused to build a minute earlier. Replaying cannot: the rules are
 * the gate on the way in as well as the way through, and this file is where that is checked.
 *
 * The other half is that decoding must never throw. A mangled link is not an error condition, it
 * is a link somebody pasted badly, and the answer is an empty plan rather than a broken page.
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { encode, decode, toActions, replay, linkFor, MAX_ENCODED } from '../app/share.js';
import { callTool } from '../app/tools.js';
import { log, trace, state } from '../app/store.js';
import { protectedTracks } from '../app/policy.js';

const call = (/** @type {string} */ name, /** @type {any} */ args) => String(callTool(name, args));

beforeEach(() => {
  log.rewindTo(0);
  trace.length = 0;
});

/** Encode whatever is in the log right now. */
const share = () => encode(log.events);

describe('a plan survives the round trip', () => {
  test('courses come back in the same terms', () => {
    call('add_course', { course: 'CALC-101', term: 1 });
    call('add_course', { course: 'ALG-101', term: 1 });
    const link = share();

    log.rewindTo(0);
    assert.equal(state().selected.size, 0);

    const { applied, refused } = replay(decode(link), callTool);
    assert.equal(applied, 2);
    assert.deepEqual(refused, []);
    assert.equal(state().selected.get('CALC-101'), 1);
    assert.equal(state().selected.get('ALG-101'), 1);
  });

  test('a protection travels with the plan, because it is part of what was decided', () => {
    call('add_course', { course: 'CALC-101', term: 1 });
    call('protect_track', { track: 'graphics' });
    const link = share();

    log.rewindTo(0);
    replay(decode(link), callTool);
    assert.deepEqual(protectedTracks(state()), ['graphics']);
  });

  test('timestamps and sequence numbers are not part of a plan', () => {
    call('add_course', { course: 'CALC-101', term: 1 });
    const actions = toActions(log.events);
    assert.deepEqual(actions, [['+', 'CALC-101', 1]]);
  });

  test('an empty plan produces no link, rather than a link to nothing', () => {
    assert.equal(share(), '');
    assert.equal(linkFor(log.events), '');
  });

  test('the link is a URL a person could paste', () => {
    call('add_course', { course: 'CALC-101', term: 1 });
    const url = linkFor(log.events);
    assert.match(url, /^https:\/\/[^\s#]+#p=[A-Za-z0-9_-]+$/);
  });
});

describe('the rules are the gate on the way in, not only on the way through', () => {
  test('a link edited to skip a prerequisite is refused, and says which', () => {
    // ADV-301 needs CALC-102 and NUM-201. Hand-build a link that just asserts it into term 5 —
    // exactly what someone would try after seeing the encoding is only base64.
    const forged = encode(/** @type {any} */ ([
      { type: 'CourseAdded', code: 'ADV-301', term: 5 },
    ]));

    const { applied, refused } = replay(decode(forged), callTool);
    assert.equal(applied, 0);
    assert.deepEqual(refused, ['ADV-301']);
    assert.equal(state().selected.size, 0, 'the forged course must not be in the plan');
  });

  test('a link that breaks the credit cap loses the courses that do not fit', () => {
    const six = ['CALC-101', 'ALG-101', 'PROG-101', 'DISC-101', 'PHYS-101', 'ECON-101'];
    const forged = encode(/** @type {any} */ (
      six.map((code) => ({ type: 'CourseAdded', code, term: 1 }))));

    const { refused } = replay(decode(forged), callTool);
    assert.ok(refused.length > 0, 'five six-credit courses fill term 1; a sixth cannot fit');
    assert.ok(state().selected.size <= 5);
  });

  test('what did not survive is named, not silently dropped', () => {
    const forged = encode(/** @type {any} */ ([
      { type: 'CourseAdded', code: 'CALC-101', term: 1 },
      { type: 'CourseAdded', code: 'ADV-301', term: 5 },
    ]));
    const { applied, refused } = replay(decode(forged), callTool);
    assert.equal(applied, 1);
    assert.deepEqual(refused, ['ADV-301'],
      'a shared plan that quietly loses a course is worse than one that says it did');
  });

  test('a protection in a link is enforced against the rest of the link', () => {
    // Protect graphics, then try to take the slot that closes it — in the same link. The policy
    // has to apply to what comes after it, or a link could smuggle past a limit by ordering.
    const fork = [
      ['CALC-101', 1], ['ALG-101', 1], ['PROG-101', 1], ['DISC-101', 1], ['PHYS-101', 1],
      ['CALC-102', 2], ['PROG-102', 2], ['STAT-101', 2], ['LOGIC-101', 2], ['CIRC-101', 2],
      ['DS-201', 3], ['ARCH-201', 3], ['AUTO-201', 3], ['STAT-201', 3],
    ];
    const forged = encode(/** @type {any} */ ([
      ...fork.map(([code, term]) => ({ type: 'CourseAdded', code, term })),
      { type: 'ConstraintSet', key: 'protected_tracks', value: ['graphics'] },
      { type: 'CourseAdded', code: 'NUM-201', term: 3 },
    ]));

    const { refused } = replay(decode(forged), callTool);
    assert.deepEqual(refused, ['NUM-201']);
    assert.equal(state().selected.has('NUM-201'), false);
  });
});

describe('decoding never throws, whatever arrives', () => {
  test('junk of every shape gives an empty plan', () => {
    const junk = [
      '', null, undefined, 42, {}, [],
      'not base64 at all!!',
      '!!!!', '====', 'a'.repeat(10),
      btoa('null'), btoa('42'), btoa('"a string"'), btoa('{"a":1}'),
      btoa('[[1,2,3]]'), btoa('[{"type":"CourseAdded"}]'),
      btoa('[').replace(/=+$/, ''),
    ];
    for (const j of junk) {
      assert.deepEqual(decode(j), [], `on ${JSON.stringify(j) ?? String(j)}`);
    }
  });

  test('an oversized fragment is rejected before it is parsed', () => {
    assert.deepEqual(decode('A'.repeat(MAX_ENCODED + 1)), []);
  });

  test('actions of the wrong shape are dropped, the rest survive', () => {
    const mixed = btoa(JSON.stringify([
      ['+', 'CALC-101', 1],
      ['+', 'CALC-102'],            // no term
      ['+', 42, 1],                 // code is not a string
      ['?', 'whatever'],            // not a kind we know
      'not even an array',
      ['-', 'CALC-101'],
    ])).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    assert.deepEqual(decode(mixed), [['+', 'CALC-101', 1], ['-', 'CALC-101']]);
  });

  test('a hostile string in a course code is data, not an instruction', () => {
    // It reaches the tools, which quote it, which is checked in hostile.test.js. What matters
    // here is that it gets that far intact rather than breaking the decoder.
    const forged = encode(/** @type {any} */ ([
      { type: 'CourseAdded', code: '<script>alert(1)</script>', term: 1 },
    ]));
    const { applied, refused } = replay(decode(forged), callTool);
    assert.equal(applied, 0);
    assert.equal(refused.length, 1);
    assert.equal(state().selected.size, 0);
  });

  test('a plan longer than a degree is truncated rather than replayed', () => {
    const many = Array.from({ length: 500 }, () => ({ type: 'CourseAdded', code: 'CALC-101', term: 1 }));
    const actions = decode(encode(/** @type {any} */ (many)));
    assert.ok(actions.length <= 200, `decoded ${actions.length} actions`);
  });
});

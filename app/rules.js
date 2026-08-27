// @ts-check
/**
 * The rules, and the shape of saying no.
 *
 * `execute` returns a string the model reads, so a refusal is not an error code with prose
 * attached — the prose *is* the interface. The gate on 2026-08-27 showed which part does the
 * work: given `To unblock it: enrol CALC-101 first`, the model stopped reporting a failure and
 * started proposing a fix, then asked permission before applying it. Nothing instructed it to.
 *
 * So the four parts are built by `refuse()` rather than left to each rule to remember:
 *
 *   what and why · the remedy · a rule handle a human can search · what happened to the state
 *
 * @typedef {import('./events.js').State} State
 * @typedef {{ rule: string, text: string }} Refusal
 */

import { BY_CODE, CREDIT_CAP_PER_TERM, TERMS, course, dependents } from './catalogue.js';

/**
 * @param {string} rule       a handle, e.g. PREREQ_NOT_MET
 * @param {string} because    what is wrong, in the domain's words
 * @param {string} remedy     what would unblock it. The part the model acts on
 * @returns {Refusal}
 */
export function refuse(rule, because, remedy) {
  return {
    rule,
    text: `Refused. ${because} To unblock it: ${remedy} Rule: ${rule}. The plan was not changed.`,
  };
}

const name = (/** @type {string} */ code) => {
  const c = course(code);
  return c ? `${code} (${c.name})` : code;
};

/** @param {import('./catalogue.js').Slot} a @param {import('./catalogue.js').Slot} b */
const overlaps = (a, b) => a.day === b.day && a.from < b.to && b.from < a.to;

/** Credits already committed in a term. @param {State} state @param {number} term */
export function creditsIn(state, term) {
  let total = 0;
  for (const [code, t] of state.selected) {
    if (t !== term) continue;
    total += course(code)?.credits ?? 0;
  }
  return total;
}

/**
 * Every reason `code` cannot be added at `term`, or null when it can.
 * One refusal at a time: a wall of six problems is not more honest, it is less usable.
 *
 * @param {State} state
 * @param {string} code
 * @param {number} [wanted] term; when absent, the earliest term the course runs in
 * @returns {Refusal | null}
 */
export function whyNotAdd(state, code, wanted) {
  const c = BY_CODE.get(code);
  if (!c) {
    return refuse('UNKNOWN_COURSE',
      `There is no course with code ${code} in the catalogue.`,
      'check the code, or search the catalogue for the name you meant.');
  }

  const term = wanted ?? c.terms[0];

  if (state.selected.has(code)) {
    return refuse('ALREADY_IN_PLAN',
      `${name(code)} is already in the plan, in term ${state.selected.get(code)}.`,
      'nothing — it is already there. Remove it first if you want it in a different term.');
  }

  if (!TERMS.includes(term)) {
    return refuse('NO_SUCH_TERM',
      `Term ${term} does not exist; the degree runs in terms ${TERMS[0]} to ${TERMS[TERMS.length - 1]}.`,
      `pick a term between ${TERMS[0]} and ${TERMS[TERMS.length - 1]}.`);
  }

  if (!c.terms.includes(term)) {
    return refuse('NOT_OFFERED_IN_TERM',
      `${name(code)} is not taught in term ${term}; it runs in term ${c.terms.join(' or ')}.`,
      `add it in term ${c.terms.join(' or ')}.`);
  }

  // Prerequisites, which must sit strictly earlier than the course that needs them.
  const missing = c.prereqs.filter((p) => {
    const at = state.selected.get(p);
    return at === undefined || at >= term;
  });
  if (missing.length) {
    const notAtAll = missing.filter((p) => !state.selected.has(p));
    const tooLate = missing.filter((p) => state.selected.has(p));
    const parts = [];
    if (notAtAll.length) parts.push(`${notAtAll.map(name).join(' and ')} ${notAtAll.length > 1 ? 'are' : 'is'} not in the plan`);
    if (tooLate.length) parts.push(`${tooLate.map(name).join(' and ')} would be taken in the same term or later`);
    return refuse('PREREQ_NOT_MET',
      `${name(code)} requires ${c.prereqs.map(name).join(' and ')}, and ${parts.join(', and ')}.`,
      `place ${missing.map((m) => m).join(' and ')} in a term before ${term}.`);
  }

  // Timetable, within the same term only.
  for (const [other, otherTerm] of state.selected) {
    if (otherTerm !== term) continue;
    const o = course(other);
    if (!o) continue;
    for (const a of c.slots) {
      for (const b of o.slots) {
        if (overlaps(a, b)) {
          return refuse('SCHEDULE_CLASH',
            `${name(code)} meets ${a.day} ${a.from}:00–${a.to}:00, which collides with ` +
            `${name(other)} in the same term.`,
            `move one of the two to another term, or drop ${other}.`);
        }
      }
    }
  }

  const after = creditsIn(state, term) + c.credits;
  if (after > CREDIT_CAP_PER_TERM) {
    return refuse('CREDIT_CAP_EXCEEDED',
      `Term ${term} already holds ${creditsIn(state, term)} credits and ${name(code)} adds ` +
      `${c.credits}, over the ${CREDIT_CAP_PER_TERM}-credit cap.`,
      `move something out of term ${term}, or place this course in a lighter term.`);
  }

  return null;
}

/**
 * @param {State} state
 * @param {string} code
 * @returns {Refusal | null}
 */
export function whyNotRemove(state, code) {
  if (!BY_CODE.has(code)) {
    return refuse('UNKNOWN_COURSE',
      `There is no course with code ${code} in the catalogue.`,
      'check the code.');
  }
  if (!state.selected.has(code)) {
    return refuse('NOT_IN_PLAN',
      `${name(code)} is not in the plan, so there is nothing to remove.`,
      'nothing — the plan already does not contain it.');
  }
  const blocked = dependents(code).filter((d) => state.selected.has(d.code));
  if (blocked.length) {
    const list = blocked.map((d) => name(d.code)).join(' and ');
    return refuse('DEPENDENT_IN_PLAN',
      `${list} ${blocked.length > 1 ? 'depend' : 'depends'} on ${name(code)}, and ${blocked.length > 1 ? 'they are' : 'it is'} still in the plan.`,
      `remove ${blocked.map((d) => d.code).join(' and ')} first, then this becomes possible.`);
  }
  return null;
}

/**
 * What the plan says about itself, in the words a tool should return after changing it.
 * A mutating tool that answers "ok" leaves the agent's picture of the state to drift from the
 * page's, silently — so every mutation reports the state it produced.
 *
 * @param {State} state
 */
export function describe(state) {
  if (state.selected.size === 0) return 'The plan is empty.';
  /** @type {Map<number, string[]>} */
  const byTerm = new Map();
  for (const [code, term] of state.selected) {
    if (!byTerm.has(term)) byTerm.set(term, []);
    byTerm.get(term)?.push(code);
  }
  const parts = [...byTerm.keys()].sort((a, b) => a - b).map((t) => {
    const codes = (byTerm.get(t) ?? []).sort();
    return `term ${t}: ${codes.join(', ')} (${creditsIn(state, t)} credits)`;
  });
  let total = 0;
  for (const code of state.selected.keys()) total += course(code)?.credits ?? 0;
  return `The plan now holds ${state.selected.size} course(s), ${total} credits — ${parts.join('; ')}.`;
}

// @ts-check
/**
 * The questions the screen cannot answer.
 *
 * A rendered timetable shows what you picked. It cannot show what picking it costs you three
 * terms later, because that is reachability over the prerequisite graph under a credit budget,
 * and nobody does that in their head. This is the reason the page exposes tools at all: an agent
 * that could only read the DOM would be no better informed than the student.
 *
 * @typedef {import('./events.js').State} State
 */

import { BY_CODE, COURSES, CREDIT_CAP_PER_TERM, TERMS, TRACKS, course } from './catalogue.js';
import { creditsIn } from './rules.js';

/**
 * Everything `code` needs that is not already in the plan, including itself, deepest first.
 * @param {State} state @param {string} code @returns {string[]}
 */
export function closure(state, code) {
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  /** @param {string} c */
  const walk = (c) => {
    if (seen.has(c) || state.selected.has(c)) return;
    seen.add(c);
    for (const p of BY_CODE.get(c)?.prereqs ?? []) walk(p);
    out.push(c);
  };
  walk(code);
  return out;
}

/**
 * Can this course still be fitted in, given what is already committed?
 *
 * Greedy earliest-fit over the prerequisite closure: each course goes in the earliest term it is
 * taught in that is after all of its prerequisites and still has credits free. Greedy is not
 * optimal, and where it fails a smarter search might succeed — so a `false` here means *this
 * planner could not find a way*, not *no way exists*. The distinction is in the wording the
 * tools return, and in `docs/` rather than buried.
 *
 * @param {State} state @param {string} code
 * @returns {{ ok: true, plan: Map<string, number> } | { ok: false, stuck: string }}
 */
export function canStillPlace(state, code) {
  const need = closure(state, code);
  /** @type {Map<string, number>} */
  const placed = new Map(state.selected);
  /** @type {Map<number, number>} */
  const used = new Map(TERMS.map((t) => [t, creditsIn(state, t)]));

  for (const c of need) {
    const info = BY_CODE.get(c);
    if (!info) return { ok: false, stuck: c };
    const earliestAllowed = Math.max(
      0,
      ...info.prereqs.map((p) => (placed.get(p) ?? 0)),
    );
    const term = info.terms
      .filter((t) => t > earliestAllowed)
      .find((t) => (used.get(t) ?? 0) + info.credits <= CREDIT_CAP_PER_TERM);
    if (term === undefined) return { ok: false, stuck: c };
    placed.set(c, term);
    used.set(term, (used.get(term) ?? 0) + info.credits);
  }
  return { ok: true, plan: placed };
}

/**
 * Which tracks are still completable from here.
 * @param {State} state
 * @returns {{ id: string, name: string, have: string[], reachable: string[], open: boolean }[]}
 */
export function trackStatus(state) {
  return TRACKS.map((t) => {
    const have = t.needs.filter((c) => state.selected.has(c));
    const reachable = t.needs.filter((c) => !state.selected.has(c) && canStillPlace(state, c).ok);
    return {
      id: t.id, name: t.name, have, reachable,
      open: have.length + reachable.length >= t.minimum,
    };
  });
}

/**
 * **The one that earns the tool surface.** What does committing to this close off?
 *
 * @param {State} state @param {string} code @param {number} [term]
 */
export function whatThisCloses(state, code, term) {
  const c = BY_CODE.get(code);
  if (!c) return { unknown: true, closed: [], narrowed: [] };
  const at = term ?? c.terms[0];

  const before = trackStatus(state);
  /** @type {State} */
  const after = { ...state, selected: new Map(state.selected).set(code, at) };
  const later = trackStatus(after);

  const closed = later.filter((t, i) => before[i].open && !t.open);
  const narrowed = later
    .map((t, i) => ({
      t,
      lost: before[i].reachable.filter((x) => !t.reachable.includes(x) && !t.have.includes(x)),
    }))
    .filter((x) => x.lost.length > 0 && !closed.includes(x.t));

  return { unknown: false, closed, narrowed };
}

/**
 * The prerequisite chain, as a sentence rather than a graph dump.
 * @param {State} state @param {string} code
 */
export function requirementChain(state, code) {
  const c = BY_CODE.get(code);
  if (!c) return null;
  const need = closure(state, code).filter((x) => x !== code);
  const depth = (/** @type {string} */ x) => {
    const i = BY_CODE.get(x);
    if (!i || i.prereqs.length === 0) return 1;
    return 1 + Math.max(...i.prereqs.map(depth));
  };
  return { code, name: c.name, missing: need, depth: depth(code), credits: c.credits };
}

/**
 * @param {{ text?: string, area?: string, term?: number, maxCredits?: number }} q
 */
export function search(q) {
  const text = (q.text ?? '').toLowerCase().trim();
  return COURSES.filter((c) => {
    if (text && !`${c.code} ${c.name}`.toLowerCase().includes(text)) return false;
    if (q.area && c.area !== q.area) return false;
    if (q.term !== undefined && !c.terms.includes(q.term)) return false;
    if (q.maxCredits !== undefined && c.credits > q.maxCredits) return false;
    return true;
  });
}

/** Total credits committed. @param {State} state */
export const totalCredits = (state) =>
  [...state.selected.keys()].reduce((n, c) => n + (course(c)?.credits ?? 0), 0);

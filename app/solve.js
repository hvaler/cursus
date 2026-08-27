// @ts-check
/**
 * Planning towards a goal, and explaining why a goal is out of reach.
 *
 * The second half is the interesting one. Any planner can say "no solution". Saying **which
 * constraint is binding, and what relaxing it would cost**, is the difference between a tool that
 * ends a conversation and one that continues it — and it is the same idea as a refusal carrying
 * its remedy, applied to a search instead of a single rule.
 *
 * Deliberately not a general solver. Greedy earliest-fit with one repair pass, over the same
 * validator the rules use, so a plan it proposes cannot be one `add_course` would reject.
 *
 * @typedef {import('./events.js').State} State
 */

import { BY_CODE, CREDIT_CAP_PER_TERM, TERMS, TRACKS, course } from './catalogue.js';
import { whyNotAdd, creditsIn } from './rules.js';
import { closure, trackStatus, whatThisCloses } from './queries.js';

/** @param {State} s */
const clone = (s) => ({ selected: new Map(s.selected), constraints: { ...s.constraints } });

/**
 * Try to place `code` and everything it needs, using the real rules rather than a copy of them.
 * @param {State} state @param {string} code
 * @returns {{ ok: true, added: [string, number][] } | { ok: false, stuck: string, why: string }}
 */
export function place(state, code) {
  let work = clone(state);
  /** @type {[string, number][]} */
  const added = [];

  for (const c of closure(state, code)) {
    const info = BY_CODE.get(c);
    if (!info) return { ok: false, stuck: c, why: `${c} is not in the catalogue` };

    let placed = false;
    /** @type {string} */
    let lastWhy = '';
    for (const term of info.terms) {
      const no = whyNotAdd(work, c, term);
      if (!no) {
        work.selected.set(c, term);
        added.push([c, term]);
        placed = true;
        break;
      }
      lastWhy = no.text;
    }
    if (!placed) return { ok: false, stuck: c, why: lastWhy };
  }
  return { ok: true, added };
}

/**
 * A plan that completes a track, if one can be found from here.
 * @param {State} state @param {string} trackId
 */
export function planForTrack(state, trackId) {
  const track = TRACKS.find((t) => t.id === trackId);
  if (!track) return { ok: /** @type {const} */ (false), unknownTrack: true, needed: 0, added: [], blockers: [] };

  const held = track.needs.filter((c) => state.selected.has(c));
  let needed = track.minimum - held.length;
  if (needed <= 0) {
    return { ok: /** @type {const} */ (true), unknownTrack: false, needed: 0, added: /** @type {[string, number][]} */ ([]), blockers: [] };
  }

  // Cheapest first: fewest new courses pulled in by the prerequisite closure.
  const candidates = track.needs
    .filter((c) => !state.selected.has(c))
    .map((c) => ({ code: c, cost: closure(state, c).length }))
    .sort((a, b) => a.cost - b.cost);

  let work = clone(state);
  /** @type {[string, number][]} */
  const added = [];
  /** @type {{ code: string, why: string }[]} */
  const blockers = [];

  for (const { code } of candidates) {
    if (needed === 0) break;
    const r = place(work, code);
    if (r.ok) {
      for (const [c, t] of r.added) {
        work.selected.set(c, t);
        added.push([c, t]);
      }
      needed--;
    } else {
      blockers.push({ code, why: r.why });
    }
  }

  return { ok: /** @type {const} */ (needed === 0), unknownTrack: false, needed, added, blockers };
}

/**
 * Why a track cannot be completed, and what it would take.
 *
 * Three things, in the order a person can act on them:
 *   1. the binding constraint — which course cannot be placed, and the rule that stops it
 *   2. what would free it — the courses whose removal makes room, with the exact credits
 *   3. what that repair costs — because freeing room for one track may close another, and
 *      offering a fix without its price is how planners lose trust
 *
 * @param {State} state @param {string} trackId
 */
export function explainInfeasible(state, trackId) {
  const track = TRACKS.find((t) => t.id === trackId);
  if (!track) return null;

  const attempt = planForTrack(state, trackId);
  if (attempt.ok) return null;

  const blocker = attempt.blockers[0];
  if (!blocker) {
    return { track, blocker: null, terms: [], repairs: [], needed: attempt.needed };
  }

  // Which terms are full enough to be the problem, and what sits in them.
  const stuckCourse = BY_CODE.get(blocker.code);
  const terms = (stuckCourse?.terms ?? []).map((t) => ({
    term: t,
    used: creditsIn(state, t),
    free: CREDIT_CAP_PER_TERM - creditsIn(state, t),
    holds: [...state.selected].filter(([, x]) => x === t).map(([c]) => c),
  }));

  // What removing one course from a full term would free — and what that costs elsewhere.
  /** @type {{ drop: string, term: number, frees: number, closes: string[] }[]} */
  const repairs = [];
  for (const t of terms) {
    if (t.free >= (stuckCourse?.credits ?? 6)) continue;   // this term is not the blocker
    for (const c of t.holds) {
      const credits = course(c)?.credits ?? 0;
      if (t.free + credits < (stuckCourse?.credits ?? 6)) continue;
      // The cost of a repair is not "what breaks when this course leaves" — the slot it frees is
      // still there, so everything stays reachable through it. The cost is what breaks when the
      // slot is *taken by the thing we freed it for*. Measuring the removal alone reported every
      // repair as free, which is how a planner ends up recommending a swap that quietly costs a
      // specialisation.
      const after = clone(state);
      after.selected.delete(c);
      after.selected.set(blocker.code, t.term);
      const openBefore = trackStatus(state).filter((x) => x.open).map((x) => x.id);
      const openAfter = trackStatus(after).filter((x) => x.open).map((x) => x.id);
      repairs.push({
        drop: c, term: t.term, frees: credits,
        closes: openBefore.filter((id) => !openAfter.includes(id)),
      });
    }
  }

  return { track, blocker, terms, repairs, needed: attempt.needed };
}

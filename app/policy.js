// @ts-check
/**
 * The student's own limits, enforced against the agent.
 *
 * Every other rule in this project belongs to the university: a prerequisite chain, a timetable
 * clash, a credit cap. They are the same for everyone and the page did not invent them.
 *
 * These are different. **A person declares one, and from then on the page holds it against
 * whatever an agent is asked to do** — including by the same person, later, in a hurry. Ask an
 * agent to take a course that would close a protected specialisation and it is refused, and the
 * refusal cites the instruction the student gave rather than a rule from the handbook.
 *
 * That is the direction that is hard to get any other way. A tool surface that only exposes
 * capability lets an agent do anything the UI could do, faster. A tool surface that also carries
 * the user's policy lets them say *what they will not have done to their plan* and have it stick
 * while they are not looking.
 *
 * It costs almost nothing here because of the decision underneath: a protection is an
 * event (`ConstraintSet`), so `undo_to` unwinds it with everything else and no code was written
 * to make that true.
 *
 * `rules.js` cannot import `queries.js` — `queries` imports `rules` — so the check lives here,
 * importing both, the same shape `solve.js` already has.
 *
 * @typedef {import('./events.js').State} State
 * @typedef {import('./rules.js').Refusal} Refusal
 */

import { TRACKS } from './catalogue.js';
import { refuse, quoteInput } from './rules.js';
import { whatThisCloses, trackStatus } from './queries.js';

/** The constraint key. One key holding a list, so the whole policy is one event to read. */
export const PROTECTED = 'protected_tracks';

const track = (/** @type {string} */ id) => TRACKS.find((t) => t.id === id);

/**
 * The protected track ids. Tolerant of a state that has never had one set, and of a constraint
 * value that is not a list — this is read on every add, and a malformed constraint should mean
 * "no policy", never an exception in the middle of a rule check.
 *
 * @param {State} state
 * @returns {string[]}
 */
export function protectedTracks(state) {
  const value = state.constraints?.[PROTECTED];
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
}

/**
 * The constraint value after protecting or releasing one track. Returned rather than applied,
 * because the caller is the one that appends the event.
 *
 * @param {State} state @param {string} trackId @param {boolean} on
 */
export function withProtection(state, trackId, on) {
  const held = protectedTracks(state);
  return on ? [...held, trackId] : held.filter((id) => id !== trackId);
}

/**
 * Why this course cannot be added *given what the student asked for*, or null.
 *
 * Deliberately separate from `whyNotAdd`: the university's rules and the student's policy are
 * different kinds of no, and a refusal that confuses them would send an agent looking for a
 * prerequisite that is not the problem.
 *
 * @param {State} state @param {string} code @param {number} [term]
 * @returns {Refusal | null}
 */
export function whyNotAllowedByPolicy(state, code, term) {
  const held = protectedTracks(state);
  if (!held.length) return null;

  const { closed } = whatThisCloses(state, code, term);
  const hit = closed.filter((t) => held.includes(t.id));
  if (!hit.length) return null;

  const names = hit.map((t) => `"${t.name}"`).join(' and ');
  const ids = hit.map((t) => t.id).join(', ');

  return refuse('PROTECTED_TRACK',
    `Adding ${code}${term ? ` in term ${term}` : ''} would close ${names}, which you asked to ` +
    `keep open.`,
    `either choose something that does not close ${hit.length > 1 ? 'them' : 'it'}, or release ` +
    `the protection first with protect_track({track: "${ids}", protect: false}) — but then the ` +
    `specialisation goes, and it does not come back.`);
}

/**
 * Why this track cannot be protected, or null. Protecting something already lost would be a
 * promise the page cannot keep, so it is refused rather than accepted quietly.
 *
 * @param {State} state @param {string} trackId
 * @returns {Refusal | null}
 */
export function whyNotProtect(state, trackId) {
  const t = track(trackId);
  if (!t) {
    return refuse('UNKNOWN_TRACK',
      `No specialisation has the id ${quoteInput(trackId)}.`,
      `use one of: ${TRACKS.map((x) => x.id).join(', ')}.`);
  }

  if (protectedTracks(state).includes(trackId)) {
    return refuse('ALREADY_PROTECTED',
      `"${t.name}" is already protected.`,
      'nothing — it is already held. Pass protect: false to release it.');
  }

  const status = trackStatus(state).find((s) => s.id === trackId);
  if (status && !status.open) {
    return refuse('TRACK_ALREADY_CLOSED',
      `"${t.name}" is already out of reach, so protecting it would promise something this page ` +
      `cannot deliver.`,
      `call explain_infeasibility({track: "${trackId}"}) to see what closed it and what each way ` +
      `back would cost.`);
  }

  return null;
}

/**
 * Why this track cannot be released, or null.
 *
 * @param {State} state @param {string} trackId
 * @returns {Refusal | null}
 */
export function whyNotRelease(state, trackId) {
  const t = track(trackId);
  if (!t) {
    return refuse('UNKNOWN_TRACK',
      `No specialisation has the id ${quoteInput(trackId)}.`,
      `use one of: ${TRACKS.map((x) => x.id).join(', ')}.`);
  }

  if (!protectedTracks(state).includes(trackId)) {
    return refuse('NOT_PROTECTED',
      `"${t.name}" is not protected, so there is nothing to release.`,
      'nothing. Pass protect: true to protect it.');
  }

  return null;
}

/**
 * The active policy, as a sentence for a model to read. Empty when nothing is protected, so
 * callers can append it without checking.
 *
 * @param {State} state
 */
export function describePolicy(state) {
  const held = protectedTracks(state).map((id) => track(id)?.name ?? id);
  if (!held.length) return '';
  return `Protected: ${held.join(', ')} — anything that would close ${held.length > 1 ? 'one of these' : 'this'} is refused.`;
}

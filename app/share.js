// @ts-check
/**
 * A plan in a link.
 *
 * There is no server and no account, so a plan lives in one tab and dies on reload. That is
 * honest for a demo but it removes the thing a student actually does with a plan, which is show
 * it to somebody: a tutor, a friend who took the course last year, an adviser with ten minutes.
 *
 * The log is small enough to fit in a URL, so it goes in the URL. Nothing is stored anywhere.
 *
 * **The part that is not a persistence trick.** A shared link carries *actions*, not a plan, and
 * reopening it **replays every action through the same rules `add_course` uses**. So a link edited
 * by hand cannot produce a plan the page would have refused to build — the rules are the gate on
 * the way in as well as the way through, and there is no second path that skips them.
 *
 * Encoding is deliberately dull: a compact array, JSON, base64url. No compression, nothing
 * evaluated, nothing reflected into the DOM. Decoding a hostile string must return a smaller plan
 * or none at all, never an exception in the middle of a page load.
 *
 * @typedef {import('./events.js').Event} Event
 * @typedef {['+', string, number] | ['-', string] | ['p', string[]] | ['x']} Action
 */

import { PROTECTED } from './policy.js';

/** Longer than this is not a plan someone meant to share. Six terms hold at most thirty courses. */
export const MAX_ENCODED = 4000;
const MAX_ACTIONS = 200;

const b64url = {
  /** @param {string} s */
  encode: (s) => btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  /** @param {string} s */
  decode: (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))),
};

/**
 * The log as actions. Timestamps and sequence numbers are dropped: they are facts about the
 * session that produced the plan, not about the plan, and they are regenerated on replay.
 *
 * @param {Event[]} events
 * @returns {Action[]}
 */
export function toActions(events) {
  /** @type {Action[]} */
  const out = [];
  for (const e of events) {
    if (e.type === 'CourseAdded') out.push(['+', e.code, e.term]);
    else if (e.type === 'CourseRemoved') out.push(['-', e.code]);
    else if (e.type === 'PlanCleared') out.push(['x']);
    else if (e.type === 'ConstraintSet' && e.key === PROTECTED) {
      out.push(['p', Array.isArray(e.value) ? e.value.filter((v) => typeof v === 'string') : []]);
    }
  }
  return out;
}

/**
 * Actions to a fragment. Returns an empty string for an empty log, so a caller can tell "nothing
 * to share" from "here is a link to nothing".
 *
 * @param {Event[]} events
 */
export function encode(events) {
  const actions = toActions(events);
  if (!actions.length) return '';
  const s = b64url.encode(JSON.stringify(actions));
  return s.length > MAX_ENCODED ? '' : s;
}

/**
 * A fragment back to actions. **Never throws.** A malformed, truncated, oversized or hostile
 * string is not an error condition on this path — it is a link that someone mangled in a chat
 * window, and the right answer is an empty plan, not a broken page.
 *
 * @param {unknown} fragment
 * @returns {Action[]}
 */
export function decode(fragment) {
  const s = String(fragment ?? '');
  if (!s || s.length > MAX_ENCODED) return [];
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return [];

  let parsed;
  try {
    parsed = JSON.parse(b64url.decode(s));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  /** @type {Action[]} */
  const out = [];
  for (const a of parsed.slice(0, MAX_ACTIONS)) {
    if (!Array.isArray(a)) continue;
    const [kind, one, two] = a;
    if (kind === '+' && typeof one === 'string' && Number.isInteger(two)) out.push(['+', one, two]);
    else if (kind === '-' && typeof one === 'string') out.push(['-', one]);
    else if (kind === 'x') out.push(['x']);
    else if (kind === 'p' && Array.isArray(one)) {
      out.push(['p', one.filter((v) => typeof v === 'string')]);
    }
  }
  return out;
}

/**
 * Replay a shared plan through the tools, and say what did not survive.
 *
 * `call` is passed in rather than imported: `tools.js` needs `encode` from this module, and a
 * module that imported it back would be a cycle. It also makes this testable without a browser.
 *
 * Every action goes through the tool an agent would use, so **a link cannot build a plan the rules
 * would have refused**. Anything refused is counted and named rather than silently dropped: a
 * shared plan that quietly loses two courses is worse than one that says it did.
 *
 * @param {Action[]} actions
 * @param {(name: string, args: any) => unknown} call
 * @returns {{ applied: number, refused: string[] }}
 */
export function replay(actions, call) {
  let applied = 0;
  /** @type {string[]} */
  const refused = [];

  for (const a of actions) {
    const [kind] = a;
    /** @type {string} */
    let out;
    /** @type {string} */
    let what;

    if (kind === '+') { what = a[1]; out = String(call('add_course', { course: a[1], term: a[2] })); }
    else if (kind === '-') { what = a[1]; out = String(call('remove_course', { course: a[1] })); }
    else if (kind === 'p') {
      what = a[1].join(', ') || 'protection';
      out = a[1].map((id) => String(call('protect_track', { track: id }))).join(' ');
    } else { what = 'clear'; out = String(call('undo_to', { step: 0 })); }

    if (/^Refused\./.test(out) || / Rule: [A-Z_]+\./.test(out)) refused.push(what);
    else applied++;
  }
  return { applied, refused };
}

/**
 * The link for a plan. Uses the page's own address when there is one, and the published address
 * when there is not — a tool called from Node has no `location` and should still return something
 * a person could paste.
 *
 * @param {Event[]} events
 */
export function linkFor(events) {
  const code = encode(events);
  if (!code) return '';
  const here = /** @type {any} */ (globalThis).location?.href;
  const base = typeof here === 'string' ? here.split('#')[0] : 'https://hvaler.github.io/cursus/';
  return `${base}#p=${code}`;
}

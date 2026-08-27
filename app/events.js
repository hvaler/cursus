// @ts-check
/**
 * The one decision the rest of the project rests on:
 *
 *   every tool call is an event, and the state is the reduction of the events.
 *
 * From that single choice, three of the four things this project claims come free:
 *
 *   - refusing    → the reducer rejects the event and says why, before state changes
 *   - undoing     → replay the first N events; no per-tool inverse logic
 *   - auditing    → the list itself
 *
 * Grafting undo on afterwards, tool by tool, is a day of work that never quite closes.
 *
 * @typedef {{ type: 'CourseAdded', code: string, term: number }} CourseAdded
 * @typedef {{ type: 'CourseRemoved', code: string }} CourseRemoved
 * @typedef {{ type: 'ConstraintSet', key: string, value: unknown }} ConstraintSet
 * @typedef {{ type: 'PlanCleared' }} PlanCleared
 * @typedef {(CourseAdded|CourseRemoved|ConstraintSet|PlanCleared) & { at: number, seq: number }} Event
 *
 * @typedef {{ selected: Map<string, number>, constraints: Record<string, unknown> }} State
 */

/** @returns {State} */
export const emptyState = () => ({ selected: new Map(), constraints: {} });

/**
 * Fold one event into the state. Pure, total, and it never validates — validation happens in
 * rules.js *before* an event is ever created. A rejected action produces no event at all, which
 * is why replaying the log can never reproduce an illegal state.
 *
 * @param {State} state
 * @param {Event} event
 * @returns {State}
 */
export function apply(state, event) {
  switch (event.type) {
    case 'CourseAdded': {
      const selected = new Map(state.selected);
      selected.set(event.code, event.term);
      return { ...state, selected };
    }
    case 'CourseRemoved': {
      const selected = new Map(state.selected);
      selected.delete(event.code);
      return { ...state, selected };
    }
    case 'ConstraintSet':
      return { ...state, constraints: { ...state.constraints, [event.key]: event.value } };
    case 'PlanCleared':
      return emptyState();
    default:
      return state;
  }
}

/**
 * The state as of the first `upTo` events. Undo is this function with a smaller number, which is
 * the whole implementation of undo.
 *
 * @param {Event[]} log
 * @param {number} [upTo] how many events to apply; defaults to all of them
 */
export function reduce(log, upTo = log.length) {
  return log.slice(0, Math.max(0, Math.min(upTo, log.length))).reduce(apply, emptyState());
}

/** An append-only log with a monotonic sequence. Nothing mutates an event once it is in. */
export class EventLog {
  /** @type {Event[]} */
  #events = [];
  #now;

  /** @param {() => number} [now] injected so tests are not at the mercy of the clock */
  constructor(now = () => Date.now()) {
    this.#now = now;
  }

  /** @param {CourseAdded|CourseRemoved|ConstraintSet|PlanCleared} body */
  append(body) {
    /** @type {Event} */
    const event = { ...body, at: this.#now(), seq: this.#events.length + 1 };
    this.#events.push(event);
    return event;
  }

  /** A copy. Callers must not be able to rewrite history by holding the array. */
  get events() {
    return this.#events.slice();
  }

  get length() {
    return this.#events.length;
  }

  /** @param {number} [upTo] */
  state(upTo) {
    return reduce(this.#events, upTo);
  }

  /**
   * Rewind by discarding everything after `seq`. The events are dropped rather than compensated:
   * an audit trail of "we did X, then we un-did X" is a different product from "the plan is now
   * what it was after step 3", and this one is the second.
   *
   * @param {number} seq keep events with seq <= this
   */
  rewindTo(seq) {
    const dropped = this.#events.filter((e) => e.seq > seq);
    this.#events = this.#events.filter((e) => e.seq <= seq);
    return dropped;
  }
}

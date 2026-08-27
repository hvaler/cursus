// @ts-check
/**
 * The one log everything reads from. The tools write to it, the screen renders from it, and
 * rewinding is a smaller number passed to the same reducer.
 */

import { EventLog } from './events.js';

export const log = new EventLog();

/** @type {Set<() => void>} */
const listeners = new Set();

/** @param {() => void} fn */
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function changed() {
  for (const fn of listeners) fn();
}

export const state = () => log.state();

/**
 * Where a tool call came from. WebMCP gives the handler nothing to identify its caller, so the
 * only thing a page can honestly say is whether *it* made the call. Everything else is assumed
 * to be an agent, and the screen says "assumed" rather than pretending to know.
 * @type {{ source: 'agent' | 'page' }}
 */
export const caller = { source: 'agent' };

/** Run `fn` with calls attributed to the page rather than to an agent. @param {() => any} fn */
export async function asPage(fn) {
  caller.source = 'page';
  try {
    return await fn();
  } finally {
    caller.source = 'agent';
  }
}

/** @type {{ at: number, source: string, tool: string, input: unknown, result: string, refused: boolean }[]} */
export const trace = [];

/**
 * @param {string} tool @param {unknown} input @param {string} result @param {boolean} refused
 */
export function record(tool, input, result, refused) {
  trace.push({ at: Date.now(), source: caller.source, tool, input, result, refused });
  changed();
  return result;
}

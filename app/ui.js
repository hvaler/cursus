// @ts-check
/**
 * The screen. It renders from the same log the tools write to, so there is no second source of
 * truth to drift — and the timeline is not a feature bolted on, it is the log with a cursor.
 */

import { COURSES, TERMS, CREDIT_CAP_PER_TERM, course } from './catalogue.js';
import { creditsIn } from './rules.js';
import { trackStatus, totalCredits } from './queries.js';
import { log, state, trace, onChange, asPage } from './store.js';
import { TOOLS, callFromPage, registerAll } from './tools.js';

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
/**
 * Escape for both text and attribute positions.
 *
 * This is not boilerplate here. Tool arguments arrive from an agent, and an agent can be steered
 * by whoever is talking to it — so `{ course: '"><img src=x onerror=...>' }` is a realistic input,
 * and it reaches the screen through the trace and through refusal text that quotes the code back.
 * Quotes are escaped as well as angle brackets because some of these land inside `title="…"`.
 */
const esc = (/** @type {unknown} */ s) => String(s).replace(/[<>&"']/g, (c) =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** The plan, per term. */
function renderPlan() {
  const s = state();
  const el = $('plan');
  el.innerHTML = TERMS.map((t) => {
    const codes = [...s.selected].filter(([, term]) => term === t).map(([c]) => c).sort();
    const used = creditsIn(s, t);
    const bar = Math.round((used / CREDIT_CAP_PER_TERM) * 100);
    return `<div class="term">
      <div class="term-head"><b>Term ${t}</b>
        <span class="${used > CREDIT_CAP_PER_TERM ? 'over' : 'dim'}">${used}/${CREDIT_CAP_PER_TERM} cr</span></div>
      <div class="gauge"><i style="width:${Math.min(100, bar)}%"></i></div>
      ${codes.length
        ? codes.map((c) => `<div class="chip" title="${esc(course(c)?.name ?? '')}">${c}</div>`).join('')
        : '<div class="empty">—</div>'}
    </div>`;
  }).join('');
  $('totals').textContent =
    `${s.selected.size} course(s) · ${totalCredits(s)} credits`;
}

/** Which specialisations are still reachable. This is the part a timetable cannot show. */
function renderTracks() {
  $('tracks').innerHTML = trackStatus(state()).map((t) => `
    <div class="track ${t.open ? 'open' : 'shut'}">
      <b>${t.open ? '◆' : '◇'} ${esc(t.name)}</b>
      <span class="dim">${t.have.length} held · ${t.reachable.length} still reachable${
        t.open ? '' : ' · <b class="over">closed</b>'}</span>
    </div>`).join('');
}

/** Every tool call, with where it came from and whether it was refused. */
function renderTrace() {
  const el = $('trace');
  if (trace.length === 0) {
    el.innerHTML = '<div class="empty">No tool has been called yet.</div>';
  } else {
    el.innerHTML = trace.slice(-40).map((c) => `
      <div class="call ${c.refused ? 'refused' : ''}">
        <span class="src src-${c.source}">${c.source === 'agent' ? 'AGENT' : 'page'}</span>
        <b>${esc(c.tool)}</b><span class="dim">(${esc(JSON.stringify(c.input))})</span>
        <div class="result">${esc(c.result)}</div>
      </div>`).join('');
    el.scrollTop = el.scrollHeight;
  }
  const agentCalls = trace.filter((c) => c.source === 'agent').length;
  $('trace-count').innerHTML = trace.length === 0 ? '' :
    `${trace.length} call(s), ${agentCalls} attributed to an agent ` +
    `<span class="dim">— the page cannot verify that; WebMCP gives the handler no caller identity</span>`;
}

/** The log, as a timeline you can scrub. Rewinding is the same reducer with a smaller number. */
function renderTimeline() {
  const events = log.events;
  const el = $('timeline');
  if (events.length === 0) {
    el.innerHTML = '<div class="empty">Nothing has happened yet.</div>';
    return;
  }
  el.innerHTML = events.map((e) => {
    const what = e.type === 'CourseAdded' ? `added ${e.code} → term ${e.term}`
      : e.type === 'CourseRemoved' ? `removed ${e.code}`
      : e.type;
    return `<button class="step" data-step="${e.seq}" title="Rewind to just after this step">
        <span class="dim">${e.seq}</span> ${esc(what)}</button>`;
  }).join('') +
  `<button class="step zero" data-step="0"><span class="dim">0</span> empty the plan</button>`;

  for (const b of el.querySelectorAll('.step')) {
    b.addEventListener('click', () => {
      const step = Number(/** @type {HTMLElement} */ (b).dataset.step);
      asPage(() => callFromPage('undo_to', { step }));
    });
  }
}

function renderCatalogue() {
  const s = state();
  $('catalogue').innerHTML = COURSES.map((c) => {
    const held = s.selected.has(c.code);
    return `<button class="course ${held ? 'held' : ''}" data-code="${c.code}" data-term="${c.terms[0]}">
      <b>${c.code}</b> <span class="dim">${esc(c.name)}</span>
      <span class="meta">${c.credits}cr · T${c.terms.join('/')}${
        c.prereqs.length ? ` · needs ${c.prereqs.join(', ')}` : ''}</span>
    </button>`;
  }).join('');

  for (const b of $('catalogue').querySelectorAll('.course')) {
    b.addEventListener('click', () => {
      const el = /** @type {HTMLElement} */ (b);
      const code = String(el.dataset.code);
      const held = el.classList.contains('held');
      asPage(() => callFromPage(held ? 'remove_course' : 'add_course',
        { course: code, term: Number(el.dataset.term) }));
    });
  }
}

function renderAll() {
  renderPlan();
  renderTracks();
  renderTrace();
  renderTimeline();
  renderCatalogue();
}

/**
 * The simulated agent. It exists because the most likely way this is seen is in a browser with no
 * WebMCP at all, and a course planner with no agent in it proves nothing. It calls the tools
 * through the same contract an agent uses — `callFromPage` runs the identical `execute` — so it
 * cannot drift from the real path. It is labelled `page`, never `AGENT`.
 */
/** Filling the first terms is setup, not narrative: it runs without pauses. */
const SETUP = [
  ['CALC-101', 1], ['ALG-101', 1], ['PROG-101', 1], ['DISC-101', 1], ['PHYS-101', 1],
  ['CALC-102', 2], ['PROG-102', 2], ['STAT-101', 2], ['LOGIC-101', 2], ['CIRC-101', 2],
  ['DS-201', 3], ['ARCH-201', 3], ['AUTO-201', 3], ['STAT-201', 3],
];

/** The beats. Each one is a thing the page can do that a rendered timetable cannot. */
const BEATS = [
  ['add_course', { course: 'ADV-301', term: 5 }],          // refused, with the remedy
  ['explain_requirement', { course: 'ADV-301' }],          // the chain nobody can see
  ['what_this_closes', { course: 'NUM-201', term: 3 }],    // one slot, two futures
  ['what_this_closes', { course: 'GEOM-201', term: 3 }],   // and the other future
  ['plan_status', {}],
];

async function runSimulation() {
  const btn = /** @type {HTMLButtonElement} */ ($('simulate'));
  btn.disabled = true;
  btn.textContent = 'Setting up…';

  await asPage(async () => {
    callFromPage('undo_to', { step: 0 });
    for (const [course, term] of SETUP) callFromPage('add_course', { course, term });
  });

  btn.textContent = 'Running…';
  for (const [name, args] of BEATS) {
    await new Promise((r) => setTimeout(r, 1100));
    await asPage(() => callFromPage(String(name), args));
  }

  btn.disabled = false;
  btn.textContent = 'Run it again';
}

/**
 * Keep an eye out for WebMCP arriving late.
 *
 * If a host injects `document.modelContext` after load, a one-shot check at boot would leave every
 * tool unregistered and the page would blame the browser. This costs one timer and removes that
 * whole class of failure.
 *
 * ChatGPT's in-app browser was tested on 2026-08-27 and turned out to attach before load - all ten
 * tools registered there. So this is no longer the fix for a suspected failure; it is insurance
 * against a host that is entitled to attach whenever it likes. See docs/FACTS.md 4.4.
 */
async function keepLookingForWebMCP() {
  for (let i = 0; i < 20; i++) {                    // ten minutes, at thirty-second intervals
    await new Promise((r) => setTimeout(r, 30000));
    const { available, count } = await registerAll();
    if (available) {
      $('status').innerHTML =
        `<b class="ok">WebMCP appeared after load — ${count} tools registered.</b>
         Ask the agent: <code>what does taking NUM-201 in term 3 close off?</code>`;
      return;
    }
  }
}

export async function boot() {
  onChange(renderAll);
  renderAll();

  // Say what is happening while we wait, rather than showing "unavailable" for twelve seconds
  // and then contradicting it.
  $('status').innerHTML = '<b>Looking for WebMCP…</b>';

  const { available, count } = await registerAll();
  $('status').innerHTML = available
    ? `<b class="ok">WebMCP available — ${count} tools registered.</b>
       Ask the agent: <code>what does taking NUM-201 in term 3 close off?</code>`
    : `<b class="no">WebMCP did not appear in this browser.</b>
       Chrome 149+ with <code>chrome://flags/#enable-webmcp-testing</code>, or ChatGPT's in-app
       browser. Everything below still works — the buttons call the same tools an agent would.`;

  // A host that attaches its agent after load, or on navigation, would have missed the window
  // above. Keep looking quietly; if it turns up, register and say so.
  if (!available) {
    keepLookingForWebMCP();
  }

  $('tool-list').innerHTML = TOOLS.map((t) =>
    `<div class="tooldef"><b>${t.name}</b><span class="dim">${esc(t.description)}</span></div>`).join('');

  $('simulate').addEventListener('click', runSimulation);
}

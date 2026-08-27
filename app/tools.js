// @ts-check
/**
 * The tool surface.
 *
 * Every return value here is a **string a model reads**, so these strings are the interface —
 * not a serialisation of it. Three rules, all of them earned on 2026-08-27 rather than assumed:
 *
 *   1. A mutation reports the state it produced, never an acknowledgement. Otherwise the agent's
 *      picture of the plan drifts from the page's and neither of them knows.
 *   2. A refusal carries what, why, the remedy, a rule handle, and what happened to the state.
 *      The remedy is the part the model acts on; without it, it reports a failure and stops.
 *   3. A query that could not compute something says so in words, rather than returning a
 *      confident empty list.
 */

import { BY_CODE, CREDIT_CAP_PER_TERM, TRACKS, course } from './catalogue.js';
import { whyNotAdd, whyNotRemove, describe, quoteInput } from './rules.js';
import {
  requirementChain, search, trackStatus, whatThisCloses, totalCredits, canStillPlace,
} from './queries.js';
import { log, state, record, caller } from './store.js';
import {
  PROTECTED, whyNotAllowedByPolicy, whyNotProtect, whyNotRelease, withProtection, describePolicy,
} from './policy.js';
import { planForTrack, explainInfeasible } from './solve.js';

/** A newline, named. Building these strings through a shell has mangled the escape twice. */
const NL = String.fromCharCode(10);

const line = (/** @type {string} */ code) => {
  const c = course(code);
  return c ? `${code} — ${c.name}, ${c.credits} credits, term ${c.terms.join('/')}` : code;
};

/** @type {{name: string, description: string, inputSchema: object, execute: (a: any) => Promise<string>|string}[]} */
export const TOOLS = [
  // ------------------------------------------------------------------ queries
  {
    name: 'search_courses',
    description:
      'Search the course catalogue by free text, subject area, term or credit limit. Returns the ' +
      'matching courses with their credits, the term they run in, and their prerequisites. Use ' +
      'this before adding anything, because the screen only shows part of the catalogue.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Free text over code and name, e.g. "rendering"' },
        area: { type: 'string', description: 'maths, software, systems, data, theory, graphics, physics, general' },
        term: { type: 'number', description: 'Only courses taught in this term, 1 to 6' },
      },
    },
    execute: ({ text, area, term }) => {
      const found = search({ text, area, term });
      const out = found.length === 0
        ? 'No course matches that. The catalogue has 40 courses across 6 terms; try a broader term or area.'
        : `${found.length} course(s):\n` + found.map((c) =>
            `  ${line(c.code)}` +
            (c.prereqs.length ? ` — requires ${c.prereqs.join(', ')}` : ' — no prerequisites')
          ).join('\n');
      return record('search_courses', { text, area, term }, out, false);
    },
  },

  {
    name: 'explain_requirement',
    description:
      'Explain what a course requires: the full prerequisite chain, how deep it is, and which ' +
      'links are still missing from the current plan. The chain is not visible on the page.',
    inputSchema: {
      type: 'object',
      properties: { course: { type: 'string', description: 'Course code, e.g. MLOPS-401' } },
      required: ['course'],
    },
    execute: ({ course: code }) => {
      const r = requirementChain(state(), String(code ?? '').toUpperCase());
      const out = !r
        ? `No course in the catalogue has the code ${quoteInput(code)}. Use search_courses to find the right one.`
        : r.missing.length === 0
          ? `${r.code} (${r.name}) has everything it needs: its prerequisites are already in the plan. Chain depth ${r.depth}.`
          : `${r.code} (${r.name}) sits at the end of a chain ${r.depth} deep. Still missing from ` +
            `the plan, in the order they must be taken:\n` +
            r.missing.map((m, i) => `  ${i + 1}. ${line(m)}`).join('\n') +
            `\nThat is ${r.missing.reduce((n, m) => n + (course(m)?.credits ?? 0), 0)} credits of ` +
            `prerequisites before ${r.code} itself.`;
      return record('explain_requirement', { course: code }, out, false);
    },
  },

  {
    name: 'what_this_closes',
    description:
      'Say what committing to a course would close off. Answers the question a timetable cannot: ' +
      'which specialisation tracks stop being completable if this course takes the slot, because ' +
      'of prerequisite chains and the credit cap in later terms. Use it before advising a choice.',
    inputSchema: {
      type: 'object',
      properties: {
        course: { type: 'string', description: 'Course code being considered' },
        term: { type: 'number', description: 'Which term it would go in, 1 to 6' },
      },
      required: ['course'],
    },
    execute: ({ course: code, term }) => {
      const c = String(code ?? '').toUpperCase();
      const r = whatThisCloses(state(), c, term);
      let out;
      if (r.unknown) {
        out = `No course in the catalogue has the code ${quoteInput(code)}, so there is nothing to weigh up.`;
      } else if (r.closed.length === 0 && r.narrowed.length === 0) {
        out = `Taking ${c}${term ? ` in term ${term}` : ''} closes no track. Every specialisation ` +
              `that is reachable now stays reachable.`;
      } else {
        const parts = [];
        if (r.closed.length) {
          parts.push(
            `Taking ${c}${term ? ` in term ${term}` : ''} would CLOSE ` +
            r.closed.map((t) => `"${t.name}"`).join(' and ') + '. ' +
            r.closed.map((t) =>
              `${t.name} would have ${t.have.length} course(s) held and none still reachable`
            ).join('; ') + '.'
          );
        }
        if (r.narrowed.length) {
          parts.push(
            'It would also narrow ' +
            r.narrowed.map((x) => `"${x.t.name}" (loses ${x.lost.join(', ')})`).join(' and ') + '.'
          );
        }
        parts.push('This is not reversible once the term is full, which is why it is worth saying now.');
        out = parts.join(' ');
      }
      return record('what_this_closes', { course: code, term }, out, false);
    },
  },

  {
    name: 'plan_status',
    description:
      'The current plan: what is in it, per term, with credits, plus which specialisation tracks ' +
      'are still open and which are already closed off.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => {
      const s = state();
      const tracks = trackStatus(s);
      const open = tracks.filter((t) => t.open);
      const shut = tracks.filter((t) => !t.open);
      const out = [
        describe(s),
        `Total ${totalCredits(s)} credits, cap ${CREDIT_CAP_PER_TERM} per term.`,
        open.length ? `Still open: ${open.map((t) => t.name).join(', ')}.` : 'No track is still open.',
        shut.length ? `Already closed: ${shut.map((t) => t.name).join(', ')}.` : '',
        describePolicy(s),
      ].filter(Boolean).join(' ');
      return record('plan_status', {}, out, false);
    },
  },

  // ------------------------------------------------------------------ actions
  {
    name: 'add_course',
    description:
      'Add a course to the plan, in a given term. May refuse — for a missing prerequisite, a ' +
      'timetable clash, a full term, or a course not taught in that term — and the refusal says ' +
      'what would unblock it.',
    inputSchema: {
      type: 'object',
      properties: {
        course: { type: 'string', description: 'Course code, e.g. CALC-101' },
        term: { type: 'number', description: 'Term 1 to 6. Defaults to the first term it runs in.' },
      },
      required: ['course'],
    },
    execute: ({ course: code, term }) => {
      const c = String(code ?? '').toUpperCase();
      const wanted = term ?? BY_CODE.get(c)?.terms[0];
      const no = whyNotAdd(state(), c, wanted);
      if (no) return record('add_course', { course: code, term }, no.text, true);

      // The university's rules passed. Now the student's own, which are a different kind of no.
      const against = whyNotAllowedByPolicy(state(), c, wanted);
      if (against) return record('add_course', { course: code, term }, against.text, true);

      log.append({ type: 'CourseAdded', code: c, term: /** @type {number} */ (wanted) });
      const out = `Added ${c} to term ${wanted}. ${describe(state())}`;
      return record('add_course', { course: code, term }, out, false);
    },
  },

  {
    name: 'remove_course',
    description:
      'Remove a course from the plan. Refuses if something already in the plan depends on it, ' +
      'and says which.',
    inputSchema: {
      type: 'object',
      properties: { course: { type: 'string', description: 'Course code' } },
      required: ['course'],
    },
    execute: ({ course: code }) => {
      const c = String(code ?? '').toUpperCase();
      const no = whyNotRemove(state(), c);
      if (no) return record('remove_course', { course: code }, no.text, true);

      log.append({ type: 'CourseRemoved', code: c });
      const out = `Removed ${c}. ${describe(state())}`;
      return record('remove_course', { course: code }, out, false);
    },
  },

  {
    name: 'protect_track',
    description:
      'Hold a specialisation open. Once protected, any course that would close it is refused — ' +
      'including when the same person asks for it later. Use this when the student has said what ' +
      'they are not willing to give up, before exploring anything that might cost it. Pass ' +
      'protect: false to release it again.',
    inputSchema: {
      type: 'object',
      properties: {
        track: { type: 'string', description: 'Track id: data, systems, graphics or theory.' },
        protect: { type: 'boolean', description: 'True to protect (the default), false to release.' },
      },
      required: ['track'],
    },
    execute: ({ track: id, protect }) => {
      const wanted = protect === undefined ? true : Boolean(protect);
      const t = String(id ?? '').toLowerCase().trim();
      const before = state();

      const no = wanted ? whyNotProtect(before, t) : whyNotRelease(before, t);
      if (no) return record('protect_track', { track: id, protect }, no.text, true);

      log.append({ type: 'ConstraintSet', key: PROTECTED, value: withProtection(before, t, wanted) });

      const label = TRACKS.find((x) => x.id === t)?.name ?? t;
      const now = describePolicy(state());
      const out = wanted
        ? `Protecting "${label}". Anything that would close it is refused from now on, including ` +
          `if you ask for it yourself. ${now}`
        : `Released "${label}". It can be closed like any other now. ` +
          `${now || 'Nothing is protected.'}`;
      return record('protect_track', { track: id, protect }, out, false);
    },
  },

  // ------------------------------------------------------------------ planning towards a goal
  {
    name: 'plan_for_track',
    description:
      'Work out what still has to be taken to complete a specialisation track, and in which ' +
      'terms. Returns a concrete list, or — if it cannot be done from here — the course that ' +
      'blocks it and what it would cost to unblock. Track ids: data, systems, graphics, theory.',
    inputSchema: {
      type: 'object',
      properties: { track: { type: 'string', description: 'data, systems, graphics or theory' } },
      required: ['track'],
    },
    execute: ({ track }) => {
      const id = String(track ?? '').toLowerCase().trim();
      const r = planForTrack(state(), id);
      let out;
      if (r.unknownTrack) {
        out = `There is no track called ${quoteInput(track)}. The four are: ` +
              TRACKS.map((t) => `${t.id} (${t.name})`).join(', ') + '.';
      } else if (r.ok && r.added.length === 0) {
        out = `That track is already complete in this plan; nothing more is needed.`;
      } else if (r.ok) {
        const byTerm = new Map();
        for (const [c, t] of r.added) {
          if (!byTerm.has(t)) byTerm.set(t, []);
          byTerm.get(t).push(c);
        }
        const perTerm = [...byTerm.keys()].sort((a, b) => a - b)
          .map((t) => `  term ${t}: ${byTerm.get(t).sort().join(', ')}`);
        out = [
          `It can be done. ${r.added.length} course(s) to add:`,
          ...perTerm,
          'Every placement above was checked against the same rules add_course uses, so none of ' +
          'them would be refused.',
        ].join(NL);
      } else {
        out = `It cannot be done from here — ${r.needed} more course(s) would be needed and the ` +
              `plan has no room for them. Call explain_infeasibility for the binding constraint ` +
              `and what it would cost to lift it.`;
      }
      return record('plan_for_track', { track }, out, !r.ok && !r.unknownTrack);
    },
  },

  {
    name: 'explain_infeasibility',
    description:
      'When a specialisation cannot be completed, say exactly why: which course cannot be placed, ' +
      'which rule stops it, and what would have to be dropped to make room — with what each of ' +
      'those trades would close in turn. Use it instead of telling a student "it is not possible".',
    inputSchema: {
      type: 'object',
      properties: { track: { type: 'string', description: 'data, systems, graphics or theory' } },
      required: ['track'],
    },
    execute: ({ track }) => {
      const id = String(track ?? '').toLowerCase().trim();
      const r = explainInfeasible(state(), id);
      let out;
      if (r === null) {
        const known = TRACKS.some((t) => t.id === id);
        out = known
          ? `That track is still reachable from here — there is nothing to explain. ` +
            `Call plan_for_track to see what it would take.`
          : `There is no track called ${quoteInput(track)}. The four are: ` +
            TRACKS.map((t) => t.id).join(', ') + '.';
      } else if (!r.blocker) {
        out = `${r.track.name} needs ${r.needed} more course(s) and none can be placed, but no ` +
              `single course could be identified as the blocker. That is a gap in this planner, ` +
              `not a proof that nothing would work.`;
      } else {
        const lines = [
          `${r.track.name} cannot be completed from here. The blocker is ${r.blocker.code}` +
          `${course(r.blocker.code) ? ` (${course(r.blocker.code)?.name})` : ''}.`,
          `Why: ${r.blocker.why}`,
        ];
        if (r.repairs.length === 0) {
          lines.push('Nothing in the plan can be dropped to make room, so this one is settled.');
        } else {
          lines.push(`What would make room, and what each costs:`);
          for (const rep of r.repairs) {
            lines.push(`  drop ${rep.drop} from term ${rep.term} — frees ${rep.frees} credits — ` +
              (rep.closes.length
                ? `but then closes: ${rep.closes.join(', ')}`
                : 'and closes nothing else'));
          }
          const free = r.repairs.filter((x) => x.closes.length === 0);
          lines.push(free.length
            ? `${free.length} of those cost nothing else.`
            : `Every one of them costs another specialisation. There is no free version of this trade.`);
        }
        out = lines.join(NL);
      }
      return record('explain_infeasibility', { track }, out, false);
    },
  },

  // ------------------------------------------------------------------ the record, and undoing it
  {
    name: 'list_actions',
    description:
      'Everything that has been done to this plan so far, in order, in plain language. Each entry ' +
      'has a step number that undo_to accepts.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => {
      const events = log.events;
      const out = events.length === 0
        ? 'Nothing has been done to this plan yet.'
        : events.map((e) => {
            const held = /** @type {any} */ (e).value;
            const what = e.type === 'CourseAdded' ? `added ${e.code} to term ${e.term}`
              : e.type === 'CourseRemoved' ? `removed ${e.code}`
              : e.type === 'PlanCleared' ? 'cleared the plan'
              : /** @type {any} */ (e).key === PROTECTED
                ? (Array.isArray(held) && held.length
                    ? `protected: ${held.map((id) => TRACKS.find((t) => t.id === id)?.name ?? id).join(', ')}`
                    : 'released every protection')
                : `set ${/** @type {any} */ (e).key}`;
            return `  step ${e.seq}: ${what}`;
          }).join('\n') + `\nundo_to takes any of those step numbers; step 0 empties the plan.`;
      return record('list_actions', {}, out, false);
    },
  },

  {
    name: 'undo_to',
    description:
      'Rewind the plan to how it was after a given step, discarding everything after it. Returns ' +
      'the plan that results, because after a rewind your idea of the state is out of date.',
    inputSchema: {
      type: 'object',
      properties: {
        step: { type: 'number', description: 'Keep steps up to and including this one. 0 empties the plan.' },
      },
      required: ['step'],
    },
    execute: ({ step }) => {
      const n = Number(step);
      if (!Number.isInteger(n) || n < 0 || n > log.length) {
        const out = `Refused. There is no step ${step}; the plan has ${log.length} step(s). ` +
                    `To unblock it: call list_actions and pick a step number from it. ` +
                    `Rule: NO_SUCH_STEP. The plan was not changed.`;
        return record('undo_to', { step }, out, true);
      }
      const dropped = log.rewindTo(n);
      const out = dropped.length === 0
        ? `Nothing to undo: step ${n} is already the latest. ${describe(state())}`
        : `Rewound to step ${n}, discarding ${dropped.length} action(s): ` +
          `${dropped.map((e) => /** @type {any} */ (e).code
              ?? (e.type === 'ConstraintSet' ? 'a change to what is protected' : e.type)).join(', ')}. ` +
          `${describe(state())}`;
      return record('undo_to', { step }, out, false);
    },
  },
];

/** @type {string[]} */
export const registered = [];

/**
 * Wait for `document.modelContext` to exist.
 *
 * Reading it once at boot is a bet that the browser injected the API before this script ran. A
 * host that attaches its agent *after* the page renders — which is a reasonable thing for an
 * in-app browser to do — would lose every tool, silently, and the page would sit there saying
 * WebMCP was unavailable. Nothing about that failure would point at the host.
 *
 * @param {number} [ms] how long to keep looking
 */
export function waitForModelContext(ms = 12000) {
  const has = () => Boolean(/** @type {any} */ (document).modelContext?.registerTool);
  if (has()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (has()) { clearInterval(timer); resolve(true); }
      else if (Date.now() - started > ms) { clearInterval(timer); resolve(false); }
    }, 200);
  });
}

/** Register everything with WebMCP, waiting for it to turn up if it is not there yet. */
export async function registerAll() {
  if (registered.length) return { available: true, count: registered.length };
  await waitForModelContext();
  const mc = /** @type {any} */ (document).modelContext;
  if (!mc?.registerTool) return { available: false, count: 0 };
  for (const t of TOOLS) {
    await mc.registerTool({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      execute: async (/** @type {any} */ args) => t.execute(args ?? {}),
    });
    registered.push(t.name);
  }
  return { available: true, count: registered.length };
}

/** Call a tool by name from the page itself. @param {string} name @param {any} args */
export function callFromPage(name, args) {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`no tool named ${name}`);
  return t.execute(args ?? {});
}

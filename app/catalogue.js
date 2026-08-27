// @ts-check
/**
 * The catalogue. Synthetic, and deliberately not a real university's — but the shape is real:
 * a prerequisite graph four levels deep, courses that only run in one term, timetable slots that
 * genuinely collide, and tracks that need a chain of courses rather than a shopping list.
 *
 * The depth is the point. `what_this_closes` has nothing to say about a two-level graph.
 *
 * @typedef {{ day: 'Mon'|'Tue'|'Wed'|'Thu'|'Fri', from: number, to: number }} Slot
 * @typedef {{
 *   code: string, name: string, credits: number,
 *   terms: number[], prereqs: string[], slots: Slot[], area: string
 * }} Course
 * @typedef {{ id: string, name: string, needs: string[], minimum: number }} Track
 */

const s = (/** @type {Slot['day']} */ day, /** @type {number} */ from, /** @type {number} */ to) =>
  ({ day, from, to });

/** @type {Course[]} */
export const COURSES = [
  // ---- Term 1 · foundations -------------------------------------------------------------
  { code: 'CALC-101', name: 'Calculus I', credits: 6, terms: [1], prereqs: [], area: 'maths',
    slots: [s('Mon', 9, 11), s('Wed', 9, 11)] },
  { code: 'ALG-101', name: 'Linear Algebra', credits: 6, terms: [1], prereqs: [], area: 'maths',
    slots: [s('Tue', 9, 11), s('Thu', 9, 11)] },
  { code: 'PROG-101', name: 'Programming I', credits: 6, terms: [1], prereqs: [], area: 'software',
    slots: [s('Mon', 11, 13), s('Wed', 11, 13)] },
  { code: 'DISC-101', name: 'Discrete Mathematics', credits: 6, terms: [1], prereqs: [], area: 'theory',
    slots: [s('Tue', 11, 13), s('Thu', 11, 13)] },
  { code: 'PHYS-101', name: 'Physics I', credits: 6, terms: [1], prereqs: [], area: 'physics',
    slots: [s('Fri', 9, 13)] },

  // ---- Term 2 ---------------------------------------------------------------------------
  { code: 'CALC-102', name: 'Calculus II', credits: 6, terms: [2], prereqs: ['CALC-101'], area: 'maths',
    slots: [s('Mon', 9, 11), s('Wed', 9, 11)] },
  { code: 'PROG-102', name: 'Programming II', credits: 6, terms: [2], prereqs: ['PROG-101'], area: 'software',
    slots: [s('Mon', 11, 13), s('Wed', 11, 13)] },
  { code: 'STAT-101', name: 'Probability', credits: 6, terms: [2], prereqs: ['CALC-101'], area: 'maths',
    slots: [s('Tue', 9, 11)] },
  { code: 'LOGIC-101', name: 'Logic and Computability', credits: 6, terms: [2], prereqs: ['DISC-101'], area: 'theory',
    slots: [s('Thu', 9, 11)] },
  { code: 'CIRC-101', name: 'Digital Circuits', credits: 6, terms: [2], prereqs: ['PHYS-101'], area: 'systems',
    slots: [s('Fri', 9, 13)] },

  // ---- Term 3 ---------------------------------------------------------------------------
  { code: 'DS-201', name: 'Data Structures', credits: 6, terms: [3], prereqs: ['PROG-102', 'DISC-101'], area: 'software',
    slots: [s('Mon', 9, 11), s('Wed', 9, 11)] },
  { code: 'ARCH-201', name: 'Computer Architecture', credits: 6, terms: [3], prereqs: ['CIRC-101'], area: 'systems',
    slots: [s('Tue', 9, 11), s('Thu', 9, 11)] },
  { code: 'STAT-201', name: 'Statistical Inference', credits: 6, terms: [3], prereqs: ['STAT-101'], area: 'maths',
    slots: [s('Mon', 11, 13)] },
  { code: 'NUM-201', name: 'Numerical Methods', credits: 6, terms: [3], prereqs: ['CALC-102', 'ALG-101'], area: 'maths',
    slots: [s('Wed', 11, 13)] },
  { code: 'AUTO-201', name: 'Automata and Languages', credits: 6, terms: [3], prereqs: ['LOGIC-101'], area: 'theory',
    slots: [s('Thu', 11, 13)] },
  { code: 'GEOM-201', name: 'Geometry for Graphics', credits: 6, terms: [3], prereqs: ['ALG-101'], area: 'graphics',
    slots: [s('Fri', 9, 11)] },

  // ---- Term 4 ---------------------------------------------------------------------------
  { code: 'ALGO-202', name: 'Algorithms', credits: 6, terms: [4], prereqs: ['DS-201'], area: 'software',
    slots: [s('Mon', 9, 11), s('Wed', 9, 11)] },
  { code: 'OS-202', name: 'Operating Systems', credits: 6, terms: [4], prereqs: ['ARCH-201', 'PROG-102'], area: 'systems',
    slots: [s('Tue', 9, 11), s('Thu', 9, 11)] },
  { code: 'DB-202', name: 'Databases', credits: 6, terms: [4], prereqs: ['DS-201'], area: 'data',
    slots: [s('Mon', 11, 13)] },
  { code: 'ML-202', name: 'Machine Learning', credits: 6, terms: [4], prereqs: ['STAT-201', 'NUM-201'], area: 'data',
    slots: [s('Wed', 11, 13)] },
  { code: 'COMP-202', name: 'Compilers', credits: 6, terms: [4], prereqs: ['AUTO-201', 'DS-201'], area: 'theory',
    slots: [s('Thu', 11, 13)] },
  { code: 'RENDER-202', name: 'Rendering I', credits: 6, terms: [4], prereqs: ['GEOM-201', 'PROG-102'], area: 'graphics',
    slots: [s('Fri', 9, 11)] },

  // ---- Term 5 · where the tracks separate ------------------------------------------------
  { code: 'NET-301', name: 'Computer Networks', credits: 6, terms: [5], prereqs: ['OS-202'], area: 'systems',
    slots: [s('Mon', 9, 11)] },
  { code: 'DIST-301', name: 'Distributed Systems', credits: 6, terms: [5], prereqs: ['OS-202', 'ALGO-202'], area: 'systems',
    slots: [s('Tue', 9, 11)] },
  { code: 'BIGD-301', name: 'Large-Scale Data', credits: 6, terms: [5], prereqs: ['DB-202'], area: 'data',
    slots: [s('Mon', 9, 11)] },              // clashes with NET-301, on purpose
  { code: 'DEEP-301', name: 'Deep Learning', credits: 6, terms: [5], prereqs: ['ML-202'], area: 'data',
    slots: [s('Wed', 9, 11)] },
  { code: 'ADV-301', name: 'Advanced Calculus', credits: 6, terms: [5], prereqs: ['CALC-102', 'NUM-201'], area: 'maths',
    slots: [s('Thu', 9, 11)] },
  { code: 'VERIF-301', name: 'Formal Verification', credits: 6, terms: [5], prereqs: ['COMP-202'], area: 'theory',
    slots: [s('Wed', 9, 11)] },              // clashes with DEEP-301, on purpose
  { code: 'RENDER-301', name: 'Rendering II', credits: 6, terms: [5], prereqs: ['RENDER-202'], area: 'graphics',
    slots: [s('Fri', 9, 11)] },
  { code: 'ANIM-301', name: 'Animation Systems', credits: 6, terms: [5], prereqs: ['RENDER-202', 'ALGO-202'], area: 'graphics',
    slots: [s('Thu', 11, 13)] },

  // ---- Term 6 · the deep ends -------------------------------------------------------------
  { code: 'CLOUD-401', name: 'Cloud Infrastructure', credits: 6, terms: [6], prereqs: ['DIST-301', 'NET-301'], area: 'systems',
    slots: [s('Mon', 9, 11)] },
  { code: 'MLOPS-401', name: 'ML in Production', credits: 6, terms: [6], prereqs: ['DEEP-301', 'BIGD-301'], area: 'data',
    slots: [s('Tue', 9, 11)] },
  { code: 'NLP-401', name: 'Natural Language Processing', credits: 6, terms: [6], prereqs: ['DEEP-301'], area: 'data',
    slots: [s('Wed', 9, 11)] },
  { code: 'PROOF-401', name: 'Proof Assistants', credits: 6, terms: [6], prereqs: ['VERIF-301'], area: 'theory',
    slots: [s('Thu', 9, 11)] },
  { code: 'RT-401', name: 'Real-Time Graphics', credits: 6, terms: [6], prereqs: ['RENDER-301'], area: 'graphics',
    slots: [s('Fri', 9, 11)] },
  { code: 'SIM-401', name: 'Physical Simulation', credits: 6, terms: [6], prereqs: ['ANIM-301', 'ADV-301'], area: 'graphics',
    slots: [s('Fri', 11, 13)] },
  { code: 'SEC-401', name: 'Security', credits: 6, terms: [6], prereqs: ['NET-301'], area: 'systems',
    slots: [s('Mon', 11, 13)] },
  { code: 'OPT-401', name: 'Optimisation', credits: 6, terms: [6], prereqs: ['ADV-301', 'ALGO-202'], area: 'maths',
    slots: [s('Tue', 11, 13)] },
  { code: 'ETH-401', name: 'Ethics of Computing', credits: 3, terms: [5, 6], prereqs: [], area: 'general',
    slots: [s('Fri', 15, 17)] },
  { code: 'PROJ-401', name: 'Final Project', credits: 12, terms: [6], prereqs: ['ALGO-202', 'OS-202'], area: 'general',
    slots: [s('Thu', 15, 19)] },
];

/**
 * A track is not a shopping list: it needs a minimum from a set whose members sit at the end of
 * chains. That is what makes closing one possible without anyone noticing.
 * @type {Track[]}
 */
export const TRACKS = [
  { id: 'data', name: 'Data and Machine Learning', minimum: 3,
    needs: ['ML-202', 'DEEP-301', 'BIGD-301', 'MLOPS-401', 'NLP-401', 'DB-202'] },
  { id: 'systems', name: 'Systems and Infrastructure', minimum: 3,
    needs: ['OS-202', 'NET-301', 'DIST-301', 'CLOUD-401', 'SEC-401', 'ARCH-201'] },
  { id: 'graphics', name: 'Graphics and Animation', minimum: 3,
    needs: ['RENDER-202', 'RENDER-301', 'ANIM-301', 'RT-401', 'SIM-401', 'GEOM-201'] },
  { id: 'theory', name: 'Theory and Verification', minimum: 3,
    needs: ['AUTO-201', 'COMP-202', 'VERIF-301', 'PROOF-401', 'LOGIC-101'] },
];

export const TERMS = [1, 2, 3, 4, 5, 6];
export const CREDIT_CAP_PER_TERM = 30;

/** @type {Map<string, Course>} */
export const BY_CODE = new Map(COURSES.map((c) => [c.code, c]));

/** @param {string} code */
export const course = (code) => BY_CODE.get(code);

/** Every course that names `code` as a prerequisite, directly. @param {string} code */
export const dependents = (code) => COURSES.filter((c) => c.prereqs.includes(code));

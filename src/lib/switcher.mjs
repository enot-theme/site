// Pure logic of the client theme/vision switcher, split from its DOM
// wiring (in Base.astro's bundled script) so the decisions are unit-
// tested without a browser. Every function is a pure transform of
// explicit inputs; the wiring only reads the environment, applies the
// returned CSS variables and runs the returned effects.

export const MODES = ['dark', 'light'];

// Starting mode/vision from the environment, in ascending precedence:
// default dark/normal, then the OS light preference, then a saved mode,
// then an explicit ?mode= query. Vision comes only from a ?vision= that
// the palette actually carries; anything else stays normal.
export function initialState(env, visionData) {
  const state = { mode: 'dark', vision: 'normal' };
  if (env.prefersLight) state.mode = 'light';
  if (env.saved === 'dark' || env.saved === 'light') state.mode = env.saved;
  const q = new URLSearchParams(env.search || '');
  const qMode = q.get('mode');
  if (qMode === 'dark' || qMode === 'light') state.mode = qMode;
  const qVision = q.get('vision');
  if (qVision && visionData.enot.dark[qVision]) state.vision = qVision;
  return state;
}

// The CSS custom properties for a state, as [name, value] pairs: the
// role palette rendered through the selected vision, then the gruvbox
// comparison swatches (--gruv0..6).
export function paletteVars(visionData, state) {
  const set = visionData.enot[state.mode][state.vision];
  const vars = Object.keys(set).map((k) => [`--${k}`, set[k]]);
  visionData.gruvbox[state.mode][state.vision].forEach((h, i) => {
    vars.push([`--gruv${i}`, h]);
  });
  return vars;
}

// Route a click on an element's dataset to the next state, the side
// effects to run (persist the mode, copy a hex) and whether the palette
// must be re-applied. Unknown targets are inert.
export function reduceClick(state, dataset) {
  if (dataset.mode) {
    return {
      state: { ...state, mode: dataset.mode },
      effects: [{ type: 'persist', value: dataset.mode }],
      changed: true,
    };
  }
  if (dataset.vision) {
    return { state: { ...state, vision: dataset.vision }, effects: [], changed: true };
  }
  if (dataset.hex) {
    return { state, effects: [{ type: 'copy', value: dataset.hex }], changed: false };
  }
  return { state, effects: [], changed: false };
}

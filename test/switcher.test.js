// Unit tests for the switcher logic extracted from Base.astro. Real
// vision data from the bundle keeps the fixtures honest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialState, paletteVars, reduceClick, MODES } from '../src/lib/switcher.mjs';

const site = JSON.parse(
  readFileSync(new URL('../src/data/site.json', import.meta.url), 'utf8'),
);
const V = site.vision;

test('MODES is dark then light', () => {
  assert.deepEqual(MODES, ['dark', 'light']);
});

test('initialState defaults to dark / normal', () => {
  assert.deepEqual(initialState({}, V), { mode: 'dark', vision: 'normal' });
});

test('initialState precedence: query > saved > OS > default', () => {
  assert.equal(initialState({ prefersLight: true }, V).mode, 'light');
  // a saved choice overrides the OS preference
  assert.equal(initialState({ prefersLight: true, saved: 'dark' }, V).mode, 'dark');
  // a garbage saved value is ignored, OS preference stands
  assert.equal(initialState({ prefersLight: true, saved: 'bogus' }, V).mode, 'light');
  // an explicit ?mode= wins over the saved choice
  assert.equal(initialState({ saved: 'dark', search: '?mode=light' }, V).mode, 'light');
  // a garbage ?mode= is ignored
  assert.equal(initialState({ saved: 'light', search: '?mode=weird' }, V).mode, 'light');
  assert.equal(initialState({ search: '?mode=weird' }, V).mode, 'dark');
});

test('initialState only accepts a vision the palette carries', () => {
  assert.equal(initialState({ search: '?vision=protanopia' }, V).vision, 'protanopia');
  assert.equal(initialState({ search: '?vision=tritanopia' }, V).vision, 'tritanopia');
  assert.equal(initialState({ search: '?vision=nope' }, V).vision, 'normal');
  assert.equal(initialState({ search: '' }, V).vision, 'normal');
});

test('paletteVars emits the role palette plus 7 gruvbox swatches', () => {
  const vars = paletteVars(V, { mode: 'dark', vision: 'normal' });
  const map = new Map(vars);
  assert.equal(vars.length, Object.keys(V.enot.dark.normal).length + 7);
  assert.ok(vars.every(([name]) => name.startsWith('--')));
  assert.equal(map.get('--bg0'), V.enot.dark.normal.bg0);
  assert.equal(map.get('--gruv0'), V.gruvbox.dark.normal[0]);
  assert.equal(map.get('--gruv6'), V.gruvbox.dark.normal[6]);
});

test('paletteVars renders through the selected mode and vision', () => {
  const map = new Map(paletteVars(V, { mode: 'light', vision: 'deuteranopia' }));
  assert.equal(map.get('--red'), V.enot.light.deuteranopia.red);
  assert.equal(map.get('--gruv3'), V.gruvbox.light.deuteranopia[3]);
});

test('reduceClick: mode changes state, persists, re-applies', () => {
  const r = reduceClick({ mode: 'dark', vision: 'protanopia' }, { mode: 'light' });
  assert.deepEqual(r.state, { mode: 'light', vision: 'protanopia' }); // vision kept
  assert.deepEqual(r.effects, [{ type: 'persist', value: 'light' }]);
  assert.equal(r.changed, true);
});

test('reduceClick: vision changes state without an effect', () => {
  const r = reduceClick({ mode: 'light', vision: 'normal' }, { vision: 'aqua-less' });
  assert.equal(r.state.vision, 'aqua-less');
  assert.equal(r.state.mode, 'light'); // mode kept
  assert.deepEqual(r.effects, []);
  assert.equal(r.changed, true);
});

test('reduceClick: hex copies without changing state or re-applying', () => {
  const s = { mode: 'dark', vision: 'normal' };
  const r = reduceClick(s, { hex: '#daa3a2' });
  assert.deepEqual(r.state, s);
  assert.deepEqual(r.effects, [{ type: 'copy', value: '#daa3a2' }]);
  assert.equal(r.changed, false);
});

test('reduceClick: unknown target is inert', () => {
  const s = { mode: 'dark', vision: 'normal' };
  const r = reduceClick(s, {});
  assert.deepEqual(r.state, s);
  assert.deepEqual(r.effects, []);
  assert.equal(r.changed, false);
});

test('reduceClick does not mutate the input state', () => {
  const s = { mode: 'dark', vision: 'normal' };
  reduceClick(s, { mode: 'light' });
  assert.deepEqual(s, { mode: 'dark', vision: 'normal' });
});

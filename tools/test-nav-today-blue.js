// The saturated-blue exception is deliberately narrower than the default ink.
const fs = require('fs'), path = require('path'), assert = require('assert');
const { JSDOM } = require('jsdom');
const dir = process.argv[2] || '.';
const css = fs.readFileSync(path.join(dir, 'css/app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const selector = ':root[data-skin="minimal"][data-bar="dark"] nav.dayclosed button[data-v="today"].on .ng svg .sq';
const rule = css.slice(css.indexOf(selector) + selector.length).match(/^\{([^}]+)\}/);
assert(css.includes(selector) && rule, 'selected closed Today has a dark-bar exception');
assert.strictEqual(rule[1].trim(), 'fill:var(--accent)', 'use the main accent; do not alter layout or other colours');
assert(css.indexOf(selector) > css.indexOf(':root[data-skin="minimal"] nav.dayclosed'), 'exception follows the default pale fill');
const dom = new JSDOM(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'));
const d = dom.window.document, root = d.documentElement, nav = d.querySelector('#nav');
root.dataset.skin = 'minimal';
let checked = 0;
for (const theme of ['light', 'dark']) for (const bar of ['light', 'dark']) {
  root.dataset.theme = theme; root.dataset.bar = bar;
  for (const selected of ['today', 'lift', 'stats', 'history']) {
    nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === selected));
    for (const state of ['', 'dayclosed', 'resting']) {
      nav.className = state;
      const matches = d.querySelectorAll(selector);
      const expected = bar === 'dark' && selected === 'today' && state === 'dayclosed';
      assert.strictEqual(matches.length, expected ? 1 : 0, `${theme}/${bar}/${selected}/${state || 'open'}`);
      checked++;
    }
  }
}
dom.window.close();
console.log(`PASS main-blue rule is restricted to selected completed Today on Dark bars (${checked} states)`);

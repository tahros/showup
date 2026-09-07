// Pin the tab bar's one-row contract separately from its glass/appearance.
// Browser geometry checks complement these source/DOM guards on release.
const fs = require('fs'), path = require('path'), assert = require('assert');
const { JSDOM } = require('jsdom');
const dir = process.argv[2] || '.';
const css = fs.readFileSync(path.join(dir, 'css/app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const navRule = [...css.matchAll(/(?:^|})\s*nav\{([^}]+)}/g)].map(m => m[1]).find(r => /position:fixed/.test(r));
const buttonRule = [...css.matchAll(/(?:^|})\s*nav button\{([^}]+)}/g)].map(m => m[1]).find(r => /flex:1 1 0/.test(r));
assert(navRule, 'fixed navigation rule exists');
assert(/display:flex\s*;/.test(navRule), 'navigation uses a single flex row');
assert(/flex-flow:row nowrap\s*;/.test(navRule), 'navigation cannot wrap or become a column');
assert(buttonRule && /min-width:0\s*;/.test(buttonRule), 'tabs share available width without content-driven overflow');
console.log('PASS fixed bar has one non-wrapping row with equal flexible tabs');
const dom = new JSDOM(html);
const nav = dom.window.document.querySelector('#nav');
assert.deepStrictEqual([...nav.children].map(b => b.dataset.v), ['today', 'lift', 'stats', 'history']);
assert([...nav.children].every(b => b.tagName === 'BUTTON' && b.getAttribute('aria-label') && b.querySelector('svg')));
assert(!/grid-template-columns/.test(navRule), 'tab layout has no grid-track dependency');
console.log('PASS all four named navigation buttons remain direct children in their original order');
dom.window.close();

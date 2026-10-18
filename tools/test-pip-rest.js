/* test-pip-rest.js DIR -- v4.6.352: Pip on a rest day.
 * On iPhone Pip vanished from the rest-day home while its box kept its space: the hello
 * row is a column there, WebKit treats that column item's aspect-ratio height as
 * indefinite, and the crew box inside was sized height:100% -- which fell to 0. The box
 * is now pinned (absolute, inset 0), which resolves in every engine. And the mascot
 * lifecycle no longer overwrites Pip-as-crew's art with the old mascot PNG.
 */
const fs=require('fs'),path=require('path');const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)fails++;};
const css=fs.readFileSync(path.join(dir,'css/mascot.css'),'utf8'),js=fs.readFileSync(path.join(dir,'js/mascot.js'),'utf8');
const rule=(css.match(/\.crew-pip>\.crew-avatar\{([^}]*)\}/)||[])[1]||'';
ok('Pip\'s crew box is pinned to the mascot box', /position:absolute/.test(rule)&&/inset:0/.test(rule));
ok('Pip\'s crew box is not sized by a percent height', !/height:100%/.test(rule));
ok('the mascot box stays the positioning context', /\.su-mascot\{[^}]*position:relative/.test(css));
ok('the lifecycle leaves Pip-as-crew art alone', /classList\.contains\('crew-pip'\)\?null:el\.querySelector\('img'\)/.test(js));
console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);

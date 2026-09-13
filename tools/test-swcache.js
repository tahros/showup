/* test-swcache.js — v4.5.25.
 * Half the service worker's shell carries no ?v= stamp: the dynamically imported
 * modules, the vendored three.js, the fonts, and every mascot PNG. Their URLs are
 * identical from release to release, so if install is allowed to read the browser's
 * HTTP cache, a brand new CACHE gets filled with the PREVIOUS release's bytes and a
 * correctly deployed asset never reaches the screen.
 */
const fs=require('fs'),path=require('path');
const dir=process.argv[2]||'.';
const sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};

const entries=[...sw.matchAll(/'(\.\/[^']+)'/g)].map(m=>m[1]);
const unstamped=entries.filter(u=>!u.includes('?v='));
ok('(fixture) the shell has entries with no version stamp', unstamped.length>0,
   unstamped.length+' of '+entries.length+' unstamped');

ok('install fetches every shell entry from the network, not the HTTP cache',
   /addAll\(\s*SHELL\.map\(\s*\w+\s*=>\s*new Request\(\s*\w+\s*,\s*\{\s*cache:\s*'reload'\s*\}\s*\)\s*\)\s*\)/.test(sw),
   (sw.match(/addAll\([^)]*\)/)||[])[0]);

/* the ones that bit: modules imported at runtime never pass through index.html, so
   they get no stamp there either -- they depend entirely on the install being honest */
for(const f of ['./js/mascot-renderer.js','./js/plate-gif.js','./js/plate-video.js'])
  ok('the dynamically imported '+f.split('/').pop()+' is in the shell and unstamped, so it relies on reload',
     entries.includes(f)&&!f.includes('?v='));

ok('...and none of them is stamped in index.html either, which is why install is the only guard',
   !/mascot-renderer\.js\?v=/.test(html));

/* every mascot PNG shares the same trap */
const pngs=entries.filter(u=>/assets\/mascot-.*\.png$/.test(u));
ok('(fixture) the mascot images are unstamped shell entries', pngs.length>=4, pngs.length+' images');

/* and the cache name still moves every release, or nothing re-installs at all */
ok('the cache name carries the version, so a release triggers a fresh install',
   /const CACHE\s*=\s*'showup-v\d+\.\d+\.\d+'/.test(sw), (sw.match(/const CACHE\s*=\s*'[^']+'/)||[])[0]);

console.log(fails?`FAIL ${fails}`:'ALL PASS');process.exit(fails?1:0);

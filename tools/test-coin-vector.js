const fs=require('fs'),path=require('path'),assert=require('assert');
const root=process.argv[2]||'.';
const svg=fs.readFileSync(path.join(root,'assets/club-seal-mask.svg'),'utf8');
assert(/<path\b/.test(svg),'seal must contain scalable outlines');
assert(!/<image\b|<filter\b|data:image|feColorMatrix/i.test(svg),'seal must not rasterize through a bitmap or filter');
assert(/viewBox="0 0 512 512"/.test(svg),'preserve approved seal geometry');
assert(/fill="(?:#fff|white)"/.test(svg),'opaque vector alpha mask');
console.log('PASS club coin mask contains only scalable vector artwork');

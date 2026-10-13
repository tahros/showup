const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync((process.argv[2]||'.')+'/js/settings.js','utf8');
const code=source.slice(source.indexOf('function clubCoinNumberHTML('),source.indexOf('function clubCoinHTML('));
function verify(code){
 const ctx={hesc:s=>s};vm.createContext(ctx);vm.runInContext(code,ctx);
 for(const n of ['1','15','127','2048','000000','123456789','123456789012','1234567890123456789']){
  const html=ctx.clubCoinNumberHTML(n),spans=[...html.matchAll(/left:([^%]+)%;top:([^%]+)%;.*?rotate\(([^d]+)deg\);font-size:([^c]+)cqw">([^<]*)/g)];
  assert.equal(spans.map(s=>s[5]).join(''),n,'never pad, truncate or change the ID');
  const step=n.length===1?0:Math.abs(+spans[1][3]-spans[0][3]);
  assert(step<=14.00001,'short numbers must not span the whole rim');
  assert(Math.abs(+spans[0][3]+ +spans.at(-1)[3])<1e-8,'arc centered');
  assert(Math.abs(+spans[0][3])<=38.00001,'arc bounded');
  spans.forEach(s=>{assert(+s[4]>0&&+s[4]<=10);assert(+s[1]>25&&+s[1]<75);assert(+s[2]>75&&+s[2]<=83)});
 }
}
verify(code);
assert.throws(()=>verify(code.replace('Math.min(14,76/Math.max(1,chars.length-1))','76/Math.max(1,chars.length-1)')),/short numbers/,'probe must detect the old spacing regression');
console.log('PASS compact coin arc preserves IDs and centers 1–19 digits; regression probe rejects old spacing');

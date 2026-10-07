// Optional, one-shot coarse location lookup. Never accepts workout/account
// details. No database writes or request logging. Coordinates are rounded
// before leaving the device and again here; caches are bounded and transient.
const ORIGINS=['https://tahros.github.io','capacitor://localhost'];
const cache=new Map(),pending=new Map();let nextLookup=0;
const clean=s=>typeof s==='string'?s.replace(/[\x00-\x1f<>]/g,'').slice(0,80):'';
export function placeFrom(body){
 const p=body?.features?.[0]?.properties||{},city=clean(p.city||p.town||p.village||p.locality);
 const states={'New Jersey':'NJ','New York':'NY','California':'CA','Massachusetts':'MA','Pennsylvania':'PA','Connecticut':'CT','Texas':'TX','Florida':'FL','Illinois':'IL','Washington':'WA'};
 const region=clean(p.state),area=p.countrycode==='US'?states[region]||region:region;
 return city?[city,area&&area!==city?area:''].filter(Boolean).join(', '):'';
}
export function weatherFrom(body,now){
 const rows=body?.properties?.timeseries||[];
 const item=rows.filter(r=>Math.abs(Date.parse(r.time)-now)<=90*60000).sort((a,b)=>Math.abs(Date.parse(a.time)-now)-Math.abs(Date.parse(b.time)-now))[0];
 const c=item?.data?.instant?.details?.air_temperature,s=item?.data?.next_1_hours?.summary?.symbol_code;
 if(typeof c!=='number'||!Number.isFinite(c)||c< -100||c>70||typeof s!=='string')return null;
 return {c,symbol:s.replace(/[^a-z_]/g,'').slice(0,60),at:Date.parse(item.time)};
}
export async function handle(req,net=fetch,now=Date.now()){
 const origin=req.headers.get('origin'),headers={'Content-Type':'application/json','Vary':'Origin','Access-Control-Allow-Origin':ORIGINS.includes(origin)?origin:ORIGINS[0],'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
 const out=(status,body)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!ORIGINS.includes(origin))return out(403,{error:'origin'});
 if(req.method==='OPTIONS')return out(200,{});
 if(req.method!=='POST')return out(405,{error:'method'});
 let b;try{const raw=await req.text();if(raw.length>256)return out(413,{error:'size'});b=JSON.parse(raw);}catch{return out(400,{error:'body'});}
 if(b?.consent!==true||typeof b.lat!=='number'||typeof b.lon!=='number'||!Number.isFinite(b.lat)||!Number.isFinite(b.lon)||Math.abs(b.lat)>90||Math.abs(b.lon)>180)return out(400,{error:'coordinates'});
 const lat=Number(b.lat.toFixed(2)),lon=Number(b.lon.toFixed(2)),key=lat+','+lon,hit=cache.get(key);
 if(hit&&hit.until>now)return out(200,hit.data);
 if(pending.has(key))return out(200,await pending.get(key));
 // No unbounded server-side retry. A busy service degrades to no metadata.
 if(now<nextLookup)return out(429,{error:'busy'});nextLookup=now+1000;
 const work=(async()=>{
  const get=async url=>{const r=await net(url,{headers:{'User-Agent':'ShowUppp/1.0 https://tahros.github.io/showup/support.html'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('provider');return {body:await r.json(),expires:Date.parse(r.headers.get('expires')||'')};};
  const [place,weather]=await Promise.allSettled([
   get(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&limit=1&lang=en`),
   get(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`)
  ]);
  const data={location:place.status==='fulfilled'?placeFrom(place.value.body):'',weather:weather.status==='fulfilled'?weatherFrom(weather.value.body,now):null,capturedAt:now};
  const expiry=weather.status==='fulfilled'?weather.value.expires:0;
  if(cache.size>=128)cache.delete(cache.keys().next().value);
  cache.set(key,{data,until:Math.max(now+30*60000,Number.isFinite(expiry)?expiry:0)});
  return data;
 })();pending.set(key,work);
 try{return out(200,await work);}catch{return out(503,{error:'unavailable'});}finally{pending.delete(key);}
}
if(typeof Deno!=='undefined')Deno.serve(req=>handle(req));

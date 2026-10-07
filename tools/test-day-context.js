// Provider responses are synthetic. Never asks for a developer's location.
const assert=require('assert'),path=require('path'),{pathToFileURL}=require('url');
(async()=>{
 const {handle,placeFrom,weatherFrom}=await import(pathToFileURL(path.resolve(process.argv[2]||'.','supabase/functions/day-context/index.ts')).href);
 const now=Date.parse('2026-10-07T16:00:00Z'),place={features:[{properties:{city:'Princeton',state:'New Jersey',countrycode:'US',street:'Not saved'}}]},weather={properties:{timeseries:[{time:'2026-10-07T16:00:00Z',data:{instant:{details:{air_temperature:18}},next_1_hours:{summary:{symbol_code:'clearsky_day'}}}}]}};
 assert.equal(placeFrom(place),'Princeton, NJ');assert.equal(weatherFrom(weather,now).c,18);assert.equal(weatherFrom(weather,now+4*3600000),null);
 const req=(body,origin='https://tahros.github.io')=>new Request('https://example.org',{method:'POST',headers:{origin},body:JSON.stringify(body)});
 let calls=[];const net=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.includes('photon')?place:weather),{headers:{Expires:new Date(now+3600000).toUTCString()}});};
 for(const body of [{lat:40,lon:-74},{consent:true,lat:'40',lon:-74},{consent:true,lat:999,lon:3}])assert.equal((await handle(req(body),net,now)).status,400);
 assert.equal((await handle(req({consent:true,lat:40,lon:-74},'https://evil.example'),net,now)).status,403);assert.equal(calls.length,0);
 const body={consent:true,lat:40.35712,lon:-74.66722};let response=await handle(req(body),net,now),result=await response.json();
 assert.equal(result.location,'Princeton, NJ');assert.equal(result.weather.c,18);assert(!JSON.stringify(result).includes('74.'));assert(!JSON.stringify(result).includes('street'));
 assert(calls.every(c=>c.url.includes('40.36')&&c.url.includes('-74.67')&&c.options.headers['User-Agent'].includes('ShowUppp')));
 assert.equal((await handle(req(body),net,now+5000)).status,200);assert.equal(calls.length,2,'cached through upstream expiry');
 await handle(req(body),net,now+35*60000);assert.equal(calls.length,2,'honor expiry beyond minimum cache');
 response=await handle(req({consent:true,lat:48.86,lon:2.35}),async()=>{throw Error('offline');},now+3600001);result=await response.json();assert.equal(result.location,'');assert.equal(result.weather,null);
 assert.equal((await handle(req({consent:true,lat:48,lon:2}),net,now+3600002)).status,429);
 console.log('PASS context consent, validation, coarse coordinates, provider attribution identity, cache expiry, no workout/coordinate response, offline, throttling');
})().catch(e=>{console.error(e);process.exit(1);});

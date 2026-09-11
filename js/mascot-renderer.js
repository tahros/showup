/* Approved Show Up B geometry / shows, motions, pose and draw extracted verbatim
   from showup-soft-charcoal-site/source.html. Only alpha, theme, and lifecycle
   are adapted here. Three.js r169 is vendored for offline operation. */
import * as THREE from '../vendor/three-r169.module.min.js';
export function createMascot(stage, options={}) {
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true, preserveDrawingBuffer:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    stage.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=null;
    const camera=new THREE.OrthographicCamera(-6.5,6.5,4.2,-4.2,.1,80);
    camera.position.set(0,3.65,22);camera.lookAt(0,2.55,0);
    const rig=new THREE.Group();scene.add(rig);
    const body=new THREE.Group();body.position.y=2.5;rig.add(body);
    // Tone-only exploration; approved B geometry and motion remain unchanged.
    const tones={
      original:['#090909','#111111','#1b1b1b'],
      soft:['#2c2c2c','#363636','#404040'],
      light:['#484848','#525252','#5c5c5c']
    };
    const charcoal=new THREE.ShaderMaterial({
      uniforms:{dark:{value:new THREE.Color(tones.soft[0])},mid:{value:new THREE.Color(tones.soft[1])},light:{value:new THREE.Color(tones.soft[2])}},
      vertexShader:'varying vec3 vN; void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform vec3 dark;uniform vec3 mid;uniform vec3 light;varying vec3 vN;void main(){float n=dot(normalize(vN),normalize(vec3(-0.35,0.75,0.6)));vec3 c=mix(dark,mid,smoothstep(-0.6,0.45,n));c=mix(c,light,0.65*smoothstep(0.35,1.0,n));gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'
    });
    const white=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
    const profile=[];
    profile.push(new THREE.Vector2(0,-1.3),new THREE.Vector2(2.15,-1.3));
    for(let i=1;i<=12;i++){const a=-Math.PI/2+i*Math.PI/24;profile.push(new THREE.Vector2(2.15+.35*Math.cos(a),-.95+.35*Math.sin(a)));}
    profile.push(new THREE.Vector2(2.5,.95));
    for(let i=1;i<=12;i++){const a=i*Math.PI/24;profile.push(new THREE.Vector2(2.15+.35*Math.cos(a),.95+.35*Math.sin(a)));}
    profile.push(new THREE.Vector2(0,1.3));
    const weightGeometry=new THREE.LatheGeometry(profile,96);
    // Approved B: each plate is 2.08 wide by 5 tall; preserve the 3.80 handle gap.
    for(const x of [-2.94,2.94]){
      const weight=new THREE.Mesh(weightGeometry,charcoal);weight.rotation.z=Math.PI/2;weight.position.x=x;weight.scale.set(1,.8,1);weight.castShadow=true;body.add(weight);
    }
    // A gently flared handle bridges the heads without seams or stacked plates.
    const handleProfile=[new THREE.Vector2(0,-2.01),new THREE.Vector2(1.24,-2.01),new THREE.Vector2(1.18,-1.87),new THREE.Vector2(1.12,-1.67),new THREE.Vector2(1.12,1.67),new THREE.Vector2(1.18,1.87),new THREE.Vector2(1.24,2.01),new THREE.Vector2(0,2.01)];
    const handle=new THREE.Mesh(new THREE.LatheGeometry(handleProfile,96),charcoal);handle.rotation.z=Math.PI/2;handle.castShadow=true;body.add(handle);
    // White face geometry is conformed to the cylinder, so it turns with the model.
    function facePatch(cx,cy,rx,ry){
      const geometry=new THREE.CircleGeometry(1,64);const p=geometry.attributes.position;
      const base=[];
      for(let i=0;i<p.count;i++){const x=p.getX(i)*rx,y=p.getY(i)*ry;base.push([x,y]);p.setXYZ(i,x,y,Math.sqrt(1.12*1.12-(y+cy)*(y+cy))+.035);}
      geometry.computeVertexNormals();const eye=new THREE.Mesh(geometry,white);eye.userData.base=base;eye.position.set(cx,cy,0);body.add(eye);return eye;
    }
    const eyes=[facePatch(-.49,.27,.22,.35),facePatch(.49,.27,.22,.35)];
    function stroke(points,radius=.043){
      const curve=new THREE.CatmullRomCurve3(points);const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,64,radius,8,false),white);body.add(mesh);
      for(const endpoint of [points[0],points[points.length-1]]){const cap=new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),white);cap.position.copy(endpoint);body.add(cap);}
    }
    const mouth=[];
    for(let i=0;i<=32;i++){const x=-.44+i*.88/32,y=-.40-.20*(1-Math.pow(x/.44,2));mouth.push(new THREE.Vector3(x,y,Math.sqrt(1.12*1.12-y*y)+.017));}
    stroke(mouth,.045);
    // Trim both tips while preserving the original surface-following curve; slightly finer strokes.
    for(const side of [-1,1]){
      const arc=[];
      for(let i=0;i<=40;i++){const y=-.67+i*1.34/40,x=side*(1.74+.075*(1-Math.pow(y/.91,2)));arc.push(new THREE.Vector3(x,y,Math.sqrt(1.18*1.18-y*y)+.021));}
      stroke(arc,.028);
    }
    const keyLight=new THREE.DirectionalLight(0xffffff,2);keyLight.position.set(-2,14,6);keyLight.castShadow=true;
    keyLight.shadow.mapSize.set(2048,2048);keyLight.shadow.camera.left=-8;keyLight.shadow.camera.right=8;keyLight.shadow.camera.top=8;keyLight.shadow.camera.bottom=-8;
    keyLight.shadow.camera.near=.1;keyLight.shadow.camera.far=35;keyLight.shadow.normalBias=.025;keyLight.shadow.bias=-.0002;keyLight.shadow.radius=3;
    keyLight.target.position.set(0,0,0);scene.add(keyLight,keyLight.target);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.16}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;scene.add(floor);
    // Additional soft contact darkening directly beneath each weight, not a drop shadow.
    const contactGroup=new THREE.Group();scene.add(contactGroup);
    const contacts=[];
    for(const side of [-1,1]){
      const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:.15}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float opacity;void main(){float r=length((vUv-.5)*2.0);gl_FragColor=vec4(0.0,0.0,0.0,opacity*pow(max(0.0,1.0-r),2.0));}'});
      const patch=new THREE.Mesh(new THREE.PlaneGeometry(3.4,2.6),mat);patch.rotation.x=-Math.PI/2;patch.position.set(side*2.94,.005,0);contactGroup.add(patch);contacts.push(patch);
    }

  const neutral={x:0,y:0,sx:1,sy:1,r:0,bend:0,lag:0,eye:1,wink:1,look:0,face:0,grin:0};
  const key=(t,p={})=>({t,...neutral,...p});
  const shows={
    jump:{label:'Excited jump · workout complete',frames:[
      key(0),key(220,{eye:1.12,face:-8}),
      key(570,{sx:1.15,sy:.73,y:0,bend:27,eye:.32,face:13}),
      key(700,{sx:.85,sy:1.23,y:-24,bend:-32,eye:1.12,grin:.55}),
      key(960,{sx:.96,sy:1.04,y:-102,r:-6,bend:-19,eye:1.16,grin:1}),
      key(1170,{sx:1.03,sy:.98,y:-110,r:5,bend:-5,eye:.82,grin:1}),
      key(1410,{sx:.93,sy:1.09,y:-42,r:2,bend:22,eye:1.06,grin:.75}),
      key(1530,{sx:1.21,sy:.65,bend:33,eye:.12,grin:.2}),
      key(1700,{sx:.96,sy:1.06,y:-23,bend:-22,eye:.92,grin:.65}),
      key(1870,{sx:1.055,sy:.91,bend:10,eye:.9,grin:.3}),
      key(2080,{sx:.99,sy:1.02,bend:-4}),key(2300),key(2700)
    ]},
    hello:{label:'Cheeky hello · welcome back',frames:[
      key(0),key(280,{look:-20,r:-3,face:-2}),
      key(510,{look:22,r:4,eye:1.1}),key(710,{look:0,eye:1.13,face:-9,grin:.4}),
      key(880,{sx:1.10,sy:.83,r:-10,bend:12,lag:24,eye:.65}),
      key(1080,{x:18,y:-38,sx:.96,sy:1.09,r:13,bend:-17,lag:-32,grin:.8}),
      key(1290,{x:-12,y:-10,sx:1.04,sy:.94,r:-12,lag:28,grin:.8}),
      key(1500,{x:6,y:-16,r:7,lag:-15,grin:.55}),
      key(1700,{r:-3,lag:7}),key(1880),
      key(2030,{wink:.06,r:-5,face:-2,grin:.35}),
      key(2210,{wink:.06,r:-5,face:-2,grin:.35}),key(2450),key(2750)
    ]},
    dance:{label:'Victory dance · personal milestone',frames:[
      key(0),key(230,{sx:1.1,sy:.82,bend:18,eye:.5}),
      key(440,{x:-32,y:-35,r:-13,lag:40,grin:.8}),
      key(640,{x:-25,sx:1.08,sy:.84,r:-8,lag:-14,eye:.3,grin:.4}),
      key(860,{x:32,y:-40,r:13,lag:-40,grin:.9}),
      key(1070,{x:25,sx:1.08,sy:.84,r:8,lag:14,eye:.3,grin:.4}),
      key(1270,{x:-20,y:-29,r:-10,lag:33,grin:.9}),
      key(1470,{x:20,y:-26,r:10,lag:-33,grin:.9}),
      key(1660,{sx:1.13,sy:.76,bend:20,eye:.2}),
      key(1850,{y:-77,sx:.94,sy:1.07,r:-5,bend:-25,grin:1,eye:.75}),
      key(2040,{y:-68,r:5,bend:-12,grin:1,eye:.75}),
      key(2250,{sx:1.17,sy:.71,bend:26,eye:.12}),
      key(2430,{y:-14,sx:.97,sy:1.045,bend:-10,grin:.5}),
      key(2670),key(3000)
    ]}
  };

    shows.active={frames:[key(0),key(180,{sy:.89,r:-4}),key(400,{y:-25,sy:1.06,r:-5}),key(610,{sy:.95,r:-2}),key(800,{sy:.89,r:4}),key(1020,{y:-25,sy:1.06,r:5}),key(1230,{sy:.95,r:2}),key(1440),key(1600)]};
    const rest={yaw:-.12,lift:0,roll:0,squash:1,blink:1,wink:1,x:0};
    const motions=Object.fromEntries(Object.entries(shows).map(([name,show])=>[name,{
      label:show.label,
      frames:show.frames.map(f=>({
        t:f.t,yaw:rest.yaw+f.look*.008,
        lift:-f.y*.65/46.7,roll:f.r*.65*Math.PI/180,
        squash:1+(f.sy-1)*.6,blink:1+(f.eye-1)*.8,wink:f.wink,x:f.x*.7/46.7
      }))
    }]));
    /* ---- v4.1.2: THE IDLE --------------------------------------------
       Every show is a one-shot: it ends on rest and the loop stops, so the
       mascot froze mid-shelf. An idle is a different kind of thing -- no
       beginning, no end, and any show may interrupt it and hand back.
       THE FAILURE MODE IS A VISIBLE CYCLE. Once you can count the loop it
       stops reading as alive and starts reading as a GIF, which is the
       "weird and unnatural" the maker asked to avoid. So every channel is a
       sum of sines on periods that share no common multiple -- 5.3s against
       2.9s, 7.1s against 3.4s -- and the whole thing never repeats inside any
       span you would watch.
       The yaw is the real one: this is a 3D object, so turning it turns it in
       space, with the shadow and the far head moving correctly. +-7 degrees is
       a glance, not a swivel.
       The reach ramps in over 900ms after a show so the hand-back is not
       a jolt -- shows end ON rest, and idle at t=0 is rest, so the two meet. */
    function idlePose(t,ramp){
      const k=Math.max(0,Math.min(1,ramp));
      const breathe=Math.sin(t/3400)*.5+Math.sin(t/5200+2.1)*.5;
      /* ---- v4.1.3: A BLINK THE WAY AN EYE BLINKS ----------------------
         The first one was a sine over a period that drifted on another sine.
         Two faults. A drifting period is still PERIODIC -- it merely counts
         slowly -- and a sine is SYMMETRIC, so the lid took as long to open as
         to close. Real lids snap shut in about 80ms and roll back up over
         about twice that, and real intervals are ragged rather than swept.
         So: a hash of the blink's own index gives each gap its own length
         between 2.6s and 6.4s -- irregular, but deterministic, so the mascot
         is the same mascot on every render, with no unrepeatable source of
         chance inside a draw call. Roughly one gap in seven is short enough to read
         as a double blink, which is what eyes actually do.
         The lid itself is two different curves: a fast fall, a slower rise. */
      const hash=i=>((Math.sin(i*12.9898)*43758.5453)%1+1)%1;
      const gapAt=i=>{const h=hash(i);
        /* about one gap in seven is a quarter of a second -- the second half
           of a double blink, which is what eyes actually do and what the last
           version claimed without doing */
        return h<.14?230+110*(h/.14):2600+3800*((h-.14)/.86);};
      let mark=0, index=0;
      while(mark+gapAt(index)<=t){mark+=gapAt(index);index++;}
      const into=t-mark, CLOSE=80, OPEN=170;
      const lid=into<CLOSE?Math.sin(into/CLOSE*Math.PI/2)
               :into<CLOSE+OPEN?Math.cos((into-CLOSE)/OPEN*Math.PI/2):0;
      return {
        /* three terms, not two: the first plot of this had a ten-second
           plateau where the two slow waves cancelled, and a head that holds
           still for ten seconds reads as frozen even while it breathes. The
           1.55s term is small enough to be a settle rather than a fidget. */
        yaw:rest.yaw+k*(Math.sin(t/5300)*.085+Math.sin(t/2900+1.7)*.037+Math.sin(t/1550+.4)*.013),
        lift:k*breathe*.012,
        roll:k*(Math.sin(t/7100+.6)*.010),
        squash:1+k*breathe*-.008,
        blink:1-k*lid*.92,
        wink:1,
        x:k*(Math.sin(t/6100+.9)*.006)
      };
    }
    function pose(frames,t){let i=1;while(i<frames.length-1&&t>frames[i].t)i++;const a=frames[i-1],b=frames[i],q=Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t))),e=q*q*(3-2*q),p={};for(const name of Object.keys(rest))p[name]=a[name]+(b[name]-a[name])*e;return p;}
    function draw(p){
      rig.rotation.set(0,p.yaw,p.roll);rig.scale.set(1+(1-p.squash)*.35,p.squash,1);rig.position.set(p.x,p.lift+Math.abs(Math.sin(p.roll))*3.98,0);
      eyes.forEach((eye,index)=>{
        const positions=eye.geometry.attributes.position;
        eye.userData.base.forEach(([x,baseY],i)=>{const y=baseY*Math.max(.07,p.blink*(index===1?p.wink:1)),worldY=y+eye.position.y;positions.setXYZ(i,x,y,Math.sqrt(1.12*1.12-worldY*worldY)+.035);});
        positions.needsUpdate=true;
      });
      contactGroup.position.x=p.x;contactGroup.rotation.y=p.yaw;contacts.forEach(mesh=>{mesh.material.uniforms.opacity.value=.15/(1+p.lift*2);mesh.scale.setScalar(1+p.lift*.12);});
      renderer.render(scene,camera);
    }

  let theme=options.theme||'light', mode=options.mode||'hello', still=!!options.still;
  let raf=0, elapsed=0, previous=0, paused=true, disposed=false, lost=false;
  const keys=['dark','mid','light'];
  function paint(t=elapsed) {
    const base=theme==='dark'?['#d7d7d7','#f1f1f1','#ffffff']:tones.soft;
    const target=mode==='active'?['#a92523','#d74236','#f46b52']:['#2749bd','#4779df','#78b3f4'];
    const pulse=mode==='active'||mode==='cool';
    const wave=still?.5:.5-.5*Math.cos(t/(mode==='active'?3200:4800)*Math.PI*2);
    const strength=mode==='active'?.32+.62*wave:.24+.53*wave;
    keys.forEach((key,i)=>{
      charcoal.uniforms[key].value.set(base[i]);
      if(pulse) charcoal.uniforms[key].value.lerp(new THREE.Color(target[i]),strength);
    });
    white.color.set(theme==='dark'?'#303030':'#ffffff');
    const motion=motions[mode==='cool'?'jump':mode];
    const end=motion?.frames.at(-1).t||0;
    /* v4.1.2: when no show is running the mascot idles rather than freezing
       on rest. still (reduced motion, or the setting off animated) keeps the
       old behaviour exactly: one pose, no loop. */
    const showing=!still&&motion&&(mode==='active'||t<end);
    draw(showing?pose(motion.frames,mode==='active'?t%end:t)
        :still?rest:idlePose(t,end?(t-end)/900:t/900));
  }
  function resize(){
    if(disposed||lost)return;
    const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight||w*440/720);
    renderer.setSize(w,h,false);
    camera.left=-7.8;camera.right=7.8;camera.top=7.8*h/w;camera.bottom=-camera.top;
    camera.updateProjectionMatrix();paint();
  }
  function frame(now){
    if(paused||disposed)return;
    if(previous)elapsed+=Math.min(now-previous,100);previous=now;paint();
    const end=motions[mode==='cool'?'jump':mode]?.frames.at(-1).t||0;
    if(!still)raf=requestAnimationFrame(frame);   // v4.1.2: the idle keeps the loop alive past the show
  }
  function pause(){paused=true;cancelAnimationFrame(raf);previous=0;}
  function resume(){if(disposed||lost)return;pause();paused=false;paint();if(!still)raf=requestAnimationFrame(frame);}
  function update(next={}){if(disposed||lost)return;theme=next.theme||theme;still=next.still??still;paint();resume();}
  const observer=new ResizeObserver(resize);observer.observe(stage);
  renderer.domElement.addEventListener('webglcontextlost',()=>{lost=true;pause();stage.classList.remove('su-ready');});
  function dispose(){
    if(disposed)return;disposed=true;pause();observer.disconnect();
    const geometries=new Set(),materials=new Set();
    scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
  }
  resize();resume();
  /* v4.1.2: a tap replays the show from the top and hands back to the idle
     when it ends -- the same path a fresh mount takes, so there is one
     sequence to get right rather than two. */
  function replay(next){if(disposed||lost||still)return;if(next)mode=next;elapsed=0;previous=0;resume();}
  return {pause,resume,update,dispose,replay,capture:()=>{paint(0);return renderer.domElement.toDataURL('image/png');}};
}

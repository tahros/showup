"""v4.6.395: the body map's figures, from the approved artwork (tools/bodymap/source/figures.png).

  python3 tools/bodymap/over.py  WORK tools/bodymap/source/figures.png light
  python3 tools/bodymap/build.py WORK tools/bodymap/source WORK/out .

over.py cuts each figure into the regions its white muscle lines enclose (numbered, with a
preview per figure in WORK). assign.json says which numbered regions are which muscle -- the
one hand-made step, checked by eye against those previews. build.py then writes:
  assets/bodymap/<m|f>-<front|back>.webp  the figure with its baked blue removed, cut out of
                                          its white background so it sits on either theme
  js/bodymap.js (between BM_FIGS markers) each muscle's region as SVG paths -- interiors only,
                                          so the drawing's lines stay visible over a tint
The artwork is an illustration, not an anatomy dataset: regions are where the drawing puts them.
"""
import json,sys,numpy as np,cv2
from PIL import Image
from scipy import ndimage as nd
W,D,OUT=sys.argv[1:4]
CROPS={'mf':(169,283,171,425),'mb':(390,283,173,425),'ff':(751,294,162,414),'fb':(975,294,158,414)}
NAMES={'mf':'m-front','mb':'m-back','ff':'f-front','fb':'f-back'}
ART={'light':D+'/figures.png'}
import os
ASSIGN=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'assign.json')))
MUS=['chest','delt','biceps','abs','obliques','quads','adductors','calves','traps','rdelt','lats','triceps','lowback','glutes','hams']
S=4  # vector precision: paths drawn on a 4x grid, viewBox in source px
data={}
def lines_of(a):
  m=a.min(-1).astype(float)
  base=nd.grey_opening(m,size=(5,5))
  return m,base
for theme in ['light']:
  im=np.array(Image.open(ART[theme]).convert('RGB')).astype(float)
  for k,(x,y,w,h) in CROPS.items():
    a=im[y:y+h,x:x+w].copy()
    r,g,b=a[...,0],a[...,1],a[...,2]
    lum0=r*.299+g*.587+b*.114
    blue=(b-r)>8
    # dark art: the baked blue fades into the charcoal at the outline; catch the faint tint too
    if theme=='dark': blue|=((b-r)>3)&((b-g)>2)&(lum0>40)
    if theme=='light': body=(lum0<232)|blue; bodyish=(lum0<225)&(lum0>120)&~blue
    else: body=(np.abs(lum0-27)>12)|blue; bodyish=(np.abs(lum0-27)>25)&(lum0<200)&~blue
    sil=nd.binary_fill_holes(nd.binary_closing(body,np.ones((3,3)),iterations=3))
    tone=np.median(a[bodyish],axis=0)
    # --- neutral base: blue fill -> body tone, keeping the white lines that ran through it
    m,base=lines_of(a)
    spike=np.clip(m-base,0,None)
    k2=np.clip(spike/np.maximum(1,255-base),0,1)[...,None]
    neutral=tone*(1-k2)+255*k2
    wide=nd.binary_dilation(blue,iterations=1)
    out=np.where(wide[...,None],np.where(blue[...,None],neutral,a),a)
    # --- alpha: the silhouette. Background pockets it encloses (between the ponytail and the neck)
    # are cut out; the edge band takes its colour from the nearest solid pixel inside and its
    # opacity from how far it sits from the baked background -- no pale halo on a dark card.
    bgc=np.array([253,253,253])
    mm=out.min(-1)
    pock,pn=nd.label(sil&(mm>=251))
    thick=nd.binary_erosion(sil&(mm>=251),iterations=2)
    for i in range(1,pn+1):
      c=pock==i
      if (c&thick).any(): sil[nd.binary_dilation(c)&(mm>=246)]=False   # a real hole, not a line
    inner=nd.binary_erosion(sil,iterations=2)
    band=sil&~inner
    _,(iy,ix)=nd.distance_transform_edt(~inner,return_indices=True)
    cin=out[iy,ix]
    d=np.abs(out-bgc).max(-1); full=np.maximum(np.abs(cin-bgc).max(-1),1)
    alpha=np.where(sil,1.0,0.0)
    alpha=np.where(band,np.clip(d/full,0,1),alpha)
    out=np.where(band[...,None],cin,out)
    rgba=np.dstack([out,alpha*255]).clip(0,255).astype('uint8')
    big=Image.fromarray(rgba,'RGBA').resize((w*2,h*2),Image.LANCZOS)
    big.save(f'{OUT}/{NAMES[k]}-{theme}.png',optimize=True)
    if len(sys.argv)>4: big.save(f'{sys.argv[4]}/assets/bodymap/{NAMES[k]}.webp','WEBP',quality=88,method=6,alpha_quality=95)
    # --- muscle label map
    reg=np.load(f'{W}/over_{theme}_{k}.npy')
    if theme=='light':
      lab=np.zeros((h,w),int)
      for mi,mn in enumerate(MUS,1):
        for rid in ASSIGN[k].get(mn,[]): lab[reg==rid]=mi
      np.save(f'{W}/mus_light_{k}.npy',lab)
    else:
      L=np.load(f'{W}/mus_light_{k}.npy');lab=np.zeros((h,w),int)
      for rid in np.unique(reg):
        if not rid: continue
        v=L[reg==rid]; c=np.bincount(v,minlength=len(MUS)+1)
        if c[1:].sum()>0.5*len(v): lab[reg==rid]=np.argmax(c[1:])+1
    yy=np.arange(h)[:,None]*np.ones((1,w))
    xx=np.ones((h,1))*np.arange(w)[None,:]
    # fixes: chest cannot run below the pectoral line into the abs; calves start below the knee
    if k=='ff':
      cm=lab==MUS.index('chest')+1; ys=np.where(cm)[0]
      cut=133; lab[cm&(yy>cut)]=0
    if k=='fb':
      lab[(lab==MUS.index('calves')+1)&(yy<316)]=0
    # interior only: the line pixels stay unpainted so the drawing shows through
    m,base=lines_of(a)
    line=((m-base)>10)|(m>236)   # lines, and the white of the groin panel
    paths={}
    for mi,mn in enumerate(MUS,1):
      mask=(lab==mi)&~line&sil
      if mask.sum()<4: continue
      up=cv2.resize(mask.astype(np.float32),(w*S,h*S),interpolation=cv2.INTER_LINEAR)
      up=cv2.GaussianBlur(up,(0,0),S*0.45)
      bw=(up>0.5).astype(np.uint8)
      cs,_=cv2.findContours(bw,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
      segs=[]
      for c in cs:
        if cv2.contourArea(c)<S*S*3: continue
        c=cv2.approxPolyDP(c,S*0.3,True)
        f1=lambda v:('%.1f'%v).rstrip('0').rstrip('.')
        pts=[f1(p[0][0]/S)+' '+f1(p[0][1]/S) for p in c]
        segs.append('M'+'L'.join(pts)+'Z')
      if segs:
        ys,_=np.where(mask)
        paths[mn]={'d':''.join(segs),'y0':int(ys.min()),'y1':int(ys.max())}
    data.setdefault(NAMES[k],{'w':w,'h':h})[theme]=paths
json.dump(data,open(f'{W}/bodymap-paths.json','w'))
print({k:len(v['light']) for k,v in data.items()})
print(len(json.dumps(data)))

js={k:{'w':v['w'],'h':v['h'],'r':v['light']} for k,v in data.items()}
HEAD=("/* GENERATED by tools/bodymap/build.py from the approved figure artwork -- do not edit by hand.\n"
 "   Each figure's muscle regions as SVG paths in the artwork's own pixel grid (w x h); y0/y1 are the\n"
 "   region's vertical extent, for the chest's top-to-bottom emphasis gradient. */\n")
block=HEAD+"const BM_FIGS="+json.dumps(js,separators=(',',':'))+";\n"
open(f'{W}/bodymap-data.js','w').write(block)
# write into js/bodymap.js between its markers when a 4th argument names the repo
if len(sys.argv)>4:
  p=sys.argv[4]+'/js/bodymap.js';s=open(p).read();a='/* BM_FIGS:BEGIN */\n';b='/* BM_FIGS:END */'
  s=s[:s.index(a)+len(a)]+block+s[s.index(b):];open(p,'w').write(s)

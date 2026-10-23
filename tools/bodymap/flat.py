"""v4.6.397: the flat figures for Muscle this week (js/muscleweek.js, between MW_FIGS markers).

  python3 tools/bodymap/over.py  WORK tools/bodymap/source/figures.png light
  python3 tools/bodymap/build.py WORK tools/bodymap/source WORK/out      # writes WORK/mus_light_*.npy
  python3 tools/bodymap/flat.py  WORK .

For each view: the silhouette and every muscle's region, as smooth closed curves. The regions
are the artwork's own (its white muscle lines are the gaps between them); what this step adds is
finish -- specks and slivers dropped, edges traced on a fine grid and fitted with curves, so the
shapes are clean at any size instead of stair-stepped."""
import json,sys,os,re,numpy as np,cv2
from PIL import Image
from scipy import ndimage as nd
W,REPO=sys.argv[1:3]
CROPS={'mf':(169,283,171,425),'mb':(390,283,173,425),'ff':(751,294,162,414),'fb':(975,294,158,414)}
NAMES={'mf':'m-front','mb':'m-back','ff':'f-front','fb':'f-back'}
MUS=['chest','delt','biceps','abs','obliques','quads','adductors','calves','traps','rdelt','lats','triceps','lowback','glutes','hams']
SKIP={'adductors','lowback'}   # drawn as plain muscle, no bar of their own
S=8                            # tracing grid: 8 x the artwork's pixels
art=np.array(Image.open(os.path.join(REPO,'tools/bodymap/source/figures.png')).convert('RGB')).astype(float)

def smooth_path(c,scale):
  """closed contour -> cubic Bezier path through Catmull-Rom points (no corners, no stairs)"""
  pts=c[:,0,:].astype(float)/scale
  n=len(pts)
  if n<4: return ''
  f=lambda v:('%.1f'%v).rstrip('0').rstrip('.')
  d='M'+f(pts[0][0])+' '+f(pts[0][1])
  for i in range(n):
    p0,p1,p2,p3=pts[(i-1)%n],pts[i],pts[(i+1)%n],pts[(i+2)%n]
    c1=p1+(p2-p0)/6; c2=p2-(p3-p1)/6
    d+='C'+' '.join(f(v) for v in (c1[0],c1[1],c2[0],c2[1],p2[0],p2[1]))
  return d+'Z'

def trace(mask,min_frac=0.12,min_px=6,eps=0.42,blur=0.8,soft=None,cut=None,piece=0.18):
  """a binary mask at artwork scale -> smooth path; parts smaller than min_frac of the largest
  part (or min_px pixels) are specks of a neighbour's edge and are dropped. `soft` (0..1, the
  artwork's own anti-aliased coverage) shapes the edge where the mask meets the outline, so the
  outline is traced where the drawing drew it, not along a pixel staircase."""
  lab,n=nd.label(mask)
  if not n: return '',None
  sizes=nd.sum(np.ones_like(lab),lab,range(1,n+1));big=sizes.max()
  keep=np.isin(lab,[i+1 for i,s in enumerate(sizes) if s>=max(min_px,min_frac*big)])
  # slivers: a strip two pixels wide along a line is the edge of the drawing, not a muscle
  core=nd.binary_erosion(keep,iterations=1);cl,cn=nd.label(keep)
  for i in range(1,cn+1):
    c=cl==i
    if (core&c).sum()<0.3*c.sum(): keep[c]=False
  keep=nd.binary_fill_holes(keep)
  h,w=mask.shape
  # interior edges (the drawing's muscle lines) are smoothed; where the shape meets the outline it
  # follows the artwork's coverage instead, so the two never fight
  src=cv2.GaussianBlur(keep.astype(np.float32),(0,0),blur)
  if soft is not None: src=np.minimum(src,soft)
  if cut is not None: src=src*(1-cut)   # the drawing's lines, as smooth even gaps
  up=cv2.resize(src,(w*S,h*S),interpolation=cv2.INTER_CUBIC)
  up=cv2.GaussianBlur(up,(0,0),S*0.22)
  bw=(up>0.5).astype(np.uint8)
  cs,_=cv2.findContours(bw,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
  out=[]
  # after the lines are cut, a muscle can fall into pieces; a piece far smaller than its biggest
  # is a strip of the drawing between lines (serratus beside the chest), not the muscle
  amax=max([cv2.contourArea(c) for c in cs] or [0])
  for c in cs:
    if cv2.contourArea(c)<max(S*S*min_px,piece*amax): continue
    c=cv2.approxPolyDP(c,S*eps,True)
    out.append(smooth_path(c,S))
  ys=np.where(keep)[0]
  return ''.join(out),(int(ys.min()),int(ys.max()))

figs={}
for k,(x,y,w,h) in CROPS.items():
  a=art[y:y+h,x:x+w]
  r,g,b=a[...,0],a[...,1],a[...,2];lum=r*.299+g*.587+b*.114;blue=(b-r)>8
  body=(lum<232)|blue
  sil=nd.binary_fill_holes(nd.binary_closing(body,np.ones((3,3)),iterations=3))
  mm=a.min(-1);pock,pn=nd.label(sil&(mm>=251));thick=nd.binary_erosion(sil&(mm>=251),iterations=2)
  for i in range(1,pn+1):
    c=pock==i
    if (c&thick).any(): sil[nd.binary_dilation(c)&(mm>=246)]=False
  m=a.min(-1);base=nd.grey_opening(m,size=(5,5));line=((m-base)>10)|(m>236)
  # the same lines as a soft map: how strongly each pixel is drawn line, eased so every gap
  # comes out one even width whatever the artwork's anti-aliasing did there
  lsoft=np.clip(((m-base)-3)/9,0,1);lsoft=np.maximum(lsoft,np.clip((m-226)/12,0,1))
  lcut=np.clip(cv2.GaussianBlur(lsoft.astype(np.float32),(0,0),0.6)*1.6,0,1)
  lab=np.load(f'{W}/mus_light_{k}.npy')
  yy=np.arange(h)[:,None]*np.ones((1,w));xx=np.ones((h,1))*np.arange(w)[None,:]
  if k=='ff':   # the top-right ab sat inside the chest's region in the artwork: below the pecs it is an ab
    ci,ai=MUS.index('chest')+1,MUS.index('abs')+1
    cut=(lab==ci)&(yy>133); lab[cut&(xx>=68)&(xx<=94)]=ai; lab[cut&~((xx>=68)&(xx<=94))]=0
  if k=='fb':   # the left triceps' region ran on down the forearm; the triceps stops at the elbow
    lab[(lab==MUS.index('triceps')+1)&(yy>166)]=0
  # the artwork's own coverage of each pixel: 1 inside, falling to 0 across the anti-aliased edge
  inner=nd.binary_erosion(sil,iterations=2)
  _,(iy,ix)=nd.distance_transform_edt(~inner,return_indices=True)
  cin=a[iy,ix];bg=np.array([253,253,253.])
  cov=np.clip(np.abs(a-bg).max(-1)/np.maximum(np.abs(cin-bg).max(-1),1),0,1)
  cov=np.where(inner,1.0,np.where(nd.binary_dilation(sil,iterations=1),cov,0.0)).astype(np.float32)
  sp,_=trace(nd.binary_dilation(sil,iterations=2),min_frac=0.5,eps=0.3,blur=0.3,soft=cov)
  regs={}
  for mi,mn in enumerate(MUS,1):
    if mn in SKIP: continue
    mask=(lab==mi)&sil
    if (mask&~line).sum()<8: continue
    d,yr=trace(mask,soft=cov,cut=lcut)
    if d: regs[mn]=d
  figs[NAMES[k]]={'w':w,'h':h,'sil':sp,'r':regs}
block=("/* MW_FIGS:BEGIN -- generated by tools/bodymap/flat.py from the approved figures: each view's silhouette\n"
 "   and its muscle regions as smooth SVG paths in the artwork's pixel grid. Do not edit by hand. */\n"
 "const MW_FIGS="+json.dumps(figs,separators=(',',':'))+";\n")
p=os.path.join(REPO,'js/muscleweek.js');s=open(p).read()
a=s.index('/* MW_FIGS:BEGIN');b=s.index('/* MW_FIGS:END */')
s=s[:a]+block+s[b:];open(p,'w').write(s)
print({k:len(v['r']) for k,v in figs.items()},len(block))

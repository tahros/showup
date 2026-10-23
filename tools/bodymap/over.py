"""v4.6.395: step one of the body map build -- see tools/bodymap/build.py."""
import sys,json,numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage as nd
from skimage.segmentation import watershed
W,ART,theme=sys.argv[1:4]
CROPS={'mf':(169,283,171,425),'mb':(390,283,173,425),'ff':(751,294,162,414),'fb':(975,294,158,414)}
im=Image.open(ART).convert('RGB')
for k,(x,y,w,h) in CROPS.items():
  a=np.array(im.crop((x,y,x+w,y+h))).astype(float)
  r,g,b=a[...,0],a[...,1],a[...,2]
  blue=(b-r)>8
  lum0=r*.299+g*.587+b*.114
  # neutral body tone: median of non-blue body pixels
  if theme=='light': bodyish=(lum0<225)&(lum0>120)&~blue
  else: bodyish=(np.abs(lum0-27)>25)&(lum0<200)&~blue
  tone=np.median(a[bodyish],axis=0)
  np.save(f'{W}/neutral_{theme}_{k}.npy',np.where(blue[...,None],tone,a).astype('uint8'))
  lum=a.min(-1)   # min channel: gray body ~ itself, blue fill smooth and dark, lines bright everywhere
  if theme=='light':
    body=(lum0<232)|blue
  else:
    body=(np.abs(lum0-27)>12)|blue
  sil=nd.binary_fill_holes(nd.binary_closing(body,np.ones((3,3)),iterations=3))
  L=np.where(blue,np.nan,lum)
  med=nd.median_filter(lum,9)
  line=((lum-med)>9)
  if theme=='light': line|=(lum>228)
  core=sil&~nd.binary_dilation(line)&~(~sil)
  core=nd.binary_erosion(core,iterations=1)
  seeds,n=nd.label(core)
  sz=nd.sum(np.ones_like(seeds),seeds,range(1,n+1))
  for i,s in enumerate(sz,1):
    if s<6: seeds[seeds==i]=0
  e=nd.gaussian_filter(lum,0.6)
  reg=watershed(e,seeds,mask=sil)
  np.save(f'{W}/over_{theme}_{k}.npy',reg)
  ids=[i for i in np.unique(reg) if i]
  rng=np.random.default_rng(1);pal=rng.integers(60,240,(reg.max()+1,3));pal[0]=255
  S=4;vis=Image.fromarray((pal[reg]*0.55+a*0.45).astype('uint8')).resize((w*S,h*S),Image.NEAREST)
  d=ImageDraw.Draw(vis)
  for i in ids:
    ys,xs=np.where(reg==i);cy,cx=np.median(ys),np.median(xs)
    # pick a pixel inside nearest to median
    j=np.argmin((ys-cy)**2+(xs-cx)**2);d.text((xs[j]*S-4,ys[j]*S-5),str(i),fill=(0,0,0))
  vis.save(f'{W}/over_{theme}_{k}.png')
  print(k,len(ids))

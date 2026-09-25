#!/usr/bin/env python3
"""build-pixel-font.py [DIR] -- v4.6.135: the Retro look's pixel face.
Builds assets/fonts/web/showup-pixel.woff2 ("ShowUp Pixel") from the 3x5 glyphs
of the ShowUp gym film (the same table its HUD draws with), plus a few marks
the app's labels need. Capitals only; lowercase maps to the same glyphs.
1em = 8 pixels (125 units), so 12/16/24/40px render on whole pixels.
Needs fonttools + brotli (pip install fonttools brotli). Not run by the build:
the woff2 is committed."""
import sys,pathlib
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
G={'A':'010101111101101','B':'110101110101110','C':'011100100100011','D':'110101101101110','E':'111100110100111','F':'111100110100100','G':'011100101101011','H':'101101111101101','I':'111010010010111','J':'001001001101010','K':'101101110101101','L':'100100100100111','M':'101111111101101','N':'110101101101101','O':'010101101101010','P':'110101110100100','Q':'010101101110011','R':'110101110101101','S':'011100010001110','T':'111010010010010','U':'101101101101111','V':'101101101101010','W':'101101111111101','X':'101101010101101','Y':'101101010010010','Z':'111001010100111',
'0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110','4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001110',',':'000000000010100','.':'000000000000010',
# additions in the same 3x5 grid
':':'000010000010000','-':'000000111000000','/':'001001010100100','+':'000010111010000','%':'101001010100101',"'":'010010000000000','!':'010010010000010','?':'110001010000010','(':'001010010010001',')':'100010010010100','·':'000000010000000','×':'000101010101000','&':'010101010101011','#':'101111101111101','"':'101101000000000','=':'000111000111000','<':'001010100010001','>':'100010001010100','_':'000000000000111','*':'000101010101000','→':'000001111001000','←':'000100111100000','↑':'010111010010010','↓':'010010010111010','@':'010101111100011','$':'011110010011110','°':'010101010000000','–':'000000111000000','—':'000000111000000','…':'000000000000101',
}
PX=125;ADV=4*PX
names={' ':'space'}
fb=FontBuilder(1000,isTTF=True)
order=['.notdef','space']
glyphs={}
def draw(bits):
    pen=TTGlyphPen(None)
    for r in range(5):
        c=0
        while c<3:
            if bits[r*3+c]=='1':
                c0=c
                while c<3 and bits[r*3+c]=='1': c+=1
                y1=(5-r)*PX;y0=y1-PX;x0=c0*PX;x1=c*PX
                pen.moveTo((x0,y0));pen.lineTo((x0,y1));pen.lineTo((x1,y1));pen.lineTo((x1,y0));pen.closePath()
            else: c+=1
    return pen.glyph()
empty=TTGlyphPen(None).glyph()
glyphs['.notdef']=empty;glyphs['space']=empty
cmap={32:'space',160:'space'}
for ch,bits in G.items():
    n='g%04X'%ord(ch);order.append(n);glyphs[n]=draw(bits);cmap[ord(ch)]=n
    if ch.isalpha() and ch.isupper(): cmap[ord(ch.lower())]=n
fb.setupGlyphOrder(order);fb.setupCharacterMap(cmap);fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics({n:(ADV if n!='.notdef' else ADV,0) for n in order})
fb.setupHorizontalHeader(ascent=875,descent=-250)
fb.setupNameTable({'familyName':'ShowUp Pixel','styleName':'Regular'})
fb.setupOS2(sTypoAscender=875,sTypoDescender=-250,usWinAscent=875,usWinDescent=250,sxHeight=625,sCapHeight=625)
fb.setupPost()
out=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '.')/'assets/fonts/web/showup-pixel.woff2'
fb.font.flavor='woff2'
fb.save(str(out))
print('build-pixel-font:',out,out.stat().st_size,'bytes')

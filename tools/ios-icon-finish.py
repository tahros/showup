#!/usr/bin/env python3
"""ios-icon-finish.py [DIR] -- make the rendered App Store icons Apple-legal (v4.6.119).
App Store Connect rejects an icon with an alpha channel, even a fully opaque one.
Flattens assets/ios/AppIcon-1024*.png to RGB and checks: 1024x1024, no alpha,
no transparent pixels before flattening. Needs Pillow (run here, not on the Mac)."""
import pathlib, sys
from PIL import Image
d = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve() / "assets/ios"
for f in sorted(d.glob("AppIcon-1024*.png")):
    im = Image.open(f)
    assert im.size == (1024, 1024), f"{f.name}: {im.size}"
    if im.mode in ("RGBA", "LA", "P"):
        a = im.convert("RGBA").getchannel("A")
        assert a.getextrema()[0] == 255, f"{f.name}: has transparent pixels"
    im.convert("RGB").save(f, optimize=True)
    print(f"{f.name}: 1024x1024, RGB, no alpha")

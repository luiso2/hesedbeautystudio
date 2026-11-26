"""Composite the Blender microscopy onto the anatomical half of the 24 fps film.
Usage: python compose-microscopy.py MACRO_DIR AXIS MASTER_JPEG_DIR OUTPUT_DIR [FRAME ...]
AXIS is h, v or pano. Frames outside the two microscope shots are hard linked.
"""
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

macro, axis, masters, output = sys.argv[1:5]
frames = list(map(int, sys.argv[5:])) or range(480)
macro, masters, output = map(Path, (macro, masters, output))
output.mkdir(parents=True, exist_ok=True)

def smooth(x):
    x = max(0, min(1, x))
    return x*x*(3-2*x)

for index in frames:
    source = masters / f"{index:04}.jpg"
    destination = output / source.name
    relative = index - 138
    if not 0 <= relative < 168:
        if not destination.exists():
            os.link(source, destination)
        continue
    detail = macro / f"{relative:03}.jpg"
    img = Image.open(source).convert("RGB")
    width, height = img.size
    left, top = (0, height//2) if axis == "v" else (width//2, 0)
    pane_w, pane_h = width-left, height-top
    is_fluid = relative < 84
    local = relative % 84
    reveal = smooth(min(local / 7, (83-local) / 6))
    # Expand the microscopic field from the vessel, leaving the filmed half
    # untouched and space below the lens for the responsive bilingual captions.
    ax = .44 if is_fluid else .48
    ay = .56 if is_fluid else .40
    cx = left + pane_w*(ax + (.50-ax)*reveal)
    cy = top + pane_h*(ay + (.405-ay)*reveal)
    diameter = round(min(pane_w*.86, pane_h*.735)*(.12+.88*reveal))
    px, py = round(cx-diameter/2), round(cy-diameter/2)
    if reveal:
        lens = Image.open(detail).resize((diameter,diameter),Image.Resampling.LANCZOS)
        mask = Image.new("L",lens.size)
        edge = max(2,round(diameter*.0026))
        ImageDraw.Draw(mask).ellipse((1,1,diameter-2,diameter-2),fill=round(255*reveal))
        mask = mask.filter(ImageFilter.GaussianBlur(max(.65,diameter*.0006)))
        surface = ImageDraw.Draw(lens,"RGBA")
        surface.ellipse((2,2,diameter-3,diameter-3),outline=(61,45,34,210),width=edge*2)
        surface.ellipse((edge+2,edge+2,diameter-edge-3,diameter-edge-3),
                        outline=(242,221,184,236),width=edge)
        img.paste(lens,(px,py),mask)
    img.save(destination,quality=95,subsampling=0)

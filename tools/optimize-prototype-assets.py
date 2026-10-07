"""Create raster derivatives only; never overwrite original artwork."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'prototype' / 'assets'
for path in root.glob('CH*.png'):
    img = Image.open(path).convert('RGBA')
    img.thumbnail((192, 288), Image.Resampling.LANCZOS)
    img.save(path.with_name(path.stem + '_thumb.webp'), quality=82, method=6)
for prefix in ('CH01_', 'CH03_', 'NPC02_', 'NPC03_'):
    for path in root.glob(prefix + '*.png'):
        img = Image.open(path).convert('RGBA')
        img.thumbnail((640, 960), Image.Resampling.LANCZOS)
        img.save(path.with_name(path.stem + '_life.webp'), quality=85, method=6)
world = next(root.glob('MAP04*.png'))
Image.open(world).convert('RGB').save(world.with_suffix('.webp'), quality=80, method=6)
for prefix in ('BG01_', 'BG02_', 'BG03_', 'BG07_'):
    for path in root.glob(prefix + '*.png'):
        img = Image.open(path).convert('RGB')
        img.thumbnail((1280, 720), Image.Resampling.LANCZOS)
        img.save(path.with_name(path.stem + '_screen.webp'), quality=84, method=6)

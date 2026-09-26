# Turns the source images in tools/textures/src into game-ready PBR textures in public/textures:
#   <name>_c.jpg (colour, seamless), <name>_n.jpg (normal map), <name>_r.jpg (roughness, in the green channel
#   as three.js reads it from roughnessMap). Decals (blood, peeling wallpaper) get an alpha channel instead.
# usage: python3 tools/textures/process.py
import os
import numpy as np
from PIL import Image, ImageFilter

SRC = os.path.join(os.path.dirname(__file__), 'src')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'textures')
os.makedirs(OUT, exist_ok=True)

# name: (make seamless in x, in y, blend band as a fraction of size, normal strength, roughness range)
TILES = {
    'wallpaper': (True, True, 0.06, 1.5, (0.75, 0.95)),
    'planks': (True, True, 0.04, 3.0, (0.55, 0.9)),
    'plaster': (True, True, 0.25, 2.5, (0.8, 1.0)),
    'oak': (True, True, 0.25, 2.5, (0.45, 0.8)),
    'rust': (True, True, 0.25, 3.0, (0.55, 0.95)),
    'brass': (True, True, 0.25, 1.5, (0.3, 0.7)),
}
# one-off images (no tiling): name -> size
PICTURES = {'paper': 512, 'portrait': 512}
DECALS = {'blood': 512, 'peel': 512}


def load(name):
    for ext in ('webp', 'png', 'jpg'):
        p = os.path.join(SRC, f'{name}.{ext}')
        if os.path.exists(p):
            return Image.open(p).convert('RGB')
    return None


def seam_weight(n, band):
    """1 in the middle, falling smoothly to 0 within `band` pixels of both ends."""
    x = np.arange(n, dtype=np.float32)
    d = np.minimum(x + 0.5, n - x - 0.5) / max(1, band)
    t = np.clip(d, 0, 1)
    return t * t * (3 - 2 * t)


def make_seamless(a, sx, sy, band):
    """Cross-fade the image with a half-rolled copy of itself near the borders, so it wraps without a seam."""
    h, w, _ = a.shape
    if sx:
        b = np.roll(a, w // 2, axis=1)
        wx = seam_weight(w, band * w)[None, :, None]
        a = a * wx + b * (1 - wx)
    if sy:
        b = np.roll(a, h // 2, axis=0)
        wy = seam_weight(h, band * h)[:, None, None]
        a = a * wy + b * (1 - wy)
    return a


def luminance(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def blur_wrap(x, r):
    img = Image.fromarray(np.clip(x * 255, 0, 255).astype(np.uint8))
    pad = int(r * 3) + 1
    big = np.pad(np.asarray(img), pad, mode='wrap')
    out = np.asarray(Image.fromarray(big).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255
    return out[pad:-pad, pad:-pad]


def flatten(a, amount=0.85):
    """Remove uneven lighting / vignetting: divide out the very blurred brightness, keep the mean colour."""
    lum = luminance(a)
    img = Image.fromarray(np.clip(lum * 255, 0, 255).astype(np.uint8))
    low = np.asarray(img.filter(ImageFilter.GaussianBlur(90)), dtype=np.float32) / 255
    gain = (lum.mean() / np.maximum(low, 0.02)) ** amount
    return np.clip(a * gain[..., None], 0, 1)


def normal_map(height, strength):
    # high-pass the height so large stains don't read as bumps
    h = height - blur_wrap(height, 24) * 0.85
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    n = np.stack([-dx, dy, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return (n * 0.5 + 0.5)


def save(arr, name, q=82, size=None, mode='RGB'):
    img = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8), mode)
    if size:
        img = img.resize((size, size), Image.LANCZOS)
    path = os.path.join(OUT, name)
    if name.endswith('.png'):
        img.save(path, optimize=True)
    else:
        img.save(path, quality=q, optimize=True, progressive=True)
    print(f'{name}: {os.path.getsize(path) // 1024} KB')


for name, (sx, sy, band, strength, (r0, r1)) in TILES.items():
    img = load(name)
    if img is None:
        print(f'skip {name} (no source)')
        continue
    a = np.asarray(img.resize((1024, 1024), Image.LANCZOS), dtype=np.float32) / 255
    a = flatten(a)
    a = make_seamless(a, sx, sy, band)
    lum = luminance(a)
    save(a, f'{name}_c.jpg')
    save(normal_map(lum, strength), f'{name}_n.jpg', q=88)
    # darker = dirtier / deeper = rougher
    l = (lum - lum.min()) / max(1e-5, np.ptp(lum))
    rough = r1 - (r1 - r0) * l
    save(np.stack([rough] * 3, -1), f'{name}_r.jpg', q=80, size=512)

for name, size in PICTURES.items():
    img = load(name)
    if img is None:
        print(f'skip {name} (no source)')
        continue
    save(np.asarray(img, dtype=np.float32) / 255, f'{name}.jpg', size=size)

for name, size in DECALS.items():
    img = load(name)
    if img is None:
        print(f'skip {name} (no source)')
        continue
    a = np.asarray(img.resize((size, size), Image.LANCZOS), dtype=np.float32) / 255
    # the background is (near) white: distance from white becomes opacity
    alpha = np.clip((1 - a.min(-1) - 0.06) * 3.0, 0, 1)
    save(np.concatenate([a, alpha[..., None]], -1), f'{name}.png', mode='RGBA')

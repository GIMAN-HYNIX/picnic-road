"""Cuts a centred character out of its soft background (GrabCut seeded from the border), trims, and saves a transparent PNG."""
import cv2, numpy as np, sys
from PIL import Image
def cut(src, dst, size=512, tol=18):
    img = cv2.imread(src); h, w = img.shape[:2]
    mask = np.full((h, w), cv2.GC_PR_FGD, np.uint8)
    b = int(min(h, w) * 0.03)
    mask[:b, :] = mask[-b:, :] = cv2.GC_BGD; mask[:, :b] = mask[:, -b:] = cv2.GC_BGD
    mask[int(h * .9):, int(w * .7):] = cv2.GC_BGD                      # the watermark corner is always background
    # pixels close to the average border colour start as probable background
    border = np.concatenate([img[:b].reshape(-1, 3), img[-b:].reshape(-1, 3), img[:, :b].reshape(-1, 3), img[:, -b:].reshape(-1, 3)]).astype(np.float32)
    dist = np.linalg.norm(img.astype(np.float32)[:, :, None, :] - border[::max(1, len(border) // 64)][None, None], axis=3).min(axis=2)
    mask[(dist < tol) & (mask == cv2.GC_PR_FGD)] = cv2.GC_PR_BGD
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
    alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # keep only the biggest blob, fill its holes, soften the edge a little
    n, lab, stats, _ = cv2.connectedComponentsWithStats(alpha)
    if n > 1:
        keep = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]); alpha = np.where(lab == keep, 255, 0).astype(np.uint8)
    cnts, _ = cv2.findContours(alpha, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(alpha, cnts, -1, 255, -1)
    alpha = cv2.erode(alpha, np.ones((3, 3), np.uint8)); alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2RGBA); rgba[:, :, 3] = alpha
    im = Image.fromarray(rgba); bbox = im.getbbox(); im = im.crop(bbox)
    im.thumbnail((size, size), Image.LANCZOS)
    im.save(dst); print(dst, im.size)
for pair in sys.argv[1:]:
    s, d = pair.split('=')
    cut(f'raw/{s}.jpg', f'sprites/{d}.png')

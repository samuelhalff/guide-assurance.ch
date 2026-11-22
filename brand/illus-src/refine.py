"""Affine l'illustration du bouquetin (brand/bouquetin/bouquetin-detoure.webp).
1. Bouche l'encoche de détourage sur le poitrail.
2. Ajoute les nodosités des cornes (le trait distinctif du bouquetin des Alpes) :
   bandes transversales suivant les lignes d'égale distance le long de la corne,
   plus marquées à la base, absentes vers la pointe.
Usage : python refine.py IN.webp OUT.webp"""
import sys, cv2, numpy as np
from collections import deque
src, out = sys.argv[1], sys.argv[2]
im = cv2.imread(src, cv2.IMREAD_UNCHANGED)  # BGRA
bgr, a = im[..., :3].copy(), im[..., 3].copy()
h, w = a.shape
# 1. encoche du poitrail : du blanc opaque resté du fond. On redresse le bord en ligne droite
#    (comme une facette) entre deux rangées saines, puis on repeint par inpainting.
hsv0 = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
ochre = (a > 200) & (hsv0[..., 1] > 110)
def edge(y): xs = np.nonzero(ochre[y, 540:660])[0]; return 540 + xs.max()
Y0, Y1 = 510, 584; e0, e1 = 599, edge(Y1)   # du dessous du menton au poitrail
hole = np.zeros((h, w), np.uint8)
for y in range(Y0, Y1 + 1):
    xe = int(round(e0 + (e1 - e0) * (y - Y0) / (Y1 - Y0)))
    seg = slice(560, xe + 1)
    hole[y, seg] = (~ochre[y, seg]).astype(np.uint8)
    a[y, seg] = 255; a[y, xe + 1:680] = 0
# une seule couleur plate pour toute la facette réparée (pas de flou, pas de bord dentelé)
patch = np.zeros((h, w), bool)
for y in range(Y0, Y1 + 1):
    xe = int(round(e0 + (e1 - e0) * (y - Y0) / (Y1 - Y0))); patch[y, 588:xe + 1] = True
col = np.median(bgr[patch & ochre], axis=0)
bgr[patch] = col
# 2. cornes
hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
Sx, Vx = hsv[..., 1].astype(int), hsv[..., 2].astype(int)
horn = ((a > 200) & (((Vx < 150) & (Sx < 140)) | ((Sx < 50) & (Vx < 190)))).astype(np.uint8)
horn[400:] = 0
horn = cv2.morphologyEx(horn, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
horn = cv2.morphologyEx(horn, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(horn)
comps = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 3000]
print('composantes', len(comps))
res = bgr.astype(np.float32)
for i in comps:
    m = lab == i
    # base : pixels de corne qui touchent la tête (opaque, non-corne)
    head = ((a > 200) & (horn == 0) & (Sx > 120) & (Vx > 120)).astype(np.uint8)  # pelage ocre
    touch = m & (cv2.dilate(head, np.ones((5, 5), np.uint8)) > 0)
    d = np.full((h, w), -1, np.int32); q = deque()
    for y, x in zip(*np.nonzero(touch)): d[y, x] = 0; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            yy, xx = y+dy, x+dx
            if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and d[yy, xx] < 0:
                d[yy, xx] = d[y, x] + 1; q.append((yy, xx))
    # bandes droites : chaque pixel prend l'abscisse du point le plus proche de l'axe de sa corne
    from scipy.spatial import cKDTree
    upper = (m & (d > 45)).astype(np.uint8)
    nn, lab2, st2, _ = cv2.connectedComponentsWithStats(upper)
    pts, arc = [], []
    for j2 in range(1, nn):
        if st2[j2, cv2.CC_STAT_AREA] < 1500: continue
        mm = lab2 == j2; dm = d[mm]; yy, xx = np.nonzero(mm)
        cl = []
        for b0 in range(dm.min(), dm.max(), 6):
            sel = (dm >= b0) & (dm < b0 + 6)
            if sel.sum() > 5: cl.append((xx[sel].mean(), yy[sel].mean(), b0))
        cl = np.array(cl); s_ = np.r_[0, np.cumsum(np.hypot(*np.diff(cl[:, :2], axis=0).T))] + cl[0, 2]
        pts.append(cl[:, :2]); arc.append(s_)
    pts = np.vstack(pts); arc = np.concatenate(arc); tree = cKDTree(pts)
    yy, xx = np.nonzero(m); _, idx = tree.query(np.c_[xx, yy])
    dd = np.full((h, w), -1, np.float32); dd[yy, xx] = np.where(d[yy, xx] > 45, arc[idx], d[yy, xx])
    L = dd.max(); sp = 26
    ph = np.mod(dd - 14, sp) / sp                  # phase dans chaque nodosité
    fade = np.clip(1.15 - dd / (0.62 * L), 0, 1)     # forte à la base, nulle avant la pointe
    hi = (ph < 0.20) & m & (d > 45)               # arête éclairée
    lo = (ph >= 0.20) & (ph < 0.32) & m & (d > 45)  # ombre juste derrière
    for sel, f in ((hi, 1 + 0.42 * fade), (lo, 1 - 0.28 * fade)):
        res[sel] *= f[sel][:, None]
    print('corne', i, 'longueur', L, 'pas', sp)
res = np.clip(res, 0, 255).astype(np.uint8)
outim = np.dstack([res, a])
cv2.imwrite(out, outim, [cv2.IMWRITE_WEBP_QUALITY, 92])

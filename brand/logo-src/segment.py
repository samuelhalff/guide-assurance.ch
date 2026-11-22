import cv2, numpy as np, sys
src = sys.argv[1]; out = sys.argv[2]
im = cv2.imread(src); hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
H,S,V = cv2.split(hsv)
body = ((S > 115) & (H < 30) & (V > 60)).astype(np.uint8)          # ochre
yy,xx = np.mgrid[0:im.shape[0],0:im.shape[1]]
body[yy>1000]=0
horn = ((V < 200) & ((S < 70) | (V < 110)) & (yy < 420) & (xx > 780) & (xx < 1140)).astype(np.uint8)
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5))
def clean(m, close=7):
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(close,close)))
    n,lab,st,_ = cv2.connectedComponentsWithStats(m)
    keep = [i for i in range(1,n) if st[i,cv2.CC_STAT_AREA] > 1500]
    return np.isin(lab, keep).astype(np.uint8)
body = clean(body, 9); horn = clean(horn, 9)
def fill(m):
    cs,_ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    o = np.zeros_like(m); cv2.drawContours(o, cs, -1, 1, -1); return o
body = fill(body); horn = fill(horn); body[horn>0]=0
vis = im.copy(); vis[body>0] = (60,150,230); vis[horn>0] = (200,40,200)
cv2.imwrite(out, vis)
np.save(out.replace('.png','-body.npy'), body); np.save(out.replace('.png','-horn.npy'), horn)
print(body.sum(), horn.sum())

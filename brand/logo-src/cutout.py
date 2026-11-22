import cv2, numpy as np, sys
SRC, SEG, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
im = cv2.imread(SRC); h,w = im.shape[:2]
body = np.load(SEG+'-body.npy'); horn = np.load(SEG+'-horn.npy')
fg0 = ((body|horn)>0).astype(np.uint8)
mask = np.full((h,w), cv2.GC_BGD, np.uint8)
dil = cv2.dilate(fg0, np.ones((25,25),np.uint8)); ero = cv2.erode(fg0, np.ones((9,9),np.uint8))
mask[dil>0] = cv2.GC_PR_BGD
mask[fg0>0] = cv2.GC_PR_FGD
mask[ero>0] = cv2.GC_FGD
yy = np.mgrid[0:h,0:w][0]; mask[yy>1004] = cv2.GC_BGD
bg=np.zeros((1,65),np.float64); fgm=np.zeros((1,65),np.float64)
cv2.grabCut(im, mask, None, bg, fgm, 6, cv2.GC_INIT_WITH_MASK)
fg = np.isin(mask,[cv2.GC_FGD,cv2.GC_PR_FGD]).astype(np.uint8)
n,lab,st,_ = cv2.connectedComponentsWithStats(fg); big = 1+np.argmax(st[1:,cv2.CC_STAT_AREA]); fg=(lab==big).astype(np.uint8)
cs,_=cv2.findContours(fg,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); fg=np.zeros_like(fg); cv2.drawContours(fg,cs,-1,1,-1)
np.save(SEG+'-fg.npy', fg)
a = cv2.GaussianBlur(fg.astype(np.float32),(3,3),0.8)
x,y,ww,hh = cv2.boundingRect(fg); pad=4
x0,y0,x1,y1 = max(0,x-pad),max(0,y-pad),min(w,x+ww+pad),min(h,y+hh+pad)
rgba = cv2.cvtColor(im, cv2.COLOR_BGR2BGRA); rgba[...,3] = (a*255).astype(np.uint8)
crop = rgba[y0:y1,x0:x1]
cv2.imwrite(OUT, crop, [cv2.IMWRITE_WEBP_QUALITY, 92])
print('bbox', x0,y0,x1,y1, 'size', crop.shape[1], crop.shape[0])

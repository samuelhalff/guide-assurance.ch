import cv2, numpy as np, sys, os
from scipy.spatial import Delaunay
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
SRC=sys.argv[1]; SEG=sys.argv[2]; OUT=sys.argv[3]; os.makedirs(OUT,exist_ok=True)
im=cv2.imread(SRC); rgb=cv2.cvtColor(im,cv2.COLOR_BGR2RGB)
horn=np.load(SEG+'-horn.npy'); fg=np.load(SEG+'-fg.npy')
horn=(horn&fg).astype(np.uint8); body=((fg>0)&(horn==0)).astype(np.uint8)
def poly(mask, eps):
    cs,_=cv2.findContours(mask.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    ps=[]
    for c in cs:
        if cv2.contourArea(c)<800: continue
        a=cv2.approxPolyDP(c,eps,True)[:,0,:].astype(float)
        p=Polygon(a).buffer(0)
        ps.append(p)
    return unary_union(ps)
def smoothm(m,k):
    K=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k,k))
    return cv2.morphologyEx(cv2.morphologyEx(m.astype(np.uint8),cv2.MORPH_CLOSE,K),cv2.MORPH_OPEN,K)
B=poly(body,2.2); Hn=poly(horn,2.0).difference(B.buffer(-1))
BF=poly(smoothm(body,17),7.5); HF=poly(smoothm(horn,9),4.5).difference(BF.buffer(-1))
ALLF=unary_union([BF,HF])
ALL=unary_union([B,Hn])
minx,miny,maxx,maxy=ALL.bounds; pad=12
VB=(minx-pad,miny-pad,maxx-minx+2*pad,maxy-miny+2*pad)
def path(g):
    gs=[g] if g.geom_type=='Polygon' else [x for x in getattr(g,'geoms',[]) if x.geom_type=='Polygon']
    d=''
    for p in gs:
        for ring in [p.exterior,*p.interiors]:
            c=list(ring.coords)[:-1]
            d+='M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in c)+'Z'
    return d
def svg(inner, vb=VB, title="Guide Assurance"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.0f} {vb[1]:.0f} {vb[2]:.0f} {vb[3]:.0f}" role="img" aria-label="{title}"><title>{title}</title>{inner}</svg>\n'
OCRE='#D9953C'; ANTH='#3B3739'
# bicolore & mono
open(f'{OUT}/logo-bicolore.svg','w').write(svg(f'<path fill="{OCRE}" d="{path(BF)}"/><path fill="{ANTH}" d="{path(HF)}"/>'))
open(f'{OUT}/logo-monochrome.svg','w').write(svg(f'<path fill="{ANTH}" d="{path(ALLF)}"/>'))
# facets: corners from the illustration + polygon vertices -> Delaunay, clip, colour by mean
def facets(region, mask, n, mind, levels, ramp):
    gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    cs=cv2.goodFeaturesToTrack(gray,n,0.01,mind,mask=(mask*255).astype(np.uint8))
    pts=[tuple(p) for p in cs[:,0,:]] if cs is not None else []
    gs=[region] if region.geom_type=='Polygon' else [x for x in region.geoms if x.geom_type=='Polygon']
    for g in gs: pts+=list(g.exterior.coords)[:-1]
    pts=np.array(pts); tri=Delaunay(pts); out=[]
    for s in tri.simplices:
        t=Polygon(pts[s]).intersection(region)
        if t.is_empty or t.area<6: continue
        m=np.zeros(mask.shape,np.uint8); cv2.fillPoly(m,[pts[s].astype(np.int32)],1)
        sel=(m>0)&(mask>0)
        if sel.sum()<3: continue
        col=rgb[sel].mean(0); lum=col.mean()
        out.append((t,lum))
    if not out: return ''
    lums=np.array([l for _,l in out]); qs=np.quantile(lums,np.linspace(0,1,levels+1)[1:-1])
    s=''
    for t,l in out:
        k=int(np.searchsorted(qs,l)); c=ramp[k]
        s+=f'<path fill="{c}" stroke="{c}" stroke-width="0.6" stroke-linejoin="round" d="{path(t)}"/>'
    return s
OR=['#8A521C','#A2622A','#B87432','#CA8538','#D9953C','#E3A44E','#EDB767','#F5CD8E']
AR=['#1F1C1E','#2A2729','#353133','#433E3F','#57514F','#706966']
fb=facets(B,body,320,15,8,OR); fh=facets(Hn,horn,90,13,6,AR)
open(f'{OUT}/logo-facettes.svg','w').write(svg(fb+fh))
# head: crop region around head + horns, cut neck diagonally
cut=Polygon([(855,miny-5),(1150,miny-5),(1150,560),(990,548),(905,468),(855,430)])
HB=B.intersection(cut); HH=Hn.intersection(cut)
hb=unary_union([HB,HH]).bounds; vbh=(hb[0]-10,hb[1]-10,hb[2]-hb[0]+20,hb[3]-hb[1]+20)
fbh=facets(HB,body,70,20,6,OR); fhh=facets(HH,horn,40,20,5,AR)
open(f'{OUT}/logo-tete-facettes.svg','w').write(svg(fbh+fhh,vbh))
open(f'{OUT}/logo-tete.svg','w').write(svg(f'<path fill="{OCRE}" d="{path(BF.intersection(cut))}"/><path fill="{ANTH}" d="{path(HF.intersection(cut))}"/>',vbh))
print('VB',VB,'head',vbh, 'pts B', len(B.exterior.coords) if B.geom_type=='Polygon' else 'multi')

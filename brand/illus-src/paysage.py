"""Tête de l'accueil.
- Jour : l'illustration d'origine, copiée telle quelle (aucune retouche, aucun réencodage).
- Nuit : la même image, transformée pixel par pixel de façon uniforme (teinte bleue en produit, puis saturation),
  sans détourage : aucun liseré, aucune tache, même netteté que le jour.
Imprime aussi les dégradés CSS du bord gauche (fond de .paysage)."""
import shutil
from PIL import Image, ImageChops, ImageEnhance
import numpy as np
SRC='/home/sam/dev/courtier/brand/bouquetin/bouquetin-illustration-site.webp'; OUT='/home/sam/dev/courtier/site/public/brand/'
shutil.copyfile(SRC, OUT+'bouquetin-paysage.webp')
src=Image.open(SRC).convert('RGB')
nuit=ImageEnhance.Brightness(ImageEnhance.Color(ImageChops.multiply(src, Image.new('RGB',src.size,'#a3b1cf'))).enhance(1.8)).enhance(1.08)
# pleine lune à droite des cornes : disque net (suréchantillonné) et halo doux
W,H=nuit.size; CX,CY,R=1250,170,44
yy,xx=np.mgrid[0:H,0:W].astype(np.float32); d=np.hypot(xx-CX,yy-CY)
halo=(np.exp(-((d/R-1).clip(0))/2.2)*0.38)[...,None]*(d>R)[...,None]
k=4; big=np.zeros((H*k//8+1,),np.float32)
disc=np.clip(R+0.5-d,0,1)[...,None]  # bord antialiasé ~1 px
a=np.asarray(nuit).astype(np.float32)/255
moon=np.array([0xf4,0xf1,0xe8])/255; glow=np.array([0xdc,0xe2,0xf0])/255
a=a*(1-halo)+glow*halo
shade=(0.94+0.06*((xx-CX)/R).clip(-1,1))[...,None]  # léger relief du disque
a=a*(1-disc)+(moon*shade)*disc
nuit=Image.fromarray((np.clip(a,0,1)*255+0.5).astype(np.uint8))
nuit.save(OUT+'bouquetin-paysage-nuit.webp', quality=94, method=6)
for n in ['bouquetin-paysage','bouquetin-paysage-nuit']:
    a=np.asarray(Image.open(OUT+n+'.webp').convert('RGB')).astype(np.float32); H=a.shape[0]; col=a[:,:12].mean(1); st=[]
    for p in range(0,101,10):
        y=int(min(p,90)/100*(H-1)); c=col[max(0,y-6):y+6].mean(0).round().astype(int); st.append(f"#{c[0]:02x}{c[1]:02x}{c[2]:02x} {p}%")
    print(n, "linear-gradient(to bottom, "+", ".join(st)+")")

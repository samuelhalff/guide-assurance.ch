"""Projette le contour OSM du Léman (relation 332617) en LV95 puis en coordonnées SVG de la carte d'accueil."""
import json, sys, math
SRC = sys.argv[1]
S = 6.2                     # px par km, identique en X et en Y
X0, E0 = 700, 2497.0        # x = X0 + (E-E0)*S
Y0, N0 = 690, 1115.0        # y = Y0 - (N-N0)*S
def lv95(lat, lon):
    p = (lat*3600 - 169028.66)/10000; l = (lon*3600 - 26782.5)/10000
    E = 2600072.37 + 211455.93*l - 10938.51*l*p - 0.36*l*p*p - 44.54*l**3
    N = 1200147.07 + 308807.95*p + 3745.25*l*l + 76.63*p*p - 194.56*l*l*p + 119.79*p**3
    return E/1000, N/1000
def svg(E, N): return X0 + (E-E0)*S, Y0 - (N-N0)*S
d = json.load(open(SRC))
rel = [e for e in d['elements'] if e['id'] == 332617][0]
ways = [[(g['lat'], g['lon']) for g in m['geometry']] for m in rel['members'] if m['type']=='way' and m['role']=='outer']
ring = ways.pop(0)
while ways:
    for i, w in enumerate(ways):
        if w[0] == ring[-1]: ring += w[1:]; break
        if w[-1] == ring[-1]: ring += w[::-1][1:]; break
    else: break
    ways.pop(i)
pts = [svg(*lv95(a, b)) for a, b in ring]
def dp(P, eps):
    if len(P) < 3: return P
    (x1,y1),(x2,y2) = P[0], P[-1]; L = math.hypot(x2-x1, y2-y1) or 1e-9
    i, dm = 0, 0
    for k in range(1, len(P)-1):
        x,y = P[k]; dd = abs((y2-y1)*x-(x2-x1)*y+x2*y1-y2*x1)/L
        if dd > dm: i, dm = k, dd
    return dp(P[:i+1], eps)[:-1] + dp(P[i:], eps) if dm > eps else [P[0], P[-1]]
h = len(pts)//2
simp = dp(pts[:h+1], 0.6)[:-1] + dp(pts[h:], 0.6)[:-1]
print('LEFTOVER_WAYS', len(ways), 'RAW', len(pts), 'SIMPLE', len(simp))
xs=[p[0] for p in simp]; ys=[p[1] for p in simp]; print('BBOX', min(xs), min(ys), max(xs), max(ys))
print('PATH M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in simp) + 'Z')
for name, ll in {'geneve':(46.2044,6.1432),'nyon':(46.3833,6.2396),'morges':(46.5113,6.4985),'lausanne':(46.5197,6.6323),'vevey':(46.4628,6.8419),'montreux':(46.4312,6.9107),'thonon':(46.3705,6.4793),'evian':(46.4008,6.5898),'naye':(46.4325,6.9774),'stgingolph':(46.3924,6.8045),'hermance':(46.3016,6.2440),'villeneuve':(46.3970,6.9277),'stmaurice':(46.2158,7.0034),'dole':(46.4255,6.0994),'neuchatel':(46.9900,6.9293),'yverdon':(46.7785,6.6411),'gex':(46.3334,6.0578),'chancy':(46.1500,5.9706)}.items():
    E,N = lv95(*ll); x,y = svg(E,N); print(f'PT {name} {x:.0f} {y:.0f}  (E {E:.1f} N {N:.1f})')

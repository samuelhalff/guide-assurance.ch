import { LEMAN_D } from "@/components/site/carte-leman";
import type { Locale } from "@/lib/i18n";

/* Grande carte de l'arc lémanique (> 820 px). Toutes les couleurs passent par des classes (accueil.css) :
   le thème sombre en fait une carte de nuit sans autre code. */
const ITIN = [
  { id: "sante", masque: "m-sante", d: "M930 300 C985 268 1045 262 1112 250" },
  { id: "frontaliers", masque: "m-front", d: "M930 300 C926 400 916 520 904 642" },
  { id: "arrivee", masque: "m-arrivee", d: "M930 300 C902 250 884 180 880 106" },
  { id: "prevoyance", masque: "m-prev", d: "M930 300 C1000 230 1080 170 1160 136" },
];

export function CarteAccueil({ locale = "fr" }: { locale?: Locale }) {
  const isEn = locale === "en";
  return (
    <svg className="carte" viewBox="0 0 1440 800" preserveAspectRatio="xMaxYMid slice" role="img" aria-labelledby="carte-titre">
      <title id="carte-titre">{isEn ? "Map of the Lake Geneva region: four routes leave from the same starting point" : "Carte de l’arc lémanique : quatre parcours partent d’un même point de départ"}</title>
      <defs>
        <filter id="flou-ombre" x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="relief" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow className="c-ombre-portee" dx="6" dy="4" stdDeviation="4" floodOpacity=".22" />
        </filter>
        <pattern id="hachure" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line className="c-hachure" x1="0" y1="0" x2="0" y2="7" strokeWidth="1.5" />
        </pattern>
        {ITIN.map((i) => (
          <mask key={i.id} id={i.masque}>
            <path className="trace" pathLength={1} strokeDasharray="1" d={i.d} />
          </mask>
        ))}
      </defs>

      <rect className="c-fond" width="1440" height="800" />

      {/* Quadrillage de coordonnées */}
      <g className="c-grille" strokeWidth="1">
        <path d="M594.6 0V800M718.6 0V800M842.6 0V800M966.6 0V800M1090.6 0V800M1214.6 0V800M1338.6 0V800M0 39H1440M0 163H1440M0 287H1440M0 411H1440M0 535H1440M0 659H1440M0 783H1440" />
      </g>
      <g className="lbl-coord">
        <text x="601" y="16">2 480</text><text x="725" y="16">2 500</text><text x="849" y="16">2 520</text><text x="973" y="16">2 540</text><text x="1097" y="16">2 560</text><text x="1221" y="16">2 580</text><text x="1345" y="16">2 600</text>
        <text x="1392" y="157">1 200</text><text x="1392" y="281">1 180</text><text x="1392" y="405">1 160</text><text x="1392" y="529">1 140</text><text x="1392" y="653">1 120</text>
      </g>

      {/* Jura : courbes de niveau au nord-ouest */}
      <g className="c-courbes" fill="none" strokeWidth="1.1" opacity=".75">
        <path d="M584 678 C597 660 629 612 664 571 C698 530 744 483 792 433 C840 383 903 323 951 270 C1000 218 1043 162 1082 120 C1122 78 1163 41 1188 18 C1213 -5 1225 -11 1233 -17" />
        <path d="M551 654 C565 636 603 592 637 549 C671 507 709 451 756 399 C802 346 864 285 914 234 C964 183 1015 135 1056 95 C1097 55 1138 17 1161 -8 C1184 -33 1189 -47 1195 -55" />
        <path d="M521 631 C533 612 562 560 595 516 C628 472 672 417 721 366 C770 315 839 261 890 211 C941 160 987 108 1025 65 C1064 23 1098 -22 1122 -47 C1145 -72 1158 -78 1165 -85" />
      </g>
      <path
        d="M494 612 C507 593 538 541 573 498 C608 455 657 404 707 353 C757 302 822 244 872 193 C921 141 962 85 1001 42 C1040 -0 1079 -40 1104 -64 C1129 -87 1144 -93 1152 -98 L1102 -148 L1067 -100 L963 6 L821 143 L659 309 L535 468 L448 577Z"
        fill="url(#hachure)"
        opacity=".7"
      />
      <text className="lbl-relief" x="743" y="387" transform="rotate(-45 743 387)">JURA</text>
      <text className="lbl-relief" x="1180" y="760" textAnchor="middle">{isEn ? "VAUD ALPS" : "ALPES VAUDOISES"}</text>

      {/* Forêts */}
      <g className="c-foret" strokeWidth="1">
        <path d="M1010 150 C1050 128 1110 136 1128 168 C1146 200 1100 222 1060 214 C1020 206 990 176 1010 150 Z" />
        <path d="M560 360 C584 344 620 352 622 374 C624 396 596 404 574 398 C552 392 546 374 560 360 Z" />
      </g>

      {/* Alpes : relief au sud-est */}
      <g className="c-courbes" fill="none" strokeWidth="1.1" opacity=".8">
        <path d="M1132 534 m-26 0 a26 18 0 1 0 52 0 a26 18 0 1 0 -52 0" />
        <path d="M1132 534 m-52 0 a52 36 0 1 0 104 0 a52 36 0 1 0 -104 0" />
        <path d="M1132 534 m-80 0 a80 56 0 1 0 160 0 a80 56 0 1 0 -160 0" />
        <path d="M1180 760 C1220 690 1300 660 1380 650 C1410 646 1430 648 1440 650" />
        <path d="M1140 800 C1190 720 1280 690 1370 680 C1400 676 1424 678 1440 680" />
        <path d="M1230 800 C1270 752 1330 728 1400 722 L1440 722" />
        <path d="M1010 800 C1060 730 1120 690 1180 668" />
        <path d="M940 800 C980 744 1040 712 1100 694" />
      </g>

      {/* Rhône */}
      <path className="c-riviere" d="M719 676 C704 684 688 690 670 698 C650 707 628 716 600 728 C570 740 540 752 500 772" fill="none" strokeWidth="3" />
      <path className="c-riviere" d="M1093 550 C1104 584 1118 628 1130 669 C1140 704 1150 734 1162 749 C1178 768 1190 786 1200 800" fill="none" strokeWidth="3" />

      {/* Léman */}
      <path className="c-lac" d={LEMAN_D} strokeWidth="1.4" />
      <text className="lbl-eau" x="940" y="500">{isEn ? "LAKE GENEVA" : "LÉMAN"}</text>

      {/* Frontière nationale */}
      <path
        className="c-frontiere"
        opacity=".55"
        d="M1000 160 L905 237 L824 330 L750 411 L712 480 L700 520 L712 566 L714 604 L692 640 L662 662 L635 709 L700 714 L756 681 L768 606 C800 572 840 540 880 522 C910 510 940 504 975 508 C1000 512 1022 526 1036 547 L1050 600 L1080 660 L1094 720 L1100 800"
        fill="none"
        strokeWidth="2"
        strokeDasharray="10 4 2 4"
      />
      <text className="lbl" x="760" y="752">FRANCE</text>

      {/* Localités */}
      <g className="c-encre">
        <rect x="715" y="669" width="9" height="9" />
        <rect x="951" y="449" width="9" height="9" />
      </g>
      <circle className="c-localite" cx="881" cy="561" r="3.5" />
      <g>
        <text className="lbl-ville" x="730" y="696">{isEn ? "Geneva" : "Genève"}</text>
        <text className="lbl-ville" x="964" y="442">Lausanne</text>
        <text className="lbl" x="890" y="584">Thonon-les-Bains</text>
      </g>

      {/* Itinéraires */}
      {ITIN.map((i) => (
        <g key={i.id} className="itin" data-itin={i.id}>
          <path className="sentier" mask={`url(#${i.masque})`} d={i.d} />
        </g>
      ))}

      {/* Bouquetin debout sur « Vous êtes ici » */}
      <ellipse className="ombre-bq c-ombre" cx="1300" cy="572" rx="86" ry="10" opacity=".18" filter="url(#flou-ombre)" />
      <image
        className="bouquetin"
        href="/brand/bouquetin-carte.webp"
        x="1180"
        y="344"
        width="184"
        height="230"
        transform="matrix(-1 0 0 1 2544 0)"
        filter="url(#relief)"
      />

      {/* Vous êtes ici */}
      <g>
        <circle className="c-depart" cx="930" cy="300" r="15" strokeWidth="2" />
        <circle className="c-depart-point" cx="930" cy="300" r="7" />
        <text className="lbl-ville" x="946" y="336">{isEn ? "Starting point" : "Point de départ"}</text>
      </g>

      {/* Destinations : étiquettes discrètes */}
      <g aria-hidden="true">
        <g className="dest-mini" data-dest="sante"><circle cx="1112" cy="250" r="6" /><text x="1124" y="256" textAnchor="start">{isEn ? "Health insurance" : "Santé du foyer"}</text></g>
        <g className="dest-mini" data-dest="frontaliers"><circle cx="904" cy="642" r="6" /><text x="918" y="648" textAnchor="start">{isEn ? "Cross-border workers" : "Frontaliers"}</text></g>
        <g className="dest-mini" data-dest="arrivee"><circle cx="880" cy="106" r="6" /><text x="880" y="90" textAnchor="middle">{isEn ? "New arrivals" : "Nouveaux arrivants"}</text></g>
        <g className="dest-mini" data-dest="prevoyance"><circle cx="1160" cy="136" r="6" /><text x="1172" y="142" textAnchor="start">{isEn ? "Pillar 3a and death cover" : "3e pilier et décès"}</text></g>
      </g>
    </svg>
  );
}

/* Mini-carte mobile (≤ 820 px), dessinée pour 390 px : le vrai tracé du Léman réduit, le point de départ
   sur la rive nord et les quatre destinations autour. Même logique de sélection que la grande carte. */
export const MM_LEMAN_D = "M260.2 60.2 L260.7 60.4 L262.4 59.3 L263.0 58.3 L263.5 58.4 L264.2 56.1 L267.2 55.1 L270.2 55.4 L278.7 58.1 L281.2 56.4 L284.8 54.3 L286.9 54.6 L290.1 55.6 L292.7 56.9 L291.7 56.4 L294.4 57.2 L296.6 58.3 L298.1 59.2 L299.0 58.5 L306.2 59.0 L307.0 59.3 L307.6 59.8 L308.7 60.0 L310.9 59.7 L313.8 60.8 L322.8 66.8 L326.3 65.6 L333.3 69.3 L340.5 71.5 L345.9 73.7 L347.4 73.5 L348.9 73.4 L351.9 74.0 L352.9 76.9 L358.1 80.6 L358.6 80.4 L360.9 81.7 L365.4 84.6 L366.1 84.7 L370.3 84.8 L372.6 87.1 L373.4 89.4 L376.2 90.5 L377.4 93.5 L378.1 98.0 L376.7 101.0 L375.0 101.5 L371.4 101.7 L368.9 102.6 L367.0 102.2 L366.8 101.9 L366.6 101.7 L365.4 101.8 L359.4 102.3 L359.3 103.6 L359.2 104.8 L358.3 105.4 L358.2 106.0 L358.2 105.2 L355.4 104.7 L347.5 104.0 L344.7 102.4 L332.7 100.0 L326.1 98.2 L311.2 97.0 L299.6 97.5 L291.3 98.6 L286.7 98.9 L273.4 100.9 L268.8 98.5 L266.9 97.6 L258.9 102.0 L257.0 108.9 L256.9 109.0 L255.1 109.8 L244.4 114.7 L237.4 118.0 L234.0 121.8 L233.6 122.1 L231.4 121.9 L223.0 113.6 L221.4 110.4 L216.0 109.8 L215.4 110.8 L210.2 112.6 L204.3 117.6 L203.3 119.7 L199.2 126.5 L198.2 129.4 L195.6 134.7 L193.9 137.7 L190.0 142.5 L181.8 150.8 L180.6 155.9 L180.5 159.1 L175.4 169.5 L173.6 169.4 L173.0 171.7 L172.3 171.9 L171.9 172.1 L171.6 172.4 L168.4 173.3 L169.5 171.2 L169.8 170.8 L169.6 167.1 L169.8 157.7 L169.3 155.5 L172.1 151.1 L173.3 151.3 L174.7 147.3 L174.4 141.1 L174.4 139.8 L176.6 136.9 L178.0 135.2 L177.9 134.4 L183.5 125.4 L184.7 121.7 L185.4 118.5 L187.0 115.4 L191.9 109.5 L193.5 107.1 L194.0 106.7 L195.5 105.2 L198.6 101.3 L202.8 102.4 L205.0 99.8 L207.3 93.3 L208.8 89.6 L211.8 87.2 L215.2 82.1 L219.7 78.2 L220.4 77.1 L227.1 74.9 L232.5 74.1 L234.4 75.3 L237.9 76.2 L246.3 72.1 L251.6 68.9 L253.7 66.0 L258.4 64.3 L259.1 61.8Z";

export function MiniCarte({ locale = "fr" }: { locale?: Locale }) {
  const isEn = locale === "en";
  return (
    <svg className="mini-carte" viewBox="0 0 390 180" role="img" aria-labelledby="mm-t" focusable="false">
      <title id="mm-t">{isEn ? "Map: from the starting point, four routes to new arrivals, pillar 3a, health and cross-border workers" : "Carte : depuis le point de départ, quatre itinéraires vers les nouveaux arrivants, le 3e pilier, la santé et les frontaliers"}</title>
      <g className="mm-grille" aria-hidden="true"><path d="M0 43H390M0 86H390M0 129H390M97.5 0V180M195 0V180M292.5 0V180" /></g>
      <path className="mm-lac" d={MM_LEMAN_D} />
      <text className="mm-eau" x="294" y="81" textAnchor="middle">{isEn ? "LAKE GENEVA" : "LÉMAN"}</text>
      <g className="mm-traces" aria-hidden="true">
        <path data-itin="arrivee" d="M304 44 C224 38 110 40 36 42" />
        <path data-itin="prevoyance" d="M304 44 C294 30 274 22 258 16" />
        <path data-itin="sante" d="M304 44 C328 36 350 26 366 18" />
        <path data-itin="frontaliers" d="M304 44 C224 54 150 96 112 150" />
      </g>
      <g className="mm-dest" data-dest="arrivee"><circle cx="36" cy="42" r="6" /><text x="24" y="28">{isEn ? "New arrivals" : "Nouveaux arrivants"}</text></g>
      <g className="mm-dest" data-dest="prevoyance"><circle cx="258" cy="16" r="6" /><text x="246" y="21" textAnchor="end">{isEn ? "Pillar 3a" : "3e pilier"}</text></g>
      <g className="mm-dest" data-dest="sante"><circle cx="366" cy="18" r="6" /><text x="352" y="23" textAnchor="end">{isEn ? "Health" : "Santé"}</text></g>
      <g className="mm-dest" data-dest="frontaliers"><circle cx="112" cy="150" r="6" /><text x="100" y="155" textAnchor="end">{isEn ? "Cross-border" : "Frontaliers"}</text></g>
      {/* Bouquetin sur la rive sud (Chablais), entier dans la bande de 180 px. */}
      <g aria-hidden="true">
        <ellipse className="mm-ombre-bq" cx="340" cy="176" rx="24" ry="3" />
        <image href="/brand/bouquetin-carte.webp" x="313" y="110" width="54" height="68" transform="matrix(-1 0 0 1 680 0)" />
      </g>
      <g className="mm-depart" aria-hidden="true"><circle cx="304" cy="44" r="9" /><circle cx="304" cy="44" r="4" /></g>
    </svg>
  );
}

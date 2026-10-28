// Graphique en courbe dessiné en SVG à la main : pas de bibliothèque à télécharger,
// l'appli reste légère et marche hors ligne.
import { joursEntre, formatDate, nombre } from './calculs.js';

const L = 320;
const H = 180;
const MARGE = { gauche: 38, droite: 10, haut: 12, bas: 24 };

// series : [{ points: [{ x: 'AAAA-MM-JJ', y: nombre }], classe, ligne, pastilles }]
export function courbe({ series, objectif = null }) {
  const tous = series.flatMap((s) => s.points);
  if (tous.length === 0) return '<p class="vide">Pas encore de données.</p>';

  const origine = tous.reduce((min, p) => (p.x < min ? p.x : min), tous[0].x);
  const fin = tous.reduce((max, p) => (p.x > max ? p.x : max), tous[0].x);
  const etendue = Math.max(1, joursEntre(origine, fin));

  const valeurs = tous.map((p) => p.y);
  if (objectif !== null) valeurs.push(objectif);
  const vMin = Math.min(...valeurs);
  const vMax = Math.max(...valeurs);
  const marge = (vMax - vMin) * 0.15 || 1;
  const yMin = vMin - marge;
  const yMax = vMax + marge;

  const X = (x) => MARGE.gauche + (joursEntre(origine, x) / etendue) * (L - MARGE.gauche - MARGE.droite);
  const Y = (y) => H - MARGE.bas - ((y - yMin) / (yMax - yMin)) * (H - MARGE.haut - MARGE.bas);

  let svg = `<svg class="graphique" viewBox="0 0 ${L} ${H}" role="img">`;
  // Repères : valeurs mini/maxi à gauche, première et dernière date en bas
  svg += `<line class="grille" x1="${MARGE.gauche}" x2="${L - MARGE.droite}" y1="${Y(vMax)}" y2="${Y(vMax)}"/>`;
  svg += `<line class="grille" x1="${MARGE.gauche}" x2="${L - MARGE.droite}" y1="${Y(vMin)}" y2="${Y(vMin)}"/>`;
  svg += `<text class="axe" x="${MARGE.gauche - 5}" y="${Y(vMax) + 4}" text-anchor="end">${nombre(vMax)}</text>`;
  svg += `<text class="axe" x="${MARGE.gauche - 5}" y="${Y(vMin) + 4}" text-anchor="end">${nombre(vMin)}</text>`;
  svg += `<text class="axe" x="${MARGE.gauche}" y="${H - 6}">${formatDate(origine)}</text>`;
  if (fin !== origine) svg += `<text class="axe" x="${L - MARGE.droite}" y="${H - 6}" text-anchor="end">${formatDate(fin)}</text>`;

  if (objectif !== null) {
    svg += `<line class="objectif" x1="${MARGE.gauche}" x2="${L - MARGE.droite}" y1="${Y(objectif)}" y2="${Y(objectif)}"/>`;
    svg += `<text class="axe objectif-texte" x="${L - MARGE.droite}" y="${Y(objectif) - 4}" text-anchor="end">objectif ${nombre(objectif)}</text>`;
  }

  for (const s of series) {
    const tries = [...s.points].sort((a, b) => (a.x < b.x ? -1 : 1));
    if (s.ligne !== false && tries.length > 1) {
      const chemin = tries.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
      svg += `<polyline class="${s.classe}" points="${chemin}"/>`;
    }
    if (s.pastilles !== false) {
      for (const p of tries) svg += `<circle class="${s.classe}" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3"/>`;
    }
  }
  return `${svg}</svg>`;
}

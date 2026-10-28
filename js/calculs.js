// Calculs purs (sans affichage ni stockage) : dates, moyenne de poids, tendance.

// Date locale au format 'AAAA-MM-JJ'. On évite toISOString(), qui donne la date en UTC
// et peut donc renvoyer la veille ou le lendemain selon l'heure.
export function aujourdHui(d = new Date()) {
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

function enJours(date) {
  const [a, m, j] = date.split('-').map(Number);
  return Date.UTC(a, m - 1, j) / 86400000;
}

// Nombre de jours de a à b (positif si b est après a)
export const joursEntre = (a, b) => enJours(b) - enJours(a);

// Semaine du programme : 1 pendant les 7 premiers jours, puis 2, etc.
export const numeroSemaine = (dateDebut, date) =>
  Math.max(1, Math.floor(joursEntre(dateDebut, date) / 7) + 1);

export function formatDate(date) {
  const [, m, j] = date.split('-');
  return `${j}/${m}`;
}

export const nombre = (n, decimales = 1) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: decimales });

export const parDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id ?? 0) - (b.id ?? 0));

// Moyenne des pesées des 7 derniers jours, pour chaque pesée.
// Le poids varie d'un jour à l'autre (eau, repas) : seule la moyenne dit si on prend vraiment.
export function moyenneGlissante(pesees, jours = 7) {
  return pesees.map((p) => {
    const fenetre = pesees.filter((q) => q.date <= p.date && joursEntre(q.date, p.date) < jours);
    return { x: p.date, y: fenetre.reduce((s, q) => s + q.kg, 0) / fenetre.length };
  });
}

// Prise de poids par semaine (kg), en comparant la moyenne actuelle à celle d'il y a au moins 14 jours
export function tendanceHebdo(pesees) {
  const moyennes = moyenneGlissante(pesees);
  if (moyennes.length < 2) return null;
  const derniere = moyennes[moyennes.length - 1];
  const reference = [...moyennes].reverse().find((m) => joursEntre(m.x, derniere.x) >= 14);
  if (!reference) return null;
  return ((derniere.y - reference.y) / joursEntre(reference.x, derniere.x)) * 7;
}

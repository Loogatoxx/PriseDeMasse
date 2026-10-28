// Le programme d'entraînement : exercices, variantes (de la plus facile à la plus dure)
// et règle de progression. C'est le seul fichier à modifier pour changer le programme.
// Contenu vérifié le 2026-10-27 (sources : ACSM 2026, Schoenfeld 2021, Zhang 2025, Fenwick 2009).

export const REPOS_SECONDES = 90;
export const SEANCES_PAR_SEMAINE = 3;
export const JOURS_ENTRE_TESTS = 28;

export const ECHAUFFEMENT = [
  'Cercles de bras, 30 secondes dans chaque sens',
  '10 pompes scapulaires : bras tendus, rapproche puis écarte les omoplates',
  '1 série facile de la variante de pompes du jour (moitié de tes reps)',
];

// Chaque variante peut porter :
//   charge     → un champ « kg dans le sac » s'affiche
//   lest       → interdit en reprise et en séance allégée (sac sur le dos pour durcir le poids du corps)
//   dips       → interdit en reprise et en séance allégée
//   table      → demande une table lourde et stable
//   semaineMin → disponible à partir de cette semaine du programme
//   echec      → la dernière série peut aller jusqu'à l'échec (hors reprise)
export const EXERCICES = {
  pompes: {
    nom: 'Pompes',
    muscles: 'Pecs, triceps, avant des épaules',
    plage: [8, 20],
    pas: 1,
    pasCharge: '1 à 2 kg dans le sac',
    unite: 'reps',
    variantes: [
      { id: 'inclinees', nom: 'Pompes inclinées (mains sur une table)', consigne: 'Table lourde calée contre le mur, mains au bord. Corps gainé, fesses serrées.', echec: true },
      { id: 'classiques', nom: 'Pompes classiques', consigne: 'Corps gainé, coudes à 45°, poitrine à un poing du sol.', echec: true },
      { id: 'excentriques', nom: 'Pompes, descente en 3 s', consigne: 'Descends en 3 secondes, remonte en 1. Corps gainé.', echec: true },
      { id: 'pieds-sureleves', nom: 'Pompes pieds surélevés', consigne: 'Chaise calée au mur. Bassin aligné, ne cambre pas.', echec: true },
      { id: 'lestees', nom: 'Pompes lestées (sac)', consigne: 'Sac serré haut sur les omoplates : il ne doit pas glisser.', charge: true, lest: true, echec: true },
      { id: 'pieds-sureleves-lestees', nom: 'Pieds surélevés + sac', consigne: 'Chaise calée au mur, sac serré haut sur les omoplates.', charge: true, lest: true, echec: true },
    ],
  },
  tirage: {
    nom: 'Tirage',
    muscles: 'Dos, biceps, arrière des épaules',
    plage: [8, 20],
    pas: 1,
    pasCharge: '1 à 2 kg dans le sac',
    unite: 'reps',
    variantes: [
      { id: 'sac-un-bras', nom: 'Rowing un bras au sac', consigne: 'Toujours en appui : main et genou sur une chaise, dos plat. Tire vers la hanche sans tourner.', charge: true },
      { id: 'sac-un-bras-tempo', nom: 'Rowing un bras au sac, descente en 3 s', consigne: 'Quand le sac est plein : même mouvement, descente en 3 secondes.', charge: true },
      { id: 'table-genoux', nom: 'Rowing sous la table, genoux pliés', consigne: 'Table testée, mains au-dessus des pieds de table. Poitrine vers le bord, omoplates serrées.', table: true, echec: true },
      { id: 'table-jambes', nom: 'Rowing sous la table, jambes tendues', consigne: 'Corps droit des talons aux épaules, poitrine vers le bord.', table: true, echec: true },
      { id: 'table-tempo', nom: 'Rowing sous la table, descente 3 s + pause 1 s', consigne: 'Jambes tendues, pause 1 s en haut, descente en 3 s.', table: true, echec: true },
      { id: 'table-pieds', nom: 'Rowing sous la table, pieds surélevés', consigne: 'Pieds sur une chaise calée, corps droit, poitrine vers le bord.', table: true, echec: true },
    ],
  },
  triceps: {
    nom: 'Triceps',
    muscles: 'Triceps, bas des pecs',
    plage: [8, 20],
    pas: 1,
    pasCharge: '1 à 2 kg dans le sac',
    unite: 'reps',
    variantes: [
      { id: 'serrees-inclinees', nom: 'Pompes mains serrées sur la table', consigne: 'Mains largeur d’épaules au bord de la table, coudes qui frôlent les côtes.' },
      { id: 'serrees', nom: 'Pompes mains serrées au sol', consigne: 'Mains sous les épaules, coudes qui frôlent les côtes.' },
      { id: 'dips', nom: 'Dips entre deux chaises', consigne: 'Chaises lourdes calées au mur. 90° au coude maximum, épaules basses, jamais à l’échec.', dips: true, semaineMin: 3 },
      { id: 'dips-lestes', nom: 'Dips lestés (sac)', consigne: 'Même amplitude : 90° maximum, jamais à l’échec.', charge: true, lest: true, dips: true, semaineMin: 3 },
    ],
  },
  curl: {
    nom: 'Biceps',
    muscles: 'Biceps, avant-bras',
    plage: [10, 20],
    pas: 1,
    pasCharge: '0,5 à 1 kg dans le sac',
    unite: 'reps',
    variantes: [
      { id: 'sac', nom: 'Curl au sac à dos', consigne: 'Tiens les deux bretelles (pas la poignée). Coudes collés, aucun élan, descente en 2 s. Pouces vers le haut si les poignets gênent.', charge: true },
      { id: 'sac-tempo', nom: 'Curl au sac, descente en 4 s', consigne: 'Quand le sac est plein : monte normalement, pause 1 s en haut, descends en 4 secondes.', charge: true },
    ],
  },
  elevations: {
    nom: 'Épaules',
    muscles: 'Côtés des épaules (la carrure)',
    plage: [12, 25],
    pas: 1,
    pasCharge: '0,5 kg par bouteille',
    unite: 'reps',
    variantes: [
      { id: 'bouteilles', nom: 'Élévations latérales aux bouteilles', consigne: 'Monte jusqu’à hauteur d’épaules, coudes légèrement fléchis, sans élan. Charge = poids d’une bouteille.', charge: true },
      { id: 'bouteilles-tempo', nom: 'Élévations latérales, descente en 3 s', consigne: 'Quand les bouteilles sont pleines : pause 1 s en haut, descente en 3 secondes.', charge: true },
    ],
  },
  planche: {
    nom: 'Gainage',
    muscles: 'Abdos, tronc',
    plage: [20, 60],
    pas: 5,
    unite: 's',
    variantes: [
      { id: 'planche', nom: 'Planche sur les avant-bras', consigne: 'Avant-bras sous les épaules, fesses serrées, respire normalement.' },
    ],
  },
};

// Deux exercices enchaînés sans pause, puis repos : séance plus courte, même volume
export const SUPERSETS = [
  { nom: 'Superset A', exos: ['pompes', 'tirage'] },
  { nom: 'Superset B', exos: ['triceps', 'curl'] },
];
export const OPTION = { nom: 'Option : épaules et gainage', exos: ['elevations', 'planche'], tours: 2 };

const CONSIGNE_REPS = 'Ne compte que les reps complètes, au même tempo.';

export function phase(semaine, allegee = false) {
  if (allegee) {
    return {
      nom: 'Séance allégée',
      tours: 2,
      reprise: true,
      duree: '12 à 15 minutes',
      consigne: `Garde 3 à 4 reps de marge, pas d’échec, pas de dips ni de sac sur le dos. ${CONSIGNE_REPS}`,
    };
  }
  if (semaine <= 2) {
    return {
      nom: 'Reprise douce',
      tours: 2,
      reprise: true,
      duree: '12 à 15 minutes',
      consigne: `Arrête chaque série 3 à 4 reps avant l’échec. Pas de dips, pas de sac sur le dos : les tendons reprennent plus lentement que les muscles. ${CONSIGNE_REPS}`,
    };
  }
  return {
    nom: 'Progression',
    tours: 3,
    reprise: false,
    duree: '20 à 25 minutes',
    consigne: `Arrête chaque série 1 à 2 reps avant l’échec. Seule la dernière série de pompes et de rowing sous la table peut aller jusqu’à l’échec propre. ${CONSIGNE_REPS}`,
  };
}

export function varianteDisponible(variante, { semaine, reprise, tableSolide }) {
  if (variante.table && !tableSolide) return { ok: false, raison: 'pas de table solide' };
  if (variante.semaineMin && semaine < variante.semaineMin) return { ok: false, raison: `dès la semaine ${variante.semaineMin}` };
  if ((variante.lest || variante.dips) && reprise) return { ok: false, raison: 'pas en reprise ni en séance allégée' };
  return { ok: true };
}

// Double progression : on ajoute des reps jusqu'au haut de la plage sur toutes les séries,
// puis on passe à une variante plus dure (ou on charge le sac) et on redescend en reps.
export function suggestion(exoId, varianteId, derniere, ph) {
  const exo = EXERCICES[exoId];
  const [bas, haut] = exo.plage;
  const unite = exo.unite === 's' ? ' s' : '';
  if (!derniere || derniere.length === 0) {
    return ph.reprise
      ? { texte: `Calibrage : choisis la variante qui te donne ${Math.max(bas, 12)} à ${haut}${unite || ' reps'} en gardant 3 à 4 reps de marge.`, cible: null }
      : { texte: `Première fois à ce niveau : vise entre ${bas} et ${haut}${unite || ' reps'} par série.`, cible: null };
  }
  const passe = derniere.join(' · ') + unite;
  if (ph.reprise) {
    return { texte: `Dernière fois : ${passe}. Refais pareil, sans forcer.`, cible: derniere };
  }
  if (derniere.length >= ph.tours && derniere.every((r) => r >= haut)) {
    const variantes = exo.variantes;
    const actuelle = variantes.find((v) => v.id === varianteId);
    const suivante = variantes[variantes.findIndex((v) => v.id === varianteId) + 1];
    let texte;
    if (actuelle?.charge) texte = `ajoute ${exo.pasCharge}${suivante ? ` (ou passe à « ${suivante.nom} » si tu ne peux plus charger)` : ''}.`;
    else if (suivante) texte = `passe à « ${suivante.nom} ». Si tu fais moins de ${bas} reps, fais la 1re série avec la nouvelle variante et les autres avec l’ancienne.`;
    else texte = 'ralentis la descente pour durcir.';
    return { texte: `Toutes tes séries à ${haut}${unite} ou plus : ${texte}`, cible: derniere, monter: true };
  }
  // Sinon : +1 rep (ou +5 s) sur la première série qui n'est pas encore au plafond
  const cible = derniere.slice(0, ph.tours);
  while (cible.length < ph.tours) cible.push(cible[cible.length - 1]);
  const i = cible.findIndex((r) => r < haut);
  if (i >= 0) cible[i] += exo.pas;
  return { texte: `Dernière fois : ${passe} → vise ${cible.join(' · ')}${unite}`, cible };
}

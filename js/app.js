// Point d'entrée : navigation entre les onglets et affichage de chaque écran.
import * as db from './db.js';
import { EXERCICES, SUPERSETS, OPTION, ECHAUFFEMENT, REPOS_SECONDES, SEANCES_PAR_SEMAINE, JOURS_ENTRE_TESTS, phase, suggestion, varianteDisponible } from './programme.js';
import { aujourdHui, joursEntre, numeroSemaine, formatDate, nombre, parDate, moyenneGlissante, tendanceHebdo } from './calculs.js';
import { courbe } from './graph.js';

const contenu = document.querySelector('#contenu');
const titre = document.querySelector('#titre');
const onglets = document.querySelector('#onglets');
const boutonRepos = document.querySelector('#repos');

const ECRANS = {
  seance: ['Séance', afficherSeance],
  progres: ['Progrès', afficherProgres],
  corps: ['Corps', afficherCorps],
  reglages: ['Réglages', afficherReglages],
};

let profil = null;
let modification = false; // vrai quand on rouvre une séance terminée pour la corriger
let choixProgres = { exo: 'pompes', variante: null };
let urlsPhotos = [];

// ---------- Démarrage et navigation ----------

async function demarrer() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  // Demande au navigateur de ne pas effacer les données s'il manque de place
  navigator.storage?.persist?.().catch(() => {});
  onglets.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => aller(b.dataset.onglet)));
  boutonRepos.addEventListener('click', () => (minuteur ? arreterRepos() : demarrerRepos()));
  arreterRepos();
  profil = await db.reglage('profil');
  if (!profil) afficherAccueil();
  else aller('seance');
}

function aller(ecran) {
  onglets.hidden = false;
  onglets.querySelectorAll('button').forEach((b) => b.classList.toggle('actif', b.dataset.onglet === ecran));
  titre.textContent = ECRANS[ecran][0];
  contenu.onchange = null;
  if (ecran !== 'seance') masquerRepos();
  ECRANS[ecran][1]();
  window.scrollTo(0, 0);
}

const sauverProfil = () => db.definirReglage('profil', profil);

// ---------- Premier lancement ----------

function afficherAccueil() {
  onglets.hidden = true;
  titre.textContent = 'Bienvenue';
  contenu.innerHTML = `
    <section class="carte">
      <p>Quelques infos pour régler l'appli sur toi. Tout reste sur ton téléphone.</p>
      <form id="form-accueil" class="formulaire">
        <label>Poids actuel (kg)<input name="poids" type="number" step="0.1" inputmode="decimal" value="60" required></label>
        <label>Poids d'avant l'arrêt (kg)<input name="poidsAvant" type="number" step="0.1" inputmode="decimal" value="66"></label>
        <label>Objectif (kg)<input name="objectif" type="number" step="0.1" inputmode="decimal" value="66" required></label>
        <fieldset>
          <legend>As-tu une table lourde et stable (pas pliante) sous laquelle tirer ?</legend>
          <label class="choix"><input type="radio" name="table" value="oui"> Oui</label>
          <label class="choix"><input type="radio" name="table" value="non" checked> Non, ou pas sûr</label>
        </fieldset>
        <button class="principal">C'est parti</button>
      </form>
    </section>`;
  contenu.querySelector('#form-accueil').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const tableSolide = f.get('table') === 'oui';
    profil = {
      dateDebut: aujourdHui(),
      poidsDepart: Number(f.get('poids')),
      poidsAvant: Number(f.get('poidsAvant')) || null,
      objectif: Number(f.get('objectif')),
      tableSolide,
      niveaux: { pompes: 'classiques', tirage: tableSolide ? 'table-genoux' : 'sac-un-bras', triceps: 'serrees-inclinees', curl: 'sac', elevations: 'bouteilles', planche: 'planche' },
      charges: {},
    };
    await sauverProfil();
    await db.ecrire('pesees', { date: profil.dateDebut, kg: profil.poidsDepart });
    aller('seance');
  });
}

// ---------- Séance ----------

const avecSeries = (seances) => seances.filter((s) => s.series.length > 0);

// Variante en cours pour un exercice : celle utilisée aujourd'hui, sinon la dernière choisie.
// Si elle est interdite aujourd'hui (dips en séance allégée…), on prend la plus dure encore permise.
function varianteActuelle(exoId, seance, contexte) {
  const variantes = EXERCICES[exoId].variantes;
  const choisie = seance.series.find((s) => s.exo === exoId)?.variante ?? profil.niveaux[exoId];
  const depart = Math.max(0, variantes.findIndex((x) => x.id === choisie));
  for (let i = depart; i >= 0; i--) {
    if (varianteDisponible(variantes[i], contexte).ok) return variantes[i];
  }
  return variantes.find((x) => varianteDisponible(x, contexte).ok);
}

// Reps de la dernière séance passée où cette variante a été faite
function derniereFois(passees, exoId, varianteId) {
  for (let i = passees.length - 1; i >= 0; i--) {
    const series = passees[i].series.filter((s) => s.exo === exoId && s.variante === varianteId);
    if (series.length) {
      const triees = series.sort((a, b) => a.tour - b.tour);
      return { reps: triees.map((s) => s.reps), charge: triees[0].charge };
    }
  }
  return null;
}

function meilleure(seances, exoId, varianteId) {
  let max = null;
  for (const s of seances) {
    for (const serie of s.series) {
      if (serie.exo === exoId && serie.variante === varianteId && (max === null || serie.reps > max)) max = serie.reps;
    }
  }
  return max;
}

async function afficherSeance() {
  const jour = aujourdHui();
  const semaine = numeroSemaine(profil.dateDebut, jour);
  const seances = (await db.tout('seances')).sort(parDate);
  const seance = seances.find((s) => s.date === jour);
  const ph = phase(semaine, seance?.allegee);
  const contexte = { semaine, reprise: ph.reprise, tableSolide: profil.tableSolide };
  const passees = avecSeries(seances.filter((s) => s.date < jour));
  const faitesSemaine = avecSeries(seances).filter((s) => numeroSemaine(profil.dateDebut, s.date) === semaine).length;
  const bandeau = `<div class="bandeau"><strong>Semaine ${semaine} · ${ph.nom}</strong>
    <span>${faitesSemaine}/${SEANCES_PAR_SEMAINE} séances cette semaine</span></div>`;

  if (!seance) {
    masquerRepos();
    const derniere = passees[passees.length - 1];
    contenu.innerHTML = `${bandeau}
      <section class="carte">
        <p>${ph.tours} tours par superset, environ ${ph.duree}.</p>
        <p class="discret">${ph.consigne}</p>
        ${derniere ? `<p class="discret">Dernière séance : le ${formatDate(derniere.date)}.</p>` : ''}
        <button class="principal" id="commencer">Commencer la séance</button>
        <button class="secondaire" id="allegee">Séance allégée (4e séance ou grosse fatigue)</button>
      </section>
      <section class="carte">
        <h3>Hors séance</h3>
        <p class="discret">Les muscles grossissent avec la nourriture : environ 100 à 130 g de protéines par jour et un peu plus de calories que ce que tu brûles. Finis ta séance au moins 1 h avant de te coucher.</p>
      </section>`;
    const commencer = async (allegee) => {
      preparerSon();
      await db.ecrire('seances', { date: jour, debut: new Date().toISOString(), series: [], termine: false, allegee });
      afficherSeance();
    };
    contenu.querySelector('#commencer').addEventListener('click', () => commencer(false));
    contenu.querySelector('#allegee').addEventListener('click', () => commencer(true));
    return;
  }

  if (seance.termine && !modification) {
    masquerRepos();
    return afficherBilan(seance, passees, bandeau);
  }

  // Le test de max se fait à la 1re séance de la semaine 3, puis toutes les 4 semaines environ
  const tests = await db.reglage('testsMax', []);
  const dernierTest = tests[tests.length - 1];
  const testDu = semaine >= 3 && !seance.allegee && (!dernierTest || joursEntre(dernierTest.date, jour) >= JOURS_ENTRE_TESTS);

  // Les séances allégées ne servent pas de référence : leurs reps sont volontairement plus basses
  const references = passees.filter((s) => !s.allegee);
  boutonRepos.hidden = false;
  const carte = (exoId, tours = ph.tours) => carteExercice(exoId, seance, references, { ...ph, tours }, contexte);
  contenu.innerHTML = `${bandeau}
    <p class="discret">${ph.consigne}</p>
    ${testDu ? `<div class="carte test"><strong>Test de max aujourd’hui</strong>
      <p class="discret">Ta 1re série de pompes : pompes classiques jusqu’à l’échec propre (poitrine à un poing du sol, pause seulement bras tendus, arrêt après 2 reps ratées). Note le résultat dans Progrès.</p></div>` : ''}
    <details class="carte echauffement">
      <summary>Échauffement · 2 à 3 min</summary>
      <ul>${ECHAUFFEMENT.map((e) => `<li>${e}</li>`).join('')}</ul>
    </details>
    ${SUPERSETS.map((ss) => `
      <section class="superset">
        <h2>${ss.nom} <small>enchaîne les deux, puis ${REPOS_SECONDES} s de repos (30 s entre les deux si tu es essoufflé)</small></h2>
        ${ss.exos.map((e) => carte(e)).join('')}
      </section>`).join('')}
    <details class="superset option" ${seance.series.some((s) => OPTION.exos.includes(s.exo)) ? 'open' : ''}>
      <summary>${OPTION.nom}</summary>
      ${OPTION.exos.map((e) => carte(e, OPTION.tours)).join('')}
    </details>
    <button class="principal" id="terminer">Terminer la séance</button>`;

  contenu.onchange = (e) => changementSeance(e, seance, contexte);
  contenu.querySelector('#terminer').addEventListener('click', async () => {
    seance.termine = true;
    seance.fin = new Date().toISOString();
    modification = false;
    contenu.onchange = null;
    await db.ecrire('seances', seance);
    afficherSeance();
  });
}

function carteExercice(exoId, seance, passees, ph, contexte) {
  const exo = EXERCICES[exoId];
  const variante = varianteActuelle(exoId, seance, contexte);
  const derniere = derniereFois(passees, exoId, variante.id);
  const sug = suggestion(exoId, variante.id, derniere?.reps, ph);
  const series = seance.series.filter((s) => s.exo === exoId);
  const charge = series[0]?.charge ?? derniere?.charge ?? profil.charges[exoId] ?? '';
  const options = exo.variantes.map((v) => {
    const dispo = varianteDisponible(v, contexte);
    return `<option value="${v.id}" ${v.id === variante.id ? 'selected' : ''} ${dispo.ok ? '' : 'disabled'}>${v.nom}${dispo.ok ? '' : ` (${dispo.raison})`}</option>`;
  }).join('');
  const tours = Array.from({ length: ph.tours }, (_, i) => {
    const t = i + 1;
    const fait = series.find((s) => s.tour === t)?.reps ?? '';
    const vise = sug.cible?.[i] ?? '';
    return `<label class="tour"><span>Tour ${t}</span>
      <input type="number" inputmode="numeric" min="0" data-tour="${t}" value="${fait}" placeholder="${vise}">
      <span class="unite">${exo.unite}</span></label>`;
  }).join('');
  return `
    <article class="carte exo" data-exo="${exoId}">
      <header><h3>${exo.nom}</h3><span class="discret">${exo.muscles}</span></header>
      <select class="variante" aria-label="Variante">${options}</select>
      <p class="consigne">${variante.consigne}</p>
      <p class="suggestion ${sug.monter ? 'monter' : ''}">${sug.texte}</p>
      ${variante.echec && !ph.reprise ? '<p class="discret">Dernière série : jusqu’à l’échec propre si tu veux.</p>' : ''}
      ${variante.charge ? `<label class="charge">Charge du sac (kg)
        <input type="number" step="0.5" min="0" inputmode="decimal" data-charge value="${charge}"></label>` : ''}
      <div class="tours">${tours}</div>
    </article>`;
}

// Chaque saisie est enregistrée tout de suite : rien n'est perdu si l'appli se ferme
async function changementSeance(e, seance, contexte) {
  const carte = e.target.closest('.exo');
  if (!carte) return;
  const exoId = carte.dataset.exo;
  const varianteId = carte.querySelector('.variante').value;
  const chargeChamp = carte.querySelector('[data-charge]');
  const charge = chargeChamp && chargeChamp.value !== '' ? Number(chargeChamp.value) : null;

  if (e.target.matches('.variante')) {
    profil.niveaux[exoId] = varianteId;
    await sauverProfil();
    seance.series.forEach((s) => { if (s.exo === exoId) s.variante = varianteId; });
    await db.ecrire('seances', seance);
    return afficherSeance();
  }

  if (e.target.matches('[data-charge]')) {
    profil.charges[exoId] = charge;
    await sauverProfil();
    seance.series.forEach((s) => { if (s.exo === exoId) s.charge = charge; });
    return db.ecrire('seances', seance);
  }

  if (e.target.matches('[data-tour]')) {
    const tour = Number(e.target.dataset.tour);
    seance.series = seance.series.filter((s) => !(s.exo === exoId && s.tour === tour));
    if (e.target.value !== '') {
      seance.series.push({ exo: exoId, variante: varianteId, tour, reps: Number(e.target.value), charge });
      // Repos automatique après le dernier exercice d'un superset
      const dernierDuSuperset = [...SUPERSETS, OPTION].some((ss) => ss.exos[ss.exos.length - 1] === exoId);
      if (dernierDuSuperset) demarrerRepos();
    }
    profil.niveaux[exoId] = varianteId;
    await sauverProfil();
    await db.ecrire('seances', seance);
  }
}

function afficherBilan(seance, passees, bandeau) {
  // Records : meilleure série du jour comparée à la meilleure série passée, à variante égale
  const records = [];
  const vues = new Set();
  for (const serie of seance.series) {
    const cle = `${serie.exo}/${serie.variante}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    const exo = EXERCICES[serie.exo];
    const variante = exo.variantes.find((v) => v.id === serie.variante);
    const aujourdhui = meilleure([seance], serie.exo, serie.variante);
    const avant = meilleure(passees, serie.exo, serie.variante);
    const dejaFaitAutrement = passees.some((s) => s.series.some((x) => x.exo === serie.exo));
    if (avant === null && dejaFaitAutrement) records.push(`Nouveau niveau : ${variante.nom}`);
    else if (avant !== null && aujourdhui > avant) records.push(`Record ${variante.nom} : ${aujourdhui} ${exo.unite} (avant ${avant})`);
  }
  const detail = Object.keys(EXERCICES).map((exoId) => {
    const series = seance.series.filter((s) => s.exo === exoId).sort((a, b) => a.tour - b.tour);
    if (!series.length) return '';
    const variante = EXERCICES[exoId].variantes.find((v) => v.id === series[0].variante);
    const charge = series[0].charge ? ` · ${nombre(series[0].charge)} kg` : '';
    return `<li><strong>${variante.nom}</strong>${charge} : ${series.map((s) => s.reps).join(' · ')} ${EXERCICES[exoId].unite}</li>`;
  }).join('');
  contenu.innerHTML = `${bandeau}
    <section class="carte bravo">
      <h2>Séance faite</h2>
      ${records.length
        ? `<ul class="records">${records.map((r) => `<li>${r}</li>`).join('')}</ul>`
        : '<p>Pas de record aujourd’hui, mais la séance est faite : c’est la régularité qui fait grossir.</p>'}
    </section>
    <section class="carte"><h3>Détail</h3><ul class="detail">${detail || '<li>Aucune série notée.</li>'}</ul></section>
    <button class="secondaire" id="modifier">Corriger la séance</button>`;
  contenu.querySelector('#modifier').addEventListener('click', () => { modification = true; afficherSeance(); });
}

// ---------- Minuteur de repos ----------

let minuteur = null;
let contexteAudio = null;

// Le son ne peut démarrer qu'après un geste de l'utilisateur : on prépare l'audio au clic
function preparerSon() {
  try {
    contexteAudio ??= new (window.AudioContext || window.webkitAudioContext)();
    contexteAudio.resume();
  } catch { /* pas de son disponible : la vibration et l'affichage suffisent */ }
}

function bip() {
  navigator.vibrate?.([200, 100, 200]);
  if (!contexteAudio) return;
  const osc = contexteAudio.createOscillator();
  const gain = contexteAudio.createGain();
  osc.frequency.value = 880;
  gain.gain.value = 0.2;
  osc.connect(gain).connect(contexteAudio.destination);
  osc.start();
  osc.stop(contexteAudio.currentTime + 0.4);
}

const formatDuree = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function demarrerRepos() {
  preparerSon();
  arreterRepos();
  // On compare à l'heure de fin plutôt que de décompter : le minuteur reste juste
  // même si le téléphone ralentit l'appli en arrière-plan
  const fin = Date.now() + REPOS_SECONDES * 1000;
  boutonRepos.classList.add('actif');
  const tic = () => {
    const reste = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
    boutonRepos.textContent = `Repos ${formatDuree(reste)} · toucher pour arrêter`;
    if (reste === 0) {
      clearInterval(minuteur);
      minuteur = null;
      boutonRepos.classList.remove('actif');
      boutonRepos.classList.add('fini');
      boutonRepos.textContent = 'C’est reparti !';
      bip();
    }
  };
  tic();
  minuteur = setInterval(tic, 250);
}

function arreterRepos() {
  clearInterval(minuteur);
  minuteur = null;
  boutonRepos.classList.remove('actif', 'fini');
  boutonRepos.textContent = `Lancer le repos (${formatDuree(REPOS_SECONDES)})`;
}

function masquerRepos() {
  arreterRepos();
  boutonRepos.hidden = true;
}

// ---------- Progrès ----------

async function afficherProgres() {
  const seances = avecSeries(await db.tout('seances')).sort(parDate);
  const semaine = numeroSemaine(profil.dateDebut, aujourdHui());

  // Régularité : séances par semaine sur les 8 dernières semaines
  const barres = [];
  for (let s = Math.max(1, semaine - 7); s <= semaine; s++) {
    const n = seances.filter((x) => numeroSemaine(profil.dateDebut, x.date) === s).length;
    const hauteur = Math.min(100, (n / SEANCES_PAR_SEMAINE) * 100);
    barres.push(`<div class="barre ${n >= SEANCES_PAR_SEMAINE ? 'atteint' : ''}"><span style="height:${hauteur}%"></span><small>S${s}</small><b>${n}</b></div>`);
  }

  // Courbe d'un exercice : meilleure série de chaque séance, à variante égale.
  // (Le total fausserait la courbe : il bondit quand on passe de 2 à 3 tours en semaine 3.)
  const exo = EXERCICES[choixProgres.exo];
  const variantesFaites = exo.variantes.filter((v) => seances.some((s) => s.series.some((x) => x.exo === choixProgres.exo && x.variante === v.id)));
  if (!variantesFaites.some((v) => v.id === choixProgres.variante)) {
    choixProgres.variante = variantesFaites.find((v) => v.id === profil.niveaux[choixProgres.exo])?.id ?? variantesFaites[0]?.id ?? null;
  }
  const points = seances
    .map((s) => ({ x: s.date, series: s.series.filter((x) => x.exo === choixProgres.exo && x.variante === choixProgres.variante) }))
    .filter((p) => p.series.length)
    .map((p) => ({ x: p.x, y: Math.max(...p.series.map((x) => x.reps)) }));

  // Records : meilleure série pour chaque variante déjà faite
  const records = Object.entries(EXERCICES).flatMap(([exoId, e]) => e.variantes
    .map((v) => ({ v, max: meilleure(seances, exoId, v.id) }))
    .filter((r) => r.max !== null)
    .map((r) => `<li><span>${r.v.nom}</span><b>${r.max} ${e.unite}</b></li>`)).join('');

  const tests = await db.reglage('testsMax', []);

  contenu.innerHTML = `
    <section class="carte">
      <h3>Régularité</h3>
      <p class="discret">Objectif : ${SEANCES_PAR_SEMAINE} séances par semaine.</p>
      <div class="barres">${barres.join('')}</div>
    </section>
    <section class="carte">
      <h3>Courbe par exercice</h3>
      <div class="ligne-choix">
        <select id="choix-exo">${Object.entries(EXERCICES).map(([id, e]) => `<option value="${id}" ${id === choixProgres.exo ? 'selected' : ''}>${e.nom}</option>`).join('')}</select>
        <select id="choix-variante" ${variantesFaites.length ? '' : 'disabled'}>${variantesFaites.map((v) => `<option value="${v.id}" ${v.id === choixProgres.variante ? 'selected' : ''}>${v.nom}</option>`).join('')}</select>
      </div>
      <p class="discret">Ta meilleure série de chaque séance (${exo.unite === 's' ? 'secondes' : 'reps'}).</p>
      ${courbe({ series: [{ points, classe: 'principale' }] })}
    </section>
    <section class="carte">
      <h3>Records</h3>
      ${records ? `<ul class="liste-records">${records}</ul>` : '<p class="vide">Tes records apparaîtront après ta première séance.</p>'}
    </section>
    <section class="carte">
      <h3>Test de max de pompes</h3>
      <p class="discret">À la 1re séance de la semaine 3, puis toutes les 4 à 6 semaines. Après l’échauffement : pompes classiques, mains largeur d’épaules, poitrine qui touche un poing posé au sol. Pause seulement bras tendus, arrêt après 2 reps ratées d’affilée. Le test compte comme ta 1re série de pompes.</p>
      ${tests.length ? `<ul class="liste-records">${tests.map((t) => `<li><span>${formatDate(t.date)}</span><b>${t.reps} pompes</b></li>`).join('')}</ul>` : ''}
      <form id="form-test" class="en-ligne">
        <input name="reps" type="number" inputmode="numeric" min="1" placeholder="Nombre de pompes" required>
        <button class="secondaire">Enregistrer</button>
      </form>
    </section>`;

  contenu.querySelector('#choix-exo').addEventListener('change', (e) => { choixProgres = { exo: e.target.value, variante: null }; afficherProgres(); });
  contenu.querySelector('#choix-variante').addEventListener('change', (e) => { choixProgres.variante = e.target.value; afficherProgres(); });
  contenu.querySelector('#form-test').addEventListener('submit', async (e) => {
    e.preventDefault();
    const reps = Number(new FormData(e.target).get('reps'));
    const autres = tests.filter((t) => t.date !== aujourdHui());
    await db.definirReglage('testsMax', [...autres, { date: aujourdHui(), reps }].sort(parDate));
    afficherProgres();
  });
}

// ---------- Corps : pesée, tour de bras, photos ----------

function messageTendance(tendance, poids) {
  if (joursEntre(profil.dateDebut, aujourdHui()) < 14) {
    return 'Les 2 premières semaines comptent peu : l’eau (et la créatine) font bouger la balance.';
  }
  if (tendance === null) return 'Pèse-toi chaque matin : il faut 2 semaines de pesées pour voir une tendance.';
  // Rythme visé : +0,25 % à +0,5 % du poids par semaine
  const bas = poids * 0.0025;
  const haut = poids * 0.005;
  if (tendance < bas) return 'Trop lent : ajoute environ 150 à 200 kcal par jour.';
  if (tendance > haut) return 'Un peu rapide : enlève 150 à 200 kcal par jour pour limiter le gras.';
  return 'Bon rythme, continue comme ça.';
}

async function afficherCorps() {
  const pesees = (await db.tout('pesees')).sort(parDate);
  const mesures = (await db.tout('mesures')).sort(parDate);
  const photos = (await db.tout('photos')).sort(parDate);
  const moyennes = moyenneGlissante(pesees);
  const moyenne = moyennes[moyennes.length - 1]?.y ?? null;
  const tendance = tendanceHebdo(pesees);
  const depart = profil.poidsDepart;
  const avancement = moyenne === null ? 0 : Math.max(0, Math.min(100, ((moyenne - depart) / (profil.objectif - depart)) * 100));
  const peseeDuJour = pesees.find((p) => p.date === aujourdHui());
  const derniereMesure = mesures[mesures.length - 1];

  let projection = '';
  if (tendance > 0 && moyenne !== null && moyenne < profil.objectif) {
    const date = new Date(Date.now() + ((profil.objectif - moyenne) / tendance) * 7 * 86400000);
    projection = `<p class="discret">À ce rythme : ${nombre(profil.objectif)} kg vers ${date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}.</p>`;
  }

  urlsPhotos.forEach((u) => URL.revokeObjectURL(u));
  urlsPhotos = photos.map((p) => URL.createObjectURL(new Blob([p.donnees], { type: p.type })));
  const vignettes = photos.map((p, i) => `
    <figure><img src="${urlsPhotos[i]}" alt="Photo du ${formatDate(p.date)}">
      <figcaption>${formatDate(p.date)} <button class="lien" data-supprimer-photo="${p.id}">supprimer</button></figcaption></figure>`).join('');
  const comparaison = photos.length >= 2 ? `
    <div class="comparaison">
      <figure><img src="${urlsPhotos[0]}" alt="Première photo"><figcaption>${formatDate(photos[0].date)}</figcaption></figure>
      <figure><img src="${urlsPhotos[photos.length - 1]}" alt="Dernière photo"><figcaption>${formatDate(photos[photos.length - 1].date)}</figcaption></figure>
    </div>` : '';

  contenu.innerHTML = `
    <section class="carte">
      <h3>Pesée</h3>
      <form id="form-pesee" class="en-ligne">
        <input name="kg" type="number" step="0.1" inputmode="decimal" placeholder="kg" value="${peseeDuJour?.kg ?? ''}" required>
        <button class="principal">${peseeDuJour ? 'Corriger' : 'Enregistrer'}</button>
      </form>
      <p class="discret">Le matin, après les toilettes, avant de manger.</p>
      ${moyenne !== null ? `
        <div class="chiffres">
          <div><b>${nombre(moyenne)} kg</b><small>moyenne 7 jours</small></div>
          <div><b>${moyenne - depart >= 0 ? '+' : ''}${nombre(moyenne - depart)} kg</b><small>depuis le début</small></div>
          <div><b>${tendance === null ? '–' : `${tendance >= 0 ? '+' : ''}${nombre(tendance, 2)}`}</b><small>kg / semaine</small></div>
        </div>
        <div class="jauge"><span style="width:${avancement}%"></span></div>
        <p class="discret">${nombre(depart)} kg → ${nombre(profil.objectif)} kg</p>
        <p>${messageTendance(tendance, moyenne)}</p>
        ${projection}` : ''}
      ${courbe({
        series: [
          { points: pesees.map((p) => ({ x: p.date, y: p.kg })), classe: 'pesee', ligne: false },
          { points: moyennes, classe: 'moyenne', pastilles: false },
        ],
        // Pas d'objectif sur l'échelle : 66 kg écraserait la courbe et cacherait la montée
      })}
      <p class="legende"><span class="pastille pesee"></span>pesée <span class="pastille moyenne"></span>moyenne 7 jours</p>
    </section>
    <section class="carte">
      <h3>Tour de bras</h3>
      <form id="form-bras" class="en-ligne">
        <input name="cm" type="number" step="0.1" inputmode="decimal" placeholder="cm" required>
        <button class="secondaire">Enregistrer</button>
      </form>
      <p class="discret">Une fois par semaine, toujours pareil : même bras, contracté, au plus gros.${derniereMesure ? ` Dernière mesure : ${nombre(derniereMesure.brasCm)} cm le ${formatDate(derniereMesure.date)}.` : ''}</p>
      ${courbe({ series: [{ points: mesures.map((m) => ({ x: m.date, y: m.brasCm })), classe: 'principale' }] })}
    </section>
    <section class="carte">
      <h3>Photos</h3>
      <p class="discret">Toutes les 2 semaines, même endroit, même lumière, même heure.</p>
      <label class="bouton secondaire">Ajouter une photo<input type="file" accept="image/*" id="photo" class="cache"></label>
      ${comparaison}
      <div class="galerie">${vignettes}</div>
    </section>`;

  contenu.querySelector('#form-pesee').addEventListener('submit', async (e) => {
    e.preventDefault();
    await db.ecrire('pesees', { date: aujourdHui(), kg: Number(new FormData(e.target).get('kg')) });
    afficherCorps();
  });
  contenu.querySelector('#form-bras').addEventListener('submit', async (e) => {
    e.preventDefault();
    await db.ecrire('mesures', { date: aujourdHui(), brasCm: Number(new FormData(e.target).get('cm')) });
    afficherCorps();
  });
  contenu.querySelector('#photo').addEventListener('change', async (e) => {
    const fichier = e.target.files[0];
    if (!fichier) return;
    const donnees = await redimensionner(fichier);
    await db.ecrire('photos', { date: aujourdHui(), type: 'image/jpeg', donnees });
    afficherCorps();
  });
  contenu.querySelectorAll('[data-supprimer-photo]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Supprimer cette photo ?')) return;
    await db.supprimer('photos', Number(b.dataset.supprimerPhoto));
    afficherCorps();
  }));
}

// Réduit la photo à 1080 px de côté : 10 fois plus légère, et largement assez pour comparer
async function redimensionner(fichier, max = 1080) {
  const url = URL.createObjectURL(fichier);
  const image = new Image();
  image.src = url;
  await image.decode();
  const echelle = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
  const toile = document.createElement('canvas');
  toile.width = Math.round(image.naturalWidth * echelle);
  toile.height = Math.round(image.naturalHeight * echelle);
  toile.getContext('2d').drawImage(image, 0, 0, toile.width, toile.height);
  URL.revokeObjectURL(url);
  const blob = await new Promise((r) => toile.toBlob(r, 'image/jpeg', 0.85));
  // Stockée en ArrayBuffer plutôt qu'en Blob : plus fiable dans IndexedDB sur Safari
  return blob.arrayBuffer();
}

// ---------- Réglages et sauvegarde ----------

async function afficherReglages() {
  const protege = await navigator.storage?.persisted?.().catch(() => false);
  contenu.innerHTML = `
    <section class="carte">
      <h3>Profil</h3>
      <form id="form-profil" class="formulaire">
        <label>Date de début du programme<input name="dateDebut" type="date" value="${profil.dateDebut}" required></label>
        <label>Poids de départ (kg)<input name="poidsDepart" type="number" step="0.1" inputmode="decimal" value="${profil.poidsDepart}" required></label>
        <label>Objectif (kg)<input name="objectif" type="number" step="0.1" inputmode="decimal" value="${profil.objectif}" required></label>
        <label class="choix"><input type="checkbox" name="tableSolide" ${profil.tableSolide ? 'checked' : ''}> J’ai une table lourde et stable pour tirer dessous</label>
        <button class="principal">Enregistrer</button>
      </form>
    </section>
    <section class="carte">
      <h3>Sauvegarde</h3>
      <p class="discret">Tes données ne sont que sur ce téléphone. Exporte-les de temps en temps (Fichiers, Drive…) pour ne rien perdre si tu changes de téléphone.</p>
      <button class="secondaire" id="exporter">Exporter mes données</button>
      <label class="bouton secondaire">Importer une sauvegarde<input type="file" accept="application/json,.json" id="importer" class="cache"></label>
      <p class="discret">Stockage protégé contre l’effacement automatique : ${protege ? 'oui' : 'non (installe l’appli sur l’écran d’accueil)'}.</p>
    </section>`;

  contenu.querySelector('#form-profil').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    Object.assign(profil, {
      dateDebut: f.get('dateDebut'),
      poidsDepart: Number(f.get('poidsDepart')),
      objectif: Number(f.get('objectif')),
      tableSolide: f.get('tableSolide') === 'on',
    });
    await sauverProfil();
    aller('seance');
  });
  contenu.querySelector('#exporter').onclick = exporter;
  contenu.querySelector('#importer').addEventListener('change', (e) => e.target.files[0] && importer(e.target.files[0]));
}

const enDataUrl = (blob) => new Promise((resoudre) => {
  const lecteur = new FileReader();
  lecteur.onload = () => resoudre(lecteur.result);
  lecteur.readAsDataURL(blob);
});

async function exporter() {
  const bouton = contenu.querySelector('#exporter');
  bouton.disabled = true;
  bouton.textContent = 'Préparation…';
  const donnees = { application: 'prise-de-masse', version: 1, exporte: new Date().toISOString() };
  for (const nom of db.MAGASINS) donnees[nom] = await db.tout(nom);
  // Les photos sont converties en texte (base64) pour tenir dans un fichier JSON
  donnees.photos = await Promise.all(donnees.photos.map(async (p) => ({ ...p, donnees: await enDataUrl(new Blob([p.donnees], { type: p.type })) })));
  const nomFichier = `prise-de-masse-${aujourdHui()}.json`;
  const fichier = new File([JSON.stringify(donnees)], nomFichier, { type: 'application/json' });
  bouton.disabled = false;
  // Sur téléphone, la feuille de partage permet d'enregistrer dans Fichiers ou Drive.
  // Le navigateur exige qu'elle s'ouvre juste après un toucher : la préparation ayant pris
  // un moment, on propose un second bouton plutôt que de l'ouvrir directement.
  if (navigator.canShare?.({ files: [fichier] })) {
    bouton.textContent = 'Envoyer le fichier (Fichiers, Drive…)';
    bouton.onclick = () => navigator.share({ files: [fichier], title: nomFichier }).catch(() => {});
    return;
  }
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(fichier);
  lien.download = nomFichier;
  lien.click();
  bouton.textContent = 'Exporter mes données';
}

async function importer(fichier) {
  let donnees;
  try {
    donnees = JSON.parse(await fichier.text());
  } catch {
    return alert('Ce fichier n’est pas une sauvegarde valide.');
  }
  if (donnees?.application !== 'prise-de-masse') return alert('Ce fichier n’est pas une sauvegarde de l’appli.');
  if (!confirm('Remplacer toutes les données de ce téléphone par celles de la sauvegarde ?')) return;
  for (const nom of db.MAGASINS) {
    await db.vider(nom);
    for (const ligne of donnees[nom] ?? []) {
      if (nom === 'photos') ligne.donnees = await (await fetch(ligne.donnees)).arrayBuffer();
      await db.ecrire(nom, ligne);
    }
  }
  profil = await db.reglage('profil');
  if (profil) aller('seance');
  else afficherAccueil();
}

demarrer();

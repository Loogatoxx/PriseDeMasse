// Accès aux données : tout est stocké sur le téléphone, dans IndexedDB.
// IndexedDB plutôt que localStorage : il accepte les photos et n'est pas limité à ~5 Mo.

const NOM_BASE = 'prise-de-masse';
const VERSION = 1;

export const MAGASINS = ['seances', 'pesees', 'mesures', 'photos', 'reglages'];

let basePromesse = null;

function ouvrir() {
  if (basePromesse) return basePromesse;
  basePromesse = new Promise((resoudre, rejeter) => {
    const requete = indexedDB.open(NOM_BASE, VERSION);
    // Appelé seulement à la création de la base (ou si VERSION augmente)
    requete.onupgradeneeded = () => {
      const base = requete.result;
      base.createObjectStore('seances', { keyPath: 'id', autoIncrement: true });
      base.createObjectStore('pesees', { keyPath: 'date' });
      base.createObjectStore('mesures', { keyPath: 'date' });
      base.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      base.createObjectStore('reglages', { keyPath: 'cle' });
    };
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
  });
  return basePromesse;
}

// Ouvre une transaction et lance la requête dans le même tour de boucle :
// une transaction IndexedDB se ferme toute seule si on attend entre les deux.
async function operation(nom, mode, action) {
  const base = await ouvrir();
  const requete = action(base.transaction(nom, mode).objectStore(nom));
  return new Promise((resoudre, rejeter) => {
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
  });
}

export const tout = (nom) => operation(nom, 'readonly', (m) => m.getAll());
export const lire = (nom, cle) => operation(nom, 'readonly', (m) => m.get(cle));
export const ecrire = (nom, valeur) => operation(nom, 'readwrite', (m) => m.put(valeur));
export const supprimer = (nom, cle) => operation(nom, 'readwrite', (m) => m.delete(cle));
export const vider = (nom) => operation(nom, 'readwrite', (m) => m.clear());

// Réglages : petite surcouche clé → valeur
export async function reglage(cle, defaut = null) {
  const ligne = await lire('reglages', cle);
  return ligne ? ligne.valeur : defaut;
}

export const definirReglage = (cle, valeur) => ecrire('reglages', { cle, valeur });

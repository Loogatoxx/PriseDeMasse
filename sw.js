// Service worker : petit programme que le navigateur garde en arrière-plan.
// Il conserve une copie des fichiers de l'appli pour qu'elle s'ouvre même sans réseau.

const CACHE = 'prise-de-masse';
const FICHIERS = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/db.js', 'js/calculs.js', 'js/graph.js', 'js/programme.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];

// À l'installation, on copie tout de suite les fichiers : l'appli marche hors ligne dès la 2e ouverture
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FICHIERS)));
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Réseau d'abord, pour recevoir tout de suite les mises à jour de l'appli ;
// la copie en cache ne sert que si le téléphone est hors ligne.
self.addEventListener('fetch', (e) => {
  const requete = e.request;
  if (requete.method !== 'GET' || new URL(requete.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(requete)
      .then((reponse) => {
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(requete, copie));
        }
        return reponse;
      })
      .catch(() => caches.match(requete, { ignoreSearch: true })),
  );
});

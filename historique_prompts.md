# Historique des prompts

## 2026-10-27 — Cadrage de l'appli (/grill-me)

**Le prompt** : « Faire une appli pour être en bonne forme physique, avec une apparence plus
athlétique et une prise de masse, 100 % adaptée à moi », à partir d'un résumé d'une autre IA
(Sonnet) à ne pas suivre à la lettre. Toute info sur les exercices et la nutrition doit être
vérifiée par des sous-agents.

**Ta réponse** : entretien en 8 questions, puis récapitulatif validé.
- Outil rapide à avoir (pas un projet CV), zéro matériel pour de bon, pas de salle.
- Abandon passé : la motivation (jours de pluie, trajet à pied vers la salle).
- Motivations : voir ses chiffres monter, voir son corps changer, voir la balance monter (60 → 66 kg).
- Nutrition : appétit faible et ne sait pas combien il mange → saisie à un tap, favoris,
  recettes, puis photo d'assiette par IA (clé dans les réglages, coût ~0,10 à 2 $/mois).
- Vérifications par sous-agents : protéines 1,6–2,2 g/kg, thon ≈ 25 g par boîte (et non 15),
  sommeil 7–9 h, besoin d'exercices de tirage, séances plus longues en supersets.

**Les modifications** : aucune (cadrage seulement).

**L'objectif** : savoir exactement quoi construire avant d'écrire du code, et éviter les
erreurs sur les exercices et l'alimentation.

## 2026-10-27 — Phase 1 : séances, progression, pesée, photos

**Le prompt** : « Je valide » (après une question sur les crédits gratuits de l'API : il n'y en a
pas avec l'abonnement Claude, l'API est facturée à part). Dépôt GitHub public choisi, projet
dans `~/Developer/PriseDeMasse`.

**Ta réponse** : construction de la phase 1 en appli web installable, programme vérifié par un
sous-agent puis corrigé, tests complets dans le navigateur.

**Les modifications** :
- `index.html`, `css/style.css` : structure et thème sombre, barre d'onglets, minuteur de repos.
- `js/programme.js` : exercices sans matériel, variantes de la plus facile à la plus dure, phases
  (reprise douce S1-2, progression S3+, séance allégée), règle de double progression.
- `js/app.js` : écrans Séance (saisie enregistrée tout de suite, repos automatique, bilan et
  records), Progrès (régularité, courbe, records, test de max), Corps (pesée, moyenne 7 jours,
  tendance et conseil calories, tour de bras, photos), Réglages (profil, export, import).
- `js/db.js` : stockage IndexedDB. `js/calculs.js` : dates, moyenne glissante, tendance.
- `js/graph.js` : courbes en SVG. `sw.js` + `manifest.webmanifest` + `icons/` : installation et hors ligne.
- Corrections après vérification : plafond de 20 reps aux pompes, échauffement, échec réservé aux
  pompes et au rowing sous la table, élévations latérales pour la carrure, rappel du test de max.
- Corrections après test : courbe en « meilleure série » (le total faisait un faux bond en S3),
  courbe de poids zoomée sur les pesées, progression biceps corrigée (le curl marteau n'est pas plus dur).

**L'objectif** : avoir au plus vite un outil utilisable chaque jour, qui rend la progression
visible pour tenir les jours sans motivation.

## 2026-10-28 — Mise en ligne

**Le prompt** : « Oui : commite, crée le dépôt public PriseDeMasse, pousse et active GitHub Pages. »

**Ta réponse** : premier commit sur `phase-1-seances`, branche `main` créée au même point,
dépôt public créé et poussé, GitHub Pages activé sur `main`, puis explication de l'installation
sur le téléphone.

**Les modifications** :
- `.nojekyll` (fichier vide) : dit à GitHub Pages de servir les fichiers tels quels, sans passer
  par Jekyll (son générateur de site, inutile ici).
- `README.md` : adresse de l'appli en ligne.

**L'objectif** : rendre l'appli accessible en HTTPS, condition pour que le téléphone accepte
de l'installer sur l'écran d'accueil.

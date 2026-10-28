# Prise de masse

Appli perso de remise en forme : séances à la maison sans matériel, progression, pesée,
tour de bras et photos. Faite pour une seule personne, sans compte ni serveur : toutes les
données restent sur le téléphone.

## Ce qu'elle fait (phase 1)

- **Séance** guidée en deux supersets (poussée + tirage, triceps + biceps) avec option épaules/gainage.
  Reprise douce les 2 premières semaines, puis progression. Rappel « la dernière fois 18, vise 19 ».
- **Progrès** : régularité par semaine, courbe par exercice, records, test de max de pompes.
- **Corps** : pesée quotidienne avec moyenne sur 7 jours et tendance, tour de bras, photos avant/après.
- **Réglages** : profil, export et import d'une sauvegarde.

Le programme est dans [`js/programme.js`](js/programme.js), vérifié avec sources le 2026-10-27.

**En ligne :** https://loogatoxx.github.io/PriseDeMasse/ (publié par GitHub Pages depuis la branche `main`).

## Technique, et pourquoi

| Choix | Pourquoi |
|---|---|
| HTML, CSS et JavaScript sans framework ni outil de build | Rien à installer ni à compiler ; chaque fichier se lit directement. |
| Appli web installable (PWA) | Marche sur iPhone comme sur Android, s'ajoute à l'écran d'accueil. |
| IndexedDB pour les données | Stocke aussi les photos, sans la limite de ~5 Mo de `localStorage`. |
| Service worker (`sw.js`) | L'appli s'ouvre même sans réseau. |
| Graphiques en SVG faits main (`js/graph.js`) | Pas de bibliothèque à charger. |

## Lancer en local

```bash
python3 -m http.server 8080
```

Puis ouvrir http://localhost:8080. (Les modules JavaScript ne marchent pas en ouvrant
`index.html` directement : il faut passer par un serveur.)

## Feuille de route

1. **Phase 1** : séances, progression, pesée, photos. ← ici
2. **Phase 2** : objectifs calories et protéines, saisie des repas à un tap, favoris, recettes.
3. **Phase 3** : photo d'assiette analysée par IA.

Règle : on ne passe à la phase suivante que lorsque la précédente sert vraiment au quotidien.

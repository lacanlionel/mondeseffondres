# Relevé — archive photographique du paysage

Carte interactive (MapLibre GL + fond OpenFreeMap/OSM) présentant des photos
géolocalisées d'un secteur, avec géolocalisation de l'utilisateur (point +
cercle de précision) et boussole.

## Arborescence

```
releve/
├── index.html          page principale (structure seulement)
├── css/
│   └── style.css        tous les styles
├── js/
│   └── app.js            logique carte, géolocalisation, panneau photo
├── data/
│   └── photos.geojson    les points-photos (source de vérité, pérenne)
└── images/
    ├── 001.jpg ...        tes photos (à ajouter toi-même)
    └── README.md
```

## Ajouter une photo

1. Dépose l'image dans `images/` (ex. `006.jpg`).
2. Ajoute une entrée dans `data/photos.geojson` :

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [LONGITUDE, LATITUDE] },
  "properties": {
    "id": 6,
    "year": 2025,
    "title": "Titre du relevé",
    "note": "Note de terrain.",
    "image": "images/006.jpg"
  }
}
```

Aucune modification de `index.html` ou `app.js` n'est nécessaire : la carte
lit le GeoJSON au chargement.

## Héberger sur GitHub Pages

1. Crée un dépôt GitHub (public, ou privé avec un compte Pro/Team pour Pages).
2. Pousse le contenu de ce dossier `releve/` à la racine du dépôt :
   ```
   git init
   git add .
   git commit -m "Relevé — première version"
   git branch -M main
   git remote add origin https://github.com/TON-COMPTE/TON-DEPOT.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Build and deployment → Source : "Deploy
   from a branch"**, choisis la branche `main` et le dossier `/ (root)`.
4. La page sera servie en HTTPS à une adresse du type
   `https://TON-COMPTE.github.io/TON-DEPOT/` (délai de 1 à quelques minutes
   après le premier déploiement).

Le HTTPS de GitHub Pages est important : la géolocalisation du navigateur
(`GeolocateControl`) est bloquée par la plupart des navigateurs sur une page
servie en simple HTTP.

## Notes

- `CENTER` dans `js/app.js` est calé sur Saint-Quentin-la-Poterie (Gard),
  à ajuster si besoin.
- Les coordonnées des photos factices actuelles sont dispersées autour du
  village ; remplace-les par tes vraies positions (EXIF ou relevé GPS).

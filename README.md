# 🗳️ BREF Dashboard — Base des Représentants Élus de France

**BREF Dashboard** est une application web interactive permettant de visualiser et d'explorer les données des élus français (maires, députés, sénateurs, conseillers…). Elle propose des tableaux de bord, des cartes choroplèthes, des graphiques statistiques ainsi qu'un assistant IA pour interroger les données en langage naturel.

---

## 📋 Table des matières

- [Aperçu](#-aperçu)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Technologies utilisées](#-technologies-utilisées)
- [Structure du projet](#-structure-du-projet)
- [Installation et démarrage](#-installation-et-démarrage)
  - [Avec Docker](#avec-docker-recommandé)
  - [Sans Docker (serveur statique)](#sans-docker-serveur-statique)
- [API](#-api)
- [Pages](#-pages)
- [Modules JavaScript](#-modules-javascript)
- [Styles CSS](#-styles-css)
- [Filtres disponibles](#-filtres-disponibles)
- [Contribuer](#-contribuer)

---

## 🖥️ Aperçu

Le dashboard s'articule autour de deux pages principales :

| Page | Description |
|------|-------------|
| `index.html` | Tableau de bord principal : KPIs, graphiques, carte interactive, liste des élus |
| `ia.html` | Assistant IA conversationnel pour explorer les données en langage naturel |

---

## ✨ Fonctionnalités

### Tableau de bord (`index.html`)

- **Indicateurs clés (KPIs)** : nombre total d'élus, répartition par genre, âge moyen, nombre de mandats cumulés.
- **Graphiques statistiques** :
  - Répartition hommes / femmes
  - Distribution par tranches d'âge
  - Répartition par nuances politiques
  - Classement des professions les plus représentées
  - Types de mandats
  - Cumul des mandats
  - Évolution temporelle
  - Palmarès de parité et d'âge par département
- **Carte choroplèthe interactive** de France métropolitaine et DOM :
  - Visualisation par densité d'élus, parité, âge moyen ou nuance politique dominante
  - Survol d'un département → tooltip détaillé
  - Clic sur un département → filtrage automatique
  - Légende dynamique selon la métrique sélectionnée
- **Filtres avancés** :
  - Département, type de mandat, genre, nuance politique, tranche d'âge, recherche textuelle
  - Tags de filtres actifs avec suppression individuelle ou globale
- **Liste des élus** avec pagination et recherche
- **Export des données** en CSV ou JSON
- **Comparaison de territoires** (deux zones côte à côte)

### Assistant IA (`ia.html`)

- Interface de chat intégrée
- Connexion à l'API OpenAI via une clé personnelle (saisie côté client, non stockée côté serveur)
- Génération de réponses enrichies : tableaux, graphiques inline, analyse de données
- Exemples de questions prédéfinies pour démarrer rapidement

---

## 🏗️ Architecture

```
Navigateur (HTML / CSS / JS vanilla)
        │
        ▼
  BREF REST API  ←→  Base de données des élus
  api.bref.chanutgirardi.com
        │
        ▼
  (optionnel) OpenAI API  ←  ia.html
```

L'application est **100 % côté client** (pas de backend propre). Elle consomme :
- l'API BREF pour les données des élus ;
- l'API OpenAI (clé fournie par l'utilisateur) pour l'assistant IA.

Le déploiement se fait via un conteneur **Nginx** servant les fichiers statiques.

---

## 🛠️ Technologies utilisées

| Technologie | Rôle |
|-------------|------|
| HTML5 / CSS3 | Structure et mise en page |
| JavaScript ES Modules (vanilla) | Logique applicative sans framework |
| [Leaflet.js](https://leafletjs.com/) v1.9.4 | Carte interactive (tiles CARTO) |
| [Chart.js](https://www.chartjs.org/) v4.4.1 | Graphiques statistiques |
| [Google Fonts — Inter](https://fonts.google.com/specimen/Inter) | Typographie |
| GeoJSON (France — départements) | Fond de carte vectoriel |
| [OpenAI API](https://platform.openai.com/) | Assistant IA (clé utilisateur) |
| Docker + Nginx Alpine | Conteneurisation et déploiement |

---

## 📁 Structure du projet

```
VisuPolitique/
├── index.html              # Dashboard principal
├── ia.html                 # Page assistant IA
├── Dockerfile              # Image Docker (Nginx Alpine)
├── assets/
│   └── france-departments.geojson   # Géométries des départements français
├── css/
│   ├── variables.css       # Variables CSS (couleurs, espacements, typographie)
│   ├── base.css            # Styles de base (reset, typographie globale)
│   ├── layout.css          # Mise en page (header, grille, sections)
│   ├── components.css      # Composants réutilisables (boutons, cartes, tags…)
│   └── charts.css          # Styles spécifiques aux graphiques et à la carte
└── js/
    ├── api.js              # Client REST BREF API (StatsAPI, ElectedAPI, LocationAPI…)
    ├── app.js              # Point d'entrée principal, orchestration
    ├── app_backup.js       # Sauvegarde de l'application (non utilisé en prod)
    ├── charts.js           # Configurations et création des graphiques Chart.js
    ├── filters.js          # Gestion de l'état des filtres et mise à jour de l'UI
    └── map.js              # Initialisation et gestion de la carte Leaflet
```

---

## 🚀 Installation et démarrage

### Avec Docker (recommandé)

```bash
# Cloner le dépôt
git clone https://github.com/PrupoCG/VisuPolitique.git
cd VisuPolitique

# Construire l'image Docker
docker build -t bref-dashboard .

# Lancer le conteneur (port 8080 sur la machine hôte)
docker run -d -p 8080:80 --name bref-dashboard bref-dashboard
```

Ouvrir ensuite [http://localhost:8080](http://localhost:8080) dans le navigateur.

### Sans Docker (serveur statique)

L'application utilise les **ES Modules** JavaScript, ce qui nécessite un serveur HTTP (le protocole `file://` ne fonctionne pas).

```bash
# Option 1 — Python 3
python3 -m http.server 8080

# Option 2 — Node.js (npx)
npx serve .

# Option 3 — PHP
php -S localhost:8080
```

Ouvrir ensuite [http://localhost:8080](http://localhost:8080).

---

## 🔌 API

L'application consomme l'API REST publique disponible à l'adresse :

```
https://api.bref.chanutgirardi.com
```

### Principaux endpoints utilisés

| Module | Endpoint | Description |
|--------|----------|-------------|
| `StatsAPI` | `GET /api/stats/overview` | Statistiques globales |
| `StatsAPI` | `GET /api/stats/gender` | Répartition par genre |
| `StatsAPI` | `GET /api/stats/age` | Distribution par âge |
| `StatsAPI` | `GET /api/stats/political-nuances` | Nuances politiques |
| `StatsAPI` | `GET /api/stats/professions` | Professions |
| `StatsAPI` | `GET /api/stats/mandate-types` | Types de mandats |
| `StatsAPI` | `GET /api/stats/cumul` | Cumul des mandats |
| `StatsAPI` | `GET /api/stats/evolution` | Évolution temporelle |
| `StatsAPI` | `GET /api/stats/rankings/parity` | Classement parité |
| `StatsAPI` | `GET /api/stats/rankings/age` | Classement âge |
| `StatsAPI` | `GET /api/stats/heat-map` | Données densité par département |
| `StatsAPI` | `GET /api/stats/political-map` | Nuance dominante par département |
| `StatsAPI` | `GET /api/stats/compare` | Comparaison de deux territoires |
| `ElectedAPI` | `GET /api/elected` | Liste des élus (paginée) |
| `ElectedAPI` | `GET /api/elected/search` | Recherche par nom |
| `ElectedAPI` | `GET /api/elected/advanced-search` | Recherche multicritères |
| `ElectedAPI` | `GET /api/elected/:id` | Profil complet d'un élu |
| `ElectedAPI` | `GET /api/elected/:id/mandates` | Mandats d'un élu |
| `ElectedAPI` | `GET /api/elected/current/mayors` | Maires en exercice |
| `ElectedAPI` | `GET /api/elected/current/deputies` | Députés en exercice |
| `ElectedAPI` | `GET /api/elected/current/senators` | Sénateurs en exercice |
| `LocationAPI` | `GET /api/location/city/:code` | Élus d'une commune (code INSEE) |
| `LocationAPI` | `GET /api/location/department/:code` | Élus d'un département |
| `LocationAPI` | `GET /api/location/gps` | Élus proches de coordonnées GPS |
| `AreasAPI` | `GET /api/areas/search` | Recherche de territoire |
| `ExportAPI` | `GET /api/export/elected` | Export CSV des élus |

---

## 📄 Pages

### `index.html` — Dashboard principal

Navigation par ancres :
- **`#overview`** — KPIs généraux
- **`#statistics`** — Graphiques et analyses
- **`#map`** — Carte interactive de France
- **`#elected`** — Tableau des élus filtrable

### `ia.html` — Assistant IA

1. Saisir sa clé API OpenAI dans le bandeau de configuration (stockée uniquement en mémoire de session).
2. Poser une question en langage naturel (ex. : *"Quelle est la parité dans le département du Nord ?"*).
3. L'assistant interroge l'API BREF, analyse les données et répond avec texte, tableaux ou graphiques.

---

## 🧩 Modules JavaScript

### `api.js`
Client REST modulaire exposant cinq namespaces :
- **`StatsAPI`** — statistiques agrégées
- **`ElectedAPI`** — données individuelles des élus
- **`LocationAPI`** — données géographiques (commune, département, GPS)
- **`AreasAPI`** — recherche et détails de territoires
- **`ExportAPI`** — URLs d'export CSV/JSON

### `app.js`
Point d'entrée de l'application : initialise les modules, charge les données, orchestre les interactions entre la carte, les graphiques et les filtres.

### `charts.js`
Configurations Chart.js : palette de couleurs, options par défaut (thème clair, police Inter), fonctions de création pour chaque type de graphique.

### `filters.js`
Gestion réactive de l'état des filtres :
- Liaison des inputs HTML à l'état interne
- Debounce sur la recherche textuelle (300 ms)
- Tags de filtres actifs avec suppression
- Peuplement des listes déroulantes (départements, mandats, nuances)

### `map.js`
Carte Leaflet avec fond CARTO :
- Chargement du GeoJSON local (`assets/france-departments.geojson`) ou fallback distant
- Choroplèthe dynamique : densité / parité / âge moyen / nuance politique
- Tooltips au survol, zoom au clic, légende adaptative

---

## 🎨 Styles CSS

L'architecture CSS suit une approche **modulaire par responsabilité** :

| Fichier | Contenu |
|---------|---------|
| `variables.css` | Tokens de design : couleurs, espacements, rayons, typographie, ombres |
| `base.css` | Reset, styles globaux du `body`, liens, sélections |
| `layout.css` | Header, navigation, grille principale, sections |
| `components.css` | Boutons, cartes, badges, tags, formulaires, tableaux, loaders |
| `charts.css` | Conteneurs de graphiques, tooltips de carte, légende |

---

## 🔍 Filtres disponibles

| Filtre | Clé interne | Type |
|--------|-------------|------|
| Département | `department` | Liste (01 à 976 + DOM) |
| Type de mandat | `mandateType` | Liste (maire, député, sénateur…) |
| Genre | `gender` | Liste (H / F) |
| Nuance politique | `nuance` | Liste (EXG, SOC, REN, RN…) |
| Âge minimum | `minAge` | Nombre |
| Âge maximum | `maxAge` | Nombre |
| Recherche textuelle | `search` | Texte (debounce 300 ms) |

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Pour proposer une amélioration :

1. Forker le dépôt
2. Créer une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Committer les changements (`git commit -m "feat: description"`)
4. Pousser la branche (`git push origin feature/ma-fonctionnalite`)
5. Ouvrir une Pull Request

---

*Projet développé dans le cadre de la visualisation des données publiques sur la représentation politique en France.*

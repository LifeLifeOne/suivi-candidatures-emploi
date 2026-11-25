# Suivi de candidatures

Un petit tableau de bord **local et gratuit** pour garder la tête hors de l'eau pendant une recherche d'emploi : où avez-vous postulé, quand, pour quel poste, avec quel CV, qui faut-il relancer, et où en est chaque candidature.

> J'ai construit cet outil pour ma propre recherche d'emploi. Elle a abouti, alors je le partage : chercher un poste en 2026 est éprouvant, et ne plus rien perdre de vue aide vraiment. Bon courage à vous 💪

- **Pas de compte, pas de cloud, pas d'abonnement** : la base de données et vos documents restent dans un dossier de votre ordinateur.
- **Une seule personne** : l'application est faite pour tourner sur votre machine, pas pour être exposée sur Internet (elle n'a pas d'authentification).
- Interface en **français**. La recherche de ville s'appuie sur la Géoplateforme de l'IGN et ne couvre que les **communes françaises**.

## Fonctionnalités

- **Candidatures** : entreprise, poste, date, statut, tags (au moins un), ville, mode de travail (sur site, hybride, télétravail), lien de l'offre et notes.
- **Statuts** : Postulée, En attente, Entretien, Offre reçue, Refusée, Abandonnée. Chaque changement est daté et conservé dans l'historique de la fiche.
- **Relances** : notez chaque relance (date et note facultative), puis modifiez-la ou supprimez-la. L'application n'envoie aucun message et ne programme aucun rappel.
- **Documents** : rattachez à chaque candidature le CV ou la lettre envoyés (PDF, JPG, PNG, jusqu'à 10 Mo par fichier). Le contenu réel du fichier est vérifié, pas seulement son extension.
- **Trois vues** sur le tableau de bord :
  - **Liste**, avec recherche, filtres et option pour masquer les candidatures refusées ;
  - **Carte** des candidatures par ville (les pins rouges regroupent uniquement des refus) ;
  - **Historique**, une frise des envois et des relances, filtrable par période.
- **Pense-bêtes** (page *Fichiers utiles*) : déposez et retrouvez rapidement des fichiers qui ne sont liés à aucune candidature (PDF, TXT, JPG, PNG), par exemple une fiche de préparation d'entretien ou une liste de questions.
- **Export CSV** de toutes vos candidatures, lisible dans un tableur.

## Installation

### Prérequis

- [Node.js](https://nodejs.org/) **22.13 ou plus récent**. La version de référence est indiquée dans `.nvmrc` ; avec [nvm](https://github.com/nvm-sh/nvm), lancez `nvm install` puis `nvm use`.
- [pnpm](https://pnpm.io/), activé via Corepack : `corepack enable`. Depuis Node 25, Corepack n'est plus livré avec Node ; installez-le d'abord avec `npm install -g corepack`.
- Git, pour récupérer le projet.

L'application a été développée et testée sous **Linux et WSL**. Avec les commandes `pnpm`, elle devrait aussi fonctionner sous macOS et Windows, mais ce n'est pas testé : vos retours sont les bienvenus. Les scripts `start.sh` et `stop.sh` sont réservés à Linux et WSL.

> `better-sqlite3` est un module natif. Si `pnpm install` échoue en le compilant, installez les outils de compilation de votre système : `build-essential` et `python3` sous Debian ou Ubuntu, Xcode Command Line Tools sous macOS, ou les outils C++ de Visual Studio sous Windows.

### Premier lancement

```bash
git clone <url-de-ce-depot> suivi-candidatures
cd suivi-candidatures
corepack enable
pnpm install
pnpm dev
```

Ouvrez ensuite [http://localhost:3000](http://localhost:3000). Au premier démarrage, la base SQLite est créée automatiquement dans `data/jobs.db`.

### Usage au quotidien (Linux et WSL)

Pour utiliser l'application tous les jours, lancez la version optimisée :

```bash
./start.sh   # compile si nécessaire, démarre le serveur et ouvre le navigateur
./stop.sh    # arrête le serveur lancé par start.sh
```

- Le script ne recompile que si le code, les migrations, les dépendances ou la configuration ont changé. Pour forcer une compilation : `JOBS_REBUILD=1 ./start.sh`.
- Si le port 3000 est déjà pris : `JOBS_PORT=3100 ./start.sh`.
- Le journal est écrit dans `.run/dashboard.log`.
- Pour choisir Node, le script essaie nvm, puis [mise](https://mise.jdx.dev/), puis le Node du système. `JOBS_NODE_MAJOR=24` force une version majeure avec mise.
- Le navigateur s'ouvre avec `wslview` sous WSL ou `xdg-open` sous Linux.

Sur macOS ou Windows sans WSL, utilisez `pnpm build` puis `pnpm start`.

## Vos données

| Quoi | Où |
| --- | --- |
| Base de données (candidatures, tags, historique, relances) | `data/jobs.db` |
| Documents et pense-bêtes déposés | `data/uploads/` |

Le dossier `data/` est exclu de Git : **vos candidatures ne seront jamais commitées**, même si vous forkez le projet.

Pour placer vos données ailleurs, par exemple dans un dossier synchronisé, copiez `.env.example` vers `.env.local` et modifiez les chemins :

```bash
DB_FILE_NAME=data/jobs.db
UPLOAD_DIR=data/uploads
```

### Sauvegarde et restauration

- **Copie rapide** : le bouton **Exporter en CSV** sur le tableau de bord.
- **Sauvegarde complète** : arrêtez l'application, puis copiez tout le dossier `data/`.
- **Restauration** : remettez ce dossier au même endroit avant de relancer l'application.

### Ce qui sort de votre ordinateur

Vos candidatures et vos fichiers ne quittent jamais votre machine. Deux services publics sont tout de même contactés :

- la **Géoplateforme de l'IGN** (`data.geopf.fr`) reçoit le texte tapé dans le champ ville, pour proposer les communes correspondantes ;
- **OpenStreetMap** (`tile.openstreetmap.org`) fournit les fonds de carte de la vue Carte.

Sans connexion Internet, tout fonctionne sauf la recherche de ville et l'affichage du fond de carte.

## Développement

```bash
pnpm dev          # serveur de développement avec rechargement automatique
pnpm lint         # analyse statique (ESLint)
pnpm test         # tests unitaires et d'intégration (Vitest)
pnpm test:e2e     # parcours navigateur (Playwright + Chromium)
pnpm build        # build de production
pnpm db:generate  # génère une migration après une modification de src/db/schema.ts
pnpm db:migrate   # applique les migrations (fait automatiquement par pnpm dev et pnpm start)
```

- Avant le premier `pnpm test:e2e`, installez le navigateur : `pnpm exec playwright install chromium`. Les tests e2e démarrent leur propre serveur sur le port 3100, avec une base dédiée dans `data/e2e/` qui ne touche pas à vos vraies données. Si un serveur tourne déjà sur ce port, Playwright le réutilise : arrêtez-le d'abord.
- La stack : Next.js 16 (App Router, Server Actions), React 19, SQLite avec better-sqlite3 et Drizzle ORM, Zod, Leaflet et Tailwind CSS 4.
- [`CLAUDE.md`](CLAUDE.md) décrit l'architecture et les conventions du projet. Il sert aux assistants de code comme [Claude Code](https://claude.com/claude-code), et aux humains qui veulent s'y retrouver vite.

## Contribuer

Les issues et pull requests sont les bienvenues : bugs, idées, adaptation à d'autres pays ou traduction. Pour une modification, lancez `pnpm lint` et `pnpm test` avant d'ouvrir la PR.

**Ne joignez jamais votre fichier `data/jobs.db` ni vos documents à une issue** : ils contiennent vos informations personnelles. Pour reproduire un bug, utilisez des données inventées.

## Licence

[MIT](LICENSE) : vous pouvez l'utiliser, le modifier et le partager librement.

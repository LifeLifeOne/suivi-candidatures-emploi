# CLAUDE.md

Guide pour les assistants de code (et les humains) qui travaillent sur ce dépôt.

## Le projet

Tableau de bord **local, mono-utilisateur, sans authentification** pour suivre une recherche d'emploi : candidatures, statuts, relances, documents, carte et export CSV. L'interface, les messages d'erreur, les libellés et la plupart des tests sont **en français**. Gardez cette langue pour tout ce qui est visible par l'utilisateur.

## Commandes

```bash
pnpm install
pnpm dev          # lance d'abord pnpm db:migrate (predev), puis next dev sur :3000
pnpm lint         # ESLint (config Next)
pnpm test         # Vitest : src/**/*.test.ts, environnement node
pnpm test:e2e     # Playwright (Chromium), serveur dev sur :3100 avec une base dans data/e2e/
pnpm build        # next build
pnpm db:generate  # drizzle-kit : génère une migration SQL à partir de src/db/schema.ts
pnpm db:migrate   # applique drizzle/ sur DB_FILE_NAME
```

Pour vérifier un changement, lancez `pnpm lint && pnpm test`, puis `pnpm build` si vous avez touché la config, les routes ou les types partagés.

## Architecture

- **Next.js 16, App Router**. Les pages sont des Server Components qui lisent la base directement via `src/db/repository.ts`. Les écritures passent par des **Server Actions** (`src/app/actions.ts`, `src/app/follow-up-actions.ts`), qui valident avec Zod, appellent le repository puis `revalidatePath`.
- **Base** : SQLite avec `better-sqlite3` (synchrone) et Drizzle ORM. Le client est dans `src/db/client.ts` (WAL et `foreign_keys = ON`) et le schéma dans `src/db/schema.ts`.
  - Tables : `applications`, `tags`, `application_tags`, `status_history`, `application_documents`, `application_follow_ups`, `quick_files`.
  - Les suppressions sont en `ON DELETE CASCADE`.
- **Repository** (`src/db/repository.ts`) : chaque fonction prend `database: AppDatabase = db` en dernier paramètre, ce qui permet aux tests d'injecter une base `:memory:`. Toute nouvelle fonction doit suivre ce modèle.
- **Migrations** : fichiers SQL versionnés dans `drizzle/` et appliqués par `src/db/migrate.ts`. Après une modification du schéma, lancez `pnpm db:generate` et commitez le SQL et `drizzle/meta/`. Ne modifiez jamais une migration existante : le migrateur Drizzle ne compare que les dates, donc les bases déjà migrées ne verraient pas la modification. N'écrivez jamais de données réelles (villes, entreprises) dans une migration.
- **Documents** (`src/lib/document-storage.ts`) :
  - les fichiers sont stockés dans `UPLOAD_DIR` (par défaut `data/uploads/`), sous un nom UUID ;
  - le type est vérifié par signature binaire (magic bytes) et doit correspondre à l'extension ;
  - limite de 10 Mo ; TXT accepté uniquement pour les pense-bêtes, avec UTF-8 obligatoire ;
  - les fichiers sont servis par des route handlers (`src/app/candidatures/[id]/documents/[documentId]/route.ts`, `src/app/fichiers/[fileId]/route.ts`).
- **Villes** : `src/app/api/communes/route.ts` interroge la Géoplateforme de l'IGN (`data.geopf.fr`) et ne couvre que les communes françaises. La carte (`src/components/application-map.tsx`) utilise Leaflet et des tuiles OpenStreetMap, chargés uniquement côté client.
- **Logique pure et testée** dans `src/lib/` : validation (Zod), CSV, historique, vues, relances, statuts (`status.ts`), modes de travail (`work-mode.ts`), tags.
- **Styles** : Tailwind CSS 4, mais l'essentiel du style est en classes CSS classiques dans `src/app/globals.css`.

### Routes

| Route | Rôle |
| --- | --- |
| `/` | Tableau de bord : vues Liste, Carte, Historique et filtres |
| `/candidatures/nouvelle` | Création d'une candidature |
| `/candidatures/[id]` | Fiche : édition, statut, relances, documents, historique |
| `/fichiers` | Pense-bêtes : fichiers non liés à une candidature |
| `/export/csv` | Export CSV |
| `/api/communes?q=` | Autocomplétion des communes |

## Configuration

Variables d'environnement, à placer dans `.env.local` (modèle : `.env.example`) :

- `DB_FILE_NAME` : chemin de la base, `data/jobs.db` par défaut ;
- `UPLOAD_DIR` : dossier des fichiers, `<dossier de la base>/uploads` par défaut.

Les scripts `start.sh` et `stop.sh` lancent la version production (Linux et WSL uniquement, car ils utilisent `/proc` et `setsid`). Ils acceptent `JOBS_PORT`, `JOBS_REBUILD=1` et `JOBS_NODE_MAJOR`.

## Règles importantes

- **Données personnelles** : `data/`, `.env*` (sauf `.env.example`), ainsi que les PDF, DOCX et sauvegardes à la racine sont ignorés par Git. Ne commitez jamais une base, un document ou un fichier de l'utilisateur, et ne les lisez pas sans qu'il le demande. Dans les tests, n'utilisez que des données inventées (entreprises « Acme », villes connues).
- **Tests e2e** : ils doivent toujours tourner sur la base dédiée définie dans `playwright.config.ts` (`data/e2e/`), jamais sur `data/jobs.db`.
- **Statuts** : la source de vérité est `APPLICATION_STATUSES` dans `src/lib/status.ts`. Pour ajouter un statut, il faut aussi un libellé, un style CSS et une migration, car c'est un enum dans le schéma.
- Garder l'application **locale** : pas de nouveau service externe, pas de télémétrie, pas de compte utilisateur, sauf si c'est demandé explicitement.
- Server Actions : la taille maximale des requêtes est fixée à 11 Mo dans `next.config.ts`, pour accepter les documents de 10 Mo. Gardez ces deux limites cohérentes.

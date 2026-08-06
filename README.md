# Mon suivi perso — Suivi de vente de véhicules

Application web multi-agences de suivi des annonces de véhicules en
dépôt-vente, destinée à être proposée en abonnement à un réseau d'agences
(franchise). Trois espaces distincts :

- **Espace admin** (`SUPER_ADMIN`) : création des agences et gestion de leur
  quota de comptes agents (abonnements).
- **Espace personnel (staff, `STAFF`)** : gestion des clients, des véhicules
  et saisie hebdomadaire des statistiques d'annonce — cloisonné par agence.
- **Espace client** (`CLIENT`) : consultation en lecture seule de ses propres
  véhicules et de l'évolution de leurs statistiques (graphiques + historique).

## Stack technique

- [Next.js 15](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Prisma ORM](https://www.prisma.io/) — PostgreSQL (dev et prod, ex. [Neon](https://neon.tech) ou [Supabase](https://supabase.com) en free tier)
- [Auth.js / NextAuth v5](https://authjs.dev/) — authentification par email + mot de passe, avec rôles (`SUPER_ADMIN` / `STAFF` / `CLIENT`)
- [Recharts](https://recharts.org/) — graphiques d'évolution côté client
- [Zod](https://zod.dev/) — validation des formulaires

## Installation

Prérequis : Node.js 20+, npm, et une base PostgreSQL.

Le plus simple pour une base PostgreSQL (dev comme prod) : un projet gratuit
sur [neon.tech](https://neon.tech) ou [supabase.com](https://supabase.com)
(aucune installation locale requise). Une instance Postgres locale (Postgres.app,
Docker...) fonctionne aussi.

```bash
npm install
```

Copier le fichier d'environnement :

```bash
cp .env.example .env
```

Éditer `.env` :
- `DATABASE_URL` : l'URL de connexion PostgreSQL (fournie par Neon/Supabase,
  ou la vôtre).
- `AUTH_SECRET` : une valeur générée avec `openssl rand -base64 32`.

## Base de données

Appliquer les migrations :

```bash
npx prisma migrate dev
```

Charger le jeu de données de démonstration (clients, véhicules, relevés
hebdomadaires) :

```bash
npx prisma db seed
```

> `npx prisma migrate dev` propose automatiquement d'exécuter le seed après
> la première migration. Vous pouvez relancer `npx prisma db seed` à tout
> moment pour réinitialiser les données de démonstration (il supprime les
> données existantes avant de recréer le jeu de démo).

## Lancer l'application en local

```bash
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

## Identifiants de test

| Rôle        | Email                        | Mot de passe   |
|-------------|-------------------------------|----------------|
| Super-admin | `admin@transakauto.fr`       | `Admin1234!`   |
| Staff       | `staff@transakauto.fr`       | `Staff1234!`   |
| Client      | `martin.dupont@example.com`  | `Client1234!`  |
| Client      | `sophie.bernard@example.com` | `Client1234!`  |
| Client      | `ahmed.khalil@example.com`   | `Client1234!`  |

Ces comptes sont créés par `prisma/seed.ts` (le compte staff et les 3 clients
appartiennent à la même agence de démo, « Agence Démo »). Le compte
super-admin gère les agences et leurs quotas, sans accès aux données clients
d'aucune agence ; un compte staff ne voit que les clients/véhicules de sa
propre agence ; chaque compte client ne voit que ses propres véhicules.
Cette isolation est vérifiée à la fois par le middleware de routage et par un
filtrage explicite (`agencyId`/`clientId`) en base de données sur chaque
requête.

## Organisation du code

```
app/
  login/               Page de connexion (commune admin/staff/client)
  admin/               Espace super-admin (protégé, rôle SUPER_ADMIN)
    agencies/           Liste, création, fiche agence (quota, comptes agents)
  staff/               Espace personnel (protégé par le middleware, rôle STAFF)
    dashboard/         Tableau de bord (KPIs, relevés manquants de la semaine)
    clients/           Liste, création, fiche détaillée des clients
    vehicles/           Liste, création, fiche véhicule, saisie des relevés
  client/              Espace client (protégé par le middleware, rôle CLIENT)
    dashboard/         Liste des véhicules du client connecté
    vehicles/[id]/     Fiche véhicule en lecture seule + graphiques
  api/auth/            Route handler Auth.js

auth.ts, auth.config.ts, middleware.ts   Configuration de l'authentification
                                          et protection des routes par rôle

lib/
  actions/             Server Actions (mutations : agences, clients, véhicules, relevés)
  prisma.ts            Client Prisma singleton
  session.ts           Helpers requireSuperAdmin() / requireStaff() / requireClient()
  validation.ts         Schémas Zod
  storage.ts            Stockage des photos uploadées

prisma/
  schema.prisma        Modèle de données
  seed.ts               Jeu de données de démonstration

components/            Composants partagés (navigation, formulaires, graphiques)
```

## Modèle de données

- `Agency` — une agence de la franchise (nom, quota de comptes agents
  `maxStaffAccounts`, lien d'avis Google)
- `User` — compte de connexion (email, mot de passe hashé, rôle). Rattaché à
  une `Agency` pour un `STAFF` ; jamais pour un `SUPER_ADMIN` ou un `CLIENT`
- `Client` — coordonnées d'un client, rattaché à un `User` et à une `Agency`
- `Vehicle` — véhicule en dépôt-vente, rattaché à un `Client` (et, de façon
  dénormalisée, à la même `Agency` que ce client — évite une jointure sur
  chaque requête de l'espace staff)
- `ListingUrl` — lien(s) vers l'annonce (LeBonCoin, La Centrale, AutoScout24…)
- `Photo` — photo(s) du véhicule
- `WeeklyStat` — relevé hebdomadaire de statistiques (vues, contacts, appels,
  favoris, visites, offres, note), un relevé unique par véhicule et par semaine
- `Notification` — notification in-app envoyée à un client (nouveau relevé,
  demande d'avis, réponse à une proposition de prix)
- `PriceProposal` — proposition d'ajustement de prix soumise par un client sur
  l'un de ses véhicules, à valider par le staff

Le schéma complet est dans [`prisma/schema.prisma`](prisma/schema.prisma).

### Cloisonnement par agence et par agent

Deux niveaux de cloisonnement côté staff :

1. **Par agence** : chaque requête de l'espace staff filtre par `agencyId`
   (obtenu via `requireStaff()` dans [`lib/session.ts`](lib/session.ts)).
2. **Par agent commercial** : chaque `Client` a un `assignedStaffId` —
   attribué automatiquement à l'agent qui le crée. Un agent ne voit que ses
   propres clients (et donc leurs véhicules), pas ceux de ses collègues de la
   même agence.

Chaque récupération par identifiant (fiche client, fiche véhicule, relevé...)
vérifie la propriété (agence + agent) avant de renvoyer quoi que ce soit —
même principe que l'isolation déjà en place côté client (`clientId`). Le
super-admin gère les agences et leurs comptes agents, mais ne consulte
jamais directement les clients/véhicules d'une agence (uniquement des
compteurs agrégés sur `/admin/agencies/[id]`).

Si un compte agent est supprimé, ses clients deviennent **non attribués**
(`assignedStaffId` repasse à `null`, via `onDelete: SetNull` sur la relation)
et ne sont visibles d'aucun agent tant que le super-admin ne les a pas
réattribués à un autre agent de la même agence, depuis la fiche agence — sans
jamais y voir le détail de leurs véhicules ou autres données.

### Ajouter un nouvel indicateur de statistique

Les champs de `WeeklyStat` sont volontairement des colonnes typées simples
(pas de schéma dynamique) pour rester faciles à comprendre et à afficher.
Pour ajouter un indicateur :

1. Ajouter la colonne dans `prisma/schema.prisma` (modèle `WeeklyStat`).
2. Lancer `npx prisma migrate dev --name add_<indicateur>`.
3. Ajouter le champ correspondant dans `lib/validation.ts` (`weeklyStatSchema`).
4. Ajouter le champ au formulaire (`components/StatForm.tsx`) et à son
   traitement (`lib/actions/stats.ts`).
5. Afficher le nouvel indicateur dans les pages concernées (historique staff
   `app/staff/vehicles/[id]/page.tsx`, fiche client
   `app/client/vehicles/[id]/page.tsx`, et le graphique
   `components/client/StatsChart.tsx`).

## Photos des véhicules

En développement, les photos uploadées sont stockées sur disque local dans
`public/uploads/vehicles/<id-véhicule>/`. Cette logique est isolée dans
[`lib/storage.ts`](lib/storage.ts) : pour un déploiement sur une
infrastructure multi-instance ou serverless, remplacer ce module par un
stockage objet (S3, Cloudinary...) sans toucher au reste de l'application.

La première photo d'un véhicule (ajoutée via le formulaire
« Modifier »/« Nouveau véhicule ») sert de vignette dans le tableau de bord
staff (section « Véhicules en vente ») et dans la liste `/staff/vehicles`.
Le jeu de données de démonstration ne contient pas de photos réelles ; tant
qu'aucune photo n'est ajoutée, une icône générique s'affiche à la place.

## Activation du compte client

Lorsque le staff crée un client (formulaire « Nouveau client », ou directement
depuis « + Nouveau client » dans le formulaire véhicule), aucun mot de passe
n'est généré ni affiché en clair. À la place, l'application propose :

- un **lien d'activation** (`/activate/<token>`), copiable en un clic ;
- le **QR code** correspondant, à faire scanner par le client.

Le staff transmet ce lien/QR par le moyen de son choix (SMS, email, papier...).
Le client l'ouvre, choisit lui-même son mot de passe, et est connecté
automatiquement à son espace. Le lien est valable **7 jours** ; passé ce
délai (ou s'il est perdu), le bouton « Générer un lien d'activation » sur la
fiche client (espace staff) permet d'en émettre un nouveau à tout moment.

Cette logique est isolée dans [`lib/invite.ts`](lib/invite.ts) (génération du
jeton, de l'URL et du QR code via le paquet `qrcode`) et
[`lib/actions/activate.ts`](lib/actions/activate.ts) (validation du jeton,
définition du mot de passe, connexion automatique).

> Les comptes du jeu de données de démonstration (`prisma/seed.ts`) gardent
> volontairement un mot de passe fixe et connu (voir tableau ci-dessus) pour
> pouvoir tester l'application immédiatement, sans passer par ce flux.

## Gestion des agences (`/admin/agencies`)

Réservé au rôle `SUPER_ADMIN` : les agents commerciaux ne peuvent pas créer
leur propre compte, seul le super-admin le fait, dans la limite du quota
qu'il a fixé pour chaque agence (le nombre d'abonnements vendus).

1. Créer une agence (nom + quota de comptes agents).
2. Depuis la fiche de l'agence, créer un compte agent en renseignant son
   email : comme pour un client, aucun mot de passe n'est généré en clair, un
   lien d'activation/QR code est proposé (même mécanisme que
   [l'activation du compte client](#activation-du-compte-client)). La
   création est refusée côté serveur si le quota de l'agence est déjà atteint.
3. Le quota est modifiable à tout moment depuis la fiche de l'agence ; les
   comptes agents peuvent y être supprimés ou leur lien d'activation régénéré
   (lien perdu ou expiré, valable 7 jours).

La fiche agence n'affiche que des compteurs agrégés (nombre de comptes
agents/quota, nombre de clients/véhicules) — jamais le détail des clients ou
véhicules d'une agence, pour préserver le cloisonnement des données entre
agences même vis-à-vis du super-admin.

## Profil agent (`/staff/profile`)

Chaque agent renseigne lui-même son numéro de téléphone depuis « Mon profil ».
Il est affiché à ses clients (carte « Votre commercial » sur leur tableau de
bord, avec lien `tel:` cliquable) pour qu'ils puissent le joindre directement.

## Notifications client

Lorsqu'un membre du personnel saisit un **nouveau** relevé hebdomadaire pour
un véhicule (`+ Saisir un relevé`), une notification in-app est créée pour le
client propriétaire. Elle apparaît sous forme de pastille sur la cloche 🔔 en
haut de son espace, avec le détail dans le menu déroulant ; elle est marquée
comme lue automatiquement à l'ouverture du menu. Modifier un relevé existant
ne génère pas de nouvelle notification (pour éviter le bruit lors de
corrections). Ce système fonctionne entièrement en base de données (modèle
`Notification`), sans service d'email à configurer.

## Avis Google (`/staff/reviews`)

Section staff pour solliciter des avis Google auprès des clients :

1. Renseigner une fois le lien d'avis Google de l'agence (récupéré depuis la
   fiche Google Business Profile : « Demander des avis » → copier le lien).
2. Pour chaque client, le bouton « Demander un avis » génère un lien copiable
   et un QR code pointant directement vers ce lien, à transmettre par SMS,
   email ou à faire scanner. La date de la dernière demande est conservée
   (`Client.reviewRequestedAt`) pour savoir qui a déjà été sollicité.

Comme pour l'activation de compte, aucun envoi d'email n'est automatisé : le
staff transmet le lien/QR par le moyen de son choix. Le client retrouve ce
lien à tout moment dans son espace, sous « Avis Google », et reçoit une
notification in-app à chaque demande.

## Propositions d'ajustement de prix

Sur la fiche de chaque véhicule, le client peut proposer un nouveau prix
(avec un message optionnel). Une seule proposition peut être en attente à la
fois par véhicule. Côté staff, la fiche véhicule affiche les propositions
reçues avec les boutons « Accepter » (met à jour le prix net vendeur du
véhicule) ou « Refuser ». Dans les deux cas, le client reçoit une
notification in-app avec la décision.

## Déploiement

L'application est prête à être déployée telle quelle sur un hébergeur offrant
un **disque persistant** (pour les photos uploadées dans `public/uploads/`) —
par exemple [Railway](https://railway.app) ou [Render](https://render.com).
Les deux fonctionnent de façon quasi identique :

1. Pousser le code sur un dépôt Git (GitHub/GitLab) et connecter ce dépôt
   depuis le tableau de bord Railway/Render.
2. Ajouter une base **PostgreSQL** (Railway : bouton « + New » → Database ;
   Render : « New » → PostgreSQL), ou réutiliser un projet Neon/Supabase
   existant.
3. Définir les variables d'environnement du service web :
   - `DATABASE_URL` — l'URL fournie par la base Postgres ci-dessus.
   - `AUTH_SECRET` — une valeur **différente** de celle utilisée en local
     (générée avec `openssl rand -base64 32`).
4. Monter un **volume persistant** sur le chemin `public/uploads` (sans quoi
   les photos disparaissent à chaque redéploiement).
5. Commande de build : `npm run build`. Avant celle-ci (ou dans un « release
   command » si la plateforme le propose), exécuter :
   ```bash
   npx prisma migrate deploy
   ```
   pour appliquer les migrations sur la base de production sans invite
   interactive.
6. Commande de démarrage : `npm run start`.

Les liens d'invitation client (`/activate/<token>`) et le middleware
d'authentification s'adaptent automatiquement au nom de domaine du
déploiement — aucune configuration d'URL supplémentaire n'est nécessaire.

> Alternative : Vercel offre la meilleure intégration Next.js mais son
> filesystem est éphémère (pas de disque persistant). Y déployer suppose de
> remplacer le stockage local des photos (`lib/storage.ts`) par un stockage
> objet (Vercel Blob, S3, Cloudinary...).

## Commandes utiles

```bash
npm run dev            # Serveur de développement
npm run build           # Build de production
npm run start           # Démarrer le build de production
npm run lint             # Linter
npx prisma studio        # Interface graphique pour explorer la base de données
npx prisma migrate dev   # Créer/appliquer une migration en développement
```

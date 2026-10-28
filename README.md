# CampusHub Africa 🌍🎓

> **« Connecter les étudiants, partager les opportunités, construire l’avenir de l’Afrique. »**

CampusHub Africa est un réseau social académique moderne, sécurisé et responsive dédié aux étudiants d'Afrique francophone (Sénégal, Côte d'Ivoire, Cameroun, Bénin, Mali, Burkina Faso, Togo, Gabon, Guinée, Congo, RDC, Madagascar, etc.).

La plateforme centralise les opportunités académiques et professionnelles, facilite les échanges entre étudiants, permet le partage de documents pédagogiques et favorise la mobilité académique.

---

## 🌟 Fonctionnalités Principales

1. **Page d'Accueil & Présentation Publique** : Slogan officiel, statistiques réelles de la plateforme, avantages pour les étudiants.
2. **Authentification & Gestion des Profils** : Inscription complète, hachage bcrypt, jetons JWT, profils étudiants avec établissement, filière, niveau, compétences et liens.
3. **Fil d'Actualité Académique** : Publications avec pièces jointes, catégories (cours, bourses, stages, logements, conseils), mentions J'aime anti-doublon, commentaires et réponses imbriquées, mise en favoris.
4. **Module des Bourses & Stages** : Offres de bourses internationales vérifiées (Eiffel, DAAD, bourses d'excellence), filtres par pays, catégorie et niveau, dates limites, liens officiels.
5. **Bibliothèque Pédagogique** : Téléchargement et partage de polycopiés de cours, fiches de TD, mémoires et annales d'examens avec corrigés.
6. **Annuaire des Étudiants** : Recherche et filtrage de camarades par université, filière et pays avec lancement de conversation en un clic.
7. **Messagerie Instantanée Temps Réel (Socket.io)** : Échanges de messages privés, indicateurs de saisie en direct, persistance intégrale en base de données PostgreSQL.
8. **Groupes & Communautés Universitaires** : Adhésion et création de communautés par filière et faculté.
9. **Système de Signalement & Modération** : Traitement des signalements pour faux frais, fausses bourses, spam et harcèlement.
10. **Tableau de Bord Administrateur** : Indicateurs en direct, gestion des statuts utilisateurs (suspension / réactivation), résolution des signalements et journaux d'audit.

---

## 🛠️ Stack Technologique

- **Frontend** : React 19 / TypeScript, Vite, Tailwind CSS 4, Lucide Icons
- **Backend** : Node.js, Express, Socket.io
- **Base de Données** : PostgreSQL (moteur PGlite embarqué en sandbox / serveur PostgreSQL 16 en production)
- **ORM & Schéma** : Prisma Schema (`prisma/schema.prisma`)
- **Sécurité** : Hachage bcrypt, JWT, validations strictes des entrées, contrôle des rôles (RBAC)

---

## 🚀 Démarrage Rapide

### 1. Installation des dépendances

```bash
npm install
```

### 2. Lancement en mode développement

```bash
npm run dev
```

L'application s'exécute sur `http://localhost:3000`.

### 3. Exécution des tests automatisés

```bash
npm test
```

---

## 👥 Comptes de Démonstration Préconfigurés

Des comptes pré-initialisés avec des profils riches sont disponibles directement sur l'écran de connexion :

| Rôle | Adresse E-mail | Mot de passe | Description |
|---|---|---|---|
| **Administrateur** | `admin@campushub.africa` | `Admin@CampusHub2026!` | Accès complet au tableau de bord et modération |
| **Modératrice** | `moderateur@campushub.africa` | `Etudiant@2026!` | Modération des contenus et signalements |
| **Étudiante (Dakar)** | `mariama.diallo@ucad.sn` | `Etudiant@2026!` | Master 1 Génie Logiciel, UCAD |
| **Étudiant (Abidjan)** | `kouame.jean@ufhb.edu.ci` | `Etudiant@2026!` | Licence 3 Sciences Éco, UFHB |
| **Étudiante (Bamako)** | `aminata.traore@usttb.ml` | `Etudiant@2026!` | Médecine 4ème année, USTTB |
| **Étudiant (Yaoundé)** | `boris.mballa@uy1.uninet.cm` | `Etudiant@2026!` | Master 2 Data Science, UY1 |

---

## 🐳 Déploiement avec Docker & PostgreSQL

Pour déployer l'application et une instance PostgreSQL 16 conteneurisée :

```bash
docker-compose up -d --build
```

---

## ☁️ Déploiement Continu & Mise à Jour Automatique sur Vercel

L'application est entièrement configurée pour une synchronisation et une mise à jour 100% automatique avec Vercel :

### 1. Synchronisation Git Automatique (CI/CD)
- Chaque commit poussé sur la branche `main` du dépôt GitHub **`askongarcesaire/campus-d-ployement`** déclenche immédiatement la compilation et le déploiement de production sur Vercel.
- Pour vérifier la connexion dans Vercel :
  1. Rendez-vous sur votre tableau de bord [Vercel](https://vercel.com).
  2. Ouvrez le projet CampusHub Africa > **Settings** > **Git**.
  3. Vérifiez que le dépôt `askongarcesaire/campus-d-ployement` est bien connecté avec la branche de production `main`.

### 2. Élimination du Cache Périmé (Zéro Stale Files)
- Le fichier `vercel.json` est configuré avec des règles de cache strictes :
  - `index.html` : `Cache-Control: public, max-age=0, must-revalidate` (les navigateurs récupèrent immédiatement le nouveau code).
  - `/version.json` : `no-store, no-cache, must-revalidate` (détection temps réel des nouvelles versions).
  - `/assets/*` : `public, max-age=31536000, immutable` (fichiers avec empreinte SHA pour des performances maximales).

### 3. Détection Client Temps Réel & Auto-Recharge
- L'application embarque le composant `AutoUpdateNotification` :
  - Il interroge `/version.json` en arrière-plan toutes les 60 secondes ainsi qu'à chaque reprise d'activité (changement d'onglet).
  - Dès qu'un nouveau build Vercel est déployé, l'application informe l'étudiant avec un toast fluide et propose d'actualiser instantanément sans perte de session.
  - En cas d'erreur de chargement de fragment Vite lors d'un déploiement en direct, l'application recharge automatiquement la page en toute transparence.

---

## 📜 Schéma de Base de Données

Le schéma relationnel PostgreSQL complet est disponible dans `prisma/schema.prisma` et dans `server/db.ts` avec les entités :
- `users` : Comptes et authentification
- `student_profiles` : Profils académiques
- `posts`, `post_likes`, `post_comments`, `saved_posts` : Réseau social
- `opportunities`, `opportunity_favorites` : Bourses et stages
- `resources` : Bibliothèque de cours et annales
- `groups`, `group_memberships` : Communautés
- `conversations`, `conversation_participants`, `messages` : Messagerie temps réel
- `notifications` : Alertes et notifications
- `reports`, `audit_logs` : Modération et gouvernance


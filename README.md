# 🏦 BNA Bank – PFE Dashboard

Application web complète développée dans le cadre du **Projet de Fin d'Études (PFE)** pour la **Banque Nationale Agricole (BNA)**.
Elle offre une plateforme centralisée pour la **visualisation Power BI**, la **gestion des utilisateurs** et un **chatbot IA** capable d'interroger le Data Warehouse de la banque en langage naturel.

---

## 📋 Sommaire

1. [Description générale](#-description-générale)
2. [Objectif du projet](#-objectif-du-projet)
3. [Architecture](#-architecture)
4. [Rôle de chaque dossier](#-rôle-de-chaque-dossier)
5. [Technologies utilisées](#-technologies-utilisées)
6. [Installation](#-installation)
7. [Variables d'environnement](#-variables-denvironnement)
8. [Lancer le projet](#-lancer-le-projet)
9. [Workflow des données](#-workflow-des-données)
10. [API REST](#-api-rest)
11. [Guide d'utilisation](#-guide-dutilisation)

---

## 🧭 Description générale

Le projet est une **application Web fullstack** composée de :

- un **frontend React** (Single Page App) pour l'interface utilisateur ;
- un **backend Node.js / Express** qui expose une API REST ;
- deux **bases SQL Server** :
  - `BNA` — utilisateurs, authentification ;
  - `DW_BNA_Placements` — Data Warehouse interrogé par le chatbot IA.

L'utilisateur se connecte avec son email + mot de passe (stocké sous forme de hash bcrypt) et reçoit un **JWT** qui autorise ses appels API.

---

## 🎯 Objectif du projet

- **Centraliser** les tableaux de bord Power BI dans une interface unique.
- **Sécuriser** l'accès via authentification + rôles (Admin / Agence / Direction régionale / Direction centrale).
- **Permettre** une consultation du Data Warehouse en langage naturel grâce à un **chatbot IA** (Groq + SQL).
- **Prévoir** les montants via un module ML (SARIMA, Random Forest, XGBoost) sur données mensuelles DW — **RMSE** (classement) + **SMAPE** (affichage).

---

## 🏗️ Architecture

```
mon-dashboard/
├── backend/          ← API REST (Node.js + Express)
│   ├── config/       ← Configuration (DB pools, env)
│   ├── controllers/  ← Logique des routes (auth, users)
│   ├── middleware/   ← Auth JWT + rôles
│   ├── routes/       ← Définition des endpoints
│   ├── scripts/      ← Scripts utilitaires (seed)
│   ├── database/     ← SQL d'initialisation
│   ├── server.js     ← Point d'entrée Express
│   └── .env          ← Variables d'environnement
│
├── frontend/         ← Application React (CRA)
│   ├── public/       ← Statiques (favicon, logo, index.html)
│   └── src/
│       ├── components/← Composants UI réutilisables
│       ├── pages/     ← Pages = composants de plus haut niveau
│       ├── routes/    ← Définition des routes React Router
│       ├── hooks/     ← Hooks React (useAuth, useNotificationSummary)
│       ├── context/   ← React Contexts (ChatbotContext)
│       ├── services/  ← Clients REST (authService, userService, chatbotService)
│       ├── styles/    ← Thème + CSS global
│       ├── utils/     ← Helpers (format, …)
│       ├── App.js     ← Coquille (Provider + Routes)
│       └── index.js   ← Bootstrap React
│
├── ml-forecast/      ← Pipeline Python (prévision)
├── docs/             ← Documentation (FORECASTING.md)
├── README.md         ← Ce fichier
└── .gitignore
```

### Schéma d'interaction

```
┌────────────────┐        HTTPS/JSON          ┌────────────────┐
│  React (SPA)   │ ─────────────────────────► │  Express API   │
│  frontend/     │ ◄───────── JWT ─────────── │  backend/      │
└────────────────┘                            └───────┬────────┘
                                                      │
                                          ┌───────────┴───────────┐
                                          ▼                       ▼
                                  ┌───────────────┐       ┌────────────────┐
                                  │   BNA (SQL)   │       │ DW_BNA_…  (SQL)│
                                  │  Utilisateurs │       │  Data Warehouse│
                                  └───────────────┘       └────────────────┘
                                                                  ▲
                                                                  │ SQL générée
                                                          ┌───────┴────────┐
                                                          │   Groq (LLM)   │
                                                          └────────────────┘
```

---

## 📁 Rôle de chaque dossier

### Backend

| Dossier        | Rôle                                                                 |
|----------------|----------------------------------------------------------------------|
| `config/`      | Connexions SQL Server (deux pools : `auth` et `dw`).                 |
| `controllers/` | Logique métier des routes (auth, users).                             |
| `middleware/`  | Vérification du JWT (`authMiddleware`) et des rôles (`roleMiddleware`). |
| `routes/`      | Déclaration des endpoints HTTP (auth, users, chat).                  |
| `scripts/`     | Scripts CLI (ex. `seedUsers.js` pour insérer les comptes initiaux).  |
| `database/`    | Scripts SQL (création de la base `BNA` + table `Users`).             |

### Frontend

| Dossier       | Rôle                                                                 |
|---------------|----------------------------------------------------------------------|
| `assets/`     | Images importées dans le code JS (logos, illustrations).             |
| `components/` | Composants UI réutilisables (`Login`, `Sidebar`, `Dashboard`, …).    |
| `pages/`      | Composants de plus haut niveau associés à une route.                 |
| `routes/`     | Arbre des routes React Router (`AppRoutes`).                         |
| `hooks/`      | Hooks personnalisés (`useAuth`, `useChatbot`).                       |
| `context/`    | Contextes React globaux (`ChatbotContext`).                          |
| `services/`   | Couches d'accès à l'API REST (un fichier par domaine).               |
| `styles/`     | `theme.js` (couleurs / gradients BNA) et `index.css` (reset global). |
| `utils/`      | Fonctions utilitaires pures (`formatDate`, etc.).                    |

---

## 🛠️ Technologies utilisées

### Frontend
- **React 19** + Create React App
- **React Router 7** (routing SPA)
- **Power BI Embedded** (via iframe)
- CSS-in-JS (`styles/theme.js`) + animations CSS globales

### Backend
- **Node.js** + **Express 5**
- **mssql** (driver SQL Server officiel)
- **bcryptjs** (hash des mots de passe)
- **jsonwebtoken** (JWT)
- **dotenv** + **cors**
- **groq-sdk** (chatbot IA — Llama 3.3 70B chez Groq, 100 % gratuit)

### Base de données
- **Microsoft SQL Server** (deux bases : `BNA` et `DW_BNA_Placements`)

---

## 💾 Installation

### Prérequis
- [Node.js ≥ 18](https://nodejs.org/)
- [SQL Server](https://www.microsoft.com/sql-server/) (Developer/Express OK)
- [SSMS](https://learn.microsoft.com/sql/ssms/) ou Azure Data Studio (optionnel)
- Une clé API **Groq** gratuite : <https://console.groq.com/>

### 1. Cloner le dépôt

```bash
git clone <repo-url> mon-dashboard
cd mon-dashboard
```

### 2. Installer les dépendances

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 3. Configurer la base de données

Ouvrez SSMS et exécutez le script :

```
backend/database/init_users.sql
```

Il crée la base `BNA`, la table `dbo.Users` et les contraintes associées.

### 4. Renseigner les variables d'environnement

Créez `backend/.env` à partir du modèle ci-dessous, puis insérez les comptes initiaux :

```bash
cd backend
npm run seed
```

Cela crée par défaut un compte **Admin** :

| Email           | Mot de passe |
|-----------------|--------------|
| `admin@bna.tn`  | `Admin@123`  |

> ⚠️ Changez ce mot de passe en production.

---

## 🔐 Variables d'environnement

Fichier `backend/.env` :

```ini
# Chatbot IA (Groq)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# SQL Server (commun aux deux bases)
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=BNA2025!

# Base utilisateurs / authentification
DB_NAME_AUTH=BNA

# Base Data Warehouse (chatbot)
DB_NAME_DW=DW_BNA_Placements

# Serveur
PORT=5000

# JWT
JWT_SECRET=bna-pfe-super-secret-change-me-in-production
JWT_EXPIRES_IN=8h
```

Côté **frontend**, l'URL de l'API et le lien Power BI sont configurés dans
`frontend/src/styles/theme.js` (exports `API_BASE` et `POWERBI_EMBED_URL`).

---

## 🚀 Lancer le projet

Ouvrir **deux terminaux** :

```bash
# Terminal 1 — backend
cd backend
npm run dev        # → http://localhost:5000

# Terminal 2 — frontend
cd frontend
npm start          # → http://localhost:3000
```

Healthcheck rapide :
```bash
curl http://localhost:5000/api/health
# → {"ok":true,"service":"BNA API"}
```

### Production

```bash
cd frontend
npm run build      # génère frontend/build/
```

Le dossier `build/` peut être servi par n'importe quel serveur statique (Nginx, IIS, `serve`, etc.).

---

## 🔄 Workflow des données

### 1. Authentification
```
User → POST /api/auth/login (email, password)
                ↓
        Express ─► SQL Server (BNA.Users)
                ↓
        bcrypt.compare(password, hash)
                ↓
        Génère un JWT (8 h)
                ↓
User reçoit { token, user }   → token stocké dans localStorage
```

### 2. Requête authentifiée
```
User clique sur "Utilisateurs"
        ↓
GET /api/users   (Authorization: Bearer <jwt>)
        ↓
verifyToken (middleware)    → vérifie la signature + l'expiration
        ↓
requireRole("Admin")        → vérifie le rôle
        ↓
userController.list         → SELECT paginé sur BNA.Users
        ↓
JSON renvoyé au front
```

### 3. Chatbot IA
```
User : "Quel est le total des dépôts en 2024 ?"
        ↓
POST /api/chat (question, user)
        ↓
Groq (Llama 3.3 70B) ─► génère une requête SQL
        ↓
Validation SQL (SELECT only)
        ↓
Exécution sur DW_BNA_Placements
        ↓
Groq ─► reformule le résultat en langage naturel
        ↓
JSON { response, debug_sql } renvoyé au front
```

---

## 📡 API REST

Base URL : `http://localhost:5000/api`

### Auth

| Méthode | Endpoint        | Auth     | Description                                |
|---------|-----------------|----------|--------------------------------------------|
| POST    | `/auth/login`   | —        | Connexion. Body : `{ email, password }`    |
| GET     | `/auth/me`      | JWT      | Profil de l'utilisateur connecté           |

### Users (Admin only)

| Méthode | Endpoint                  | Description                              |
|---------|---------------------------|------------------------------------------|
| GET     | `/users`                  | Liste paginée + filtres                  |
| GET     | `/users/:id`              | Détail d'un utilisateur                  |
| POST    | `/users`                  | Crée un utilisateur                      |
| PUT     | `/users/:id`              | Met à jour un utilisateur                |
| DELETE  | `/users/:id`              | Supprime un utilisateur (sauf Admin)     |
| GET     | `/users/_meta/options`    | Listes des rôles + statuts autorisés     |

### Chat

| Méthode | Endpoint   | Auth | Description                                  |
|---------|------------|------|----------------------------------------------|
| POST    | `/chat`    | JWT  | `{ question, user }` → réponse en langage nat. |

### Health

| Méthode | Endpoint    | Description           |
|---------|-------------|-----------------------|
| GET     | `/health`   | Healthcheck JSON      |

---

## 🧑‍💻 Guide d'utilisation

1. Démarrer le backend et le frontend (voir [Lancer le projet](#-lancer-le-projet)).
2. Aller sur <http://localhost:3000>.
3. Se connecter avec `admin@bna.tn` / `Admin@123`.
4. La **page d'accueil** présente l'utilisateur et les raccourcis vers les modules.
5. Les pages disponibles (selon le rôle) :
   - **Dashboard** — tableau de bord Power BI intégré.
   - **Prévision** — entraînement ML, comparaison de modèles et graphiques intégrés.
   - **Utilisateurs** — CRUD utilisateurs *(Admin uniquement)*.
6. Cliquer sur l'icône **AI Assistant** (sidebar ou bouton flottant) pour interroger le Data Warehouse en langage naturel.
7. Cliquer sur **Déconnexion** pour vider la session.

### Bonnes pratiques

- Le compte `admin@bna.tn` ne peut **ni être supprimé ni être désactivé** — c'est une garantie matérielle dans le backend.
- Aucun mot de passe n'est jamais stocké en clair (bcrypt, 10 salt rounds).
- Le JWT expire automatiquement après 8 h (`JWT_EXPIRES_IN`), à ajuster pour la production.

---

## 📝 Licence

Projet académique — Université / BNA. Tous droits réservés.

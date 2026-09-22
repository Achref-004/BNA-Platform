# BNA Platform

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL%20Server-Microsoft%20SQL-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Power BI](https://img.shields.io/badge/Power%20BI-Embedded-F2C811?style=for-the-badge&logo=powerbi&logoColor=black)

Plateforme interne de gestion, reporting et aide à la décision pour la Banque Nationale Agricole (BNA), conçue pour centraliser les accès utilisateurs, sécuriser les sessions, faciliter la messagerie interne, exploiter un entrepôt de données et permettre des requêtes analytiques via un assistant IA sur les données de placements.

---

## 📌 Description

Le projet regroupe plusieurs briques fonctionnelles autour d’une architecture web moderne :

- un portail web côté frontend ;
- une API backend sécurisée ;
- une base d’authentification pour les comptes utilisateurs ;
- un Data Warehouse dédié aux données de placements BNA ;
- un chatbot IA qui interprète des questions métier et génère des requêtes SQL sécurisées ;
- un module de forecasting/ML pour la prévision des performances ;
- un espace de messagerie interne entre collaborateurs et administration ;
- un dashboard Power BI intégré pour le reporting.

Le système est pensé pour un usage interne BNA avec différents profils métiers :
- `Admin`
- `Agence`
- `Direction regional`
- `Direction central`

L’objectif principal est de fournir un accès métier sécurisé aux données et aux indicateurs, tout en réduisant la friction liée à l’interrogation manuelle d’un entrepôt de données. L’application permet également à l’administration de gérer les comptes utilisateurs, d’assister les équipes dans la communication interne et d’exploiter des prévisions basées sur les données historiques.

---

## ✨ Fonctionnalités

- Authentification avec JWT et contrôle des accès par rôle
- Blocage du premier accès via la politique de mot de passe à changer (`must_change_password`)
- Gestion des utilisateurs par l’administrateur principal
- Création de comptes avec mot de passe temporaire et envoi d’email
- Messagerie interne entre utilisateurs et administration
- Suivi des threads de discussion avec états (`envoye`, `lu`, `repondu`)
- Tableau de bord Power BI intégré dans l’application
- Chatbot IA capable de répondre à des questions sur les données BNA
- Contrôle strict du SQL généré par le modèle IA
- Périmètre territorial appliqué selon le rôle utilisateur
- Upload de fichiers CSV/Excel pour l’entraînement de modèles ML
- Comparaison de modèles de prévision (SARIMA, Random Forest, XGBoost)
- Export/consultation des résultats de prévision et aperçu des prévisions
- Gestion des notifications de messagerie avec compteurs légers

---

## 🏗️ Architecture

Le projet suit une architecture 3 couches typique :

```text
Utilisateur
     │
     ▼
Frontend React
     │
     ▼
Backend Express API
     │
     ├── Authentification / JWT
     ├── Gestion utilisateurs
     ├── Messagerie
     ├── Chatbot IA
     ├── Forecasting
     └── Contrôle d’accès
     │
     ▼
Bases SQL Server
     ├── Base d’authentification BNA
     └── Data Warehouse DW_BNA_Placements

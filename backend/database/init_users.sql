-- ============================================================
-- init_users.sql — Crée la base d'authentification BNA
-- ainsi que la table dbo.Users (SQL Server).
--
-- À lancer avec SSMS ou :
--   sqlcmd -S localhost -U sa -P "BNA2025!" -i backend\database\init_users.sql
-- ============================================================

-- ── 1) Créer la base BNA si elle n'existe pas ─────────────
IF DB_ID('BNA') IS NULL
BEGIN
    CREATE DATABASE BNA;
    PRINT '✅ Base de données BNA créée.';
END
ELSE
BEGIN
    PRINT 'ℹ️  Base de données BNA déjà existante.';
END
GO

USE BNA;
GO

-- ── 2) Drop mes tables dépendantes puis Users (ordre FK) ─
IF OBJECT_ID('dbo.MessagePosts', 'U') IS NOT NULL
    DROP TABLE dbo.MessagePosts;
IF OBJECT_ID('dbo.MessageThreads', 'U') IS NOT NULL
    DROP TABLE dbo.MessageThreads;
IF OBJECT_ID('dbo.AdminMessages', 'U') IS NOT NULL
    DROP TABLE dbo.AdminMessages;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
    DROP TABLE dbo.Users;
GO

-- ── 3) Création de la table dbo.Users ─────────────────────
CREATE TABLE dbo.Users
(
    id              INT             IDENTITY(1,1) NOT NULL,
    nom             VARCHAR(100)    NOT NULL,
    prenom          VARCHAR(100)    NOT NULL,
    email           VARCHAR(150)    NOT NULL,
    mot_de_passe    VARCHAR(255)    NOT NULL,   -- hash bcrypt (~60 car.)
    code_structure  VARCHAR(50)     NULL,
    role            VARCHAR(50)     NOT NULL,
    statut               VARCHAR(20)     NOT NULL CONSTRAINT DF_Users_Statut       DEFAULT 'Actif',
    date_creation        DATETIME        NOT NULL CONSTRAINT DF_Users_DateCreation DEFAULT GETDATE(),
    must_change_password BIT             NOT NULL CONSTRAINT DF_Users_MCP DEFAULT 0,

    CONSTRAINT PK_Users        PRIMARY KEY CLUSTERED (id),
    CONSTRAINT UQ_Users_Email  UNIQUE (email),
    CONSTRAINT CK_Users_Role   CHECK (role   IN ('Admin','Agence','Direction regional','Direction central')),
    CONSTRAINT CK_Users_Statut CHECK (statut IN ('Actif','Inactif'))
);
GO

-- ── 4) Index secondaires ──────────────────────────────────
CREATE INDEX IX_Users_Role   ON dbo.Users(role);
CREATE INDEX IX_Users_Statut ON dbo.Users(statut);
GO

PRINT '✅ Table BNA.dbo.Users créée.';
GO

-- ============================================================
-- NB : Les utilisateurs initiaux sont insérés par le script
-- Node.js :    backend/scripts/seedUsers.js
-- (les mots de passe sont chiffrés avec bcrypt côté Node).
-- ============================================================

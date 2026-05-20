-- ============================================================
-- migrations/001_users_and_messaging_upgrade.sql
-- ------------------------------------------------------------
-- À exécuter sur une base BNA déjà créée qui contient dbo.Users.
--   sqlcmd ... -d BNA -i backend\database\migrations\001_users_and_messaging_upgrade.sql
--
-- Effectue :
--   1. Ajoute dbo.Users.must_change_password (nouveaux utilisateurs forcés MCP=1 depuis l’app)
--   2. Remplace dbo.AdminMessages (ancien schéma) par :
--          MessageThreads + MessagePosts (conversation + historique réponses admin)
--
-- IMPORTANT : cet script SUPPRIME l’ancienne table AdminMessages !
-- ============================================================

USE BNA;
GO

-- ── 1) colonne MCP sur Users ───────────────────────────────
IF COL_LENGTH('dbo.Users', 'must_change_password') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD must_change_password BIT NOT NULL
        CONSTRAINT DF_Users_must_change_pw DEFAULT (0);
    PRINT '✅ Colonne Users.must_change_password ajoutée.';
END

-- Compte principal : doit toujours rester MCP=0
UPDATE dbo.Users SET must_change_password = 0 WHERE LOWER(email) = N'admin@bna.tn';
GO

-- ── 2) Ancienne table messagerie (si existe) ────────────────
IF OBJECT_ID('dbo.AdminMessages', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.AdminMessages;
    PRINT '⚠ Ancienne dbo.AdminMessages supprimée.';
END
GO

-- ── 3) Nouvelles tables threads / posts ───────────────────
IF OBJECT_ID('dbo.MessagePosts', 'U') IS NOT NULL DROP TABLE dbo.MessagePosts;
IF OBJECT_ID('dbo.MessageThreads', 'U') IS NOT NULL DROP TABLE dbo.MessageThreads;
GO

CREATE TABLE dbo.MessageThreads
(
    id            INT IDENTITY(1,1) NOT NULL,
    user_id       INT NOT NULL,
    subject       NVARCHAR(200) NOT NULL,
    created_at    DATETIME NOT NULL CONSTRAINT DF_MsgThreads_created DEFAULT GETDATE(),
    updated_at    DATETIME NOT NULL CONSTRAINT DF_MsgThreads_updated DEFAULT GETDATE(),

    CONSTRAINT PK_MessageThreads PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_MessageThreads_User FOREIGN KEY (user_id)
        REFERENCES dbo.Users (id) ON DELETE CASCADE
);

CREATE INDEX IX_MessageThreads_user_updated ON dbo.MessageThreads(user_id, updated_at DESC);

CREATE TABLE dbo.MessagePosts
(
    id                INT IDENTITY(1,1) NOT NULL,
    thread_id         INT NOT NULL,
    sender_role       VARCHAR(16) NOT NULL,
    body              NVARCHAR(MAX) NOT NULL,
    created_at        DATETIME NOT NULL CONSTRAINT DF_MsgPosts_created DEFAULT GETDATE(),
    -- Quand un message « utilisateur » a été vu par l’admin (liste détail ou lecture)
    read_by_admin_at  DATETIME NULL,
    -- Quand un message « admin » a été vu par le collaborateur dans son espace
    read_by_user_at   DATETIME NULL,

    CONSTRAINT PK_MessagePosts PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_MessagePosts_Thread FOREIGN KEY (thread_id)
        REFERENCES dbo.MessageThreads (id) ON DELETE CASCADE,
    CONSTRAINT CK_MessagePosts_sender CHECK (sender_role IN (N'user', N'admin')),
);

CREATE INDEX IX_MessagePosts_thread_created ON dbo.MessagePosts(thread_id, created_at DESC, id DESC);
CREATE INDEX IX_MessagePosts_sender_reads    ON dbo.MessagePosts(thread_id, sender_role)
    INCLUDE (read_by_admin_at, read_by_user_at);
GO

PRINT '✅ Schéma MessageThreads + MessagePosts créé.';
GO

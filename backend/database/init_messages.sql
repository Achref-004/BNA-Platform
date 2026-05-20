-- ============================================================
-- init_messages.sql — Messagerie (threads / posts)
-- À lancer après init_users.sql + seed utilisateurs OU sur base existante
-- équivalent migration 001_users_and_messaging_upgrade.sql
-- ------------------------------------------------------------
USE BNA;
GO

IF OBJECT_ID('dbo.MessagePosts', 'U') IS NOT NULL DROP TABLE dbo.MessagePosts;
IF OBJECT_ID('dbo.MessageThreads', 'U') IS NOT NULL DROP TABLE dbo.MessageThreads;
IF OBJECT_ID('dbo.AdminMessages', 'U') IS NOT NULL DROP TABLE dbo.AdminMessages;
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
GO

CREATE TABLE dbo.MessagePosts
(
    id                INT IDENTITY(1,1) NOT NULL,
    thread_id         INT NOT NULL,
    sender_role       VARCHAR(16) NOT NULL,
    body              NVARCHAR(MAX) NOT NULL,
    created_at        DATETIME NOT NULL CONSTRAINT DF_MsgPosts_created DEFAULT GETDATE(),
    read_by_admin_at  DATETIME NULL,
    read_by_user_at   DATETIME NULL,
    CONSTRAINT PK_MessagePosts PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_MessagePosts_Thread FOREIGN KEY (thread_id)
        REFERENCES dbo.MessageThreads (id) ON DELETE CASCADE,
    CONSTRAINT CK_MessagePosts_sender CHECK (sender_role IN (N'user', N'admin')),
);
CREATE INDEX IX_MessagePosts_thread_created ON dbo.MessagePosts(thread_id, created_at DESC, id DESC);
GO

PRINT N'✅ Tables MessageThreads + MessagePosts créées.';
GO

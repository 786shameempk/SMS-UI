BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    ALTER TABLE [OnlineExams] ADD [AutoSubmitAfterIncidents] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    ALTER TABLE [OnlineExams] ADD [EvidenceRetentionDays] int NOT NULL DEFAULT 90;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    ALTER TABLE [OnlineExams] ADD [Proctoring] nvarchar(10) NOT NULL DEFAULT N'Off';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    ALTER TABLE [OnlineExams] ADD [ProctoringWarningThreshold] int NOT NULL DEFAULT 3;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    ALTER TABLE [OnlineExams] ADD [QuestionsPerAttempt] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    ALTER TABLE [OnlineExams] ADD [RequireFullscreen] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    ALTER TABLE [OnlineExams] ADD [SnapshotIntervalSeconds] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    CREATE TABLE [ProctoringConsents] (
        [Id] uniqueidentifier NOT NULL,
        [ExamId] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [NoticeVersion] nvarchar(20) NOT NULL,
        [Mode] nvarchar(10) NOT NULL,
        [GivenAt] datetime2 NOT NULL,
        [CameraAvailable] bit NOT NULL,
        [FullscreenAvailable] bit NOT NULL,
        [Browser] nvarchar(200) NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_ProctoringConsents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    CREATE TABLE [ProctoringEvents] (
        [Id] uniqueidentifier NOT NULL,
        [ExamId] uniqueidentifier NOT NULL,
        [AttemptId] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [ClientSequence] int NOT NULL,
        [Type] nvarchar(30) NOT NULL,
        [Severity] nvarchar(10) NOT NULL,
        [OccurredAt] datetime2 NOT NULL,
        [ReceivedAt] datetime2 NOT NULL,
        [Detail] nvarchar(300) NULL,
        [EvidenceKey] nvarchar(400) NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_ProctoringEvents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    CREATE TABLE [ProctoringReviews] (
        [Id] uniqueidentifier NOT NULL,
        [ExamId] uniqueidentifier NOT NULL,
        [AttemptId] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [IncidentCount] int NOT NULL,
        [WarningCount] int NOT NULL,
        [LastSeenAt] datetime2 NULL,
        [LastIncidentAt] datetime2 NULL,
        [AutoSubmitted] bit NOT NULL,
        [Outcome] nvarchar(20) NOT NULL,
        [ReviewNote] nvarchar(1000) NULL,
        [ReviewedByName] nvarchar(200) NULL,
        [ReviewedAt] datetime2 NULL,
        [AppealStatus] nvarchar(20) NOT NULL,
        [AppealText] nvarchar(2000) NULL,
        [AppealedAt] datetime2 NULL,
        [AppealDecisionNote] nvarchar(1000) NULL,
        [AppealDecidedByName] nvarchar(200) NULL,
        [AppealDecidedAt] datetime2 NULL,
        [RowVersion] rowversion NOT NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_ProctoringReviews] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProctoringConsents_ExamId_StudentId] ON [ProctoringConsents] ([ExamId], [StudentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProctoringEvents_AttemptId_ClientSequence] ON [ProctoringEvents] ([AttemptId], [ClientSequence]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    CREATE INDEX [IX_ProctoringEvents_ExamId_ReceivedAt] ON [ProctoringEvents] ([ExamId], [ReceivedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProctoringReviews_AttemptId] ON [ProctoringReviews] ([AttemptId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    CREATE INDEX [IX_ProctoringReviews_ExamId_Outcome] ON [ProctoringReviews] ([ExamId], [Outcome]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022192044_OnlineExamProctoringAndPools'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261022192044_OnlineExamProctoringAndPools', N'10.0.10');
END;

COMMIT;
GO


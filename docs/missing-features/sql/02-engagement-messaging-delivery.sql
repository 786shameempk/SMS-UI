BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [MessageTemplates] ADD [Language] nvarchar(10) NOT NULL DEFAULT N'en';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [MessageTemplates] ADD [SmsTemplateId] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [MessageTemplates] ADD [WhatsAppTemplateLanguage] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [MessageTemplates] ADD [WhatsAppTemplateName] nvarchar(200) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [Address] nvarchar(320) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [AttemptCount] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [Cost] decimal(10,4) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [DeliveredAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [FailedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [IdempotencyKey] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [LastError] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [LockedUntil] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [NextAttemptAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [Provider] nvarchar(30) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [ProviderMessageId] nvarchar(200) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [QueuedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [RecipientName] nvarchar(200) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [RowVersion] rowversion NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [DeliveryLogEntries] ADD [SentAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [BroadcastMessages] ADD [DispatchLockedUntil] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [BroadcastMessages] ADD [IdempotencyKey] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    ALTER TABLE [BroadcastMessages] ADD [TemplateId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    CREATE TABLE [MessagingOptIns] (
        [Id] uniqueidentifier NOT NULL,
        [Channel] nvarchar(20) NOT NULL,
        [Address] nvarchar(320) NOT NULL,
        [OptedIn] bit NOT NULL,
        [Source] nvarchar(100) NOT NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_MessagingOptIns] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    CREATE TABLE [MessagingProviderConfigs] (
        [Id] uniqueidentifier NOT NULL,
        [Channel] nvarchar(20) NOT NULL,
        [Provider] nvarchar(30) NOT NULL,
        [Enabled] bit NOT NULL,
        [Settings] nvarchar(max) NOT NULL,
        [ProtectedSecrets] nvarchar(max) NULL,
        [WebhookToken] nvarchar(64) NOT NULL,
        [PerMinuteLimit] int NOT NULL,
        [DailyLimit] int NOT NULL,
        [CostPerMessage] decimal(10,4) NULL,
        [OptInCollectedAtAdmission] bit NOT NULL,
        [LastTestAt] datetime2 NULL,
        [LastTestSucceeded] bit NULL,
        [LastTestMessage] nvarchar(500) NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_MessagingProviderConfigs] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    CREATE TABLE [MessagingSuppressions] (
        [Id] uniqueidentifier NOT NULL,
        [Channel] nvarchar(20) NOT NULL,
        [Address] nvarchar(320) NOT NULL,
        [Reason] nvarchar(20) NOT NULL,
        [Source] nvarchar(50) NULL,
        [Detail] nvarchar(500) NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_MessagingSuppressions] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_DeliveryLogEntries_IdempotencyKey] ON [DeliveryLogEntries] ([IdempotencyKey]) WHERE [IdempotencyKey] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    CREATE INDEX [IX_DeliveryLogEntries_Provider_ProviderMessageId] ON [DeliveryLogEntries] ([Provider], [ProviderMessageId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    CREATE INDEX [IX_DeliveryLogEntries_Status_NextAttemptAt] ON [DeliveryLogEntries] ([Status], [NextAttemptAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    CREATE INDEX [IX_BroadcastMessages_Status_ScheduledAt] ON [BroadcastMessages] ([Status], [ScheduledAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_BroadcastMessages_TenantId_IdempotencyKey] ON [BroadcastMessages] ([TenantId], [IdempotencyKey]) WHERE [IdempotencyKey] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    CREATE UNIQUE INDEX [IX_MessagingOptIns_TenantId_Channel_Address] ON [MessagingOptIns] ([TenantId], [Channel], [Address]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    CREATE UNIQUE INDEX [IX_MessagingProviderConfigs_TenantId_Channel] ON [MessagingProviderConfigs] ([TenantId], [Channel]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    CREATE UNIQUE INDEX [IX_MessagingSuppressions_TenantId_Channel_Address] ON [MessagingSuppressions] ([TenantId], [Channel], [Address]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022190039_RealMessagingDelivery'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261022190039_RealMessagingDelivery', N'10.0.10');
END;

COMMIT;
GO


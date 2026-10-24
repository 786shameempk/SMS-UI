BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022223416_AttendanceOfflineSync'
)
BEGIN
    CREATE TABLE [AttendanceSyncOperations] (
        [Id] uniqueidentifier NOT NULL,
        [OperationId] uniqueidentifier NOT NULL,
        [SectionId] uniqueidentifier NOT NULL,
        [Date] date NOT NULL,
        [ProcessedAt] datetime2 NOT NULL,
        [UserId] uniqueidentifier NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_AttendanceSyncOperations] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022223416_AttendanceOfflineSync'
)
BEGIN
    CREATE INDEX [IX_AttendanceSyncOperations_ProcessedAt] ON [AttendanceSyncOperations] ([ProcessedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022223416_AttendanceOfflineSync'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AttendanceSyncOperations_TenantId_OperationId] ON [AttendanceSyncOperations] ([TenantId], [OperationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022223416_AttendanceOfflineSync'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261022223416_AttendanceOfflineSync', N'10.0.10');
END;

COMMIT;
GO


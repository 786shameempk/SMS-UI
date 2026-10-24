BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    ALTER TABLE [StaffAttendanceRecords] ADD [CaptureMode] nvarchar(20) NOT NULL DEFAULT N'Manual';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    ALTER TABLE [StaffAttendanceRecords] ADD [CheckInAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    ALTER TABLE [StaffAttendanceRecords] ADD [CheckOutAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    ALTER TABLE [StaffAttendanceRecords] ADD [Remarks] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    ALTER TABLE [StaffAttendanceRecords] ADD [ScanEventId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    ALTER TABLE [AttendanceRecords] ADD [CheckInAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    ALTER TABLE [AttendanceRecords] ADD [ScanEventId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE TABLE [AttendanceAuditEntries] (
        [Id] uniqueidentifier NOT NULL,
        [PersonType] nvarchar(10) NOT NULL,
        [PersonId] uniqueidentifier NOT NULL,
        [Date] date NOT NULL,
        [Action] nvarchar(40) NOT NULL,
        [OldStatus] nvarchar(20) NULL,
        [NewStatus] nvarchar(20) NULL,
        [Source] nvarchar(20) NOT NULL,
        [ActorUserId] uniqueidentifier NULL,
        [ActorName] nvarchar(200) NULL,
        [Details] nvarchar(500) NULL,
        [At] datetime2 NOT NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_AttendanceAuditEntries] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE TABLE [AttendanceCorrectionRequests] (
        [Id] uniqueidentifier NOT NULL,
        [PersonType] nvarchar(10) NOT NULL,
        [PersonId] uniqueidentifier NOT NULL,
        [SectionId] uniqueidentifier NULL,
        [Date] date NOT NULL,
        [CurrentStatus] nvarchar(20) NULL,
        [RequestedStatus] nvarchar(20) NOT NULL,
        [Reason] nvarchar(500) NOT NULL,
        [RequestedByUserId] uniqueidentifier NULL,
        [RequestedByName] nvarchar(200) NULL,
        [Status] nvarchar(20) NOT NULL,
        [DecidedByUserId] uniqueidentifier NULL,
        [DecidedByName] nvarchar(200) NULL,
        [DecidedAt] datetime2 NULL,
        [DecisionNote] nvarchar(500) NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_AttendanceCorrectionRequests] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE TABLE [AttendanceCredentials] (
        [Id] uniqueidentifier NOT NULL,
        [PersonType] nvarchar(10) NOT NULL,
        [PersonId] uniqueidentifier NOT NULL,
        [Kind] nvarchar(20) NOT NULL,
        [IdentifierHash] nvarchar(64) NOT NULL,
        [Label] nvarchar(32) NOT NULL,
        [Active] bit NOT NULL,
        [RevokedAt] datetime2 NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_AttendanceCredentials] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE TABLE [AttendanceDevices] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(120) NOT NULL,
        [Kind] nvarchar(20) NOT NULL,
        [Location] nvarchar(120) NULL,
        [SerialNumber] nvarchar(64) NULL,
        [Vendor] nvarchar(64) NULL,
        [DefaultDirection] nvarchar(10) NOT NULL,
        [KeyPrefix] nvarchar(16) NOT NULL,
        [KeyHash] nvarchar(64) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [LastSeenAt] datetime2 NULL,
        [LastSeenIp] nvarchar(64) NULL,
        [FirmwareVersion] nvarchar(64) NULL,
        [LastEventAt] datetime2 NULL,
        [LastError] nvarchar(500) NULL,
        [LastErrorAt] datetime2 NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_AttendanceDevices] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE TABLE [AttendanceQrSessions] (
        [Id] uniqueidentifier NOT NULL,
        [Audience] nvarchar(10) NOT NULL,
        [SectionId] uniqueidentifier NULL,
        [Date] date NOT NULL,
        [OpensAt] datetime2 NOT NULL,
        [ClosesAt] datetime2 NOT NULL,
        [Status] nvarchar(10) NOT NULL,
        [Direction] nvarchar(10) NOT NULL,
        [OpenedByUserId] uniqueidentifier NULL,
        [OpenedByName] nvarchar(200) NULL,
        [ClosedAt] datetime2 NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_AttendanceQrSessions] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE TABLE [AttendanceScanEvents] (
        [Id] uniqueidentifier NOT NULL,
        [Source] nvarchar(20) NOT NULL,
        [DeviceId] uniqueidentifier NULL,
        [QrSessionId] uniqueidentifier NULL,
        [PersonType] nvarchar(10) NULL,
        [PersonId] uniqueidentifier NULL,
        [IdentifierLabel] nvarchar(32) NULL,
        [Direction] nvarchar(10) NOT NULL,
        [OccurredAt] datetime2 NOT NULL,
        [ReceivedAt] datetime2 NOT NULL,
        [AttendanceDate] date NOT NULL,
        [Result] nvarchar(20) NOT NULL,
        [Reason] nvarchar(300) NULL,
        [ExternalEventId] nvarchar(100) NULL,
        [Confidence] float NULL,
        [ReviewDecision] nvarchar(20) NULL,
        [ReviewedByUserId] uniqueidentifier NULL,
        [ReviewedByName] nvarchar(200) NULL,
        [ReviewedAt] datetime2 NULL,
        [ReviewNote] nvarchar(500) NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_AttendanceScanEvents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE TABLE [AttendanceSettings] (
        [Id] uniqueidentifier NOT NULL,
        [QrEnabled] bit NOT NULL,
        [RfidEnabled] bit NOT NULL,
        [BiometricEnabled] bit NOT NULL,
        [FaceEnabled] bit NOT NULL,
        [TimeZoneId] nvarchar(64) NOT NULL,
        [StudentLateAfter] time NULL,
        [StaffLateAfter] time NULL,
        [QrPassLifetimeSeconds] int NOT NULL,
        [DuplicateWindowMinutes] int NOT NULL,
        [FaceMatchThreshold] float NOT NULL,
        [FaceReviewThreshold] float NOT NULL,
        [ScanEventRetentionDays] int NOT NULL,
        [RequireApprovalForPastEdits] bit NOT NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_AttendanceSettings] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE TABLE [FaceConsents] (
        [Id] uniqueidentifier NOT NULL,
        [PersonType] nvarchar(10) NOT NULL,
        [PersonId] uniqueidentifier NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [GivenBy] nvarchar(200) NOT NULL,
        [Method] nvarchar(100) NOT NULL,
        [NoticeVersion] nvarchar(20) NOT NULL,
        [GrantedAt] datetime2 NOT NULL,
        [RecordedByUserId] uniqueidentifier NULL,
        [RecordedByName] nvarchar(200) NULL,
        [WithdrawnAt] datetime2 NULL,
        [WithdrawnReason] nvarchar(300) NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_FaceConsents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE TABLE [FaceEnrollments] (
        [Id] uniqueidentifier NOT NULL,
        [PersonType] nvarchar(10) NOT NULL,
        [PersonId] uniqueidentifier NOT NULL,
        [Provider] nvarchar(40) NOT NULL,
        [ProviderSubjectId] nvarchar(100) NOT NULL,
        [SampleCount] int NOT NULL,
        [EnrolledAt] datetime2 NOT NULL,
        [EnrolledByUserId] uniqueidentifier NULL,
        [Active] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        [TenantId] nvarchar(64) NOT NULL,
        [BranchId] nvarchar(64) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        CONSTRAINT [PK_FaceEnrollments] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE INDEX [IX_AttendanceAuditEntries_TenantId_BranchId_At] ON [AttendanceAuditEntries] ([TenantId], [BranchId], [At]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE INDEX [IX_AttendanceAuditEntries_TenantId_PersonType_PersonId_Date] ON [AttendanceAuditEntries] ([TenantId], [PersonType], [PersonId], [Date]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE INDEX [IX_AttendanceCorrectionRequests_TenantId_BranchId_Status] ON [AttendanceCorrectionRequests] ([TenantId], [BranchId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_AttendanceCredentials_TenantId_Kind_IdentifierHash] ON [AttendanceCredentials] ([TenantId], [Kind], [IdentifierHash]) WHERE [Active] = 1');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE INDEX [IX_AttendanceCredentials_TenantId_PersonType_PersonId] ON [AttendanceCredentials] ([TenantId], [PersonType], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_AttendanceDevices_SerialNumber] ON [AttendanceDevices] ([SerialNumber]) WHERE [SerialNumber] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE INDEX [IX_AttendanceDevices_TenantId_BranchId] ON [AttendanceDevices] ([TenantId], [BranchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE INDEX [IX_AttendanceQrSessions_TenantId_BranchId_Date] ON [AttendanceQrSessions] ([TenantId], [BranchId], [Date]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE INDEX [IX_AttendanceScanEvents_TenantId_BranchId_AttendanceDate] ON [AttendanceScanEvents] ([TenantId], [BranchId], [AttendanceDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE INDEX [IX_AttendanceScanEvents_TenantId_PersonType_PersonId_AttendanceDate] ON [AttendanceScanEvents] ([TenantId], [PersonType], [PersonId], [AttendanceDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE INDEX [IX_AttendanceScanEvents_TenantId_Result] ON [AttendanceScanEvents] ([TenantId], [Result]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_AttendanceScanEvents_TenantId_Source_DeviceId_ExternalEventId] ON [AttendanceScanEvents] ([TenantId], [Source], [DeviceId], [ExternalEventId]) WHERE [ExternalEventId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AttendanceSettings_TenantId_BranchId] ON [AttendanceSettings] ([TenantId], [BranchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE INDEX [IX_FaceConsents_TenantId_PersonType_PersonId] ON [FaceConsents] ([TenantId], [PersonType], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    CREATE INDEX [IX_FaceEnrollments_ProviderSubjectId] ON [FaceEnrollments] ([ProviderSubjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_FaceEnrollments_TenantId_PersonType_PersonId] ON [FaceEnrollments] ([TenantId], [PersonType], [PersonId]) WHERE [Active] = 1');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022181315_AttendanceCaptureMethods'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261022181315_AttendanceCaptureMethods', N'10.0.10');
END;

COMMIT;
GO


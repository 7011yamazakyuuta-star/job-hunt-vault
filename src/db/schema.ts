import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    googleSub: text("google_sub"),
    email: text("email").notNull(),
    name: text("name").notNull(),
    googlePictureUrl: text("google_picture_url"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    googleSubUnique: uniqueIndex("users_google_sub_unique").on(table.googleSub),
    emailIdx: index("users_email_idx").on(table.email),
  }),
);

export const userSessions = sqliteTable(
  "user_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
    lastSeenAt: text("last_seen_at"),
    revokedAt: text("revoked_at"),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("user_sessions_token_hash_unique").on(table.tokenHash),
    userIdx: index("user_sessions_user_idx").on(table.userId),
  }),
);

export const rooms = sqliteTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    roomCode: text("room_code").notNull(),
    name: text("name").notNull(),
    type: text("type", { enum: ["personal", "shared"] }).notNull(),
    joinEnabled: integer("join_enabled", { mode: "boolean" }).notNull(),
    passphraseHash: text("passphrase_hash"),
    passphraseSalt: text("passphrase_salt"),
    ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    roomCodeUnique: uniqueIndex("rooms_room_code_unique").on(table.roomCode),
    ownerIdx: index("rooms_owner_idx").on(table.ownerUserId),
  }),
);

export const roomMembers = sqliteTable(
  "room_members",
  {
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    displayNameInRoom: text("display_name_in_room").notNull(),
    avatarKind: text("avatar_kind", { enum: ["emoji", "initials", "photo"] }).notNull(),
    avatarEmoji: text("avatar_emoji"),
    avatarColor: text("avatar_color"),
    avatarR2Key: text("avatar_r2_key"),
    avatarThumbR2Key: text("avatar_thumb_r2_key"),
    role: text("role", { enum: ["owner", "member"] }).notNull(),
    joinedAt: text("joined_at").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roomId, table.userId] }),
    userIdx: index("room_members_user_idx").on(table.userId),
  }),
);

export const roomInvites = sqliteTable(
  "room_invites",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    inviteCodeHash: text("invite_code_hash").notNull(),
    passphraseHash: text("passphrase_hash"),
    passphraseSalt: text("passphrase_salt"),
    expiresAt: text("expires_at"),
    createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
    usedAt: text("used_at"),
  },
  (table) => ({
    roomIdx: index("room_invites_room_idx").on(table.roomId),
    inviteHashUnique: uniqueIndex("room_invites_invite_code_hash_unique").on(table.inviteCodeHash),
  }),
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: text("reset_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const companies = sqliteTable(
  "companies",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    domain: text("domain"),
    industry: text("industry"),
    priorityDeadlineAt: text("priority_deadline_at"),
    careerUrl: text("career_url"),
    mypageUrl: text("mypage_url"),
    logoUrl: text("logo_url"),
    logoR2Key: text("logo_r2_key"),
    memo: text("memo"),
    createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    deletedAt: text("deleted_at"),
    ...timestamps,
  },
  (table) => ({
    roomIdx: index("companies_room_idx").on(table.roomId),
    roomNameIdx: index("companies_room_name_idx").on(table.roomId, table.name),
  }),
);

export const companyCatalog = sqliteTable(
  "company_catalog",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    sourceId: text("source_id"),
    country: text("country").notNull().default("JP"),
    name: text("name").notNull(),
    nameKana: text("name_kana"),
    normalizedName: text("normalized_name").notNull(),
    domain: text("domain"),
    industry: text("industry"),
    market: text("market"),
    ticker: text("ticker"),
    exchange: text("exchange"),
    logoUrl: text("logo_url"),
    metadataJson: text("metadata_json"),
    ...timestamps,
  },
  (table) => ({
    normalizedNameIdx: index("company_catalog_normalized_name_idx").on(table.normalizedName),
    tickerIdx: index("company_catalog_ticker_idx").on(table.ticker),
    domainIdx: index("company_catalog_domain_idx").on(table.domain),
    industryIdx: index("company_catalog_industry_idx").on(table.industry),
  }),
);

export const testTypes = sqliteTable("test_types", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  createdAt: text("created_at").notNull(),
});

export const companyTestReports = sqliteTable(
  "company_test_reports",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    testTypeId: text("test_type_id").references(() => testTypes.id, { onDelete: "set null" }),
    source: text("source"),
    notes: text("notes"),
    visibility: text("visibility", { enum: ["room", "private"] }).notNull(),
    createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => ({
    roomCompanyIdx: index("company_test_reports_room_company_idx").on(table.roomId, table.companyId),
  }),
);

export const selectionSteps = sqliteTable(
  "selection_steps",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    stepOrder: integer("step_order").notNull(),
    dueAt: text("due_at"),
    interviewAt: text("interview_at"),
    memo: text("memo"),
    createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => ({
    roomCompanyOrderIdx: index("selection_steps_room_company_order_idx").on(table.roomId, table.companyId, table.stepOrder),
  }),
);

export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    overallStatus: text("overall_status").notNull(),
    visibility: text("visibility", { enum: ["room", "private"] }).notNull(),
    mypageUrl: text("mypage_url"),
    personalNoteEncrypted: text("personal_note_encrypted"),
    ...timestamps,
  },
  (table) => ({
    roomUserIdx: index("applications_room_user_idx").on(table.roomId, table.userId),
    companyIdx: index("applications_company_idx").on(table.companyId),
  }),
);

export const applicationStepProgress = sqliteTable(
  "application_step_progress",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
    selectionStepId: text("selection_step_id").notNull().references(() => selectionSteps.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    visibility: text("visibility", { enum: ["room", "private"] }).notNull(),
    memoEncrypted: text("memo_encrypted"),
    dueAt: text("due_at"),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    appStepUnique: uniqueIndex("application_step_progress_app_step_unique").on(table.applicationId, table.selectionStepId),
    userIdx: index("application_step_progress_user_idx").on(table.userId),
  }),
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
    applicationId: text("application_id").references(() => applications.id, { onDelete: "set null" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at"),
    visibility: text("visibility", { enum: ["room", "private"] }).notNull(),
    kind: text("kind").notNull(),
    notesEncrypted: text("notes_encrypted"),
    ...timestamps,
  },
  (table) => ({
    roomStartsIdx: index("events_room_starts_idx").on(table.roomId, table.startsAt),
    userIdx: index("events_user_idx").on(table.userId),
  }),
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
    applicationId: text("application_id").references(() => applications.id, { onDelete: "set null" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    dueAt: text("due_at"),
    status: text("status").notNull(),
    visibility: text("visibility", { enum: ["room", "private"] }).notNull(),
    notesEncrypted: text("notes_encrypted"),
    ...timestamps,
  },
  (table) => ({
    roomDueIdx: index("tasks_room_due_idx").on(table.roomId, table.dueAt),
    userIdx: index("tasks_user_idx").on(table.userId),
  }),
);

export const vaults = sqliteTable(
  "vaults",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kdfParamsJson: text("kdf_params_json"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    ownerUnique: uniqueIndex("vaults_owner_unique").on(table.ownerUserId),
  }),
);

export const credentialItems = sqliteTable(
  "credential_items",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    roomId: text("room_id").references(() => rooms.id, { onDelete: "cascade" }),
    applicationId: text("application_id").references(() => applications.id, { onDelete: "set null" }),
    encryptedPayload: text("encrypted_payload").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    ownerIdx: index("credential_items_owner_idx").on(table.ownerUserId),
    roomOwnerIdx: index("credential_items_room_owner_idx").on(table.roomId, table.ownerUserId),
  }),
);

export const logoCache = sqliteTable(
  "logo_cache",
  {
    id: text("id").primaryKey(),
    domain: text("domain").notNull(),
    source: text("source").notNull(),
    logoUrl: text("logo_url"),
    r2Key: text("r2_key"),
    metadataJson: text("metadata_json"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    domainUnique: uniqueIndex("logo_cache_domain_unique").on(table.domain),
  }),
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    roomId: text("room_id").references(() => rooms.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadataJson: text("metadata_json"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    roomCreatedIdx: index("audit_logs_room_created_idx").on(table.roomId, table.createdAt),
    actorIdx: index("audit_logs_actor_idx").on(table.actorUserId),
  }),
);

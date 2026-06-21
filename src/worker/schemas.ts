import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalShortText = z.string().trim().max(500).optional();
const visibilitySchema = z.enum(["room", "private"]).default("room");

export const createPersonalRoomSchema = z.object({
  name: z.string().trim().min(1).max(120).default("Personal room"),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const createSharedRoomSchema = z.object({
  name: z.string().trim().min(1).max(120),
  passphrase: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const joinRoomSchema = z.object({
  roomId: z.string().trim().min(1).max(120).optional(),
  roomCode: z.string().trim().min(1).max(120).optional(),
  passphrase: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const patchRoomSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});

export const rotatePassphraseSchema = z.object({
  passphrase: z.string().min(8).max(128),
});

export const avatarJsonSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("emoji"),
    emoji: z.string().trim().min(1).max(8),
    color: z.string().trim().min(1).max(40).optional(),
  }),
  z.object({
    kind: z.literal("initials"),
    initials: z.string().trim().min(1).max(4),
    color: z.string().trim().min(1).max(40).optional(),
  }),
]);

export const companyCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  domain: z.string().trim().toLowerCase().max(255).optional(),
  industry: z.string().trim().max(120).optional(),
  priorityDeadlineAt: z.string().datetime().optional(),
  careerUrl: optionalUrl,
  mypageUrl: optionalUrl,
  logoUrl: optionalUrl,
  memo: optionalShortText,
});

export const companyPatchSchema = companyCreateSchema.partial();

export const selectionStepSchema = z.object({
  companyId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  stepOrder: z.number().int().min(0).max(100),
  dueAt: z.string().datetime().optional(),
  interviewAt: z.string().datetime().optional(),
  memo: optionalShortText,
});

export const testReportSchema = z.object({
  companyId: z.string().trim().min(1).max(120),
  testTypeId: z.string().trim().min(1).max(120).optional(),
  source: z.string().trim().max(120).optional(),
  notes: optionalShortText,
  visibility: visibilitySchema,
});

export const applicationCreateSchema = z.object({
  companyId: z.string().trim().min(1).max(120),
  overallStatus: z.string().trim().min(1).max(80).default("tracking"),
  visibility: visibilitySchema,
  mypageUrl: optionalUrl,
  personalNoteEncrypted: z.string().trim().max(12000).optional(),
});

export const applicationPatchSchema = applicationCreateSchema
  .omit({ companyId: true })
  .partial();

export const eventCreateSchema = z.object({
  companyId: z.string().trim().min(1).max(120).optional(),
  applicationId: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(1).max(160),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  visibility: visibilitySchema,
  kind: z.string().trim().min(1).max(80).default("event"),
  notesEncrypted: z.string().trim().max(12000).optional(),
});

export const taskCreateSchema = z.object({
  companyId: z.string().trim().min(1).max(120).optional(),
  applicationId: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(1).max(160),
  dueAt: z.string().datetime().optional(),
  status: z.string().trim().min(1).max(80).default("open"),
  visibility: visibilitySchema,
  notesEncrypted: z.string().trim().max(12000).optional(),
});

export const vaultItemCreateSchema = z.object({
  applicationId: z.string().trim().min(1).max(120).optional(),
  encryptedPayload: z.string().trim().min(1).max(100000),
});

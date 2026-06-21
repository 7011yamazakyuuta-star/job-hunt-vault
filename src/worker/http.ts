import type { Context } from "hono";
import type { z } from "zod";
import type { AppBindings, AppContext } from "./types";

export function jsonError(c: Context<AppBindings>, status: number, message: string): Response {
  return c.json({ error: message }, status as 400);
}

export async function parseJson<TSchema extends z.ZodType>(
  c: AppContext,
  schema: TSchema,
): Promise<{ ok: true; data: z.infer<TSchema> } | { ok: false; response: Response }> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return { ok: false, response: jsonError(c, 400, "Invalid JSON body") };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: c.json(
        {
          error: "Invalid request body",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        400,
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

export function getOptionalNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

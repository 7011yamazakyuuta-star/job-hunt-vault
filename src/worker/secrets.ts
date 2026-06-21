import type { SecretName } from "./types";

export function getSecret(env: Env, name: SecretName): string | undefined {
  return (env as Env & Partial<Record<SecretName, string>>)[name];
}

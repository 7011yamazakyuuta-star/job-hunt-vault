import type { Context } from "hono";

export type User = {
  id: string;
  email: string;
  name: string;
  googlePictureUrl: string | null;
};

export type AppBindings = {
  Bindings: Env;
  Variables: {
    user: User;
  };
};

export type AppContext = Context<AppBindings>;

export type RoomMember = {
  room_id: string;
  user_id: string;
  role: "owner" | "member";
  avatar_r2_key: string | null;
};

export type SecretName =
  | "GOOGLE_CLIENT_ID"
  | "GOOGLE_CLIENT_SECRET"
  | "SESSION_SECRET"
  | "TURNSTILE_SECRET_KEY"
  | "LOGO_PROVIDER_API_KEY"
  | "LOGO_DEV_PUBLISHABLE_KEY"
  | "LOGO_DEV_SECRET_KEY";

export type { Database, Json } from "./database.types";
import type { Database } from "./database.types";

export type PublicSchema = Database["public"];
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

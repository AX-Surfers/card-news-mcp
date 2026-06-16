import type { StorageBackend } from "./types.js";
import { Base64Backend } from "./base64.js";
import { LocalBackend } from "./local.js";

export type { StorageBackend, StorageResult } from "./types.js";

export type BackendName = "base64" | "local" | "supabase" | "s3";

/**
 * STORAGE_BACKEND 환경변수(또는 인자)로 백엔드 선택. 기본 'local'.
 * supabase/s3는 optional dependency라 동적 import.
 */
export async function createStorage(name?: BackendName): Promise<StorageBackend> {
  const backend = (name ?? (process.env.STORAGE_BACKEND as BackendName) ?? "local");

  switch (backend) {
    case "base64":
      return new Base64Backend();
    case "supabase": {
      const { SupabaseBackend } = await import("./supabase.js");
      return new SupabaseBackend();
    }
    case "s3": {
      const { S3Backend } = await import("./s3.js");
      return new S3Backend();
    }
    case "local":
    default:
      return new LocalBackend();
  }
}

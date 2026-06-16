import type { StorageBackend, StorageResult } from "./types.js";

/**
 * Supabase Storage 백엔드 (선택적).
 * @supabase/supabase-js를 optional dependency로 동적 import.
 */
export class SupabaseBackend implements StorageBackend {
  private bucket: string;
  private clientPromise: Promise<any>;

  constructor(bucket = process.env.SUPABASE_BUCKET ?? "card-images") {
    this.bucket = bucket;
    this.clientPromise = this.initClient();
  }

  private async initClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
    }
    let createClient: any;
    const supabaseMod = "@supabase/supabase-js";
    try {
      ({ createClient } = await import(supabaseMod));
    } catch {
      throw new Error("@supabase/supabase-js 미설치. `npm i @supabase/supabase-js` 후 사용하세요.");
    }
    return createClient(url, key);
  }

  async save(key: string, png: Buffer): Promise<StorageResult> {
    const supabase = await this.clientPromise;
    const path = `${key}.png`;
    const { error } = await supabase.storage
      .from(this.bucket)
      .upload(path, png, { contentType: "image/png", upsert: true });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    const { data } = supabase.storage.from(this.bucket).getPublicUrl(path);
    return { url: data.publicUrl };
  }
}

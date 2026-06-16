import type { StorageBackend, StorageResult } from "./types.js";

/** 저장하지 않고 data URI만 반환 (기본 백엔드, 의존성 없음) */
export class Base64Backend implements StorageBackend {
  async save(_key: string, png: Buffer): Promise<StorageResult> {
    return { base64: `data:image/png;base64,${png.toString("base64")}` };
  }
}

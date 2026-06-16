import type { StorageBackend, StorageResult } from "./types.js";

/**
 * S3 / R2 호환 백엔드 (선택적).
 * @aws-sdk/client-s3를 optional dependency로 동적 import.
 * 환경변수: S3_BUCKET, S3_REGION, S3_ENDPOINT(R2 등), S3_ACCESS_KEY_ID,
 *           S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL(공개 URL prefix)
 */
export class S3Backend implements StorageBackend {
  private clientPromise: Promise<any>;
  private bucket: string;
  private publicBase?: string;
  // 변수 specifier로 동적 import → 미설치 시에도 typecheck 통과
  private readonly s3Mod = "@aws-sdk/client-s3";

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "";
    this.publicBase = process.env.S3_PUBLIC_BASE_URL;
    this.clientPromise = this.initClient();
  }

  private async initClient() {
    if (!this.bucket) throw new Error("S3_BUCKET 환경변수가 필요합니다.");
    let S3Client: any;
    try {
      ({ S3Client } = await import(this.s3Mod));
    } catch {
      throw new Error("@aws-sdk/client-s3 미설치. `npm i @aws-sdk/client-s3` 후 사용하세요.");
    }
    return new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async save(key: string, png: Buffer): Promise<StorageResult> {
    const client = await this.clientPromise;
    const { PutObjectCommand } = await import(this.s3Mod);
    const objectKey = `${key}.png`;
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: png,
        ContentType: "image/png",
      })
    );
    const url = this.publicBase
      ? `${this.publicBase.replace(/\/$/, "")}/${objectKey}`
      : undefined;
    return { url };
  }
}

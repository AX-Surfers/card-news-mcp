import { mkdir, writeFile } from "fs/promises";
import { dirname, isAbsolute, join } from "path";
import type { StorageBackend, StorageResult } from "./types.js";

/** 로컬 파일시스템에 PNG 저장. 기본은 data URI도 함께 반환 */
export class LocalBackend implements StorageBackend {
  private outputDir: string;
  private includeBase64: boolean;

  constructor(outputDir = process.env.OUTPUT_DIR ?? "./card-news-out", includeBase64 = true) {
    this.outputDir = isAbsolute(outputDir) ? outputDir : join(process.cwd(), outputDir);
    this.includeBase64 = includeBase64;
  }

  async save(key: string, png: Buffer): Promise<StorageResult> {
    const filePath = join(this.outputDir, `${key}.png`);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, png);
    const result: StorageResult = { path: filePath };
    if (this.includeBase64) {
      result.base64 = `data:image/png;base64,${png.toString("base64")}`;
    }
    return result;
  }
}

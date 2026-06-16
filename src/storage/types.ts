export interface StorageResult {
  path?: string;   // 로컬 파일 절대경로
  url?: string;    // 원격 공개 URL
  base64?: string; // data URI (data:image/png;base64,...)
}

export interface StorageBackend {
  /** PNG 버퍼를 저장하고 접근 정보를 반환 */
  save(key: string, png: Buffer): Promise<StorageResult>;
}

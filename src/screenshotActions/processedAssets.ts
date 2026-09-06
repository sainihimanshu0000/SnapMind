import { getDatabase } from '../database';
import type { ProcessedAssetStatus } from '../types';

export type ProcessedAsset = {
  photoAssetId: string;
  processedAt: string;
  status: ProcessedAssetStatus;
  screenshotId: string | null;
};

export async function getProcessedAsset(
  photoAssetId: string,
): Promise<ProcessedAsset | null> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM processed_assets WHERE photoAssetId = ? LIMIT 1`,
    [photoAssetId],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    photoAssetId: String(row.photoAssetId),
    processedAt: String(row.processedAt),
    status: String(row.status) as ProcessedAssetStatus,
    screenshotId: row.screenshotId == null ? null : String(row.screenshotId),
  };
}

export async function markAssetProcessed(input: {
  photoAssetId: string;
  status: ProcessedAssetStatus;
  screenshotId?: string | null;
}): Promise<void> {
  const db = await getDatabase();
  const processedAt = new Date().toISOString();
  await db.execute(
    `INSERT INTO processed_assets (photoAssetId, processedAt, status, screenshotId)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(photoAssetId) DO UPDATE SET
       processedAt = excluded.processedAt,
       status = excluded.status,
       screenshotId = excluded.screenshotId`,
    [
      input.photoAssetId,
      processedAt,
      input.status,
      input.screenshotId ?? null,
    ],
  );
}

export function filterUnprocessed<T extends { id: string }>(
  assets: T[],
  processedIds: Set<string>,
): T[] {
  return assets.filter(asset => !processedIds.has(asset.id));
}

import { getDatabase } from '../database';
import type { Collection, ScreenshotWithMeta } from '../types';
import { createId } from '../utils/id';
import {
  getScreenshotById,
  updateScreenshot,
} from './screenshotsRepository';

export async function listCollections(): Promise<Collection[]> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT c.id, c.name, c.createdAt,
            (SELECT COUNT(*) FROM collection_screenshots cs WHERE cs.collectionId = c.id) AS screenshotCount
     FROM collections c
     ORDER BY c.createdAt DESC`,
  );

  return result.rows.map(row => ({
    id: String(row.id),
    name: String(row.name),
    createdAt: String(row.createdAt),
    screenshotCount: Number(row.screenshotCount ?? 0),
  }));
}

export async function createCollection(name: string): Promise<Collection> {
  const db = await getDatabase();
  const id = createId();
  const createdAt = new Date().toISOString();
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Collection name is required');
  }

  await db.execute(
    `INSERT INTO collections (id, name, createdAt) VALUES (?, ?, ?)`,
    [id, trimmed, createdAt],
  );

  return { id, name: trimmed, createdAt, screenshotCount: 0 };
}

export async function renameCollection(id: string, name: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(`UPDATE collections SET name = ? WHERE id = ?`, [
    name.trim(),
    id,
  ]);
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE screenshots SET collectionId = NULL WHERE collectionId = ?`,
    [id],
  );
  await db.execute(`DELETE FROM collection_screenshots WHERE collectionId = ?`, [
    id,
  ]);
  await db.execute(`DELETE FROM collections WHERE id = ?`, [id]);
}

export async function addScreenshotToCollection(
  collectionId: string,
  screenshotId: string,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT OR IGNORE INTO collection_screenshots (collectionId, screenshotId) VALUES (?, ?)`,
    [collectionId, screenshotId],
  );
  await updateScreenshot(screenshotId, { collectionId });
}

export async function removeScreenshotFromCollection(
  collectionId: string,
  screenshotId: string,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `DELETE FROM collection_screenshots WHERE collectionId = ? AND screenshotId = ?`,
    [collectionId, screenshotId],
  );
  const shot = await getScreenshotById(screenshotId);
  if (shot?.collectionId === collectionId) {
    await updateScreenshot(screenshotId, { collectionId: null });
  }
}

export async function getCollectionScreenshots(
  collectionId: string,
): Promise<ScreenshotWithMeta[]> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT s.id
     FROM screenshots s
     INNER JOIN collection_screenshots cs ON cs.screenshotId = s.id
     WHERE cs.collectionId = ?
     ORDER BY s.createdAt DESC`,
    [collectionId],
  );

  const shots = await Promise.all(
    result.rows.map(row => getScreenshotById(String(row.id))),
  );
  return shots.filter((shot): shot is ScreenshotWithMeta => shot != null);
}

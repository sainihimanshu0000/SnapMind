import type { Scalar } from '@op-engineering/op-sqlite';
import { getDatabase } from '../database';
import { DEFAULT_CATEGORY } from '../constants/categories';
import type { Category } from '../constants/categories';
import type { Intent } from '../constants/intents';
import {
  analyzeDocument,
  parseAnalysis,
  serializeAnalysis,
  type DocumentAnalysis,
  type DocumentType,
} from '../documentIntelligence';
import type {
  Screenshot,
  ScreenshotWithMeta,
  SearchFilters,
  ProcessingStatus,
} from '../types';
import { getPreference, preferenceKeys } from '../storage';
import { createId } from '../utils/id';
import { deleteLocalImage } from './imageStorage';

type ScreenshotRow = Record<string, Scalar>;

function mapRow(row: ScreenshotRow): Screenshot {
  return {
    id: String(row.id),
    imageUri: String(row.imageUri),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    ocrText: row.ocrText == null ? null : String(row.ocrText),
    category: String(row.category) as Category,
    intent: row.intent == null ? null : (String(row.intent) as Intent),
    notes: row.notes == null ? null : String(row.notes),
    sourceUrl: row.sourceUrl == null ? null : String(row.sourceUrl),
    isFavorite: Boolean(row.isFavorite),
    isTemporary: Boolean(row.isTemporary),
    reminderDate: row.reminderDate == null ? null : String(row.reminderDate),
    collectionId: row.collectionId == null ? null : String(row.collectionId),
    sourceAssetId:
      row.sourceAssetId == null ? null : String(row.sourceAssetId),
    processingStatus: (row.processingStatus == null
      ? 'processed'
      : String(row.processingStatus)) as ProcessingStatus,
    documentType:
      row.documentType == null ? null : (String(row.documentType) as DocumentType),
    extractedFieldsJson:
      row.extractedFieldsJson == null
        ? null
        : String(row.extractedFieldsJson),
  };
}

async function getTagsForScreenshot(screenshotId: string): Promise<string[]> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT t.name AS name
     FROM tags t
     INNER JOIN screenshot_tags st ON st.tagId = t.id
     WHERE st.screenshotId = ?
     ORDER BY t.name COLLATE NOCASE ASC`,
    [screenshotId],
  );
  return result.rows.map(row => String(row.name));
}

async function getCollectionName(
  collectionId: string | null,
): Promise<string | null> {
  if (!collectionId) {
    return null;
  }
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT name FROM collections WHERE id = ? LIMIT 1`,
    [collectionId],
  );
  const name = result.rows[0]?.name;
  return name == null ? null : String(name);
}

async function withMeta(shot: Screenshot): Promise<ScreenshotWithMeta> {
  const [tags, collectionName] = await Promise.all([
    getTagsForScreenshot(shot.id),
    getCollectionName(shot.collectionId),
  ]);
  return {
    ...shot,
    tags,
    collectionName,
    analysis: parseAnalysis(shot.extractedFieldsJson),
  };
}

export async function listScreenshots(options?: {
  filter?: 'All' | 'Recent' | 'Favorites';
  limit?: number;
}): Promise<ScreenshotWithMeta[]> {
  const db = await getDatabase();
  const filter = options?.filter ?? 'All';
  const limit = options?.limit ?? 500;

  let sql = `SELECT * FROM screenshots`;
  const params: Scalar[] = [];

  if (filter === 'Favorites') {
    sql += ` WHERE isFavorite = 1`;
  }

  sql += ` ORDER BY createdAt DESC LIMIT ?`;
  params.push(limit);

  const result = await db.execute(sql, params);
  const shots = result.rows.map(mapRow);
  return Promise.all(shots.map(withMeta));
}

export async function getScreenshotById(
  id: string,
): Promise<ScreenshotWithMeta | null> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM screenshots WHERE id = ? LIMIT 1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return withMeta(mapRow(row));
}

export async function createScreenshot(input: {
  imageUri: string;
  ocrText?: string | null;
  category?: Category;
  intent?: Intent | null;
  notes?: string | null;
  sourceUrl?: string | null;
  tags?: string[];
  sourceAssetId?: string | null;
  isFavorite?: boolean;
  processingStatus?: ProcessingStatus;
  documentType?: DocumentType | null;
  extractedFieldsJson?: string | null;
}): Promise<ScreenshotWithMeta> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = createId();

  const analysis =
    input.extractedFieldsJson != null
      ? parseAnalysis(input.extractedFieldsJson)
      : input.ocrText
        ? analyzeDocument(input.ocrText)
        : null;
  const documentType =
    input.documentType ?? analysis?.documentType ?? null;
  const extractedFieldsJson =
    input.extractedFieldsJson ??
    (analysis ? serializeAnalysis(analysis) : null);

  await db.execute(
    `INSERT INTO screenshots (
      id, imageUri, createdAt, updatedAt, ocrText, category, intent,
      notes, sourceUrl, isFavorite, isTemporary, reminderDate, collectionId,
      sourceAssetId, processingStatus, documentType, extractedFieldsJson
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?, ?, ?)`,
    [
      id,
      input.imageUri,
      now,
      now,
      input.ocrText ?? null,
      input.category ?? DEFAULT_CATEGORY,
      input.intent ?? null,
      input.notes ?? null,
      input.sourceUrl ?? null,
      input.isFavorite ? 1 : 0,
      input.sourceAssetId ?? null,
      input.processingStatus ?? 'processed',
      documentType,
      extractedFieldsJson,
    ],
  );

  if (input.tags?.length) {
    await setScreenshotTags(id, input.tags);
  }

  const created = await getScreenshotById(id);
  if (!created) {
    throw new Error('Failed to create screenshot');
  }
  return created;
}

export async function updateScreenshot(
  id: string,
  patch: Partial<{
    ocrText: string | null;
    category: Category;
    intent: Intent | null;
    notes: string | null;
    sourceUrl: string | null;
    isFavorite: boolean;
    isTemporary: boolean;
    reminderDate: string | null;
    collectionId: string | null;
    sourceAssetId: string | null;
    processingStatus: ProcessingStatus;
    documentType: DocumentType | null;
    extractedFieldsJson: string | null;
    reanalyzeDocument: boolean;
  }>,
): Promise<ScreenshotWithMeta | null> {
  const existing = await getScreenshotById(id);
  if (!existing) {
    return null;
  }

  const nextOcr =
    patch.ocrText !== undefined ? patch.ocrText : existing.ocrText;
  const shouldReanalyze =
    patch.reanalyzeDocument === true ||
    (patch.ocrText !== undefined &&
      patch.documentType === undefined &&
      patch.extractedFieldsJson === undefined);
  const analysis = shouldReanalyze ? analyzeDocument(nextOcr) : null;

  const next = {
    ocrText: nextOcr,
    category: patch.category ?? existing.category,
    intent: patch.intent !== undefined ? patch.intent : existing.intent,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    sourceUrl:
      patch.sourceUrl !== undefined ? patch.sourceUrl : existing.sourceUrl,
    isFavorite:
      patch.isFavorite !== undefined ? patch.isFavorite : existing.isFavorite,
    isTemporary:
      patch.isTemporary !== undefined
        ? patch.isTemporary
        : existing.isTemporary,
    reminderDate:
      patch.reminderDate !== undefined
        ? patch.reminderDate
        : existing.reminderDate,
    collectionId:
      patch.collectionId !== undefined
        ? patch.collectionId
        : existing.collectionId,
    sourceAssetId:
      patch.sourceAssetId !== undefined
        ? patch.sourceAssetId
        : existing.sourceAssetId,
    processingStatus:
      patch.processingStatus !== undefined
        ? patch.processingStatus
        : existing.processingStatus,
    documentType:
      patch.documentType !== undefined
        ? patch.documentType
        : analysis
          ? analysis.documentType
          : existing.documentType,
    extractedFieldsJson:
      patch.extractedFieldsJson !== undefined
        ? patch.extractedFieldsJson
        : analysis
          ? serializeAnalysis(analysis)
          : existing.extractedFieldsJson,
  };

  const db = await getDatabase();
  const updatedAt = new Date().toISOString();

  await db.execute(
    `UPDATE screenshots SET
      ocrText = ?, category = ?, intent = ?, notes = ?, sourceUrl = ?,
      isFavorite = ?, isTemporary = ?, reminderDate = ?, collectionId = ?,
      sourceAssetId = ?, processingStatus = ?, documentType = ?,
      extractedFieldsJson = ?, updatedAt = ?
     WHERE id = ?`,
    [
      next.ocrText,
      next.category,
      next.intent,
      next.notes,
      next.sourceUrl,
      next.isFavorite ? 1 : 0,
      next.isTemporary ? 1 : 0,
      next.reminderDate,
      next.collectionId,
      next.sourceAssetId,
      next.processingStatus,
      next.documentType,
      next.extractedFieldsJson,
      updatedAt,
      id,
    ],
  );

  return getScreenshotById(id);
}

export async function saveDocumentAnalysis(
  screenshotId: string,
  analysis: DocumentAnalysis,
): Promise<ScreenshotWithMeta | null> {
  return updateScreenshot(screenshotId, {
    documentType: analysis.documentType,
    extractedFieldsJson: serializeAnalysis(analysis),
  });
}

export async function correctExtractedField(input: {
  screenshotId: string;
  fieldKey: string;
  correctedValue: string;
}): Promise<ScreenshotWithMeta | null> {
  const existing = await getScreenshotById(input.screenshotId);
  if (!existing) {
    return null;
  }

  const analysis =
    existing.analysis ??
    parseAnalysis(existing.extractedFieldsJson) ??
    analyzeDocument(existing.ocrText);

  const predicted =
    analysis.fields.find(field => field.key === input.fieldKey)?.value ?? null;
  const nextFields = analysis.fields.map(field =>
    field.key === input.fieldKey
      ? {
          ...field,
          value: input.correctedValue.trim(),
          confidence: 1,
          validated: true,
        }
      : field,
  );

  if (!analysis.fields.some(field => field.key === input.fieldKey)) {
    nextFields.push({
      key: input.fieldKey as DocumentAnalysis['fields'][number]['key'],
      label: input.fieldKey,
      value: input.correctedValue.trim(),
      confidence: 1,
      validated: true,
    });
  }

  const nextAnalysis: DocumentAnalysis = {
    ...analysis,
    fields: nextFields,
    analyzedAt: new Date().toISOString(),
  };

  const db = await getDatabase();
  await db.execute(
    `INSERT INTO field_corrections (
      id, screenshotId, fieldKey, predictedValue, correctedValue, documentType, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      createId(),
      input.screenshotId,
      input.fieldKey,
      predicted,
      input.correctedValue.trim(),
      nextAnalysis.documentType,
      new Date().toISOString(),
    ],
  );

  return saveDocumentAnalysis(input.screenshotId, nextAnalysis);
}

export async function getScreenshotBySourceAssetId(
  sourceAssetId: string,
): Promise<ScreenshotWithMeta | null> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM screenshots WHERE sourceAssetId = ? LIMIT 1`,
    [sourceAssetId],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return withMeta(mapRow(row));
}

export async function setScreenshotTags(
  screenshotId: string,
  tagNames: string[],
): Promise<void> {
  const db = await getDatabase();
  const normalized = [
    ...new Set(
      tagNames
        .map(tag => tag.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean),
    ),
  ];

  await db.execute(`DELETE FROM screenshot_tags WHERE screenshotId = ?`, [
    screenshotId,
  ]);

  for (const name of normalized) {
    let tagId: string;
    const existing = await db.execute(
      `SELECT id FROM tags WHERE name = ? COLLATE NOCASE LIMIT 1`,
      [name],
    );
    if (existing.rows[0]?.id) {
      tagId = String(existing.rows[0].id);
    } else {
      tagId = createId();
      await db.execute(`INSERT INTO tags (id, name) VALUES (?, ?)`, [
        tagId,
        name,
      ]);
    }

    await db.execute(
      `INSERT OR IGNORE INTO screenshot_tags (screenshotId, tagId) VALUES (?, ?)`,
      [screenshotId, tagId],
    );
  }
}

export async function deleteScreenshot(id: string): Promise<void> {
  const existing = await getScreenshotById(id);
  const db = await getDatabase();
  await db.execute(`DELETE FROM screenshots WHERE id = ?`, [id]);
  if (existing) {
    await deleteLocalImage(existing.imageUri);
  }
}

export async function searchScreenshots(
  filters: SearchFilters,
): Promise<ScreenshotWithMeta[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: Scalar[] = [];

  if (filters.favoritesOnly) {
    clauses.push(`s.isFavorite = 1`);
  }
  if (filters.category) {
    clauses.push(`s.category = ?`);
    params.push(filters.category);
  }
  if (filters.intent) {
    clauses.push(`s.intent = ?`);
    params.push(filters.intent);
  }
  if (filters.createdAfter) {
    clauses.push(`s.createdAt >= ?`);
    params.push(filters.createdAfter);
  }
  if (filters.text) {
    clauses.push(`(
      IFNULL(s.ocrText, '') LIKE ? OR
      IFNULL(s.notes, '') LIKE ? OR
      IFNULL(s.category, '') LIKE ? OR
      IFNULL(s.intent, '') LIKE ? OR
      EXISTS (
        SELECT 1 FROM screenshot_tags st
        INNER JOIN tags t ON t.id = st.tagId
        WHERE st.screenshotId = s.id AND t.name LIKE ?
      ) OR
      EXISTS (
        SELECT 1 FROM collections c
        WHERE c.id = s.collectionId AND c.name LIKE ?
      )
    )`);
    const like = `%${filters.text}%`;
    params.push(like, like, like, like, like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await db.execute(
    `SELECT s.* FROM screenshots s ${where} ORDER BY s.createdAt DESC LIMIT 500`,
    params,
  );

  return Promise.all(result.rows.map(row => withMeta(mapRow(row))));
}

export async function countScreenshots(): Promise<number> {
  const db = await getDatabase();
  const result = await db.execute(`SELECT COUNT(*) AS count FROM screenshots`);
  return Number(result.rows[0]?.count ?? 0);
}

export async function listOldScreenshots(
  olderThanDays: number,
): Promise<ScreenshotWithMeta[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM screenshots WHERE createdAt < ? ORDER BY createdAt ASC LIMIT 200`,
    [cutoff.toISOString()],
  );
  return Promise.all(result.rows.map(row => withMeta(mapRow(row))));
}

export async function deleteAllScreenshots(): Promise<void> {
  const db = await getDatabase();
  const all = await listScreenshots({ limit: 10000 });
  await db.execute(`DELETE FROM screenshot_tags`);
  await db.execute(`DELETE FROM collection_screenshots`);
  await db.execute(`DELETE FROM reminders`);
  await db.execute(`DELETE FROM screenshots`);
  await db.execute(`DELETE FROM tags`);
  await db.execute(`DELETE FROM collections`);
  await Promise.all(all.map(shot => deleteLocalImage(shot.imageUri)));
}

function jsonSafeRow(row: ScreenshotRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'bigint') {
      out[key] = Number(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function tableDump(table: string): Promise<Record<string, unknown>[]> {
  const db = await getDatabase();
  const result = await db.execute(`SELECT * FROM ${table}`);
  return result.rows.map(row => jsonSafeRow(row));
}

export async function exportAllData(): Promise<string> {
  const [
    screenshots,
    tags,
    screenshotTags,
    collections,
    collectionScreenshots,
    reminders,
    processedAssets,
  ] = await Promise.all([
    tableDump('screenshots'),
    tableDump('tags'),
    tableDump('screenshot_tags'),
    tableDump('collections'),
    tableDump('collection_screenshots'),
    tableDump('reminders'),
    tableDump('processed_assets'),
  ]);

  const preferences: Record<string, string | null> = {};
  for (const key of Object.keys(preferenceKeys) as Array<
    keyof typeof preferenceKeys
  >) {
    preferences[key] = await getPreference(key);
  }

  return JSON.stringify(
    {
      app: 'SnapMind',
      version: 1,
      exportedAt: new Date().toISOString(),
      screenshots,
      tags,
      screenshot_tags: screenshotTags,
      collections,
      collection_screenshots: collectionScreenshots,
      reminders,
      processed_assets: processedAssets,
      preferences,
    },
    null,
    2,
  );
}

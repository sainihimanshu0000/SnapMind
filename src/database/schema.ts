export const SCHEMA_VERSION = 3;

export const CREATE_TABLES_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS screenshots (
  id TEXT PRIMARY KEY NOT NULL,
  imageUri TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  ocrText TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  intent TEXT,
  notes TEXT,
  sourceUrl TEXT,
  isFavorite INTEGER NOT NULL DEFAULT 0,
  isTemporary INTEGER NOT NULL DEFAULT 0,
  reminderDate TEXT,
  collectionId TEXT,
  sourceAssetId TEXT,
  processingStatus TEXT NOT NULL DEFAULT 'processed',
  documentType TEXT,
  extractedFieldsJson TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS screenshot_tags (
  screenshotId TEXT NOT NULL,
  tagId TEXT NOT NULL,
  PRIMARY KEY (screenshotId, tagId),
  FOREIGN KEY (screenshotId) REFERENCES screenshots(id) ON DELETE CASCADE,
  FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collection_screenshots (
  collectionId TEXT NOT NULL,
  screenshotId TEXT NOT NULL,
  PRIMARY KEY (collectionId, screenshotId),
  FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (screenshotId) REFERENCES screenshots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL,
  screenshotId TEXT NOT NULL,
  reminderDate TEXT NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (screenshotId) REFERENCES screenshots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_screenshots_createdAt ON screenshots(createdAt);
CREATE INDEX IF NOT EXISTS idx_screenshots_category ON screenshots(category);
CREATE INDEX IF NOT EXISTS idx_screenshots_intent ON screenshots(intent);
CREATE INDEX IF NOT EXISTS idx_screenshots_isFavorite ON screenshots(isFavorite);
CREATE INDEX IF NOT EXISTS idx_screenshots_ocrText ON screenshots(ocrText);
CREATE INDEX IF NOT EXISTS idx_screenshots_documentType ON screenshots(documentType);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminderDate);

CREATE TABLE IF NOT EXISTS processed_assets (
  photoAssetId TEXT PRIMARY KEY NOT NULL,
  processedAt TEXT NOT NULL,
  status TEXT NOT NULL,
  screenshotId TEXT
);

CREATE INDEX IF NOT EXISTS idx_processed_assets_status ON processed_assets(status);
CREATE INDEX IF NOT EXISTS idx_screenshots_sourceAssetId ON screenshots(sourceAssetId);

CREATE TABLE IF NOT EXISTS field_corrections (
  id TEXT PRIMARY KEY NOT NULL,
  screenshotId TEXT NOT NULL,
  fieldKey TEXT NOT NULL,
  predictedValue TEXT,
  correctedValue TEXT NOT NULL,
  documentType TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (screenshotId) REFERENCES screenshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_field_corrections_screenshotId ON field_corrections(screenshotId);
`;

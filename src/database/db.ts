import { open, type DB } from '@op-engineering/op-sqlite';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';

const DB_NAME = 'snapmind.sqlite';

let database: DB | null = null;
let initPromise: Promise<DB> | null = null;

function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
}

async function tableHasColumn(
  db: DB,
  table: string,
  column: string,
): Promise<boolean> {
  const result = await db.execute(`PRAGMA table_info(${table})`);
  return result.rows.some(row => String(row.name) === column);
}

async function migrate(db: DB): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  const result = await db.execute(
    `SELECT value FROM meta WHERE key = ? LIMIT 1`,
    ['schema_version'],
  );
  let currentVersion = Number(result.rows[0]?.value ?? 0);

  if (currentVersion < 1) {
    for (const statement of splitStatements(CREATE_TABLES_SQL)) {
      await db.execute(statement);
    }
    currentVersion = 1;
  }

  if (currentVersion < 2) {
    const hasSource = await tableHasColumn(db, 'screenshots', 'sourceAssetId');
    if (!hasSource) {
      await db.execute(`ALTER TABLE screenshots ADD COLUMN sourceAssetId TEXT`);
    }
    const hasStatus = await tableHasColumn(db, 'screenshots', 'processingStatus');
    if (!hasStatus) {
      await db.execute(
        `ALTER TABLE screenshots ADD COLUMN processingStatus TEXT NOT NULL DEFAULT 'processed'`,
      );
    }
    await db.execute(`
      CREATE TABLE IF NOT EXISTS processed_assets (
        photoAssetId TEXT PRIMARY KEY NOT NULL,
        processedAt TEXT NOT NULL,
        status TEXT NOT NULL,
        screenshotId TEXT
      );
    `);
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_processed_assets_status ON processed_assets(status)`,
    );
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_screenshots_sourceAssetId ON screenshots(sourceAssetId)`,
    );
    currentVersion = 2;
  }

  if (currentVersion < SCHEMA_VERSION) {
    for (const statement of splitStatements(CREATE_TABLES_SQL)) {
      await db.execute(statement);
    }
    currentVersion = SCHEMA_VERSION;
  }

  await db.execute(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ['schema_version', String(currentVersion)],
  );
}

export async function getDatabase(): Promise<DB> {
  if (database) {
    return database;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const db = open({ name: DB_NAME });
      await db.execute('PRAGMA foreign_keys = ON');
      await migrate(db);
      database = db;
      return db;
    })().catch(error => {
      initPromise = null;
      database = null;
      throw error;
    });
  }

  return initPromise;
}

export async function closeDatabase(): Promise<void> {
  if (database) {
    database.close();
    database = null;
    initPromise = null;
  }
}

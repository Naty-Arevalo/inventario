import { DatabaseSync } from "node:sqlite";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "inventario.db");

const globalForDb = globalThis as unknown as {
  __inventarioDb?: DatabaseSync;
};

export function getDb(): DatabaseSync {
  if (!globalForDb.__inventarioDb) {
    const db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode=WAL");
    db.exec("PRAGMA foreign_keys=ON");
    migrate(db);
    globalForDb.__inventarioDb = db;
  }
  return globalForDb.__inventarioDb;
}

export function plain<T>(rows: T[]): T[] {
  return JSON.parse(JSON.stringify(rows));
}

export function plainOne<T>(row: T | undefined): T | undefined {
  if (!row) return undefined;
  return JSON.parse(JSON.stringify(row));
}

export function upsertFilas(
  tabla: "inventarios" | "mercaderia",
  fecha: string,
  datos: { producto_id: number; cantidad: number }[]
): void {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO ${tabla} (fecha, producto_id, cantidad) VALUES (?, ?, ?)
     ON CONFLICT(fecha, producto_id) DO UPDATE SET cantidad = excluded.cantidad`
  );
  db.exec("BEGIN");
  try {
    for (const d of datos) {
      upsert.run(fecha, d.producto_id, d.cantidad);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      stock_minimo INTEGER NOT NULL DEFAULT 5,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
      UNIQUE(fecha, producto_id)
    );

    CREATE TABLE IF NOT EXISTS mercaderia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
      UNIQUE(fecha, producto_id)
    );

    CREATE INDEX IF NOT EXISTS idx_inventarios_producto ON inventarios(producto_id);
    CREATE INDEX IF NOT EXISTS idx_mercaderia_producto ON mercaderia(producto_id);
  `);
}

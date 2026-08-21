import { createClient, type Client, type InValue } from "@libsql/client";

const globalForDb = globalThis as unknown as {
  __inventarioClient?: Client;
  __inventarioSchema?: boolean;
};

export function getDb(): Client {
  if (!globalForDb.__inventarioClient) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
      throw new Error(
        "Faltan las variables de entorno TURSO_DATABASE_URL y TURSO_AUTH_TOKEN"
      );
    }
    globalForDb.__inventarioClient = createClient({ url, authToken });
  }
  return globalForDb.__inventarioClient;
}

async function ensureSchema(): Promise<void> {
  if (globalForDb.__inventarioSchema) return;
  await getDb().executeMultiple(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      stock_minimo INTEGER NOT NULL DEFAULT 5
    );

    CREATE TABLE IF NOT EXISTS inventarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 0,
      UNIQUE(fecha, producto_id)
    );

    CREATE TABLE IF NOT EXISTS mercaderia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 0,
      UNIQUE(fecha, producto_id)
    );

    CREATE INDEX IF NOT EXISTS idx_inventarios_producto ON inventarios(producto_id);
    CREATE INDEX IF NOT EXISTS idx_mercaderia_producto ON mercaderia(producto_id);
  `);
  globalForDb.__inventarioSchema = true;
}

export async function queryAll<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  await ensureSchema();
  const res = await getDb().execute({ sql, args });
  return res.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    res.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

export async function queryOne<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  const rows = await queryAll<T>(sql, args);
  return rows[0];
}

export async function run(sql: string, args: InValue[] = []): Promise<void> {
  await ensureSchema();
  await getDb().execute({ sql, args });
}

export async function upsertFilas(
  tabla: "inventarios" | "mercaderia",
  fecha: string,
  datos: { producto_id: number; cantidad: number }[]
): Promise<void> {
  if (datos.length === 0) return;
  await ensureSchema();
  const stmts = datos.map((d) => ({
    sql: `INSERT INTO ${tabla} (fecha, producto_id, cantidad) VALUES (?, ?, ?)
          ON CONFLICT(fecha, producto_id) DO UPDATE SET cantidad = excluded.cantidad`,
    args: [fecha, d.producto_id, d.cantidad] as InValue[],
  }));
  await getDb().batch(stmts, "write");
}

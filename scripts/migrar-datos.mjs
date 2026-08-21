import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createClient } from "@libsql/client";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.TURSO_DATABASE_URL;
const authToken = env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Completá TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en .env.local primero");
  process.exit(1);
}

const local = new DatabaseSync(path.join(process.cwd(), "data", "inventario.db"), {
  readOnly: true,
});
const turso = createClient({ url, authToken });

await turso.executeMultiple(`
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
`);

async function copiar(tabla, columnas) {
  const filas = local.prepare(`SELECT ${columnas.join(", ")} FROM ${tabla}`).all();
  if (filas.length === 0) {
    console.log(`${tabla}: 0 filas`);
    return;
  }
  const placeholders = columnas.map(() => "?").join(", ");
  const stmts = filas.map((f) => ({
    sql: `INSERT INTO ${tabla} (${columnas.join(", ")}) VALUES (${placeholders})`,
    args: columnas.map((c) => f[c]),
  }));
  await turso.batch(stmts, "write");
  console.log(`${tabla}: ${filas.length} filas copiadas`);
}

await copiar("categorias", ["id", "nombre"]);
await copiar("productos", ["id", "categoria_id", "nombre", "stock_minimo"]);
await copiar("inventarios", ["fecha", "producto_id", "cantidad"]);
await copiar("mercaderia", ["fecha", "producto_id", "cantidad"]);

console.log("Migración completa");

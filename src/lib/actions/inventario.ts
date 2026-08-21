"use server";

import { getDb, plain, plainOne, upsertFilas } from "@/lib/db";

export async function getInventarioPorFecha(
  fecha: string
): Promise<{ producto_id: number; cantidad: number }[]> {
  const db = getDb();
  return plain(
    db
      .prepare("SELECT producto_id, cantidad FROM inventarios WHERE fecha = ?")
      .all(fecha) as { producto_id: number; cantidad: number }[]
  );
}

export async function getFechasInventario(): Promise<string[]> {
  const db = getDb();
  const rows = db
    .prepare("SELECT DISTINCT fecha FROM inventarios ORDER BY fecha DESC")
    .all() as { fecha: string }[];
  return plain(rows).map((r) => r.fecha);
}

export async function guardarInventario(
  fecha: string,
  datos: { producto_id: number; cantidad: number }[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    upsertFilas("inventarios", fecha, datos);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function getUltimoInventarioAnterior(
  fecha: string
): Promise<{ fecha: string | null; items: { producto_id: number; cantidad: number }[] }> {
  const db = getDb();
  const row = plainOne(
    db.prepare("SELECT MAX(fecha) as fecha FROM inventarios WHERE fecha < ?").get(fecha)
  ) as { fecha: string | null } | undefined;

  if (!row?.fecha) return { fecha: null, items: [] };

  const items = plain(
    db
      .prepare(
        `SELECT producto_id, cantidad FROM inventarios
         WHERE fecha = ?
         ORDER BY producto_id`
      )
      .all(row.fecha) as { producto_id: number; cantidad: number }[]
  );
  return { fecha: row.fecha, items };
}

export async function getMercaderiaEntreFechas(
  fechaDesde: string,
  fechaHasta: string
): Promise<{ producto_id: number; total: number }[]> {
  const db = getDb();
  return plain(
    db
      .prepare(
        `SELECT producto_id, SUM(cantidad) as total FROM mercaderia
         WHERE fecha >= ? AND fecha <= ?
         GROUP BY producto_id`
      )
      .all(fechaDesde, fechaHasta) as { producto_id: number; total: number }[]
  );
}

"use server";

import { queryAll, queryOne, upsertFilas } from "@/lib/db";

export async function getInventarioPorFecha(
  fecha: string
): Promise<{ producto_id: number; cantidad: number }[]> {
  return queryAll<{ producto_id: number; cantidad: number }>(
    "SELECT producto_id, cantidad FROM inventarios WHERE fecha = ?",
    [fecha]
  );
}

export async function getFechasInventario(): Promise<string[]> {
  const rows = await queryAll<{ fecha: string }>(
    "SELECT DISTINCT fecha FROM inventarios ORDER BY fecha DESC"
  );
  return rows.map((r) => r.fecha);
}

export async function guardarInventario(
  fecha: string,
  datos: { producto_id: number; cantidad: number }[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    await upsertFilas("inventarios", fecha, datos);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function getUltimoInventarioAnterior(
  fecha: string
): Promise<{ fecha: string | null; items: { producto_id: number; cantidad: number }[] }> {
  const row = await queryOne<{ fecha: string }>(
    "SELECT MAX(fecha) as fecha FROM inventarios WHERE fecha < ?",
    [fecha]
  );

  if (!row?.fecha) return { fecha: null, items: [] };

  const items = await queryAll<{ producto_id: number; cantidad: number }>(
    "SELECT producto_id, cantidad FROM inventarios WHERE fecha = ? ORDER BY producto_id",
    [row.fecha]
  );
  return { fecha: row.fecha, items };
}

export async function getMercaderiaEntreFechas(
  fechaDesde: string,
  fechaHasta: string
): Promise<{ producto_id: number; total: number }[]> {
  return queryAll<{ producto_id: number; total: number }>(
    `SELECT producto_id, SUM(cantidad) as total FROM mercaderia
     WHERE fecha >= ? AND fecha <= ?
     GROUP BY producto_id`,
    [fechaDesde, fechaHasta]
  );
}

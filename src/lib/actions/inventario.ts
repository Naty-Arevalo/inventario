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

export interface InventarioHistorial {
  fecha: string;
  items: {
    producto_id: number;
    producto_nombre: string;
    categoria_nombre: string;
    cantidad: number;
  }[];
}

export async function getUltimos4Inventarios(): Promise<InventarioHistorial[]> {
  const fechas = await queryAll<{ fecha: string }>(
    "SELECT DISTINCT fecha FROM inventarios ORDER BY fecha DESC LIMIT 4"
  );

  if (fechas.length === 0) return [];

  const resultados = await Promise.all(
    fechas.map(async (f) => {
      const items = await queryAll<{
        producto_id: number;
        producto_nombre: string;
        categoria_nombre: string;
        cantidad: number;
      }>(
        `SELECT i.producto_id, p.nombre as producto_nombre, c.nombre as categoria_nombre, i.cantidad
         FROM inventarios i
         JOIN productos p ON i.producto_id = p.id
         JOIN categorias c ON p.categoria_id = c.id
         WHERE i.fecha = ?
         ORDER BY c.nombre, p.nombre`,
        [f.fecha]
      );
      return { fecha: f.fecha, items };
    })
  );

  return resultados;
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

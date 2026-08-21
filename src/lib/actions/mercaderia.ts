"use server";

import { queryAll, queryOne, upsertFilas } from "@/lib/db";

export async function getMercaderiaPorFecha(
  fecha: string
): Promise<{ producto_id: number; cantidad: number }[]> {
  return queryAll<{ producto_id: number; cantidad: number }>(
    "SELECT producto_id, cantidad FROM mercaderia WHERE fecha = ?",
    [fecha]
  );
}

export async function getFechasMercaderia(): Promise<string[]> {
  const rows = await queryAll<{ fecha: string }>(
    "SELECT DISTINCT fecha FROM mercaderia ORDER BY fecha DESC"
  );
  return rows.map((r) => r.fecha);
}

export async function guardarMercaderia(
  fecha: string,
  datos: { producto_id: number; cantidad: number }[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    await upsertFilas("mercaderia", fecha, datos);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function getMercaderiaAcumulada(): Promise<{ producto_id: number; total: number }[]> {
  const ultimaFecha = await queryOne<{ fecha: string }>(
    "SELECT MAX(fecha) as fecha FROM inventarios"
  );

  if (!ultimaFecha?.fecha) {
    return queryAll<{ producto_id: number; total: number }>(
      "SELECT producto_id, SUM(cantidad) as total FROM mercaderia GROUP BY producto_id"
    );
  }

  return queryAll<{ producto_id: number; total: number }>(
    `SELECT producto_id, SUM(cantidad) as total FROM mercaderia
     WHERE fecha >= ? GROUP BY producto_id`,
    [ultimaFecha.fecha]
  );
}

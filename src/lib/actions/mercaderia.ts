"use server";

import { getDb, plain, plainOne, upsertFilas } from "@/lib/db";

export async function getMercaderiaPorFecha(
  fecha: string
): Promise<{ producto_id: number; cantidad: number }[]> {
  const db = getDb();
  return plain(
    db
      .prepare("SELECT producto_id, cantidad FROM mercaderia WHERE fecha = ?")
      .all(fecha) as { producto_id: number; cantidad: number }[]
  );
}

export async function getFechasMercaderia(): Promise<string[]> {
  const db = getDb();
  const rows = db
    .prepare("SELECT DISTINCT fecha FROM mercaderia ORDER BY fecha DESC")
    .all() as { fecha: string }[];
  return plain(rows).map((r) => r.fecha);
}

export async function guardarMercaderia(
  fecha: string,
  datos: { producto_id: number; cantidad: number }[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    upsertFilas("mercaderia", fecha, datos);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function getMercaderiaAcumulada(): Promise<{ producto_id: number; total: number }[]> {
  const db = getDb();
  const ultimaFecha = plainOne(
    db.prepare("SELECT MAX(fecha) as fecha FROM inventarios").get()
  ) as { fecha: string | null } | undefined;

  if (!ultimaFecha?.fecha) {
    return plain(
      db
        .prepare("SELECT producto_id, SUM(cantidad) as total FROM mercaderia GROUP BY producto_id")
        .all() as { producto_id: number; total: number }[]
    );
  }

  return plain(
    db
      .prepare(
        `SELECT producto_id, SUM(cantidad) as total FROM mercaderia
         WHERE fecha >= ? GROUP BY producto_id`
      )
      .all(ultimaFecha.fecha) as { producto_id: number; total: number }[]
  );
}

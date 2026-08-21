"use server";

import { getDb, plain, plainOne } from "@/lib/db";
import type { InventarioCompleto } from "@/lib/types";

export async function getStockTotal(): Promise<InventarioCompleto[]> {
  const db = getDb();

  const productos = plain(
    db
      .prepare(
        `SELECT p.id as producto_id, p.nombre as producto_nombre, c.nombre as categoria_nombre,
                p.stock_minimo
         FROM productos p JOIN categorias c ON p.categoria_id = c.id
         ORDER BY c.nombre, p.nombre`
      )
      .all() as {
      producto_id: number;
      producto_nombre: string;
      categoria_nombre: string;
      stock_minimo: number;
    }[]
  );

  const ultimaFecha = plainOne(
    db.prepare("SELECT MAX(fecha) as fecha FROM inventarios").get()
  ) as { fecha: string | null } | undefined;

  const mapaInv = new Map<number, number>();
  const mapaMerc = new Map<number, number>();

  if (ultimaFecha?.fecha) {
    const invs = db
      .prepare(
        "SELECT producto_id, cantidad FROM inventarios WHERE fecha = ?"
      )
      .all(ultimaFecha.fecha) as { producto_id: number; cantidad: number }[];
    for (const i of invs) mapaInv.set(i.producto_id, i.cantidad);

    const mercs = db
      .prepare(
        "SELECT producto_id, SUM(cantidad) as total FROM mercaderia WHERE fecha >= ? GROUP BY producto_id"
      )
      .all(ultimaFecha.fecha) as { producto_id: number; total: number }[];
    for (const m of mercs) mapaMerc.set(m.producto_id, m.total);
  } else {
    const mercs = db
      .prepare(
        "SELECT producto_id, SUM(cantidad) as total FROM mercaderia GROUP BY producto_id"
      )
      .all() as { producto_id: number; total: number }[];
    for (const m of mercs) mapaMerc.set(m.producto_id, m.total);
  }

  return productos.map((p) => ({
    producto_id: p.producto_id,
    producto_nombre: p.producto_nombre,
    categoria_nombre: p.categoria_nombre,
    inventario_anterior: mapaInv.get(p.producto_id) ?? 0,
    mercaderia_recibida: mapaMerc.get(p.producto_id) ?? 0,
    nuevo_conteo: null,
    stock_minimo: p.stock_minimo,
  }));
}

export async function getProductosBajoStock(): Promise<
  { nombre: string; categoria: string; cantidad: number; stock_minimo: number }[]
> {
  const db = getDb();
  const ultimaFecha = plainOne(
    db.prepare("SELECT MAX(fecha) as fecha FROM inventarios").get()
  ) as { fecha: string | null } | undefined;

  if (!ultimaFecha?.fecha) return [];

  return plain(
    db
      .prepare(
        `SELECT p.nombre, c.nombre as categoria,
                COALESCE(i.cantidad, 0) + COALESCE(m.ingresado, 0) as cantidad,
                p.stock_minimo
         FROM productos p
         JOIN categorias c ON p.categoria_id = c.id
         LEFT JOIN inventarios i ON i.producto_id = p.id AND i.fecha = ?
         LEFT JOIN (
           SELECT producto_id, SUM(cantidad) as ingresado FROM mercaderia
           WHERE fecha >= ? GROUP BY producto_id
         ) m ON m.producto_id = p.id
         WHERE COALESCE(i.cantidad, 0) + COALESCE(m.ingresado, 0) <= p.stock_minimo
         ORDER BY cantidad ASC`
      )
      .all(ultimaFecha.fecha, ultimaFecha.fecha) as {
      nombre: string;
      categoria: string;
      cantidad: number;
      stock_minimo: number;
    }[]
  );
}

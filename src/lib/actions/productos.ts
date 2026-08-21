"use server";

import { getDb, plain } from "@/lib/db";
import type { Producto } from "@/lib/types";

export async function getProductos(categoriaId?: number): Promise<Producto[]> {
  const db = getDb();
  if (categoriaId) {
    return plain(
      db
        .prepare(
          `SELECT p.id, p.categoria_id, p.nombre, p.stock_minimo, c.nombre as categoria_nombre
           FROM productos p JOIN categorias c ON p.categoria_id = c.id
           WHERE p.categoria_id = ? ORDER BY p.nombre`
        )
        .all(categoriaId) as Producto[]
    );
  }
  return plain(
    db
      .prepare(
        `SELECT p.id, p.categoria_id, p.nombre, p.stock_minimo, c.nombre as categoria_nombre
         FROM productos p JOIN categorias c ON p.categoria_id = c.id
         ORDER BY c.nombre, p.nombre`
      )
      .all() as Producto[]
  );
}

export async function crearProducto(
  categoriaId: number,
  nombre: string,
  stockMinimo: number = 5
): Promise<{ ok: boolean; error?: string }> {
  if (!nombre.trim()) return { ok: false, error: "El nombre es requerido" };
  if (!categoriaId) return { ok: false, error: "Seleccioná una categoría" };
  const db = getDb();
  try {
    db.prepare("INSERT INTO productos (categoria_id, nombre, stock_minimo) VALUES (?, ?, ?)").run(
      categoriaId,
      nombre.trim(),
      stockMinimo
    );
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function actualizarProducto(
  id: number,
  nombre: string,
  stockMinimo: number
): Promise<{ ok: boolean; error?: string }> {
  if (!nombre.trim()) return { ok: false, error: "El nombre es requerido" };
  const db = getDb();
  try {
    db.prepare("UPDATE productos SET nombre = ?, stock_minimo = ? WHERE id = ?").run(
      nombre.trim(),
      stockMinimo,
      id
    );
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function eliminarProducto(id: number): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  try {
    db.prepare("DELETE FROM productos WHERE id = ?").run(id);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

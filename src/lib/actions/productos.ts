"use server";

import { queryAll, run } from "@/lib/db";
import type { Producto } from "@/lib/types";

export async function getProductos(categoriaId?: number): Promise<Producto[]> {
  if (categoriaId) {
    return queryAll<Producto>(
      `SELECT p.id, p.categoria_id, p.nombre, p.stock_minimo, c.nombre as categoria_nombre
       FROM productos p JOIN categorias c ON p.categoria_id = c.id
       WHERE p.categoria_id = ? ORDER BY p.nombre`,
      [categoriaId]
    );
  }
  return queryAll<Producto>(
    `SELECT p.id, p.categoria_id, p.nombre, p.stock_minimo, c.nombre as categoria_nombre
     FROM productos p JOIN categorias c ON p.categoria_id = c.id
     ORDER BY c.nombre, p.nombre`
  );
}

export async function crearProducto(
  categoriaId: number,
  nombre: string,
  stockMinimo: number = 5
): Promise<{ ok: boolean; error?: string }> {
  if (!nombre.trim()) return { ok: false, error: "El nombre es requerido" };
  if (!categoriaId) return { ok: false, error: "Seleccioná una categoría" };
  try {
    await run(
      "INSERT INTO productos (categoria_id, nombre, stock_minimo) VALUES (?, ?, ?)",
      [categoriaId, nombre.trim(), stockMinimo]
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
  try {
    await run("UPDATE productos SET nombre = ?, stock_minimo = ? WHERE id = ?", [
      nombre.trim(),
      stockMinimo,
      id,
    ]);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function eliminarProducto(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await run("DELETE FROM inventarios WHERE producto_id = ?", [id]);
    await run("DELETE FROM mercaderia WHERE producto_id = ?", [id]);
    await run("DELETE FROM productos WHERE id = ?", [id]);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

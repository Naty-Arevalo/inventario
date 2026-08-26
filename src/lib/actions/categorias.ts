"use server";

import { queryAll, run } from "@/lib/db";
import type { Categoria } from "@/lib/types";

export async function getCategorias(): Promise<Categoria[]> {
  return queryAll<Categoria>("SELECT id, nombre FROM categorias ORDER BY nombre");
}

export async function crearCategoria(nombre: string): Promise<{ ok: boolean; error?: string }> {
  if (!nombre.trim()) return { ok: false, error: "El nombre es requerido" };
  try {
    await run("INSERT INTO categorias (nombre) VALUES (?)", [nombre.trim()]);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) return { ok: false, error: "Ya existe una categoría con ese nombre" };
    return { ok: false, error: msg };
  }
}

export async function eliminarCategoria(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const productos = await queryAll<{ id: number }>(
      "SELECT id FROM productos WHERE categoria_id = ?",
      [id]
    );
    for (const p of productos) {
      await run("DELETE FROM inventarios WHERE producto_id = ?", [p.id]);
      await run("DELETE FROM mercaderia WHERE producto_id = ?", [p.id]);
    }
    await run("DELETE FROM productos WHERE categoria_id = ?", [id]);
    await run("DELETE FROM categorias WHERE id = ?", [id]);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

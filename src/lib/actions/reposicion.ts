"use server";

import { queryAll } from "@/lib/db";
import type { SugerenciaReposicion } from "@/lib/types";

function diasEntre(desde: string, hasta: string): number {
  const [d1, m1, a1] = desde.split("-").map(Number);
  const [d2, m2, a2] = hasta.split("-").map(Number);
  return Math.round(
    (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000
  );
}

export async function getSugerenciaReposicion(
  diasCobertura: number = 14
): Promise<SugerenciaReposicion[]> {
  const [productos, inventarios, mercaderias] = await Promise.all([
    queryAll<{
      producto_id: number;
      nombre: string;
      categoria_nombre: string;
      stock_minimo: number;
    }>(
      `SELECT p.id as producto_id, p.nombre, c.nombre as categoria_nombre,
              p.stock_minimo
       FROM productos p JOIN categorias c ON p.categoria_id = c.id
       ORDER BY c.nombre, p.nombre`
    ),
    queryAll<{ producto_id: number; fecha: string; cantidad: number }>(
      "SELECT producto_id, fecha, cantidad FROM inventarios ORDER BY fecha DESC"
    ),
    queryAll<{ producto_id: number; fecha: string; cantidad: number }>(
      "SELECT producto_id, fecha, cantidad FROM mercaderia"
    ),
  ]);

  if (inventarios.length === 0) return [];

  const invPorProducto = new Map<
    number,
    { fecha: string; cantidad: number }[]
  >();
  for (const i of inventarios) {
    const arr = invPorProducto.get(i.producto_id) ?? [];
    arr.push({ fecha: i.fecha, cantidad: i.cantidad });
    invPorProducto.set(i.producto_id, arr);
  }

  const mercPorProducto = new Map<
    number,
    { fecha: string; cantidad: number }[]
  >();
  for (const m of mercaderias) {
    const arr = mercPorProducto.get(m.producto_id) ?? [];
    arr.push({ fecha: m.fecha, cantidad: m.cantidad });
    mercPorProducto.set(m.producto_id, arr);
  }

  return productos.map((p) => {
    const conteos = invPorProducto.get(p.producto_id) ?? [];
    const ultima = conteos[0];
    const anterior = conteos[1];
    const merca = mercPorProducto.get(p.producto_id) ?? [];

    let merc_ultima = 0;
    let merc_anterior = 0;
    if (ultima) {
      for (const m of merca) {
        if (m.fecha >= ultima.fecha) {
          merc_ultima += m.cantidad;
        } else if (anterior && m.fecha > anterior.fecha) {
          merc_anterior += m.cantidad;
        }
      }
    } else {
      merc_ultima = merca.reduce((total, m) => total + m.cantidad, 0);
    }

    const inv_ultima = ultima?.cantidad ?? 0;
    const inv_anterior = anterior?.cantidad ?? null;
    const stock_actual = inv_ultima + merc_ultima;

    let consumo_diario: number | null = null;
    let objetivo = p.stock_minimo;

    if (anterior && ultima) {
      const dias = Math.max(diasEntre(anterior.fecha, ultima.fecha), 1);
      const consumido = Math.max(
        (inv_anterior ?? 0) + merc_anterior - inv_ultima,
        0
      );
      consumo_diario = consumido / dias;
      objetivo = Math.max(
        p.stock_minimo,
        Math.ceil(consumo_diario * diasCobertura)
      );
    }

    return {
      producto_id: p.producto_id,
      nombre: p.nombre,
      categoria_nombre: p.categoria_nombre,
      stock_actual,
      consumo_diario,
      dias_restantes:
        consumo_diario && consumo_diario > 0
          ? Math.floor(stock_actual / consumo_diario)
          : null,
      stock_minimo: p.stock_minimo,
      sugerido: Math.max(0, objetivo - stock_actual),
    };
  });
}

"use server";

import { getDb, plain } from "@/lib/db";
import type { SugerenciaReposicion } from "@/lib/types";

interface FilaCalculo {
  producto_id: number;
  nombre: string;
  categoria_nombre: string;
  inv_ultima: number;
  inv_anterior: number | null;
  merc_ultima: number;
  merc_anterior: number;
  stock_minimo: number;
}

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
  const db = getDb();

  const fechas = (
    db
      .prepare("SELECT DISTINCT fecha FROM inventarios ORDER BY fecha DESC")
      .all() as { fecha: string }[]
  ).map((r) => r.fecha);

  if (fechas.length === 0) return [];

  const ultima = fechas[0];
  const anterior = fechas.length > 1 ? fechas[1] : null;

  const rows = plain(
    db
      .prepare(
        `SELECT p.id as producto_id, p.nombre, c.nombre as categoria_nombre,
                COALESCE(iu.cantidad, 0) as inv_ultima,
                ia.cantidad as inv_anterior,
                COALESCE(mu.ingresado, 0) as merc_ultima,
                COALESCE(ma.ingresado, 0) as merc_anterior,
                p.stock_minimo
         FROM productos p
         JOIN categorias c ON p.categoria_id = c.id
         LEFT JOIN inventarios iu ON iu.producto_id = p.id AND iu.fecha = ?
         LEFT JOIN inventarios ia ON ia.producto_id = p.id AND ia.fecha = ?
         LEFT JOIN (
           SELECT producto_id, SUM(cantidad) as ingresado FROM mercaderia
           WHERE fecha >= ? GROUP BY producto_id
         ) mu ON mu.producto_id = p.id
         LEFT JOIN (
           SELECT producto_id, SUM(cantidad) as ingresado FROM mercaderia
           WHERE fecha > ? AND fecha <= ? GROUP BY producto_id
         ) ma ON ma.producto_id = p.id
         ORDER BY c.nombre, p.nombre`
      )
      .all(ultima, anterior ?? "", ultima, anterior ?? "", ultima) as FilaCalculo[]
  );

  const dias = anterior ? Math.max(diasEntre(anterior, ultima), 1) : null;

  return rows.map((r) => {
    const stock_actual = r.inv_ultima + r.merc_ultima;

    let consumo_diario: number | null = null;
    let objetivo = r.stock_minimo;

    // Solo proyectar consumo si el producto fue contado en ambas fechas
    if (anterior && dias && r.inv_anterior !== null) {
      const consumido = Math.max(
        r.inv_anterior + r.merc_anterior - r.inv_ultima,
        0
      );
      consumo_diario = consumido / dias;
      objetivo = Math.max(
        r.stock_minimo,
        Math.ceil(consumo_diario * diasCobertura)
      );
    }

    return {
      producto_id: r.producto_id,
      nombre: r.nombre,
      categoria_nombre: r.categoria_nombre,
      stock_actual,
      consumo_diario,
      dias_restantes:
        consumo_diario && consumo_diario > 0
          ? Math.floor(stock_actual / consumo_diario)
          : null,
      stock_minimo: r.stock_minimo,
      sugerido: Math.max(0, objetivo - stock_actual),
    };
  });
}

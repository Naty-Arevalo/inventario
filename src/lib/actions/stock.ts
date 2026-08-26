"use server";

import { queryAll } from "@/lib/db";
import type { InventarioCompleto } from "@/lib/types";

interface StockProducto {
  inventario: number;
  mercaderia: number;
}

async function calcularStockPorProducto(): Promise<Map<number, StockProducto>> {
  const [ultimosInv, mercDesdeInv, todaMerc] = await Promise.all([
    queryAll<{ producto_id: number; cantidad: number }>(
      `SELECT i.producto_id, i.cantidad
       FROM inventarios i
       JOIN (SELECT producto_id, MAX(fecha) as fecha FROM inventarios GROUP BY producto_id) u
         ON u.producto_id = i.producto_id AND u.fecha = i.fecha`
    ),
    queryAll<{ producto_id: number; total: number }>(
      `SELECT m.producto_id, SUM(m.cantidad) as total
       FROM mercaderia m
       JOIN (SELECT producto_id, MAX(fecha) as fecha FROM inventarios GROUP BY producto_id) u
         ON u.producto_id = m.producto_id AND m.fecha >= u.fecha
       GROUP BY m.producto_id`
    ),
    queryAll<{ producto_id: number; total: number }>(
      "SELECT producto_id, SUM(cantidad) as total FROM mercaderia GROUP BY producto_id"
    ),
  ]);

  const mapa = new Map<number, StockProducto>();

  // Paso 1: Productos con inventario arrancan con mercadería = 0
  for (const i of ultimosInv) {
    mapa.set(i.producto_id, { inventario: i.cantidad, mercaderia: 0 });
  }

  // Paso 2: Productos SIN inventario usan toda la mercadería histórica
  for (const t of todaMerc) {
    if (!mapa.has(t.producto_id)) {
      mapa.set(t.producto_id, { inventario: 0, mercaderia: t.total ?? 0 });
    }
  }

  // Paso 3: Sobrescribir mercadería con lo recibido DESPUÉS del último inventario
  for (const m of mercDesdeInv) {
    const actual = mapa.get(m.producto_id) ?? { inventario: 0, mercaderia: 0 };
    mapa.set(m.producto_id, { ...actual, mercaderia: m.total ?? 0 });
  }

  return mapa;
}

async function getProductosConCategoria() {
  return queryAll<{
    producto_id: number;
    producto_nombre: string;
    categoria_nombre: string;
    stock_minimo: number;
  }>(
    `SELECT p.id as producto_id, p.nombre as producto_nombre, c.nombre as categoria_nombre,
            p.stock_minimo
     FROM productos p JOIN categorias c ON p.categoria_id = c.id
     ORDER BY c.nombre, p.nombre`
  );
}

export async function getStockTotal(): Promise<InventarioCompleto[]> {
  const [productos, stocks] = await Promise.all([
    getProductosConCategoria(),
    calcularStockPorProducto(),
  ]);

  return productos.map((p) => {
    const s = stocks.get(p.producto_id) ?? { inventario: 0, mercaderia: 0 };
    return {
      producto_id: p.producto_id,
      producto_nombre: p.producto_nombre,
      categoria_nombre: p.categoria_nombre,
      inventario_anterior: s.inventario,
      mercaderia_recibida: s.mercaderia,
      nuevo_conteo: null,
      stock_minimo: p.stock_minimo,
    };
  });
}

export async function getProductosBajoStock(): Promise<
  { nombre: string; categoria: string; cantidad: number; stock_minimo: number }[]
> {
  const [productos, stocks] = await Promise.all([
    getProductosConCategoria(),
    calcularStockPorProducto(),
  ]);

  return productos
    .map((p) => {
      const s = stocks.get(p.producto_id) ?? { inventario: 0, mercaderia: 0 };
      return {
        nombre: p.producto_nombre,
        categoria: p.categoria_nombre,
        cantidad: s.inventario + s.mercaderia,
        stock_minimo: p.stock_minimo,
      };
    })
    .filter((p) => p.cantidad <= p.stock_minimo)
    .sort((a, b) => a.cantidad - b.cantidad);
}

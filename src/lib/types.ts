export interface Categoria {
  id: number;
  nombre: string;
}

export interface Producto {
  id: number;
  categoria_id: number;
  nombre: string;
  stock_minimo: number;
  categoria_nombre?: string;
}

export interface InventarioRow {
  id: number;
  fecha: string;
  producto_id: number;
  cantidad: number;
  producto_nombre?: string;
  categoria_nombre?: string;
}

export interface MercaderiaRow {
  id: number;
  fecha: string;
  producto_id: number;
  cantidad: number;
  producto_nombre?: string;
  categoria_nombre?: string;
}

export interface InventarioCompleto {
  producto_id: number;
  producto_nombre: string;
  categoria_nombre: string;
  inventario_anterior: number;
  mercaderia_recibida: number;
  nuevo_conteo: number | null;
  stock_minimo: number;
}

export interface ResumenFecha {
  fecha: string;
  total_productos: number;
}

export interface SugerenciaReposicion {
  producto_id: number;
  nombre: string;
  categoria_nombre: string;
  stock_actual: number;
  consumo_diario: number | null;
  dias_restantes: number | null;
  stock_minimo: number;
  sugerido: number;
}

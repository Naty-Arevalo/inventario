"use client";

import { useEffect, useState, useCallback } from "react";
import { getCategorias } from "@/lib/actions/categorias";
import { getProductos } from "@/lib/actions/productos";
import { getMercaderiaPorFecha, getFechasMercaderia, guardarMercaderia } from "@/lib/actions/mercaderia";
import { normalizarTexto } from "@/lib/utils";
import type { Categoria, Producto } from "@/lib/types";

export default function MercaderiaPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [catSeleccionada, setCatSeleccionada] = useState<number | null>(null);
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [fechasExistentes, setFechasExistentes] = useState<string[]>([]);
  const [fechaBusqueda, setFechaBusqueda] = useState("");
  const [modoBusqueda, setModoBusqueda] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async (fechaSel?: string) => {
    const [cats, fex] = await Promise.all([
      getCategorias(),
      getFechasMercaderia(),
    ]);
    setCategorias(cats);
    setFechasExistentes(fex);

    if (fechaSel) {
      const existentes = await getMercaderiaPorFecha(fechaSel);
      const mapa: Record<number, number> = {};
      existentes.forEach((e) => (mapa[e.producto_id] = e.cantidad));
      setCantidades(mapa);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (catSeleccionada) {
      getProductos(catSeleccionada).then(setProductos);
    } else {
      setProductos([]);
    }
  }, [catSeleccionada]);

  useEffect(() => {
    if (modoBusqueda && fechaBusqueda) {
      setFecha(fechaBusqueda);
      cargarDatos(fechaBusqueda);
    }
  }, [fechaBusqueda, modoBusqueda, cargarDatos]);

  const handleCantidad = (productoId: number, valor: string) => {
    const num = parseInt(valor) || 0;
    setCantidades((prev) => ({ ...prev, [productoId]: num }));
  };

  const handleGuardar = async () => {
    setError(null);
    if (!fecha) {
      setError("Seleccioná una fecha");
      return;
    }
    const datos = Object.entries(cantidades)
      .filter(([, c]) => c > 0)
      .map(([pid, cantidad]) => ({ producto_id: parseInt(pid), cantidad }));

    if (datos.length === 0) {
      setError("Cargá al menos una cantidad");
      return;
    }

    setGuardando(true);
    const res = await guardarMercaderia(fecha, datos);
    setGuardando(false);

    if (res.ok) {
      cargarDatos();
    } else {
      setError(res.error || "Error al guardar");
    }
  };

  const termino = normalizarTexto(busqueda.trim());
  const productosFiltrados = termino
    ? productos.filter((p) => normalizarTexto(p.nombre).includes(termino))
    : productos;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-green-700 flex items-center gap-2">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Cargar Mercadería
      </h2>

      <div className="bg-white rounded-xl shadow border p-3 sm:p-4 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de carga</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setModoBusqueda(false);
                setCantidades({});
              }}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={catSeleccionada ?? ""}
              onChange={(e) => setCatSeleccionada(e.target.value ? parseInt(e.target.value) : null)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar producto</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full sm:w-48"
              placeholder="Nombre del producto..."
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Revisar fecha guardada
          </label>
          <select
            value={fechaBusqueda}
            onChange={(e) => {
              setFechaBusqueda(e.target.value);
              setModoBusqueda(true);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Seleccionar fecha...</option>
            {fechasExistentes.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {productos.length > 0 && (
        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-green-50 text-green-800">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Producto</th>
                <th className="text-center px-4 py-3 font-semibold w-32">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 sm:px-4 py-3 font-medium break-words">{p.nombre}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min={0}
                      value={cantidades[p.id] ?? ""}
                      onChange={(e) => handleCantidad(p.id, e.target.value)}
                      className="w-24 border rounded-lg px-2 py-1 text-center text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t bg-gray-50">
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold px-6 py-2 rounded-lg transition"
            >
              {guardando ? "Guardando..." : "Guardar Mercadería"}
            </button>
            {error && (
              <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
            )}
          </div>
        </div>
      )}

      {productos.length > 0 && productosFiltrados.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No hay productos que coincidan con la búsqueda
        </p>
      )}

      {productos.length === 0 && catSeleccionada && (
        <p className="text-gray-500 text-center py-8">No hay productos en esta categoría</p>
      )}

      {!catSeleccionada && (
        <p className="text-gray-400 text-center py-8">Seleccioná una categoría para ver los productos</p>
      )}
    </div>
  );
}

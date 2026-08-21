"use client";

import { useEffect, useState, useCallback } from "react";
import { getCategorias } from "@/lib/actions/categorias";
import { getProductos } from "@/lib/actions/productos";
import {
  getInventarioPorFecha,
  getFechasInventario,
  guardarInventario,
} from "@/lib/actions/inventario";
import { normalizarTexto } from "@/lib/utils";
import type { Categoria, Producto } from "@/lib/types";

interface FilaInventario {
  producto: Producto;
  nuevo_conteo: number;
}

export default function InventarioPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [catSeleccionada, setCatSeleccionada] = useState<number | null>(null);
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [fechasExistentes, setFechasExistentes] = useState<string[]>([]);
  const [fechaBusqueda, setFechaBusqueda] = useState("");
  const [modoBusqueda, setModoBusqueda] = useState(false);
  const [revisandoGuardado, setRevisandoGuardado] = useState(false);
  const [filas, setFilas] = useState<FilaInventario[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(
    async (fechaSel: string) => {
      const [cats, fex] = await Promise.all([
        getCategorias(),
        getFechasInventario(),
      ]);
      setCategorias(cats);
      setFechasExistentes(fex);

      if (catSeleccionada) {
        await cargarFilas(catSeleccionada, fechaSel, revisandoGuardado);
      }
    },
    [catSeleccionada, revisandoGuardado]
  );

  const cargarFilas = async (
    catId: number,
    fechaSel: string,
    prefill: boolean
  ) => {
    const prods = await getProductos(catId);

    // Solo precargar conteos guardados cuando se está revisando una fecha
    let mapaExistente: Record<number, number> = {};
    if (prefill) {
      const existente = await getInventarioPorFecha(fechaSel);
      existente.forEach((e) => (mapaExistente[e.producto_id] = e.cantidad));
    }

    const nuevasFilas: FilaInventario[] = prods.map((p) => ({
      producto: p,
      nuevo_conteo: mapaExistente[p.id] ?? 0,
    }));

    setFilas(nuevasFilas);
  };

  useEffect(() => {
    cargarDatos(fecha);
  }, []);

  useEffect(() => {
    if (modoBusqueda && fechaBusqueda) {
      setFecha(fechaBusqueda);
      cargarDatos(fechaBusqueda);
    }
  }, [fechaBusqueda, modoBusqueda, cargarDatos]);

  useEffect(() => {
    if (catSeleccionada) {
      cargarFilas(catSeleccionada, fecha, revisandoGuardado);
    } else {
      setFilas([]);
    }
  }, [catSeleccionada, fecha, revisandoGuardado]);

  const handleConteo = (productoId: number, valor: string) => {
    const num = parseInt(valor) || 0;
    setFilas((prev) =>
      prev.map((f) =>
        f.producto.id === productoId ? { ...f, nuevo_conteo: num } : f
      )
    );
  };

  const handleGuardar = async () => {
    setError(null);
    if (!fecha) {
      setError("Seleccioná una fecha");
      return;
    }
    const datos = filas
      .filter((f) => f.nuevo_conteo > 0)
      .map((f) => ({ producto_id: f.producto.id, cantidad: f.nuevo_conteo }));

    if (datos.length === 0) {
      setError("Cargá al menos un conteo");
      return;
    }

    setGuardando(true);
    const res = await guardarInventario(fecha, datos);
    setGuardando(false);

    if (res.ok) {
      cargarDatos(fecha);
    } else {
      setError(res.error || "Error al guardar");
    }
  };

  const termino = normalizarTexto(busqueda.trim());
  const filasFiltradas = termino
    ? filas.filter((f) => normalizarTexto(f.producto.nombre).includes(termino))
    : filas;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Hacer Inventario
      </h2>

      <div className="bg-white rounded-xl shadow border p-3 sm:p-4 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del inventario</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setModoBusqueda(false);
                setRevisandoGuardado(false);
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
              <option value="">Seleccionar categoría...</option>
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
            Revisar inventario guardado
          </label>
          <select
            value={fechaBusqueda}
            onChange={(e) => {
              setFechaBusqueda(e.target.value);
              setModoBusqueda(true);
              setRevisandoGuardado(true);
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

      {filas.length > 0 && (
        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-50 text-blue-800">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Producto</th>
                <th className="text-center px-4 py-3 font-semibold" title="Tu conteo físico actual">Mi Conteo</th>
              </tr>
            </thead>
            <tbody>
              {filasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-gray-400">
                    No hay productos que coincidan con la búsqueda
                  </td>
                </tr>
              )}
              {filasFiltradas.map((f) => {
                const esBajo = f.nuevo_conteo > 0 && f.nuevo_conteo <= f.producto.stock_minimo;

                return (
                  <tr
                    key={f.producto.id}
                    className={`border-t ${
                      esBajo ? "bg-red-50" : ""
                    } hover:bg-gray-50`}
                  >
                    <td className="px-3 sm:px-4 py-3 font-medium break-words">
                      {f.producto.nombre}
                      {esBajo && (
                        <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                          ¡POCAS!
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min={0}
                        value={f.nuevo_conteo || ""}
                        onChange={(e) => handleConteo(f.producto.id, e.target.value)}
                        className="w-20 border rounded-lg px-2 py-1 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-4 border-t bg-gray-50">
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold px-6 py-2 rounded-lg transition"
            >
              {guardando ? "Guardando..." : "Guardar Inventario"}
            </button>
            {error && (
              <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
            )}
          </div>
        </div>
      )}

      {filas.length === 0 && catSeleccionada && (
        <p className="text-gray-500 text-center py-8">No hay productos en esta categoría</p>
      )}

      {!catSeleccionada && (
        <p className="text-gray-400 text-center py-8">Seleccioná una categoría para ver los productos</p>
      )}
    </div>
  );
}

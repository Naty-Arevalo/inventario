"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { getCategorias } from "@/lib/actions/categorias";
import { getProductos } from "@/lib/actions/productos";
import {
  getInventarioPorFecha,
  getFechasInventario,
  guardarInventario,
  getUltimos4Inventarios,
} from "@/lib/actions/inventario";
import type { InventarioHistorial } from "@/lib/actions/inventario";
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
  const [revisandoGuardado, setRevisandoGuardado] = useState(false);
  const [filas, setFilas] = useState<FilaInventario[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [historial, setHistorial] = useState<InventarioHistorial[]>([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

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
    if (catSeleccionada) {
      cargarFilas(catSeleccionada, fecha, revisandoGuardado);
    } else {
      setFilas([]);
    }
  }, [catSeleccionada, fecha, revisandoGuardado]);

  const handleFechaChange = (nuevaFecha: string) => {
    setFecha(nuevaFecha);
    setRevisandoGuardado(true);
    setMostrarHistorial(false);
  };

  const handleHoy = () => {
    const hoy = new Date().toISOString().split("T")[0];
    setFecha(hoy);
    setRevisandoGuardado(false);
    setMostrarHistorial(false);
  };

  const toggleHistorial = async () => {
    if (mostrarHistorial) {
      setMostrarHistorial(false);
      return;
    }
    setCargandoHistorial(true);
    const data = await getUltimos4Inventarios();
    setHistorial(data);
    setMostrarHistorial(true);
    setCargandoHistorial(false);
  };

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

  const esFechaConInventario = fechasExistentes.includes(fecha);
  const hoy = new Date().toISOString().split("T")[0];
  const esHoy = fecha === hoy;

  // Obtener todas las categorías del historial (sin duplicados)
  const categoriasHistorial = [
    ...new Set(historial.flatMap((h) => h.items.map((i) => i.categoria_nombre))),
  ].sort();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Hacer Inventario
      </h2>

      {/* Barra de controles */}
      <div className="bg-white rounded-xl shadow border p-3 sm:p-4 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Calendario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {esHoy ? "Fecha (hoy)" : "Ver inventario del día"}
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={fecha}
                max={hoy}
                onChange={(e) => handleFechaChange(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
              {!esHoy && (
                <button
                  onClick={handleHoy}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg transition font-medium"
                >
                  Volver a hoy
                </button>
              )}
            </div>
          </div>

          {/* Botón últimos 4 */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">&nbsp;</label>
            <button
              onClick={toggleHistorial}
              disabled={cargandoHistorial}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                mostrarHistorial
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {cargandoHistorial
                ? "Cargando..."
                : mostrarHistorial
                ? "Ocultar últimos 4"
                : "Ver últimos 4 inventarios"}
            </button>
          </div>
        </div>

        {/* Selector de categoría (solo para cargar inventario nuevo) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {esHoy && !revisandoGuardado
              ? "Cargar inventario"
              : "Categoría"}
          </label>
          <select
            value={catSeleccionada ?? ""}
            onChange={(e) => {
              setCatSeleccionada(e.target.value ? parseInt(e.target.value) : null);
              setRevisandoGuardado(false);
            }}
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
      </div>

      {/* Sección: Últimos 4 inventarios */}
      {mostrarHistorial && (
        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          <div className="px-4 py-3 bg-blue-50 border-b">
            <h3 className="font-semibold text-blue-800">
              Últimos {historial.length} inventarios
              {catSeleccionada && (
                <span className="ml-2 text-sm font-normal text-blue-600">
                  — {categorias.find((c) => c.id === catSeleccionada)?.nombre}
                </span>
              )}
            </h3>
            {historial.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">No hay inventarios guardados todavía</p>
            )}
          </div>
          {historial.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-blue-800">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold min-w-[180px]">Producto</th>
                    {historial.map((h) => (
                      <th key={h.fecha} className="text-center px-3 py-3 font-semibold min-w-[90px]">
                        {new Date(h.fecha + "T12:00:00").toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categoriasHistorial
                    .filter((cat) => !catSeleccionada || cat === categorias.find((c) => c.id === catSeleccionada)?.nombre)
                    .map((cat) => {
                    const itemsEnCat = historial.map((h) => ({
                      fecha: h.fecha,
                      items: h.items.filter((i) => i.categoria_nombre === cat),
                    }));
                    const hayDatos = itemsEnCat.some((h) => h.items.length > 0);
                    if (!hayDatos) return null;

                    // Obtener todos los productos únicos de esta categoría en todas las fechas
                    const productosUnicos = [
                      ...new Set(
                        itemsEnCat.flatMap((h) =>
                          h.items.map((i) => `${i.producto_id}|${i.producto_nombre}`)
                        )
                      ),
                    ]
                      .map((s) => {
                        const [id, nombre] = s.split("|");
                        return { id: parseInt(id), nombre };
                      })
                      .sort((a, b) => a.nombre.localeCompare(b.nombre));

                    return (
                      <Fragment key={cat}>
                        <tr className="bg-gray-50">
                          <td
                            colSpan={historial.length + 1}
                            className="px-4 py-2 font-bold text-gray-700 text-xs uppercase tracking-wide"
                          >
                            {cat}
                          </td>
                        </tr>
                        {productosUnicos.map((prod) => (
                          <tr key={prod.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium">{prod.nombre}</td>
                            {historial.map((h) => {
                              const item = h.items.find(
                                (i) =>
                                  i.producto_id === prod.id &&
                                  i.categoria_nombre === cat
                              );
                              return (
                                <td
                                  key={h.fecha}
                                  className="text-center px-3 py-2.5"
                                >
                                  {item ? (
                                    <span className="font-medium">
                                      {item.cantidad}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sección: Tabla de inventario (carga o revisión) */}
      {!mostrarHistorial && filas.length > 0 && (
        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          {revisandoGuardado && (
            <div className="px-4 py-2 bg-amber-50 border-b text-sm text-amber-700 font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Viendo inventario guardado del {fecha}
              {esFechaConInventario ? "" : " — No hay inventario para esta fecha"}
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-blue-50 text-blue-800">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Producto</th>
                <th className="text-center px-4 py-3 font-semibold" title="Tu conteo físico actual">
                  Mi Conteo
                </th>
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
                    className={`border-t ${esBajo ? "bg-red-50" : ""} hover:bg-gray-50`}
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

      {filas.length === 0 && catSeleccionada && !mostrarHistorial && (
        <p className="text-gray-500 text-center py-8">No hay productos en esta categoría</p>
      )}

      {!catSeleccionada && !mostrarHistorial && (
        <p className="text-gray-400 text-center py-8">
          Seleccioná una categoría para ver los productos
        </p>
      )}
    </div>
  );
}

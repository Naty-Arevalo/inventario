"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getCategorias, crearCategoria, eliminarCategoria } from "@/lib/actions/categorias";
import {
  getProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from "@/lib/actions/productos";
import { getStockTotal } from "@/lib/actions/stock";
import type { Categoria, Producto, InventarioCompleto } from "@/lib/types";

export default function StockPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stock, setStock] = useState<InventarioCompleto[]>([]);
  const [catFiltro, setCatFiltro] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);

  // Modal nuevo producto
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nuevaCat, setNuevaCat] = useState<number>(0);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoStockMin, setNuevoStockMin] = useState(5);

  // Modal editar
  const [modalEditar, setModalEditar] = useState<number | null>(null);
  const [editarNombre, setEditarNombre] = useState("");
  const [editarStockMin, setEditarStockMin] = useState(5);

  // Nueva categoría
  const [nuevaCatNombre, setNuevaCatNombre] = useState("");
  const [mostrarFormCat, setMostrarFormCat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarTodo = useCallback(async () => {
    const [cats, prods, st] = await Promise.all([
      getCategorias(),
      getProductos(),
      getStockTotal(),
    ]);
    setCategorias(cats);
    setProductos(prods);
    setStock(st);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const categoriaPorProducto = useMemo(
    () => new Map(productos.map((p) => [p.id, p.categoria_id])),
    [productos]
  );

  const conteoPorCategoria = useMemo(() => {
    const counts = new Map<number, number>();
    for (const p of productos) {
      counts.set(p.categoria_id, (counts.get(p.categoria_id) ?? 0) + 1);
    }
    return counts;
  }, [productos]);

  const stockFiltrado = useMemo(
    () =>
      catFiltro
        ? stock.filter((s) => categoriaPorProducto.get(s.producto_id) === catFiltro)
        : stock,
    [stock, catFiltro, categoriaPorProducto]
  );

  const handleCrearCategoria = async () => {
    setError(null);
    if (!nuevaCatNombre.trim()) return;
    const res = await crearCategoria(nuevaCatNombre);
    if (res.ok) {
      setNuevaCatNombre("");
      setMostrarFormCat(false);
      cargarTodo();
    } else {
      setError(res.error || "Error");
    }
  };

  const handleEliminarCategoria = async (id: number, nombre: string) => {
    setError(null);
    if (!confirm(`¿Eliminar la categoría "${nombre}"? Se eliminarán todos sus productos.`)) return;
    const res = await eliminarCategoria(id);
    if (res.ok) {
      cargarTodo();
    } else {
      setError(res.error || "Error");
    }
  };

  const handleCrearProducto = async () => {
    setError(null);
    if (!nuevaCat || !nuevoNombre.trim()) {
      setError("Seleccioná categoría y escribí un nombre");
      return;
    }
    const res = await crearProducto(nuevaCat, nuevoNombre, nuevoStockMin);
    if (res.ok) {
      setModalNuevo(false);
      setNuevoNombre("");
      setNuevoStockMin(5);
      cargarTodo();
    } else {
      setError(res.error || "Error");
    }
  };

  const handleEditarProducto = async (id: number) => {
    setError(null);
    if (!editarNombre.trim()) return;
    const res = await actualizarProducto(id, editarNombre, editarStockMin);
    if (res.ok) {
      setModalEditar(null);
      cargarTodo();
    } else {
      setError(res.error || "Error");
    }
  };

  const handleEliminarProducto = async (id: number, nombre: string) => {
    setError(null);
    if (!confirm(`¿Eliminar el producto "${nombre}"?`)) return;
    const res = await eliminarProducto(id);
    if (res.ok) {
      cargarTodo();
    } else {
      setError(res.error || "Error");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-purple-700 flex items-center gap-2">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        Stock Total
      </h2>

      {/* Categorías como filtros */}
      <div className="bg-white rounded-xl shadow border p-3 sm:p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setCatFiltro(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              catFiltro === null
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todas
          </button>
          {categorias.map((c) => (
            <div
              key={c.id}
              className={`flex items-center rounded-full text-sm font-medium transition overflow-hidden ${
                catFiltro === c.id
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <button onClick={() => setCatFiltro(c.id)} className="pl-3 py-1.5">
                {c.nombre}
                <span className="ml-1 text-xs opacity-70">
                  ({conteoPorCategoria.get(c.id) ?? 0})
                </span>
              </button>
              <button
                onClick={() => handleEliminarCategoria(c.id, c.nombre)}
                className="px-2 py-1.5 opacity-50 hover:opacity-100 hover:text-red-500"
                title="Eliminar categoría"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setModalNuevo(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
        >
          + Nuevo Producto
        </button>
        <button
          onClick={() => setMostrarFormCat(!mostrarFormCat)}
          className="bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold px-4 py-2 rounded-lg text-sm transition"
        >
          {mostrarFormCat ? "Cancelar" : "+ Nueva Categoría"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Formulario nueva categoría */}
      {mostrarFormCat && (
        <div className="bg-white rounded-xl shadow border p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={nuevaCatNombre}
              onChange={(e) => setNuevaCatNombre(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Ej: Bebidas"
            />
          </div>
          <button
            onClick={handleCrearCategoria}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-lg text-sm"
          >
            Crear
          </button>
        </div>
      )}

      {/* Tabla de stock */}
      {cargando ? (
        <div className="bg-white rounded-xl shadow border py-12 flex flex-col items-center gap-3">
          <svg className="w-7 h-7 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-gray-400 text-sm font-medium">Cargando stock...</p>
        </div>
      ) : (
      <div className="bg-white rounded-xl shadow border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-purple-50 text-purple-800">
            <tr>
              <th className="text-left px-3 sm:px-4 py-3 font-semibold">Producto</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Categoría</th>
              <th className="text-center px-4 py-3 font-semibold hidden lg:table-cell" title="Resultado del último inventario">Último Inventario</th>
              <th className="text-center px-4 py-3 font-semibold hidden lg:table-cell" title="Mercadería ingresada desde el último inventario">Ingresó</th>
              <th className="text-center px-3 sm:px-4 py-3 font-semibold" title="Último inventario + mercadería ingresada">Stock Actual</th>
              <th className="text-center px-3 sm:px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {stockFiltrado.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No hay productos para mostrar
                </td>
              </tr>
            )}
            {stockFiltrado.map((s) => {
              const stockActual = s.inventario_anterior + s.mercaderia_recibida;
              const esBajo = stockActual <= s.stock_minimo;
              const editando = modalEditar === s.producto_id;

              return (
                <tr
                  key={s.producto_id}
                  className={`border-t ${esBajo ? "bg-red-50" : ""} hover:bg-gray-50`}
                >
                  <td className="px-3 sm:px-4 py-3 font-medium break-words min-w-32">
                    {s.producto_nombre}
                    {esBajo && (
                      <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                        ¡POCAS!
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{s.categoria_nombre}</td>
                  <td className="px-4 py-3 text-center text-gray-600 hidden lg:table-cell">{s.inventario_anterior}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium hidden lg:table-cell">+{s.mercaderia_recibida}</td>
                  <td className={`px-4 py-3 text-center font-bold ${esBajo ? "text-red-600" : "text-gray-800"}`}>
                    {stockActual}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editando ? (
                      <div className="flex flex-wrap gap-2 items-center justify-center">
                        <input
                          type="text"
                          value={editarNombre}
                          onChange={(e) => setEditarNombre(e.target.value)}
                          className="border rounded px-2 py-1 text-xs w-24 sm:w-32"
                        />
                        <input
                          type="number"
                          value={editarStockMin}
                          onChange={(e) => setEditarStockMin(parseInt(e.target.value) || 0)}
                          className="border rounded px-2 py-1 text-xs w-16"
                          min={0}
                        />
                        <button
                          onClick={() => handleEditarProducto(s.producto_id)}
                          className="text-green-600 hover:text-green-800 text-xs font-bold"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setModalEditar(null)}
                          className="text-gray-400 hover:text-gray-600 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => {
                            setModalEditar(s.producto_id);
                            setEditarNombre(s.producto_nombre);
                            setEditarStockMin(s.stock_minimo);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-bold"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleEliminarProducto(s.producto_id, s.producto_nombre)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Modal nuevo producto */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nuevo Producto</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  value={nuevaCat}
                  onChange={(e) => setNuevaCat(parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value={0}>Seleccionar...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: Coca Cola 2L"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                <input
                  type="number"
                  value={nuevoStockMin}
                  onChange={(e) => setNuevoStockMin(parseInt(e.target.value) || 0)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  min={0}
                />
              </div>
              <div className="flex gap-3 justify-end items-center">
                {error && (
                  <p className="text-sm text-red-600 font-medium mr-auto">{error}</p>
                )}
                <button
                  onClick={() => setModalNuevo(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearProducto}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-sm"
                >
                  Crear Producto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

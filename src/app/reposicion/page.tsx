"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getSugerenciaReposicion } from "@/lib/actions/reposicion";
import type { SugerenciaReposicion } from "@/lib/types";

const COBERTURAS = [7, 14, 30];

export default function ReposicionPage() {
  const [sugerencias, setSugerencias] = useState<SugerenciaReposicion[]>([]);
  const [diasCobertura, setDiasCobertura] = useState(7);
  const [cargando, setCargando] = useState(true);
  const [mensajeCopia, setMensajeCopia] = useState<string | null>(null);
  const [catFiltro, setCatFiltro] = useState<string | null>(null);

  const cargar = useCallback(async (dias: number) => {
    setCargando(true);
    const data = await getSugerenciaReposicion(dias);
    setSugerencias(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar(diasCobertura);
  }, [diasCobertura, cargar]);

  const categorias = useMemo(
    () => [...new Set(sugerencias.map((s) => s.categoria_nombre))].sort(),
    [sugerencias]
  );

  const aComprar = useMemo(
    () =>
      sugerencias.filter(
        (s) => s.sugerido > 0 && (!catFiltro || s.categoria_nombre === catFiltro)
      ),
    [sugerencias, catFiltro]
  );

  const textoLista = aComprar
    .map((s) => `• ${s.nombre} x ${s.sugerido}`)
    .join("\n");

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(textoLista);
      setMensajeCopia(
        catFiltro ? `Pedido de ${catFiltro} copiado` : "Lista copiada"
      );
    } catch {
      setMensajeCopia("No se pudo copiar");
    }
  };

  const cambiarCat = (cat: string | null) => {
    setCatFiltro(cat);
    setMensajeCopia(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-amber-700 flex items-center gap-2">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Reposición Sugerida
      </h2>

      <div className="bg-white rounded-xl shadow border p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cubrir consumo de
            </label>
            <select
              value={diasCobertura}
              onChange={(e) => setDiasCobertura(parseInt(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {COBERTURAS.map((d) => (
                <option key={d} value={d}>
                  próximos {d} días
                </option>
              ))}
            </select>
          </div>

          {aComprar.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopiar}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
              >
                {catFiltro ? `Copiar pedido de ${catFiltro}` : "Copiar lista de compras"}
              </button>
              {mensajeCopia && (
                <span className="text-sm text-gray-600 font-medium">{mensajeCopia}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => cambiarCat(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              catFiltro === null
                ? "bg-amber-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todas
          </button>
          {categorias.map((c) => (
            <button
              key={c}
              onClick={() => cambiarCat(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                catFiltro === c
                  ? "bg-amber-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="text-gray-400 text-center py-8">Calculando...</p>
      ) : sugerencias.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          Cargá al menos un inventario para calcular sugerencias
        </p>
      ) : aComprar.length === 0 ? (
        <p className="text-green-600 text-center py-8 font-medium">
          {catFiltro
            ? `Nada para reponer en ${catFiltro} según tu consumo.`
            : "Todo bien: no hace falta reponer nada según tu consumo."}
        </p>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-amber-800">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Producto</th>
                  <th className="text-left px-4 py-3 font-semibold">Categoría</th>
                  <th className="text-center px-4 py-3 font-semibold">Stock Actual</th>
                  <th className="text-center px-4 py-3 font-semibold" title="Consumo promedio por día entre los últimos dos inventarios">Consumo/día</th>
                  <th className="text-center px-4 py-3 font-semibold" title="Días estimados hasta quedarte sin stock">Días restantes</th>
                  <th className="text-center px-4 py-3 font-semibold">Comprar</th>
                </tr>
              </thead>
              <tbody>
                {aComprar.map((s) => (
                  <tr key={s.producto_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{s.categoria_nombre}</td>
                    <td className="px-4 py-3 text-center text-gray-800 font-bold">{s.stock_actual}</td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {s.consumo_diario !== null ? s.consumo_diario.toFixed(1) : "—"}
                    </td>
                    <td className={`px-4 py-3 text-center font-medium ${
                      s.dias_restantes !== null && s.dias_restantes <= diasCobertura / 2
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}>
                      {s.dias_restantes !== null ? `~${s.dias_restantes} días` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full">
                        {s.sugerido}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

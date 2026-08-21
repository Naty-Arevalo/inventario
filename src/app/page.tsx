"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProductosBajoStock } from "@/lib/actions/stock";

interface Alerta {
  nombre: string;
  categoria: string;
  cantidad: number;
  stock_minimo: number;
}

const MAX_VISIBLES = 4;

export default function HomePage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    getProductosBajoStock().then(setAlertas);
  }, []);

  const ordenadas = [...alertas].sort(
    (a, b) => a.cantidad - a.stock_minimo - (b.cantidad - b.stock_minimo)
  );
  const visibles = expandido ? ordenadas : ordenadas.slice(0, MAX_VISIBLES);
  const restantes = ordenadas.length - MAX_VISIBLES;

  return (
    <div className="space-y-8">
      <div className="text-center py-6 sm:py-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-800 mb-2">Bienvenido al Inventario</h2>
        <p className="text-gray-500 text-base sm:text-lg">Gestioná el stock de tu sector de forma simple y rápida</p>
      </div>

      {ordenadas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-red-800 font-bold mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            ¡Atención! {ordenadas.length} producto{ordenadas.length !== 1 ? "s" : ""} con stock bajo:
          </h3>
          <ul className="space-y-1">
            {visibles.map((a) => (
              <li key={a.nombre} className="text-red-700 text-sm">
                • <strong>{a.nombre}</strong> ({a.categoria}):{" "}
                <span className="font-bold">{a.cantidad}</span> unidades (mín. {a.stock_minimo})
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4 mt-3">
            {restantes > 0 && (
              <button
                onClick={() => setExpandido(!expandido)}
                className="text-sm font-bold text-red-700 hover:text-red-900 underline"
              >
                {expandido ? "Ver menos" : `Ver más (${restantes})`}
              </button>
            )}
            <Link
              href="/reposicion"
              className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition"
            >
              Ir a Reposición
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/mercaderia" className="group">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 sm:p-8 hover:shadow-xl hover:border-green-300 transition-all duration-200 text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Cargar Mercadería</h3>
            <p className="text-gray-500 text-sm">Registrar productos que ingresaron al sector</p>
          </div>
        </Link>

        <Link href="/inventario" className="group">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 sm:p-8 hover:shadow-xl hover:border-blue-300 transition-all duration-200 text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Hacer Inventario</h3>
            <p className="text-gray-500 text-sm">Contar los productos y generar un nuevo inventario</p>
          </div>
        </Link>

        <Link href="/stock" className="group">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 sm:p-8 hover:shadow-xl hover:border-purple-300 transition-all duration-200 text-center">
            <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Ver Stock Total</h3>
            <p className="text-gray-500 text-sm">Ver todos los productos, agregar, editar o eliminar</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

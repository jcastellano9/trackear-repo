// Análisis detallado de tasas y rendimientos

import React, { useEffect, useState } from 'react';
// import { usePortfolioData } from '../hooks/usePortfolioData';

type Billetera = {
  nombre: string;
  tna: number;
  limite: number;
  url?: string;
};

type PlazoFijo = {
  entidad: string;
  logo: string;
  tnaClientes: number;
  enlace?: string;
};

type CriptoEntidad = {
  entidad: string;
  logo: string;
  url?: string;
  rendimientos: {
    moneda: string;
    apy: number;
  }[];
};

interface Props {
  activeSection: 'plazos' | 'billeteras' | 'cripto';
}



const YieldAnalysis: React.FC<Props> = ({ activeSection }) => {
  const [section, setSection] = useState<"plazos" | "billeteras" | "cripto">(activeSection);
  const [sortOption, setSortOption] = useState<'alphabetical' | 'alphabeticalDesc' | 'apyDesc' | 'apyAsc'>('alphabetical');
  const [billeteras, setBilleteras] = useState<Billetera[]>([]);
  const [plazosFijos, setPlazosFijos] = useState<PlazoFijo[]>([]);
  const [cripto, setCripto] = useState<CriptoEntidad[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [billeterasRes, plazosRes, criptoRes] = await Promise.all([
          fetch('https://api.comparatasas.ar/cuentas-remuneradas'),
          fetch('https://api.comparatasas.ar/plazos-fijos'),
          fetch('https://api.comparatasas.ar/v1/finanzas/rendimientos')
        ]);

        if (!billeterasRes.ok || !plazosRes.ok || !criptoRes.ok) {
          throw new Error('Error al obtener los datos desde la API.');
        }

        const billeterasData = await billeterasRes.json();
        const plazosData = await plazosRes.json();
        const criptoData = await criptoRes.json();

        setBilleteras(billeterasData);
        setPlazosFijos(plazosData);
        setCripto(criptoData);
      } catch (err: any) {
        console.error(err);
        setError('Hubo un error al cargar los datos. Por favor, intenta nuevamente más tarde.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const sortedPlazos = [...plazosFijos].sort((a, b) => {
    if (sortOption === 'apyDesc') return b.tnaClientes - a.tnaClientes;
    if (sortOption === 'apyAsc') return a.tnaClientes - b.tnaClientes;
    if (sortOption === 'alphabeticalDesc') return b.entidad.localeCompare(a.entidad);
    return a.entidad.localeCompare(b.entidad);
  });
  const sortedBilleteras = [...billeteras].sort((a, b) => {
    if (sortOption === 'apyDesc') return b.tna - a.tna;
    if (sortOption === 'apyAsc') return a.tna - b.tna;
    if (sortOption === 'alphabeticalDesc') return b.nombre.localeCompare(a.nombre);
    return a.nombre.localeCompare(b.nombre);
  });
  const sortedCripto = cripto
      .sort((a, b) => {
        if (sortOption === 'alphabetical') return a.entidad.localeCompare(b.entidad);
        const aMax = Math.max(...a.rendimientos.map(r => r.apy));
        const bMax = Math.max(...b.rendimientos.map(r => r.apy));
        if (sortOption === 'apyDesc') return bMax - aMax;
        if (sortOption === 'apyAsc') return aMax - bMax;
        return 0;
      })
      .map(entidad => ({
        ...entidad,
        rendimientos: [...entidad.rendimientos].sort((a, b) => b.apy - a.apy)
      }));

  const getMaxAPY = (moneda: string): number => {
    let max = 0;
    for (const entidad of sortedCripto) {
      const rendimiento = entidad.rendimientos.find(r => r.moneda === moneda);
      if (rendimiento && typeof rendimiento.apy === 'number' && rendimiento.apy > max) {
        max = rendimiento.apy;
      }
    }
    return max;
  };


  // Barra de navegación para cambiar de sección
  return (
    <>
      <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSection('plazos')}
            className={`px-4 py-1.5 border rounded text-sm font-medium ${
              section === 'plazos'
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-800 border-gray-300'
            }`}
          >
            Plazos Fijos
          </button>
          <button
            onClick={() => setSection('billeteras')}
            className={`px-4 py-1.5 border rounded text-sm font-medium ${
              section === 'billeteras'
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-800 border-gray-300'
            }`}
          >
            Billeteras
          </button>
          <button
            onClick={() => setSection('cripto')}
            className={`px-4 py-1.5 border rounded text-sm font-medium ${
              section === 'cripto'
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-800 border-gray-300'
            }`}
          >
            Criptomonedas
          </button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
            Última actualización: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </p>
          {(section === 'plazos' || section === 'billeteras') && (
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="px-4 py-1.5 border rounded text-sm bg-white text-gray-800 border-gray-300"
            >
              <option value="alphabetical">Orden alfabético A → Z</option>
              <option value="alphabeticalDesc">Orden alfabético Z → A</option>
              <option value="apyDesc">Mayor rendimiento ↓</option>
              <option value="apyAsc">Menor rendimiento ↑</option>
            </select>
          )}
        </div>
      </div>
      <div className="space-y-6">
      {isLoading ? (
        <div className="text-center py-10 text-gray-600">Cargando datos...</div>
      ) : (
        <>
          {error && (
            <div className="bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400 p-4 rounded">
              {error}
            </div>
          )}

          {section === 'plazos' && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100">Plazos Fijos</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedPlazos.map((p, i) => {
                  return p.enlace ? (
                    <a
                      key={i}
                      href={p.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white border border-gray-200 rounded p-4 flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900">{p.entidad}</h4>
                      </div>
                      <div className="text-right font-semibold text-sm text-gray-900">
                        {(p.tnaClientes * 100).toFixed(2)}%
                      </div>
                    </a>
                  ) : (
                    <div
                      key={i}
                      className="bg-white border border-gray-200 rounded p-4 flex justify-between items-center cursor-default"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900">{p.entidad}</h4>
                      </div>
                      <div className="text-right font-semibold text-sm text-gray-900">
                        {(p.tnaClientes * 100).toFixed(2)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {section === 'billeteras' && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100">Billeteras</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedBilleteras.map((b, i) => {
                  return b.url ? (
                    <a
                      key={i}
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white border border-gray-200 rounded p-4 flex justify-between items-center no-underline"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900">{b.nombre}</h4>
                        {b.limite > 0 && (
                          <div className="mt-2 flex items-center">
                            <span className="text-xs text-gray-500">
                              Límite: ${b.limite.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right font-semibold text-sm text-gray-900">
                        {b.tna.toFixed(2)}%
                      </div>
                    </a>
                  ) : (
                    <div
                      key={i}
                      className="bg-white border border-gray-200 rounded p-4 flex justify-between items-center cursor-default"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900">{b.nombre}</h4>
                        {b.limite > 0 && (
                          <div className="mt-2 flex items-center">
                            <span className="text-xs text-gray-500">
                              Límite: ${b.limite.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right font-semibold text-sm text-gray-900">
                        {b.tna.toFixed(2)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {section === 'cripto' && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100">Criptomonedas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="table-auto w-full text-sm rounded bg-white divide-y divide-gray-200">
                  <thead>
                    <tr className="text-xs font-medium text-gray-700 bg-gray-100 uppercase text-center tracking-wide">
                      <th className="px-4 py-3 text-gray-800 font-medium">Criptomoneda</th>
                      {sortedCripto.map((entidad, idx) => (
                        <th key={idx} className="px-4 py-3 text-center text-gray-800 font-medium">
                          {entidad.entidad}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...new Set(sortedCripto.flatMap(ent => ent.rendimientos.map(r => r.moneda)))]
                      .filter(moneda =>
                        sortedCripto.some(entidad =>
                          entidad.rendimientos.some(r => r.moneda === moneda && typeof r.apy === 'number' && r.apy > 0)
                        )
                      )
                      .sort((a, b) => a.localeCompare(b))
                      .map((moneda, idx) => {
                        const maxAPY = getMaxAPY(moneda);
                        return (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm text-gray-800 font-medium text-left">
                              {moneda}
                            </td>
                            {sortedCripto.map((entidad, cidx) => {
                              const rendimiento = entidad.rendimientos.find(r => r.moneda === moneda);
                              const isMax = rendimiento && typeof rendimiento.apy === 'number' && rendimiento.apy === maxAPY && maxAPY > 0;
                              return (
                                <td
                                  key={cidx}
                                  className={`px-3 py-1 border border-gray-300 text-sm text-gray-800 text-center ${isMax ? 'font-semibold' : ''}`}
                                >
                                  {rendimiento && typeof rendimiento.apy === 'number' && rendimiento.apy > 0
                                    ? `${rendimiento.apy.toFixed(2)}%`
                                    : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </>
      )}
    </div>
    </>
  );
};

export default YieldAnalysis;

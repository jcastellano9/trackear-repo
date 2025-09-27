// Análisis detallado de tasas y rendimientos

import React, { useEffect, useState } from 'react';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { Bitcoin, Landmark } from 'lucide-react';

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


const getCryptoLogoUrl = (symbol: string) => {
  const lower = symbol.toLowerCase();
  return `https://assets.coincap.io/assets/icons/${lower}@2x.png`;
};

const YieldAnalysis: React.FC<Props> = ({ activeSection }) => {
  const { predefinedAssets } = usePortfolioData();
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
                    // Billeteras virtuales (otros FCI)
                    fetch('https://api.argentinadatos.com/v1/finanzas/fci/otros/ultimo/'),
                    // Plazos fijos
                    fetch('https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo/'),
                    // Rendimientos cripto
                    fetch('https://api.argentinadatos.com/v1/finanzas/rendimientos/')
                ]);

        if (!billeterasRes.ok || !plazosRes.ok || !criptoRes.ok) {
          throw new Error('Error al obtener los datos desde la API.');
        }

        const billeterasData = await billeterasRes.json();
        const plazosData = await plazosRes.json();
        const criptoData = await criptoRes.json();

        const normalizePercent = (val: any) => (typeof val === 'number' ? (val <= 1 ? val * 100 : val) : 0);
        const normalizeFraction = (val: any) => (typeof val === 'number' ? (val <= 1 ? val : val / 100) : 0);
        const normalizeCryptoPercent = (val: any) => (
          typeof val === 'number' ? (val > 100 ? 100 : val) : 0
        );

        // Billeteras (ArgentinaDatos otros/ultimo): queremos % directo en `tna`
        const billeterasMapped: Billetera[] = (Array.isArray(billeterasData) ? billeterasData : []).map((item: any) => ({
          nombre: item.fondo || item.nombre || item.entidad || 'N/A',
          tna: normalizePercent(item.tna),
          limite: item.tope ?? item.limite ?? 0,
        }));

        // Plazos fijos (ArgentinaDatos tasas/plazoFijo): el UI espera fracción en `tnaClientes` (luego multiplica x100 al renderizar)
        const plazosMapped: PlazoFijo[] = (Array.isArray(plazosData) ? plazosData : []).map((p: any) => ({
          entidad: p.entidad || p.banco || p.nombre || 'Entidad',
          logo: '',
          tnaClientes: normalizeFraction(p.tnaClientes ?? p.tna),
          enlace: p.enlace || p.link || undefined,
        }));

        // Cripto (ArgentinaDatos rendimientos): asegurar que `apy` esté en %
        const criptoMapped: CriptoEntidad[] = (Array.isArray(criptoData) ? criptoData : []).map((e: any) => ({
          entidad: e.entidad || e.nombre || 'Entidad',
          logo: e.logo || '',
          url: e.url || undefined,
          rendimientos: Array.isArray(e.rendimientos)
            ? e.rendimientos.map((r: any) => ({
                moneda: r.moneda || r.symbol || '',
                apy: normalizeCryptoPercent(r.apy ?? r.tna ?? r.tea ?? 0),
              }))
            : [],
        }));

        setBilleteras(billeterasMapped);
        setPlazosFijos(plazosMapped);
        setCripto(criptoMapped);
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

  // --- helpers to resolve logos in /public/icons ---
  const slugify = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/&/g, " y ")
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b(s\/a|s\.?a\.?u?|s\.?a\.?|saic|sac)\b/g, "") // remove company suffixes
      .replace(/\s+/g, "-"); // spaces -> hyphens

  const resolveIcon = (rawName: string) => {
    const base = slugify(rawName);

    // Common alias rules (bancos con nombres largos o variantes)
    const aliasRules: Array<[RegExp, string]> = [
      [/provincia-de-buenos-aires/, "banco-provincia"],
      [/provincia-del-neuquen/, "banco-provincia"],
      [/provincia-de-cordoba|banco-de-cordoba|cordoba/, "bancor"],
      [/nacion/, "banco-nacion"],
      [/galicia/, "banco-galicia"],
      [/ggal/, "banco-galicia"],
      [/bbva/, "banco-bbva"],
      [/ciudad(-de-buenos-aires)?/, "banco-ciudad"],
      [/hipotecario/, "banco-hipotecario"],
      [/macro/, "banco-macro"],
      [/supervielle/, "banco-supervielle"],
      [/icbc/, "banco-icbc"],
      [/santander/, "banco-santander"],
      [/formosa/, "banco-formosa"],
      [/corrientes/, "banco-corrientes"],
      [/chubut/, "banco-del-chubut"],
      [/mariva/, "banco-mariva"],
      [/meridian/, "banco-meridian"],
      [/masventas/, "banco-masventas"],
      [/bica/, "banco-bica"],
      [/comafi/, "banco-comafi"],
      [/credicoop/, "banco-credicoop"],
      [/itau|itaú/, "banco-itau"],
      [/hsbc/, "banco-hsbc"],
      [/columbia/, "banco-columbia"],
      [/patagonia/, "banco-patagonia"],
      [/piano/, "banco-piano"],
      // billeteras y exchanges
      [/naranja-x|naranjax/, "naranja-x"],
      [/cuenta-dni|dni/, "cuenta-dni"],
      [/mercado(-)?pago/, "mercadopago"],
      [/personal(-)?pay/, "ppay"],
      [/lemon(cash)?/, "lemon"],
      [/letsbit|lb-finanzas|lbfinanzas/, "letsbit"],
      [/plus(-)?crypto|plus(-)?inversiones|plus$/, "plus-crypto"],
      [/buenbit/, "buenbit"],
      [/fiwind/, "fiwind"],
      [/prex/, "prex"],
      [/ripio/, "ripio"],
      [/satoshi(-)?tango/, "satoshitango"],
      [/openbank/, "openbank"],
      [/astropay/, "astropay"],
    ];

    for (const [rx, key] of aliasRules) {
      if (rx.test(base) && iconMap[key]) return iconMap[key];
    }

    // Progressive fallbacks
    const candidates = [
      base,
      base.replace(/^banco-/, ""),
      base.replace(/-sociedad-anonima$|-s-a-u?$|-sa$|-sac$|-saic$/g, ""),
    ];
    for (const c of candidates) {
      if (iconMap[c]) return iconMap[c];
      if (iconMap[`banco-${c}`]) return iconMap[`banco-${c}`];
    }

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("[Logo] No se encontró icono para:", rawName, "→ slug:", base);
    }
    return "/placeholder-logo.svg";
  };

  const iconMap: Record<string, string> = {
    'astropay': '/icons/astropay.svg',
    'balanz': '/icons/balanz.svg',
    'banco-bbva': '/icons/banco-bbva.svg',
    'banco-bica': '/icons/banco-bica.svg',
    'banco-ciudad': '/icons/banco-ciudad.svg',
    'banco-coinag': '/icons/banco-coinag.svg',
    'banco-columbia': '/icons/banco-columbia.svg',
    'banco-comafi': '/icons/banco-comafi.svg',
    'banco-corrientes': '/icons/banco-corrientes.svg',
    'banco-credicoop': '/icons/banco-credicoop.svg',
    'banco-del-sol': '/icons/banco-del-sol.svg',
    'banco-entre-rios': '/icons/banco-entre-rios.svg',
    'banco-galicia': '/icons/banco-galicia.svg',
    'banco-hipotecario': '/icons/banco-hipotecario.svg',
    'banco-hsbc': '/icons/banco-hsbc.svg',
    'banco-icbc': '/icons/banco-icbc.svg',
    'banco-itau': '/icons/banco-itau.svg',
    'banco-macro': '/icons/banco-macro.svg',
    'banco-municipal': '/icons/banco-municipal.svg',
    'banco-nacion': '/icons/banco-nacion.svg',
    'banco-patagonia': '/icons/banco-patagonia.svg',
    'banco-piano': '/icons/banco-piano.svg',
    'banco-provincia': '/icons/banco-provincia.svg',
    'banco-san-juan': '/icons/banco-san-juan.svg',
    'banco-santa-cruz': '/icons/banco-santa-cruz.svg',
    'banco-santa-fe': '/icons/banco-santa-fe.svg',
    'banco-santander': '/icons/banco-santander.svg',
    'banco-supervielle': '/icons/banco-supervielle.svg',
    'bancor': '/icons/bancor.svg',
    'belo': '/icons/belo.svg',
    'binance': '/icons/binance.svg',
    'bpn': '/icons/bpn.svg',
    'brubank': '/icons/brubank.svg',
    'buenbit': '/icons/buenbit.svg',
    'cabal': '/icons/cabal.svg',
    'claro-pay': '/icons/claro-pay.svg',
    'cocos': '/icons/cocos.svg',
    'cocos-crypto': '/icons/cocos-crypto.svg',
    'cuenta-dni': '/icons/cuenta-dni.svg',
    'decrypto': '/icons/decrypto.svg',
    'dolar-app': '/icons/dolar-app.svg',
    'fiwind': '/icons/fiwind.svg',
    'lemon': '/icons/lemon.svg',
    'letsbit': '/icons/letsbit.svg',
    'mercadopago': '/icons/mercadopago.svg',
    'modo': '/icons/modo.svg',
    'naranja-x': '/icons/naranja-x.svg',
    'openbank': '/icons/openbank.svg',
    'personal-pay': '/icons/personal-pay.svg',
    'plus-crypto': '/icons/plus-crypto.svg',
    'prex': '/icons/prex.svg',
    'ripio': '/icons/ripio.svg',
    'satoshi-tango': '/icons/satoshi-tango.svg',
    'takenos': '/icons/takenos.svg',
    'tienda-crypto': '/icons/tienda-crypto.svg',
    'uala': '/icons/uala.svg',
    'wallbit': '/icons/wallbit.svg',
    'yoy': '/icons/yoy.svg'
  };

  // Barra de navegación para cambiar de sección
  return (
      <>
        <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
          <div className="flex gap-2">
            <button
                onClick={() => setSection('plazos')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    section === 'plazos'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Landmark size={18} className="mr-2" />
              Plazos Fijos
            </button>
            <button
                onClick={() => setSection('billeteras')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    section === 'billeteras'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <svg className="mr-2 w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20">
                <rect x="3" y="7" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" fill="none"/>
                <circle cx="15" cy="12" r="1" fill="currentColor"/>
              </svg>
              Billeteras
            </button>
            <button
                onClick={() => setSection('cripto')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    section === 'cripto'
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Bitcoin size={18} className="mr-2" />
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
                    className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-800 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Plazos Fijos</h3>
                        <a
                            href="/simulator"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-500 font-medium text-sm transition-colors px-3 py-1 rounded-md border border-transparent hover:bg-blue-50 dark:hover:bg-gray-800"
                        >
                          Simular rendimiento
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14m-7 7h7a2 2 0 002-2v-7" />
                          </svg>
                        </a>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {
                          // Usar resolveIcon para buscar logo
                          sortedPlazos.map((p, i) => {
                            const iconSrc = resolveIcon(p.entidad);
                            return p.enlace ? (
                                <a
                                    key={i}
                                    href={p.enlace}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 flex items-center space-x-4 hover:shadow-md transition no-underline"
                                >
                        <span className="absolute top-3 right-3 bg-blue-100 text-blue-700 text-sm font-medium px-3 py-0.5 rounded-full border border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700">
                          {(p.tnaClientes * 100).toFixed(2)}%
                        </span>
                                  <img
                                      src={iconSrc}
                                      alt={p.entidad}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (!target.dataset.fallback) {
                                          target.src = '/placeholder-logo.svg';
                                          target.dataset.fallback = 'true';
                                        }
                                      }}
                                      className="w-12 h-12 object-contain rounded-full bg-white p-1.5 shadow border border-gray-200 dark:border-gray-600"
                                  />
                                  <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">{p.entidad}</h4>
                                  </div>
                                </a>
                            ) : (
                                <div
                                    key={i}
                                    className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 flex items-center space-x-4 cursor-default"
                                >
                        <span className="absolute top-3 right-3 bg-blue-100 text-blue-700 text-sm font-medium px-3 py-0.5 rounded-full border border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700">
                          {(p.tnaClientes * 100).toFixed(2)}%
                        </span>
                                  <img
                                      src={iconSrc}
                                      alt={p.entidad}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (!target.dataset.fallback) {
                                          target.src = '/placeholder-logo.svg';
                                          target.dataset.fallback = 'true';
                                        }
                                      }}
                                      className="w-12 h-12 object-contain rounded-full bg-white p-1.5 shadow border border-gray-200 dark:border-gray-600"
                                  />
                                  <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">{p.entidad}</h4>
                                  </div>
                                </div>
                            );
                          })
                        }
                      </div>
                    </section>
                )}

                {section === 'billeteras' && (
                    <section>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Billeteras</h3>
                        <a
                            href="/simulator"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-500 font-medium text-sm transition-colors px-3 py-1 rounded-md border border-transparent hover:bg-blue-50 dark:hover:bg-gray-800"
                        >
                          Simular rendimiento
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14m-7 7h7a2 2 0 002-2v-7" />
                          </svg>
                        </a>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedBilleteras.map((b, i) => {
                          const iconSrc = resolveIcon(b.nombre);
                          return b.url ? (
                              <a
                                  key={i}
                                  href={b.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition flex items-center space-x-4 no-underline"
                              >
                      <span className="absolute top-3 right-3 bg-purple-100 text-purple-700 text-sm font-medium px-3 py-0.5 rounded-full border border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700">
                        {b.tna.toFixed(2)}%
                      </span>
                                <img
                                    src={iconSrc}
                                    alt={b.nombre}
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      if (!target.dataset.fallback) {
                                        target.src = '/placeholder-logo.svg';
                                        target.dataset.fallback = 'true';
                                      }
                                    }}
                                    className="w-12 h-12 object-contain rounded-full bg-white p-1.5 shadow border border-gray-200 dark:border-gray-600"
                                />
                                <div>
                                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">{b.nombre}</h4>
                                  {b.limite > 0 && (
                                      <div className="mt-2 flex items-center">
                            <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-0.5 rounded-full border border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700 shadow">
                              Límite: ${b.limite.toLocaleString()}
                            </span>
                                      </div>
                                  )}
                                </div>
                              </a>
                          ) : (
                              <div
                                  key={i}
                                  className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition flex items-center space-x-4 cursor-default"
                              >
                      <span className="absolute top-3 right-3 bg-purple-100 text-purple-700 text-sm font-medium px-3 py-0.5 rounded-full border border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700">
                        {b.tna.toFixed(2)}%
                      </span>
                                <img
                                    src={iconSrc}
                                    alt={b.nombre}
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      if (!target.dataset.fallback) {
                                        target.src = '/placeholder-logo.svg';
                                        target.dataset.fallback = 'true';
                                      }
                                    }}
                                    className="w-12 h-12 object-contain rounded-full bg-white p-1.5 shadow border border-gray-200 dark:border-gray-600"
                                />
                                <div>
                                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">{b.nombre}</h4>
                                  {b.limite > 0 && (
                                      <div className="mt-2 flex items-center">
                            <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-0.5 rounded-full border border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700 shadow">
                              Límite: ${b.limite.toLocaleString()}
                            </span>
                                      </div>
                                  )}
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
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Criptomonedas</h3>
                        <a
                            href="/simulator"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-500 font-medium text-sm transition-colors px-3 py-1 rounded-md border border-transparent hover:bg-blue-50 dark:hover:bg-gray-800"
                        >
                          Simular rendimiento
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14m-7 7h7a2 2 0 002-2v-7" />
                          </svg>
                        </a>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="table-auto w-full text-sm rounded-xl bg-white dark:bg-gray-900 shadow-md divide-y divide-gray-200 dark:divide-gray-700">
                          <thead>
                          <tr className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 uppercase text-center tracking-wide">
                            <th className="px-4 py-3 text-gray-800 dark:text-gray-100">Criptomoneda</th>
                            {sortedCripto.map((entidad, idx) => {
                              const iconSrc = resolveIcon(entidad.entidad) || entidad.logo || '/placeholder-logo.svg';
                              return (
                                  <th key={idx} className="px-4 py-3 text-center text-gray-800 dark:text-gray-100">
                                    {entidad.url ? (
                                        <a
                                            href={entidad.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex flex-col items-center justify-center space-y-1 hover:underline"
                                        >
                                          <img
                                              src={iconSrc}
                                              alt={entidad.entidad}
                                              loading="lazy"
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                if (!target.dataset.fallback) {
                                                  target.src = '/placeholder-logo.svg';
                                                  target.dataset.fallback = 'true';
                                                }
                                              }}
                                              className="w-10 h-10 object-contain rounded-full bg-white p-1 shadow-sm"
                                          />
                                          <span className="text-xs font-medium text-gray-800 dark:text-gray-100">{entidad.entidad}</span>
                                        </a>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center space-y-1">
                                          <img
                                              src={iconSrc}
                                              alt={entidad.entidad}
                                              loading="lazy"
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                if (!target.dataset.fallback) {
                                                  target.src = '/placeholder-logo.svg';
                                                  target.dataset.fallback = 'true';
                                                }
                                              }}
                                              className="w-10 h-10 object-contain rounded-full bg-white p-1 shadow-sm"
                                          />
                                          <span className="text-xs font-medium text-gray-800 dark:text-gray-100">{entidad.entidad}</span>
                                        </div>
                                    )}
                                  </th>
                              );
                            })}
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
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 font-semibold text-left flex items-center gap-2">
                                        <img
                                            src={predefinedAssets.find(a => a.ticker === moneda)?.logo || getCryptoLogoUrl(moneda)}
                                            alt={moneda}
                                            className="w-7 h-7 rounded-full bg-white dark:bg-gray-700 shadow-sm"
                                            style={{ minWidth: 28, minHeight: 28 }}
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              if (!target.dataset.fallback) {
                                                target.src = "/placeholder-logo.svg";
                                                target.dataset.fallback = "true";
                                              }
                                            }}
                                        />
                                        {moneda}
                                      </td>
                                      {sortedCripto.map((entidad, cidx) => {
                                        const rendimiento = entidad.rendimientos.find(r => r.moneda === moneda);
                                        const isMax = rendimiento && typeof rendimiento.apy === 'number' && rendimiento.apy === maxAPY && maxAPY > 0;
                                        return (
                                            <td
                                                key={cidx}
                                                className={`px-4 py-3 text-sm text-gray-800 dark:text-gray-200 text-center ${
                                                    isMax
                                                        ? 'bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-300 font-semibold ring-1 ring-orange-200 dark:ring-orange-600 rounded-md'
                                                        : ''
                                                }`}
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

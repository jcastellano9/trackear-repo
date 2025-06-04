// Página principal del Dashboard con indicadores, gráficos y cotizaciones
import React, { useEffect, useState } from 'react';
import type { ChartOptions } from 'chart.js';
import { usePortfolioData } from '../hooks/usePortfolioData';
// import { useSupabase } from '../contexts/SupabaseContext';
// import { useAuth } from '../contexts/AuthContext';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import axios from 'axios';

// Registrar componentes de ChartJS para habilitar gráficos de líneas y dona
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// Definir tipos para cotizaciones de dólar y cripto
interface DollarQuote {
  name: string;
  buy: number;
  sell: number;
  variation: number | null;
}

interface CryptoQuote {
  name: string;
  price: number;
  variation: number;
}


const Dashboard: React.FC = () => {
  // Obtener contexto de Supabase y usuario autenticado
  // const supabase = useSupabase();
  // const { user } = useAuth();

  // Estados de visualización y preferencias
  const [showInARS, setShowInARS] = useState(true); // Alternar entre mostrar en ARS o USD
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark')); // Detectar modo oscuro
  useEffect(() => {
    // Observar cambios en la clase 'dark' para actualizar isDarkMode
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Filtrar por tipo de activo para resúmenes y gráficos
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'Cripto' | 'CEDEAR' | 'Acción'>('Todos');

  // Obtener datos y funciones del hook de portafolio
  const {
    investments,
    loading: loadingDashboard,
    error: dashboardError,
    getResumenDashboardFiltrado,
    getCapitalEvolutionData,
    marketPrices,
    cclPrice,
  } = usePortfolioData();

  // Obtener resumen global filtrado con parámetros actuales
  const resumenGlobal = getResumenDashboardFiltrado({
    typeFilter,
    merge: true,
    search: '',
    showInARS,
  });
  const totalInvested = resumenGlobal?.invertido ?? 0; // Total invertido
  const currentValue = resumenGlobal?.valorActual ?? 0; // Valor actual del portafolio
  const profit = resumenGlobal?.cambioTotal ?? 0; // Ganancia o pérdida total
  const profitPercentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0; // Porcentaje de rendimiento

  // Estados de cotizaciones y carga de datos de mercado
  const [dollarQuotes, setDollarQuotes] = useState<DollarQuote[]>([]);
  const [cryptoQuotes, setCryptoQuotes] = useState<CryptoQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);

  // Estado para inflación mensual oficial: valor, fecha y posible error
  const [lastInflation, setLastInflation] = useState<number | null>(null);
  const [inflationError, setInflationError] = useState(false);
  useEffect(() => {
    // Obtener datos de inflación desde datos.gob.ar y actualizar estado
    const fetchInflationData = async () => {
      try {
        const response = await fetch('https://apis.datos.gob.ar/series/api/series/?metadata=full&collapse=month&ids=103.1_I2N_2016_M_19&limit=5000&representation_mode=percent_change&start=0');
        const json = await response.json();
        const rawData = json.data;
        if (rawData && rawData.length > 0) {
          const today = new Date();
          const recentEntry = rawData
            .map((entry: [string, number | null]): { date: Date; value: number | null } => ({
              date: new Date(entry[0]),
              value: entry[1]
            }))
            .filter(
              (entry: { date: Date; value: number | null }): entry is { date: Date; value: number } =>
                entry.date <= today && entry.value !== null
            )
            .sort(
              (a: { date: Date; value: number }, b: { date: Date; value: number }) =>
                b.date.getTime() - a.date.getTime()
            )[0];
          if (recentEntry) {
            setLastInflation(recentEntry.value! * 100);
          } else {
            console.warn("No hay datos de inflación recientes.");
            setInflationError(true);
          }
        } else {
          console.warn("No se recibieron datos de inflación.");
          setInflationError(true);
        }
      } catch (error) {
        console.error('Error al obtener inflación desde datos.gob.ar:', error);
        setInflationError(true);
      }
    };
    fetchInflationData();
  }, []);

  // Recalcular distribución del portafolio por tipo usando valores actuales filtrados
  const distributionData = React.useMemo(() => {
    // Etiquetas para gráfico de dona
    const labels = ['Criptomonedas', 'CEDEARs', 'Acciones'] as string[];

    // Obtener valor actual por cada tipo de activo
    const typeKeys: ('Cripto' | 'CEDEAR' | 'Acción')[] = ['Cripto', 'CEDEAR', 'Acción'];
    const values = typeKeys.map(type => {
      const r = getResumenDashboardFiltrado({
        typeFilter: type,
        merge: true,
        search: '',
        showInARS,
      });
      return r.valorActual || 0;
    });
    const total = values.reduce((sum, v) => sum + v, 0);
    const data = total === 0 ? [1, 0, 0] : values;

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#F97316', '#A855F7', '#0EA5E9'],
        borderColor: ['#EA580C','#9333EA','#0284C7'],
        borderWidth: 1,
      }]
    };
  }, [getResumenDashboardFiltrado, showInARS]);

  // Estado temporal para filtro de rango de tiempo en evolución de capital
  const [selectedRange, setSelectedRange] = useState<'All' | '1M' | '3M' | '6M' | 'YTD' | '1Y'>('All');

  // Datos para gráfico de evolución de capital
  const [capitalData, setCapitalData] = useState<{ labels: string[]; datasets: any[] }>({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    // Obtener evolución del capital y aplicar filtro de rango
    const dataRaw = getCapitalEvolutionData({ showInARS }) || [];
    let filteredDataRaw;
    if (selectedRange === 'All') {
      filteredDataRaw = dataRaw;
    } else {
      const now = new Date();
      const threshold = new Date(now);
      switch (selectedRange) {
        case '1M':
          threshold.setMonth(now.getMonth() - 1);
          break;
        case '3M':
          threshold.setMonth(now.getMonth() - 3);
          break;
        case '6M':
          threshold.setMonth(now.getMonth() - 6);
          break;
        case 'YTD':
          threshold.setFullYear(now.getFullYear(), 0, 1);
          break;
        case '1Y':
          threshold.setFullYear(now.getFullYear() - 1);
          break;
        default:
          break;
      }
      filteredDataRaw = dataRaw.filter(item => new Date(item.fecha) >= threshold);
    }
    if (!Array.isArray(filteredDataRaw) || filteredDataRaw.length === 0) {
      setCapitalData({ labels: [], datasets: [] });
      return;
    }
    // Extraer etiquetas (fechas) y series sin modificaciones
    const labels = filteredDataRaw.map(item => item.fecha);
    const seriesCripto = filteredDataRaw.map(item => item.Cripto);
    const seriesCedear = filteredDataRaw.map(item => item.CEDEAR);
    const seriesAccion = filteredDataRaw.map(item => item['Acción']);

    // Lógica de ajuste para vista ARS/USD
    const cclRate = cclPrice ?? 1;
    let seriesCriptoAdjusted = seriesCripto;
    let seriesCedearAdjusted = seriesCedear;
    let seriesAccionAdjusted = seriesAccion;
    if (showInARS) {
      // En ARS, multiplicar CEDEAR y Acción por CCL
      seriesCedearAdjusted = seriesCedear.map(val => val / cclRate);
      seriesAccionAdjusted = seriesAccion.map(val => val / cclRate);
    } else {
      // En USD, dividir Cripto por CCL
      seriesCedearAdjusted = seriesCedear.map(val => val / cclRate);
      seriesAccionAdjusted = seriesAccion.map(val => val / cclRate);
    }

    // Definir colores para cada tipo de activo
    const colorMap = {
      Cripto: { bg: 'rgba(249, 115, 22, 0.2)', border: '#F97316' },
      CEDEAR: { bg: 'rgba(168, 85, 247, 0.2)', border: '#A855F7' },
      Acción: { bg: 'rgba(14, 165, 233, 0.2)', border: '#0EA5E9' },
    };

    // Construir datasets filtrando por typeFilter
    let datasets;
    if (typeFilter === 'Todos') {
      datasets = [
        {
          label: 'Cripto',
          data: seriesCriptoAdjusted,
          fill: false,
          borderColor: colorMap.Cripto.border,
          borderWidth: 1,
          tension: 0.3,
        },
        {
          label: 'CEDEAR',
          data: seriesCedearAdjusted,
          fill: false,
          borderColor: colorMap.CEDEAR.border,
          borderWidth: 1,
          tension: 0.3,
        },
        {
          label: 'Acción',
          data: seriesAccionAdjusted,
          fill: false,
          borderColor: colorMap.Acción.border,
          borderWidth: 1,
          tension: 0.3,
        },
      ];
    } else {
      const mapSeries: Record<'Cripto' | 'CEDEAR' | 'Acción', number[]> = {
        Cripto: seriesCriptoAdjusted,
        CEDEAR: seriesCedearAdjusted,
        Acción: seriesAccionAdjusted,
      };
      const selectedSeries = mapSeries[typeFilter];
      datasets = [
        {
          label: typeFilter,
          data: selectedSeries,
          fill: false,
          borderColor: colorMap[typeFilter].border,
          borderWidth: 1,
          tension: 0.3,
        }
      ];
    }
    setCapitalData({ labels, datasets });
  }, [
    showInARS,
    investments,
    marketPrices,
    cclPrice,
    typeFilter,
    selectedRange,
    isDarkMode,
  ]);

  // Obtener datos de mercado: cotizaciones de dólar y cripto
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoadingQuotes(true);

        // Obtener cotizaciones del dólar - unificado
        try {
          const response = await axios.get('https://dolarapi.com/v1/ambito/dolares');
          const quotes: DollarQuote[] = response.data.map((item: any) => {
            const rawName = item.nombre;
            const name = rawName === 'Contado con liquidación' ? 'CCL' : rawName;
            return {
              name,
              buy: item.compra,
              sell: item.venta,
              variation: item.variacion ?? null
            };
          });
          setDollarQuotes(quotes);
        } catch (err) {
          console.error('Error al obtener cotizaciones del dólar:', err);
          setDollarQuotes([]);
        }

        // Obtener cotizaciones de criptomonedas
        try {
          const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin&vs_currencies=ars,usd&include_24hr_change=true');
          const data = res.data;
          const formattedCryptoQuotes: CryptoQuote[] = [
            { name: 'USDT', price: data['tether'].ars, variation: data['tether'].ars_24h_change },
            { name: 'USDC', price: data['usd-coin'].ars, variation: data['usd-coin'].ars_24h_change },
            { name: 'BTC', price: data['bitcoin'].usd, variation: data['bitcoin'].usd_24h_change },
            { name: 'ETH', price: data['ethereum'].usd, variation: data['ethereum'].usd_24h_change }
          ];
          setCryptoQuotes(formattedCryptoQuotes);
        } catch (error) {
          console.error('Error al obtener cotizaciones cripto:', error);
          setCryptoQuotes([]);
        }
      } catch (error) {
        console.error('Error al obtener datos de mercado:', error);
      } finally {
        setLoadingQuotes(false);
      }
    };

    // Llamar a la función e iniciar intervalo de refresco cada 5 minutos
    fetchMarketData();
    const refreshInterval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Opciones para gráfico de líneas (evolución de capital)
  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y ?? context.raw;
            return showInARS
              ? `${label}: ${value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : `${label}: ${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value: number) {
            return showInARS
              ? value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              : value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
        }
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  } as ChartOptions<'line'>;

  // PARCHADO getCapitalEvolutionData para usar "Acción" de forma consistente
  // (Si se mueve esta función, mantener este parche)
  // Opciones para gráfico de dona (distribución de portafolio)
  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw;
            const total = context.chart._metasets[0].total || 1;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '50%',
  };

  // Formatear números como ARS
  const formatARS = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Formatear números como USD
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado del Dashboard con título y subtítulo */}
      <div>
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        </div>
        <p className="text-gray-600">Bienvenido a tu panel financiero</p>
      </div>

      {/*
        Indicadores principales
        Mostrar total invertido, valor actual, ganancia/pérdida y rendimiento
        usando exclusivamente valores de resumenGlobal del hook.
        Botón ARS/USD cambia solo el formato visual, no la lógica ni el origen.
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invertido */}
        <div className="bg-white rounded-none p-5 border border-gray-100 flex flex-col items-center justify-center text-center">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Total Invertido ({showInARS ? 'ARS' : 'USD'})
            </p>
            {loadingDashboard ? (
              <div className="h-7 w-28 bg-gray-200 rounded mt-1"></div>
            ) : (
              <p className="text-xl font-bold text-gray-800 mt-1">
                {showInARS ? formatARS(totalInvested) : formatUSD(totalInvested)}
              </p>
            )}
          </div>
        </div>

        {/* Valor Actual */}
        <div className="bg-white rounded-none p-5 border border-gray-100 flex flex-col items-center justify-center text-center">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Valor Actual ({showInARS ? 'ARS' : 'USD'})
            </p>
            {loadingDashboard ? (
              <div className="h-7 w-28 bg-gray-200 rounded mt-1"></div>
            ) : (
              <p className="text-xl font-bold text-gray-800 mt-1">
                {showInARS ? formatARS(currentValue) : formatUSD(currentValue)}
              </p>
            )}
          </div>
        </div>

        {/* Ganancia/Pérdida */}
        <div className="bg-white rounded-none p-5 border border-gray-100 flex flex-col items-center justify-center text-center">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Ganancia/Pérdida ({showInARS ? 'ARS' : 'USD'})
            </p>
            {loadingDashboard ? (
              <div className="h-7 w-28 bg-gray-200 rounded mt-1"></div>
            ) : (
              <div className="flex items-center mt-1">
                <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {showInARS ? formatARS(profit) : formatUSD(profit)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rendimiento */}
        <div className="bg-white rounded-none p-5 border border-gray-100 flex flex-col items-center justify-center text-center">
          <div>
            <p className="text-sm font-medium text-gray-500">Rendimiento</p>
            {loadingDashboard ? (
              <div className="h-7 w-28 bg-gray-200 rounded mt-1"></div>
            ) : (
              <div className="flex items-center mt-1">
                <p className={`text-xl font-bold ${profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitPercentage.toFixed(2)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mostrar mensaje de error si ocurre al cargar datos del Dashboard */}
      {dashboardError && (
        <div className="bg-red-100 text-red-700 px-4 py-3 rounded-none mt-4">
          Error cargando datos del dashboard: {typeof dashboardError === 'string' ? dashboardError : String(dashboardError)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolución del Capital con gráfico de líneas */}
        <div className="lg:col-span-2 bg-white rounded-none p-5 border border-gray-100">
          {/* Seleccionar rango de tiempo para el gráfico */}
          <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Evolución del Capital</h2>
            <div className="flex gap-2 text-sm items-center">
              <label className="mr-1" htmlFor="range-select">Rango:</label>
              <select
                id="range-select"
                value={selectedRange}
                onChange={e => setSelectedRange(e.target.value as 'All' | '1M' | '3M' | '6M' | 'YTD' | '1Y')}
                className="border border-gray-300 rounded-none px-2 py-1 text-sm"
              >
                <option value="All">All</option>
                <option value="1M">1M</option>
                <option value="3M">3M</option>
                <option value="6M">6M</option>
                <option value="YTD">YTD</option>
                <option value="1Y">1Y</option>
              </select>
              <label className="ml-4 mr-1" htmlFor="type-filter-select">Tipo:</label>
              <select
                id="type-filter-select"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as 'Todos'|'Cripto'|'CEDEAR'|'Acción')}
                className="border border-gray-300 rounded-none px-2 py-1 text-sm"
              >
                <option value="Todos">Todos</option>
                <option value="Acción">Acciones</option>
                <option value="CEDEAR">CEDEARs</option>
                <option value="Cripto">Criptomonedas</option>
              </select>
              {/* Switch ARS/USD estilo portfolio */}
              <label className="ml-4 flex items-center gap-2 cursor-pointer select-none">
                <span className="relative inline-block w-11 h-6">
                  <input
                    type="checkbox"
                    checked={showInARS}
                    onChange={e => setShowInARS(e.target.checked)}
                    className="sr-only peer"
                  />
                  <span
                    className={
                      "block w-11 h-6 rounded-full transition-colors duration-200 " +
                      (showInARS
                        ? "bg-[#0EA5E9]"
                        : "bg-[#00793E]")
                    }
                  ></span>
                  <span
                    className={
                      "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 " +
                      (showInARS
                        ? "translate-x-5"
                        : "")
                    }
                  ></span>
                </span>
                <span className="ml-2 text-sm font-semibold text-gray-700">
                  {showInARS ? "ARS" : "USD"}
                </span>
              </label>
            </div>
          </div>
          <div className="min-h-[18rem] sm:min-h-[20rem] md:min-h-[22rem]">
            <Line data={capitalData} options={lineOptions} />
          </div>
        </div>

        {/* Distribución del Portafolio con gráfico de dona */}
        <div className="bg-white rounded-none p-5 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Distribución del Portfolio</h2>
          </div>
          <div className="flex flex-col items-center justify-center h-full py-6">
            <div className="w-full flex justify-center">
              <div className="h-64 w-64">
                <Doughnut data={{
                  ...distributionData,
                  datasets: [
                    {
                      ...distributionData.datasets[0],
                      // Quitar borderColor
                      borderColor: undefined,
                    }
                  ]
                }} options={doughnutOptions} />
              </div>
            </div>
            {/* Leyenda personalizada para mostrar porcentaje por tipo */}
            <div className="mt-6 text-sm text-gray-700">
              <ul className="flex flex-col items-center gap-2">
                {distributionData.labels.map((label, i) => {
                  const value = distributionData.datasets[0].data[i];
                  const total = distributionData.datasets[0].data.reduce((acc, val) => acc + val, 0);
                  const percent = ((value / total) * 100).toFixed(1);
                  const color = distributionData.datasets[0].backgroundColor[i];
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-2 whitespace-nowrap px-2 py-1 rounded-none bg-gray-100 w-fit"
                    >
                      <span className="inline-block w-3 h-3 rounded-none" style={{ backgroundColor: color }}></span>
                      <span className="font-medium">{label}</span>
                      <span className="text-gray-500">({percent}%)</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Datos de mercado: cotizaciones de dólar y cripto */}
      <div className="grid grid-cols-1 gap-6">
        {/* Cotizaciones del Dólar */}
        <div
          className="bg-white rounded-none p-5 border border-gray-100"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Cotizaciones del Dólar</h2>
          </div>
          {loadingQuotes ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Cargando datos...</p>
            </div>
          ) : dollarQuotes.length > 0 ? (
            <div className="grid grid-cols-7 gap-3 justify-center">
              {dollarQuotes.map((quote, index) => (
                <div
                  key={index}
                  className="w-full bg-white rounded-none border p-4 flex flex-col items-center justify-center text-center"
                >
                  <h3>{quote.name}</h3>
                  <div className="grid grid-cols-2 gap-4 justify-items-center">
                    <div>
                      <div className="text-xs text-gray-500">Venta</div>
                      <div className="font-medium text-black">{formatARS(quote.sell)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Compra</div>
                      <div className="font-medium text-black">{formatARS(quote.buy)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">No hay datos disponibles</p>
            </div>
          )}
        </div>

        {/* Cotizaciones Cripto */}
        <div
          className="bg-white rounded-none p-5 border border-gray-100"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Cotizaciones Cripto</h2>
          </div>
          {loadingQuotes ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Cargando datos...</p>
            </div>
          ) : cryptoQuotes.length > 0 ? (
            <div className="grid grid-cols-5 gap-3 justify-center">
              {cryptoQuotes
                .filter(quote => typeof quote.price === 'number' && quote.price > 0)
                .map((quote, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-none border p-4 flex flex-col items-center justify-center text-center"
                  >
                    <h3>{quote.name}</h3>
                    <div className="text-xs text-gray-500 mb-2">
                      {['USDT','USDC'].includes(quote.name) ? 'Moneda estable' : 'Criptomoneda'}
                    </div>
                    <div className="grid grid-cols-2 gap-4 justify-items-center">
                      <div>
                        <div className="text-xs text-gray-500">
                          {['BTC','ETH'].includes(quote.name) ? 'Precio (USD)' : 'Precio (ARS)'}
                        </div>
                        <div className="font-medium text-black">
                          {['BTC','ETH'].includes(quote.name) ? formatUSD(quote.price) : formatARS(quote.price)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Variación 24h</div>
                        <div className={`text-sm font-medium ${quote.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {quote.variation >= 0 ? '+' : ''}{quote.variation.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {/* Inflación mensual simplificada */}
              <div className="bg-white border p-4 text-center rounded-none flex flex-col items-center justify-center h-full">
                <p className="text-sm text-gray-600">Inflación mensual esperada</p>
                {inflationError ? (
                  <p className="text-base text-red-500">Sin datos</p>
                ) : lastInflation !== null ? (
                  <p className="text-xl font-bold text-black">{lastInflation.toFixed(2)}%</p>
                ) : (
                  <p className="text-sm text-gray-500">Cargando...</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">No hay datos disponibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

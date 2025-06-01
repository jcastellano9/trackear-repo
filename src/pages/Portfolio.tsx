import React, { useState, useEffect } from 'react';
import { usePortfolioData } from '../hooks/usePortfolioData';


interface Investment {
  id: string;
  ticker: string;
  name: string;
  type: 'Cripto' | 'Acción' | 'CEDEAR';
  quantity: number;
  purchasePrice: number;
  allocation: number;
  purchaseDate: string;
  currency: 'USD' | 'ARS';
}

interface NewInvestment {
  ticker: string;
  name: string;
  type: 'Cripto' | 'Acción' | 'CEDEAR';
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  currency: 'USD' | 'ARS';
  allocation: number;
}


// Componente Portfolio: maneja estado y renderiza la interfaz de cartera de inversiones
const Portfolio: React.FC = () => {
  // useState: definiciones de estados para búsqueda, filtros, modales, precios, etc.
  const {
    investments,
    loading,
    error: fetchError,
    cclPrice,
    predefinedAssets,
    marketPrices,
    getAssetKey,
    getNormalizedPpcKey,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    handleAssetSelect,
    success,
    setSuccess,
    exportToCSV,
    getResumenGlobalFiltrado,
    ppcMap
  } = usePortfolioData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'Todos' | 'CEDEAR' | 'Cripto' | 'Acción'>('Todos');
  const [mergeTransactions, setMergeTransactions] = useState(true);
  const [showInARS, setShowInARS] = useState(true);
  const [sortBy, setSortBy] = useState<
    'tickerAZ' | 'tickerZA' |
    'gananciaPorcentajeAsc' | 'gananciaPorcentajeDesc' |
    'gananciaValorAsc' | 'gananciaValorDesc' |
    'tenenciaAsc' | 'tenenciaDesc' |
    'fechaAsc' | 'fechaDesc'
  >('fechaDesc');

  const [editId, setEditId] = useState<string | null>(null);

  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [_currentPrice, _setCurrentPrice] = useState<number | null>(null);

  const [newInvestment, setNewInvestment] = useState<NewInvestment>({
    ticker: '',
    name: '',
    type: 'CEDEAR',
    quantity: 0,
    purchasePrice: 0,
    purchaseDate: new Date().toLocaleDateString('sv-SE'),
    currency: 'ARS',
    allocation: 0,
  });


  const filteredAssets = (predefinedAssets ?? []).filter(
    (asset) =>
      assetSearchTerm.length === 0 ||
      asset.ticker.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
      asset.name.toLowerCase().includes(assetSearchTerm.toLowerCase())
  );


  // calculateReturn: Calcula ganancia/pérdida ajustando por tipo y moneda
  const calculateReturn = (
    current: number,
    purchase: number,
    currency: 'USD' | 'ARS',
    showInARS: boolean,
    cclPrice: number | null,
    type?: 'Cripto' | 'Acción' | 'CEDEAR'
  ) => {
    if (!purchase || isNaN(current) || isNaN(purchase)) {
      return { amount: 0, percentage: 0 };
    }

    let adjustedCurrent = current;
    let adjustedPurchase = purchase;

    if (type === 'Cripto') {
      if (showInARS && cclPrice) {
        adjustedCurrent = current * cclPrice;
        adjustedPurchase = purchase * cclPrice;
      }
    }
    else if ((type === 'Acción' || type === 'CEDEAR')) {
      if (currency === 'USD' && showInARS && cclPrice) {
        adjustedCurrent = current * cclPrice;
        adjustedPurchase = purchase * cclPrice;
      } else if (currency === 'ARS' && !showInARS && cclPrice) {
        adjustedCurrent = current / cclPrice;
        adjustedPurchase = purchase / cclPrice;
      }
    }

    const difference = adjustedCurrent - adjustedPurchase;
    const percentage = (difference / adjustedPurchase) * 100;
    return {
      amount: difference,
      percentage: percentage
    };
  };

  // getAdjustedPrice: Ajusta precio actual según tipo de inversión y moneda
  const getAdjustedPrice = (inv: Investment): number => {
    const key = getAssetKey(inv);
    let price = marketPrices[key] ?? inv.purchasePrice;

    if (inv.type === 'Cripto') {
      if (showInARS && cclPrice) {
        price *= cclPrice;
      }
    } else if (inv.type === 'CEDEAR' || inv.type === 'Acción') {
      if (inv.currency === 'USD' && showInARS && cclPrice) {
      } else if (inv.currency === 'ARS' && !showInARS && cclPrice) {
        price = price / cclPrice;
      } else if (inv.currency === 'USD' && !showInARS && cclPrice) {
        price = price / cclPrice;
      }
    }

    return price;
  };

  // getAdjustedPpc: Ajusta PPC según tipo de inversión, moneda y fusión de transacciones
  const getAdjustedPpc = (inv: Investment): number => {
    const ppcKey = getNormalizedPpcKey(inv);
    let ppcUnit = mergeTransactions
      ? ppcMap[ppcKey] ?? inv.purchasePrice
      : inv.purchasePrice;

    if (inv.type === 'Cripto') {
      if (showInARS && cclPrice) {
        ppcUnit *= cclPrice;
      }
    } else if (inv.type === 'CEDEAR' || inv.type === 'Acción') {
      if (inv.currency === 'USD' && showInARS && cclPrice) {
        ppcUnit *= cclPrice;
      } else if (inv.currency === 'ARS' && !showInARS && cclPrice) {
        ppcUnit /= cclPrice;
      }
    }
    return ppcUnit;
  };

  // Filtra inversiones por término de búsqueda y tipo
  const filteredInvestments = (investments ?? [])
    .filter(investment =>
      investment.ticker &&
      !isNaN(investment.purchasePrice) &&
      !isNaN(investment.quantity) &&
      (activeTypeFilter === 'Todos' || investment.type === activeTypeFilter) &&
      (investment.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        investment.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  // Agrupa transacciones idénticas si mergeTransactions es true
  const displayedInvestments = mergeTransactions
    ? Object.values(
        filteredInvestments.reduce((acc, inv) => {
          const key = `${inv.ticker}-${inv.type}`;
          if (!acc[key]) {
            acc[key] = { ...inv };
          } else {
            const prevQty = acc[key].quantity;
            const newQty = prevQty + inv.quantity;
            acc[key].purchasePrice =
              (acc[key].purchasePrice * prevQty + inv.purchasePrice * inv.quantity) / newQty;
            acc[key].quantity = newQty;
            acc[key].allocation = (acc[key].allocation ?? 0) + (inv.allocation ?? 0);
          }
          return acc;
        }, {} as Record<string, Investment>)
      )
    : filteredInvestments;

  // getChangeAmt: Calcula cambio absoluto (precio ajustado - PPC) * cantidad
  const getChangeAmt = (inv: Investment): number => {
    const priceUnit = getAdjustedPrice(inv);
    const ppcUnit   = getAdjustedPpc(inv);
    return (priceUnit - ppcUnit) * inv.quantity;
  };
  // sortedInvestments: Ordena inversiones según criterio seleccionado
  const sortedInvestments = [...displayedInvestments].sort((a, b) => {
    if (sortBy === 'tickerAZ') return a.ticker.localeCompare(b.ticker);
    if (sortBy === 'tickerZA') return b.ticker.localeCompare(a.ticker);

    const getPct = (inv: Investment) => {
      const pct = calculateReturn(
        getAdjustedPrice(inv),
        inv.purchasePrice,
        inv.currency,
        showInARS,
        cclPrice,
        inv.type
      ).percentage;
      return isNaN(pct) ? 0 : pct;
    };
    if (sortBy === 'gananciaPorcentajeAsc')  return getPct(a) - getPct(b);
    if (sortBy === 'gananciaPorcentajeDesc') return getPct(b) - getPct(a);

    if (sortBy === 'gananciaValorAsc')  return getChangeAmt(a) - getChangeAmt(b);
    if (sortBy === 'gananciaValorDesc') return getChangeAmt(b) - getChangeAmt(a);

    const getTen = (inv: Investment) => getAdjustedPrice(inv) * inv.quantity;
    if (sortBy === 'tenenciaAsc')  return getTen(a) - getTen(b);
    if (sortBy === 'tenenciaDesc') return getTen(b) - getTen(a);

    const dateDiff = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
    if (sortBy === 'fechaAsc')  return dateDiff;
    if (sortBy === 'fechaDesc') return -dateDiff;

    return 0;
  });


  // formatCurrency: Formatea valor en ARS o USD con localización 'es-AR'
  const formatCurrency = (value: number, currency: 'USD' | 'ARS' = 'ARS') => {
    const formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
      notation: 'standard',
      useGrouping: true
    });
    return formatter.format(value);
  };

  const totalCurrencyToShow = showInARS ? 'ARS' : 'USD';

  // useEffect: Captura errores globales y los registra en consola
  useEffect(() => {
    window.onerror = function (message, source, lineno, colno, error) {
      console.error("Global Error:", { message, source, lineno, colno, error });
    };
  }, []);

  // Mostrar estados de carga y error antes de renderizar el contenido principal
  if (loading) return <div className="text-center py-10">Cargando inversiones…</div>;
  if (fetchError) return <div className="text-center py-10 text-red-500">Error al cargar inversiones: {fetchError}</div>;

  // totalTenencia: Suma valor (precio ajustado * cantidad) de cada inversión
  const totalTenencia = displayedInvestments.reduce(
    (acc, inv) => {
      const key = getAssetKey(inv);
      const ppcKey = getNormalizedPpcKey(inv);
      const currentPrice = marketPrices[key] ?? inv.purchasePrice;

      const isMerged = mergeTransactions;
      const priceOfPurchase = isMerged
        ? ppcMap[ppcKey] ?? inv.purchasePrice
        : inv.purchasePrice;

      let priceUnit = currentPrice;
      let ppcUnit = priceOfPurchase;

      if (inv.type === 'Cripto') {
        if (showInARS && cclPrice) {
          priceUnit = currentPrice * cclPrice;
          ppcUnit = ppcUnit * cclPrice;
        }
      } else if (inv.type === 'CEDEAR' || inv.type === 'Acción') {
        if (inv.currency === 'USD' && showInARS && cclPrice) {
          priceUnit = currentPrice;
          ppcUnit = ppcUnit * cclPrice;
        } else if (inv.currency === 'ARS' && !showInARS && cclPrice) {
          priceUnit = currentPrice / cclPrice;
          ppcUnit = ppcUnit / cclPrice;
        } else if (inv.currency === 'USD' && !showInARS && cclPrice) {
          priceUnit = currentPrice / cclPrice;
        }
      }

      return acc + priceUnit * inv.quantity;
    },
    0
  );

  // resumenGlobal: Genera métricas generales (invertido, cambioTotal, valorActual, etc.)
  const resumenGlobal = getResumenGlobalFiltrado({
    inversiones: displayedInvestments,
    ppcMap,
    marketPrices,
    mergeTransactions,
    showInARS,
    cclPrice
  });
  const resultadoPorcentaje = resumenGlobal.invertido > 0
    ? (resumenGlobal.cambioTotal / resumenGlobal.invertido) * 100
    : 0;

  const resumenGlobalCompleto = getResumenGlobalFiltrado({
    inversiones: investments,
    ppcMap,
    marketPrices,
    mergeTransactions,
    showInARS,
    cclPrice
  });


  return (
    <>
      {typeof success === 'string' && (
        <div className="fixed bottom-6 right-6 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-md border border-green-200 transition-opacity z-50">
          ✅ {success}
        </div>
      )}
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-black">Mi Cartera</h1>
            <p className="text-gray-600">Gestiona tus inversiones</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-end items-center">
            <button
              onClick={() => exportToCSV()}
              className="px-4 py-2 text-sm bg-black text-white border border-black"
              title="Descargar CSV"
            >
              Exportar
            </button>
            <label className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-black border border-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showInARS}
                onChange={() => setShowInARS(prev => !prev)}
                className="mr-2"
              />
              Mostrar en ARS
            </label>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-sm bg-black text-white border border-black"
            >
              Agregar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 text-center text-sm font-medium">
          <div className="p-4 border bg-gray-100 flex flex-col justify-center items-center">
            <h3>Total de inversiones</h3>
            <p className="text-xl font-bold mt-1 text-center leading-tight text-black">
              {mergeTransactions
                ? displayedInvestments.length
                : filteredInvestments.length}
            </p>
          </div>
          <div className="p-4 border bg-gray-100 flex flex-col justify-center items-center">
            <h3>Invertido</h3>
            <p className="text-xl font-bold mt-1 text-black">
              {formatCurrency(
                resumenGlobal.invertido,
                totalCurrencyToShow
              )}
            </p>
          </div>
          <div className="p-4 border bg-gray-100 flex flex-col justify-center items-center col-span-full md:col-span-2 md:col-start-3">
            <h3>Valor Total del Portafolio</h3>
            <p className="text-xl font-bold mt-1 text-black">
              {formatCurrency(
                resumenGlobalCompleto.valorActual,
                showInARS ? 'ARS' : 'USD'
              )}
            </p>
          </div>
          <div className="p-4 border bg-gray-100 flex flex-col justify-center items-center">
            <h3>Actual</h3>
            <p className="text-xl font-bold mt-1 text-black">
              {formatCurrency(resumenGlobal.valorActual, totalCurrencyToShow)}
            </p>
          </div>
          <div className="p-4 border bg-gray-100 flex flex-col justify-center items-center">
            <h3>Resultado</h3>
            <p className="text-xl font-bold mt-1 text-black">
              {formatCurrency(resumenGlobal.cambioTotal, totalCurrencyToShow)} ({resultadoPorcentaje.toFixed(2)}%)
            </p>
          </div>
        </div>

        <div className="bg-white p-6 border">
          <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
            <div>
              <select
                value={activeTypeFilter}
                onChange={e => setActiveTypeFilter(e.target.value as any)}
                className="border p-2"
              >
                <option value="Todos">Todos</option>
                <option value="Acción">Acciones</option>
                <option value="CEDEAR">CEDEARs</option>
                <option value="Cripto">Criptomonedas</option>
              </select>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                aria-pressed={mergeTransactions}
                onClick={() => setMergeTransactions((prev) => !prev)}
                className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none ${
                  mergeTransactions ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                tabIndex={0}
              >
                <span
                  className={`inline-block w-5 h-5 transform bg-white dark:bg-gray-200 rounded-full shadow transition-transform duration-200 
                    ${mergeTransactions ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
            </div>
            <div className="flex-1 flex gap-4 justify-end flex-wrap items-center">
              <input
                type="text"
                placeholder="Buscar por Ticker o Nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs w-full h-9 px-3 text-sm py-1.5 border border-gray-300"
              />
              <select
                id="sortBy"
                value={sortBy}
                onChange={e =>
                  setSortBy(e.target.value as
                    'tickerAZ' | 'tickerZA' |
                    'gananciaPorcentajeAsc' | 'gananciaPorcentajeDesc' |
                    'gananciaValorAsc' | 'gananciaValorDesc' |
                    'tenenciaAsc' | 'tenenciaDesc' |
                    'fechaAsc' | 'fechaDesc'
                  )
                }
                className="w-full max-w-xs px-3 py-2 border border-gray-300 text-sm text-gray-800"
              >
                <option value="tickerAZ">Ticker A → Z</option>
                <option value="tickerZA">Ticker Z → A</option>
                <option value="gananciaPorcentajeAsc">Ganancia % ↑</option>
                <option value="gananciaPorcentajeDesc">Ganancia % ↓</option>
                <option value="gananciaValorAsc">Ganancia $ ↑</option>
                <option value="gananciaValorDesc">Ganancia $ ↓</option>
                <option value="tenenciaAsc">Tenencia ↑</option>
                <option value="tenenciaDesc">Tenencia ↓</option>
                <option value="fechaAsc">Fecha ↑</option>
                <option value="fechaDesc">Fecha ↓</option>
              </select>
            </div>
          </div>

          {loading ? (
              <div className="flex justify-center items-center h-40">
                Cargando...
              </div>
          ) : displayedInvestments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600">Ticker</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600 text-center max-w-[5rem]">Nombre</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600 text-center">Precio Actual</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600 text-center">Cambio $</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600 text-center">Cambio %</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600 text-center">Cantidad</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600 text-center">PPC</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600 text-center">Tenencia</th>
                    {!mergeTransactions && (
                      <th className="pb-3 px-4 text-sm font-semibold text-gray-600 text-center">Fecha</th>
                    )}
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600 text-center">Asignación</th>
                    {!mergeTransactions && (
                      <th className="pb-3 px-4 text-sm font-semibold text-gray-600 text-center">Acciones</th>
                    )}
                  </tr>
                  </thead>
                  <tbody>
                  {sortedInvestments.map((investment) => {
                    const key = getAssetKey(investment);
                    const ppcKey = getNormalizedPpcKey(investment);
                    let currentPrice = marketPrices[key] ?? investment.purchasePrice;

                    if ((investment.type === 'CEDEAR' || investment.type === 'Acción') && cclPrice) {
                      if (investment.currency === 'USD' && !showInARS) {
                        currentPrice = currentPrice / cclPrice;
                      }
                    }

                    // Ajustar PPC según mergeTransactions
                    const isMerged = mergeTransactions;
                    const priceOfPurchase = isMerged
                      ? ppcMap[ppcKey] ?? investment.purchasePrice // PPC global ponderado
                      : investment.purchasePrice; // PPC individual de la transacción

                    let priceUnit = currentPrice;
                    let ppcUnit = priceOfPurchase;

                    // Conversiones claras y únicas
                    if (investment.type === 'Cripto') {
                      if (showInARS && cclPrice) {
                        priceUnit = currentPrice * cclPrice;
                        ppcUnit = ppcUnit * cclPrice;
                      }
                    } else if (investment.type === 'CEDEAR' || investment.type === 'Acción') {
                      if (investment.currency === 'USD' && showInARS && cclPrice) {
                        priceUnit = currentPrice; // YA está en ARS
                        ppcUnit = ppcUnit * cclPrice; // Pasar PPC de USD a ARS
                      }
                      else if (investment.currency === 'ARS' && !showInARS && cclPrice) {
                        priceUnit = currentPrice / cclPrice;
                        ppcUnit = ppcUnit / cclPrice; // ✅ convertir también el PPC
                      }
                    }

                    console.log("DEBUG CAMBIO:", {
                      ticker: investment.ticker,
                      type: investment.type,
                      priceUnit,
                      ppcUnit,
                      cantidad: investment.quantity,
                      currentPrice,
                      ppcRaw: ppcMap[ppcKey],
                      currency: investment.currency,
                      showInARS,
                      cclPrice
                    });

                    const differencePerUnit = priceUnit - ppcUnit;
                    const priceChange = differencePerUnit * investment.quantity;
                    const priceChangePercent = ppcUnit !== 0 ? (differencePerUnit / ppcUnit) * 100 : 0;
                    const tenencia = priceUnit * investment.quantity;
                    const asignacion = totalTenencia > 0 ? (tenencia / totalTenencia) * 100 : 0;

                    return (
                        <tr
                            key={investment.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          {/* Corazón (favorito, centrado) */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <img
                                  src={predefinedAssets.find(a => a.ticker === investment.ticker)?.logo}
                                  alt={investment.ticker}
                                  className="w-5 h-5 rounded-full object-contain"
                              />
                              <span className="font-medium text-gray-800">{investment.ticker}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600 max-w-[10rem] truncate">{investment.name}</td>
                          <td className="py-4 px-4 text-gray-600">
                            {
                              (() => {
                                const priceToShow = marketPrices[key];
                                if (priceToShow === undefined || priceToShow === null || isNaN(priceToShow)) {
                                  return <span className="italic text-gray-400">cargando</span>;
                                }

                                let adjustedPrice = priceToShow;

                                if (investment.type === 'Cripto') {
                                  // Si es cripto y vista en ARS, multiplicar por CCL
                                  adjustedPrice = showInARS && cclPrice ? priceToShow * cclPrice : priceToShow;
                                } else if (investment.type === 'Acción' || investment.type === 'CEDEAR') {
                                  // Si es acción o CEDEAR y vista en USD, dividir por CCL
                                  adjustedPrice = !showInARS && cclPrice ? priceToShow / cclPrice : priceToShow;
                                }

                                return formatCurrency(adjustedPrice, showInARS ? 'ARS' : 'USD');
                              })()
                            }
                          </td>
                          <td className={`py-4 px-4 text-center ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {priceChange >= 0 ? '+' : ''}
                            {formatCurrency(priceChange, showInARS ? 'ARS' : 'USD')}
                          </td>
                          <td className={`py-4 px-4 text-center ${priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {priceChangePercent >= 0 ? '+' : ''}
                            {priceChangePercent.toFixed(2)}%
                          </td>
                          <td
                            className={`py-4 px-4 text-center ${
                              investment.quantity > 0
                                ? 'text-gray-800'
                                : 'text-red-600'
                            }`}
                          >
                            {investment.type === 'Cripto'
                              ? investment.quantity.toFixed(4)
                              : Math.round(investment.quantity)}
                          </td>
                          <td className="py-4 px-4 text-gray-600 text-center">
                            {isNaN(ppcUnit)
                              ? <span className="italic text-gray-400">cargando</span>
                              : formatCurrency(ppcUnit, showInARS ? 'ARS' : 'USD')}
                          </td>
                          <td className="py-4 px-4 text-gray-600 text-center">
                            {formatCurrency(tenencia, showInARS ? 'ARS' : 'USD')}
                          </td>
                          {!mergeTransactions && (
                            <td className="py-4 px-4 text-gray-600 text-center">
                              {investment.purchaseDate
                                  ? investment.purchaseDate.split('-').reverse().join('/')
                                  : 'Fecha no disponible'}
                            </td>
                          )}
                          {/* Asignación */}
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    activeTypeFilter === 'Todos'
                                      ? 'bg-blue-600'
                                      : activeTypeFilter === 'Cripto'
                                      ? 'bg-orange-500'
                                      : activeTypeFilter === 'CEDEAR'
                                      ? 'bg-purple-600'
                                      : 'bg-[#0EA5E9]'
                                  }`}
                                  style={{ width: `${asignacion.toFixed(2)}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">
                                {asignacion.toFixed(2)}%
                              </span>
                            </div>
                          </td>
                          {/* Acciones */}
                          {!mergeTransactions && (
                            <td className="py-4 px-4 flex gap-4 justify-center">
                              <button
                                onClick={() => {
                                  setEditId(investment.id);
                                  setNewInvestment({
                                    ticker: investment.ticker,
                                    name: investment.name,
                                    type: investment.type,
                                    quantity: investment.quantity,
                                    purchasePrice: investment.purchasePrice,
                                    purchaseDate: investment.purchaseDate,
                                    currency: investment.currency,
                                    allocation: investment.allocation ?? 0,
                                  });
                                  const assetMatch = predefinedAssets.find(
                                    (a) => a.ticker === investment.ticker && a.type === investment.type
                                  );
                                  if (assetMatch) {
                                    setSelectedAsset(assetMatch as any);
                                    const key = assetMatch.ticker + '-' + assetMatch.type;
                                    _setCurrentPrice(marketPrices[key] ?? investment.purchasePrice);
                                  } else {
                                    setSelectedAsset(null);
                                    _setCurrentPrice(null);
                                  }
                                  setAssetSearchTerm('');
                                  setShowAddModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                                title="Editar esta inversión"
                              >
                                Editar
                              </button>
                              <button
                                onClick={async () => {
                                  const confirmDelete = window.confirm('🗑️ ¿Seguro que deseas eliminar esta inversión? Esta acción no se puede deshacer.');
                                  if (confirmDelete) {
                                    await deleteInvestment(investment.id);
                                    setSuccess('Inversión eliminada');
                                    setTimeout(() => setSuccess(null), 2500);
                                  }
                                }}
                                className="text-red-500 hover:text-red-600 transition-colors text-sm"
                                title="Eliminar esta inversión"
                              >
                                Eliminar
                              </button>
                            </td>
                          )}
                        </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
          ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">Aún no has agregado inversiones.</p>
              </div>
          )}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2 bg-black text-white text-sm font-medium"
            >
              Agregar inversión
            </button>
          </div>
        </div>

        {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 max-w-md w-full border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-black">
                    {editId ? "✏️ Editar inversión" : "📈 Agregar nueva inversión"}
                  </h3>
                  <button
                      onClick={() => {
                        setShowAddModal(false);
                        setEditId(null);
                        setNewInvestment({
                          ticker: '',
                          name: '',
                          type: 'CEDEAR',
                          quantity: 0,
                          purchasePrice: 0,
                          purchaseDate: new Date().toLocaleDateString('sv-SE'),
                          currency: 'ARS',
                          allocation: 0,
                        });
                        setAssetSearchTerm('');
                        setSelectedAsset(null);
                        _setCurrentPrice(null);
                      }}
                      className="text-gray-500"
                  >
                    Cerrar
                  </button>
                </div>


                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    let successMessage = '';
                    if (editId) {
                      const { purchaseDate, purchasePrice, allocation, ...rest } = newInvestment;
                      await updateInvestment(editId, {
                        ...rest,
                        purchaseDate,
                        purchasePrice
                      });
                      successMessage = 'Inversión actualizada';
                    } else {
                      await addInvestment({
                        ticker: newInvestment.ticker,
                        name: newInvestment.name,
                        type: newInvestment.type,
                        quantity: newInvestment.quantity,
                        purchasePrice: newInvestment.purchasePrice,
                        purchaseDate: newInvestment.purchaseDate,
                        currency: newInvestment.currency,
                        allocation: newInvestment.allocation ?? 0,
                      });
                      successMessage = 'Inversión agregada';
                    }
                    setSuccess(successMessage);
                    setTimeout(() => setSuccess(null), 2500);
                    setShowAddModal(false);
                    setEditId(null);
                  }}
                  className="space-y-4"
                >
                  <div className="mb-4">
                    <label htmlFor="assetSearch" className="block text-sm font-medium text-gray-800 mb-1">
                      Seleccionar Activo
                    </label>
                    <div className="relative">
                      <div className="flex items-center gap-2 border border-gray-300 px-3 py-2 bg-white">
                        <input
                          type="text"
                          id="assetSearch"
                          value={assetSearchTerm}
                          onChange={(e) => {
                            setAssetSearchTerm(e.target.value);
                            setSelectedAsset(null);
                          }}
                          placeholder={selectedAsset ? `${selectedAsset.name} (${selectedAsset.ticker})` : 'Buscar activo...'}
                          className="flex-1 outline-none bg-transparent text-black placeholder-gray-400"
                          autoComplete="off"
                        />
                      </div>
                      {(assetSearchTerm.length > 0 && filteredAssets.length > 0) && (
                        <ul className="absolute left-0 w-full z-50 bg-white border border-gray-200 mt-1 max-h-52 overflow-y-auto">
                          {filteredAssets.map((asset) => (
                            <li
                              key={asset.ticker}
                              onClick={() => {
                                handleAssetSelect(asset as any, setNewInvestment, _setCurrentPrice);
                                setNewInvestment(prev => ({
                                  ...prev,
                                  type: asset.type as 'Cripto' | 'Acción' | 'CEDEAR',
                                  currency: asset.type === 'Cripto' ? 'USD' : 'ARS',
                                }));
                                setSelectedAsset(asset);
                                setAssetSearchTerm('');
                              }}
                              className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <img
                                src={asset.logo}
                                alt={asset.name}
                                className="w-6 h-6 rounded-full mr-2 object-contain"
                                style={{ minWidth: 24, minHeight: 24, maxWidth: 24, maxHeight: 24 }}
                              />
                              <div>
                                <p className="text-sm font-medium text-black">{asset.name}</p>
                                <p className="text-xs text-gray-500">{asset.ticker}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {selectedAsset && (
                      <div className="flex items-center gap-3 mt-3 p-2 bg-gray-100 border border-gray-200">
                        <img
                          src={selectedAsset.logo}
                          alt={selectedAsset.name}
                          className="w-7 h-7 rounded-full object-contain"
                          style={{ minWidth: 28, minHeight: 28, maxWidth: 28, maxHeight: 28 }}
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-black">{selectedAsset.name}</div>
                          <div className="text-xs text-gray-500">{selectedAsset.ticker}</div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white text-black">
                          {selectedAsset.type === 'Cripto'
                            ? 'Criptomoneda'
                            : selectedAsset.type === 'Acción'
                            ? 'Acción'
                            : 'CEDEAR'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-800 mb-1">
                      Fecha de compra
                    </label>
                    <div>
                      <input
                          type="date"
                          id="purchaseDate"
                          value={newInvestment.purchaseDate}
                          onChange={(e) =>
                              setNewInvestment((prev) => ({ ...prev, purchaseDate: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300"
                      />
                    </div>
                  </div>


                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-800 mb-1">
                      Cantidad
                    </label>
                    <input
                        type="number"
                        id="quantity"
                        value={newInvestment.quantity || ''}
                        step={newInvestment.type === 'Cripto' ? 'any' : '1'}
                        min="0"
                        inputMode="decimal"
                        onChange={(e) =>
                          setNewInvestment((prev) => ({
                            ...prev,
                            quantity:
                              newInvestment.type === 'Cripto'
                                ? parseFloat(e.target.value.replace(',', '.')) || 0
                                : Math.floor(Number(e.target.value.replace(',', ''))) || 0
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 text-sm"
                    />
                    {newInvestment.quantity > 0 && newInvestment.purchasePrice > 0 && cclPrice && (
                      <div className="mt-3 px-4 py-2 border border-gray-200 bg-gray-100 text-gray-700 text-sm">
                        Esta compra equivale actualmente a:{' '}
                        <strong className="text-black">
                          {newInvestment.currency === 'USD'
                            ? `${(newInvestment.quantity * newInvestment.purchasePrice).toFixed(2)} USD`
                            : `${(newInvestment.quantity * newInvestment.purchasePrice).toFixed(2)} ARS`}
                        </strong>{' '}
                        /{' '}
                        <strong className="text-black">
                          {newInvestment.currency === 'USD'
                            ? `${(newInvestment.quantity * newInvestment.purchasePrice * cclPrice).toFixed(2)} ARS`
                            : `${(newInvestment.quantity * newInvestment.purchasePrice / cclPrice).toFixed(2)} USD`}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="currency" className="block text-sm font-medium text-gray-800 mb-1">
                        Moneda
                      </label>
                      <select
                          id="currency"
                          value={newInvestment.currency}
                          onChange={(e) => setNewInvestment(prev => ({ ...prev, currency: e.target.value as 'USD' | 'ARS' }))}
                          className="w-full px-4 py-2 border border-gray-300"
                      >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-800 mb-1">
                        Precio de compra
                      </label>
                      <div>
                        <input
                            type="number"
                            id="purchasePrice"
                            value={newInvestment.purchasePrice || ''}
                            onChange={(e) =>
                              setNewInvestment(prev => ({
                                ...prev,
                                purchasePrice: parseFloat(e.target.value.replace(',', '.')) || 0
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300"
                            step="any"
                            min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          setEditId(null);
                          setNewInvestment({
                            ticker: '',
                            name: '',
                            type: 'CEDEAR',
                            quantity: 0,
                            purchasePrice: 0,
                            purchaseDate: new Date().toLocaleDateString('sv-SE'),
                            currency: 'ARS',
                            allocation: 0,
                          });
                          setAssetSearchTerm('');
                          setSelectedAsset(null);
                          _setCurrentPrice(null);
                        }}
                        className="px-4 py-2 bg-black text-white"
                    >
                      Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-black text-white font-semibold"
                    >
                      {editId ? "Guardar cambios" : "Agregar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
    </>
  );
};
export default Portfolio;

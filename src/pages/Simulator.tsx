// Herramientas para simular inversiones y cuotas

import React, { useState, useEffect } from 'react';
// import { Combobox } from '@headlessui/react';
import { AlertCircle, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface Rate {
  entity: string;
  rate: number;
  type: string;
  term?: number;
  minimumAmount?: number;
  logo?: string;
}

interface SimulationResult {
  finalAmount: number;
  interest: number;
  effectiveRate: number;
}

// Simulator: Componente para simular inversiones y comparar cuotas vs contado
const Simulator: React.FC = () => {

  // useState: Estados para tipo de simulación, formularios, datos y resultados


  // Estado tipo de simulación
  const [simulationType, setSimulationType] = useState<'fixed' | 'wallet' | 'crypto' | 'installments'>('fixed');

  // Estados del formulario
  const [amount, setAmount] = useState<string>('');
  const [term, setTerm] = useState<string>('30');
  const [rate, setRate] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');

  // Estados de datos
  const [bankRates, setBankRates] = useState<Rate[]>([]);
  const [walletRates, setWalletRates] = useState<Rate[]>([]);
  const [cryptoRates, setCryptoRates] = useState<Rate[]>([]);
  // Estados de selección cripto
  const [selectedCrypto, setSelectedCrypto] = useState('');
  const [availableCryptoPlatforms, setAvailableCryptoPlatforms] = useState<Rate[]>([]);

  // Eliminado: Estado de búsqueda para Comboboxes

  // Estado de resultados
  const [result, setResult] = useState<SimulationResult | null>(null);

  // Estados de error y validación
  const [error, setError] = useState<string | null>(null);

  // Estados de Cuotas vs Contado
  const [cashPrice, setCashPrice] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('');
  interface InstallmentResult {
    totalFinanced: number;
    cft: number;
    suggestion: 'Cuotas' | 'Contado';
    adjustedInstallments: number[];
    inflationRate: number;
    fciProjection: number;
    pfProjection: number;
  }
  const [installmentResult, setInstallmentResult] = useState<InstallmentResult | null>(null);
  const [monthlyInflation, setMonthlyInflation] = useState<number | null>(null);

  // Obtener tasas al montar el componente (integración real)
  useEffect(() => {

    const fetchRates = async () => {
      try {
        // Plazo fijo
        const fixedRes = await axios.get('https://api.comparatasas.ar/plazos-fijos');
        const fixedData = fixedRes.data.map((item: any) => ({
          entity: item.entidad,
          rate: item.tnaClientes ? parseFloat((item.tnaClientes * 100).toFixed(2)) : 0,
          type: 'Plazo Fijo',
          minimumAmount: null,
          logo: `https://icons.com.ar/logos/${item.entidad.toLowerCase().replace(/\s+/g, '-')}.svg`
        }));
        setBankRates(fixedData);

        // Cuentas remuneradas - combinación de API general y billeteras FCI
        const walletMap = new Map<string, Rate>();

        // Primero, cargamos desde la API general
        try {
          const generalRes = await axios.get('https://api.comparatasas.ar/cuentas-remuneradas');
          generalRes.data.forEach((item: any) => {
            walletMap.set(item.nombre, {
              entity: item.nombre,
              rate: item.tna,
              type: 'Cuenta Remunerada',
              minimumAmount: item.limite,
              logo: `https://icons.com.ar/logos/${item.nombre.toLowerCase().replace(/\s+/g, '-')}.svg`
            });
          });
        } catch (e) {
          console.error('Error al obtener cuentas remuneradas generales:', e);
        }

        // Luego, sobreescribimos (o sumamos) con las billeteras FCI dinámicas
        const fondos: { nombre: string; url: string; logo: string }[] = [
          {
            nombre: 'Prex',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/Allaria%20Ahorro%20-%20Clase%20A',
            logo: 'https://icons.com.ar/logos/prex.svg'
          },
          {
            nombre: 'Cocos',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/Cocos%20Daruma%20Renta%20Mixta%20-%20Clase%20A',
            logo: 'https://icons.com.ar/logos/cocos.svg'
          },
          {
            nombre: 'Personal Pay',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/Delta%20Pesos%20-%20Clase%20X',
            logo: 'https://icons.com.ar/logos/personal-pay.svg'
          },
          {
            nombre: 'MercadoPago',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/Mercado%20Fondo%20-%20Clase%20A',
            logo: 'https://icons.com.ar/logos/mercadopago.svg'
          },
          {
            nombre: 'LB Finanzas',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/ST%20Zero%20-%20Clase%20D',
            logo: 'https://icons.com.ar/logos/lb-finanzas.svg'
          },
          {
            nombre: 'AstroPay',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/ST%20Zero%20-%20Clase%20D',
            logo: 'https://icons.com.ar/logos/astropay.svg'
          },
          {
            nombre: 'Lemon',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/Fima%20Premium%20-%20Clase%20P',
            logo: 'https://icons.com.ar/logos/lemoncash.svg'
          },
        ];

        for (const fondo of fondos) {
          try {
            const res = await axios.get(fondo.url);
            const tna = res.data?.detalle?.rendimientos?.diario?.tna || 0;
            walletMap.set(fondo.nombre, {
              entity: fondo.nombre,
              rate: tna,
              type: 'Cuenta Remunerada',
              logo: fondo.logo
            });
          } catch (e) {
            console.error(`Error ${fondo.nombre}:`, e);
          }
        }

        const walletData = Array.from(walletMap.values());
        setWalletRates(walletData);

        // Cripto
        const cryptoRes = await axios.get('https://api.comparatasas.ar/v1/finanzas/rendimientos');
        const cryptoData: Rate[] = [];

        cryptoRes.data.forEach((exchange: any) => {
          exchange.rendimientos.forEach((item: any) => {
            if (item.apy > 0) {
              cryptoData.push({
                entity: `${item.moneda} (${exchange.entidad})`,
                rate: item.apy,
                type: 'Staking',
                // logo: `https://icons.com.ar/logos/${item.moneda.toLowerCase()}.svg`,
                logo: `https://icons.com.ar/logos/${item.moneda.toLowerCase().replace(/\s+/g, '-')}.svg`
              });
            }
          });
        });

        setCryptoRates(cryptoData);
      } catch (err) {
        console.error('Error al obtener tasas:', err);
      } finally {
        // setLoading(false);
      }
    };

    fetchRates();

    // Fetch inflación oficial del INDEC desde datos.gob.ar (último valor mensual disponible)
    const fetchInflation = async () => {
      try {
        const res = await axios.get(
          'https://apis.datos.gob.ar/series/api/series/?metadata=full&collapse=month&ids=103.1_I2N_2016_M_19&limit=5000&representation_mode=percent_change&start=0'
        );
        if (res.data?.data && Array.isArray(res.data.data)) {
          const lastRow = res.data.data[res.data.data.length - 1];
          const lastValue = lastRow[3] ?? lastRow[2] ?? lastRow[1]; // uso del valor más reciente disponible
          if (typeof lastValue === 'number') {
            setMonthlyInflation(parseFloat((lastValue * 100).toFixed(2))); // lo multiplicamos por 100 porque la API devuelve proporción
          }
        }
      } catch (e) {
        console.error('Error al obtener inflación oficial del INDEC:', e);
      }
    };
    fetchInflation();
  }, []);

  // handleEntitySelect: Guarda entidad y tasa seleccionada para cálculos
  // Manejar selección de entidad
  const handleEntitySelect = (entity: string, rate: number) => {
    setSelectedEntity(entity);
    setRate(rate.toString());
  };

  // calculateResults: Calcula monto final, interés y TEA según tipo de simulación
  // Calcular resultados de simulación
  const calculateResults = () => {
    if (!amount || !rate || !term) {
      setError('Por favor complete todos los campos');
      return;
    }

    const principal = parseFloat(amount);
    const annualRate = parseFloat(rate);
    const days = parseInt(term);

    if (isNaN(principal) || isNaN(annualRate) || isNaN(days)) {
      setError('Por favor ingrese valores numéricos válidos');
      return;
    }

    let finalAmount, interest, effectiveRate;

    if (simulationType === 'crypto') {
      finalAmount = principal * Math.pow(1 + (annualRate / 100) / 365, days);
      interest = finalAmount - principal;
      effectiveRate = (Math.pow(1 + (annualRate / 100) / 365, 365) - 1) * 100;
    } else {
      // Usar interés compuesto diario también para no-cripto
      finalAmount = principal * Math.pow(1 + (annualRate / 100) / 365, days);
      interest = finalAmount - principal;
      effectiveRate = (Math.pow(1 + (annualRate / 100) / 365, 365) - 1) * 100;
    }

    setResult({
      finalAmount,
      interest,
      effectiveRate
    });

    setError(null);
  };

  // formatCurrency: Formatea número como moneda ARS sin decimales
  // Formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(value);
  };

  // calculateInstallmentComparison: Compara cuotas vs contado ajustado por inflación y calcula CFT, proyecciones FCI y PF
  // Cálculo de Cuotas vs Contado
  const calculateInstallmentComparison = () => {
    const cash = parseFloat(cashPrice);
    const totalInstallment = parseFloat(installmentAmount);
    const count = parseInt(installmentCount);

    if (isNaN(cash) || isNaN(totalInstallment) || isNaN(count)) {
      setError('Por favor ingrese valores válidos en cuotas vs contado');
      return;
    }

    const installment = totalInstallment / count;
    // Inflación estimada
    if (monthlyInflation === null || isNaN(monthlyInflation)) {
      setError('No se pudo obtener la inflación esperada del BCRA. Intentá más tarde.');
      return;
    }
    const inflationRate = monthlyInflation;
    const adjustedInstallments: number[] = [];
    let totalAdjusted = 0;
    for (let i = 0; i < count; i++) {
      const adjusted = installment / Math.pow(1 + inflationRate / 100, i + 1);
      adjustedInstallments.push(adjusted);
      totalAdjusted += adjusted;
    }
    // Costo total financiado = suma de cuotas ajustadas
    const totalFinanced = totalAdjusted;

    // Promedio billetera virtual/FCI
    const avgWalletRate = walletRates.length
      ? walletRates.reduce((sum, r) => sum + r.rate, 0) / walletRates.length
      : 30;
    const avgBankRate = bankRates.length
      ? bankRates.reduce((sum, r) => sum + r.rate, 0) / bankRates.length
      : 35;

    // Proyección usando TNA compuesta mensualmente
    const fciProjection = cash * Math.pow(1 + avgWalletRate / 100 / 12, count);
    // Proyección usando TNA compuesta mensualmente
    const pfProjection = cash * Math.pow(1 + avgBankRate / 100 / 12, count);

    // Cálculo del CFT usando monto nominal financiado
    const monthlyRate = Math.pow(totalInstallment / cash, 1 / count) - 1;
    if (monthlyRate <= -1) {
      setError('Los datos ingresados generan un CFT inválido. Verificá los montos.');
      return;
    }
    const cft = (Math.pow(1 + monthlyRate, 12) - 1) * 100;
    const suggestion = totalAdjusted < cash * 1.05 ? 'Cuotas' : 'Contado';

    setInstallmentResult({
      totalFinanced,
      cft,
      suggestion,
      adjustedInstallments,
      inflationRate,
      fciProjection,
      pfProjection
    });
    setError(null);
  };

  // Render: UI del simulador con selección de tipo, formulario y resultados
  return (
    <div className="space-y-6">
      {/* Encabezado: Título e introducción del simulador */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-base font-medium text-gray-800">Simulador</h1>
        <p className="text-gray-800">Calcula rendimientos y compara alternativas de inversión</p>
      </motion.div>

      {/* Selección de tipo de simulación: Plazo fijo, Billetera, Cripto y Cuotas vs Contado */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'fixed', label: 'Plazo Fijo' },
          { id: 'wallet', label: 'Billetera Virtual' },
          { id: 'crypto', label: 'Cripto' },
          { id: 'installments', label: 'Cuotas vs Contado' }
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => {
              setSimulationType(id as any);
              setSelectedEntity('');
              setSelectedCrypto('');
              setAmount('');
              setTerm('30');
              setRate('');
              setResult(null);
              setInstallmentResult(null);
              setCashPrice('');
              setInstallmentAmount('');
              setInstallmentCount('');
              setError(null);
            }}
            className={`px-4 py-2 text-sm font-medium border ${
              simulationType === id
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-800 border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Formulario de simulación según el tipo seleccionado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white border border-gray-200 p-6"
      >
        {/* Bloque Cuotas vs Contado: inputs de precio contado, cuotas e inflación y resultados */}
        {simulationType === 'installments' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div className="space-y-6 bg-white border border-gray-200 p-6">
                <div>
                  <label htmlFor="cashPrice" className="block text-sm font-medium text-gray-800 mb-1">
                    Precio de contado
                  </label>
                  <input
                    type="number"
                    id="cashPrice"
                    value={cashPrice}
                    onChange={(e) => setCashPrice(e.target.value)}
                    className="w-full px-4 py-2 text-base border border-gray-300 bg-white text-gray-800"
                    placeholder="Ej: 100000"
                  />
                </div>
                <div>
                  <label htmlFor="installmentAmount" className="block text-sm font-medium text-gray-800 mb-1">
                    Precio total en cuotas
                  </label>
                  <input
                    type="number"
                    id="installmentAmount"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    className="w-full px-4 py-2 text-base border border-gray-300 bg-white text-gray-800"
                    placeholder="Ej: 120000"
                  />
                </div>
                <div>
                  <label htmlFor="installmentCount" className="block text-sm font-medium text-gray-800 mb-1">
                    Cantidad de cuotas
                  </label>
                  <select
                    id="installmentCount"
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(e.target.value)}
                    className="w-full px-4 py-2 text-base border border-gray-300 bg-white text-gray-800"
                  >
                    <option value="" disabled>Seleccioná cantidad</option>
                    {[1, 2, 3, 4, 6, 9, 10, 12, 18, 24, 30, 32, 36].map((n) => (
                      <option key={n} value={n}>{n} CUOTAS</option>
                    ))}
                  </select>
                </div>
                {/* Inflación mensual estimada input */}
                <div>
                  <label htmlFor="inflationRate" className="block text-sm font-medium text-gray-800 mb-1">
                    Inflación mensual estimada
                    {monthlyInflation !== null && !isNaN(monthlyInflation) && (
                      <span className="text-sm text-gray-800 ml-2">
                        (~{((Math.pow(1 + (monthlyInflation / 100), 12) - 1) * 100).toFixed(2)}% anual)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    id="inflationRate"
                    value={monthlyInflation !== null ? monthlyInflation.toString() : ''}
                    onChange={(e) => setMonthlyInflation(parseFloat(e.target.value))}
                    className="w-full px-4 py-2 text-base border border-gray-300 bg-white text-gray-800"
                    step="0.01"
                    placeholder="Ej: 2.8"
                  />
                </div>
                <button
                  onClick={calculateInstallmentComparison}
                  className="w-full py-2.5 px-5 text-base font-medium bg-gray-800 text-white flex items-center justify-center"
                >
                  Comparar
                </button>
              </div>
              <div className="space-y-6 h-full">
                {error && (
                  <div className="p-3 bg-white border border-red-200 flex items-center text-red-700">
                    <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {installmentResult && (
                  <div>
                    {/* Encabezado de sugerencia */}
                    <div>
                      {installmentResult.suggestion === 'Cuotas' ? (
                        <span className="text-lg font-bold flex items-center gap-2 text-blue-600">
                          💳 Conviene: Cuotas
                        </span>
                      ) : (
                        <span className="text-lg font-bold flex items-center gap-2 text-yellow-700">
                          💵 Conviene: Contado
                        </span>
                      )}
                    </div>
                    {/* Fila de métricas principales */}
                    <div className="flex gap-8 items-end mb-2 mt-4">
                      <div>
                        <div className="text-xl font-bold text-gray-700">Costo total financiado</div>
                        <div className="text-xl font-bold text-gray-800">{formatCurrency(installmentResult.totalFinanced)}</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-700">CFT anual efectivo</div>
                        <div
                          className={`text-xl font-bold ${
                            installmentResult.cft > 0
                              ? 'text-green-600'
                              : installmentResult.cft < 0
                              ? 'text-red-600'
                              : 'text-gray-800'
                          }`}
                        >
                          {installmentResult.cft.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-700">Inflación estimada</div>
                        <div className="text-xl font-bold text-gray-800">
                          {installmentResult.inflationRate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    {/* Cuotas ajustadas por inflación */}
                    <div className="mb-2">
                      <div className="text-sm font-medium text-gray-700 mb-1">Cuotas ajustadas:</div>
                      <div className="flex flex-wrap">
                        {installmentResult.adjustedInstallments.map((v, i) => (
                          <span
                            key={i}
                            className="inline-block bg-gray-100 px-2 py-1 mr-1 mb-1 rounded-none text-sm text-gray-800 border border-gray-200"
                          >
                            #{i + 1}: ${v.toFixed(0)}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Mini-dashboard FCI y Plazo Fijo */}
                    <div className="flex gap-2 mt-4 flex-wrap">
                      <div className="inline-block bg-gray-100 px-4 py-2 rounded-none border border-gray-200 mr-4 mb-2 align-top">
                        <div className="font-bold text-base text-gray-800">{formatCurrency(installmentResult.fciProjection)}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          FCI (billetera promedio)
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          TNA: {walletRates.length
                            ? (walletRates.reduce((sum, r) => sum + r.rate, 0) / walletRates.length).toFixed(2)
                            : '30.00'}%
                        </div>
                      </div>
                      <div className="inline-block bg-gray-100 px-4 py-2 rounded-none border border-gray-200 mr-4 mb-2 align-top">
                        <div className="font-bold text-base text-gray-800">{formatCurrency(installmentResult.pfProjection)}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Plazo Fijo promedio
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          TNA: {bankRates.length
                            ? (bankRates.reduce((sum, r) => sum + r.rate, 0) / bankRates.length).toFixed(2)
                            : '35.00'}%
                        </div>
                      </div>
                    </div>
                    {/* Explicación corta */}
                    <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                      ⚠️ El CFT refleja el costo total anual de financiarse. Si es negativo, las cuotas ajustadas valen menos que el contado.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Bloque de simulación estándar: inputs de monto, plazo, tasa o selección cripto */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start self-start">
            {/* Input Fields */}
            <div className="space-y-6 bg-white border border-gray-200 p-6">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-800 mb-1">
                  {simulationType === 'crypto'
                    ? 'Cantidad de activos a invertir'
                    : 'Monto a invertir'}
                </label>
                <div className="relative">
                  {simulationType !== 'crypto' ? (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800">$</span>
                  ) : selectedCrypto ? (
                    <>
                      <img
                        src={cryptoRates.find(r => r.entity.startsWith(selectedCrypto))?.logo}
                        alt={selectedCrypto}
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800">{selectedCrypto}</span>
                    </>
                  ) : (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800">{selectedCrypto || 'Ξ'}</span>
                  )}
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full ${simulationType === 'crypto' ? 'pl-20' : 'pl-8'} pr-3 py-2 text-base border border-gray-300 bg-white text-gray-800`}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="term" className="block text-sm font-medium text-gray-800 mb-1">
                  Plazo (días)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[30, 90, 180, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTerm(d.toString())}
                    className="px-4 py-2 text-base border border-gray-300 text-gray-800"
                    >
                      {d === 365 ? '1 año' : `${d} días`}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  id="term"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-4 py-2 text-base border border-gray-300 bg-white text-gray-800"
                  placeholder="30"
                />
              </div>
              {/* Sección Tasas disponibles para Plazo Fijo y Billetera usando Combobox */}
              {simulationType !== 'crypto' && (
                <div>
                  <label htmlFor="rate" className="block text-sm font-medium text-gray-800 mb-1">
                    Tasa Nominal Anual (%)
                  </label>
                  <input
                    type="number"
                    id="rate"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full px-4 py-2 text-base border border-gray-300 bg-white text-gray-800"
                    placeholder="0.00"
                  />
                </div>
              )}
              {/* Sección Crypto: selección de criptomoneda y plataforma con Combobox */}
              {simulationType === 'crypto' && (
                <div className="p-3 bg-white border border-gray-200">
                  <p className="text-sm text-gray-800">
                    Los rendimientos pueden variar según el mercado.
                  </p>
                </div>
              )}
              <button
                onClick={calculateResults}
                className="w-full py-2.5 px-5 text-base font-medium bg-gray-800 text-white flex items-center justify-center"
              >
                Calcular
              </button>
            </div>
            {/* Results */}
            <div className={`space-y-6 bg-white border border-gray-200 p-6 transition-all duration-300 ${
              result ? 'h-full' : ''
            }`}>
              {error && (
                <div className="p-3 bg-white border border-red-200 flex items-center text-red-700">
                  <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {/* Available Rates */}
              {simulationType !== 'crypto' && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800 mb-1">Tasas disponibles</h4>
                  <div className="space-y-2 max-h-60 overflow-visible">
                    {simulationType === 'fixed' && (
                      <>
                        <label htmlFor="bankRateSelect" className="block text-sm font-medium text-gray-800 mb-2">Seleccionar banco</label>
                        <select
                          id="bankRateSelect"
                          className="w-full p-2.5 border border-gray-300 bg-white text-gray-800"
                          value={selectedEntity}
                          onChange={(e) => {
                            const value = e.target.value;
                            const sel = bankRates.find(r => r.entity === value);
                            if (sel) handleEntitySelect(sel.entity, sel.rate);
                          }}
                        >
                          <option value="" disabled>Seleccionar opción</option>
                          {bankRates
                            .sort((a, b) => b.rate - a.rate)
                            .map(rate => (
                              <option key={rate.entity} value={rate.entity}>
                                {rate.entity} ({rate.rate.toFixed(2)}% {rate.type === 'Staking' ? 'APY' : 'TNA'})
                              </option>
                          ))}
                        </select>
                        {selectedEntity && (
                          <div className="flex items-center mt-3 space-x-2">
                            <img
                              src={bankRates.find(r => r.entity === selectedEntity)?.logo}
                              alt={selectedEntity}
                              className="w-6 h-6 object-contain"
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          </div>
                        )}
                      </>
                    )}
                    {simulationType === 'wallet' && (
                      <>
                        <label htmlFor="walletRateSelect" className="block text-sm font-medium text-gray-800 mb-2">Seleccionar billetera virtual</label>
                        <select
                          id="walletRateSelect"
                          className="w-full p-2.5 border border-gray-300 bg-white text-gray-800"
                          value={selectedEntity}
                          onChange={(e) => {
                            const value = e.target.value;
                            const sel = walletRates.find(r => r.entity === value);
                            if (sel) handleEntitySelect(sel.entity, sel.rate);
                          }}
                        >
                          <option value="" disabled>Seleccionar opción</option>
                          {walletRates
                            .sort((a, b) => b.rate - a.rate)
                            .map(rate => (
                              <option key={rate.entity} value={rate.entity}>
                                {rate.entity} ({rate.rate.toFixed(2)}% {rate.type === 'Staking' ? 'APY' : 'TNA'})
                              </option>
                          ))}
                        </select>
                        {selectedEntity && (
                          <div className="flex items-center mt-3 space-x-2">
                            <img
                              src={walletRates.find(r => r.entity === selectedEntity)?.logo}
                              alt={selectedEntity}
                              className="w-6 h-6 object-contain"
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Crypto selectors moved to right column */}
              {simulationType === 'crypto' && (
                <div className="space-y-3 overflow-visible">
                  <h4 className="font-medium text-gray-800 mb-1">Tasas disponibles</h4>
                  <label htmlFor="cryptoSelect" className="block text-sm font-medium text-gray-800 mb-2">
                    Seleccionar criptomoneda
                  </label>
                  <select
                    id="cryptoSelect"
                    value={selectedCrypto}
                    onChange={(e) => {
                      setSelectedCrypto(e.target.value);
                      const filtered = cryptoRates.filter(rate => rate.entity.startsWith(e.target.value));
                      setAvailableCryptoPlatforms(filtered);
                      setSelectedEntity('');
                      setResult(null);
                      setError(null);
                    }}
                    className="w-full p-2.5 border border-gray-300 bg-white text-gray-800 mb-1"
                  >
                    <option value="" disabled>Elegí una cripto</option>
                    {[...new Set(cryptoRates.map(rate => rate.entity.split(' ')[0]))]
                      .sort()
                      .map((crypto, index) => (
                        <option key={index} value={crypto}>
                          {crypto}
                        </option>
                    ))}
                  </select>
                  {selectedCrypto && (
                    <div className="flex items-center space-x-2">
                      <img
                        src={cryptoRates.find(r => r.entity.startsWith(selectedCrypto))?.logo}
                        alt={selectedCrypto}
                        className="w-6 h-6 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                  {selectedCrypto && (
                    <>
                      <label htmlFor="platformSelect" className="block text-sm font-medium text-gray-800 mb-2">
                        Seleccionar plataforma
                      </label>
                      <select
                        id="platformSelect"
                        className="w-full p-2.5 border border-gray-300 bg-white text-gray-800"
                        value={selectedEntity}
                        onChange={(e) => {
                          const value = e.target.value;
                          const sel = availableCryptoPlatforms.find(r => r.entity === value);
                          if (sel) handleEntitySelect(sel.entity, sel.rate);
                        }}
                      >
                        <option value="" disabled>Seleccionar opción</option>
                        {availableCryptoPlatforms
                          .sort((a, b) => b.rate - a.rate)
                          .map(rate => (
                            <option key={rate.entity} value={rate.entity}>
                              {(rate.entity.split('(')[1]?.replace(')', '') || rate.entity)} ({rate.rate.toFixed(2)}% {rate.type === 'Staking' ? 'APY' : 'TNA'})
                            </option>
                        ))}
                      </select>
                      {selectedEntity && (
                        <div className="flex items-center space-x-2">
                          <img
                            src={cryptoRates.find(r => r.entity === selectedEntity)?.logo}
                            alt={selectedEntity}
                            className="w-6 h-6 object-contain"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                          {selectedEntity && !selectedEntity.includes('(') && (
                            <span className="text-sm text-gray-800 truncate">{selectedEntity}</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {/* Resultados: muestra monto final, interés ganado, TEA y explicaciones según tipo */}
              {result && (
                <div className="space-y-4 mt-6">
                  <div className="mb-2 flex items-center">
                    <Check size={18} className="text-gray-800 mr-2" />
                    <h4 className="text-base font-medium text-gray-800">Resultado de la simulación</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white rounded p-3 text-center border border-gray-200">
                      <p className="text-gray-800 mb-1">
                        {simulationType === 'crypto'
                          ? 'Cantidad final de activos'
                          : 'Monto final'}
                      </p>
                      {simulationType === 'crypto' ? (
                        <p className="text-base font-medium text-gray-800">
                          {result.finalAmount.toFixed(6)} {selectedCrypto}
                        </p>
                      ) : (
                        <p
                          className={`text-base font-medium ${
                            result.finalAmount > parseFloat(amount)
                              ? 'text-green-600'
                              : result.finalAmount < parseFloat(amount)
                              ? 'text-red-600'
                              : 'text-gray-800'
                          }`}
                        >
                          {formatCurrency(result.finalAmount)}
                        </p>
                      )}
                    </div>
                    <div className="bg-white rounded p-3 text-center border border-gray-200">
                      <p className="text-gray-800 mb-1">Interés ganado</p>
                      <p
                        className={`text-base font-medium ${
                          result.interest > 0
                            ? 'text-green-600'
                            : result.interest < 0
                            ? 'text-red-600'
                            : 'text-gray-800'
                        }`}
                      >
                        {simulationType === 'crypto'
                          ? `${result.interest.toFixed(8)} ${selectedCrypto}`
                          : formatCurrency(result.interest)}
                      </p>
                    </div>
                    <div className="bg-white rounded p-3 text-center border border-gray-200">
                      <p className="text-gray-800 mb-1">TEA</p>
                      <p
                        className={`text-base font-medium ${
                          result.effectiveRate > 0
                            ? 'text-green-600'
                            : result.effectiveRate < 0
                            ? 'text-red-600'
                            : 'text-gray-800'
                        }`}
                      >
                        {result.effectiveRate.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  {simulationType === 'fixed' && (
                    <div className="mt-4 p-3 border text-sm bg-white border-gray-200 text-gray-800">
                      Este cálculo utiliza <strong>interés compuesto diario</strong> para estimar el rendimiento. En la práctica, los plazos fijos suelen capitalizar mensualmente. La <strong>TNA puede variar</strong> según el banco, condiciones de cliente o decisiones del BCRA.
                    </div>
                  )}
                  {simulationType === 'wallet' && (
                    <div className="mt-4 p-3 border text-sm bg-white border-gray-200 text-gray-800">
                      Las billeteras virtuales remuneradas suelen liquidar rendimientos diarios. Este simulador utiliza <strong>interés compuesto diario</strong> sobre la TNA publicada por cada plataforma.
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Simulator;

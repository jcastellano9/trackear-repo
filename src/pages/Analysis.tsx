import React, { useState, useEffect } from 'react';
import YieldAnalysis from './YieldAnalysis';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import axios from 'axios';

// Registrar componentes de ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Quote {
  name: string;
  buy: number | null;
  sell: number | null;
  spread?: number | null;
  source: string;
  variation?: number;
  logo?: string;
  is24x7?: boolean;
}


// Mapa de íconos para bancos y billeteras
const quoteIconMap: Record<string, string> = {
  'banco-comafi': '/icons/banco-comafi.svg',
  'banco-galicia': '/icons/banco-galicia.svg',
  'banco-hipotecario': '/icons/banco-hipotecario.svg',
  'banco-macro': '/icons/banco-macro.svg',
  'banco-nacion': '/icons/banco-nacion.svg',
  'banco-nación': '/icons/banco-nacion.svg',
  'banco-provincia': '/icons/banco-provincia.svg',
  'banco-santander': '/icons/banco-santander.svg',
  'banco-provincia-del-neuquen': '/icons/banco-provincia.svg',
  'brubank': '/icons/brubank.svg',
  'letsbit': '/icons/letsbit.svg',
  'lb-finanzas': '/icons/letsbit.svg',
  'naranja-x': '/icons/naranja-x.svg',
  'naranja': '/icons/naranja-x.svg',
  'plus': '/icons/plus-crypto.svg',
  'plus-crypto': '/icons/plus-crypto.svg',
  'plus-inversiones': '/icons/plus-crypto.svg',
  'wallbit': '/icons/wallbit.svg',
  'dolar-app': '/icons/dolar-app.svg',
  'binance': '/icons/binance.svg',
  'ripio': '/icons/ripio.svg',
  'buenbit': '/icons/buenbit.svg',
  'fiwind': '/icons/fiwind.svg',
  'satoshi-tango': '/icons/satoshi-tango.svg',
  'lemon': '/icons/lemon.svg',
  'binace': '/icons/binance.svg',
  'tienda-crypto': '/icons/tienda-crypto.svg',
  'decrypto': '/icons/decrypto.svg',
  'cocos-crypto': '/icons/cocos-crypto.svg',
  'belo': '/icons/belo.svg',
  'astropay': '/icons/astropay.svg',
  'prex': '/icons/prex.svg',
  'satoshitango': '/icons/satoshi-tango.svg',
  'takenos': '/icons/takenos.svg',
  'cocos': '/icons/cocos.svg'
};

const Analysis: React.FC = () => {

  // Establecer sección principal y sección de cotizaciones activa
  const [activeMainSection, setActiveMainSection] = useState<'quotes' | 'rates'>('quotes');
  const [activeQuoteSection, setActiveQuoteSection] = useState<'dollar' | 'crypto' | 'pix'>('dollar');

  // Estados de datos
  const [dollarQuotes, setDollarQuotes] = useState<Quote[]>([]);
  const [cryptoQuotes, setCryptoQuotes] = useState<Quote[]>([]);
  const [pixQuotes, setPixQuotes] = useState<Quote[]>([]);

  // Estados de carga y error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtrar visual de Dólar: selectedCurrency y filteredDollarQuotes
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'Bancos' | 'Alternativos' | 'Billeteras Virtuales'>('USD');
  // Ordenar las cotizaciones según opción seleccionada
  const [sortOption, setSortOption] = useState<'alphabeticalAsc' | 'alphabeticalDesc' | 'buyAsc' | 'buyDesc' | 'sellAsc' | 'sellDesc'>('alphabeticalAsc');
  // Filtrar visual de Cripto: selectedToken
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  // Filtrar visual de PIX: selectedPixSymbol
  const [selectedPixSymbol, setSelectedPixSymbol] = useState<'ARS' | 'USD' | null>('ARS');
  // Filtrar las cotizaciones de dólar según lo que el usuario elija (oficial, bancos o billeteras)
  const filteredDollarQuotes = (() => {
    let filtered = dollarQuotes.filter(({ name }) => {
      if (selectedCurrency === 'USD') {
        return (
          name.toLowerCase().includes('oficial') ||
          name.toLowerCase().includes('blue') ||
          name.toLowerCase().includes('bolsa') ||
          name.toLowerCase().includes('contado con liquidación') ||
          name.toLowerCase().includes('ccl') ||
          name.toLowerCase().includes('tarjeta') ||
          name.toLowerCase().includes('mayorista')
        );
      }
      if (selectedCurrency === 'Bancos') {
        return (
          name.toLowerCase().includes('banco') ||
          name.toLowerCase().includes('nacion') ||
          name.toLowerCase().includes('galicia') ||
          name.toLowerCase().includes('santander') ||
          name.toLowerCase().includes('bbva') ||
          name.toLowerCase().includes('hsbc') ||
          name.toLowerCase().includes('macro') ||
          name.toLowerCase().includes('supervielle')
        );
      }
      if (selectedCurrency === 'Billeteras Virtuales') {
        return (
          name.toLowerCase().includes('bit') ||
          name.toLowerCase().includes('fiwind') ||
          name.toLowerCase().includes('plus') ||
          name.toLowerCase().includes('plus-') ||
          name.toLowerCase().includes('ripio') ||
          name.toLowerCase().includes('crypto') ||
          name.toLowerCase().includes('naranja') ||
          name.toLowerCase().includes('brubank') ||
          name.toLowerCase().includes('lemon')
        );
      }
      return true;
    });
    // Ordenar alfabéticamente si es Bancos o Billeteras Virtuales
    if (selectedCurrency === 'Bancos') {
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (selectedCurrency === 'Billeteras Virtuales') {
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    return filtered;
  })();

  // Obtener cotizaciones del dólar desde dos fuentes y combinarlas
  useEffect(() => {
    const fetchDollarQuotes = async () => {
      try {
        setLoading(true);
        const [dolarApiRes, comparaRes] = await Promise.all([
          axios.get('https://dolarapi.com/v1/dolares'),
          axios.get('https://api.comparadolar.ar/quotes')
        ]);

        const getUSDOrder = (name: string) => {
          const priority = [
            'USD Oficial',
            'USD Blue',
            'USD Bolsa',
            'USD CCL',
            'USD Mayorista',
            'USD Tarjeta',
            'USD Cripto'
          ];
          const index = priority.findIndex(p => name === p);
          return index === -1 ? 99 : index;
        };

        const oficialQuotes = Array.isArray(dolarApiRes.data)
          ? dolarApiRes.data
              .map((q: any) => {
                // Formato explícito para el nombre
                let usdName = '';
                if (q.nombre.toLowerCase() === 'oficial') {
                  usdName = 'USD Oficial';
                } else if (q.nombre.toLowerCase() === 'contado con liquidación') {
                  usdName = 'USD CCL';
                } else if (q.nombre.toLowerCase() === 'tarjeta') {
                  usdName = 'USD Tarjeta';
                } else {
                  usdName = `USD ${q.nombre.charAt(0).toUpperCase() + q.nombre.slice(1)}`;
                }
                return {
                  name: usdName,
                  buy: typeof q.compra === 'number' ? q.compra : null,
                  sell: typeof q.venta === 'number' ? q.venta : null,
                  spread: (typeof q.compra === 'number' && typeof q.venta === 'number')
                    ? +(q.venta - q.compra).toFixed(2) : null,
                  source: 'DolarAPI',
                  variation: 0
                };
              })
          : [];


        const comparaQuotes = Array.isArray(comparaRes.data)
          ? comparaRes.data.map((q: any) => ({
              name: q.name
                .split(' ')
                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' '),
              buy: typeof q.bid === 'number' ? q.bid : null,
              sell: typeof q.ask === 'number' ? q.ask : null,
              spread: (typeof q.bid === 'number' && typeof q.ask === 'number')
                ? +(q.ask - q.bid).toFixed(2) : null,
              source: q.url || 'ComparaDolar',
              logo: quoteIconMap[
                q.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
              ] || q.logoUrl || null,
              is24x7: q.is24x7 || false,
              variation: 0
            }))
          : [];

        const combinedQuotes = [
          ...oficialQuotes.sort((a, b) => getUSDOrder(a.name) - getUSDOrder(b.name)),
          ...comparaQuotes.sort((a, b) => {
            if (a.spread === null) return 1;
            if (b.spread === null) return -1;
            return a.spread - b.spread;
          })
        ];
        setDollarQuotes(combinedQuotes);
      } catch (error) {
        console.error('Error al obtener cotizaciones del dólar:', error);
        setError('Error al cargar cotizaciones del dólar');
      } finally {
        setLoading(false);
      }
    };

    if (activeMainSection === 'quotes' && activeQuoteSection === 'dollar') {
      fetchDollarQuotes();
      const interval = setInterval(fetchDollarQuotes, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [activeMainSection, activeQuoteSection]);

  // Obtener cotizaciones de criptomonedas y ordenarlas
  useEffect(() => {
    const fetchCryptoQuotes = async () => {
      try {
        setLoading(true);
        const tokens = ['usdt', 'usdc', 'btc', 'eth'];

        const responses = await Promise.all(
          tokens.map(token =>
            axios.get(`https://api.comparadolar.ar/crypto/${token}`)
              .catch(err => {
                console.error(`Error al obtener ${token}:`, err);
                return { data: null };
              })
          )
        );

        const allQuotes = responses.flatMap((response, i) => {
          const token = tokens[i];
          if (!response.data || typeof response.data !== 'object') return [];

          return Object.entries(response.data).map(([provider, info]: [string, any]) => {
            const slug = info.prettyName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            return {
              name: `${info.prettyName} (${token.toUpperCase()})`,
              buy: typeof info.bid === 'number' ? info.bid : null,
              sell: typeof info.ask === 'number' ? info.ask : null,
              spread: (typeof info.ask === 'number' && typeof info.bid === 'number')
                ? +(info.ask - info.bid).toFixed(2) : null,
              source: info.url || provider,
              logo: quoteIconMap[slug] || info.logo || null,
              is24x7: true,
              variation: 0
            };
          });
        });

        if (allQuotes.every(q => !q.buy && !q.sell)) {
          setError('No se pudieron cargar las cotizaciones de criptomonedas (datos vacíos).');
        }

        const sortedQuotes = allQuotes.sort((a, b) => {
          if (a.spread === null) return 1;
          if (b.spread === null) return -1;
          return a.spread - b.spread;
        });

        setCryptoQuotes(sortedQuotes);
      } catch (error) {
        console.error('Error al obtener cotizaciones de criptomonedas:', error);
        setError('Error al cargar cotizaciones de criptomonedas');
      } finally {
        setLoading(false);
      }
    };

    if (activeMainSection === 'quotes' && activeQuoteSection === 'crypto') {
      fetchCryptoQuotes();
      const interval = setInterval(fetchCryptoQuotes, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [activeMainSection, activeQuoteSection]);

  // Obtener cotizaciones de PIX y prepararlas para mostrar
  useEffect(() => {
    const fetchPixQuotes = async () => {
      try {
        const response = await axios.get("http://localhost:5174/api/pix-quotes");

        if (response?.data && typeof response.data === 'object') {
          const formattedQuotes: (Quote & { currencyType: string })[] = [];

          Object.entries(response.data).forEach(([provider, info]: [string, any]) => {
            if (Array.isArray(info.quotes)) {
              info.quotes.forEach((quote: any) => {
                const currencyLabel =
                  quote.symbol === 'BRLUSD' || quote.symbol === 'BRLUSDT'
                    ? 'USD'
                    : quote.symbol === 'BRLARS'
                    ? 'ARS'
                    : quote.symbol;
                const currencyType =
                  quote.symbol === 'BRLARS'
                    ? 'ARS'
                    : (quote.symbol === 'BRLUSD' || quote.symbol === 'BRLUSDT')
                    ? 'USD'
                    : '';
                const name = `${provider.split(' ')
                  .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                  .join(' ')} — paga con ${currencyLabel}`;
                const slug = provider.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                formattedQuotes.push({
                  name,
                  buy: typeof quote.buy === 'number' ? quote.buy : null,
                  sell: typeof quote.sell === 'number' ? quote.sell : null,
                  spread: typeof quote.spread === 'number' ? +quote.spread.toFixed(6) : null,
                  logo: quoteIconMap[slug] || info.logo || null,
                  source: info.url || 'pix.ferminrp.com',
                  is24x7: true,
                  variation: 0,
                  currencyType
                });
              });
            }
          });

          // Separar cotizaciones ARS y USD
          const arsQuotes = formattedQuotes.filter(q => q.currencyType === 'ARS');
          const usdQuotes = formattedQuotes.filter(q => q.currencyType === 'USD');
          const sortedQuotes = [...arsQuotes, ...usdQuotes];

          // Establecer selectedPixSymbol por defecto en 'ARS' o 'USD' si está disponible
          if (arsQuotes.length > 0) {
            setSelectedPixSymbol('ARS');
          } else if (usdQuotes.length > 0) {
            setSelectedPixSymbol('USD');
          } else {
            setSelectedPixSymbol(null);
          }

          // Eliminar currencyType antes de establecer estado (mantener tipo Quote)
          setPixQuotes(sortedQuotes.map(({currencyType, ...rest}) => rest));
        } else {
          setPixQuotes([]);
        }
      } catch (error) {
        console.error('Error al obtener cotizaciones de PIX:', error);
        setError('No se pudieron cargar las cotizaciones de PIX. Por favor, intente más tarde.');
        setPixQuotes([]);
      }
    };

    if (activeMainSection === 'quotes' && activeQuoteSection === 'pix') {
      fetchPixQuotes();
      const interval = setInterval(fetchPixQuotes, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [activeMainSection, activeQuoteSection]);


  // Convierte un número a formato de moneda local
  const formatCurrency = (value: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Ordena las cotizaciones según la opción que haya seleccionado el usuario
  const sortQuotes = (quotes: Quote[]) => {
    return quotes.slice().sort((a, b) => {
      if (sortOption === 'alphabeticalAsc') return a.name.localeCompare(b.name);
      if (sortOption === 'alphabeticalDesc') return b.name.localeCompare(a.name);
      if (sortOption === 'buyAsc') return (a.buy ?? Infinity) - (b.buy ?? Infinity);
      if (sortOption === 'buyDesc') return (b.buy ?? -Infinity) - (a.buy ?? -Infinity);
      if (sortOption === 'sellAsc') return (a.sell ?? Infinity) - (b.sell ?? Infinity);
      if (sortOption === 'sellDesc') return (b.sell ?? -Infinity) - (a.sell ?? -Infinity);
      return 0;
    });
  };

  // Identificar mejores cotizaciones PIX para pagar
  const bestPixQuote = pixQuotes
    .filter(q => selectedPixSymbol ? q.name.toLowerCase().includes(`paga con ${selectedPixSymbol.toLowerCase()}`) : true)
    .reduce((best, current) => {
      if (!best || (current.buy !== null && current.buy < (best.buy ?? Infinity))) {
        return current;
      }
      return best;
    }, null as Quote | null);
  // Mejor cotización PIX en ARS (excluyendo tarjetas)
  const bestArsPixQuote = pixQuotes
    .filter(q => q.name.toLowerCase().includes('paga con ars'))
    .filter(q => !q.name.toLowerCase().includes('tarjeta'))
    .reduce((best, current) => {
      if (!best || (current.buy !== null && current.buy < (best.buy ?? Infinity))) {
        return current;
      }
      return best;
    }, null as Quote | null);

  // Pestañas principales: cambia entre Cotizaciones y Rendimientos
  const MainSectionTabs = () => (
    <div className="flex space-x-2 mb-0">
      <button
        onClick={() => setActiveMainSection('quotes')}
        className={`px-4 py-2 rounded-lg border ${
          activeMainSection === 'quotes'
            ? 'bg-black text-white'
            : 'bg-gray-100 text-black'
        }`}
      >
        Cotizaciones
      </button>
      <button
        onClick={() => setActiveMainSection('rates')}
        className={`px-4 py-2 rounded-lg border ${
          activeMainSection === 'rates'
            ? 'bg-black text-white'
            : 'bg-gray-100 text-black'
        }`}
      >
        Rendimientos
      </button>
    </div>
  );

  // Botones simples para elegir entre Dólar, Cripto y PIX
  const QuoteSectionsNav = () => (
    <div className="flex space-x-2 mb-2">
      <button
        onClick={() => setActiveQuoteSection('dollar')}
        className={`px-4 py-1.5 rounded-lg border ${
          activeQuoteSection === 'dollar'
            ? 'bg-black text-white'
            : 'bg-gray-100 text-black'
        }`}
      >
        Dólar
      </button>
      <button
        onClick={() => setActiveQuoteSection('crypto')}
        className={`px-4 py-1.5 rounded-lg border ${
          activeQuoteSection === 'crypto'
            ? 'bg-black text-white'
            : 'bg-gray-100 text-black'
        }`}
      >
        Cripto
      </button>
      <button
        onClick={() => setActiveQuoteSection('pix')}
        className={`px-4 py-1.5 rounded-lg border ${
          activeQuoteSection === 'pix'
            ? 'bg-black text-white'
            : 'bg-gray-100 text-black'
        }`}
      >
        PIX
      </button>
    </div>
  );


  // Componente que muestra cada tarjeta de cotización (minimalista)
  const QuoteCard = ({ quote }: { quote: Quote }) => {
    // Ajuste especial para mostrar la cotización PIX en USD
    let isPixUsd = activeQuoteSection === 'pix' && selectedPixSymbol === 'USD';
    let displayLabel = activeQuoteSection === 'pix'
      ? selectedPixSymbol === 'USD'
        ? 'Pagar 1 Dólar es'
        : 'Pagar 1 Real es'
      : 'Venta';
    let displayValue: number | null | undefined = quote.buy;
    if (isPixUsd && typeof quote.buy === 'number' && quote.buy !== 0) {
      displayValue = 1 / quote.buy;
    }
    let displaySuffix = '';
    let displayNote = '';
    if (activeQuoteSection === 'pix') {
      if (selectedPixSymbol === 'USD') {
        displaySuffix = 'R$';
        displayNote = 'para pagar';
      } else if (selectedPixSymbol === 'ARS') {
        displaySuffix = '';
        displayNote = 'para pagar';
      }
    }
    return (
      <div
        className="bg-white p-4 border text-black cursor-pointer"
        onClick={() => quote.source && window.open(quote.source, '_blank')}
      >
        <div className="mb-2">
          <div>
            <h3 className="text-base font-semibold text-black">
              {quote.name.split('—')[0].trim()}
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-black mb-1">{displayLabel}</p>
            <p className="text-lg font-semibold text-black">
              {displayValue != null
                ? isPixUsd
                  ? ` ${displayValue.toFixed(2)} ${displaySuffix}`
                  : formatCurrency(displayValue)
                : 'N/A'}
            </p>
            {displayNote && (
              <p className="text-xs text-black mt-1">{displayNote}</p>
            )}
          </div>
          {activeQuoteSection !== 'pix' && (
            <div>
              <p className="text-xs text-black mb-1">Compra</p>
              <p className="text-lg font-semibold text-black">
                {typeof quote.sell === 'number'
                  ? formatCurrency(quote.sell)
                  : 'N/A'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };


return (
    <div className="space-y-4 text-black">
      <div>
        <h1 className="text-2xl font-bold text-black flex items-center space-x-2">
          <span>Análisis</span>
        </h1>
      </div>

      <MainSectionTabs />

      {error && (
        <div className="mb-4 p-4 bg-white border text-black rounded flex items-center">
          <span>{error}</span>
        </div>
      )}

      {activeMainSection === 'quotes' ? (
        <>
          <h2 className="text-xl font-semibold text-black mb-2 flex items-center space-x-2">
          </h2>
          <QuoteSectionsNav />
          <div className="mt-20 mb-3">
            <h3 className="text-2xl font-bold text-black">
              {activeQuoteSection === 'dollar' && (
                selectedCurrency === 'USD' ? 'Dólares' :
                selectedCurrency === 'Bancos' ? 'Cotizaciones en Bancos' :
                selectedCurrency === 'Billeteras Virtuales' ? 'Billeteras Virtuales' : ''
              )}
              {activeQuoteSection === 'crypto' && (
                selectedToken ? `Criptomonedas: ${selectedToken}` : 'Criptomonedas'
              )}
              {activeQuoteSection === 'pix' && (
                selectedPixSymbol ? `PIX` : 'Cotizaciones PIX'
              )}
            </h3>
          </div>

          {/* Filtros y última actualización */}
          <div className="flex justify-between items-center mb-4">
            {/* Filtros visuales según sección */}
            {activeQuoteSection === 'dollar' && (
              <div>
                <select
                  value={selectedCurrency}
                  onChange={e => setSelectedCurrency(e.target.value as any)}
                  className="bg-white text-black border rounded px-3 py-1.5 text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="Bancos">Bancos</option>
                  <option value="Billeteras Virtuales">Billeteras Virtuales</option>
                </select>
              </div>
            )}
            {activeQuoteSection === 'crypto' && (
              <div>
                <select
                  value={selectedToken || ''}
                  onChange={e => setSelectedToken(e.target.value || null)}
                  className="bg-white text-black border rounded px-3 py-1.5 text-sm"
                >
                  <option value="">Todas</option>
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
            )}
            {activeQuoteSection === 'pix' && (() => {
              const uniquePixSymbols: ('ARS' | 'USD')[] = ['ARS', 'USD'].filter(symbol => pixQuotes.some(q => q.name.includes(`paga con ${symbol}`))) as ('ARS' | 'USD')[];
              return (
                <div>
                  <select
                    value={selectedPixSymbol || ''}
                    onChange={e => setSelectedPixSymbol(e.target.value ? e.target.value as 'ARS' | 'USD' : null)}
                    className="bg-white text-black border rounded px-3 py-1.5 text-sm"
                  >
                    {uniquePixSymbols.map(symbol => (
                      <option key={symbol} value={symbol}>{symbol}</option>
                    ))}
                  </select>
                </div>
              );
            })()}
            <div className="flex items-center space-x-4 ml-4">
              <p className="text-sm text-black">
                Última actualización: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </p>
              {(activeQuoteSection === 'crypto'
                || activeQuoteSection === 'pix'
                || (activeQuoteSection === 'dollar' && (selectedCurrency === 'Bancos' || selectedCurrency === 'Billeteras Virtuales'))
              ) && (
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="bg-white text-black border rounded px-4 py-1.5 text-sm w-60"
                >
                  {activeQuoteSection === 'pix' ? (
                    <>
                      <option value="alphabeticalAsc">Orden A → Z</option>
                      <option value="alphabeticalDesc">Orden Z → A</option>
                      <option value="buyAsc">R$ ↑</option>
                      <option value="buyDesc">R$ ↓</option>
                    </>
                  ) : (
                    <>
                      <option value="alphabeticalAsc">Orden A → Z</option>
                      <option value="alphabeticalDesc">Orden Z → A</option>
                      <option value="buyAsc">Venta ↑</option>
                      <option value="buyDesc">Venta ↓</option>
                      <option value="sellAsc">Compra ↑</option>
                      <option value="sellDesc">Compra ↓</option>
                    </>
                  )}
                </select>
              )}
            </div>
          </div>

          {/* Mejores precios para cripto con token seleccionado o dólar con Bancos/Billeteras */}
          {((activeQuoteSection === 'crypto' && selectedToken) ||
            (activeQuoteSection === 'dollar' && (selectedCurrency === 'Bancos' || selectedCurrency === 'Billeteras Virtuales'))) && (() => {
            let quotes: Quote[] = [];
            if (activeQuoteSection === 'crypto' && selectedToken) {
              quotes = cryptoQuotes.filter(q => {
                const match = q.name.match(/\(([^)]+)\)$/);
                const token = match?.[1] || 'OTROS';
                return token === selectedToken;
              });
            } else if (activeQuoteSection === 'dollar' && (selectedCurrency === 'Bancos' || selectedCurrency === 'Billeteras Virtuales')) {
              quotes = filteredDollarQuotes;
            }
            if (!quotes || quotes.length === 0) return null;

            const bestBuy = quotes.reduce((a, b) => (b.buy !== null && (a.buy === null || b.buy < a.buy) ? b : a), quotes[0]);
            const bestSell = quotes.reduce((a, b) => (b.sell !== null && (a.sell === null || b.sell > a.sell) ? b : a), quotes[0]);
            const bestSpread = quotes.reduce((a: Quote, b: Quote) =>
              b.spread != null && (a.spread == null || b.spread! < a.spread!)
                ? b
                : a
            , quotes[0]);

            // Tarjetas uniformes para mejores precios
            return (
              <div className="mb-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm bg-gray-100 border rounded px-3 py-2">
                    <span className="font-semibold">Mejor para vender:</span>
                    <span>{bestBuy.name}</span>
                    <span className="font-semibold">{formatCurrency(bestBuy.buy || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm bg-gray-100 border rounded px-3 py-2">
                    <span className="font-semibold">Mejor para comprar:</span>
                    <span>{bestSell.name}</span>
                    <span className="font-semibold">{formatCurrency(bestSell.sell || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm bg-gray-100 border rounded px-3 py-2">
                    <span className="font-semibold">Menor Spread:</span>
                    <span>{bestSpread.name}</span>
                    <span className="font-semibold">{formatCurrency(bestSpread.spread || 0)}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <span className="text-black">Cargando...</span>
            </div>
          ) : (
            <>
              {/* Filtro visual de Dólar */}
              {activeQuoteSection === 'dollar' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortQuotes(filteredDollarQuotes).map((quote, index) => (
                    <QuoteCard key={`dollar-${index}`} quote={quote} />
                  ))}
                </div>
              )}
              {/* Filtro visual de tokens para cripto */}
              {activeQuoteSection === 'crypto' && (
                <>
                  {(() => {
                    const groupedCryptoQuotes = cryptoQuotes.reduce((acc: { [token: string]: Quote[] }, quote) => {
                      const match = quote.name.match(/\(([^)]+)\)$/);
                      const token = match?.[1] || 'OTROS';
                      if (!acc[token]) acc[token] = [];
                      acc[token].push(quote);
                      return acc;
                    }, {});
                    return (
                      <>
                        {Object.entries(groupedCryptoQuotes)
                          .filter(([token]) => !selectedToken || token === selectedToken)
                          .map(([token, quotes]) => (
                            <div key={token} className="mb-8 w-full">
                              <h3 className="text-lg font-semibold text-black mb-3">{token}</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {sortQuotes(quotes).map((quote, index) => (
                                  <QuoteCard key={`${token}-${index}`} quote={quote} />
                                ))}
                              </div>
                            </div>
                          ))}
                      </>
                    );
                  })()}
                </>
              )}
              {activeQuoteSection === 'pix' && (
                <>
                  {/* Mejores opciones PIX (minimalista) */}
                  {(() => {
                    const filteredBySymbol = pixQuotes.filter(q =>
                      selectedPixSymbol ? q.name.toLowerCase().includes(`paga con ${selectedPixSymbol.toLowerCase()}`) : true
                    );
                    const bestQuote = selectedPixSymbol === 'ARS' ? bestArsPixQuote : bestPixQuote;
                    const tarjetaMepQuote = filteredBySymbol.find(q => q.name.toLowerCase().includes('tarjeta-mep'));
                    const tarjetaQuote = filteredBySymbol.find(q =>
                      q.name.toLowerCase().includes('tarjeta') && !q.name.toLowerCase().includes('mep')
                    );
                    return (
                      <div className="mb-6 flex flex-wrap gap-4">
                        {bestQuote && (
                          <div className="flex items-center gap-2 text-sm bg-gray-100 border rounded px-3 py-2 w-fit">
                            <span className="font-semibold">Mejor App:</span>
                            <span>{bestQuote.name.split('—')[0].trim()}</span>
                            <span className="font-semibold">
                              {selectedPixSymbol === 'USD' && bestQuote.buy
                                ? (1 / bestQuote.buy).toFixed(2) + ' R$'
                                : formatCurrency(bestQuote.buy ?? 0)
                              }
                            </span>
                          </div>
                        )}
                        {tarjetaMepQuote && (
                          <div className="flex items-center gap-2 text-sm bg-gray-100 border rounded px-3 py-2 w-fit">
                            <span className="font-semibold">Tarjeta + MEP:</span>
                            <span className="font-semibold">
                              {selectedPixSymbol === 'USD' && tarjetaMepQuote.buy
                                ? (1 / tarjetaMepQuote.buy).toFixed(2) + ' R$'
                                : formatCurrency(tarjetaMepQuote.buy ?? 0)
                              }
                            </span>
                          </div>
                        )}
                        {tarjetaQuote && (
                          <div className="flex items-center gap-2 text-sm bg-gray-100 border rounded px-3 py-2 w-fit">
                            <span className="font-semibold">Dólar Tarjeta:</span>
                            <span className="font-semibold">
                              {selectedPixSymbol === 'USD' && tarjetaQuote.buy
                                ? (1 / tarjetaQuote.buy).toFixed(2) + ' R$'
                                : formatCurrency(tarjetaQuote.buy ?? 0)
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {/* Lista de cotizaciones PIX (excepto las de tarjeta) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortQuotes(
                      pixQuotes
                        .filter(q => {
                          if (!selectedPixSymbol) return true;
                          return q.name.toLowerCase().includes(`paga con ${selectedPixSymbol.toLowerCase()}`);
                        })
                        .filter(q =>
                          !q.name.toLowerCase().includes('tarjeta')
                        )
                    ).map((quote, index) => (
                      <QuoteCard
                        key={`pix-${index}`}
                        quote={quote}
                      />
                    ))}
                    {pixQuotes.length === 0 && !loading && (
                      <div className="col-span-full text-center py-8 text-black">
                        No hay cotizaciones PIX disponibles en este momento
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )
    : null}

      {activeMainSection === 'rates' && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold text-black mb-4 flex items-center space-x-2">
          </h2>
          <YieldAnalysis activeSection="plazos" />
        </div>
      )}
  </div>
);
}

export default Analysis;

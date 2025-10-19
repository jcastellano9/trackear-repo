import React, {useState, useEffect} from 'react';
// Iconos de emoji para cotizacionessss
const dollarEmoji: Record<string, string> = {
    'USD Oficial': '💵',
    'USD Blue': '🔵',
    'USD Bolsa': '💹',
    'USD CCL': '📈',
    'USD Mayorista': '🏦',
    'USD Tarjeta': '💳',
    'USD Cripto': '🪙',
};
import YieldAnalysis from './YieldAnalysis';
import {motion} from 'framer-motion';
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
import {DollarSign, Bitcoin, Wallet, ArrowUpRight, Loader, TrendingUp, AlertCircle} from 'lucide-react';
import axios from 'axios';

// Endpoints posibles para PIX: en dev probamos proxy local y luego dominio externo
const PIX_ENDPOINTS: string[] = import.meta.env.DEV
    ? ['/pix/quotes', 'https://pix.ferminrp.com/quotes']
    : ['https://pix.ferminrp.com/quotes'];

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
    const [showError, setShowError] = useState(true);

    // Filtrar visual de Dólar: selectedCurrency y filteredDollarQuotes
    const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'Bancos' | 'Alternativos' | 'Billeteras Virtuales'>('USD');
    // Ordenar las cotizaciones según opción seleccionada
    const [sortOption, setSortOption] = useState<'alphabeticalAsc' | 'alphabeticalDesc' | 'buyAsc' | 'buyDesc' | 'sellAsc' | 'sellDesc'>('alphabeticalAsc');
    // Filtrar visual de Cripto: selectedToken
    const [selectedToken, setSelectedToken] = useState<string | null>(null);
    // Filtrar visual de PIX: selectedPixSymbol
    const [selectedPixSymbol, setSelectedPixSymbol] = useState<'ARS' | 'USD' | null>('ARS');
    // Referencias para convertir USD→R$ usando dólar tarjeta/MEP y el mejor ARS→R$ de PIX
    const [pixArsPerBrlBest, setPixArsPerBrlBest] = useState<number | null>(null);
    const [tarjetaArsPerUsd, setTarjetaArsPerUsd] = useState<number | null>(null);
    const [mepArsPerUsd, setMepArsPerUsd] = useState<number | null>(null);
    const [refBrlPerUsdTarjeta, setRefBrlPerUsdTarjeta] = useState<number | null>(null);
    const [refBrlPerUsdMep, setRefBrlPerUsdMep] = useState<number | null>(null);
    // Filtrar las cotizaciones de dólar según lo que el usuario elija (oficial, bancos o billeteras)
    const filteredDollarQuotes = (() => {
        let filtered = dollarQuotes.filter(({name}) => {
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
                            let usdName: string;
                            if (q.nombre.toLowerCase() === 'oficial') {
                                usdName = 'USD Oficial';
                            } else if (q.nombre.toLowerCase() === 'contado con liquidación') {
                                usdName = 'USD CCL';
                            } else if (q.nombre.toLowerCase() === 'tarjeta') {
                                usdName = 'USD Tarjeta';
                            } else {
                                usdName = `USD ${q.nombre.charAt(0).toUpperCase() + q.nombre.slice(1)}`;
                            }
                            const isTarjeta = q.nombre.toLowerCase() === 'tarjeta';
                            const buyVal = typeof q.compra === 'number' ? q.compra : null;
                            const sellVal = typeof q.venta === 'number' ? q.venta : null;
                            const tarjetaVal = isTarjeta ? (typeof q.venta === 'number' ? q.venta : null) : null;
                            return {
                                name: usdName,
                                buy: isTarjeta ? tarjetaVal : buyVal,
                                sell: isTarjeta ? tarjetaVal : sellVal,
                                spread: isTarjeta
                                    ? 0
                                    : (typeof q.compra === 'number' && typeof q.venta === 'number')
                                        ? +(q.venta - q.compra).toFixed(2)
                                        : null,
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
                                return {data: null};
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
                    setShowError(true);
                    setTimeout(() => setShowError(false), 5000);
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
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
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
                // Intentar primero el proxy local (/pix/quotes) y luego el dominio externo
                let data: any = null;
                let lastErr: any = null;

                for (const url of PIX_ENDPOINTS) {
                    try {
                        const resp = await axios.get(url, {withCredentials: false});
                        if (resp?.data && typeof resp.data === 'object') {
                            data = resp.data;
                            break;
                        }
                    } catch (e) {
                        lastErr = e;
                        continue;
                    }
                }

                if (!data) {
                    throw lastErr ?? new Error('Sin datos de PIX');
                }

                const formattedQuotes: (Quote & { currencyType: string })[] = [];

                Object.entries(data).forEach(([provider, info]: [string, any]) => {
                    if (Array.isArray(info.quotes)) {
                        info.quotes.forEach((quote: any) => {
                            const currencyLabel =
                                quote.symbol === 'BRLUSD' || quote.symbol === 'BRLUSDT'
                                    ? 'USD'
                                    : quote.symbol === 'BRLARS'
                                        ? 'ARS'
                                        : quote.symbol;
                            const currencyType = quote.symbol === 'BRLARS'
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

                // Establecer selectedPixSymbol por defecto
                if (arsQuotes.length > 0) {
                    setSelectedPixSymbol('ARS');
                } else if (usdQuotes.length > 0) {
                    setSelectedPixSymbol('USD');
                } else {
                    setSelectedPixSymbol(null);
                }

                // Eliminar currencyType antes de establecer estado
                setPixQuotes(sortedQuotes.map(({currencyType, ...rest}) => rest));

                // Guardar el mejor ARS→R$ (min buy en ARS)
                if (arsQuotes.length > 0) {
                    const bestArs = arsQuotes.reduce((best, q) => {
                        const b = typeof best.buy === 'number' ? best.buy : Infinity;
                        const c = typeof q.buy === 'number' ? q.buy : Infinity;
                        return c < b ? q : best;
                    });
                    setPixArsPerBrlBest(typeof bestArs.buy === 'number' ? bestArs.buy : null);
                } else {
                    setPixArsPerBrlBest(null);
                }

                // Traer dólar tarjeta y MEP para poder expresarlos en R$ (USD→R$)
                try {
                    const dolarRes = await axios.get('https://dolarapi.com/v1/dolares');
                    if (Array.isArray(dolarRes.data)) {
                        const tarjeta = dolarRes.data.find((d: any) => (d?.nombre || '').toLowerCase() === 'tarjeta');
                        const bolsa = dolarRes.data.find((d: any) => (d?.nombre || '').toLowerCase() === 'bolsa');
                        const tarjetaVal = typeof tarjeta?.venta === 'number' ? tarjeta.venta : null;
                        // Si no existe venta, usar compra
                        const mepVal = typeof bolsa?.venta === 'number' ? bolsa.venta : (typeof bolsa?.compra === 'number' ? bolsa.compra : null);

                        setTarjetaArsPerUsd(tarjetaVal);
                        setMepArsPerUsd(mepVal);

                        if (pixArsPerBrlBest && tarjetaVal) {
                            setRefBrlPerUsdTarjeta(tarjetaVal / pixArsPerBrlBest);
                        } else {
                            setRefBrlPerUsdTarjeta(null);
                        }
                        if (pixArsPerBrlBest && mepVal) {
                            setRefBrlPerUsdMep(mepVal / pixArsPerBrlBest);
                        } else {
                            setRefBrlPerUsdMep(null);
                        }
                    }
                } catch (e) {

                    setRefBrlPerUsdTarjeta(null);
                    setRefBrlPerUsdMep(null);
                }
            } catch (error: any) {
                console.error('Error al obtener cotizaciones de PIX:', error);
                const status = error?.response?.status;
                const msg = status === 403
                    ? 'El origen fue bloqueado por CORS (403) al consultar PIX. Activá el proxy /pix en vite.config.ts.'
                    : 'No se pudo cargar ninguna cotización de PIX en este momento. Por favor, volvé a intentarlo más tarde.';
                setError(msg);
                setShowError(true);
                setTimeout(() => setShowError(false), 5000);
                setPixQuotes([]);
            }
        };

        if (activeMainSection === 'quotes' && activeQuoteSection === 'pix') {
            fetchPixQuotes();
            const interval = setInterval(fetchPixQuotes, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [activeMainSection, activeQuoteSection, pixArsPerBrlBest]);


    // Convierte un número a formato de moneda local
    const formatCurrency = (value: number, currency: string = 'ARS') => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(value);
    };

    // Referencia ARS por USD para convertir cripto (prioridad: MEP → Tarjeta → Blue → Oficial)
    const getArsPerUsdRef = () => {
        const byName = (n: string) => dollarQuotes.find(d => (d.name || '').toLowerCase() === n.toLowerCase());
        const mep = byName('USD MEP') || byName('USD Bolsa');
        const tarjeta = byName('USD Tarjeta');
        const blue = byName('USD Blue');
        const oficial = byName('USD Oficial');
        const pick = mep || tarjeta || blue || oficial;
        const val = typeof pick?.buy === 'number' ? pick!.buy : (typeof pick?.sell === 'number' ? pick!.sell : null);
        return (typeof val === 'number' && val > 0) ? val : 1; // fallback seguro
    };

    // Ordena las cotizaciones según la opción que haya seleccionado el usuario
    const sortQuotes = (quotes: Quote[]) => {
        const getEffectiveBuy = (q: Quote) => {
            if (activeQuoteSection === 'pix' && selectedPixSymbol === 'USD') {
                return typeof q.buy === 'number' && q.buy !== 0 ? 1 / q.buy : -Infinity;
            }
            return q.buy ?? -Infinity;
        };
        const getEffectiveSell = (q: Quote) => q.sell ?? -Infinity;

        return quotes.slice().sort((a, b) => {
            if (sortOption === 'alphabeticalAsc') return a.name.localeCompare(b.name);
            if (sortOption === 'alphabeticalDesc') return b.name.localeCompare(a.name);
            if (sortOption === 'buyAsc') return (getEffectiveBuy(a) ?? Infinity) - (getEffectiveBuy(b) ?? Infinity);
            if (sortOption === 'buyDesc') return (getEffectiveBuy(b) ?? -Infinity) - (getEffectiveBuy(a) ?? -Infinity);
            if (sortOption === 'sellAsc') return (getEffectiveSell(a) ?? Infinity) - (getEffectiveSell(b) ?? Infinity);
            if (sortOption === 'sellDesc') return (getEffectiveSell(b) ?? -Infinity) - (getEffectiveSell(a) ?? -Infinity);
            return 0;
        });
    };

    // Identificar mejores cotizaciones PIX para pagar
    const bestPixQuote = pixQuotes
        .filter(q => selectedPixSymbol ? q.name.toLowerCase().includes(`paga con ${selectedPixSymbol.toLowerCase()}`) : true)
        .reduce((best, current) => {
            if (!best) return current;
            const bBuy = typeof best.buy === 'number' ? best.buy : Infinity;
            const cBuy = typeof current.buy === 'number' ? current.buy : Infinity;
            return cBuy < bBuy ? current : best;
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
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    activeMainSection === 'quotes'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
                <TrendingUp size={18} className="mr-2"/>
                Cotizaciones
            </button>
            <button
                onClick={() => setActiveMainSection('rates')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    activeMainSection === 'rates'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
                <ArrowUpRight size={18} className="mr-2"/>
                Rendimientos
            </button>
        </div>
    );

    // Botones para elegir entre Dólar, Cripto y PIX
    const QuoteSectionsNav = () => (
        <div className="flex space-x-2 mb-2">
            <button
                onClick={() => setActiveQuoteSection('dollar')}
                className={`flex items-center px-4 py-1.5 rounded-lg transition-colors ${
                    activeQuoteSection === 'dollar'
                        ? 'bg-green-500 dark:bg-green-700 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
                <DollarSign size={18} className="mr-2"/>
                Dólar
            </button>
            <button
                onClick={() => setActiveQuoteSection('crypto')}
                className={`flex items-center px-4 py-1.5 rounded-lg transition-colors ${
                    activeQuoteSection === 'crypto'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
                <Bitcoin size={18} className="mr-2"/>
                Cripto
            </button>
            <button
                onClick={() => setActiveQuoteSection('pix')}
                className={`flex items-center px-4 py-1.5 rounded-lg transition-colors ${
                    activeQuoteSection === 'pix'
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
                <Wallet size={18} className="mr-2"/>
                PIX
            </button>
        </div>
    );


    // Componente que muestra cada tarjeta de cotización
    const [showCryptoInARS, setShowCryptoInARS] = useState(true);
    const QuoteCard = ({quote}: { quote: Quote }) => {
        let displayLabel = '';
        let displayValue: number | null | undefined = null;
        let displaySuffix = '';
        let displayNote = '';
        if (activeQuoteSection === 'pix') {
            if (selectedPixSymbol === 'USD') {
                displayLabel = '1 USD son';
                if (typeof quote.buy === 'number' && quote.buy !== 0) {
                    displayValue = 1 / quote.buy;
                }
                displaySuffix = 'R$';
                displayNote = 'para pagar';
            } else if (selectedPixSymbol === 'ARS') {
                displayLabel = '1 Real son';
                displayValue = quote.buy;
                displaySuffix = '';
                displayNote = '';
            }
        } else if (activeQuoteSection === 'crypto' && (selectedToken === 'BTC' || selectedToken === 'ETH')) {
            displayLabel = `1 ${selectedToken} en`;
            if (typeof quote.buy === 'number') {
                displayValue = showCryptoInARS
                    ? quote.buy
                    : quote.buy / getArsPerUsdRef();
            }
            displaySuffix = '';
        } else {
            displayLabel = 'Venta';
            displayValue = quote.buy;
            displaySuffix = '';
            displayNote = '';
        }
        return (
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 cursor-pointer"
                onClick={() => quote.source && window.open(quote.source, '_blank')}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-2">
                        {quote.logo && (
                            <img src={quote.logo} alt={quote.name}
                                 className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700"/>
                        )}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                {quote.name.startsWith('USD') ? (dollarEmoji[quote.name] || '') : ''}{' '}
                                {quote.name.split('—')[0].trim()}
                            </h3>
                        </div>
                        {quote.is24x7 && (
                            <span
                                className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-semibold">24/7</span>
                        )}
                    </div>
                    <div className="flex flex-col items-end">
                    </div>
                </div>

                {activeQuoteSection === 'dollar' && quote.name === 'USD Tarjeta' ? (
                    <div className="grid grid-cols-1 gap-2">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tarjeta</p>
                            <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                                {typeof quote.sell === 'number'
                                    ? formatCurrency(quote.sell)
                                    : typeof quote.buy === 'number'
                                        ? formatCurrency(quote.buy)
                                        : 'N/A'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{displayLabel}</p>
                            <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                                {displayValue != null
                                    ? (
                                        activeQuoteSection === 'pix' && selectedPixSymbol === 'USD'
                                            ? ` ${displayValue.toFixed(2)} ${displaySuffix}`
                                            : (
                                                (activeQuoteSection === 'crypto' && (selectedToken === 'BTC' || selectedToken === 'ETH'))
                                                    ? (showCryptoInARS
                                                            ? `${formatCurrency(displayValue as number, 'ARS')} ARS`
                                                            : formatCurrency(displayValue as number, 'USD')
                                                    )
                                                    : formatCurrency(displayValue as number)
                                            )
                                    )
                                    : 'N/A'}
                            </p>
                            {(activeQuoteSection === 'pix' && selectedPixSymbol === 'USD') && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{displayNote}</p>
                            )}
                        </div>
                        {activeQuoteSection !== 'pix' && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Compra</p>
                                <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                                    {typeof quote.sell === 'number'
                                        ? (
                                            (activeQuoteSection === 'crypto' && (selectedToken === 'BTC' || selectedToken === 'ETH'))
                                                ? (showCryptoInARS
                                                        ? `${formatCurrency(quote.sell, 'ARS')} ARS`
                                                        : formatCurrency(quote.sell / getArsPerUsdRef(), 'USD')
                                                )
                                                : formatCurrency(quote.sell)
                                        )
                                        : 'N/A'}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        );
    };


    return (
        <div className="space-y-4 text-gray-900 dark:text-gray-100">
            <motion.div
                initial={{opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.3}}
            >
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center space-x-2">
                    <span>Análisis</span>
                </h1>
            </motion.div>

            <MainSectionTabs/>

            {error && showError && (
                <div
                    className="mb-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 rounded-lg flex items-center text-red-700 dark:text-red-400 relative">
                    <AlertCircle size={20} className="mr-2 flex-shrink-0"/>
                    <span>{error}</span>
                    <button
                        onClick={() => setShowError(false)}
                        className="absolute top-2 right-3 text-lg text-red-400 hover:text-red-700 focus:outline-none"
                        aria-label="Cerrar"
                    >×
                    </button>
                </div>
            )}

            {activeMainSection === 'quotes' ? (
                    <>
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center space-x-2">
                        </h2>
                        <QuoteSectionsNav/>
                        <div className="mt-20 mb-3">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
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

                        {/* Mostrar filtro y última actualización */}
                        <div className="flex justify-between items-center mb-4">
                            {/* Filtros visuales según sección */}
                            {activeQuoteSection === 'dollar' && (
                                <div className="flex space-x-2">
                                    {['USD', 'Bancos', 'Billeteras Virtuales'].map(option => (
                                        <button
                                            key={option}
                                            onClick={() => setSelectedCurrency(option as 'USD' | 'Bancos' | 'Alternativos' | 'Billeteras Virtuales')}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                selectedCurrency === option
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {activeQuoteSection === 'crypto' && (
                                <div className="flex flex-wrap gap-2 items-center">
                                    {['USDT', 'USDC', 'BTC', 'ETH'].map(token => (
                                        <button
                                            key={token}
                                            onClick={() => setSelectedToken(token === selectedToken ? null : token)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                selectedToken === token
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {token}
                                        </button>
                                    ))}
                                    {(selectedToken === 'BTC' || selectedToken === 'ETH') && (
                                        <button
                                            onClick={() => setShowCryptoInARS(prev => !prev)}
                                            className={`ml-2 px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                                                showCryptoInARS
                                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                                    : 'bg-[#0EA5E9] text-white hover:bg-[#0284c7]'
                                            }`}
                                        >
                                            <DollarSign size={14} className="text-white"/>
                                            Ver en {showCryptoInARS ? 'USD' : 'ARS'}
                                        </button>
                                    )}
                                </div>
                            )}
                            {activeQuoteSection === 'pix' && (() => {
                                // Símbolos válidos: 'ARS' y 'USD'
                                const uniquePixSymbols: ('ARS' | 'USD')[] = ['ARS', 'USD'].filter(symbol => pixQuotes.some(q => q.name.includes(`paga con ${symbol}`))) as ('ARS' | 'USD')[];
                                return (
                                    <div className="flex space-x-2">
                                        {uniquePixSymbols.map(symbol => (
                                            <button
                                                key={symbol}
                                                onClick={() => setSelectedPixSymbol(symbol === selectedPixSymbol ? null : symbol as 'ARS' | 'USD')}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                    selectedPixSymbol === symbol
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {symbol}
                                            </button>
                                        ))}
                                    </div>
                                );
                            })()}
                            <div className="flex items-center space-x-4 ml-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Última actualización: {new Date().toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                })}
                                </p>
                                {(activeQuoteSection === 'crypto'
                                    || activeQuoteSection === 'pix'
                                    || (activeQuoteSection === 'dollar' && (selectedCurrency === 'Bancos' || selectedCurrency === 'Billeteras Virtuales'))
                                ) && (
                                    <select
                                        value={sortOption}
                                        onChange={(e) => setSortOption(e.target.value as any)}
                                        className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded px-4 py-1.5 text-sm w-60"
                                    >
                                        {activeQuoteSection === 'pix' ? (
                                            <>
                                                <option value="alphabeticalAsc">Orden A → Z</option>
                                                <option value="alphabeticalDesc">Orden Z → A</option>
                                                <option value="buyAsc">R$ ↑</option>
                                                <option value="buyDesc">R$ ↓</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="alphabeticalAsc">Orden A → Z</option>
                                                <option value="alphabeticalDesc">Orden Z → A</option>
                                                <option value="buyAsc">Venta ↑</option>
                                                <option value="buyDesc">Venta ↓</option>
                                                <option value="sellAsc">Compra ↑</option>
                                                <option value="sellDesc">Compra ↓</option>
                                            </>
                                        )}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/*Mejores precios para cripto con token seleccionado o dólar con Bancos/Billeteras */}
                        {((activeQuoteSection === 'crypto' && selectedToken) ||
                            (activeQuoteSection === 'dollar' && (selectedCurrency === 'Bancos' || selectedCurrency === 'Billeteras Virtuales'))) && (() => {
                            let quotes: Quote[] = [];
                            if (activeQuoteSection === 'crypto' && selectedToken) {
                                // Filtrar las cotizaciones cripto solo por el token seleccionado
                                quotes = cryptoQuotes
                                    .filter(q => !q.name.toLowerCase().includes('binance'))
                                    .filter(q => {
                                        const match = q.name.match(/\(([^)]+)\)$/);
                                        const token = match?.[1] || 'OTROS';
                                        return token === selectedToken;
                                    });
                            } else if (activeQuoteSection === 'dollar' && (selectedCurrency === 'Bancos' || selectedCurrency === 'Billeteras Virtuales')) {
                                quotes = filteredDollarQuotes;
                            }
                            if (!quotes || quotes.length === 0) return null;

                            const bestBuy = quotes.reduce((a, b) => (b.buy !== null && (a.buy === null || b.buy > a.buy) ? b : a), quotes[0]);
                            const bestSell = quotes.reduce((a, b) => (b.sell !== null && (a.sell === null || b.sell < a.sell) ? b : a), quotes[0]);
                            const bestSpread = quotes.reduce((a: Quote, b: Quote) =>
                                    b.spread != null && (a.spread == null || b.spread! < a.spread!)
                                        ? b
                                        : a
                                , quotes[0]);

                            const arsPerUsdRef = getArsPerUsdRef();
                            const fmtCrypto = (v: number) => showCryptoInARS ? `${formatCurrency(v, 'ARS')} ARS` : formatCurrency(v / arsPerUsdRef, 'USD');

                            const BestCard = ({title, value, entity}: { title: string, value: string, entity: Quote }) => (
                                <div
                                    className={`rounded-xl p-4 border flex-1
                  ${activeQuoteSection === 'dollar'
                                        ? 'bg-green-50 dark:bg-green-900 border-green-300 dark:border-green-600'
                                        : 'bg-orange-50 dark:bg-orange-900 border-orange-300 dark:border-orange-600'
                                    }`}
                                >
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{value}</p>
                                    <div className="flex items-center space-x-2">
                                        {entity.logo && <img src={entity.logo}
                                                             className="w-5 h-5 rounded-full border dark:border-gray-600"/>}
                                        <span
                                            className="text-sm font-medium text-gray-700 dark:text-gray-200">{entity.name}</span>
                                        {entity.is24x7 && (
                                            <span
                                                className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-semibold">24/7</span>
                                        )}
                                    </div>
                                </div>
                            );

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <BestCard title="Mejor para vender" value={fmtCrypto(bestBuy.buy || 0)}
                                              entity={bestBuy}/>
                                    <BestCard title="Mejor para comprar" value={fmtCrypto(bestSell.sell || 0)}
                                              entity={bestSell}/>
                                    <BestCard title="Menor Spread" value={fmtCrypto(bestSpread.spread || 0)}
                                              entity={bestSpread}/>
                                </div>
                            );
                        })()}

                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader className="animate-spin text-blue-600" size={24}/>
                            </div>
                        ) : (
                            <>
                                {/* Filtro visual de Dólar */}
                                {activeQuoteSection === 'dollar' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {sortQuotes(filteredDollarQuotes).map((quote, index) => (
                                            <QuoteCard key={`dollar-${index}`} quote={quote}/>
                                        ))}
                                    </div>
                                )}
                                {/* Filtro visual de tokens para cripto */}
                                {activeQuoteSection === 'crypto' && (
                                    <>
                                        {(() => {
                                            {/* Agrupar cotizaciones de cripto por token para mostrarlas juntas */
                                            }
                                            const groupedCryptoQuotes = cryptoQuotes
                                                .filter(q => !q.name.toLowerCase().includes('binance'))
                                                .reduce((acc: { [token: string]: Quote[] }, quote) => {
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
                                                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">{token}</h3>
                                                                <div
                                                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                    {sortQuotes(quotes).map((quote, index) => (
                                                                        <QuoteCard key={`${token}-${index}`} quote={quote}/>
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
                                        {/* Calcular mejores opciones de PIX */}
                                        {(() => {
                                            // Nueva lógica: obtener mejor cotización ARS para tarjeta y MEP (exacto de la API)
                                            const tarjetaQuote = pixQuotes.find(q =>
                                                q.name.toLowerCase().includes('real-tarjeta') && q.name.toLowerCase().includes('paga con ars')
                                            );
                                            const mepQuote = pixQuotes.find(q =>
                                                q.name.toLowerCase().includes('real-tarjeta-mep') && q.name.toLowerCase().includes('paga con ars')
                                            );
                                            const filteredBySymbol = pixQuotes.filter(q =>
                                                selectedPixSymbol ? q.name.toLowerCase().includes(`paga con ${selectedPixSymbol.toLowerCase()}`) : true
                                            );
                                            const bestQuote = selectedPixSymbol === 'ARS' ? bestArsPixQuote : bestPixQuote;
                                            return (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                    {/* Mejor App */}
                                                    <div
                                                        className="rounded-xl shadow-sm p-6 border border-teal-100 bg-teal-50 dark:border-teal-700 dark:bg-teal-800 text-teal-700 dark:text-teal-200">
                                                        <p className="text-base">
                                                            <strong>Mejor App:</strong>{' '}
                                                            {bestQuote ? (
                                                                <>
                                                                    <span>{bestQuote.name.split('—')[0].trim()}</span>{' '}
                                                                    <strong>
                                                                        {selectedPixSymbol === 'USD' && typeof bestQuote.buy === 'number'
                                                                            ? (1 / bestQuote.buy).toFixed(2) + ' R$'
                                                                            : formatCurrency(bestQuote.buy ?? 0)}
                                                                    </strong>
                                                                </>
                                                            ) : (
                                                                <strong>N/A</strong>
                                                            )}
                                                        </p>
                                                    </div>

                                                    {/* Dólar Tarjeta */}
                                                    <div
                                                        className="rounded-xl shadow-sm p-6 border border-teal-100 bg-teal-50 dark:border-teal-700 dark:bg-teal-800 text-teal-700 dark:text-teal-200">
                                                        <p className="text-base">
                                                            <strong>Dólar Tarjeta:</strong>{' '}
                                                            <strong>
                                                                {selectedPixSymbol === 'USD'
                                                                    ? (refBrlPerUsdTarjeta != null ? `${refBrlPerUsdTarjeta.toFixed(2)} R$` : 'N/A')
                                                                    : formatCurrency(tarjetaQuote?.buy ?? tarjetaArsPerUsd ?? 0)}
                                                            </strong>
                                                        </p>
                                                    </div>

                                                    {/* Dólar MEP */}
                                                    <div
                                                        className="rounded-xl shadow-sm p-6 border border-teal-100 bg-teal-50 dark:border-teal-700 dark:bg-teal-800 text-teal-700 dark:text-teal-200">
                                                        <p className="text-base">
                                                            <strong>Dólar MEP:</strong>{' '}
                                                            <strong>
                                                                {selectedPixSymbol === 'USD'
                                                                    ? (refBrlPerUsdMep != null ? `${refBrlPerUsdMep.toFixed(2)} R$` : 'N/A')
                                                                    : (
                                                                        (refBrlPerUsdMep && mepArsPerUsd)
                                                                            ? formatCurrency(mepArsPerUsd / refBrlPerUsdMep)
                                                                            : (
                                                                                typeof mepQuote?.buy === 'number'
                                                                                    ? formatCurrency(mepQuote.buy)
                                                                                    : (mepArsPerUsd != null ? formatCurrency(mepArsPerUsd) : 'N/A')
                                                                            )
                                                                    )}
                                                            </strong>
                                                        </p>
                                                    </div>
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
                                                <div
                                                    className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
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
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center space-x-2">
                    </h2>
                    <YieldAnalysis activeSection="plazos"/>
                </div>
            )}
        </div>
    );
}

export default Analysis;

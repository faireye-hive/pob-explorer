import React, { useEffect, useState } from 'react';
import { getCentMetrics, getCentTokenInfo, getOrderBook, getCentRichList } from '../services/hiveEngineService';
import { analyzeTokenData, isGeminiAvailable } from '../services/geminiService';
import { Token, MarketMetrics, Order, Balance } from '../types';
import { sanitizeUrl } from '../utils/security';
import { useCommunity } from '../contexts/CommunityContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  DollarSign, 
  BarChart3, 
  BrainCircuit,
  RefreshCw 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const Dashboard: React.FC = () => {
  const { community } = useCommunity();
  const [token, setToken] = useState<Token | null>(null);
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null);
  const [orderBook, setOrderBook] = useState<{ buy: Order[], sell: Order[] }>({ buy: [], sell: [] });
  const [richList, setRichList] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [t, m, o, r] = await Promise.all([
      getCentTokenInfo(community),
      getCentMetrics(community),
      getOrderBook(community),
      getCentRichList(community)
    ]);
    setToken(t);
    setMetrics(m);
    setOrderBook(o);
    setRichList(r);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [community]);

  const handleAiAnalysis = async () => {
    if (!token || !metrics) return;
    setAnalyzing(true);
    const result = await analyzeTokenData(token, metrics);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-cent">
        <RefreshCw className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (!token || !metrics) {
    return <div className="p-8 text-center text-red-500">Erro ao carregar dados do token {community}.</div>;
  }

  const priceChange = parseFloat(metrics.priceChangePercent);
  const isPositive = priceChange >= 0;

  // Prepared data for charts
  const depthData = [
    ...orderBook.buy.slice(0, 10).map(o => ({ type: 'Bid', price: parseFloat(o.price), amount: parseFloat(o.quantity) })).reverse(),
    ...orderBook.sell.slice(0, 10).map(o => ({ type: 'Ask', price: parseFloat(o.price), amount: parseFloat(o.quantity) }))
  ];

  const richListData = richList.slice(0, 5).map(b => ({
    name: b.account,
    value: parseFloat(b.balance)
  }));

  const meta = JSON.parse(token.metadata || "{}");
  // Security fix: Sanitize external URL from metadata
  const iconUrl = sanitizeUrl(meta.icon) || "https://picsum.photos/200";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-card p-6 rounded-2xl shadow-lg border border-slate-700/50">
        <div className="flex items-center gap-4">
          <img src={iconUrl} alt={`${community} Logo`} className="w-16 h-16 rounded-full border-2 border-cent shadow-[0_0_15px_rgba(74,222,128,0.3)]" />
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{token.name} <span className="text-cent">({token.symbol})</span></h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">{meta.desc || "Token de curadoria e engajamento da comunidade."}</p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 text-right">
          <div className="text-4xl font-mono font-bold text-white">{parseFloat(metrics.lastPrice).toFixed(5)} <span className="text-sm text-slate-400">HIVE</span></div>
          <div className={`flex items-center justify-end gap-1 font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            <span>{metrics.priceChangePercent} (24h)</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Volume (24h)" value={`${parseFloat(metrics.volume).toFixed(2)} HIVE`} icon={<Activity className="text-blue-400" />} />
        <MetricCard title="Supply Circulante" value={`${parseInt(token.circulatingSupply).toLocaleString()} ${community}`} icon={<Users className="text-purple-400" />} />
        <MetricCard title="Maior Bid" value={metrics.highestBid} icon={<TrendingUp className="text-green-400" />} />
        <MetricCard title="Menor Ask" value={metrics.lowestAsk} icon={<TrendingDown className="text-red-400" />} />
      </div>

      {/* AI Analysis Section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <BrainCircuit size={100} />
        </div>
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2 mb-4">
            <BrainCircuit /> Análise de Mercado IA
          </h2>
          {!isGeminiAvailable() ? (
            <div className="flex items-start gap-3 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <BrainCircuit size={20} className="text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-300 text-sm font-medium">Análise por IA não configurada</p>
                <p className="text-slate-500 text-xs mt-1">
                  Para habilitar esta feature, adicione a variável <code className="bg-slate-700 px-1 rounded text-indigo-300">GEMINI_API_KEY</code> no ambiente.
                </p>
              </div>
            </div>
          ) : (
            <>
              {aiAnalysis ? (
                <div className="prose max-w-none text-slate-300 prose-headings:text-white prose-p:text-slate-300 prose-a:text-cent hover:prose-a:text-white prose-strong:text-white text-sm leading-relaxed whitespace-pre-line bg-black/20 p-4 rounded-xl border border-white/5">
                  {aiAnalysis}
                </div>
              ) : (
                <div className="text-slate-400 text-sm">
                  Solicite uma análise instantânea baseada nos dados atuais do mercado usando a IA Gemini.
                </div>
              )}
              <button 
                onClick={handleAiAnalysis} 
                disabled={analyzing}
                className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {analyzing ? <RefreshCw className="animate-spin" size={16}/> : <BrainCircuit size={16}/>}
                {analyzing ? "Analisando..." : "Gerar Insights com IA"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Market Depth / Order Book Visual */}
        <div className="bg-card p-6 rounded-2xl border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-cent" /> Profundidade de Mercado (Top 10)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={depthData}>
                <XAxis dataKey="price" stroke="#64748B" fontSize={12} tickFormatter={(val) => val.toFixed(4)} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F1F5F9' }}
                  itemStyle={{ color: '#F1F5F9' }}
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Bar dataKey="amount" fill="#4ADE80">
                  {depthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.type === 'Bid' ? '#4ADE80' : '#F87171'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-xs font-mono">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-400 rounded-sm"></div> Bids (Compra)</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-400 rounded-sm"></div> Asks (Venda)</div>
          </div>
        </div>

        {/* Rich List */}
        <div className="bg-card p-6 rounded-2xl border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users size={20} className="text-purple-400" /> Top Holders
          </h3>
          <div className="flex flex-col md:flex-row items-center">
            <div className="h-64 w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={richListData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {richListData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#4ADE80', '#3B82F6', '#A855F7', '#F472B6', '#FACC15'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3 mt-4 md:mt-0">
              {richList.slice(0, 5).map((holder, idx) => (
                <div key={holder.account} className="flex justify-between items-center text-sm p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono">#{idx + 1}</span>
                    <span className="font-medium text-slate-200">{holder.account}</span>
                  </div>
                  <span className="text-slate-400 font-mono">{parseInt(holder.balance).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-card p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors shadow-sm">
    <div className="flex justify-between items-start mb-2">
      <span className="text-slate-400 text-sm font-medium">{title}</span>
      <div className="p-2 bg-slate-800 rounded-lg">{icon}</div>
    </div>
    <div className="text-xl font-bold text-white font-mono">{value}</div>
  </div>
);

export default Dashboard;
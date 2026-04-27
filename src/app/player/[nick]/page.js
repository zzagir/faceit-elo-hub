"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PlayerPage() {
  const params = useParams();
  const nick = params.nick;

  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState("Инициализация...");
  const [scannedCount, setScannedCount] = useState(0);
  const [tempPeak, setTempPeak] = useState(0);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!nick) return;
    let isMounted = true;

    const fetchStats = async () => {
      try {
        // Запрашиваем наш собственный API
        const response = await fetch(`/api/stats?nick=${nick}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setStats(data);
        }
      } catch (err) {
        setError("Ошибка при загрузке данных");
      } finally {
        setLoading(false);
      }
    };
    

    fetchStats();
    return () => { isMounted = false; };
  }, [nick]);

  if (error) return (
    <div className="flex h-screen items-center justify-center bg-[#0d0d12] text-red-500">
      <h1 className="text-2xl font-bold">❌ {error}</h1>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center bg-[#0d0d12] text-white space-y-4">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h1 className="text-xl font-medium text-gray-300">{statusText}</h1>
      {scannedCount > 0 && (
        <div className="text-center text-gray-500 text-sm mt-2">
          <p>Проверено матчей: <span className="text-orange-500 font-bold">{scannedCount}</span></p>
          <p>Обнаруженный пик: <span className="text-yellow-500">{tempPeak}</span></p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0d12] text-white p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Шапка профиля (Аватар и ник) */}
        <div className="bg-[#15151a] border border-gray-800/60 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-lg">
          {/* Аватарка */}
          <div className="relative w-24 h-24 shrink-0">
            {stats.avatar ? (
              <img src={stats.avatar} alt={stats.nick} className="w-full h-full rounded-xl object-cover shadow-md" />
            ) : (
              <div className="w-full h-full bg-gray-800 rounded-xl flex items-center justify-center text-3xl font-bold">
                {stats.nick.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Иконка уровня */}
            <div className="absolute -bottom-3 -right-3 bg-[#f26a21] text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#15151a]">
              {stats.level}
            </div>
          </div>

          {/* Инфо */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
              <img src={`https://flagcdn.com/24x18/${stats.country.toLowerCase()}.png`} alt="flag" className="rounded-sm opacity-90" onError={(e) => e.target.style.display = 'none'} />
              <h1 className="text-3xl font-bold tracking-tight">{stats.nick}</h1>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
              <span className="bg-gray-800/50 text-gray-300 px-3 py-1 rounded-full text-sm border border-gray-700/50">
                CS2
              </span>
              <span className="text-orange-500 font-semibold text-lg flex items-center gap-1">
                {stats.currentElo} <span className="text-gray-500 text-sm font-normal">ELO</span>
              </span>
            </div>
          </div>
        </div>

        {/* Сетка со статистикой (Аналог твоего скрина) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Карточка 1: K/D и Убийства */}
          <div className="bg-[#15151a] border border-gray-800/60 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
            <div className="text-center mb-6">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Avg. KDR (30 матчей)</h3>
              <div className="text-4xl font-bold text-[#4ade80]">{stats.kd}</div>
            </div>
            <div className="space-y-3 pt-4 border-t border-gray-800/50 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Avg. Kills</span>
                <span className="font-medium text-gray-200">{stats.avgKills}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ADR</span>
                <span className="font-medium text-gray-200">{stats.adr}</span>
              </div>
            </div>
          </div>

          {/* Карточка 2: ELO Пик */}
          <div className="bg-[#15151a] border border-gray-800/60 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
            <div className="text-center mb-6">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Пик ELO</h3>
              <div className="text-4xl font-bold text-orange-500">{stats.peakElo}</div>
            </div>
            <div className="space-y-3 pt-4 border-t border-gray-800/50 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Разница с текущим</span>
                <span className={`font-medium ${stats.currentElo >= stats.peakElo ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.currentElo - stats.peakElo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Матчей сканировано</span>
                <span className="font-medium text-gray-200">{stats.totalScanned}</span>
              </div>
            </div>
          </div>

          {/* Карточка 3: Винрейт */}
          <div className="bg-[#15151a] border border-gray-800/60 rounded-2xl p-6 flex flex-col items-center justify-between shadow-lg lg:col-span-2">
            <h3 className="text-gray-400 text-sm font-medium mb-4 w-full text-left">Winrate (последние матчи)</h3>
            
            <div className="flex items-center gap-8 w-full justify-around">
              {/* Круговой индикатор (простая имитация на CSS) */}
              <div className="relative w-24 h-24 rounded-full flex items-center justify-center border-4 border-gray-800"
                   style={{ background: `conic-gradient(#4ade80 ${stats.winrate}%, transparent 0)` }}>
                <div className="absolute inset-2 bg-[#15151a] rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{stats.winrate}%</span>
                </div>
              </div>

              <div className="space-y-2 flex-1 text-sm">
                <div className="flex justify-between border-b border-gray-800/50 pb-1">
                  <span className="text-gray-500">Учтено матчей</span>
                  <span className="font-medium">30</span>
                </div>
                <div className="flex justify-between border-b border-gray-800/50 pb-1">
                  <span className="text-gray-500">Примерно побед</span>
                  <span className="font-medium text-green-400">{Math.round(30 * (stats.winrate / 100))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Примерно поражений</span>
                  <span className="font-medium text-red-400">{30 - Math.round(30 * (stats.winrate / 100))}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
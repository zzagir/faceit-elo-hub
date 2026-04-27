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
        const response = await fetch(`/api/stats?nick=${nick}`);
        if (!response.body) throw new Error("Поток не поддерживается");

        // Читаем поток (Stream), который отдает нам бэкенд
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { done, value } = await reader.read();
          if (done || !isMounted) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.substring(6));

              // Обновляем UI в зависимости от типа сообщения
              if (data.type === "status") {
                setStatusText(data.text);
              } else if (data.type === "progress") {
                setStatusText(data.text);
                setScannedCount(data.checked);
                setTempPeak(data.currentPeak);
              } else if (data.type === "complete") {
                setStats(data.stats);
                setLoading(false);
              } else if (data.type === "error") {
                setError(data.error);
                setLoading(false);
              }
            }
          }
        }
      } catch (err) {
        setError("Ошибка при получении данных");
        setLoading(false);
      }
    };

    fetchStats();
    return () => { isMounted = false; };
  }, [nick]);

  // Состояние: Ошибка
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f0f] text-red-500">
        <h1 className="text-2xl">❌ {error}</h1>
      </div>
    );
  }

  // Состояние: Живая загрузка (счетчик матчей)
  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0f0f0f] text-white space-y-4">
        <h1 className="text-2xl font-bold animate-pulse">{statusText}</h1>
        {scannedCount > 0 && (
          <div className="text-center text-gray-400">
            <p>Проверено матчей: <span className="text-orange-500 font-bold">{scannedCount}</span></p>
            <p className="text-sm">Обнаруженный пик: <span className="text-yellow-500">{tempPeak}</span></p>
          </div>
        )}
      </div>
    );
  }

  // Состояние: Успех (Рисуем финальный дизайн)
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Статистика: {stats.nick}</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
            <div className="text-gray-400 text-sm">Текущий ELO</div>
            <div className="text-3xl font-bold text-orange-500">{stats.currentElo}</div>
          </div>
          
          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
            <div className="text-gray-400 text-sm">Абсолютный Пик</div>
            <div className="text-3xl font-bold text-yellow-500">{stats.peakElo}</div>
            <div className="text-xs text-gray-500 mt-1">Проверено: {stats.totalScanned} матчей</div>
          </div>

          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
            <div className="text-gray-400 text-sm">K/D (30 матчей)</div>
            <div className="text-3xl font-bold">{stats.kd}</div>
          </div>

          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
            <div className="text-gray-400 text-sm">ADR (30 матчей)</div>
            <div className="text-3xl font-bold">{stats.adr}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
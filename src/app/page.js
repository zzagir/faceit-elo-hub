"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bot, MonitorPlay, MessageSquare, ChevronRight, Trophy } from "lucide-react";

export default function Home() {
  const [nick, setNick] = useState("");
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (nick.trim()) {
      // Перенаправляем на отдельную страницу игрока
      router.push(`/player/${nick.trim()}`);
    }
  };

  return (
    <main className="flex-1 flex flex-col">
      {/* ШАПКА */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-black text-xl tracking-wider flex items-center gap-2">
            <Trophy className="text-orange-500" />
            <span>ELO HUB</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-bold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Возможности</a>
            <a href="#bot" className="hover:text-white transition-colors">Telegram Бот</a>
          </nav>
        </div>
      </header>

      {/* ГЛАВНЫЙ ЭКРАН (HERO) */}
      <section className="bg-slate-900 text-white py-24 px-4 text-center border-b-4 border-orange-500 relative overflow-hidden">
        {/* Фоновый декоративный элемент */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Твой идеальный инструмент для <span className="text-orange-500">FACEIT</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto font-medium">
            Отслеживай абсолютный пик ELO, настраивай виджеты для стрима в пару кликов и управляй статистикой группы через Telegram.
          </p>

          {/* ПОИСК */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="text-slate-400 group-focus-within:text-orange-500 transition-colors" size={24} />
            </div>
            <input
              type="text"
              placeholder="Введите FACEIT никнейм..."
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              className="w-full bg-slate-800/50 border-2 border-slate-700 text-white rounded-2xl py-5 pl-14 pr-32 text-lg focus:outline-none focus:border-orange-500 focus:bg-slate-800 transition-all placeholder:text-slate-500"
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-orange-500 hover:bg-orange-600 text-white px-6 rounded-xl font-bold transition-transform active:scale-95 flex items-center gap-1"
            >
              Найти <ChevronRight size={18} />
            </button>
          </form>
        </div>
      </section>

      {/* БЛОК ПРЕИМУЩЕСТВ */}
      <section id="features" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-slate-900 text-center mb-16">Экосистема проекта</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Карточка 1 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Bot size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Telegram Бот</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Добавь бота в свою группу друзей. Автоматические дайджесты, топы по AVG и поиск пика ELO до самого первого матча.
              </p>
            </div>

            {/* Карточка 2 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
                <MonitorPlay size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Виджеты для OBS</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Идеально для стримеров. Универсальная прозрачная плашка с автообновлением ELO и K/D в реальном времени.
              </p>
            </div>

            {/* Карточка 3 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Интеграция с Twitch</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Готовые команды для Nightbot. Позволь своим зрителям чекать твою актуальную статистику прямо в чате стрима.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
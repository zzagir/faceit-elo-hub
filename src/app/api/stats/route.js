import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const inputNick = searchParams.get('nick');

  if (!inputNick) {
    return NextResponse.json({ error: "Укажите никнейм" }, { status: 400 });
  }

  try {
    const headersFA = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    };

    const FACEIT_KEY = process.env.FACEIT_API_KEY;

    // 1. Ищем ID игрока через открытый эндпоинт FaceitAnalyser
    const searchRes = await fetch(`https://ru.faceitanalyser.com/api/searchPlayer/${inputNick}`, { headers: headersFA });
    const searchText = await searchRes.text();
    
    if (!searchText) return NextResponse.json({ error: "Пустой ответ от сервера поиска" }, { status: 500 });
    
    const searchData = JSON.parse(searchText);
    
    if (!searchData || searchData.error || !searchData.id) {
      return NextResponse.json({ error: `Игрок "${inputNick}" не найден` }, { status: 404 });
    }

    const playerId = searchData.id;
    const currentElo = searchData.games?.cs2?.faceit_elo || 0;
    const avatar = searchData.avatar || "";
    const country = searchData.country || "un";
    const cs2Game = searchData.games?.find(g => g.name === 'cs2' || g.name === 'csgo');
    const level = cs2Game ? cs2Game.skill_level : 0;

    // 2. ДЕЛАЕМ ИДЕАЛЬНУЮ КОМБИНАЦИЮ:
    // - График берем с Анализатора (ради Пика ELO)
    // - Статистику берем напрямую из ОФИЦИАЛЬНОГО FACEIT API (с твоим ключом)
    const [graphRes, officialStatsRes] = await Promise.all([
      fetch(`https://ru.faceitanalyser.com/api/graph/${playerId}/cs2`, { headers: headersFA }),
      fetch(`https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`, { 
        headers: { Authorization: `Bearer ${FACEIT_KEY}` } 
      })
    ]);

    const graphText = await graphRes.text();
    const graphData = graphText ? JSON.parse(graphText) : {};
    
    const officialStatsData = await officialStatsRes.json();

    // 3. Достаем Пик ELO из Анализатора
    const peakElo = graphData.graph_data?.elo?.max || currentElo;
    const totalScanned = graphData.graph_data?.elo?.values?.length || 0;

    // 4. Достаем K/D и Winrate из официального API
    const lifetime = officialStatsData.lifetime || {};
    const winrate = lifetime["Win Rate %"] || 0;
    const kd = lifetime["Average K/D Ratio"] || 0;
    const avgKills = lifetime["Average Kills"] || 0;
    // ADR в официальном API нет, но K/D и Винрейт там самые точные
    const adr = 0; 

    return NextResponse.json({
      nick: searchData.nickname,
      avatar: avatar,
      level: level,
      country: country,
      currentElo: currentElo,
      peakElo: peakElo,
      winrate: Math.round(Number(winrate)),
      kd: Number(kd).toFixed(2),
      adr: Number(adr).toFixed(1),
      avgKills: Number(avgKills).toFixed(1),
      totalScanned: totalScanned
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: `Техническая ошибка: ${error.message}` }, { status: 500 });
  }
}
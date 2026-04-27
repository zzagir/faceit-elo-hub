import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function scanMatchesForPeak(playerId) {
  let currentTo = Date.now();
  let peakElo = 0;
  let peakDate = "Неизвестно";
  let totalScanned = 0;

  while (true) {
    const res = await fetch(
      `https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/cs2?size=100&to=${currentTo}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );

    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    const text = await res.text();
    if (!text || text.trim().startsWith('<')) break;

    let graphData;
    try { graphData = JSON.parse(text); } catch { break; }
    if (!Array.isArray(graphData) || graphData.length === 0) break;

    for (const m of graphData) {
      const eloNum = parseInt(m.elo);
      if (eloNum > 0 && eloNum > peakElo) {
        peakElo = eloNum;
        peakDate = new Date(m.date).toLocaleDateString('ru-RU');
      }
    }

    totalScanned += graphData.length;
    if (graphData.length < 100) break;
    currentTo = graphData[graphData.length - 1].date - 1;
  }

  return { peakElo, peakDate, totalScanned };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const inputNick = searchParams.get('nick');

  if (!inputNick) {
    return NextResponse.json({ error: "Укажите никнейм" }, { status: 400 });
  }

  try {
    const FACEIT_KEY = process.env.FACEIT_API_KEY;

    // 1. Данные игрока
    const playerRes = await fetch(
      `https://open.faceit.com/data/v4/players?nickname=${inputNick}`,
      { headers: { 'Authorization': `Bearer ${FACEIT_KEY}`, 'Accept': 'application/json' } }
    );

    if (!playerRes.ok) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const playerData = await playerRes.json();
    const playerId = playerData.player_id;
    const currentElo = playerData.games?.cs2?.faceit_elo || 0;
    const level = playerData.games?.cs2?.skill_level || 0;
    const avatar = playerData.avatar || null;
    const country = playerData.country || 'us';

    // 2. Статистика за последние 30 матчей
    const statsRes = await fetch(
      `https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`,
      { headers: { 'Authorization': `Bearer ${FACEIT_KEY}`, 'Accept': 'application/json' } }
    );

    let kd = 0, avgKills = 0, adr = 0, winrate = 0;

    if (statsRes.ok) {
      const statsData = await statsRes.json();
      const lifetime = statsData.lifetime;
      kd = parseFloat(lifetime?.["Average K/D Ratio"] || 0).toFixed(2);
      avgKills = parseFloat(lifetime?.["Average Kills"] || 0).toFixed(1);
      winrate = parseFloat(lifetime?.["Win Rate %"] || 0);
      // ADR нет в lifetime — берём из последних матчей ниже
    }

    // 3. ADR из последних 30 матчей
    const historyRes = await fetch(
      `https://open.faceit.com/data/v4/players/${playerId}/games/cs2/stats?limit=30`,
      { headers: { 'Authorization': `Bearer ${FACEIT_KEY}`, 'Accept': 'application/json' } }
    );

    if (historyRes.ok) {
      const historyData = await historyRes.json();
      const items = historyData.items || [];
      if (items.length > 0) {
        const totalAdr = items.reduce((sum, m) => sum + parseFloat(m.stats?.["ADR"] || 0), 0);
        adr = (totalAdr / items.length).toFixed(1);
      }
    }

    // 4. Пик ELO test
    const { peakElo, peakDate, totalScanned } = await scanMatchesForPeak(playerId);

    return NextResponse.json({
      nick: playerData.nickname,
      avatar,
      country,
      level,
      currentElo,
      peakElo: Math.max(peakElo, currentElo),
      peakDate,
      totalScanned,
      kd,
      avgKills,
      adr,
      winrate,
    });

  } catch (error) {
    console.error("Route error:", error.message);
    return NextResponse.json({ error: "Ошибка: " + error.message }, { status: 500 });
  }
}
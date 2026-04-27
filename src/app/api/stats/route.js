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
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json',
        }
      }
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
    // 1. Ищем игрока через официальный FACEIT API
    const playerRes = await fetch(
      `https://open.faceit.com/data/v4/players?nickname=${inputNick}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FACEIT_API_KEY}`,
          'Accept': 'application/json',
        }
      }
    );

    if (!playerRes.ok) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const playerData = await playerRes.json();
    const playerId = playerData.player_id;
    const currentElo = playerData.games?.cs2?.faceit_elo || 0;

    // 2. Сканируем историю матчей для пика
    const { peakElo, peakDate, totalScanned } = await scanMatchesForPeak(playerId);

    return NextResponse.json({
      nick: playerData.nickname,
      currentElo,
      peakElo: Math.max(peakElo, currentElo),
      peakDate,
      totalScanned,
    });

  } catch (error) {
    console.error("Route error:", error.message);
    return NextResponse.json({ error: "Ошибка: " + error.message }, { status: 500 });
  }
}
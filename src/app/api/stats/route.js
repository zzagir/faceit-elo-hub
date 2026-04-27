import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const inputNick = searchParams.get('nick');
  const FACEIT_KEY = process.env.FACEIT_API_KEY;

  if (!inputNick) {
    return NextResponse.json({ error: "Укажите никнейм" }, { status: 400 });
  }

  try {
    // 1. Получаем ID игрока (через официальный API - тут fetch ок)
    const playerRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${inputNick}&game=cs2`, {
      headers: { Authorization: `Bearer ${FACEIT_KEY}` }
    });
    const playerData = await playerRes.json();

    if (!playerData.player_id) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const playerId = playerData.player_id;
    let peakElo = playerData.games?.cs2?.faceit_elo || 0;
    let peakDate = "Неизвестно";
    let totalScanned = 0;
    let currentTo = Date.now();

    // 2. ИСПОЛЬЗУЕМ gotScraping ДЛЯ СКАНА (План Б на стероидах)
    // Ограничиваем итерации, чтобы не вылететь по таймауту Vercel (10 сек)
    for (let i = 0; i < 12; i++) {
      try {
        const response = await gotScraping({
          url: `https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/cs2?size=100&to=${currentTo}`,
          headerGeneratorOptions: {
            browsers: [{ name: 'chrome', minVersion: 120 }],
            devices: ['desktop'],
          }
        });

        const matches = JSON.parse(response.body);
        if (!Array.isArray(matches) || matches.length === 0) break;

        for (const m of matches) {
          const eloNum = parseInt(m.elo);
          if (eloNum > peakElo) {
            peakElo = eloNum;
            peakDate = new Date(m.date).toLocaleDateString('ru-RU');
          }
        }

        totalScanned += matches.length;
        if (matches.length < 100) break;
        currentTo = matches[matches.length - 1].date - 1;
        
        // Небольшая задержка, чтобы не триггерить защиту
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error("Batch error:", err.message);
        break; 
      }
    }

    return NextResponse.json({
      nick: playerData.nickname,
      currentElo: playerData.games?.cs2?.faceit_elo || 0,
      peakElo: peakElo,
      peakDate: peakDate,
      totalScanned: totalScanned
    });

  } catch (error) {
    console.error("Vercel gotScraping error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
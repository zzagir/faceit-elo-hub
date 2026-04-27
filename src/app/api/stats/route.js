import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const inputNick = searchParams.get('nick');
  const FACEIT_KEY = process.env.FACEIT_API_KEY;

  if (!inputNick) {
    return NextResponse.json({ error: "Укажите никнейм" }, { status: 400 });
  }

  try {
    // 1. Получаем ID игрока через официальный API (здесь лимиты мягкие)
    const playerRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${inputNick}&game=cs2`, {
      headers: { 
        'Authorization': `Bearer ${FACEIT_KEY}`,
        'Accept': 'application/json'
      }
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

    // 2. Имитируем поведение got-scraping через нативный fetch
    // Делаем 10 итераций (1000 матчей), чтобы уложиться в 10 сек таймаута Vercel
    for (let i = 0; i < 10; i++) {
      const res = await fetch(
        `https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/cs2?size=100&to=${currentTo}`,
        {
          headers: {
            // МАКСИМАЛЬНАЯ МАСКИРОВКА:
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': `https://www.faceit.com/ru/players/${inputNick}/stats/cs2`,
            'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site'
          }
        }
      );

      const rawText = await res.text();
      
      // Если пришел HTML (капча) или пустота
      if (!rawText || rawText.trim().startsWith('<')) {
        console.log("Faceit API заблокировал запрос (Captcha/HTML)");
        break;
      }

      const matches = JSON.parse(rawText);
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

      // Маленькая пауза, чтобы не спамить
      await new Promise(r => setTimeout(r, 150));
    }

    return NextResponse.json({
      nick: playerData.nickname,
      currentElo: playerData.games?.cs2?.faceit_elo || 0,
      peakElo: peakElo,
      peakDate: peakDate,
      totalScanned: totalScanned
    });

  } catch (error) {
    console.error("Vercel Internal Error:", error);
    return NextResponse.json({ error: "Ошибка сервера: " + error.message }, { status: 500 });
  }
}
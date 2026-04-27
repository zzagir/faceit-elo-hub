import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Фейковые заголовки браузера, чтобы скрытое API FACEIT не блокировало запрос
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': 'https://www.faceit.com',
  'Referer': 'https://www.faceit.com/'
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const inputNick = searchParams.get('nick');

  if (!inputNick) {
    return NextResponse.json({ error: "Укажите никнейм" }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const FACEIT_KEY = process.env.FACEIT_API_KEY;

        // 1. Ищем игрока
        send({ type: "status", text: "🔍 Ищу игрока на FACEIT..." });
        
        let playerRes = await fetch(
          `https://open.faceit.com/data/v4/players?nickname=${inputNick}&game=cs2`,
          { headers: { Authorization: `Bearer ${FACEIT_KEY}` } }
        );
        let player = await playerRes.json();

        if (!player.player_id) {
          const searchRes = await fetch(
            `https://open.faceit.com/data/v4/search/players?nickname=${inputNick}&offset=0&limit=5`,
            { headers: { Authorization: `Bearer ${FACEIT_KEY}` } }
          );
          const searchData = await searchRes.json();
          const exactMatch = searchData.items?.find(p => p.nickname.toLowerCase() === inputNick.toLowerCase());
          
          if (exactMatch) {
            const exactRes = await fetch(
              `https://open.faceit.com/data/v4/players?nickname=${exactMatch.nickname}&game=cs2`,
              { headers: { Authorization: `Bearer ${FACEIT_KEY}` } }
            );
            player = await exactRes.json();
          } else {
            send({ type: "error", error: `Игрок "${inputNick}" не найден` });
            return controller.close();
          }
        }

        const playerId = player.player_id;
        const exactNick = player.nickname;
        const currentElo = player.games?.cs2?.faceit_elo || 0;

        // 2. Базовая статистика (Обычный fetch вместо got-scraping!)
        send({ type: "status", text: "📊 Собираю актуальную форму (K/D, ADR)..." });
        
        const [v4Res, v1Res] = await Promise.all([
          fetch(`https://open.faceit.com/data/v4/players/${playerId}/games/cs2/stats?limit=30`, { 
            headers: { Authorization: `Bearer ${FACEIT_KEY}` } 
          }),
          fetch(`https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/cs2?size=30`, { 
            headers: browserHeaders 
          })
        ]);

        const v4games = (await v4Res.json()).items || [];
        const v1gamesText = await v1Res.text();
        const v1games = v1gamesText ? JSON.parse(v1gamesText) : [];
        
        const v4Map = {};
        v4games.forEach(g => { if (g.stats && g.stats["Match Id"]) v4Map[g.stats["Match Id"]] = g.stats; });

        let wins = 0, kills = 0, kd = 0, adr = 0, recentCount = 0;
        v1games.forEach((m) => {
          const s = v4Map[m.matchId];
          if (s) {
            recentCount++;
            if (s.Result === '1') wins++;
            kills += parseFloat(s.Kills) || 0;
            kd += parseFloat(s["K/D Ratio"]) || 0;
            adr += parseFloat(s.ADR) || 0;
          }
        });

        if (recentCount === 0) recentCount = 1;

        // 3. ПОЛНЫЙ СКАНЕР ПИКА ELO
        let maxElo = currentElo;
        let totalChecked = 0;
        let currentTo = Date.now();

        send({ type: "progress", text: "⏳ Ищу пик ELO...", checked: 0, currentPeak: maxElo });

        while (true) {
          const response = await fetch(
            `https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/cs2?size=100&to=${currentTo}`,
            { headers: browserHeaders }
          );
          
          const rawData = await response.text();
          if (!rawData) break;
          
          const graphData = JSON.parse(rawData);
          if (!Array.isArray(graphData) || graphData.length === 0) break;

          const validMatches = graphData.filter(m => m.elo && parseInt(m.elo) > 0);
          totalChecked += validMatches.length;

          for (const m of validMatches) {
            const eloNum = parseInt(m.elo);
            if (eloNum > maxElo) maxElo = eloNum;
          }

          send({ type: "progress", text: "⏳ Ищу пик ELO...", checked: totalChecked, currentPeak: maxElo });

          if (graphData.length < 100) break;
          currentTo = graphData[graphData.length - 1].date - 1;
          
          await new Promise(r => setTimeout(r, 400));
        }

        // 4. Отправляем финальный результат (с аватаром и уровнем)
        send({
          type: "complete",
          stats: {
            nick: exactNick,
            avatar: player.avatar || "",
            level: player.games?.cs2?.skill_level || 0,
            country: player.country || "un",
            currentElo: currentElo,
            peakElo: maxElo,
            winrate: Math.round((wins / recentCount) * 100),
            kd: (kd / recentCount).toFixed(2),
            adr: (adr / recentCount).toFixed(1),
            avgKills: (kills / recentCount).toFixed(1),
            totalScanned: totalChecked
          }
        });
        
        controller.close();
      } catch (error) {
        console.error("API Stream Error:", error);
        send({ type: "error", error: "Внутренняя ошибка сервера" });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
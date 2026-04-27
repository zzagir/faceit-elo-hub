import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';

export const dynamic = 'force-dynamic';

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

        send({ type: "status", text: "📊 Собираю актуальную форму..." });
        
        // Используем gotScraping для скрытого API, чтобы пробить Cloudflare
        const [v4Res, v1Res] = await Promise.all([
          fetch(`https://open.faceit.com/data/v4/players/${playerId}/games/cs2/stats?limit=30`, { 
            headers: { Authorization: `Bearer ${FACEIT_KEY}` } 
          }),
          gotScraping({ url: `https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/cs2?size=30` })
        ]);

        const v4games = (await v4Res.json()).items || [];
        const rawV1Body = v1Res.body;

        // Защита от Cloudflare: проверяем, не подсунули ли нам HTML
        if (typeof rawV1Body === 'string' && rawV1Body.trim().startsWith('<')) {
           send({ type: "error", error: "Защита FACEIT заблокировала запрос. Попробуйте чуть позже." });
           return controller.close();
        }

        const v1games = JSON.parse(rawV1Body) || [];
        
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

        // ПОЛНЫЙ СКАНЕР ПИКА ELO
        let maxElo = currentElo;
        let totalChecked = 0;
        let currentTo = Date.now();

        send({ type: "progress", text: "⏳ Ищу пик ELO...", checked: 0, currentPeak: maxElo });

        while (true) {
          const response = await gotScraping({
            url: `https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/cs2?size=100&to=${currentTo}`
          });
          
          const rawData = response.body;
          if (!rawData || (typeof rawData === 'string' && rawData.trim().startsWith('<'))) break;
          
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
        console.error("API Stream Error:", error.message);
        send({ type: "error", error: "Внутренняя ошибка сервера при парсинге." });
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
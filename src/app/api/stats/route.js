import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const inputNick = searchParams.get('nick');

  if (!inputNick) return NextResponse.json({ error: "Укажите никнейм" }, { status: 400 });

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://ru.faceitanalyser.com/'
    };

    // 1. Сначала ищем ID игрока (на ru.faceitanalyser он в ключе "id")
    const searchRes = await fetch(`https://ru.faceitanalyser.com/api/searchPlayer/${inputNick}`, { headers });
    const searchData = await searchRes.json();

    if (!searchData || !searchData.id) {
      return NextResponse.json({ error: "Игрок не найден в Анализаторе" }, { status: 404 });
    }

    const playerId = searchData.id;
    const currentElo = searchData.games?.find(g => g.name === 'cs2')?.faceit_elo || 0;

    // 2. Идем в графики - там лежит готовый пик!
    const graphRes = await fetch(`https://ru.faceitanalyser.com/api/graph/${playerId}/cs2`, { headers });
    const graphData = await graphRes.json();

    let peakElo = currentElo;
    let peakDate = "Неизвестно";
    let totalScanned = 0;

    // Достаем данные из структуры, которую ты присылал в graph.txt
    if (graphData.graph_data?.elo) {
      const eloObj = graphData.graph_data.elo;
      peakElo = eloObj.max || currentElo;
      
      const values = eloObj.values || [];
      const dates = eloObj.dates || [];
      totalScanned = values.length;

      // Находим дату этого пика
      const peakIndex = values.indexOf(peakElo);
      if (peakIndex !== -1 && dates[peakIndex]) {
        const d = new Date(dates[peakIndex]);
        peakDate = isNaN(d.getTime()) ? dates[peakIndex] : d.toLocaleDateString('ru-RU');
      }
    }

    // 3. Отдаем боту чистый результат
    return NextResponse.json({
      nick: searchData.nickname,
      currentElo: currentElo,
      peakElo: peakElo,
      peakDate: peakDate,
      totalScanned: totalScanned
    });

  } catch (error) {
    console.error("Vercel Proxy Error:", error.message);
    return NextResponse.json({ error: "Анализатор недоступен: " + error.message }, { status: 500 });
  }
}
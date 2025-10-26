// fetchLive.js
// MaçNabzı Botu - Supabase'e canlı maç verisi ekleyen temel yapı

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// Ortam değişkenleri
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sofascore gibi sitelerden scraping yapmak için örnek URL (ileride genişletilecek)
const LIVE_URL = 'https://api.sofascore.com/api/v1/sport/football/events/live';

async function fetchLiveMatches() {
  console.log('🔄 Canlı maçlar çekiliyor...');

  try {
    const response = await fetch(LIVE_URL);
    const data = await response.json();

    if (!data.events || data.events.length === 0) {
      console.log('⚠ Canlı maç bulunamadı.');
      return;
    }

    for (const match of data.events) {
      const matchId = match.id;
      const leagueName = match.tournament.name;
      const country = match.tournament.country?.name || 'Unknown';
      const homeTeam = match.homeTeam.name;
      const awayTeam = match.awayTeam.name;

      console.log(`⚽ Maç: ${homeTeam} vs ${awayTeam}`);

      // 1) Lig ekle
      await supabase.from('leagues').upsert({
        id: match.tournament.id,
        name: leagueName,
        country: country,
        tier: 1
      });

      // 2) Takımları ekle
      await supabase.from('teams').upsert([
        { id: match.homeTeam.id, name: homeTeam, league_id: match.tournament.id },
        { id: match.awayTeam.id, name: awayTeam, league_id: match.tournament.id }
      ]);

      // 3) Maçı ekle
      await supabase.from('matches').upsert({
        id: matchId,
        league_id: match.tournament.id,
        home_id: match.homeTeam.id,
        away_id: match.awayTeam.id,
        utc_start: match.startTimestamp ? new Date(match.startTimestamp * 1000).toISOString() : null,
        status: match.status?.type || 'NS',
        home_score: match.homeScore?.current || 0,
        away_score: match.awayScore?.current || 0
      });
    }

    console.log('✅ Veriler Supabase veritabanına işlendi.');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

fetchLiveMatches();

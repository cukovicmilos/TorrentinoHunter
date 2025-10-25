// TorrentinoHunter Background Service Worker

const ALARM_NAME = 'dailyCheck';
const CHECK_INTERVAL = 24 * 60; // 24 hours in minutes

// Instalacija - postavi alarm
chrome.runtime.onInstalled.addListener(() => {
  console.log('TorrentinoHunter installed');

  // Kreiraj dnevni alarm
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: CHECK_INTERVAL,
    periodInMinutes: CHECK_INTERVAL
  });

  // Inicijalna provera
  checkAllMovies();
});

// Listener za alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('Running daily check...');
    checkAllMovies();
  }
});

// Glavna funkcija za proveru svih filmova
async function checkAllMovies() {
  try {
    const { movies = [] } = await chrome.storage.local.get('movies');

    if (movies.length === 0) {
      console.log('[TorrentinoHunter] No movies to check');
      return;
    }

    let newTorrentsCount = 0;

    for (let movie of movies) {
      // Skip ako nema title
      if (!movie.title || movie.title === 'Unknown') {
        console.log('[TorrentinoHunter] Skipping movie without title:', movie.imdbId);
        continue;
      }

      if (movie.status !== 'found') {
        const result = await searchTorrent(movie.title, movie.year);

        if (result.found) {
          movie.status = 'found';
          movie.quality = result.quality;
          movie.searchUrl = result.searchUrl;
          movie.foundDate = new Date().toISOString();
          newTorrentsCount++;
        } else if (result.hasCamTS) {
          movie.status = 'cam_ts';
          movie.searchUrl = result.searchUrl;
        }
      }
    }

    // Sačuvaj ažurirane filmove
    await chrome.storage.local.set({ movies });

    // Ažuriraj badge sa brojem novih torrenata
    if (newTorrentsCount > 0) {
      chrome.action.setBadgeText({ text: newTorrentsCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

      // Pošalji notifikaciju
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'TorrentinoHunter',
        message: `Pronađeno ${newTorrentsCount} novih torrenata!`
      });
    }

  } catch (error) {
    console.error('Error checking movies:', error);
  }
}

// Pretraga torrenta za film
async function searchTorrent(title, year) {
  try {
    // Koristi samo title, bez godine
    const searchQuery = title.trim();
    // Tačan format: /search/{query}/{page}/{order}/{category}
    // order: 99 = relevance, category: 0 = all
    const searchUrl = `https://thepiratebay10.xyz/search/${encodeURIComponent(searchQuery)}/1/99/0`;

    console.log('[TorrentinoHunter] Searching:', searchUrl);

    const response = await fetch(searchUrl);
    const html = await response.text();

    // Debug: loguj delove HTML-a da vidimo strukturu
    console.log('[TorrentinoHunter] HTML length:', html.length);

    // Sačuvaj HTML u window za debug (samo u dev mode)
    if (typeof globalThis !== 'undefined') {
      globalThis.lastHTML = html;
      console.log('[TorrentinoHunter] HTML saved to globalThis.lastHTML - use console to inspect it');
    }

    // Debug: Potraži jedan konkretni torrent koji znam da postoji
    const sampleMatch = html.match(/The Godfather \(1972\) 1080p BrRip x264 - YIFY/i);
    if (sampleMatch) {
      const contextStart = Math.max(0, sampleMatch.index - 200);
      const contextEnd = Math.min(html.length, sampleMatch.index + 400);
      console.log('[TorrentinoHunter] Sample torrent context:', html.substring(contextStart, contextEnd));
    }

    // Tražimo torrent linkove u tbody - probaj različite pattern-e
    let torrentMatches = [...html.matchAll(/<td>\s*<a\s+href="\/torrent\/[^"]+"\s+title="[^"]*">([^<]+)<\/a>/gi)];

    if (torrentMatches.length === 0) {
      // Probaj bez whitespace restrikcija
      torrentMatches = [...html.matchAll(/<a\s+href="https:\/\/thepiratebay[^"]+\/torrent\/[^"]+"\s+title="[^"]*">([^<]+)<\/a>/gi)];
    }

    console.log(`[TorrentinoHunter] Found ${torrentMatches.length} torrent results`);

    // Pripremamo naslov za matching
    const titleLower = title.toLowerCase().trim();

    // Ekstrahovati broj iz naslova ako postoji (npr. "Zootopia 2" -> ima "2")
    const sequelNumberMatch = titleLower.match(/\s+(\d+)$/); // Broj na kraju
    const hasSequelNumber = sequelNumberMatch !== null;
    const sequelNumber = hasSequelNumber ? sequelNumberMatch[1] : null;

    // Osnovno ime bez broja (npr. "Zootopia 2" -> "zootopia")
    const baseTitleLower = hasSequelNumber
      ? titleLower.replace(/\s+\d+$/, '').trim()
      : titleLower;

    // Rimski brojevi za matching (2 -> II, 3 -> III, itd.)
    const romanNumerals = { '2': 'ii', '3': 'iii', '4': 'iv', '5': 'v', '6': 'vi', '7': 'vii', '8': 'viii', '9': 'ix', '10': 'x' };
    const sequelRoman = hasSequelNumber ? romanNumerals[sequelNumber] : null;

    console.log('[TorrentinoHunter] Searching for:', titleLower, 'Year:', year || 'N/A');
    console.log('[TorrentinoHunter] Base title:', baseTitleLower);
    if (hasSequelNumber) {
      console.log('[TorrentinoHunter] Sequel number:', sequelNumber, 'Roman:', sequelRoman);
    }

    let hasQualityTorrent = false;
    let hasCamTS = false;
    let quality = '';
    let matchedTorrents = 0;

    for (let match of torrentMatches) {
      const torrentName = match[1].toLowerCase().trim();

      // Proveri da li torrent sadrži osnovno ime
      if (!torrentName.includes(baseTitleLower)) {
        continue; // Ne sadrži čak ni osnovno ime filma
      }

      // KRITIČNO: Ako imamo godinu iz IMDB-a, torrent MORA da sadrži tu godinu
      if (year) {
        const yearStr = year.toString();
        const hasYear = torrentName.includes(`(${yearStr})`) ||
                       torrentName.includes(` ${yearStr} `) ||
                       torrentName.includes(`.${yearStr}.`) ||
                       torrentName.includes(`_${yearStr}_`) ||
                       torrentName.includes(`-${yearStr}-`) ||
                       torrentName.includes(`${yearStr}p`); // npr. "2025p" iz "2025 1080p"

        if (!hasYear) {
          console.log('[TorrentinoHunter] Skipping (wrong year):', torrentName.substring(0, 60));
          continue;
        }
      }

      // Ako film ima broj u naslovu (sekvl), proveri da li torrent takođe ima taj broj
      if (hasSequelNumber) {
        const hasNumber = torrentName.includes(` ${sequelNumber}`) ||
                         torrentName.includes(`${sequelNumber} `) ||
                         torrentName.includes(`.${sequelNumber}.`) ||
                         torrentName.includes(`_${sequelNumber}_`) ||
                         torrentName.includes(`-${sequelNumber}-`) ||
                         torrentName.includes(`(${sequelNumber})`);

        const hasRoman = sequelRoman && (
          torrentName.includes(` ${sequelRoman} `) ||
          torrentName.includes(` ${sequelRoman})`) ||
          torrentName.includes(` ${sequelRoman}.`) ||
          torrentName.includes(`part ${sequelRoman}`) ||
          torrentName.includes(`part${sequelRoman}`)
        );

        // Ako torrent ne sadrži ni broj ni rimski broj, preskoči ga
        if (!hasNumber && !hasRoman) {
          console.log('[TorrentinoHunter] Skipping (no sequel number):', torrentName.substring(0, 60));
          continue;
        }
      }

      matchedTorrents++;
      console.log('[TorrentinoHunter] Matched torrent:', torrentName.substring(0, 80));

      // Proveri da li je CAM ili TS (loš kvalitet)
      if (torrentName.includes('cam') || torrentName.includes('ts') ||
          torrentName.includes('hdcam') || torrentName.includes('hdts') ||
          torrentName.includes('telesync')) {
        hasCamTS = true;
        console.log('[TorrentinoHunter]   -> CAM/TS quality, skipping');
        continue;
      }

      // Proveri da li ima kvalitetan rip
      if (torrentName.includes('bluray') || torrentName.includes('blu-ray') ||
          torrentName.includes('brrip') || torrentName.includes('bdr') ||
          torrentName.includes('bd-rip')) {
        hasQualityTorrent = true;
        quality = 'BluRay';
        console.log('[TorrentinoHunter]   -> BluRay quality found!');
        break;
      } else if (torrentName.includes('web-dl') || torrentName.includes('webdl') ||
                 torrentName.includes('webrip') || torrentName.includes('web dl')) {
        hasQualityTorrent = true;
        quality = 'WEB';
        console.log('[TorrentinoHunter]   -> WEB quality found!');
        break;
      } else if (torrentName.includes('dvdrip') || torrentName.includes('dvd-rip') ||
                 torrentName.includes('dvd')) {
        hasQualityTorrent = true;
        quality = 'DVD';
        console.log('[TorrentinoHunter]   -> DVD quality found!');
        break;
      }
    }

    console.log(`[TorrentinoHunter] Matched ${matchedTorrents} torrents for "${title}"`);

    return {
      found: hasQualityTorrent,
      hasCamTS: hasCamTS,
      quality: quality,
      searchUrl: searchUrl
    };

  } catch (error) {
    console.error('Error searching torrent:', error);
    return { found: false, hasCamTS: false, quality: '', searchUrl: '' };
  }
}

// Provera pojedinačnog filma (iz popup-a)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkMovie') {
    searchTorrent(request.title, request.year).then(sendResponse);
    return true; // Asinkroni odgovor
  }

  if (request.action === 'checkAll') {
    checkAllMovies().then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.action === 'resetBadge') {
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ success: true });
  }
});

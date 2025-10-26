// ThePirateBay Scraper Module

import { normalizeTitle, parseSequelInfo, hasSequelNumber, detectQuality } from './utils.js';

export const SOURCE_INFO = {
  name: 'ThePirateBay',
  shortName: 'TPB',
  baseUrl: 'https://thepiratebay10.xyz'
};

/**
 * Search for a movie torrent on ThePirateBay
 * @param {string} title - Movie title
 * @param {string|null} year - Movie year (optional)
 * @returns {Promise<{found: boolean, hasCamTS: boolean, quality: string, searchUrl: string}>}
 */
export async function searchTorrent(title, year) {
  try {
    // VAŽNO: Normalizuj search query jer torrent sajtovi često ne rade dobro sa apostrofima
    // Primer: "It's What's Inside" -> "Its Whats Inside"
    const normalizedSearchQuery = normalizeTitle(title.trim())
      .replace(/\s+/g, ' ')  // Normalizuj spaces
      .trim();

    // Tačan format: /search/{query}/{page}/{order}/{category}
    // order: 99 = relevance, category: 0 = all
    const searchUrl = `${SOURCE_INFO.baseUrl}/search/${encodeURIComponent(normalizedSearchQuery)}/1/99/0`;

    console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Searching:`, searchUrl);

    const response = await fetch(searchUrl);
    const html = await response.text();

    // Debug: loguj delove HTML-a da vidimo strukturu
    console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] HTML length:`, html.length);

    // Sačuvaj HTML u window za debug (samo u dev mode)
    if (typeof globalThis !== 'undefined') {
      globalThis.lastHTML = html;
      console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] HTML saved to globalThis.lastHTML`);
    }

    // Tražimo torrent linkove - fleksibilniji regex koji hvata title NAKON href
    // Struktura: <a href="...torrent/..." title="...">TORRENT_NAME</a>
    let torrentMatches = [...html.matchAll(/<a\s+href="[^"]*\/torrent\/[^"]+"\s+title="[^"]*">([^<]+)<\/a>/gi)];

    if (torrentMatches.length === 0) {
      // Probaj bez title atributa - samo href i sadržaj
      torrentMatches = [...html.matchAll(/<a\s+href="[^"]*\/torrent\/[^"]+">([^<]+)<\/a>/gi)];
      console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Using pattern without title, found ${torrentMatches.length} results`);
    }

    if (torrentMatches.length === 0) {
      // Fallback: široki pattern - bilo koji <a> tag koji sadrži "torrent" u href
      const allLinks = [...html.matchAll(/<a\s+href="([^"]*)"[^>]*>([^<]{10,200})<\/a>/gi)];
      torrentMatches = allLinks.filter(match => match[1].includes('/torrent/'));
      console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Using wide pattern, found ${torrentMatches.length} torrent links`);
      // Prilagodi format da bude [fullMatch, torrentName]
      torrentMatches = torrentMatches.map(match => [match[0], match[2]]);
    }

    console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Found ${torrentMatches.length} torrent results`);

    // Pripremamo naslov za matching koristeći deljene utility funkcije
    const titleLower = title.toLowerCase().trim();
    const sequelInfo = parseSequelInfo(title);

    console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Searching for:`, titleLower, 'Year:', year || 'N/A');
    console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Base title:`, sequelInfo.baseTitle);
    console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Normalized:`, sequelInfo.normalizedBaseTitle);
    if (sequelInfo.hasSequelNumber) {
      console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Sequel number:`, sequelInfo.sequelNumber, 'Roman:', sequelInfo.sequelRoman);
    }

    let hasQualityTorrent = false;
    let hasCamTS = false;
    let quality = '';
    let matchedTorrents = 0;

    for (let match of torrentMatches) {
      const torrentName = match[1].toLowerCase().trim();
      const normalizedTorrentName = normalizeTitle(torrentName);

      // Proveri da li torrent sadrži osnovno ime (normalizovano)
      if (!normalizedTorrentName.includes(sequelInfo.normalizedBaseTitle)) {
        continue; // Ne sadrži čak ni osnovno ime filma
      }

      // KRITIČNO: Ako imamo godinu iz IMDB-a, torrent MORA da sadrži tu godinu
      if (year) {
        const yearStr = year.toString();
        // Fleksibilniji year matching - samo proveri da postoji godina NEGDE u nazivu
        const hasYear = torrentName.includes(yearStr);

        if (!hasYear) {
          console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Skipping (wrong year):`, torrentName.substring(0, 60));
          continue;
        }
      }

      // Ako film ima broj u naslovu (sequel), proveri da li torrent takođe ima taj broj
      if (sequelInfo.hasSequelNumber) {
        if (!hasSequelNumber(torrentName, sequelInfo.sequelNumber, sequelInfo.sequelRoman)) {
          console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Skipping (no sequel number):`, torrentName.substring(0, 60));
          continue;
        }
      }

      matchedTorrents++;

      // Detektuj kvalitet koristeći deljenu funkciju
      const qualityInfo = detectQuality(torrentName);

      if (qualityInfo.isCamTS) {
        hasCamTS = true;
        continue;
      }

      if (qualityInfo.quality) {
        hasQualityTorrent = true;
        quality = qualityInfo.quality;
        console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] ${quality} quality found!`);
        break;
      }
    }

    console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Matched ${matchedTorrents} torrents for "${title}"`);

    return {
      found: hasQualityTorrent,
      hasCamTS: hasCamTS,
      quality: quality,
      searchUrl: searchUrl,
      source: SOURCE_INFO.shortName
    };

  } catch (error) {
    console.error(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Error searching torrent:`, error);
    return { found: false, hasCamTS: false, quality: '', searchUrl: '', source: SOURCE_INFO.shortName };
  }
}

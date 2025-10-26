// 1337x Scraper Module

import { normalizeTitle, parseSequelInfo, hasSequelNumber, detectQuality } from './utils.js';

export const SOURCE_INFO = {
  name: '1337x',
  shortName: '1337x',
  baseUrl: 'https://www.1377x.to'
};

/**
 * Search for a movie torrent on 1337x
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

    const searchUrl = `${SOURCE_INFO.baseUrl}/srch?search=${encodeURIComponent(normalizedSearchQuery)}`;

    console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Searching:`, searchUrl);

    const response = await fetch(searchUrl);
    const html = await response.text();

    console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] HTML length:`, html.length);

    // Sačuvaj HTML u window za debug
    if (typeof globalThis !== 'undefined') {
      globalThis.lastHTML1337x = html;
      console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] HTML saved to globalThis.lastHTML1337x`);
    }

    // 1337x ima malo drugačiju strukturu - torrent linkovi su uglavnom u <td> tagovima sa <a> linkovima
    // Tražimo linkove ka /torrent/ stranicama - fleksibilniji regex
    let torrentMatches = [...html.matchAll(/<a\s+href="[^"]*\/torrent\/[^"]+">([^<]+)<\/a>/gi)];

    if (torrentMatches.length === 0) {
      // Probaj pattern sa class="name" u <td> tagu
      torrentMatches = [...html.matchAll(/<td[^>]*class="[^"]*name[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/gis)];
      console.log(`[TorrentinoHunter][${SOURCE_INFO.shortName}] Using TD class pattern, found ${torrentMatches.length} results`);
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
        continue;
      }

      // Proveri godinu ako postoji
      if (year) {
        const yearStr = year.toString();
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

// Source Manager Module
// Coordinates searches across multiple torrent sources

import * as tpb from './tpb.js';
import * as x1337 from './1337x.js';

// Registrovani izvori torrenta (po prioritetu)
const SOURCES = [
  { info: tpb.SOURCE_INFO, search: tpb.searchTorrent },
  { info: x1337.SOURCE_INFO, search: x1337.searchTorrent }
];

/**
 * Pretraži sve izvore torrenta za film
 * Strategija: Sekvencijalno pretražuj izvore dok ne pronađeš kvalitetan torrent
 * Ako pronađeš samo CAM/TS, nastavi sa ostalim izvorima
 *
 * @param {string} title - Movie title
 * @param {string|null} year - Movie year (optional)
 * @returns {Promise<{found: boolean, hasCamTS: boolean, quality: string, searchUrl: string, source: string}>}
 */
export async function searchAllSources(title, year) {
  console.log('[TorrentinoHunter][SourceManager] Starting search for:', title, year || '');

  let bestResult = {
    found: false,
    hasCamTS: false,
    quality: '',
    searchUrl: '',
    source: ''
  };

  // Sekvencijalno pretražuj svaki izvor
  for (const source of SOURCES) {
    try {
      console.log(`[TorrentinoHunter][SourceManager] Trying source: ${source.info.name}`);

      const result = await source.search(title, year);

      // Ako smo pronašli kvalitetan torrent, odmah vraćamo rezultat
      if (result.found) {
        console.log(`[TorrentinoHunter][SourceManager] ✓ Quality torrent found on ${source.info.name}!`);
        return result;
      }

      // Ako smo pronašli samo CAM/TS, zapamti ga ali nastavi pretragu
      if (result.hasCamTS && !bestResult.hasCamTS) {
        console.log(`[TorrentinoHunter][SourceManager] ⚠ Only CAM/TS found on ${source.info.name}, continuing search...`);
        bestResult = result;
      }

    } catch (error) {
      console.error(`[TorrentinoHunter][SourceManager] Error with source ${source.info.name}:`, error);
      // Nastavi sa sledećim izvorom ako trenutni ne radi
      continue;
    }
  }

  // Ako nismo pronašli kvalitetan torrent, vrati najbolji rezultat (možda CAM/TS ili ništa)
  if (bestResult.hasCamTS) {
    console.log('[TorrentinoHunter][SourceManager] No quality torrent found, but CAM/TS available');
  } else {
    console.log('[TorrentinoHunter][SourceManager] No torrent found on any source');
  }

  return bestResult;
}

/**
 * Vrati listu svih registrovanih izvora
 * @returns {Array<{name: string, shortName: string, baseUrl: string}>}
 */
export function getAvailableSources() {
  return SOURCES.map(s => s.info);
}

// Shared Utility Functions for Torrent Scrapers

/**
 * Normalizuj naziv za bolje matchovanje između naslova filma i torrent naziva
 *
 * Razlog: Torrent nazivi često uklanjaju specijalne karaktere (apostrofe, zareze, itd.)
 * Primer: "It's What's Inside" postaje "Its Whats Inside" u torrent nazivima
 * Primer: "Its.Whats.Inside.2024" postaje "its whats inside 2024"
 *
 * @param {string} str - String koji treba normalizovati
 * @returns {string} Normalizovan string
 */
export function normalizeTitle(str) {
  return str.toLowerCase()
    .replace(/\./g, ' ')            // Zameni tačke sa space-ovima (često u torrent nazivima)
    .replace(/[,\-\'\'\`\:]/g, '') // Ukloni zareze, crtice, apostrofe (sve vrste), dvotačke
    .replace(/\s+/g, ' ')           // Multiple spaces -> jedan space
    .trim();
}

/**
 * Mapiranje običnih brojeva u rimske brojeve za matchovanje sequela
 */
export const romanNumerals = {
  '2': 'ii',
  '3': 'iii',
  '4': 'iv',
  '5': 'v',
  '6': 'vi',
  '7': 'vii',
  '8': 'viii',
  '9': 'ix',
  '10': 'x'
};

/**
 * Ekstraktuj informacije o sequelu iz naslova filma
 *
 * @param {string} title - Naslov filma
 * @returns {{hasSequelNumber: boolean, sequelNumber: string|null, baseTitle: string, normalizedBaseTitle: string, sequelRoman: string|null}}
 */
export function parseSequelInfo(title) {
  const titleLower = title.toLowerCase().trim();

  // Ekstrahovati broj iz naslova ako postoji (npr. "Zootopia 2" -> ima "2")
  const sequelNumberMatch = titleLower.match(/\s+(\d+)$/); // Broj na kraju
  const hasSequelNumber = sequelNumberMatch !== null;
  const sequelNumber = hasSequelNumber ? sequelNumberMatch[1] : null;

  // Osnovno ime bez broja (npr. "Zootopia 2" -> "zootopia")
  const baseTitle = hasSequelNumber
    ? titleLower.replace(/\s+\d+$/, '').trim()
    : titleLower;

  // Normalizovana verzija
  const normalizedBaseTitle = normalizeTitle(baseTitle);

  // Rimski brojevi
  const sequelRoman = hasSequelNumber ? romanNumerals[sequelNumber] : null;

  return {
    hasSequelNumber,
    sequelNumber,
    baseTitle,
    normalizedBaseTitle,
    sequelRoman
  };
}

/**
 * Proveri da li torrent naziv sadrži sequel broj (običan ili rimski)
 *
 * @param {string} torrentName - Naziv torrenta (lowercase)
 * @param {string} sequelNumber - Broj sequela (npr. "2")
 * @param {string|null} sequelRoman - Rimski broj sequela (npr. "ii")
 * @returns {boolean}
 */
export function hasSequelNumber(torrentName, sequelNumber, sequelRoman) {
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

  return hasNumber || hasRoman;
}

/**
 * Detektuj kvalitet torrenta
 *
 * @param {string} torrentName - Naziv torrenta (lowercase)
 * @returns {{quality: string, isCamTS: boolean}}
 */
export function detectQuality(torrentName) {
  // Proveri da li je CAM ili TS (loš kvalitet)
  // VAŽNO: Koristi word boundary (\b) da bi "ts" matchovalo samo kao celu reč
  // Razlog: "whats" sadrži "ts" ali nije CAM/TS format!
  // Lista loših formata: CAM, HDCAM, TS, HDTS, HD-TS, TELESYNC, TELECINE, R5, SCREENER, TC (TeleCine)
  const camTsPattern = /\b(cam|hd-?cam|tc|hd-?ts|tele-?sync|telecine|r5|scr|screener)\b|\.ts\b|\bts\./i;
  if (camTsPattern.test(torrentName)) {
    return { quality: '', isCamTS: true };
  }

  // Proveri da li ima kvalitetan rip
  if (torrentName.includes('bluray') || torrentName.includes('blu-ray') ||
      torrentName.includes('brrip') || torrentName.includes('bdr') ||
      torrentName.includes('bd-rip')) {
    return { quality: 'BluRay', isCamTS: false };
  }

  if (torrentName.includes('web-dl') || torrentName.includes('webdl') ||
      torrentName.includes('webrip') || torrentName.includes('web-rip') ||
      torrentName.includes('web dl')) {
    return { quality: 'WEB', isCamTS: false };
  }

  if (torrentName.includes('dvdrip') || torrentName.includes('dvd-rip') ||
      torrentName.includes('dvd')) {
    return { quality: 'DVD', isCamTS: false };
  }

  // Dodatni formati koji su takođe kvalitetni
  if (torrentName.includes('hdrip') || torrentName.includes('hd-rip')) {
    return { quality: 'HDRip', isCamTS: false };
  }

  if (torrentName.includes('1080p') || torrentName.includes('720p')) {
    return { quality: 'HD', isCamTS: false };
  }

  return { quality: '', isCamTS: false };
}

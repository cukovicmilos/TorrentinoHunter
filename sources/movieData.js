// Movie Data Module
// Handles fetching movie information from IMDB

/**
 * Fetch movie data from IMDB by scraping the page
 * @param {string} imdbId - IMDB ID (e.g., "tt1234567")
 * @returns {Promise<{Title: string, Year: string, Poster: string}|null>}
 */
/**
 * Search for movie by title and fetch data from IMDB
 * @param {string} title - Movie title to search for
 * @returns {Promise<{Title: string, Year: string, Poster: string, imdbId: string}|null>}
 */
export async function searchMovieByTitle(title) {
  try {
    console.log('[TorrentinoHunter] Searching IMDB for title:', title);
    
    // Search IMDB for the title
    const searchResponse = await fetch(`https://www.imdb.com/find?q=${encodeURIComponent(title)}&s=tt&ttype=ft`);
    const searchHtml = await searchResponse.text();
    const searchParser = new DOMParser();
    const searchDoc = searchParser.parseFromString(searchHtml, 'text/html');
    
    // Find first movie result
    const firstResult = searchDoc.querySelector('a[href*="/title/tt"]');
    if (!firstResult) {
      console.log('[TorrentinoHunter] No movie found for title:', title);
      return null;
    }
    
    const imdbId = firstResult.href.match(/\/title\/(tt\d+)/)?.[1];
    if (!imdbId) {
      console.log('[TorrentinoHunter] Could not extract IMDB ID from search result');
      return null;
    }
    
    console.log('[TorrentinoHunter] Found IMDB ID:', imdbId);
    
    // Fetch full movie data using the IMDB ID
    const movieData = await fetchMovieData(imdbId);
    if (movieData) {
      return {
        ...movieData,
        imdbId: imdbId
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('Error searching movie by title:', error);
    return null;
  }
}

export async function fetchMovieData(imdbId) {
  try {
    // Scrape IMDB stranicu direktno
    console.log('[TorrentinoHunter] Fetching from IMDB:', imdbId);
    const response = await fetch(`https://www.imdb.com/title/${imdbId}/`);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Debug: isprintaj sve h1 tagove da vidimo strukturu
    const allH1s = doc.querySelectorAll('h1');
    console.log('[TorrentinoHunter] Found h1 elements:', allH1s.length);
    allH1s.forEach((h1, i) => {
      console.log(`  H1 #${i}:`, h1.textContent?.trim()?.substring(0, 50), 'data-testid:', h1.getAttribute('data-testid'));
    });

    // Probaj više različitih selektora za title
    let titleElement = doc.querySelector('h1[data-testid="hero__primary-text"]');
    if (!titleElement) titleElement = doc.querySelector('h1[data-testid="hero-title-block__title"]');
    if (!titleElement) titleElement = doc.querySelector('h1.sc-afe43def-0');
    if (!titleElement) titleElement = doc.querySelector('h1');

    // Probaj više selektora za godinu
    let yearElement = doc.querySelector('a[href*="releaseinfo"]');
    if (!yearElement) yearElement = doc.querySelector('a[href*="/releaseinfo"]');
    if (!yearElement) yearElement = doc.querySelector('[data-testid="hero-title-block__metadata"] li:first-child a');

    // Poster
    const posterElement = doc.querySelector('img[class*="ipc-image"]');

    const movieData = {
      Title: titleElement?.textContent?.trim() || 'Unknown',
      Year: yearElement?.textContent?.trim() || '',
      Poster: posterElement?.src || 'N/A'
    };

    console.log('[TorrentinoHunter] IMDB scraped data:', movieData);
    console.log('[TorrentinoHunter] Title element found:', !!titleElement, titleElement?.tagName);
    return movieData;

  } catch (error) {
    console.error('Error fetching movie data:', error);
    return null;
  }
}

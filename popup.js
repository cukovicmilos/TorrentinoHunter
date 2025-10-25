// TorrentinoHunter Popup Script

// Učitaj API key iz config.js
const OMDB_API_KEY = CONFIG?.OMDB_API_KEY || '';

// DOM elementi
const imdbInput = document.getElementById('imdbInput');
const addMovieBtn = document.getElementById('addMovie');
const loadMdBtn = document.getElementById('loadMd');
const checkAllBtn = document.getElementById('checkAll');
const moviesList = document.getElementById('moviesList');
const loading = document.getElementById('loading');
const totalCount = document.getElementById('totalCount');
const foundCount = document.getElementById('foundCount');
const pendingCount = document.getElementById('pendingCount');

// Event listeneri
addMovieBtn.addEventListener('click', addMovie);
loadMdBtn.addEventListener('click', loadMoviesFromMd);
checkAllBtn.addEventListener('click', checkAllMovies);
imdbInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addMovie();
});

// Inicijalizacija
loadMovies();

// Funkcije

async function loadMovies() {
  const { movies = [] } = await chrome.storage.local.get('movies');
  renderMovies(movies);
  updateStats(movies);

  // Reset badge kada se otvori popup
  chrome.runtime.sendMessage({ action: 'resetBadge' });
}

function renderMovies(movies) {
  if (movies.length === 0) {
    moviesList.innerHTML = `
      <div class="empty-state">
        <p>Nema filmova u listi</p>
        <p class="hint">Dodajte IMDB link ili učitajte movies.md fajl</p>
      </div>
    `;
    return;
  }

  moviesList.innerHTML = movies.map((movie, index) => `
    <div class="movie-card ${movie.status || 'pending'}">
      <div class="movie-poster">
        ${movie.poster && movie.poster !== 'N/A'
          ? `<img src="${movie.poster}" alt="${movie.title}">`
          : `<div class="no-poster">🎬</div>`
        }
      </div>
      <div class="movie-info">
        <h3>${movie.title} ${movie.year ? `(${movie.year})` : ''}</h3>
        <div class="movie-meta">
          <span class="imdb-id">${movie.imdbId}</span>
          ${getStatusBadge(movie)}
        </div>
        ${movie.status === 'found' || movie.status === 'cam_ts' ? `
          <a href="${movie.searchUrl}" target="_blank" class="search-link">
            🔗 Otvori na ThePirateBay
          </a>
        ` : ''}
      </div>
      <div class="movie-actions">
        <button class="btn-icon btn-check" data-index="${index}" title="Proveri film">
          🔍
        </button>
        <button class="btn-icon btn-remove" data-index="${index}" title="Ukloni film">
          🗑️
        </button>
      </div>
    </div>
  `).join('');
}

function getStatusBadge(movie) {
  switch (movie.status) {
    case 'found':
      return `<span class="badge badge-success">✓ Pronađen (${movie.quality})</span>`;
    case 'cam_ts':
      return `<span class="badge badge-warning">⚠️ Samo CAM/TS</span>`;
    default:
      return `<span class="badge badge-pending">⏳ Čeka</span>`;
  }
}

function updateStats(movies) {
  totalCount.textContent = movies.length;
  foundCount.textContent = movies.filter(m => m.status === 'found').length;
  pendingCount.textContent = movies.filter(m => !m.status || m.status === 'pending').length;
}

async function addMovie() {
  const imdbUrl = imdbInput.value.trim();

  if (!imdbUrl) {
    alert('Unesite IMDB link!');
    return;
  }

  // Ekstraktuj IMDB ID
  const imdbIdMatch = imdbUrl.match(/tt\d+/);
  if (!imdbIdMatch) {
    alert('Neispravan IMDB link!');
    return;
  }

  const imdbId = imdbIdMatch[0];

  // Proveri da li već postoji
  const { movies = [] } = await chrome.storage.local.get('movies');
  if (movies.some(m => m.imdbId === imdbId)) {
    alert('Film već postoji u listi!');
    return;
  }

  showLoading(true);

  try {
    // Preuzmi podatke o filmu sa OMDb API
    const movieData = await fetchMovieData(imdbId);

    if (!movieData) {
      alert('Nije moguće preuzeti podatke o filmu!');
      showLoading(false);
      return;
    }

    const newMovie = {
      imdbId: imdbId,
      title: movieData.Title,
      year: movieData.Year,
      poster: movieData.Poster,
      status: 'pending',
      addedDate: new Date().toISOString()
    };

    movies.push(newMovie);
    await chrome.storage.local.set({ movies });

    imdbInput.value = '';
    loadMovies();

  } catch (error) {
    console.error('Error adding movie:', error);
    alert('Greška pri dodavanju filma!');
  }

  showLoading(false);
}

async function fetchMovieData(imdbId) {
  try {
    // Pokušaj prvo sa OMDb API
    if (OMDB_API_KEY && OMDB_API_KEY !== 'YOUR_API_KEY') {
      const response = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);
      const data = await response.json();
      console.log('[TorrentinoHunter] OMDb response:', data);
      if (data.Response === 'True') {
        return data;
      }
      console.log('[TorrentinoHunter] OMDb failed, using IMDB fallback');
    }

    // Fallback: scrape IMDB stranicu
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

async function removeMovie(index) {
  if (!confirm('Da li sigurno želite da uklonite ovaj film?')) {
    return;
  }

  const { movies = [] } = await chrome.storage.local.get('movies');
  movies.splice(index, 1);
  await chrome.storage.local.set({ movies });
  loadMovies();
}

async function checkSingleMovie(index) {
  const { movies = [] } = await chrome.storage.local.get('movies');
  const movie = movies[index];

  showLoading(true);

  try {
    const result = await chrome.runtime.sendMessage({
      action: 'checkMovie',
      title: movie.title,
      year: movie.year
    });

    if (result.found) {
      movie.status = 'found';
      movie.quality = result.quality;
      movie.searchUrl = result.searchUrl;
      movie.foundDate = new Date().toISOString();
    } else if (result.hasCamTS) {
      movie.status = 'cam_ts';
      movie.searchUrl = result.searchUrl;
    } else {
      movie.status = 'pending';
    }

    await chrome.storage.local.set({ movies });
    loadMovies();

  } catch (error) {
    console.error('Error checking movie:', error);
    alert('Greška pri proveri filma!');
  }

  showLoading(false);
}

async function checkAllMovies() {
  showLoading(true);

  try {
    await chrome.runtime.sendMessage({ action: 'checkAll' });

    // Sačekaj malo da se obrada završi
    setTimeout(() => {
      loadMovies();
      showLoading(false);
    }, 2000);

  } catch (error) {
    console.error('Error checking all movies:', error);
    alert('Greška pri proveri filmova!');
    showLoading(false);
  }
}

async function loadMoviesFromMd() {
  try {
    // Otvori file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      showLoading(true);

      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target.result;
        const imdbLinks = parseMoviesMd(content);

        const { movies = [] } = await chrome.storage.local.get('movies');

        // Dodaj nove filmove
        for (let imdbId of imdbLinks) {
          if (!movies.some(m => m.imdbId === imdbId)) {
            const movieData = await fetchMovieData(imdbId);
            if (movieData) {
              movies.push({
                imdbId: imdbId,
                title: movieData.Title,
                year: movieData.Year,
                poster: movieData.Poster,
                status: 'pending',
                addedDate: new Date().toISOString()
              });
            }
          }
        }

        await chrome.storage.local.set({ movies });
        loadMovies();
        showLoading(false);
      };

      reader.readAsText(file);
    };

    input.click();

  } catch (error) {
    console.error('Error loading movies.md:', error);
    alert('Greška pri učitavanju fajla!');
  }
}

function parseMoviesMd(content) {
  const regex = /https:\/\/www\.imdb\.com\/title\/(tt\d+)/g;
  const matches = [...content.matchAll(regex)];
  return matches.map(m => m[1]);
}

function showLoading(show) {
  loading.classList.toggle('hidden', !show);
}

// Event delegation za dugmad u movie cards
moviesList.addEventListener('click', (e) => {
  const checkBtn = e.target.closest('.btn-check');
  const removeBtn = e.target.closest('.btn-remove');

  if (checkBtn) {
    const index = parseInt(checkBtn.dataset.index);
    checkSingleMovie(index);
  } else if (removeBtn) {
    const index = parseInt(removeBtn.dataset.index);
    removeMovie(index);
  }
});

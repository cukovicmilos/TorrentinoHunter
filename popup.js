// TorrentinoHunter Popup Script

import { fetchMovieData, searchMovieByTitle } from './sources/movieData.js';

// DOM elementi
const imdbInput = document.getElementById('imdbInput');
const customInput = document.getElementById('customInput');
const addMovieBtn = document.getElementById('addMovie');
const loadMdBtn = document.getElementById('loadMd');
const checkAllBtn = document.getElementById('checkAll');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const moviesList = document.getElementById('moviesList');
const loading = document.getElementById('loading');
const totalCount = document.getElementById('totalCount');
const foundCount = document.getElementById('foundCount');
const pendingCount = document.getElementById('pendingCount');

// Event listeneri
addMovieBtn.addEventListener('click', addMovie);
loadMdBtn.addEventListener('click', loadMoviesFromMd);
checkAllBtn.addEventListener('click', checkAllMovies);
themeToggle.addEventListener('click', toggleTheme);
imdbInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addMovie();
});
customInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addMovie();
});

// Inicijalizacija
loadMovies();
loadTheme();
updateMissingPosters();

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
      <div class="movie-poster" data-index="${index}">
        ${movie.poster && movie.poster !== 'N/A'
          ? `<img src="${movie.poster}" alt="${movie.title}">`
          : `<div class="no-poster">🎬</div>`
        }
      </div>
      <div class="movie-info">
        <h3 class="movie-title" data-index="${index}">${movie.title} ${movie.year ? `(${movie.year})` : ''}</h3>
        <div class="movie-meta">
          ${movie.imdbId
            ? `<span class="imdb-id">${movie.imdbId}</span>`
            : `<span class="imdb-id custom-search">Direktna pretraga</span>`
          }
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
  const sourceBadge = movie.source ? `<span class="badge badge-source">${movie.source}</span>` : '';

  switch (movie.status) {
    case 'found':
      return `<span class="badge badge-success">✓ Pronađen (${movie.quality})</span>${sourceBadge}`;
    case 'cam_ts':
      return `<span class="badge badge-warning">⚠️ Samo CAM/TS</span>${sourceBadge}`;
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
  const customTitle = customInput.value.trim();

  // Proveri da li je unet IMDB link ili običan string
  if (!imdbUrl && !customTitle) {
    alert('Unesite IMDB link ili naziv filma!');
    return;
  }

  if (imdbUrl && customTitle) {
    alert('Unesite samo jedan od dva polja - ili IMDB link ili naziv filma!');
    return;
  }

  const { movies = [] } = await chrome.storage.local.get('movies');

  showLoading(true);

  try {
    let newMovie;

    // Način 1: IMDB link
    if (imdbUrl) {
      // Ekstraktuj IMDB ID
      const imdbIdMatch = imdbUrl.match(/tt\d+/);
      if (!imdbIdMatch) {
        alert('Neispravan IMDB link!');
        showLoading(false);
        return;
      }

      const imdbId = imdbIdMatch[0];

      // Proveri da li već postoji
      if (movies.some(m => m.imdbId === imdbId)) {
        alert('Film već postoji u listi!');
        showLoading(false);
        return;
      }

      // Preuzmi podatke o filmu sa IMDB-a
      const movieData = await fetchMovieData(imdbId);

      if (!movieData) {
        alert('Nije moguće preuzeti podatke o filmu!');
        showLoading(false);
        return;
      }

      newMovie = {
        imdbId: imdbId,
        title: movieData.Title,
        year: movieData.Year,
        poster: movieData.Poster,
        status: 'pending',
        type: 'imdb',
        addedDate: new Date().toISOString()
      };
    }
    // Način 2: Običan string
    else {
      // Proveri da li već postoji sa istim naslovom
      if (movies.some(m => m.title.toLowerCase() === customTitle.toLowerCase())) {
        alert('Film sa tim naslovom već postoji u listi!');
        showLoading(false);
        return;
      }

      // Pretraži IMDB za film po naslovu
      const movieData = await searchMovieByTitle(customTitle);

      if (movieData) {
        newMovie = {
          imdbId: movieData.imdbId,
          title: movieData.Title,
          year: movieData.Year,
          poster: movieData.Poster,
          status: 'pending',
          type: 'custom',
          addedDate: new Date().toISOString()
        };
      } else {
        // Ako se ne nađe na IMDB, sačuvaj samo naslov
        newMovie = {
          imdbId: null,
          title: customTitle,
          year: null,
          poster: 'N/A',
          status: 'pending',
          type: 'custom',
          addedDate: new Date().toISOString()
        };
      }
    }

    movies.push(newMovie);
    await chrome.storage.local.set({ movies });

    imdbInput.value = '';
    customInput.value = '';
    loadMovies();

    // Odmah proveri da li postoji torrent za novi film
    console.log('[TorrentinoHunter] Auto-checking newly added movie...');
    const movieIndex = movies.length - 1;

    // Ne čekaj, nego pokreni check u pozadini
    checkSingleMovie(movieIndex).then(() => {
      console.log('[TorrentinoHunter] Auto-check completed');
    });

  } catch (error) {
    console.error('Error adding movie:', error);
    alert('Greška pri dodavanju filma!');
  }

  showLoading(false);
}

// fetchMovieData je sada importovan iz movieData.js modula

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
      movie.source = result.source;
      movie.foundDate = new Date().toISOString();
    } else if (result.hasCamTS) {
      movie.status = 'cam_ts';
      movie.searchUrl = result.searchUrl;
      movie.source = result.source;
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

// Theme functions
async function loadTheme() {
  try {
    const { darkMode = false } = await chrome.storage.local.get('darkMode');
    if (darkMode) {
      document.body.classList.add('dark-mode');
      themeIcon.textContent = '☀️';
    }
  } catch (error) {
    console.error('Error loading theme:', error);
  }
}

async function updateMissingPosters() {
  try {
    const { movies = [] } = await chrome.storage.local.get('movies');
    const moviesWithoutPoster = movies.filter(m => !m.poster || m.poster === 'N/A');
    
    if (moviesWithoutPoster.length === 0) {
      console.log('[TorrentinoHunter] All movies have posters');
      return;
    }
    
    console.log(`[TorrentinoHunter] Found ${moviesWithoutPoster.length} movies without posters, updating...`);
    
    let updatedCount = 0;
    
    for (const movie of moviesWithoutPoster) {
      // Preskoči ako već ima IMDB ID (trebao bi imati poster)
      if (movie.imdbId) {
        const movieData = await fetchMovieData(movie.imdbId);
        if (movieData && movieData.Poster && movieData.Poster !== 'N/A') {
          movie.poster = movieData.Poster;
          movie.year = movieData.Year || movie.year;
          movie.title = movieData.Title || movie.title;
          updatedCount++;
        }
      } else {
        // Traži po naslovu
        const movieData = await searchMovieByTitle(movie.title);
        if (movieData) {
          movie.imdbId = movieData.imdbId;
          movie.poster = movieData.Poster;
          movie.year = movieData.Year || movie.year;
          movie.title = movieData.Title || movie.title;
          updatedCount++;
        }
      }
      
      // Malo pauziraj da ne preopterećujemo IMDB
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (updatedCount > 0) {
      await chrome.storage.local.set({ movies });
      console.log(`[TorrentinoHunter] Updated ${updatedCount} movies with posters`);
      loadMovies(); // Osveži prikaz
    }
    
  } catch (error) {
    console.error('Error updating missing posters:', error);
  }
}

async function toggleTheme() {
  try {
    const isDark = document.body.classList.toggle('dark-mode');
    themeIcon.textContent = isDark ? '☀️' : '🌙';
    await chrome.storage.local.set({ darkMode: isDark });
  } catch (error) {
    console.error('Error toggling theme:', error);
  }
}

// Event delegation za dugmad u movie cards
moviesList.addEventListener('click', (e) => {
  const checkBtn = e.target.closest('.btn-check');
  const removeBtn = e.target.closest('.btn-remove');
  const poster = e.target.closest('.movie-poster');
  const title = e.target.closest('.movie-title');

  if (checkBtn) {
    const index = parseInt(checkBtn.dataset.index);
    checkSingleMovie(index);
  } else if (removeBtn) {
    const index = parseInt(removeBtn.dataset.index);
    removeMovie(index);
  } else if (poster || title) {
    const index = parseInt((poster || title).dataset.index);
    chrome.storage.local.get('movies').then(({ movies = [] }) => {
      const movie = movies[index];
      if (movie.imdbId) {
        window.open(`https://www.imdb.com/title/${movie.imdbId}`, '_blank');
      } else {
        window.open(`https://www.imdb.com/find?q=${encodeURIComponent(movie.title)}`, '_blank');
      }
    });
  }
});

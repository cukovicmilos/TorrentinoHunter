// TorrentinoHunter Popup Script

import { fetchMovieData } from './sources/movieData.js';

// DOM elementi
const imdbInput = document.getElementById('imdbInput');
const customInput = document.getElementById('customInput');
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
customInput.addEventListener('keypress', (e) => {
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

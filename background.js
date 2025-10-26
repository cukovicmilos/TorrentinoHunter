// TorrentinoHunter Background Service Worker

import { searchAllSources } from './sources/sourceManager.js';

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
        const result = await searchAllSources(movie.title, movie.year);

        if (result.found) {
          movie.status = 'found';
          movie.quality = result.quality;
          movie.searchUrl = result.searchUrl;
          movie.source = result.source;
          movie.foundDate = new Date().toISOString();
          newTorrentsCount++;
        } else if (result.hasCamTS) {
          movie.status = 'cam_ts';
          movie.searchUrl = result.searchUrl;
          movie.source = result.source;
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

// Provera pojedinačnog filma (iz popup-a)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkMovie') {
    searchAllSources(request.title, request.year).then(sendResponse);
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

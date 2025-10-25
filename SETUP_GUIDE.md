# TorrentinoHunter - Detaljno uputstvo za postavljanje

## 1. Instalacija Chrome ekstenzije

### Korak 1: Priprema fajlova
Uverite se da imate sve potrebne fajlove u `TorrentinoHunter` folderu:
```
TorrentinoHunter/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── popup.css
├── movies.md
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Korak 2: Učitavanje ekstenzije u Chrome
1. Otvorite Google Chrome
2. U address bar-u unesite: `chrome://extensions/`
3. Uključite **Developer mode** prekidač (gornji desni ugao)
4. Kliknite na **Load unpacked** dugme
5. Navigirajte do `TorrentinoHunter` foldera i izaberite ga
6. Kliknite **Select Folder**

Ekstenzija bi sada trebalo da se pojavi u listi sa ikonicom i nazivom "TorrentinoHunter".

### Korak 3: Prikačite ekstenziju na toolbar
1. Kliknite na ikonu Extensions (puzzle piece) u Chrome toolbar-u
2. Pronađite TorrentinoHunter
3. Kliknite na pin ikonu da bi ekstenzija bila vidljiva na toolbar-u

## 2. Konfiguracija OMDb API (Opciono ali preporučeno)

OMDb API omogućava brže učitavanje podataka o filmovima. Bez njega, ekstenzija će scrapovati IMDB stranicu, što je sporije.

### Registracija za besplatni API ključ:
1. Idite na http://www.omdbapi.com/apikey.aspx
2. Izaberite **FREE** plan (1000 poziva dnevno)
3. Unesite svoj email i ime
4. Potvrdite email adresu (dobićete aktivacioni link)
5. Sačuvajte API ključ koji ste dobili

### Dodavanje API ključa u ekstenziju:
1. Otvorite `popup.js` fajl u text editoru
2. Pronađite liniju (red 3):
   ```javascript
   const OMDB_API_KEY = 'YOUR_API_KEY';
   ```
3. Zamenite `YOUR_API_KEY` sa vašim API ključem:
   ```javascript
   const OMDB_API_KEY = 'a1b2c3d4';
   ```
4. Sačuvajte fajl
5. Vratite se na `chrome://extensions/`
6. Kliknite na **Reload** dugme na TorrentinoHunter ekstenziji

## 3. Priprema liste filmova

### Metod A: Korišćenje movies.md fajla

1. Otvorite `movies.md` u bilo kom text editoru
2. Dodajte IMDB linkove u ovom formatu:
   ```markdown
   - https://www.imdb.com/title/tt0111161/
   - https://www.imdb.com/title/tt0468569/
   - https://www.imdb.com/title/tt0137523/
   ```
3. Sačuvajte fajl

**Kako pronaći IMDB link:**
1. Idite na https://www.imdb.com/
2. Pretražite film koji želite
3. Kopirajte URL sa stranice filma (npr. `https://www.imdb.com/title/tt0111161/`)

### Metod B: Dodavanje preko ekstenzije

1. Kliknite na TorrentinoHunter ikonu u toolbar-u
2. Unesite IMDB link u input polje
3. Kliknite **➕ Dodaj**

## 4. Prva upotreba

### Učitavanje filmova iz movies.md:
1. Otvorite TorrentinoHunter ekstenziju
2. Kliknite **📁 Učitaj MD**
3. Izaberite `movies.md` fajl
4. Sačekajte da se podaci o filmovima učitaju (može potrajati 30-60 sekundi za 10+ filmova)

### Prva provera torrenata:
1. Kliknite **🔄 Proveri sve** dugme
2. Sačekajte da se provera završi (nekoliko sekundi po filmu)
3. Pogledajte status za svaki film:
   - ✓ Pronađen (zeleno) - Postoji kvalitetan torrent
   - ⚠️ Samo CAM/TS (narandžasto) - Postoje samo loši snimci
   - ⏳ Čeka (sivo) - Nema torrenata

## 5. Automatske provere

Ekstenzija automatski proverava sve filmove jednom dnevno:

### Kako funkcioniše:
- Provera se pokreće automatski ~24h nakon instalacije
- Ne morate imati Chrome otvoren da bi se provera pokrenula
- Ako pronađe novi torrent, prikaže se notifikacija
- Badge (brojčić) na ikoni pokazuje koliko novih torrenata ima

### Provera da li automatske provere rade:
1. Idite na `chrome://extensions/`
2. Kliknite **Details** na TorrentinoHunter
3. Kliknite **Inspect views: service worker**
4. U konzoli ukucajte:
   ```javascript
   chrome.alarms.getAll(console.log)
   ```
5. Trebalo bi da vidite alarm sa imenom `dailyCheck`

## 6. Korišćenje ekstenzije

### Dodavanje novog filma:
1. Otvorite popup
2. Unesite IMDB link
3. Kliknite **➕ Dodaj**

### Provera jednog filma:
1. Otvorite popup
2. Kliknite 🔍 dugme pored filma

### Provera svih filmova:
1. Otvorite popup
2. Kliknite **🔄 Proveri sve**

### Otvaranje ThePirateBay rezultata:
1. Kada je film označen kao "Pronađen" ili "Samo CAM/TS"
2. Kliknite na link "🔗 Otvori na ThePirateBay" ispod filma

### Uklanjanje filma:
1. Kliknite 🗑️ dugme pored filma
2. Potvrdite brisanje

## 7. Česta pitanja

**Q: Zašto se neki filmovi ne učitavaju?**
A: Proverite da li je IMDB link ispravan. Link mora sadržati `tt` ID (npr. `tt0111161`).

**Q: Koliko često ekstenzija proverava torrente?**
A: Automatski jednom dnevno. Možete i ručno pokrenuti proveru bilo kada.

**Q: Da li mogu da koristim ekstenziju bez OMDb API ključa?**
A: Da, ali će učitavanje podataka o filmovima biti sporije.

**Q: Zašto ne pronalazi torrente koji postoje na ThePirateBay?**
A:
- Možda je promenjena struktura ThePirateBay sajta
- Možda naziv filma u torrenu ne odgovara IMDB nazivu
- Možda postoje samo CAM/TS verzije (koje ekstenzija ignoriše)

**Q: Mogu li da koristim drugi torrent sajt?**
A: Trenutno samo ThePirateBay10 je podržan. Za dodavanje drugih sajtova, potrebno je modifikovati `background.js`.

**Q: Da li ekstenzija automatski preuzima torrente?**
A: Ne, ekstenzija samo proverava dostupnost i otvara link. Preuzimanje morate sami.

**Q: Šta znači "Samo CAM/TS"?**
A: To znači da postoji torrent, ali je loš kvalitet (snimljen u bioskopu). Ekstenzija čeka na kvalitetan rip.

## 8. Troubleshooting

### Problem: Ekstenzija ne radi nakon instalacije
**Rešenje:**
1. Osvežite ekstenziju na `chrome://extensions/`
2. Proverite da li sve permisije imaju zelenu kvačicu
3. Pogledajte Console za greške (Inspect views → service worker)

### Problem: Filmovi se ne dodaju iz movies.md
**Rešenje:**
1. Proverite format fajla (jedan link po liniji sa `- ` prefiksom)
2. Proverite da li su linkovi ispravni
3. Proverite da li imate OMDb API ključ ili internet konekciju

### Problem: Badge ne pokazuje broj novih torrenata
**Rešenje:**
1. Otvorite popup jednom (to resetuje badge)
2. Sačekajte sledeću automatsku proveru
3. Proverite da li je alarm pravilno postavljen (videti Korak 5)

### Problem: ThePirateBay linkovi ne rade
**Rešenje:**
1. Proverite da li je ThePirateBay10.xyz dostupan u vašem browseru
2. Možda je blokiran od strane ISP-a, koristite VPN ili proxy
3. ThePirateBay često menja domene, možda treba ažurirati URL

## 9. Ažuriranje ekstenzije

Kada želite da ažurirate kod:

1. Napravite izmene u fajlovima
2. Sačuvajte fajlove
3. Idite na `chrome://extensions/`
4. Kliknite **Reload** na TorrentinoHunter ekstenziji

## 10. Sigurnosne napomene

- Ekstenzija NE šalje podatke nigde osim na IMDB/OMDb i ThePirateBay
- Svi podaci se čuvaju lokalno u Chrome storage
- Ekstenzija nema pristup drugim sajtovima osim onih u `host_permissions`
- Ekstenzija ne preuzima torrente automatski
- Koristite ekstenziju u skladu sa lokalnim zakonima

## 11. Napredne opcije

### Promena intervala automatske provere

Editujte `background.js`, red 4:
```javascript
const CHECK_INTERVAL = 24 * 60; // minuti (24h)
```

Na primer, za proveru svakih 12 sati:
```javascript
const CHECK_INTERVAL = 12 * 60; // minuti (12h)
```

### Prilagođavanje kvaliteta torrenta

Editujte `background.js`, funkcija `searchTorrent()`, oko reda 90-100:
```javascript
// Dodajte nove kvalitete
if (torrentName.includes('4k') || torrentName.includes('2160p')) {
  hasQualityTorrent = true;
  quality = '4K';
  break;
}
```

### Promena ThePirateBay domena

Ako ThePirateBay10 ne radi, promenite u `background.js` i `manifest.json`:

**background.js** (red ~72):
```javascript
const searchUrl = `https://thepiratebay.org/search.php?q=${searchQuery}`;
```

**manifest.json**:
```json
"host_permissions": [
  "https://thepiratebay.org/*",
  ...
]
```

---

Za dodatnu pomoć ili prijavljivanje bug-ova, napravite issue na GitHub repozitorijumu.

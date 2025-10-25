# TorrentinoHunter

Chrome ekstenzija za automatsko praćenje dostupnosti torrenata na ThePirateBay za filmove sa vaše IMDB liste.

## Karakteristike

- ✅ Automatska provera dostupnosti torrenata jednom dnevno
- ✅ Filtriranje po kvalitetu (BluRay/DVD/WEB rip, bez CAM/TS)
- ✅ Badge notifikacije na ikoni ekstenzije
- ✅ Manualna provera pojedinačnih filmova ili cele liste
- ✅ Direktni linkovi ka ThePirateBay rezultatima
- ✅ Učitavanje liste iz eksternog movies.md fajla

## Instalacija

1. **Preuzmite ili klonirajte projekat**
   ```bash
   git clone https://github.com/cukovicmilos/TorrentinoHunter.git
   cd TorrentinoHunter
   ```

2. **(Opciono) Konfigurišite OMDb API ključ**
   - Registrujte se na http://www.omdbapi.com/ (besplatno)
   - Kopirajte `config.example.js` u `config.js`:
     ```bash
     cp config.example.js config.js
     ```
   - Otvorite `config.js` i zamenite `YOUR_API_KEY_HERE` sa vašim ključem
   - Ovo omogućava brže učitavanje podataka o filmovima (bez ovoga koristi scraping)

3. **Otvorite Chrome Extensions stranicu**
   - Idite na `chrome://extensions/`
   - Uključite **Developer mode** (gornji desni ugao)

4. **Učitajte ekstenziju**
   - Kliknite na **Load unpacked**
   - Izaberite `TorrentinoHunter` folder

## Upotreba

### Dodavanje filmova

**Metod 1: Ručno dodavanje**
1. Kliknite na TorrentinoHunter ikonu u Chrome toolbar-u
2. Unesite IMDB link (npr. `https://www.imdb.com/title/tt0111161/`)
3. Kliknite **➕ Dodaj**

**Metod 2: Učitavanje iz fajla**
1. Editujte `movies.md` fajl i dodajte IMDB linkove:
   ```markdown
   - https://www.imdb.com/title/tt0111161/
   - https://www.imdb.com/title/tt0468569/
   ```
2. Kliknite na **📁 Učitaj MD** dugme
3. Izaberite `movies.md` fajl

### Provera torrenata

**Automatska provera**
- Ekstenzija automatski proverava sve filmove jednom dnevno
- Dobićete notifikaciju kada se pronađu novi torrenti
- Badge na ikoni pokazuje broj novih pronađenih torrenata

**Manualna provera**
- **Pojedinačan film**: Kliknite na 🔍 dugme pored filma
- **Svi filmovi**: Kliknite na **🔄 Proveri sve** dugme

### Status filmova

- **✓ Pronađen** (zeleno) - Pronađen kvalitetan torrent (BluRay/DVD/WEB)
- **⚠️ Samo CAM/TS** (narandžasto) - Pronađeni samo nekvalitetni snimci
- **⏳ Čeka** (sivo) - Još uvek se čeka na kvalitetan torrent

### Uklanjanje filmova

- Kliknite na 🗑️ dugme pored filma da ga uklonite iz liste

## Struktura projekta

```
TorrentinoHunter/
├── manifest.json          # Chrome ekstenzija manifest
├── background.js          # Background service worker (automatske provere)
├── popup.html            # Popup interfejs
├── popup.js              # Popup logika
├── popup.css             # Stilovi
├── config.example.js     # Template za konfiguraciju
├── config.js             # Lična konfiguracija (gitignored)
├── movies.md             # Lista IMDB linkova
├── .gitignore            # Git ignore fajl
├── icons/                # Ikonice ekstenzije
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # Dokumentacija
```

## Kako funkcioniše

1. **Dodavanje filmova**: IMDB linkovi se parsiraju i podaci o filmovima (naziv, godina, poster) se preuzimaju sa OMDb API ili direktno sa IMDB-a

2. **Pametno matchovanje**:
   - Proverava se **godina** filma (mora da se poklapa sa torrentom)
   - Za sequele (npr. "Zootopia 2") proverava se **broj ili rimski broj** u nazivu
   - Filtrira se po kvalitetu

3. **Automatska provera**: Background service worker se pokreće svakih 24h i pretražuje ThePirateBay za svaki film

4. **Filtriranje kvaliteta**:
   - Prihvataju se: BluRay, BRRip, WEB-DL, WEBRip, DVDRip
   - Odbijaju se: CAM, TS, HDCAM, HDTS, TeleSync

5. **Notifikacije**: Kada se pronađe novi kvalitetan torrent, badge se ažurira i prikazuje se notifikacija

## Napomene

- **OMDb API ključ**: Ekstenzija može da radi i bez OMDb API ključa, ali će biti sporija jer će scrapovati IMDB stranicu
- **ThePirateBay dostupnost**: Ekstenzija zavisi od dostupnosti ThePirateBay10 sajta
- **CORS**: Chrome ekstenzije nemaju CORS ograničenja, što omogućava fetch sa eksternih sajtova

## Troubleshooting

**Problem**: Filmovi se ne učitavaju
- Proverite da li ste uneli ispravan IMDB link (mora sadržati `tt` ID)
- Proverite konzolu za greške (Desni klik → Inspect → Console)

**Problem**: Provera ne radi
- Proverite da li je ThePirateBay10 dostupan u vašem browseru
- Možda je promenjena struktura HTML-a sajta, potrebno je ažurirati scraper

**Problem**: Badge se ne ažurira
- Proverite Background service worker u `chrome://extensions/` (detalji ekstenzije)
- Proverite da li su alarmi pravilno postavljeni

## Buduća unapređenja

- [ ] Podrška za više torrent sajtova
- [ ] Izvoz/import liste filmova
- [ ] Filtriranje po veličini fajla i broju seedera
- [ ] Dark mode
- [ ] Sync između uređaja (Chrome Sync API)

## Licenca

MIT License

## Autor

Vaše ime

---

**Napomena**: Ova ekstenzija je namenjena isključivo za edukativne svrhe. Poštujte autorska prava i lokalne zakone.

# TorrentinoHunter

Chrome ekstenzija za automatsko praćenje dostupnosti torrenata za filmove sa vaše IMDB liste.

## Karakteristike

- ✅ **Dva načina unosa**: IMDB link ili direktan naziv filma
- ✅ **Višestruki izvori**: ThePirateBay i 1337x (automatsko pretraživanje svih izvora)
- ✅ Automatska provera dostupnosti torrenata jednom dnevno
- ✅ Napredna normalizacija naslova (apostrofi, tačke, specijalni znaci)
- ✅ Precizno filtriranje po kvalitetu (BluRay/DVD/WEB rip, bez CAM/TS/TC)
- ✅ Badge notifikacije sa prikazom izvora torrenta
- ✅ Manualna provera pojedinačnih filmova ili cele liste
- ✅ Direktni linkovi ka rezultatima pretrage
- ✅ Učitavanje liste iz eksternog movies.md fajla
- ✅ IMDB scraping (bez potrebe za API ključem)

## Instalacija

1. **Preuzmite ili klonirajte projekat**
   ```bash
   git clone https://github.com/cukovicmilos/TorrentinoHunter.git
   cd TorrentinoHunter
   ```

2. **Otvorite Chrome Extensions stranicu**
   - Idite na `chrome://extensions/`
   - Uključite **Developer mode** (gornji desni ugao)

3. **Učitajte ekstenziju**
   - Kliknite na **Load unpacked**
   - Izaberite `TorrentinoHunter` folder

## Upotreba

### Dodavanje filmova

**Metod 1: IMDB link**
1. Kliknite na TorrentinoHunter ikonu u Chrome toolbar-u
2. Unesite IMDB link u prvo polje (npr. `https://www.imdb.com/title/tt0111161/`)
3. Kliknite **➕ Dodaj**
4. Ekstenzija će automatski preuzeti podatke o filmu (naziv, godina, poster) sa IMDB-a

**Metod 2: Direktan naziv filma**
1. Kliknite na TorrentinoHunter ikonu
2. Unesite naziv filma u drugo polje (npr. `Inception`)
3. Kliknite **➕ Dodaj**
4. Pretraga će se vršiti direktno po unetom nazivu

**Metod 3: Učitavanje iz fajla**
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

- **✓ Pronađen (BluRay/WEB/DVD) TPB** (zeleno) - Pronađen kvalitetan torrent sa prikazom izvora
- **⚠️ Samo CAM/TS** (narandžasto) - Pronađeni samo nekvalitetni snimci
- **⏳ Čeka** (sivo) - Još uvek se čeka na kvalitetan torrent
- **Direktna pretraga** (ljubičasto) - Film dodat bez IMDB linka

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
├── sources/              # Modularni torrent scrapers
│   ├── sourceManager.js  # Koordinacija izvora
│   ├── tpb.js            # ThePirateBay scraper
│   ├── 1337x.js          # 1337x scraper
│   ├── movieData.js      # IMDB scraping
│   └── utils.js          # Deljene funkcije (normalizacija, quality detection)
├── movies.md             # Lista IMDB linkova
├── .gitignore            # Git ignore fajl
├── icons/                # Ikonice ekstenzije
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # Dokumentacija
```

## Kako funkcioniše

1. **Dodavanje filmova**:
   - **IMDB link**: Parsira se IMDB ID i podaci (naziv, godina, poster) se preuzimaju scraping-om IMDB stranice
   - **Direktan unos**: Koristi se unet naziv za direktnu pretragu

2. **Normalizacija naslova** (sources/utils.js):
   - Apostrofi: `It's What's Inside` → `its whats inside`
   - Tačke: `Its.Whats.Inside` → `its whats inside`
   - Specijalni znaci: uklanjaju se zarezi, crtice, dvotačke

3. **Pametno matchovanje**:
   - Proverava se **godina** filma (mora da se poklapa sa torrentom)
   - Za sequele (npr. "Zootopia 2") proverava se **broj ili rimski broj** u nazivu
   - Normalizovani naziv se poredi sa normalizovanim nazivom torrenta

4. **Višestruki izvori** (sources/sourceManager.js):
   - **Sekvencijalna pretraga**: Prvo ThePirateBay, zatim 1337x
   - **Smart search**: Pretraga se nastavlja dok se ne pronađe kvalitetan torrent
   - **Fallback**: Ako je pronađen samo CAM/TS, nastavlja se sa ostalim izvorima

5. **Automatska provera**: Background service worker se pokreće svakih 24h i pretražuje sve izvore za svaki film

6. **Filtriranje kvaliteta** (sources/utils.js):
   - **Prihvataju se**: BluRay, BRRip, WEB-DL, WEBRip, DVDRip, HDRip, 1080p, 720p
   - **Odbijaju se**: CAM, HDCAM, TC, TS, HDTS, HD-TS, TeleSync, TeleCine, R5, Screener
   - **Word boundary**: "ts" u "whats" se ne detektuje kao TeleSync

7. **Notifikacije**: Kada se pronađe novi kvalitetan torrent, badge se ažurira i prikazuje se notifikacija

## Napomene

- **IMDB scraping**: Ekstenzija scrape-uje IMDB stranicu direktno, bez potrebe za API ključem
- **Torrent sajtovi**: Ekstenzija zavisi od dostupnosti ThePirateBay10 i 1377x sajtova
- **CORS**: Chrome ekstenzije nemaju CORS ograničenja, što omogućava fetch sa eksternih sajtova
- **Modularna arhitektura**: Lako se dodaju novi izvori torrenta u `sources/` folder

## Troubleshooting

**Problem**: Filmovi se ne učitavaju
- Proverite da li ste uneli ispravan IMDB link (mora sadržati `tt` ID)
- Proverite konzolu za greške (Desni klik → Inspect → Console)

**Problem**: Provera ne radi
- Proverite da li su ThePirateBay10 i 1377x dostupni u vašem browseru
- Proverite konzolu za greške - ekstenzija će pokušati sve izvore sekvencijalno
- Možda je promenjena struktura HTML-a sajta, potrebno je ažurirati scraper u `sources/` folderu

**Problem**: Badge se ne ažurira
- Proverite Background service worker u `chrome://extensions/` (detalji ekstenzije)
- Proverite da li su alarmi pravilno postavljeni

## Changelog

### v1.3.0 (Decembar 2024)
- ✅ Dodato polje za direktan unos naziva filma (bez IMDB linka)
- ✅ Dodati izvori: ThePirateBay i 1337x
- ✅ Modularna arhitektura (`sources/` folder)
- ✅ Poboljšana normalizacija (apostrofi, tačke, specijalni znaci)
- ✅ Bolja CAM/TS detekcija sa word boundary
- ✅ UI badge prikazuje izvor torrenta
- ✅ Dodatni formati: TC, HDRip, 1080p/720p fallback

### v1.2.0
- Prebačeno sa OMDb API na IMDB scraping

### v1.1.0
- Inicijalna verzija sa ThePirateBay podrškom

## Buduća unapređenja

- [ ] Dodatni torrent sajtovi (RARBG, YTS, itd.)
- [ ] Izvoz/import liste filmova
- [ ] Filtriranje po veličini fajla i broju seedera
- [ ] Dark mode
- [ ] Sync između uređaja (Chrome Sync API)
- [ ] Settings UI za uključivanje/isključivanje izvora

## Licenca

MIT License

## Autor

cukovicmilos

---

**Napomena**: Ova ekstenzija je namenjena isključivo za edukativne svrhe. Poštujte autorska prava i lokalne zakone.

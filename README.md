# Veladzic • Ziele

Mehrere Countdowns mit elegantem Design und einfachem Admin‑Bereich. Docker‑fähig, keine externe Datenbank erforderlich.

## Funktionen

- Mehrere Countdowns mit Titel, Beschreibung, Emoji und Akzentfarbe
- Ansprechende, responsive Oberfläche mit Live‑Timer
- Admin‑Bereich zum Hinzufügen, Bearbeiten und Löschen von Countdowns
- Optionaler Schutz per `ADMIN_TOKEN`
  - Persistente Anmeldung via httpOnly‑Cookie (Standard 365 Tage)
- Keine Datenbank — JSON‑Datei wird auf einem Volume gespeichert
- Dockerfile und docker‑compose für schnellen Start

## Schnellstart (Docker Compose)

1. Optional: In `docker-compose.yml` `ADMIN_TOKEN` auskommentieren und einen Wert setzen.
2. Im Projektordner ausführen:

```
docker compose up -d --build
```

3. Öffnen: `http://localhost:8080` (Startseite) und `http://localhost:8080/admin` (Admin).

Die Daten liegen in `./data/countdowns.json` und bleiben über Neustarts hinweg erhalten.

## Umgebungsvariablen

- `PORT` (Standard: `3000`) — interner Server‑Port
- `ADMIN_TOKEN` — aktiviert Cookie‑basierte Anmeldung für `/admin`
  - Sitzungsspeicherung: `ADMIN_COOKIE_DAYS` (Standard 365)

## Projektstruktur

- `server.js` — Express‑App mit EJS‑Views
- `views/` — EJS‑Templates (Start, Admin, Login, Bearbeiten)
- `public/` — Statische Assets (CSS, JS)
- `data/countdowns.json` — JSON‑Speicher (wird automatisch erstellt)
- `Dockerfile`, `docker-compose.yml` — Docker‑Setup

## Lokal ohne Docker

Benötigt Node 18+.

```
npm install
npm start
# http://localhost:3000
```

## Hinweise

- Ohne `ADMIN_TOKEN` kann jeder mit Zugriff im Admin‑Bereich Änderungen vornehmen.
- Datum/Uhrzeit werden aus den Formularfeldern übernommen und als ISO‑String gespeichert.


# 📰 HA News Card (Morgenbriefing)

Jeden Morgen die wichtigsten nationalen und regionalen News auf dem
Home-Assistant-Dashboard – mit **mitgelieferten Standard-Feeds** (Presets
inkl. Google News), **automatischer Regional-Erkennung** aus dem HA-Standort
oder GPS, **Google-News-Suchfeeds** für beliebige Orte/Begriffe, **eigenen
RSS-Links** und Unterstützung für **vorhandene Feed-Sensoren**, falls RSS in
Home Assistant schon genutzt wird.

## Fünf Wege, eine Quelle einzubinden

Jeder Abschnitt (`sections`) der Karte bekommt seine News auf einem von fünf Wegen:

```yaml
type: custom:morgenbriefing-card
title: Morgenbriefing
max_items: 5
sections:
  - preset: tagesschau            # 1. Standard-Feed, mitgeliefert
  - region: auto                  # 2. Bundesland automatisch aus dem
                                  #    HA-Standort – siehe unten
  - title: Lokales                # 3. Google-News-Suche zu Ort/Begriff
    google: "Münster"             #    (ideal für Lokalnachrichten)
  - title: Tech                   # 4. Eigener RSS/Atom-Link
    url: https://www.heise.de/rss/heise-atom.xml
  - title: Wirtschaft             # 5. Vorhandener Sensor (z. B. Feedparser),
    entity: sensor.mein_feed      #    wenn RSS in HA schon läuft
```

## Automatische Region (`region:`)

`region: auto` bestimmt das Bundesland aus dem **Standort der
Home-Assistant-Instanz** (Einstellungen → System → Allgemein) und wählt
automatisch den passenden Regional-Feed – ARD-Preset, wo vorhanden, sonst
den Google-News-Suchfeed zum Bundesland. Die Zuordnung passiert komplett
lokal in der Karte; es werden keine Standortdaten an Dritte geschickt.

```yaml
- region: auto                # Bundesland aus dem HA-Standort
- region: auto
  tracker: person.rene        # …oder der GPS-Position einer Person folgen
- region: bayern              # …oder fest setzen (überschreibt die Automatik)
```

- **GPS-Modus:** Mit `tracker:` folgt die Region der Person – im Urlaub in
  München zeigt die Karte bayerische News. Liefert der Tracker gerade keine
  Koordinaten, greift der HA-Standort als Fallback.
- **Ändern jederzeit möglich:** Fester Bundesland-Key (`region: bayern`,
  `region: nordrhein_westfalen`, `region: thueringen`, …), ein regionales
  `preset:`, eine `google:`-Suche oder ein eigener Sensor – die Automatik
  ist nur der Standard, nie ein Zwang.
- Die Zuordnung arbeitet mit Städte-Stützpunkten und ist an Landesgrenzen
  bewusst grob – wer direkt an einer Grenze wohnt, setzt die Region fest.

## Installation

### Über HACS (empfohlen)

1. HACS → ⋮ → **Benutzerdefinierte Repositories**
2. Repository `https://github.com/renespeaker/ha-news-card`, Typ **Dashboard**
3. „HA News Card (Morgenbriefing)" installieren – HACS registriert die
   Ressource automatisch.

### Manuell

`dist/morgenbriefing-card.js` nach `/config/www/` kopieren, dann:
Einstellungen → Dashboards → ⋮ → **Ressourcen** → Hinzufügen →
URL `/local/morgenbriefing-card.js`, Typ **JavaScript-Modul**. Browser-Cache
leeren (Strg+F5).

## Presets (mitgelieferte Standard-Feeds)

| Preset | Feed |
|---|---|
| `tagesschau` | tagesschau.de – Topmeldungen |
| `tagesschau_inland` | tagesschau.de – Inland |
| `sportschau` | sportschau.de |
| `heise` | heise online |
| `spiegel` | SPIEGEL Schlagzeilen |
| `ntv` | n-tv |
| `google_news` | Google News – Topmeldungen Deutschland |
| `google_news_welt` | Google News – Welt |
| `google_news_wirtschaft` | Google News – Wirtschaft |
| `google_news_tech` | Google News – Technik |
| `wdr` | NRW (WDR) |
| `ndr_niedersachsen` / `ndr_sh` / `ndr_hamburg` / `ndr_mv` | NDR-Regionalfeeds |
| `hessenschau` | Hessen |
| `mdr` | Sachsen / Sachsen-Anhalt / Thüringen |
| `rbb24` | Berlin / Brandenburg |

**Google News:** Neben den Presets baut `google: "Begriff"` automatisch einen
Google-News-Suchfeed (deutschsprachig, Region DE) – praktisch für
Lokalnachrichten zum eigenen Ort oder Themen wie einen Vereinsnamen.
Google-News-Links führen über news.google.com zum Artikel, Titel enthalten
den Quellennamen.

**Wie die Karte eine Preset-Quelle auflöst:** Existiert der Sensor
`sensor.mb_<preset>` (aus dem Beispiel-Package), wird er benutzt –
zuverlässigster Weg, weil Home Assistant den Feed serverseitig lädt. Sonst
versucht die Karte den direkten Abruf im Browser (15-Minuten-Cache).
Blockiert die News-Seite das per CORS, zeigt die Karte einen Hinweis, für
diesen Feed einen Sensor anzulegen. Gleiches gilt für `url:`- und
`google:`-Einträge.

## Standard-Sensoren anlegen (empfohlen)

Damit alle Feeds zuverlässig serverseitig geladen werden:

1. HACS-Integration **feedparser** installieren (`custom-components/feedparser`),
   Home Assistant neu starten.
2. [`examples/packages/morgenbriefing.yaml`](examples/packages/morgenbriefing.yaml)
   nach `/config/packages/` kopieren und Packages aktivieren:
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```
3. Im Package den passenden Regional-Block einkommentieren, eigene Feeds
   ergänzen, Home Assistant neu starten.

**Schon Feedparser/RSS-Sensoren im Einsatz?** Dann entfällt dieser Schritt –
vorhandene Sensoren per `entity:` einbinden (erwartet wird ein
`entries`-Attribut mit `title`, `link`, `published`).

## Karten-Optionen

| Option | Standard | Beschreibung |
|---|---|---|
| `title` | `Morgenbriefing` | Kartentitel |
| `max_items` | `5` | Meldungen pro Abschnitt (global oder je Abschnitt) |
| `show_time` | `true` | Zeitstempel anzeigen |
| `region` (je Abschnitt) | – | `auto` (HA-Standort/GPS) oder fester Bundesland-Key |
| `tracker` (je Abschnitt) | – | Person/Device-Tracker als GPS-Quelle für `region: auto` |

## Morgen-Automation (optional)

[`examples/automation.yaml`](examples/automation.yaml) aktualisiert um
06:00 Uhr die Sensoren und schickt die Top-3-Schlagzeilen als Push aufs
Handy (`notify.mobile_app_…` anpassen).

## Weitere Beispiele

- [`examples/dashboard-card.yaml`](examples/dashboard-card.yaml) – Karten-Konfiguration
- [`examples/dashboard-card-markdown.yaml`](examples/dashboard-card-markdown.yaml) – Fallback ohne Custom Card

## Hinweise

- **Feed-URLs prüfen:** Jede URL einmal im Browser öffnen – es muss XML/RSS
  erscheinen. Sender ändern URLs gelegentlich.
- **Fair bleiben:** `scan_interval` von 30 Minuten reicht – die
  Morgen-Automation lädt um 6 Uhr ohnehin frisch.

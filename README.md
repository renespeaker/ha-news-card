# 📰 HA News Card (Morgenbriefing)

Jeden Morgen die wichtigsten nationalen und regionalen News auf dem
Home-Assistant-Dashboard – mit **mitgelieferten Standard-Feeds** (Presets
inkl. Google News), **Google-News-Suchfeeds** für beliebige Orte/Begriffe,
**eigenen RSS-Links** und Unterstützung für **vorhandene Feed-Sensoren**,
falls RSS in Home Assistant schon genutzt wird.

## Vier Wege, eine Quelle einzubinden

Jeder Abschnitt (`sections`) der Karte bekommt seine News auf einem von vier Wegen:

```yaml
type: custom:morgenbriefing-card
title: Morgenbriefing
max_items: 5
sections:
  - preset: tagesschau            # 1. Standard-Feed, mitgeliefert
  - preset: wdr                   #    …auch regional
    title: Meine Region
  - title: Lokales                # 2. Google-News-Suche zu Ort/Begriff
    google: "Münster"             #    (ideal für Lokalnachrichten)
  - title: Tech                   # 3. Eigener RSS/Atom-Link
    url: https://www.heise.de/rss/heise-atom.xml
  - title: Wirtschaft             # 4. Vorhandener Sensor (z. B. Feedparser),
    entity: sensor.mein_feed      #    wenn RSS in HA schon läuft
```

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

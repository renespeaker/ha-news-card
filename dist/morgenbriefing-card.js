/**
 * Morgenbriefing Card – News-Karte für Home Assistant
 *
 * Fünf Wege, eine Quelle einzubinden (pro Abschnitt in `sections`):
 *   1. preset: tagesschau        – mitgelieferter Standard-Feed (auch Google News)
 *   2. url: https://…/feed.xml   – eigener RSS/Atom-Link (direkter Abruf im Browser)
 *   3. entity: sensor.mein_feed  – vorhandener Sensor (z. B. Feedparser) mit
 *                                  einem `entries`-Attribut
 *   4. google: "Suchbegriff"     – Google-News-Suchfeed, z. B. der eigene Ort
 *                                  für Lokalnachrichten (google: "Münster")
 *   5. region: auto              – Bundesland automatisch aus dem HA-Standort
 *                                  bestimmen und den passenden Regional-Feed
 *                                  wählen. Mit tracker: person.xyz folgt die
 *                                  Region der GPS-Position dieser Person.
 *                                  Fest überschreibbar: region: bayern usw.
 *
 * Bei Presets gilt die Reihenfolge: existiert der Sensor `sensor.mb_<preset>`
 * (aus examples/packages/morgenbriefing.yaml), wird er benutzt – sonst versucht die
 * Karte den direkten Abruf der Feed-URL. Schlägt der am CORS-Schutz der
 * News-Seite fehl, zeigt die Karte einen Hinweis auf den Sensor-Weg.
 *
 * Beispiel-Konfiguration: siehe examples/dashboard-card.yaml.
 */
(function () {
  "use strict";

  const PRESETS = {
    // National / überregional
    tagesschau:        { title: "Deutschland · Tagesschau",  url: "https://www.tagesschau.de/index~rss2.xml" },
    tagesschau_inland: { title: "Inland · Tagesschau",       url: "https://www.tagesschau.de/inland/index~rss2.xml" },
    sportschau:        { title: "Sport · Sportschau",        url: "https://www.sportschau.de/index~rss2.xml" },
    heise:             { title: "Tech · heise online",       url: "https://www.heise.de/rss/heise-atom.xml" },
    spiegel:           { title: "SPIEGEL Schlagzeilen",      url: "https://www.spiegel.de/schlagzeilen/tops/index.rss" },
    ntv:               { title: "n-tv",                      url: "https://www.n-tv.de/rss" },
    // Google News (Deutschland, deutschsprachig)
    google_news:            { title: "Google News · Topmeldungen", url: "https://news.google.com/rss?hl=de&gl=DE&ceid=DE:de" },
    google_news_welt:       { title: "Google News · Welt",         url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=de&gl=DE&ceid=DE:de" },
    google_news_wirtschaft: { title: "Google News · Wirtschaft",   url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=de&gl=DE&ceid=DE:de" },
    google_news_tech:       { title: "Google News · Technik",      url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=de&gl=DE&ceid=DE:de" },
    // Regional (ARD-Anstalten)
    wdr:               { title: "NRW · WDR",                        url: "https://www1.wdr.de/uebersicht-100.feed" },
    ndr_niedersachsen: { title: "Niedersachsen · NDR",              url: "https://www.ndr.de/nachrichten/niedersachsen/index-rss.xml" },
    ndr_sh:            { title: "Schleswig-Holstein · NDR",         url: "https://www.ndr.de/nachrichten/schleswig-holstein/index-rss.xml" },
    ndr_hamburg:       { title: "Hamburg · NDR",                    url: "https://www.ndr.de/nachrichten/hamburg/index-rss.xml" },
    ndr_mv:            { title: "Mecklenburg-Vorpommern · NDR",     url: "https://www.ndr.de/nachrichten/mecklenburg-vorpommern/index-rss.xml" },
    hessenschau:       { title: "Hessen · hessenschau",             url: "https://www.hessenschau.de/index.rss" },
    mdr:               { title: "Mitteldeutschland · MDR",          url: "https://www.mdr.de/nachrichten/index-rss.xml" },
    rbb24:             { title: "Berlin/Brandenburg · rbb24",       url: "https://www.rbb24.de/aktuell/index.xml/feed=rss.xml" },
  };

  // google: "Suchbegriff" -> Google-News-Suchfeed (Deutschland, deutschsprachig)
  function googleSearchUrl(term) {
    return `https://news.google.com/rss/search?q=${encodeURIComponent(term)}&hl=de&gl=DE&ceid=DE:de`;
  }

  // region: -> Bundesland-Feed. Hat ein Land keinen stabilen ARD-Feed als
  // Preset, dient der Google-News-Suchfeed zum Bundesland als Quelle.
  const REGIONS = {
    schleswig_holstein:     { name: "Schleswig-Holstein",     preset: "ndr_sh" },
    hamburg:                { name: "Hamburg",                preset: "ndr_hamburg" },
    niedersachsen:          { name: "Niedersachsen",          preset: "ndr_niedersachsen" },
    bremen:                 { name: "Bremen",                 google: "Bremen" },
    mecklenburg_vorpommern: { name: "Mecklenburg-Vorpommern", preset: "ndr_mv" },
    brandenburg:            { name: "Brandenburg",            preset: "rbb24" },
    berlin:                 { name: "Berlin",                 preset: "rbb24" },
    sachsen_anhalt:         { name: "Sachsen-Anhalt",         preset: "mdr" },
    sachsen:                { name: "Sachsen",                preset: "mdr" },
    thueringen:             { name: "Thüringen",              preset: "mdr" },
    nordrhein_westfalen:    { name: "Nordrhein-Westfalen",    preset: "wdr" },
    hessen:                 { name: "Hessen",                 preset: "hessenschau" },
    rheinland_pfalz:        { name: "Rheinland-Pfalz",        google: "Rheinland-Pfalz" },
    saarland:               { name: "Saarland",               google: "Saarland" },
    baden_wuerttemberg:     { name: "Baden-Württemberg",      google: "Baden-Württemberg" },
    bayern:                 { name: "Bayern",                 google: "Bayern" },
  };

  // Stützpunkte (Städte/Landesteile) für die Nächster-Punkt-Zuordnung von
  // Koordinaten zu Bundesländern. Grob, aber für die Feed-Wahl ausreichend –
  // an Landesgrenzen im Zweifel region: <key> fest setzen.
  const REGION_POINTS = [
    [54.32, 10.13, "schleswig_holstein"], [53.87, 10.69, "schleswig_holstein"], [54.78, 9.44, "schleswig_holstein"],
    [53.55, 9.99, "hamburg"],
    [52.37, 9.73, "niedersachsen"], [53.14, 8.21, "niedersachsen"], [53.25, 10.41, "niedersachsen"],
    [52.27, 10.52, "niedersachsen"], [52.28, 8.05, "niedersachsen"], [53.53, 7.10, "niedersachsen"],
    [53.52, 8.11, "niedersachsen"], [53.87, 8.70, "niedersachsen"],
    [53.08, 8.80, "bremen"], [53.55, 8.58, "bremen"],
    [53.63, 11.41, "mecklenburg_vorpommern"], [54.09, 12.14, "mecklenburg_vorpommern"],
    [53.56, 13.26, "mecklenburg_vorpommern"], [54.31, 13.09, "mecklenburg_vorpommern"],
    [52.40, 13.06, "brandenburg"], [51.75, 14.33, "brandenburg"], [52.85, 13.80, "brandenburg"],
    [52.52, 13.40, "berlin"],
    [52.13, 11.62, "sachsen_anhalt"], [51.48, 11.97, "sachsen_anhalt"],
    [51.34, 12.37, "sachsen"], [51.05, 13.74, "sachsen"], [50.83, 12.92, "sachsen"], [51.16, 14.99, "sachsen"],
    [50.98, 11.03, "thueringen"], [50.93, 11.59, "thueringen"], [50.52, 10.42, "thueringen"],
    [50.94, 6.96, "nordrhein_westfalen"], [51.45, 7.01, "nordrhein_westfalen"], [51.51, 7.47, "nordrhein_westfalen"],
    [51.96, 7.63, "nordrhein_westfalen"], [52.03, 8.53, "nordrhein_westfalen"], [50.73, 7.10, "nordrhein_westfalen"],
    [50.11, 8.68, "hessen"], [51.31, 9.50, "hessen"], [50.58, 8.68, "hessen"], [49.87, 8.65, "hessen"],
    [50.55, 9.67, "hessen"],
    [50.00, 8.27, "rheinland_pfalz"], [49.75, 6.64, "rheinland_pfalz"], [50.35, 7.60, "rheinland_pfalz"],
    [49.44, 7.77, "rheinland_pfalz"], [49.32, 8.43, "rheinland_pfalz"], [49.48, 8.43, "rheinland_pfalz"],
    [49.23, 7.00, "saarland"], [49.47, 6.65, "saarland"],
    [48.78, 9.18, "baden_wuerttemberg"], [47.99, 7.85, "baden_wuerttemberg"], [49.49, 8.47, "baden_wuerttemberg"],
    [47.66, 9.18, "baden_wuerttemberg"], [49.01, 8.40, "baden_wuerttemberg"], [48.40, 9.99, "baden_wuerttemberg"],
    [48.14, 11.58, "bayern"], [49.45, 11.08, "bayern"], [49.79, 9.94, "bayern"], [48.37, 10.90, "bayern"],
    [49.02, 12.10, "bayern"], [50.32, 11.92, "bayern"], [47.57, 10.70, "bayern"], [48.57, 13.45, "bayern"],
  ];

  function nearestRegionKey(lat, lon) {
    let best = null;
    let bestDist = Infinity;
    for (const [pLat, pLon, key] of REGION_POINTS) {
      const dLat = lat - pLat;
      const dLon = (lon - pLon) * 0.63; // Längengrad-Stauchung auf Höhe Deutschlands
      const dist = dLat * dLat + dLon * dLon;
      if (dist < bestDist) { bestDist = dist; best = key; }
    }
    return best;
  }

  const FETCH_TTL_MS = 15 * 60 * 1000;
  // URL -> { ts, items, error, pending } – geteilt über alle Karten-Instanzen
  const feedCache = new Map();

  function parseFeed(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("Antwort ist kein gültiges XML");
    const items = [];
    // RSS 2.0
    doc.querySelectorAll("item").forEach((item) => {
      items.push({
        title: (item.querySelector("title") || {}).textContent || "",
        link: (item.querySelector("link") || {}).textContent || "",
        date: (item.querySelector("pubDate") || {}).textContent || "",
      });
    });
    // Atom
    if (!items.length) {
      doc.querySelectorAll("entry").forEach((entry) => {
        const linkEl = entry.querySelector('link[rel="alternate"]') || entry.querySelector("link");
        items.push({
          title: (entry.querySelector("title") || {}).textContent || "",
          link: linkEl ? linkEl.getAttribute("href") : "",
          date: (entry.querySelector("updated") || entry.querySelector("published") || {}).textContent || "",
        });
      });
    }
    return items.map((i) => ({ ...i, title: i.title.trim(), link: i.link.trim() }));
  }

  function formatTime(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return String(dateStr); // Feedparser liefert bereits formatierte Strings
    const today = new Date().toDateString() === d.toDateString();
    return today
      ? d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  }

  class MorgenbriefingCard extends HTMLElement {
    static getStubConfig() {
      return { sections: [{ preset: "tagesschau" }] };
    }

    setConfig(config) {
      if (!Array.isArray(config.sections) || !config.sections.length) {
        throw new Error('Bitte "sections" angeben – jeder Abschnitt braucht preset, url, entity, google oder region.');
      }
      config.sections.forEach((s, i) => {
        if (s.preset && !PRESETS[s.preset]) {
          throw new Error(`Unbekanntes Preset "${s.preset}" (Abschnitt ${i + 1}). Verfügbar: ${Object.keys(PRESETS).join(", ")}`);
        }
        if (s.region && s.region !== "auto" && !REGIONS[String(s.region).toLowerCase()]) {
          throw new Error(`Unbekannte Region "${s.region}" (Abschnitt ${i + 1}). Verfügbar: auto, ${Object.keys(REGIONS).join(", ")}`);
        }
        if (!s.preset && !s.url && !s.entity && !s.google && !s.region) {
          throw new Error(`Abschnitt ${i + 1} braucht preset, url, entity, google oder region.`);
        }
      });
      this._config = config;
      this._renderKey = null;
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      // Nur neu rendern, wenn sich eine beteiligte Entität geändert hat
      const key = this._entityIds()
        .map((id) => (hass.states[id] ? hass.states[id].last_updated : "?"))
        .join("|");
      if (key !== this._renderKey) {
        this._renderKey = key;
        this._render();
      }
    }

    getCardSize() {
      const max = this._config ? this._config.max_items || 5 : 5;
      return 1 + (this._config ? this._config.sections.length : 1) * Math.min(max, 5) * 0.5;
    }

    _entityIds() {
      if (!this._config) return [];
      const ids = [];
      for (const s of this._config.sections) {
        if (s.entity) ids.push(s.entity);
        if (s.preset) ids.push(`sensor.mb_${s.preset}`);
        if (s.tracker) ids.push(s.tracker);
        if (s.region && this._hass) {
          const r = this._resolveRegion(s);
          if (r.region && r.region.preset) ids.push(`sensor.mb_${r.region.preset}`);
        }
      }
      return ids;
    }

    // region: auto -> Koordinaten (Tracker oder HA-Standort) -> Bundesland;
    // region: <key> -> festes Bundesland
    _resolveRegion(section) {
      const key = String(section.region).toLowerCase();
      if (key !== "auto") {
        return { region: REGIONS[key] };
      }
      let lat, lon;
      if (section.tracker) {
        const st = this._hass && this._hass.states[section.tracker];
        if (!st) return { error: `Tracker ${section.tracker} nicht gefunden.` };
        lat = st.attributes.latitude;
        lon = st.attributes.longitude;
      }
      if ((lat == null || lon == null) && this._hass && this._hass.config) {
        // Fallback: Standort der Home-Assistant-Instanz
        lat = this._hass.config.latitude;
        lon = this._hass.config.longitude;
      }
      if (lat == null || lon == null) {
        return { error: "Kein Standort verfügbar – HA-Standort setzen oder tracker: angeben." };
      }
      return { region: REGIONS[nearestRegionKey(lat, lon)] };
    }

    _sectionData(section) {
      // 0. Region (Bundesland) automatisch oder fest -> auf preset/google abbilden
      if (section.region) {
        const resolved = this._resolveRegion(section);
        if (resolved.error) return { title: section.title || "Meine Region", error: resolved.error };
        const region = resolved.region;
        const mapped = { ...section, region: undefined, tracker: undefined,
          title: section.title || `Meine Region · ${region.name}` };
        if (region.preset) mapped.preset = region.preset;
        else mapped.google = region.google;
        return this._sectionData(mapped);
      }

      const preset = section.preset ? PRESETS[section.preset] : null;
      const title = section.title
        || (preset && preset.title)
        || (section.google && `Google News · ${section.google}`)
        || section.entity || "News";
      const maxItems = section.max_items || (this._config.max_items || 5);

      // 1. Explizit angegebener oder per Preset-Konvention gefundener Sensor
      let entityId = section.entity;
      if (!entityId && section.preset && this._hass && this._hass.states[`sensor.mb_${section.preset}`]) {
        entityId = `sensor.mb_${section.preset}`;
      }
      if (entityId) {
        const st = this._hass && this._hass.states[entityId];
        if (!st) return { title, error: `Entität ${entityId} nicht gefunden.` };
        const entries = st.attributes.entries;
        if (!Array.isArray(entries)) {
          return { title, error: `${entityId} hat kein "entries"-Attribut (Feedparser-Sensor erwartet).` };
        }
        return {
          title,
          items: entries.slice(0, maxItems).map((e) => ({
            title: e.title, link: e.link, date: e.published || e.updated || "",
          })),
        };
      }

      // 2. Direkter Abruf einer URL (eigener Link, Google-Suchfeed oder Preset-Feed)
      const url = section.url
        || (section.google && googleSearchUrl(section.google))
        || (preset && preset.url);
      if (!url) return { title, error: "Keine Quelle angegeben (preset, url, entity, google oder region)." };

      const cached = feedCache.get(url);
      if (cached && Date.now() - cached.ts < FETCH_TTL_MS) {
        if (cached.error) return { title, error: cached.error };
        return { title, items: (cached.items || []).slice(0, maxItems) };
      }
      if (!cached || !cached.pending) {
        feedCache.set(url, { ts: Date.now(), pending: true, items: cached && cached.items });
        fetch(url, { mode: "cors" })
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
          })
          .then((text) => feedCache.set(url, { ts: Date.now(), items: parseFeed(text) }))
          .catch(() => {
            feedCache.set(url, {
              ts: Date.now(),
              error: "Direkter Abruf blockiert (CORS). Lege für diesen Feed einen Feedparser-Sensor an " +
                     "und binde ihn per entity: ein – siehe README.",
            });
          })
          .finally(() => this._render());
      }
      if (cached && cached.items) return { title, items: cached.items.slice(0, maxItems) };
      return { title, loading: true };
    }

    _render() {
      if (!this._config) return;
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });

      const showTime = this._config.show_time !== false;
      const headerTitle = this._config.title || "Morgenbriefing";
      const dateLine = new Date().toLocaleDateString("de-DE", {
        weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
      });

      const sectionsHtml = this._config.sections.map((section) => {
        const data = this._sectionData(section);
        let body;
        if (data.error) {
          body = `<div class="msg error">${escapeHtml(data.error)}</div>`;
        } else if (data.loading) {
          body = `<div class="msg">Lade Feed …</div>`;
        } else if (!data.items.length) {
          body = `<div class="msg">Keine Meldungen.</div>`;
        } else {
          body = data.items.map((item) => `
            <a class="item" href="${escapeAttr(item.link)}" target="_blank" rel="noopener noreferrer">
              ${showTime ? `<span class="time">${escapeHtml(formatTime(item.date))}</span>` : ""}
              <span class="headline">${escapeHtml(item.title)}</span>
            </a>`).join("");
        }
        return `<div class="section"><div class="section-title">${escapeHtml(data.title)}</div>${body}</div>`;
      }).join("");

      this.shadowRoot.innerHTML = `
        <style>
          ha-card { padding: 16px 16px 12px; }
          .head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 2px; }
          .head .title { font-size: 1.15em; font-weight: 600; color: var(--primary-text-color); }
          .head .date { font-size: 0.8em; color: var(--secondary-text-color); }
          .section-title {
            font-size: 0.72em; letter-spacing: 0.1em; text-transform: uppercase;
            color: var(--secondary-text-color); margin: 14px 0 2px; font-weight: 600;
          }
          .item {
            display: flex; gap: 10px; padding: 6px 0; text-decoration: none;
            border-bottom: 1px solid var(--divider-color); line-height: 1.4;
          }
          .item:last-of-type { border-bottom: 0; }
          .item .time {
            flex: none; font-size: 0.78em; color: var(--secondary-text-color);
            font-variant-numeric: tabular-nums; padding-top: 2px; min-width: 38px;
          }
          .item .headline { font-size: 0.92em; color: var(--primary-text-color); }
          .item:hover .headline { color: var(--primary-color); }
          .msg { font-size: 0.85em; color: var(--secondary-text-color); padding: 6px 0; }
          .msg.error { color: var(--error-color, #b3261e); }
        </style>
        <ha-card>
          <div class="head">
            <span class="title">${escapeHtml(headerTitle)}</span>
            <span class="date">${escapeHtml(dateLine)}</span>
          </div>
          ${sectionsHtml}
        </ha-card>`;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function escapeAttr(s) {
    const url = String(s);
    return /^https?:\/\//i.test(url) ? escapeHtml(url) : "#";
  }

  customElements.define("morgenbriefing-card", MorgenbriefingCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "morgenbriefing-card",
    name: "Morgenbriefing Card",
    description: "News-Karte mit Standard-Feeds (tagesschau, Google News, Regionalsender u. a.), automatischer Regional-Erkennung per HA-Standort/GPS, Google-News-Suche, eigenen RSS-URLs und vorhandenen Feed-Sensoren.",
  });
})();

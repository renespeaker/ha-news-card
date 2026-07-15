/**
 * News Card – news card for Home Assistant
 *
 * Five ways to define a source (per entry in `sections`):
 *   1. preset: tagesschau        – built-in standard feed (incl. Google News)
 *   2. url: https://…/feed.xml   – custom RSS/Atom link (fetched in the browser)
 *   3. entity: sensor.my_feed    – existing sensor (e.g. Feedparser) that has
 *                                  an `entries` attribute
 *   4. google: "search term"     – Google News search feed, e.g. your town for
 *                                  local news (google: "Münster")
 *   5. region: auto              – detect the federal state from the Home
 *                                  Assistant location and pick the matching
 *                                  regional feed. With tracker: person.xyz the
 *                                  region follows that person's GPS position.
 *                                  Override with a fixed key: region: bayern
 *
 * UI language follows Home Assistant (German / English); force it with the
 * card option `language: en` or `language: de`.
 *
 * Config without YAML: the card ships a visual editor (gear icon).
 */
(function () {
  "use strict";

  const CARD_NAME = "News Card";

  const PRESETS = {
    // National / nationwide
    tagesschau:        { title: "Tagesschau",             url: "https://www.tagesschau.de/index~rss2.xml" },
    tagesschau_inland: { title: "Tagesschau · National",  url: "https://www.tagesschau.de/inland/index~rss2.xml" },
    sportschau:        { title: "Sportschau",             url: "https://www.sportschau.de/index~rss2.xml" },
    heise:             { title: "heise online",           url: "https://www.heise.de/rss/heise-atom.xml" },
    spiegel:           { title: "SPIEGEL",                url: "https://www.spiegel.de/schlagzeilen/tops/index.rss" },
    ntv:               { title: "n-tv",                   url: "https://www.n-tv.de/rss" },
    dlf:               { title: "Deutschlandfunk",        url: "https://www.deutschlandfunk.de/nachrichten-100.rss" },
    dw:                { title: "Deutsche Welle",         url: "https://rss.dw.com/rdf/rss-de-all" },
    welt:              { title: "WELT",                   url: "https://www.welt.de/feeds/latest.rss" },
    // Google News (Germany, German language)
    google_news:            { title: "Google News",            url: "https://news.google.com/rss?hl=de&gl=DE&ceid=DE:de" },
    google_news_welt:       { title: "Google News · World",    url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=de&gl=DE&ceid=DE:de" },
    google_news_wirtschaft: { title: "Google News · Business", url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=de&gl=DE&ceid=DE:de" },
    google_news_tech:       { title: "Google News · Tech",     url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=de&gl=DE&ceid=DE:de" },
    // International (Reuters has no official RSS anymore -> via Google News)
    reuters:           { title: "Reuters",                url: "https://news.google.com/rss/search?q=Reuters&hl=de&gl=DE&ceid=DE:de" },
    bbc:               { title: "BBC News",               url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    guardian:          { title: "The Guardian",           url: "https://www.theguardian.com/world/rss" },
    aljazeera:         { title: "Al Jazeera",             url: "https://www.aljazeera.com/xml/rss/all.xml" },
    euronews:          { title: "Euronews",               url: "https://de.euronews.com/rss" },
    // Regional (ARD broadcasters)
    wdr:               { title: "WDR · NRW",                     url: "https://www1.wdr.de/uebersicht-100.feed" },
    ndr_niedersachsen: { title: "NDR · Niedersachsen",          url: "https://www.ndr.de/nachrichten/niedersachsen/index-rss.xml" },
    ndr_sh:            { title: "NDR · Schleswig-Holstein",     url: "https://www.ndr.de/nachrichten/schleswig-holstein/index-rss.xml" },
    ndr_hamburg:       { title: "NDR · Hamburg",                url: "https://www.ndr.de/nachrichten/hamburg/index-rss.xml" },
    ndr_mv:            { title: "NDR · Mecklenburg-Vorpommern", url: "https://www.ndr.de/nachrichten/mecklenburg-vorpommern/index-rss.xml" },
    hessenschau:       { title: "hessenschau · Hessen",         url: "https://www.hessenschau.de/index.rss" },
    mdr:               { title: "MDR · Mitteldeutschland",      url: "https://www.mdr.de/nachrichten/index-rss.xml" },
    rbb24:             { title: "rbb24 · Berlin/Brandenburg",   url: "https://www.rbb24.de/aktuell/index.xml/feed=rss.xml" },
  };

  // google: "term" -> Google News search feed (Germany, German language)
  function googleSearchUrl(term) {
    return `https://news.google.com/rss/search?q=${encodeURIComponent(term)}&hl=de&gl=DE&ceid=DE:de`;
  }

  // Optional CORS proxy for feeds that browsers can't fetch directly (most
  // broadcasters). "{url}" is replaced with the encoded feed URL; without a
  // placeholder the encoded URL is appended (e.g. https://corsproxy.io/?url=).
  function proxied(proxy, url) {
    const p = (proxy || "").trim();
    if (!p) return url;
    return p.includes("{url}")
      ? p.replace("{url}", encodeURIComponent(url))
      : p + encodeURIComponent(url);
  }

  // region: -> federal-state feed. Where a state has no stable ARD feed as a
  // preset, the Google News search feed for that state is used instead.
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

  // Support points (cities / parts of a state) for nearest-point matching of
  // coordinates to federal states. Coarse but good enough for feed selection;
  // near a state border, set region: <key> explicitly.
  const REGION_POINTS = [
    [54.32, 10.13, "schleswig_holstein"], [53.87, 10.69, "schleswig_holstein"], [54.78, 9.44, "schleswig_holstein"],
    [53.55, 9.99, "hamburg"],
    [52.37, 9.73, "niedersachsen"], [53.14, 8.21, "niedersachsen"], [53.25, 10.41, "niedersachsen"],
    [52.27, 10.52, "niedersachsen"], [52.28, 8.05, "niedersachsen"], [53.53, 7.10, "niedersachsen"],
    [53.52, 8.11, "niedersachsen"], [53.87, 8.70, "niedersachsen"], [51.53, 9.94, "niedersachsen"], // Göttingen (south)
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
    [50.87, 8.02, "nordrhein_westfalen"], // Siegen (Südwestfalen)
    [50.11, 8.68, "hessen"], [51.31, 9.50, "hessen"], [50.58, 8.68, "hessen"], [49.87, 8.65, "hessen"],
    [50.55, 9.67, "hessen"], [50.08, 8.24, "hessen"], // Wiesbaden (capital, faces Mainz)
    [49.99, 8.41, "hessen"], [50.39, 8.06, "hessen"], // Rüsselsheim, Limburg a.d. Lahn
    [50.00, 8.27, "rheinland_pfalz"], [49.75, 6.64, "rheinland_pfalz"], [50.35, 7.60, "rheinland_pfalz"],
    [49.44, 7.77, "rheinland_pfalz"], [49.32, 8.43, "rheinland_pfalz"], [49.48, 8.43, "rheinland_pfalz"],
    [50.44, 7.83, "rheinland_pfalz"], [49.63, 8.30, "rheinland_pfalz"], // Montabaur/Westerwald, Worms
    [49.23, 7.00, "saarland"], [49.47, 6.65, "saarland"],
    [48.78, 9.18, "baden_wuerttemberg"], [47.99, 7.85, "baden_wuerttemberg"], [49.49, 8.47, "baden_wuerttemberg"],
    [47.66, 9.18, "baden_wuerttemberg"], [49.01, 8.40, "baden_wuerttemberg"], [48.40, 9.99, "baden_wuerttemberg"],
    [48.14, 11.58, "bayern"], [49.45, 11.08, "bayern"], [49.79, 9.94, "bayern"], [48.37, 10.90, "bayern"],
    [49.02, 12.10, "bayern"], [50.32, 11.92, "bayern"], [47.57, 10.70, "bayern"], [48.57, 13.45, "bayern"],
    [49.97, 9.15, "bayern"], [50.26, 10.96, "bayern"], // Aschaffenburg (Untermain), Coburg (Oberfranken)
  ];

  function nearestRegionKey(lat, lon) {
    let best = null;
    let bestDist = Infinity;
    for (const [pLat, pLon, key] of REGION_POINTS) {
      const dLat = lat - pLat;
      const dLon = (lon - pLon) * 0.63; // longitude squeeze at Germany's latitude
      const dist = dLat * dLat + dLon * dLon;
      if (dist < bestDist) { bestDist = dist; best = key; }
    }
    return best;
  }

  // Possible source keys of a section, in display order.
  const SOURCE_KEYS = ["preset", "region", "google", "url", "entity"];

  function sectionSourceType(section) {
    for (const k of SOURCE_KEYS) if (k in section) return k;
    return "preset";
  }

  // ── Translations (English / German only) ────────────────────────────────
  const I18N = {
    en: {
      news_fallback: "News",
      my_region: (n) => `My region · ${n}`,
      google_title: (n) => `Google News · ${n}`,
      loading: "Loading feed …",
      no_items: "No headlines.",
      entity_missing: (id) => `Entity ${id} not found.`,
      entity_no_entries: (id) => `${id} has no "entries" attribute (Feedparser sensor expected).`,
      no_source: "No source set (preset, url, entity, google or region).",
      cors: (hint) => hint
        ? `Direct fetch blocked by the browser (CORS). Create the sensor ${hint} with the Feedparser integration so Home Assistant loads this feed server-side – copy examples/packages/news-card.yaml, see README. Or set a "cors_proxy" in the card options.`
        : 'Direct fetch blocked by the browser (CORS). Create a Feedparser sensor for this feed and bind it via "entity:", or set a "cors_proxy" in the card options – see README.',
      proxy_failed: "Feed could not be loaded through the configured cors_proxy. Check the proxy URL, or create a Feedparser sensor instead (see README).",
      region_pick: "Please choose a region in the settings.",
      tracker_missing: (id) => `Tracker ${id} not found.`,
      no_location: "No location available – set the Home Assistant location or add a tracker.",
      err_need_sections: 'Please set "sections" – each section needs preset, url, entity, google or region.',
      err_unknown_preset: (p, i, list) => `Unknown preset "${p}" (section ${i}). Available: ${list}`,
      err_unknown_region: (r, i, list) => `Unknown region "${r}" (section ${i}). Available: auto, ${list}`,
      err_need_source: (i) => `Section ${i} needs preset, url, entity, google or region.`,
      // editor
      ed_language: "Language",
      ed_lang_auto: "Automatic (Home Assistant)",
      ed_card_title: "Card title",
      ed_max_items: "Headlines per section (default)",
      ed_show_time: "Show timestamps",
      ed_cors_proxy: "CORS proxy (optional)",
      ed_cors_proxy_hint: 'Loads feeds that browsers block (e.g. WDR) through this proxy, so no sensor is needed. Leave empty to use server-side sensors instead. Use "{url}" as a placeholder, or a URL ending in "?url=".',
      ed_sections: "Sections",
      ed_section_n: (n) => `Section ${n}`,
      ed_up: "Move up", ed_down: "Move down", ed_remove: "Remove",
      ed_source: "Source",
      ed_add: "+ Add section",
      ed_heading_opt: "Heading (optional)",
      ed_heading_ph: "Default depends on source",
      ed_max_opt: "Headlines in this section (optional)",
      ed_global: (n) => `global: ${n}`,
      src_preset: "Standard feed (preset)",
      src_region: "Region (auto / fixed)",
      src_google: "Google News search",
      src_url: "Custom RSS/Atom link",
      src_entity: "Existing sensor",
      ed_feed: "Feed",
      ed_state: "Federal state",
      ed_region_auto: "Automatic (location / GPS)",
      ed_tracker: "GPS source (optional) – follows this person's position",
      ed_tracker_ph: "e.g. person.rene",
      ed_google: "Search term / place",
      ed_google_ph: "e.g. Münster",
      ed_google_hint: "Builds a Google News search feed – great for local news.",
      ed_url: "RSS/Atom URL",
      ed_url_ph: "https://…/feed.xml",
      ed_entity: "Sensor (with entries attribute)",
      ed_entity_ph: "sensor.my_feed",
    },
    de: {
      news_fallback: "Nachrichten",
      my_region: (n) => `Meine Region · ${n}`,
      google_title: (n) => `Google News · ${n}`,
      loading: "Feed wird geladen …",
      no_items: "Keine Meldungen.",
      entity_missing: (id) => `Entität ${id} nicht gefunden.`,
      entity_no_entries: (id) => `${id} hat kein "entries"-Attribut (Feedparser-Sensor erwartet).`,
      no_source: "Keine Quelle angegeben (preset, url, entity, google oder region).",
      cors: (hint) => hint
        ? `Direkter Abruf vom Browser blockiert (CORS). Lege den Sensor ${hint} mit der Feedparser-Integration an, damit Home Assistant diesen Feed serverseitig lädt – kopiere examples/packages/news-card.yaml, siehe README. Oder setze in den Kartenoptionen einen "cors_proxy".`
        : 'Direkter Abruf vom Browser blockiert (CORS). Lege für diesen Feed einen Feedparser-Sensor an und binde ihn per "entity:" ein, oder setze in den Kartenoptionen einen "cors_proxy" – siehe README.',
      proxy_failed: 'Feed konnte nicht über den konfigurierten cors_proxy geladen werden. Prüfe die Proxy-URL oder lege stattdessen einen Feedparser-Sensor an (siehe README).',
      region_pick: "Bitte Region in den Einstellungen wählen.",
      tracker_missing: (id) => `Tracker ${id} nicht gefunden.`,
      no_location: "Kein Standort verfügbar – HA-Standort setzen oder Tracker angeben.",
      err_need_sections: 'Bitte "sections" angeben – jeder Abschnitt braucht preset, url, entity, google oder region.',
      err_unknown_preset: (p, i, list) => `Unbekanntes Preset "${p}" (Abschnitt ${i}). Verfügbar: ${list}`,
      err_unknown_region: (r, i, list) => `Unbekannte Region "${r}" (Abschnitt ${i}). Verfügbar: auto, ${list}`,
      err_need_source: (i) => `Abschnitt ${i} braucht preset, url, entity, google oder region.`,
      // editor
      ed_language: "Sprache",
      ed_lang_auto: "Automatisch (Home Assistant)",
      ed_card_title: "Kartentitel",
      ed_max_items: "Meldungen pro Abschnitt (Standard)",
      ed_show_time: "Zeitstempel anzeigen",
      ed_cors_proxy: "CORS-Proxy (optional)",
      ed_cors_proxy_hint: 'Lädt vom Browser blockierte Feeds (z. B. WDR) über diesen Proxy – dann ist kein Sensor nötig. Leer lassen, um stattdessen serverseitige Sensoren zu nutzen. "{url}" als Platzhalter oder eine URL mit "?url=" am Ende.',
      ed_sections: "Abschnitte",
      ed_section_n: (n) => `Abschnitt ${n}`,
      ed_up: "Nach oben", ed_down: "Nach unten", ed_remove: "Entfernen",
      ed_source: "Quelle",
      ed_add: "+ Abschnitt hinzufügen",
      ed_heading_opt: "Überschrift (optional)",
      ed_heading_ph: "Standard je nach Quelle",
      ed_max_opt: "Meldungen in diesem Abschnitt (optional)",
      ed_global: (n) => `global: ${n}`,
      src_preset: "Standard-Feed (Preset)",
      src_region: "Region (automatisch/fest)",
      src_google: "Google-News-Suche",
      src_url: "Eigener RSS/Atom-Link",
      src_entity: "Vorhandener Sensor",
      ed_feed: "Feed",
      ed_state: "Bundesland",
      ed_region_auto: "Automatisch (Standort/GPS)",
      ed_tracker: "GPS-Quelle (optional) – folgt der Position dieser Person",
      ed_tracker_ph: "z. B. person.rene",
      ed_google: "Suchbegriff / Ort",
      ed_google_ph: "z. B. Münster",
      ed_google_hint: "Baut einen Google-News-Suchfeed – ideal für Lokalnachrichten.",
      ed_url: "RSS/Atom-URL",
      ed_url_ph: "https://…/feed.xml",
      ed_entity: "Sensor (mit entries-Attribut)",
      ed_entity_ph: "sensor.mein_feed",
    },
  };

  function resolveLang(config, hass) {
    const raw = (config && config.language)
      || (hass && (hass.language || (hass.locale && hass.locale.language)))
      || "en";
    return String(raw).toLowerCase().startsWith("de") ? "de" : "en";
  }

  const FETCH_TTL_MS = 15 * 60 * 1000;
  // url -> { ts, items, error, pending } – shared across all card instances
  const feedCache = new Map();

  function parseFeed(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("Response is not valid XML");
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

  function formatTime(dateStr, locale) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return String(dateStr); // Feedparser already delivers formatted strings
    const today = new Date().toDateString() === d.toDateString();
    return today
      ? d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  }

  class NewsCard extends HTMLElement {
    static getStubConfig() {
      return { sections: [{ preset: "tagesschau" }] };
    }

    // Visual settings menu (gear icon when editing the card)
    static getConfigElement() {
      return document.createElement("news-card-editor");
    }

    setConfig(config) {
      const t = I18N[resolveLang(config, this._hass)];
      if (!Array.isArray(config.sections) || !config.sections.length) {
        throw new Error(t.err_need_sections);
      }
      config.sections.forEach((s, i) => {
        if (s.preset && !PRESETS[s.preset]) {
          throw new Error(t.err_unknown_preset(s.preset, i + 1, Object.keys(PRESETS).join(", ")));
        }
        if (s.region && s.region !== "auto" && !REGIONS[String(s.region).toLowerCase()]) {
          throw new Error(t.err_unknown_region(s.region, i + 1, Object.keys(REGIONS).join(", ")));
        }
        // The editor briefly creates empty sources (e.g. { google: "" } while
        // typing). Such incomplete sections must not crash the card – we only
        // check that a source key exists and report anything unfinished per
        // section in _sectionData().
        const hasSource = SOURCE_KEYS.some((k) => k in s);
        if (!hasSource) throw new Error(t.err_need_source(i + 1));
      });
      this._config = config;
      this._renderKey = null;
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
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

    _lang() { return resolveLang(this._config, this._hass); }

    _entityIds() {
      if (!this._config) return [];
      const ids = [];
      for (const s of this._config.sections) {
        if (s.entity) ids.push(s.entity);
        if (s.preset) ids.push(`sensor.news_${s.preset}`);
        if (s.tracker) ids.push(s.tracker);
        if (s.region && this._hass) {
          const r = this._resolveRegion(s);
          if (r.region && r.region.preset) ids.push(`sensor.news_${r.region.preset}`);
        }
      }
      return ids;
    }

    // region: auto -> coordinates (tracker or HA location) -> federal state;
    // region: <key> -> fixed federal state
    _resolveRegion(section) {
      const t = I18N[this._lang()];
      const key = String(section.region).toLowerCase();
      if (key !== "auto") {
        if (!REGIONS[key]) return { error: t.region_pick };
        return { region: REGIONS[key] };
      }
      let lat, lon;
      if (section.tracker) {
        const st = this._hass && this._hass.states[section.tracker];
        if (!st) return { error: t.tracker_missing(section.tracker) };
        lat = st.attributes.latitude;
        lon = st.attributes.longitude;
      }
      if ((lat == null || lon == null) && this._hass && this._hass.config) {
        lat = this._hass.config.latitude;
        lon = this._hass.config.longitude;
      }
      if (lat == null || lon == null) return { error: t.no_location };
      return { region: REGIONS[nearestRegionKey(lat, lon)] };
    }

    _sectionData(section) {
      const t = I18N[this._lang()];
      const maxItems = section.max_items || (this._config.max_items || 5);

      // 0. Region (federal state) auto or fixed -> map onto preset/google
      if (section.region) {
        const resolved = this._resolveRegion(section);
        if (resolved.error) return { title: section.title || t.my_region(""), error: resolved.error };
        const region = resolved.region;
        const mapped = { ...section, region: undefined, tracker: undefined,
          title: section.title || t.my_region(region.name) };
        if (region.preset) mapped.preset = region.preset;
        else mapped.google = region.google;
        return this._sectionData(mapped);
      }

      const preset = section.preset ? PRESETS[section.preset] : null;
      const title = section.title
        || (preset && preset.title)
        || (section.google && t.google_title(section.google))
        || section.entity || t.news_fallback;

      // 1. Explicit or preset-convention sensor
      let entityId = section.entity;
      if (!entityId && section.preset && this._hass && this._hass.states[`sensor.news_${section.preset}`]) {
        entityId = `sensor.news_${section.preset}`;
      }
      if (entityId) {
        const st = this._hass && this._hass.states[entityId];
        if (!st) return { title, error: t.entity_missing(entityId) };
        const entries = st.attributes.entries;
        if (!Array.isArray(entries)) return { title, error: t.entity_no_entries(entityId) };
        return {
          title,
          items: entries.slice(0, maxItems).map((e) => ({
            title: e.title, link: e.link, date: e.published || e.updated || "",
          })),
        };
      }

      // 2. Direct fetch of a URL (custom link, Google search feed or preset feed)
      const url = section.url
        || (section.google && googleSearchUrl(section.google))
        || (preset && preset.url);
      if (!url) return { title, error: t.no_source };

      // If this feed comes from a preset, name the exact sensor to create.
      const sensorHint = section.preset ? `sensor.news_${section.preset}` : null;
      const proxy = (this._config.cors_proxy || "").trim();
      const failMsg = proxy ? t.proxy_failed : t.cors(sensorHint);
      // Cache is keyed by the actually fetched URL, so adding or changing the
      // proxy re-fetches instead of reusing a stale direct-fetch error.
      const fetchUrl = proxied(proxy, url);
      const cached = feedCache.get(fetchUrl);
      if (cached && Date.now() - cached.ts < FETCH_TTL_MS) {
        if (cached.error) return { title, error: failMsg };
        return { title, items: (cached.items || []).slice(0, maxItems) };
      }
      if (!cached || !cached.pending) {
        feedCache.set(fetchUrl, { ts: Date.now(), pending: true, items: cached && cached.items });
        fetch(fetchUrl, { mode: "cors" })
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
          })
          .then((text) => feedCache.set(fetchUrl, { ts: Date.now(), items: parseFeed(text) }))
          .catch(() => feedCache.set(fetchUrl, { ts: Date.now(), error: "fetch" }))
          .finally(() => this._render());
      }
      if (cached && cached.items) return { title, items: cached.items.slice(0, maxItems) };
      return { title, loading: true };
    }

    _render() {
      if (!this._config) return;
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });

      const lang = this._lang();
      const t = I18N[lang];
      const locale = lang === "de" ? "de-DE" : "en-GB";
      const showTime = this._config.show_time !== false;
      const headerTitle = this._config.title || CARD_NAME;
      const dateLine = new Date().toLocaleDateString(locale, {
        weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
      });

      const sectionsHtml = this._config.sections.map((section) => {
        const data = this._sectionData(section);
        let body;
        if (data.error) {
          body = `<div class="msg error">${escapeHtml(data.error)}</div>`;
        } else if (data.loading) {
          body = `<div class="msg">${escapeHtml(t.loading)}</div>`;
        } else if (!data.items.length) {
          body = `<div class="msg">${escapeHtml(t.no_items)}</div>`;
        } else {
          body = data.items.map((item) => `
            <a class="item" href="${escapeAttr(item.link)}" target="_blank" rel="noopener noreferrer">
              ${showTime ? `<span class="time">${escapeHtml(formatTime(item.date, locale))}</span>` : ""}
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

  // ────────────────────────────────────────────────────────────────────────
  // Visual editor
  // ────────────────────────────────────────────────────────────────────────
  class NewsCardEditor extends HTMLElement {
    setConfig(config) {
      const sections = Array.isArray(config.sections) && config.sections.length
        ? config.sections.map((s) => ({ ...s }))
        : [{ preset: "tagesschau" }];
      this._config = { type: config.type || "custom:news-card",
        language: config.language, title: config.title, max_items: config.max_items,
        show_time: config.show_time, cors_proxy: config.cors_proxy, sections };
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      if (!this._hassReady && this._config) { this._hassReady = true; this._render(); }
    }

    _lang() { return resolveLang(this._config, this._hass); }

    _emit() {
      const c = this._config;
      const out = { type: c.type || "custom:news-card" };
      if (c.language) out.language = c.language;
      if (c.title) out.title = c.title;
      if (c.max_items) out.max_items = Number(c.max_items);
      if (c.show_time === false) out.show_time = false;
      if (c.cors_proxy) out.cors_proxy = c.cors_proxy;
      out.sections = c.sections.map((s) => {
        const type = sectionSourceType(s);
        const sec = {};
        sec[type] = s[type] != null ? s[type] : "";
        if (type === "region" && s.tracker) sec.tracker = s.tracker;
        if (s.title) sec.title = s.title;
        if (s.max_items) sec.max_items = Number(s.max_items);
        return sec;
      });
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config: out }, bubbles: true, composed: true }));
    }

    _set(index, key, value) {
      const target = index == null ? this._config : this._config.sections[index];
      if (value === "" || value == null) delete target[key];
      else target[key] = value;
      this._emit();
    }

    _setSourceType(index, type) {
      const s = this._config.sections[index];
      const keep = { title: s.title, max_items: s.max_items };
      const next = {};
      if (type === "preset") next.preset = s.preset || "tagesschau";
      else if (type === "region") { next.region = s.region || "auto"; if (s.tracker) next.tracker = s.tracker; }
      else next[type] = s[type] || "";
      this._config.sections[index] = { ...next, ...clean(keep) };
      this._render();
      this._emit();
    }

    _addSection() {
      this._config.sections.push({ preset: "tagesschau" });
      this._render();
      this._emit();
    }

    _removeSection(index) {
      this._config.sections.splice(index, 1);
      if (!this._config.sections.length) this._config.sections.push({ preset: "tagesschau" });
      this._render();
      this._emit();
    }

    _moveSection(index, delta) {
      const j = index + delta;
      const arr = this._config.sections;
      if (j < 0 || j >= arr.length) return;
      [arr[index], arr[j]] = [arr[j], arr[index]];
      this._render();
      this._emit();
    }

    _datalists() {
      const states = (this._hass && this._hass.states) || {};
      const feeds = [];
      const trackers = [];
      for (const id of Object.keys(states)) {
        const attrs = states[id].attributes || {};
        if (Array.isArray(attrs.entries)) feeds.push(id);
        if (id.startsWith("person.") || id.startsWith("device_tracker.")) trackers.push(id);
      }
      const opts = (ids) => ids.sort().map((id) => `<option value="${escapeHtml(id)}"></option>`).join("");
      return `<datalist id="nc-feeds">${opts(feeds)}</datalist>` +
             `<datalist id="nc-trackers">${opts(trackers)}</datalist>`;
    }

    _sourceFieldHtml(section, i, t) {
      const type = sectionSourceType(section);
      if (type === "preset") {
        const opts = Object.entries(PRESETS)
          .map(([k, v]) => `<option value="${k}"${k === section.preset ? " selected" : ""}>${escapeHtml(v.title)}</option>`)
          .join("");
        return `<label class="field"><span>${escapeHtml(t.ed_feed)}</span>
          <select data-i="${i}" data-role="preset">${opts}</select></label>`;
      }
      if (type === "region") {
        const regionOpts = [["auto", t.ed_region_auto]]
          .concat(Object.entries(REGIONS).map(([k, v]) => [k, v.name]))
          .map(([k, name]) => `<option value="${k}"${k === section.region ? " selected" : ""}>${escapeHtml(name)}</option>`)
          .join("");
        const trackerRow = section.region === "auto"
          ? `<label class="field"><span>${escapeHtml(t.ed_tracker)}</span>
             <input type="text" list="nc-trackers" placeholder="${escapeHtml(t.ed_tracker_ph)}"
               data-i="${i}" data-role="tracker" value="${escapeHtml(section.tracker || "")}"></label>`
          : "";
        return `<label class="field"><span>${escapeHtml(t.ed_state)}</span>
          <select data-i="${i}" data-role="region">${regionOpts}</select></label>${trackerRow}`;
      }
      if (type === "google") {
        return `<label class="field"><span>${escapeHtml(t.ed_google)}</span>
          <input type="text" placeholder="${escapeHtml(t.ed_google_ph)}" data-i="${i}" data-role="google"
            value="${escapeHtml(section.google || "")}"></label>
          <div class="hint">${escapeHtml(t.ed_google_hint)}</div>`;
      }
      if (type === "url") {
        return `<label class="field"><span>${escapeHtml(t.ed_url)}</span>
          <input type="text" placeholder="${escapeHtml(t.ed_url_ph)}" data-i="${i}" data-role="url"
            value="${escapeHtml(section.url || "")}"></label>`;
      }
      return `<label class="field"><span>${escapeHtml(t.ed_entity)}</span>
        <input type="text" list="nc-feeds" placeholder="${escapeHtml(t.ed_entity_ph)}" data-i="${i}" data-role="entity"
          value="${escapeHtml(section.entity || "")}"></label>`;
    }

    _sectionHtml(section, i, count, t) {
      const type = sectionSourceType(section);
      const typeOpts = SOURCE_KEYS
        .map((k) => `<option value="${k}"${k === type ? " selected" : ""}>${escapeHtml(t["src_" + k])}</option>`)
        .join("");
      return `<div class="section-card">
        <div class="se-head">
          <span class="se-title">${escapeHtml(t.ed_section_n(i + 1))}</span>
          <div class="se-actions">
            <button data-i="${i}" data-act="up" title="${escapeHtml(t.ed_up)}"${i === 0 ? " disabled" : ""}>↑</button>
            <button data-i="${i}" data-act="down" title="${escapeHtml(t.ed_down)}"${i === count - 1 ? " disabled" : ""}>↓</button>
            <button data-i="${i}" data-act="remove" title="${escapeHtml(t.ed_remove)}">✕</button>
          </div>
        </div>
        <label class="field"><span>${escapeHtml(t.ed_source)}</span>
          <select data-i="${i}" data-role="source-type">${typeOpts}</select></label>
        ${this._sourceFieldHtml(section, i, t)}
        <label class="field"><span>${escapeHtml(t.ed_heading_opt)}</span>
          <input type="text" placeholder="${escapeHtml(t.ed_heading_ph)}" data-i="${i}" data-role="title"
            value="${escapeHtml(section.title || "")}"></label>
        <label class="field"><span>${escapeHtml(t.ed_max_opt)}</span>
          <input type="number" min="1" max="20" placeholder="${escapeHtml(t.ed_global(this._config.max_items || 5))}"
            data-i="${i}" data-role="max_items" value="${section.max_items != null ? section.max_items : ""}"></label>
      </div>`;
    }

    _render() {
      if (!this._config) return;
      const c = this._config;
      const t = I18N[this._lang()];
      const langOpts = [["", t.ed_lang_auto], ["en", "English"], ["de", "Deutsch"]]
        .map(([k, label]) => `<option value="${k}"${(c.language || "") === k ? " selected" : ""}>${escapeHtml(label)}</option>`)
        .join("");
      const sectionsHtml = c.sections.map((s, i) => this._sectionHtml(s, i, c.sections.length, t)).join("");
      this.innerHTML = `
        <style>
          .nce { display: flex; flex-direction: column; gap: 16px; padding: 4px 0; }
          .nce .group { display: flex; flex-direction: column; gap: 12px; }
          .nce .field { display: flex; flex-direction: column; gap: 4px;
            font-size: 0.8em; color: var(--secondary-text-color, #666); }
          .nce .field.switch { flex-direction: row; align-items: center; gap: 8px;
            font-size: 0.95em; color: var(--primary-text-color, #000); }
          .nce input[type=text], .nce input[type=number], .nce select {
            padding: 8px 10px; border: 1px solid var(--divider-color, #ccc); border-radius: 6px;
            background: var(--card-background-color, #fff); color: var(--primary-text-color, #000);
            font-size: 1rem; font-family: inherit; width: 100%; box-sizing: border-box; }
          .nce .section-card { border: 1px solid var(--divider-color, #ccc); border-radius: 10px;
            padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
          .nce .se-head { display: flex; align-items: center; justify-content: space-between; }
          .nce .se-title { font-weight: 600; color: var(--primary-text-color, #000); }
          .nce .se-actions { display: flex; gap: 4px; }
          .nce button { cursor: pointer; border: 1px solid var(--divider-color, #ccc);
            border-radius: 6px; background: var(--card-background-color, #fff);
            color: var(--primary-text-color, #000); padding: 4px 9px; font-size: 0.95em; }
          .nce button:disabled { opacity: 0.35; cursor: default; }
          .nce .add { align-self: flex-start; padding: 9px 16px; font-weight: 600;
            color: var(--primary-color, #03a9f4); border-color: var(--primary-color, #03a9f4); }
          .nce .hint { font-size: 0.78em; color: var(--secondary-text-color, #888); margin-top: -4px; }
          .nce .sec-heading { font-size: 0.78em; letter-spacing: 0.08em; text-transform: uppercase;
            color: var(--secondary-text-color, #888); font-weight: 600; }
        </style>
        <div class="nce">
          <div class="group">
            <label class="field"><span>${escapeHtml(t.ed_language)}</span>
              <select data-role="language">${langOpts}</select></label>
            <label class="field"><span>${escapeHtml(t.ed_card_title)}</span>
              <input type="text" placeholder="${escapeHtml(CARD_NAME)}" data-role="title" value="${escapeHtml(c.title || "")}"></label>
            <label class="field"><span>${escapeHtml(t.ed_max_items)}</span>
              <input type="number" min="1" max="20" placeholder="5" data-role="max_items"
                value="${c.max_items != null ? c.max_items : ""}"></label>
            <label class="field switch">
              <input type="checkbox" data-role="show_time"${c.show_time === false ? "" : " checked"}>
              ${escapeHtml(t.ed_show_time)}</label>
            <label class="field"><span>${escapeHtml(t.ed_cors_proxy)}</span>
              <input type="text" placeholder="https://corsproxy.io/?url=" data-role="cors_proxy"
                value="${escapeHtml(c.cors_proxy || "")}"></label>
            <div class="hint">${escapeHtml(t.ed_cors_proxy_hint)}</div>
          </div>
          <div class="sec-heading">${escapeHtml(t.ed_sections)}</div>
          ${sectionsHtml}
          <button class="add" data-act="add">${escapeHtml(t.ed_add)}</button>
        </div>
        ${this._datalists()}`;
      this._bind();
    }

    _bind() {
      this.querySelectorAll('input[type=text], input[type=number]').forEach((el) => {
        el.addEventListener("input", () => {
          const i = el.dataset.i != null ? Number(el.dataset.i) : null;
          this._set(i, el.dataset.role, el.value.trim());
        });
      });
      const showTime = this.querySelector('input[data-role="show_time"]');
      if (showTime) showTime.addEventListener("change", () => {
        if (showTime.checked) delete this._config.show_time; else this._config.show_time = false;
        this._emit();
      });
      this.querySelectorAll("select").forEach((el) => {
        el.addEventListener("change", () => {
          const role = el.dataset.role;
          if (role === "language") {
            if (el.value) this._config.language = el.value; else delete this._config.language;
            this._render(); this._emit(); return;
          }
          const i = Number(el.dataset.i);
          if (role === "source-type") this._setSourceType(i, el.value);
          else { this._set(i, role, el.value); if (role === "region") this._render(); }
        });
      });
      this.querySelectorAll("button").forEach((el) => {
        el.addEventListener("click", () => {
          const act = el.dataset.act;
          if (act === "add") return this._addSection();
          const i = Number(el.dataset.i);
          if (act === "up") this._moveSection(i, -1);
          else if (act === "down") this._moveSection(i, 1);
          else if (act === "remove") this._removeSection(i);
        });
      });
    }
  }

  function clean(obj) {
    const out = {};
    for (const k of Object.keys(obj)) if (obj[k] != null && obj[k] !== "") out[k] = obj[k];
    return out;
  }

  customElements.define("news-card-editor", NewsCardEditor);
  customElements.define("news-card", NewsCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "news-card",
    name: CARD_NAME,
    description: "News card with built-in feeds (tagesschau, Google News, regional broadcasters), automatic region detection via HA location/GPS, Google News search, custom RSS URLs and existing feed sensors. UI in English or German.",
    preview: true,
    documentationURL: "https://github.com/renespeaker/ha-news-card",
  });
})();

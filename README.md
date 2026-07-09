# 📰 News Card

A news card for your Home Assistant dashboard. It shows the top national and
regional headlines every morning – with **built-in feeds** (presets incl.
Google News), **automatic region detection** from the HA location or GPS,
**Google News search feeds** for any place or topic, **custom RSS links**, and
support for **existing feed sensors** if you already use RSS in Home Assistant.

The interface is available in **English and German** and follows your Home
Assistant language automatically (override with the `language` option).

## Configure without YAML: the visual editor

The card ships a **graphical settings menu** – YAML is optional.
Dashboard → Edit → Add card → "News Card", or click the **gear** on an existing
card. Everything can be set with clicks and input fields:

- **Language** (Automatic / English / Deutsch), **card title**, **headlines per
  section**, and **timestamps** on/off
- add, remove and reorder **sections** with ↑/↓
- pick each section's **source** from a list: standard feed (preset), region
  (auto/fixed), Google News search, custom RSS link, or an existing sensor –
  the matching fields appear automatically
- sensor and tracker fields suggest matching entities from your instance

The YAML reference below is only needed if you prefer configuring in code.

## Five ways to define a source

Each entry in `sections` gets its news one of five ways – a dropdown in the
editor, a key in YAML:

```yaml
type: custom:news-card
title: News Card
max_items: 5
sections:
  - preset: tagesschau            # 1. built-in standard feed
  - region: auto                  # 2. federal state from the HA location
                                  #    (see below)
  - title: Local                  # 3. Google News search for a place/term
    google: "Münster"             #    (great for local news)
  - title: Tech                   # 4. custom RSS/Atom link
    url: https://www.heise.de/rss/heise-atom.xml
  - title: Business               # 5. existing sensor (e.g. Feedparser),
    entity: sensor.my_feed        #    if you already use RSS in HA
```

## Automatic region (`region:`)

`region: auto` determines the federal state from the **Home Assistant location**
(Settings → System → General) and picks the matching regional feed – an ARD
preset where available, otherwise the Google News search feed for that state.
Matching happens entirely locally in the card; no location data is sent to
third parties.

```yaml
- region: auto                # federal state from the HA location
- region: auto
  tracker: person.rene        # …or follow a person's GPS position
- region: bayern              # …or set it fixed (overrides the automatic one)
```

- **GPS mode:** with `tracker:` the region follows the person – on holiday in
  Munich the card shows Bavarian news. If the tracker has no coordinates right
  now, the HA location is used as a fallback.
- **Change it any time:** a fixed state key (`region: bayern`,
  `region: nordrhein_westfalen`, `region: thueringen`, …), a regional
  `preset:`, a `google:` search, or your own sensor – the automatic pick is
  only the default, never a lock-in.
- Matching uses city support points and is deliberately coarse near borders –
  if you live right on a state border, set the region explicitly.

## Installation

### Via HACS (recommended)

1. HACS → ⋮ → **Custom repositories**
2. Repository `https://github.com/renespeaker/ha-news-card`, type **Dashboard**
3. Install "News Card" – HACS registers the resource automatically.

### Manual

Copy `dist/news-card.js` to `/config/www/`, then:
Settings → Dashboards → ⋮ → **Resources** → Add →
URL `/local/news-card.js`, type **JavaScript module**. Clear the browser cache
(Ctrl+F5).

## Presets (built-in standard feeds)

| Preset | Feed |
|---|---|
| `tagesschau` | tagesschau.de – top headlines |
| `tagesschau_inland` | tagesschau.de – national |
| `sportschau` | sportschau.de |
| `heise` | heise online |
| `spiegel` | SPIEGEL headlines |
| `ntv` | n-tv |
| `google_news` | Google News – top headlines (Germany) |
| `google_news_welt` | Google News – World |
| `google_news_wirtschaft` | Google News – Business |
| `google_news_tech` | Google News – Tech |
| `wdr` | NRW (WDR) |
| `ndr_niedersachsen` / `ndr_sh` / `ndr_hamburg` / `ndr_mv` | NDR regional feeds |
| `hessenschau` | Hessen |
| `mdr` | Sachsen / Sachsen-Anhalt / Thüringen |
| `rbb24` | Berlin / Brandenburg |

**Google News:** besides the presets, `google: "term"` builds a Google News
search feed automatically – handy for local news about your town or topics such
as a club name. Google News links go through news.google.com to the article,
and titles include the source name.

**How the card resolves a preset source:** if the sensor `sensor.news_<preset>`
exists (from the example package), it is used – the most reliable path, because
Home Assistant loads the feed server-side. Otherwise the card fetches directly
in the browser (15-minute cache). If the news site blocks that via CORS, the
card shows a hint to create a sensor for that feed. The same applies to `url:`
and `google:` entries.

## Create the standard sensors (recommended)

So that all feeds load reliably server-side:

1. Install the HACS integration **feedparser** (`custom-components/feedparser`)
   and restart Home Assistant.
2. Copy [`examples/packages/news-card.yaml`](examples/packages/news-card.yaml)
   to `/config/packages/` and enable packages:
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```
3. Uncomment the regional block you need, add your own feeds, restart HA.

**Already using Feedparser/RSS sensors?** Then skip this step – bind existing
sensors via `entity:` (an `entries` attribute with `title`, `link`, `published`
is expected).

## Card options

| Option | Default | Description |
|---|---|---|
| `language` | HA language | `en` or `de` (forces the UI language) |
| `title` | `News Card` | card title |
| `max_items` | `5` | headlines per section (global or per section) |
| `show_time` | `true` | show timestamps |
| `region` (per section) | – | `auto` (HA location/GPS) or a fixed state key |
| `tracker` (per section) | – | person/device tracker as the GPS source for `region: auto` |

## Morning automation (optional)

[`examples/automation.yaml`](examples/automation.yaml) refreshes the sensors at
06:00 and pushes the top 3 headlines to your phone (adjust
`notify.mobile_app_…`).

## More examples

- [`examples/dashboard-card.yaml`](examples/dashboard-card.yaml) – card configuration
- [`examples/dashboard-card-markdown.yaml`](examples/dashboard-card-markdown.yaml) – fallback without the custom card

## Notes

- **Check feed URLs:** open each URL once in the browser – XML/RSS must appear.
  Broadcasters change URLs occasionally.
- **Be fair:** a `scan_interval` of 30 minutes is plenty – the morning
  automation loads fresh at 6 a.m. anyway.

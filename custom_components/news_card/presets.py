"""Built-in feed presets.

Keys mirror the presets used by the Lovelace card, so a sensor named
``sensor.news_<key>`` created here is picked up automatically by the card's
``preset:`` and ``region: auto`` logic.
"""

# key -> (friendly title, feed url)
PRESETS: dict[str, tuple[str, str]] = {
    # National / nationwide
    "tagesschau": ("Tagesschau", "https://www.tagesschau.de/index~rss2.xml"),
    "tagesschau_inland": ("Tagesschau · National", "https://www.tagesschau.de/inland/index~rss2.xml"),
    "sportschau": ("Sportschau", "https://www.sportschau.de/index~rss2.xml"),
    "heise": ("heise online", "https://www.heise.de/rss/heise-atom.xml"),
    "spiegel": ("SPIEGEL", "https://www.spiegel.de/schlagzeilen/tops/index.rss"),
    "ntv": ("n-tv", "https://www.n-tv.de/rss"),
    "dlf": ("Deutschlandfunk", "https://www.deutschlandfunk.de/nachrichten-100.rss"),
    "dw": ("Deutsche Welle", "https://rss.dw.com/rdf/rss-de-all"),
    "welt": ("WELT", "https://www.welt.de/feeds/latest.rss"),
    # Google News (Germany, German language)
    "google_news": ("Google News", "https://news.google.com/rss?hl=de&gl=DE&ceid=DE:de"),
    "google_news_welt": ("Google News · World", "https://news.google.com/rss/headlines/section/topic/WORLD?hl=de&gl=DE&ceid=DE:de"),
    "google_news_wirtschaft": ("Google News · Business", "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=de&gl=DE&ceid=DE:de"),
    "google_news_tech": ("Google News · Tech", "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=de&gl=DE&ceid=DE:de"),
    # International
    "reuters": ("Reuters", "https://news.google.com/rss/search?q=Reuters&hl=de&gl=DE&ceid=DE:de"),
    "bbc": ("BBC News", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    "guardian": ("The Guardian", "https://www.theguardian.com/world/rss"),
    "aljazeera": ("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
    "euronews": ("Euronews", "https://de.euronews.com/rss"),
    # Regional (ARD broadcasters)
    "wdr": ("WDR · NRW", "https://www1.wdr.de/uebersicht-100.feed"),
    "ndr_niedersachsen": ("NDR · Niedersachsen", "https://www.ndr.de/nachrichten/niedersachsen/index-rss.xml"),
    "ndr_sh": ("NDR · Schleswig-Holstein", "https://www.ndr.de/nachrichten/schleswig-holstein/index-rss.xml"),
    "ndr_hamburg": ("NDR · Hamburg", "https://www.ndr.de/nachrichten/hamburg/index-rss.xml"),
    "ndr_mv": ("NDR · Mecklenburg-Vorpommern", "https://www.ndr.de/nachrichten/mecklenburg-vorpommern/index-rss.xml"),
    "hessenschau": ("hessenschau · Hessen", "https://www.hessenschau.de/index.rss"),
    "mdr": ("MDR · Mitteldeutschland", "https://www.mdr.de/nachrichten/index-rss.xml"),
    "rbb24": ("rbb24 · Berlin/Brandenburg", "https://www.rbb24.de/aktuell/index.xml/feed=rss.xml"),
}

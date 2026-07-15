"""Resolve the configured feeds from a config entry into key -> {title, url}."""

from __future__ import annotations

from homeassistant.util import slugify

from .const import CONF_CUSTOM, CONF_PRESETS
from .presets import PRESETS


def resolve_feeds(data: dict, options: dict) -> dict[str, dict[str, str]]:
    """Merge entry data and options into a mapping of feed key -> metadata.

    Options take precedence, so reconfiguring via the options flow wins over
    the values captured when the entry was first created.
    """
    merged = {**(data or {}), **(options or {})}
    feeds: dict[str, dict[str, str]] = {}

    for key in merged.get(CONF_PRESETS) or []:
        if key in PRESETS:
            title, url = PRESETS[key]
            feeds[key] = {"title": title, "url": url}

    for line in (merged.get(CONF_CUSTOM) or "").splitlines():
        line = line.strip()
        if not line:
            continue
        name, sep, url = line.partition("|")
        if not sep:
            # No "Name | URL" separator: treat the whole line as the URL.
            name, url = "", line
        name, url = name.strip(), url.strip()
        if not url:
            continue
        key = slugify(name) if name else slugify(url)
        if not key:
            continue
        # Never clobber a preset feed with a custom one of the same key.
        feeds.setdefault(key, {"title": name or url, "url": url})

    return feeds

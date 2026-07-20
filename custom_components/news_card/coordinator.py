"""Server-side feed fetching for the News Card integration."""

from __future__ import annotations

import asyncio
from datetime import timedelta
import logging

import feedparser

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import (
    CONF_SCAN_INTERVAL,
    DEFAULT_MAX_ENTRIES,
    DEFAULT_SCAN_INTERVAL,
    DOMAIN,
)
from .feeds import resolve_feeds

_LOGGER = logging.getLogger(__name__)

REQUEST_TIMEOUT = 20
USER_AGENT = "HomeAssistant-NewsCard/1.0 (+https://github.com/renespeaker/ha-news-card)"


class NewsCoordinator(DataUpdateCoordinator[dict]):
    """Fetch all configured feeds server-side (no browser CORS involved)."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialise the coordinator from a config entry."""
        self.entry = entry
        self.feeds = resolve_feeds(entry.data, entry.options)
        merged = {**entry.data, **entry.options}
        minutes = merged.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
        try:
            minutes = max(1, int(float(minutes)))
        except (TypeError, ValueError):
            minutes = DEFAULT_SCAN_INTERVAL
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(minutes=minutes),
        )

    async def _async_update_data(self) -> dict[str, dict]:
        """Fetch and parse every configured feed."""
        session = async_get_clientsession(self.hass)
        results: dict[str, dict] = {}

        async def _fetch(key: str, meta: dict[str, str]) -> None:
            url = meta["url"]
            title = meta["title"]
            try:
                async with asyncio.timeout(REQUEST_TIMEOUT):
                    resp = await session.get(url, headers={"User-Agent": USER_AGENT})
                    resp.raise_for_status()
                    raw = await resp.read()
            except Exception as err:  # noqa: BLE001 - one bad feed must not kill the rest
                _LOGGER.warning(
                    "News Card: could not load feed '%s' (%s): %s", key, url, err
                )
                results[key] = {
                    "title": title,
                    "url": url,
                    "entries": [],
                    "error": str(err),
                }
                return

            parsed = await self.hass.async_add_executor_job(feedparser.parse, raw)
            entries = []
            for entry in parsed.entries[:DEFAULT_MAX_ENTRIES]:
                entries.append(
                    {
                        "title": (entry.get("title") or "").strip(),
                        "link": (entry.get("link") or "").strip(),
                        "published": entry.get("published")
                        or entry.get("updated")
                        or "",
                    }
                )
            results[key] = {
                "title": title,
                "url": url,
                "entries": entries,
                "error": None,
            }

        if self.feeds:
            await asyncio.gather(
                *(_fetch(key, meta) for key, meta in self.feeds.items())
            )
        return results

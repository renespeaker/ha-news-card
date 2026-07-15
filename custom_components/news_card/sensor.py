"""Sensor platform for the News Card integration.

Each feed becomes a ``sensor.news_<key>`` entity with an ``entries`` attribute,
exactly the shape the Lovelace card reads – so the card picks them up
automatically (including ``region: auto`` -> ``sensor.news_<preset>``).
"""

from __future__ import annotations

from homeassistant.components.sensor import ENTITY_ID_FORMAT, SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import async_generate_entity_id
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import NewsCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Create one sensor per configured feed."""
    coordinator: NewsCoordinator = hass.data[DOMAIN][entry.entry_id]
    entities = [
        NewsSensor(hass, coordinator, entry, key, meta["title"])
        for key, meta in coordinator.feeds.items()
    ]
    async_add_entities(entities)


class NewsSensor(CoordinatorEntity[NewsCoordinator], SensorEntity):
    """A single news feed exposed as a sensor with an ``entries`` attribute."""

    _attr_has_entity_name = False
    _attr_icon = "mdi:newspaper"
    # Keep the large headline list out of the recorder history.
    _unrecorded_attributes = frozenset({"entries"})

    def __init__(
        self,
        hass: HomeAssistant,
        coordinator: NewsCoordinator,
        entry: ConfigEntry,
        key: str,
        title: str,
    ) -> None:
        """Initialise the sensor and pin its entity_id to sensor.news_<key>."""
        super().__init__(coordinator)
        self._key = key
        self._attr_name = title
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self.entity_id = async_generate_entity_id(
            ENTITY_ID_FORMAT, f"news_{key}", hass=hass
        )

    @property
    def _data(self) -> dict:
        return (self.coordinator.data or {}).get(self._key) or {}

    @property
    def native_value(self) -> str | None:
        """The latest headline (truncated to the state length limit)."""
        entries = self._data.get("entries") or []
        if entries:
            return entries[0]["title"][:255]
        return None

    @property
    def extra_state_attributes(self) -> dict:
        data = self._data
        return {
            "entries": data.get("entries", []),
            "count": len(data.get("entries", [])),
            "feed_url": data.get("url"),
            "error": data.get("error"),
        }

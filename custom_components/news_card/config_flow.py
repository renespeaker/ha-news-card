"""Config and options flow for the News Card integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_CUSTOM,
    CONF_PRESETS,
    CONF_SCAN_INTERVAL,
    DEFAULT_SCAN_INTERVAL,
    DOMAIN,
)
from .presets import PRESETS

_PRESET_OPTIONS = [
    selector.SelectOptionDict(value=key, label=title)
    for key, (title, _url) in PRESETS.items()
]


def _build_schema(defaults: dict[str, Any]) -> vol.Schema:
    """Schema shared by the config and options steps."""
    return vol.Schema(
        {
            vol.Optional(
                CONF_PRESETS,
                default=defaults.get(CONF_PRESETS, ["tagesschau"]),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=_PRESET_OPTIONS,
                    multiple=True,
                    mode=selector.SelectSelectorMode.LIST,
                )
            ),
            vol.Optional(
                CONF_CUSTOM,
                default=defaults.get(CONF_CUSTOM, ""),
            ): selector.TextSelector(
                selector.TextSelectorConfig(multiline=True)
            ),
            vol.Optional(
                CONF_SCAN_INTERVAL,
                default=defaults.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=5,
                    max=360,
                    step=5,
                    unit_of_measurement="min",
                    mode=selector.NumberSelectorMode.BOX,
                )
            ),
        }
    )


class NewsCardConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the initial setup."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Single instance: pick feeds and scan interval."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(title="News Card", data=user_input)

        return self.async_show_form(
            step_id="user", data_schema=_build_schema({})
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Return the options flow."""
        return NewsCardOptionsFlow(config_entry)


class NewsCardOptionsFlow(OptionsFlow):
    """Reconfigure feeds and scan interval after setup."""

    def __init__(self, config_entry: ConfigEntry) -> None:
        """Store the entry to reconfigure."""
        self._entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Show / save the options form."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        defaults = {**self._entry.data, **self._entry.options}
        return self.async_show_form(
            step_id="init", data_schema=_build_schema(defaults)
        )

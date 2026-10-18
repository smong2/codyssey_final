"""Validated server configuration; never log credential values."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping
from urllib.parse import urlsplit


class ConfigError(RuntimeError):
    """A required or malformed server setting was found."""


def _required(environ: Mapping[str, str], name: str) -> str:
    value = environ.get(name, "").strip()
    if not value:
        raise ConfigError(f"Missing required environment variable: {name}")
    return value


def parse_cors_origins(raw: str) -> tuple[str, ...]:
    origins: list[str] = []
    for item in raw.split(","):
        origin = item.strip()
        if not origin:
            continue
        parsed = urlsplit(origin)
        try:
            valid_port = parsed.port is None or 0 < parsed.port < 65536
        except ValueError:
            valid_port = False
        if (
            origin == "*"
            or parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path
            or parsed.query
            or parsed.fragment
            or not valid_port
            or origin != f"{parsed.scheme}://{parsed.netloc}"
        ):
            raise ConfigError("CORS_ORIGINS must contain only explicit http(s) origins")
        if origin not in origins:
            origins.append(origin)
    return tuple(origins)


@dataclass(frozen=True, repr=False)
class Settings:
    firebase_project_id: str
    firebase_service_account: Mapping[str, Any] = field(repr=False)
    cors_origins: tuple[str, ...] = ()
    gemini_api_key: str | None = field(default=None, repr=False)
    gemini_model: str = "gemini-3.8-flash"
    gemini_thinking_level: str = "low"
    content_sqlite_path: str = str(Path(__file__).resolve().parents[3] / "backend/database/sqlite/lumia-content.sqlite3")
    dialogue_token_secret: str | None = field(default=None, repr=False)

    @classmethod
    def from_env(cls, environ: Mapping[str, str] | None = None) -> Settings:
        source = os.environ if environ is None else environ
        project_id = _required(source, "FIREBASE_PROJECT_ID")
        raw_credential = _required(source, "FIREBASE_SERVICE_ACCOUNT_JSON")
        try:
            credential = json.loads(raw_credential)
        except json.JSONDecodeError:
            raise ConfigError("FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON") from None
        if not isinstance(credential, dict) or credential.get("type") != "service_account":
            raise ConfigError("FIREBASE_SERVICE_ACCOUNT_JSON must be a service account object")
        if any(
            not isinstance(credential.get(key), str) or not credential[key].strip()
            for key in ("project_id", "client_email", "private_key")
        ):
            raise ConfigError("FIREBASE_SERVICE_ACCOUNT_JSON is missing required service account fields")
        if credential["project_id"] != project_id:
            raise ConfigError("FIREBASE_PROJECT_ID does not match the service account project")

        thinking_level = (source.get("GEMINI_THINKING_LEVEL") or "low").strip().lower()
        if thinking_level not in {"minimal", "low", "medium", "high"}:
            raise ConfigError("GEMINI_THINKING_LEVEL must be minimal, low, medium, or high")
        gemini_model = (source.get("GEMINI_MODEL") or "gemini-3.8-flash").strip()
        if not gemini_model or "/" in gemini_model or len(gemini_model) > 120:
            raise ConfigError("GEMINI_MODEL is invalid")

        return cls(
            firebase_project_id=project_id,
            firebase_service_account=credential,
            cors_origins=parse_cors_origins(source.get("CORS_ORIGINS", "")),
            gemini_api_key=source.get("GEMINI_API_KEY") or None,
            gemini_model=gemini_model,
            gemini_thinking_level=thinking_level,
            content_sqlite_path=source.get("CONTENT_SQLITE_PATH") or str(
                Path(__file__).resolve().parents[3] / "backend/database/sqlite/lumia-content.sqlite3"
            ),
            dialogue_token_secret=source.get("DIALOGUE_TOKEN_SECRET") or None,
        )

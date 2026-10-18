"""Short-lived opaque, tamper-evident dialogue authorization token."""

from __future__ import annotations

import base64
import binascii
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import hmac
import json


class InvalidDialogueToken(Exception):
    pass


def _encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def issue_token(secret: str, *, uid: str, slot_id: int, run_id: str,
                event_id: str, version: str, revision: int) -> str:
    claims = {"uid": uid, "slotId": slot_id, "runId": run_id, "eventId": event_id,
              "version": version, "revision": revision,
              "expiresAt": int((datetime.now(timezone.utc) + timedelta(hours=6)).timestamp())}
    payload = _encode(json.dumps(claims, sort_keys=True, separators=(",", ":")).encode())
    signature = _encode(hmac.new(secret.encode(), payload.encode(), sha256).digest())
    return f"{payload}.{signature}"


def verify_token(secret: str, token: str) -> dict:
    try:
        if len(token) > 2048:
            raise ValueError
        payload, signature = token.split(".")
        expected = hmac.new(secret.encode(), payload.encode(), sha256).digest()
        if not hmac.compare_digest(_decode(signature), expected):
            raise ValueError
        claims = json.loads(_decode(payload))
        if set(claims) != {"uid", "slotId", "runId", "eventId", "version", "revision", "expiresAt"}:
            raise ValueError
        if not isinstance(claims["expiresAt"], int) or claims["expiresAt"] < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError
        return claims
    except (ValueError, TypeError, KeyError, UnicodeDecodeError, binascii.Error):
        raise InvalidDialogueToken from None

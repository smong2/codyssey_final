"""FastAPI entry point for the LUMIA backend."""

from __future__ import annotations

from collections.abc import Callable
from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import Settings, parse_cors_origins
from .firebase import FirebaseServices, get_firebase_services, initialize_firebase


def create_app(
    *,
    settings: Settings | None = None,
    firebase_factory: Callable[[Settings], FirebaseServices] = initialize_firebase,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(api: FastAPI):
        resolved_settings = settings if settings is not None else Settings.from_env()
        api.state.settings = resolved_settings
        api.state.firebase_services = firebase_factory(resolved_settings)
        try:
            yield
        finally:
            del api.state.firebase_services
            del api.state.settings

    api = FastAPI(title="LUMIA API", lifespan=lifespan)
    asset_root = Path(__file__).resolve().parents[3] / "asset"
    api.mount("/world-assets", StaticFiles(directory=asset_root / "background"), name="world-assets")
    api.mount("/character-assets", StaticFiles(directory=asset_root / "character"), name="character-assets")
    api.mount("/item-assets", StaticFiles(directory=asset_root / "item"), name="item-assets")
    api.add_middleware(
        CORSMiddleware,
        allow_origins=list(
            settings.cors_origins
            if settings is not None
            else parse_cors_origins(os.environ.get("CORS_ORIGINS", ""))
        ),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @api.get("/health", include_in_schema=False)
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # Imported here so the dependency module can use the public service hook.
    from .account import router as account_router
    from .save_slots import router as save_slots_router
    from .dialogue import router as dialogue_router
    from .activities import router as activities_router
    from .progression import router as progression_router
    from .endings import router as endings_router
    from .admin import router as admin_router

    api.include_router(account_router)
    api.include_router(save_slots_router)
    api.include_router(dialogue_router)
    api.include_router(activities_router)
    api.include_router(progression_router)
    api.include_router(endings_router)
    api.include_router(admin_router)

    return api


app = create_app()

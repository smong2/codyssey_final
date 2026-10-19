"""Validated Firestore state used by account and slot persistence."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, NonNegativeInt, model_validator


class FirestoreModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AccountProfile(FirestoreModel):
    createdAt: datetime
    updatedAt: datetime
    lastLoginAt: datetime
    lastPlayedAt: datetime | None
    privacyConsentAt: datetime
    privacyConsentVersion: str
    schemaVersion: int = Field(ge=1)
    # Transient deletion marker used while Firestore and Auth are reconciled.
    deletionPending: bool = False
    deletionAnalyticsDates: list[str] = Field(default_factory=list)


class AccountSettings(FirestoreModel):
    activePetId: str
    activeRoomBackgroundId: str
    roomActorPositions: dict[str, dict[str, float]] = Field(default_factory=dict)
    locale: str
    updatedAt: datetime

    @model_validator(mode="after")
    def validate_room_actor_positions(self) -> AccountSettings:
        if any(actor not in {"player", "pet"} or set(position) != {"x", "y"}
               or any(type(value) not in {float, int} or not 0 <= value <= 1
                      for value in position.values())
               for actor, position in self.roomActorPositions.items()):
            raise ValueError("Room actor positions are invalid")
        return self


class GlobalMetaProgress(FirestoreModel):
    permanentBonuses: dict[str, NonNegativeInt]
    unlockedCharacterIds: list[str]
    playedCharacterIds: list[str]
    unlockedPetIds: list[str]
    acquiredBadgeIds: list[str]
    acquiredPuzzlePieceIds: list[str]
    unlockedRoomBackgroundIds: list[str]
    seenEndingIds: list[str]
    updatedAt: datetime


class GlobalStatistics(FirestoreModel):
    totalCompletedRuns: int = Field(ge=0)
    totalClassCount: int = Field(ge=0)
    totalAdventureCount: int = Field(ge=0)
    totalRestCount: int = Field(ge=0)
    totalMinigamePlayCount: int = Field(ge=0)
    totalMinigameClearCount: int = Field(ge=0)
    clearedMinigameIds: list[str]
    totalNpcEncounterCount: int = Field(ge=0)
    completedNpcStoryCount: int = Field(ge=0)
    totalSpecialItemDiscoveryCount: int = Field(ge=0)
    totalLocationDiscoveryCount: int = Field(ge=0)
    retryAfterFailureCount: int = Field(ge=0)
    myRoomActiveWeekCount: int = Field(ge=0)
    importantChoiceCount: int = Field(ge=0)
    behaviorTagCounts: dict[str, NonNegativeInt]
    classCounts: dict[str, NonNegativeInt]
    characterPlayCounts: dict[str, NonNegativeInt]
    endingViewCounts: dict[str, NonNegativeInt]
    updatedAt: datetime


class UnlockState(FirestoreModel):
    completedConditionIds: list[str]
    pendingCharacterUnlockIds: list[str]
    updatedAt: datetime


class EndingLetter(FirestoreModel):
    content: str = Field(min_length=1, max_length=6000)
    generationStatus: Literal["GENERATED", "FALLBACK"]
    model: str = Field(min_length=1, max_length=120)
    promptVersion: str = Field(min_length=1, max_length=80)
    generatedAt: datetime


class EndingRecord(FirestoreModel):
    endingRecordId: str = Field(min_length=1, max_length=128)
    runId: str = Field(min_length=1, max_length=128)
    slotId: int = Field(ge=1, le=5)
    runNumber: int = Field(ge=1)
    characterId: str = Field(min_length=1, max_length=64)
    endingId: str = Field(min_length=1, max_length=128)
    endingType: Literal["CAREER", "FALLBACK"]
    completedAt: datetime
    finalStats: dict[str, int]
    hiddenStatsSummary: dict[str, Any]
    playStatistics: dict[str, Any]
    selectedPlayRecords: list[dict[str, Any]]
    representativeChoices: list[dict[str, Any]]
    letter: EndingLetter
    gameDataVersion: str = Field(min_length=1, max_length=128)

    @model_validator(mode="after")
    def validate_final_stats(self) -> EndingRecord:
        expected = {"knowledge", "expression", "skill", "exploration", "magic"}
        tags = {"empathy", "responsibility", "curiosity", "courage",
                "cooperation", "independence", "caution", "honesty"}
        if set(self.finalStats) != expected:
            raise ValueError("EndingRecord finalStats keys are invalid")
        if any(type(value) is not int or not 0 <= value <= 500 for value in self.finalStats.values()):
            raise ValueError("EndingRecord finalStats values are invalid")
        if self.endingType == "FALLBACK" and self.endingId != "ENDING_STARPATH_PIONEER":
            raise ValueError("Fallback EndingRecord ID is invalid")
        if self.endingType == "CAREER" and self.endingId == "ENDING_STARPATH_PIONEER":
            raise ValueError("Career EndingRecord ID is invalid")
        if set(self.hiddenStatsSummary) != {"dominant"}:
            raise ValueError("EndingRecord hiddenStatsSummary must not contain raw values")
        dominant = self.hiddenStatsSummary.get("dominant")
        if (not isinstance(dominant, list) or len(dominant) > 3
                or any(not isinstance(tag, str) or tag not in tags for tag in dominant)
                or len(set(dominant)) != len(dominant)):
            raise ValueError("EndingRecord hidden dominant tags are invalid")
        if not 4 <= len(self.selectedPlayRecords) <= 6:
            raise ValueError("EndingRecord requires 4..6 selected play records")
        if len(self.representativeChoices) > 2:
            raise ValueError("EndingRecord representativeChoices exceeds 2")
        return self


class SaveSlot(FirestoreModel):
    slotId: int = Field(ge=1, le=5)
    status: Literal["EMPTY", "PLAYING", "RUN_COMPLETE"]
    completedRunCount: int = Field(ge=0)
    lastCompletedCharacterId: str | None
    lastEndingId: str | None
    createdAt: datetime | None
    lastSavedAt: datetime | None
    saveVersion: int = Field(ge=1)
    gameDataVersion: str
    activeRun: dict[str, Any] | None
    serverRevision: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_status(self) -> SaveSlot:
        if self.status == "PLAYING" and self.activeRun is None:
            raise ValueError("PLAYING slot requires activeRun")
        if self.status != "PLAYING" and self.activeRun is not None:
            raise ValueError("Only PLAYING slot may contain activeRun")
        if self.status == "RUN_COMPLETE" and self.completedRunCount < 1:
            raise ValueError("RUN_COMPLETE slot requires a completed run")
        return self


class RequestReceipt(FirestoreModel):
    requestIdHash: str
    operation: str
    commandHash: str
    slotId: int = Field(ge=1, le=5)
    serverRevision: int = Field(ge=1)
    appliedAt: datetime
    resultData: dict[str, Any] = Field(default_factory=dict)

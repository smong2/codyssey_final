"""UID-scoped Firestore access and retry-safe slot transaction boundary."""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
import json
from typing import Any, Literal
from zoneinfo import ZoneInfo

from google.api_core.exceptions import AlreadyExists
from google.cloud import firestore

from .models import AccountProfile, AccountSettings, GlobalMetaProgress, RequestReceipt, SaveSlot


class AccountNotFound(Exception):
    pass


class DeletionPending(Exception):
    pass


class SlotNotFound(Exception):
    pass


class RevisionConflict(Exception):
    pass


class RequestIdReused(Exception):
    pass


class InvalidMutation(Exception):
    pass


def _user_root(database: Any, uid: str) -> Any:
    return database.collection("users").document(uid)


def _account_from_snapshot(snapshot: Any) -> AccountProfile:
    if snapshot is None or not snapshot.exists:
        raise AccountNotFound
    profile = AccountProfile.model_validate(snapshot.to_dict())
    if profile.deletionPending:
        raise DeletionPending
    return profile


class UserRepository:
    """Owns account reads, atomic bootstrap, and descendant deletion."""

    def __init__(self, database: Any) -> None:
        self.database = database

    def bootstrap(
        self,
        uid: str,
        create_documents: Callable[[], Mapping[str, Mapping[str, Any]]],
    ) -> bool:
        root = _user_root(self.database, uid)
        existing = root.get()
        if existing.exists:
            if existing.to_dict().get("deletionPending") is True:
                raise DeletionPending
            return False

        batch = self.database.batch()
        for path, document in create_documents().items():
            if path:
                collection_id, document_id = path.split("/", 1)
                reference = root.collection(collection_id).document(document_id)
            else:
                reference = root
            batch.create(reference, dict(document))
        try:
            batch.commit()
        except AlreadyExists:
            existing = root.get()
            if existing.exists and existing.to_dict().get("deletionPending") is True:
                raise DeletionPending from None
            if existing.exists:
                return False
            raise
        return True

    def get(self, uid: str) -> AccountProfile:
        return _account_from_snapshot(_user_root(self.database, uid).get())

    def get_settings(self, uid: str) -> AccountSettings:
        self.get(uid)
        root = _user_root(self.database, uid)
        snapshot = root.collection("settings").document("account").get()
        if not snapshot.exists:
            raise AccountNotFound
        return AccountSettings.model_validate(snapshot.to_dict())

    def update_settings(
        self,
        uid: str,
        *,
        active_pet_id: str | None = None,
        active_room_background_id: str | None = None,
        room_actor_positions: dict[str, dict[str, float]] | None = None,
    ) -> AccountSettings:
        self.get(uid)
        root = _user_root(self.database, uid)
        settings_ref = root.collection("settings").document("account")
        meta_ref = root.collection("meta").document("progress")
        settings_snapshot = settings_ref.get()
        meta_snapshot = meta_ref.get()
        if not settings_snapshot.exists or not meta_snapshot.exists:
            raise AccountNotFound
        settings = AccountSettings.model_validate(settings_snapshot.to_dict())
        meta = GlobalMetaProgress.model_validate(meta_snapshot.to_dict())
        if active_pet_id is not None:
            if active_pet_id not in meta.unlockedPetIds:
                raise InvalidMutation("Pet is not unlocked")
            settings.activePetId = active_pet_id
        if active_room_background_id is not None:
            if active_room_background_id not in meta.unlockedRoomBackgroundIds:
                raise InvalidMutation("Room background is not unlocked")
            settings.activeRoomBackgroundId = active_room_background_id
        if room_actor_positions is not None:
            settings.roomActorPositions.update(room_actor_positions)
        settings.updatedAt = datetime.now(timezone.utc)
        settings_ref.set(settings.model_dump(mode="python"))
        return settings

    def delete(self, uid: str, auth_client: Any) -> None:
        """Delete descendants, Auth, then root; retryable until Auth deletion.

        Missing derived analytics documents signal a required rebuild. The
        actual rebuild belongs to the later administrator analytics phase.
        """
        root = _user_root(self.database, uid)
        snapshot = root.get()
        if snapshot.exists:
            profile = AccountProfile.model_validate(snapshot.to_dict())
            if profile.deletionPending:
                dates = profile.deletionAnalyticsDates
            else:
                dates = {doc.id for doc in root.collection("activityDays").stream()}
                dates.add(profile.createdAt.astimezone(ZoneInfo("Asia/Seoul")).date().isoformat())
                dates = sorted(dates)
                root.update({"deletionPending": True, "deletionAnalyticsDates": dates})
        else:
            dates = []

        for date in dates:
            self.database.collection("analyticsDays").document(date).delete()
        for collection in root.collections():
            self.database.recursive_delete(collection)
        auth_client.delete_user(uid)
        root.delete()


@dataclass(frozen=True)
class UserDocPath:
    collection: Literal[
        "settings", "meta", "statistics", "unlockState", "activityDays", "endingRecords", "saveSlots"
    ]
    document_id: str

    def __post_init__(self) -> None:
        if self.collection not in {
            "settings", "meta", "statistics", "unlockState", "activityDays", "endingRecords", "saveSlots"
        }:
            raise ValueError("Unsupported user collection")
        if not self.document_id or "/" in self.document_id or self.document_id in {".", ".."}:
            raise ValueError("Invalid user document ID")

    def reference(self, root: Any) -> Any:
        return root.collection(self.collection).document(self.document_id)


@dataclass(frozen=True)
class SystemReadPath:
    """Explicit read-only global document permitted in a slot transaction."""

    collection: Literal["systemSettings"]
    document_id: Literal["balance"]

    def __post_init__(self) -> None:
        if self.collection != "systemSettings" or self.document_id != "balance":
            raise ValueError("Unsupported global read path")

    def reference(self, database: Any) -> Any:
        return database.collection(self.collection).document(self.document_id)


ReadDocPath = UserDocPath | SystemReadPath


@dataclass(frozen=True)
class MutationPlan:
    slot: SaveSlot
    # Full replacement documents. Every target must be listed in read_paths.
    documents: Mapping[UserDocPath, Mapping[str, Any]] = field(default_factory=dict)
    clear_last_saved_at: bool = False
    result_data: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class MutationResult:
    server_revision: int
    replayed: bool
    result_data: Mapping[str, Any] = field(default_factory=dict)
    slot: SaveSlot | None = None
    documents: Mapping[UserDocPath, Mapping[str, Any]] = field(default_factory=dict)


def _run_firestore_transaction(database: Any, body: Callable[[Any], MutationResult]) -> MutationResult:
    @firestore.transactional
    def execute(transaction: Any) -> MutationResult:
        return body(transaction)

    return execute(database.transaction())


class SaveSlotRepository:
    """Serializes user game writes by slot revision and account-wide request ID.

    The mutator must be pure: Firestore may rerun it when a transaction retries.
    It receives only pre-read snapshots, never a Firestore client. All writes,
    including the request receipt, commit together or not at all.
    """

    def __init__(
        self,
        database: Any,
        uid: str,
        *,
        transaction_runner: Callable[[Any, Callable[[Any], MutationResult]], MutationResult] = _run_firestore_transaction,
    ) -> None:
        self.database = database
        self.uid = uid
        self.transaction_runner = transaction_runner

    def _batch_snapshots(self, references: Sequence[Any]) -> list[Any | None]:
        if not callable(getattr(self.database, "get_all", None)):
            return [reference.get() for reference in references]
        snapshots_by_path = {
            snapshot.reference.path: snapshot
            for snapshot in self.database.get_all(list(references))
            if getattr(snapshot, "reference", None) is not None
        }
        return [
            snapshots_by_path[reference.path]
            if reference.path in snapshots_by_path else reference.get()
            for reference in references
        ]

    def get(self, slot_id: int) -> SaveSlot:
        slot, _ = self.get_slot_and_user_documents(slot_id, ())
        return slot

    def get_slot_and_user_documents(
        self, slot_id: int, paths: Sequence[UserDocPath],
    ) -> tuple[SaveSlot, dict[UserDocPath, dict[str, Any] | None]]:
        requested = tuple(paths)
        if len(set(requested)) != len(requested) or any(not isinstance(path, UserDocPath) for path in requested):
            raise ValueError("User document paths must be unique")
        root = _user_root(self.database, self.uid)
        slot_ref = self._slot_reference(slot_id)
        references = [root, slot_ref, *(path.reference(root) for path in requested)]
        root_snapshot, slot_snapshot, *snapshots = self._batch_snapshots(references)
        _account_from_snapshot(root_snapshot)
        if slot_snapshot is None or not slot_snapshot.exists:
            raise SlotNotFound
        slot = SaveSlot.model_validate(slot_snapshot.to_dict())
        if slot.slotId != slot_id:
            raise SlotNotFound
        documents = {
            path: deepcopy(snapshot.to_dict()) if snapshot is not None and snapshot.exists else None
            for path, snapshot in zip(requested, snapshots, strict=True)
        }
        return slot, documents

    def list_slots(self) -> list[SaveSlot | None]:
        """Return five positions; None means missing/corrupt, never EMPTY."""
        root = _user_root(self.database, self.uid)
        references = [root, *(self._slot_reference(slot_id) for slot_id in range(1, 6))]
        root_snapshot, *snapshots = self._batch_snapshots(references)
        _account_from_snapshot(root_snapshot)
        result: list[SaveSlot | None] = []
        for slot_id, snapshot in enumerate(snapshots, 1):
            if snapshot is None or not snapshot.exists:
                result.append(None)
                continue
            try:
                slot = SaveSlot.model_validate(snapshot.to_dict())
                result.append(slot if slot.slotId == slot_id else None)
            except ValueError:
                result.append(None)
        return result

    def get_user_document(self, path: UserDocPath) -> dict[str, Any] | None:
        return self.get_user_documents((path,))[path]

    def list_ending_records(self) -> list[dict[str, Any]]:
        root = _user_root(self.database, self.uid)
        _account_from_snapshot(root.get())
        collection = root.collection("endingRecords")
        records = []
        for item in collection.stream():
            snapshot = collection.document(item.id).get()
            if snapshot.exists:
                records.append(deepcopy(snapshot.to_dict()))
        return records

    def get_user_documents(
        self, paths: Sequence[UserDocPath],
    ) -> dict[UserDocPath, dict[str, Any] | None]:
        """Read several user documents after one account-root validation.

        Production Firestore uses one batch-get RPC. Lightweight test doubles
        that do not implement get_all retain the previous sequential behavior.
        """
        requested = tuple(paths)
        if len(set(requested)) != len(requested) or any(not isinstance(path, UserDocPath) for path in requested):
            raise ValueError("User document paths must be unique")
        root = _user_root(self.database, self.uid)
        references = [root, *(path.reference(root) for path in requested)]
        root_snapshot, *snapshots = self._batch_snapshots(references)
        _account_from_snapshot(root_snapshot)
        return {
            path: deepcopy(snapshot.to_dict()) if snapshot is not None and snapshot.exists else None
            for path, snapshot in zip(requested, snapshots, strict=True)
        }

    def _slot_reference(self, slot_id: int) -> Any:
        if not isinstance(slot_id, int) or isinstance(slot_id, bool) or not 1 <= slot_id <= 5:
            raise ValueError("slot_id must be 1..5")
        return _user_root(self.database, self.uid).collection("saveSlots").document(str(slot_id))

    def apply(
        self,
        *,
        slot_id: int,
        request_id: str,
        expected_server_revision: int,
        operation: str,
        command: Mapping[str, Any],
        read_paths: Sequence[ReadDocPath],
        mutator: Callable[[SaveSlot, Mapping[ReadDocPath, dict[str, Any] | None]], MutationPlan],
    ) -> MutationResult:
        if not isinstance(request_id, str) or not request_id or len(request_id) > 256 or not request_id.strip():
            raise ValueError("request_id must be 1..256 characters")
        if not isinstance(operation, str) or not operation or len(operation) > 80:
            raise ValueError("operation must be 1..80 characters")
        if (
            not isinstance(expected_server_revision, int)
            or isinstance(expected_server_revision, bool)
            or expected_server_revision < 0
        ):
            raise ValueError("expected_server_revision must be nonnegative")
        slot_ref = self._slot_reference(slot_id)
        root = _user_root(self.database, self.uid)
        request_id_hash = sha256(request_id.encode()).hexdigest()
        receipt_ref = root.collection("requestReceipts").document(request_id_hash)
        try:
            command_json = json.dumps(
                {"slotId": slot_id, "operation": operation, "command": dict(command)},
                sort_keys=True,
                separators=(",", ":"),
                ensure_ascii=False,
                allow_nan=False,
            )
        except (TypeError, ValueError):
            raise ValueError("command must be JSON-serializable") from None
        command_hash = sha256(command_json.encode()).hexdigest()
        requested_paths = tuple(read_paths)
        if len(set(requested_paths)) != len(requested_paths):
            raise ValueError("read_paths must not contain duplicates")
        if any(not isinstance(path, (UserDocPath, SystemReadPath)) for path in requested_paths):
            raise ValueError("Unsupported read path")
        requested_references = {
            path: path.reference(root if isinstance(path, UserDocPath) else self.database)
            for path in requested_paths
        }

        def body(transaction: Any) -> MutationResult:
            # Firestore forbids reads after the first write in a transaction.
            base_references = (root, receipt_ref, slot_ref)
            all_references = (*base_references, *requested_references.values())
            if callable(getattr(transaction, "get_all", None)):
                received = list(transaction.get_all(list(all_references)))
                by_path = {
                    snapshot.reference.path: snapshot
                    for snapshot in received
                    if getattr(snapshot, "reference", None) is not None
                }
                # Some Firestore-compatible test doubles omit references for
                # missing documents. Fill only those gaps before any write.
                resolved = {
                    reference.path: by_path[reference.path]
                    if reference.path in by_path else reference.get(transaction=transaction)
                    for reference in all_references
                }
                root_snapshot = resolved[root.path]
                receipt_snapshot = resolved[receipt_ref.path]
                slot_snapshot = resolved[slot_ref.path]
                snapshots = {
                    path: resolved[reference.path]
                    for path, reference in requested_references.items()
                }
            else:
                root_snapshot = root.get(transaction=transaction)
                receipt_snapshot = receipt_ref.get(transaction=transaction)
                slot_snapshot = slot_ref.get(transaction=transaction)
                snapshots = {
                    path: reference.get(transaction=transaction)
                    for path, reference in requested_references.items()
                }
            if not root_snapshot.exists:
                raise AccountNotFound
            if root_snapshot.to_dict().get("deletionPending") is True:
                raise DeletionPending
            if receipt_snapshot.exists:
                receipt = RequestReceipt.model_validate(receipt_snapshot.to_dict())
                if receipt.commandHash != command_hash or receipt.requestIdHash != request_id_hash:
                    raise RequestIdReused
                replay_slot = None
                replay_documents: dict[UserDocPath, Mapping[str, Any]] = {}
                if slot_snapshot.exists:
                    candidate = SaveSlot.model_validate(slot_snapshot.to_dict())
                    if candidate.slotId == slot_id and candidate.serverRevision == receipt.serverRevision:
                        replay_slot = candidate
                        replay_documents = {
                            path: deepcopy(snapshot.to_dict())
                            for path, snapshot in snapshots.items()
                            if isinstance(path, UserDocPath) and snapshot.exists
                        }
                return MutationResult(
                    server_revision=receipt.serverRevision,
                    replayed=True,
                    result_data=deepcopy(receipt.resultData),
                    slot=replay_slot,
                    documents=replay_documents,
                )
            if not slot_snapshot.exists:
                raise SlotNotFound

            slot = SaveSlot.model_validate(slot_snapshot.to_dict())
            if slot.slotId != slot_id:
                raise InvalidMutation("Slot ID does not match document path")
            if slot.serverRevision != expected_server_revision:
                raise RevisionConflict
            documents = {
                path: deepcopy(snapshot.to_dict()) if snapshot.exists else None
                for path, snapshot in snapshots.items()
            }
            plan = mutator(slot.model_copy(deep=True), documents)
            if not isinstance(plan, MutationPlan):
                raise InvalidMutation("Mutator must return MutationPlan")
            proposed = SaveSlot.model_validate(plan.slot.model_dump(mode="python"))
            if proposed.slotId != slot_id or proposed.serverRevision != slot.serverRevision:
                raise InvalidMutation("Mutator cannot change slot ID or server revision")
            if not set(plan.documents).issubset(snapshots):
                raise InvalidMutation("Every write target must be read before mutation")
            if any(not isinstance(path, UserDocPath) for path in plan.documents):
                raise InvalidMutation("Global settings are read-only in a slot mutation")
            if any(path.collection == "saveSlots" for path in plan.documents):
                raise InvalidMutation("Sibling slots are read-only in this mutation")
            now = datetime.now(timezone.utc)
            updated = proposed.model_copy(
                update={
                    "serverRevision": slot.serverRevision + 1,
                    "lastSavedAt": None if plan.clear_last_saved_at else now,
                }
            )
            transaction.set(slot_ref, updated.model_dump(mode="python"))
            for path, document in plan.documents.items():
                reference = path.reference(root)
                if snapshots[path].exists:
                    transaction.set(reference, deepcopy(dict(document)))
                else:
                    transaction.create(reference, deepcopy(dict(document)))
            transaction.create(
                receipt_ref,
                RequestReceipt(
                    requestIdHash=request_id_hash,
                    operation=operation,
                    commandHash=command_hash,
                    slotId=slot_id,
                    serverRevision=updated.serverRevision,
                    appliedAt=now,
                    resultData=deepcopy(dict(plan.result_data)),
                ).model_dump(mode="python"),
            )
            return MutationResult(
                server_revision=updated.serverRevision,
                replayed=False,
                result_data=deepcopy(dict(plan.result_data)),
                slot=updated.model_copy(deep=True),
                documents={path: deepcopy(dict(document)) for path, document in plan.documents.items()},
            )

        return self.transaction_runner(self.database, body)

    def reset_unreadable(
        self, *, slot_id: int, request_id: str, game_data_version: str,
    ) -> MutationResult:
        """Replace only a missing or invalid slot document with a fresh EMPTY slot."""
        if not isinstance(request_id, str) or not request_id.strip() or len(request_id) > 256:
            raise ValueError("request_id must be 1..256 characters")
        if not isinstance(game_data_version, str) or not game_data_version:
            raise ValueError("game_data_version is required")
        slot_ref = self._slot_reference(slot_id)
        root = _user_root(self.database, self.uid)

        def body(transaction: Any) -> MutationResult:
            root_snapshot = root.get(transaction=transaction)
            slot_snapshot = slot_ref.get(transaction=transaction)
            if not root_snapshot.exists:
                raise AccountNotFound
            if root_snapshot.to_dict().get("deletionPending") is True:
                raise DeletionPending
            if slot_snapshot.exists:
                try:
                    current = SaveSlot.model_validate(slot_snapshot.to_dict())
                except ValueError:
                    current = None
                if current is not None:
                    if (current.slotId == slot_id and current.status == "EMPTY"
                            and current.serverRevision == 0):
                        return MutationResult(server_revision=0, replayed=True,
                                              slot=current.model_copy(deep=True))
                    raise InvalidMutation("Slot is readable; refresh before deleting")
            empty = SaveSlot(
                slotId=slot_id, status="EMPTY", completedRunCount=0,
                lastCompletedCharacterId=None, lastEndingId=None,
                createdAt=None, lastSavedAt=None, saveVersion=1,
                gameDataVersion=game_data_version, activeRun=None, serverRevision=0,
            )
            transaction.set(slot_ref, empty.model_dump(mode="python"))
            return MutationResult(server_revision=0, replayed=False,
                                  slot=empty.model_copy(deep=True))

        return self.transaction_runner(self.database, body)

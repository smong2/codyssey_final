"""Offline transaction, idempotency, and repository-scope tests."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256

import pytest
from pydantic import ValidationError

from backend.api.app.account import _initial_documents
from backend.api.app.models import (
    AccountProfile,
    AccountSettings,
    GlobalMetaProgress,
    GlobalStatistics,
    SaveSlot,
    UnlockState,
)
from backend.api.app.repositories import (
    AccountNotFound,
    DeletionPending,
    InvalidMutation,
    MutationPlan,
    RequestIdReused,
    RevisionConflict,
    SaveSlotRepository,
    SystemReadPath,
    UserDocPath,
)
from backend.api.tests.test_phase3_account import Database, Snapshot


class BatchSnapshot(Snapshot):
    def __init__(self, data, reference):
        super().__init__(data)
        self.reference = reference


class BatchDatabase(Database):
    def __init__(self):
        super().__init__()
        self.get_all_calls = 0

    def get_all(self, references):
        self.get_all_calls += 1
        return [BatchSnapshot(deepcopy(self.data.get(reference.path)), reference) for reference in references]


class TransactionSnapshot(Snapshot):
    def __init__(self, data, reference):
        super().__init__(data)
        self.reference = reference


class FakeTransaction:
    def __init__(self, database):
        self.database = database
        self.writes = []

    def get_snapshot(self, path):
        return Snapshot(deepcopy(self.database.data.get(path)))

    def get_all(self, references):
        return [
            TransactionSnapshot(deepcopy(self.database.data.get(reference.path)), reference)
            for reference in references
        ]

    def set(self, reference, data):
        self.writes.append(("set", reference.path, deepcopy(data)))

    def create(self, reference, data):
        self.writes.append(("create", reference.path, deepcopy(data)))

    def commit(self):
        if any(kind == "create" and path in self.database.data for kind, path, _ in self.writes):
            raise AssertionError("create precondition violated")
        for _, path, data in self.writes:
            self.database.data[path] = data


def offline_runner(database, body):
    transaction = FakeTransaction(database)
    result = body(transaction)
    transaction.commit()
    return result


def setup_repo(uid="owner"):
    database = Database()
    now = datetime.now(timezone.utc)
    documents = _initial_documents(now, now)
    for path, data in documents.items():
        full_path = f"users/{uid}" + (f"/{path}" if path else "")
        database.data[full_path] = deepcopy(data)
    return database, SaveSlotRepository(database, uid, transaction_runner=offline_runner)


def test_multi_document_reads_use_firestore_batch_get_when_available():
    database = BatchDatabase()
    now = datetime.now(timezone.utc)
    for path, data in _initial_documents(now, now).items():
        database.data["users/owner" + (f"/{path}" if path else "")] = deepcopy(data)
    repository = SaveSlotRepository(database, "owner", transaction_runner=offline_runner)
    slots = repository.list_slots()
    documents = repository.get_user_documents((
        UserDocPath("meta", "progress"), UserDocPath("statistics", "global"),
        UserDocPath("unlockState", "global"), UserDocPath("settings", "account"),
    ))
    slot, slot_documents = repository.get_slot_and_user_documents(
        1, (UserDocPath("meta", "progress"),)
    )
    assert len(slots) == 5 and all(slot is not None for slot in slots)
    assert all(value is not None for value in documents.values())
    assert slot.slotId == 1 and slot_documents[UserDocPath("meta", "progress")] is not None
    assert database.get_all_calls == 3


def test_bootstrap_documents_match_typed_models_and_initial_revision():
    now = datetime.now(timezone.utc)
    documents = _initial_documents(now, now)
    AccountProfile.model_validate(documents[""])
    AccountSettings.model_validate(documents["settings/account"])
    GlobalMetaProgress.model_validate(documents["meta/progress"])
    GlobalStatistics.model_validate(documents["statistics/global"])
    UnlockState.model_validate(documents["unlockState/global"])
    for slot_id in range(1, 6):
        slot = SaveSlot.model_validate(documents[f"saveSlots/{slot_id}"])
        assert slot.serverRevision == 0
    broken = {**documents["saveSlots/1"], "status": "PLAYING"}
    with pytest.raises(ValidationError):
        SaveSlot.model_validate(broken)


def start_run(slot, documents):
    slot.status = "PLAYING"
    slot.activeRun = {"runId": "run-1"}
    return MutationPlan(slot=slot)


def test_same_request_is_replayed_without_running_mutator_again():
    database, repository = setup_repo()
    first = repository.apply(
        slot_id=1,
        request_id="run-creation-1",
        expected_server_revision=0,
        operation="startRun",
        command={"characterId": "CH01"},
        read_paths=(),
        mutator=start_run,
    )
    calls = []

    def should_not_run(slot, documents):
        calls.append(True)
        raise AssertionError("replay must not reapply effects")

    replay = repository.apply(
        slot_id=1,
        request_id="run-creation-1",
        expected_server_revision=0,
        operation="startRun",
        command={"characterId": "CH01"},
        read_paths=(),
        mutator=should_not_run,
    )
    assert first.server_revision == replay.server_revision == 1
    assert first.replayed is False and replay.replayed is True
    assert first.slot is not None and first.slot.serverRevision == 1
    assert replay.slot is not None and replay.slot.serverRevision == 1
    assert calls == []
    assert repository.get(1).serverRevision == 1
    receipt_id = sha256(b"run-creation-1").hexdigest()
    assert database.data[f"users/owner/requestReceipts/{receipt_id}"]["serverRevision"] == 1


def test_revision_conflict_and_request_id_reuse_do_not_change_state():
    database, repository = setup_repo()
    repository.apply(
        slot_id=1,
        request_id="first",
        expected_server_revision=0,
        operation="startRun",
        command={"characterId": "CH01"},
        read_paths=(),
        mutator=start_run,
    )
    snapshot = deepcopy(database.data)
    with pytest.raises(RevisionConflict):
        repository.apply(
            slot_id=1,
            request_id="second",
            expected_server_revision=0,
            operation="startRun",
            command={"characterId": "CH02"},
            read_paths=(),
            mutator=start_run,
        )
    with pytest.raises(RequestIdReused):
        repository.apply(
            slot_id=1,
            request_id="first",
            expected_server_revision=0,
            operation="startRun",
            command={"characterId": "CH02"},
            read_paths=(),
            mutator=start_run,
        )
    assert database.data == snapshot


def test_slot_and_global_statistics_commit_with_one_receipt():
    database, repository = setup_repo()
    path = UserDocPath("statistics", "global")

    def complete_activity(slot, documents):
        slot.status = "PLAYING"
        slot.activeRun = {"runId": "run-1"}
        statistics = documents[path]
        statistics["totalClassCount"] += 1
        return MutationPlan(slot=slot, documents={path: statistics})

    result = repository.apply(
        slot_id=1,
        request_id="class-activity-1",
        expected_server_revision=0,
        operation="completeClass",
        command={"activityId": "class-1"},
        read_paths=(path,),
        mutator=complete_activity,
    )
    assert result.server_revision == 1
    assert database.data["users/owner/statistics/global"]["totalClassCount"] == 1
    replay = repository.apply(
        slot_id=1,
        request_id="class-activity-1",
        expected_server_revision=0,
        operation="completeClass",
        command={"activityId": "class-1"},
        read_paths=(path,),
        mutator=complete_activity,
    )
    assert replay.replayed is True
    assert database.data["users/owner/statistics/global"]["totalClassCount"] == 1


def test_unread_write_target_aborts_and_does_not_leave_receipt():
    database, repository = setup_repo()
    before = deepcopy(database.data)
    path = UserDocPath("meta", "progress")

    def bad_mutator(slot, documents):
        return MutationPlan(slot=slot, documents={path: {"bad": True}})

    with pytest.raises(InvalidMutation):
        repository.apply(
            slot_id=1,
            request_id="bad-1",
            expected_server_revision=0,
            operation="badWrite",
            command={},
            read_paths=(),
            mutator=bad_mutator,
        )
    assert database.data == before


def test_repository_cannot_read_another_uid_or_invalid_slot():
    database, repository = setup_repo()
    with pytest.raises(AccountNotFound):
        SaveSlotRepository(database, "other", transaction_runner=offline_runner).get(1)
    with pytest.raises(ValueError):
        repository.get(6)
    with pytest.raises(ValueError):
        UserDocPath("meta", "../other")
    with pytest.raises(ValueError):
        UserDocPath("users", "other")


def test_global_balance_can_be_read_atomically_but_never_written_by_slot():
    database, repository = setup_repo()
    balance = SystemReadPath("systemSettings", "balance")
    database.data["systemSettings/balance"] = {
        "rewardMultiplier": {stat: 0.8 for stat in (
            "knowledge", "expression", "skill", "exploration", "magic")},
        "version": 2,
    }

    def read_balance(slot, documents):
        assert documents[balance]["version"] == 2
        slot.status = "PLAYING"
        slot.activeRun = {"runId": "run-1"}
        return MutationPlan(slot=slot, result_data={"balanceVersion": documents[balance]["version"]})

    result = repository.apply(
        slot_id=1, request_id="read-balance-1", expected_server_revision=0,
        operation="testBalanceRead", command={}, read_paths=(balance,), mutator=read_balance,
    )
    assert result.result_data["balanceVersion"] == 2
    assert database.data["systemSettings/balance"]["version"] == 2

    def overwrite_balance(slot, documents):
        return MutationPlan(slot=slot, documents={balance: {"rewardMultiplier": {}}})

    before = deepcopy(database.data)
    with pytest.raises(InvalidMutation, match="read-only"):
        repository.apply(
            slot_id=1, request_id="overwrite-balance-1", expected_server_revision=1,
            operation="testBalanceWrite", command={}, read_paths=(balance,), mutator=overwrite_balance,
        )
    assert database.data == before
    with pytest.raises(ValueError):
        SystemReadPath("users", "balance")


def test_pending_deletion_blocks_mutations_without_receipt():
    database, repository = setup_repo()
    database.data["users/owner"]["deletionPending"] = True
    before = deepcopy(database.data)
    with pytest.raises(DeletionPending):
        repository.apply(
            slot_id=1,
            request_id="during-deletion",
            expected_server_revision=0,
            operation="startRun",
            command={},
            read_paths=(),
            mutator=start_run,
        )
    assert database.data == before

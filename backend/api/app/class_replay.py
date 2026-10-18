"""Server replay of approved class input, never of browser-reported metrics.

This first verifier mirrors the deterministic sealed-shelves rules in
engine/src/core/curriculum-puzzles.mjs and CurriculumScenes.mjs. Other class
games have no verifier yet and must fail closed for positive results.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
import math
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


CLASS_DURATIONS_MS = {
    "observatory-mirror": 120_000,
    "starlight-stage": 75_000,
    "spirit-pot-sort": 120_000,
    "sealed-shelves": 120_000,
    "rune-circuit": 120_000,
    "rune-pin-training": 90_000,
}
REPLAY_VERSION = "CLASS_INPUT_LOG_V1"
SUPPORTED_REPLAY_GAMES = frozenset({
    "sealed-shelves", "spirit-pot-sort", "rune-pin-training", "rune-circuit",
    "observatory-mirror", "starlight-stage",
})


class ReplayRejected(ValueError):
    pass


class ClassInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    atMs: int = Field(strict=True, ge=0, le=120_000)
    action: Literal["MOVE", "UNDO", "RESET", "POUR", "FIRE", "ROTATE", "TOGGLE",
                    "PRESS", "RELEASE"]
    pieceId: str | None = None
    delta: int | None = Field(default=None, strict=True)
    fromPot: int | None = Field(default=None, strict=True, ge=0, le=7)
    toPot: int | None = Field(default=None, strict=True, ge=0, le=7)
    cellIndex: int | None = Field(default=None, strict=True, ge=0, le=24)
    mirrorIndex: int | None = Field(default=None, strict=True, ge=0, le=3)
    lane: int | None = Field(default=None, strict=True, ge=0, le=2)

    @model_validator(mode="after")
    def valid_action(self) -> ClassInput:
        if self.action == "MOVE":
            if (self.pieceId not in {"A", "B", "C", "H", "D", "E"}
                    or self.delta not in {-1, 1} or self.fromPot is not None or self.toPot is not None
                    or self.mirrorIndex is not None or self.lane is not None):
                raise ValueError("MOVE requires a piece and one-cell direction")
        elif self.action == "POUR":
            if (self.fromPot is None or self.toPot is None or self.fromPot == self.toPot
                    or self.pieceId is not None or self.delta is not None or self.cellIndex is not None
                    or self.mirrorIndex is not None or self.lane is not None):
                raise ValueError("POUR requires two different pots")
        elif self.action == "ROTATE":
            if (self.cellIndex is None or self.pieceId is not None or self.delta is not None
                    or self.fromPot is not None or self.toPot is not None
                    or self.mirrorIndex is not None or self.lane is not None):
                raise ValueError("ROTATE requires one circuit cell")
        elif self.action == "TOGGLE":
            if (self.mirrorIndex is None or self.pieceId is not None or self.delta is not None
                    or self.fromPot is not None or self.toPot is not None
                    or self.cellIndex is not None or self.lane is not None):
                raise ValueError("TOGGLE requires one mirror index")
        elif self.action in {"PRESS", "RELEASE"}:
            if (self.lane is None or self.pieceId is not None or self.delta is not None
                    or self.fromPot is not None or self.toPot is not None
                    or self.cellIndex is not None or self.mirrorIndex is not None):
                raise ValueError("Rhythm input requires one lane")
        elif any(value is not None for value in (
                self.pieceId, self.delta, self.fromPot, self.toPot, self.cellIndex,
                self.mirrorIndex, self.lane)):
            raise ValueError("UNDO, RESET and FIRE have no action parameters")
        if self.action == "MOVE" and self.cellIndex is not None:
            raise ValueError("MOVE cannot rotate a circuit cell")
        return self


@dataclass(frozen=True)
class ReplayResult:
    resolution: Literal["FAIL", "SUCCESS", "GREAT"]
    moves: int
    rounds_cleared: int
    duration_ms: int


def _stage(difficulty: int, round_index: int) -> list[dict]:
    # Equivalent to shelfStage's reverse moves, then odd-round Y reflection.
    pieces = [
        {"id": "A", "x": 0, "y": 2, "axis": "h", "length": 2},
        {"id": "B", "x": 2, "y": 0, "axis": "v", "length": 3},
        {"id": "C", "x": 3, "y": 1, "axis": "v", "length": 2},
    ]
    if difficulty >= 2:
        pieces.append({"id": "H", "x": 0, "y": 4, "axis": "h", "length": 3})
    if difficulty >= 3:
        pieces.append({"id": "D", "x": 5, "y": 3, "axis": "v", "length": 2})
    if difficulty >= 4:
        pieces.append({"id": "E", "x": 4, "y": 3, "axis": "v", "length": 2})
    if round_index % 2:
        for piece in pieces:
            piece["y"] = 6 - piece["y"] - (piece["length"] if piece["axis"] == "v" else 1)
    return pieces


def _move(pieces: list[dict], piece_id: str, delta: int) -> bool:
    item = next((piece for piece in pieces if piece["id"] == piece_id), None)
    if item is None:
        return False
    x = item["x"] + (delta if item["axis"] == "h" else 0)
    y = item["y"] + (delta if item["axis"] == "v" else 0)
    if (x < 0 or y < 0 or x + (item["length"] if item["axis"] == "h" else 1) > 6
            or y + (item["length"] if item["axis"] == "v" else 1) > 6):
        return False
    for offset in range(item["length"]):
        px = x + (offset if item["axis"] == "h" else 0)
        py = y + (offset if item["axis"] == "v" else 0)
        if any(other is not item
               and other["x"] <= px < other["x"] + (other["length"] if other["axis"] == "h" else 1)
               and other["y"] <= py < other["y"] + (other["length"] if other["axis"] == "v" else 1)
               for other in pieces):
            return False
    item["x" if item["axis"] == "h" else "y"] += delta
    return True


def replay_sealed_shelves(*, difficulty: int, max_duration_ms: int,
                          events: list[ClassInput], timed_out: bool = False) -> ReplayResult:
    if type(difficulty) is not int or not 1 <= difficulty <= 4 or max_duration_ms != 120_000:
        raise ReplayRejected("Stored shelves challenge is invalid")
    if (not events and not timed_out) or len(events) > 512:
        raise ReplayRejected("Input log is empty or too large")
    round_index = moves = 0
    pieces = _stage(difficulty, round_index)
    original = deepcopy(pieces)
    history: list[list[dict]] = []
    previous_ms = -1
    for event in events:
        if event.atMs < previous_ms or event.atMs >= max_duration_ms:
            raise ReplayRejected("Input times are unordered or outside the challenge")
        previous_ms = event.atMs
        if round_index == 3:
            raise ReplayRejected("Input follows the completed game")
        if event.action == "MOVE":
            before = deepcopy(pieces)
            if not _move(pieces, event.pieceId, event.delta):
                raise ReplayRejected("Input attempts an illegal shelf move")
            history.append(before)
        elif event.action == "UNDO":
            if not history:
                raise ReplayRejected("Input attempts an unavailable undo")
            pieces = history.pop()
        elif event.action == "RESET":
            history.append(deepcopy(pieces))
            pieces = deepcopy(original)
        else:
            raise ReplayRejected("Input action does not belong to the shelves game")
        moves += 1
        if next(piece for piece in pieces if piece["id"] == "A")["x"] == 4:
            round_index += 1
            if round_index < 3:
                pieces = _stage(difficulty, round_index)
                original = deepcopy(pieces)
                history = []
    if round_index != 3:
        if timed_out:
            return ReplayResult("FAIL", moves, round_index, max_duration_ms)
        raise ReplayRejected("Input log does not clear all three shelves")
    great_limit = 3 * (10 + 3 * (difficulty - 1))
    return ReplayResult("GREAT" if moves <= great_limit else "SUCCESS",
                        moves, round_index, previous_ms)


def _pot_rng(seed: str):
    # Exact 32-bit FNV-1a + Mulberry32 used by the engine's makeRng.
    hashed = 2166136261
    for char in seed:
        if ord(char) > 127:
            raise ReplayRejected("Challenge seed must be ASCII")
        hashed = ((hashed ^ ord(char)) * 16777619) & 0xFFFFFFFF
    state = hashed or 1
    while True:
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        value = state
        value = ((value ^ (value >> 15)) * (value | 1)) & 0xFFFFFFFF
        value ^= (value + (((value ^ (value >> 7)) * (value | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        yield ((value ^ (value >> 14)) & 0xFFFFFFFF) / 4294967296


def _pot_stage(difficulty: int, seed: str) -> tuple[list[list[int]], list[tuple[int, int]]]:
    colors = difficulty + 2
    pots = [[color] * 4 for color in range(colors)] + [[], []]
    random = _pot_rng(seed + ":pots")
    reverse_solution = []
    for _ in range(12 + difficulty * 6):
        candidates = []
        for a, source in enumerate(pots):
            if not source:
                continue
            color = source[-1]
            group = 0
            for value in reversed(source):
                if value != color:
                    break
                group += 1
            for b, target in enumerate(pots):
                if a != b and len(target) < 4 and (not target or target[-1] != color):
                    for count in range(1, min(group, 4 - len(target)) + 1):
                        if count < group or group == len(source):
                            candidates.append((a, b, count))
        if not candidates:
            break
        a, b, count = candidates[int(next(random) * len(candidates))]
        pots[b].extend(pots[a][-count:])
        del pots[a][-count:]
        reverse_solution.insert(0, (b, a))
    return pots, reverse_solution


def _pour(pots: list[list[int]], source_index: int, target_index: int) -> bool:
    if source_index == target_index or not 0 <= source_index < len(pots) or not 0 <= target_index < len(pots):
        return False
    source, target = pots[source_index], pots[target_index]
    if not source or len(target) >= 4 or target and target[-1] != source[-1]:
        return False
    color = source[-1]
    group = 0
    for value in reversed(source):
        if value != color:
            break
        group += 1
    count = min(group, 4 - len(target))
    target.extend(source[-count:])
    del source[-count:]
    return True


def replay_spirit_pots(*, difficulty: int, seed: str, max_duration_ms: int,
                       events: list[ClassInput], timed_out: bool = False) -> ReplayResult:
    if (type(difficulty) is not int or not 1 <= difficulty <= 4
            or not isinstance(seed, str) or not seed or max_duration_ms != 120_000):
        raise ReplayRejected("Stored spirit-pot challenge is invalid")
    if (not events and not timed_out) or len(events) > 512:
        raise ReplayRejected("Input log is empty or too large")
    pots, solution = _pot_stage(difficulty, seed)
    great_limit = len(solution)
    previous_ms = -1
    for index, event in enumerate(events):
        if event.atMs < previous_ms or event.atMs >= max_duration_ms:
            raise ReplayRejected("Input times are unordered or outside the challenge")
        previous_ms = event.atMs
        if event.action != "POUR" or not _pour(pots, event.fromPot, event.toPot):
            raise ReplayRejected("Input attempts an illegal spirit-pot pour")
        if all(not pot or len(pot) == 4 and len(set(pot)) == 1 for pot in pots):
            if index != len(events) - 1:
                raise ReplayRejected("Input follows the completed game")
            return ReplayResult("GREAT" if len(events) <= great_limit else "SUCCESS",
                                len(events), 1, previous_ms)
    if timed_out:
        return ReplayResult("FAIL", len(events), 0, max_duration_ms)
    raise ReplayRejected("Input log does not solve the spirit pots")


def _pin_rotation(difficulty: int, elapsed_ms: int) -> float:
    seconds = elapsed_ms / 1000
    base = 0.65 + difficulty * 0.28
    if difficulty <= 2:
        return base * seconds
    if difficulty == 3:
        return base * (seconds + math.sin(seconds * 1.6) * 0.7)
    phase = seconds % 5.2
    if phase < 2:
        return base * (1 - math.cos(math.pi * phase / 2))
    if phase < 2.6:
        return 2 * base
    if phase < 4.6:
        return base * (1 + math.cos(math.pi * (phase - 2.6) / 2))
    return 0


def _fire_pin(pins: list[float], difficulty: int, elapsed_ms: int) -> bool:
    tau = math.pi * 2
    angle = ((math.pi / 2 - _pin_rotation(difficulty, elapsed_ms)) % tau + tau) % tau

    def distance(other: float) -> float:
        return abs(math.atan2(math.sin(angle - other), math.cos(angle - other)))

    if any(distance(pin) < 0.25 for pin in pins) or difficulty == 4 and distance(0) < 0.4:
        return False
    pins.append(angle)
    return True


def replay_rune_pins(*, difficulty: int, max_duration_ms: int,
                     events: list[ClassInput], timed_out: bool = False) -> ReplayResult:
    """Replay each FIRE at its logged time against the rotating pin disc."""
    if type(difficulty) is not int or not 1 <= difficulty <= 4 or max_duration_ms != 90_000:
        raise ReplayRejected("Stored rune-pin challenge is invalid")
    if (not events and not timed_out) or len(events) > 512:
        raise ReplayRejected("Input log is empty or too large")
    round_index = mistakes = 0
    round_started_ms = 0
    pins: list[float] = []
    previous_ms = -1
    for index, event in enumerate(events):
        if event.atMs < previous_ms or event.atMs >= max_duration_ms:
            raise ReplayRejected("Input times are unordered or outside the challenge")
        previous_ms = event.atMs
        if event.action != "FIRE":
            raise ReplayRejected("Input action does not belong to the rune-pin game")
        if _fire_pin(pins, difficulty, event.atMs - round_started_ms):
            if len(pins) >= 4 + difficulty + round_index:
                round_index += 1
                if round_index == 3:
                    if index != len(events) - 1:
                        raise ReplayRejected("Input follows the completed game")
                    return ReplayResult("GREAT" if mistakes <= 1 else "SUCCESS",
                                        len(events), round_index, previous_ms)
                pins = []
                round_started_ms = event.atMs
        else:
            mistakes += 1
            if mistakes >= 3:
                if index != len(events) - 1:
                    raise ReplayRejected("Input follows the failed game")
                return ReplayResult("FAIL", len(events), round_index, previous_ms)
    if timed_out:
        return ReplayResult("FAIL", len(events), round_index, max_duration_ms)
    raise ReplayRejected("Input log neither clears nor fails the rune-pin game")


_CIRCUIT_DIRS = ((0, -1, 1, 4), (1, 0, 2, 8), (0, 1, 4, 1), (-1, 0, 8, 2))
_CIRCUIT_LEVELS = (
    {"size": 4, "path": ((0, 0), (1, 0), (1, 1), (2, 1), (3, 1), (3, 2), (2, 2), (2, 3), (3, 3)),
     "fixed": (), "mandatory": None, "branchFrom": None, "branchGoal": None},
    {"size": 5, "path": ((0, 0), (1, 0), (1, 1), (2, 1), (2, 2), (1, 2), (1, 3), (2, 3),
                          (3, 3), (3, 4), (4, 4)),
     "fixed": ((1, 1),), "mandatory": None, "branchFrom": None, "branchGoal": None},
    {"size": 5, "path": ((0, 0), (1, 0), (1, 1), (2, 1), (3, 1), (3, 2), (2, 2), (2, 3),
                          (3, 3), (4, 3), (4, 4)),
     "fixed": ((3, 1),), "mandatory": (2, 2), "branchFrom": (3, 1), "branchGoal": (4, 1)},
)


def _rotate(mask: int) -> int:
    return ((mask << 1) & 15) | (mask >> 3)


def _circuit_won(board: dict) -> bool:
    size, tiles = board["size"], board["tiles"]
    start = board["start"][1] * size + board["start"][0]
    reached = {start}
    queue = [start]
    for pos in queue:
        x, y = pos % size, pos // size
        for dx, dy, out, inbound in _CIRCUIT_DIRS:
            nx, ny = x + dx, y + dy
            if not 0 <= nx < size or not 0 <= ny < size:
                continue
            neighbor = ny * size + nx
            if tiles[pos] & out and tiles[neighbor] & inbound and neighbor not in reached:
                reached.add(neighbor)
                queue.append(neighbor)
    for point in (board["goal"], board["mandatory"], board["branchGoal"]):
        if point is not None and point[1] * size + point[0] not in reached:
            return False
    return True


def _circuit_board(difficulty: int, seed: str, round_index: int) -> dict:
    level_index = 0 if difficulty == 1 else 1 if difficulty == 2 else 2
    spec = _CIRCUIT_LEVELS[level_index]
    size, path = spec["size"], spec["path"]
    random = _pot_rng(f"{seed}:{round_index}:circuit:{level_index}")
    masks = (3, 5, 6, 9, 10, 12)
    solved = [masks[int(next(random) * 6)] for _ in range(size * size)]
    for index, (x, y) in enumerate(path):
        mask = 0
        for neighbor in (path[index - 1] if index else None,
                         path[index + 1] if index + 1 < len(path) else None):
            if neighbor is not None:
                dx, dy = neighbor[0] - x, neighbor[1] - y
                mask |= next(direction[2] for direction in _CIRCUIT_DIRS
                             if direction[:2] == (dx, dy))
        solved[y * size + x] = mask
    if spec["branchGoal"] is not None:
        fx, fy = spec["branchFrom"]
        gx, gy = spec["branchGoal"]
        solved[fy * size + fx] |= next(direction[2] for direction in _CIRCUIT_DIRS
                                       if direction[:2] == (gx - fx, gy - fy))
        solved[gy * size + gx] = next(direction[2] for direction in _CIRCUIT_DIRS
                                      if direction[:2] == (fx - gx, fy - gy))
    start, goal = path[0], path[-1]
    fixed = {start, goal, *spec["fixed"]}
    if spec["branchGoal"] is not None:
        fixed.add(spec["branchGoal"])
    tiles = []
    for cell, mask in enumerate(solved):
        if (cell % size, cell // size) not in fixed:
            for _ in range(int(next(random) * 4)):
                mask = _rotate(mask)
        tiles.append(mask)
    board = {"size": size, "tiles": tiles, "solved": solved, "start": start,
             "goal": goal, "mandatory": spec["mandatory"],
             "branchGoal": spec["branchGoal"],
             "fixed": fixed}
    if _circuit_won(board):
        x, y = path[1]
        pos = y * size + x
        tiles[pos] = _rotate(tiles[pos])
    if difficulty == 3:
        board["branchGoal"] = None
    return board


def replay_rune_circuit(*, difficulty: int, seed: str, max_duration_ms: int,
                        events: list[ClassInput], timed_out: bool = False) -> ReplayResult:
    if (type(difficulty) is not int or not 1 <= difficulty <= 4
            or not isinstance(seed, str) or not seed or max_duration_ms != 120_000):
        raise ReplayRejected("Stored rune-circuit challenge is invalid")
    if (not events and not timed_out) or len(events) > 512:
        raise ReplayRejected("Input log is empty or too large")
    round_index = 0
    board = _circuit_board(difficulty, seed, round_index)
    previous_ms = -1
    for index, event in enumerate(events):
        if event.atMs < previous_ms or event.atMs >= max_duration_ms:
            raise ReplayRejected("Input times are unordered or outside the challenge")
        previous_ms = event.atMs
        if event.action != "ROTATE":
            raise ReplayRejected("Input action does not belong to the rune-circuit game")
        cell = event.cellIndex
        size = board["size"]
        if cell >= size * size or (cell % size, cell // size) in board["fixed"]:
            raise ReplayRejected("Input rotates a fixed or nonexistent circuit cell")
        board["tiles"][cell] = _rotate(board["tiles"][cell])
        if _circuit_won(board):
            round_index += 1
            if round_index == 3:
                if index != len(events) - 1:
                    raise ReplayRejected("Input follows the completed game")
                return ReplayResult("GREAT" if event.atMs <= max_duration_ms - 20_000
                                    else "SUCCESS", len(events), round_index, previous_ms)
            board = _circuit_board(difficulty, seed, round_index)
    if timed_out:
        return ReplayResult("FAIL", len(events), round_index, max_duration_ms)
    raise ReplayRejected("Input log does not clear all three circuits")


_MIRROR_LEVELS = (
    {"source": (0, 2), "goal": (3, 0), "mirrors": ((3, 2),), "blocks": ((5, 2),)},
    {"source": (0, 4), "goal": (6, 1), "mirrors": ((2, 4), (2, 1), (5, 4)),
     "blocks": ((4, 4), (4, 2))},
    {"source": (0, 5), "goal": (5, 4),
     "mirrors": ((2, 5), (2, 1), (5, 1), (4, 3)),
     "blocks": ((4, 5), (6, 2)), "rune": (2, 3), "prism": (2, 3),
     "secondaryGoal": (4, 0)},
)


def _mirror_success(level: dict, orientations: list[str]) -> bool:
    mirrors = dict(zip(level["mirrors"], orientations, strict=True))
    blocks = set(level["blocks"])
    sx, sy = level["source"]
    rays = [{"x": sx, "y": sy, "dx": 1, "dy": 0, "split": False}]
    reached = set()
    rune_visited = False
    for ray in rays:
        states = set()
        x, y, dx, dy = ray["x"], ray["y"], ray["dx"], ray["dy"]
        for _ in range(7 * 6 * 4):
            state = (x, y, dx, dy)
            if state in states:
                break
            states.add(state)
            x += dx
            y += dy
            if not 0 <= x < 7 or not 0 <= y < 6 or (x, y) in blocks:
                break
            if (x, y) == level.get("rune"):
                rune_visited = True
            if (x, y) == level.get("prism") and not ray["split"]:
                rays.append({"x": x, "y": y, "dx": -dy, "dy": dx, "split": True})
                ray["split"] = True
            if (x, y) == level["goal"]:
                reached.add("primary")
                break
            if (x, y) == level.get("secondaryGoal"):
                reached.add("secondary")
                break
            orientation = mirrors.get((x, y))
            if orientation == "/":
                dx, dy = -dy, -dx
            elif orientation == "\\":
                dx, dy = dy, dx
    return ("primary" in reached
            and (level.get("secondaryGoal") is None or "secondary" in reached)
            and (level.get("rune") is None or rune_visited))


def _mirror_stage(difficulty: int, seed: str, round_index: int) -> tuple[dict, list[str], list[str]]:
    level = deepcopy(_MIRROR_LEVELS[0 if difficulty == 1 else 1 if difficulty == 2 else 2])
    if difficulty == 1:
        level["blocks"] = ()
    if difficulty == 3:
        level["prism"] = None
        level["secondaryGoal"] = None
    solution = None
    for mask in range(1 << len(level["mirrors"])):
        candidate = ["/" if mask & (1 << index) else "\\"
                     for index in range(len(level["mirrors"]))]
        if _mirror_success(level, candidate):
            solution = candidate
            break
    if solution is None:
        raise ReplayRejected("Server mirror master has no verified solution")
    random = _pot_rng(f"{seed}:mirror:{round_index}")
    orientations = [value if next(random) < 0.5 else ("\\" if value == "/" else "/")
                    for value in solution]
    if _mirror_success(level, orientations):
        orientations[0] = "\\" if orientations[0] == "/" else "/"
    return level, orientations, solution


def replay_observatory_mirror(*, difficulty: int, seed: str, max_duration_ms: int,
                              events: list[ClassInput], timed_out: bool = False) -> ReplayResult:
    if (type(difficulty) is not int or not 1 <= difficulty <= 4
            or not isinstance(seed, str) or not seed or max_duration_ms != 120_000):
        raise ReplayRejected("Stored mirror challenge is invalid")
    if (not events and not timed_out) or len(events) > 512:
        raise ReplayRejected("Input log is empty or too large")
    round_index = 0
    level, orientations, _ = _mirror_stage(difficulty, seed, round_index)
    previous_ms = -1
    for index, event in enumerate(events):
        if event.atMs < previous_ms or event.atMs >= max_duration_ms:
            raise ReplayRejected("Input times are unordered or outside the challenge")
        previous_ms = event.atMs
        if event.action != "TOGGLE" or event.mirrorIndex >= len(orientations):
            raise ReplayRejected("Input toggles a nonexistent mirror")
        mirror_index = event.mirrorIndex
        orientations[mirror_index] = "\\" if orientations[mirror_index] == "/" else "/"
        if _mirror_success(level, orientations):
            round_index += 1
            if round_index == 3:
                if index != len(events) - 1:
                    raise ReplayRejected("Input follows the completed game")
                return ReplayResult("GREAT" if event.atMs <= max_duration_ms - 20_000
                                    else "SUCCESS", len(events), round_index, previous_ms)
            level, orientations, _ = _mirror_stage(difficulty, seed, round_index)
    if timed_out:
        return ReplayResult("FAIL", len(events), round_index, max_duration_ms)
    raise ReplayRejected("Input log does not clear all three mirrors")


def _rhythm_pattern(difficulty: int, seed: str, duration_ms: int) -> tuple[int, list[dict]]:
    random = _pot_rng(seed + ":rhythm")
    lanes = 2 if difficulty == 1 else 3
    beat = 60_000 / (72 + difficulty * 12)
    notes = []
    at = 1500.0
    index = 0
    while at < duration_ms - 1800:
        lane = int(next(random) * lanes)
        hold = beat * 0.8 if difficulty >= 3 and index % 9 == 5 else 0.0
        notes.append({"lane": lane, "at": at, "hold": hold,
                      "pressed": False, "hit": False, "missed": False})
        if difficulty >= 3 and index % 7 == 3:
            notes.append({"lane": (lane + 1) % lanes, "at": at + beat * 0.45,
                          "hold": 0.0, "pressed": False, "hit": False, "missed": False})
        if difficulty == 4 and index % 11 == 7:
            notes.append({"lane": (lane + 1) % lanes, "at": at,
                          "hold": 0.0, "pressed": False, "hit": False, "missed": False})
        if difficulty == 4 and 25_000 <= at < 45_000:
            at -= beat * 0.25
        at += beat
        index += 1
    return lanes, notes


def _expire_rhythm(notes: list[dict], at_ms: int) -> None:
    for note in notes:
        if not note["hit"] and not note["pressed"] and at_ms > note["at"] + 160:
            note["missed"] = True
        if note["pressed"] and at_ms > note["at"] + note["hold"] + 500:
            note["pressed"] = False
            note["missed"] = True


def replay_starlight_stage(*, difficulty: int, seed: str, max_duration_ms: int,
                           events: list[ClassInput]) -> ReplayResult:
    if (type(difficulty) is not int or not 1 <= difficulty <= 4
            or not isinstance(seed, str) or not seed or max_duration_ms != 75_000):
        raise ReplayRejected("Stored rhythm challenge is invalid")
    if len(events) > 512:
        raise ReplayRejected("Input log is too large")
    lanes, notes = _rhythm_pattern(difficulty, seed, max_duration_ms)
    previous_ms = -1
    extras = 0
    for event in events:
        if event.atMs < previous_ms or event.atMs >= max_duration_ms:
            raise ReplayRejected("Input times are unordered or outside the challenge")
        previous_ms = event.atMs
        if event.action not in {"PRESS", "RELEASE"} or event.lane >= lanes:
            raise ReplayRejected("Input action or lane does not belong to the rhythm game")
        _expire_rhythm(notes, event.atMs)
        if event.action == "RELEASE":
            note = next((note for note in notes if note["lane"] == event.lane
                         and note["pressed"] and not note["hit"]), None)
            if note is None:
                continue  # Phaser ignores release when no hold is active.
            note["hit"] = event.atMs >= note["at"] + note["hold"] - 140
            note["missed"] = not note["hit"]
            note["pressed"] = False
        else:
            candidates = [note for note in notes if note["lane"] == event.lane
                          and not note["hit"] and not note["missed"] and not note["pressed"]
                          and abs(note["at"] - event.atMs) <= 160]
            if not candidates:
                extras += 1
            else:
                note = min(candidates, key=lambda item: abs(item["at"] - event.atMs))
                if note["hold"]:
                    note["pressed"] = True
                else:
                    note["hit"] = True
    _expire_rhythm(notes, max_duration_ms)
    hits = sum(note["hit"] for note in notes)
    total = len(notes) + extras
    accuracy = hits / total if total else 0
    resolution = "GREAT" if accuracy >= 0.9 else "SUCCESS" if accuracy >= 0.65 else "FAIL"
    return ReplayResult(resolution, len(events), 0, max_duration_ms)

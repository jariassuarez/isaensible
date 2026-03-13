from __future__ import annotations

import json
from pathlib import Path

from app.config import settings

_NOTES_FILE = Path(settings.hosts_file).parent / "notes.json"


def load_notes() -> dict:
    if _NOTES_FILE.exists():
        return json.loads(_NOTES_FILE.read_text())
    return {}


def get_note(address: str) -> str:
    return load_notes().get(address, "")


def save_note(address: str, note: str) -> None:
    notes = load_notes()
    if note.strip():
        notes[address] = note.strip()
    else:
        notes.pop(address, None)
    _NOTES_FILE.write_text(json.dumps(notes, indent=2))

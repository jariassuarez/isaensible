from __future__ import annotations

from pydantic import BaseModel


class Host(BaseModel):
    name: str
    address: str
    label: str = ""


class HostStatus(BaseModel):
    name: str
    address: str
    label: str
    online: bool


class HostMetrics(BaseModel):
    address: str
    available: bool = True
    cpu: float = 0.0
    mem: float = 0.0
    disk: float = 0.0


class HostUploadResult(BaseModel):
    address: str
    ok: bool
    error: str = ""


class FileEntry(BaseModel):
    name: str
    path: str
    is_dir: bool
    size: int | None = None
    modified: int | None = None  # Unix timestamp

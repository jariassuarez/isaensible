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


class BulkCommandRequest(BaseModel):
    addresses: list[str]
    command: str


class HostCommandResult(BaseModel):
    address: str
    exit_status: int = 0
    stdout: str = ""
    stderr: str = ""
    error: str = ""


class HostUploadResult(BaseModel):
    address: str
    ok: bool
    error: str = ""

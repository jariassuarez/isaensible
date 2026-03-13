from __future__ import annotations

import stat as stat_module
from pathlib import Path

import asyncssh

from app.config import settings


def _connect_kwargs() -> dict:
    kwargs: dict = {
        "username": settings.ssh_user,
        "port": settings.ssh_port,
        "known_hosts": settings.ssh_known_hosts or None,
    }

    key_path = Path(settings.ssh_key_path).expanduser()
    if key_path.exists():
        kwargs["client_keys"] = [str(key_path)]

    if settings.ssh_password:
        kwargs["password"] = settings.ssh_password

    return kwargs


async def run_command(
    address: str, command: str, env: dict | None = None
) -> tuple[int, str, str]:
    async with asyncssh.connect(address, **_connect_kwargs()) as conn:
        result = await conn.run(command, check=False, env=env or {})
        return result.exit_status or 0, result.stdout or "", result.stderr or ""


async def push_public_key(address: str, public_key: str) -> None:
    async with asyncssh.connect(address, **_connect_kwargs()) as conn:
        await conn.run("mkdir -p ~/.ssh && chmod 700 ~/.ssh", check=True)
        await conn.run(
            'grep -qxF -- "$KEY" ~/.ssh/authorized_keys 2>/dev/null'
            ' || echo "$KEY" >> ~/.ssh/authorized_keys'
            " && chmod 600 ~/.ssh/authorized_keys",
            env={"KEY": public_key.strip()},
            check=True,
        )


async def upload_file(address: str, data: bytes, remote_path: str) -> None:
    async with asyncssh.connect(address, **_connect_kwargs()) as conn:
        async with conn.start_sftp_client() as sftp:
            async with sftp.open(remote_path, "wb") as f:
                await f.write(data)


async def list_directory(address: str, path: str) -> dict:
    async with asyncssh.connect(address, **_connect_kwargs()) as conn:
        async with conn.start_sftp_client() as sftp:
            resolved = await sftp.realpath(path if path != "~" else ".")
            entries = await sftp.readdir(resolved)
            result = []
            for entry in entries:
                if entry.filename in (".", ".."):
                    continue
                attrs = entry.attrs
                is_dir = bool(attrs.permissions and stat_module.S_ISDIR(attrs.permissions))
                result.append({
                    "name": entry.filename,
                    "path": resolved.rstrip("/") + "/" + entry.filename,
                    "is_dir": is_dir,
                    "size": None if is_dir else attrs.size,
                    "modified": attrs.mtime,
                })
            result.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
            return {"path": resolved, "entries": result}


async def download_file(address: str, remote_path: str) -> bytes:
    async with asyncssh.connect(address, **_connect_kwargs()) as conn:
        async with conn.start_sftp_client() as sftp:
            async with sftp.open(remote_path, "rb") as f:
                return await f.read()


async def delete_file(address: str, remote_path: str) -> None:
    async with asyncssh.connect(address, **_connect_kwargs()) as conn:
        async with conn.start_sftp_client() as sftp:
            await sftp.remove(remote_path)


def connect_kwargs() -> dict:
    return _connect_kwargs()

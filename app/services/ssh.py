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


async def upload_file(address: str, data: bytes, remote_path: str) -> None:
    async with asyncssh.connect(address, **_connect_kwargs()) as conn:
        async with conn.start_sftp_client() as sftp:
            async with sftp.open(remote_path, "wb") as f:
                await f.write(data)


def connect_kwargs() -> dict:
    return _connect_kwargs()

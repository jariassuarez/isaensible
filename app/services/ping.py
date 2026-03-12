import asyncio

from app.config import settings


async def ping_host(address: str) -> bool:
    proc = await asyncio.create_subprocess_exec(
        "ping",
        "-c", str(settings.ping_count),
        "-W", str(settings.ping_timeout),
        address,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()
    return proc.returncode == 0

import base64
import json

import asyncssh

from app.models import HostMetrics
from app.services.ssh import connect_kwargs

_SCRIPT = b"""
import os, json
load1 = float(open('/proc/loadavg').read().split()[0])
ncpu = os.cpu_count() or 1
cpu = round(min(load1 / ncpu * 100, 100.0), 1)
m = {l.split(':')[0]: int(l.split()[1]) for l in open('/proc/meminfo') if ':' in l}
mem = round(100 * (1 - m['MemAvailable'] / m['MemTotal']), 1)
v = os.statvfs('/')
disk = round(100 * (1 - v.f_bavail / v.f_blocks), 1)
print(json.dumps({'cpu': cpu, 'mem': mem, 'disk': disk}))
"""

_ENCODED = base64.b64encode(_SCRIPT.strip()).decode()
_CMD = f"python3 -c \"import base64; exec(base64.b64decode('{_ENCODED}').decode())\""


async def fetch_metrics(address: str) -> HostMetrics:
    try:
        async with asyncssh.connect(address, **connect_kwargs()) as conn:
            result = await conn.run(_CMD, timeout=10)
            data = json.loads(result.stdout)
            return HostMetrics(
                address=address,
                cpu=data["cpu"],
                mem=data["mem"],
                disk=data["disk"],
            )
    except Exception:
        return HostMetrics(address=address, available=False)

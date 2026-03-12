from __future__ import annotations

from app.config import settings
from app.models import Host


def load_hosts() -> list[Host]:
    hosts: list[Host] = []
    path = settings.hosts_file

    if not path.exists():
        return hosts

    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        parts = line.split(None, 2)
        if len(parts) == 1:
            hosts.append(Host(name=parts[0], address=parts[0]))
        elif len(parts) >= 2:
            label = parts[2] if len(parts) > 2 else ""
            hosts.append(Host(name=parts[0], address=parts[1], label=label))

    return hosts

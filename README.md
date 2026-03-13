# ISAEnsible

Web dashboard for managing a cluster of Ubuntu servers on a closed network.

## Features

- Live ping status (green/red) for each host, polled automatically
- Host metrics (CPU, RAM, Disk usage) fetched via SSH, polled automatically
- Web-based SSH terminal per host
- Multi-host Cluster SSH — open a split terminal for selected hosts simultaneously
- File upload to any host via SFTP (single or bulk)
- Bulk SSH key push to selected hosts
- Per-host notes
- Reboot / Shutdown actions per host
- Label-based grouping with filter pills and group-level checkboxes
- Select All / Deselect All with per-group support; hosts labelled `{exclude}` or `[exclude]` are skipped by Select All

## Install

```bash
./fetch_xterm.sh          # bundle xterm.js into the package (run once, requires internet)
pip install .
```

Or in development mode:

```bash
pip install -e .
```

## Run

```bash
cp .env.example .env      # edit to match your environment
isaensible                # starts on 0.0.0.0:8000
isaensible --host 127.0.0.1 --port 9000
isaensible --reload       # auto-reload for development
```

Or directly:

```bash
python -m app
```

## hosts.txt

One host per line: `name address [optional label]`

```
web01   192.168.1.10
db01    192.168.1.11  Database Primary
proxy   192.168.1.12  Reverse Proxy
old01   192.168.1.20  Legacy {exclude}
```

Hosts whose label contains `{exclude}` or `[exclude]` are displayed normally but skipped when using **Select All**.

## Configuration

All options are set via `.env` or environment variables. See `.env.example` for the full list.

| Variable          | Default           | Description                              |
|-------------------|-------------------|------------------------------------------|
| `HOSTS_FILE`      | `hosts.txt`       | Path to the hosts file                   |
| `SSH_USER`        | `ubuntu`          | SSH username                             |
| `SSH_KEY_PATH`    | `~/.ssh/id_rsa`   | Private key for SSH/SFTP                 |
| `SSH_PORT`        | `22`              | SSH port                                 |
| `SSH_PASSWORD`    |                   | Password auth (key-based preferred)      |
| `SSH_KNOWN_HOSTS` |                   | Path to known_hosts; empty skips check   |
| `POLL_INTERVAL`   | `10`              | Status poll frequency in seconds         |
| `METRICS_INTERVAL`| `30`              | Metrics poll frequency in seconds        |

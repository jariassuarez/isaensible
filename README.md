# ISAEnsible

Web dashboard for managing a cluster of Ubuntu servers on a closed network.

## Features

- Live ping status (green/red) for each host, polled automatically
- Web-based SSH terminal per host
- File upload to any host via SFTP

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
```

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

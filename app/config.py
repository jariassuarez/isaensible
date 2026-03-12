from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    hosts_file: Path = Path("hosts.txt")

    ssh_user: str = "ubuntu"
    ssh_key_path: str = "~/.ssh/id_rsa"
    ssh_port: int = 22
    ssh_password: str = ""
    ssh_known_hosts: str = ""

    ping_timeout: int = 2
    ping_count: int = 1

    poll_interval: int = 10


settings = Settings()

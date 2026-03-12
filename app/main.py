from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.paths import STATIC_DIR
from app.routers import hosts, terminal

app = FastAPI(title="ISAensible", description="Cluster management dashboard")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(hosts.router)
app.include_router(terminal.router)

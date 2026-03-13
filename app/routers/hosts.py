import asyncio
from typing import List

from fastapi import APIRouter, Body, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from app.config import settings
from app.models import HostMetrics, HostStatus, HostUploadResult
from app.paths import TEMPLATES_DIR
from app.services.hosts import load_hosts
from app.services.metrics import fetch_metrics
from app.services.notes import get_note, load_notes, save_note
from app.services.ping import ping_host
from app.services.ssh import push_public_key, run_command, upload_file

router = APIRouter()
templates = Jinja2Templates(directory=TEMPLATES_DIR)


@router.get("/", response_class=HTMLResponse)
async def index(request: Request):
    hosts = load_hosts()
    notes = load_notes()
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "hosts": hosts,
            "hosts_json": [h.model_dump() for h in hosts],
            "notes": notes,
            "poll_interval": settings.poll_interval,
            "metrics_interval": settings.metrics_interval,
        },
    )


@router.get("/api/hosts/status", response_model=List[HostStatus])
async def hosts_status():
    hosts = load_hosts()
    results = await asyncio.gather(*[ping_host(h.address) for h in hosts])
    return [
        HostStatus(name=h.name, address=h.address, label=h.label, online=online)
        for h, online in zip(hosts, results)
    ]


@router.get("/api/hosts/metrics", response_model=List[HostMetrics])
async def hosts_metrics():
    hosts = load_hosts()
    return await asyncio.gather(*[fetch_metrics(h.address) for h in hosts])


@router.post("/api/hosts/{address}/reboot")
async def reboot_host(address: str):
    try:
        await run_command(address, "sudo reboot")
    except Exception as exc:
        return JSONResponse(status_code=502, content={"detail": str(exc)})
    return {"status": "ok"}


@router.post("/api/hosts/{address}/shutdown")
async def shutdown_host(address: str):
    try:
        await run_command(address, "sudo shutdown -h now")
    except Exception as exc:
        return JSONResponse(status_code=502, content={"detail": str(exc)})
    return {"status": "ok"}


@router.get("/api/hosts/{address}/note")
async def get_host_note(address: str):
    return {"address": address, "note": get_note(address)}


@router.put("/api/hosts/{address}/note")
async def put_host_note(address: str, note: str = Body(..., embed=True)):
    save_note(address, note)
    return {"address": address, "note": note}


@router.post("/api/hosts/bulk/push-key", response_model=List[HostUploadResult])
async def bulk_push_key(
    addresses: List[str] = Form(...),
    public_key: str = Form(...),
):
    async def _push(address: str) -> HostUploadResult:
        try:
            await push_public_key(address, public_key)
            return HostUploadResult(address=address, ok=True)
        except Exception as exc:
            return HostUploadResult(address=address, ok=False, error=str(exc))

    return await asyncio.gather(*[_push(addr) for addr in addresses])


@router.post("/api/hosts/bulk/upload", response_model=List[HostUploadResult])
async def bulk_upload(
    addresses: List[str] = Form(...),
    remote_path: str = Form(...),
    file: UploadFile = File(...),
):
    data = await file.read()

    async def _upload(address: str) -> HostUploadResult:
        try:
            await upload_file(address, data, remote_path)
            return HostUploadResult(address=address, ok=True)
        except Exception as exc:
            return HostUploadResult(address=address, ok=False, error=str(exc))

    return await asyncio.gather(*[_upload(addr) for addr in addresses])

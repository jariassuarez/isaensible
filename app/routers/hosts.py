import asyncio
from typing import List

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.config import settings
from app.models import HostStatus, HostUploadResult
from app.paths import TEMPLATES_DIR
from app.services.hosts import load_hosts
from app.services.ping import ping_host
from app.services.ssh import upload_file

router = APIRouter()
templates = Jinja2Templates(directory=TEMPLATES_DIR)


@router.get("/", response_class=HTMLResponse)
async def index(request: Request):
    hosts = load_hosts()
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "hosts": hosts,
            "hosts_json": [h.model_dump() for h in hosts],
            "poll_interval": settings.poll_interval,
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

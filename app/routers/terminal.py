import asyncio
import json

import asyncssh
from fastapi import APIRouter, File, Form, Request, UploadFile, WebSocket
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from app.paths import TEMPLATES_DIR
from app.services.ssh import connect_kwargs, upload_file

router = APIRouter()
templates = Jinja2Templates(directory=TEMPLATES_DIR)


@router.get("/terminal/multi", response_class=HTMLResponse)
async def multi_terminal_page(request: Request, hosts: str = ""):
    addresses = [a.strip() for a in hosts.split(",") if a.strip()]
    return templates.TemplateResponse(
        "multi_terminal.html",
        {"request": request, "addresses": addresses},
    )


@router.get("/terminal/{address}", response_class=HTMLResponse)
async def terminal_page(request: Request, address: str):
    return templates.TemplateResponse(
        "terminal.html",
        {"request": request, "address": address},
    )


@router.websocket("/ws/terminal/{address}")
async def terminal_ws(websocket: WebSocket, address: str):
    await websocket.accept()

    try:
        async with asyncssh.connect(address, **connect_kwargs()) as conn:
            async with conn.create_process(
                request_pty=True,
                term_type="xterm-256color",
                term_size=(80, 24),
                encoding=None,
            ) as proc:

                async def ws_to_ssh():
                    while True:
                        msg = await websocket.receive()
                        if msg["type"] == "websocket.disconnect":
                            break
                        if msg.get("bytes"):
                            proc.stdin.write(msg["bytes"])
                        elif msg.get("text"):
                            try:
                                data = json.loads(msg["text"])
                                if data.get("type") == "resize":
                                    proc.change_terminal_size(data["cols"], data["rows"])
                            except (json.JSONDecodeError, KeyError):
                                proc.stdin.write(msg["text"].encode())

                async def ssh_to_ws():
                    async for chunk in proc.stdout:
                        await websocket.send_bytes(chunk)

                tasks = [
                    asyncio.create_task(ws_to_ssh()),
                    asyncio.create_task(ssh_to_ws()),
                ]
                _, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                for task in pending:
                    task.cancel()

    except asyncssh.Error as exc:
        try:
            await websocket.send_text(f"\r\nSSH error: {exc}\r\n")
        except Exception:
            pass
    except Exception as exc:
        try:
            await websocket.send_text(f"\r\nConnection error: {exc}\r\n")
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


@router.post("/api/hosts/{address}/upload")
async def upload_to_host(
    address: str,
    remote_path: str = Form(...),
    file: UploadFile = File(...),
):
    data = await file.read()
    try:
        await upload_file(address, data, remote_path)
    except asyncssh.Error as exc:
        return JSONResponse(status_code=502, content={"detail": str(exc)})
    except Exception as exc:
        return JSONResponse(status_code=500, content={"detail": str(exc)})
    return {"filename": file.filename, "remote_path": remote_path, "bytes": len(data)}

from pydantic import BaseModel


class Host(BaseModel):
    name: str
    address: str
    label: str = ""


class HostStatus(BaseModel):
    name: str
    address: str
    label: str
    online: bool

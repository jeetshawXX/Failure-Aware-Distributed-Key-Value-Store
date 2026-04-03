from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
from pathlib import Path

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent.parent
CLIENT_PATH = BASE_DIR / "core" / "client"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------- MODELS -----------

class KVRequest(BaseModel):
    op: str
    key: str
    value: str = ""

# ----------- RUN CLIENT -----------

def run_client(cmd: str):
    if not CLIENT_PATH.exists():
        raise RuntimeError("client binary not found")

    process = subprocess.run(
        [str(CLIENT_PATH)],
        input=cmd + "\nEXIT\n",
        capture_output=True,
        text=True,
        cwd=CLIENT_PATH.parent
    )

    output = process.stdout.strip()

    if not output:
        raise RuntimeError("empty response from KV system")

    return output.split("\n")[-1]   # take last line only

# ----------- API -----------

@app.post("/kv")
def kv(req: KVRequest):
    if req.op == "PUT":
        cmd = f"PUT {req.key} {req.value}"
    elif req.op == "GET":
        cmd = f"GET {req.key}"
    else:
        raise HTTPException(400, "Invalid operation")

    try:
        result = run_client(cmd)
    except Exception as e:
        raise HTTPException(500, str(e))

    if result == "NOT_LEADER":
        raise HTTPException(503, "Request hit follower, retry")

    if result == "WRITE_FAILED":
        raise HTTPException(500, "Replication failed")

    return {"result": result}

# ----------- STATUS -----------

nodes = {
    "node1": True,
    "node2": True,
    "node3": True
}

@app.get("/status")
def status():
    return nodes

@app.post("/node/{node}/toggle")
def toggle(node: str):
    if node not in nodes:
        raise HTTPException(404, "Node not found")

    nodes[node] = not nodes[node]
    return nodes
from enum import Enum
from pathlib import Path
import subprocess

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware


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

class Operation(str, Enum):
    PUT = "PUT"
    GET = "GET"


class KVRequest(BaseModel):
    op: Operation
    key: str = Field(min_length=1)
    value: str = ""


def run_client(command: str):
    if not CLIENT_PATH.is_file():
        raise RuntimeError(f"Storage client binary not found at {CLIENT_PATH}")

    try:
        process = subprocess.run(
            [str(CLIENT_PATH)],
            input=command + "\nEXIT\n",
            capture_output=True,
            cwd=CLIENT_PATH.parent,   # FIX HERE
            text=True,
            timeout=5,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("Storage client timed out") from exc

    if process.returncode != 0:
        stderr = process.stderr.strip() or f"Storage client exited with code {process.returncode}"
        raise RuntimeError(stderr)

    print("OUTPUT:", process.stdout)   # ADD THIS DEBUG

    return process.stdout.strip()


@app.post("/kv")
def kv(req: KVRequest):
    if req.op == Operation.PUT:
        cmd = f"PUT {req.key} {req.value}"
    else:
        cmd = f"GET {req.key}"


    # simulate quorum / availability
    if not any(nodes.values()):
        raise HTTPException(status_code=503, detail="All nodes are down")

    try:
        result = run_client(cmd)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if result == "NOT_FOUND":
        raise HTTPException(status_code=404, detail=f"Key '{req.key}' not found")

    if result == "NODE_DOWN":
        raise HTTPException(status_code=503, detail="Storage replicas are unavailable")

    if not result:
        raise HTTPException(status_code=502, detail="Storage client returned an empty response")

    return {
        "result": result
    }

@app.get("/health")
def health():
    return {"status": "running"}


# simulate node states
nodes = {
    "node1": True,
    "node2": True,
    "node3": True
}

@app.get("/status")
def status():
    return nodes


@app.post("/node/{node_id}/toggle")
def toggle_node(node_id: str):
    if node_id not in nodes:
        raise HTTPException(status_code=404, detail="Node not found")

    nodes[node_id] = not nodes[node_id]
    return {
        "node": node_id,
        "status": nodes[node_id]
    }

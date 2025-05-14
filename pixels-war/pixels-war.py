from uuid import uuid4
from fastapi import Cookie, FastAPI, Query, Body
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import time
from copy import deepcopy

app = FastAPI()

app.mount("/", StaticFiles(directory="frontend", html=True), name="static")

class UserInfo:
    def __init__(self, data_snapshot):
        self.last_seen_map = deepcopy(data_snapshot)

class Carte:
    def __init__(self, nx, ny, timeout_nanos=1_000_000_000):
        self.keys = set()
        self.user_ids = set()
        self.nx = nx
        self.ny = ny
        self.data = [[(0, 0, 0) for _ in range(ny)] for _ in range(nx)]
        self.timeout_nanos = timeout_nanos
        self.last_pixel_time = {}  # user_id -> timestamp ns
        self.user_infos = {}  # user_id -> UserInfo

    def create_new_key(self):
        key = str(uuid4())
        self.keys.add(key)
        return key

    def is_valid_key(self, key):
        return key in self.keys

    def create_new_user_id(self):
        user_id = str(uuid4())
        self.user_ids.add(user_id)
        self.user_infos[user_id] = UserInfo(self.data)
        return user_id

    def is_valid_user_id(self, user_id):
        return user_id in self.user_ids

    def is_allowed(self, user_id):
        now = time.time_ns()
        last = self.last_pixel_time.get(user_id, 0)
        if now - last >= self.timeout_nanos:
            self.last_pixel_time[user_id] = now
            return True
        return False

    def place_pixel(self, x: int, y: int, color: tuple[int, int, int]):
        if 0 <= x < self.nx and 0 <= y < self.ny:
            self.data[x][y] = color
            return True
        return False

cartes = {
    "0000": Carte(nx=10, ny=10, timeout_nanos=1_000_000_000)
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:8000"],
    allow_credentials=True
)

@app.get("/api/v1/{carte}/preinit")
async def preinit(carte: str):
    if carte not in cartes:
        return JSONResponse({"error": "Map not found."}, status_code=404)
    key = cartes[carte].create_new_key()
    res = JSONResponse({"key": key})
    res.set_cookie("key", key, secure=True, samesite="none", max_age=3600)
    return res

@app.get("/api/v1/{carte}/init")
async def init(
    carte: str,
    query_key: str = Query(default=None, alias="key"),
    cookie_key: str = Cookie(default=None, alias="key")
):
    if carte not in cartes:
        return JSONResponse({"error": "Map not found."}, status_code=404)

    map_instance = cartes[carte]

    if query_key != cookie_key or not map_instance.is_valid_key(cookie_key):
        return JSONResponse({"error": "Key mismatch or invalid."}, status_code=403)

    user_id = map_instance.create_new_user_id()
    res = JSONResponse({
        "id": user_id,
        "nx": map_instance.nx,
        "ny": map_instance.ny,
        "timeout": map_instance.timeout_nanos,
        "data": map_instance.data
    })
    res.set_cookie("id", user_id, secure=True, samesite="none", max_age=3600)
    return res

@app.post("/api/v1/{carte}/pixel")
async def place_pixel(
    carte: str,
    user_id: str = Cookie(alias="id"),
    payload: dict = Body(...)
):
    if carte not in cartes:
        return JSONResponse({"error": "Map not found."}, status_code=404)

    x = payload.get("x")
    y = payload.get("y")
    color = payload.get("color")  # [r, g, b]

    if not all(isinstance(i, int) for i in [x, y]) or not isinstance(color, list) or len(color) != 3:
        return JSONResponse({"error": "Invalid payload."}, status_code=400)

    map_instance = cartes[carte]

    if not map_instance.is_valid_user_id(user_id):
        return JSONResponse({"error": "Invalid user id."}, status_code=403)

    if not map_instance.is_allowed(user_id):
        return JSONResponse({"error": "Wait before placing again."}, status_code=429)

    if not map_instance.place_pixel(x, y, tuple(color)):
        return JSONResponse({"error": "Invalid coordinates."}, status_code=400)

    return {"status": "ok", "x": x, "y": y, "color": color}

@app.get("/api/v1/{carte}/deltas")
async def get_deltas(
    carte: str,
    user_id: str = Cookie(alias="id")
):
    if carte not in cartes:
        return JSONResponse({"error": "Map not found."}, status_code=404)

    map_instance = cartes[carte]

    if not map_instance.is_valid_user_id(user_id):
        return JSONResponse({"error": "Invalid user id."}, status_code=403)

    user_info = map_instance.user_infos[user_id]
    last_map = user_info.last_seen_map
    current_map = map_instance.data

    deltas = []
    for x in range(map_instance.nx):
        for y in range(map_instance.ny):
            if current_map[x][y] != last_map[x][y]:
                deltas.append([x, y, *current_map[x][y]])

    # Mettre à jour la carte vue
    user_info.last_seen_map = deepcopy(current_map)

    return {
        "id": user_id,
        "deltas": deltas
    }

@app.get("/api/v1/{carte}/state")
async def get_canvas(carte: str):
    if carte not in cartes:
        return JSONResponse({"error": "Map not found."}, status_code=404)

    map_instance = cartes[carte]
    return {
        "nx": map_instance.nx,
        "ny": map_instance.ny,
        "data": map_instance.data
    }

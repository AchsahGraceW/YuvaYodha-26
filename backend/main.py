from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI(title="EcoGrid AI Simulation Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "EcoGrid AI Engine Running", "version": "1.0.4"}

@app.get("/api/telemetry")
def get_telemetry():
    solar_gen = round(random.uniform(480.0, 560.0), 1)
    grid_load = round(random.uniform(290.0, 340.0), 1)
    bess_soc = round(random.uniform(82.0, 95.0), 1)
    carbon_saved = round(1400 + (solar_gen * 0.05), 1)

    return {
        "solar_kw": solar_gen,
        "load_kw": grid_load,
        "bess_soc_pct": bess_soc,
        "carbon_offset_kg": carbon_saved,
        "status": "OPTIMAL",
        "peak_shaving_active": True
    }

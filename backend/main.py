from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import random
import threading

app = FastAPI(title="EcoGrid AI Simulation Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simulated Battery State (BESS)
bess_state = {
    "capacity_kwh": 500.0,
    "current_charge_kwh": 400.0,  # Starts at 80% SoC
    "max_discharge_kw": 100.0,
    "max_charge_kw": 100.0,
    "discom_override_mode": "AUTO"
}

# Thread lock for state safety
state_lock = threading.Lock()

@app.get("/")
def read_root():
    return {"status": "EcoGrid AI Engine Running", "version": "1.3.0"}

@app.get("/api/telemetry")
def get_telemetry(override: str = Query(default="AUTO")):
    with state_lock:
        override_clean = override.upper().strip()
        bess_state["discom_override_mode"] = override_clean
        
        # Environmental feeds
        solar_gen = round(random.uniform(120.0, 550.0), 1)
        grid_load = round(random.uniform(300.0, 600.0), 1)
        peak_threshold_kw = 450.0
        net_demand = grid_load - solar_gen
        
        current_soc_pct = round((bess_state["current_charge_kwh"] / bess_state["capacity_kwh"]) * 100, 1)
        bess_action = "IDLE"
        bess_power_kw = 0.0

        # 1. Check DISCOM Manual Overrides First
        if override_clean == "FORCE_DISCHARGE" and current_soc_pct > 5.0:
            bess_action = "DISCHARGING (DISCOM OVERRIDE)"
            bess_power_kw = min(grid_load, bess_state["max_discharge_kw"])
            bess_state["current_charge_kwh"] -= (bess_power_kw * (3 / 3600))
            
        elif override_clean == "FORCE_CHARGE" and current_soc_pct < 98.0:
            bess_action = "CHARGING (DISCOM OVERRIDE)"
            bess_power_kw = bess_state["max_charge_kw"]
            bess_state["current_charge_kwh"] += (bess_power_kw * (3 / 3600))
            
        else:
            # 2. Standard AI Peak-Shaving Logic
            if grid_load > peak_threshold_kw and current_soc_pct > 15.0:
                needed_shave = grid_load - peak_threshold_kw
                bess_power_kw = min(needed_shave, bess_state["max_discharge_kw"])
                bess_action = "DISCHARGING (AI PEAK-SHAVE)"
                bess_state["current_charge_kwh"] -= (bess_power_kw * (3 / 3600))
                
            elif net_demand < 0 and current_soc_pct < 95.0:
                excess_solar = abs(net_demand)
                bess_power_kw = min(excess_solar, bess_state["max_charge_kw"])
                bess_action = "CHARGING (SOLAR ABSORPTION)"
                bess_state["current_charge_kwh"] += (bess_power_kw * (3 / 3600))

        # SoC Boundary checks
        bess_state["current_charge_kwh"] = max(0.0, min(bess_state["capacity_kwh"], bess_state["current_charge_kwh"]))
        final_soc_pct = round((bess_state["current_charge_kwh"] / bess_state["capacity_kwh"]) * 100, 1)

        effective_grid_load = max(0.0, grid_load - (bess_power_kw if "DISCHARGING" in bess_action else 0.0))
        
        # Realistic CEA Grid Carbon Offset Formula (gCO2/kWh -> kg CO2)
        displaced_kwh = (bess_power_kw * (3 / 3600)) + (solar_gen * (3 / 3600))
        carbon_saved = round(1400 + (displaced_kwh * 0.716), 1)

        # Matched Grid Alert Status Strings (Aligns perfectly with Next.js page.tsx)
        if effective_grid_load > peak_threshold_kw:
            grid_status = "CRITICAL_OVERLOAD"
        elif "DISCHARGING" in bess_action:
            grid_status = "PEAK_SHAVING_ACTIVE"
        else:
            grid_status = "OPTIMAL"

        return {
            "solar_kw": solar_gen,
            "raw_load_kw": grid_load,
            "effective_load_kw": round(effective_grid_load, 1),
            "peak_threshold_kw": peak_threshold_kw,
            "bess": {
                "action": bess_action,
                "power_kw": round(bess_power_kw, 1),
                "soc_pct": final_soc_pct,
                "capacity_kwh": bess_state["capacity_kwh"],
                "mode": bess_state["discom_override_mode"]
            },
            "carbon_offset_kg": carbon_saved,
            "grid_status": grid_status
        }
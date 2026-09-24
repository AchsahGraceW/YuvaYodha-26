from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import math

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global simulation state
simulation_tick = 360  # Start at 06:00 AM
bess_soc_kwh = 400.0   # 80% of 500 kWh
accumulated_carbon_offset_kg = 0.0
accumulated_cost_savings_inr = 0.0

CEA_EMISSION_FACTOR = 0.716  # kg CO2 / kWh
PEAK_TARIFF_INR = 9.50      
OFF_PEAK_TARIFF_INR = 4.50  

@app.get("/")
def health_check():
    return {"status": "EcoGrid AI Engine Online", "version": "2.0.0"}

@app.get("/api/telemetry")
def get_telemetry(override: str = "AUTO", ev_mode: str = "SMART"):
    global simulation_tick, bess_soc_kwh, accumulated_carbon_offset_kg, accumulated_cost_savings_inr
    
    # Advance time by 10 simulation minutes per tick
    simulation_tick = (simulation_tick + 10) % 1440  
    hour = simulation_tick / 60.0
    
    # 1. Solar Curve
    solar_kw = max(0.0, 480.0 * math.exp(-0.5 * ((hour - 13.0) / 2.2) ** 2))
    if solar_kw < 2.0:
        solar_kw = 0.0

    # 2. EV Fleet Demand Curve
    if ev_mode == "FAST":
        ev_load_kw = 120.0
    elif ev_mode == "ECO":
        ev_load_kw = 30.0
    else:  # SMART AI Mode
        ev_load_kw = 30.0 if hour >= 17.0 and hour <= 21.0 else 90.0

    # 3. Dual-Peak Feeder Load Curve (including EV load)
    base_load = 220.0 + ev_load_kw
    morning_peak = 190.0 * math.exp(-0.5 * ((hour - 9.0) / 1.5) ** 2)
    evening_peak = 360.0 * math.exp(-0.5 * ((hour - 19.0) / 1.8) ** 2)
    raw_load_kw = base_load + morning_peak + evening_peak
    
    peak_threshold_kw = 450.0
    bess_power_kw = 0.0
    action = "IDLE"
    
    # 4. Dynamic BESS Dispatch
    net_demand = raw_load_kw - solar_kw
    interval_hours = 10 / 60.0
    
    if override == "FORCE_DISCHARGE" or (net_demand > peak_threshold_kw and bess_soc_kwh > 50.0):
        bess_power_kw = min(120.0, max(40.0, net_demand - peak_threshold_kw + 30.0))
        discharged_kwh = bess_power_kw * interval_hours
        bess_soc_kwh = max(50.0, bess_soc_kwh - discharged_kwh)
        
        action = "DISCHARGING (DISCOM OVERRIDE)" if override == "FORCE_DISCHARGE" else "DISCHARGING (AI PEAK-SHAVING)"
        accumulated_carbon_offset_kg += (discharged_kwh * CEA_EMISSION_FACTOR)
        savings_per_kwh = PEAK_TARIFF_INR - OFF_PEAK_TARIFF_INR
        accumulated_cost_savings_inr += (discharged_kwh * savings_per_kwh)

    elif override == "FORCE_CHARGE" or (solar_kw > raw_load_kw and bess_soc_kwh < 500.0):
        excess_solar = solar_kw - raw_load_kw
        bess_power_kw = min(80.0, excess_solar)
        charged_kwh = bess_power_kw * interval_hours
        bess_soc_kwh = min(500.0, bess_soc_kwh + charged_kwh)
        action = "CHARGING (DISCOM OVERRIDE)" if override == "FORCE_CHARGE" else "CHARGING (SOLAR ABSORPTION)"

    effective_load_kw = max(0.0, raw_load_kw - (bess_power_kw if "DISCHARGING" in action else 0.0))
    soc_pct = round((bess_soc_kwh / 500.0) * 100, 1)

    # 5. Grid Status Emission
    if effective_load_kw > peak_threshold_kw:
        grid_status = "CRITICAL_OVERLOAD"
    elif "DISCHARGING" in action:
        grid_status = "PEAK_SHAVING_ACTIVE"
    else:
        grid_status = "OPTIMAL"

    hours_int = int(hour)
    mins_int = int((hour % 1) * 60)
    time_str = f"{hours_int:02d}:{mins_int:02d}"

    return {
        "time_of_day": time_str,
        "solar_kw": round(solar_kw, 1),
        "raw_load_kw": round(raw_load_kw, 1),
        "effective_load_kw": round(effective_load_kw, 1),
        "peak_threshold_kw": peak_threshold_kw,
        "ev_fleet": {
            "load_kw": round(ev_load_kw, 1),
            "mode": ev_mode,
            "active_evs": 12 if ev_mode == "FAST" else (4 if ev_mode == "ECO" else 8)
        },
        "bess": {
            "action": action,
            "power_kw": round(bess_power_kw, 1),
            "soc_pct": soc_pct,
            "capacity_kwh": 500.0,
            "mode": override
        },
        "carbon_offset_kg": round(accumulated_carbon_offset_kg, 2),
        "cost_savings_inr": round(accumulated_cost_savings_inr, 2),
        "grid_status": grid_status
    }
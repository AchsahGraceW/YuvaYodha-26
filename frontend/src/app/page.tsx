'use client';

import React, { useState, useEffect } from 'react';
import {
  Sun,
  Zap,
  Battery,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface Telemetry {
  solar_kw: number;
  raw_load_kw: number;
  effective_load_kw: number;
  peak_threshold_kw: number;
  bess: {
    action: string;
    power_kw: number;
    soc_pct: number;
    capacity_kwh: number;
    mode: string;
  };
  carbon_offset_kg: number;
  grid_status: string;
}

interface HistoricalPoint {
  time: string;
  solar: number;
  rawLoad: number;
  effectiveLoad: number;
}

export default function Home() {
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [history, setHistory] = useState<HistoricalPoint[]>([]);
  const [overrideMode, setOverrideMode] = useState<string>('AUTO');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/telemetry?override=${overrideMode}`);
        const data: Telemetry = await res.json();
        setTelemetry(data);

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setHistory((prev) => [
          ...prev.slice(-19), // Keep last 20 data points
          {
            time: now,
            solar: data.solar_kw,
            rawLoad: data.raw_load_kw,
            effectiveLoad: data.effective_load_kw,
          },
        ]);
      } catch (err) {
        console.error('Failed to fetch telemetry:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [overrideMode]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Zap className="h-7 w-7 text-emerald-400" />
            EcoGrid AI
          </h1>
          <p className="text-slate-400 text-sm">Smart Microgrid & DISCOM Peak-Shaving Dashboard</p>
        </div>

        {/* Dynamic Status Banner */}
        {telemetry && (
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2">
            {telemetry.grid_status === 'CRITICAL_OVERLOAD' && (
              <span className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <ShieldAlert className="h-5 w-5 animate-pulse" /> CRITICAL GRID OVERLOAD
              </span>
            )}
            {telemetry.grid_status === 'PEAK_SHAVING_ACTIVE' && (
              <span className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <AlertTriangle className="h-5 w-5" /> AI PEAK-SHAVING ACTIVE
              </span>
            )}
            {telemetry.grid_status === 'OPTIMAL' && (
              <span className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="h-5 w-5" /> GRID BALANCED & OPTIMAL
              </span>
            )}
          </div>
        )}
      </header>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Solar Generation */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>Solar Generation</span>
            <Sun className="h-5 w-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {telemetry?.solar_kw ?? '--'} <span className="text-lg font-normal text-slate-400">kW</span>
          </div>
        </div>

        {/* Feeder Load vs Effective Load */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>Feeder Load</span>
            <Activity className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {telemetry?.effective_load_kw ?? '--'}{' '}
            <span className="text-xs text-slate-400 font-normal">
              (Raw: {telemetry?.raw_load_kw ?? '--'} kW)
            </span>
          </div>
        </div>

        {/* Battery State of Charge */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>BESS Battery SoC</span>
            <Battery className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {telemetry?.bess.soc_pct ?? '--'}<span className="text-lg font-normal text-slate-400">%</span>
          </div>
          <div className="text-xs text-emerald-400 mt-1 font-medium">
            {telemetry?.bess.action ?? 'IDLE'} ({telemetry?.bess.power_kw ?? 0} kW)
          </div>
        </div>

        {/* Carbon Offset */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>Est. Carbon Saved</span>
            <Leaf className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {telemetry?.carbon_offset_kg ?? '--'} <span className="text-lg font-normal text-slate-400">kg CO₂</span>
          </div>
        </div>
      </div>

      {/* DISCOM Manual Override Controls */}
      <section className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-200">DISCOM Operator Controls</h2>
          <p className="text-xs text-slate-400">Override AI auto-dispatch to manually trigger battery charge or discharge during severe grid emergencies.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOverrideMode('AUTO')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${overrideMode === 'AUTO'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
          >
            AI Auto-Dispatch
          </button>
          <button
            onClick={() => setOverrideMode('FORCE_CHARGE')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${overrideMode === 'FORCE_CHARGE'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
          >
            Force Charge
          </button>
          <button
            onClick={() => setOverrideMode('FORCE_DISCHARGE')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${overrideMode === 'FORCE_DISCHARGE'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
          >
            Force Discharge
          </button>
        </div>
      </section>

      {/* Historical Telemetry Chart */}
      <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Real-Time Grid Telemetry (kW)</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
              <Legend />
              <Line type="monotone" dataKey="solar" stroke="#f59e0b" name="Solar Gen (kW)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rawLoad" stroke="#f43f5e" name="Raw Load (kW)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="effectiveLoad" stroke="#10b981" name="Effective Grid Load (kW)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}
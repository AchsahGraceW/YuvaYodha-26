'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Zap,
  Battery,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Activity,
  IndianRupee,
  Car,
  Terminal as TerminalIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';

interface EVFleet {
  load_kw: number;
  mode: string;
  active_evs: number;
}

interface Telemetry {
  time_of_day?: string;
  solar_kw: number;
  raw_load_kw: number;
  effective_load_kw: number;
  peak_threshold_kw: number;
  ev_fleet?: EVFleet;
  bess: {
    action: string;
    power_kw: number;
    soc_pct: number;
    capacity_kwh: number;
    mode: string;
  };
  carbon_offset_kg: number;
  cost_savings_inr?: number;
  grid_status: string;
}

interface HistoricalPoint {
  time: string;
  solar: number;
  rawLoad: number;
  effectiveLoad: number;
}

interface LogEntry {
  id: string;
  time: string;
  type: 'INFO' | 'SUCCESS' | 'WARN' | 'OVERRIDE';
  message: string;
}

export default function Home() {
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [history, setHistory] = useState<HistoricalPoint[]>([]);
  const [overrideMode, setOverrideMode] = useState<string>('AUTO');
  const [evMode, setEvMode] = useState<string>('SMART');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logCounterRef = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/telemetry?override=${overrideMode}&ev_mode=${evMode}`);
        if (!res.ok) return;
        const data: Telemetry = await res.json();
        setTelemetry(data);

        const simTime = data.time_of_day || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setHistory((prev) => [
          ...prev.slice(-29),
          {
            time: simTime,
            solar: data.solar_kw,
            rawLoad: data.raw_load_kw,
            effectiveLoad: data.effective_load_kw,
          },
        ]);

        logCounterRef.current += 1;
        const uniqueKey = `${Date.now()}-${logCounterRef.current}`;

        const newLog: LogEntry = {
          id: uniqueKey,
          time: simTime,
          type: overrideMode !== 'AUTO'
            ? 'OVERRIDE'
            : data.bess.action.includes('DISCHARGING')
              ? 'WARN'
              : data.bess.action.includes('CHARGING')
                ? 'SUCCESS'
                : 'INFO',
          message: overrideMode !== 'AUTO'
            ? `[MANUAL OVERRIDE] Operator forced mode: ${overrideMode}`
            : data.bess.action.includes('DISCHARGING')
              ? `[AI DISPATCH] Peak load detected (${data.raw_load_kw} kW). Discharging BESS at ${data.bess.power_kw} kW (EV Load: ${data.ev_fleet?.load_kw ?? 0} kW)`
              : data.bess.action.includes('CHARGING')
                ? `[AI DISPATCH] Excess solar generation (${data.solar_kw} kW). Charging BESS at ${data.bess.power_kw} kW`
                : `[GRID BALANCED] Demand within nominal limits. BESS idle at ${data.bess.soc_pct}% SoC`
        };

        setLogs((prev) => [newLog, ...prev.slice(0, 19)]);
      } catch (err) {
        console.warn('Telemetry polling active...', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [overrideMode, evMode]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>Solar Generation</span>
            <Sun className="h-5 w-5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {telemetry?.solar_kw ?? '--'} <span className="text-sm font-normal text-slate-400">kW</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>Feeder Load</span>
            <Activity className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {telemetry?.effective_load_kw ?? '--'}{' '}
            <span className="text-xs text-slate-400 font-normal">
              (Raw: {telemetry?.raw_load_kw ?? '--'})
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>EV Fleet Demand</span>
            <Car className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {telemetry?.ev_fleet?.load_kw ?? '--'} <span className="text-sm font-normal text-slate-400">kW</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {telemetry?.ev_fleet?.active_evs ?? 0} EVs Charging ({telemetry?.ev_fleet?.mode} Mode)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>ToD Cost Savings</span>
            <IndianRupee className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            ₹{telemetry?.cost_savings_inr ?? '0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">ToD Peak Arbitrage</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span>Est. Carbon Saved</span>
            <Leaf className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {telemetry?.carbon_offset_kg ?? '--'} <span className="text-sm font-normal text-slate-400">kg CO₂</span>
          </div>
        </div>
      </div>

      {/* Grid Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DISCOM Override Controls */}
        <section className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-200">DISCOM BESS Dispatch Override</h2>
            <p className="text-xs text-slate-400">Manually force battery charge/discharge during feeder emergencies.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOverrideMode('AUTO')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${overrideMode === 'AUTO' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300'
                }`}
            >
              AI Auto
            </button>
            <button
              onClick={() => setOverrideMode('FORCE_CHARGE')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${overrideMode === 'FORCE_CHARGE' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-800 text-slate-300'
                }`}
            >
              Force Charge
            </button>
            <button
              onClick={() => setOverrideMode('FORCE_DISCHARGE')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${overrideMode === 'FORCE_DISCHARGE' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300'
                }`}
            >
              Force Discharge
            </button>
          </div>
        </section>

        {/* EV Smart Charging Controls */}
        <section className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-200">EV Fleet Charging Policy</h2>
            <p className="text-xs text-slate-400">Throttle EV charging speeds to prevent transformer overload.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEvMode('SMART')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${evMode === 'SMART' ? 'bg-purple-500 text-white shadow-md' : 'bg-slate-800 text-slate-300'
                }`}
            >
              AI Smart Throttle
            </button>
            <button
              onClick={() => setEvMode('FAST')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${evMode === 'FAST' ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-800 text-slate-300'
                }`}
            >
              Max Charging (120 kW)
            </button>
            <button
              onClick={() => setEvMode('ECO')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${evMode === 'ECO' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-300'
                }`}
            >
              Eco Mode (30 kW)
            </button>
          </div>
        </section>
      </div>

      {/* Historical Telemetry Chart */}
      <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Real-Time Grid Telemetry & Diurnal Duck Curve (kW)</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
              <Legend />

              <ReferenceLine
                y={telemetry?.peak_threshold_kw ?? 450}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: 'Feeder Peak Threshold (450 kW)', fill: '#ef4444', fontSize: 11, position: 'top' }}
              />

              <Line type="monotone" dataKey="solar" stroke="#f59e0b" name="Solar Gen (kW)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rawLoad" stroke="#f43f5e" name="Raw Feeder Load (kW)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="effectiveLoad" stroke="#10b981" name="Effective Grid Load (kW)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Real-Time System Logs Console */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg font-mono text-xs">
        <div className="flex items-center gap-2 mb-3 text-slate-400 border-b border-slate-800 pb-2">
          <TerminalIcon className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">Live AI Operational Logs</span>
          <span className="ml-auto flex items-center gap-1.5 text-emerald-400 text-[10px]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            STREAMING
          </span>
        </div>

        <div className="h-40 overflow-y-auto space-y-1.5 pr-2">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">Initializing event stream...</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed border-b border-slate-800/40 pb-1">
                <span className="text-slate-500 select-none">[{log.time}]</span>
                {log.type === 'WARN' && <span className="text-amber-400 font-bold">[PEAK SHAVE]</span>}
                {log.type === 'SUCCESS' && <span className="text-emerald-400 font-bold">[SOLAR ABSORB]</span>}
                {log.type === 'OVERRIDE' && <span className="text-blue-400 font-bold">[OVERRIDE]</span>}
                {log.type === 'INFO' && <span className="text-slate-400 font-bold">[BALANCED]</span>}
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import {
  Sun,
  Zap,
  Battery,
  Leaf,
  Activity,
  ShieldCheck,
  Clock,
  Power,
  AlertTriangle,
  ArrowUpRight,
  Car,
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Initial 24-Hour Microgrid Simulation Data Profile
const initialChartData = [
  { time: '00:00', solar: 0, demand: 120, battery: 45 },
  { time: '03:00', solar: 0, demand: 95, battery: 40 },
  { time: '06:00', solar: 45, demand: 180, battery: 35 },
  { time: '09:00', solar: 320, demand: 280, battery: 60 },
  { time: '12:00', solar: 540, demand: 310, battery: 88 },
  { time: '15:00', solar: 480, demand: 390, battery: 95 },
  { time: '18:00', solar: 180, demand: 420, battery: 70 },
  { time: '21:00', solar: 10, demand: 260, battery: 52 },
];

export default function EcoGridDashboard() {
  const [peakShavingMode, setPeakShavingMode] = useState(true);
  const [gridExport, setGridExport] = useState(true);
  const [batteryDischarge, setBatteryDischarge] = useState(true);
  const [evStation, setEvStation] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Dynamic Telemetry State from FastAPI Backend
  const [telemetry, setTelemetry] = useState({
    solar_kw: 540.0,
    load_kw: 310.0,
    bess_soc_pct: 88.0,
    carbon_offset_kg: 1420.0,
    status: 'OPTIMAL',
    peak_shaving_active: true
  });
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Live Clock Tick
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll FastAPI Backend every 3 seconds
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/telemetry');
        if (response.ok) {
          const data = await response.json();
          setTelemetry(data);
          setIsLiveConnected(true);
        }
      } catch (err) {
        setIsLiveConnected(false);
      }
    };

    fetchTelemetry();
    const pollInterval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(pollInterval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      {/* Top Header & Branding */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/20 tracking-wider">
              SCHNEIDER ELECTRIC YUVA YODHA 2026
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              {isLiveConnected ? 'Live FastApi Stream' : 'Offline Simulation'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2 bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
            EcoGrid AI Controller
          </h1>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>{currentTime || '00:00:00 AM'}</span>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
            <span className="text-xs font-medium pl-2 text-slate-300">
              {peakShavingMode ? 'Peak-Shaving Active' : 'Standard Grid Flow'}
            </span>
            <button
              onClick={() => setPeakShavingMode(!peakShavingMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${peakShavingMode ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${peakShavingMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="space-y-8">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Solar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 font-medium">Solar Generation</p>
                <h3 className="text-2xl font-bold mt-1 text-white">
                  {telemetry.solar_kw} <span className="text-xs font-normal text-slate-400">kW</span>
                </h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                <Sun className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400 gap-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Real-time IoT Telemetry</span>
            </div>
          </div>

          {/* Card 2: Load Demand */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 font-medium">Microgrid Load</p>
                <h3 className="text-2xl font-bold mt-1 text-white">
                  {telemetry.load_kw} <span className="text-xs font-normal text-slate-400">kW</span>
                </h3>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                <Zap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-400 gap-1 font-medium">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Balanced grid load</span>
            </div>
          </div>

          {/* Card 3: BESS Battery */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 font-medium">BESS Storage State</p>
                <h3 className="text-2xl font-bold mt-1 text-white">
                  {telemetry.bess_soc_pct} <span className="text-xs font-normal text-slate-400">%</span>
                </h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <Battery className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400 gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Optimal reserve stored</span>
            </div>
          </div>

          {/* Card 4: Carbon Saved */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 font-medium">Est. Carbon Offset</p>
                <h3 className="text-2xl font-bold mt-1 text-white">
                  {telemetry.carbon_offset_kg} <span className="text-xs font-normal text-slate-400">kg CO₂</span>
                </h3>
              </div>
              <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/20">
                <Leaf className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-teal-400 gap-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Calculated from solar yield</span>
            </div>
          </div>
        </div>

        {/* Mid Section: Chart & Interactive Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Container */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">24-Hour Energy Telemetry Profile</h2>
                <p className="text-xs text-slate-400">Solar generation curve vs microgrid demand profile</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Solar Output
                </span>
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Load Demand
                </span>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={initialChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Area type="monotone" dataKey="solar" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#solarGradient)" />
                  <Area type="monotone" dataKey="demand" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#demandGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Grid Controller</h2>
              <p className="text-xs text-slate-400 mb-6">Manual overrides and dynamic dispatch controls</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <Power className={`w-4 h-4 ${gridExport ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-200">Grid Export</p>
                      <p className="text-[10px] text-slate-400">Feed excess solar energy back to grid</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setGridExport(!gridExport)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${gridExport ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}
                  >
                    {gridExport ? 'ENABLED' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <Battery className={`w-4 h-4 ${batteryDischarge ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-200">BESS Peak Discharge</p>
                      <p className="text-[10px] text-slate-400">Auto-discharge battery during high tariff</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBatteryDischarge(!batteryDischarge)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${batteryDischarge ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}
                  >
                    {batteryDischarge ? 'ENABLED' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <Car className={`w-4 h-4 ${evStation ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-200">EV Fleet Charger</p>
                      <p className="text-[10px] text-slate-400">Prioritize smart charging dock</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEvStation(!evStation)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${evStation ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}
                  >
                    {evStation ? 'ACTIVE' : 'IDLE'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                FastAPI Engine Connected
              </span>
              <span className="font-mono text-[10px] text-slate-500">v1.0.4-EcoStruxure</span>
            </div>
          </div>
        </div>

        {/* Bottom Alert Log */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Live Automation Event Log
          </h2>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                [14:32:10] Peak Tariff Active — Switching microgrid load to BESS Battery power.
              </span>
              <span className="text-emerald-400 font-semibold">+ $42.50 Saved</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                [12:15:04] Solar Output Surge detected ({telemetry.solar_kw} kW) — Exporting excess power to grid.
              </span>
              <span className="text-amber-400 font-semibold">Grid Sync OK</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
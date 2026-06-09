import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Activity, 
  Calendar, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Smile, 
  Moon, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { db } from '../services/db';
import { WellnessLog, Language } from '../types';

interface DailyWellnessTrackerProps {
  appLanguage: Language;
}

export const DailyWellnessTracker: React.FC<DailyWellnessTrackerProps> = ({ appLanguage }) => {
  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pulseRate, setPulseRate] = useState<number>(72);
  const [pulseQuality, setPulseQuality] = useState<string>('Normal');
  const [tongueBodyColor, setTongueBodyColor] = useState<string>('Normal Pink');
  const [tongueCoating, setTongueCoating] = useState<string>('Thin White');
  const [energyLevel, setEnergyLevel] = useState<number>(7);
  const [sleepQuality, setSleepQuality] = useState<number>(7);
  const [notes, setNotes] = useState<string>('');

  // Translations
  const t = {
    title: appLanguage === Language.ENGLISH ? "Daily Wellness Log & Trends" : "Catatan Keseharian & Tren",
    subtitle: appLanguage === Language.ENGLISH ? "Track your tongue, pulse, and daily vitality markers" : "Pantau lidah, denyut nadi, dan penanda vitalitas harian Anda",
    logSuccess: appLanguage === Language.ENGLISH ? "Log saved successfully!" : "Catatan harian berhasil disimpan!",
    logError: appLanguage === Language.ENGLISH ? "Failed to save log" : "Gagal menyimpan catatan harian",
    addLog: appLanguage === Language.ENGLISH ? "New Daily Entry" : "Tambah Catatan Harian",
    collapsedAdd: appLanguage === Language.ENGLISH ? "Open Log Form" : "Buka Formulir Pencatatan",
    collapseForm: appLanguage === Language.ENGLISH ? "Collapse Form" : "Tutup Formulir",
    date: appLanguage === Language.ENGLISH ? "Logging Date" : "Tanggal Pencatatan",
    pulseRate: appLanguage === Language.ENGLISH ? "Pulse Rate (BPM)" : "Denyut Nadi (BPM)",
    pulseQuality: appLanguage === Language.ENGLISH ? "Pulse Quality" : "Kualitas Nadi",
    tongueBodyColor: appLanguage === Language.ENGLISH ? "Tongue Body Color" : "Warna Badan Lidah",
    tongueCoating: appLanguage === Language.ENGLISH ? "Tongue Coating" : "Selaput Lidah / Sabur",
    energyLevel: appLanguage === Language.ENGLISH ? "Daily Qi / Energy (1-10)" : "Energi / Qi Harian (1-10)",
    sleepQuality: appLanguage === Language.ENGLISH ? "Sleep Quality (1-10)" : "Kualitas Tidur (1-10)",
    notes: appLanguage === Language.ENGLISH ? "Notes / Daily Symptoms" : "Catatan Tambahan & Gejala Harian",
    saveBtn: appLanguage === Language.ENGLISH ? "Submit Daily Log" : "Simpan Catatan Harian",
    pulseTrendTitle: appLanguage === Language.ENGLISH ? "30-Day Pulse Rate Trend (BPM)" : "Tren Denyut Nadi 30 Hari Terakhir (BPM)",
    energyTrendTitle: appLanguage === Language.ENGLISH ? "30-Day Energy & Sleep Trends" : "Tren Energi & Kualitas Tidur 30 Hari",
    statsTitle: appLanguage === Language.ENGLISH ? "TCM Wellness Analysis" : "Analisis Keseimbangan TCM",
    avgPulse: appLanguage === Language.ENGLISH ? "Average Pulse" : "Rata-rata Denyut Nadi",
    avgEnergy: appLanguage === Language.ENGLISH ? "Average Energy" : "Rata-rata Energi",
    dominantTongue: appLanguage === Language.ENGLISH ? "Dominant Tongue" : "Lidah yang Dominan",
    clinicalCorrelation: appLanguage === Language.ENGLISH ? "Clinical TCM Correlation" : "Korelasi Klinis TCM",
    deleteSuccess: appLanguage === Language.ENGLISH ? "Log deleted successfully" : "Catatan berhasil dihapus",
    recentLogs: appLanguage === Language.ENGLISH ? "Last 5 entries" : "5 Pencatatan Terakhir",
    noLogsMessage: appLanguage === Language.ENGLISH 
      ? "No wellness logs tracked yet. Submit your first logger details to start trending." 
      : "Belum ada catatan harian. Masukkan catatan pertama Anda untuk melihat grafik tren."
  };

  // TCM Qualities Choices
  const pulseQualities = appLanguage === Language.ENGLISH 
    ? ['Normal', 'Floating / Dangkal', 'Deep / Tenggelam', 'Slippery / Licin', 'Wiry / Tegang', 'Fine / Lemah Tipis', 'Weak / Lemah', 'Strong / Kuat']
    : ['Normal', 'Mengambang (Floating)', 'Tenggelam (Deep)', 'Licin (Slippery)', 'Tegang (Wiry)', 'Kecil Tipis (Fine)', 'Lemah (Weak)', 'Kuat-Keras (Strong)'];

  const tongueColors = appLanguage === Language.ENGLISH
    ? ['Pale White', 'Normal Pink', 'Red / Merah', 'Deep Red', 'Purple / Ungu']
    : ['Pucat (Pale)', 'Merah Muda Sehat', 'Merah (Heat)', 'Merah Tua (Extreme Heat)', 'Ungu (Qi/Blood Stasis)'];

  const tongueCoatings = appLanguage === Language.ENGLISH
    ? ['No Coat / Peeled', 'Thin White', 'Thick White', 'Thin Yellow', 'Thick Yellow']
    : ['Tanpa Selaput / Terkelupas', 'Tipis Putih', 'Tebal Putih (Damp/Cold)', 'Tipis Kuning (Light Heat)', 'Tebal Kuning (Damp-Heat)'];

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const fetched = await db.wellnessLogs.getAll();
    // Sort chronological for charts
    const sorted = [...fetched].sort((a, b) => a.date.localeCompare(b.date));
    setLogs(sorted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const logPayload: WellnessLog = {
      id: date, // Using date string as a unique ID to enforce single log per day
      date,
      pulseRate: Number(pulseRate),
      pulseQuality,
      tongueBodyColor,
      tongueCoating,
      energyLevel: Number(energyLevel),
      sleepQuality: Number(sleepQuality),
      notes,
      timestamp: Date.now()
    };

    const success = await db.wellnessLogs.add(logPayload);
    if (success) {
      setSuccessMsg(t.logSuccess);
      setIsFormExpanded(false);
      setNotes('');
      fetchLogs();
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(t.logError);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(appLanguage === Language.ENGLISH ? "Are you sure you want to delete this log?" : "Apakah Anda yakin ingin menghapus catatan ini?")) {
      await db.wellnessLogs.delete(id);
      setSuccessMsg(t.deleteSuccess);
      fetchLogs();
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Calculations for TCM analysis and trends
  const last30DaysLogs = logs.slice(-30);
  const avgPulseVal = last30DaysLogs.length > 0 
    ? Math.round(last30DaysLogs.reduce((sum, item) => sum + item.pulseRate, 0) / last30DaysLogs.length) 
    : 72;
  const avgEnergyVal = last30DaysLogs.length > 0
    ? (last30DaysLogs.reduce((sum, item) => sum + item.energyLevel, 0) / last30DaysLogs.length).toFixed(1)
    : '7.0';
  const avgSleepVal = last30DaysLogs.length > 0
    ? (last30DaysLogs.reduce((sum, item) => sum + item.sleepQuality, 0) / last30DaysLogs.length).toFixed(1)
    : '7.0';

  // Finding dominant tongue body color
  const tongueColorsCounts: Record<string, number> = {};
  last30DaysLogs.forEach(l => {
    tongueColorsCounts[l.tongueBodyColor] = (tongueColorsCounts[l.tongueBodyColor] || 0) + 1;
  });
  let dominantTongueColor = 'Normal Pink';
  let maxCount = 0;
  Object.entries(tongueColorsCounts).forEach(([color, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantTongueColor = color;
    }
  });

  // Simple automated expert insight
  const getDailyTcmAdvice = () => {
    if (last30DaysLogs.length === 0) {
      return appLanguage === Language.ENGLISH
        ? "Submit daily entries to map your energetic pattern updates."
        : "Silakan masukkan data harian Anda untuk melihat korelasi keseimbangan tubuh.";
    }

    const avgPulseNum = Number(avgPulseVal);
    let advice = "";

    if (avgPulseNum > 85) {
      advice += appLanguage === Language.ENGLISH
        ? "Your average pulse is Rapid, which indicates potential Internal Heat. "
        : "Denyut rata-rata Anda cepat (Rapid), mengindikasikan kemungkinan adanya unsur Panas Internal (Heat). ";
    } else if (avgPulseNum < 60) {
      advice += appLanguage === Language.ENGLISH
        ? "Your average pulse is Slow, indicating potential Cold or Qi Deficiency. "
        : "Denyut rata-rata Anda lambat, mengindikasikan unsur Dingin (Cold) atau Qi Deficiency. ";
    } else {
      advice += appLanguage === Language.ENGLISH
        ? "Your average pulse is balanced and healthy. "
        : "Denyut rata-rata Anda dalam kondisi seimbang dan normal. ";
    }

    if (dominantTongueColor.includes('Pucat') || dominantTongueColor.includes('Pale')) {
      advice += appLanguage === Language.ENGLISH
        ? "The dominant Pale tongue body color indicates Qi and Blood Deficiency. Consider tonifying food like dates, ginger, and warm cooked grains."
        : "Kondisi Lidah Pucat dominan mengindikasikan Defisiensi Qi dan Darah. Hangatkan tubuh Anda dan konsumsi sup hangat, jahe, serta kurma.";
    } else if (dominantTongueColor.includes('Merah') || dominantTongueColor.includes('Red')) {
      advice += appLanguage === Language.ENGLISH
        ? "A Red tongue body points to Heat. Keep hydrated, minimize fried, spicy, or extremely heating foods, and support Yin replenishment."
        : "Kondisi Lidah Merah menunjukkan akumulasi Panas tubuh. Hindari gorengan, pedas, dan alkohol. Perbanyak konsumsi sayuran hijau segar.";
    } else {
      advice += appLanguage === Language.ENGLISH
        ? "Your tongue color shows good systemic balance."
        : "Warna lidah dominan sehat menunjukkan sirkulasi Qi-Darah berjalan baik.";
    }

    return advice;
  };

  return (
    <div className="bg-purple-50/40 p-4 rounded-3xl border border-purple-100 shadow-md">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 pb-3 border-b border-purple-100 mb-4 h-fit">
        <div>
          <h2 className="text-sm font-black text-purple-900 uppercase tracking-tight flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 animate-pulse" /> {t.title}
          </h2>
          <p className="text-[10px] text-purple-500 font-medium leading-none mt-1">
            {t.subtitle}
          </p>
        </div>
        <button
          onClick={() => setIsFormExpanded(!isFormExpanded)}
          className={`px-3 py-1.5 rounded-xl border border-purple-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 ${
            isFormExpanded 
              ? 'bg-rose-50 text-rose-600 border-rose-100' 
              : 'bg-purple-100 hover:bg-purple-200 text-purple-900'
          }`}
        >
          {isFormExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {isFormExpanded ? t.collapseForm : t.collapsedAdd}
        </button>
      </div>

      {/* MESSAGES */}
      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-xl text-[10px] font-semibold flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-800 p-2.5 rounded-xl text-[10px] font-semibold flex items-center gap-2 animate-fade-in shadow-sm">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> {errorMsg}
        </div>
      )}

      {/* EXPANDABLE LOG ENTRY FORM */}
      {isFormExpanded && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl border border-purple-100 grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 shadow-inner">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">{t.date}</label>
              <div className="flex items-center gap-2 bg-purple-50 rounded-xl px-3 py-2 border border-purple-100">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <input 
                  type="date" 
                  value={date} 
                  max={new Date().toISOString().split('T')[0]} // Block futuristic logging
                  onChange={e => setDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-semibold text-purple-900 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">
                {t.pulseRate}: <span className="text-purple-900 font-bold font-mono">{pulseRate} BPM</span>
              </label>
              <div className="bg-purple-50 rounded-xl px-3 py-2 border border-purple-100 flex items-center gap-3">
                <Activity className="w-3.5 h-3.5 text-rose-500" />
                <input 
                  type="range" 
                  min="50" 
                  max="120" 
                  value={pulseRate} 
                  onChange={e => setPulseRate(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer h-1 bg-purple-200 rounded-lg appearance-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">{t.pulseQuality}</label>
              <select 
                value={pulseQuality}
                onChange={e => setPulseQuality(e.target.value)}
                className="w-full bg-purple-50 border border-purple-100 px-3 py-2 rounded-xl text-xs font-semibold text-purple-900 outline-none focus:border-purple-300"
              >
                {pulseQualities.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">{t.tongueBodyColor}</label>
              <select 
                value={tongueBodyColor}
                onChange={e => setTongueBodyColor(e.target.value)}
                className="w-full bg-purple-50 border border-purple-100 px-3 py-2 rounded-xl text-xs font-semibold text-purple-900 outline-none focus:border-purple-300"
              >
                {tongueColors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <label className="block text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">{t.tongueCoating}</label>
              <select 
                value={tongueCoating}
                onChange={e => setTongueCoating(e.target.value)}
                className="w-full bg-purple-50 border border-purple-100 px-3 py-2 rounded-xl text-xs font-semibold text-purple-900 outline-none focus:border-purple-300"
              >
                {tongueCoatings.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-black text-purple-500 uppercase tracking-tight mb-1">
                  {t.energyLevel}: <span className="text-purple-900 font-bold font-mono">{energyLevel}/10</span>
                </label>
                <div className="bg-purple-50 rounded-xl px-2 py-1.5 border border-purple-100 flex items-center gap-2">
                  <Smile className="w-3.5 h-3.5 text-amber-500" />
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={energyLevel} 
                    onChange={e => setEnergyLevel(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1 bg-purple-200 rounded-lg appearance-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-purple-500 uppercase tracking-tight mb-1">
                  {t.sleepQuality}: <span className="text-purple-900 font-bold font-mono">{sleepQuality}/10</span>
                </label>
                <div className="bg-purple-50 rounded-xl px-2 py-1.5 border border-purple-100 flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-blue-500" />
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={sleepQuality} 
                    onChange={e => setSleepQuality(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1 bg-purple-200 rounded-lg appearance-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">{t.notes}</label>
              <div className="bg-purple-50 rounded-xl px-3 py-2 border border-purple-100 flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                <input 
                  type="text" 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. rasa lelah setelah makan, pusing"
                  className="bg-transparent border-none outline-none text-xs font-semibold text-purple-950 w-full placeholder-purple-300"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-md shadow-purple-200 flex items-center justify-center gap-1.5 mt-2"
            >
              <Plus className="w-4 h-4" /> {t.saveBtn}
            </button>
          </div>
        </form>
      )}

      {/* LOG DATA AND CHART VIEW */}
      {logs.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-purple-100 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
            <Info className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-xs text-purple-800 font-bold">{t.noLogsMessage}</p>
          </div>
          <button
            onClick={() => setIsFormExpanded(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-purple-700 transition"
          >
            {t.addLog}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* CHARTS CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Pulse Trends */}
            <div className="bg-white p-3 rounded-2xl border border-purple-100 shadow-sm">
              <h3 className="text-[10px] font-black text-purple-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-rose-500" /> {t.pulseTrendTitle}
              </h3>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last30DaysLogs} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => val.split('-').slice(1).join('/')}
                      stroke="#a855f7" 
                      style={{ fontSize: '9px', fontFamily: 'monospace' }}
                    />
                    <YAxis 
                      domain={[45, 125]} 
                      stroke="#a855f7" 
                      style={{ fontSize: '9px', fontFamily: 'monospace' }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e9d5ff', fontSize: '11px' }}
                      labelClassName="font-mono text-purple-500 font-bold"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pulseRate" 
                      name="BPM" 
                      stroke="#ec4899" 
                      strokeWidth={3} 
                      activeDot={{ r: 6 }} 
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Energy & Sleep Trends */}
            <div className="bg-white p-3 rounded-2xl border border-purple-100 shadow-sm">
              <h3 className="text-[10px] font-black text-purple-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> {t.energyTrendTitle}
              </h3>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last30DaysLogs} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => val.split('-').slice(1).join('/')}
                      stroke="#a855f7" 
                      style={{ fontSize: '9px', fontFamily: 'monospace' }}
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      stroke="#a855f7" 
                      style={{ fontSize: '9px', fontFamily: 'monospace' }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e9d5ff', fontSize: '11px' }}
                      labelClassName="font-mono text-purple-500 font-bold"
                    />
                    <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                    <Line 
                      type="monotone" 
                      dataKey="energyLevel" 
                      name={appLanguage === Language.ENGLISH ? "Qi/Energy" : "Energi"} 
                      stroke="#f59e0b" 
                      strokeWidth={2} 
                      dot={{ r: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sleepQuality" 
                      name={appLanguage === Language.ENGLISH ? "Sleep" : "Tidur"} 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* METRIC ANALYSIS BOX */}
          <div className="bg-purple-100/40 border border-purple-200 p-4 rounded-2xl">
            <h4 className="text-[10px] font-black text-purple-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 animate-bounce" /> {t.statsTitle}
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-white p-3 rounded-xl border border-purple-100 flex flex-col justify-center shadow-sm">
                <span className="text-[8px] font-black text-purple-400 uppercase tracking-wider block">{t.avgPulse}</span>
                <span className="text-base font-black text-rose-600">{avgPulseVal} <span className="text-[10px] font-bold text-rose-400 font-sans tracking-tight">bpm</span></span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-purple-100 flex flex-col justify-center shadow-sm">
                <span className="text-[8px] font-black text-purple-400 uppercase tracking-wider block">{t.avgEnergy}</span>
                <span className="text-base font-black text-amber-500">{avgEnergyVal} <span className="text-[10px] font-bold text-amber-400 font-sans tracking-tight">/10</span></span>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white p-3 rounded-xl border border-purple-100 flex flex-col justify-center shadow-sm">
                <span className="text-[8px] font-black text-purple-400 uppercase tracking-wider block">{t.dominantTongue}</span>
                <span className="text-xs font-black text-purple-900 truncate uppercase mt-0.5">{dominantTongueColor}</span>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-purple-200 text-xs text-purple-900 leading-relaxed shadow-sm">
              <span className="font-black text-[9px] uppercase tracking-wider text-purple-600 flex items-center gap-1.5 mb-1">
                <Info className="w-3.5 h-3.5 shrink-0" /> {t.clinicalCorrelation}
              </span>
              "{getDailyTcmAdvice()}"
            </div>
          </div>

          {/* RECENT ENTRIES TABLE */}
          <div className="bg-white rounded-2xl border border-purple-100 p-4 shadow-sm">
            <h3 className="text-[10px] font-black text-purple-800 uppercase tracking-wider mb-3 block">
              {t.recentLogs}
            </h3>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-purple-100 text-[10px] text-purple-400 uppercase tracking-wider">
                    <th className="py-2 pr-2">{appLanguage === Language.ENGLISH ? "Date" : "Tgl"}</th>
                    <th className="py-2 px-2">{appLanguage === Language.ENGLISH ? "Pulse Rate" : "Nadi"}</th>
                    <th className="py-2 px-2">{appLanguage === Language.ENGLISH ? "Pulse Quality" : "Keadaan Nadi"}</th>
                    <th className="py-2 px-2">{appLanguage === Language.ENGLISH ? "Tongue Body" : "Warna Lidah"}</th>
                    <th className="py-2 px-2 hidden sm:table-cell">{appLanguage === Language.ENGLISH ? "Coating" : "Selaput"}</th>
                    <th className="py-2 pl-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50 text-purple-900">
                  {logs.slice(-5).reverse().map(log => (
                    <tr key={log.date} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-2 pr-2 font-mono text-[10px]">{log.date}</td>
                      <td className="py-2 px-2">
                        <span className="font-black text-rose-600 font-mono">{log.pulseRate}</span> <span className="text-[9px] text-purple-400 font-sans tracking-tight">bpm</span>
                      </td>
                      <td className="py-2 px-2 text-[10px] text-purple-700">{log.pulseQuality}</td>
                      <td className="py-2 px-2 text-[10px]">{log.tongueBodyColor}</td>
                      <td className="py-2 px-2 text-[10px] text-purple-700 hidden sm:table-cell">{log.tongueCoating}</td>
                      <td className="py-2 pl-2 text-right">
                        <button 
                          onClick={() => handleDelete(log.id || log.date)}
                          className="p-1 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700 transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

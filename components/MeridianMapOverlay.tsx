import React, { useState, useMemo, useRef } from 'react';
import { MapPin, Info, Zap, Layers, Sparkles, ShieldAlert, Crosshair, ChevronRight, Check, Copy, Download } from 'lucide-react';
import { Point, AcupunctureSystem } from '../types/acupuncture';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface MeridianMapOverlayProps {
  points: Point[];
}

interface MapPointCoords {
  name: string;
  x: number; // relative to 500
  y: number; // relative to 620
  view: 'front' | 'back';
}

// 500x620 Coordinate Mapping System for Clinical Core Points
const POINT_COORDS: Record<string, MapPointCoords> = {
  'LU7 (Lieque)': { name: 'LU7 (Lieque)', x: 135, y: 280, view: 'front' },
  'LI4 (Hegu)': { name: 'LI4 (Hegu)', x: 125, y: 315, view: 'front' },
  'ST36 (Zusanli)': { name: 'ST36 (Zusanli)', x: 298, y: 495, view: 'front' },
  'SP6 (Sanyinjiao)': { name: 'SP6 (Sanyinjiao)', x: 216, y: 540, view: 'front' },
  'HT7 (Shenmen)': { name: 'HT7 (Shenmen)', x: 370, y: 300, view: 'front' },
  'SI3 (Houxi)': { name: 'SI3 (Houxi)', x: 118, y: 320, view: 'back' },
  'BL40 (Weizhong)': { name: 'BL40 (Weizhong)', x: 290, y: 470, view: 'back' },
  'KI3 (Taixi)': { name: 'KI3 (Taixi)', x: 213, y: 570, view: 'front' },
  'PC6 (Neiguan)': { name: 'PC6 (Neiguan)', x: 365, y: 280, view: 'front' },
  'TE5 (Waiguan)': { name: 'TE5 (Waiguan)', x: 138, y: 260, view: 'back' },
  'GB34 (Yanglingquan)': { name: 'GB34 (Yanglingquan)', x: 302, y: 480, view: 'front' },
  'LR3 (Taichong)': { name: 'LR3 (Taichong)', x: 202, y: 590, view: 'front' },
  
  // High clinical value Master Tung Points mapped to standard anatomical regions
  '11.24 Fu Ke': { name: '11.24 Fu Ke', x: 110, y: 310, view: 'front' },
  '11.27 Wu Hu': { name: '11.27 Wu Hu', x: 112, y: 318, view: 'front' },
  '22.04 Da Bai': { name: '22.04 Da Bai', x: 124, y: 322, view: 'front' },
  '22.05 Ling Gu': { name: '22.05 Ling Gu', x: 128, y: 310, view: 'front' },
  '77.18 Shen Guan': { name: '77.18 Shen Guan', x: 215, y: 505, view: 'front' },
  '77.21 Ren Huang': { name: '77.21 Ren Huang', x: 216, y: 535, view: 'front' },
  '44.06 Jian Zhong': { name: '44.06 Jian Zhong', x: 328, y: 145, view: 'front' },
};

// Symmetrical Human Body Vector Outline
const BODY_OUTLINE_PATH = `
  M 250,91 
  C 210,105 180,120 180,140 
  L 165,190 
  C 155,220 145,260 130,300 
  L 120,325 
  C 114,338 126,342 130,330 
  L 142,300 
  L 155,245 
  L 170,195 
  C 174,185 185,185 185,200 
  L 185,320 
  C 185,340 195,350 195,370 
  L 195,460 
  L 205,520 
  L 205,565 
  L 192,590 
  C 188,598 206,598 210,590 
  L 225,565 
  L 225,520 
  L 230,460 
  L 230,350 
  C 230,345 240,340 250,340
  C 260,340 270,345 270,350
  L 270,460
  L 275,520
  L 275,565
  L 290,590
  C 294,598 312,598 308,590
  L 295,565
  L 295,520
  L 305,460
  L 305,370
  C 305,350 315,340 315,320
  L 315,200
  C 315,185 326,185 330,195
  L 345,245
  L 358,300
  L 370,330
  C 374,342 386,338 380,325
  L 370,300
  C 355,260 345,220 335,190
  L 320,140
  C 320,120 290,105 250,91 
  Z
`;

// Meridian flow tracings styled like glow lines, categorized by Element
interface MeridianChannel {
  name: string;
  view: 'front' | 'back';
  path: string;
  color: string;
  element: 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';
  abbr: string;
}

const MERIDIAN_CHANNELS: Record<string, MeridianChannel> = {
  'Lung': { name: 'Lung', abbr: 'LU', view: 'front', path: 'M 220,160 Q 185,150 180,140 Q 155,220 135,280 Q 130,300 110,310', color: '#64748b', element: 'Metal' },
  'Large Intestine': { name: 'Large Intestine', abbr: 'LI', view: 'front', path: 'M 120,330 Q 125,315 130,300 Q 145,260 155,210 Q 180,135 240,75', color: '#a1a1aa', element: 'Metal' },
  'Stomach': { name: 'Stomach', abbr: 'ST', view: 'front', path: 'M 255,75 Q 260,110 275,170 T 275,260 T 285,400 T 295,470 L 298,495 T 300,590', color: '#f59e0b', element: 'Earth' },
  'Spleen': { name: 'Spleen', abbr: 'SP', view: 'front', path: 'M 200,590 Q 215,570 216,540 T 220,420 T 210,260 T 210,170', color: '#eab308', element: 'Earth' },
  'Heart': { name: 'Heart', abbr: 'HT', view: 'front', path: 'M 235,160 Q 185,160 160,220 T 130,300 L 122,332', color: '#ef4444', element: 'Fire' },
  'Small Intestine': { name: 'Small Intestine', abbr: 'SI', view: 'back', path: 'M 118,320 Q 130,270 145,215 Q 175,145 242,65', color: '#f43f5e', element: 'Fire' },
  'Bladder': { name: 'Bladder', abbr: 'BL', view: 'back', path: 'M 250,25 Q 255,110 262,170 T 262,330 T 280,400 T 290,470 L 292,530 T 302,590', color: '#6366f1', element: 'Water' },
  'Kidney': { name: 'Kidney', abbr: 'KI', view: 'front', path: 'M 200,595 Q 213,570 215,505 T 225,400 T 242,280 T 242,160', color: '#3b82f6', element: 'Water' },
  'Pericardium': { name: 'Pericardium', abbr: 'PC', view: 'front', path: 'M 245,160 Q 325,140 365,280 T 375,315 L 380,330', color: '#a855f7', element: 'Fire' },
  'Triple Energizer': { name: 'Triple Energizer', abbr: 'TE', view: 'back', path: 'M 121,328 Q 138,260 152,218 Q 238,105 236,55', color: '#06b6d4', element: 'Fire' },
  'Gallbladder': { name: 'Gallbladder', abbr: 'GB', view: 'front', path: 'M 258,45 Q 265,55 268,105 T 288,220 T 312,340 T 305,410 T 302,480 T 300,565 L 304,590', color: '#10b981', element: 'Wood' },
  'Liver': { name: 'Liver', abbr: 'LR', view: 'front', path: 'M 202,590 Q 215,570 218,520 T 220,470 T 230,400 T 235,330 L 215,230', color: '#22c55e', element: 'Wood' }
};

export const MeridianMapOverlay: React.FC<MeridianMapOverlayProps> = ({ points }) => {
  const [selectedView, setSelectedView] = useState<'front' | 'back'>('front');
  const [activeSystemFilter, setActiveSystemFilter] = useState<'ALL' | AcupunctureSystem>('ALL');
  const [meridianFocus, setMeridianFocus] = useState<string | 'ALL'>('ALL');
  const [selectedPointName, setSelectedPointName] = useState<string>('LI4 (Hegu)');
  const [isCopied, setIsCopied] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  
  const clinicalCardRef = useRef<HTMLDivElement>(null);

  // Filter actual points database which have mapped coordinate positions
  const mappedPoints = useMemo(() => {
    return points.filter(p => {
      const matchName = p.name.split(' (')[0];
      return POINT_COORDS[p.name] || POINT_COORDS[matchName];
    });
  }, [points]);

  // Find currently active point data from database
  const activePoint = useMemo(() => {
    const found = points.find(p => p.name === selectedPointName);
    if (found) return found;

    // Try partial matching like "LI4" or "11.24 Fu Ke"
    const matchedPartial = points.find(p => p.name.includes(selectedPointName) || selectedPointName.includes(p.name));
    return matchedPartial || points[0];
  }, [points, selectedPointName]);

  // Coordinates of the selected point on the map
  const activePointCoords = useMemo(() => {
    if (!activePoint) return null;
    const matchName = activePoint.name.split(' (')[0];
    return POINT_COORDS[activePoint.name] || POINT_COORDS[matchName] || null;
  }, [activePoint]);

  // Auto-switch view (front/back) when a point is selected
  const handlePointSelect = (pName: string) => {
    setSelectedPointName(pName);
    const coords = POINT_COORDS[pName] || POINT_COORDS[pName.split(' (')[0]];
    if (coords) {
      setSelectedView(coords.view);
    }
  };

  // Needling Angle & Depth Simulation Parser
  const needlingProfile = useMemo(() => {
    if (!activePoint) return { angle: 90, angleLabel: 'Perpendicular', depthRange: '0.5-1.0 cun', maxCun: 1.0, layers: 'Muscle' };
    
    const tech = activePoint.technique.toLowerCase();
    let angle = 90;
    let angleLabel = 'Perpendicular (90°)';
    
    if (tech.includes('oblique')) {
      angle = 45;
      angleLabel = 'Oblique (45°)';
    } else if (tech.includes('horizontal') || tech.includes('transverse') || tech.includes('flat')) {
      angle = 15;
      angleLabel = 'Horizontal / Transverse (15°)';
    }

    // Extract numerical depth
    const matches = activePoint.technique.match(/(\d+\.\d+|\d+)-(\d+\.\d+|\d+)\s+cun/i);
    let depthRange = '0.5 - 1.0 cun';
    let maxCun = 1.0;
    if (matches && matches[0]) {
      depthRange = matches[0];
      maxCun = parseFloat(matches[2]) || 1.0;
    } else {
      const matchSingle = activePoint.technique.match(/(\d+\.\d+|\d+)\s+cun/i);
      if (matchSingle && matchSingle[0]) {
        depthRange = matchSingle[0];
        maxCun = parseFloat(matchSingle[1]) || 0.5;
      }
    }

    // Determine target layer based on maximum penetration depth
    let layers = 'Muscle Layer';
    if (maxCun <= 0.3) {
      layers = 'Epidermis & Dermis (Shallow)';
    } else if (maxCun <= 0.6) {
      layers = 'Subcutaneous Fascia Layer';
    } else if (maxCun <= 1.0) {
      layers = 'Subcutaneous & Shallow Muscle';
    } else {
      layers = 'Deep Muscle / Tendon Junction';
    }

    return { angle, angleLabel, depthRange, maxCun, layers };
  }, [activePoint]);

  // Get active system color for visual theme
  const activeElementColor = useMemo(() => {
    if (!activePoint) return 'text-teal-400 border-teal-500';
    const elem = activePoint.element;
    if (elem === 'Wood') return 'text-emerald-400 border-emerald-500/30 bg-emerald-900/10';
    if (elem === 'Fire') return 'text-rose-400 border-rose-500/30 bg-rose-900/10';
    if (elem === 'Earth') return 'text-amber-400 border-amber-500/30 bg-amber-900/10';
    if (elem === 'Metal') return 'text-slate-400 border-slate-500/30 bg-slate-900/10';
    return 'text-blue-400 border-blue-500/30 bg-blue-900/10'; // Water
  }, [activePoint]);

  const handleCopyText = async () => {
    if (!activePoint) return;
    const text = `==================================================
CLINICAL ACUPUNCTURE REFERENCE REPORT
==================================================
Point Name          : ${activePoint.name}
Acupuncture System  : ${activePoint.system === AcupunctureSystem.MASTER_TUNG ? "Master Tung's Family Lineage" : "Traditional Chinese Medicine (TCM)"}
Wuxing Element      : ${activePoint.element || 'None / Not Applicable'}
Standard needle depth: ${needlingProfile.depthRange}
Anatomical Location : ${activePoint.location}
${activePoint.reactionArea ? `Reaction Area       : ${activePoint.reactionArea}\n` : ''}Clinical Indications: ${activePoint.indication}

NEEDLING PROTOCOL SPECIFICATIONS:
- Insertion Angle   : ${needlingProfile.angleLabel}
- Penetration Depth : ${needlingProfile.maxCun} cun (${needlingProfile.depthRange})
- Target Tissue     : ${needlingProfile.layers}
- Clinical technique: ${activePoint.technique}

--------------------------------------------------
Generated via TCM WuXing Pro Clinical Assistant
Date: ${new Date().toLocaleDateString('id-ID')}
================================================--`;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleSaveAsPdf = async () => {
    if (!activePoint || !clinicalCardRef.current) return;
    setIsPdfExporting(true);
    try {
      const element = clinicalCardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0f1d', // Match the clinical card background
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      
      const contentWidth = pdfWidth - (margin * 2);
      const imgProps = pdf.getImageProperties(imgData);
      const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

      pdf.setFillColor(10, 15, 29); // #0a0f1d (dark slate)
      pdf.rect(0, 0, pdfWidth, pdf.internal.pageSize.getHeight(), 'F');
      
      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
      pdf.save(`TCM_Acupoint_${activePoint.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Ekspor PDF gagal. Silakan coba kembali.');
    } finally {
      setIsPdfExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 bg-slate-950 p-6 rounded-3xl border border-purple-900/30 text-white shadow-2xl relative overflow-hidden">
      
      {/* Decorative Sci-Fi Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />

      {/* LEFT: INTERACTIVE ANATOMICAL PLANNER (5 Columns) */}
      <div className="xl:col-span-5 flex flex-col gap-4 relative z-10">
        
        {/* VIEW SELECTORS */}
        <div className="flex justify-between items-center bg-slate-900/80 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedView('front')}
              className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-wider transition-all ${
                selectedView === 'front' 
                  ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Anterior (Front)
            </button>
            <button
              onClick={() => setSelectedView('back')}
              className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-wider transition-all ${
                selectedView === 'back' 
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Posterior (Back)
            </button>
          </div>

          <div className="flex text-[9px] font-black uppercase text-slate-500 items-center gap-1.5 pr-2">
            <Crosshair className="w-3.5 h-3.5 text-teal-400" />
            3D Bioscan Grid
          </div>
        </div>

        {/* SYSTEM SELECTOR */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/50 p-1 rounded-xl border border-white/5">
          <button 
            type="button"
            onClick={() => { setActiveSystemFilter('ALL'); setMeridianFocus('ALL'); }}
            className={`py-1 rounded text-[9px] uppercase font-black ${activeSystemFilter === 'ALL' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            All Systems
          </button>
          <button 
            type="button"
            onClick={() => { setActiveSystemFilter(AcupunctureSystem.TCM); setMeridianFocus('ALL'); }}
            className={`py-1 rounded text-[9px] uppercase font-black ${activeSystemFilter === AcupunctureSystem.TCM ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            TCM Standard
          </button>
          <button 
            type="button"
            onClick={() => { setActiveSystemFilter(AcupunctureSystem.MASTER_TUNG); setMeridianFocus('ALL'); }}
            className={`py-1 rounded text-[9px] uppercase font-black ${activeSystemFilter === AcupunctureSystem.MASTER_TUNG ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Master Tung
          </button>
        </div>

        {/* MERIDIAN SELECTOR SPOTLIGHT */}
        <div className="flex flex-col gap-1.5 bg-slate-900/40 p-3 rounded-2xl border border-white/5">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Focus Meridian Channel</label>
          <select
            value={meridianFocus}
            onChange={(e) => setMeridianFocus(e.target.value)}
            className="w-full bg-slate-950 border border-purple-900/40 text-xs font-bold text-teal-400 py-1.5 px-3 rounded-xl outline-none focus:border-teal-400/50"
          >
            <option value="ALL">Show All System Pathways</option>
            {Object.entries(MERIDIAN_CHANNELS).map(([mName, target]) => {
              if (activeSystemFilter === AcupunctureSystem.MASTER_TUNG) return null; // Channels apply to TCM Standard
              return (
                <option key={mName} value={mName}>
                  {target.abbr} - {mName} Meridian ({target.element} Element)
                </option>
              );
            })}
          </select>
        </div>

        {/* VECTOR SVG CANVAS MAP */}
        <div className="bg-slate-900/65 rounded-3xl border border-white/5 relative aspect-[1/1.2] flex items-center justify-center overflow-hidden shadow-inner group">
          <svg viewBox="0 0 500 620" className="w-full h-full select-none cursor-crosshair">
            {/* Background Grid Pattern */}
            <defs>
              <pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1.5" fill="rgba(147, 51, 234, 0.15)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-grid)" />

            {/* Stylized Symmetrical Bio-Silhouette */}
            <path 
              d={BODY_OUTLINE_PATH} 
              fill="rgba(15, 23, 42, 0.95)" 
              stroke="rgba(20, 184, 166, 0.35)" 
              strokeWidth="1.5" 
              className="transition-all duration-300 filter drop-shadow-[0_0_12px_rgba(20,184,166,0.1)]"
            />
            {/* Outline highlight ring */}
            <path 
              d={BODY_OUTLINE_PATH} 
              fill="none" 
              stroke="rgba(168, 85, 247, 0.3)" 
              strokeWidth="0.8" 
              className="transition-all duration-300 pointer-events-none"
            />

            {/* Head Contour and anatomical wire indicators */}
            <circle cx="250" cy="55" r="23" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(20, 184, 166, 0.45)" strokeWidth="1" />
            
            {/* Anterior (Front) Facial mapping guidelines */}
            {selectedView === 'front' ? (
              <g stroke="rgba(20, 184, 166, 0.2)" strokeWidth="0.8" fill="none">
                <line x1="238" y1="52" x2="244" y2="52" />
                <line x1="256" y1="52" x2="262" y2="52" />
                <path d="M 245,62 Q 250,65 255,62" />
                {/* Organ lines */}
                <path d="M 218,170 Q 250,158 282,170" />
                <path d="M 210,195 Q 250,183 290,195" />
                <path d="M 205,220 Q 250,208 295,220" />
                <path d="M 205,245 Q 250,233 295,245" />
                <line x1="250" y1="130" x2="250" y2="255" />
                {/* Patellas */}
                <circle cx="218" cy="470" r="9" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(20, 184, 166, 0.3)" />
                <circle cx="282" cy="470" r="9" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(20, 184, 166, 0.3)" />
              </g>
            ) : (
              <g stroke="rgba(168, 85, 247, 0.2)" strokeWidth="0.8" fill="none">
                {/* Spine Backbone */}
                <line x1="250" y1="85" x2="250" y2="340" strokeDasharray="3 3" />
                {/* Scapulas */}
                <path d="M 195,130 L 215,135 L 205,175 Z" />
                <path d="M 305,130 L 285,135 L 295,175 Z" />
              </g>
            )}

            {/* Inguinal / Pelvic fold lines */}
            <path d="M 205,315 C 220,332 280,332 295,315" fill="none" stroke="rgba(147, 51, 234, 0.2)" strokeWidth="1" />

            {/* MERIDIAN PATHWAYS GLOW LINES */}
            {Object.entries(MERIDIAN_CHANNELS).map(([mName, target]) => {
              if (selectedView !== target.view) return null;
              if (activeSystemFilter === AcupunctureSystem.MASTER_TUNG) return null; // Tung is non-meridian based lineage
              
              const isFocused = meridianFocus === 'ALL' || meridianFocus === mName;
              return (
                <g key={mName}>
                  {/* Subtle outer glow neon path */}
                  <path
                    d={target.path}
                    fill="none"
                    stroke={target.color}
                    strokeWidth={isFocused ? 3 : 0.5}
                    opacity={isFocused ? 0.75 : 0.15}
                    className="transition-all duration-300 pointer-events-none"
                    style={{ filter: isFocused ? `drop-shadow(0 0 4px ${target.color})` : 'none' }}
                  />
                  {/* Inner thin fiber path */}
                  <path
                    d={target.path}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={0.8}
                    opacity={isFocused ? 0.85 : 0.08}
                    className="transition-all duration-300 pointer-events-none"
                  />
                </g>
              );
            })}

            {/* ACUPUNCTURE POINT NODES */}
            {mappedPoints.map((point) => {
              const matchedPartial = point.name.split(' (')[0];
              const coords = POINT_COORDS[point.name] || POINT_COORDS[matchedPartial];
              if (!coords || coords.view !== selectedView) return null;

              // Check System filters
              if (activeSystemFilter !== 'ALL' && point.system !== activeSystemFilter) return null;

              const isSelected = selectedPointName === point.name;
              const isTung = point.system === AcupunctureSystem.MASTER_TUNG;
              const pointColor = isTung ? '#c084fc' : '#2dd4bf'; // Purple for Tung, Teal for TCM
              const pointRingColor = isTung ? 'rgba(168, 85, 247, 0.5)' : 'rgba(20, 184, 166, 0.5)';

              return (
                <g 
                  key={point.name}
                  onClick={() => handlePointSelect(point.name)}
                  className="cursor-pointer group/node"
                >
                  {/* Glowing Animated Pulse Rings */}
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r={isSelected ? 10 : 6}
                    fill="none"
                    stroke={pointColor}
                    strokeWidth={isSelected ? 2.5 : 1}
                    className={`transition-all duration-300 ${isSelected ? 'animate-pulse' : 'opacity-40 group-hover/node:opacity-100'}`}
                  />
                  {isSelected && (
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r={18}
                      fill="none"
                      stroke={pointColor}
                      strokeWidth={1}
                      opacity={0.65}
                      className="animate-ping"
                      style={{ animationDuration: '3s' }}
                    />
                  )}

                  {/* Core Point Dot */}
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r={isSelected ? 5.5 : 3.5}
                    fill={isSelected ? '#ffffff' : pointColor}
                    stroke={isSelected ? pointColor : '#0f172a'}
                    strokeWidth={1.5}
                    className="transition-all duration-300 shadow-md"
                  />

                  {/* Floating Micro Label (Visible on hover or when selected) */}
                  <g className={`transition-all duration-300 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/node:opacity-100'}`}>
                    <rect
                      x={coords.x + 8}
                      y={coords.y - 12}
                      width={85}
                      height={18}
                      rx={4}
                      fill="rgba(15, 23, 42, 0.9)"
                      stroke={pointColor}
                      strokeWidth={1}
                    />
                    <text
                      x={coords.x + 13}
                      y={coords.y}
                      fill="#ffffff"
                      fontSize="9px"
                      fontWeight="black"
                      fontFamily="monospace"
                    >
                      {point.name.split(' ')[0]}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Quick HUD Overlay Stats */}
          <div className="absolute bottom-4 left-4 bg-slate-950/80 p-2.5 rounded-xl border border-white/5 font-mono text-[9px] text-slate-400 leading-tight space-y-0.5 pointer-events-none">
            <div><span className="text-teal-400">FPS:</span> 60 SYS</div>
            <div><span className="text-teal-400">COORD:</span> X:{activePointCoords?.x || '00'}, Y:{activePointCoords?.y || '00'}</div>
            <div><span className="text-purple-400">ACTIVE:</span> {activePoint?.name.split(' ')[0]}</div>
          </div>
        </div>
      </div>

      {/* RIGHT: DETAILED CLINICAL PANEL & GAUGE (7 Columns) */}
      <div className="xl:col-span-7 flex flex-col gap-5 relative z-10">
        
        {/* SECTION HEADER */}
        <div className="border-b border-purple-900/30 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">
              Biomedical & TCM Meridian Analysis
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-none mt-1.5">
            Interactively assess standard needling depth, vectors, and clinical indications
          </p>
        </div>

        {/* DETAILS CARD */}
        {activePoint ? (
          <div ref={clinicalCardRef} className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-[#0a0f1d] p-5 rounded-3xl border border-purple-900/10">
            
            {/* STATS & METADATA COLUMN */}
            <div className="space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-3 shadow-md">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Standard Codename</span>
                    <h4 className="text-base font-black text-teal-400 tracking-tight leading-none mt-0.5">{activePoint.name}</h4>
                  </div>
                  <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter border ${
                    activePoint.system === AcupunctureSystem.MASTER_TUNG 
                      ? 'bg-purple-950 text-purple-400 border-purple-900/30' 
                      : 'bg-teal-950 text-teal-400 border-teal-900/30'
                  }`}>
                    {activePoint.system === AcupunctureSystem.MASTER_TUNG ? 'Master Tung' : 'TCM'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pb-2">
                  <div className="bg-slate-950 p-2 rounded-xl border border-white/5">
                    <span className="text-[8px] font-black text-slate-500 uppercase block leading-none">Wuxing Element</span>
                    <span className={`text-xs font-black uppercase inline-block mt-1 ${activeElementColor}`}>{activePoint.element}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-white/5">
                    <span className="text-[8px] font-black text-slate-500 uppercase block leading-none">Standard Depth</span>
                    <span className="text-xs font-black text-slate-200 inline-block mt-1 uppercase font-mono">{needlingProfile.depthRange}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5 block flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-purple-400 shrink-0" /> Exact Anatomical Location
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold">{activePoint.location}</p>
                </div>

                {activePoint.reactionArea && (
                  <div>
                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider mb-0.5 block">
                      Reaction Area (Master Tung Core)
                    </span>
                    <p className="text-xs text-slate-300 font-bold bg-amber-950/20 p-2 rounded-lg border border-amber-900/20">
                      {activePoint.reactionArea}
                    </p>
                  </div>
                )}
              </div>

              {/* INDICATION BULLETINS */}
              <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-1 border-b border-white/5 mb-1.5">
                  <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" /> Clinical Indications / Treatment Functions
                </span>
                <p className="text-xs text-teal-100 font-bold leading-relaxed">{activePoint.indication}</p>
              </div>
            </div>

            {/* NEEDLING ANGLE & DEPTH GAUGE SIMULATOR */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 flex flex-col justify-between shadow-md">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Needling Vector Guide
                  </span>
                  <span className="text-[8px] font-mono bg-rose-950/30 text-rose-400 px-1.5 py-0.5 rounded border border-rose-900/30 font-black">ACTIVE SIM</span>
                </div>
                
                {/* Visual Simulator Display stage */}
                <div className="h-[145px] bg-slate-950 border border-purple-900/30 rounded-xl relative overflow-hidden flex flex-col mt-3">
                  {/* Epidermis (Yellow top line skin layer) */}
                  <div className="h-[12px] bg-[#fbbf24] bg-opacity-[0.16] border-b border-amber-500/20 px-3 flex items-center justify-between text-[7px] text-amber-500 font-mono font-black uppercase">
                    <span>Epidermis / Dermis</span>
                    <span>0.0 - 0.2 cun</span>
                  </div>
                  
                  {/* Subcutaneous Fascia */}
                  <div className="h-[25px] bg-[#c084fc] bg-opacity-[0.11] border-b border-purple-500/10 px-3 flex items-center justify-between text-[7px] text-purple-400 font-mono font-black uppercase">
                    <span>Subcutaneous Fascia</span>
                    <span>0.2 - 0.6 cun</span>
                  </div>

                  {/* Muscle tissue backdrop */}
                  <div className="flex-1 bg-gradient-to-b from-red-950/20 to-red-950/40 relative px-3 pt-1">
                    <div className="flex items-center justify-between text-[7px] text-rose-500/60 font-mono font-black uppercase">
                      <span>Skeletal Muscle Layer</span>
                      <span>0.6 - 3.0 cun</span>
                    </div>

                    {/* Ruler Tickers along the right side */}
                    <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-between text-[6px] font-mono font-black text-slate-500 py-1">
                      <div>0.5c</div>
                      <div>1.0c</div>
                      <div>1.5c</div>
                      <div>2.0c</div>
                    </div>
                  </div>

                  {/* NEEDLE VECTOR DRAWING */}
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-full transition-all duration-500 flex flex-col items-center pointer-events-none"
                    style={{ 
                      transform: `rotate(${needlingProfile.angle - 90}deg)`, 
                      transformOrigin: 'top center' 
                    }}
                  >
                    {/* Metal needle handle */}
                    <div className="w-[3px] h-[34px] bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 rounded-t border-b border-yellow-800 shadow" />
                    
                    {/* Needle handle loop */}
                    <div className="w-[4px] h-[5px] bg-amber-600 rounded-b mt-[-1px] filter drop-shadow-[0_0_2px_rgba(251,191,36,0.3)]" />

                    {/* Steel slim shaft */}
                    <div 
                      className="w-[1px] bg-slate-300 relative transition-all duration-500"
                      style={{ 
                        height: `${Math.min(needlingProfile.maxCun * 38, 92)}px` // scaled dynamically
                      }}
                    >
                      {/* Deep penetration point glow */}
                      <div className="absolute bottom-0 left-[-1.5px] w-[4px] h-[4px] rounded-full bg-rose-500 animate-ping" />
                      <div className="absolute bottom-0 left-[-1px] w-[3px] h-[3px] rounded-full bg-rose-400" />
                    </div>
                  </div>
                </div>

                {/* Needle spec readings */}
                <div className="space-y-1.5 mt-3 text-xs bg-slate-950/50 p-2.5 rounded-xl border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Insertion Angle:</span>
                    <span className="font-extrabold text-[#fecdd3]">{needlingProfile.angleLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Max Depth Gauge:</span>
                    <span className="font-bold font-mono text-teal-400">{needlingProfile.maxCun} cun ({needlingProfile.depthRange})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Target Anatomical Layer:</span>
                    <span className="font-black text-amber-500">{needlingProfile.layers}</span>
                  </div>
                </div>
              </div>

              {/* TECHNIQUE WARNING & COAX */}
              <div className="mt-4 flex gap-2.5 bg-rose-950/20 border border-rose-950/40 p-3 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block">Clinical Safety Warning</span>
                  <p className="text-[11px] font-medium text-slate-300 mt-0.5 leading-relaxed italic">
                    "{activePoint.technique}"
                  </p>
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="bg-slate-900/40 p-8 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center gap-3">
            <Crosshair className="w-8 h-8 text-[#2dd4bf] animate-spin" />
            <p className="text-xs text-slate-300 font-bold">Select any point indicator on the 3D bioscan map to trigger holographic analysis.</p>
          </div>
        )}

        {/* QUICK SEARCH & QUICK LOOKUP DOT PILES */}
        <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5 space-y-3.5">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Available Clinical Point Nodes ({mappedPoints.length})</span>
            <p className="text-[9px] text-slate-500 mt-0.5">Click any standard codon code bellow to trigger dynamic scanning and map view updates:</p>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {mappedPoints.map(p => {
              const isActive = selectedPointName === p.name;
              const isTung = p.system === AcupunctureSystem.MASTER_TUNG;
              return (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => handlePointSelect(p.name)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono uppercase transition-all tracking-tight flex items-center gap-1 ${
                    isActive 
                      ? 'bg-teal-500 text-slate-950 font-black scale-105' 
                      : isTung
                      ? 'bg-purple-950/30 hover:bg-purple-900/20 text-purple-300 border border-purple-900/30'
                      : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-white/5'
                  }`}
                >
                  <MapPin className={`w-3 h-3 ${isActive ? 'text-slate-950' : isTung ? 'text-purple-400' : 'text-teal-400'}`} />
                  {p.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTION BUTTONS (COPY & PDF) */}
        {activePoint && (
          <div className="grid grid-cols-2 gap-3" data-html2canvas-ignore="true">
            <button
              onClick={handleCopyText}
              className="group flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-white/5 hover:border-white/10 transition-all font-bold text-[11px] uppercase tracking-wider shadow-md active:scale-95"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 animate-bounce" />
                  Salin Berhasil!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                  Salin Teks Klinis
                </>
              )}
            </button>

            <button
              onClick={handleSaveAsPdf}
              disabled={isPdfExporting}
              className="group flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all font-black text-[11px] uppercase tracking-widest shadow-lg shadow-purple-950/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPdfExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mengekspor...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-teal-300 group-hover:translate-y-0.5 transition-transform" />
                  Simpan PDF
                </>
              )}
            </button>
          </div>
        )}

      </div>

    </div>
  );
};

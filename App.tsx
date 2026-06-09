
import React, { useState, useRef, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Send, Activity, MessageSquare, Stethoscope, Archive, Compass, GraduationCap, Shield, LogOut, ClipboardList, Loader2, Menu, X, Globe, User, LayoutGrid, Scale, Paperclip, Image as ImageIcon, Zap, ChevronDown, ChevronRight, AlertCircle, Heart, Mic, MicOff } from 'lucide-react';
import { Language, ChatMessage, ScoredSyndrome, UserAccount, TcmDiagnosisResult, AppSettings } from './types';
import { sendMessageToGeminiStream } from './services/geminiService';
import { analyzePatient } from './services/tcmLogic';
import { db, DEFAULT_ADMIN } from './services/db';
import { getSupabase, isSupabaseConfigured, disableSupabase } from './supabase';
import DiagnosisCard from './components/DiagnosisCard';
import PatientFormModal from './components/PatientFormModal';
import WuXingVisualizerModal from './components/WuXingVisualizerModal';
import ScoringAndPointsHub from './components/ScoringAndPointsHub';
import WuXingMasterPanel from './components/WuXingMasterPanel';
import LoginScreen from './components/LoginScreen';
import UserManagementModal from './components/UserManagementModal';
import UkomPracticePanel from './components/UkomPracticePanel';
import PatientArchivePanel from './components/PatientArchivePanel';
import SyndromeAtlasWindow from './components/SyndromeAtlasWindow';
import AcupuncturePointsPanel from './components/AcupuncturePointsPanel';

import InvoiceGeneratorPanel from './components/InvoiceGeneratorPanel';
import BMIKomplitPanel from './components/BMIKomplitPanel';
import { DailyWellnessTracker } from './components/DailyWellnessTracker';
import { TcmGlossaryTooltip } from './components/TcmGlossaryTooltip';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-rose-100 text-center">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-rose-600" />
            </div>
            <h1 className="text-2xl font-black text-rose-900 uppercase tracking-tight mb-4">System Error</h1>
            <p className="text-sm text-rose-600 mb-8 font-medium">
              Something went wrong in the TCM Engine. Please try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
            >
              Refresh Application
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-8 p-4 bg-rose-50 rounded-xl text-[10px] text-rose-800 text-left overflow-auto max-h-40 font-mono">
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(DEFAULT_ADMIN);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    console.log("APP: Current Settings State:", settings);
  }, [settings]);

  const handleResetKeys = async () => {
    if (!settings) return;
    const newKeys = (settings.geminiApiKeys || []).map(k => ({ ...k, isExhausted: false }));
    const newSettings = { ...settings, geminiApiKeys: newKeys };
    setSettings(newSettings);
    await db.settings.update(newSettings);
    window.location.reload();
  };

  // Persist user session to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('tcm_active_session', JSON.stringify(currentUser));
    } else if (isAuthReady) {
      localStorage.removeItem('tcm_active_session');
    }
  }, [currentUser, isAuthReady]);

  useEffect(() => {
    const loadSettings = async () => {
      const s = await db.settings.get();
      if (s) {
        setSettings(s);
      } else {
        setSettings({
          geminiApiKey: '',
          geminiApiKeys: [],
          clinicName: 'TCM Clinic',
          clinicAddress: '',
          clinicPhone: ''
        });
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    let subscription: any;

    const initAuth = async () => {
      if (!isSupabaseConfigured()) {
        const saved = localStorage.getItem('tcm_active_session');
        if (saved) {
          setCurrentUser(JSON.parse(saved));
        } else {
          setCurrentUser(DEFAULT_ADMIN);
        }
        setIsAuthReady(true);
        return;
      }

      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser({
            uid: session.user.id,
            username: session.user.user_metadata.full_name || session.user.email || 'User',
            password: '',
            role: (session.user.user_metadata.role as any) || 'REGULAR',
            createdAt: new Date(session.user.created_at).getTime()
          });
        } else {
          const saved = localStorage.getItem('tcm_active_session');
          if (saved) {
             setCurrentUser(JSON.parse(saved));
          } else {
             setCurrentUser(DEFAULT_ADMIN);
          }
        }

        // ONLY subscribe to auth state changes after the initial session has been retrieved successfully.
        // This avoids concurrent lock allocation requests to 'supabase.auth.token' inside iframe environments.
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setCurrentUser({
              uid: session.user.id,
              username: session.user.user_metadata.full_name || session.user.email || 'User',
              password: '',
              role: (session.user.user_metadata.role as any) || 'REGULAR',
              createdAt: new Date(session.user.created_at).getTime()
            });
          } else {
            const saved = localStorage.getItem('tcm_active_session');
            if (!saved) {
              setCurrentUser(DEFAULT_ADMIN);
            } else {
              setCurrentUser(JSON.parse(saved));
            }
          }
        });
        subscription = data.subscription;

      } catch (e: any) {
        console.warn("Auth init failed, falling back to local credentials:", e);
        if (e && (e.message?.includes('fetch') || e.toString().includes('fetch') || e.name === 'TypeError')) {
          disableSupabase();
        }
        const saved = localStorage.getItem('tcm_active_session');
        if (saved) {
          setCurrentUser(JSON.parse(saved));
        } else {
          setCurrentUser(DEFAULT_ADMIN);
        }
      } finally {
        setIsAuthReady(true);
      }
    };

    initAuth();

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (e) {}
      }
    };
  }, []);

  const [activePanel, setActivePanel] = useState<'chat' | 'diagnosis' | 'wuxing' | 'ukom' | 'archive' | 'atlas' | 'invoice' | 'bmi'>('chat');
  const [appLanguage, setAppLanguage] = useState<Language>(Language.INDONESIAN);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: 'Sistem Siap. Masukkan keluhan pasien untuk analisis cepat atau gunakan Form Input Pasien.', timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{data: string, type: string, name: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Web Speech API Transcription State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Stop speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleToggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      const SpeechRegClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRegClass) {
        alert(appLanguage === Language.ENGLISH 
          ? "Your browser does not support Speech Recognition. Please try Google Chrome or Safari." 
          : "Browser Anda tidak mendukung Pengenalan Suara. Silakan coba Google Chrome atau Safari."
        );
        return;
      }

      try {
        const rec = new SpeechRegClass();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = appLanguage === Language.ENGLISH ? 'en-US' : 'id-ID';

        const baseText = inputText ? (inputText.trim() ? inputText.trim() + ' ' : '') : '';
        let finalTranscript = '';

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          setInputText(baseText + finalTranscript + interimTranscript);
        };

        rec.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setIsListening(false);
      }
    }
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [cdssResults, setCdssResults] = useState<ScoredSyndrome[]>([]);
  const [lastPatientForm, setLastPatientForm] = useState<any>(null);
  const [selectedAtlasId, setSelectedAtlasId] = useState<string | undefined>(undefined);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [showAcupunctureRef, setShowAcupunctureRef] = useState(false);
  const [showWellnessTracker, setShowWellnessTracker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textOverride?: string, analysis?: ScoredSyndrome[], patientData?: any) => {
    const textToSend = textOverride || inputText;
    if ((!textToSend.trim() && !selectedFile) || isLoading) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }

    setIsLoading(true);
    const fileToSend = selectedFile?.data;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend, timestamp: new Date(), image: fileToSend || undefined };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSelectedFile(null);

    const botMsgId = (Date.now() + 1).toString();
    const loadingText = appLanguage === Language.ENGLISH ? "Analyzing meridian patterns and syndromes..." : "Menganalisis pola meridian dan sindrom...";
    setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: loadingText, timestamp: new Date() }]);

    try {
      const result = await sendMessageToGeminiStream(
        textToSend, 
        fileToSend || undefined, 
        messages, 
        appLanguage, 
        false, 
        analysis || cdssResults,
        settings?.geminiApiKeys,
        undefined, // onChunk
        async (exhaustedKey) => {
          if (settings) {
            const updatedKeys = settings.geminiApiKeys.map(k => 
              k.key === exhaustedKey ? { ...k, isExhausted: true } : k
            );
            const newSettings = { ...settings, geminiApiKeys: updatedKeys };
            setSettings(newSettings);
            await db.settings.update(newSettings);
          }
        }
      );
      
      const response = result.data;
      
      setMessages(prev => prev.map(m => m.id === botMsgId ? { 
        ...m, 
        text: response.conversationalResponse || "Analysis Complete.", 
        tcmResult: response.diagnosis 
      } : m));

      // Save to database if this was triggered by a patient form submission
      if (patientData && response.diagnosis) {
        await db.patients.add({
          id: Date.now().toString(),
          patientName: patientData.patientName || 'Unknown',
          age: patientData.age || '',
          sex: patientData.sex || '',
          phone: patientData.phone || '',
          email: patientData.email || '',
          address: patientData.address || '',
          complaint: patientData.complaint || '',
          symptoms: patientData.symptoms || '',
          selectedSymptoms: patientData.selectedSymptoms || [],
          tongue: patientData.tongue || {},
          pulse: patientData.pulse || {},
          diagnosis: response.diagnosis,
          timestamp: Date.now(),
          medicalHistory: patientData.medicalHistory || '',
          biomedicalDiagnosis: patientData.biomedicalDiagnosis || '',
          icd10: patientData.icd10 || '',
          notes: patientData.notes || ''
        });
      }
    } catch (error: any) {
      console.error("Chat Error:", error);
      let errorMsg = appLanguage === Language.ENGLISH ? "Failed to process data. Please check your API connection." : "Gagal memproses data. Mohon periksa koneksi API Anda.";
      
      const isFetchError = error.message?.includes('fetch') || error.toString().includes('fetch') || error.name === 'TypeError';
      
      if (isFetchError) {
        errorMsg = appLanguage === Language.ENGLISH
          ? "Connection error (Failed to Fetch). This typically happens because:\n1. Your school/work firewall or VPN is blocking the API request.\n2. The backend server is currently starting up or restarting (please wait/refresh the page).\n3. No valid Gemini API Key is configured in Settings."
          : "Kesalahan Koneksi (Gagal Menghubungi API). Hal ini biasanya terjadi karena:\n1. Jaringan internet Anda memblokir koneksi (misal menggunakan VPN, proxy, atau sistem filter kantor/sekolah).\n2. Server backend sedang melakukan pencadangan/booting up (mohon tunggu sebentar lalu muat ulang halaman ini).\n3. Anda belum memasukkan API Key Gemini yang valid di menu Settings.";
      } else if (error.message && !error.message.includes("429") && !error.message.includes("quota")) {
        errorMsg = error.message;
      }
      
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: errorMsg, isError: true } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile({
          data: reader.result as string,
          type: file.type,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (data: any) => {
    setLastPatientForm(data);
    const results = analyzePatient({ symptoms: data.symptoms, selectedSymptoms: data.selectedSymptoms, tongue: data.tongue, pulse: data.pulse });
    setCdssResults(results);
    setActivePanel('chat');
    const msg = `PATIENT: ${data.patientName}, AGE: ${data.age}, SEX: ${data.sex}, PHONE: ${data.phone || 'N/A'}, EMAIL: ${data.email || 'N/A'}, ADDRESS: ${data.address || 'N/A'}. COMPLAINT: ${data.complaint}. SYMPTOMS: ${data.symptoms} ${data.selectedSymptoms?.join(', ') || ''}. TONGUE: ${data.tongue.body_color}, Coat: ${data.tongue.coating_color} (${data.tongue.coating_quality}), Features: ${data.tongue.special_features?.join(', ') || 'None'}. PULSE: ${data.pulse.qualities?.join(', ') || 'None'}. CLINICAL NOTES / SPECIFIC OBSERVATIONS: ${data.notes || 'None'}`;
    handleSendMessage(msg, results, data);
  };

  const toggleLanguage = () => {
    setAppLanguage(prev => prev === Language.INDONESIAN ? Language.ENGLISH : Language.INDONESIAN);
  };

  const handleDownloadTranscript = async (format: 'txt' | 'pdf') => {
    if (messages.length === 0) return;

    const dateString = new Date().toLocaleString(appLanguage === Language.ENGLISH ? 'en-US' : 'id-ID');
    
    if (format === 'txt') {
      let text = `==================================================\n`;
      text += `   TCM WUXING PRO - CLINICAL CHAT TRANSCRIPT\n`;
      text += `==================================================\n`;
      text += `Date Generated: ${dateString}\n`;
      if (lastPatientForm) {
        text += `Patient: ${lastPatientForm.patientName || 'Anonymous'} (${lastPatientForm.age || '-'} y/o, ${lastPatientForm.sex || '-'})\n`;
        text += `Clinical Complaint: ${lastPatientForm.complaint || '-'}\n`;
      }
      text += `--------------------------------------------------\n\n`;

      messages.forEach((msg) => {
        const sender = msg.role === 'user' ? 'USER/PRACTITIONER' : 'ASSISTANT/TCM EXPERT';
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        text += `[${sender}] (${time})\n`;
        text += `${msg.text}\n`;
        if (msg.tcmResult) {
          text += `[DIAGNOSIS RESULTS]: ${msg.tcmResult.patternId}\n`;
          text += `Explanation: ${msg.tcmResult.explanation}\n`;
          text += `Acupoints: ${msg.tcmResult.recommendedPoints?.map(p => p.code).join(', ') || '-'}\n`;
        }
        text += `\n--------------------------------------------------\n\n`;
      });

      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `TCM_Chat_Transcript_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let y = 20;

      const checkPageBreak = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          doc.addPage();
          y = 20;
        }
      };

      // Header Banner
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(107, 33, 168); // purple-800
      doc.text("TCM WUXING PRO", margin, y);
      y += 7;

      doc.setFontSize(10);
      doc.setTextColor(115, 115, 115); // gray-500
      doc.setFont("helvetica", "normal");
      doc.text(`Clinical Chat Transcript  |  Generated on: ${dateString}`, margin, y);
      y += 5;

      doc.setDrawColor(233, 213, 255); // purple-200
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      if (lastPatientForm) {
        checkPageBreak(25);
        doc.setFillColor(250, 245, 255); // very light warm purple
        doc.rect(margin, y, contentWidth, 22, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(88, 28, 135); // purple-900
        doc.text(`Patient Case Intake:`, margin + 4, y + 6);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85); // slate-700
        doc.text(`Name: ${lastPatientForm.patientName || 'Anonymous'}  |  Age: ${lastPatientForm.age || '-'}  |  Sex: ${lastPatientForm.sex || '-'}`, margin + 4, y + 12);
        doc.text(`Main Complaint: ${lastPatientForm.complaint ? (lastPatientForm.complaint.length > 80 ? lastPatientForm.complaint.substring(0, 80) + '...' : lastPatientForm.complaint) : '-'}`, margin + 4, y + 17);
        y += 28;
      }

      messages.forEach((msg) => {
        checkPageBreak(20);

        const sender = msg.role === 'user' ? (appLanguage === Language.ENGLISH ? 'Practitioner' : 'Praktisi') : (appLanguage === Language.ENGLISH ? 'TCM AI Expert' : 'Pakar AI TCM');
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        doc.setFillColor(msg.role === 'user' ? 245 : 243, msg.role === 'user' ? 245 : 232, msg.role === 'user' ? 255 : 255);
        doc.rect(margin, y - 1, contentWidth, 7, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(msg.role === 'user' ? 147 : 13, msg.role === 'user' ? 51 : 148, msg.role === 'user' ? 234 : 136);
        doc.text(`[${sender}]  ${time}`, margin + 3, y + 4);
        y += 11;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);

        const lines = doc.splitTextToSize(msg.text, contentWidth - 6);
        lines.forEach((line: string) => {
          checkPageBreak(6);
          doc.text(line, margin + 3, y);
          y += 5.5;
        });

        if (msg.tcmResult) {
          checkPageBreak(25);
          doc.setFillColor(240, 253, 250);
          doc.rect(margin + 3, y + 2, contentWidth - 6, 18, 'F');
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(13, 148, 136);
          doc.text(`CDSS Assessment Pattern:`, margin + 7, y + 7);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          const diagLine = `${msg.tcmResult.patternId}  - Score: ${msg.tcmResult.score || '100'}%`;
          doc.text(diagLine, margin + 7, y + 13);
          y += 24;
        }

        y += 6;
      });

      doc.save(`TCM_Chat_Transcript_${new Date().toISOString().slice(0, 10)}.pdf`);
    }
  };

  const handleAtlasSelect = (id: string) => {
    setSelectedAtlasId(id);
    setActivePanel('diagnosis');
  };

  const handleLogout = () => {
    setCurrentUser(DEFAULT_ADMIN);
    localStorage.setItem('tcm_active_session', JSON.stringify(DEFAULT_ADMIN));
    if (isSupabaseConfigured()) {
      try {
        getSupabase().auth.signOut();
      } catch (err) {}
    }
    window.location.reload();
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-tcm-primary animate-spin" />
      </div>
    );
  }

  if (!currentUser) return <LoginScreen onLoginSuccess={setCurrentUser} />;

  const SidebarTab = ({ id, label, icon: Icon }: { id: typeof activePanel, label: string, icon: any }) => {
    const isActive = activePanel === id;
    return (
      <button 
        onClick={() => {setActivePanel(id); setIsSidebarOpen(false);}} 
        className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${
          isActive 
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' 
          : 'bg-transparent text-purple-600 hover:bg-purple-50 hover:text-purple-900'
        }`}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-purple-500'}`} /> 
        {label}
      </button>
    );
  };

  return (
    <ErrorBoundary>
      <div className="flex h-[100dvh] bg-purple-50 text-purple-950 overflow-hidden font-sans">
      <PatientFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSubmit={handleFormSubmit} 
        settings={settings}
      />
      <WuXingVisualizerModal isOpen={isVisualizerOpen} onClose={() => setIsVisualizerOpen(false)} />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-purple-100 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col h-[100dvh] md:h-full shadow-2xl md:shadow-none`}>
        <div className="p-6 flex justify-between items-center border-b border-purple-100 shrink-0">
           <h1 className="text-2xl font-black text-tcm-primary flex items-center gap-2 tracking-tighter"><Activity className="w-8 h-8" /> TCM PRO</h1>
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 bg-purple-50 rounded-lg text-purple-400 hover:text-purple-950"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
           <SidebarTab id="chat" label={appLanguage === Language.ENGLISH ? "Diagnostic Chat" : "Chat Diagnosa"} icon={MessageSquare} />
           <SidebarTab id="diagnosis" label="CDSS Auto-Rx" icon={Stethoscope} />
           <SidebarTab id="atlas" label="Atlas Sindrom" icon={LayoutGrid} />
           <SidebarTab id="wuxing" label="Wu Xing Master" icon={Compass} />
           <SidebarTab id="acupuncture" label="Acupuncture Atlas" icon={Zap} />
           <SidebarTab id="archive" label={appLanguage === Language.ENGLISH ? "Patient Archive" : "Arsip Pasien"} icon={Archive} />
           <SidebarTab id="invoice" label="Invoice Generator" icon={ClipboardList} />
           <SidebarTab id="bmi" label="BMI Komplit" icon={Scale} />
        </nav>
        <div className="p-4 border-t border-purple-100 shrink-0 bg-white space-y-3 mb-16 md:mb-0">
           {(currentUser.role === 'SUPER_SAINT' || currentUser.role === 'SUPER_USER' || currentUser.role === 'ADMIN') && (
             <button 
               onClick={() => setIsUserModalOpen(true)}
               className="w-full py-3 bg-white text-purple-600 border border-purple-200 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:bg-purple-50 transition-all flex items-center justify-center gap-2 shadow-sm"
             >
               <Shield className="w-4 h-4" /> Master Control
             </button>
           )}
           <button onClick={() => setIsFormOpen(true)} className="w-full py-3.5 bg-purple-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-purple-700 transition-all shadow-md shadow-purple-100 active:scale-95 flex items-center justify-center gap-2">
             <ClipboardList className="w-4 h-4" /> {appLanguage === Language.ENGLISH ? "New Patient Intake" : "Input Pasien Baru"}
           </button>
           <button 
             onClick={handleLogout}
             className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
           >
             <LogOut className="w-4 h-4" /> Logout
           </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-purple-50 overflow-hidden relative">
        {/* Top Header with Language Toggle */}
        <header className="p-4 bg-white/50 border-b border-purple-100 flex justify-between items-center backdrop-blur-md z-30">
           <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-purple-100 rounded-lg text-purple-900"><Menu className="w-5 h-5" /></button>
             <div className="flex items-center gap-2 px-3 py-1 bg-purple-100/50 rounded-full border border-purple-200">
                <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse"></div>
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-purple-500">
                  {isSupabaseConfigured() ? "Cloud Sync" : "Local Mode"}
                </span>
             </div>
           </div>
           
           <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="p-2 bg-white hover:bg-purple-50 rounded-xl border border-purple-200 transition-all active:scale-95 text-purple-600 shadow-sm"
                title="Sync Data"
              >
                <Zap className="w-4 h-4" />
              </button>
              
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white hover:bg-purple-50 rounded-xl border border-purple-200 transition-all active:scale-95 group shadow-sm"
              >
                <Globe className="w-4 h-4 text-tcm-primary group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] md:text-xs font-black uppercase tracking-tighter text-purple-900">
                  {appLanguage === Language.ENGLISH ? "EN" : "ID"}
                </span>
              </button>
              
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full border border-purple-300 flex items-center justify-center shadow-inner">
                   <User className="w-5 h-5 text-purple-600" />
                </div>
              </div>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.05),transparent)] pb-20 md:pb-8">
          {activePanel === 'chat' && (
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
              {/* API Key Warning */}
              {(() => {
                const hasActiveKey = settings && (settings.geminiApiKeys || []).some(k => !k.isExhausted && k.key.trim() !== "");
                const hasKeysButExhausted = settings && (settings.geminiApiKeys || []).length > 0 && !(settings.geminiApiKeys || []).some(k => !k.isExhausted);
                
                if (settings && !hasActiveKey && !process.env.GEMINI_API_KEY) {
                  return (
                    <div className={`border p-4 rounded-2xl flex items-center gap-4 shadow-sm animate-fade-in ${hasKeysButExhausted ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'}`}>
                      <div className={`p-2 rounded-xl ${hasKeysButExhausted ? 'bg-amber-100' : 'bg-rose-100'}`}>
                        <AlertCircle className={`w-5 h-5 ${hasKeysButExhausted ? 'text-amber-600' : 'text-rose-600'}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-black uppercase tracking-tight ${hasKeysButExhausted ? 'text-amber-900' : 'text-rose-900'}`}>
                          {hasKeysButExhausted ? 'Semua API Key Terpakai (Exhausted)' : 'API Key Belum Dikonfigurasi'}
                        </p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest leading-relaxed ${hasKeysButExhausted ? 'text-amber-500' : 'text-rose-500'}`}>
                          {hasKeysButExhausted 
                            ? 'Batas kuota harian tercapai. Silakan reset status kunci untuk mencoba lagi.' 
                            : 'Sistem tidak menemukan API Key Gemini yang aktif. Silakan tambahkan kunci di Master Control > System Settings.'}
                        </p>
                      </div>
                      {hasKeysButExhausted && (
                        <button 
                          onClick={handleResetKeys}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-amber-200 active:scale-95"
                        >
                          Reset Kunci
                        </button>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Patient Wellness Tracker Controller Widget */}
              <div className="bg-white border border-purple-100 rounded-3xl p-5 shadow-lg shadow-purple-900/5 transition-all">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center shrink-0">
                      <Heart className="w-6 h-6 text-rose-500 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-purple-950 uppercase tracking-tight">
                        {appLanguage === Language.ENGLISH ? "Patient Daily Wellness Diary" : "Buku Catatan Sehat Mandiri Harian"}
                      </h4>
                      <p className="text-[10px] font-medium text-purple-500 leading-tight mt-0.5">
                        {appLanguage === Language.ENGLISH 
                          ? "Log vital indicators like tongue body, coating, and heart pulse rates to trace wellness metrics." 
                          : "Catat penanda kesegaran tubuh, seperti keadaan lidah & denyut nadi, serta pantau grafiknya."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWellnessTracker(!showWellnessTracker)}
                    className={`w-full sm:w-auto px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${
                      showWellnessTracker 
                        ? 'bg-rose-50 border border-rose-200 text-rose-600 shadow-rose-100' 
                        : 'bg-purple-600 border border-purple-700 text-white shadow-purple-200 hover:bg-purple-700'
                    }`}
                  >
                    {showWellnessTracker 
                      ? (appLanguage === Language.ENGLISH ? "Hide Analytics" : "Tutup Analitis") 
                      : (appLanguage === Language.ENGLISH ? "Open Wellness Dashboard" : "Buka Dashboard Wellness")}
                  </button>
                </div>

                {showWellnessTracker && (
                  <div className="mt-5 pt-5 border-t border-purple-100 animate-fade-in">
                    <DailyWellnessTracker appLanguage={appLanguage} />
                  </div>
                )}
              </div>
              
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className="max-w-[95%] md:max-w-[85%]">
                    <div className={`p-5 rounded-3xl text-sm leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white border border-purple-100 text-purple-900 rounded-tl-none'}`}>
                      {msg.image && (
                        <div className="mb-3">
                          {msg.image.startsWith('data:image/') ? (
                            <img src={msg.image} alt="Uploaded" className="max-w-xs rounded-xl border border-white/20 shadow-md" />
                          ) : (
                            <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl border border-white/20 w-fit">
                              <Paperclip className="w-5 h-5" />
                              <span className="text-sm font-medium">Document Attached</span>
                            </div>
                          )}
                        </div>
                      )}
                      {msg.role === 'model' ? (
                        <TcmGlossaryTooltip text={msg.text} language={appLanguage} />
                      ) : (
                        msg.text
                      )}
                    </div>
                    {msg.tcmResult && (
                      <DiagnosisCard 
                        diagnosis={msg.tcmResult} 
                        isPregnant={false} 
                        onShowVisualizer={() => setIsVisualizerOpen(true)} 
                        patientContext={lastPatientForm} 
                      />
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-white border border-purple-100 p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-tcm-primary animate-spin" />
                    <span className="text-xs font-bold text-purple-500 uppercase tracking-widest">
                      {appLanguage === Language.ENGLISH ? "EXPERT IS ANALYZING..." : "PAKAR SEDANG MENGANALISIS..."}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
          {activePanel === 'diagnosis' && (
            <ScoringAndPointsHub 
              analysis={cdssResults} 
              onAnalyzeRequest={() => setIsFormOpen(true)} 
              patientContext={lastPatientForm} 
              initialSyndromeId={selectedAtlasId}
            />
          )}
          {activePanel === 'atlas' && (
            <SyndromeAtlasWindow onSelectSyndrome={handleAtlasSelect} />
          )}
          {activePanel === 'wuxing' && (
            <div className="space-y-8 max-w-6xl mx-auto">
              <WuXingMasterPanel />
              
              <div className="flex justify-center pt-4">
                <button 
                  onClick={() => {
                    setActivePanel('acupuncture');
                    setShowAcupunctureRef(true);
                  }}
                  className="w-full max-w-2xl py-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-purple-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                  <Zap className={`w-6 h-6 ${showAcupunctureRef ? 'animate-pulse text-amber-300' : ''}`} />
                  Eksplorasi Atlas Titik (Tung & TCM)
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          {activePanel === 'acupuncture' && (
            <div className="max-w-6xl mx-auto animate-fade-in">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-purple-900 uppercase tracking-tighter flex items-center gap-3">
                  <div className="p-3 bg-teal-100 rounded-2xl">
                    <Activity className="w-6 h-6 text-teal-600" />
                  </div>
                  Clinical Acupuncture Reference
                </h2>
                <div className="px-4 py-2 bg-purple-100 rounded-full text-[10px] font-black text-purple-600 uppercase tracking-widest border border-purple-200">
                  Master Tung & TCM Clinical Points
                </div>
              </div>
              <AcupuncturePointsPanel />
            </div>
          )}
          {activePanel === 'archive' && (
            <PatientArchivePanel 
              onLoadPatient={(p) => { 
                setLastPatientForm(p);
                setCdssResults([{syndrome: p.diagnosis as any, score: 100, points: [], warnings: [], rationale: [p.diagnosis.explanation]}]); 
                setActivePanel('chat'); 
              }} 
            />
          )}
          {activePanel === 'invoice' && <InvoiceGeneratorPanel settings={settings} />}
          {activePanel === 'bmi' && <BMIKomplitPanel />}
        </main>

        {/* Mobile Bottom Navigation - Ergonomic for Android */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-purple-100 px-6 py-3 flex justify-between items-center z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => setActivePanel('chat')} 
            className={`flex flex-col items-center gap-1 ${activePanel === 'chat' ? 'text-purple-600' : 'text-purple-300'}`}
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Chat</span>
          </button>
          <button 
            onClick={() => setActivePanel('diagnosis')} 
            className={`flex flex-col items-center gap-1 ${activePanel === 'diagnosis' ? 'text-purple-600' : 'text-purple-300'}`}
          >
            <Stethoscope className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-tighter">CDSS</span>
          </button>
          <button 
            onClick={() => setActivePanel('archive')} 
            className={`flex flex-col items-center gap-1 ${activePanel === 'archive' ? 'text-purple-600' : 'text-purple-300'}`}
          >
            <Archive className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Arsip</span>
          </button>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="flex flex-col items-center gap-1 text-purple-300"
          >
            <Menu className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Menu</span>
          </button>
        </div>

        {isUserModalOpen && (
          <UserManagementModal 
            isOpen={isUserModalOpen} 
            onClose={() => setIsUserModalOpen(false)} 
            onLogout={handleLogout}
            currentUser={currentUser} 
          />
        )}

        {activePanel === 'chat' && (
          <div className="p-4 md:p-6 bg-white/80 backdrop-blur-xl border-t border-purple-100 mb-16 md:mb-0">
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              {messages.length > 0 && (
                <div className="flex items-center justify-between border-b border-purple-50 pb-2 mb-1 text-xs px-1" data-html2canvas-ignore="true">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-purple-400 uppercase tracking-widest select-none">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-300" />
                    <span>{appLanguage === Language.ENGLISH ? "CONVERSATION TRANSCRIPT" : "TRANSKRIP PERCAKAPAN"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadTranscript('txt')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 hover:text-white hover:bg-teal-600 font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-sm"
                    >
                      <ClipboardList className="w-3 h-3 text-teal-600 group-hover:text-white" />
                      <span>TXT</span>
                    </button>
                    <button
                      onClick={() => handleDownloadTranscript('pdf')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:text-white hover:bg-purple-600 font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-sm"
                    >
                      <Globe className="w-3 h-3 text-purple-600 group-hover:text-white" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              )}
              {selectedFile && (
                <div className="relative flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200 shadow-sm w-fit pr-12">
                  {selectedFile.type.startsWith('image/') ? (
                    <img src={selectedFile.data} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-purple-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                      <Paperclip className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-purple-900 truncate max-w-[200px]">{selectedFile.name}</span>
                    <span className="text-xs text-purple-500 uppercase tracking-wider">{selectedFile.type.split('/')[1] || 'File'}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="absolute top-1/2 -translate-y-1/2 right-3 bg-white text-purple-400 rounded-full p-1 hover:bg-purple-100 hover:text-purple-600 transition-colors shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {isListening && (
                <div className="flex items-center gap-2 px-2 text-rose-600 font-bold text-[10px] uppercase tracking-widest animate-pulse" data-html2canvas-ignore="true">
                  <span className="w-2 h-2 bg-rose-600 rounded-full animate-ping" />
                  <span>{appLanguage === Language.ENGLISH ? "Listening... Speak now and text will be transcribed in real-time" : "Mendengarkan... Berbicaralah sekarang dan teks akan ditranskrip real-time"}</span>
                </div>
              )}
              <div className="flex gap-3">
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 bg-purple-100 text-purple-600 rounded-2xl hover:bg-purple-200 active:scale-95 transition-all shadow-sm"
                  title="Upload Image or PDF"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button 
                  type="button"
                  onClick={handleToggleListening}
                  className={`p-4 rounded-2xl active:scale-95 transition-all shadow-sm relative flex items-center justify-center cursor-pointer ${
                    isListening 
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                      : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                  }`}
                  title={appLanguage === Language.ENGLISH ? (isListening ? "Stop Transcribing" : "Transcribe Voice Note") : (isListening ? "Hentikan Transkripsi" : "Transkripsi Catatan Suara")}
                >
                  {isListening ? (
                    <Mic className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                  {isListening && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full border-2 border-white animate-bounce" />
                  )}
                </button>
                <input 
                  value={inputText} 
                  onChange={e => setInputText(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                  placeholder={appLanguage === Language.ENGLISH ? "Enter patient complaints or TCM questions..." : "Masukkan keluhan pasien atau pertanyaan TCM..."} 
                  className="flex-1 bg-purple-50/50 border border-purple-200 rounded-2xl px-6 py-4 outline-none focus:border-tcm-primary focus:bg-white transition-all text-sm text-purple-950 shadow-inner" 
                />
                <button 
                  onClick={() => handleSendMessage()} 
                  disabled={isLoading || (!inputText.trim() && !selectedFile)}
                  className="p-4 bg-tcm-primary text-white rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:grayscale"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default App;

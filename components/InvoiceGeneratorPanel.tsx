import React, { useState, useRef, useEffect } from 'react';
import { FileText, Download, Plus, Trash2, Printer, Calculator, Building2, MapPin, Phone, Upload, Sparkles, LayoutTemplate, QrCode as QrIcon, Link, Check, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { db } from '../services/db';
import { AppSettings, SavedPatient } from '../types';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  settings?: AppSettings | null;
}

export const InvoiceGeneratorPanel: React.FC<Props> = ({ settings }) => {
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  
  // Clinic Info (Editable)
  const [clinicName, setClinicName] = useState(settings?.clinicName || 'TCM PRO');
  const [clinicAddress, setClinicAddress] = useState(settings?.clinicAddress || 'Jl. Kesehatan No. 123, Jakarta');
  const [clinicPhone, setClinicPhone] = useState(settings?.clinicPhone || '+62 812 3456 7890');

  // Branding States
  const [logoUrl, setLogoUrl] = useState<string>(() => localStorage.getItem('invoice_logo_url') || '');
  const [headerStyle, setHeaderStyle] = useState<'none' | 'preset-bamboo' | 'preset-yinyang' | 'custom'>(() => {
    return (localStorage.getItem('invoice_header_style') as any) || 'none';
  });
  const [customBannerUrl, setCustomBannerUrl] = useState<string>(() => localStorage.getItem('invoice_custom_banner_url') || '');
  const [logoSize, setLogoSize] = useState<number>(() => parseInt(localStorage.getItem('invoice_logo_size') || '48')); // pixels
  const [showClinicNameInHeader, setShowClinicNameInHeader] = useState<boolean>(() => {
    const saved = localStorage.getItem('invoice_show_clinic_name');
    return saved !== 'false';
  });
  const [isDragOverLogo, setIsDragOverLogo] = useState(false);
  const [isDragOverBanner, setIsDragOverBanner] = useState(false);

  // Patient Linkage & QR Code States
  const [patients, setPatients] = useState<SavedPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrFormat, setQrFormat] = useState<'text' | 'json'>('text');
  const [showQrInInvoice, setShowQrInInvoice] = useState<boolean>(true);
  const [qrSizeInInvoice, setQrSizeInInvoice] = useState<number>(100);

  // Print view state to simplify layout for user printing or pratinjau
  const [isPrintView, setIsPrintView] = useState<boolean>(false);

  // Load Patients list on mount
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const list = await db.patients.getAll();
        setPatients(list || []);
      } catch (err) {
        console.warn('Failed to load patients for invoice selection:', err);
      }
    };
    loadPatients();
  }, []);



  useEffect(() => {
    if (settings) {
      if (settings.clinicName) setClinicName(settings.clinicName);
      if (settings.clinicAddress) setClinicAddress(settings.clinicAddress);
      if (settings.clinicPhone) setClinicPhone(settings.clinicPhone);
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('invoice_header_style', headerStyle);
  }, [headerStyle]);

  useEffect(() => {
    localStorage.setItem('invoice_logo_size', logoSize.toString());
  }, [logoSize]);

  useEffect(() => {
    localStorage.setItem('invoice_show_clinic_name', showClinicNameInHeader.toString());
  }, [showClinicNameInHeader]);

  const handleFileChange = (file: File, type: 'logo' | 'banner') => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (type === 'logo') {
        setLogoUrl(result);
        localStorage.setItem('invoice_logo_url', result);
      } else {
        setCustomBannerUrl(result);
        localStorage.setItem('invoice_custom_banner_url', result);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoUrl('');
    localStorage.removeItem('invoice_logo_url');
  };

  const clearBanner = () => {
    setCustomBannerUrl('');
    localStorage.removeItem('invoice_custom_banner_url');
  };

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: Date.now().toString(), description: 'TCM Consultation & Treatment', quantity: 1, unitPrice: 0 }
  ]);
  const [notes, setNotes] = useState('Thank you for your business!');
  const [isGenerating, setIsGenerating] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  // Sync QR Code URL dynamically based on invoice parameters
  useEffect(() => {
    let active = true;
    const generateQrCode = async () => {
      try {
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const formatCurrencyHelper = (amount: number) => {
          return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
        };

        const text = qrFormat === 'text'
          ? `TCM CLINIC INVOICE\n==================\nInvoice: ${invoiceNumber}\nTanggal: ${new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}\nPasien: ${clientName || 'N/A'}\nID Pasien: ${selectedPatientId || 'N/A'}\nKlinik: ${clinicName}\nTotal Due: ${formatCurrencyHelper(subtotal)}\nGenerated by TCM Clinic System`
          : JSON.stringify({
              invoiceNumber,
              date,
              patientId: selectedPatientId || undefined,
              patientName: clientName || undefined,
              clinicName,
              totalAmount: subtotal,
              systemSignature: "TCM PRO Verified",
              timestamp: Date.now()
            }, null, 2);

        const url = await QRCode.toDataURL(text, {
          width: qrSizeInInvoice * 2, // high-res for printing and pdf export
          margin: 1,
          color: {
            dark: '#4c1d95', // TCM Purple-900 color theme
            light: '#ffffff'
          }
        });

        if (active) {
          setQrCodeUrl(url);
        }
      } catch (err) {
        console.warn('QR Code generation failed:', err);
      }
    };

    generateQrCode();
    return () => {
      active = false;
    };
  }, [invoiceNumber, date, clientName, selectedPatientId, clinicName, items, qrFormat, qrSizeInInvoice]);

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoiceNumber}_${clientName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadTXT = () => {
    let txtContent = `==================================================\n`;
    txtContent += `                    INVOICE\n`;
    txtContent += `==================================================\n\n`;
    txtContent += `Clinic     : ${clinicName}\n`;
    txtContent += `Address    : ${clinicAddress}\n`;
    txtContent += `Phone      : ${clinicPhone}\n`;
    txtContent += `\n--------------------------------------------------\n`;
    txtContent += `Invoice No : ${invoiceNumber}\n`;
    txtContent += `Date       : ${date}\n`;
    txtContent += `Client     : ${clientName}\n`;
    if (clientAddress) txtContent += `Address    : ${clientAddress}\n`;
    txtContent += `\n--------------------------------------------------\n`;
    txtContent += `Description                          Qty    Price       Total\n`;
    txtContent += `--------------------------------------------------\n`;
    
    items.forEach(item => {
      const desc = item.description.padEnd(35, ' ').substring(0, 35);
      const qty = item.quantity.toString().padStart(3, ' ');
      const price = item.unitPrice.toString().padStart(10, ' ');
      const total = (item.quantity * item.unitPrice).toString().padStart(10, ' ');
      txtContent += `${desc} ${qty} ${price} ${total}\n`;
    });
    
    txtContent += `--------------------------------------------------\n`;
    txtContent += `Total Amount: ${formatCurrency(calculateSubtotal())}\n\n`;
    if (notes) txtContent += `Notes:\n${notes}\n`;
    txtContent += `==================================================\n`;

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNumber}_${clientName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-purple-50 overflow-hidden animate-fade-in font-sans">
      {/* Input Form Panel */}
      {!isPrintView && (
        <div className="w-full md:w-1/2 lg:w-5/12 border-r border-purple-200 bg-white flex flex-col h-full z-10 shadow-lg">
          <div className="p-6 border-b border-purple-100 bg-purple-50/50">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-2xl border border-purple-200">
                  <Calculator className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-purple-900 tracking-tighter uppercase">Invoice</h2>
                  <p className="text-xs text-purple-500 font-bold tracking-widest uppercase">Create & Billing</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setIsPrintView(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-purple-900/10 cursor-pointer whitespace-nowrap"
                title="Switch to Simplified Print View"
              >
                <Printer className="w-4 h-4" /> Print View
              </button>
            </div>
          </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Clinic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-purple-800 uppercase tracking-widest border-b border-purple-100 pb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Clinic Information
            </h3>
            <div>
              <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Clinic Name</label>
              <input 
                type="text" 
                value={clinicName} 
                onChange={e => setClinicName(e.target.value)}
                className="w-full bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-purple-900 focus:border-purple-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Clinic Address</label>
              <input 
                type="text" 
                value={clinicAddress} 
                onChange={e => setClinicAddress(e.target.value)}
                className="w-full bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-purple-900 focus:border-purple-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Clinic Phone</label>
              <input 
                type="text" 
                value={clinicPhone} 
                onChange={e => setClinicPhone(e.target.value)}
                className="w-full bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-purple-900 focus:border-purple-400 outline-none"
              />
            </div>
          </div>

          {/* Invoice Branding (Logo & Banner) */}
          <div className="space-y-4 bg-purple-50/50 border border-purple-100 p-4 rounded-2xl">
            <h3 className="text-sm font-black text-purple-800 uppercase tracking-widest border-b border-purple-200 pb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" /> Invoice Branding
            </h3>

            {/* Logo Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider">Clinic Logo</label>
              
              {logoUrl ? (
                <div className="flex items-center gap-3 p-3 bg-white border border-purple-200 rounded-xl">
                  <img src={logoUrl} alt="Logo Prev" className="h-12 w-12 object-contain rounded border border-purple-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-purple-900 font-bold truncate font-sans">Custom Logo Uploaded</p>
                    <div className="flex items-center gap-2 mt-1">
                      <label className="text-[10px] text-purple-500 font-bold">Size: {logoSize}px</label>
                      <input 
                        type="range" 
                        min="24" 
                        max="80" 
                        value={logoSize} 
                        onChange={e => setLogoSize(parseInt(e.target.value))}
                        className="w-20 accent-purple-600"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={clearLogo}
                    className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragOverLogo(true); }}
                  onDragLeave={() => setIsDragOverLogo(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverLogo(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileChange(file, 'logo');
                  }}
                  onClick={() => document.getElementById('logo-upload-input')?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragOverLogo 
                      ? 'border-purple-600 bg-purple-100/50 scale-[0.99]' 
                      : 'border-purple-200 hover:border-purple-400 bg-white'
                  }`}
                >
                  <input 
                    id="logo-upload-input"
                    type="file" 
                    accept="image/*" 
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileChange(file, 'logo');
                    }}
                    className="hidden" 
                  />
                  <Upload className="w-6 h-6 text-purple-400 mx-auto mb-1 animate-bounce" />
                  <p className="text-xs font-bold text-purple-700">Drag & Drop Logo</p>
                  <p className="text-[10px] text-purple-400">or click to browse</p>
                </div>
              )}

              {logoUrl && (
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="show-clinic-name-header"
                    checked={showClinicNameInHeader}
                    onChange={e => setShowClinicNameInHeader(e.target.checked)}
                    className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                  />
                  <label htmlFor="show-clinic-name-header" className="text-[11px] font-bold text-purple-600 cursor-pointer">
                    Show clinic name next to logo
                  </label>
                </div>
              )}
            </div>

            {/* Header Style Section */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider">Top Banner Design</label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setHeaderStyle('none')}
                  className={`p-2 rounded-xl text-xs font-semibold transition-all border ${
                    headerStyle === 'none' 
                      ? 'bg-purple-600 text-white border-purple-700 shadow-sm' 
                      : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  No Banner
                </button>
                <button
                  onClick={() => setHeaderStyle('preset-bamboo')}
                  className={`p-2 rounded-xl text-xs font-semibold transition-all border ${
                    headerStyle === 'preset-bamboo' 
                      ? 'bg-purple-600 text-white border-purple-700 shadow-sm' 
                      : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  🍃 TCM Bamboo
                </button>
                <button
                  onClick={() => setHeaderStyle('preset-yinyang')}
                  className={`p-2 rounded-xl text-xs font-semibold transition-all border ${
                    headerStyle === 'preset-yinyang' 
                      ? 'bg-purple-600 text-white border-purple-700 shadow-sm' 
                      : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  ☯️ Yin Yang
                </button>
                <button
                  onClick={() => setHeaderStyle('custom')}
                  className={`p-2 rounded-xl text-xs font-semibold transition-all border ${
                    headerStyle === 'custom' 
                      ? 'bg-purple-600 text-white border-purple-700 shadow-sm' 
                      : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  🖼️ Custom Image
                </button>
              </div>

              {/* Custom Banner Upload Indicator if chosen */}
              {headerStyle === 'custom' && (
                <div className="mt-2 text-left">
                  {customBannerUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-white border border-purple-200 rounded-xl">
                      <img src={customBannerUrl} alt="Banner Prev" className="h-10 w-20 object-cover rounded border border-purple-100" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-purple-950 font-black tracking-tight truncate">Header Banner Loaded</p>
                      </div>
                      <button 
                        onClick={clearBanner}
                        className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDragOverBanner(true); }}
                      onDragLeave={() => setIsDragOverBanner(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOverBanner(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFileChange(file, 'banner');
                      }}
                      onClick={() => document.getElementById('banner-upload-input')?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        isDragOverBanner 
                          ? 'border-purple-600 bg-purple-100/50 scale-[0.99]' 
                          : 'border-purple-200 hover:border-purple-400 bg-white'
                      }`}
                    >
                      <input 
                        id="banner-upload-input"
                        type="file" 
                        accept="image/*" 
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileChange(file, 'banner');
                        }}
                        className="hidden" 
                      />
                      <LayoutTemplate className="w-6 h-6 text-purple-400 mx-auto mb-1 animate-pulse" />
                      <p className="text-xs font-bold text-purple-700">Drag & Drop Banner</p>
                      <p className="text-[10px] text-purple-400">or click to browse</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* QR Verification Settings */}
          <div className="space-y-4 bg-purple-50/50 border border-purple-100 p-4 rounded-2xl">
            <h3 className="text-sm font-black text-purple-800 uppercase tracking-widest border-b border-purple-200 pb-2 flex items-center gap-2">
              <QrIcon className="w-4 h-4 text-purple-600 animate-pulse" /> QR Verification Settings
            </h3>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Embed QR in Invoice</span>
              <input 
                type="checkbox"
                checked={showQrInInvoice}
                onChange={e => setShowQrInInvoice(e.target.checked)}
                className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
              />
            </div>

            {showQrInInvoice && (
              <div className="space-y-3 pt-1 border-t border-purple-100">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1 font-sans">QR Format</label>
                    <select
                      value={qrFormat}
                      onChange={e => setQrFormat(e.target.value as 'text' | 'json')}
                      className="w-full bg-white border border-purple-200 rounded-xl px-2 py-1.5 text-xs text-purple-900 outline-none cursor-pointer"
                    >
                      <option value="text">Readable Text</option>
                      <option value="json">Structured JSON</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">Display Size</label>
                    <select
                      value={qrSizeInInvoice}
                      onChange={e => setQrSizeInInvoice(parseInt(e.target.value))}
                      className="w-full bg-white border border-purple-200 rounded-xl px-2 py-1.5 text-xs text-purple-900 outline-none cursor-pointer"
                    >
                      <option value={80}>Small (80px)</option>
                      <option value={100}>Medium (100px)</option>
                      <option value={120}>Large (120px)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-purple-950 text-purple-200 rounded-xl space-y-1 text-[10px] font-mono leading-relaxed max-h-[120px] overflow-y-auto">
                  <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest block font-sans">Decoded QR Preview</span>
                  <pre className="whitespace-pre-wrap text-[9px] text-purple-300">
                    {qrFormat === 'text'
                      ? `TCM CLINIC INVOICE\n==================\nInvoice: ${invoiceNumber}\nTanggal: ${new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}\nPasien: ${clientName || 'N/A'}\nID Pasien: ${selectedPatientId || 'N/A'}\nKlinik: ${clinicName}\nTotal Due: ${formatCurrency(calculateSubtotal())}`
                      : JSON.stringify({
                          invoiceNumber,
                          date,
                          patientId: selectedPatientId || undefined,
                          patientName: clientName || undefined,
                          clinicName,
                          totalAmount: calculateSubtotal()
                        }, null, 2)
                    }
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-purple-800 uppercase tracking-widest border-b border-purple-100 pb-2">Invoice Details</h3>
            
            {/* Patient Linkage Selection */}
            <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl space-y-3">
              <span className="text-[10px] font-black text-purple-800 uppercase tracking-widest flex items-center gap-2">
                <Link className="w-3.5 h-3.5 text-purple-600" /> Patient Linkage (Auto-Fill & QR Sync)
              </span>
              
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">Select Registered Patient</label>
                  <select
                    value={selectedPatientId}
                    onChange={e => {
                      const patientId = e.target.value;
                      setSelectedPatientId(patientId);
                      const selected = patients.find(p => p.id === patientId);
                      if (selected) {
                        setClientName(selected.patientName);
                        setClientAddress(selected.address || selected.phone || '');
                      } else if (patientId === '') {
                        setClientName('');
                        setClientAddress('');
                      }
                    }}
                    className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs text-purple-900 focus:border-purple-400 outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Patient (Auto-Fill & Link ID) --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.patientName} ({p.id.substring(0, 8)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">Linked Patient ID (Embedding QR)</label>
                  <input
                    type="text"
                    value={selectedPatientId}
                    onChange={e => setSelectedPatientId(e.target.value)}
                    placeholder="Auto-filled or type patient reference"
                    className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs text-purple-900 focus:border-purple-400 outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Invoice Number</label>
                <input 
                  type="text" 
                  value={invoiceNumber} 
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-purple-900 focus:border-purple-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Date</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-purple-900 focus:border-purple-400 outline-none"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Client Name</label>
              <input 
                type="text" 
                value={clientName} 
                onChange={e => setClientName(e.target.value)}
                placeholder="Patient or Company Name"
                className="w-full bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-purple-900 focus:border-purple-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Client Address</label>
              <textarea 
                value={clientAddress} 
                onChange={e => setClientAddress(e.target.value)}
                placeholder="Optional address"
                rows={2}
                className="w-full bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-purple-900 focus:border-purple-400 outline-none resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-purple-100 pb-2">
              <h3 className="text-sm font-black text-purple-800 uppercase tracking-widest">Line Items</h3>
              <button 
                onClick={addItem}
                className="text-xs font-bold text-purple-600 bg-purple-100 hover:bg-purple-200 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="bg-white border border-purple-200 p-4 rounded-2xl shadow-sm relative group">
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">Description</label>
                      <input 
                        type="text" 
                        value={item.description} 
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                        className="w-full bg-purple-50 border border-purple-100 rounded-lg px-3 py-1.5 text-sm text-purple-900 focus:border-purple-400 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">Quantity</label>
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity} 
                          onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full bg-purple-50 border border-purple-100 rounded-lg px-3 py-1.5 text-sm text-purple-900 focus:border-purple-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">Unit Price (IDR)</label>
                        <input 
                          type="number" 
                          min="0"
                          value={item.unitPrice} 
                          onChange={e => updateItem(item.id, 'unitPrice', parseInt(e.target.value) || 0)}
                          className="w-full bg-purple-50 border border-purple-100 rounded-lg px-3 py-1.5 text-sm text-purple-900 focus:border-purple-400 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-purple-800 uppercase tracking-widest border-b border-purple-100 pb-2">Additional Notes</h3>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              placeholder="Thank you for your business!"
              rows={3}
              className="w-full bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-purple-900 focus:border-purple-400 outline-none resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-purple-100 bg-white">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-purple-600 uppercase tracking-widest">Total Amount</span>
            <span className="text-xl font-black text-purple-900">{formatCurrency(calculateSubtotal())}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleDownloadTXT}
              className="py-3 bg-purple-100 text-purple-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" /> TXT
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="py-3 bg-purple-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 disabled:opacity-70"
            >
              {isGenerating ? <span className="animate-pulse">Generating...</span> : <><Download className="w-4 h-4" /> PDF</>}
            </button>
          </div>
        </div>
      </div>
    )}

      {/* Preview Panel */}
      <div className={`w-full ${isPrintView ? 'md:w-full lg:w-full' : 'md:w-1/2 lg:w-7/12'} bg-purple-100/50 p-4 md:p-8 overflow-y-auto flex flex-col items-center justify-start relative`}>
        {isPrintView && (
          <div 
            data-html2canvas-ignore="true" 
            className="w-full max-w-2xl bg-white border border-purple-200 rounded-2xl p-4 mb-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in print:hidden"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPrintView(false)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-all border border-purple-200 cursor-pointer"
              >
                <LayoutTemplate className="w-4 h-4" /> Edit Mode
              </button>
              <div className="hidden sm:block">
                <span className="text-[10px] font-black text-purple-800 uppercase tracking-widest block font-sans">Print View Enabled</span>
                <p className="text-[10px] text-purple-500">Simplified view focusing on the printable invoice.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button 
                type="button"
                onClick={handleDownloadTXT}
                className="px-3 py-2 bg-purple-50 text-purple-700 rounded-xl font-bold text-xs hover:bg-purple-100 transition-colors border border-purple-200 flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> TXT
              </button>
              <button 
                type="button"
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl font-bold text-xs transition-colors border border-purple-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? <span className="animate-pulse">Loading...</span> : <><Download className="w-3.5 h-3.5" /> PDF</>}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1 shadow-md shadow-purple-900/10 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
            </div>
          </div>
        )}
        <div 
          ref={invoiceRef}
          className="bg-white w-full max-w-2xl p-8 md:p-12 shadow-xl rounded-sm print:shadow-none print:p-0"
          style={{ minHeight: '297mm' }} // A4 proportion
        >
          {/* Header Banners */}
          {headerStyle === 'preset-bamboo' && (
            <div className="w-full h-20 bg-gradient-to-r from-emerald-800 via-teal-800 to-purple-950 rounded-lg relative overflow-hidden flex items-center px-6 mb-6">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl" />
              <div className="absolute -left-6 -top-6 w-24 h-24 bg-teal-400/10 rounded-full blur-xl" />
              <div className="flex items-center justify-between w-full relative z-10">
                <div className="flex flex-col">
                  <span className="text-emerald-300 text-[11px] font-black tracking-widest uppercase">BALANCE & HARMONY</span>
                  <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">{clinicName}</span>
                </div>
                <span className="text-[9px] text-teal-200 bg-teal-950/40 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">Traditional Chinese Medicine</span>
              </div>
            </div>
          )}

          {headerStyle === 'preset-yinyang' && (
            <div className="w-full h-20 bg-gradient-to-r from-stone-900 via-stone-800 to-purple-950 rounded-lg relative overflow-hidden flex items-center px-6 mb-6 border-b border-purple-500/20">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-stone-100/10 transform -skew-x-12" />
              <div className="flex items-center justify-between w-full relative z-10">
                <div className="flex flex-col">
                  <span className="text-stone-300 text-[11px] font-black tracking-widest uppercase">YIN YANG ESSENCE</span>
                  <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">{clinicName}</span>
                </div>
                <span className="text-[9px] text-stone-300 bg-stone-950/40 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">Holistic Health Care</span>
              </div>
            </div>
          )}

          {headerStyle === 'custom' && customBannerUrl && (
            <div className="w-full h-24 mb-6 rounded-lg overflow-hidden relative border border-purple-100 bg-purple-50">
              <img src={customBannerUrl} alt="Clinic Header Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          )}

          {/* Invoice Header */}
          <div className="flex justify-between items-start border-b-2 border-purple-900 pb-6 mb-8">
            <div>
              <h1 className="text-4xl font-black text-purple-900 tracking-tighter uppercase mb-2 font-sans">INVOICE</h1>
              <p className="text-sm text-purple-600 font-medium">No: {invoiceNumber}</p>
              <p className="text-sm text-purple-600 font-medium">Date: {new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 mb-2">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="object-contain" 
                    style={{ height: `${logoSize}px`, maxWidth: `${logoSize * 2.5}px` }} 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-black text-xl">{clinicName.charAt(0)}</span>
                  </div>
                )}
                {(!logoUrl || showClinicNameInHeader) && (
                  <h2 className="text-xl font-black text-purple-900 tracking-tighter">{clinicName}</h2>
                )}
              </div>
              <p className="text-xs text-purple-500 font-medium">Traditional Chinese Medicine Clinic</p>
              <p className="text-xs text-purple-500">{clinicAddress}</p>
              <p className="text-xs text-purple-500">Tel: {clinicPhone}</p>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-10">
            <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2">Billed To</h3>
            <p className="text-lg font-bold text-purple-900">{clientName || 'Client Name'}</p>
            {clientAddress && <p className="text-sm text-purple-700 whitespace-pre-wrap mt-1">{clientAddress}</p>}
          </div>

          {/* Items Table */}
          <table className="w-full mb-10">
            <thead>
              <tr className="border-b-2 border-purple-200">
                <th className="text-left py-3 text-xs font-black text-purple-500 uppercase tracking-widest w-1/2">Description</th>
                <th className="text-center py-3 text-xs font-black text-purple-500 uppercase tracking-widest">Qty</th>
                <th className="text-right py-3 text-xs font-black text-purple-500 uppercase tracking-widest">Unit Price</th>
                <th className="text-right py-3 text-xs font-black text-purple-500 uppercase tracking-widest">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className={idx !== items.length - 1 ? "border-b border-purple-100" : ""}>
                  <td className="py-4 text-sm text-purple-900 font-medium">{item.description || '-'}</td>
                  <td className="py-4 text-sm text-purple-700 text-center">{item.quantity}</td>
                  <td className="py-4 text-sm text-purple-700 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-4 text-sm text-purple-900 font-bold text-right">{formatCurrency(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total & QR Verification Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-12">
            {showQrInInvoice && qrCodeUrl ? (
              <div className="flex items-center gap-4 bg-purple-50/40 p-4 rounded-xl border border-purple-100 max-w-sm">
                <img 
                  src={qrCodeUrl} 
                  alt="Invoice QR Code" 
                  style={{ width: `${qrSizeInInvoice}px`, height: `${qrSizeInInvoice}px` }}
                  className="rounded-lg bg-white border border-purple-200 shadow-sm shrink-0"
                />
                <div className="space-y-1 text-left">
                  <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block font-sans">Verification QR</span>
                  <p className="text-[10px] text-purple-900 font-bold leading-tight uppercase tracking-tighter">Scan to Verify Invoice</p>
                  <p className="text-[9px] text-purple-500 leading-relaxed font-sans">Contains Patient ID, invoice summary, and clinic signature.</p>
                  {selectedPatientId && (
                    <span className="inline-block mt-1 font-mono text-[8px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold uppercase truncate max-w-[150px]">
                      ID: {selectedPatientId.substring(0, 8)}...
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden sm:block flex-1" />
            )}

            <div className="w-full sm:w-1/2 bg-purple-50 p-6 rounded-2xl border border-purple-100 shrink-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-purple-600 font-bold">Subtotal</span>
                <span className="text-sm text-purple-900 font-bold">{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between items-center border-t border-purple-200 pt-3 mt-3">
                <span className="text-base font-black text-purple-900 uppercase tracking-widest">Total Due</span>
                <span className="text-xl font-black text-purple-600">{formatCurrency(calculateSubtotal())}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <div className="border-t border-purple-100 pt-6">
              <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2">Notes</h3>
              <p className="text-sm text-purple-700 whitespace-pre-wrap">{notes}</p>
            </div>
          )}
          
          <div className="mt-16 text-center text-[10px] text-purple-400 font-bold uppercase tracking-widest">
            Generated by {clinicName} System
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGeneratorPanel;

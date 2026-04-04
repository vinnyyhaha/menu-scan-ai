/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileText, 
  Download, 
  Loader2, 
  Camera, 
  X, 
  CheckCircle2, 
  AlertCircle,
  UtensilsCrossed,
  Table as TableIcon,
  History,
  Trash2,
  ChevronRight,
  Maximize2,
  LayoutDashboard,
  Settings,
  HelpCircle,
  Menu as MenuIcon,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Types for the menu data
interface MenuItem {
  category: string;
  name: string;
  description: string;
  price: string;
}

interface ScanHistory {
  id: string;
  timestamp: number;
  items: MenuItem[];
  imageName: string;
}

// Error Boundary Component for Production Stability
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-gray-500 mt-2 max-w-md">The application encountered an unexpected error. Please refresh the page to try again.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
          >
            Refresh Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <MenuScanApp />
    </ErrorBoundary>
  );
}

function MenuScanApp() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [isProcessing, setIsProcessing] = useState(false);
  const [menuData, setMenuData] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('menu_scan_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('menu_scan_history', JSON.stringify(history));
  }, [history]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type || "image/jpeg");
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setMenuData(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const processMenu = async () => {
    if (!image) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setError("API Key is missing. Please add 'GEMINI_API_KEY' to your Secrets in AI Studio.");
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = image.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: "Extract all food and drink items from this menu. Organize by category. Return as a JSON array of objects with category, name, description, and price fields. If the image is too blurry, try to extract as much as possible." },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                price: { type: Type.STRING },
              },
              required: ["category", "name", "price"],
            },
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from AI engine.");
      }

      const result = JSON.parse(text);
      setMenuData(result);

      const newScan: ScanHistory = {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        items: result,
        imageName: `Scan ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      };
      setHistory(prev => [newScan, ...prev].slice(0, 10));
    } catch (err: any) {
      console.error("Detailed Error Processing Menu:", err);
      
      if (err.message?.includes("API_KEY_INVALID")) {
        setError("Invalid API Key. Please verify your Gemini API key in the settings.");
      } else if (err.message?.includes("quota")) {
        setError("API Quota exceeded. Please try again later.");
      } else {
        setError("We couldn't process this image. Please ensure the menu is clearly visible and try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToExcel = (data: MenuItem[]) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Menu Items");
    XLSX.writeFile(workbook, `menu_export_${Date.now()}.xlsx`);
  };

  const filteredData = menuData?.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const reset = () => {
    setImage(null);
    setMenuData(null);
    setError(null);
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans antialiased">
      {/* Sidebar - Professional SaaS Style */}
      <aside className="w-64 border-r border-gray-200 flex flex-col bg-gray-50/50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <UtensilsCrossed size={18} />
          </div>
          <span className="font-bold text-gray-900 tracking-tight">MenuScan AI</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => setActiveTab('scan')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'scan' ? "bg-white text-blue-600 shadow-sm border border-gray-200" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'history' ? "bg-white text-blue-600 shadow-sm border border-gray-200" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <History size={18} />
            History
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            <Settings size={18} />
            Settings
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            <HelpCircle size={18} />
            Support
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-gray-200 flex items-center justify-between px-8 bg-white">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search items, categories..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-0 rounded-lg text-sm transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              AI Engine Online
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300" />
          </div>
        </header>

        {/* Content Split View */}
        <div className="flex-1 flex overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'scan' ? (
              <motion.div 
                key="scan"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex overflow-hidden"
              >
                {/* Left: Input & Preview */}
                <div className="w-[400px] border-r border-gray-200 p-8 overflow-y-auto bg-gray-50/30">
                  <div className="mb-8">
                    <h2 className="text-lg font-bold text-gray-900">Menu Extraction</h2>
                    <p className="text-sm text-gray-500 mt-1">Upload a photo to begin the ML pipeline.</p>
                  </div>

                  {!image ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer group bg-white"
                    >
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-all">
                        <Upload size={24} />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-sm font-semibold text-gray-900">Upload menu photo</p>
                        <p className="text-xs text-gray-500 mt-1">Drag and drop or click to browse</p>
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                        <img src={image} alt="Preview" className="w-full h-full object-contain" />
                        <button 
                          onClick={reset}
                          className="absolute top-3 right-3 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <button
                        onClick={processMenu}
                        disabled={isProcessing}
                        className={cn(
                          "w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm",
                          isProcessing 
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                            : "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]"
                        )}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="animate-spin" size={18} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Maximize2 size={18} />
                            Extract Menu Data
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3">
                      <AlertCircle className="text-red-500 shrink-0" size={18} />
                      <p className="text-xs text-red-700 leading-relaxed">{error}</p>
                    </div>
                  )}
                </div>

                {/* Right: Data Table */}
                <div className="flex-1 overflow-y-auto bg-white">
                  {!menuData && !isProcessing ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
                        <TableIcon size={24} className="opacity-40" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">Awaiting Extraction</h3>
                      <p className="text-xs mt-1 max-w-[200px]">Data will appear here once the image processing is complete.</p>
                    </div>
                  ) : isProcessing ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6" />
                      <h3 className="text-sm font-bold text-gray-900">Analyzing Image</h3>
                      <p className="text-xs text-gray-500 mt-1">Our ML pipeline is structuring the menu data...</p>
                    </div>
                  ) : (
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">Extracted Items</h2>
                          <p className="text-sm text-gray-500 mt-1">Found {menuData?.length} items across {new Set(menuData?.map(i => i.category)).size} categories.</p>
                        </div>
                        <button
                          onClick={() => exportToExcel(menuData || [])}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          <Download size={14} />
                          Export to Excel
                        </button>
                      </div>

                      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                              <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Item Name</th>
                              <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredData?.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wide">
                                    {item.category}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                                  {item.description && (
                                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1 group-hover:line-clamp-none transition-all">
                                      {item.description}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className="font-mono text-sm font-bold text-blue-600">{item.price}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 p-8 overflow-y-auto bg-white"
              >
                <div className="max-w-4xl mx-auto">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Scan History</h2>
                    <p className="text-sm text-gray-500 mt-1">Review and export your previous extractions.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {history.length === 0 ? (
                      <div className="col-span-2 py-20 text-center text-gray-400">
                        <History size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="text-sm font-medium">No history available yet.</p>
                      </div>
                    ) : (
                      history.map((item) => (
                        <div key={item.id} className="p-6 rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all group bg-gray-50/30">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 group-hover:text-blue-600 border border-gray-200 transition-colors">
                              <FileText size={20} />
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => exportToExcel(item.items)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                                title="Export"
                              >
                                <Download size={16} />
                              </button>
                              <button 
                                onClick={() => setHistory(prev => prev.filter(h => h.id !== item.id))}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <h4 className="font-bold text-gray-900">{item.imageName}</h4>
                          <div className="flex items-center gap-4 mt-4">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {item.items.length} Items
                            </div>
                            <div className="w-1 h-1 rounded-full bg-gray-300" />
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {new Set(item.items.map(i => i.category)).size} Categories
                            </div>
                          </div>
                          <button 
                            onClick={() => { setMenuData(item.items); setActiveTab('scan'); }}
                            className="w-full mt-6 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                          >
                            View Details
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

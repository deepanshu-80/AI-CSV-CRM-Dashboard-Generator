import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Link } from "wouter";
import { 
  UploadCloud, FileSpreadsheet, Sparkles, CheckCircle2, 
  XCircle, AlertCircle, ArrowRight, X, Play, RefreshCcw, 
  Download, Activity, Sun, Moon, Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CsvPreview, ImportResult, CrmRecord, SkippedRecord } from '@workspace/api-client-react';
import { useTheme } from "@/components/theme-provider";

const IMPORT_STEPS = [
  { id: 1, title: "Upload Data", icon: UploadCloud },
  { id: 2, title: "Data Preview", icon: FileSpreadsheet },
  { id: 3, title: "AI Extraction", icon: Sparkles },
  { id: 4, title: "Results", icon: Activity },
];

const AI_PHASES = [
  "Initializing AI model...",
  "Parsing raw strings...",
  "Extracting semantic entities...",
  "Mapping columns to CRM structure...",
  "Normalizing dates and locations...",
  "Finalizing data structures..."
];

export default function Importer() {
  const { theme, setTheme } = useTheme();
  
  const [step, setStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<CsvPreview | null>(null);
  
  const [isImporting, setIsImporting] = useState(false);
  const [aiPhaseIndex, setAiPhaseIndex] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isImporting) {
      interval = setInterval(() => {
        setAiPhaseIndex((prev) => (prev + 1) % AI_PHASES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isImporting]);

  useEffect(() => {
    if (step === 4 && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, [step]);

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;
    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith('.csv')) {
      toast.error("Invalid file type. Please upload a CSV file.");
      return;
    }
    
    setFile(selectedFile);
    await uploadFile(selectedFile);
  };

  const uploadFile = async (fileToUpload: File) => {
    setIsUploading(true);
    setStep(2);
    
    try {
      const form = new FormData();
      form.append('file', fileToUpload);
      
      const API = import.meta.env.VITE_API_BASE;

      const res = await fetch(`${API}/api/csv/upload`, { 
        method: 'POST', 
        body: form 
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed with status ${res.status}`);
      }
      
      const data: CsvPreview = await res.json();
      setPreviewData(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to parse CSV preview");
      setStep(1);
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const runAiImport = async () => {
    if (!file) return;
    
    setIsImporting(true);
    setAiPhaseIndex(0);
    setStep(3);
    
    try {
      const form = new FormData();
      form.append('file', file);
      
      const API = import.meta.env.VITE_API_BASE;

    const res = await fetch(`${API}/api/csv/import`, { 
        method: 'POST', 
        body: form 
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Import failed with status ${res.status}`);
      }
      
      const data: ImportResult = await res.json();
      setImportResult(data);
      setStep(4);
      toast.success("AI Import completed successfully!");
    } catch (error: any) {
      toast.error(error.message || "AI Import failed");
      setStep(2);
    } finally {
      setIsImporting(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
  };

  const downloadResults = () => {
    if (!importResult || importResult.records.length === 0) return;
    
    const headers = Object.keys(importResult.records[0]).join(',');
    const rows = importResult.records.map(record => 
      Object.values(record).map(val => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `groweasy_import_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">GrowEasy</span>
          </div>
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <span className="text-foreground transition-colors flex items-center gap-2">
                <Database className="w-4 h-4" /> Data Ingestion
              </span>
              <Link href="/leads" className="hover:text-foreground cursor-pointer transition-colors">Leads</Link>
              <Link href="/campaigns" className="hover:text-foreground cursor-pointer transition-colors">Campaigns</Link>
            </nav>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-7xl">
        
        {/* Header Section */}
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5 px-4 py-1">
              AI-Powered Extraction
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Intelligent CSV Import
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Drop any messy spreadsheet from any source. Our AI agent extracts, cleans, and structures the data into perfect CRM leads.
            </p>
          </motion.div>
        </div>

        {/* Steps Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between max-w-4xl mx-auto relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border/50 -z-10" />
            <motion.div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary -z-10 shadow-[0_0_10px_rgba(var(--primary),0.5)]"
              initial={{ width: "0%" }}
              animate={{ width: `${((step - 1) / (IMPORT_STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
            
            {IMPORT_STEPS.map((s, idx) => {
              const isActive = s.id === step;
              const isPast = s.id < step;
              const Icon = s.icon;
              
              return (
                <div key={s.id} className="flex flex-col items-center gap-2 relative bg-background px-2">
                  <motion.div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                      ${isActive ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(20,184,166,0.5)]' : ''}
                      ${isPast ? 'border-primary bg-primary text-primary-foreground' : ''}
                      ${!isActive && !isPast ? 'border-border bg-card text-muted-foreground' : ''}
                    `}
                    initial={false}
                    animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                  >
                    {isPast ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                  </motion.div>
                  <span className={`text-xs font-medium uppercase tracking-wider hidden md:block
                    ${isActive ? 'text-primary' : isPast ? 'text-foreground' : 'text-muted-foreground'}
                  `}>
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="max-w-3xl mx-auto"
            >
              <Card className="border-dashed border-2 bg-card/50 backdrop-blur overflow-hidden relative group transition-colors hover:border-primary/50">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <CardContent className="p-0">
                  <div 
                    className="flex flex-col items-center justify-center py-24 px-6 cursor-pointer"
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-primary/5', 'border-primary/50'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-primary/5', 'border-primary/50'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-primary/5', 'border-primary/50');
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleFileChange(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-20 h-20 bg-card border rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500 relative">
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <UploadCloud className="w-10 h-10 text-primary relative z-10" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">Drop your CSV here</h3>
                    <p className="text-muted-foreground mb-8 text-center max-w-md">
                      Upload exports from Facebook Ads, Google, Excel, or legacy CRMs. We'll map it automatically.
                    </p>
                    <Button variant="outline" size="lg" className="pointer-events-none font-medium">
                      Browse Files
                    </Button>
                    <input 
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef} 
                      accept=".csv" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: PREVIEW / LOADING */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 max-w-5xl mx-auto"
            >
              {isUploading ? (
                <Card className="max-w-2xl mx-auto glass-panel">
                  <CardContent className="py-16 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-6" />
                    <h3 className="text-xl font-semibold mb-2">Analyzing Structure...</h3>
                    <p className="text-muted-foreground text-center">Reading headers and sampling data rows</p>
                  </CardContent>
                </Card>
              ) : previewData ? (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg text-primary">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{previewData.fileName}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <Badge variant="secondary" className="font-mono text-xs">{previewData.totalRows} rows</Badge>
                          <Badge variant="secondary" className="font-mono text-xs">{previewData.headers.length} columns</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <Button variant="outline" onClick={() => setStep(1)} className="w-full md:w-auto">
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Change File
                      </Button>
                      <Button size="lg" onClick={runAiImport} className="w-full md:w-auto font-semibold glow-primary">
                        Run AI Import
                        <Sparkles className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>

                  <Card className="glass-panel overflow-hidden border-border/50">
                    <CardHeader className="border-b bg-muted/20">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Data Preview</span>
                        <span className="text-sm font-normal text-muted-foreground font-mono bg-background px-3 py-1 rounded-md border">
                          Showing first {Math.min(previewData.rows.length, 100)} rows
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <div className="max-h-[500px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 shadow-sm border-b">
                            <TableRow>
                              <TableHead className="w-12 text-center text-xs font-mono">#</TableHead>
                              {previewData.headers.map((h, i) => (
                                <TableHead key={i} className="whitespace-nowrap font-mono text-xs text-primary">{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.rows.slice(0, 100).map((row, rIdx) => (
                              <TableRow key={rIdx} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="text-center font-mono text-xs text-muted-foreground">{rIdx + 1}</TableCell>
                                {previewData.headers.map((h, cIdx) => (
                                  <TableCell key={cIdx} className="whitespace-nowrap font-mono text-sm max-w-[200px] truncate" title={row[h]}>
                                    {row[h] || <span className="text-muted-foreground/30 italic">null</span>}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </Card>
                </div>
              ) : null}
            </motion.div>
          )}

          {/* STEP 3: AI IMPORTING */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="glass-panel overflow-hidden relative border-primary/30">
                <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                <CardContent className="pt-16 pb-12 px-12 relative z-10 flex flex-col items-center text-center">
                  <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-4 tracking-tight">AI Agent Processing Data</h2>
                  
                  <div className="w-full max-w-md bg-card/80 border rounded-xl p-4 shadow-sm mb-6">
                    <div className="flex items-center gap-3 text-sm font-mono text-primary mb-2">
                      <Activity className="w-4 h-4" />
                      <span>System Status</span>
                    </div>
                    <div className="h-10 flex flex-col items-center justify-center overflow-hidden relative">
                      <AnimatePresence mode="popLayout">
                        <motion.p
                          key={aiPhaseIndex}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          className="text-muted-foreground font-mono text-sm absolute"
                        >
                          {AI_PHASES[aiPhaseIndex]}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  <Progress value={undefined} className="w-full max-w-md h-2 bg-muted/50" />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 4: RESULTS */}
          {step === 4 && importResult && (
            <motion.div 
              key="step4"
              ref={resultsRef}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="space-y-8"
            >
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-panel relative overflow-hidden border-t-4 border-t-info">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs uppercase tracking-wider font-semibold">Total Processed</CardDescription>
                    <CardTitle className="text-4xl font-mono">{importResult.totalProcessed}</CardTitle>
                  </CardHeader>
                </Card>
                
                <Card className="glass-panel relative overflow-hidden border-t-4 border-t-success glow-success">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs uppercase tracking-wider font-semibold">Successfully Imported</CardDescription>
                    <CardTitle className="text-4xl font-mono text-success">{importResult.totalImported}</CardTitle>
                  </CardHeader>
                </Card>
                
                <Card className={`glass-panel relative overflow-hidden border-t-4 ${importResult.totalSkipped > 0 ? 'border-t-destructive' : 'border-t-border'}`}>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs uppercase tracking-wider font-semibold">Skipped Rows</CardDescription>
                    <CardTitle className={`text-4xl font-mono ${importResult.totalSkipped > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {importResult.totalSkipped}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Import Complete
                </h3>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={resetAll}>
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Start Over
                  </Button>
                  <Button onClick={downloadResults} className="font-semibold">
                    <Download className="w-4 h-4 mr-2" />
                    Download CRM Data
                  </Button>
                </div>
              </div>

              {/* Tables */}
              <Tabs defaultValue="imported" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 h-12 p-1">
                  <TabsTrigger value="imported" className="font-semibold tracking-wide h-full">
                    Imported Records ({importResult.totalImported})
                  </TabsTrigger>
                  <TabsTrigger value="skipped" className="font-semibold tracking-wide h-full" disabled={importResult.totalSkipped === 0}>
                    Skipped ({importResult.totalSkipped})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="imported" className="focus-visible:outline-none">
                  <Card className="glass-panel overflow-hidden border-border/50">
                    <div className="overflow-x-auto">
                      <div className="max-h-[600px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-20 shadow-sm border-b">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="sticky left-0 bg-background/95 z-30 min-w-[200px] border-r">Name</TableHead>
                              <TableHead className="min-w-[150px]">Status</TableHead>
                              <TableHead className="min-w-[250px]">Email</TableHead>
                              <TableHead className="min-w-[150px]">Mobile Code</TableHead>
                              <TableHead className="min-w-[180px]">Mobile</TableHead>
                              <TableHead className="min-w-[200px]">Company</TableHead>
                              <TableHead className="min-w-[150px]">City</TableHead>
                              <TableHead className="min-w-[150px]">State</TableHead>
                              <TableHead className="min-w-[150px]">Country</TableHead>
                              <TableHead className="min-w-[150px]">Lead Owner</TableHead>
                              <TableHead className="min-w-[150px]">Data Source</TableHead>
                              <TableHead className="min-w-[180px]">Possession Time</TableHead>
                              <TableHead className="min-w-[200px]">CRM Note</TableHead>
                              <TableHead className="min-w-[300px]">Description</TableHead>
                              <TableHead className="min-w-[180px]">Created At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importResult.records.map((record, i) => (
                              <motion.tr 
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: Math.min(i * 0.05, 1) }}
                                className="border-b transition-colors hover:bg-muted/50 group"
                              >
                                <TableCell className="sticky left-0 bg-card group-hover:bg-muted/50 z-10 font-medium border-r transition-colors whitespace-nowrap">
                                  {record.name || <span className="text-muted-foreground font-normal italic">Unknown</span>}
                                </TableCell>
                                <TableCell>
                                  {record.crm_status ? (
                                    <Badge variant={
                                      record.crm_status === 'GOOD_LEAD_FOLLOW_UP' ? 'success' :
                                      record.crm_status === 'DID_NOT_CONNECT' ? 'warning' :
                                      record.crm_status === 'BAD_LEAD' ? 'destructive' :
                                      record.crm_status === 'SALE_DONE' ? 'info' : 'secondary'
                                    } className="whitespace-nowrap font-mono text-[10px] tracking-wider">
                                      {record.crm_status.replace(/_/g, ' ')}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-sm max-w-[250px] truncate" title={record.email || ''}>{record.email || '-'}</TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                  {record.country_code ? `+${record.country_code}` : '-'}
                                </TableCell>
                                <TableCell className="font-mono text-sm text-foreground">
                                  {record.mobile_without_country_code || '-'}
                                </TableCell>
                                <TableCell className="text-sm max-w-[200px] truncate" title={record.company || ''}>{record.company || '-'}</TableCell>
                                <TableCell className="text-sm truncate max-w-[150px]" title={record.city || ''}>{record.city || '-'}</TableCell>
                                <TableCell className="text-sm truncate max-w-[150px]" title={record.state || ''}>{record.state || '-'}</TableCell>
                                <TableCell className="text-sm truncate max-w-[150px]" title={record.country || ''}>{record.country || '-'}</TableCell>
                                <TableCell className="text-sm truncate max-w-[150px]" title={record.lead_owner || ''}>{record.lead_owner || '-'}</TableCell>
                                <TableCell className="text-sm truncate max-w-[150px]" title={record.data_source || ''}>
                                  {record.data_source ? (
                                    <Badge variant="outline" className="font-mono text-xs">{record.data_source}</Badge>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-sm font-mono text-muted-foreground truncate max-w-[180px]">{record.possession_time || '-'}</TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={record.crm_note || ''}>
                                  {record.crm_note || '-'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate" title={record.description || ''}>
                                  {record.description || '-'}
                                </TableCell>
                                <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                                  {record.created_at ? new Date(record.created_at).toLocaleString() : '-'}
                                </TableCell>
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
                
                <TabsContent value="skipped" className="focus-visible:outline-none">
                  <Card className="border-destructive/30 overflow-hidden">
                    <CardHeader className="bg-destructive/5 border-b border-destructive/10 pb-4">
                      <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-5 h-5" />
                        Skipped Records
                      </CardTitle>
                      <CardDescription>These rows could not be parsed by the AI and were skipped.</CardDescription>
                    </CardHeader>
                    <div className="overflow-x-auto max-h-[500px]">
                      <Table>
                        <TableHeader className="bg-background/95 backdrop-blur sticky top-0 z-10 shadow-sm border-b">
                          <TableRow>
                            <TableHead className="w-20 font-mono text-xs">Row #</TableHead>
                            <TableHead className="min-w-[200px]">Reason</TableHead>
                            <TableHead>Raw Data Preview</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.skipped.map((skip, i) => (
                            <TableRow key={i} className="hover:bg-destructive/5 transition-colors">
                              <TableCell className="font-mono text-muted-foreground">{skip.rowIndex}</TableCell>
                              <TableCell>
                                <Badge variant="destructive" className="font-normal bg-destructive/10 text-destructive border-destructive/20">
                                  {skip.reason}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                <div className="max-w-[600px] truncate bg-muted/30 p-2 rounded border border-border/50" title={JSON.stringify(skip.rawData)}>
                                  {JSON.stringify(skip.rawData)}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

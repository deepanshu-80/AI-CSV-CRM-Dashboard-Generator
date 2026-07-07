import { useState, useMemo, useEffect, useRef } from "react";
import {
  Users, Search, Filter, Download, Plus, Mail, Phone, Building2, MapPin,
  Sparkles, Database, Sun, Moon, X, Check, Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useTheme } from "@/components/theme-provider";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  status: string;
  source: string;
}

/* ─── Seed data ──────────────────────────────────────────────────────────── */
const SEED_LEADS: Lead[] = [
  { id: 1, name: "John Doe",      email: "john.doe@example.com",    phone: "9876543210", company: "TechCorp Pvt Ltd",  city: "Mumbai",        status: "GOOD_LEAD_FOLLOW_UP", source: "Facebook Ads" },
  { id: 2, name: "Priya Patel",   email: "priya.patel@gmail.com",   phone: "9123456789", company: "Eden Properties",   city: "Ahmedabad",     status: "GOOD_LEAD_FOLLOW_UP", source: "Facebook Leads" },
  { id: 3, name: "Emily Johnson", email: "emily.j@outlook.com",     phone: "4155550192", company: "Global Realty",     city: "San Francisco", status: "SALE_DONE",           source: "Referral" },
  { id: 4, name: "Rahul Sharma",  email: "rahul.sharma@company.in", phone: "8800112233", company: "StartupXYZ",        city: "Bangalore",     status: "GOOD_LEAD_FOLLOW_UP", source: "Website" },
  { id: 5, name: "Jane Smith",    email: "jane.smith@gmail.com",    phone: "9123456789", company: "Real Estate Inc",   city: "Delhi",         status: "BAD_LEAD",            source: "Google Ads" },
  { id: 6, name: "Tom Brown",     email: "tom.brown@gmail.com",     phone: "2071234567", company: "Brown & Co",        city: "London",        status: "SALE_DONE",           source: "Website" },
  { id: 7, name: "Mohammed Ali",  email: "m.ali@business.ae",       phone: "501234567",  company: "Gulf Investments",  city: "Dubai",         status: "GOOD_LEAD_FOLLOW_UP", source: "Google Ads" },
  { id: 8, name: "Kavya Nair",    email: "kavya.nair@infosys.com",  phone: "8123456789", company: "Infosys Ltd",       city: "Trivandrum",    status: "DID_NOT_CONNECT",     source: "Sarjapur Plots" },
];

const STATUS_OPTIONS = [
  { value: "GOOD_LEAD_FOLLOW_UP", label: "Good Lead",  color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { value: "DID_NOT_CONNECT",     label: "No Connect", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  { value: "BAD_LEAD",            label: "Bad Lead",   color: "bg-red-500/10 text-red-400 border-red-500/20" },
  { value: "SALE_DONE",           label: "Sale Done",  color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
];

const SOURCE_OPTIONS = ["Facebook Ads", "Facebook Leads", "Google Ads", "Referral", "Website", "Sarjapur Plots"];

const STATUS_MAP: Record<string, { label: string; color: string }> = Object.fromEntries(
  STATUS_OPTIONS.map(o => [o.value, { label: o.label, color: o.color }])
);

const EMPTY_LEAD: Omit<Lead, "id"> = {
  name: "", email: "", phone: "", company: "", city: "", status: "GOOD_LEAD_FOLLOW_UP", source: "Website",
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */

/** Reusable field wrapper */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      {...props}
    />
  );
}

function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      {...props}
    />
  );
}

/** Accessible modal — traps focus, closes on Escape, restores focus on unmount */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Focus first focusable element on open
  useEffect(() => {
    const first = dialogRef.current?.querySelector<HTMLElement>(
      "button,input,select,textarea,[tabindex]:not([tabindex='-1'])"
    );
    first?.focus();
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="relative z-10 w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold" id="modal-title">{title}</h2>
            <button onClick={onClose} aria-label="Close dialog" className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Lead add/edit form */
function LeadForm({
  initial,
  onSave,
  onClose,
  title,
}: {
  initial: Omit<Lead, "id">;
  onSave: (data: Omit<Lead, "id">) => void;
  onClose: () => void;
  title: string;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const errors = {
    name:  !form.name.trim()  ? "Name is required" : "",
    email: !form.email.trim() ? "Email is required" : !emailOk ? "Enter a valid email" : "",
  };
  const valid = !errors.name && !errors.email;

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name *">
            <Input value={form.name} onChange={set("name")} placeholder="John Doe" aria-required="true" />
            {errors.name && <p className="text-xs text-red-400 mt-0.5">{errors.name}</p>}
          </Field>
          <Field label="Email *">
            <Input value={form.email} onChange={set("email")} placeholder="john@example.com" type="email" aria-required="true" />
            {errors.email && <p className="text-xs text-red-400 mt-0.5">{errors.email}</p>}
          </Field>
          <Field label="Phone">      <Input value={form.phone}   onChange={set("phone")}   placeholder="9876543210" /></Field>
          <Field label="Company">    <Input value={form.company} onChange={set("company")} placeholder="Acme Corp" /></Field>
          <Field label="City">       <Input value={form.city}    onChange={set("city")}    placeholder="Mumbai" /></Field>
          <Field label="Source">
            <Select value={form.source} onChange={set("source")}>
              {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Status">
          <Select value={form.status} onChange={set("status")}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid} onClick={() => valid && onSave(form)} className="glow-primary">
            <Check className="w-4 h-4 mr-1.5" /> Save Lead
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Filter drawer */
function FilterPanel({
  statuses,
  sources,
  cities,
  filters,
  onChange,
  onClear,
  onClose,
}: {
  statuses: string[];
  sources: string[];
  cities: string[];
  filters: { statuses: string[]; sources: string[]; cities: string[] };
  onChange: (f: { statuses: string[]; sources: string[]; cities: string[] }) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const toggle = (key: "statuses" | "sources" | "cities", val: string) => {
    const arr = filters[key];
    onChange({ ...filters, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] });
  };

  const Chip = ({ k, v, label }: { k: "statuses" | "sources" | "cities"; v: string; label: string }) => {
    const active = filters[k].includes(v);
    return (
      <button
        onClick={() => toggle(k, v)}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
          active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
        }`}
      >
        {label}
      </button>
    );
  };

  const total = filters.statuses.length + filters.sources.length + filters.cities.length;

  return (
    <Modal title={`Filter Leads${total ? ` (${total} active)` : ""}`} onClose={onClose}>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(s => <Chip key={s.value} k="statuses" v={s.value} label={s.label} />)}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Source</p>
          <div className="flex flex-wrap gap-2">
            {sources.map(s => <Chip key={s} k="sources" v={s} label={s} />)}
          </div>
        </div>
        {cities.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">City</p>
            <div className="flex flex-wrap gap-2">
              {cities.map(c => <Chip key={c} k="cities" v={c} label={c} />)}
            </div>
          </div>
        )}
        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">Clear all</Button>
          <Button size="sm" onClick={onClose} className="glow-primary">Apply Filters</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function Leads() {
  const { theme, setTheme } = useTheme();
  const [leads, setLeads] = useState<Lead[]>(SEED_LEADS);
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filters, setFilters] = useState<{ statuses: string[]; sources: string[]; cities: string[] }>({
    statuses: [], sources: [], cities: [],
  });
  const [saved, setSaved] = useState<number | null>(null); // flash ID

  /* derived */
  const allCities = useMemo(() => [...new Set(leads.map(l => l.city))].sort(), [leads]);
  const allSources = useMemo(() => [...new Set(leads.map(l => l.source))].sort(), [leads]);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const q = search.toLowerCase();
      const matchSearch = !q || [l.name, l.email, l.company, l.city, l.source].some(v => v.toLowerCase().includes(q));
      const matchStatus = !filters.statuses.length || filters.statuses.includes(l.status);
      const matchSource = !filters.sources.length || filters.sources.includes(l.source);
      const matchCity = !filters.cities.length || filters.cities.includes(l.city);
      return matchSearch && matchStatus && matchSource && matchCity;
    });
  }, [leads, search, filters]);

  const stats = useMemo(() => ({
    total: leads.length,
    good: leads.filter(l => l.status === "GOOD_LEAD_FOLLOW_UP").length,
    done: leads.filter(l => l.status === "SALE_DONE").length,
  }), [leads]);

  const activeFilters = filters.statuses.length + filters.sources.length + filters.cities.length;

  /* actions */
  const addLead = (data: Omit<Lead, "id">) => {
    const id = Date.now();
    setLeads(prev => [{ id, ...data }, ...prev]);
    setShowAdd(false);
    setSaved(id);
    setTimeout(() => setSaved(null), 2500);
  };

  const saveLead = (data: Omit<Lead, "id">) => {
    if (!editingLead) return;
    setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...editingLead, ...data } : l));
    setSaved(editingLead.id);
    setTimeout(() => setSaved(null), 2500);
    setEditingLead(null);
  };

  const deleteLead = (id: number) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    setDeleteId(null);
  };

  const exportCSV = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = ["Name", "Email", "Phone", "Company", "City", "Status", "Source"].map(esc);
    const rows = filtered.map(l => [
      l.name, l.email, l.phone, l.company, l.city,
      STATUS_MAP[l.status]?.label ?? l.status,
      l.source,
    ].map(esc).join(","));
    const blob = new Blob([header.join(",") + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "groweasy-leads.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-24">

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">GrowEasy</span>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-2">
                <Database className="w-4 h-4" />Data Ingestion
              </Link>
              <span className="text-foreground cursor-default">Leads</span>
              <Link href="/campaigns" className="hover:text-foreground transition-colors">Campaigns</Link>
            </nav>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-full">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-7xl space-y-8">

        {/* ─── Page header ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-muted-foreground mt-1">Manage and track all your CRM leads in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilter(true)}
              className={activeFilters ? "border-primary text-primary" : ""}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter{activeFilters ? ` (${activeFilters})` : ""}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
            <Button size="sm" className="glow-primary" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" />Add Lead
            </Button>
          </div>
        </div>

        {/* ─── Stats ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Leads", value: stats.total.toLocaleString(), color: "text-primary" },
            { label: "Good Leads",  value: stats.good.toLocaleString(),  color: "text-emerald-400" },
            { label: "Sales Done",  value: stats.done.toLocaleString(),  color: "text-teal-400" },
            { label: "Showing Now", value: filtered.length.toString(),   color: "text-blue-400" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="glass-panel">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardDescription className="text-xs uppercase tracking-wider">{stat.label}</CardDescription>
                  <CardTitle className={`text-3xl font-mono ${stat.color}`}>{stat.value}</CardTitle>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ─── Search ──────────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads by name, email, company, city…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ─── Table ───────────────────────────────────────────────────── */}
        <Card className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/20">
                <tr>
                  {["Name", "Email", "Phone", "Company", "City", "Status", "Source", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>No leads match your filters.</p>
                        <button onClick={() => { setSearch(""); setFilters({ statuses: [], sources: [], cities: [] }); }}
                          className="text-primary text-sm mt-1 hover:underline">Clear filters</button>
                      </td>
                    </tr>
                  ) : filtered.map((lead, i) => (
                    <motion.tr
                      key={lead.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: i * 0.03 }}
                      className={`border-b border-border/50 transition-colors ${saved === lead.id ? "bg-emerald-500/10" : "hover:bg-muted/30"}`}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{lead.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-muted-foreground"><Building2 className="w-3 h-3" />{lead.company}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{lead.city}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_MAP[lead.status]?.color}`}>
                          {STATUS_MAP[lead.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{lead.source}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingLead(lead)}
                            className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(lead.id)}
                            className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t bg-muted/10 text-xs text-muted-foreground flex items-center justify-between">
            <span>Showing {filtered.length} of {leads.length} leads</span>
            <Link href="/" className="text-primary hover:underline">Import more via CSV →</Link>
          </div>
        </Card>
      </main>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}
      {showFilter && (
        <FilterPanel
          statuses={STATUS_OPTIONS.map(s => s.value)}
          sources={allSources}
          cities={allCities}
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters({ statuses: [], sources: [], cities: [] })}
          onClose={() => setShowFilter(false)}
        />
      )}

      {showAdd && (
        <LeadForm
          title="Add New Lead"
          initial={EMPTY_LEAD}
          onSave={addLead}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editingLead && (
        <LeadForm
          title={`Edit — ${editingLead.name}`}
          initial={{ name: editingLead.name, email: editingLead.email, phone: editingLead.phone, company: editingLead.company, city: editingLead.city, status: editingLead.status, source: editingLead.source }}
          onSave={saveLead}
          onClose={() => setEditingLead(null)}
        />
      )}

      {deleteId !== null && (
        <Modal title="Delete Lead" onClose={() => setDeleteId(null)}>
          <p className="text-muted-foreground mb-6">
            Are you sure you want to delete <span className="text-foreground font-medium">{leads.find(l => l.id === deleteId)?.name}</span>?
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteLead(deleteId!)}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Delete
            </Button>
          </div>
        </Modal>
      )}

      {/* ─── Toast ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {saved !== null && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-medium shadow-lg"
          >
            <Check className="w-4 h-4" /> Lead saved successfully
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

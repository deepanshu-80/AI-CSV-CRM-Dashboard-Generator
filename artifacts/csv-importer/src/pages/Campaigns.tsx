import { useState, useMemo } from "react";
import {
  Megaphone, Plus, Mail, Phone, Users, Calendar, Filter,
  Sparkles, Database, Sun, Moon, X, Check, Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useTheme } from "@/components/theme-provider";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Campaign {
  id: number;
  name: string;
  type: string;
  status: "Active" | "Paused" | "Completed";
  leads: number;
  opened: number;
  converted: number;
  startDate: string;
  source: string;
}

/* ─── Seed data ──────────────────────────────────────────────────────────── */
const SEED_CAMPAIGNS: Campaign[] = [
  { id: 1, name: "Mumbai Premium Property Drive",  type: "Email",        status: "Active",    leads: 342, opened: 210, converted: 28, startDate: "2026-06-01", source: "Facebook Ads" },
  { id: 2, name: "Sarjapur Plots Q3 Outreach",     type: "WhatsApp",     status: "Active",    leads: 189, opened: 165, converted: 41, startDate: "2026-06-15", source: "Sarjapur Plots" },
  { id: 3, name: "Eden Park Follow-Up Sequence",   type: "Email + Call", status: "Paused",    leads: 95,  opened: 72,  converted: 12, startDate: "2026-05-20", source: "Eden Park" },
  { id: 4, name: "Meridian Tower Dubai Investors", type: "Email",        status: "Completed", leads: 504, opened: 389, converted: 67, startDate: "2026-04-10", source: "Meridian Tower" },
  { id: 5, name: "Google Ads Lead Nurture",        type: "Email",        status: "Active",    leads: 228, opened: 180, converted: 19, startDate: "2026-07-01", source: "Google Ads" },
];

const STATUS_COLORS: Record<string, string> = {
  Active:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Paused:    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Completed: "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

const CAMPAIGN_TYPES = ["Email", "WhatsApp", "Call", "Email + Call", "SMS"];
const SOURCE_OPTIONS = ["Facebook Ads", "Facebook Leads", "Google Ads", "Referral", "Website", "Sarjapur Plots", "Eden Park", "Meridian Tower"];

const EMPTY_CAMPAIGN: Omit<Campaign, "id"> = {
  name: "", type: "Email", status: "Active", leads: 0, opened: 0, converted: 0, startDate: new Date().toISOString().split("T")[0], source: "Facebook Ads",
};

/* ─── Shared UI primitives ───────────────────────────────────────────────── */
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative z-10 w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Campaign form (add + edit) ─────────────────────────────────────────── */
function CampaignForm({
  title,
  initial,
  onSave,
  onClose,
}: {
  title: string;
  initial: Omit<Campaign, "id">;
  onSave: (data: Omit<Campaign, "id">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Campaign, "id">>(initial);

  const set = (k: keyof Omit<Campaign, "id">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: ["leads", "opened", "converted"].includes(k) ? Number(e.target.value) : e.target.value }));

  const valid = form.name.trim().length > 0;

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Campaign Name *">
          <Input value={form.name} onChange={set("name")} placeholder="Mumbai Property Drive" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select value={form.type} onChange={set("type")}>
              {CAMPAIGN_TYPES.map(t => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set("status") as any}>
              {(["Active", "Paused", "Completed"] as const).map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Start Date">
            <Input type="date" value={form.startDate} onChange={set("startDate")} />
          </Field>
          <Field label="Source">
            <Select value={form.source} onChange={set("source")}>
              {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Total Leads">
            <Input type="number" min={0} value={form.leads} onChange={set("leads")} />
          </Field>
          <Field label="Opened">
            <Input type="number" min={0} value={form.opened} onChange={set("opened")} />
          </Field>
        </div>
        <Field label="Converted">
          <Input type="number" min={0} value={form.converted} onChange={set("converted")} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid} onClick={() => valid && onSave(form)} className="glow-primary">
            <Check className="w-4 h-4 mr-1.5" /> Save Campaign
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Filter panel ───────────────────────────────────────────────────────── */
function FilterPanel({
  filters,
  onChange,
  onClear,
  onClose,
}: {
  filters: { statuses: string[]; types: string[] };
  onChange: (f: { statuses: string[]; types: string[] }) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const toggle = (key: "statuses" | "types", val: string) => {
    const arr = filters[key];
    onChange({ ...filters, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] });
  };

  const Chip = ({ k, v }: { k: "statuses" | "types"; v: string }) => {
    const active = filters[k].includes(v);
    return (
      <button
        onClick={() => toggle(k, v)}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
          active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
        }`}
      >
        {v}
      </button>
    );
  };

  const total = filters.statuses.length + filters.types.length;

  return (
    <Modal title={`Filter Campaigns${total ? ` (${total} active)` : ""}`} onClose={onClose}>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</p>
          <div className="flex flex-wrap gap-2">
            {["Active", "Paused", "Completed"].map(s => <Chip key={s} k="statuses" v={s} />)}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Campaign Type</p>
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_TYPES.map(t => <Chip key={t} k="types" v={t} />)}
          </div>
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">Clear all</Button>
          <Button size="sm" onClick={onClose} className="glow-primary">Apply Filters</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function Campaigns() {
  const { theme, setTheme } = useTheme();
  const [campaigns, setCampaigns] = useState<Campaign[]>(SEED_CAMPAIGNS);
  const [showFilter, setShowFilter] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filters, setFilters] = useState<{ statuses: string[]; types: string[] }>({ statuses: [], types: [] });
  const [saved, setSaved] = useState<number | null>(null);

  const activeFilters = filters.statuses.length + filters.types.length;

  const filtered = useMemo(() => campaigns.filter(c => {
    const matchStatus = !filters.statuses.length || filters.statuses.includes(c.status);
    const matchType   = !filters.types.length   || filters.types.includes(c.type);
    return matchStatus && matchType;
  }), [campaigns, filters]);

  const stats = useMemo(() => ({
    total:      campaigns.length,
    active:     campaigns.filter(c => c.status === "Active").length,
    reached:    campaigns.reduce((s, c) => s + c.leads, 0),
    converted:  campaigns.reduce((s, c) => s + c.converted, 0),
  }), [campaigns]);

  /* ── actions ── */
  const addCampaign = (data: Omit<Campaign, "id">) => {
    const id = Date.now();
    setCampaigns(prev => [{ id, ...data }, ...prev]);
    setShowAdd(false);
    flash(id);
  };

  const saveCampaign = (data: Omit<Campaign, "id">) => {
    if (!editingCampaign) return;
    setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? { ...editingCampaign, ...data } : c));
    flash(editingCampaign.id);
    setEditingCampaign(null);
  };

  const deleteCampaign = (id: number) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    setDeleteId(null);
  };

  const flash = (id: number) => {
    setSaved(id);
    setTimeout(() => setSaved(null), 2500);
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
              <Link href="/leads" className="hover:text-foreground transition-colors">Leads</Link>
              <span className="text-foreground cursor-default">Campaigns</span>
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
            <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground mt-1">Create and monitor outreach campaigns for your imported leads.</p>
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
            <Button size="sm" className="glow-primary" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" />New Campaign
            </Button>
          </div>
        </div>

        {/* ─── Stats ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Campaigns", value: stats.total.toString(),              color: "text-primary" },
            { label: "Active",          value: stats.active.toString(),             color: "text-emerald-400" },
            { label: "Leads Reached",   value: stats.reached.toLocaleString(),      color: "text-blue-400" },
            { label: "Conversions",     value: stats.converted.toLocaleString(),    color: "text-teal-400" },
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

        {/* ─── Campaign cards ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-20 text-center text-muted-foreground">
                <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No campaigns match your filters.</p>
                <button onClick={() => setFilters({ statuses: [], types: [] })}
                  className="text-primary text-sm mt-1 hover:underline">Clear filters</button>
              </motion.div>
            ) : filtered.map((c, i) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className={`glass-panel transition-all ${saved === c.id ? "border-emerald-500/40 bg-emerald-500/5" : "hover:border-primary/30"}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">

                      {/* Icon */}
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {c.type.includes("Email") ? <Mail className="w-5 h-5 text-primary" /> : <Phone className="w-5 h-5 text-primary" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{c.name}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[c.status]}`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.startDate}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.leads} leads</span>
                          <span className="px-1.5 py-0.5 rounded border border-border text-[10px] font-mono">{c.type}</span>
                          <span className="px-1.5 py-0.5 rounded border border-border text-[10px] font-mono">{c.source}</span>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center gap-6 text-center flex-shrink-0">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Opened</p>
                          <p className="text-lg font-mono font-semibold">{c.opened}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {c.leads > 0 ? Math.round((c.opened / c.leads) * 100) : 0}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Converted</p>
                          <p className="text-lg font-mono font-semibold text-emerald-400">{c.converted}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {c.leads > 0 ? Math.round((c.converted / c.leads) * 100) : 0}%
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setEditingCampaign(c)}
                          className="p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Edit campaign"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(c.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          title="Delete campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Conversion progress</span>
                        <span>{c.leads > 0 ? Math.round((c.converted / c.leads) * 100) : 0}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: c.leads > 0 ? `${(c.converted / c.leads) * 100}%` : "0%" }}
                          transition={{ delay: i * 0.06 + 0.3, duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}
      {showFilter && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters({ statuses: [], types: [] })}
          onClose={() => setShowFilter(false)}
        />
      )}

      {showAdd && (
        <CampaignForm
          title="New Campaign"
          initial={EMPTY_CAMPAIGN}
          onSave={addCampaign}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editingCampaign && (
        <CampaignForm
          title={`Edit — ${editingCampaign.name}`}
          initial={{
            name: editingCampaign.name,
            type: editingCampaign.type,
            status: editingCampaign.status,
            leads: editingCampaign.leads,
            opened: editingCampaign.opened,
            converted: editingCampaign.converted,
            startDate: editingCampaign.startDate,
            source: editingCampaign.source,
          }}
          onSave={saveCampaign}
          onClose={() => setEditingCampaign(null)}
        />
      )}

      {deleteId !== null && (
        <Modal title="Delete Campaign" onClose={() => setDeleteId(null)}>
          <p className="text-muted-foreground mb-6">
            Are you sure you want to delete{" "}
            <span className="text-foreground font-medium">{campaigns.find(c => c.id === deleteId)?.name}</span>?
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCampaign(deleteId!)}>
              <Trash2 className="w-4 h-4 mr-1.5" />Delete
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
            <Check className="w-4 h-4" />Campaign saved successfully
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

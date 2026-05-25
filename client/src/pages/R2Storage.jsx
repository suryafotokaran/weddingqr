import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  HardDrive, RefreshCw, AlertCircle, ArrowUp, ArrowDown,
  DollarSign, CheckCircle, Layers, Activity, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Pricing constants (USD) ───────────────────────────────────────────────────
const PRICE_STORAGE = 0.015;   // per GB-month above free tier
const PRICE_CLASS_A = 4.50;    // per million ops above free tier
const PRICE_CLASS_B = 0.36;    // per million ops above free tier
const FREE_BYTES = 10 * 1024 ** 3;
const FREE_CLASS_A = 1_000_000;
const FREE_CLASS_B = 10_000_000;

const CLASS_A = new Set([
  'ListBuckets', 'PutBucket', 'ListObjects', 'ListObjectsV2', 'PutObject', 'CopyObject',
  'DeleteObject', 'DeleteObjects', 'CompleteMultipartUpload', 'CreateMultipartUpload',
  'UploadPart', 'UploadPartCopy', 'AbortMultipartUpload', 'ListMultipartUploads', 'ListParts',
  'PutBucketEncryption', 'GetBucketEncryption', 'PutBucketCors', 'GetBucketCors',
  'PutBucketLifecycleConfiguration', 'GetBucketLifecycleConfiguration',
  'GetBucketVersioning', 'PutBucketVersioning',
]);
const CLASS_B = new Set([
  'GetObject', 'HeadObject', 'HeadBucket', 'UsageSummary', 'GetBucketUsage',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAccountId() {
  const ep = import.meta.env.VITE_R2_ENDPOINT ?? '';
  const m = ep.match(/https:\/\/([a-f0-9]+)\.r2\.cloudflarestorage\.com/);
  return m ? m[1] : null;
}

function fmtBytes(b) {
  if (!b) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / k ** i).toFixed(2))} ${s[i]}`;
}

function fmtNum(n) {
  if (!n) return '0';
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

function pct(v, max) { return Math.min(100, (v / max) * 100); }

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent = 'teal', loading }) {
  const colors = {
    teal: { bg: 'bg-teal-50', icon: 'text-teal-600' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-500' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600' },
  };
  const c = colors[accent];
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 px-5 py-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
        <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon size={14} className={c.icon} />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-zinc-900 tracking-tight leading-none">
        {loading ? <span className="text-zinc-200">———</span> : value}
      </p>
      <p className="text-[11px] text-zinc-400 leading-snug">{sub}</p>
    </div>
  );
}

function UsageBar({ label, used, max, freeLabel, accent = 'teal', loading }) {
  const p = pct(used, max);
  const over = p > 80;
  const barColor = over
    ? 'bg-red-500'
    : accent === 'orange' ? 'bg-orange-400'
      : accent === 'blue' ? 'bg-blue-500'
        : 'bg-teal-600';
  const badgeColor = over
    ? 'bg-red-50 text-red-600'
    : accent === 'orange' ? 'bg-orange-50 text-orange-600'
      : accent === 'blue' ? 'bg-blue-50 text-blue-600'
        : 'bg-teal-50 text-teal-700';

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-zinc-700">{label}</p>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>
          {loading ? '—' : `${p.toFixed(p < 1 ? 2 : 1)}%`}
        </span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.max(loading ? 0 : p, 0.3)}%` }}
        />
      </div>
      <p className="text-[11px] text-zinc-400">{loading ? '—' : freeLabel}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function R2Storage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [opsData, setOpsData] = useState(null);
  const [gbMonths, setGbMonths] = useState(0);
  const [showOps, setShowOps] = useState(false);

  const accountId = getAccountId();
  const apiToken = import.meta.env.VITE_CF_API_TOKEN;
  const bucket = import.meta.env.VITE_R2_BUCKET ?? 'foto-select';

  async function fetchMetrics() {
    if (!apiToken) { setError('VITE_CF_API_TOKEN not set in .env.local'); setLoading(false); return; }
    if (!accountId) { setError('Cannot read Account ID from VITE_R2_ENDPOINT'); setLoading(false); return; }

    setLoading(true); setError(null);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().replace(/\.\d+Z$/, 'Z');
    const endOfDay = `${today}T23:59:59Z`;

    const query = `
      query R2Metrics($accountId: String!, $bucketName: String!) {
        viewer {
          accounts(filter: { accountTag: $accountId }) {
            r2StorageAdaptiveGroups(
              filter: { bucketName: $bucketName, date: "${today}" }
              limit: 1
            ) {
              max { payloadSize metadataSize objectCount uploadCount }
            }
            dailyStorage: r2StorageAdaptiveGroups(
              filter: {
                bucketName: $bucketName
                datetime_geq: "${startOfMonth}"
                datetime_leq: "${endOfDay}"
              }
              limit: 31
            ) {
              max { payloadSize }
              dimensions { datetime }
            }
            r2OperationsAdaptiveGroups(
              filter: {
                bucketName: $bucketName
                datetime_geq: "${startOfMonth}"
                datetime_leq: "${endOfDay}"
              }
              limit: 10000
            ) {
              dimensions { actionType }
              sum { requests }
            }
          }
        }
      }
    `;

    try {
      const res = await fetch('/cf-graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ query, variables: { accountId, bucketName: bucket } }),
      });

      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 200)}`); }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${json?.errors?.[0]?.message ?? text.slice(0, 200)}`);
      if (json.errors) throw new Error(json.errors.map(e => e.message).join(' | '));

      const acct = json.data?.viewer?.accounts?.[0];
      const storageRows = acct?.r2StorageAdaptiveGroups ?? [];
      const dailyRows = acct?.dailyStorage ?? [];
      const opsRows = acct?.r2OperationsAdaptiveGroups ?? [];

      setStorageData(storageRows[0]?.max ?? { payloadSize: 0, metadataSize: 0, objectCount: 0 });

      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      let gbm = 0;
      if (dailyRows.length > 0) {
        const sumBytes = dailyRows.reduce((s, d) => s + (d.max?.payloadSize ?? 0), 0);
        gbm = (sumBytes / dailyRows.length / (1024 ** 3)) * (dailyRows.length / daysInMonth);
      }
      setGbMonths(gbm);

      let classA = 0, classB = 0;
      for (const g of opsRows) {
        const t = g.dimensions?.actionType;
        const n = g.sum?.requests ?? 0;
        if (CLASS_A.has(t)) classA += n;
        else if (CLASS_B.has(t)) classB += n;
      }
      setOpsData({ classA, classB, raw: opsRows });

    } catch (err) {
      setError(err.message || 'Failed to load R2 metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMetrics(); }, []);

  // Derived values
  const storageBytes = storageData?.payloadSize ?? 0;
  const classA = opsData?.classA ?? 0;
  const classB = opsData?.classB ?? 0;

  const billableGbm = Math.max(0, gbMonths - 10);
  const billableA = Math.max(0, classA - FREE_CLASS_A);
  const billableB = Math.max(0, classB - FREE_CLASS_B);
  const costStorage = billableGbm * PRICE_STORAGE;
  const costA = (billableA / 1e6) * PRICE_CLASS_A;
  const costB = (billableB / 1e6) * PRICE_CLASS_B;
  const totalCost = costStorage + costA + costB;
  const isFree = totalCost === 0;

  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <DashboardLayout>

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-teal-600 font-bold tracking-widest text-[10px] uppercase mb-1">
            Infrastructure · Cloudflare R2
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Storage Analytics</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Bucket&nbsp;
            <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded-md font-mono">{bucket}</code>
            &nbsp;· {month}
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold shadow hover:bg-zinc-800 active:scale-95 transition-all shrink-0 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 mb-6">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700 mb-0.5">Could not load R2 metrics</p>
            <p className="text-xs text-red-500 font-mono break-all">{error}</p>
            {!apiToken && (
              <p className="text-xs text-red-400 mt-2">
                Add <code className="bg-red-100 px-1 rounded">VITE_CF_API_TOKEN=your_token</code> to{' '}
                <code className="bg-red-100 px-1 rounded">client/.env.local</code> and restart.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Storage Now"
          value={fmtBytes(storageBytes)}
          sub="Current bytes in bucket"
          icon={HardDrive}
          accent="teal"
          loading={loading}
        />
        <StatCard
          label="Objects"
          value={fmtNum(storageData?.objectCount ?? 0)}
          sub="Files stored in bucket"
          icon={Layers}
          accent="violet"
          loading={loading}
        />
        <StatCard
          label="Class A Ops"
          value={fmtNum(classA)}
          sub={`${pct(classA, FREE_CLASS_A).toFixed(2)}% of 1M free · writes`}
          icon={ArrowUp}
          accent="orange"
          loading={loading}
        />
        <StatCard
          label="Class B Ops"
          value={fmtNum(classB)}
          sub={`${pct(classB, FREE_CLASS_B).toFixed(2)}% of 10M free · reads`}
          icon={ArrowDown}
          accent="blue"
          loading={loading}
        />
      </div>

      {/* ── Usage bars ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <UsageBar
          label="Storage (current size)"
          used={storageBytes}
          max={FREE_BYTES}
          freeLabel={`${fmtBytes(storageBytes)} of 10 GB free · billing uses GB-months avg`}
          accent="teal"
          loading={loading}
        />
        <UsageBar
          label="Class A · Writes &amp; Lists"
          used={classA}
          max={FREE_CLASS_A}
          freeLabel={`${fmtNum(classA)} of 1M free this month`}
          accent="orange"
          loading={loading}
        />
        <UsageBar
          label="Class B · Reads"
          used={classB}
          max={FREE_CLASS_B}
          freeLabel={`${fmtNum(classB)} of 10M free this month`}
          accent="blue"
          loading={loading}
        />
      </div>

      {/* ── Billing card ── */}
      <div className={`rounded-2xl border p-5 mb-5 ${isFree ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
        {/* Title row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isFree ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              {isFree
                ? <CheckCircle size={18} className="text-emerald-600" />
                : <DollarSign size={18} className="text-amber-600" />}
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900">Estimated Bill — {month}</p>
              <p className="text-xs text-zinc-500">Based on current usage · resets 1st of next month</p>
            </div>
          </div>
          <div className={`text-3xl font-extrabold tabular-nums ${isFree ? 'text-emerald-600' : 'text-amber-600'}`}>
            {loading ? '—' : isFree ? '$0.00' : `$${totalCost.toFixed(4)}`}
          </div>
        </div>

        {/* Billing rows */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            {
              label: 'Storage',
              detail: loading ? '—' : `${gbMonths.toFixed(3)} GB-months`,
              free: '10 GB-months free',
              billable: billableGbm > 0 ? `${billableGbm.toFixed(3)} × $0.015/GB` : null,
              cost: costStorage,
            },
            {
              label: 'Class A',
              detail: loading ? '—' : `${classA.toLocaleString()} ops`,
              free: '1M free',
              billable: billableA > 0 ? `${billableA.toLocaleString()} × $4.50/M` : null,
              cost: costA,
            },
            {
              label: 'Class B',
              detail: loading ? '—' : `${classB.toLocaleString()} ops`,
              free: '10M free',
              billable: billableB > 0 ? `${billableB.toLocaleString()} × $0.36/M` : null,
              cost: costB,
            },
          ].map(({ label, detail, free, billable, cost }) => (
            <div key={label} className="bg-white/70 rounded-xl px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-zinc-700">{label}</p>
                <span className={`text-sm font-extrabold ${cost > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {loading ? '—' : cost > 0 ? `$${cost.toFixed(4)}` : '$0.00'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">{detail}</p>
              <p className="text-[10px] text-zinc-400">{free}</p>
              {billable && <p className="text-[10px] text-amber-500 font-semibold mt-0.5">{billable}</p>}
            </div>
          ))}
        </div>

        {isFree && !loading && (
          <p className="text-[11px] text-emerald-600 font-semibold text-center mt-3">
            You're fully within the free tier — no charges this month
          </p>
        )}
      </div>

      {/* ── Operation breakdown (collapsible) ── */}
      {(opsData?.raw?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden mb-6">
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
            onClick={() => setShowOps(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-teal-600" />
              <span className="text-sm font-bold text-zinc-800">Operation Breakdown — {month}</span>
              <span className="text-[10px] font-semibold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                {opsData.raw.length} types
              </span>
            </div>
            {showOps
              ? <ChevronUp size={16} className="text-zinc-400" />
              : <ChevronDown size={16} className="text-zinc-400" />}
          </button>

          {showOps && (
            <div className="border-t border-zinc-100 divide-y divide-zinc-50">
              {[...opsData.raw]
                .sort((a, b) => (b.sum?.requests ?? 0) - (a.sum?.requests ?? 0))
                .map((g) => {
                  const type = g.dimensions?.actionType ?? 'Unknown';
                  const count = g.sum?.requests ?? 0;
                  const isA = CLASS_A.has(type);
                  const isB = CLASS_B.has(type);
                  return (
                    <div key={type} className="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50/60 transition-colors">
                      <span className={`text-[9px] font-extrabold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${isA ? 'bg-orange-100 text-orange-600'
                          : isB ? 'bg-blue-100 text-blue-600'
                            : 'bg-zinc-100 text-zinc-400'
                        }`}>
                        {isA ? 'A' : isB ? 'B' : '—'}
                      </span>
                      <span className="text-sm text-zinc-700 font-medium flex-1 truncate">{type}</span>
                      <span className="text-sm font-bold text-zinc-900 tabular-nums">{count.toLocaleString()}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}


    </DashboardLayout>
  );
}

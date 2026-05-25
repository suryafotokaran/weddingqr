import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  HardDrive, Database, RefreshCw, AlertCircle,
  ArrowUp, ArrowDown, Activity, Zap,
} from 'lucide-react';

// Extract Cloudflare account ID from the R2 endpoint URL
// e.g. https://ACCOUNT_ID.r2.cloudflarestorage.com
function getAccountId() {
  const endpoint = import.meta.env.VITE_R2_ENDPOINT ?? '';
  const match = endpoint.match(/https:\/\/([a-f0-9]+)\.r2\.cloudflarestorage\.com/);
  return match ? match[1] : null;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

// Cloudflare R2 Class A: write/mutate operations (1M free/month)
const CLASS_A_OPS = new Set([
  'ListBuckets', 'PutBucket', 'ListObjects', 'ListObjectsV2',
  'PutObject', 'CopyObject', 'DeleteObject', 'DeleteObjects',
  'CompleteMultipartUpload', 'CreateMultipartUpload', 'UploadPart',
  'UploadPartCopy', 'AbortMultipartUpload', 'ListMultipartUploads', 'ListParts',
  'PutBucketEncryption', 'GetBucketEncryption',
  'PutBucketCors', 'GetBucketCors',
  'PutBucketLifecycleConfiguration', 'GetBucketLifecycleConfiguration',
  'GetBucketVersioning', 'PutBucketVersioning',
]);

// Cloudflare R2 Class B: read operations (10M free/month)
const CLASS_B_OPS = new Set([
  'GetObject', 'HeadObject', 'HeadBucket', 'UsageSummary', 'GetBucketUsage',
]);

const FREE_STORAGE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
const FREE_CLASS_A       = 1_000_000;
const FREE_CLASS_B       = 10_000_000;

export default function R2Storage() {
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [opsData,     setOpsData]     = useState(null);

  const accountId = getAccountId();
  const apiToken  = import.meta.env.VITE_CF_API_TOKEN;
  const bucketName = import.meta.env.VITE_R2_BUCKET ?? 'foto-select';

  async function fetchMetrics() {
    if (!apiToken) {
      setError('VITE_CF_API_TOKEN is not set in .env.local');
      setLoading(false);
      return;
    }
    if (!accountId) {
      setError('Could not determine Cloudflare Account ID from VITE_R2_ENDPOINT');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const now          = new Date();
    const today        = now.toISOString().split('T')[0];                          // "YYYY-MM-DD"
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                           .toISOString().replace(/\.\d+Z$/, 'Z');                // "YYYY-MM-01T00:00:00Z"
    const endOfDay     = `${today}T23:59:59Z`;

    // Inline datetime values — avoids Cloudflare's strict Time scalar variable validation
    const query = `
      query R2Metrics($accountId: String!, $bucketName: String!) {
        viewer {
          accounts(filter: { accountTag: $accountId }) {
            r2StorageAdaptiveGroups(
              filter: { bucketName: $bucketName, date: "${today}" }
              limit: 1
            ) {
              max {
                payloadSize
                metadataSize
                objectCount
                uploadCount
              }
            }
            r2OperationsAdaptiveGroups(
              filter: {
                bucketName: $bucketName
                datetime_geq: "${startOfMonth}"
                datetime_leq: "${endOfDay}"
              }
              limit: 10000
            ) {
              dimensions {
                actionType
              }
              sum {
                requests
              }
            }
          }
        }
      }
    `;

    try {
      const res = await fetch('/cf-graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          query,
          variables: { accountId, bucketName },
        }),
      });

      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`); }

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${json?.errors?.[0]?.message ?? text.slice(0, 200)}`);
      if (json.errors) throw new Error(json.errors.map(e => e.message).join(' | '));

      const account       = json.data?.viewer?.accounts?.[0];
      const storageGroups = account?.r2StorageAdaptiveGroups ?? [];
      const opsGroups     = account?.r2OperationsAdaptiveGroups ?? [];

      setStorageData(storageGroups[0]?.max ?? { payloadSize: 0, metadataSize: 0, objectCount: 0 });

      let classA = 0, classB = 0;
      for (const g of opsGroups) {
        const type  = g.dimensions?.actionType;
        const count = g.sum?.requests ?? 0;
        if (CLASS_A_OPS.has(type))      classA += count;
        else if (CLASS_B_OPS.has(type)) classB += count;
      }

      setOpsData({
        classA,
        classB,
        total: classA + classB,
        raw: opsGroups,
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch R2 metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMetrics(); }, []);

  const storageBytes   = storageData?.payloadSize ?? 0;
  const uploadCount    = storageData?.uploadCount ?? 0;
  const storagePercent = Math.min(100, (storageBytes  / FREE_STORAGE_BYTES) * 100);
  const classAPercent  = Math.min(100, ((opsData?.classA ?? 0) / FREE_CLASS_A) * 100);
  const classBPercent  = Math.min(100, ((opsData?.classB ?? 0) / FREE_CLASS_B) * 100);

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <DashboardLayout>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-teal-600 font-semibold tracking-widest text-[10px] uppercase mb-1.5">Infrastructure</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">R2 Storage</h1>
          <p className="text-sm text-zinc-400 mt-1 font-medium">
            Cloudflare R2 · <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded-md">{bucketName}</code> · {monthName}
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold shadow-md hover:bg-teal-800 active:scale-95 transition-all shrink-0 disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Cannot load R2 metrics</p>
            <p className="text-xs text-red-500 mt-0.5">{error}</p>
            {!apiToken && (
              <p className="text-xs text-red-400 mt-2">
                Add <code className="bg-red-100 px-1 py-0.5 rounded text-[11px]">VITE_CF_API_TOKEN=your_token</code> to{' '}
                <code className="bg-red-100 px-1 py-0.5 rounded text-[11px]">client/.env.local</code> and restart the dev server.
              </p>
            )}
            {error?.includes('403') && (
              <p className="text-xs text-red-400 mt-2">
                Token may be missing <strong>Account Analytics: Read</strong> permission. Go to Cloudflare → My Profile → API Tokens and verify the token scope includes Account Analytics.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Actual Size Now',
            value: loading ? '—' : formatBytes(storageBytes),
            sub:   'Current files in bucket (not billing)',
            icon:  HardDrive,
          },
          {
            label: 'Objects Stored',
            value: loading ? '—' : formatNumber(storageData?.objectCount ?? 0),
            sub:   'Files in bucket',
            icon:  Database,
          },
          {
            label: 'Class A Ops',
            value: loading ? '—' : formatNumber(opsData?.classA ?? 0),
            sub:   `${classAPercent.toFixed(1)}% of 1M free`,
            icon:  ArrowUp,
          },
          {
            label: 'Class B Ops',
            value: loading ? '—' : formatNumber(opsData?.classB ?? 0),
            sub:   `${classBPercent.toFixed(1)}% of 10M free`,
            icon:  ArrowDown,
          },
        ].map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-zinc-100 px-5 py-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
              <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                <Icon size={14} className="text-teal-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-zinc-900 tracking-tight leading-none">{value}</p>
            <p className="text-[11px] text-zinc-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Storage bar */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4 mb-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
          <HardDrive size={16} className="text-teal-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-zinc-600">
              {formatBytes(storageBytes)}{' '}
              <span className="text-zinc-400">current size · Cloudflare bills GB-months (avg over month)</span>
            </p>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${storagePercent > 90 ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-700'}`}>
              {storagePercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${storagePercent > 90 ? 'bg-red-500' : 'bg-teal-600'}`}
              style={{ width: `${Math.max(storagePercent, 0.4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Class A bar */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4 mb-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
          <ArrowUp size={16} className="text-orange-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-zinc-600">
              Class A Operations{' '}
              <span className="text-zinc-400 font-normal text-xs">
                (writes &amp; lists · {formatNumber(opsData?.classA ?? 0)} this month)
              </span>
            </p>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${classAPercent > 80 ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
              {classAPercent.toFixed(2)}% of 1M free
            </span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${classAPercent > 80 ? 'bg-red-500' : 'bg-orange-400'}`}
              style={{ width: `${Math.max(classAPercent, 0.4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Class B bar */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4 mb-6 flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <ArrowDown size={16} className="text-blue-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-zinc-600">
              Class B Operations{' '}
              <span className="text-zinc-400 font-normal text-xs">
                (reads · {formatNumber(opsData?.classB ?? 0)} this month)
              </span>
            </p>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${classBPercent > 80 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
              {classBPercent.toFixed(2)}% of 10M free
            </span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${classBPercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.max(classBPercent, 0.4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Per-operation breakdown */}
      {opsData?.raw?.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-zinc-50 flex items-center gap-2">
            <Activity size={16} className="text-teal-600" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Operation Breakdown — {monthName}
            </h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {[...opsData.raw]
              .sort((a, b) => (b.sum?.requests ?? 0) - (a.sum?.requests ?? 0))
              .map((g) => {
                const type    = g.dimensions?.actionType ?? 'Unknown';
                const count   = g.sum?.requests ?? 0;
                const isClassA = CLASS_A_OPS.has(type);
                const isClassB = CLASS_B_OPS.has(type);
                return (
                  <div key={type} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50/50 transition-colors">
                    <span className={`text-[10px] font-bold w-6 text-center px-1.5 py-0.5 rounded-full ${
                      isClassA ? 'bg-orange-50 text-orange-600' :
                      isClassB ? 'bg-blue-50 text-blue-600'   :
                      'bg-zinc-100 text-zinc-400'
                    }`}>
                      {isClassA ? 'A' : isClassB ? 'B' : '—'}
                    </span>
                    <span className="text-sm text-zinc-700 font-medium flex-1">{type}</span>
                    <span className="text-sm font-bold text-zinc-900 tabular-nums">
                      {count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Free-tier info callout */}
      <div className="bg-teal-50 rounded-2xl border border-teal-100 px-5 py-4 mb-6">
        <div className="flex items-start gap-3">
          <Zap size={16} className="text-teal-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-teal-800">Cloudflare R2 Free Tier — What actually gets billed</p>
            <p className="text-xs text-teal-600 mt-1">
              Storage billing = <strong>GB-months</strong> (daily average over month) · Free: 10 GB-months · Paid: $0.015/GB-month
            </p>
            <p className="text-xs text-teal-500 mt-1">
              Example: 1.3 GB stored for 3 of 30 days = 0.13 GB-months billed · Class A: free up to 1M/month · Class B: free up to 10M/month
            </p>
          </div>
        </div>
      </div>

      <footer className="py-5 border-t border-zinc-100 text-center">
        <p className="text-xs text-zinc-300 font-medium">© 2025 WeddingQR · Cloudflare R2 Storage Analytics</p>
      </footer>

    </DashboardLayout>
  );
}

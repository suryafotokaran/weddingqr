import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import { uploadToR2, buildR2RefUrl, deleteFromR2, getSignedUrlForPath } from '../lib/s3';

async function signItems(items, pathField = 'storage_path') {
  return Promise.all(items.map(async item => {
    const path = item[pathField];
    if (!path) return item;
    try { return { ...item, url: await getSignedUrlForPath(path) }; }
    catch { return item; }
  }));
}
import imageCompression from 'browser-image-compression';
import {
  Save, Plus, Trash2, Globe, MessageSquare, Wrench, Phone, FileText, Info, Image, Upload, X, Link, Copy, Check, Star,
} from 'lucide-react';

const COMPRESS_OPTS = { maxSizeMB: 0.5, maxWidthOrHeight: 2400, useWebWorker: true };

// ── Shared UI helpers ──────────────────────────────────────────────────────────

const Field = ({ label, value, onChange, textarea = false, placeholder = '' }) => (
  <div className="mb-5">
    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
      {label}
    </label>
    {textarea ? (
      <textarea
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none bg-zinc-50"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-zinc-50"
      />
    )}
  </div>
);

const SaveBtn = ({ onClick, saving }) => (
  <button
    onClick={onClick}
    disabled={saving}
    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
    style={{ background: 'linear-gradient(135deg,#00685f,#008378)' }}
  >
    <Save size={15} />
    {saving ? 'Saving…' : 'Save Changes'}
  </button>
);

// ── Top-level components (hooks used here, NOT inside render) ─────────────────

const ImgUploadBtn = ({ label, uploading, phase, onFiles, multiple = true, quotaFull = false, storageLoaded = true }) => {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);

  const blocked   = quotaFull || !storageLoaded;
  const isLoading = !!uploading;
  const statusLabel = phase === 'compressing' ? 'Compressing…' : 'Uploading…';

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    if (isLoading || blocked) return;
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onFiles(multiple ? files : [files[0]]);
  };
  const handleDragOver  = (e) => { e.preventDefault(); if (!isLoading && !blocked) setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  return (
    <>
      <input
        ref={ref} type="file" accept="image/*" className="hidden" multiple={multiple}
        onChange={e => { if (blocked) return; const files = Array.from(e.target.files); if (files.length) onFiles(files); e.target.value = ''; }}
      />
      <div
        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
        onClick={() => !isLoading && !blocked && ref.current.click()}
        className={`mt-2 flex flex-col items-center justify-center gap-2 w-full py-7 rounded-2xl border-2 border-dashed transition-all select-none
          ${blocked ? 'border-zinc-200 bg-zinc-50 cursor-not-allowed opacity-60' :
            isLoading ? 'opacity-60 cursor-not-allowed border-zinc-200 bg-zinc-50' :
            dragging ? 'border-teal-400 bg-teal-50 scale-[1.01] cursor-pointer' :
            'border-zinc-300 bg-zinc-50 hover:border-teal-400 hover:bg-teal-50 cursor-pointer'}`}
      >
        {isLoading ? (
          <>
            <div className="w-7 h-7 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-teal-600">{statusLabel}</span>
          </>
        ) : (
          <>
            <Upload size={22} className={dragging ? 'text-teal-500' : 'text-zinc-400'} />
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-600">
                {quotaFull ? 'Quota reached — upgrade to upload more' : dragging ? 'Drop to upload' : `Drag & drop ${label.toLowerCase()} here`}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">or click to browse · JPG, PNG, WEBP, BMP, SVG, AVIF</p>
            </div>
          </>
        )}
      </div>
    </>
  );
};

const CoverRow = ({ portfolio, uploading, phase, onCoverFiles, onDelete, onRename, quotaFull = false }) => {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(portfolio.name);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (uploading || quotaFull) return;
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
    if (file) onCoverFiles([file]);
  };

  const commitRename = () => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== portfolio.name) onRename(portfolio.id, trimmed);
    setEditing(false);
  };

  return (
    <div
      className={`flex items-center gap-4 border-2 rounded-2xl p-4 transition-all ${dragging ? 'border-teal-400 bg-teal-50' : 'border-zinc-200 bg-zinc-50'}`}
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); if (!uploading && !quotaFull) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
    >
      <div
        className={`w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative group border-2 transition-all ${quotaFull ? 'cursor-not-allowed opacity-60 border-transparent' : 'cursor-pointer ' + (dragging ? 'border-teal-400 scale-105' : 'border-transparent')}`}
        onClick={() => !uploading && !quotaFull && ref.current.click()}
        title={quotaFull ? 'Storage full' : 'Click or drag to change cover'}
      >
        {portfolio.cover_url
          ? <img src={portfolio.cover_url} alt={portfolio.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center bg-zinc-200 text-zinc-400"><Image size={24} /></div>}
        <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <Upload size={16} className="text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2 mb-1">
            <input
              ref={inputRef}
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setNameVal(portfolio.name); setEditing(false); } }}
              onBlur={commitRename}
              className="flex-1 px-2 py-1 rounded-lg border border-teal-400 text-sm font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm font-semibold text-zinc-800 truncate">{portfolio.name}</p>
            <button
              onClick={() => { setNameVal(portfolio.name); setEditing(true); }}
              className="flex-shrink-0 p-0.5 rounded text-zinc-400 hover:text-teal-600 transition-colors"
              title="Rename"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        )}
        <p className="text-xs text-zinc-400 mb-2">{portfolio.photos?.length ?? 0} photos</p>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { if (quotaFull) return; if (e.target.files[0]) onCoverFiles([e.target.files[0]]); e.target.value = ''; }}
        />
        <button
          disabled={!!uploading || quotaFull}
          onClick={() => !quotaFull && ref.current.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-700 border border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-50"
        >
          <Upload size={12} />
          {uploading ? (phase === 'compressing' ? 'Compressing…' : 'Uploading…') : 'Change Cover'}
        </button>
        {dragging && <p className="text-xs text-teal-600 font-medium mt-1">Drop to set cover</p>}
      </div>
      <button
        onClick={() => onDelete(portfolio.id)}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        title="Delete portfolio"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

const MAX_DELETE = 500;
const SelectableImgGrid = ({ images, selectedIds, onToggleSelect, onSelectAll, onDeleteSelected, onDeleteSingle }) => {
  if (images.length === 0) return <p className="text-sm text-zinc-400 italic py-4">No photos yet.</p>;
  const allSelected = images.length <= MAX_DELETE
    ? images.length > 0 && selectedIds.size === images.length
    : selectedIds.size >= MAX_DELETE;
  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => onSelectAll(images)}
            className="w-4 h-4 accent-teal-600 cursor-pointer"
          />
          {allSelected ? 'Deselect All' : `Select All (${images.length})`}
        </label>
        {images.length > MAX_DELETE && !allSelected && (
          <span className="text-[11px] text-orange-500 font-semibold">Max 500 at a time</span>
        )}
        {selectedIds.size > 0 && (
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm"
          >
            <Trash2 size={12} />
            Delete Selected ({selectedIds.size})
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
        {images.map(img => {
          const isSelected = selectedIds.has(img.id);
          return (
            <div
              key={img.id}
              className={`relative group rounded-xl overflow-hidden aspect-square bg-zinc-100 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-teal-500' : ''}`}
              onClick={() => onToggleSelect(img.id)}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-teal-500 border-teal-500' : 'bg-white/70 border-white/80 opacity-0 group-hover:opacity-100'}`}>
                {isSelected && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); onDeleteSingle(img); }}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProgressToast = ({ progress }) => {
  if (!progress.phase) return null;
  const isDelete = progress.phase === 'deleting';
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 100;
  const phaseLabel = progress.phase === 'compressing' ? 'Compressing' : progress.phase === 'uploading' ? 'Uploading' : 'Deleting';
  const barColor = progress.phase === 'compressing'
    ? 'linear-gradient(90deg,#f59e0b,#f97316)'
    : progress.phase === 'uploading'
    ? 'linear-gradient(90deg,#00685f,#008378)'
    : 'linear-gradient(90deg,#ef4444,#dc2626)';
  return (
    <div className="fixed bottom-6 right-6 z-[9999] bg-white rounded-2xl shadow-2xl border border-zinc-100 p-4 w-72 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-zinc-800">{phaseLabel}…</span>
        {!isDelete && (
          <span className="text-xs font-bold text-teal-600">{progress.current} / {progress.total}</span>
        )}
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      {!isDelete && (
        <p className="text-xs text-zinc-400 mt-1.5 text-right">{pct}%</p>
      )}
    </div>
  );
};

// ── Portfolio detail view (manage photos for one portfolio) ───────────────────

const PortfolioDetail = ({
  portfolio,
  portfolioPhotos,
  photoUploading,
  phase,
  onUploadPhoto,
  onDeletePhoto,
  onBack,
  selectedPhotoIds,
  onTogglePhotoSelect,
  onSelectAllPhotos,
  onDeletePortfolioPhotosSelected,
  quotaFull,
  storageLoaded,
}) => {
  const photos = portfolioPhotos.filter(p => p.portfolio_id === portfolio.id);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 mb-6 transition-colors"
      >
        ← Back to Portfolios
      </button>
      <h3 className="text-base font-bold text-zinc-800 mb-1">{portfolio.name}</h3>
      <p className="text-xs text-zinc-400 mb-4">{photos.length} photos</p>
      <SelectableImgGrid
        images={photos}
        selectedIds={selectedPhotoIds}
        onToggleSelect={onTogglePhotoSelect}
        onSelectAll={onSelectAllPhotos}
        onDeleteSelected={() => onDeletePortfolioPhotosSelected([...selectedPhotoIds], portfolio.id)}
        onDeleteSingle={onDeletePhoto}
      />
      <ImgUploadBtn
        label="Photos"
        uploading={photoUploading === `portfolio-${portfolio.id}`}
        phase={phase}
        onFiles={files => onUploadPhoto(files, portfolio.id)}
        quotaFull={quotaFull}
        storageLoaded={storageLoaded}
      />
    </div>
  );
};

// ── Sub-tab definitions ───────────────────────────────────────────────────────

const PHOTO_TABS = [
  { id: 'desktop',   label: 'Desktop Banner' },
  { id: 'mobile',    label: 'Mobile Banner'  },
  { id: 'portfolio', label: 'Portfolio'      },
  { id: 'gallery',   label: 'Gallery'        },
];

// ── PhotosPanel — top-level component ────────────────────────────────────────

const PhotosPanel = ({
  desktopBanners,
  mobileBanners,
  portfolios,
  portfolioPhotos,
  galleryPhotos,
  photoSubTab,
  setPhotoSubTab,
  photoUploading,
  phase,
  newPortfolioName,
  setNewPortfolioName,
  selectedPortfolio,
  setSelectedPortfolio,
  selectedPhotoIds,
  onTogglePhotoSelect,
  onSelectAllPhotos,
  onClearSelection,
  onDeleteDesktopSelected,
  onDeleteMobileSelected,
  onDeleteGallerySelected,
  onDeletePortfolioPhotosSelected,
  onUploadBanner,
  onDeleteBanner,
  onUploadPortfolioCover,
  onDeletePortfolio,
  onRenamePortfolio,
  onUploadPortfolioPhoto,
  onDeletePortfolioPhoto,
  onAddPortfolio,
  onUploadGallery,
  onDeleteGallery,
  quotaFull = false,
  storageLoaded = true,
}) => {
  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-900 mb-5">Photos</h2>

      {/* Sub-tab bar */}
      <div className="flex gap-1 mb-6 bg-zinc-100 p-1 rounded-xl w-fit flex-wrap">
        {PHOTO_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setPhotoSubTab(t.id); setSelectedPortfolio(null); onClearSelection(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              photoSubTab === t.id
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Desktop Banner */}
      {photoSubTab === 'desktop' && (
        <div>
          <p className="text-xs text-zinc-400 mb-3">These images appear in the homepage slideshow on desktop.</p>
          <SelectableImgGrid
            images={desktopBanners}
            selectedIds={selectedPhotoIds}
            onToggleSelect={onTogglePhotoSelect}
            onSelectAll={onSelectAllPhotos}
            onDeleteSelected={() => onDeleteDesktopSelected([...selectedPhotoIds])}
            onDeleteSingle={onDeleteBanner}
          />
          <ImgUploadBtn
            label="Photos"
            uploading={photoUploading === 'desktop'}
            phase={phase}
            onFiles={files => onUploadBanner(files, 'desktop')}
            quotaFull={quotaFull}
            storageLoaded={storageLoaded}
          />
        </div>
      )}

      {/* Mobile Banner */}
      {photoSubTab === 'mobile' && (
        <div>
          <p className="text-xs text-zinc-400 mb-3">These images appear in the homepage banner on mobile devices.</p>
          <SelectableImgGrid
            images={mobileBanners}
            selectedIds={selectedPhotoIds}
            onToggleSelect={onTogglePhotoSelect}
            onSelectAll={onSelectAllPhotos}
            onDeleteSelected={() => onDeleteMobileSelected([...selectedPhotoIds])}
            onDeleteSingle={onDeleteBanner}
          />
          <ImgUploadBtn
            label="Photos"
            uploading={photoUploading === 'mobile'}
            phase={phase}
            onFiles={files => onUploadBanner(files, 'mobile')}
            quotaFull={quotaFull}
            storageLoaded={storageLoaded}
          />
        </div>
      )}

      {/* Portfolio */}
      {photoSubTab === 'portfolio' && !selectedPortfolio && (
        <div>
          <p className="text-xs text-zinc-400 mb-4">Manage portfolio categories. Click "Manage" to add/remove photos and update the cover image.</p>
          <div className="space-y-4 mb-6">
            {portfolios.length === 0 && (
              <p className="text-sm text-zinc-400 italic">No portfolios yet. Add one below.</p>
            )}
            {portfolios.map(p => (
              <div key={p.id} className="border border-zinc-200 rounded-2xl bg-zinc-50 overflow-hidden">
                <CoverRow
                  portfolio={p}
                  uploading={photoUploading === `cover-${p.id}`}
                  phase={phase}
                  onCoverFiles={files => onUploadPortfolioCover(files, p.id)}
                  onDelete={onDeletePortfolio}
                  onRename={onRenamePortfolio}
                  quotaFull={quotaFull}
                />
                <div className="px-4 pb-4">
                  <button
                    onClick={() => { setSelectedPortfolio(p); onClearSelection(); }}
                    className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold text-teal-700 border border-teal-200 hover:bg-teal-50 transition-colors"
                  >
                    Manage Photos ({p.photos?.length ?? 0})
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Add new portfolio */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newPortfolioName}
              onChange={e => setNewPortfolioName(e.target.value)}
              placeholder="New portfolio name…"
              className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-zinc-50"
              onKeyDown={e => { if (e.key === 'Enter') onAddPortfolio(); }}
            />
            <button
              onClick={onAddPortfolio}
              disabled={!newPortfolioName.trim() || photoUploading === 'add-portfolio'}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#00685f,#008378)' }}
            >
              <Plus size={15} />
              Add
            </button>
          </div>
        </div>
      )}

      {/* Portfolio detail */}
      {photoSubTab === 'portfolio' && selectedPortfolio && (
        <PortfolioDetail
          portfolio={selectedPortfolio}
          portfolioPhotos={portfolioPhotos}
          photoUploading={photoUploading}
          phase={phase}
          onUploadPhoto={onUploadPortfolioPhoto}
          onDeletePhoto={onDeletePortfolioPhoto}
          onBack={() => { setSelectedPortfolio(null); onClearSelection(); }}
          selectedPhotoIds={selectedPhotoIds}
          onTogglePhotoSelect={onTogglePhotoSelect}
          onSelectAllPhotos={onSelectAllPhotos}
          onDeletePortfolioPhotosSelected={onDeletePortfolioPhotosSelected}
          quotaFull={quotaFull}
          storageLoaded={storageLoaded}
        />
      )}

      {/* Gallery */}
      {photoSubTab === 'gallery' && (
        <div>
          <p className="text-xs text-zinc-400 mb-4">
            Photos uploaded here appear in the Gallery and Instagram sections of the website.
          </p>
          <SelectableImgGrid
            images={galleryPhotos}
            selectedIds={selectedPhotoIds}
            onToggleSelect={onTogglePhotoSelect}
            onSelectAll={onSelectAllPhotos}
            onDeleteSelected={() => onDeleteGallerySelected([...selectedPhotoIds])}
            onDeleteSingle={onDeleteGallery}
          />
          <ImgUploadBtn
            label="Photos"
            uploading={photoUploading === 'gallery'}
            phase={phase}
            onFiles={onUploadGallery}
            quotaFull={quotaFull}
            storageLoaded={storageLoaded}
          />
        </div>
      )}
    </div>
  );
};

// ── Supabase upsert helper for site_content ───────────────────────────────────

async function upsertContent(rows) {
  const { error } = await supabase
    .from('site_content')
    .upsert(rows, { onConflict: 'section,key' });
  return error;
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────

const Bone = ({ className = '' }) => (
  <div className={`bg-zinc-200 rounded-xl animate-pulse ${className}`} />
);

const SkFieldRow = ({ wide = false }) => (
  <div className="mb-5">
    <Bone className="h-3 w-20 rounded mb-2" />
    <Bone className={wide ? 'h-20' : 'h-10'} />
  </div>
);

const SkeletonAbout = () => (
  <div>
    <Bone className="h-6 w-40 mb-6" />
    <SkFieldRow /><SkFieldRow wide /><SkFieldRow wide />
    <div className="flex justify-end mt-4"><Bone className="h-10 w-32" /></div>
  </div>
);

const SkeletonFields = ({ count = 4, wideIndexes = [] }) => (
  <div>
    <Bone className="h-6 w-52 mb-6" />
    {Array.from({ length: count }).map((_, i) => <SkFieldRow key={i} wide={wideIndexes.includes(i)} />)}
    <div className="flex justify-end mt-4"><Bone className="h-10 w-32" /></div>
  </div>
);

const SkeletonCards = ({ count = 2 }) => (
  <div>
    <Bone className="h-6 w-36 mb-6" />
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-zinc-100 rounded-2xl p-5 bg-zinc-50">
          <SkFieldRow /><SkFieldRow wide />
          <div className="flex justify-end gap-2 mt-2">
            <Bone className="h-9 w-20" /><Bone className="h-9 w-28" />
          </div>
        </div>
      ))}
    </div>
    <Bone className="h-12 w-full mt-4" />
  </div>
);

const SkeletonPhotos = () => (
  <div>
    <Bone className="h-6 w-24 mb-5" />
    <div className="flex gap-1 mb-6">
      {['Desktop Banner','Mobile Banner','Portfolio','Gallery'].map(t => (
        <Bone key={t} className="h-9 w-28" />
      ))}
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Bone key={i} className="aspect-square" />
      ))}
    </div>
    <Bone className="h-11 w-36" />
  </div>
);

const SECTION_SKELETON = {
  about:        <SkeletonAbout />,
  services:     <SkeletonCards count={2} />,
  testimonials: <SkeletonCards count={2} />,
  contact:      <SkeletonFields count={5} wideIndexes={[0]} />,
  footer:       <SkeletonFields count={3} wideIndexes={[1]} />,
  photos:       <SkeletonPhotos />,
};

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV = [
  { id: 'about',        label: 'About',           icon: Info         },
  { id: 'services',     label: 'Services',         icon: Wrench       },
  { id: 'testimonials', label: 'Reviews',           icon: MessageSquare},
  { id: 'contact',      label: 'Contact & Social', icon: Phone        },
  { id: 'footer',       label: 'Footer',           icon: FileText     },
  { id: 'photos',       label: 'Photos',           icon: Image        },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function WebsiteCMS() {
  const { section } = useParams();
  const navigate = useNavigate();
  const active = section || 'about';
  const setActive = (id) => navigate(`/admin/website-cms/${id}`);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState('');
  const [toast,       setToast]       = useState('');
  const [copiedLink,  setCopiedLink]  = useState(false);

  // Content sections
  const [about,        setAbout]        = useState({ title: '', description_1: '', description_2: '' });
  const [contact,      setContact]      = useState({ address: '', phone: '', email: '', whatsapp: '', maps_url: '' });
  const [social,       setSocial]       = useState({ facebook: '', instagram: '' });
  const [footer,       setFooter]       = useState({ business_name: '', stay_in_touch: '', copyright: '' });
  const [services,     setServices]     = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  // Photos section
  const [photoSubTab,       setPhotoSubTab]       = useState('desktop');
  const [desktopBanners,    setDesktopBanners]    = useState([]);
  const [mobileBanners,     setMobileBanners]     = useState([]);
  const [portfolios,        setPortfolios]        = useState([]);
  const [portfolioPhotos,   setPortfolioPhotos]   = useState([]);
  const [galleryPhotos,     setGalleryPhotos]     = useState([]);
  const [photoUploading,    setPhotoUploading]    = useState('');
  const [uploadProgress,    setUploadProgress]    = useState({ phase: '', current: 0, total: 0 });
  const [selectedPortfolio,  setSelectedPortfolio]  = useState(null);
  const [selectedPhotoIds,   setSelectedPhotoIds]   = useState(new Set());
  const clearProgress = () => setUploadProgress({ phase: '', current: 0, total: 0 });
  const [newPortfolioName,  setNewPortfolioName]  = useState('');
  const [userId,            setUserId]            = useState('');
  const [storageUsed,       setStorageUsed]       = useState(0);
  const [storageLoaded,     setStorageLoaded]     = useState(false);

  const GB10 = 10 * 1024 * 1024 * 1024;
  // Returns TOTAL storage across all sources and updates state.
  // Called before each batch upload to get a fresh running total.
  const refreshStorage = async (uid) => {
    if (!uid) return storageUsed; // fallback to current known value
    const [photoRes, bannersRes, portfoliosRes2, portPhotosRes2, galleryRes2, testimonialsRes2, wbRes] = await Promise.all([
      supabase.rpc('get_user_photo_storage', { p_user_id: uid }),
      supabase.from('site_banners').select('size_bytes'),
      supabase.from('site_portfolios').select('cover_size_bytes'),
      supabase.from('site_portfolio_photos').select('size_bytes'),
      supabase.from('site_gallery_photos').select('size_bytes'),
      supabase.from('site_testimonials').select('photos_size_bytes'),
      supabase.from('website_configs').select('gallery_size_bytes'),
    ]);
    const total =
      (photoRes.data ?? 0) +
      (bannersRes.data ?? []).reduce((s, b) => s + (b.size_bytes || 0), 0) +
      (portfoliosRes2.data ?? []).reduce((s, p) => s + (p.cover_size_bytes || 0), 0) +
      (portPhotosRes2.data ?? []).reduce((s, p) => s + (p.size_bytes || 0), 0) +
      (galleryRes2.data ?? []).reduce((s, g) => s + (g.size_bytes || 0), 0) +
      (testimonialsRes2.data ?? []).reduce((s, t) => s + (t.photos_size_bytes || 0), 0) +
      (wbRes.data ?? []).reduce((s, c) => s + (c.gallery_size_bytes || 0), 0);
    setStorageUsed(total);
    return total;
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (uid) setUserId(uid);

      const [
        contentRes,
        servicesRes,
        testimonialsRes,
        desktopRes,
        mobileRes,
        portfoliosRes,
        portfolioPhotosRes,
        galleryRes,
        photoStorageRes,
        wbConfigsRes,
      ] = await Promise.all([
        supabase.from('site_content').select('section,key,value'),
        supabase.from('site_services').select('*').order('display_order'),
        supabase.from('site_testimonials').select('*').order('display_order'),
        supabase.from('site_banners').select('*').eq('type', 'desktop').order('display_order'),
        supabase.from('site_banners').select('*').eq('type', 'mobile').order('display_order'),
        supabase.from('site_portfolios').select('*').order('display_order'),
        supabase.from('site_portfolio_photos').select('*').order('display_order'),
        supabase.from('site_gallery_photos').select('*').order('display_order'),
        uid ? supabase.rpc('get_user_photo_storage', { p_user_id: uid }) : Promise.resolve({ data: 0 }),
        supabase.from('website_configs').select('gallery_size_bytes'),
      ]);

      if (!contentRes.error && contentRes.data) {
        const m = {};
        contentRes.data.forEach(({ section, key, value }) => {
          if (!m[section]) m[section] = {};
          m[section][key] = value ?? '';
        });
        if (m.about)   setAbout(p   => ({ ...p, ...m.about }));
        if (m.contact) setContact(p => ({ ...p, ...m.contact }));
        if (m.social)  setSocial(p  => ({ ...p, ...m.social }));
        if (m.footer)  setFooter(p  => ({ ...p, ...m.footer }));
      }

      if (!servicesRes.error) setServices(servicesRes.data ?? []);
      if (!testimonialsRes.error) {
        const signed = await Promise.all((testimonialsRes.data ?? []).map(async t => {
          const rawPhotos = Array.isArray(t.photos) ? t.photos : [];
          if (rawPhotos.length === 0) return t;
          const signedPhotos = await Promise.all(rawPhotos.map(async p => {
            if (!p.storage_path) return p;
            try { return { ...p, url: await getSignedUrlForPath(p.storage_path) }; }
            catch { return p; }
          }));
          return { ...t, photos: signedPhotos };
        }));
        setTestimonials(signed);
      }

      const [signedDesktop, signedMobile, signedPortfolioPhotos, signedGallery] = await Promise.all([
        signItems(desktopRes.data ?? []),
        signItems(mobileRes.data ?? []),
        signItems(portfolioPhotosRes.data ?? []),
        signItems(galleryRes.data ?? []),
      ]);

      if (!desktopRes.error)         setDesktopBanners(signedDesktop);
      if (!mobileRes.error)          setMobileBanners(signedMobile);
      if (!portfolioPhotosRes.error) setPortfolioPhotos(signedPortfolioPhotos);
      if (!galleryRes.error)         setGalleryPhotos(signedGallery);

      if (!portfoliosRes.error && portfoliosRes.data) {
        const allPhotos = signedPortfolioPhotos;
        const photosByPortfolio = allPhotos.reduce((acc, p) => {
          if (!acc[p.portfolio_id]) acc[p.portfolio_id] = [];
          acc[p.portfolio_id].push(p);
          return acc;
        }, {});
        const signedPortfolios = await Promise.all(
          portfoliosRes.data.map(async p => {
            let cover_url = p.cover_url;
            if (p.cover_storage_path) {
              try { cover_url = await getSignedUrlForPath(p.cover_storage_path); } catch {}
            }
            return { ...p, cover_url, photos: photosByPortfolio[p.id] || [] };
          })
        );
        setPortfolios(signedPortfolios);
      }
      // ── Compute total storage across ALL sources (same as EventDetail/Studio) ──
      const photoStorage    = photoStorageRes.data ?? 0;
      const bannerStorage   = [...(desktopRes.data ?? []), ...(mobileRes.data ?? [])].reduce((s, b) => s + (b.size_bytes || 0), 0);
      const portCoverStorage = (portfoliosRes.data ?? []).reduce((s, p) => s + (p.cover_size_bytes || 0), 0);
      const portPhotosStorage = (portfolioPhotosRes.data ?? []).reduce((s, p) => s + (p.size_bytes || 0), 0);
      const galleryStorage  = (galleryRes.data ?? []).reduce((s, g) => s + (g.size_bytes || 0), 0);
      const testimonialsStorage = (testimonialsRes.data ?? []).reduce((s, t) => s + (t.photos_size_bytes || 0), 0);
      const wbStorage       = (wbConfigsRes.data ?? []).reduce((s, c) => s + (c.gallery_size_bytes || 0), 0);
      const totalStorage    = photoStorage + bannerStorage + portCoverStorage + portPhotosStorage + galleryStorage + testimonialsStorage + wbStorage;
      setStorageUsed(totalStorage);
      setStorageLoaded(true);

      setLoading(false);
    })();
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const upd = (setter) => (id, field, val) =>
    setter(prev => prev.map(x => x.id === id ? { ...x, [field]: val } : x));
  const updateService     = upd(setServices);
  const updateTestimonial = upd(setTestimonials);

  // ── Save handlers ─────────────────────────────────────────────────────────
  const saveAbout = async () => {
    setSaving('about');
    const err = await upsertContent([
      { section: 'about', key: 'title',         value: about.title },
      { section: 'about', key: 'description_1', value: about.description_1 },
      { section: 'about', key: 'description_2', value: about.description_2 },
    ]);
    setSaving(''); err ? showToast('Error saving') : showToast('About saved!');
  };

  const saveContact = async () => {
    setSaving('contact');
    const err = await upsertContent([
      { section: 'contact', key: 'address',  value: contact.address },
      { section: 'contact', key: 'phone',    value: contact.phone },
      { section: 'contact', key: 'email',    value: contact.email },
      { section: 'contact', key: 'whatsapp', value: contact.whatsapp },
      { section: 'contact', key: 'maps_url', value: contact.maps_url },
      { section: 'social',  key: 'facebook',  value: social.facebook },
      { section: 'social',  key: 'instagram', value: social.instagram },
    ]);
    setSaving(''); err ? showToast('Error saving') : showToast('Contact saved!');
  };

  const saveFooter = async () => {
    setSaving('footer');
    const err = await upsertContent([
      { section: 'footer', key: 'business_name', value: footer.business_name },
      { section: 'footer', key: 'stay_in_touch',  value: footer.stay_in_touch },
      { section: 'footer', key: 'copyright',      value: footer.copyright },
    ]);
    setSaving(''); err ? showToast('Error saving') : showToast('Footer saved!');
  };

  const saveService = async (svc) => {
    setSaving(`svc-${svc.id}`);
    if (String(svc.id).startsWith('new-')) {
      const { data, error } = await supabase
        .from('site_services')
        .insert({ title: svc.title, description: svc.description, display_order: svc.display_order ?? 0, active: true })
        .select()
        .single();
      if (!error) setServices(prev => prev.map(s => s.id === svc.id ? data : s));
      else showToast('Error saving service');
    } else {
      const { error } = await supabase
        .from('site_services')
        .update({ title: svc.title, description: svc.description, active: svc.active })
        .eq('id', svc.id);
      if (error) showToast('Error saving service');
    }
    setSaving(''); showToast('Service saved!');
  };

  const deleteService = async (id) => {
    if (String(id).startsWith('new-')) { setServices(p => p.filter(s => s.id !== id)); return; }
    await supabase.from('site_services').delete().eq('id', id);
    setServices(p => p.filter(s => s.id !== id));
    showToast('Deleted');
  };

  const saveTestimonial = async (t) => {
    setSaving(`test-${t.id}`);
    if (String(t.id).startsWith('new-')) {
      const { data, error } = await supabase
        .from('site_testimonials')
        .insert({ initial: t.initial, name: t.name, review: t.review, stars: t.stars || 5, display_order: t.display_order ?? 0, active: true })
        .select()
        .single();
      if (!error) setTestimonials(prev => prev.map(x => x.id === t.id ? data : x));
      else showToast('Error saving');
    } else {
      const { error } = await supabase
        .from('site_testimonials')
        .update({ initial: t.initial, name: t.name, review: t.review, stars: t.stars, active: t.active })
        .eq('id', t.id);
      if (error) showToast('Error saving');
    }
    setSaving(''); showToast('Testimonial saved!');
  };

  const deleteTestimonial = async (id) => {
    if (String(id).startsWith('new-')) { setTestimonials(p => p.filter(t => t.id !== id)); return; }
    await supabase.from('site_testimonials').delete().eq('id', id);
    setTestimonials(p => p.filter(t => t.id !== id));
    showToast('Deleted');
  };

  // ── Banner upload / delete ────────────────────────────────────────────────
  const onUploadBanner = async (files, type) => {
    setPhotoUploading(type);
    const total = files.length;
    let running = await refreshStorage(userId);
    let storageSkipped = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ phase: 'compressing', current: i + 1, total });
      try {
        const compressed = await imageCompression(file, COMPRESS_OPTS);
        if (running + compressed.size > GB10) { storageSkipped++; continue; }
        setUploadProgress({ phase: 'uploading', current: i + 1, total });
        const ext = file.name.split('.').pop();
        const storagePath = `site/banners/${type}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        await uploadToR2(compressed, storagePath);
        running += compressed.size;
        const refUrl = buildR2RefUrl(storagePath);
        const nextOrder = (type === 'desktop' ? desktopBanners : mobileBanners).length + i;
        const { data, error } = await supabase
          .from('site_banners')
          .insert({ type, url: refUrl, storage_path: storagePath, display_order: nextOrder, active: true, size_bytes: compressed.size })
          .select()
          .single();
        if (!error) {
          const displayUrl = await getSignedUrlForPath(storagePath).catch(() => refUrl);
          const displayItem = { ...data, url: displayUrl };
          if (type === 'desktop') setDesktopBanners(p => [...p, displayItem]);
          else setMobileBanners(p => [...p, displayItem]);
        } else {
          showToast('DB insert failed');
        }
      } catch (e) { showToast('Upload error'); console.error(e); }
    }
    const uploaded = files.length - storageSkipped;
    const skipMsg  = storageSkipped > 0 ? ` · ${storageSkipped} skipped (storage full)` : '';
    showToast(`${uploaded} photo${uploaded !== 1 ? 's' : ''} uploaded${skipMsg}`);
    setPhotoUploading('');
    clearProgress();
  };

  const onDeleteBanner = async (photo) => {
    setUploadProgress({ phase: 'deleting', current: 1, total: 1 });
    await supabase.from('site_banners').delete().eq('id', photo.id);
    if (photo.storage_path) await deleteFromR2([photo.storage_path]);
    if (photo.type === 'desktop') setDesktopBanners(p => p.filter(b => b.id !== photo.id));
    else                          setMobileBanners(p => p.filter(b => b.id !== photo.id));
    setSelectedPhotoIds(prev => { const n = new Set(prev); n.delete(photo.id); return n; });
    showToast('Deleted');
    setTimeout(clearProgress, 1000);
  };

  // ── Portfolio CRUD ────────────────────────────────────────────────────────
  const onAddPortfolio = async () => {
    const name = newPortfolioName.trim();
    if (!name) return;
    setPhotoUploading('add-portfolio');
    const { data, error } = await supabase
      .from('site_portfolios')
      .insert({ name, display_order: portfolios.length, active: true })
      .select()
      .single();
    if (!error) {
      setPortfolios(p => [...p, { ...data, photos: [] }]);
      setNewPortfolioName('');
      showToast('Portfolio created!');
    } else {
      showToast('Error creating portfolio');
    }
    setPhotoUploading('');
  };

  const onRenamePortfolio = async (portfolioId, newName) => {
    const { error } = await supabase.from('site_portfolios').update({ name: newName }).eq('id', portfolioId);
    if (!error) {
      setPortfolios(p => p.map(pt => pt.id === portfolioId ? { ...pt, name: newName } : pt));
      showToast('Portfolio renamed!');
    } else {
      showToast('Rename failed');
    }
  };

  const onDeletePortfolio = async (portfolioId) => {
    setUploadProgress({ phase: 'deleting', current: 1, total: 1 });
    // Cascade delete in DB handles site_portfolio_photos
    const portfolio = portfolios.find(p => p.id === portfolioId);
    if (portfolio) {
      // Delete all R2 assets for this portfolio
      const photoPaths = (portfolio.photos || []).map(p => p.storage_path).filter(Boolean);
      if (portfolio.cover_storage_path) photoPaths.push(portfolio.cover_storage_path);
      if (photoPaths.length) await deleteFromR2(photoPaths);
    }
    await supabase.from('site_portfolios').delete().eq('id', portfolioId);
    setPortfolios(p => p.filter(pt => pt.id !== portfolioId));
    setPortfolioPhotos(p => p.filter(ph => ph.portfolio_id !== portfolioId));
    if (selectedPortfolio?.id === portfolioId) setSelectedPortfolio(null);
    showToast('Portfolio deleted');
    setTimeout(clearProgress, 1000);
  };

  const onUploadPortfolioCover = async (files, portfolioId) => {
    const file = files[0];
    setPhotoUploading(`cover-${portfolioId}`);
    setUploadProgress({ phase: 'compressing', current: 1, total: 1 });
    try {
      // Delete old cover from R2 if exists
      const existing = portfolios.find(p => p.id === portfolioId);
      if (existing?.cover_storage_path) {
        await deleteFromR2([existing.cover_storage_path]).catch(() => {});
      }

      const compressed = await imageCompression(file, COMPRESS_OPTS);
      const currentUsed = await refreshStorage(userId);
      if (currentUsed + compressed.size > GB10) {
        showToast('Storage limit reached (10 GB). Cannot upload cover.');
        setPhotoUploading('');
        clearProgress();
        return;
      }
      setUploadProgress({ phase: 'uploading', current: 1, total: 1 });
      const ext = file.name.split('.').pop();
      const storagePath = `site/portfolio/${portfolioId}/cover_${Date.now()}.${ext}`;
      await uploadToR2(compressed, storagePath);
      const refUrl = buildR2RefUrl(storagePath);
      const { error } = await supabase
        .from('site_portfolios')
        .update({ cover_url: refUrl, cover_storage_path: storagePath, cover_size_bytes: compressed.size })
        .eq('id', portfolioId);
      if (!error) {
        const displayUrl = await getSignedUrlForPath(storagePath).catch(() => refUrl);
        setPortfolios(p => p.map(pt =>
          pt.id === portfolioId ? { ...pt, cover_url: displayUrl, cover_storage_path: storagePath } : pt
        ));
        showToast('Cover updated!');
      } else {
        showToast('Update failed');
      }
    } catch (e) { showToast('Upload error'); console.error(e); }
    setPhotoUploading('');
    clearProgress();
  };

  const onUploadPortfolioPhoto = async (files, portfolioId) => {
    setPhotoUploading(`portfolio-${portfolioId}`);
    const total = files.length;
    let running = await refreshStorage(userId);
    let storageSkipped = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ phase: 'compressing', current: i + 1, total });
      try {
        const compressed = await imageCompression(file, COMPRESS_OPTS);
        if (running + compressed.size > GB10) { storageSkipped++; continue; }
        setUploadProgress({ phase: 'uploading', current: i + 1, total });
        const ext = file.name.split('.').pop();
        const storagePath = `site/portfolio/${portfolioId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        await uploadToR2(compressed, storagePath);
        running += compressed.size;
        const refUrl = buildR2RefUrl(storagePath);
        const nextOrder = portfolioPhotos.filter(p => p.portfolio_id === portfolioId).length + i;
        const { data, error } = await supabase
          .from('site_portfolio_photos')
          .insert({ portfolio_id: portfolioId, url: refUrl, storage_path: storagePath, display_order: nextOrder, size_bytes: compressed.size })
          .select()
          .single();
        if (!error) {
          const displayUrl = await getSignedUrlForPath(storagePath).catch(() => refUrl);
          const displayItem = { ...data, url: displayUrl };
          setPortfolioPhotos(p => [...p, displayItem]);
          setPortfolios(p => p.map(pt =>
            pt.id === portfolioId
              ? { ...pt, photos: [...(pt.photos || []), displayItem] }
              : pt
          ));
        } else {
          showToast('DB insert failed');
        }
      } catch (e) { showToast('Upload error'); console.error(e); }
    }
    const uploaded = files.length - storageSkipped;
    const skipMsg  = storageSkipped > 0 ? ` · ${storageSkipped} skipped (storage full)` : '';
    showToast(`${uploaded} photo${uploaded !== 1 ? 's' : ''} uploaded${skipMsg}`);
    setPhotoUploading('');
    clearProgress();
  };

  const onDeletePortfolioPhoto = async (photo) => {
    setUploadProgress({ phase: 'deleting', current: 1, total: 1 });
    await supabase.from('site_portfolio_photos').delete().eq('id', photo.id);
    if (photo.storage_path) await deleteFromR2([photo.storage_path]);
    setPortfolioPhotos(p => p.filter(ph => ph.id !== photo.id));
    setPortfolios(p => p.map(pt =>
      pt.id === photo.portfolio_id
        ? { ...pt, photos: (pt.photos || []).filter(ph => ph.id !== photo.id) }
        : pt
    ));
    setSelectedPhotoIds(prev => { const n = new Set(prev); n.delete(photo.id); return n; });
    showToast('Deleted');
    setTimeout(clearProgress, 1000);
  };

  // ── Gallery upload / delete ───────────────────────────────────────────────
  const onUploadGallery = async (files) => {
    setPhotoUploading('gallery');
    const total = files.length;
    let running = await refreshStorage(userId);
    let storageSkipped = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ phase: 'compressing', current: i + 1, total });
      try {
        const compressed = await imageCompression(file, COMPRESS_OPTS);
        if (running + compressed.size > GB10) { storageSkipped++; continue; }
        setUploadProgress({ phase: 'uploading', current: i + 1, total });
        const ext = file.name.split('.').pop();
        const storagePath = `site/gallery/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        await uploadToR2(compressed, storagePath);
        running += compressed.size;
        const refUrl = buildR2RefUrl(storagePath);
        const { data, error } = await supabase
          .from('site_gallery_photos')
          .insert({ url: refUrl, storage_path: storagePath, display_order: galleryPhotos.length + i, active: true, size_bytes: compressed.size })
          .select()
          .single();
        if (!error) {
          const displayUrl = await getSignedUrlForPath(storagePath).catch(() => refUrl);
          setGalleryPhotos(p => [...p, { ...data, url: displayUrl }]);
        } else showToast('DB insert failed');
      } catch (e) { showToast('Upload error'); console.error(e); }
    }
    const uploaded = files.length - storageSkipped;
    const skipMsg  = storageSkipped > 0 ? ` · ${storageSkipped} skipped (storage full)` : '';
    showToast(`${uploaded} photo${uploaded !== 1 ? 's' : ''} uploaded${skipMsg}`);
    setPhotoUploading('');
    clearProgress();
  };

  const onDeleteGallery = async (photo) => {
    setUploadProgress({ phase: 'deleting', current: 1, total: 1 });
    await supabase.from('site_gallery_photos').delete().eq('id', photo.id);
    if (photo.storage_path) await deleteFromR2([photo.storage_path]);
    setGalleryPhotos(p => p.filter(g => g.id !== photo.id));
    setSelectedPhotoIds(prev => { const n = new Set(prev); n.delete(photo.id); return n; });
    showToast('Deleted');
    setTimeout(clearProgress, 1000);
  };

  // ── Shared selection helpers ───────────────────────────────────────────────
  const onTogglePhotoSelect = (id) =>
    setSelectedPhotoIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const MAX_DELETE = 500;
  const onSelectAllPhotos = (images) => {
    const isMaxSelected = images.length <= MAX_DELETE
      ? images.every(i => selectedPhotoIds.has(i.id))
      : selectedPhotoIds.size >= MAX_DELETE;
    if (isMaxSelected) {
      setSelectedPhotoIds(new Set());
    } else if (images.length > MAX_DELETE) {
      setSelectedPhotoIds(new Set(images.slice(0, MAX_DELETE).map(i => i.id)));
    } else {
      setSelectedPhotoIds(new Set(images.map(i => i.id)));
    }
  };

  const onClearSelection = () => setSelectedPhotoIds(new Set());

  // ── Bulk delete handlers ───────────────────────────────────────────────────
  const onDeleteGallerySelected = async (ids) => {
    if (!ids.length) return;
    setUploadProgress({ phase: 'deleting', current: 1, total: 1 });
    const paths = galleryPhotos.filter(g => ids.includes(g.id)).map(g => g.storage_path).filter(Boolean);
    await supabase.from('site_gallery_photos').delete().in('id', ids);
    if (paths.length) await deleteFromR2(paths);
    setGalleryPhotos(p => p.filter(g => !ids.includes(g.id)));
    setSelectedPhotoIds(new Set());
    showToast(`${ids.length} photo${ids.length > 1 ? 's' : ''} deleted`);
    setTimeout(clearProgress, 1000);
  };

  const onDeleteDesktopSelected = async (ids) => {
    if (!ids.length) return;
    setUploadProgress({ phase: 'deleting', current: 1, total: 1 });
    const paths = desktopBanners.filter(b => ids.includes(b.id)).map(b => b.storage_path).filter(Boolean);
    await supabase.from('site_banners').delete().in('id', ids);
    if (paths.length) await deleteFromR2(paths);
    setDesktopBanners(p => p.filter(b => !ids.includes(b.id)));
    setSelectedPhotoIds(new Set());
    showToast(`${ids.length} photo${ids.length > 1 ? 's' : ''} deleted`);
    setTimeout(clearProgress, 1000);
  };

  const onDeleteMobileSelected = async (ids) => {
    if (!ids.length) return;
    setUploadProgress({ phase: 'deleting', current: 1, total: 1 });
    const paths = mobileBanners.filter(b => ids.includes(b.id)).map(b => b.storage_path).filter(Boolean);
    await supabase.from('site_banners').delete().in('id', ids);
    if (paths.length) await deleteFromR2(paths);
    setMobileBanners(p => p.filter(b => !ids.includes(b.id)));
    setSelectedPhotoIds(new Set());
    showToast(`${ids.length} photo${ids.length > 1 ? 's' : ''} deleted`);
    setTimeout(clearProgress, 1000);
  };

  const onDeletePortfolioPhotosSelected = async (ids, portfolioId) => {
    if (!ids.length) return;
    setUploadProgress({ phase: 'deleting', current: 1, total: 1 });
    const paths = portfolioPhotos.filter(p => ids.includes(p.id)).map(p => p.storage_path).filter(Boolean);
    await supabase.from('site_portfolio_photos').delete().in('id', ids);
    if (paths.length) await deleteFromR2(paths);
    setPortfolioPhotos(p => p.filter(ph => !ids.includes(ph.id)));
    setPortfolios(p => p.map(pt =>
      pt.id === portfolioId
        ? { ...pt, photos: (pt.photos || []).filter(ph => !ids.includes(ph.id)) }
        : pt
    ));
    setSelectedPhotoIds(new Set());
    showToast(`${ids.length} photo${ids.length > 1 ? 's' : ''} deleted`);
    setTimeout(clearProgress, 1000);
  };

  // ── Panel content (no hooks inside these — safe as JSX values) ───────────
  const panels = {
    about: (
      <div>
        <h2 className="text-lg font-bold text-zinc-900 mb-6">About Section</h2>
        <Field label="Title" value={about.title} onChange={v => setAbout(a => ({ ...a, title: v }))} />
        <Field label="First Paragraph" value={about.description_1} onChange={v => setAbout(a => ({ ...a, description_1: v }))} textarea />
        <Field label="Second Paragraph" value={about.description_2} onChange={v => setAbout(a => ({ ...a, description_2: v }))} textarea />
        <div className="flex justify-end mt-4">
          <SaveBtn onClick={saveAbout} saving={saving === 'about'} />
        </div>
      </div>
    ),

    services: (
      <div>
        <h2 className="text-lg font-bold text-zinc-900 mb-1">Services</h2>
        <p className="text-xs text-zinc-400 mb-6">Each service appears as a card in the Services section of the website.</p>
        <div className="space-y-4">
          {services.map(svc => (
            <div key={svc.id} className="border border-zinc-200 rounded-2xl p-5 bg-zinc-50">
              <Field
                label="Service Title"
                value={svc.title ?? ''}
                onChange={v => updateService(svc.id, 'title', v)}
              />
              <Field
                label="Description"
                value={svc.description ?? ''}
                onChange={v => updateService(svc.id, 'description', v)}
                textarea
              />
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Active</span>
                <input
                  type="checkbox"
                  checked={svc.active ?? true}
                  onChange={e => updateService(svc.id, 'active', e.target.checked)}
                  className="w-4 h-4 accent-teal-600 cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => deleteService(svc.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors border border-red-100"
                >
                  <Trash2 size={14} /> Delete
                </button>
                <SaveBtn onClick={() => saveService(svc)} saving={saving === `svc-${svc.id}`} />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setServices(p => [...p, { id: `new-${Date.now()}`, title: '', description: '', active: true, display_order: p.length + 1 }])}
          className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-zinc-300 text-sm text-zinc-500 hover:border-teal-400 hover:text-teal-600 transition-colors w-full justify-center"
        >
          <Plus size={16} /> Add Service
        </button>
      </div>
    ),

    testimonials: (
      <div>
        <h2 className="text-lg font-bold text-zinc-900 mb-1">Client Reviews</h2>
        <p className="text-xs text-zinc-400 mb-5">
          Share the link below with your clients. They can submit their name, review, star rating, and an optional photo.
          Reviews appear automatically on your website.
        </p>

        {/* Shareable link */}
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 mb-6">
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Link size={12} /> Review Submission Link
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-teal-900 bg-white rounded-xl px-3 py-2 border border-teal-100 truncate select-all">
              {window.location.origin}/submit-review
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/submit-review`);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all"
              style={{ background: copiedLink ? '#16a34a' : 'linear-gradient(135deg,#00685f,#008378)' }}
            >
              {copiedLink ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
        </div>

        {/* Reviews list */}
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          All Reviews ({testimonials.length})
        </p>
        {testimonials.length === 0 ? (
          <p className="text-sm text-zinc-400 italic py-4 text-center">No reviews yet. Share the link with your clients!</p>
        ) : (
          <div className="space-y-3">
            {testimonials.map(t => (
              <div key={t.id} className="flex items-start gap-3 border border-zinc-200 rounded-2xl p-4 bg-zinc-50">
                {/* Letter avatar */}
                <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-bold text-zinc-500 flex-shrink-0 mt-0.5">
                  {t.initial || t.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-zinc-800">{t.name}</span>
                    <span className="text-xs text-yellow-500">{'★'.repeat(t.stars || 5)}</span>
                    {t.is_user_submitted && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">Client</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{t.review}</p>
                  {Array.isArray(t.photos) && t.photos.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {t.photos.slice(0, 5).map((p, i) => (
                        <img key={i} src={p.url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteTestimonial(t.id)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete review"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    contact: (
      <div>
        <h2 className="text-lg font-bold text-zinc-900 mb-6">Contact & Social Links</h2>
        <Field label="Address" value={contact.address} onChange={v => setContact(c => ({ ...c, address: v }))} textarea />
        <Field label="Phone (display)" value={contact.phone} onChange={v => setContact(c => ({ ...c, phone: v }))} placeholder="+91 95972 30737" />
        <Field label="WhatsApp number (digits only)" value={contact.whatsapp} onChange={v => setContact(c => ({ ...c, whatsapp: v }))} placeholder="919597230737" />
        <Field label="Email" value={contact.email} onChange={v => setContact(c => ({ ...c, email: v }))} />
        <Field label="Google Maps URL" value={contact.maps_url} onChange={v => setContact(c => ({ ...c, maps_url: v }))} />
        <div className="border-t border-zinc-200 my-5" />
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-4">Social Links</p>
        <Field label="Facebook URL" value={social.facebook} onChange={v => setSocial(s => ({ ...s, facebook: v }))} />
        <Field label="Instagram URL" value={social.instagram} onChange={v => setSocial(s => ({ ...s, instagram: v }))} />
        <div className="flex justify-end mt-4">
          <SaveBtn onClick={saveContact} saving={saving === 'contact'} />
        </div>
      </div>
    ),

    footer: (
      <div>
        <h2 className="text-lg font-bold text-zinc-900 mb-6">Footer</h2>
        <Field label="Business Name" value={footer.business_name} onChange={v => setFooter(f => ({ ...f, business_name: v }))} />
        <Field label="Stay In Touch Text" value={footer.stay_in_touch} onChange={v => setFooter(f => ({ ...f, stay_in_touch: v }))} textarea />
        <Field label="Copyright Text" value={footer.copyright} onChange={v => setFooter(f => ({ ...f, copyright: v }))} />
        <div className="flex justify-end mt-4">
          <SaveBtn onClick={saveFooter} saving={saving === 'footer'} />
        </div>
      </div>
    ),
  };

  return (
    <DashboardLayout>
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-teal-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold">
          {toast}
        </div>
      )}
      <ProgressToast progress={uploadProgress} />

      <div className="py-8">
        <div className="flex items-center gap-3 mb-8">
          <Globe size={22} className="text-teal-600" />
          <h1 className="text-2xl font-bold text-zinc-900">Website Content</h1>
        </div>

        <div className="flex gap-6" style={{ height: 'calc(100vh - 13rem)' }}>
          {/* Left nav — sticky */}
          <aside className="w-56 flex-shrink-0 sticky top-0 self-start">
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
              {NAV.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all text-left border-b border-zinc-100 last:border-0 ${
                      isActive
                        ? 'bg-orange-50 text-orange-900'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:translate-x-1'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-teal-700' : 'text-zinc-400'} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right panel — scrollable */}
          <div className="flex-1 bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 overflow-y-auto">
            {loading ? SECTION_SKELETON[active] ?? SECTION_SKELETON.about : active === 'photos' ? (
              <PhotosPanel
                desktopBanners={desktopBanners}
                mobileBanners={mobileBanners}
                portfolios={portfolios}
                portfolioPhotos={portfolioPhotos}
                galleryPhotos={galleryPhotos}
                photoSubTab={photoSubTab}
                setPhotoSubTab={setPhotoSubTab}
                photoUploading={photoUploading}
                phase={uploadProgress.phase}
                newPortfolioName={newPortfolioName}
                setNewPortfolioName={setNewPortfolioName}
                selectedPortfolio={selectedPortfolio}
                setSelectedPortfolio={setSelectedPortfolio}
                selectedPhotoIds={selectedPhotoIds}
                onTogglePhotoSelect={onTogglePhotoSelect}
                onSelectAllPhotos={onSelectAllPhotos}
                onClearSelection={onClearSelection}
                onDeleteDesktopSelected={onDeleteDesktopSelected}
                onDeleteMobileSelected={onDeleteMobileSelected}
                onDeleteGallerySelected={onDeleteGallerySelected}
                onDeletePortfolioPhotosSelected={onDeletePortfolioPhotosSelected}
                onUploadBanner={onUploadBanner}
                onDeleteBanner={onDeleteBanner}
                onUploadPortfolioCover={onUploadPortfolioCover}
                onDeletePortfolio={onDeletePortfolio}
                onRenamePortfolio={onRenamePortfolio}
                onUploadPortfolioPhoto={onUploadPortfolioPhoto}
                onDeletePortfolioPhoto={onDeletePortfolioPhoto}
                onAddPortfolio={onAddPortfolio}
                onUploadGallery={onUploadGallery}
                onDeleteGallery={onDeleteGallery}
                quotaFull={storageUsed >= GB10}
                storageLoaded={storageLoaded}
              />
            ) : panels[active]}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

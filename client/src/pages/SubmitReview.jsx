import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { uploadToR2, buildR2RefUrl } from '../lib/s3';
import imageCompression from 'browser-image-compression';
import { Camera, CheckCircle, X, ImagePlus } from 'lucide-react';

const COMPRESS_OPTS = { maxSizeMB: 0.5, maxWidthOrHeight: 1600, useWebWorker: true };

export default function SubmitReview() {
  const [name,       setName]       = useState('');
  const [review,     setReview]     = useState('');
  const [stars,      setStars]      = useState(5);
  const [hoverStar,  setHoverStar]  = useState(0);
  const [photos,     setPhotos]     = useState([]); // [{ file, preview }]
  const [submitting, setSubmitting] = useState(false);
  const [uploadMsg,  setUploadMsg]  = useState('');
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');
  const fileRef = useRef(null);

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files);
    const previews = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos(prev => [...prev, ...previews]);
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !review.trim()) {
      setError('Please fill in your name and review.');
      return;
    }
    setError('');
    setSubmitting(true);

    // Upload example photos
    const uploadedPhotos = [];
    let photosTotalBytes = 0;
    for (let i = 0; i < photos.length; i++) {
      const { file } = photos[i];
      setUploadMsg(`Uploading photo ${i + 1} of ${photos.length}…`);
      try {
        const compressed = await imageCompression(file, COMPRESS_OPTS);
        const ext = file.name.split('.').pop();
        const storage_path = `site/testimonials/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        await uploadToR2(compressed, storage_path);
        uploadedPhotos.push({ url: buildR2RefUrl(storage_path), storage_path });
        photosTotalBytes += compressed.size;
      } catch {}
    }

    setUploadMsg('');
    const initial = name.trim()[0].toUpperCase();
    const { error: dbError } = await supabase.from('site_testimonials').insert({
      name: name.trim(),
      initial,
      review: review.trim(),
      stars,
      photos: uploadedPhotos,
      photos_size_bytes: photosTotalBytes,
      active: true,
      is_user_submitted: true,
    });

    setSubmitting(false);
    if (dbError) {
      setError('Something went wrong. Please try again.');
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg,#f5f5f0,#ece8e0)' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={44} className="text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
            Thank You!
          </h2>
          <p className="text-neutral-500 text-sm">Your review has been submitted successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg,#f5f5f0,#ece8e0)' }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-zinc-100">
          <h1 className="text-xl font-bold text-neutral-900 mb-1" style={{ fontFamily: 'Merriweather, serif' }}>
            Share Your Experience
          </h1>
          <p className="text-sm text-neutral-400">We'd love to hear from you</p>
        </div>

        <div className="px-8 py-7">
          {/* Star rating */}
          <div className="flex justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHoverStar(s)}
                onMouseLeave={() => setHoverStar(0)}
                onClick={() => setStars(s)}
                className="text-4xl transition-all duration-150 hover:scale-110"
                style={{ color: s <= (hoverStar || stars) ? '#f59e0b' : '#e5e7eb', lineHeight: 1 }}
              >
                ★
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-zinc-400 mb-6">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hoverStar || stars]}
          </p>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-zinc-50"
            />
          </div>

          {/* Review */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
              Your Review
            </label>
            <textarea
              rows={4}
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder="Tell us about your experience…"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-zinc-50 resize-none"
            />
          </div>

          {/* Example photos */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              Share Your Favourite Photos <span className="text-zinc-300 font-normal normal-case">(optional)</span>
            </label>

            {/* Previews */}
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 group">
                    <img src={p.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotos}
            />
            <button
              onClick={() => fileRef.current.click()}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-teal-600 transition-colors"
            >
              <ImagePlus size={16} />
              {photos.length === 0 ? 'Add photos' : 'Add more photos'}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-4 bg-red-50 rounded-xl px-4 py-2">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#00685f,#008378)' }}
          >
            {submitting ? (uploadMsg || 'Submitting…') : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

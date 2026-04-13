'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function UploadPage() {
  const [filename, setFilename] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Sedang memproses dan mengubah teks menjadi vektor...');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, text })
      });

      const result = await response.json();

      if (response.ok) {
        setStatus(`✅ Sukses! Dokumen disimpan dalam ${result.chunksSaved} potongan vektor.`);
        setFilename('');
        setText('');
      } else {
        setStatus(`❌ Gagal: ${result.error}`);
      }
    } catch (error) {
      setStatus('❌ Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f10] text-[#ececec] p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 mb-6 transition-colors font-medium bg-violet-500/10 px-4 py-2 rounded-xl border border-violet-500/20 w-fit"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Kembali ke Chat
        </Link>
        <h1 className="text-3xl font-bold mb-2">📁 RAG Document Uploader</h1>
        <p className="text-gray-400 mb-8">Tambahkan dokumen baru ke dalam knowledge MagangBot.</p>

        <form onSubmit={handleUpload} className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Nama Dokumen</label>
            <input
              type="text"
              required
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Contoh: SOP_Perusahaan_2026"
              className="w-full bg-[#1a1a1b]/80 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-colors text-white"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1">Isi Teks Dokumen</label>
            <textarea
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Copy dan paste isi dokumen di sini..."
              rows={10}
              className="w-full bg-[#1a1a1b]/80 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-colors text-white resize-y"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-bold py-3 rounded-xl transition-colors shadow-lg ${
              isLoading 
                ? 'bg-violet-600/50 text-white/50 cursor-not-allowed' 
                : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-900/20'
            }`}
          >
            {isLoading ? 'Memproses...' : 'Simpan ke Database Vektor'}
          </button>

          {status && (
            <div className={`mt-4 p-4 rounded-xl text-center font-medium ${status.includes('✅') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : status.includes('❌') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
              {status}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
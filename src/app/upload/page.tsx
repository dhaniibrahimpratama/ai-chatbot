'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

type UploadQueueItem = {
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  message: string;
  progress: number;
};

export default function UploadPage() {
  const [filename, setFilename] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [editFilename, setEditFilename] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchDocs = useCallback(async () => {
    const res = await fetch('/api/documents');
    const data = await res.json();
    if (Array.isArray(data)) setDocuments(data);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const filteredDocuments = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFilesToQueue(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    addFilesToQueue(files);
  };

  const addFilesToQueue = (files: File[]) => {
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'txt' && ext !== 'pdf') return false;
      if (file.size > 10 * 1024 * 1024) return false;
      return true;
    });

    if (validFiles.length !== files.length) {
      setStatus(`⚠️ ${files.length - validFiles.length} file dilewati (format tidak didukung atau >10MB)`);
    }

    const newItems: UploadQueueItem[] = validFiles.map(file => ({
      file, status: 'pending', message: 'Menunggu...', progress: 0,
    }));
    setUploadQueue(prev => [...prev, ...newItems]);
    setStatus('');
  };

  const removeFromQueue = (index: number) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (uploadMode === 'file') {
      if (uploadQueue.length === 0) return;
      setIsLoading(true);

      for (let i = 0; i < uploadQueue.length; i++) {
        const item = uploadQueue[i];
        if (item.status === 'done') continue;

        setUploadQueue(prev => prev.map((q, idx) =>
          idx === i ? { ...q, status: 'processing', message: 'Memproses...', progress: 30 } : q
        ));

        try {
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('filename', item.file.name.replace(/\.[^/.]+$/, ''));

          setUploadQueue(prev => prev.map((q, idx) =>
            idx === i ? { ...q, progress: 60, message: 'Membuat embedding...' } : q
          ));

          const response = await fetch('/api/upload', { method: 'POST', body: formData });
          const result = await response.json();

          if (response.ok) {
            setUploadQueue(prev => prev.map((q, idx) =>
              idx === i ? { ...q, status: 'done', message: `✅ ${result.chunksSaved} chunks tersimpan`, progress: 100 } : q
            ));
          } else {
            setUploadQueue(prev => prev.map((q, idx) =>
              idx === i ? { ...q, status: 'error', message: `❌ ${result.error}`, progress: 0 } : q
            ));
          }
        } catch {
          setUploadQueue(prev => prev.map((q, idx) =>
            idx === i ? { ...q, status: 'error', message: '❌ Gagal upload', progress: 0 } : q
          ));
        }
      }

      await fetchDocs();
      setIsLoading(false);

    } else {
      if (!text.trim() || !filename.trim()) return;
      setIsLoading(true);
      setStatus('Memproses vektor...');
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, text }),
        });
        const result = await response.json();
        if (response.ok) {
          setStatus(`✅ Berhasil! ${result.chunksSaved} chunks tersimpan.`);
          setFilename('');
          setText('');
          await fetchDocs();
        } else {
          setStatus(`❌ ${result.error}`);
        }
      } catch {
        setStatus('❌ Gagal terhubung ke server.');
      }
      setIsLoading(false);
    }
  };

  const toggleStatus = async (docFilename: string, isActive: boolean) => {
    await fetch('/api/documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: docFilename, isActive }) });
    fetchDocs();
  };

  const deleteDoc = async (docFilename: string) => {
    if (!confirm(`Hapus dokumen "${docFilename}"?`)) return;
    await fetch('/api/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: docFilename }) });
    fetchDocs();
  };

  const openEditModal = (doc: any) => {
    setEditingDoc(doc);
    setEditFilename(doc.filename);
    setEditContent(doc.content);
  };

  const saveEdit = async () => {
    if (!editFilename.trim()) return;
    setIsSavingEdit(true);
    await fetch('/api/documents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalFilename: editingDoc.filename, newFilename: editFilename, content: editContent }),
    });
    setIsSavingEdit(false);
    setEditingDoc(null);
    fetchDocs();
  };

  const allDone = uploadQueue.length > 0 && uploadQueue.every(q => q.status === 'done' || q.status === 'error');

  return (
    <div className="min-h-screen bg-[#0f0f10] text-[#ececec]">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" title="Kembali" aria-label="Kembali ke chat"
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-[#666] hover:text-[#ececec]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Kelola Dokumen RAG</h1>
            <p className="text-sm text-[#555] mt-0.5">Upload dokumen agar MagangBot bisa menjawab berdasarkan isinya</p>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleUpload} className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">

          {/* Mode toggle */}
          <div className="flex gap-2 mb-5">
            {(['file', 'text'] as const).map(mode => (
              <button key={mode} type="button" onClick={() => setUploadMode(mode)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  uploadMode === mode ? 'bg-violet-600 text-white' : 'bg-white/5 text-[#777] hover:bg-white/8'
                }`}>
                {mode === 'file' ? 'Upload File' : 'Input Teks'}
              </button>
            ))}
          </div>

          {uploadMode === 'file' && (
            <>
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`cursor-pointer border-2 border-dashed rounded-xl p-8 text-center mb-4 transition-colors ${
                  isDragging ? 'border-violet-500 bg-violet-500/5' : 'border-white/15 hover:border-white/30 hover:bg-white/5'
                }`}>
                <input ref={fileInputRef} type="file" accept=".txt,.pdf" multiple onChange={handleFileSelect}
                  className="hidden" title="Pilih file" aria-label="Pilih file" />
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-400">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p className="text-sm text-[#888]">
                  <span className="text-violet-400 font-medium">Klik atau drag & drop</span> — bisa pilih beberapa file sekaligus
                </p>
                <p className="text-xs text-[#555] mt-1">Format: .txt dan .pdf • Maks 10MB per file</p>
              </div>

              {/* Upload queue dengan progress bar */}
              {uploadQueue.length > 0 && (
                <div className="space-y-2 mb-4">
                  {uploadQueue.map((item, idx) => (
                    <div key={idx} className="bg-black/30 border border-white/8 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${item.file.name.endsWith('.pdf') ? '📕' : '📄'}`} />
                          <div>
                            <p className="text-sm font-medium truncate max-w-xs">{item.file.name}</p>
                            <p className="text-xs text-[#555]">{formatFileSize(item.file.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#666]">{item.message}</span>
                          {item.status === 'pending' && (
                            <button type="button" onClick={() => removeFromQueue(idx)}
                              title="Hapus dari antrian" aria-label="Hapus dari antrian"
                              className="p-1 hover:text-red-400 text-[#555] transition-colors">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Progress bar */}
                      {item.status !== 'pending' && (
                        <div className="w-full bg-white/5 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all duration-500 ${
                            item.status === 'done' ? 'bg-green-500' :
                            item.status === 'error' ? 'bg-red-500' : 'bg-violet-500'
                          }`} style={{ width: `${item.progress}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Clear queue jika semua done */}
              {allDone && (
                <button type="button" onClick={() => setUploadQueue([])}
                  className="text-xs text-[#555] hover:text-[#888] mb-3 transition-colors">
                  Hapus semua dari antrian
                </button>
              )}
            </>
          )}

          {uploadMode === 'text' && (
            <>
              <input value={filename} onChange={e => setFilename(e.target.value)} placeholder="Nama dokumen"
                required className="w-full bg-[#1a1a1b] border border-white/10 rounded-xl px-4 py-3 mb-3 focus:border-violet-500/50 outline-none" />
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ketik atau paste teks di sini..."
                rows={6} required className="w-full bg-[#1a1a1b] border border-white/10 rounded-xl px-4 py-3 mb-4 focus:border-violet-500/50 outline-none resize-none" />
            </>
          )}

          <button type="submit"
            disabled={isLoading || (uploadMode === 'file' ? uploadQueue.filter(q => q.status === 'pending').length === 0 : !text.trim() || !filename.trim())}
            className="w-full bg-violet-600 py-3 rounded-xl font-bold hover:bg-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Memproses...
              </span>
            ) : uploadMode === 'file'
              ? `Upload ${uploadQueue.filter(q => q.status === 'pending').length} File`
              : 'Simpan ke Database Vektor'}
          </button>

          {status && (
            <p className={`mt-3 text-center text-sm px-4 py-2.5 rounded-xl ${
              status.includes('✅') ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              status.includes('❌') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
              'bg-violet-500/10 text-violet-400 border border-violet-500/20'
            }`}>{status}</p>
          )}
        </form>

        {/* Search + Daftar Dokumen */}
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-3">
            <h2 className="font-semibold flex-1">Daftar Dokumen ({filteredDocuments.length})</h2>
            <div className="relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari dokumen..." aria-label="Cari dokumen"
                className="bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-violet-500/40 w-48" />
            </div>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-white/5">
                <th className="p-4 font-medium">Nama Dokumen</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map(doc => (
                <tr key={doc.filename} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-medium">{doc.filename}</div>
                    <div className="text-[10px] text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString('id-ID')} • {doc.chunkCount} Chunks
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => toggleStatus(doc.filename, doc.isActive)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        doc.isActive ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}>
                      {doc.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openEditModal(doc)} className="text-blue-400 hover:text-blue-300 p-2 transition-colors">Lihat / Edit</button>
                      <button onClick={() => deleteDoc(doc.filename)} className="text-red-500 hover:text-red-400 p-2 transition-colors">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDocuments.length === 0 && (
            <p className="p-10 text-center text-gray-500">
              {searchQuery ? `Tidak ada dokumen dengan kata "${searchQuery}"` : 'Belum ada dokumen di database.'}
            </p>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161617] border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
            <h2 className="text-xl font-bold mb-5">Lihat / Edit Dokumen</h2>
            <div className="mb-4">
              <label htmlFor="editFilename" className="block text-sm text-gray-400 mb-1">Nama Dokumen</label>
              <input id="editFilename" title="Nama Dokumen" value={editFilename} onChange={e => setEditFilename(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 transition-colors" />
            </div>
            <div className="mb-6">
              <label htmlFor="editContent" className="block text-sm text-gray-400 mb-1">Isi Teks Dokumen</label>
              <textarea id="editContent" title="Isi Teks Dokumen" value={editContent} onChange={e => setEditContent(e.target.value)}
                rows={8} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 transition-colors" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingDoc(null)} className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Batal</button>
              <button onClick={saveEdit} disabled={isSavingEdit}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50">
                {isSavingEdit ? 'Menghitung Ulang Vektor...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
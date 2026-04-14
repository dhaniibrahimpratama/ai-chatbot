'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

export default function UploadPage() {
  const [filename, setFilename] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'txt' && ext !== 'pdf') {
      setStatus('❌ Format file tidak didukung. Hanya .txt dan .pdf yang diizinkan.');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setStatus('❌ Ukuran file terlalu besar. Maksimal 10MB.');
      return;
    }

    setSelectedFile(file);
    setStatus('');
    if (!filename) {
      setFilename(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Memproses vektor...');

    try {
      let response: Response;

      if (uploadMode === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('filename', filename);

        response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, text }),
        });
      }

      const result = await response.json();
      if (response.ok) {
        setStatus(`✅ Sukses disimpan! (${result.chunksSaved} chunks)`);
        setFilename('');
        setText('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchDocs();
      } else {
        setStatus(`❌ Gagal: ${result.error || 'Terjadi kesalahan di server'}`);
      }
    } catch (error) {
      setStatus('❌ Gagal: Masalah jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (filename: string, currentStatus: boolean) => {
    await fetch('/api/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, isActive: currentStatus })
    });
    fetchDocs();
  };

  const deleteDoc = async (filename: string) => {
    if (!confirm(`Yakin ingin menghapus dokumen "${filename}"?`)) return;
    await fetch('/api/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
    fetchDocs();
  };

  const openEditModal = (doc: any) => {
    setEditingDoc(doc);
    setEditFilename(doc.filename);
    setEditContent(doc.content);
  };

  const saveEdit = async () => {
    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalFilename: editingDoc.filename,
          newFilename: editFilename,
          content: editContent 
        })
      });
      if (res.ok) {
        setEditingDoc(null);
        fetchDocs();
      } else {
        alert("Gagal menyimpan perubahan.");
      }
    } catch (error) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const isFormValid = uploadMode === 'file' ? !!selectedFile : !!text.trim();

  return (
    <div className="min-h-screen bg-[#0f0f10] text-[#ececec] p-8 relative">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-violet-400 mb-6 bg-violet-500/10 px-4 py-2 rounded-xl border border-violet-500/20">
           ← Kembali ke Chat
        </Link>

        <h1 className="text-3xl font-bold mb-8">📁 RAG Document Manager</h1>

        {/* FORM UPLOAD */}
        <form onSubmit={handleUpload} className="bg-white/5 p-6 rounded-2xl border border-white/10 mb-10">
          <h2 className="text-lg font-semibold mb-4 text-violet-400">Tambah Dokumen Baru</h2>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                uploadMode === 'file'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30'
                  : 'bg-white/5 text-[#888] hover:bg-white/10 hover:text-[#ccc] border border-white/10'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('text')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                uploadMode === 'text'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30'
                  : 'bg-white/5 text-[#888] hover:bg-white/10 hover:text-[#ccc] border border-white/10'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Ketik Manual
            </button>
          </div>

          {/* Filename Input */}
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Nama Dokumen (opsional, otomatis dari nama file)"
            className="w-full bg-[#1a1a1b] border border-white/10 rounded-xl px-4 py-3 mb-4 focus:border-violet-500/50 outline-none transition-colors"
          />

          {/* File Upload Mode */}
          {uploadMode === 'file' && (
            <>
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 mb-4 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-violet-500 bg-violet-500/10 scale-[1.01]'
                    : selectedFile
                      ? 'border-green-500/40 bg-green-500/5'
                      : 'border-white/15 bg-[#1a1a1b]/50 hover:border-white/30 hover:bg-[#1a1a1b]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  title="Pilih file TXT atau PDF"
                  aria-label="Pilih file TXT atau PDF"
                />

                {selectedFile ? (
                  <div className="flex items-center justify-center gap-4">
                    {/* File Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      selectedFile.name.endsWith('.pdf')
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {selectedFile.name.endsWith('.pdf') ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      )}
                    </div>

                    <div className="text-left">
                      <p className="font-medium text-[#ececec]">{selectedFile.name}</p>
                      <p className="text-xs text-[#666] mt-0.5">
                        {formatFileSize(selectedFile.size)} • {selectedFile.name.split('.').pop()?.toUpperCase()}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      title="Hapus file"
                      aria-label="Hapus file"
                      className="ml-auto p-2 rounded-lg hover:bg-white/10 text-[#666] hover:text-red-400 transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-400">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <p className="text-[#888] text-sm mb-1">
                      <span className="text-violet-400 font-medium">Klik untuk pilih file</span> atau drag & drop di sini
                    </p>
                    <p className="text-[#555] text-xs">
                      Format yang didukung: <span className="text-[#777] font-mono">.txt</span> dan <span className="text-[#777] font-mono">.pdf</span> • Maks 10MB
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Text Input Mode */}
          {uploadMode === 'text' && (
            <textarea
              required={uploadMode === 'text'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ketik atau paste teks di sini..."
              rows={6}
              className="w-full bg-[#1a1a1b] border border-white/10 rounded-xl px-4 py-3 mb-4 focus:border-violet-500/50 outline-none transition-colors resize-none"
            />
          )}

          {/* Submit Button */}
          <button
            disabled={isLoading || !isFormValid}
            className="w-full bg-violet-600 py-3 rounded-xl font-bold hover:bg-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Memproses & Menyimpan Vektor...
              </span>
            ) : (
              uploadMode === 'file' ? 'Upload & Simpan ke Database Vektor' : 'Simpan ke Database Vektor'
            )}
          </button>

          {/* Status Message */}
          {status && (
            <p className={`mt-4 text-center text-sm px-4 py-3 rounded-xl ${
              status.includes('✅')
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : status.includes('❌')
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
            }`}>
              {status}
            </p>
          )}
        </form>

        {/* DAFTAR DOKUMEN */}
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-white/5">
            <h2 className="font-semibold">Daftar Dokumen MagangBot</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-white/5">
                <th className="p-4 font-medium">Nama Dokumen</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.filename} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-medium">{doc.filename}</div>
                    <div className="text-[10px] text-gray-500">{new Date(doc.createdAt).toLocaleDateString()} • {doc.chunkCount} Chunks</div>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleStatus(doc.filename, doc.isActive)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        doc.isActive ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                    >
                      {doc.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(doc)} className="text-blue-400 hover:text-blue-300 transition-colors p-2 font-medium">
                        Lihat / Edit
                      </button>
                      <button onClick={() => deleteDoc(doc.filename)} className="text-red-500 hover:text-red-400 transition-colors p-2 font-medium">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {documents.length === 0 && <p className="p-10 text-center text-gray-500">Belum ada dokumen di database.</p>}
        </div>
      </div>

      {/* EDIT DOKUMEN */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#161617] border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
            <h2 className="text-xl font-bold mb-5 text-white">Lihat / Edit Dokumen</h2>
            
            <div className="mb-4">
              <label htmlFor="editFilename" className="block text-sm text-gray-400 mb-1">Nama Dokumen</label>
              <input 
                id="editFilename"
                placeholder="Nama Dokumen"
                title="Nama Dokumen"
                value={editFilename} 
                onChange={e => setEditFilename(e.target.value)} 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-colors" 
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="editContent" className="block text-sm text-gray-400 mb-1">Isi Teks Dokumen</label>
              <textarea 
                id="editContent"
                placeholder="Isi Teks Dokumen"
                title="Isi Teks Dokumen"
                value={editContent} 
                onChange={e => setEditContent(e.target.value)} 
                rows={8} 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-colors"
              ></textarea>
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEditingDoc(null)} 
                className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
              >
                Batal
              </button>
              <button 
                onClick={saveEdit} 
                disabled={isSavingEdit} 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingEdit ? 'Menghitung Ulang Vektor...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
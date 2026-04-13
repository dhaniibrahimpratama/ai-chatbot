'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function UploadPage() {
  const [filename, setFilename] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);

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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Memproses vektor...');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, text })
      });
      const result = await response.json();
      if (response.ok) {
        setStatus('✅ Sukses disimpan!');
        setFilename(''); setText('');
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
          <input
            type="text" required value={filename} onChange={(e) => setFilename(e.target.value)}
            placeholder="Nama Dokumen (Contoh: SOP_Perusahaan)"
            className="w-full bg-[#1a1a1b] border border-white/10 rounded-xl px-4 py-3 mb-4 focus:border-violet-500/50 outline-none transition-colors"
          />
          <textarea
            required value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Ketik atau paste teks di sini..." rows={5}
            className="w-full bg-[#1a1a1b] border border-white/10 rounded-xl px-4 py-3 mb-4 focus:border-violet-500/50 outline-none transition-colors"
          ></textarea>
          <button disabled={isLoading} className="w-full bg-violet-600 py-3 rounded-xl font-bold hover:bg-violet-700 transition-all">
            {isLoading ? 'Menyimpan...' : 'Simpan ke Database Vektor'}
          </button>
          {status && <p className="mt-4 text-center text-sm">{status}</p>}
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

      {/* MODAL EDIT DOKUMEN */}
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
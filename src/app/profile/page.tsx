'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { logout } from '@/app/actions';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] text-[#ececec]">
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Link href="/" title="Kembali ke chat" aria-label="Kembali ke chat"
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-[#666] hover:text-[#ececec]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <h1 className="text-xl font-semibold">Profil Saya</h1>
        </div>

        {/* Avatar + email */}
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6 mb-4 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {profile?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="font-semibold text-lg">{profile?.email}</p>
            <p className="text-sm text-[#666] mt-0.5">
              Bergabung sejak {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Sesi Chat', value: profile?.stats?.sessionCount ?? 0, color: 'violet' },
            { label: 'Total Pesan', value: profile?.stats?.messageCount ?? 0, color: 'indigo' },
            { label: 'Dokumen Aktif', value: profile?.stats?.documentCount ?? 0, color: 'purple' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/5 border border-white/8 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1"></div>
              <div className="text-2xl font-bold text-[#ececec]">{stat.value}</div>
              <div className="text-xs text-[#666] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Recent sessions */}
        <div className="bg-white/5 border border-white/8 rounded-2xl p-5 mb-4">
          <h2 className="font-semibold mb-4 text-[#ececec]">Sesi Chat Terbaru</h2>
          {profile?.recentSessions?.length === 0 ? (
            <p className="text-sm text-[#555]">Belum ada sesi chat.</p>
          ) : (
            <div className="space-y-2">
              {profile?.recentSessions?.map((s: any) => (
                <Link key={s.id} href="/"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <span className="text-sm text-[#aaa] group-hover:text-[#ececec] truncate max-w-xs">{s.title}</span>
                  <span className="text-xs text-[#555] flex-shrink-0 ml-3">
                    {new Date(s.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/upload"
            className="bg-white/5 border border-white/8 rounded-2xl p-4 hover:bg-white/8 transition-colors flex items-center gap-3">
            <span className="text-xl"></span>
            <div>
              <div className="font-medium text-sm">Kelola Dokumen</div>
              <div className="text-xs text-[#666]">Upload & atur dokumen RAG</div>
            </div>
          </Link>
          <Link href="/"
            className="bg-white/5 border border-white/8 rounded-2xl p-4 hover:bg-white/8 transition-colors flex items-center gap-3">
            <span className="text-xl"></span>
            <div>
              <div className="font-medium text-sm">Mulai Chat</div>
              <div className="text-xs text-[#666]">Kembali ke halaman chat</div>
            </div>
          </Link>
        </div>

        {/* Logout */}
        <form action={logout}>
          <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-3 rounded-xl transition-colors font-medium text-sm flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Keluar dari Akun
          </button>
        </form>
      </div>
    </div>
  );
}
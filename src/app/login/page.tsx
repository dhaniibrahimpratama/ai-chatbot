import { login, signup } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  const message = params?.message

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0f0f10] text-[#ececec] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/20 blur-[130px] rounded-full pointer-events-none z-0" />

      <form className="animate-slide-up flex flex-col gap-4 w-full max-w-sm bg-white/5 backdrop-blur-md shadow-2xl border border-white/10 p-8 rounded-2xl z-10 relative">
        
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-1">MagangBot</h1>
          <p className="text-sm text-gray-400">Silakan masuk untuk melanjutkan obrolan</p>
        </div>

        {message && (
          <p className={`text-sm text-center p-3 rounded-xl mb-2 border ${
            message.includes('Berhasil') 
              ? 'bg-green-500/20 text-green-200 border-green-500/50' 
              : 'bg-red-500/20 text-red-200 border-red-500/50'
          }`}>
            {message}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-gray-300 px-1">Email</label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            placeholder="nama@email.com"
            required 
            className="bg-[#1a1a1b]/80 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label htmlFor="password" className="text-sm font-medium text-gray-300 px-1">Password</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            placeholder="••••••••"
            required 
            className="bg-[#1a1a1b]/80 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>

        <button formAction={login} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-colors mt-2 shadow-lg shadow-violet-900/20">
          Masuk
        </button>
        <button formAction={signup} className="bg-transparent border border-white/10 hover:bg-white/5 text-gray-300 py-3 rounded-xl transition-colors">
          Daftar Akun Baru
        </button>
      </form>
    </div>
  )
}
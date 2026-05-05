# MagangBot - Enterprise RAG Chatbot

MagangBot adalah asisten virtual cerdas berbasis AI yang dikembangkan untuk membantu karyawan menemukan informasi internal perusahaan dengan cepat dan akurat. Dibangun dengan arsitektur **Retrieval-Augmented Generation (RAG)**, chatbot ini mampu menjawab pertanyaan berdasarkan dokumen spesifik (PDF/TXT) yang diunggah oleh pengguna, dengan dukungan pelacakan sumber (citations) untuk mencegah halusinasi AI.

**Live Demo:** [KLIK DI SINI UNTUK MENCOBA MAGANGBOT](https://magangbot.vercel.app)

---

## Fitur Utama

- **Intelligent Chat Interface:** Chatbot responsif yang ditenagai oleh model Llama 3.3 70B via Groq untuk penalaran bahasa yang natural.
- **RAG (Retrieval-Augmented Generation):** AI hanya menjawab berdasarkan dokumen yang diunggah, meminimalisir halusinasi.
- **Multi-File Upload Queue:** Mendukung unggah banyak dokumen sekaligus (.txt dan .pdf) lengkap dengan *progress bar*.
- **Source Tracking (Citations):** Setiap jawaban AI akan menyertakan catatan kaki (sumber dokumen) darimana informasi tersebut diambil.
- **RAG Toggle:** Pengguna dapat menghidupkan/mematikan fitur RAG untuk mengubah mode AI (Fokus Dokumen vs Pengetahuan Umum).
- **Export Chat:** Percakapan dapat diunduh ke dalam format `.txt` untuk disimpan secara lokal.
- **User Dashboard:** Manajemen dokumen aktif/non-aktif dan pemantauan riwayat sesi obrolan pengguna.

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend:** Node.js, Next.js API Routes
- **Database:** Supabase (PostgreSQL dengan ekstensi `pgvector`)
- **ORM:** Prisma Client
- **AI / LLM:** 
  - **Text Generation:** Llama 3.3 70B (via Groq API)
  - **Vector Embeddings:** Gemini Embedding 2 Preview (via Google Generative AI)
- **Document Processing:** `unpdf` (Ekstraksi teks PDF)

---

## Panduan Instalasi Lokal

Jika Anda ingin menjalankan proyek ini di mesin lokal, ikuti langkah-langkah berikut:

### 1. Clone Repository
\`\`\`bash
git clone https://github.com/dhaniibrahimpratama/ai-chatbot.git
cd ai-chatbot
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Setup Environment Variables
Buat file \`.env\` di *root directory* dan isi dengan kredensial berikut:
\`\`\`env
# Database (Supabase)
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"

DIRECT_URL="postgresql://[USER]:[PASSWORD]@[HOST]:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_PROJECT_ID].supabase.co"

NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_SUPABASE_ANON_KEY]"

# AI API Keys
GROQ_API_KEY="[YOUR_GROQ_API_KEY]"

GOOGLE_GEMINI_API_KEY="[YOUR_GEMINI_API_KEY]"
\`\`\`

### 4. Sinkronisasi Database
Jalankan migrasi Prisma untuk membuat tabel dan fungsi vektor di database Anda:
\`\`\`bash
npx prisma generate
npx prisma db push
\`\`\`

### 5. Jalankan Server Development
\`\`\`bash
npm run dev
\`\`\`
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---
*Developed with ❤️ by Dhani Ibrahim Pratama during an internship program.*

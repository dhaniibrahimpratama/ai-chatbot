async function testUpload() {
  console.log("⏳ Mengirim dokumen uji coba ke API...");
  
  const response = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: "SOP_Cuti_Karyawan_2026.txt",
      text: "Ini adalah dokumen kebijakan cuti tahunan perusahaan. Setiap karyawan berhak mendapatkan 12 hari cuti berbayar per tahun. Pengajuan cuti harus dilakukan minimal 7 hari sebelum hari H melalui portal HR. Jika ada keperluan mendadak seperti sakit, karyawan wajib melampirkan surat keterangan dokter."
    })
  });

  const result = await response.json();
  console.log("✅ Hasil dari Server:", result);
}

testUpload();
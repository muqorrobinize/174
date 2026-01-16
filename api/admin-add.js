export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  const USERNAME = "muqorrobinize"; 
  const REPO = "b33nonexam"; // Nama repo utama kamu
  const FILE_PATH = "whitelist.json"; // Lokasi file database

  if (!token) return res.status(500).json({ error: 'GitHub Token belum dipasang di Vercel' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { newAddress } = req.body;
    if (!newAddress) return res.status(400).json({ error: 'Address kosong' });

    // 1. Ambil data Whitelist lama dari GitHub
    let currentWhitelist = [];
    let fileSha = null;

    const getRes = await fetch(`https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`, {
      headers: { Authorization: `token ${token}` }
    });

    if (getRes.status === 404) {
      // File belum ada, kita akan buat array kosong untuk inisialisasi
      console.log("Database belum ada, membuat baru...");
    } else if (!getRes.ok) {
      throw new Error("Gagal mengambil database lama");
    } else {
      const fileData = await getRes.json();
      const contentStr = Buffer.from(fileData.content, 'base64').toString('utf-8');
      currentWhitelist = JSON.parse(contentStr);
      fileSha = fileData.sha; // Simpan SHA untuk update
    }

    // 2. Cek apakah sudah ada
    if (currentWhitelist.includes(newAddress)) {
      return res.status(400).json({ error: 'Wallet sudah terdaftar!' });
    }

    // 3. Tambahkan Address Baru
    currentWhitelist.push(newAddress);

    // 4. Simpan kembali ke GitHub (Commit)
    const newContentBase64 = Buffer.from(JSON.stringify(currentWhitelist, null, 2)).toString('base64');

    // Siapkan body request
    const bodyPayload = {
      message: `Add ${newAddress} via Admin Panel`,
      content: newContentBase64
    };

    // Jika file sudah ada, WAJIB sertakan SHA. Jika baru, JANGAN sertakan SHA.
    if (fileSha) {
      bodyPayload.sha = fileSha;
    }

    const putRes = await fetch(`https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!putRes.ok) throw new Error("Gagal menyimpan ke GitHub");

    return res.status(200).json({ success: true, total: currentWhitelist.length });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

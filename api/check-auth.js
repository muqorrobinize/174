export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  const USERNAME = "muqorrobinize"; 
  const REPO = "b33nonexam"; // Pastikan sama dengan di admin-add.js
  const FILE_PATH = "whitelist.json"; // File database JSON

  // Setup CORS (Penting agar frontend bisa akses)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'No Address provided' });

    const checkAddress = address.toLowerCase();

    // 1. Fetch Database LIVE dari GitHub
    // Kita baca raw content dari GitHub API agar selalu dapat data terbaru (tanpa redeploy Vercel)
    const ghRes = await fetch(`https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`, {
      headers: { 
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    
    if (!ghRes.ok) {
       console.error("GitHub Fetch Error:", ghRes.statusText);
       // Jika file tidak ditemukan (404), berarti belum ada yang whitelist
       return res.status(401).json({ error: 'Database belum diinisialisasi.', access: false });
    }

    const fileData = await ghRes.json();
    // Decode Base64 content dari GitHub
    const contentStr = Buffer.from(fileData.content, 'base64').toString('utf-8');
    
    // 2. Parse JSON
    let whitelist = [];
    try {
        whitelist = JSON.parse(contentStr);
    } catch (e) {
        console.error("JSON Parse Error");
        return res.status(500).json({ error: 'Database Corrupt' });
    }

    // 3. Validasi Address
    // Cek apakah address user ada di dalam array whitelist
    const isAllowed = whitelist.some(w => w.toLowerCase() === checkAddress);

    if (isAllowed) {
      return res.status(200).json({ access: true });
    } else {
      return res.status(401).json({ error: 'Akses Ditolak. Wallet tidak terdaftar.', access: false });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server Error' });
  }
}

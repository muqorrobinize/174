// File: api/content.js (Taruh di Vercel milikmu)

export default async function handler(req, res) {
  // PENTING: Pastikan 3 env variable ini sudah kamu set di Vercel
  const token = process.env.GITHUB_TOKEN; // Token God Mode yang barusan kamu buat
  const owner = process.env.GITHUB_OWNER; // Username github (misal: "muqorrobinize")
  const repo = process.env.GITHUB_REPO;   // Nama repo (misal: "174-archive")

  if (!token || !owner || !repo) {
    return res.status(500).json({ message: "Fatal: System Environment Variables missing in Vercel." });
  }

  const { method } = req;

  // ------------------------------------------------------------------
  // 1. GET: Read Directory / File (Dipakai oleh Explorer & Index.html)
  // ------------------------------------------------------------------
  if (method === 'GET') {
    const folder = req.query.folder || '';
    const file = req.query.file || '';
    const targetPath = file ? file : folder;

    try {
      const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      if (!ghRes.ok) throw new Error(await ghRes.text());
      const data = await ghRes.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ------------------------------------------------------------------
  // 2. POST: Create / Update File (Dipakai untuk Deploy & Push)
  // ------------------------------------------------------------------
  if (method === 'POST') {
    const { path, message, content, sha, author } = req.body;

    const payload = {
      message: message || "System Director Update",
      content: content
    };

    if (sha) payload.sha = sha;
    
    // 🔥 INI DIA GHOST PROTOCOL-NYA (Opsi Sir Yaeon) 🔥
    // Walaupun token milik muqorrobinize, kalau payload author ini ada, 
    // GitHub akan mencatat nama Yaeon di histori commit!
    if (author) payload.author = author; 

    try {
      // GitHub API menggunakan method PUT untuk upload/update file
      const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify(payload)
      });
      if (!ghRes.ok) throw new Error(await ghRes.text());
      const data = await ghRes.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ------------------------------------------------------------------
  // 3. DELETE: Hapus File Permanen
  // ------------------------------------------------------------------
  if (method === 'DELETE') {
    const { path, message, sha, author } = req.body;

    const payload = {
      message: message || "System Director Deletion",
      sha: sha
    };

    if (author) payload.author = author; // Ghost protocol untuk hapus

    try {
      const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify(payload)
      });
      if (!ghRes.ok) throw new Error(await ghRes.text());
      const data = await ghRes.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // Jika method bukan GET/POST/DELETE
  return res.status(405).json({ message: "Method Not Allowed" });
}

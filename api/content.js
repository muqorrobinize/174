export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN; 
  
  const USERNAME = "muqorrobinize";
  const REPO = "174";
  
  // 1. Ambil parameter 'folder' dari URL (contoh: /api/content?folder=music)
  // Default ke 'kuis' jika tidak ada parameter
  const { folder } = req.query;
  
  // 2. Keamanan: Batasi folder apa saja yang boleh diakses
  const allowedFolders = ['kuis', 'music'];
  const targetPath = allowedFolders.includes(folder) ? folder : 'kuis';

  if (!token) {
    return res.status(500).json({ error: 'Token GitHub belum diset di Vercel.' });
  }

  try {
    // 3. Fetch ke GitHub sesuai folder yang diminta
    const response = await fetch(`https://api.github.com/repos/${USERNAME}/${REPO}/contents/${targetPath}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub Error: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export default async function handler(req, res) {
  // Ambil token dari Environment Variable Vercel
  const token = process.env.GITHUB_TOKEN; 
  
  // Ganti dengan username & nama repo kamu
  const USERNAME = "muqorrobinize";
  const REPO = "b33nonexam";
  const PATH = "kuis" "music" "api"; // Folder yang mau diambil

  if (!token) {
    return res.status(500).json({ error: 'Token GitHub belum diset di Vercel Environment Variables.' });
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${USERNAME}/${REPO}/contents/${PATH}`, {
      headers: {
        Authorization: `token ${token}`, // Pakai token untuk akses repo private
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Kirim data ke frontend
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

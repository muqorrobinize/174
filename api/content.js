// File: api/content.js
// Vercel Serverless Function (Bypass Vercel Static Block & Render Raw GitHub Files)

export default async function handler(req, res) {
    // 1. SETUP CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. Ambil Environment Variables
    const token = process.env.GITHUB_TOKEN || '';
    const rawOwner = process.env.GITHUB_OWNER || '';
    const rawRepo = process.env.GITHUB_REPO || '';

    const owner = rawOwner.replace(/https?:\/\/github\.com\//, '').replace(/\/$/, '').split('/')[0].trim();
    let repo = rawRepo.replace(/https?:\/\/github\.com\//, '').replace(/\/$/, '').split('/').pop().trim();
    repo = repo.replace(/\.git$/, '');

    const { method } = req;
    const baseHeaders = {
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
    };

    if (!token || !owner || !repo) {
        if (req.query.raw === 'true') return res.status(500).send('Env Vars Missing');
        return res.status(200).json([{ name: "99._ERROR_LALI_DURUNG_SET_ENV.html", type: "file" }]);
    }

    // ==========================================
    // METHOD GET: EXPLORER & IFRAME RENDERER
    // ==========================================
    if (method === 'GET') {
        const folder = req.query.folder;
        const file = req.query.file;
        const targetPath = file !== undefined ? file : (folder !== undefined ? folder : '');
        const isRaw = req.query.raw === 'true'; // Cek apakah ini panggilan dari Iframe (via vercel.json)

        try {
            // Jika isRaw, kita minta data MENTAH (Bytes) dari GitHub, bukan JSON.
            const fetchHeaders = { ...baseHeaders };
            fetchHeaders['Accept'] = isRaw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json';

            const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`, {
                method: 'GET',
                headers: fetchHeaders
            });

            // --- JALUR 1: RENDER UNTUK IFRAME (HTML / MP3) ---
            if (isRaw) {
                if (!ghRes.ok) {
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    return res.status(404).send('<h2 style="color:#a1a1aa; font-family:monospace; text-align:center; margin-top:20%;">404 - Archive Data Not Found or Still Syncing</h2>');
                }

                // Ambil bytes mentah dari GitHub dan teruskan ke Vercel Iframe
                const arrayBuffer = await ghRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                if (targetPath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
                else if (targetPath.endsWith('.mp3')) res.setHeader('Content-Type', 'audio/mpeg');
                else if (targetPath.endsWith('.wav')) res.setHeader('Content-Type', 'audio/wav');
                else res.setHeader('Content-Type', 'text/plain; charset=utf-8');

                // Matikan cache supaya kalau Yaeon update, iframe langsung berubah saat di-refresh!
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                
                return res.status(200).send(buffer);
            }

            // --- JALUR 2: BACA FOLDER UNTUK MENU INDEX.HTML (JSON) ---
            if (ghRes.status === 404) return res.status(200).json([{ name: "99._ERROR_FOLDER_ORA_KETEMU.html", type: "file" }]);
            if (ghRes.status === 401) return res.status(200).json([{ name: "99._ERROR_TOKEN_GITHUB_SALAH.html", type: "file" }]);
            if (!ghRes.ok) return res.status(200).json([{ name: `99._ERROR_API_STATUS_${ghRes.status}.html`, type: "file" }]);
            
            const data = await ghRes.json();
            if (Array.isArray(data) && data.length === 0) return res.status(200).json([{ name: "99._ERROR_FOLDER_KOSONG.html", type: "file" }]);
            
            return res.status(200).json(Array.isArray(data) ? data : [data]);

        } catch (error) {
            if (isRaw) return res.status(500).send('API Connection Failed');
            return res.status(200).json([{ name: "99._ERROR_SISTEM_KONEKSI_GAGAL.html", type: "file" }]);
        }
    }

    // ==========================================
    // METHOD POST: CREATE/UPDATE (DEPLOY.HTML)
    // ==========================================
    if (method === 'POST') {
        const { path, message, content, sha, author } = req.body;
        if (!path || !content) return res.status(400).json({ message: "Bad Request" });

        const payload = { message: message || "System Director Update", content: content };
        if (sha) payload.sha = sha;
        
        // Ghost Protocol
        if (author && author.name && author.email) {
            payload.author = { name: author.name, email: author.email };
            payload.committer = { name: author.name, email: author.email };
        }

        try {
            const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                method: 'PUT',
                headers: { ...baseHeaders, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!ghRes.ok) throw new Error(`GitHub Deployment Error: ${await ghRes.text()}`);
            const data = await ghRes.json();
            return res.status(200).json({ message: "Deploy successful", sha: data.content.sha, url: data.commit.html_url });

        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // ==========================================
    // METHOD DELETE (DEPLOY.HTML)
    // ==========================================
    if (method === 'DELETE') {
        const { path, message, sha, author } = req.body;
        if (!path || !sha) return res.status(400).json({ message: "Bad Request" });

        const payload = { message: message || "System Director Deletion", sha: sha };
        if (author && author.name && author.email) {
            payload.author = { name: author.name, email: author.email };
            payload.committer = { name: author.name, email: author.email };
        }

        try {
            const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                method: 'DELETE',
                headers: { ...baseHeaders, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!ghRes.ok) throw new Error(`GitHub Deletion Error: ${await ghRes.text()}`);
            return res.status(200).json({ message: "Deletion successful" });

        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    return res.status(405).json({ message: "Method Not Allowed" });
}

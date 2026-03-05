// File: api/content.js
// Vercel Serverless Function (Kanggo nyambungke menyang GitHub API, Bypass CORS)

export default async function handler(req, res) {
    // 1. NGATUR CORS (Penting banget ben index.html ora di-block karo browser)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Njupuk Environment Variables seko Vercel
    const token = process.env.GITHUB_TOKEN || '';
    const rawOwner = process.env.GITHUB_OWNER || '';
    const rawRepo = process.env.GITHUB_REPO || '';

    // Ngresiki jeneng owner lan repo menawa wae sampeyan ke-paste link lengkap 
    const owner = rawOwner.replace(/https?:\/\/github\.com\//, '').replace(/\/$/, '').split('/')[0].trim();
    let repo = rawRepo.replace(/https?:\/\/github\.com\//, '').replace(/\/$/, '').split('/').pop().trim();
    repo = repo.replace(/\.git$/, '');

    const { method } = req;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };

    // Yen Env Vars kosong (Biasane amarga lali REDEPLOY ing Vercel sawise ngisi)
    if (!token || !owner || !repo) {
        return res.status(200).json([{
            name: "99._ERROR_LALI_DURUNG_SET_ENV_UTAWA_DURUNG_REDEPLOY_VERCEL.html",
            type: "file"
        }]);
    }

    // ==========================================
    // METHOD GET: BACA DIRECTORY / FILE CONTENT
    // Dipake karo index.html LAN deploy.html
    // ==========================================
    if (method === 'GET') {
        const folder = req.query.folder;
        const file = req.query.file;
        
        let targetPath = '';
        if (file !== undefined) {
            targetPath = file;
        } else if (folder !== undefined) {
            targetPath = folder;
        }

        try {
            const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`, {
                method: 'GET',
                headers: headers
            });

            // 💡 CARA PINTER KANGGO DEBUG TANPA NGRUSAK INDEX.HTML 💡
            if (ghRes.status === 404) {
                return res.status(200).json([{
                    name: "99._ERROR_REPO_UTAWA_FOLDER_KUIS_ORA_KETEMU_NANG_GITHUB.html",
                    type: "file"
                }]);
            }

            if (ghRes.status === 401) {
                return res.status(200).json([{
                    name: "99._ERROR_TOKEN_GITHUB_SALAH_UTAWA_KADALUWARSA.html",
                    type: "file"
                }]);
            }
            
            if (!ghRes.ok) {
                return res.status(200).json([{
                    name: `99._ERROR_API_GITHUB_STATUS_${ghRes.status}.html`,
                    type: "file"
                }]);
            }
            
            const data = await ghRes.json();
            
            // 🚀 FITUR BYPASS 404 VERCEL: Merender HTML/MP3 LIVE dari GitHub ke Iframe
            if (req.query.raw === 'true') {
                if (!Array.isArray(data) && data.type === 'file' && data.download_url) {
                    // Ambil file mentah langsung dari GitHub API
                    const rawRes = await fetch(data.download_url, { headers });
                    const arrayBuffer = await rawRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    // Set tipe header supaya Iframe browser bisa memproses HTML atau Audio
                    if (targetPath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    else if (targetPath.endsWith('.mp3')) res.setHeader('Content-Type', 'audio/mpeg');
                    else if (targetPath.endsWith('.wav')) res.setHeader('Content-Type', 'audio/wav');
                    else res.setHeader('Content-Type', 'text/plain; charset=utf-8');

                    // Matikan cache Vercel supaya perubahan dari Yaeon langsung tampil detik itu juga
                    res.setHeader('Cache-Control', 'no-store, max-age=0');
                    return res.status(200).send(buffer);
                } else {
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    return res.status(404).send('<h1 style="color:red; font-family:monospace; text-align:center; margin-top:20%;">404 - Live File Not Found in GitHub</h1>');
                }
            }

            // Yen data wujude array lan kosong
            if (Array.isArray(data) && data.length === 0) {
                 return res.status(200).json([{
                    name: "99._ERROR_FOLDER_ISI_KOSONG_DURUNG_ANA_FILE.html",
                    type: "file"
                }]);
            }

            return res.status(200).json(Array.isArray(data) ? data : [data]);

        } catch (error) {
            return res.status(200).json([{
                name: "99._ERROR_SISTEM_KONEKSI_GAGAL.html",
                type: "file"
            }]);
        }
    }

    // ==========================================
    // METHOD POST: GAWE ATAU UPDATE FILE
    // Dipake karo deploy.html (System Director)
    // ==========================================
    if (method === 'POST') {
        const { path, message, content, sha, author } = req.body;

        if (!path || !content) {
            return res.status(400).json({ message: "Bad Request: 'path' and 'content' are required." });
        }

        const payload = {
            message: message || "System Director Update",
            content: content
        };

        if (sha) payload.sha = sha;
        
        // GHOST PROTOCOL (Opsi Sir Yaeon)
        if (author && author.name && author.email) {
            payload.author = { name: author.name, email: author.email };
            payload.committer = { name: author.name, email: author.email };
        }

        try {
            const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!ghRes.ok) throw new Error(`GitHub Deployment Error: ${await ghRes.text()}`);
            
            const data = await ghRes.json();
            return res.status(200).json({ 
                message: "Deploy successful", 
                sha: data.content.sha, 
                url: data.commit.html_url 
            });

        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // ==========================================
    // METHOD DELETE: Mbusak FILE PERMANEN
    // Dipake karo deploy.html (System Director)
    // ==========================================
    if (method === 'DELETE') {
        const { path, message, sha, author } = req.body;

        if (!path || !sha) {
            return res.status(400).json({ message: "Bad Request: 'path' and 'sha' are required." });
        }

        const payload = {
            message: message || "System Director Deletion",
            sha: sha
        };

        // GHOST PROTOCOL (Opsi Sir Yaeon)
        if (author && author.name && author.email) {
            payload.author = { name: author.name, email: author.email };
            payload.committer = { name: author.name, email: author.email };
        }

        try {
            const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                method: 'DELETE',
                headers: { ...headers, 'Content-Type': 'application/json' },
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

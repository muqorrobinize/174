// File: api/content.js
// Vercel Serverless Function (Menjembatani GitHub API, Bypass CORS & Hide Token)

export default async function handler(req, res) {
    // 1. SETTING CORS (Sangat Penting agar index.html tidak di-block oleh browser)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Ambil Environment Variables dari Vercel
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    // Jika Env Vars kosong (Biasanya karena lupa REDEPLOY di Vercel setelah setting Env)
    if (!token || !owner || !repo) {
        return res.status(500).json({ 
            message: "FATAL ERROR: Environment Variables are missing. PLEASE REDEPLOY YOUR VERCEL PROJECT." 
        });
    }

    const { method } = req;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };

    // ==========================================
    // METHOD GET: BACA DIRECTORY / FILE CONTENT
    // Dipakai oleh index.html DAN deploy.html
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

            // 🔥 FIX UTAMA UNTUK INDEX.HTML 🔥
            // Jika repo masih kosong / folder belum ada, GitHub akan melempar 404.
            // Jangan lempar 404 ke index.html karena akan membuatnya CRASH. 
            // Kita kembalikan array kosong [] saja (Status 200).
            if (ghRes.status === 404) {
                return res.status(200).json([]);
            }
            
            if (!ghRes.ok) throw new Error(`GitHub API Error: ${await ghRes.text()}`);
            
            const data = await ghRes.json();
            return res.status(200).json(data);

        } catch (error) {
            // Walaupun ada error internal, kembalikan array kosong untuk MENCEGAH index.html crash.
            console.error("Fetch Error:", error.message);
            return res.status(200).json([]);
        }
    }

    // ==========================================
    // METHOD POST: CREATE OR UPDATE FILE
    // Dipakai oleh deploy.html (System Director)
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
    // METHOD DELETE: HAPUS FILE PERMANEN
    // Dipakai oleh deploy.html (System Director)
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

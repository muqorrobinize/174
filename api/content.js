// File: api/content.js
// Vercel Serverless Function untuk menjembatani GitHub API (Bypass CORS & Hide Token)

export default async function handler(req, res) {
    // 1. Ambil Environment Variables dari Vercel
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    // Keamanan Dasar: Cek apakah env variables sudah di-set
    if (!token || !owner || !repo) {
        return res.status(500).json({ 
            message: "FATAL ERROR: Environment Variables (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO) are missing in Vercel settings." 
        });
    }

    const { method } = req;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };

    // ==========================================
    // METHOD GET: READ DIRECTORY OR FILE CONTENT
    // Dipakai oleh index.html DAN deploy.html
    // ==========================================
    if (method === 'GET') {
        // Mendukung dua query string: ?folder=... ATAU ?file=...
        const folder = req.query.folder;
        const file = req.query.file;
        
        // Tentukan path target, jika root akan menjadi string kosong ('')
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

            // Handle khusus 404 agar UI frontend bisa merespon dengan elegan
            if (ghRes.status === 404) {
                return res.status(404).json({ message: "File or directory not found/empty." });
            }
            
            if (!ghRes.ok) throw new Error(`GitHub API Error: ${await ghRes.text()}`);
            
            const data = await ghRes.json();
            
            // index.html mengharapkan array balikan dari endpoint ini saat query folder.
            // GitHub API secara otomatis mengembalikan array jika targetPath adalah direktori.
            return res.status(200).json(data);

        } catch (error) {
            return res.status(500).json({ message: error.message });
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

        // Jika ada SHA, ini adalah operasi UPDATE
        if (sha) payload.sha = sha;
        
        // GHOST PROTOCOL: Memanipulasi identitas commit (opsi Sir Yaeon)
        if (author && author.name && author.email) {
            payload.author = {
                name: author.name,
                email: author.email
            };
            // committer bisa di-set sama dengan author agar benar-benar tersamarkan
            payload.committer = {
                name: author.name,
                email: author.email
            };
        }

        try {
            // GitHub API mewajibkan method PUT untuk create/update contents
            const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
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
            return res.status(400).json({ message: "Bad Request: 'path' and 'sha' are required to delete a file." });
        }

        const payload = {
            message: message || "System Director Deletion",
            sha: sha
        };

        // GHOST PROTOCOL (untuk commit penghapusan file)
        if (author && author.name && author.email) {
            payload.author = { name: author.name, email: author.email };
            payload.committer = { name: author.name, email: author.email };
        }

        try {
            const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                method: 'DELETE',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!ghRes.ok) throw new Error(`GitHub Deletion Error: ${await ghRes.text()}`);
            
            const data = await ghRes.json();
            return res.status(200).json({ message: "Deletion successful" });

        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // Tolak request selain GET, POST, dan DELETE
    return res.status(405).json({ message: "Method Not Allowed" });
}

import { whitelist } from './whitelist.js';

export default function handler(req, res) {
  // Setup CORS agar frontend bisa akses
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request (Opsional, tapi bagus untuk stabilitas)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Alamat wallet tidak ditemukan.' });
    }

    // Normalisasi: Ubah ke huruf kecil untuk EVM agar pencocokan akurat
    // (Solana case-sensitive, jadi biarkan apa adanya jika bukan 0x)
    const checkAddress = address.startsWith('0x') ? address.toLowerCase() : address;
    
    // LOGIKA UTAMA: Cek apakah ada di file whitelist.js
    // Kita lakukan map lowerCase juga ke whitelist untuk memastikan
    const isAllowed = whitelist.some(w => 
        w.startsWith('0x') ? w.toLowerCase() === checkAddress : w === checkAddress
    );

    if (isAllowed) {
      return res.status(200).json({ 
        message: 'Akses Diterima', 
        access: true 
      });
    } else {
      return res.status(401).json({ 
        error: 'Maaf, alamat Anda tidak terdaftar di whitelist kami.', 
        access: false 
      });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}

export default function handler(req, res) {
  // === RAHASIA: DAFTAR WALLET HANYA ADA DI SINI ===
  // Orang tidak bisa intip ini lewat browser (Inspect Element)
  const ALLOWED_WALLETS = [
      "0x918dfeea08756ccb0bd045108883d8f89013f215".toLowerCase(), 
      "YourSolanaAddressHere"
  ];

  if (req.method === 'POST') {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Mana alamatnya bro?' });
    }

    const isAllowed = ALLOWED_WALLETS.includes(address.toLowerCase());

    if (isAllowed) {
      return res.status(200).json({ message: 'Welcome fam!', access: true });
    } else {
      return res.status(401).json({ error: 'You are not whitelisted.', access: false });
    }
  }

  // Handle metode lain (GET, dll)
  res.status(405).json({ error: 'Method not allowed' });
}

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Default Initial Data
const INITIAL_CATEGORIES = [
  { id: 'instagram', name: 'Instagram', icon: 'ri-instagram-line' },
  { id: 'tiktok', name: 'TikTok', icon: 'ri-tiktok-line' },
  { id: 'youtube', name: 'YouTube', icon: 'ri-youtube-line' },
  { id: 'facebook', name: 'Facebook', icon: 'ri-facebook-circle-line' },
  { id: 'twitter', name: 'Twitter / X', icon: 'ri-twitter-x-line' },
  { id: 'telegram', name: 'Telegram', icon: 'ri-telegram-line' }
];

const INITIAL_SERVICES = [
  {
    id: 'ig-fol-1',
    category: 'instagram',
    name: 'Instagram Followers Server HQ [Refill 30 Hari]',
    min: 100,
    max: 100000,
    pricePer1k: 12500,
    description: 'Followers Akun Campuran Kualitas Tinggi, Proses Cepat, Bergaransi Refill 30 Hari.'
  },
  {
    id: 'ig-like-1',
    category: 'instagram',
    name: 'Instagram Likes Real HQ [Instant]',
    min: 50,
    max: 50000,
    pricePer1k: 4500,
    description: 'Likes Instant Real HQ, Start 0-5 menit, Maksimal 50k per postingan.'
  },
  {
    id: 'ig-view-1',
    category: 'instagram',
    name: 'Instagram Video / Reels Views [Super Fast]',
    min: 500,
    max: 1000000,
    pricePer1k: 1500,
    description: 'Views Reels/Video super cepat, membantu postingan masuk Explore.'
  },
  {
    id: 'tt-fol-1',
    category: 'tiktok',
    name: 'TikTok Followers Indonesia Real [Garansi]',
    min: 100,
    max: 50000,
    pricePer1k: 24000,
    description: 'Followers akun berbobot, cocok untuk syarat live streaming TikTok.'
  },
  {
    id: 'tt-like-1',
    category: 'tiktok',
    name: 'TikTok Likes Video HQ [Instant]',
    min: 100,
    max: 100000,
    pricePer1k: 5500,
    description: 'Meningkatkan interaksi video FYP dengan cepat dan aman.'
  },
  {
    id: 'tt-view-1',
    category: 'tiktok',
    name: 'TikTok Views FYP Booster [Speed 100k/Jam]',
    min: 1000,
    max: 10000000,
    pricePer1k: 800,
    description: 'Tingkatkan viewers FYP dalam hitungan menit.'
  },
  {
    id: 'yt-sub-1',
    category: 'youtube',
    name: 'YouTube Subscribers [Non Drop - Garansi Refill]',
    min: 50,
    max: 20000,
    pricePer1k: 145000,
    description: 'Subscribers kualitas premium, aman untuk syarat monetisasi YouTube.'
  },
  {
    id: 'yt-view-1',
    category: 'youtube',
    name: 'YouTube Views Monetizable High Retention',
    min: 500,
    max: 500000,
    pricePer1k: 28000,
    description: 'Retention tontonan tinggi, aman untuk syarat jam tayang & monet.'
  },
  {
    id: 'tele-mem-1',
    category: 'telegram',
    name: 'Telegram Channel / Group Members HQ',
    min: 100,
    max: 50000,
    pricePer1k: 15000,
    description: 'Tambah anggota channel/group Telegram aktif dan stabil.'
  }
];

const INITIAL_PAYMENTS = [
  {
    id: 'qris',
    name: 'QRIS All Payment (Gopay/Dana/OVO/BCA/ShopeePay)',
    type: 'qris',
    accountNumber: 'SCAN_QR_IMAGE',
    accountName: 'NUSA SMM STORE',
    qrImage: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021126570011ID.DANA.WWW01189360091800000000005204581253033605802ID5914NUSASMM_PAY6007JAKARTA6304C29B',
    minDeposit: 5000,
    instruction: 'Scan kode QRIS menggunakan aplikasi E-Wallet atau M-Banking apapun. Masukkan nominal tepat, lalu transfer. Simpan bukti transfer untuk konfirmasi.'
  },
  {
    id: 'dana',
    name: 'DANA E-Wallet',
    type: 'ewallet',
    accountNumber: '085812345678',
    accountName: 'Admin SMM Official',
    qrImage: null,
    minDeposit: 5000,
    instruction: 'Transfer ke nomor DANA di atas. Cantumkan Username kamu pada catatan transfer jika memungkinkan.'
  },
  {
    id: 'gopay',
    name: 'GoPay E-Wallet',
    type: 'ewallet',
    accountNumber: '085812345678',
    accountName: 'Admin SMM Official',
    qrImage: null,
    minDeposit: 5000,
    instruction: 'Transfer ke nomor GoPay di atas. Simpan bukti transfer untuk verifikasi.'
  },
  {
    id: 'bca',
    name: 'Bank BCA',
    type: 'bank',
    accountNumber: '8735019281',
    accountName: 'PT NUSA SMM DIGITAL',
    qrImage: null,
    minDeposit: 10000,
    instruction: 'Transfer ke nomor Rekening BCA di atas. Pastikan nominal sesuai dengan tiket topup.'
  }
];

function getDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      users: [
        {
          id: 'user_admin',
          username: process.env.ADMIN_USERNAME || 'admin',
          password: process.env.ADMIN_PASSWORD || 'admin123',
          fullName: 'Super Administrator',
          role: 'admin',
          balance: 10000000,
          createdAt: new Date().toISOString()
        },
        {
          id: 'user_demo',
          username: 'demo_user',
          password: 'password123',
          fullName: 'Demo Member',
          role: 'member',
          balance: 50000,
          createdAt: new Date().toISOString()
        }
      ],
      categories: INITIAL_CATEGORIES,
      services: INITIAL_SERVICES,
      payments: INITIAL_PAYMENTS,
      orders: [
        {
          id: 'ORD-1001',
          userId: 'user_demo',
          username: 'demo_user',
          serviceId: 'ig-fol-1',
          serviceName: 'Instagram Followers Server HQ [Refill 30 Hari]',
          target: 'https://instagram.com/official_demo',
          quantity: 1000,
          price: 12500,
          status: 'Success',
          remains: 0,
          startCount: 1420,
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
        }
      ],
      topups: [
        {
          id: 'DEP-5001',
          userId: 'user_demo',
          username: 'demo_user',
          paymentMethod: 'QRIS All Payment',
          amount: 50000,
          uniqueCode: 124,
          totalPay: 50124,
          proofUrl: '',
          notes: 'Top up demo member saldo awal',
          status: 'Approved',
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          approvedAt: new Date(Date.now() - 3600000 * 23).toISOString()
        }
      ],
      announcements: [
        {
          id: 'ann-1',
          title: 'Selamat Datang di SMM Panel Official!',
          content: '🔥 PROMO SPESIAL: Gunakan Kode Voucher DISKON50 untuk potongan 50%! Layanan Instagram, TikTok & YouTube kini makin cepat dan bergaransi refill!',
          date: new Date().toISOString()
        }
      ],
      vouchers: [
        {
          code: 'DISKON50',
          type: 'percent',
          discount: 50,
          maxDiscount: 10000,
          minOrder: 5000,
          usageLimit: 100,
          usedCount: 2,
          isActive: true
        },
        {
          code: 'PROMO10K',
          type: 'fixed',
          discount: 10000,
          maxDiscount: 10000,
          minOrder: 20000,
          usageLimit: 50,
          usedCount: 0,
          isActive: true
        },
        {
          code: 'NUSANEW',
          type: 'percent',
          discount: 25,
          maxDiscount: 15000,
          minOrder: 5000,
          usageLimit: 500,
          usedCount: 12,
          isActive: true
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!data.vouchers) {
      data.vouchers = [
        {
          code: 'DISKON50',
          type: 'percent',
          discount: 50,
          maxDiscount: 10000,
          minOrder: 5000,
          usageLimit: 100,
          usedCount: 0,
          isActive: true
        },
        {
          code: 'PROMO10K',
          type: 'fixed',
          discount: 10000,
          maxDiscount: 10000,
          minOrder: 20000,
          usageLimit: 50,
          usedCount: 0,
          isActive: true
        },
        {
          code: 'NUSANEW',
          type: 'percent',
          discount: 25,
          maxDiscount: 15000,
          minOrder: 5000,
          usageLimit: 500,
          usedCount: 0,
          isActive: true
        }
      ];
      saveDB(data);
    }
    return data;
  } catch (err) {
    return { users: [], services: [], orders: [], topups: [], announcements: [], payments: [] };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ---------------- API ENDPOINTS ----------------

// 1. Auth Register
app.post('/api/auth/register', (req, res) => {
  const { username, password, fullName } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan Password wajib diisi!' });
  }

  const db = getDB();
  const exists = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ success: false, message: 'Username sudah terdaftar! Gunakan username lain.' });
  }

  const newUser = {
    id: 'usr_' + Date.now(),
    username: username.trim(),
    password: password.trim(),
    fullName: fullName ? fullName.trim() : username.trim(),
    role: 'member',
    balance: 0,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDB(db);

  const { password: _, ...userSafe } = newUser;
  return res.json({ success: true, message: 'Pendaftaran berhasil! Silakan login.', user: userSafe });
});

// 2. Auth Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi!' });
  }

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password.trim());

  if (!user) {
    return res.status(401).json({ success: false, message: 'Username atau Password salah!' });
  }

  const { password: _, ...userSafe } = user;
  return res.json({
    success: true,
    message: `Selamat datang kembali, ${user.fullName || user.username}!`,
    user: userSafe
  });
});

// 3. User Profile / Sync Saldo
app.get('/api/user/profile', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu.' });
  }

  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
  }

  const { password: _, ...userSafe } = user;
  return res.json({ success: true, user: userSafe });
});

// 4. Get Services & Categories
app.get('/api/services', (req, res) => {
  const db = getDB();
  res.json({
    success: true,
    categories: db.categories || INITIAL_CATEGORIES,
    services: db.services || INITIAL_SERVICES,
    announcements: db.announcements || []
  });
});

// 5. Get Payment Methods (Untuk Top Up)
app.get('/api/payments', (req, res) => {
  const db = getDB();
  res.json({
    success: true,
    payments: db.payments || INITIAL_PAYMENTS
  });
});

// 5b. Check / Apply Voucher
app.post('/api/voucher/check', (req, res) => {
  const { code, amount } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Kode voucher harus diisi!' });
  }

  const db = getDB();
  const vouchers = db.vouchers || [];
  const v = vouchers.find(item => item.code.toUpperCase() === code.trim().toUpperCase() && item.isActive);

  if (!v) {
    return res.status(404).json({ success: false, message: 'Kode voucher tidak valid atau sudah tidak aktif!' });
  }

  if (v.usageLimit && v.usedCount >= v.usageLimit) {
    return res.status(400).json({ success: false, message: 'Kuota penggunaan voucher ini sudah habis!' });
  }

  const orderAmount = Number(amount) || 0;
  if (orderAmount < v.minOrder) {
    return res.status(400).json({ success: false, message: `Minimal transaksi untuk voucher ini adalah Rp ${v.minOrder.toLocaleString()}` });
  }

  let discountAmount = 0;
  if (v.type === 'percent') {
    discountAmount = Math.round((orderAmount * v.discount) / 100);
    if (v.maxDiscount && discountAmount > v.maxDiscount) {
      discountAmount = v.maxDiscount;
    }
  } else {
    discountAmount = v.discount;
  }

  if (discountAmount > orderAmount) {
    discountAmount = orderAmount;
  }

  return res.json({
    success: true,
    message: `Voucher ${v.code} berhasil diterapkan! Hemat Rp ${discountAmount.toLocaleString()}`,
    voucher: {
      code: v.code,
      discountAmount: discountAmount,
      finalAmount: orderAmount - discountAmount
    }
  });
});

// 6. Create SMM Order
app.post('/api/orders/new', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { serviceId, target, quantity, voucherCode } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Silakan login!' });
  }

  if (!serviceId || !target || !quantity || Number(quantity) <= 0) {
    return res.status(400).json({ success: false, message: 'Semua field order (Layanan, Target, Jumlah) wajib diisi!' });
  }

  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
  }

  const service = (db.services || []).find(s => s.id === serviceId);
  if (!service) {
    return res.status(404).json({ success: false, message: 'Layanan tidak ditemukan!' });
  }

  const qty = parseInt(quantity, 10);
  if (qty < service.min) {
    return res.status(400).json({ success: false, message: `Jumlah pesanan minimal ${service.min.toLocaleString()}!` });
  }
  if (qty > service.max) {
    return res.status(400).json({ success: false, message: `Jumlah pesanan maksimal ${service.max.toLocaleString()}!` });
  }

  // Hitung harga normal
  const rawPrice = Math.ceil((qty / 1000) * service.pricePer1k);
  let finalPrice = rawPrice;
  let discountUsed = 0;
  let appliedVoucher = null;

  // Cek Voucher jika ada
  if (voucherCode) {
    const v = (db.vouchers || []).find(item => item.code.toUpperCase() === voucherCode.trim().toUpperCase() && item.isActive);
    if (v && (!v.usageLimit || v.usedCount < v.usageLimit) && rawPrice >= v.minOrder) {
      if (v.type === 'percent') {
        discountUsed = Math.round((rawPrice * v.discount) / 100);
        if (v.maxDiscount && discountUsed > v.maxDiscount) discountUsed = v.maxDiscount;
      } else {
        discountUsed = v.discount;
      }
      if (discountUsed > rawPrice) discountUsed = rawPrice;
      finalPrice = rawPrice - discountUsed;
      v.usedCount = (v.usedCount || 0) + 1;
      appliedVoucher = v.code;
    }
  }

  if (user.balance < finalPrice) {
    return res.status(400).json({
      success: false,
      message: `Saldo tidak mencukupi! Total biaya Rp ${finalPrice.toLocaleString()}, saldo Anda Rp ${user.balance.toLocaleString()}. Silakan lakukan Top Up Saldo.`
    });
  }

  // Kurangi saldo
  user.balance -= finalPrice;

  const newOrder = {
    id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
    userId: user.id,
    username: user.username,
    serviceId: service.id,
    serviceName: service.name,
    target: target.trim(),
    quantity: qty,
    rawPrice: rawPrice,
    discount: discountUsed,
    voucherCode: appliedVoucher,
    price: finalPrice,
    status: 'Processing',
    remains: qty,
    startCount: Math.floor(10 + Math.random() * 500),
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(newOrder);
  saveDB(db);

  return res.json({
    success: true,
    message: 'Pesanan berhasil dibuat dan sedang diproses sistem!',
    order: newOrder,
    newBalance: user.balance
  });
});

// 7. Get Order History User
app.get('/api/orders/history', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Silakan login.' });
  }

  const db = getDB();
  const userOrders = (db.orders || []).filter(o => o.userId === userId);
  return res.json({ success: true, orders: userOrders });
});

// 8. Create Top Up Manual Request
app.post('/api/topup/request', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { paymentId, amount, notes, proofUrl } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Silakan login.' });
  }

  const depAmount = parseInt(amount, 10);
  if (isNaN(depAmount) || depAmount < 5000) {
    return res.status(400).json({ success: false, message: 'Minimal deposit adalah Rp 5.000!' });
  }

  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
  }

  const paymentMethod = (db.payments || []).find(p => p.id === paymentId) || { name: 'QRIS All Payment' };
  const uniqueCode = Math.floor(10 + Math.random() * 890); // 3 digit unik
  const totalPay = depAmount + uniqueCode;

  const newTopup = {
    id: 'DEP-' + Math.floor(100000 + Math.random() * 900000),
    userId: user.id,
    username: user.username,
    paymentMethod: paymentMethod.name,
    amount: depAmount,
    uniqueCode: uniqueCode,
    totalPay: totalPay,
    proofUrl: proofUrl || '',
    notes: notes || '',
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  db.topups.unshift(newTopup);
  saveDB(db);

  return res.json({
    success: true,
    message: 'Permintaan deposit berhasil dibuat! Silakan lakukan transfer sesuai total bayar.',
    topup: newTopup
  });
});

// 9. Upload Proof of Transfer for Top Up
app.post('/api/topup/upload-proof', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { topupId, proofUrl } = req.body;

  if (!userId || !topupId || !proofUrl) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap!' });
  }

  const db = getDB();
  const topup = (db.topups || []).find(t => t.id === topupId && t.userId === userId);
  if (!topup) {
    return res.status(404).json({ success: false, message: 'Data deposit tidak ditemukan!' });
  }

  topup.proofUrl = proofUrl;
  saveDB(db);

  return res.json({ success: true, message: 'Bukti transfer berhasil diperbarui! Admin akan segera memverifikasi.', topup });
});

// 10. User Topup History
app.get('/api/topup/history', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Silakan login.' });
  }

  const db = getDB();
  const userTopups = (db.topups || []).filter(t => t.userId === userId);
  return res.json({ success: true, topups: userTopups });
});

// 11. Live Chat - Send Message (User / Guest / Admin)
app.post('/api/chat/send', (req, res) => {
  const { senderId, senderName, message, role } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong!' });
  }

  const db = getDB();
  db.chats = db.chats || [];

  const chatMsg = {
    id: 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    senderId: senderId || 'guest_' + req.ip.replace(/[^a-zA-Z0-9]/g, ''),
    senderName: senderName || 'Pengunjung',
    role: role || 'member', // 'member' | 'admin' | 'guest'
    message: message.trim(),
    createdAt: new Date().toISOString()
  };

  db.chats.push(chatMsg);
  // Simpan maksimal 300 pesan terakhir
  if (db.chats.length > 300) {
    db.chats = db.chats.slice(-300);
  }

  saveDB(db);
  return res.json({ success: true, chat: chatMsg });
});

// 12. Live Chat - Get Messages
app.get('/api/chat/messages', (req, res) => {
  const db = getDB();
  res.json({
    success: true,
    chats: db.chats || []
  });
});

// ---------------- ADMIN ENDPOINTS ----------------

function checkAdmin(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Akses ditolak!' });
  }
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses khusus Administrator!' });
  }
  req.adminUser = user;
  next();
}

// Admin Stats
app.get('/api/admin/stats', checkAdmin, (req, res) => {
  const db = getDB();
  const totalUsers = db.users.length;
  const totalOrders = db.orders.length;
  const totalDeposit = (db.topups || [])
    .filter(t => t.status === 'Approved')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const pendingDepositCount = (db.topups || []).filter(t => t.status === 'Pending').length;

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalOrders,
      totalDeposit,
      pendingDepositCount
    },
    users: db.users.map(({ password, ...u }) => u),
    orders: db.orders,
    topups: db.topups,
    services: db.services,
    payments: db.payments,
    vouchers: db.vouchers || []
  });
});

// Admin Approve / Reject Topup
app.post('/api/admin/topup/action', checkAdmin, (req, res) => {
  const { topupId, action } = req.body; // action: 'approve' | 'reject'
  if (!topupId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Aksi tidak valid!' });
  }

  const db = getDB();
  const topup = db.topups.find(t => t.id === topupId);
  if (!topup) {
    return res.status(404).json({ success: false, message: 'Tiket top up tidak ditemukan!' });
  }

  if (topup.status !== 'Pending') {
    return res.status(400).json({ success: false, message: `Tiket ini sudah berstatus ${topup.status}` });
  }

  if (action === 'approve') {
    topup.status = 'Approved';
    topup.approvedAt = new Date().toISOString();
    
    // Tambah saldo ke user
    const targetUser = db.users.find(u => u.id === topup.userId);
    if (targetUser) {
      targetUser.balance += topup.amount;
    }
  } else {
    topup.status = 'Rejected';
    topup.rejectedAt = new Date().toISOString();
  }

  saveDB(db);
  return res.json({ success: true, message: `Status deposit berhasil diubah menjadi ${topup.status}!`, topup });
});

// Admin Update Order Status
app.post('/api/admin/order/update-status', checkAdmin, (req, res) => {
  const { orderId, status } = req.body;
  const db = getDB();
  const order = db.orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order tidak ditemukan!' });
  }

  order.status = status;
  if (status === 'Success') order.remains = 0;
  saveDB(db);

  return res.json({ success: true, message: `Status order berhasil diubah menjadi ${status}!`, order });
});

// Admin Update User Balance Manual
app.post('/api/admin/user/set-balance', checkAdmin, (req, res) => {
  const { targetUserId, newBalance } = req.body;
  const db = getDB();
  const targetUser = db.users.find(u => u.id === targetUserId);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan!' });
  }

  targetUser.balance = parseInt(newBalance, 10) || 0;
  saveDB(db);

  return res.json({ success: true, message: `Saldo ${targetUser.username} berhasil diubah menjadi Rp ${targetUser.balance.toLocaleString()}` });
});

// Admin Add / Edit Service
app.post('/api/admin/services/save', checkAdmin, (req, res) => {
  const { id, category, name, min, max, pricePer1k, description } = req.body;
  if (!category || !name || !min || !max || !pricePer1k) {
    return res.status(400).json({ success: false, message: 'Mohon lengkapi field layanan!' });
  }

  const db = getDB();
  db.services = db.services || [];

  if (id) {
    const idx = db.services.findIndex(s => s.id === id);
    if (idx !== -1) {
      db.services[idx] = { ...db.services[idx], category, name, min: Number(min), max: Number(max), pricePer1k: Number(pricePer1k), description };
    }
  } else {
    const newService = {
      id: 'srv-' + Date.now(),
      category,
      name,
      min: Number(min),
      max: Number(max),
      pricePer1k: Number(pricePer1k),
      description: description || ''
    };
    db.services.push(newService);
  }

  saveDB(db);
  return res.json({ success: true, message: 'Layanan berhasil disimpan!' });
});

// Admin Delete Service
app.post('/api/admin/services/delete', checkAdmin, (req, res) => {
  const { id } = req.body;
  const db = getDB();
  db.services = (db.services || []).filter(s => s.id !== id);
  saveDB(db);
  return res.json({ success: true, message: 'Layanan berhasil dihapus!' });
});

// Admin Update Broadcast Announcement
app.post('/api/admin/announcement/save', checkAdmin, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'Isi teks broadcast tidak boleh kosong!' });
  }

  const db = getDB();
  db.announcements = [
    {
      id: 'ann-' + Date.now(),
      title: 'Info Pengumuman Resmi',
      content: content.trim(),
      date: new Date().toISOString()
    }
  ];

  saveDB(db);
  return res.json({ success: true, message: 'Teks broadcast berhasil diperbarui!', announcement: db.announcements[0] });
});

// Admin Add / Edit Voucher
app.post('/api/admin/vouchers/save', checkAdmin, (req, res) => {
  const { code, type, discount, maxDiscount, minOrder, usageLimit, isActive } = req.body;
  if (!code || !discount) {
    return res.status(400).json({ success: false, message: 'Kode voucher dan nominal diskon wajib diisi!' });
  }

  const db = getDB();
  db.vouchers = db.vouchers || [];
  const upperCode = code.trim().toUpperCase();

  const idx = db.vouchers.findIndex(v => v.code.toUpperCase() === upperCode);
  const voucherData = {
    code: upperCode,
    type: type || 'percent',
    discount: Number(discount),
    maxDiscount: Number(maxDiscount) || 0,
    minOrder: Number(minOrder) || 0,
    usageLimit: Number(usageLimit) || 0,
    usedCount: idx !== -1 ? db.vouchers[idx].usedCount : 0,
    isActive: isActive !== undefined ? isActive : true
  };

  if (idx !== -1) {
    db.vouchers[idx] = voucherData;
  } else {
    db.vouchers.push(voucherData);
  }

  saveDB(db);
  return res.json({ success: true, message: 'Voucher berhasil disimpan!' });
});

// Admin Delete Voucher
app.post('/api/admin/vouchers/delete', checkAdmin, (req, res) => {
  const { code } = req.body;
  const db = getDB();
  db.vouchers = (db.vouchers || []).filter(v => v.code.toUpperCase() !== (code || '').toUpperCase());
  saveDB(db);
  return res.json({ success: true, message: 'Voucher berhasil dihapus!' });
});

// Admin Update Payment Method
app.post('/api/admin/payments/save', checkAdmin, (req, res) => {
  const { id, name, accountNumber, accountName, qrImage, instruction } = req.body;
  const db = getDB();
  const item = (db.payments || []).find(p => p.id === id);
  if (item) {
    item.name = name;
    item.accountNumber = accountNumber;
    item.accountName = accountName;
    item.qrImage = qrImage;
    item.instruction = instruction;
    saveDB(db);
    return res.json({ success: true, message: 'Pengaturan pembayaran diperbarui!' });
  }
  return res.status(404).json({ success: false, message: 'Metode pembayaran tidak ditemukan!' });
});

// Fallback Route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 SMM Panel Server berjalan di http://localhost:${PORT}`);
});

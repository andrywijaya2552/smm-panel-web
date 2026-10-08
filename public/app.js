// SMM Panel Client Application State
let currentUser = null;
let currentServices = [];
let currentCategories = [];
let currentPayments = [];

// Initialize on Load (Immediate init + DOM listener)
function initApp() {
  initUserSession();
  setupEventListeners();
  loadServicesAndCategories();
  loadPaymentMethods();

  if (currentUser) {
    refreshUserProfile();
    loadUserOrders();
    loadUserTopups();
    if (currentUser.role === 'admin') {
      loadAdminData();
    }
  }

  // Start background chat polling
  fetchChatMessages();
  setInterval(fetchChatMessages, 4000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Event Listeners
function setupEventListeners() {
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
      userDropdown.classList.add('hidden');
    });
  }
}

// Session Handler
function initUserSession() {
  const stored = localStorage.getItem('smm_user');
  if (stored) {
    try {
      currentUser = JSON.parse(stored);
      updateAuthUI();
    } catch (e) {
      localStorage.removeItem('smm_user');
    }
  } else {
    updateAuthUI();
  }
}

function updateAuthUI() {
  const navUser = document.getElementById('nav-user-section');
  const navGuest = document.getElementById('nav-guest-section');
  const tabAdmin = document.getElementById('tabBtn-admin');
  const adminDropdownLink = document.getElementById('adminDropdownLink');

  if (currentUser) {
    navGuest.classList.add('hidden');
    navUser.classList.remove('hidden');
    navUser.classList.add('flex');

    document.getElementById('userNameText').innerText = currentUser.username;
    document.getElementById('userAvatarText').innerText = (currentUser.username || 'U')[0].toUpperCase();
    document.getElementById('user-balance-text').innerText = formatRupiah(currentUser.balance || 0);

    if (currentUser.role === 'admin') {
      document.getElementById('userRoleBadge').classList.remove('hidden');
      tabAdmin.classList.remove('hidden');
      adminDropdownLink.classList.remove('hidden');
    } else {
      document.getElementById('userRoleBadge').classList.add('hidden');
      tabAdmin.classList.add('hidden');
      adminDropdownLink.classList.add('hidden');
    }
  } else {
    navUser.classList.add('hidden');
    navUser.classList.remove('flex');
    navGuest.classList.remove('hidden');
    tabAdmin.classList.add('hidden');
    adminDropdownLink.classList.add('hidden');
  }
}

// API Sync Profile
async function refreshUserProfile() {
  if (!currentUser) return;
  try {
    const res = await fetch('/api/user/profile', {
      headers: { 'x-user-id': currentUser.id }
    });
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      localStorage.setItem('smm_user', JSON.stringify(currentUser));
      updateAuthUI();
    }
  } catch (err) {
    console.error('Error refresh profile:', err);
  }
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-link').forEach(el => {
    el.classList.remove('bg-indigo-600', 'text-white');
    el.classList.add('text-gray-400');
  });

  const target = document.getElementById(`tab-${tabId}`);
  const targetBtn = document.getElementById(`tabBtn-${tabId}`);
  if (target) target.classList.remove('hidden');
  if (targetBtn && tabId !== 'admin') {
    targetBtn.classList.add('bg-indigo-600', 'text-white');
    targetBtn.classList.remove('text-gray-400');
  }

  // Refresh tab specific data
  if (tabId === 'orders-history') loadUserOrders();
  if (tabId === 'topup') loadUserTopups();
  if (tabId === 'admin') loadAdminData();
  if (tabId === 'services') renderServicesList();
}

// Select Platform from Home
function selectPlatform(platformId) {
  switchTab('order');
  const catSelect = document.getElementById('orderCategorySelect');
  if (catSelect) {
    catSelect.value = platformId;
    filterServicesByCategory();
  }
}

// Fetch Services & Categories
async function loadServicesAndCategories() {
  try {
    const res = await fetch('/api/services');
    const data = await res.json();
    if (data.success) {
      currentCategories = data.categories || [];
      currentServices = data.services || [];
      populateCategoryDropdown();
      renderServicesList();

      if (data.announcements && data.announcements.length > 0) {
        const marquee = document.getElementById('broadcastMarquee');
        const admInput = document.getElementById('admBroadcastInput');
        if (marquee) marquee.innerText = data.announcements[0].content;
        if (admInput) admInput.value = data.announcements[0].content;
      }
    }
  } catch (err) {
    console.error('Gagal mengambil data layanan:', err);
  }
}

function populateCategoryDropdown() {
  const catSelect = document.getElementById('orderCategorySelect');
  if (!catSelect) return;
  catSelect.innerHTML = '<option value="">-- Pilih Kategori --</option>';
  currentCategories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    catSelect.appendChild(opt);
  });
}

function filterServicesByCategory() {
  const catId = document.getElementById('orderCategorySelect').value;
  const srvSelect = document.getElementById('orderServiceSelect');
  srvSelect.innerHTML = '<option value="">-- Pilih Layanan --</option>';

  const filtered = currentServices.filter(s => !catId || s.category === catId);
  filtered.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.name} - Rp ${s.pricePer1k.toLocaleString()} / 1k`;
    srvSelect.appendChild(opt);
  });

  handleServiceSelectChange();
}

function handleServiceSelectChange() {
  const srvId = document.getElementById('orderServiceSelect').value;
  const infoBox = document.getElementById('serviceInfoBox');
  const srv = currentServices.find(s => s.id === srvId);

  if (!srv) {
    infoBox.classList.add('hidden');
    calculateOrderPrice();
    return;
  }

  infoBox.classList.remove('hidden');
  document.getElementById('infoPricePer1k').innerText = `Harga per 1.000: Rp ${srv.pricePer1k.toLocaleString()}`;
  document.getElementById('infoMinMax').innerText = `Min: ${srv.min.toLocaleString()} | Max: ${srv.max.toLocaleString()}`;
  document.getElementById('infoDescription').innerText = srv.description || 'Tidak ada catatan tambahan untuk layanan ini.';
  calculateOrderPrice();
}

let appliedVoucherData = null;

function calculateOrderPrice() {
  const srvId = document.getElementById('orderServiceSelect').value;
  const qty = parseInt(document.getElementById('orderQuantity').value, 10) || 0;
  const srv = currentServices.find(s => s.id === srvId);
  const totalElem = document.getElementById('orderTotalPriceText');
  const rawElem = document.getElementById('orderRawPriceText');
  const discRow = document.getElementById('voucherDiscountRow');
  const discElem = document.getElementById('orderDiscountText');

  if (!srv || qty <= 0) {
    if (rawElem) rawElem.innerText = 'Rp 0';
    totalElem.innerText = 'Rp 0';
    if (discRow) discRow.classList.add('hidden');
    appliedVoucherData = null;
    return;
  }

  const rawPrice = Math.ceil((qty / 1000) * srv.pricePer1k);
  if (rawElem) rawElem.innerText = formatRupiah(rawPrice);

  if (appliedVoucherData) {
    const finalPrice = Math.max(0, rawPrice - appliedVoucherData.discountAmount);
    if (discRow) {
      discRow.classList.remove('hidden');
      discRow.classList.add('flex');
      discElem.innerText = `- ${formatRupiah(appliedVoucherData.discountAmount)}`;
    }
    totalElem.innerText = formatRupiah(finalPrice);
  } else {
    if (discRow) discRow.classList.add('hidden');
    totalElem.innerText = formatRupiah(rawPrice);
  }
}

// Apply Voucher Button Handler
async function applyVoucher() {
  const code = (document.getElementById('orderVoucherInput')?.value || '').trim();
  const srvId = document.getElementById('orderServiceSelect').value;
  const qty = parseInt(document.getElementById('orderQuantity').value, 10) || 0;
  const srv = currentServices.find(s => s.id === srvId);
  const msgElem = document.getElementById('voucherStatusMsg');

  if (!code) {
    showToast('Masukkan kode voucher terlebih dahulu!', 'warning');
    return;
  }
  if (!srv || qty <= 0) {
    showToast('Pilih layanan dan isi jumlah pesanan terlebih dahulu!', 'warning');
    return;
  }

  const rawPrice = Math.ceil((qty / 1000) * srv.pricePer1k);

  try {
    const res = await fetch('/api/voucher/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, amount: rawPrice })
    });
    const data = await res.json();

    if (data.success && data.voucher) {
      appliedVoucherData = data.voucher;
      msgElem.className = 'text-[11px] mt-1 text-emerald-400 font-semibold block';
      msgElem.innerText = `✓ ${data.message}`;
      showToast(data.message, 'success');
      calculateOrderPrice();
    } else {
      appliedVoucherData = null;
      msgElem.className = 'text-[11px] mt-1 text-rose-400 font-semibold block';
      msgElem.innerText = `✗ ${data.message}`;
      showToast(data.message, 'error');
      calculateOrderPrice();
    }
  } catch (err) {
    showToast('Gagal memverifikasi voucher.', 'error');
  }
}

// Submit Order
async function handleCreateOrder(e) {
  e.preventDefault();
  if (!currentUser) {
    showToast('Silakan login terlebih dahulu untuk membuat pesanan!', 'warning');
    openModal('modalLogin');
    return;
  }

  const serviceId = document.getElementById('orderServiceSelect').value;
  const target = document.getElementById('orderTarget').value.trim();
  const quantity = document.getElementById('orderQuantity').value;
  const voucherCode = appliedVoucherData ? appliedVoucherData.code : (document.getElementById('orderVoucherInput')?.value || '').trim();

  if (!serviceId) {
    showToast('Silakan pilih layanan terlebih dahulu!', 'warning');
    return;
  }

  const btn = document.getElementById('btnSubmitOrder');
  btn.disabled = true;
  btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Memproses Pesanan...';

  try {
    const res = await fetch('/api/orders/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ serviceId, target, quantity, voucherCode })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      document.getElementById('orderForm').reset();
      appliedVoucherData = null;
      const msgElem = document.getElementById('voucherStatusMsg');
      if (msgElem) msgElem.classList.add('hidden');
      handleServiceSelectChange();
      await refreshUserProfile();
      switchTab('orders-history');
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan koneksi server.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ri-check-double-line"></i> Kirim Pesanan';
  }
}

// User Orders
async function loadUserOrders() {
  if (!currentUser) return;
  const tbody = document.getElementById('userOrdersTableBody');
  try {
    const res = await fetch('/api/orders/history', {
      headers: { 'x-user-id': currentUser.id }
    });
    const data = await res.json();
    if (data.success) {
      if (!data.orders || data.orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-gray-500">Belum ada riwayat pesanan. Mulai buat pesanan di menu Pesan Layanan!</td></tr>`;
        return;
      }

      tbody.innerHTML = data.orders.map(o => {
        let badgeColor = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        if (o.status === 'Success') badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        if (o.status === 'Processing') badgeColor = 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
        if (o.status === 'Canceled') badgeColor = 'bg-red-500/20 text-red-400 border-red-500/30';

        return `
          <tr class="hover:bg-gray-800/40 transition">
            <td class="py-3 px-4 font-mono font-bold text-indigo-300 text-[11px]">${o.id}</td>
            <td class="py-3 px-4 font-semibold text-white max-w-[200px] truncate" title="${o.serviceName}">${o.serviceName}</td>
            <td class="py-3 px-4 max-w-[150px] truncate text-gray-400" title="${o.target}">
              <a href="${o.target.startsWith('http') ? o.target : '#'}" target="_blank" class="hover:text-indigo-400 underline">${o.target}</a>
            </td>
            <td class="py-3 px-4 text-center font-bold text-gray-200">${Number(o.quantity).toLocaleString()}</td>
            <td class="py-3 px-4 text-right font-bold text-emerald-400">${formatRupiah(o.price)}</td>
            <td class="py-3 px-4 text-center">
              <span class="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeColor}">
                ${o.status}
              </span>
            </td>
            <td class="py-3 px-4 text-[10px] text-gray-400">${new Date(o.createdAt).toLocaleString('id-ID')}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error load orders:', err);
  }
}

// Payment Methods & Topup
async function loadPaymentMethods() {
  try {
    const res = await fetch('/api/payments');
    const data = await res.json();
    if (data.success) {
      currentPayments = data.payments || [];
      const sel = document.getElementById('topupPaymentSelect');
      if (sel) {
        sel.innerHTML = currentPayments.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        handlePaymentChange();
      }
    }
  } catch (err) {
    console.error('Gagal mengambil metode pembayaran:', err);
  }
}

function handlePaymentChange() {
  const selId = document.getElementById('topupPaymentSelect').value;
  const p = currentPayments.find(item => item.id === selId);
  const qrContainer = document.getElementById('payQrContainer');
  const qrImg = document.getElementById('payQrImg');

  if (!p) return;
  document.getElementById('payAccName').innerText = `Atas Nama: ${p.accountName}`;
  document.getElementById('payAccNumber').innerText = `Nomor/Akun: ${p.accountNumber}`;
  document.getElementById('payInstructionText').innerText = p.instruction || '';

  if (p.qrImage) {
    qrContainer.classList.remove('hidden');
    qrImg.src = p.qrImage;
  } else {
    qrContainer.classList.add('hidden');
  }
}

async function handleRequestTopup(e) {
  e.preventDefault();
  if (!currentUser) {
    showToast('Silakan login terlebih dahulu untuk deposit!', 'warning');
    openModal('modalLogin');
    return;
  }

  const paymentId = document.getElementById('topupPaymentSelect').value;
  const amount = document.getElementById('topupAmount').value;
  const notes = document.getElementById('topupNotes').value;

  try {
    const res = await fetch('/api/topup/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ paymentId, amount, notes })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      document.getElementById('topupForm').reset();
      handlePaymentChange();
      loadUserTopups();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal membuat tiket deposit.', 'error');
  }
}

async function loadUserTopups() {
  if (!currentUser) return;
  const container = document.getElementById('topupListContainer');
  try {
    const res = await fetch('/api/topup/history', {
      headers: { 'x-user-id': currentUser.id }
    });
    const data = await res.json();
    if (data.success) {
      if (!data.topups || data.topups.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 text-xs py-10">Belum ada riwayat deposit.</p>`;
        return;
      }

      container.innerHTML = data.topups.map(t => {
        let badge = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        if (t.status === 'Approved') badge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        if (t.status === 'Rejected') badge = 'bg-red-500/20 text-red-400 border-red-500/30';

        return `
          <div class="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 text-xs space-y-2">
            <div class="flex justify-between items-center">
              <span class="font-mono font-bold text-indigo-300">${t.id}</span>
              <span class="px-2 py-0.5 rounded-full font-bold text-[10px] border ${badge}">${t.status}</span>
            </div>
            <div class="flex justify-between items-center text-gray-300">
              <span>Metode: ${t.paymentMethod}</span>
              <span class="font-bold text-white">Nominal: ${formatRupiah(t.amount)}</span>
            </div>
            <div class="flex justify-between items-center bg-gray-800/60 p-2 rounded-lg">
              <span class="text-gray-400 text-[11px]">Total Ditransfer (Kode Unik):</span>
              <span class="font-mono font-black text-emerald-400 text-sm">${formatRupiah(t.totalPay)}</span>
            </div>
            ${t.status === 'Pending' ? `
              <div class="flex justify-between items-center pt-1">
                <span class="text-[10px] text-amber-400 italic">Menunggu konfirmasi admin</span>
                <button onclick="openProofModal('${t.id}')" class="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-[10px] font-semibold transition">
                  <i class="ri-upload-2-line mr-1"></i> ${t.proofUrl ? 'Ubah Bukti' : 'Upload Bukti'}
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error load topup:', err);
  }
}

// Proof Upload
function openProofModal(topupId) {
  document.getElementById('proofTopupId').value = topupId;
  openModal('modalUploadProof');
}

async function handleSaveProof(e) {
  e.preventDefault();
  const topupId = document.getElementById('proofTopupId').value;
  const proofUrl = document.getElementById('proofUrlInput').value.trim();

  try {
    const res = await fetch('/api/topup/upload-proof', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ topupId, proofUrl })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeModal('modalUploadProof');
      document.getElementById('proofUrlInput').value = '';
      loadUserTopups();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal mengirim bukti transfer.', 'error');
  }
}

// Render Services Table
function renderServicesList() {
  const tbody = document.getElementById('servicesListTableBody');
  const search = (document.getElementById('searchServiceInput')?.value || '').toLowerCase();
  if (!tbody) return;

  const filtered = currentServices.filter(s => s.name.toLowerCase().includes(search) || s.category.toLowerCase().includes(search));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-gray-500">Tidak ada layanan yang cocok dengan pencarian.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    return `
      <tr class="hover:bg-gray-800/40 transition">
        <td class="py-2.5 px-4 font-mono text-gray-400 text-[11px]">${s.id}</td>
        <td class="py-2.5 px-4">
          <span class="capitalize px-2 py-0.5 rounded-lg bg-gray-800 text-gray-300 text-[11px] font-medium">${s.category}</span>
        </td>
        <td class="py-2.5 px-4 font-semibold text-white max-w-xs truncate">${s.name}</td>
        <td class="py-2.5 px-4 text-right font-bold text-emerald-400">${formatRupiah(s.pricePer1k)}</td>
        <td class="py-2.5 px-4 text-center text-gray-400">${s.min.toLocaleString()} / ${s.max.toLocaleString()}</td>
        <td class="py-2.5 px-4 text-center">
          <button onclick="orderThisService('${s.category}', '${s.id}')" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold transition">
            Pesan
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function orderThisService(category, serviceId) {
  switchTab('order');
  const catSelect = document.getElementById('orderCategorySelect');
  if (catSelect) {
    catSelect.value = category;
    filterServicesByCategory();
    const srvSelect = document.getElementById('orderServiceSelect');
    if (srvSelect) {
      srvSelect.value = serviceId;
      handleServiceSelectChange();
    }
  }
}

// ----------------- ADMIN PANEL LOGIC -----------------

function switchAdminSubTab(subTabId) {
  document.querySelectorAll('.admin-subcontent').forEach(el => el.classList.add('hidden'));
  ['adm-topups', 'adm-orders', 'adm-services', 'adm-vouchers', 'adm-chats', 'adm-broadcast', 'adm-users'].forEach(id => {
    const btn = document.getElementById(`admSubBtn-${id}`);
    if (btn) {
      btn.classList.remove('bg-gray-800', 'text-white', 'border-t-2', 'border-indigo-500');
      btn.classList.add('text-gray-400');
    }
  });

  const activeTab = document.getElementById(`admSubTab-${subTabId}`);
  const activeBtn = document.getElementById(`admSubBtn-${subTabId}`);
  if (activeTab) activeTab.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.add('bg-gray-800', 'text-white', 'border-t-2', 'border-indigo-500');
    activeBtn.classList.remove('text-gray-400');
  }
}

async function loadAdminData() {
  if (!currentUser || currentUser.role !== 'admin') return;

  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'x-user-id': currentUser.id }
    });
    const data = await res.json();
    if (data.success) {
      // Stats
      document.getElementById('admStatUsers').innerText = data.stats.totalUsers;
      document.getElementById('admStatOrders').innerText = data.stats.totalOrders;
      document.getElementById('admStatDeposit').innerText = formatRupiah(data.stats.totalDeposit);
      document.getElementById('admStatPendingDep').innerText = data.stats.pendingDepositCount;

      renderAdminTopups(data.topups || []);
      renderAdminOrders(data.orders || []);
      renderAdminServices(data.services || []);
      renderAdminVouchers(data.vouchers || []);
      renderAdminUsers(data.users || []);
    }
  } catch (err) {
    console.error('Error load admin data:', err);
  }
}

function renderAdminTopups(topups) {
  const tbody = document.getElementById('admTopupTableBody');
  if (!tbody) return;
  if (topups.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-gray-500">Tidak ada data tiket deposit.</td></tr>`;
    return;
  }

  tbody.innerHTML = topups.map(t => {
    return `
      <tr class="hover:bg-gray-800/40 transition">
        <td class="py-2.5 px-3 font-mono font-bold text-indigo-300 text-[11px]">${t.id}</td>
        <td class="py-2.5 px-3 font-bold text-white">${t.username}</td>
        <td class="py-2.5 px-3 text-gray-300">${t.paymentMethod}</td>
        <td class="py-2.5 px-3 font-mono font-bold text-emerald-400">${formatRupiah(t.totalPay)}</td>
        <td class="py-2.5 px-3">
          ${t.proofUrl ? `<a href="${t.proofUrl}" target="_blank" class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold underline"><i class="ri-image-line mr-1"></i>Lihat Bukti</a>` : '<span class="text-gray-500 text-[10px]">Belum diupload</span>'}
        </td>
        <td class="py-2.5 px-3 text-center">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' : (t.status === 'Rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400')}">
            ${t.status}
          </span>
        </td>
        <td class="py-2.5 px-3 text-center">
          ${t.status === 'Pending' ? `
            <div class="flex justify-center space-x-1.5">
              <button onclick="adminActionTopup('${t.id}', 'approve')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold">Approve</button>
              <button onclick="adminActionTopup('${t.id}', 'reject')" class="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold">Reject</button>
            </div>
          ` : `<span class="text-gray-500 text-[10px]">Selesai</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

async function adminActionTopup(topupId, action) {
  if (!confirm(`Yakin ingin ${action.toUpperCase()} deposit tiket ${topupId}?`)) return;
  try {
    const res = await fetch('/api/admin/topup/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ topupId, action })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadAdminData();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal memproses aksi admin.', 'error');
  }
}

function renderAdminOrders(orders) {
  const tbody = document.getElementById('admOrdersTableBody');
  if (!tbody) return;
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-gray-500">Belum ada order pengguna.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    return `
      <tr class="hover:bg-gray-800/40 transition">
        <td class="py-2 px-3 font-mono text-[11px] font-bold text-indigo-300">${o.id}</td>
        <td class="py-2 px-3 font-bold text-gray-200">${o.username}</td>
        <td class="py-2 px-3 max-w-[180px] truncate text-white" title="${o.serviceName}">${o.serviceName}</td>
        <td class="py-2 px-3 max-w-[120px] truncate text-gray-400">${o.target}</td>
        <td class="py-2 px-3 font-bold text-gray-200">${Number(o.quantity).toLocaleString()}</td>
        <td class="py-2 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${o.status === 'Success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}">${o.status}</span>
        </td>
        <td class="py-2 px-3 text-center">
          <select onchange="adminUpdateOrderStatus('${o.id}', this.value)" class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[10px] text-white">
            <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
            <option value="Success" ${o.status === 'Success' ? 'selected' : ''}>Success</option>
            <option value="Canceled" ${o.status === 'Canceled' ? 'selected' : ''}>Canceled</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

async function adminUpdateOrderStatus(orderId, status) {
  try {
    const res = await fetch('/api/admin/order/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ orderId, status })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadAdminData();
    }
  } catch (err) {
    showToast('Gagal update status order.', 'error');
  }
}

function renderAdminServices(services) {
  const tbody = document.getElementById('admServicesTableBody');
  if (!tbody) return;

  tbody.innerHTML = services.map(s => {
    return `
      <tr class="hover:bg-gray-800/40 transition">
        <td class="py-2 px-3 capitalize font-semibold text-gray-400">${s.category}</td>
        <td class="py-2 px-3 font-bold text-white">${s.name}</td>
        <td class="py-2 px-3 font-bold text-emerald-400">${formatRupiah(s.pricePer1k)}</td>
        <td class="py-2 px-3 text-gray-400">${s.min} / ${s.max}</td>
        <td class="py-2 px-3 text-center space-x-1">
          <button onclick="editAdminService('${s.id}')" class="px-2 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded text-[10px]">Edit</button>
          <button onclick="deleteAdminService('${s.id}')" class="px-2 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-[10px]">Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddServiceModal() {
  document.getElementById('modalServiceTitle').innerText = 'Tambah Layanan Baru';
  document.getElementById('adminSrvId').value = '';
  document.getElementById('adminSrvName').value = '';
  document.getElementById('adminSrvMin').value = '100';
  document.getElementById('adminSrvMax').value = '50000';
  document.getElementById('adminSrvPrice').value = '';
  document.getElementById('adminSrvDesc').value = '';
  openModal('modalAdminService');
}

function editAdminService(srvId) {
  const s = currentServices.find(item => item.id === srvId);
  if (!s) return;
  document.getElementById('modalServiceTitle').innerText = 'Edit Layanan';
  document.getElementById('adminSrvId').value = s.id;
  document.getElementById('adminSrvCategory').value = s.category;
  document.getElementById('adminSrvName').value = s.name;
  document.getElementById('adminSrvMin').value = s.min;
  document.getElementById('adminSrvMax').value = s.max;
  document.getElementById('adminSrvPrice').value = s.pricePer1k;
  document.getElementById('adminSrvDesc').value = s.description || '';
  openModal('modalAdminService');
}

async function handleSaveAdminService(e) {
  e.preventDefault();
  const id = document.getElementById('adminSrvId').value;
  const category = document.getElementById('adminSrvCategory').value;
  const name = document.getElementById('adminSrvName').value.trim();
  const min = document.getElementById('adminSrvMin').value;
  const max = document.getElementById('adminSrvMax').value;
  const pricePer1k = document.getElementById('adminSrvPrice').value;
  const description = document.getElementById('adminSrvDesc').value.trim();

  try {
    const res = await fetch('/api/admin/services/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ id, category, name, min, max, pricePer1k, description })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeModal('modalAdminService');
      await loadServicesAndCategories();
      loadAdminData();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menyimpan layanan.', 'error');
  }
}

async function deleteAdminService(id) {
  if (!confirm('Yakin ingin menghapus layanan ini?')) return;
  try {
    const res = await fetch('/api/admin/services/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      await loadServicesAndCategories();
      loadAdminData();
    }
  } catch (err) {
    showToast('Gagal menghapus layanan.', 'error');
  }
}

// Voucher Management (Admin)
function renderAdminVouchers(vouchers) {
  const tbody = document.getElementById('admVouchersTableBody');
  if (!tbody) return;
  if (vouchers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-gray-500">Belum ada kode voucher promo.</td></tr>`;
    return;
  }

  tbody.innerHTML = vouchers.map(v => {
    const discLabel = v.type === 'percent' ? `${v.discount}%` : formatRupiah(v.discount);
    const maxLabel = v.maxDiscount ? formatRupiah(v.maxDiscount) : 'Tanpa batas';
    const limitLabel = v.usageLimit ? `${v.usedCount} / ${v.usageLimit}` : `${v.usedCount} / ∞`;
    return `
      <tr class="hover:bg-gray-800/40 transition">
        <td class="py-2 px-3 font-mono font-bold text-indigo-300">${v.code}</td>
        <td class="py-2 px-3 font-semibold text-white">${discLabel}</td>
        <td class="py-2 px-3 text-gray-300">${maxLabel}</td>
        <td class="py-2 px-3 text-gray-300">${formatRupiah(v.minOrder || 0)}</td>
        <td class="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">${limitLabel}</td>
        <td class="py-2 px-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}">
            ${v.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </td>
        <td class="py-2 px-3 text-center">
          <button onclick="deleteAdminVoucher('${v.code}')" class="px-2 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-[10px]">Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddVoucherModal() {
  document.getElementById('modalVoucherTitle').innerText = 'Tambah Voucher Promo Baru';
  document.getElementById('adminVouchCode').value = '';
  document.getElementById('adminVouchDiscount').value = '';
  document.getElementById('adminVouchMaxDisc').value = '';
  document.getElementById('adminVouchMinOrder').value = '5000';
  document.getElementById('adminVouchLimit').value = '100';
  openModal('modalAdminVoucher');
}

async function handleSaveAdminVoucher(e) {
  e.preventDefault();
  const code = document.getElementById('adminVouchCode').value.trim();
  const type = document.getElementById('adminVouchType').value;
  const discount = document.getElementById('adminVouchDiscount').value;
  const maxDiscount = document.getElementById('adminVouchMaxDisc').value;
  const minOrder = document.getElementById('adminVouchMinOrder').value;
  const usageLimit = document.getElementById('adminVouchLimit').value;
  const isActive = document.getElementById('adminVouchActive').value === 'true';

  try {
    const res = await fetch('/api/admin/vouchers/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ code, type, discount, maxDiscount, minOrder, usageLimit, isActive })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeModal('modalAdminVoucher');
      loadAdminData();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menyimpan voucher.', 'error');
  }
}

async function deleteAdminVoucher(code) {
  if (!confirm(`Yakin ingin menghapus voucher ${code}?`)) return;
  try {
    const res = await fetch('/api/admin/vouchers/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadAdminData();
    }
  } catch (err) {
    showToast('Gagal menghapus voucher.', 'error');
  }
}

async function handleSaveBroadcast(e) {
  e.preventDefault();
  const content = document.getElementById('admBroadcastInput').value.trim();
  if (!content) return;

  try {
    const res = await fetch('/api/admin/announcement/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      const marquee = document.getElementById('broadcastMarquee');
      if (marquee) marquee.innerText = content;
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menyimpan broadcast.', 'error');
  }
}

function renderAdminUsers(users) {
  const tbody = document.getElementById('admUsersTableBody');
  if (!tbody) return;

  tbody.innerHTML = users.map(u => {
    return `
      <tr class="hover:bg-gray-800/40 transition">
        <td class="py-2.5 px-3 font-mono text-[10px] text-gray-500">${u.id}</td>
        <td class="py-2.5 px-3 font-bold text-white">${u.username}</td>
        <td class="py-2.5 px-3 text-gray-300">${u.fullName || '-'}</td>
        <td class="py-2.5 px-3 font-bold ${u.role === 'admin' ? 'text-amber-400' : 'text-gray-400'} uppercase text-[10px]">${u.role}</td>
        <td class="py-2.5 px-3 font-bold text-emerald-400">${formatRupiah(u.balance || 0)}</td>
        <td class="py-2.5 px-3 text-center">
          <button onclick="promptSetBalance('${u.id}', '${u.username}', ${u.balance || 0})" class="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded text-[10px] font-semibold transition">
            Set Saldo
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function promptSetBalance(userId, username, currentBal) {
  const newBal = prompt(`Masukkan jumlah saldo baru untuk user @${username}:`, currentBal);
  if (newBal === null || isNaN(newBal)) return;

  try {
    const res = await fetch('/api/admin/user/set-balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id
      },
      body: JSON.stringify({ targetUserId: userId, newBalance: newBal })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadAdminData();
    }
  } catch (err) {
    showToast('Gagal mengubah saldo user.', 'error');
  }
}

// ----------------- LIVE CHAT SUPPORT -----------------
let chatPollingInterval = null;
let lastChatCount = 0;
let isChatOpen = false;

function toggleChatBox() {
  const box = document.getElementById('chatBoxWindow');
  const icon = document.getElementById('chatBtnIcon');
  const badge = document.getElementById('chatUnreadBadge');

  isChatOpen = !isChatOpen;
  if (isChatOpen) {
    box.classList.remove('hidden');
    icon.className = 'ri-close-line text-2xl';
    badge.classList.add('hidden');
    fetchChatMessages();
    if (!chatPollingInterval) {
      chatPollingInterval = setInterval(fetchChatMessages, 3000);
    }
  } else {
    box.classList.add('hidden');
    icon.className = 'ri-message-3-fill text-2xl';
  }
}

async function fetchChatMessages() {
  try {
    const res = await fetch('/api/chat/messages');
    const data = await res.json();
    if (data.success) {
      const chats = data.chats || [];
      renderChatMessages(chats);
      renderAdminChatMessages(chats);

      if (!isChatOpen && chats.length > lastChatCount && lastChatCount > 0) {
        const badge = document.getElementById('chatUnreadBadge');
        if (badge) {
          badge.innerText = chats.length - lastChatCount;
          badge.classList.remove('hidden');
        }
      }
      lastChatCount = chats.length;
    }
  } catch (e) {
    console.error('Error polling chats:', e);
  }
}

function renderChatMessages(chats) {
  const container = document.getElementById('chatMessagesContainer');
  if (!container) return;

  const myId = currentUser ? currentUser.id : getGuestId();

  container.innerHTML = chats.map(c => {
    const isMe = (c.senderId === myId) || (currentUser && currentUser.role === 'admin' && c.role === 'admin');
    const isAdmin = c.role === 'admin';

    return `
      <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
        <div class="flex items-center gap-1 text-[10px] text-gray-400 mb-0.5">
          <span class="font-bold ${isAdmin ? 'text-amber-400' : 'text-gray-300'}">${c.senderName} ${isAdmin ? '🛡️ (Admin)' : ''}</span>
          <span>• ${new Date(c.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="max-w-[80%] px-3 py-2 rounded-2xl text-xs break-words shadow-sm ${
          isMe 
            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-none' 
            : (isAdmin ? 'bg-amber-950/50 border border-amber-500/40 text-amber-100 rounded-tl-none' : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700/60')
        }">
          ${c.message}
        </div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function renderAdminChatMessages(chats) {
  const container = document.getElementById('admChatMessagesContainer');
  if (!container) return;

  container.innerHTML = chats.map(c => {
    const isAdmin = c.role === 'admin';
    return `
      <div class="p-2.5 rounded-xl border ${isAdmin ? 'bg-indigo-950/40 border-indigo-500/30' : 'bg-gray-800/80 border-gray-700/60'}">
        <div class="flex justify-between items-center mb-1">
          <span class="font-bold text-[11px] ${isAdmin ? 'text-indigo-400' : 'text-amber-400'}">
            ${c.senderName} ${isAdmin ? '(Admin)' : `[ID: ${c.senderId}]`}
          </span>
          <span class="text-[10px] text-gray-400 font-mono">${new Date(c.createdAt).toLocaleString('id-ID')}</span>
        </div>
        <p class="text-gray-200 text-xs">${c.message}</p>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function getGuestId() {
  let guestId = localStorage.getItem('smm_guest_id');
  if (!guestId) {
    guestId = 'gst_' + Math.floor(100000 + Math.random() * 900000);
    localStorage.setItem('smm_guest_id', guestId);
  }
  return guestId;
}

async function handleSendLiveChat(e) {
  e.preventDefault();
  const input = document.getElementById('chatMessageInput');
  const msg = input.value.trim();
  if (!msg) return;

  const senderId = currentUser ? currentUser.id : getGuestId();
  const guestName = document.getElementById('guestChatNameInput')?.value.trim();
  const senderName = currentUser ? (currentUser.fullName || currentUser.username) : (guestName || 'Pengunjung');
  const role = currentUser ? (currentUser.role || 'member') : 'guest';

  input.value = '';

  try {
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId, senderName, message: msg, role })
    });
    const data = await res.json();
    if (data.success) {
      fetchChatMessages();
    }
  } catch (err) {
    showToast('Gagal mengirim chat support.', 'error');
  }
}

async function handleSendAdminChat(e) {
  e.preventDefault();
  const input = document.getElementById('admChatMessageInput');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';

  try {
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: currentUser.id,
        senderName: 'Admin NusaSMM Support',
        message: msg,
        role: 'admin'
      })
    });
    const data = await res.json();
    if (data.success) {
      fetchChatMessages();
    }
  } catch (err) {
    showToast('Gagal membalas chat.', 'error');
  }
}

// ----------------- AUTH HANDLERS -----------------

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('smm_user', JSON.stringify(currentUser));
      updateAuthUI();
      closeModal('modalLogin');
      showToast(data.message, 'success');
      loadUserOrders();
      loadUserTopups();
      if (currentUser.role === 'admin') loadAdminData();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Koneksi login bermasalah.', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const fullName = document.getElementById('regFullName').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value.trim();

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      closeModal('modalRegister');
      openModal('modalLogin');
      document.getElementById('loginUsername').value = username;
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Pendaftaran gagal.', 'error');
  }
}

function logout() {
  localStorage.removeItem('smm_user');
  currentUser = null;
  updateAuthUI();
  switchTab('dashboard');
  showToast('Anda telah berhasil keluar (logout).', 'info');
}

// ----------------- UTILS & MODALS -----------------

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('hidden');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('hidden');
}

function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(number);
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const msg = document.getElementById('toastMessage');

  msg.innerText = message;
  if (type === 'success') icon.innerHTML = '<i class="ri-checkbox-circle-fill text-emerald-400"></i>';
  else if (type === 'error') icon.innerHTML = '<i class="ri-error-warning-fill text-rose-500"></i>';
  else if (type === 'warning') icon.innerHTML = '<i class="ri-alert-fill text-amber-400"></i>';
  else icon.innerHTML = '<i class="ri-information-fill text-indigo-400"></i>';

  toast.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3500);
}

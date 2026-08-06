import { auth, db, firebaseReady, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, getDocs, query, where, serverTimestamp } from './firebase.js';
document.querySelectorAll('.brand span, .login-brand b').forEach(element => element.textContent = 'singsing');
document.querySelectorAll('.profile-card span').forEach(element => element.textContent = 'singsing 회원');
document.querySelectorAll('.header-button').forEach(button => { button.textContent = '판매 상품 등록'; button.dataset.go = 'sale'; });
document.querySelectorAll('.header-button').forEach(button => button.remove());
document.querySelectorAll('.profile-button').forEach(button => { button.textContent = '👤'; button.setAttribute('aria-label', '프로필'); button.title = '프로필'; });

function addDirectInputOptions(formId) {
  const form = document.getElementById(formId);
  const selects = form.querySelectorAll('select');
  ['시장 직접 입력', '어종 직접 입력'].forEach((labelText, index) => {
    const select = selects[index];
    const option = document.createElement('option');
    option.value = '__direct__';
    option.textContent = '직접 입력';
    select.appendChild(option);
    const direct = document.createElement('input');
    direct.type = 'text';
    direct.placeholder = labelText;
    direct.hidden = true;
    direct.className = 'direct-input';
    select.parentElement.appendChild(direct);
    select.addEventListener('change', () => {
      const isDirect = select.value === '__direct__';
      direct.hidden = !isDirect;
      direct.required = isDirect;
      if (!isDirect) direct.value = '';
    });
  });
}
addDirectInputOptions('registerForm');
addDirectInputOptions('saleForm');

const salePriceInput = document.querySelectorAll('#saleForm input[type="number"]')[1];
salePriceInput.min = '0';
salePriceInput.step = '1';

const minimumOrderLabel = document.createElement('label');
minimumOrderLabel.innerHTML = '최소 주문 수량<input class="minimum-order-input" type="number" min="0.1" step="0.1" value="1" required /><small class="single-unit">kg</small>';
document.querySelector('#saleForm .primary-button').before(minimumOrderLabel);

const visualStyle = document.createElement('style');
visualStyle.textContent = `
  body, button, input, select { font-family: 'Gowun Dodum', sans-serif; }
  .home-title h1, .home-panel h2, .screen-header h2 { font-family: 'Gowun Dodum', sans-serif; font-weight: 700; letter-spacing: -1.2px; }
  .summary-card .up, .summary-card .down { color: #fff; font-weight: 800; text-shadow: 0 1px 2px #063d7266; }
  .fish-value small { font-size: 11px; font-weight: 700; }
  .fish-value .up { color: #087f72; }
  .fish-value .down { color: #b84d47; }
  .summary-card p { font-weight: 700; }
  .main-menu button { border: 1px solid #b8dfea; box-shadow: 0 4px 10px #0b5b7a12; }
  .main-menu button:not(.purchase-menu):not(.buy-menu) { background: #d8f3fc; color: #063d72; }
  .main-menu button:nth-child(2) { background: #cbeefa; }
  .main-menu button:nth-child(3) { background: #d1edf9; }
  .main-menu button:nth-child(6) { background: #c9f0ee; }
  .main-menu .menu-icon { background: #fff; color: #056fa8; box-shadow: 0 3px 7px #0a6c961f; }
  .direct-input { margin-top: 8px; background: #f4fbfe; }
  .direct-input[hidden] { display: none; }
  .minimum-order-note { color: #087f72 !important; font-weight: 700; }
  .registered-info { margin-top: 22px; padding-top: 16px; border-top: 2px solid #bcdfe9; }
  .registered-info h3 { margin: 0 0 5px; color: #063d72; font-size: 14px; }
  .user-info-row { background: #f0fbff; padding: 12px 8px; border-radius: 10px; border-bottom: 0; margin-top: 7px; }
  .user-info-value { text-align: right; }
  .user-info-value strong { display: block; color: #063d72; font-size: 14px; }
  .user-info-value div { display: flex; justify-content: flex-end; gap: 5px; margin-top: 7px; }
  .user-info-value button { border: 1px solid #b9dbe7; border-radius: 6px; background: #fff; color: #285d76; padding: 4px 7px; font-size: 10px; cursor: pointer; }
  .user-info-value button[data-cancel-info] { color: #b84d47; border-color: #edc7c2; }
  .card-actions { display: flex; align-items: center; gap: 9px; flex-shrink: 0; }
  .sale-card .card-actions > button { padding: 8px 11px; border-radius: 9px; font-weight: 700; }
  .sale-card .card-actions > button[data-sale] { background: #0877bb; box-shadow: 0 3px 7px #0877bb2e; }
  .sale-card .more-button { min-width: 34px; padding: 5px 8px !important; background: #edf7fb; color: #315e73; border: 1px solid #c9e3ed; box-shadow: none; font-size: 19px; line-height: 1; }
  .request-state { display: inline-block; padding: 7px 9px; border-radius: 8px; background: #e4f7ef; color: #087f72; font-size: 10px; font-weight: 700; white-space: nowrap; }
`;
document.head.appendChild(visualStyle);

const fishData = [
  { name: '고등어', icon: '🐟', market: '부산공동어시장', catch: 1820, catchLast: 1640, stock: 620, stockLast: 700, price: 8900, priceLast: 8500 },
  { name: '갑오징어', icon: '🦑', market: '대변항 수산시장', catch: 310, catchLast: 280, stock: 125, stockLast: 110, price: 18500, priceLast: 17200 },
  { name: '갈치', icon: '🐟', market: '부산공동어시장', catch: 780, catchLast: 850, stock: 330, stockLast: 365, price: 24000, priceLast: 22100 },
  { name: '광어', icon: '🐠', market: '민락어민활어직판장', catch: 420, catchLast: 390, stock: 190, stockLast: 175, price: 19800, priceLast: 20300 },
  { name: '우럭', icon: '🐡', market: '기장시장', catch: 240, catchLast: 260, stock: 95, stockLast: 110, price: 21500, priceLast: 20700 },
  { name: '멸치', icon: '🐟', market: '다대포수산시장', catch: 3670, catchLast: 3220, stock: 1480, stockLast: 1320, price: 6400, priceLast: 5900 }
];

const number = value => new Intl.NumberFormat('ko-KR').format(value);
const percent = (now, last) => Math.round(((now - last) / last) * 100);
const compareMarkup = (now, last) => { const change = percent(now, last); return `<small class="${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% · 작년 ${number(last)}</small>`; };

function renderData(type) {
  const config = { catch: ['catch', 'catchLast', 'kg'], stock: ['stock', 'stockLast', 'kg'], price: ['price', 'priceLast', '원/kg'] }[type];
  const [key, lastKey, unit] = config;
  const now = fishData.reduce((sum, fish) => sum + fish[key], 0);
  const last = fishData.reduce((sum, fish) => sum + fish[lastKey], 0);
  const summary = type === 'price' ? Math.round(now / fishData.length) : now;
  const summaryLast = type === 'price' ? Math.round(last / fishData.length) : last;
  document.getElementById(type === 'catch' ? 'totalCatch' : type === 'stock' ? 'totalStock' : 'averagePrice').textContent = `${number(summary)}${unit}`;
  document.querySelector(`#${type} .summary-card p`).innerHTML = `작년 같은 날 대비 <b class="${percent(summary, summaryLast) >= 0 ? 'up' : 'down'}">${percent(summary, summaryLast) >= 0 ? '+' : ''}${percent(summary, summaryLast)}%</b>`;
  document.getElementById(`${type}List`).innerHTML = fishData.map(fish => `<article class="fish-row"><span class="fish-emoji">${fish.icon}</span><div class="fish-main"><b>${fish.name}</b><small>${fish.market}</small></div><div class="fish-value"><strong>${number(fish[key])}${unit}</strong>${compareMarkup(fish[key], fish[lastKey])}</div></article>`).join('');
}

['catch', 'stock', 'price'].forEach(renderData);

function go(screen) {
  document.querySelectorAll('.app-screen').forEach(section => section.classList.remove('active'));
  document.getElementById('login').style.display = screen === 'login' ? '' : 'none';
  document.getElementById(screen).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => go(button.dataset.go)));

// 구매 요청을 모아 보는 수족관 메뉴와 화면
const aquariumButton = document.createElement('button');
aquariumButton.className = 'aquarium-menu';
aquariumButton.innerHTML = '<span class="menu-icon">🐠</span><b>수족관</b><small>내 구매 요청</small>';
aquariumButton.addEventListener('click', () => { go('aquarium'); loadAquarium(); });
document.querySelector('.main-menu').appendChild(aquariumButton);

const aquariumScreen = document.createElement('section');
aquariumScreen.id = 'aquarium';
aquariumScreen.className = 'app-screen form-screen aquarium-screen';
aquariumScreen.setAttribute('aria-label', '수족관');
aquariumScreen.innerHTML = '<div class="screen-header"><button class="back" data-go="home">‹</button><div><small>MY AQUARIUM</small><h2>수족관</h2></div><span></span></div><p class="form-intro">내가 구매 요청한 수산물을<br />한곳에서 확인할 수 있어요.</p><div id="aquariumList" class="sale-list"></div>';
document.querySelector('main').appendChild(aquariumScreen);
aquariumScreen.querySelector('[data-go="home"]').addEventListener('click', () => go('home'));

function loadAquariumBasic() {
  const target = document.getElementById('aquariumList');
  const requests = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]');
  target.innerHTML = requests.length
    ? requests.map(item => `<article class="sale-card aquarium-card"><div><b>${item.fish}</b><small>${item.market} · ${item.when}</small><strong>${item.quantity}kg · ${Number(item.price).toLocaleString('ko-KR')}원/kg</strong></div><span class="request-state">구매 요청 완료</span></article>`).join('')
    : '<p class="empty-sale">아직 구매 요청한 상품이 없습니다.</p>';
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2600);
}

async function saveHistory(type, details) {
  if (!auth.currentUser) throw new Error('not-signed-in');
  await addDoc(collection(db, 'transactions'), { uid: auth.currentUser.uid, email: auth.currentUser.email, type, details, createdAt: serverTimestamp() });
}
async function loadHistory() {
  if (!auth.currentUser) return;
  const target = document.getElementById('historyList');
  target.innerHTML = '<p class="empty-history">거래 내역을 불러오는 중입니다.</p>';
  try { const snapshot = await getDocs(query(collection(db, 'transactions'), where('uid', '==', auth.currentUser.uid))); const rows = snapshot.docs.map(doc => doc.data()).sort((a,b)=>(b.createdAt?.seconds || 0)-(a.createdAt?.seconds || 0)); target.innerHTML = rows.length ? rows.map(row => `<article class="history-item"><div><b>${row.type === 'purchase' ? '구매 신청' : '정보 등록'}</b><small>${row.details}</small></div><time>${row.createdAt ? new Date(row.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '방금 전'}</time></article>`).join('') : '<p class="empty-history">아직 거래 내역이 없습니다.</p>'; } catch { target.innerHTML = '<p class="empty-history">거래 내역을 불러오지 못했습니다.</p>'; }
}
let selectedSale = null;
async function loadSales() { const target=document.getElementById('saleList'); const rows=JSON.parse(localStorage.getItem('singsing-sales')||'[]'); target.innerHTML=rows.length?rows.map(s=>`<article class="sale-card"><div><b>${s.fish}</b><small>${s.market} · 판매자 ${s.sellerEmail}</small><strong>${s.quantity}kg · ${Number(s.price).toLocaleString('ko-KR')}원/kg</strong></div><button data-sale="${s.id}">구매 요청</button></article>`).join(''):'<p class="empty-sale">아직 판매 등록된 상품이 없습니다.</p>'; window.saleRows=rows; }
document.getElementById('saleList').addEventListener('click',e=>{if(!e.target.dataset.sale)return; selectedSale=window.saleRows.find(x=>x.id===e.target.dataset.sale); document.getElementById('selectedSale').textContent=`선택 상품: ${selectedSale.fish} · ${selectedSale.quantity}kg · ${Number(selectedSale.price).toLocaleString('ko-KR')}원/kg`; document.getElementById('purchaseForm').hidden=false; document.getElementById('purchaseForm').scrollIntoView({behavior:'smooth'});});
document.querySelector('[data-go="purchase"]').addEventListener('click',loadSales);
document.getElementById('saleForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const f = form.querySelectorAll('select,input');
  const sale = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    sellerUid: auth.currentUser?.uid || 'local-user',
    sellerEmail: auth.currentUser?.email || '시연용 판매자',
    market: f[0].value,
    fish: f[1].value,
    quantity: Number(f[2].value),
    price: Number(f[3].value)
  };
  // Firestore 데이터베이스가 아직 준비되지 않아도 시연이 멈추지 않도록
  // 먼저 이 기기의 브라우저 저장소에 즉시 보관합니다.
  const sales = JSON.parse(localStorage.getItem('singsing-sales') || '[]');
  sales.unshift(sale);
  localStorage.setItem('singsing-sales', JSON.stringify(sales));
  showToast('판매 상품이 등록되었습니다. 구매 탭에서 확인해 보세요.');
  form.reset();
  go('purchase');
  await loadSalesWithMenu();
});
// 일부 브라우저에서 기본 제출 동작이 멈추는 경우에도 같은 등록 함수를 실행합니다.
document.querySelector('#saleForm button[type="submit"]').addEventListener('click', event => {
  const form = document.getElementById('saleForm');
  if (!form.checkValidity()) return;
  event.preventDefault();
  form.dispatchEvent(new Event('submit', { cancelable: true }));
});
document.getElementById('purchaseForm').addEventListener('submit', async event => {
  event.preventDefault();
  const fields = event.currentTarget.querySelectorAll('select,input');
  try { await saveHistory('purchase',`${selectedSale.fish} · ${fields[0].value}kg · ${selectedSale.price}원/kg · ${fields[1].value}`);showToast('구매 요청이 등록되었습니다.');event.currentTarget.reset();event.currentTarget.hidden=true;}catch{showToast('로그인 후 이용해 주세요.');}
});

// 판매 목록에 점 세 개 메뉴를 붙여 등록 상품을 취소할 수 있게 합니다.
async function loadSalesWithMenu() {
  const target = document.getElementById('saleList');
  const rows = JSON.parse(localStorage.getItem('singsing-sales') || '[]');
  target.innerHTML = rows.length
    ? rows.map(s => `<article class="sale-card"><div><b>${s.fish}</b><small>${s.market} · 판매자 ${s.sellerEmail}</small><strong>${s.quantity}kg · ${Number(s.price).toLocaleString('ko-KR')}원/kg</strong></div><div class="card-actions"><button data-sale="${s.id}">구매 요청</button><button class="more-button" data-cancel-sale="${s.id}" aria-label="판매 등록 메뉴">⋯</button></div></article>`).join('')
    : '<p class="empty-sale">아직 판매 등록된 상품이 없습니다.</p>';
  window.saleRows = rows;
  target.querySelectorAll('[data-sale]').forEach(button => {
    const sale = rows.find(item => item.id === button.dataset.sale);
    const minimumOrder = sale.minimumOrder || 1;
    button.closest('.sale-card').querySelector('div').insertAdjacentHTML('beforeend', `<small class="minimum-order-note">최소 주문 ${minimumOrder}kg</small>`);
  });
  target.querySelectorAll('[data-cancel-sale]').forEach(button => button.addEventListener('click', () => {
    if (!window.confirm('취소하겠습니까?')) return;
    const updated = JSON.parse(localStorage.getItem('singsing-sales') || '[]').filter(item => item.id !== button.dataset.cancelSale);
    localStorage.setItem('singsing-sales', JSON.stringify(updated));
    showToast('판매 등록이 취소되었습니다.');
    loadSalesWithMenu();
  }));
}

// 수족관에서도 점 세 개 메뉴로 구매 요청을 취소할 수 있게 합니다.
function loadAquarium() {
  const target = document.getElementById('aquariumList');
  const requests = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]');
  target.innerHTML = requests.length
    ? requests.map(item => `<article class="sale-card aquarium-card"><div><b>${item.fish}</b><small>${item.market} · ${item.when}</small><strong>${item.quantity}kg · ${Number(item.price).toLocaleString('ko-KR')}원/kg</strong></div><div class="card-actions"><span class="request-state">구매 요청 완료</span><button class="more-button" data-cancel-request="${item.id}" aria-label="구매 요청 메뉴">⋯</button></div></article>`).join('')
    : '<p class="empty-sale">아직 구매 요청한 상품이 없습니다.</p>';
  target.querySelectorAll('[data-cancel-request]').forEach(button => button.addEventListener('click', () => {
    if (!window.confirm('취소하겠습니까?')) return;
    const updated = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]').filter(item => item.id !== button.dataset.cancelRequest);
    localStorage.setItem('singsing-purchase-requests', JSON.stringify(updated));
    showToast('구매 요청이 취소되었습니다.');
    loadAquarium();
  }));
}

document.querySelector('[data-go="purchase"]').addEventListener('click', loadSalesWithMenu);

document.getElementById('saleList').addEventListener('click', event => {
  if (!event.target.dataset.sale) return;
  const sale = window.saleRows.find(item => item.id === event.target.dataset.sale);
  if (!sale) return;
  selectedSale = sale;
  const minimumOrder = sale.minimumOrder || 1;
  document.getElementById('selectedSale').textContent = `선택 상품: ${sale.fish} · ${sale.quantity}kg · 최소 주문 ${minimumOrder}kg`;
  document.querySelector('#purchaseForm input[type="number"]').min = minimumOrder;
  document.querySelector('#purchaseForm input[type="number"]').placeholder = `최소 ${minimumOrder}kg`;
});

function selectedOrDirect(form, index) {
  const select = form.querySelectorAll('select')[index];
  const direct = form.querySelectorAll('.direct-input')[index];
  return select.value === '__direct__' ? direct.value.trim() : select.value;
}

function resetDirectInputs(form) {
  form.querySelectorAll('.direct-input').forEach(input => { input.hidden = true; input.required = false; input.value = ''; });
}

let editingInfoId = null;
let lastInfoSource = 'stock';

function renderRegisteredInfo(type) {
  const list = document.querySelector(`#${type} .fish-list`);
  if (!list) return;
  list.querySelector('.registered-info')?.remove();
  const entries = JSON.parse(localStorage.getItem('singsing-info-registrations') || '[]');
  if (!entries.length) return;
  const panel = document.createElement('section');
  panel.className = 'registered-info';
  panel.innerHTML = `<h3>내가 등록한 정보</h3>${entries.map(item => `<article class="fish-row user-info-row"><span class="fish-emoji">🐟</span><div class="fish-main"><b>${item.fish}</b><small>${item.market} · 직접 등록</small></div><div class="user-info-value"><strong>${type === 'catch' ? item.catch : item.stock}kg</strong><div><button data-edit-info="${item.id}">수정</button><button data-cancel-info="${item.id}">취소</button></div></div></article>`).join('')}`;
  list.appendChild(panel);
  panel.querySelectorAll('[data-edit-info]').forEach(button => button.addEventListener('click', () => openInfoEditor(button.dataset.editInfo)));
  panel.querySelectorAll('[data-cancel-info]').forEach(button => button.addEventListener('click', () => {
    if (!window.confirm('취소하겠습니까?')) return;
    const updated = JSON.parse(localStorage.getItem('singsing-info-registrations') || '[]').filter(item => item.id !== button.dataset.cancelInfo);
    localStorage.setItem('singsing-info-registrations', JSON.stringify(updated));
    renderRegisteredInfo('catch');
    renderRegisteredInfo('stock');
    showToast('등록한 정보가 취소되었습니다.');
  }));
}

function setSelectOrDirect(form, index, value) {
  const select = form.querySelectorAll('select')[index];
  const direct = form.querySelectorAll('.direct-input')[index];
  const matchingOption = [...select.options].find(option => option.value === value);
  if (matchingOption) {
    select.value = value;
    direct.hidden = true;
    direct.required = false;
  } else {
    select.value = '__direct__';
    direct.hidden = false;
    direct.required = true;
    direct.value = value;
  }
}

function openInfoEditor(id) {
  const entry = JSON.parse(localStorage.getItem('singsing-info-registrations') || '[]').find(item => item.id === id);
  if (!entry) return;
  const form = document.getElementById('registerForm');
  editingInfoId = id;
  setSelectOrDirect(form, 0, entry.market);
  setSelectOrDirect(form, 1, entry.fish);
  const numbers = form.querySelectorAll('input[type="number"]');
  numbers[0].value = entry.catch;
  numbers[1].value = entry.stock;
  numbers[2].value = entry.price;
  form.querySelector('.primary-button').childNodes[0].textContent = '정보 수정 완료 ';
  go('register');
}

document.querySelector('#catch .icon-button').addEventListener('click', () => { lastInfoSource = 'catch'; });
document.querySelector('#stock .icon-button').addEventListener('click', () => { lastInfoSource = 'stock'; });
document.querySelector('[data-go="catch"]').addEventListener('click', () => renderRegisteredInfo('catch'));
document.querySelector('[data-go="stock"]').addEventListener('click', () => renderRegisteredInfo('stock'));

// 정보 등록은 시연용으로 이 브라우저에 저장합니다.
const directRegisterForm = document.getElementById('registerForm');
directRegisterForm.addEventListener('submit', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  const numbers = directRegisterForm.querySelectorAll('input[type="number"]');
  const entries = JSON.parse(localStorage.getItem('singsing-info-registrations') || '[]');
  const savedEntry = {
    id: editingInfoId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    market: selectedOrDirect(directRegisterForm, 0),
    fish: selectedOrDirect(directRegisterForm, 1),
    catch: Number(numbers[0].value),
    stock: Number(numbers[1].value),
    price: Number(numbers[2].value),
    createdAt: new Date().toISOString()
  };
  if (editingInfoId) {
    const index = entries.findIndex(item => item.id === editingInfoId);
    if (index >= 0) entries[index] = savedEntry;
  } else {
    entries.unshift(savedEntry);
  }
  localStorage.setItem('singsing-info-registrations', JSON.stringify(entries));
  directRegisterForm.reset();
  resetDirectInputs(directRegisterForm);
  editingInfoId = null;
  directRegisterForm.querySelector('.primary-button').childNodes[0].textContent = '정보 등록하기 ';
  renderRegisteredInfo('catch');
  renderRegisteredInfo('stock');
  showToast('수산물 정보가 등록되었습니다.');
  go(lastInfoSource);
}, true);

// 판매 등록도 직접 입력 항목을 포함해 즉시 저장합니다.
const directSaleForm = document.getElementById('saleForm');
directSaleForm.addEventListener('submit', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  const numbers = directSaleForm.querySelectorAll('input[type="number"]');
  const sales = JSON.parse(localStorage.getItem('singsing-sales') || '[]');
  sales.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    sellerUid: auth.currentUser?.uid || 'local-user',
    sellerEmail: auth.currentUser?.email || '시연용 판매자',
    market: selectedOrDirect(directSaleForm, 0),
    fish: selectedOrDirect(directSaleForm, 1),
    quantity: Number(numbers[0].value),
    price: Number(numbers[1].value),
    minimumOrder: Number(numbers[2].value)
  });
  localStorage.setItem('singsing-sales', JSON.stringify(sales));
  directSaleForm.reset();
  resetDirectInputs(directSaleForm);
  showToast('판매 상품이 등록되었습니다. 구매 탭에서 확인해 보세요.');
  go('purchase');
  loadSalesWithMenu();
}, true);

document.getElementById('registerForm').addEventListener('submit', async event => {
  event.preventDefault();
  const fields = event.currentTarget.querySelectorAll('select,input');
  try { await saveHistory('register', `${fields[0].value} · ${fields[1].value} · 어획 ${fields[2].value}kg · 재고 ${fields[3].value}kg · ${fields[4].value}원/kg`); showToast('수산물 정보가 등록되었습니다.'); event.currentTarget.reset(); } catch { showToast('로그인 후 이용해 주세요.'); }
});

// 구매 요청은 이 기기에 즉시 저장하고, 완료 후 메인으로 돌아갑니다.
const purchaseForm = document.getElementById('purchaseForm');
purchaseForm.addEventListener('submit', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!selectedSale) return;
  const fields = purchaseForm.querySelectorAll('select,input');
  const minimumOrder = selectedSale.minimumOrder || 1;
  if (Number(fields[0].value) < minimumOrder) {
    showToast(`이 상품은 최소 ${minimumOrder}kg부터 구매할 수 있습니다.`);
    return;
  }
  const requests = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]');
  requests.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    fish: selectedSale.fish,
    market: selectedSale.market,
    price: selectedSale.price,
    quantity: Number(fields[0].value),
    when: fields[1].value
  });
  localStorage.setItem('singsing-purchase-requests', JSON.stringify(requests));
  purchaseForm.reset();
  purchaseForm.hidden = true;
  showToast('구매 요청이 완료되었습니다!');
  go('home');
}, true);

document.querySelector('#purchaseForm button[type="submit"]').addEventListener('click', event => {
  if (!purchaseForm.checkValidity()) return;
  event.preventDefault();
  purchaseForm.dispatchEvent(new Event('submit', { cancelable: true }));
});

function setProfile(id) {
  document.getElementById('profileId').textContent = id;
}

document.getElementById('loginForm').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const id = document.getElementById('loginId').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!firebaseReady) { showToast('Firebase 설정을 불러올 수 없습니다.'); return; }
  signInWithEmailAndPassword(auth, id, password).then(() => { form.reset(); go('home'); showToast('로그인되었습니다.'); }).catch(error => { const code = error?.code || ''; if (code === 'auth/invalid-email') showToast('이메일 형식을 확인해 주세요.'); else if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') showToast('가입한 이메일 또는 비밀번호가 올바르지 않습니다.'); else showToast(`로그인 오류: ${code || error?.message || '원인 확인 불가'}`); });
});

document.getElementById('signupForm').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const id = document.getElementById('signupId').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirmation = document.getElementById('signupConfirm').value;
  if (password.length < 6) { showToast('비밀번호는 6글자 이상 입력해 주세요.'); return; }
  if (password !== confirmation) { showToast('비밀번호 확인이 일치하지 않습니다.'); return; }
  createUserWithEmailAndPassword(auth, id, password).then(() => { form.reset(); go('home'); showToast('회원가입이 완료되었습니다!'); }).catch(error => { const code = error?.code || ''; if (code === 'auth/email-already-in-use') showToast('이미 가입된 이메일입니다. 로그인해 주세요.'); else if (code === 'auth/invalid-email') showToast('이메일 형식을 확인해 주세요.'); else if (code === 'auth/weak-password') showToast('비밀번호는 6글자 이상이어야 합니다.'); else if (code === 'auth/operation-not-allowed') showToast('Firebase 이메일 로그인이 아직 활성화되지 않았습니다.'); else showToast('회원가입 연결 오류입니다. 페이지를 새로고침 후 다시 시도해 주세요.'); });
});

document.getElementById('logoutButton').addEventListener('click', () => {
  signOut(auth).then(() => { setProfile('로그인 사용자'); go('login'); showToast('로그아웃되었습니다.'); });
});
if (firebaseReady) onAuthStateChanged(auth, user => { if (user) { setProfile(user.email); loadHistory(); go('home'); } });
document.querySelector('[data-go="profile"]').addEventListener('click', loadHistory);

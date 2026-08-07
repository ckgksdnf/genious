import { auth, db, firebaseReady, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, getDocs, query, where, serverTimestamp } from './firebase.js';
document.querySelectorAll('.brand span, .login-brand b').forEach(element => element.textContent = 'singsing');
document.querySelectorAll('.profile-card span').forEach(element => element.textContent = 'singsing 회원');
document.querySelectorAll('.header-button').forEach(button => { button.textContent = '판매 상품 등록'; button.dataset.go = 'sale'; });
document.querySelectorAll('.header-button').forEach(button => button.remove());
document.querySelectorAll('.profile-button').forEach(button => { button.textContent = '👤'; button.setAttribute('aria-label', '프로필'); button.title = '프로필'; });

let demoAccount = sessionStorage.getItem('singsing-demo-account') || (sessionStorage.getItem('singsing-demo-login') === 'true' ? 'buyer' : '');
let demoLoginActive = Boolean(demoAccount);
function activeUser() {
  if (auth.currentUser) return auth.currentUser;
  if (!demoLoginActive) return null;
  return demoAccount === 'seller' ? { uid: 'demo-seller', email: 'testSeller' } : { uid: 'demo-buyer', email: 'testBuyer' };
}

// 역할 분리 시연을 위해 이전 구매 요청 기록은 한 번만 초기화합니다.
if (localStorage.getItem('singsing-demo-role-reset') !== '2026080739') {
  localStorage.removeItem('singsing-purchase-requests');
  localStorage.removeItem('singsing-my-request-ids-demo-buyer');
  localStorage.removeItem('singsing-my-request-ids-demo-seller');
  localStorage.removeItem('singsing-cancellation-log-demo-buyer');
  localStorage.setItem('singsing-demo-role-reset', '2026080739');
}
if (localStorage.getItem('singsing-info-owner-migration') !== '2026080722') {
  const existingInfo = JSON.parse(localStorage.getItem('singsing-info-registrations') || '[]').map(item => ({ ...item, ownerUid: item.ownerUid || 'demo-seller' }));
  localStorage.setItem('singsing-info-registrations', JSON.stringify(existingInfo));
  localStorage.setItem('singsing-info-owner-migration', '2026080722');
}

// 발표 시 서비스 사용 모습을 보여 주기 위한 초기 등록 목록입니다.
// 기존에 직접 등록한 정보는 지우지 않고, 한 번만 함께 표시합니다.
if (localStorage.getItem('singsing-presentation-seed') !== '2026080729') {
  const seedSales = [
    ['고등어', '부산공동어시장', '남항수산', 680, 5100, 30],
    ['갈치', '자갈치시장', '자갈치바다상회', 240, 9800, 20],
    ['광어', '민락어민활어직판장', '광안활어유통', 180, 14500, 10],
    ['우럭', '신동아수산물종합시장', '동아수산', 160, 20500, 10],
    ['갑오징어', '기장시장', '기장해풍수산', 95, 17500, 5],
    ['멸치', '대변항 수산시장', '대변건어물', 420, 6800, 20],
    ['고등어', '다대포수산시장', '다대포어촌계', 350, 4950, 30],
    ['갈치', '명지시장', '명지바다상회', 125, 10200, 10],
    ['광어', '자갈치시장', '남포수산유통', 75, 15100, 5],
    ['우럭', '민락어민활어직판장', '민락활어센터', 110, 21200, 10],
    ['갑오징어', '부산공동어시장', '부산어시장중도매', 130, 16800, 10],
    ['멸치', '기장시장', '기장수산물', 260, 7200, 20],
    ['갈치', '자갈치시장', '자갈치바다상회', 55, 262130, 5, true, '오늘 마감'],
    ['고등어', '부산공동어시장', '남항수산', 80, 198040, 10, true, '내일 오전 마감']
  ].map(([fish, market, sellerEmail, quantity, price, minimumOrder, discounted = false, expires = ''], index) => ({
    id: `presentation-sale-${index + 1}`,
    sellerUid: 'demo-seller',
    sellerEmail,
    fish, market, quantity, price, minimumOrder, discounted, expires, priceType: discounted ? 'total' : 'unit'
  }));
  const seedInfo = [
    ['고등어', '부산 연안', '영도 앞바다', '부산공동어시장', 980, 320],
    ['갈치', '남해 동부 해역', '오륙도 남동쪽', '자갈치시장', 410, 145],
    ['광어', '기장 연안', '대변항 인근', '민락어민활어직판장', 220, 78],
    ['우럭', '다대포 연안', '다대포 외해', '신동아수산물종합시장', 175, 66],
    ['갑오징어', '기장 연안', '일광 앞바다', '기장시장', 126, 43],
    ['멸치', '부산 연안', '가덕도 북쪽', '대변항 수산시장', 730, 280],
    ['고등어', '남해 동부 해역', '태종대 남쪽', '다대포수산시장', 540, 195],
    ['갈치', '부산 연안', '해운대 앞바다', '명지시장', 168, 58],
    ['광어', '기장 연안', '송정 연안', '자갈치시장', 93, 34],
    ['우럭', '부산 연안', '이기대 앞바다', '민락어민활어직판장', 145, 52]
  ].map(([fish, area, operationLocation, market, catchAmount, stock], index) => ({
    id: `presentation-info-${index + 1}`,
    ownerUid: `presentation-seller-${index + 1}`,
    mode: 'catch', fish, area, operationLocation, market,
    catch: catchAmount, stock, price: 0,
    createdAt: '2026-02-26T08:00:00.000Z'
  }));
  const currentSales = JSON.parse(localStorage.getItem('singsing-sales') || '[]');
  const currentInfo = JSON.parse(localStorage.getItem('singsing-info-registrations') || '[]');
  localStorage.setItem('singsing-sales', JSON.stringify([...currentSales.filter(item => !String(item.id).startsWith('presentation-sale-')), ...seedSales]));
  localStorage.setItem('singsing-info-registrations', JSON.stringify([...currentInfo.filter(item => !String(item.id).startsWith('presentation-info-')), ...seedInfo]));
  localStorage.setItem('singsing-presentation-seed', '2026080729');
}

// 발표용 상품은 테스트 판매자 계정에서 요청·거래확정 흐름을 시연할 수 있게 연결합니다.
if (localStorage.getItem('singsing-demo-seller-ownership') !== '2026080736') {
  const sales = JSON.parse(localStorage.getItem('singsing-sales') || '[]').map(item => String(item.id).startsWith('presentation-sale-') ? { ...item, sellerUid: 'demo-seller' } : item);
  const requests = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]').map(item => String(item.saleId).startsWith('presentation-sale-') ? { ...item, sellerUid: 'demo-seller' } : item);
  localStorage.setItem('singsing-sales', JSON.stringify(sales));
  localStorage.setItem('singsing-purchase-requests', JSON.stringify(requests));
  localStorage.setItem('singsing-demo-seller-ownership', '2026080736');
}

if (localStorage.getItem('singsing-discount-total-migration') !== '2026080737') {
  const referencePrices = { 갈치: 9532, 고등어: 4951 };
  const sales = JSON.parse(localStorage.getItem('singsing-sales') || '[]').map(item => item.discounted && String(item.id).startsWith('presentation-sale-') ? { ...item, price: Math.round((referencePrices[item.fish] || 0) * Number(item.quantity) * 0.5), priceType: 'total' } : item);
  localStorage.setItem('singsing-sales', JSON.stringify(sales));
  localStorage.setItem('singsing-discount-total-migration', '2026080737');
}

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
  .integrated-stock-info { margin: 0; padding: 0; border: 0; }
  .integrated-stock-info .user-info-row { margin: 0; padding: 14px 0; border-radius: 0; border-bottom: 1px solid #d7e6ec; background: #fff; }
  .registered-info h3 { margin: 0 0 5px; color: #063d72; font-size: 14px; }
  .user-info-row { background: #f0fbff; padding: 12px 8px; border-radius: 10px; border-bottom: 0; margin-top: 7px; }
  .user-info-value { text-align: right; }
  .user-info-value strong { display: block; color: #063d72; font-size: 14px; }
  .user-info-value div { display: flex; justify-content: flex-end; gap: 5px; margin-top: 7px; }
  .user-info-value button { border: 1px solid #b9dbe7; border-radius: 6px; background: #fff; color: #285d76; padding: 4px 7px; font-size: 10px; cursor: pointer; }
  .user-info-value button[data-cancel-info] { color: #b84d47; border-color: #edc7c2; }
  .demo-login-button { display: block; width: calc(100% - 40px); margin: 12px 20px 0; padding: 12px; border: 1px solid #77bedd; border-radius: 8px; background: #e8f8ff; color: #075b89; font-size: 12px; font-weight: 700; cursor: pointer; }
  .card-actions { display: flex; align-items: center; gap: 9px; flex-shrink: 0; }
  .sale-card .card-actions > button { padding: 8px 11px; border-radius: 9px; font-weight: 700; }
  .sale-card .card-actions > button[data-sale] { background: #0877bb; box-shadow: 0 3px 7px #0877bb2e; }
  .sale-card .more-button { min-width: 34px; padding: 5px 8px !important; background: #edf7fb; color: #315e73; border: 1px solid #c9e3ed; box-shadow: none; font-size: 19px; line-height: 1; }
  .request-state { display: inline-block; padding: 7px 9px; border-radius: 8px; background: #e4f7ef; color: #087f72; font-size: 10px; font-weight: 700; white-space: nowrap; }
  .unavailable { color: #637e89 !important; font-weight: 700; }
  .stock-request-button { margin-top: 7px; border: 1px solid #76b6d2; border-radius: 7px; background: #fff; color: #075b89; padding: 5px 8px; font-size: 10px; font-weight: 700; cursor: pointer; }
  .seller-request-panel { margin: 0 20px 18px; padding: 14px; border: 1px solid #b9deea; border-radius: 12px; background: #effbff; }
  .seller-request-panel h3 { margin: 0 0 5px; color: #063d72; font-size: 14px; }
  .seller-request-panel > p { margin: 0 0 10px; color: #426c7f; font-size: 11px; }
  .seller-request-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 0; border-top: 1px solid #cce7f0; }
  .seller-request-row b, .seller-request-row small { display: block; }
  .seller-request-row small { color: #527487; font-size: 10px; margin-top: 3px; }
  .seller-request-row button { border: 0; border-radius: 8px; padding: 8px 9px; background: #0877bb; color: #fff; font-size: 10px; font-weight: 700; cursor: pointer; }
  .seller-status { margin: 16px 20px; padding: 13px; border: 1px solid #b9deea; border-radius: 12px; background: #effbff; }
  .seller-status b, .seller-status small { display: block; }
  .seller-status b { color: #063d72; font-size: 13px; }
  .seller-status small { color: #527487; font-size: 10px; margin-top: 4px; }
  .seller-status button { width: 100%; margin-top: 10px; padding: 10px; border: 0; border-radius: 8px; background: #0877bb; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
  .seller-inbound[hidden] { display: none; }
  .seller-inbound .seller-request-row button { width: auto; margin: 0; padding: 8px 9px; }
  .trade-setup-form { width: 100%; margin-top: 10px; padding: 11px; border: 1px solid #b9deea; border-radius: 10px; background: #fff; }
  .trade-setup-form label { display: block; margin-top: 7px; color: #426c7f; font-size: 11px; font-weight: 700; }
  .trade-setup-form input { width: 100%; margin-top: 4px; box-sizing: border-box; padding: 8px; border: 1px solid #bddce8; border-radius: 7px; font: inherit; }
  .trade-setup-form button { width: 100%; margin-top: 10px; }
  .trade-confirmation { margin-top: 10px; padding: 10px; border-radius: 9px; background: #eef9f2; color: #216b4c; font-size: 11px; line-height: 1.65; }
  .trade-confirmation b, .trade-confirmation small { display: block; }
  .trade-confirmation select { width: 100%; margin-top: 6px; padding: 7px; border: 1px solid #9fd2b5; border-radius: 7px; background: #fff; color: #265e46; font: inherit; }
`;
document.head.appendChild(visualStyle);

const mobileOnlyStyle = document.createElement('style');
mobileOnlyStyle.textContent = `
  @media (min-width: 700px) {
    body { background: #dfeef5; }
    .phone-shell { max-width: 480px !important; min-height: 100vh !important; margin: 0 auto !important; border-radius: 0 !important; }
    .app-screen.active { min-height: 100vh !important; }
    .topbar { height: 66px; padding: 0 20px; }
    .ocean-home { height: 365px; }
    .home-title { top: 44px; left: 28px; }
    .home-title h1 { font-size: 35px; }
    .home-panel { padding: 23px 20px 34px; }
    .main-menu { grid-template-columns: 1fr 1fr; }
    .main-menu button { height: 122px; }
    .data-screen, .form-screen { padding: 0 0 35px; }
    .data-screen .screen-header, .form-screen .screen-header { padding: 15px 18px 8px; }
    .data-screen > .demo-label { margin-left: 20px; }
    .fish-list { padding: 0 20px; }
    .summary-card { margin-left: 20px; margin-right: 20px; }
    .form-screen form { max-width: none; margin-left: 20px; }
    .form-intro { margin-left: 22px; }
    #login.active, #signup.active { display: block !important; min-height: 100vh; }
    .login-art { height: 245px; min-height: 0; }
    .login-content { margin-top: -25px; padding: 0 28px 32px; display: block; }
    .login-content h1 { font-size: 29px; }
    .signup-content { max-width: none; margin: 0; }
    .profile-card, .profile-info, .profile-note, .logout-button { max-width: none; margin-left: 20px; margin-right: 20px; }
  }
`;
document.head.appendChild(mobileOnlyStyle);

const demoLoginChoices = document.createElement('div');
demoLoginChoices.className = 'demo-login-choices';
demoLoginChoices.innerHTML = '<button type="button" class="demo-login-button" data-demo-account="buyer">구매자 테스트 로그인</button><button type="button" class="demo-login-button" data-demo-account="seller">판매자 테스트 로그인</button>';
document.getElementById('loginForm').after(demoLoginChoices);
demoLoginChoices.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
  demoAccount = button.dataset.demoAccount;
  demoLoginActive = true;
  sessionStorage.setItem('singsing-demo-account', demoAccount);
  sessionStorage.removeItem('singsing-demo-login');
  const user = activeUser();
  setProfile(user.email);
  go('home');
  showToast(`${user.email}로 로그인되었습니다.`);
}));

const fishData = [
  { name: '고등어', icon: '🐟', market: '부산공동어시장', area: '부산 연안', location: '영도 앞바다', catch: 2430, catchLast: 2200, stock: 810, stockLast: 730, price: 4951, priceLast: 4700, catchSource: '공식 위판량', priceSource: '공식 평균 시세' },
  { name: '갑오징어', icon: '🦑', market: '부산공동어시장', area: '기장 연안', location: '대변항 인근', catch: 185, catchLast: 160, stock: 64, stockLast: 55, price: 17000, priceLast: 16200, catchSource: '부산공동어시장 기준', priceSource: '부산공동어시장 기준' },
  { name: '갈치', icon: '🐟', market: '부산공동어시장', area: '부산 연안', location: '오륙도 남동 해역', catch: 342, catchLast: 365, stock: 112, stockLast: 125, price: 9532, priceLast: 9100, catchSource: '공식 위판량', priceSource: '공식 평균 시세' },
  { name: '광어', icon: '🐠', market: '부산공동어시장', note: '공식 통계명: 넙치', area: '기장 연안', location: '기장 앞바다', catch: 36, catchLast: 42, stock: 14, stockLast: 17, price: 1111, priceLast: 1200, catchSource: '공식 위판량', priceSource: '공식 평균 시세' },
  { name: '우럭', icon: '🐡', market: '부산공동어시장', note: '공식 통계명: 조피볼락', area: '다대포 연안', location: '다대포 외해', catch: 74, catchLast: 68, stock: 28, stockLast: 25, price: 21000, priceLast: 19800, catchSource: '부산공동어시장 기준', priceSource: '부산공동어시장 기준' },
  { name: '멸치', icon: '🐟', market: '부산공동어시장', area: '기장 연안', location: '기장 연안', catch: 0, catchLast: 0, stock: 0, stockLast: 0, price: 0, priceLast: 0, catchSource: '공식 위판량 · 거래 없음', priceSource: '공식 거래 없음' }
];

const number = value => new Intl.NumberFormat('ko-KR').format(value);
const percent = (now, last) => Number.isFinite(now) && Number.isFinite(last) && last !== 0 ? Math.round(((now - last) / last) * 100) : null;
const compareMarkup = (now, last) => { const change = percent(now, last); return change === null ? '<small class="unavailable">작년 같은 날 공개 데이터 없음</small>' : `<small class="${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% · 작년 ${number(last)}</small>`; };

function saveSaleRequest(fish, market, stock) {
  const requested = window.prompt(`${fish}의 판매 요청 수량을 입력해 주세요.\n판매 가능 재고: ${stock}kg`, '');
  if (requested === null) return;
  const quantity = Number(requested);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    showToast('0보다 큰 수량(kg)을 입력해 주세요.');
    return;
  }
  if (quantity > Number(stock)) {
    showToast(`판매 가능 재고 ${stock}kg 이하로 요청해 주세요.`);
    return;
  }
  const requests = JSON.parse(localStorage.getItem('singsing-sale-requests') || '[]');
  requests.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), fish, market: market || '판매 시장 미입력', stock: Number(stock), quantity, requestedAt: new Date().toISOString() });
  localStorage.setItem('singsing-sale-requests', JSON.stringify(requests));
  showToast('판매 요청을 보냈습니다. 상인이 판매 등록 화면에서 확인합니다.');
}

function renderData(type) {
  const config = { catch: ['catch', 'catchLast', 'kg'], stock: ['stock', 'stockLast', 'kg'], price: ['price', 'priceLast', '원/kg'] }[type];
  const [key, lastKey, unit] = config;
  const known = fishData.filter(fish => Number.isFinite(fish[key]));
  const now = known.reduce((sum, fish) => sum + fish[key], 0);
  const knownLast = fishData.filter(fish => Number.isFinite(fish[lastKey]));
  const last = knownLast.reduce((sum, fish) => sum + fish[lastKey], 0);
  const summary = type === 'price' && known.length ? Math.round(now / known.length) : now;
  const summaryLast = type === 'price' && knownLast.length ? Math.round(last / knownLast.length) : last;
  const summaryTarget = document.getElementById(type === 'catch' ? 'totalCatch' : type === 'stock' ? 'totalStock' : 'averagePrice');
  const summaryLabel = document.querySelector(`#${type} .summary-card span`);
  const summaryCopy = type === 'catch' ? '총 위판량' : type === 'price' ? '시세 확인 품목' : '판매 가능 재고';
  summaryLabel.textContent = summaryCopy;
  summaryTarget.textContent = type === 'price' ? `${known.length}개 품목` : `${number(summary)}${unit}`;
  const summaryChange = percent(summary, summaryLast);
  document.querySelector(`#${type} .summary-card p`).innerHTML = summaryChange === null ? '작년 같은 날 공개 데이터 없음' : `작년 같은 날 대비 <b class="${summaryChange >= 0 ? 'up' : 'down'}">${summaryChange >= 0 ? '+' : ''}${summaryChange}%</b>`;
  const list = document.getElementById(`${type}List`);
  list.innerHTML = fishData.map(fish => { const available = Number.isFinite(fish[key]); const noTrade = type === 'price' && fish.price === 0; const value = noTrade ? '거래 없음' : available ? `${number(fish[key])}${unit}` : type === 'stock' ? '판매자 등록 전' : '거래 데이터 없음'; const detail = type === 'catch' ? ` · ${fish.area} / ${fish.location}` : ''; const stockRequest = type === 'stock' && available && fish.stock > 0 ? `<button class="stock-request-button" data-stock-fish="${fish.name}" data-stock-market="${fish.market}" data-stock-quantity="${fish.stock}">판매 요청</button>` : ''; return `<article class="fish-row"><span class="fish-emoji">${fish.icon}</span><div class="fish-main"><b>${fish.name}</b><small>${fish.market}${fish.note ? ` · ${fish.note}` : ''}</small><small>${type === 'catch' ? `어획 해역${detail}` : type === 'stock' ? '주요 거래 품목 · 판매 가능 수량' : '기준일 평균 시세'}</small></div><div class="fish-value"><strong>${value}</strong>${compareMarkup(fish[key], fish[lastKey])}${stockRequest}</div></article>`; }).join('');
  if (type === 'stock') list.querySelectorAll('[data-stock-fish]').forEach(button => button.addEventListener('click', () => saveSaleRequest(button.dataset.stockFish, button.dataset.stockMarket, button.dataset.stockQuantity)));
}

['catch', 'stock', 'price'].forEach(renderData);

function go(screen) {
  document.querySelectorAll('.app-screen').forEach(section => section.classList.remove('active'));
  document.getElementById('login').style.display = screen === 'login' ? '' : 'none';
  document.getElementById(screen).classList.add('active');
  const tab = { home: 'home', catch: 'home', price: 'home', buyer: 'buyer', purchase: 'buyer', aquarium: 'buyer', stock: 'buyer', seller: 'seller', sellerVerify: 'seller', sale: 'seller', discountSale: 'seller', register: 'seller', requestManage: 'seller', profile: 'profile' }[screen];
  const bottomTabs = document.querySelector('.bottom-tabs');
  if (bottomTabs) {
    bottomTabs.hidden = !tab;
    bottomTabs.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let sellerGateTarget = 'home';
function sellerVerificationKey() {
  return `singsing-seller-verified-${activeUser()?.uid || 'not-signed-in'}`;
}
function isBuyerDemo() {
  return demoLoginActive && demoAccount === 'buyer';
}
function isSellerVerified() {
  return !isBuyerDemo() && localStorage.getItem(sellerVerificationKey()) === 'true';
}

const sellerVerifyScreen = document.createElement('section');
sellerVerifyScreen.id = 'sellerVerify';
sellerVerifyScreen.className = 'app-screen form-screen';
sellerVerifyScreen.setAttribute('aria-label', '판매자 인증');
sellerVerifyScreen.innerHTML = '<div class="screen-header"><button class="back" data-go="home">‹</button><div><small>DEMO SELLER CHECK</small><h2>판매자 인증</h2></div><span></span></div><p class="form-intro">시연용 인증을 마친 판매자만<br />어획량·판매 상품을 등록할 수 있어요.</p><form id="sellerVerifyForm"><label>사업자등록번호 형식<input id="sellerVerifyNumber" type="text" inputmode="numeric" maxlength="10" placeholder="숫자 10자리" required /><small class="single-unit">시연용</small></label><p class="input-note">※ 실제 사업자등록번호는 입력하지 마세요. 번호는 저장되지 않으며 형식만 확인합니다.</p><button class="primary-button" type="submit">판매자 인증 완료 <span>→</span></button></form>';
document.querySelector('main').appendChild(sellerVerifyScreen);
sellerVerifyScreen.querySelector('[data-go="home"]').addEventListener('click', () => go('home'));

const sellerStatus = document.createElement('section');
sellerStatus.className = 'seller-status';
sellerStatus.innerHTML = '<b></b><small></small><button type="button">판매자 인증하기</button>';
document.querySelector('#profile .logout-button').before(sellerStatus);

function refreshSellerStatus() {
  const verified = isSellerVerified();
  sellerStatus.querySelector('b').textContent = isBuyerDemo() ? '구매자 테스트 계정' : verified ? '판매자 인증 완료' : '판매자 인증 필요';
  sellerStatus.querySelector('small').textContent = isBuyerDemo() ? '구매자 테스트 계정은 판매 등록을 이용할 수 없어요.' : verified ? '어획량 등록과 판매 등록을 이용할 수 있어요.' : '어획량·판매 등록 전 시연용 인증을 진행해 주세요.';
  sellerStatus.querySelector('button').textContent = isBuyerDemo() ? '판매자 테스트 계정으로 로그인' : verified ? '인증 정보 확인' : '판매자 인증하기';
}
sellerStatus.querySelector('button').addEventListener('click', () => {
  if (isBuyerDemo()) { showToast('로그아웃 후 판매자 테스트 계정으로 로그인해 주세요.'); return; }
  sellerGateTarget = 'profile';
  go('sellerVerify');
});

const sellerInboundPanel = document.createElement('section');
sellerInboundPanel.className = 'seller-status seller-inbound';
sellerInboundPanel.hidden = true;
document.querySelector('#profile .logout-button').before(sellerInboundPanel);

function renderSellerPurchaseRequests(target, compact = false) {
  const user = activeUser();
  const incoming = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]').filter(item => item.sellerUid === user?.uid && (item.status || 'requested') !== 'cancelled');
  if (compact) target.hidden = !incoming.length;
  if (!incoming.length) {
    if (!compact) target.innerHTML = '<p class="empty-sale">아직 받은 구매 요청이 없습니다.</p>';
    return;
  }
  target.innerHTML = `${compact ? '<b>받은 구매 요청</b><small>거래 장소와 시간 후보를 설정한 뒤 거래를 확정합니다.</small>' : ''}${incoming.map(item => { const status = item.status || 'requested'; const needsTradeSetup = status === 'requested' || (status === 'confirmed' && !item.meetingPlace); const action = needsTradeSetup ? `<button data-open-trade-setup="${item.id}">${status === 'confirmed' ? '거래 정보 설정' : '구매 요청 수락'}</button>` : status === 'cancel_requested' ? `<button data-approve-cancel="${item.id}">취소 승인</button>` : '<span class="request-state">거래 확정</span>'; const selectedTime = item.selectedMeetingTime ? `<small>구매자 선택 시간: ${item.selectedMeetingTime}</small>` : ''; const summary = status === 'confirmed' && item.meetingPlace ? `<div class="trade-confirmation"><b>거래 장소: ${item.meetingPlace}</b><small>시간 후보: ${(item.meetingTimes || []).join(' · ')}</small>${selectedTime}</div>` : ''; const statusText = status === 'confirmed' && !item.meetingPlace ? '거래 정보 설정 필요' : purchaseStatusText(status); return `<article class="seller-request-row"><div><b>${item.fish} · ${item.quantity}kg</b><small>${item.market} · 구매 희망: ${item.when || '미입력'} · ${statusText}${item.cancellationReason ? ` · 사유: ${item.cancellationReason}` : ''}</small>${summary}</div>${action}</article>`; }).join('')}`;
  target.querySelectorAll('[data-open-trade-setup]').forEach(button => button.addEventListener('click', () => {
    const row = button.closest('.seller-request-row');
    if (row.querySelector('.trade-setup-form')) return;
    const request = incoming.find(item => item.id === button.dataset.openTradeSetup);
    row.insertAdjacentHTML('beforeend', `<form class="trade-setup-form" data-trade-request="${button.dataset.openTradeSetup}"><b>거래 확정 설정</b><small>구매자 희망 시기: ${request?.when || '미입력'}</small><label>정확한 거래 장소<input name="place" type="text" placeholder="예: 부산공동어시장 1번 경매장 앞" required /></label><label>시간 후보 1<input name="time1" type="text" placeholder="예: 2월 27일 10:00" required /></label><label>시간 후보 2<input name="time2" type="text" placeholder="예: 2월 27일 14:00" required /></label><label>시간 후보 3<input name="time3" type="text" placeholder="예: 2월 28일 09:00" required /></label><button type="submit">거래 확정하기</button></form>`);
    button.remove();
    row.querySelector('.trade-setup-form').addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      const meetingPlace = form.elements.place.value.trim();
      const meetingTimes = [form.elements.time1.value.trim(), form.elements.time2.value.trim(), form.elements.time3.value.trim()];
      if (!meetingPlace || meetingTimes.some(value => !value)) return;
      const updated = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]').map(item => item.id === form.dataset.tradeRequest ? { ...item, status: 'confirmed', meetingPlace, meetingTimes, buyerTradeSeen: false } : item);
      localStorage.setItem('singsing-purchase-requests', JSON.stringify(updated));
      showToast('거래확정! 구매자에게 거래 장소와 시간 후보가 전달되었습니다.');
      loadSellerPurchaseRequests();
      updateRequestNotifications();
    });
  }));
  target.querySelectorAll('[data-approve-cancel]').forEach(button => button.addEventListener('click', () => {
    const requests = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]');
    const request = requests.find(item => item.id === button.dataset.approveCancel);
    if (!request) return;
    const updated = requests.map(item => item.id === request.id ? { ...item, status: 'cancelled' } : item);
    localStorage.setItem('singsing-purchase-requests', JSON.stringify(updated));
    recordCancellation(request.buyerUid);
    showToast('취소 요청을 승인했습니다.');
    loadSellerPurchaseRequests();
    updateRequestNotifications();
  }));
}
function loadSellerPurchaseRequests() {
  const user = activeUser();
  const requests = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]');
  const markedRead = requests.map(item => item.sellerUid === user?.uid && item.selectedMeetingTime && !item.sellerTimeSeen ? { ...item, sellerTimeSeen: true } : item);
  if (JSON.stringify(markedRead) !== JSON.stringify(requests)) localStorage.setItem('singsing-purchase-requests', JSON.stringify(markedRead));
  renderSellerPurchaseRequests(sellerInboundPanel, true);
  const managementList = document.getElementById('sellerRequestList');
  if (managementList) renderSellerPurchaseRequests(managementList);
}
function updateRequestNotifications() {
  const user = activeUser();
  const requests = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]');
  const sellerCount = requests.filter(item => {
    const status = item.status || 'requested';
    return item.sellerUid === user?.uid && (status === 'requested' || status === 'cancel_requested' || (status === 'confirmed' && item.selectedMeetingTime && !item.sellerTimeSeen));
  }).length;
  const buyerCount = requests.filter(item => item.buyerUid === user?.uid && item.status === 'confirmed' && item.meetingPlace && !item.buyerTradeSeen).length;
  const setBadge = (targets, count) => targets.forEach(target => {
    if (!target) return;
    target.querySelector('.request-badge')?.remove();
    if (count) target.insertAdjacentHTML('beforeend', `<i class="request-badge">${count > 9 ? '9+' : count}</i>`);
  });
  setBadge([document.querySelector('#sellerRoleMenu button:nth-child(3)'), document.querySelector('.bottom-tabs [data-tab="seller"]')], sellerCount);
  setBadge([document.querySelector('#buyerRoleMenu button:nth-child(2)'), document.querySelector('.bottom-tabs [data-tab="buyer"]')], buyerCount);
}
function openSellerRequestManagement() {
  if (isBuyerDemo()) {
    showToast('구매자 테스트 계정은 구매 요청을 관리할 수 없습니다.');
    return;
  }
  if (!activeUser()) {
    showToast('로그인 후 판매자 인증을 해야합니다.');
    go('login');
    return;
  }
  if (!isSellerVerified()) {
    sellerGateTarget = 'requestManage';
    showToast('판매자 인증을 해야합니다.');
    go('sellerVerify');
    return;
  }
  go('requestManage');
  loadSellerPurchaseRequests();
}

sellerVerifyScreen.querySelector('#sellerVerifyForm').addEventListener('submit', event => {
  event.preventDefault();
  if (isBuyerDemo()) {
    showToast('구매자 테스트 계정은 판매자 인증을 할 수 없습니다.');
    go('home');
    return;
  }
  const number = document.getElementById('sellerVerifyNumber').value.trim();
  if (!/^\d{10}$/.test(number)) {
    showToast('숫자 10자리 형식으로 입력해 주세요.');
    return;
  }
  localStorage.setItem(sellerVerificationKey(), 'true');
  event.currentTarget.reset();
  refreshSellerStatus();
  showToast('시연용 판매자 인증이 완료되었습니다.');
  go(sellerGateTarget);
  if (sellerGateTarget === 'requestManage') loadSellerPurchaseRequests();
});

document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => go(button.dataset.go)));

// 구매 요청을 모아 보는 수족관 메뉴와 화면
const aquariumButton = document.createElement('button');
aquariumButton.className = 'aquarium-menu';
aquariumButton.innerHTML = '<span class="menu-icon">🐠</span><b>수족관</b><small>내 구매 요청</small>';
aquariumButton.addEventListener('click', () => { go('aquarium'); loadAquarium(); });
document.querySelector('.main-menu').appendChild(aquariumButton);

const sellerVerifyButton = document.createElement('button');
sellerVerifyButton.className = 'seller-verify-menu';
sellerVerifyButton.innerHTML = '<span class="menu-icon">✓</span><b>판매자 인증</b><small>판매 등록 전 확인</small>';
sellerVerifyButton.addEventListener('click', () => { sellerGateTarget = 'home'; go('sellerVerify'); });
document.querySelector('.main-menu').appendChild(sellerVerifyButton);

const sellerRequestButton = document.createElement('button');
sellerRequestButton.className = 'seller-request-menu';
sellerRequestButton.innerHTML = '<span class="menu-icon">📨</span><b>구매 요청 관리</b><small>요청 수락·취소 승인</small>';
sellerRequestButton.addEventListener('click', openSellerRequestManagement);
document.querySelector('.main-menu').appendChild(sellerRequestButton);

const aquariumScreen = document.createElement('section');
aquariumScreen.id = 'aquarium';
aquariumScreen.className = 'app-screen form-screen aquarium-screen';
aquariumScreen.setAttribute('aria-label', '수족관');
aquariumScreen.innerHTML = '<div class="screen-header"><button class="back" data-go="home">‹</button><div><small>MY AQUARIUM</small><h2>수족관</h2></div><span></span></div><p class="form-intro">내가 구매 요청한 수산물을<br />한곳에서 확인할 수 있어요.</p><div id="aquariumList" class="sale-list"></div>';
document.querySelector('main').appendChild(aquariumScreen);
aquariumScreen.querySelector('[data-go="home"]').addEventListener('click', () => go('home'));

const sellerRequestScreen = document.createElement('section');
sellerRequestScreen.id = 'requestManage';
sellerRequestScreen.className = 'app-screen form-screen';
sellerRequestScreen.setAttribute('aria-label', '구매 요청 관리');
sellerRequestScreen.innerHTML = '<div class="screen-header"><button class="back" data-go="home">‹</button><div><small>SELLER REQUESTS</small><h2>구매 요청 관리</h2></div><span></span></div><p class="form-intro">판매 등록한 상품으로 들어온 요청을<br />수락하거나 취소 요청을 승인할 수 있어요.</p><div id="sellerRequestList" class="sale-list"></div>';
document.querySelector('main').appendChild(sellerRequestScreen);
sellerRequestScreen.querySelector('[data-go="home"]').addEventListener('click', () => go('home'));

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
function salePriceText(sale) { return sale.discounted && sale.priceType === 'total' ? `할인 총액 ${Number(sale.price).toLocaleString('ko-KR')}원` : `${Number(sale.price).toLocaleString('ko-KR')}원/kg`; }
async function loadSales() { const target=document.getElementById('saleList'); const rows=JSON.parse(localStorage.getItem('singsing-sales')||'[]'); target.innerHTML=rows.length?rows.map(s=>`<article class="sale-card"><div><b>${s.fish}</b><small>${s.market} · 판매자 ${s.sellerEmail}</small><strong>${s.quantity}kg · ${salePriceText(s)}</strong></div><button data-sale="${s.id}">구매 요청</button></article>`).join(''):'<p class="empty-sale">아직 판매 등록된 상품이 없습니다.</p>'; window.saleRows=rows; }
document.getElementById('saleList').addEventListener('click',e=>{if(!e.target.dataset.sale)return; selectedSale=window.saleRows.find(x=>x.id===e.target.dataset.sale); document.getElementById('selectedSale').textContent=`선택 상품: ${selectedSale.fish} · ${selectedSale.quantity}kg · ${salePriceText(selectedSale)}`; document.getElementById('purchaseForm').hidden=false; document.getElementById('purchaseForm').scrollIntoView({behavior:'smooth'});});
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
    ? rows.map(s => `<article class="sale-card ${s.discounted ? 'discount-sale-card' : ''}"><div><b>${s.fish}</b>${s.discounted ? '<span class="discount-badge">폐기 예정 할인</span>' : ''}<small>${s.market} · 판매자 ${s.sellerEmail}${s.discounted ? ` · ${s.expires}` : ''}</small><strong>${s.quantity}kg · ${salePriceText(s)}</strong></div><div class="card-actions"><button data-sale="${s.id}">구매 요청</button><button class="more-button" data-cancel-sale="${s.id}" aria-label="판매 등록 메뉴">⋯</button></div></article>`).join('')
    : '<p class="empty-sale">아직 판매 등록된 상품이 없습니다.</p>';
  window.saleRows = rows;
  target.querySelectorAll('[data-sale]').forEach(button => {
    const sale = rows.find(item => item.id === button.dataset.sale);
    const minimumOrder = sale.minimumOrder || 1;
    button.closest('.sale-card').querySelector('div').insertAdjacentHTML('beforeend', `<small class="minimum-order-note">최소 주문 ${minimumOrder}kg</small>`);
  });
  target.querySelectorAll('[data-cancel-sale]').forEach(button => {
    const sale = rows.find(item => item.id === button.dataset.cancelSale);
    const user = activeUser();
    const isSeller = sale && user && sale.sellerUid === user.uid;
    if (!isSeller) {
      button.remove();
      return;
    }
    button.addEventListener('click', () => {
      if (!window.confirm('취소하겠습니까?')) return;
      const updated = JSON.parse(localStorage.getItem('singsing-sales') || '[]').filter(item => item.id !== button.dataset.cancelSale);
      localStorage.setItem('singsing-sales', JSON.stringify(updated));
      showToast('판매 등록이 취소되었습니다.');
      loadSalesWithMenu();
    });
  });
}

// 수족관에서는 거래 단계에 따라 취소 방법을 다르게 안내합니다.
function cancellationLogKey(uid) {
  return `singsing-cancellation-log-${uid || 'local-user'}`;
}
function recentCancellationCount(uid) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return JSON.parse(localStorage.getItem(cancellationLogKey(uid)) || '[]').filter(time => time > weekAgo).length;
}
function recordCancellation(uid) {
  const times = JSON.parse(localStorage.getItem(cancellationLogKey(uid)) || '[]');
  times.push(Date.now());
  localStorage.setItem(cancellationLogKey(uid), JSON.stringify(times));
}
function purchaseStatusText(status) {
  return ({ requested: '요청 접수', confirmed: '거래 확정', cancel_requested: '취소 요청 검토 중', cancelled: '취소 완료' })[status] || '요청 접수';
}
function loadAquarium() {
  const target = document.getElementById('aquariumList');
  const user = activeUser();
  const allRequests = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]');
  const myRequestIds = JSON.parse(localStorage.getItem(`singsing-my-request-ids-${user?.uid || 'local-user'}`) || '[]');
  const requests = allRequests.filter(item => {
    return !item.buyerUid || item.buyerUid === user?.uid || myRequestIds.includes(item.id);
  });
  target.innerHTML = requests.length
    ? requests.map(item => {
      const status = item.status || 'requested';
      const action = status === 'requested' ? `<button class="more-button" data-cancel-request="${item.id}" aria-label="구매 요청 취소">⋯</button>` : status === 'confirmed' ? `<button class="more-button" data-request-cancel="${item.id}" aria-label="취소 요청">⋯</button>` : '';
      const reason = status === 'cancel_requested' ? `<small>취소 사유: ${item.cancellationReason}</small>` : '';
      const trade = status === 'confirmed' && item.meetingPlace ? `<div class="trade-confirmation"><b>거래확정</b><small>거래 장소: ${item.meetingPlace}</small><label>거래 시간 선택<select data-trade-time-select="${item.id}"><option value="">시간 후보를 선택하세요</option>${(item.meetingTimes || []).map(time => `<option value="${time}" ${item.selectedMeetingTime === time ? 'selected' : ''}>${time}</option>`).join('')}</select></label>${item.selectedMeetingTime ? `<small>선택한 시간: ${item.selectedMeetingTime}</small>` : ''}</div>` : '';
      const statusText = status === 'confirmed' && !item.meetingPlace ? '거래 정보 설정 중' : purchaseStatusText(status);
      return `<article class="sale-card aquarium-card"><div><b>${item.fish}</b><small>${item.market} · ${item.when}</small><strong>${item.quantity}kg · ${salePriceText(item)}</strong>${trade}${reason}</div><div class="card-actions"><span class="request-state">${statusText}</span>${action}</div></article>`;
    }).join('')
    : '<p class="empty-sale">아직 구매 요청한 상품이 없습니다.</p>';
  target.querySelectorAll('[data-cancel-request]').forEach(button => button.addEventListener('click', () => {
    const request = requests.find(item => item.id === button.dataset.cancelRequest);
    if (!request) return;
    if (recentCancellationCount(request.buyerUid) >= 3) {
      showToast('최근 7일 취소 횟수가 3회 이상이라 구매 요청이 제한됩니다.');
      return;
    }
    if (!window.confirm('요청 접수를 취소하겠습니까?')) return;
    const updated = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]').map(item => item.id === request.id ? { ...item, status: 'cancelled' } : item);
    localStorage.setItem('singsing-purchase-requests', JSON.stringify(updated));
    recordCancellation(request.buyerUid);
    showToast('구매 요청이 취소되었습니다.');
    loadAquarium();
    updateRequestNotifications();
  }));
  target.querySelectorAll('[data-request-cancel]').forEach(button => button.addEventListener('click', () => {
    const reason = window.prompt('취소 사유를 입력해 주세요.');
    if (!reason?.trim()) return;
    const updated = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]').map(item => item.id === button.dataset.requestCancel ? { ...item, status: 'cancel_requested', cancellationReason: reason.trim() } : item);
    localStorage.setItem('singsing-purchase-requests', JSON.stringify(updated));
    showToast('판매자에게 취소 요청을 보냈습니다.');
    loadAquarium();
    updateRequestNotifications();
  }));
  target.querySelectorAll('[data-trade-time-select]').forEach(select => select.addEventListener('change', event => {
    const selectedMeetingTime = event.currentTarget.value;
    if (!selectedMeetingTime) return;
    const updated = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]').map(item => item.id === event.currentTarget.dataset.tradeTimeSelect ? { ...item, selectedMeetingTime, sellerTimeSeen: false } : item);
    localStorage.setItem('singsing-purchase-requests', JSON.stringify(updated));
    showToast('거래 시간을 선택했습니다. 판매자에게 전달됩니다.');
    loadAquarium();
  }));
  loadBuyerTradeNotifications();
}

function loadBuyerTradeNotifications() {
  const target = document.getElementById('buyerTradeNotice');
  if (!target) return;
  const user = activeUser();
  const confirmed = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]').filter(item => item.buyerUid === user?.uid && item.status === 'confirmed' && item.meetingPlace);
  target.innerHTML = confirmed.map(item => `<section class="buyer-trade-notice"><b>거래확정 · ${item.fish}</b><small>거래 장소: ${item.meetingPlace}</small><small>시간 후보: ${(item.meetingTimes || []).join(' · ')}</small><button type="button" data-open-aquarium>시간 선택하기</button></section>`).join('');
  target.hidden = !confirmed.length;
  const requests = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]');
  const markedRead = requests.map(item => item.buyerUid === user?.uid && item.status === 'confirmed' && item.meetingPlace && !item.buyerTradeSeen ? { ...item, buyerTradeSeen: true } : item);
  if (JSON.stringify(markedRead) !== JSON.stringify(requests)) { localStorage.setItem('singsing-purchase-requests', JSON.stringify(markedRead)); updateRequestNotifications(); }
  target.querySelectorAll('[data-open-aquarium]').forEach(button => button.addEventListener('click', () => { go('aquarium'); loadAquarium(); }));
}

function loadSellerTradeNotifications() {
  const target = document.getElementById('sellerTradeNotice');
  if (!target) return;
  const user = activeUser();
  const selections = JSON.parse(localStorage.getItem('singsing-purchase-requests') || '[]').filter(item => item.sellerUid === user?.uid && item.status === 'confirmed' && item.selectedMeetingTime);
  target.innerHTML = selections.map(item => `<section class="seller-trade-notice"><b>새 거래 시간 선택 · ${item.fish}</b><small>구매자 선택 시간: ${item.selectedMeetingTime}</small><small>거래 장소: ${item.meetingPlace || '미입력'}</small><button type="button" data-open-request-manage>구매 요청 관리에서 보기</button></section>`).join('');
  target.hidden = !selections.length;
  target.querySelectorAll('[data-open-request-manage]').forEach(button => button.addEventListener('click', () => openSellerRequestManagement()));
}

document.querySelector('[data-go="purchase"]').addEventListener('click', loadSalesWithMenu);

document.getElementById('saleList').addEventListener('click', event => {
  if (!event.target.dataset.sale) return;
  const sale = window.saleRows.find(item => item.id === event.target.dataset.sale);
  if (!sale) return;
  selectedSale = sale;
  const minimumOrder = sale.minimumOrder || 1;
  document.getElementById('selectedSale').textContent = `선택 상품: ${sale.fish} · ${sale.quantity}kg · ${salePriceText(sale)} · 최소 주문 ${minimumOrder}kg`;
  document.querySelector('#purchaseForm input[type="number"]').min = minimumOrder;
  document.querySelector('#purchaseForm input[type="number"]').placeholder = `최소 ${minimumOrder}kg`;
});

let pendingSaleRequestId = null;
function loadSellerRequests() {
  const saleScreen = document.getElementById('sale');
  saleScreen.querySelector('.seller-request-panel')?.remove();
  const requests = JSON.parse(localStorage.getItem('singsing-sale-requests') || '[]');
  if (!requests.length) return;
  const panel = document.createElement('section');
  panel.className = 'seller-request-panel';
  panel.innerHTML = `<h3>소비자의 판매 요청</h3><p>요청을 선택하면 해당 품목과 시장, 요청 수량을 채워 판매 등록을 시작할 수 있어요.</p>${requests.map(request => `<article class="seller-request-row"><div><b>${request.fish} · 요청 ${request.quantity || request.stock}kg</b><small>${request.market} · 판매 가능 재고 ${request.stock}kg</small></div><button data-fill-sale-request="${request.id}">판매 등록하기</button></article>`).join('')}`;
  saleScreen.querySelector('#saleForm').before(panel);
  panel.querySelectorAll('[data-fill-sale-request]').forEach(button => button.addEventListener('click', () => {
    const request = requests.find(item => item.id === button.dataset.fillSaleRequest);
    if (!request) return;
    const form = document.getElementById('saleForm');
    setSelectOrDirect(form, 0, request.market);
    setSelectOrDirect(form, 1, request.fish);
    form.querySelectorAll('input[type="number"]')[0].value = request.quantity || request.stock;
    pendingSaleRequestId = request.id;
    panel.remove();
    showToast('요청 정보를 채웠습니다. 판매 가격과 최소 주문 수량을 입력해 주세요.');
  }));
}
document.querySelectorAll('[data-go="sale"]').forEach(button => button.addEventListener('click', loadSellerRequests));

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
let registrationMode = 'stock';

const registerFormElement = document.getElementById('registerForm');
const registerSelects = registerFormElement.querySelectorAll('select');
const registerNumbers = registerFormElement.querySelectorAll('input[type="number"]');
const operationLocationLabel = document.createElement('label');
operationLocationLabel.innerHTML = '조업 위치<input id="operationLocation" type="text" placeholder="예: 기장 앞바다 북쪽" /><small class="single-unit">직접 입력</small>';
registerSelects[1].parentElement.after(operationLocationLabel);
const stockMarketLabel = document.createElement('label');
stockMarketLabel.innerHTML = '판매 시장<select id="stockMarket"><option value="">판매 시장을 선택해 주세요</option><option>부산공동어시장</option><option>자갈치시장</option><option>신동아수산물종합시장</option><option>민락어민활어직판장</option><option>기장시장</option><option>대변항 수산시장</option><option>다대포수산시장</option><option>명지시장</option><option value="__direct__">직접 입력</option></select><input id="stockMarketDirect" class="direct-input" type="text" placeholder="판매 시장 직접 입력" hidden />';
registerNumbers[1].parentElement.after(stockMarketLabel);

function updateStockMarketDirectField() {
  const select = document.getElementById('stockMarket');
  const direct = document.getElementById('stockMarketDirect');
  const isDirect = select.value === '__direct__';
  direct.hidden = !isDirect;
  direct.required = isDirect && !stockMarketLabel.hidden;
  if (!isDirect) direct.value = '';
}
document.getElementById('stockMarket').addEventListener('change', updateStockMarketDirectField);
function selectedStockMarket() {
  const select = document.getElementById('stockMarket');
  return select.value === '__direct__' ? document.getElementById('stockMarketDirect').value.trim() : select.value;
}
function updateStockMarketField() {
  const shouldShow = registrationMode === 'catch' && Number(registerNumbers[1].value) > 0;
  stockMarketLabel.hidden = !shouldShow;
  document.getElementById('stockMarket').required = shouldShow;
  document.getElementById('stockMarketDirect').required = shouldShow && document.getElementById('stockMarket').value === '__direct__';
}
registerNumbers[1].addEventListener('input', updateStockMarketField);

function setLabelText(label, text) {
  const textNode = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
  if (textNode) textNode.nodeValue = text;
}

function setAreaOptions(options, placeholder) {
  const select = registerSelects[0];
  select.innerHTML = `<option value="">${placeholder}</option>${options.map(option => `<option>${option}</option>`).join('')}<option value="__direct__">직접 입력</option>`;
  const direct = registerFormElement.querySelectorAll('.direct-input')[0];
  direct.hidden = true;
  direct.required = false;
  direct.value = '';
}

function configureRegistration(mode) {
  registrationMode = mode;
  lastInfoSource = mode;
  const catchField = registerNumbers[0].parentElement;
  const stockField = registerNumbers[1].parentElement;
  const priceField = registerNumbers[2].parentElement;
  const header = document.querySelector('#register .screen-header h2');
  const intro = document.querySelector('#register .form-intro');
  if (mode === 'catch') {
    setLabelText(registerSelects[0].parentElement, '어획 해역');
    setAreaOptions(['부산 연안', '기장 연안', '영도 연안', '다대포 연안'], '어획 해역을 선택해 주세요');
    setLabelText(catchField, '어획량');
    catchField.hidden = false;
    setLabelText(stockField, '판매 가능 재고');
    stockField.hidden = false;
    priceField.hidden = true;
    operationLocationLabel.hidden = false;
    document.getElementById('operationLocation').required = true;
    header.textContent = '어획량 등록';
    intro.innerHTML = '어획량과 판매 가능 재고를 함께 등록하면<br />재고 탭에도 자동으로 표시됩니다.';
    updateStockMarketField();
  } else {
    setLabelText(registerSelects[0].parentElement, '판매 시장');
    setAreaOptions(['부산공동어시장', '자갈치시장', '신동아수산물종합시장', '민락어민활어직판장', '기장시장', '대변항 수산시장', '다대포수산시장', '명지시장'], '판매 시장을 선택해 주세요');
    setLabelText(stockField, '판매 가능 재고');
    catchField.hidden = true;
    stockField.hidden = false;
    priceField.hidden = true;
    operationLocationLabel.hidden = true;
    document.getElementById('operationLocation').required = false;
    stockMarketLabel.hidden = true;
    document.getElementById('stockMarket').required = false;
    document.getElementById('stockMarketDirect').required = false;
    header.textContent = '재고 등록';
    intro.innerHTML = '판매할 시장과 품목별 재고를<br />등록해 구매자에게 알립니다.';
  }
}
configureRegistration('catch');
document.querySelector('#price .icon-button')?.remove();
document.querySelector('#catch .icon-button').addEventListener('click', () => configureRegistration('catch'), true);
document.querySelector('#stock .icon-button')?.remove();

function renderRegisteredInfo(type) {
  const list = document.querySelector(`#${type} .fish-list`);
  if (!list) return;
  list.querySelector('.registered-info')?.remove();
  const entries = JSON.parse(localStorage.getItem('singsing-info-registrations') || '[]');
  const relevantEntries = entries.filter(item => {
    if (type === 'catch') return !item.mode || item.mode === 'catch';
    return (item.mode === 'catch' && Number(item.stock) > 0) || item.mode === 'stock';
  });
  if (!relevantEntries.length) return;
  const panel = document.createElement('section');
  panel.className = type === 'stock' ? 'registered-info integrated-stock-info' : 'registered-info';
  panel.innerHTML = `${type === 'catch' ? '<h3>등록된 어획 정보</h3>' : ''}${relevantEntries.map(item => { const location = type === 'catch' ? `${item.area || item.market || '어획 해역'} · ${item.operationLocation || '조업 위치 미입력'}` : (item.market || '판매 시장'); const stockRequest = type === 'stock' ? `<button class="stock-request-button" data-stock-request="${item.id}">판매 요청</button>` : ''; const canManage = item.ownerUid === activeUser()?.uid; const manageActions = canManage ? `<div><button data-edit-info="${item.id}">수정</button><button data-cancel-info="${item.id}">취소</button></div>` : ''; return `<article class="fish-row user-info-row"><span class="fish-emoji">🐟</span><div class="fish-main"><b>${item.fish}</b><small>${location}${type === 'catch' ? ' · 직접 등록' : ''}</small></div><div class="user-info-value"><strong>${type === 'catch' ? item.catch : item.stock}kg</strong>${stockRequest}${manageActions}</div></article>`; }).join('')}`;
  list.appendChild(panel);
  panel.querySelectorAll('[data-edit-info]').forEach(button => button.addEventListener('click', () => openInfoEditor(button.dataset.editInfo)));
  panel.querySelectorAll('[data-cancel-info]').forEach(button => button.addEventListener('click', () => {
    const entry = entries.find(item => item.id === button.dataset.cancelInfo);
    if (!entry || entry.ownerUid !== activeUser()?.uid) return;
    if (!window.confirm('취소하겠습니까?')) return;
    const updated = JSON.parse(localStorage.getItem('singsing-info-registrations') || '[]').filter(item => item.id !== button.dataset.cancelInfo);
    localStorage.setItem('singsing-info-registrations', JSON.stringify(updated));
    renderRegisteredInfo('catch');
    renderRegisteredInfo('stock');
    showToast('등록한 정보가 취소되었습니다.');
  }));
  panel.querySelectorAll('[data-stock-request]').forEach(button => button.addEventListener('click', () => {
    const item = entries.find(entry => entry.id === button.dataset.stockRequest);
    if (!item) return;
    saveSaleRequest(item.fish, item.market, item.stock);
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
  if (!entry || entry.ownerUid !== activeUser()?.uid) return;
  const form = document.getElementById('registerForm');
  editingInfoId = id;
  configureRegistration(entry.mode === 'stock' ? 'stock' : 'catch');
  setSelectOrDirect(form, 0, entry.mode === 'stock' ? entry.market : entry.area);
  setSelectOrDirect(form, 1, entry.fish);
  const numbers = form.querySelectorAll('input[type="number"]');
  if (entry.mode === 'catch') {
    numbers[0].value = entry.catch;
    numbers[1].value = entry.stock || '';
    document.getElementById('operationLocation').value = entry.operationLocation || '';
    const marketSelect = document.getElementById('stockMarket');
    const knownMarket = [...marketSelect.options].some(option => option.value === entry.market);
    marketSelect.value = knownMarket ? entry.market : '__direct__';
    document.getElementById('stockMarketDirect').value = knownMarket ? '' : (entry.market || '');
    updateStockMarketDirectField();
    updateStockMarketField();
  } else {
    numbers[1].value = entry.stock;
  }
  form.querySelector('.primary-button').childNodes[0].textContent = '정보 수정 완료 ';
  go('register');
}

document.querySelector('#catch .icon-button').addEventListener('click', () => configureRegistration('catch'));
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
    ownerUid: activeUser()?.uid || 'local-user',
    mode: registrationMode,
    market: registrationMode === 'catch' ? selectedStockMarket() : selectedOrDirect(directRegisterForm, 0),
    area: registrationMode === 'catch' ? selectedOrDirect(directRegisterForm, 0) : '',
    operationLocation: registrationMode === 'catch' ? document.getElementById('operationLocation').value.trim() : '',
    fish: selectedOrDirect(directRegisterForm, 1),
    catch: registrationMode === 'catch' ? Number(numbers[0].value) : 0,
    stock: Number(numbers[1].value) || 0,
    price: 0,
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
  document.getElementById('stockMarketDirect').hidden = true;
  updateStockMarketField();
  editingInfoId = null;
  directRegisterForm.querySelector('.primary-button').childNodes[0].textContent = '정보 등록하기 ';
  renderRegisteredInfo('catch');
  renderRegisteredInfo('stock');
  showToast('수산물 정보가 등록되었습니다.');
  go('catch');
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
    sellerUid: activeUser()?.uid || 'local-user',
    sellerEmail: activeUser()?.email || '시연용 판매자',
    market: selectedOrDirect(directSaleForm, 0),
    fish: selectedOrDirect(directSaleForm, 1),
    quantity: Number(numbers[0].value),
    price: Number(numbers[1].value),
    minimumOrder: Number(numbers[2].value)
  });
  localStorage.setItem('singsing-sales', JSON.stringify(sales));
  if (pendingSaleRequestId) {
    const remainingRequests = JSON.parse(localStorage.getItem('singsing-sale-requests') || '[]').filter(item => item.id !== pendingSaleRequestId);
    localStorage.setItem('singsing-sale-requests', JSON.stringify(remainingRequests));
    pendingSaleRequestId = null;
  }
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
  const requestId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  requests.unshift({
    id: requestId,
    fish: selectedSale.fish,
    market: selectedSale.market,
    price: selectedSale.price,
    priceType: selectedSale.priceType,
    discounted: selectedSale.discounted,
    quantity: Number(fields[0].value),
    when: fields[1].value,
    saleId: selectedSale.id,
    buyerUid: activeUser()?.uid || 'local-user',
    sellerUid: selectedSale.sellerUid || 'local-seller',
    status: 'requested'
  });
  localStorage.setItem('singsing-purchase-requests', JSON.stringify(requests));
  const myRequestKey = `singsing-my-request-ids-${activeUser()?.uid || 'local-user'}`;
  const myRequestIds = JSON.parse(localStorage.getItem(myRequestKey) || '[]');
  myRequestIds.unshift(requestId);
  localStorage.setItem(myRequestKey, JSON.stringify(myRequestIds));
  updateRequestNotifications();
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
  refreshSellerStatus();
  updateRequestNotifications();
  loadSellerTradeNotifications();
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
  demoLoginActive = false;
  demoAccount = '';
  sessionStorage.removeItem('singsing-demo-account');
  sessionStorage.removeItem('singsing-demo-login');
  signOut(auth).then(() => { setProfile('로그인 사용자'); go('login'); showToast('로그아웃되었습니다.'); });
});
if (demoLoginActive) setProfile(activeUser().email);
if (firebaseReady) onAuthStateChanged(auth, user => { if (user) { demoLoginActive = false; demoAccount = ''; setProfile(user.email); loadHistory(); go('home'); } });
document.querySelector('[data-go="profile"]').addEventListener('click', () => { loadHistory(); loadSellerPurchaseRequests(); });

function requireSellerVerification(event, target) {
  if (isBuyerDemo()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showToast('구매자 테스트 계정은 판매 등록을 할 수 없습니다.');
    return;
  }
  if (isSellerVerified()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  sellerGateTarget = target;
  if (!activeUser()) {
    showToast('로그인 후 판매자 인증을 해야합니다.');
    go('login');
    return;
  }
  refreshSellerStatus();
  showToast('판매자 인증을 해야합니다.');
  go('sellerVerify');
}
document.querySelectorAll('[data-go="sale"]').forEach(button => button.addEventListener('click', event => requireSellerVerification(event, 'sale'), true));
document.querySelector('#catch .icon-button').addEventListener('click', event => requireSellerVerification(event, 'register'), true);
refreshSellerStatus();

// 로그인 뒤에는 역할별 탭으로 기능을 나눠 보여 줍니다.
const roleNavigationStyle = document.createElement('style');
roleNavigationStyle.textContent = `
  .role-screen { min-height: 100vh; padding-bottom: 94px; background: linear-gradient(180deg,#f3fbff,#fff 33%); }
  .role-screen .role-intro { margin: 14px 22px 22px; color: #4c727f; font-size: 13px; line-height: 1.65; }
  .role-menu { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 20px 26px; }
  .role-menu button { min-height: 120px; padding: 15px; border: 1px solid #b8dfea; border-radius: 13px; background: #e8f8fd; color: #063d72; text-align: left; cursor: pointer; box-shadow: 0 4px 10px #0b5b7a12; }
  .role-menu button:nth-child(2n) { background: #d9f1fa; }
  .role-menu button.seller-main { background: #063d72; color: #fff; }
  .role-menu button.seller-main small { color: #c5edff; }
  .role-menu .menu-icon { display: grid; place-items: center; width: 39px; height: 39px; margin-bottom: 9px; border-radius: 12px; background: #fff; color: #0877bb; font-size: 20px; }
  .role-menu b { display: block; font-size: 15px; }
  .role-menu small { display: block; margin-top: 4px; color: #5c8190; font-size: 10px; }
  .bottom-tabs { position: fixed; z-index: 20; left: 50%; bottom: 0; transform: translateX(-50%); display: grid; grid-template-columns: repeat(4,1fr); width: min(480px,100%); padding: 8px 10px calc(8px + env(safe-area-inset-bottom)); border-top: 1px solid #c9e4ef; background: #fffefef5; box-shadow: 0 -5px 18px #063d7214; }
  .bottom-tabs[hidden] { display: none; }
  .bottom-tabs button { border: 0; background: transparent; color: #6b8792; font-size: 10px; font-weight: 700; cursor: pointer; }
  .bottom-tabs span { display: block; margin-bottom: 3px; font-size: 19px; line-height: 1; }
  .bottom-tabs button.active { color: #0877bb; }
  .bottom-tabs button.active span { transform: translateY(-1px); }
  .role-menu button, .bottom-tabs button { position: relative; }
  .request-badge { position: absolute; top: 7px; right: 10px; display: grid; place-items: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 12px; background: #e84d4d; color: #fff; font-size: 10px; font-style: normal; line-height: 1; }
  .toast { z-index: 30; bottom: 92px; }
  #home { padding-bottom: 76px; }
  #home .role-menu { padding: 0; }
  .data-screen, .form-screen { padding-bottom: 88px; }
  .discount-sale-card { border: 1px solid #f0c36e; background: #fffaf0; }
  .discount-badge { display: inline-block; margin-left: 6px; padding: 3px 6px; border-radius: 6px; background: #fff0cf; color: #a55c00; font-size: 10px; font-weight: 800; vertical-align: middle; }
  .discount-form-note { margin: 0 0 14px; padding: 11px; border-radius: 10px; background: #fff6df; color: #86510b; font-size: 11px; line-height: 1.55; }
  .buyer-trade-notice { margin: 0 20px 13px; padding: 12px; border: 1px solid #9fd2b5; border-radius: 11px; background: #eef9f2; color: #216b4c; }
  .buyer-trade-notice b, .buyer-trade-notice small { display: block; }
  .buyer-trade-notice small { margin-top: 3px; font-size: 11px; }
  .buyer-trade-notice button { margin-top: 9px; padding: 7px 9px; border: 0; border-radius: 7px; background: #25845e; color: #fff; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
  .seller-trade-notice { margin: 0 20px 13px; padding: 12px; border: 1px solid #9ac9e3; border-radius: 11px; background: #edf8fe; color: #075b89; }
  .seller-trade-notice b, .seller-trade-notice small { display: block; }
  .seller-trade-notice small { margin-top: 3px; font-size: 11px; }
  .seller-trade-notice button { margin-top: 9px; padding: 7px 9px; border: 0; border-radius: 7px; background: #0877bb; color: #fff; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
`;
document.head.appendChild(roleNavigationStyle);

const roleButton = (icon, title, detail, className = '') => `<button class="${className}"><span class="menu-icon">${icon}</span><b>${title}</b><small>${detail}</small></button>`;
const homePanel = document.querySelector('#home .home-panel');
homePanel.innerHTML = `<p class="demo-label">● 기준일 2026-02-26 · 부산공동어시장 · 발표용 등록 목록 포함</p><h2>기준일 수산물 정보</h2><div class="role-menu" id="homeRoleMenu">${roleButton('⚓', '위판량', '기준일 거래량')}${roleButton('₩', '시세', '기준일 평균 가격')}</div>`;

const buyerScreen = document.createElement('section');
buyerScreen.id = 'buyer';
buyerScreen.className = 'app-screen role-screen';
buyerScreen.setAttribute('aria-label', '구매자');
buyerScreen.innerHTML = `<div class="screen-header"><span></span><div><small>BUYER SPACE</small><h2>구매자</h2></div><span></span></div><p class="role-intro">판매 상품과 재고를 확인하고<br />필요한 수산물을 구매 요청하세요.</p><div id="buyerTradeNotice" hidden></div><div class="role-menu" id="buyerRoleMenu">${roleButton('🛒', '구매', '판매 상품 보기')}${roleButton('🐠', '수족관', '내 구매 요청')}${roleButton('▦', '재고', '판매 요청하기')}</div>`;
document.querySelector('main').appendChild(buyerScreen);

const sellerScreen = document.createElement('section');
sellerScreen.id = 'seller';
sellerScreen.className = 'app-screen role-screen';
sellerScreen.setAttribute('aria-label', '판매자');
sellerScreen.innerHTML = `<div class="screen-header"><span></span><div><small>SELLER SPACE</small><h2>판매자</h2></div><span></span></div><p class="role-intro">인증된 판매자는 어획량과 상품을 등록하고<br />구매 요청을 수락할 수 있어요.</p><div id="sellerTradeNotice" hidden></div><div class="role-menu" id="sellerRoleMenu">${roleButton('✓', '판매자 인증', '판매 등록 전 확인')}${roleButton('＋', '판매 등록', '상품 올리기', 'seller-main')}${roleButton('📨', '구매 요청 관리', '요청 수락·취소 승인')}${roleButton('⏳', '폐기 예정 할인', '할인 상품 등록')}</div>`;
document.querySelector('main').appendChild(sellerScreen);

const discountSaleScreen = document.createElement('section');
discountSaleScreen.id = 'discountSale';
discountSaleScreen.className = 'app-screen form-screen';
discountSaleScreen.setAttribute('aria-label', '폐기 예정 할인 등록');
const marketOptions = ['부산공동어시장', '자갈치시장', '신동아수산물종합시장', '민락어민활어직판장', '기장시장', '대변항 수산시장', '다대포수산시장', '명지시장'];
discountSaleScreen.innerHTML = `<div class="screen-header"><button class="back" data-go="seller">‹</button><div><small>LAST-CHANCE SALE</small><h2>폐기 예정 할인 등록</h2></div><span></span></div><p class="form-intro">신선도 유지 기간이 얼마 남지 않은 상품을<br />합리적인 가격에 판매해 보세요.</p><form id="discountSaleForm"><p class="discount-form-note">기준 시세 × 판매 수량의 50%가 할인 총액으로 자동 계산됩니다.</p><label>판매 시장<select required>${marketOptions.map(item => `<option value="${item}">${item}</option>`).join('')}</select></label><label>수산물 종류<select id="discountFish" required>${fishData.map(item => `<option value="${item.name}">${item.name}</option>`).join('')}</select></label><label>판매 수량<input id="discountQuantity" type="number" min="1" step="1" required /><small class="single-unit">kg</small></label><label>할인 판매 가격(총액)<input id="discountPrice" type="number" min="1" step="1" readonly required /><small class="single-unit">원</small></label><label>판매 기한<select id="discountExpiry"><option value="오늘 마감">오늘 마감</option><option value="내일 오전 마감">내일 오전 마감</option><option value="내일 마감">내일 마감</option></select></label><button class="primary-button" type="submit">할인 상품 등록하기 <span>→</span></button></form>`;
document.querySelector('main').appendChild(discountSaleScreen);
discountSaleScreen.querySelector('[data-go="seller"]').addEventListener('click', () => go('seller'));
function updateDiscountTotal() {
  const fish = fishData.find(item => item.name === discountSaleScreen.querySelector('#discountFish').value);
  const quantity = Number(discountSaleScreen.querySelector('#discountQuantity').value);
  discountSaleScreen.querySelector('#discountPrice').value = fish?.price > 0 && quantity > 0 ? String(Math.round(fish.price * quantity * 0.5)) : '';
}
discountSaleScreen.querySelector('#discountFish').addEventListener('change', updateDiscountTotal);
discountSaleScreen.querySelector('#discountQuantity').addEventListener('input', updateDiscountTotal);
discountSaleScreen.querySelector('#discountSaleForm').addEventListener('submit', event => {
  event.preventDefault();
  const fish = fishData.find(item => item.name === discountSaleScreen.querySelector('#discountFish').value);
  const price = Number(discountSaleScreen.querySelector('#discountPrice').value);
  const referencePrice = fish?.price || 0;
  const quantity = Number(discountSaleScreen.querySelector('#discountQuantity').value);
  const expectedTotal = Math.round(referencePrice * quantity * 0.5);
  if (!expectedTotal || price !== expectedTotal) { showToast('판매 수량을 입력하면 할인 총액이 자동 계산됩니다.'); return; }
  const sales = JSON.parse(localStorage.getItem('singsing-sales') || '[]');
  sales.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), sellerUid: activeUser()?.uid || 'local-user', sellerEmail: activeUser()?.email || '판매자', market: discountSaleScreen.querySelector('select').value, fish: fish?.name, quantity, price, priceType: 'total', referencePrice, minimumOrder: 1, discounted: true, expires: discountSaleScreen.querySelector('#discountExpiry').value });
  localStorage.setItem('singsing-sales', JSON.stringify(sales));
  discountSaleScreen.querySelector('#discountSaleForm').reset();
  showToast('폐기 예정 할인 상품이 등록되었습니다.');
  go('purchase');
  loadSalesWithMenu();
});

const bottomTabs = document.createElement('nav');
bottomTabs.className = 'bottom-tabs';
bottomTabs.setAttribute('aria-label', '하단 메뉴');
bottomTabs.innerHTML = '<button data-tab="home"><span>⌂</span>홈</button><button data-tab="buyer"><span>🛒</span>구매자</button><button data-tab="seller"><span>⚓</span>판매자</button><button data-tab="profile"><span>👤</span>프로필</button>';
document.querySelector('main').appendChild(bottomTabs);

document.querySelectorAll('#homeRoleMenu button').forEach((button, index) => button.addEventListener('click', () => { const screen = ['catch', 'price'][index]; go(screen); if (screen === 'catch') renderRegisteredInfo('catch'); }));
document.querySelectorAll('#buyerRoleMenu button').forEach((button, index) => button.addEventListener('click', () => { const screen = ['purchase', 'aquarium', 'stock'][index]; go(screen); if (screen === 'purchase') loadSalesWithMenu(); if (screen === 'aquarium') loadAquarium(); if (screen === 'stock') renderRegisteredInfo('stock'); }));
document.querySelectorAll('#sellerRoleMenu button').forEach((button, index) => button.addEventListener('click', () => { if (isBuyerDemo()) { showToast('구매자 테스트 계정은 판매자 기능을 이용할 수 없습니다.'); return; } if (index === 0) { sellerGateTarget = 'seller'; go('sellerVerify'); return; } if (index === 1 || index === 3) { const target = index === 1 ? 'sale' : 'discountSale'; if (!isSellerVerified()) { sellerGateTarget = target; showToast('판매자 인증을 해야합니다.'); go('sellerVerify'); return; } go(target); if (target === 'sale') loadSellerRequests(); return; } openSellerRequestManagement(); }));
bottomTabs.querySelectorAll('button').forEach(button => button.addEventListener('click', () => { const tab = button.dataset.tab; if (tab === 'profile') { go('profile'); loadHistory(); loadSellerPurchaseRequests(); } else { go(tab); if (tab === 'buyer') loadBuyerTradeNotifications(); if (tab === 'seller') loadSellerTradeNotifications(); } }));
loadSellerTradeNotifications();
const initialScreen = document.querySelector('.app-screen.active')?.id;
const initialTab = { home: 'home', catch: 'home', price: 'home', buyer: 'buyer', purchase: 'buyer', aquarium: 'buyer', stock: 'buyer', seller: 'seller', sellerVerify: 'seller', sale: 'seller', discountSale: 'seller', register: 'seller', requestManage: 'seller', profile: 'profile' }[initialScreen];
bottomTabs.hidden = !initialTab;
if (initialTab) bottomTabs.querySelector(`[data-tab="${initialTab}"]`).classList.add('active');
updateRequestNotifications();

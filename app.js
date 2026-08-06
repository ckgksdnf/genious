import { auth, db, firebaseReady, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, getDocs, query, where, serverTimestamp } from './firebase.js';
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
async function loadSales() { const target=document.getElementById('saleList'); target.innerHTML='<p class="empty-sale">판매 상품을 불러오는 중입니다.</p>'; try { const snapshot=await getDocs(collection(db,'sales')); const rows=snapshot.docs.map(doc=>({id:doc.id,...doc.data()})); target.innerHTML=rows.length?rows.map(s=>`<article class="sale-card"><div><b>${s.fish}</b><small>${s.market} · 판매자 ${s.sellerEmail}</small><strong>${s.quantity}kg · ${Number(s.price).toLocaleString('ko-KR')}원/kg</strong></div><button data-sale="${s.id}">구매 요청</button></article>`).join(''):'<p class="empty-sale">아직 판매 등록된 상품이 없습니다.</p>'; window.saleRows=rows; } catch { target.innerHTML='<p class="empty-sale">판매 상품을 불러오지 못했습니다.</p>'; } }
document.getElementById('saleList').addEventListener('click',e=>{if(!e.target.dataset.sale)return; selectedSale=window.saleRows.find(x=>x.id===e.target.dataset.sale); document.getElementById('selectedSale').textContent=`선택 상품: ${selectedSale.fish} · ${selectedSale.quantity}kg · ${Number(selectedSale.price).toLocaleString('ko-KR')}원/kg`; document.getElementById('purchaseForm').hidden=false; document.getElementById('purchaseForm').scrollIntoView({behavior:'smooth'});});
document.querySelector('[data-go="purchase"]').addEventListener('click',loadSales);
document.getElementById('saleForm').addEventListener('submit',async event=>{event.preventDefault();const f=event.currentTarget.querySelectorAll('select,input');try{await addDoc(collection(db,'sales'),{sellerUid:auth.currentUser.uid,sellerEmail:auth.currentUser.email,market:f[0].value,fish:f[1].value,quantity:Number(f[2].value),price:Number(f[3].value),createdAt:serverTimestamp()});await saveHistory('register',`판매 등록 · ${f[1].value} ${f[2].value}kg`);showToast('판매 상품이 등록되었습니다.');event.currentTarget.reset();go('purchase');loadSales();}catch{showToast('로그인 후 이용해 주세요.');}});
document.getElementById('purchaseForm').addEventListener('submit', async event => {
  event.preventDefault();
  const fields = event.currentTarget.querySelectorAll('select,input');
  try { await saveHistory('purchase',`${selectedSale.fish} · ${fields[0].value}kg · ${selectedSale.price}원/kg · ${fields[1].value}`);showToast('구매 요청이 등록되었습니다.');event.currentTarget.reset();event.currentTarget.hidden=true;}catch{showToast('로그인 후 이용해 주세요.');}
});

document.getElementById('registerForm').addEventListener('submit', async event => {
  event.preventDefault();
  const fields = event.currentTarget.querySelectorAll('select,input');
  try { await saveHistory('register', `${fields[0].value} · ${fields[1].value} · 어획 ${fields[2].value}kg · 재고 ${fields[3].value}kg · ${fields[4].value}원/kg`); showToast('수산물 정보가 등록되었습니다.'); event.currentTarget.reset(); } catch { showToast('로그인 후 이용해 주세요.'); }
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

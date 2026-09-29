/**
 * Graphene Smart Cooker — 통합 회귀 검증
 *   node verify_all.js
 * jsdom 위에서 실제 스크립트를 실행해 DOM 구조 · 상태 전이 · 엔진 계산을 확인합니다.
 */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const TARGET = process.argv[2] || path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(TARGET, 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true,
  virtualConsole: new VirtualConsole()
    .on('jsdomError', e => errors.push('jsdomError: ' + e.message))
    .on('error', (...a) => errors.push('console.error: ' + a.join(' ')))
});
const { window } = dom, doc = window.document;
const store = {};
Object.defineProperty(window, 'localStorage', { value: {
  getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }, clear: () => { for (const k in store) delete store[k]; }
}, configurable: true });
window.navigator.vibrate = () => true;
window.AudioContext = function(){ return { createOscillator:()=>({connect(){},start(){},stop(){},frequency:{},type:''}),
  createGain:()=>({connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}),
  destination:{}, currentTime:0, resume(){}, state:'running' }; };

let pass = 0, fail = 0;
const ok  = (n, c, x='') => { c ? (pass++, console.log(`  \u2705 ${n}${x?'  '+x:''}`))
                                : (fail++, console.log(`  \u274C ${n}${x?'  '+x:''}`)); };
const sec = n => console.log(`\n\u2500\u2500 ${n} ${'\u2500'.repeat(Math.max(0, 50 - n.length))}`);
const $   = id => doc.getElementById(id);
const txt = id => ($(id) ? ($(id).innerText || $(id).textContent || '').trim() : null);
const chain = el => { const a=[]; while (el && el.tagName!=='BODY') { a.unshift(el.id || el.tagName.toLowerCase()); el = el.parentElement; } return a.join(' > '); };

setTimeout(() => {
  const W = window;
  const ev = e => window.eval(e);
  const t = txt;                       // 통합 전 파일들이 쓰던 별칭

  sec('A. DOM 구조 — 모바일 영역 이탈 방지');
  ok('런타임 오류 없음', errors.length === 0, errors.join(' | '));
  const inShell = id => chain($(id)).includes('phone-shell');
  ['m-devicecontrol-view','m-care-view','m-action-bar','m-tab-device','m-acc-pinned','m-sheet','m-sheet-dim']
    .forEach(id => ok(`${id} 가 phone-shell 내부`, inShell(id), chain($(id))));
  const scroller = $('m-devicecontrol-view').parentElement;
  ok('2개 탭 뷰가 같은 스크롤 영역', $('m-care-view').parentElement === scroller);
  ok('커뮤니티 뷰 제거됨', $('m-community-view') === null);
  ok('액션바가 phone-shell 직계', $('m-action-bar').parentElement.id === 'phone-shell');
  ok('탭바가 phone-shell 직계', $('m-tab-device').parentElement.parentElement.id === 'phone-shell');
  ok('체크 행 가로 배치', $('m-acc-check-row').className.includes('flex items-center'));
  ok('체크 행 자식 2개', $('m-acc-check-row').children.length === 2);
  ok('요약 카드가 체크 행 형제', $('m-summary-card').parentElement.id === 'm-devicecontrol-view');

  // ===== B. layout_test.js =====
  {
    try { W.resetSimulation(); } catch (e) {}
    for (const k in store) delete store[k];
    try { W.refreshAccessoryCheck(true); } catch (e) {}

  console.log('\n── 배치 순서 ─────────────────────────────');
  const view=$('m-devicecontrol-view');
  const order=[...view.querySelectorAll('[id]')].map(e=>e.id)
        .filter(id=>['m-acc-notice','m-card-material','m-personalize-badge','m-acc-check-row','m-summary-card'].includes(id));
  console.log('   실제 순서:', order.join(' → '));
  ok('안내 배너가 게이지 직후', order[0]==='m-acc-notice');
  ok('체크 행이 재료 카드·개인화 배지 아래',
     order.indexOf('m-acc-check-row') > order.indexOf('m-card-material') &&
     order.indexOf('m-acc-check-row') > order.indexOf('m-personalize-badge'));
  ok('요약 카드는 체크 행 아래', order.indexOf('m-summary-card') > order.indexOf('m-acc-check-row'));
  ok('고정 바가 전송 버튼 앞에',
     $('m-acc-pinned').nextElementSibling && $('m-acc-pinned').nextElementSibling.id==='m-start-guide',
     $('m-acc-pinned').nextElementSibling ? $('m-acc-pinned').nextElementSibling.id : 'none');

  console.log('\n── 미확인 상태 ───────────────────────────');
  $('grid-category').children[0].click();
  $('grid-cut').children[0].click();
  ok('안내 배너 노출', !$('m-acc-notice').classList.contains('hidden'));
  ok('장착할 액세서리 표기', ($('m-acc-what').innerText||'').includes('스테인레스'), $('m-acc-what').innerText);
  ok('기기 시작 버튼 비활성', $('btn-start').disabled===true);

  console.log('\n── 스크롤 고정 ───────────────────────────');
  const row=$('m-acc-check-row'), scroller=row.closest('.overflow-y-auto');
  // jsdom 은 레이아웃이 없으므로 위치를 직접 흉내 냅니다.
  scroller.getBoundingClientRect=()=>({top:100,bottom:700,left:0,right:360,width:360,height:600});
  row.getBoundingClientRect=()=>({top:300,bottom:360,left:0,right:360,width:360,height:60});
  window.updateAccPinnedBar();
  ok('화면 안이면 고정 바 숨김', $('m-acc-pinned').classList.contains('hidden'));
  row.getBoundingClientRect=()=>({top:20,bottom:80,left:0,right:360,width:360,height:60}); // 위로 밀려남
  window.updateAccPinnedBar();
  ok('위로 벗어나면 고정 바 노출', !$('m-acc-pinned').classList.contains('hidden'));
  ok('고정 바 체크 미선택', $('m-acc-check-pin').checked===false);

  window.toggleAccessoryCheck();
  ok('체크 후 고정 바 숨김', $('m-acc-pinned').classList.contains('hidden'));
  ok('체크 후 안내 배너 숨김', $('m-acc-notice').classList.contains('hidden'));
  ok('체크 후 전송 버튼 활성', $('m-btn-send').disabled === false);
  ok('고정 바 체크 동기화', $('m-acc-check-pin').checked===true);

  console.log('\n── 조리 중에는 노출 안 함 ──────────────────');
  window.startSimulation();
  window.updateAccPinnedBar();
  ok('조리 중 고정 바 숨김', $('m-acc-pinned').classList.contains('hidden'));
  ok('조리 중 안내 배너 숨김', $('m-acc-notice').classList.contains('hidden'));

  ok('런타임 오류 없음', errors.length===0, errors.join('|'));

  }
  // ===== C. temp_test.js =====
  {
    try { W.resetSimulation(); } catch (e) {}
    for (const k in store) delete store[k];
    try { W.refreshAccessoryCheck(true); } catch (e) {}

  console.log('\n── 체크 행 가로 배치 ──────────────────────');
  const row=$('m-acc-check-row');
  ok('flex 가로 배치', row.className.includes('flex items-center'));
  ok('직계 자식 2개 (체크박스 + 텍스트)', row.children.length===2, [...row.children].map(c=>c.tagName).join(','));
  ok('요약 카드는 형제', $('m-summary-card').parentElement.id==='m-devicecontrol-view');
  ok('체크박스가 첫 자식', row.children[0].id==='m-acc-check');

  console.log('\n── 대기: 실내 온도 ────────────────────────');
  ok('게이지 22.0', t('m-temp')==='22.0', t('m-temp'));
  ok('라벨 = 실내 온도', t('m-temp-label')==='실내 온도', t('m-temp-label'));
  ok('링 회색', $('m-ring').getAttribute('stroke')==='#D1D5DB', $('m-ring').getAttribute('stroke'));

  // 초기 심부 온도 슬라이더를 바꿔도 모바일은 실내 온도 유지
  $('test-init-temp').value='-20'; window.updateInitTempLabel('-20');
  ok('슬라이더 변경해도 모바일은 실내 온도', t('m-temp')==='22.0', t('m-temp'));
  ok('기기 센서는 재료 온도 반영', t('val-temp')==='-20.0', t('val-temp'));
  $('test-init-temp').value='4'; window.updateInitTempLabel('4');

  console.log('\n── 조리 시작: 프로브 연결 ─────────────────');
  $('grid-category').children[0].click(); $('grid-cut').children[0].click();
  window.toggleAccessoryCheck();
  window.startSimulation();
  ok('게이지가 심부 온도로 전환', t('m-temp')==='4.0', t('m-temp'));
  ok('라벨 = 심부 온도', t('m-temp-label')==='심부 온도', t('m-temp-label'));
  const logs=$('log-container').textContent;
  ok('프로브 연결 로그', logs.includes('무선 프로브 연결'), (logs.match(/\[Sensor\][^\n]*/)||[''])[0].trim());

  for(let i=0;i<8000;i++){window.engineTick(); if(ev('deviceState.cookStatus')==='completed')break;}
  ok('조리 중 심부 온도 상승', parseFloat(t('m-temp'))>50, t('m-temp')+'℃');
  ok('완료 후에도 심부 온도 유지', t('m-temp-label')==='심부 온도');

  console.log('\n── 초기화: 프로브 분리 ────────────────────');
  window.resetSimulation();
  ok('게이지 실내 온도 복귀', t('m-temp')==='22.0', t('m-temp'));
  ok('라벨 실내 온도 복귀', t('m-temp-label')==='실내 온도');
  ok('링 회색 복귀', $('m-ring').getAttribute('stroke')==='#D1D5DB');

  ok('런타임 오류 없음', errors.length===0, errors.join('|'));

  }
  // ===== D. new_checks.js =====
  {
    try { W.resetSimulation(); } catch (e) {}
    for (const k in store) delete store[k];
    try { W.refreshAccessoryCheck(true); } catch (e) {}

  console.log('\n── 시작 뷰 ───────────────────────────────');
  ok('런타임 오류 없음', errors.length===0, errors.join('|'));
  ok('currentViewMode = mobile', ev('currentViewMode')==='mobile', ev('currentViewMode'));
  ok('모바일 패널만 표시', !$('phone-column').classList.contains('hidden')
      && $('panel-device').classList.contains('hidden')
      && $('panel-engine').classList.contains('hidden'));
  ok('모바일 버튼 활성', doc.querySelector('[data-mode="mobile"]').classList.contains('bg-sky-500'));
  ok('전체 구성 버튼 비활성', !doc.querySelector('[data-mode="all"]').classList.contains('bg-sky-500'));
  ok('레이아웃 1열', $('main-content').classList.contains('grid-cols-1'));

  console.log('\n── 소고기: 항상 명시적 확인 ────────────────');
  const cats=[...$('grid-category').children];
  cats[0].click(); $('grid-cut').children[0].click();      // 소고기 · 꽃등심
  ok('체크 기본 off', ev('state.accessoryConfirmed')===false);
  ok('체크박스 unchecked', $('m-acc-check').checked===false);
  ok('기기 시작 버튼 비활성', $('btn-start').disabled===true);
  ok('모바일 시작 버튼 없음 (기기 전용)', $('m-btn-start') === null);
  ok('전송 버튼 존재', !!$('m-btn-send'));
  ok('기기 안내 노출', !$('acc-confirm-hint').classList.contains('hidden'));
  ok('모바일 상단 배너 노출', !$('m-acc-notice').classList.contains('hidden'));
  window.startSimulation();
  ok('시작 차단됨', ev('deviceState.cookStatus')==='idle');

  window.toggleAccessoryCheck();
  ok('체크 후 시작 버튼 활성', $('btn-start').disabled===false);
  ok('체크 후 안내 숨김', $('acc-confirm-hint').classList.contains('hidden')
      && $('m-acc-notice').classList.contains('hidden'));

  console.log('\n── 완주 후에도 소고기는 다시 확인 ───────────');
  ev('state.accessoryConfirmed = true');
  window.startSimulation();
  for(let i=0;i<8000;i++){window.engineTick(); if(ev('deviceState.cookStatus')==='completed')break;}
  ok('조리 완료', ev('deviceState.cookStatus')==='completed');
  ok('시그니처 저장', !!store['minmax_last_accessory'], store['minmax_last_accessory']);
  window.resetSimulation();
  ok('소고기 재확인 필요 (자동체크 안 함)', ev('state.accessoryConfirmed')===false);
  ok('시작 버튼 다시 비활성', $('btn-start').disabled===true);

  console.log('\n── 돼지고기도 동일 ─────────────────────────');
  cats[1].click(); $('grid-cut').children[0].click();
  ok('돼지고기 체크 off', ev('state.accessoryConfirmed')===false, ev('state.category'));

  console.log('\n── 해산물: 기존 자동 확인 유지 ──────────────');
  store['minmax_last_accessory']='glass|none|none';
  cats[3].click(); $('grid-cut').children[0].click();      // 해산물
  ok('구성 일치 시 자동 체크', ev('state.accessoryConfirmed')===true,
     `${ev('state.bottomVessel')}|${ev('state.bottomGrill')}|${ev('state.topAccessory')}`);
  ok('시작 버튼 활성', $('btn-start').disabled===false);

  }
  // ===== E. verify.js =====
  {
    try { W.resetSimulation(); } catch (e) {}
    for (const k in store) delete store[k];
    try { W.refreshAccessoryCheck(true); } catch (e) {}



  sec('0. 로드 · 초기 상태');
  ok('스크립트 런타임 오류 없음', errors.length === 0, errors.join(' | '));
  ok('버전 V8.5.1', doc.title.includes('V8.5.1'), doc.title);
  ok('초기 심부 온도 4℃', $('test-init-temp').value === '4', 'value=' + $('test-init-temp').value);
  ok('라벨 4 ℃', (txt('slider-temp-val') || '').trim().startsWith('4'), txt('slider-temp-val'));
  ok('기기 온도 표시 4.0', txt('val-temp') === '4.0', txt('val-temp'));
  ok('모바일 온도 = 실내 22.0 (프로브 미연결)', txt('m-temp') === '22.0', txt('m-temp'));
  ok('모바일 온도 라벨 = 실내 온도', (txt('m-temp-label')||'').trim() === '실내 온도', txt('m-temp-label'));

  sec('1. 메뉴 순서 · 문구');
  const modes = [...doc.querySelectorAll('.view-menu-btn')].map(b => b.dataset.mode);
  const labels = [...doc.querySelectorAll('.view-menu-btn')].map(b => b.textContent.trim());
  ok('순서 mobile→all→device→engine', modes.join(',') === 'mobile,all,device,engine', modes.join(','));
  ok('"기존 구성" 문구 제거', !labels.join('').includes('기존 구성'), labels[1]);
  ok('기본 선택 = 모바일 UX', doc.querySelector('[data-mode="mobile"]').className.includes('bg-sky-500'));
  ok('Device Setting 문구', html.includes('Device Setting') && !html.includes('Device UI (LCD Panel)'));

  sec('2. 재료 선택 (회귀 핵심)');
  const catBtns = $('grid-category').children;
  ok('카테고리 버튼 6개 생성', catBtns.length === 6, catBtns.length + '개');
  ok('모바일 칩 6개 생성', doc.querySelectorAll('.m-cat-chip').length === 6);

  catBtns[0].click();                       // 소고기
  ok('카테고리 선택 → state.category', ev("state.category") === 'beef', ev("state.category"));
  const cutBtns = $('grid-cut').children;
  ok('부위 버튼 5개 생성', cutBtns.length === 5, cutBtns.length + '개');
  ok('액세서리 기본값 적용', ev("state.bottomGrill") === 'stainless' && ev("state.topAccessory") === 'copper',
     `${ev("state.bottomVessel")}/${ev("state.bottomGrill")}/${ev("state.topAccessory")}`);

  cutBtns[0].click();                       // 꽃등심
  ok('부위 선택 → state.cut', ev("state.cut") === '꽃등심', ev("state.cut"));
  ok('굽기 자동 선택 (미디엄 레어)', ev("state.doneness") === '미디엄 레어', ev("state.doneness"));
  ok('시어링 추천값 산출', ev("state.searCount") > 0 && ev("state.searSec") > 0,
     `${ev("state.searCount")}회 × ${ev("state.searSec")}초`);
  ok('시어링 방식 기본 선시어', ev("state.searMode") === 'pre', ev("state.searMode"));

  sec('3. 요약 카드 · 시작 조건');
  ok('요약 1줄', (txt('m-summary-line1') || '').includes('미디엄 레어'), txt('m-summary-line1'));
  ok('요약 2줄', (txt('m-summary-line2') || '').includes('스테인레스'), txt('m-summary-line2'));
  ok('액세서리 미확인 상태 (소·돼지는 항상)', ev("state.accessoryConfirmed") === false);
  ok('미확인 시 시작 버튼 비활성', $('btn-start').disabled === true);
  W.startSimulation();
  ok('미확인 시 시작 차단', ev("deviceState.cookStatus") === 'idle');
  ok('차단 시 기기 안내 표시', !$('acc-confirm-hint').className.includes('hidden'));
  ok('차단 시 기기제어 탭 복귀', !$('m-devicecontrol-view').className.includes('hidden'));

  sec('4. 인터락');
  W.mobileSetGrill('none');
  ok('그릴 없음 → 상단 자동 강등', ev("state.topAccessory") === 'none', ev("state.topAccessory"));
  ok('시어링 비활성', W.isSearingAvailable() === false);
  ok('시어링 파라미터 0', ev("state.searCount") === 0);
  W.mobileSetGrill('stainless'); W.mobileSetTop('copper');
  ok('복구 → 시어링 재활성', W.isSearingAvailable() === true);

  sec('5. P3/P4 회귀 (V8.4.1 수정분)');
  W.mobileSetGrill('copper');
  const beforeGrill = ev("state.bottomGrill");
  const dBtns = [...$('grid-doneness').children].filter(b => !b.disabled);
  dBtns[dBtns.length - 1].click();          // LCD에서 굽기만 변경
  ok('P3 굽기 변경해도 액세서리 유지', ev("state.bottomGrill") === beforeGrill,
     `${beforeGrill} → ${ev("state.bottomGrill")}`);

  W.toggleAccessoryCheck();                 // 수동 체크
  ok('수동 체크 반영', ev("state.accessoryConfirmed") === true);
  W.mobileSetSearMode('post');
  ok('P4 시어링 방식 변경해도 체크 유지', ev("state.accessoryConfirmed") === true);
  W.mobileSetSearMode('pre');

  sec('6. 조리 실행 · 고내 온도');
  ev("state.accessoryConfirmed = true");
  W.startSimulation();
  ok('조리 시작', ev("deviceState.cookStatus") === 'cooking');
  ok('선택 영역 잠금', $('step-cut').className.includes('pointer-events-none'));
  ok('배속은 잠기지 않음', !doc.querySelector('input[name="timeScale"]').closest('div').className.includes('pointer-events-none'));
  ok('시작 버튼 → 중지', (txt('btn-start') || '').includes('중지'), txt('btn-start'));
  ok('상태 배지 표시', !$('device-status-badge').className.includes('hidden'), txt('device-status-badge'));

  const total = ev("totalSimTime");
  const seen = {}; const chamberByPhase = {};
  // 가상 시간을 직접 진행시키며 각 구간을 관찰
  for (let step = 0; step < 4000; step++) {
    W.engineTick();
    const ph = ev("deviceState.currentPhase");
    const k = ph === 3 ? ('3-' + (ev("currentSegKey") || '')) : String(ph);
    if (!seen[k]) seen[k] = { t: ev("virtualTime"), chamber: ev("chamberTemp"), core: ev("thermalMetrics.currentMaterialTemp") };
    chamberByPhase[k] = ev("chamberTemp");
    if (ev("deviceState.cookStatus") === 'completed') break;
  }
  ok('조리 완료 도달', ev("deviceState.cookStatus") === 'completed');
  ok('심부 최종 = final', Math.abs(ev("thermalMetrics.currentMaterialTemp") - ev("thermalMetrics.targetTempFinal")) < 0.2,
     ev("thermalMetrics.currentMaterialTemp").toFixed(1) + '℃ / 목표 ' + ev("thermalMetrics.targetTempFinal"));

  console.log('\n  구간별 고내 온도 (진입 시 → 이탈 시)');
  for (const k of Object.keys(seen)) {
    console.log(`    ${k.padEnd(14)} 진입 ${seen[k].chamber.toFixed(0).padStart(3)}℃  이탈 ${chamberByPhase[k].toFixed(0).padStart(3)}℃  (심부 ${seen[k].core.toFixed(1)}℃)`);
  }
  const searKeys = Object.keys(seen).filter(k => k.includes('sear'));
  ok('시어링 구간 존재', searKeys.length >= 1, searKeys.join(','));
  ok('시어링 중 고내 150℃ 이상', Math.max(...searKeys.map(k => chamberByPhase[k])) > 150,
     Math.max(...searKeys.map(k => chamberByPhase[k])).toFixed(0) + '℃');
  ok('템퍼링 고내 ≤ 45℃', (chamberByPhase['2'] || 0) <= 45.5, (chamberByPhase['2'] || 0).toFixed(0) + '℃');
  ok('고내 최대 ≤ 200℃', Math.max(...Object.values(chamberByPhase)) <= 200.5,
     Math.max(...Object.values(chamberByPhase)).toFixed(0) + '℃');
  ok('레스팅에서 고내 하강', (chamberByPhase['4'] || 999) < (chamberByPhase['3-rise-0'] || 0));

  sec('7. 완료 후 상태');
  ok('피드백 카드 표시', !$('m-feedback-card').className.includes('hidden'));
  ok('4단계 진행 표시 유지(P6)', !$('m-phase-track').className.includes('hidden'));
  ok('선택 영역 잠금 해제', !$('step-cut').className.includes('pointer-events-none'));
  ok('마지막 굽기 저장', !!store[Object.keys(store).find(k => k.startsWith('minmax_lastdone')) || ''],
     Object.keys(store).filter(k=>k.startsWith('minmax_lastdone')).join(''));
  ok('액세서리 시그니처 저장', !!store['minmax_last_accessory'], store['minmax_last_accessory']);

  W.resetSimulation();
  ok('초기화 → idle', ev("deviceState.cookStatus") === 'idle');
  ok('초기화 후 소고기는 재확인 요구', ev("state.accessoryConfirmed") === false);
  ok('고내 온도 표시 리셋', txt('val-surface') === '--', txt('val-surface'));

  sec('8. 시어링 자동 축소 (P2)');
  W.setSearParams(5, 90, 'test');
  const before = { c: ev("state.searCount"), s: ev("state.searSec") };
  const plan = W.buildPhase3Segments(300, 5, 90, 45, 'pre');
  ok('반환 구조 객체', plan && Array.isArray(plan.segments));
  ok('축소 플래그', plan.adjusted === true, `${before.c}회 → ${plan.count}회`);
  ok('구간 합계 = duration', Math.abs(plan.segments.reduce((a, g) => a + g.dur, 0) - plan.duration) < 0.01);
  ok('승강 시간이 조리시간에 추가됨', plan.duration > 300 && Math.abs(plan.duration - 300 - plan.moveTotal) < 0.01,
     `300 + ${plan.moveTotal.toFixed(1)}s = ${plan.duration.toFixed(1)}s`);

  sec('9. 탭 · 바텀시트');
  W.switchMobileTab('care');
  ok('유용한 정보 탭 전환', !$('m-care-view').className.includes('hidden'));
  ok('액션바 숨김', $('m-action-bar').className.includes('hidden'));
  ok('카드 6장', doc.querySelectorAll('#care-card-list .care-card').length === 6,
     doc.querySelectorAll('#care-card-list .care-card').length + '장');
  W.switchMobileTab('device');
  W.openSheet('adjust');
  ok('시트 내용 렌더', ($('m-sheet-body').innerHTML || '').length > 100);

  sec('10. 조리 설정 적용 (applyCookSetting)');
  W.applyCookSetting({ cat:'pork', cut:'삼겹살', done:'미디엄 웰',
    vessel:'none', grill:'stainless', top:'copper',
    searMode:'pre', searCount:2, searSec:60, gapSec:45 });
  ok('카테고리 적용', ev("state.category") === 'pork', ev("state.category"));
  ok('액세서리 적용', ev("state.topAccessory") === 'copper');
  ok('시어링 적용 (gapSec 포함)',
     ev("state.searCount") === 2 && ev("state.searSec") === 60 && ev("state.gapSec") === 45,
     `${ev("state.searCount")}회 × ${ev("state.searSec")}초 / 간격 ${ev("state.gapSec")}초`);
  ok('기기제어 탭 복귀', !$('m-devicecontrol-view').className.includes('hidden'));

  sec('11. 안전모드');
  ev("state.accessoryConfirmed = true");
  W.startSimulation();
  for (let i = 0; i < 6000; i++) { W.engineTick(); if (ev("deviceState.currentPhase") === 4) break; }
  ok('레스팅 도달', ev("deviceState.currentPhase") === 4, 'phase=' + ev("deviceState.currentPhase"));
  W.triggerEmergency();
  ok('안전모드 진입', ev("deviceState.cookStatus") === 'emergency');
  ok('기기 버튼 2개 분할', !$('btn-emergency-pair').className.includes('hidden'));
  const grillDuring = txt('hood-status');
  W.resumeFromEmergency();
  W.engineTick();   // 재개 후 첫 틱에서 액추에이터가 복구됩니다
  ok('재개 → resting 복귀', ev("deviceState.cookStatus") === 'resting');
  ok('P5 레스팅 그릴 복구', !(txt('hood-status') || '').includes('안전모드'),
     `${(grillDuring||'').replace(/\s+/g,' ')} → ${(txt('hood-status')||'').replace(/\s+/g,' ')}`);

  }
  // ===== F. V8.4.3 승강 시간 · 간격 조절 =====
  {
    try { W.resetSimulation(); } catch (e) {}
    for (const k in store) delete store[k];
    try { W.refreshAccessoryCheck(true); } catch (e) {}

    sec('F. 승강(리프팅) 시간');
    ok('liftTime 30→70mm', Math.abs(W.liftTime(30, 70) - 1.6) < 0.05, W.liftTime(30,70) + 's');
    ok('liftTime 30→150mm', Math.abs(W.liftTime(30, 150) - 4.8) < 0.05, W.liftTime(30,150) + 's');
    ok('liftTime 최소 0.5초 보장', W.liftTime(30, 31) === 0.5, W.liftTime(30,31) + 's');
    ok('높이계수 보간 (100mm)', W.heightFactor(100) < 0.96 && W.heightFactor(100) > 0.90,
       W.heightFactor(100).toFixed(3));

    const p1 = W.buildPhase3Segments(840, 2, 45, 45, 'pre');
    const kinds = p1.segments.map(g => g.kind).join(',');
    ok('선시어 구간 순서', kinds === 'sear,move,gap,move,sear,move,rise', kinds);
    ok('접촉 시간 보장 (45초 그대로)', p1.segments.filter(g=>g.kind==='sear').every(g=>g.dur===45));
    ok('승강 시간 합계', Math.abs(p1.moveTotal - (1.6+1.6+4.8)) < 0.05, p1.moveTotal.toFixed(1) + 's');
    ok('조리 길이 = 840 + 승강', Math.abs(p1.duration - (840 + p1.moveTotal)) < 0.05, p1.duration.toFixed(1) + 's');

    const p2 = W.buildPhase3Segments(840, 2, 45, 45, 'post');
    const k2 = p2.segments.map(g => g.kind).join(',');
    ok('후시어 구간 순서', k2 === 'move,rise,move,sear,move,gap,move,sear', k2);

    const p0 = W.buildPhase3Segments(600, 0, 0, 45, 'pre');
    ok('시어링 없으면 이동 1회(30→150)', p0.segments.map(g=>g.kind).join(',') === 'move,rise',
       p0.segments.map(g=>g.kind).join(','));

    sec('F2. 간격 시간 사용자 조절');
    doc.getElementById('grid-category').children[0].click();
    doc.getElementById('grid-cut').children[0].click();
    const gapBefore = ev('state.gapSec');
    W.setSearGap(80);
    ok('간격 변경 반영', ev('state.gapSec') === 80, `${gapBefore} → ${ev('state.gapSec')}`);
    ok('LCD 슬라이더 동기화', $('test-sear-gap').value === '80', $('test-sear-gap').value);
    ok('LCD 라벨 동기화', txt('sear-gap-val') === '80초', txt('sear-gap-val'));
    W.setSearGap(500);
    ok('상한 180초 클램프', ev('state.gapSec') === 180, ev('state.gapSec') + '초');
    W.setSearGap(1);
    ok('하한 20초 클램프', ev('state.gapSec') === 20, ev('state.gapSec') + '초');
    W.setSearGap(120);

    sec('F3. 실행 검증');
    ev('state.accessoryConfirmed = true');
    W.startSimulation();
    const seen = {};
    for (let i = 0; i < 9000; i++) {
      W.engineTick();
      const k = ev('currentSegKey');
      if (k && !seen[k]) seen[k] = ev('hwGrillMM');
      if (ev("deviceState.cookStatus") === 'completed') break;
    }
    ok('완주', ev("deviceState.cookStatus") === 'completed');
    ok('move 구간 진입 확인', Object.keys(seen).some(k => k.startsWith('move')), Object.keys(seen).join(' '));
    ok('심부 최종 = final',
       Math.abs(ev('thermalMetrics.currentMaterialTemp') - ev('thermalMetrics.targetTempFinal')) < 0.2,
       ev('thermalMetrics.currentMaterialTemp').toFixed(1));
    const lg = $('log-container').textContent;
    ok('승강 로그 기록', lg.includes('상단 그릴 하강') || lg.includes('상단 그릴 상승'),
       (lg.match(/\[MCU\] 상단 그릴[^\[]*/) || [''])[0].trim());
    ok('시작 로그에 승강 시간 표기', lg.includes('승강'),
       (lg.match(/\[Config\] 시어링[^\[]*/) || [''])[0].trim());
  }

  // ===== G. V8.4.3 소고기 기준값 =====
  {
    try { W.resetSimulation(); } catch (e) {}
    for (const k in store) delete store[k];
    try { W.refreshAccessoryCheck(true); } catch (e) {}

    sec('G. 소고기 시어링 기준값');
    doc.getElementById('grid-category').children[0].click();   // 소고기
    doc.getElementById('grid-cut').children[0].click();        // 꽃등심
    ok('접촉 시간 30초', ev('state.searSec') === 30, ev('state.searSec') + '초');
    ok('간격 120초', ev('state.gapSec') === 120, ev('state.gapSec') + '초');
    ok('횟수 3회', ev('state.searCount') === 3, ev('state.searCount') + '회');
    ok('LCD 슬라이더 동기화', $('test-sear-sec').value === '30' && $('test-sear-gap').value === '120',
       `${$('test-sear-sec').value} / ${$('test-sear-gap').value}`);
    ok('간격 상한 180초', $('test-sear-gap').max === '180', $('test-sear-gap').max);
    W.setSearGap(180);
    ok('기본값보다 위로 조절 가능', ev('state.gapSec') === 180, ev('state.gapSec') + '초');
    W.setSearGap(120); ev('state.searUserTouched = false');

    const plan = W.buildPhase3Segments(840, 3, 30, 120, 'pre');
    ok('시어 구간 30초', plan.segments.filter(g=>g.kind==='sear').every(g=>g.dur===30));
    ok('간격 구간 120초', plan.segments.filter(g=>g.kind==='gap').every(g=>g.dur===120));
    ok('60% 안전장치 통과 (축소 없음)', plan.adjusted === false,
       `시어 총 ${(30+120)*3-120}초 / 한도 ${840*0.6}초`);
    ok('조리 길이 = 840 + 승강', Math.abs(plan.duration - (840 + plan.moveTotal)) < 0.05,
       plan.duration.toFixed(1) + 's');


    sec('G2. 시간 표기 · 안내 문구');
    ok('체크 행 하단 안내 제거됨', $('m-acc-hint') === null);
    ok('상단 배너는 유지', $('m-acc-notice') !== null);

    try { W.resetSimulation(); } catch (e) {}
    doc.getElementById('grid-category').children[0].click();
    doc.getElementById('grid-cut').children[1].click();      // 채끝
    ev('state.accessoryConfirmed = true');
    const etaTxt = txt('eta-preview');
    ok('기기 ETA에 소수점 없음', !/\d+\.\d/.test(etaTxt), etaTxt);
    const remIdle = txt('m-time-remain');
    ok('모바일 예상시간 MM:SS 형식', /^\d{2}:\d{2}$/.test(remIdle), remIdle);

    W.startSimulation();
    let sawDecimal = false, sample = '';
    for (let i = 0; i < 400; i++) {
      W.engineTick();
      const v = txt('m-time-remain');
      if (!/^\d{2}:\d{2}$/.test(v)) { sawDecimal = true; sample = v; break; }
    }
    ok('조리 중에도 MM:SS 유지', !sawDecimal, sawDecimal ? sample : txt('m-time-remain'));
    ok('채끝 기준 3회 × 30초 / 간격 120초',
       ev('state.searCount') === 3 && ev('state.searSec') === 30 && ev('state.gapSec') === 120,
       `${ev('state.searCount')}회 × ${ev('state.searSec')}초 / ${ev('state.gapSec')}초`);

    try { W.resetSimulation(); } catch (e) {}
    // 돼지·닭 기준값은 그대로인지
    doc.getElementById('grid-category').children[1].click();
    doc.getElementById('grid-cut').children[0].click();
    ok('돼지고기 기준값 유지 (60초/45초)',
       ev('state.searSec') === 60 && ev('state.gapSec') === 45,
       `${ev('state.searSec')}초 / ${ev('state.gapSec')}초`);
  }

  // ===== H. V8.4.3 목표 온도 표시 · 문구 =====
  {
    try { W.resetSimulation(); } catch (e) {}
    for (const k in store) delete store[k];
    try { W.refreshAccessoryCheck(true); } catch (e) {}

    sec('H. 목표 심부 온도 표시');
    // 앞 섹션의 선택이 남아 있으므로 명시적으로 비운 뒤 확인합니다.
    ev('state.category = null; state.cut = null; state.doneness = null');
    W.updateMobileTargetTemp();
    ok('미선택 시 빈 값', txt('m-target-temp') === '', `"${txt('m-target-temp')}"`);

    // 소고기 채끝 미디엄 레어 → final 55.5
    doc.getElementById('grid-category').children[0].click();
    doc.getElementById('grid-cut').children[1].click();
    ok('대기 중 재료 목표 표시', txt('m-target-temp') === '목표 55.5°', txt('m-target-temp'));

    // 굽기를 웰던으로 바꾸면 목표도 따라감 (final 71.0)
    const dBtns = [...doc.getElementById('grid-doneness').children].filter(b => !b.disabled);
    dBtns[dBtns.length - 1].click();
    ok('굽기 변경 시 목표 갱신', txt('m-target-temp') === '목표 71.0°', txt('m-target-temp'));

    // 돼지고기 미디엄 → final 63.0
    doc.getElementById('grid-category').children[1].click();
    doc.getElementById('grid-cut').children[0].click();
    ok('돼지고기 목표 표시', /^목표 6[38]\.0°$/.test(txt('m-target-temp')), txt('m-target-temp'));

    // 템퍼링 중에도 8.0 이 아니라 재료 목표를 유지하는지
    doc.getElementById('grid-category').children[0].click();
    doc.getElementById('grid-cut').children[1].click();
    ev('state.accessoryConfirmed = true');
    W.startSimulation();
    let temperTxt = null, restTxt = null, restSub = null;
    for (let i = 0; i < 9000; i++) {
      W.engineTick();
      const ph = ev('deviceState.currentPhase');
      if (ph === 2 && !temperTxt) temperTxt = txt('m-target-temp');
      if (ph === 4 && !restTxt) { restTxt = txt('m-target-temp'); restSub = txt('m-action-sub'); }
      if (ev("deviceState.cookStatus") === 'completed') break;
    }
    ok('템퍼링 중 8.0° 아님', temperTxt !== '목표 8.0°', temperTxt);
    ok('템퍼링 중에도 재료 목표', temperTxt === '목표 55.5°', temperTxt);
    ok('레스팅 중에도 재료 목표', restTxt === '목표 55.5°', restTxt);

    sec('H2. 레스팅 문구');
    ok('"가열을 멈추고" 로 표기', restSub === '가열을 멈추고 잔열로 마무리해요', restSub);
    ok('"발열" 표현 없음', !html.includes('발열을 멈추고'));
  }

  // ===== I. V8.4.3 실기기 전체화면 모드 =====
  {
    sec('I. 전체화면 모드 · PWA 메타');
    ok('viewport-fit=cover', html.includes('viewport-fit=cover'));
    ok('apple-mobile-web-app-capable', html.includes('apple-mobile-web-app-capable'));
    ok('theme-color', html.includes('name="theme-color"'));
    ok('홈 화면 아이콘', html.includes('apple-touch-icon'));
    ok('safe-area 상·하단 처리',
       html.includes('env(safe-area-inset-bottom)') && html.includes('env(safe-area-inset-top)'));
    ok('100dvh 사용 (주소창 대응)', html.includes('100dvh'));
    ok('matchMedia 폴백', html.includes('window.innerWidth || document.documentElement.clientWidth'));
    ok('스케일 하한 (음수 방지)', html.includes('Math.max(0.1, Math.min('));

    // 기본(데스크톱) 인스턴스에서는 전체화면 모드가 꺼져 있어야 합니다.
    ok('데스크톱은 DEVICE_MODE=false', ev('DEVICE_MODE') === false);
    ok('device-mode 클래스 없음', !doc.documentElement.classList.contains('device-mode'));
    ['phone-notch','phone-statusbar','m-tabbar','m-app-header'].forEach(id =>
       ok(`${id} 훅 존재`, !!$(id)));
  }

  // ===== J. V8.5.0 서비스 구조 =====
  {
    try { W.resetSimulation(); } catch (e) {}
    for (const k in store) delete store[k];
    try { W.refreshAccessoryCheck(true); } catch (e) {}
    W.setWifiState(true);

    sec('J. 명칭 · 탭 구조');
    ok('Samsung Food 잔재 없음', !html.includes('Samsung Food') && !html.includes('삼성 푸드'));
    ok('SmartThings Food 사용', html.includes('SmartThings Food'));
    ok('Samsung Health 는 유지', html.includes('Samsung Health'));
    ok('탭 2개', doc.querySelectorAll('#m-tabbar > div').length === 2,
       doc.querySelectorAll('#m-tabbar > div').length + '개');
    ok('유용한 정보 라벨', (txt('m-tab-care')||'').includes('유용한 정보'), txt('m-tab-care'));
    ok('커뮤니티 단어 없음', !html.includes('커뮤니티') || html.indexOf('커뮤니티') === html.lastIndexOf('커뮤니티'));
    ok('communityPresets 제거', !html.includes('communityPresets'));
    ok('applyCookSetting 존재', typeof W.applyCookSetting === 'function');

    sec('J2. 조리기기에 보내기 (건조기 패턴)');
    ok('모바일 시작 버튼 없음', $('m-btn-start') === null);
    ok('전송 버튼 존재', !!$('m-btn-send'));
    ok('중단 버튼 유지', !!$('m-btn-stop'));

    doc.getElementById('grid-category').children[0].click();
    ok('① 재료 미완료 — 비활성', $('m-btn-send').disabled === true);
    ok('① 안내', (txt('m-send-sub')||'').includes('재료와 부위'), txt('m-send-sub'));

    doc.getElementById('grid-cut').children[1].click();
    ok('② 액세서리 미확인 — 비활성', $('m-btn-send').disabled === true);
    ok('② 안내', (txt('m-send-sub')||'').includes('액세서리 장착'), txt('m-send-sub'));

    W.toggleAccessoryCheck();
    ok('③ 준비 완료 — 활성', $('m-btn-send').disabled === false);
    ok('③ 파란 버튼', $('m-btn-send').className.includes('bg-[#0381FE]'));
    ok('③ 데모 안내 숨김', $('m-send-demo').classList.contains('hidden'));

    W.sendToDevice();
    ok('④ 전송 후 완료 상태', (txt('m-send-label')||'').includes('기기로 보냈어요'), txt('m-send-label'));
    ok('④ 버튼 비활성 (재전송 방지)', $('m-btn-send').disabled === true);
    ok('④ 다음 행동 안내', ($('m-send-sub').innerHTML||'').includes('조리 시작 버튼'));
    ok('④ 기기 꺼짐 안내', ($('m-send-sub').innerHTML||'').includes('꺼져 있다면'));
    ok('④ 데모 안내 노출', !$('m-send-demo').classList.contains('hidden'));
    ok('④ 데모 1.5초 표기', (txt('m-send-demo')||'').includes('1.5초'), txt('m-send-demo'));
    ok('전송 로그', ($('log-container').textContent||'').includes('모바일에서 조리 설정을 받았습니다'));
    ok('전송 상태 판정', W.isSentToDevice() === true);

    // 설정을 바꾸면 전송이 무효가 되어야 합니다
    const dBtns = [...doc.getElementById('grid-doneness').children].filter(b => !b.disabled);
    dBtns[dBtns.length - 1].click();
    ok('⑤ 설정 변경 시 전송 무효', W.isSentToDevice() === false);
    ok('⑤ 버튼이 보내기로 복귀', (txt('m-send-label')||'').includes('조리기기에 보내기'), txt('m-send-label'));
    ok('⑤ 데모 안내 다시 숨김', $('m-send-demo').classList.contains('hidden'));

    ok('롱프레스 시간 1.5초', ev('SEND_HOLD_MS') === 1500, ev('SEND_HOLD_MS') + 'ms');

    sec('J3. 유용한 정보 카드 6장');
    W.switchMobileTab('care');
    const ids = [...doc.querySelectorAll('#care-card-list .care-card')].map(c => c.dataset.cardId);
    ok('카드 6장', ids.length === 6, ids.join(','));
    ok('convert · history 포함', ids.includes('convert') && ids.includes('history'));
    ok('기본 순서 6개', ev('CARE_DEFAULT_ORDER').length === 6);
    W.convertRecipe('airfry');
    ok('레시피 변환 동작', (txt('cv-from')||'').includes('에어프라이어'), txt('cv-from') + ' ' + txt('cv-to'));
    ok('변환 카드 제목에 AI 없음', !(doc.querySelector('[data-card-id="convert"] h3').textContent||'').includes('AI'));

    sec('J4. 오프라인 — 기기는 완결, 서비스만 멈춤');
    W.setWifiState(false);
    ok('오프라인 칩 표시', !$('m-conn-chip').classList.contains('hidden'));
    const veiled = [...doc.querySelectorAll('#care-card-list .care-card')]
                   .filter(c => c.querySelector('.offline-veil')).map(c => c.dataset.cardId);
    ok('서비스 카드 5장 차단', veiled.length === 5, veiled.join(','));
    ok('이력 카드는 살아있음', !veiled.includes('history'));
    ok('가족 공유만 비활성', $('hist-share').disabled === true);

    // 오프라인 조리 완주
    W.switchMobileTab('device');
    ev('state.accessoryConfirmed = true');
    W.startSimulation();
    ok('오프라인에서 조리 시작', ev("deviceState.cookStatus") === 'cooking');
    for (let i = 0; i < 9000; i++) { W.engineTick(); if (ev("deviceState.cookStatus") === 'completed') break; }
    ok('오프라인에서 조리 완주', ev("deviceState.cookStatus") === 'completed');
    ok('오프라인에서 심부 목표 도달',
       Math.abs(ev('thermalMetrics.currentMaterialTemp') - ev('thermalMetrics.targetTempFinal')) < 0.2);
    ok('조리 엔진에 wifi 참조 없음',
       !/function engineTick[\s\S]{0,4000}wifiConnected/.test(html) &&
       !/function triggerPhase[\s\S]{0,4000}wifiConnected/.test(html));

    sec('J5. 조리 이력 · 가족 공유');
    ok('완주 시 이력 저장', !!store['minmax_history'], (store['minmax_history']||'').slice(0, 60) + '…');
    W.renderHistoryCard();
    ok('이력 목록 표시', !$('hist-list').classList.contains('hidden'));
    ok('빈 안내 숨김', $('hist-empty').classList.contains('hidden'));
    const h0 = JSON.parse(store['minmax_history'])[0];
    ok('이력에 시어링·간격 저장', h0.searCount !== undefined && h0.gapSec !== undefined,
       `${h0.searCount}회 × ${h0.searSec}초 / ${h0.gapSec}초`);

    // 10건 상한
    W.resetSimulation();
    const many = Array.from({length: 15}, (_, i) => ({ ...h0, ts: Date.now() - i * 1000 }));
    store['minmax_history'] = JSON.stringify(many.slice(0, 10));
    ev('state.accessoryConfirmed = true');
    W.startSimulation();
    for (let i = 0; i < 9000; i++) { W.engineTick(); if (ev("deviceState.cookStatus") === 'completed') break; }
    ok('이력 최대 10건', JSON.parse(store['minmax_history']).length === 10,
       JSON.parse(store['minmax_history']).length + '건');

    // 다시 조리
    W.resetSimulation();
    W.setWifiState(true);
    W.rerunHistory(JSON.parse(store['minmax_history'])[0].ts);
    ok('다시 조리 — 설정 복원', ev("state.category") === 'beef' && ev("state.cut") === '채끝',
       `${ev("state.category")} / ${ev("state.cut")}`);
    ok('다시 조리 — 기기제어 탭 복귀', !$('m-devicecontrol-view').className.includes('hidden'));

    W.shareHistoryToFamily();
    const lg = $('log-container').textContent;
    ok('가족 3명 공유 로그', lg.includes('가족 3명'), (lg.match(/\[Share\][^\[]*/) || [''])[0].trim());
    ok('공유 정책 문구', html.includes('외부 공개나 불특정 사용자 전송은 지원하지 않습니다'));
  }

  // ===== K. V8.5.1 일시정지 제거 · 부위 선택 목록 =====
  {
    try { W.resetSimulation(); } catch (e) {}
    for (const k in store) delete store[k];
    try { W.refreshAccessoryCheck(true); } catch (e) {}
    const opts = () => [...$('m-cut-select').options].map(o => o.text);

    sec('K. 일시정지 제거');
    ok('일시정지 버튼 없음', $('m-btn-pause') === null);
    ok('가열 중단 유지', !!$('m-btn-stop'));
    ok('중단 버튼 전폭', $('m-btn-stop').className.includes('w-full'));
    ok('컨테이너 gap 제거', !$('m-btn-cooking-pair').className.includes('gap-2'));

    sec('K2. 부위 선택 목록');
    ev('state.category = null; state.cut = null; state.doneness = null');
    W.syncMobileUI();
    ok('카테고리 전 — 안내만', opts().join(',') === '종류(부위) 선택', opts().join(','));
    doc.getElementById('grid-category').children[0].click();
    ok('선택 전 — 안내 + 5종', opts().length === 6 && opts()[0] === '종류(부위) 선택', opts().join(','));
    ok('안내 항목 disabled', $('m-cut-select').options[0].disabled === true);
    doc.getElementById('grid-cut').children[1].click();
    ok('선택 후 — 안내 사라짐', !opts().includes('종류(부위) 선택'), opts().join(','));
    ok('선택 후 — 5종만', opts().length === 5);
    ok('선택값 유지', $('m-cut-select').value === '채끝', $('m-cut-select').value);
    doc.getElementById('grid-category').children[3].click();
    ok('카테고리 변경 시 안내 복귀', opts()[0] === '종류(부위) 선택');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  통과 ${pass} / 실패 ${fail}`);
  if (errors.length) console.log('  런타임 오류:\n   ' + errors.join('\n   '));
  console.log('='.repeat(60));
  process.exit(fail ? 1 : 0);
}, 500);

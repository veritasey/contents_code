const { JSDOM, VirtualConsole } = require('jsdom');
const fs=require('fs');
const path=require('path');
const TARGET = process.argv[2] || path.join(__dirname, '..', 'index.html');
const html=fs.readFileSync(TARGET,'utf8');
function boot(url, seed){
  const errors=[]; const store = Object.assign({}, seed||{});
  const dom=new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,
    virtualConsole:new VirtualConsole().on('jsdomError',e=>errors.push(e.message)),
    beforeParse(window){   // 스크립트 실행 전에 저장소를 주입해야 초기 판정에 반영됩니다
      Object.defineProperty(window,'localStorage',{value:{getItem:k=>k in store?store[k]:null,
        setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},clear:()=>{}},configurable:true});
    }});
  return {dom,errors,store};
}
let pass=0,fail=0;
const ok=(n,c,x='')=>{c?(pass++,console.log(`  ✅ ${n}${x?'  '+x:''}`)):(fail++,console.log(`  ❌ ${n}${x?'  '+x:''}`))};

const A=boot('https://x.test/a.html');                    // 기본(데스크톱)
const B=boot('https://x.test/a.html?m=1');                // URL 강제
const C=boot('https://x.test/a.html', {minmax_device_mode:'1'});  // 저장된 선택

setTimeout(()=>{
  console.log('\n── 토글 버튼 ─────────────────────────────');
  const d=A.dom.window.document, w=A.dom.window;
  ok('런타임 오류 없음', A.errors.length===0, A.errors.join('|'));
  ok('토글 버튼 존재', !!d.getElementById('dm-toggle'));
  ok('버튼이 body 직계 (뷰어 안에서도 보임)', d.getElementById('dm-toggle').parentElement.tagName==='BODY');
  ok('기본은 데스크톱', w.eval('DEVICE_MODE')===false);
  ok('버튼 라벨 📱', (d.getElementById('dm-toggle').textContent||'').trim()==='📱', (d.getElementById('dm-toggle').textContent||'').trim());

  w.toggleDeviceMode();
  ok('토글 → 전체화면 진입', w.eval('DEVICE_MODE')===true);
  ok('html 클래스 적용', d.documentElement.classList.contains('device-mode'));
  ok('버튼 라벨 🖥', (d.getElementById('dm-toggle').textContent||'').trim()==='🖥');
  ok('모바일 뷰로 강제', w.eval('currentViewMode')==='mobile');
  ok('스케일 해제', d.getElementById('phone-shell').style.transform==='none');
  ok('선택 저장됨', A.store['minmax_device_mode']==='1', A.store['minmax_device_mode']);

  w.toggleDeviceMode();
  ok('다시 토글 → 복귀', w.eval('DEVICE_MODE')===false && !d.documentElement.classList.contains('device-mode'));
  ok('복귀 후 스케일 재적용', /scale\(/.test(d.getElementById('phone-shell').style.transform),
     d.getElementById('phone-shell').style.transform);
  ok('기능 유지 (카테고리 6개)', d.getElementById('grid-category').children.length===6);

  console.log('\n── 진입 경로별 ───────────────────────────');
  ok('?m=1 → 전체화면', B.dom.window.eval('DEVICE_MODE')===true);
  ok('저장된 선택 → 전체화면', C.dom.window.eval('DEVICE_MODE')===true);
  ok('저장값 우선 반영', C.dom.window.document.documentElement.classList.contains('device-mode'));
  ok('B 런타임 오류 없음', B.errors.length===0, B.errors.join('|'));
  ok('C 런타임 오류 없음', C.errors.length===0, C.errors.join('|'));

  console.log('\n── PWA 메타 · 폴백 ───────────────────────');
  ok('viewport-fit=cover', html.includes('viewport-fit=cover'));
  ok('apple-mobile-web-app-capable', html.includes('apple-mobile-web-app-capable'));
  ok('theme-color', html.includes('name="theme-color"'));
  ok('홈 화면 아이콘', html.includes('apple-touch-icon'));
  ok('safe-area 상·하단', html.includes('env(safe-area-inset-bottom)') && html.includes('env(safe-area-inset-top)'));
  ok('100dvh 사용', html.includes('100dvh'));
  ok('matchMedia 폴백', html.includes('window.innerWidth || document.documentElement.clientWidth'));
  ok('스케일 하한', html.includes('Math.max(0.1, Math.min('));
  ['phone-notch','phone-statusbar','m-tabbar','m-app-header'].forEach(id =>
     ok(`${id} 훅 존재`, !!A.dom.window.document.getElementById(id)));

  console.log(`\n  통과 ${pass} / 실패 ${fail}`);
  process.exit(fail?1:0);
},500);

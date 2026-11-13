// @vitest-environment jsdom
import {beforeEach, afterEach, describe, it, expect, vi} from 'vitest';
import {readFileSync} from 'node:fs';

const html = readFileSync('Prótoipo/index.html','utf8');
const el = id => document.getElementById(id);
const saved = key => JSON.parse(localStorage.getItem('entre_nessa_onda_'+key+'_demo_v1') || '[]');

async function boot(preload=null) {
  vi.resetModules();
  document.body.innerHTML=html.split('<body>')[1].split('</body>')[0];
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('confirm', vi.fn(()=>true));
  history.replaceState(null,'','/');
  localStorage.clear();
  if(preload)preload();
  await import('../Prótoipo/app.js');
}
function submit(id) {
  el(id).dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
}
function register(name,email,area='Recreação') {
  el('go-register').click();
  el('reg-name').value=name;
  el('reg-email').value=email;
  el('reg-area').value=area;
  el('reg-consent').checked=true;
  submit('volunteer-form');
  expect(el('register-feedback').textContent).toContain('Cadastro de TESTE salvo');
  el('register-back').click();
}
function admin() {
  el('go-admin').click();
  el('email').value='admin@entrenessaonda.demo';
  el('password').value='Onda2026!';
  submit('login-form');
  expect(el('screen-admin').classList.contains('active')).toBe(true);
}
function assignByEmail(email,sector='Recreação') {
  const p=saved('volunteers').find(x=>x.email===email);
  el('scale-volunteer').value=p.id;
  el('scale-sector').value=sector;
  submit('scale-form');
  return saved('assignments').find(x=>x.volunteerId===p.id);
}
function action(row,text) {
  const button=[...row.querySelectorAll('button')].find(x=>x.textContent===text);
  expect(button,'Ação '+text+' deve existir').toBeTruthy();
  button.click();
}

describe('Cenarios adicionais de regressao e limites',()=>{
  beforeEach(async()=>{await boot();});
  afterEach(()=>{vi.unstubAllGlobals();});

  it('rota admin aberta diretamente exige a tela demonstrativa de login',async()=>{
    await boot();
    history.replaceState(null,'','/?tela=admin');
    vi.resetModules();
    await import('../Prótoipo/app.js');
    expect(el('screen-admin').classList.contains('active')).toBe(false);
    expect(el('screen-login').classList.contains('active')).toBe(true);
    expect(el('admin-demo-credentials').hidden).toBe(false);
  });

  it('nao permite reduzir vagas de setor abaixo da equipe ja escalada',()=>{
    register('Pessoa Alfa','alfa@exemplo.org');
    register('Pessoa Beta','beta@exemplo.org');
    admin();
    assignByEmail('alfa@exemplo.org');
    assignByEmail('beta@exemplo.org');
    expect(el('stat-assigned').textContent).toBe('2');
    const row=el('admin-event-list').querySelector('[data-event-id="demo-event-14"]');
    action(row,'Editar');
    el('cap-recreation').value='1';
    submit('event-form');
    expect(el('event-feedback').textContent).toContain('escalados');
    expect(saved('events')[0].slotsBySector['Recreação']).toBe(4);
  });

  it('nao permite reconfirmar vaga recusada se outra pessoa a ocupou',()=>{
    register('Pessoa Alfa','alfa@exemplo.org');
    register('Pessoa Beta','beta@exemplo.org');
    admin();
    const row=el('admin-event-list').querySelector('[data-event-id="demo-event-14"]');
    action(row,'Editar');
    el('cap-recreation').value='1';
    submit('event-form');
    const first=assignByEmail('alfa@exemplo.org');
    action(el('assignment-list').querySelector('[data-assignment-id="'+first.id+'"]'),'Recusar');
    const second=assignByEmail('beta@exemplo.org');
    expect(second).toBeTruthy();
    el('admin-back').click();
    el('email').value='alfa@exemplo.org';
    el('password').value='123456';
    submit('login-form');
    expect(el('screen-escala').classList.contains('active')).toBe(true);
    el('btn-confirm').click();
    expect(el('screen-resultado').classList.contains('active')).toBe(false);
    expect(saved('assignments').find(x=>x.id===first.id).status).toBe('recusada');
    expect(el('availability-warning').textContent).toContain('vagas');
  });

  it('recusa libera vaga para outro voluntario, sem duplicar escalas',()=>{
    register('Pessoa Alfa','alfa@exemplo.org');
    register('Pessoa Beta','beta@exemplo.org');
    admin();
    const edit=el('admin-event-list').querySelector('[data-event-id="demo-event-14"]');
    action(edit,'Editar');
    el('cap-recreation').value='1';
    submit('event-form');
    const first=assignByEmail('alfa@exemplo.org');
    action(el('assignment-list').querySelector('[data-assignment-id="'+first.id+'"]'),'Recusar');
    const second=assignByEmail('beta@exemplo.org');
    expect(second).toBeTruthy();
    expect(el('stat-assigned').textContent).toBe('1');
    expect(saved('assignments').length).toBe(2);
  });

  it('registro de presenca exige confirmacao e recusa limpa presenca anterior',()=>{
    register('Pessoa Alfa','alfa@exemplo.org');
    admin();
    const item=assignByEmail('alfa@exemplo.org');
    let row=el('assignment-list').querySelector('[data-assignment-id="'+item.id+'"]');
    const presence=[...row.querySelectorAll('button')].find(x=>x.textContent==='Presente');
    expect(presence.disabled).toBe(true);
    action(row,'Confirmar');
    row=el('assignment-list').querySelector('[data-assignment-id="'+item.id+'"]');
    action(row,'Presente');
    expect(el('report-attended').textContent).toBe('1');
    row=el('assignment-list').querySelector('[data-assignment-id="'+item.id+'"]');
    action(row,'Recusar');
    expect(el('report-attended').textContent).toBe('0');
    expect(saved('assignments')[0].attendance).toBe('pendente');
  });

  it('nao permite dar baixa de materiais alem do saldo disponivel',()=>{
    admin();
    const before=Number(el('stat-units').textContent);
    el('materials-qty').value='500';
    submit('event-material-form');
    const row=el('event-material-list').querySelector('[data-material-plan-id]');
    expect(row).toBeTruthy();
    expect(row.textContent).toContain('Estoque insuficiente');
    const button=[...row.querySelectorAll('button')].find(x=>x.textContent==='Registrar uso');
    expect(button.disabled).toBe(true);
    expect(Number(el('stat-units').textContent)).toBe(before);
    expect(el('report-materials').textContent).toBe('0');
  });

  it('evita vincular mesmo material duas vezes ao mesmo evento',()=>{
    admin();
    el('materials-qty').value='2';
    submit('event-material-form');
    submit('event-material-form');
    expect(saved('event_materials').length).toBe(1);
    expect(el('materials-feedback').textContent).toContain('já está planejado');
  });

  it('excluir evento remove escalas e materiais relacionados',()=>{
    register('Pessoa Alfa','alfa@exemplo.org');
    admin();
    assignByEmail('alfa@exemplo.org');
    el('materials-qty').value='2';
    submit('event-material-form');
    expect(saved('assignments').length).toBe(1);
    expect(saved('event_materials').length).toBe(1);
    const row=el('admin-event-list').querySelector('[data-event-id="demo-event-14"]');
    action(row,'Excluir');
    expect(saved('events').length).toBe(0);
    expect(saved('assignments').length).toBe(0);
    expect(saved('event_materials').length).toBe(0);
    expect(el('report-events').textContent).toBe('0');
  });

  it('excluir cadastro remove escala sem remover evento',()=>{
    register('Pessoa Alfa','alfa@exemplo.org');
    admin();
    assignByEmail('alfa@exemplo.org');
    action(el('volunteer-list'),'Excluir');
    expect(saved('volunteers').length).toBe(0);
    expect(saved('assignments').length).toBe(0);
    expect(saved('events').length).toBe(1);
    expect(el('stat-assigned').textContent).toBe('0');
  });

  it('renderiza nomes como texto e nao como HTML executavel',()=>{
    const payload='<img src=x onerror=alert(1)> Voluntário';
    register(payload,'xss@exemplo.org');
    admin();
    expect(el('volunteer-list').textContent).toContain(payload);
    expect(el('volunteer-list').querySelector('img')).toBeNull();
    expect(el('volunteer-list').querySelector('script')).toBeNull();
  });

  it('recupera dados demonstrativos quando localStorage estiver invalido',async()=>{
    await boot(()=>{
      localStorage.setItem('entre_nessa_onda_volunteers_demo_v1','{JSON inválido');
      localStorage.setItem('entre_nessa_onda_events_demo_v1','conteúdo inválido');
      localStorage.setItem('entre_nessa_onda_stock_demo_v1','???');
    });
    admin();
    expect(el('stat-events').textContent).toBe('1');
    expect(el('stat-volunteers').textContent).toBe('0');
    expect(el('stat-products').textContent).toBe('4');
  });

  it('inventario nao permite quantidade abaixo de zero',()=>{
    admin();
    const row=el('inventory-list').querySelector('.inventory-row');
    expect(row).toBeTruthy();
    const minus=[...row.querySelectorAll('button')].find(x=>x.textContent==='−');
    for(let i=0;i<12;i++)minus.click();
    expect(minus.disabled).toBe(true);
    expect(saved('stock')[0].qty).toBe(0);
    expect(el('stat-units').textContent).toBe('17');
  });
});

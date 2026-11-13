import { validarLogin, obterStatusDisponibilidade } from './regras.js';
(()=>{
 const screens=['login','escala','resultado'],el=id=>document.getElementById(id);
 const params=new URLSearchParams(location.search);
 let status='pendente',selectedDay=14,currentTab='calendar';
 function go(screen){
  screens.forEach(x=>el('screen-'+x).classList.toggle('active',x===screen));
  try{history.replaceState(null,'','?tela='+screen)}catch(e){}
  if(typeof scrollTo==='function')scrollTo(0,0);
  document.title='Entre Nessa Onda — '+({login:'Entrada',escala:'Minhas escalas',resultado:'Resultado'}[screen]);
 }
 function view(tab){
  currentTab=tab;
  el('calendar-view').hidden=tab!=='calendar';
  el('participations-view').hidden=tab!=='participations';
  el('tab-calendar').classList.toggle('selected',tab==='calendar');
  el('btn-my-scales').classList.toggle('selected',tab==='participations');
  el('tab-calendar').setAttribute('aria-pressed',String(tab==='calendar'));
  el('btn-my-scales').setAttribute('aria-pressed',String(tab==='participations'));
  el('side-calendar').classList.toggle('active',tab==='calendar');
  el('side-participations').classList.toggle('active',tab==='participations');
  el('nav-calendar').classList.toggle('current',tab==='calendar');
  el('nav-my').classList.toggle('current',tab==='participations');
  go('escala');
 }
 function selectDay(day){
  selectedDay=day;
  document.querySelectorAll('.day[data-day]').forEach(btn=>{
   const active=Number(btn.dataset.day)===day;
   btn.classList.toggle('selected',active);
   if(active)btn.setAttribute('aria-current','date');else btn.removeAttribute('aria-current');
  });
  el('activity-panel').hidden=day!==14;
  el('empty-day').hidden=day===14;
  if(day!==14)el('empty-day-message').textContent='Nenhuma atividade cadastrada para '+day+' de novembro nesta demonstração.';
 }
 function updateResult(confirmed){
  status=obterStatusDisponibilidade(confirmed);
  const label=confirmed?'Confirmada':'Recusada';
  const pillClass='pill '+(confirmed?'confirmed':'no');
  el('escala-status').className=pillClass;
  el('escala-status').textContent=confirmed?'✓ Confirmada':'✕ Recusada';
  el('participation-status').className=pillClass;
  el('participation-status').textContent=confirmed?'✓ Confirmada':'✕ Recusada';
  el('result-title').textContent=confirmed?'Disponibilidade confirmada!':'Resposta registrada';
  el('result-description').textContent=confirmed?'Sua resposta foi registrada nesta demonstração. A equipe poderá considerar a confirmação no planejamento futuro.':'Você informou que não poderá participar desta ação. Na versão completa, a coordenação poderá reorganizar a escala.';
  el('result-pill').className=pillClass;
  el('result-pill').textContent=confirmed?'✓ Status: Confirmada':'✕ Status: Recusada';
  el('result-status').textContent=label;
  el('result-status').style.color=confirmed?'#146544':'#A13F3F';
  go('resultado');el('result-title').focus();
 }
 el('login-form').addEventListener('submit',e=>{
  e.preventDefault();const valid=validarLogin(el('email').checkValidity(),el('password').value);
  el('login-error').classList.toggle('show',!valid);
  if(valid)view('calendar');
  else (el('email').checkValidity()?el('password'):el('email')).focus();
 });
 el('toggle-password').addEventListener('click',()=>{
  const p=el('password');p.type=p.type==='password'?'text':'password';
  el('toggle-password').textContent=p.type==='password'?'Mostrar':'Ocultar';
  el('toggle-password').setAttribute('aria-label',p.type==='password'?'Mostrar senha':'Ocultar senha');
 });
 el('btn-confirm').addEventListener('click',()=>updateResult(true));
 el('btn-decline').addEventListener('click',()=>updateResult(false));
 ['result-back','btn-back-calendar','btn-view-scales'].forEach(id=>el(id).addEventListener('click',()=>view('calendar')));
 ['btn-my-scales','side-participations','nav-my'].forEach(id=>el(id).addEventListener('click',()=>view('participations')));
 ['tab-calendar','side-calendar','nav-calendar','participations-back'].forEach(id=>el(id).addEventListener('click',()=>view('calendar')));
 ['nav-exit','side-logout'].forEach(id=>el(id).addEventListener('click',()=>go('login')));
 ['prev-month','next-month'].forEach(id=>el(id).addEventListener('click',()=>alert('Esta demonstração apresenta somente novembro de 2026.')));
 document.querySelectorAll('.day[data-day]').forEach(btn=>btn.addEventListener('click',()=>selectDay(Number(btn.dataset.day))));
 el('back-to-event').addEventListener('click',()=>selectDay(14));
 const entry=params.get('tela');go(screens.includes(entry)?entry:'login');
})();

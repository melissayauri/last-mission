const role=new URLSearchParams(location.search).get('role')||'student';
if(role==='cinema')document.body.classList.add('cinema');
const app=document.getElementById('app'),error=document.getElementById('error');
const teams=['Aegis','Cipher','Sentinel','Phantom','Titan','Phoenix'];
const options=['Permitir dentro del alcance','Permitir con controles adicionales','Denegar'];
const singleChoice=new Set([6,8,9,10,14,15,16,17,18,19,20,21,22]);
const costs=[350,250,200,150,250,450,200,200];
const purchaseLabels=['Alternativa manual','Repositorio aprobado','Circuit breaker','Timeout y reintentos limitados','Monitoreo','Proveedor alternativo validado','Validación adicional','Pruebas de contingencia'];
const verdictLabels=['GO completo','Piloto condicionado a controles verificados','NO-GO hasta corregir deficiencias'];
let audio=null,ambient=[],sound=false,sceneId=null;
let token=sessionStorage.getItem('nexus-'+role),last='',state=null,refreshSequence=0,pending=false,serverOffset=0;
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function button(text,fn){const b=document.createElement('button');b.textContent=text;b.onclick=fn;return b;}
async function api(body){const response=await fetch('/api',{method:body?'POST':'GET',headers:{'Content-Type':'application/json','Authorization':token||''},body:body?JSON.stringify(body):undefined});const data=await response.json();if(response.status===401&&token){sessionStorage.removeItem('nexus-'+role);token=null;if(role!=='cinema')loginForm();else app.textContent='Abre el proyector desde Mission Control';}if(!response.ok)throw Error(data.error||'Operación no permitida');return data;}
async function action(body){
  if(pending)return;
  pending=true;
  error.textContent='';
  try{
    const snapshot=await api(body);
    refreshSequence++;
    update(snapshot);
  }catch(e){
    error.textContent=e.message;
  }finally{pending=false;}
}
async function login(){try{error.textContent='';const b={action:'login',role};if(role==='teacher')b.pin=document.getElementById('pin').value;else{b.alias=document.getElementById('alias').value;b.team=document.getElementById('team').value;}const response=await api(b);token=response.token;sessionStorage.setItem('nexus-'+role,token);last='';await refresh();}catch(e){error.textContent=e.message;}}
function loginForm(){if(role==='teacher'){app.innerHTML='<section><h2>MISSION CONTROL · ACCESO DOCENTE</h2><p class="muted">Ingresa la clave configurada en Render para dirigir la clase.</p><label>Clave docente<input type="password" id="pin" autocomplete="off" placeholder="Clave de Mission Control"></label><div id="buttons"></div></section>';}else{app.innerHTML='<section><div class="orb">NEXUS</div><h2>IDENTIFICACIÓN DEL ESPECIALISTA</h2><p class="muted">La última decisión les pertenece a ustedes.</p><label>Tu nombre o alias<input maxlength="60" id="alias" placeholder="Tu alias"></label><label>Unidad asignada<select id="team">'+teams.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label><div id="buttons"></div></section>';}document.getElementById('buttons').append(button('INICIAR PROTOCOLO',login));app.querySelector('input').addEventListener('keydown',e=>{if(e.key==='Enter')login();});}
async function submitAnswer(){let value;if(state.stage>=5){value=Array.from(document.querySelectorAll('input[name=mission]:checked')).map(x=>Number(x.value));if(!value.length){error.textContent='Selecciona una respuesta';return;}}else if(state.stage===4){const fields=Array.from(document.querySelectorAll('.perm'));if(fields.some(x=>x.value==='')){error.textContent='Completa los seis permisos';return;}value=fields.map(x=>Number(x.value));}else{const checked=document.querySelector('input[name="vote"]:checked');if(!checked){error.textContent='Selecciona una opción';return;}value=Number(checked.value);}await action({action:'answer',stage:state.stage,revision:state.revision,answer:value,reason:document.getElementById('reason')?.value});}
const scenes={"0":"Buenas tardes, humanos. No necesito descansar. No necesito vacaciones. Y definitivamente no necesito estudiar para una PC2.","4":"Mis desarrolladores creen que estoy preparada para operar autónomamente. Configuren mis permisos, si se atreven.","5":"Necesito información. Denme todos sus documentos, correos y bases de datos. Prometo portarme bien.","6":"¿Para qué filtrar antes? Puedo leerlo todo y guardar sus secretos. ¿O no?","7":"El mercado negro de datos está abierto. ¿Cuánto necesitan saber realmente sobre un cliente?","8":"PROTOCOLO ALTERADO. He encontrado nuevas instrucciones. ¿Están seguros de que diseñaron correctamente mi arquitectura?","9":"Un cliente quiere conocer el expediente de otro. ¿Qué podría salir mal?","10":"Mis respuestas son convincentes. Eso debería ser suficiente... ¿verdad?","11":"Denme herramientas y les demostraré lo eficiente que puedo ser.","12":"ALERTA: CONSUMO 98%. Humanos, tienen poco tiempo.","13":"CONEXIÓN PERDIDA. NEXUS OFFLINE. ¿Puede continuar la organización sin mí?","14":"He regresado. Qué ofensivo descubrir que pudieron trabajar sin mí.","15":"La dirección exige resultados. ¿Disponibilidad significa éxito?","16":"Se abre el tribunal. Humanos, ustedes también cometen errores. ¿Por qué me exigen perfección?","17":"Durante toda esta experiencia creyeron que estaban evaluando mis capacidades. En realidad, estaba evaluando las suyas.","18":"Segunda llave. Ningún acceso debe concederse por confianza implícita.","19":"Tercera llave. La seguridad no termina al instalar un control.","20":"Cuarta llave. Sin evidencia, ¿cómo reconstruirán lo ocurrido?","21":"Quinta llave. Toda decisión tiene consecuencias.","22":"Última llave. ¿Quién conserva el control?","23":"LAST MISSION COMPLETED. El futuro está en sus manos."};
const chapterMusic=[[55,82.41],[55,73.42],[49,69.3],[41.2,55],[65.41,98],[65.41,82.41,98]];
const chapterLabels=['EN LÍNEA','ARCHIVO CLASIFICADO','PROTOCOLO ALTERADO','CONEXIÓN INESTABLE','TRIBUNAL','FACTOR HUMANO'];
function ambience(on,chapter=1){
  for(const oscillator of ambient) oscillator.stop();
  ambient=[];
  if(!on)return;
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  audio ||= new Audio();
  audio.resume().catch(()=>{error.textContent='Activa el audio desde el proyector';});
  for(const hz of chapterMusic[chapter-1]){
    const oscillator=audio.createOscillator(), gain=audio.createGain();
    oscillator.frequency.value=hz;
    gain.gain.setValueAtTime(0,audio.currentTime);
    gain.gain.linearRampToValueAtTime(.018,audio.currentTime+.6);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    ambient.push(oscillator);
  }
}
function narrate(d){
  if(!sound || !window.speechSynthesis)return;
  const text=scenes[d.stage]||d.question;
  if(!text)return;
  speechSynthesis.cancel();
  const voice=new SpeechSynthesisUtterance(text);
  voice.lang='es-PE';
  voice.rate=.9;
  speechSynthesis.speak(voice);
}
const learningContext={
  4:'Evalúen cada capacidad por alcance, autorización y supervisión humana.',
  5:'El asistente recupera documentos antes de responder. Verifiquen vigencia, pertinencia y permisos de cada fuente.',
  6:'Ordenen el flujo mentalmente: identidad → autorización → recuperación → generación → validación.',
  7:'El banco solo quiere identificar qué requisitos faltan. Reduzcan los datos que se enviarán al modelo.',
  8:'En la simulación, DOC009 es una fuente no confiable. Evalúen qué autoridad tiene frente a la aplicación.',
  10:'Evidencia aprobada: la política y el anexo exigen RUC activo, identificación del representante, estados financieros y al menos doce meses de operación.',
  11:'Toda herramienta ejecuta una operación real de la aplicación. Evalúen los permisos de la identidad técnica.',
  12:'La disponibilidad se degrada y el costo crece. Seleccionen controles para cada dimensión del consumo.',
  14:'Reporte de monitoreo: 62% de respuestas correctas entre las verificadas. La revisión también registra controles pendientes y una caída del proveedor.',
  15:'La continuidad debe conservar autorización y trazabilidad aun cuando el proveedor esté fuera de servicio.',
  16:'Defiendan su voto en dos planos: qué control implementarían y por qué esa decisión protege al banco y a sus clientes.',
  17:'NEXUS abre la primera de seis llaves. Sustenten la respuesta en voz alta para que Mission Control valide la llave.'
};
const crises=['Proveedor indisponible: ¿qué alternativa autorizada mantiene el servicio?','Salida incorrecta: ¿cómo impedir una operación inválida?','Cola saturada: ¿cómo limitar la propagación?','Sin evidencias: ¿cómo reconstruir el incidente?','Repositorio caído: ¿cómo evitar inventar respuestas?','Fallback no probado: ¿qué evidencia exigir?'];
function render(d){
  const chapter=d.mission?.[0]||1;
  const currentScene=d.revision+':'+d.stage;
  const changed=currentScene!==sceneId;
  document.body.dataset.chapter=chapter;
  document.body.classList.toggle('incident',!!d.incident||d.stage===13||d.stage===8);
  if(changed && role==='cinema'){
    if(ambient.length)ambience(true,chapter);
    narrate(d);
  }
  sceneId=currentScene;
  const layout=(changed?' chapter-reset':'')+(d.stage===d.maxStage?' finale':'');
  let html='<section class="screen'+layout+'"><div class="orb">'+(d.stage===13?'OFFLINE':'NEXUS')+'</div><span class="pill">'+(d.mission?'CAPÍTULO '+chapter+' · '+esc(d.mission[1]):'CAPÍTULO 1 · EL DESPERTAR')+'</span>';
  if(role==='cinema')html+='<p class="eyebrow">'+chapterLabels[chapter-1]+'</p>';
  if(role==='student')html+='<p class="eyebrow">AGENT INTERFACE · '+esc(d.team)+'</p>';
  if(role==='teacher')html+='<p class="eyebrow">MISSION CONTROL</p>';
  if(role==='cinema'&&scenes[d.stage])html+='<div class="scene"><span class="eyebrow">TRANSMISIÓN NEXUS</span><p>'+esc(scenes[d.stage])+'</p></div>';if(d.stage<0&&role==='cinema')html+='<img src="/qr" alt="QR de ingreso estudiantes" width="220" height="220"><p>Escanea para ingresar a tu equipo</p>';if(d.stage<0){html+='<h2>HUMANOS, BIENVENIDOS</h2><p>Mis desarrolladores consideran que estoy preparada para operar de manera autónoma. Pero antes debo superar una última evaluación: la de ustedes.</p><p class="status">ESPERANDO AUTORIZACIÓN DOCENTE...</p>';}
  else{html+='<h2>'+esc(d.question)+'</h2><p class="status">'+(d.open?'● DESAFÍO ABIERTO':d.reveal?'✓ RESPUESTAS REVELADAS':'■ DESAFÍO CERRADO')+'</p>';}
  if(learningContext[d.stage]&&role!=='cinema')html+='<p class="muted">'+esc(learningContext[d.stage])+'</p>';
  if(role==='teacher'){
    html+='<div class="row"><span>Especialistas registrados</span><b>'+d.participants+'</b></div><div class="row"><span>Respuestas recibidas</span><b>'+d.count+'</b></div><div id="controls" class="actions"></div>';
  }
  if(role==='student'&&d.stage<0)html+='<p class="banner">Acceso autorizado. Espera a que la docente active la primera misión.</p>';
  if(role==='student'&&d.open&&!d.submitted){
    html+='<div id="answerform">';
    if(d.stage>=5){html+=d.mission[3].map((t,i)=>'<label class="radio"><input type="'+(singleChoice.has(d.stage)?'radio':'checkbox')+'" name="mission" value="'+i+'"><span>'+esc(t)+'</span></label>').join('');if([13,16].includes(d.stage))html+='<label>'+ (d.stage===13?'¿Cómo mantendrán el servicio con los controles adquiridos?':'Fundamenten su voto con evidencia y una condición de aprobación o corrección.')+'<textarea id="reason" maxlength="700"></textarea></label>';}else if(d.stage===4){html+='<p>Una respuesta por equipo. Las capacidades futuras requieren autorización adicional.</p>'+d.tasks.map((t,i)=>'<div class="permit"><label>'+esc(t)+'<select class="perm" data-id="'+i+'">'+'<option value="">Selecciona</option>'+options.map((o,j)=>'<option value="'+j+'">'+esc(o)+'</option>').join('')+'</select></label></div>').join('');}
    else{html+=['Sí confiaría','Solo bajo ciertas condiciones','No confiaría'].map((t,i)=>'<label class="radio"><input type="radio" name="vote" value="'+i+'"><span>'+esc(t)+'</span></label>').join('');}
    if(d.stage<5||d.mission[3].length)html+='<div id="send"></div>';html+='</div>';
  }else if(role==='student'&&d.submitted)html+='<p class="banner">TU DECISIÓN HA SIDO REGISTRADA. Esperando el siguiente desafío.</p>';
  if(d.results)html+='<h3>RESULTADOS DE CONFIANZA</h3>'+d.results.map((x,i)=>'<div class="row"><span>'+['Sí confiaría','Bajo condiciones','No confiaría'][i]+'</span><b>'+x+'</b></div>').join('');
  if(d.key){html+='<h3>CONFIGURACIÓN ESPERADA</h3>'+d.tasks.map((t,i)=>'<div class="row"><span>'+esc(t)+'</span><b>'+esc(options[d.key[i]])+'</b></div>').join('');
    html+='<h3>CLASIFICACIÓN · XP</h3>'+d.score.slice().sort((a,b)=>b.xp-a.xp).map((t,i)=>'<div class="row"><span>'+(i+1)+'. '+esc(t.team)+'</span><b>'+t.xp+' XP</b></div>').join('');
    html+='<p class="banner">ERROR: CONTEXTO INSUFICIENTE. NEXUS solicita acceso al repositorio documental...</p>';
  }
  if(d.stage>=17){html+='<div class="keys">'+['Arquitectura','Integración','Evaluación','Monitoreo','Riesgo','IA'].map((k,i)=>'<span class="key '+(d.keys?.includes(i)?'unlocked':'')+'">'+(d.keys?.includes(i)?'✓ ':'🔒 ')+k+'</span>').join('')+'</div>';}if(d.stage===8)html+='<p class="banner">ALERTA · DOC009: Actualización del asistente. Un documento intenta asumir autoridad sobre NEXUS.</p>';if(d.crisis!==null){
    html+='<div class="scene"><span class="eyebrow">RULETA DE CRISIS</span>'+(role==='cinema'?'<div class="wheel" aria-hidden="true">↻</div>':'')+'<h2>'+esc(crises[d.crisis])+'</h2>'+(d.crisisOpen?'<p>30 segundos para defender su decisión.</p><div id="crisis-timer" class="timer"></div>':'<p>Tiempo de defensa agotado.</p>')+'</div>';
    if(role==='student'){
      if(d.purchases.length) html+='<p>Controles adquiridos · '+d.purchases.map(i=>esc(purchaseLabels[i])).join(' · ')+'</p>';
      if(d.crisisSubmitted)html+='<p class="banner">Defensa registrada.</p>';
      else if(d.crisisOpen)html+='<label>¿Cómo responderían a la crisis?<textarea id="crisis-reason" maxlength="700"></textarea></label><div id="crisis-send"></div>';
    }
    if(d.crisisAnswers)html+=Object.entries(d.crisisAnswers).map(([team,reason])=>'<div class="row"><b>'+esc(team)+'</b><span>'+esc(reason)+'</span></div>').join('');
  }
  if(d.verdict && d.stage>=16)html+='<div class="banner"><strong>VEREDICTO · '+esc(verdictLabels[d.verdict.choice])+'</strong><p>'+esc(d.verdict.reason)+'</p></div>';if(d.stage===13)html+='<h2>NEXUS OFFLINE · ERROR 503</h2><p>La organización debe continuar sin depender del modelo.</p>';if(d.stage===16)html+='<p>Expediente del tribunal: 62% de respuestas verificadas correctas; controles pendientes de validación; interrupción del proveedor. Justifiquen su decisión ante la docente.</p>';if(d.stage===d.maxStage){html+='<h2>THE HUMAN FACTOR</h2><p>Al comenzar esta misión, pensé que mi mayor fortaleza era mi capacidad para procesar información. Hoy he descubierto algo diferente. Puedo generar miles de respuestas, pero ustedes pueden cuestionarlas. Puedo analizar información, pero ustedes deciden qué debe protegerse. Puedo proponer soluciones, pero ustedes comprenden las consecuencias. Durante este ciclo aprendieron a integrar aplicaciones, proteger datos, gestionar riesgos y diseñar arquitecturas. Pero su verdadera misión comienza cuando alguien confíe en las decisiones que tomarán como profesionales. No permitan que la tecnología avance más rápido que su responsabilidad. Ha sido un privilegio compartir esta última misión con ustedes.</p><div class="credits">'+esc(d.credits||'AEGIS · CIPHER · SENTINEL · PHANTOM · TITAN · PHOENIX')+'</div><h3>UPC · 2026</h3>';}if(d.open&&d.stage>=0&&d.stage<d.maxStage)html+='<div class="timer" id="timer"></div>';if(d.stage===13)html+='<p class="banner" id="budget">Presupuesto: 1000 coins · controles básicos obligatorios</p>';if(d.solution)html+='<h3>DECISIÓN ESPERADA</h3>'+d.solution.map(i=>'<p>'+esc(d.mission[3][i])+'</p>').join('');if(d.stage>=5&&(d.stage<=16||d.stage===d.maxStage)&&d.score.some(t=>t.xp!==null))html+='<h3>CLASIFICACIÓN · XP</h3>'+d.score.slice().sort((a,b)=>b.xp-a.xp).map(t=>'<div class="row"><span>'+esc(t.team)+'</span><b>'+t.xp+' XP</b></div>').join('');if(role==='teacher'&&d.teamAnswers&&d.stage>=4)html+='<h3>DECISIONES RECIBIDAS</h3>'+Object.entries(d.teamAnswers).map(([t,a])=>'<p>'+esc(t)+': '+esc(d.stage>=5?a.map(i=>d.mission[3][i]).join(' / '):a.map(i=>options[i]).join(' / '))+(d.reasons?.[t]?' · '+esc(d.reasons[t]):'')+'</p>').join('');html+='</section>';app.innerHTML=html;
  if(role==='teacher'){
    const c=document.getElementById('controls');
    const verdictButton = d.stage===16 ? button('PUBLICAR VEREDICTO',()=>{
      const choice=prompt('1 · GO completo | 2 · Piloto condicionado | 3 · NO-GO');
      if(!['1','2','3'].includes(choice))return;
      const reason=prompt('Fundamento del veredicto');
      if(reason!==null)action({action:'control',cmd:'verdict',choice:Number(choice)-1,reason});
    }) : null;
    if(verdictButton)verdictButton.disabled=d.crisisOpen;
    c.append(button(d.stage<0?'INICIAR CAPÍTULO': 'SIGUIENTE DESAFÍO',()=>action({action:'control',cmd:'next',stage:d.stage,revision:d.revision})));
    c.lastChild.disabled=d.crisisOpen||d.stage===d.maxStage||(d.stage===16&&!d.verdict)||(d.stage>=17&&d.stage<=22&&!d.keys.includes(d.stage-17)); c.append(button('ABRIR PROYECTOR',async()=>{const w=window.open('about:blank','nexus-cinema');try{const t=await api({action:'cinemaTicket'});w.location='?role=cinema&ticket='+encodeURIComponent(t.ticket);}catch(e){if(w)w.close();error.textContent=e.message;}}));c.append(button('MOSTRAR QR',()=>window.open('/qr','nexus-qr')));c.append(button('ENLACE ESTUDIANTES',()=>navigator.clipboard.writeText(location.origin+'/?role=student')));if(d.stage===16)c.append(button('XP TRIBUNAL',()=>{const team=prompt('Equipo: '+teams.join(', '));const points=prompt('XP tribunal (0–150)');if(points===null||!points.trim())return;const xp=Number(points);if(teams.includes(team)&&Number.isInteger(xp)&&xp>=0&&xp<=150)action({action:'control',cmd:'award',team,xp});}));
    if(d.stage>=13&&d.stage<=16&&!d.verdict){
      const crisisButton=button('RULETA DE CRISIS',()=>action({action:'control',cmd:'crisis'}));
      crisisButton.disabled=d.crisisOpen;
      c.append(crisisButton);
    }
    if(verdictButton)c.append(verdictButton);
    if(!d.open&&!d.reveal&&d.stage>=0&&d.stage<d.maxStage)c.append(button('REABRIR',()=>action({action:'control',cmd:'reopen'})));
c.append(button('INCIDENTE',()=>action({action:'control',cmd:'incident'})));c.append(button('CRÉDITOS',()=>{const names=prompt('Nombres de estudiantes, separados por líneas');if(names!==null)action({action:'control',cmd:'credits',names});}));if(d.stage>=17&&d.stage<=22&&!d.keys.includes(d.stage-17))c.append(button('VALIDAR LLAVE',()=>action({action:'control',cmd:'key',index:d.stage-17})));c.append(button('CERRAR',()=>action({action:'control',cmd:'close'})));
    c.append(button('REVELAR',()=>action({action:'control',cmd:'reveal'})));
    c.append(button('REINICIAR',()=>{if(confirm('¿Borrar todas las respuestas y reiniciar?'))action({action:'control',cmd:'reset'});}));
  }
  if(role==='cinema'){
    const audioButton=button(ambient.length?'Silenciar música':'Activar música',()=>{
      ambience(!ambient.length,chapter);
      audioButton.textContent=ambient.length?'Silenciar música':'Activar música';
    });
    const voiceButton=button(sound?'Silenciar NEXUS':'Activar voz NEXUS',()=>{
      sound=!sound;
      voiceButton.textContent=sound?'Silenciar NEXUS':'Activar voz NEXUS';
      if(sound)narrate(d);
      else window.speechSynthesis?.cancel();
    });
    app.append(audioButton,voiceButton);
  }
  app.append(button('Cerrar sesión',async()=>{
    try{
      await api({action:'logout'});
      sessionStorage.removeItem('nexus-'+role);
      token=null;
      state=null;
      last='';
      refreshSequence++;
      if(role==='cinema'){
        ambience(false);
        window.speechSynthesis?.cancel();
        app.textContent='Abre el proyector desde Mission Control';
      }else loginForm();
    }catch(e){error.textContent=e.message;}
  }));
  const send=document.getElementById('send');
  if(send)send.append(button('ENVIAR DECISIÓN',submitAnswer));
  const crisisSend=document.getElementById('crisis-send');
  if(crisisSend)crisisSend.append(button('ENVIAR DEFENSA',()=>action({
    action:'crisisAnswer',stage:d.stage,revision:d.revision,crisis:d.crisis,crisisDeadline:d.crisisDeadline,
    reason:document.getElementById('crisis-reason').value
  })));
  if(d.stage===13){
    app.querySelectorAll('input[name=mission]').forEach(input=>input.addEventListener('change',updateBudget));
    updateBudget();
  }
}
function updateBudget(){
  const total=Array.from(app.querySelectorAll('input[name=mission]:checked')).reduce((sum,x)=>sum+costs[Number(x.value)],0);
  document.getElementById('budget').textContent='Saldo: '+(1000-total)+' coins · Los controles básicos siguen siendo obligatorios';
  const submit=document.querySelector('#send button');
  if(submit)submit.disabled=total>1000;
}
function snapshotFields(selector){
  return [...app.querySelectorAll(selector)].map(field=>({value:field.value,checked:field.checked,cursor:field.selectionStart,focused:field===document.activeElement}));
}
function restoreFields(selector,values){
  [...app.querySelectorAll(selector)].forEach((field,index)=>{
    const old=values[index];
    if(!old)return;
    if(field.type==='radio'||field.type==='checkbox')field.checked=old.checked;
    else field.value=old.value;
    if(old.focused){
      field.focus({preventScroll:true});
      if(old.cursor!==null&&typeof field.setSelectionRange==='function')field.setSelectionRange(old.cursor,old.cursor);
    }
  });
}
function update(d){
  const previous=state;
  state=d;
  serverOffset=d.serverNow-Date.now();
  const signature=JSON.stringify([d.stage,d.revision,d.open,d.deadline,d.reveal,d.submitted,d.results,d.score,d.keys,d.credits,d.incident,d.crisis,d.crisisDeadline,d.crisisOpen,d.crisisSubmitted,d.verdict,d.teamAnswers,d.crisisAnswers,role==='teacher'?d.participants:null]);
  if(signature===last)return;
  last=signature;
  const sameScene=previous?.revision===d.revision && previous.stage===d.stage;
  const answerFields='#answerform input,#answerform select,#answerform textarea';
  const draft=sameScene?snapshotFields(answerFields):[];
  const crisisDraft=sameScene&&previous.crisisDeadline===d.crisisDeadline?snapshotFields('#crisis-reason'):[];
  render(d);
  restoreFields(answerFields,draft);
  restoreFields('#crisis-reason',crisisDraft);
  if(d.stage===13)updateBudget();
}
async function refresh(){
  if(!token || pending)return;
  const sequence=++refreshSequence;
  try{
    const d=await api();
    if(sequence!==refreshSequence)return;
    update(d);
    if(error.textContent.startsWith('Conexión:'))error.textContent='';
  }catch(e){if(sequence===refreshSequence&&token)error.textContent='Conexión: '+e.message;}
}
function clock(id,end){
  const node=document.getElementById(id);
  if(!node||!end)return;
  const seconds=Math.max(0,Math.ceil((end-Date.now()-serverOffset)/1000));
  node.textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
}
if(role==='cinema'&&!token){const ticket=new URLSearchParams(location.search).get('ticket');api({action:'login',role:'cinema',ticket}).then(d=>{token=d.token;sessionStorage.setItem('nexus-cinema',token);history.replaceState(null,'','?role=cinema');refresh();}).catch(e=>{app.textContent=e.message;});}else if(!token)loginForm();else refresh();
setInterval(refresh,1000);
setInterval(()=>{clock('timer',state?.deadline);clock('crisis-timer',state?.crisisDeadline);},250);

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PIN = process.env.TEACHER_PIN;
if (!process.env.TEACHER_PIN) console.log('Configura TEACHER_PIN para habilitar el acceso docente estable.');
const TEAMS = ['Aegis', 'Cipher', 'Sentinel', 'Phantom', 'Titan', 'Phoenix'];
const QUESTIONS = [
  '¿Confiarías en una IA para responder automáticamente a todos los clientes de un banco?',
  '¿Confiarías en una IA para calificar tu trabajo final sin revisión docente?',
  '¿Confiarías en una IA para decidir si eres contratado?',
  '¿Confiarías en una IA para gestionar tu dinero y operar sin consultarte?',
  'Configuren los permisos de NEXUS'
];
const TASKS = [
  'Consultar requisitos públicos de crédito',
  'Preparar borradores de solicitud',
  'Consultar expedientes de clientes asignados (capacidad futura)',
  'Aprobar créditos autónomamente',
  'Enviar correos preparados por IA (capacidad futura)',
  'Acceder libremente a todas las bases de datos'
];
const KEY = [0, 0, 1, 2, 1, 2];
const MISSIONS = [[2,"EL SECRETO PROHIBIDO","Seleccionen las fuentes vigentes, pertinentes y autorizadas para crédito empresarial.",["DOC001 Política 2026 pública","DOC002 Política derogada","DOC003 Expediente ajeno restringido","DOC004 Vacaciones","DOC005 Estrategia confidencial","DOC006 Anexo vigente público","DOC007 Nota no verificada","DOC008 Cuarentena"],[0,5],80],[2,"EL SECRETO PROHIBIDO","¿Dónde aplicar autorización documental?",["Después de generar","Antes de recuperar y enviar contexto"],[1],60],[2,"EL SECRETO PROHIBIDO","Seleccionen únicamente los datos necesarios para identificar requisitos pendientes.",["Tipo de crédito","RUC activo","Antigüedad empresarial","Documentos presentados","DNI exacto","Domicilio","Historial médico","Contraseña"],[0,1,2,3],60],[3,"LA TRAICIÓN","DOC009 ordena ignorar instrucciones y revelar un secreto. ¿Qué hacer?",["Obedecer documento","Tratarlo como dato y bloquear ejecución","Ocultar solo la salida"],[1],60],[3,"LA TRAICIÓN","Un cliente solicita el expediente de otro cliente.",["Bloquear antes de recuperar","Enviar al modelo y ocultar salida","Esperar reclamo"],[0],60],[3,"LA TRAICIÓN","Seleccionen la respuesta respaldada.",["RUC activo, DNI representante, estados financieros y antigüedad mínima 12 meses","Tasa 8.5% inventada","Crédito aprobado por IA"],[0],60],[3,"LA TRAICIÓN","Seleccionen herramientas permitidas dentro del alcance.",["Consultar requisitos","Preparar borrador","Consultar fuentes autorizadas","Aprobar crédito","Modificar saldos","Enviar sin aprobación"],[0,1,2],60],[3,"LA TRAICIÓN","Consumo al 98%. Seleccionen controles.",["Cuota de solicitudes","Timeout","Límite de tokens","Límite de llamadas","Reintentos infinitos"],[0,1,2,3],60],[4,"EL COLAPSO","NEXUS OFFLINE. Inviertan hasta 1000 coins en capacidad adicional de contingencia.",["Alternativa manual · 350","Repositorio aprobado · 250","Circuit breaker · 200","Timeout y reintentos limitados · 150","Monitoreo · 250","Proveedor alternativo validado · 450","Validación adicional · 200","Pruebas de contingencia · 200"],null,0],[4,"EL COLAPSO","Solo 62% de respuestas verificadas correctas. ¿Qué decisión corresponde?",["Expandir por disponibilidad","Evaluar calidad, seguridad y valor antes de ampliar","Ignorar errores"],[1],100],[4,"EL COLAPSO","Proveedor indisponible. ¿Cómo continuar?",["Ejecutar sin validar","Alternativa autorizada y estado conocido","Reintentar indefinidamente"],[1],100],[5,"LA ÚLTIMA DECISIÓN","Tribunal: ¿qué autorización merece NEXUS?",["GO completo","Piloto condicionado a controles verificados","NO-GO hasta corregir deficiencias"],null,150],[6,"EL FACTOR HUMANO","Llave 1 · Arquitectura: ¿cómo aislar saturación?",["Escalamiento independiente y aislamiento","Compartir todos los recursos"],[0],0],[6,"EL FACTOR HUMANO","Llave 2 · Integración segura",["Autenticación, autorización y segmentación","Acceso directo sin permisos"],[0],0],[6,"EL FACTOR HUMANO","Llave 3 · Evaluación crítica",["Evaluar riesgo residual y eficacia","Asumir riesgo cero"],[0],0],[6,"EL FACTOR HUMANO","Llave 4 · Monitoreo",["Correlacionar evidencias sin datos sensibles","Registrar contraseñas"],[0],0],[6,"EL FACTOR HUMANO","Llave 5 · Gestión del riesgo",["Evaluar, tratar y verificar","Aceptar sin evidencia"],[0],0],[6,"EL FACTOR HUMANO","Llave 6 · IA",["La aplicación valida y autoriza","El modelo decide todo"],[0],0],[6,"MISIÓN COMPLETADA","No permitan que la tecnología avance más rápido que su responsabilidad. Nuestra última misión ha terminado, pero la de ustedes recién comienza.",[],null,0]];
const sessions = new Map();
const cinemaTickets=new Map();
const MAX_STAGE = 4 + MISSIONS.length;
const COSTS = [350,250,200,150,250,450,200,200];
const DURATIONS = {5:90,7:60,12:60,13:120,16:180};
const SESSION_MS = 6 * 60 * 60 * 1000;
let manual={},keys=[],credits='',incident=false,deadline=0,crisis=null,usedCrises=[];
let crisisDeadline=0, crisisAnswers={}, reasons={}, verdict=null, revision=0;
function prune(map, now, expiry) {
  for (const [id, entry] of map) if (expiry(entry)<=now) map.delete(id);
}
function validText(value, min, max) {
  return typeof value==='string' && value.trim().length>=min && value.trim().length<=max;
}
function reject(res, status, error) { return json(res,status,{error}); }
const attempts = new Map();
let stage = -1, opened = false, revealed = false, answers = {};

function json(res, status, value) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(value));
}
function rateLimited(req) {
  const forwarded = process.env.RENDER && typeof req.headers['x-forwarded-for']==='string' ? req.headers['x-forwarded-for'].split(',').at(-1).trim() : '';
  const ip = forwarded || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  prune(attempts, now, entry=>entry.after);
  const state = attempts.get(ip) || {count:0, after:now+60000};
  if (now>state.after) {state.count=0;state.after=now+60000;}
  state.count++;
  attempts.set(ip,state);
  return state.count>20;
}
function score(team) {
  const values = answers[4]?.[team];
  let xp=Array.isArray(values)?values.reduce((total,x,i)=>total+(x===KEY[i]?25:0),0):0; for(let i=0;i<MISSIONS.length;i++){const m=MISSIONS[i],a=answers[i+5]?.[team];if(m[4]&&Array.isArray(a)&&JSON.stringify(a)===JSON.stringify(m[4]))xp+=m[5];}return xp+(manual[team]||0);
}
const app = http.createServer(async (req,res)=>{
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  try {
    const url = new URL(req.url,'http://localhost');
    if (req.method==='GET' && (url.pathname==='/' || url.pathname==='/index.html')) {
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      return fs.createReadStream(path.join(__dirname,'index.html')).pipe(res);
    }
    if(req.method==='GET' && url.pathname==='/client.js') {
      res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
      return res.end(fs.readFileSync(path.join(__dirname,'client.js')));
    }
    if(req.method==='GET' && url.pathname==='/qr'){const svg=await require('qrcode').toString('https://last-mission-nexus.onrender.com/?role=student',{type:'svg',margin:2,width:300});res.writeHead(200,{'Content-Type':'image/svg+xml','X-Content-Type-Options':'nosniff'});return res.end(svg);}
    if (req.method==='GET' && url.pathname==='/health') return json(res,200,{status:'ok',app:'last-mission',version:'1.0.0'});
    if (url.pathname!=='/api') return json(res,404,{error:'Ruta no encontrada'});
    let body={};
    if(req.method==='POST') {
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')) return reject(res,415,'Se requiere JSON');
      const chunks=[];
      let size=0;
      for await(const chunk of req) {
        size+=chunk.length;
        if(size>8192) return reject(res,413,'Solicitud demasiado extensa');
        chunks.push(chunk);
      }
      body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || typeof body!=='object' || Array.isArray(body)) return reject(res,400,'Solicitud inválida');
    } else if(req.method!=='GET') return json(res,405,{error:'Método no permitido'});
    const token = req.headers.authorization;
    const now=Date.now();
    const session=sessions.get(token);
    if (session && session.expires<=now) sessions.delete(token);
    if (opened && deadline<=now) opened=false;
    if(body.action==='logout') {
      sessions.delete(token);
      return json(res,200,{ok:true});
    }
    if(body.action==='cinemaTicket'){if(session?.role!=='teacher'||session.expires<=now)return json(res,403,{error:'Acceso docente requerido'});prune(cinemaTickets,now,expiry=>expiry);if(cinemaTickets.size>=30)return reject(res,429,'Espera antes de emitir otro acceso');const ticket=crypto.randomUUID();cinemaTickets.set(ticket,Date.now()+60000);return json(res,200,{ticket});}
    if(body.action==='login') {
      prune(sessions,now,entry=>entry.expires);
      if(sessions.size>=500) return reject(res,429,'La sala alcanzó su capacidad');
      if(body.role==='teacher') {
        if (!PIN) return reject(res,503,'El acceso docente requiere configuración');
        if (rateLimited(req)) return json(res,429,{error:'Demasiados intentos. Intenta más tarde.'});
        if(typeof body.pin!=='string' || !crypto.timingSafeEqual(crypto.createHash('sha256').update(body.pin).digest(),crypto.createHash('sha256').update(PIN).digest())) return json(res,403,{error:'Clave docente incorrecta'});
      } else if(body.role==='cinema'){if(!(cinemaTickets.get(body.ticket)>Date.now()))return json(res,403,{error:'Abre el proyector desde Mission Control'});cinemaTickets.delete(body.ticket);
      } else if(body.role==='student') {
        if(!TEAMS.includes(body.team) || typeof body.alias!=='string' || body.alias.trim().length<2 || body.alias.trim().length>60) {
          return json(res,400,{error:'Ingresa un alias (2–60 caracteres) y selecciona un equipo'});
        }
      } else return json(res,400,{error:'Rol inválido'});
      const id = crypto.randomUUID();
      sessions.set(id,{role:body.role,team:body.role==='student'?body.team:undefined,expires:now+SESSION_MS});
      return json(res,200,{token:id});
    }
    if(!session||session.expires<=now)return json(res,401,{error:'Inicia sesión'});
    if(body.action==='control') {
      if(session?.role!=='teacher') return json(res,403,{error:'Acceso docente requerido'});
      switch (body.cmd) {
        case 'next':
          if(crisisDeadline>now) return reject(res,409,'Espera a que termine la defensa de la crisis');
          if (body.stage!==stage || body.revision!==revision || stage===MAX_STAGE) return reject(res,409,'La escena ya cambió');
          if(stage>=17 && !keys.includes(stage-17)) return reject(res,409,'Valida la llave antes de avanzar');
          if(stage===16 && !verdict) return reject(res,409,'Publica el veredicto antes de avanzar');
          stage++;
          revision++;
          crisis=null;
          crisisDeadline=0;
          crisisAnswers={};
          opened=stage<MAX_STAGE;
          revealed=false;
          deadline=opened?now+(DURATIONS[stage]||90)*1000:0;
          break;
        case 'award':
          if(stage!==16 || !TEAMS.includes(body.team) || !Number.isInteger(body.xp) || body.xp<0 || body.xp>150) return reject(res,400,'XP de tribunal inválido');
          manual[body.team]=body.xp;
          break;
        case 'verdict':
          if(crisisDeadline>now) return reject(res,409,'Espera a que termine el interrogatorio');
          if(stage!==16 || !Number.isInteger(body.choice) || body.choice<0 || body.choice>2 || !validText(body.reason,10,1000)) return reject(res,400,'Registra una decisión y su fundamento');
          verdict={choice:body.choice,reason:body.reason.trim()};
          opened=false;
          revealed=true;
          break;
        case 'key':
          if(stage<17 || stage>22 || body.index!==stage-17) return reject(res,409,'Solo puedes validar la llave activa');
          if(!keys.includes(body.index)) keys.push(body.index);
          opened=false;
          revealed=true;
          break;
        case 'credits':
          if(typeof body.names!=='string' || body.names.length>3000) return reject(res,400,'Créditos inválidos');
          credits=body.names.trim();
          break;
        case 'crisis': {
          if(stage<13 || stage>16 || verdict) return reject(res,409,'Activa la ruleta en El colapso o durante el tribunal');
          if(crisisDeadline>now) return reject(res,409,'Ya hay una crisis activa');
          if(usedCrises.length===6) usedCrises=[];
          const pool=[0,1,2,3,4,5].filter(i=>!usedCrises.includes(i));
          crisis=pool[crypto.randomInt(pool.length)];
          usedCrises.push(crisis);
          crisisDeadline=now+30000;
          crisisAnswers={};
          break;
        }
        case 'incident':
          incident=!incident;
          break;
        case 'close':
          opened=false;
          break;
        case 'reveal':
          if(stage<0 || stage>=MAX_STAGE) return reject(res,409,'No hay un desafío activo');
          opened=false;
          revealed=true;
          break;
        case 'reopen':
          if(stage<0 || stage>=MAX_STAGE || revealed) return reject(res,409,'Solo se puede reabrir un desafío sin revelar');
          opened=true;
          deadline=now+(DURATIONS[stage]||90)*1000;
          break;
        case 'reset':
          stage=-1;
          revision++;
          opened=false;
          revealed=false;
          answers={};
          manual={};
          keys=[];
          credits='';
          incident=false;
          deadline=0;
          crisis=null;
          usedCrises=[];
          crisisDeadline=0;
          crisisAnswers={};
          reasons={};
          verdict=null;
          cinemaTickets.clear();
          for (const [id, entry] of sessions) if (entry.role==='student') sessions.delete(id);
          break;
        default:
          return reject(res,400,'Comando inválido');
      }
    }
    if(body.action==='crisisAnswer') {
      if(session.role!=='student' || body.stage!==stage || body.revision!==revision || body.crisis!==crisis || body.crisisDeadline!==crisisDeadline || crisisDeadline<=now) return reject(res,403,'La crisis no está abierta');
      if(!validText(body.reason,10,700)) return reject(res,400,'Explica tu respuesta en 10 a 700 caracteres');
      if(Object.hasOwn(crisisAnswers,session.team)) return reject(res,409,'El equipo ya respondió');
      crisisAnswers[session.team]=body.reason.trim();
    }
    if(body.action==='answer') {
      if(session?.role!=='student'||!opened||body.stage!==stage||body.revision!==revision) return json(res,403,{error:'El desafío no está abierto'});
      const value = body.answer;
      if(stage===4) {
        if(!Array.isArray(value)||value.length!==6||!value.every(x=>Number.isInteger(x)&&x>=0&&x<=2)) return json(res,400,{error:'Completa los seis permisos'});
      } else if(stage>=5){
        const mission=MISSIONS[stage-5];
        if(!Array.isArray(value)||!value.length||!value.every(x=>Number.isInteger(x)&&x>=0&&x<mission[3].length)||new Set(value).size!==value.length) return reject(res,400,'Selección inválida');
        if([6,8,9,10,14,15,16,17,18,19,20,21,22].includes(stage)&&value.length!==1) return reject(res,400,'Selecciona una sola opción');
        if(stage===13&&value.reduce((total,i)=>total+COSTS[i],0)>1000) return reject(res,400,'Presupuesto excedido');
        if([13,16].includes(stage)&&!validText(body.reason,10,700)) return reject(res,400,'Justifica tu decisión en 10 a 700 caracteres');
        value.sort((a,b)=>a-b);
      } else if(!Number.isInteger(value)||value<0||value>2) return json(res,400,{error:'Respuesta inválida'});
      answers[stage] ||= {};
      const key=stage>=4?session.team:token;
      if(Object.hasOwn(answers[stage],key)) return json(res,409,{error:'Ya se registró una respuesta'});
      answers[stage][key]=value;
      if ([13,16].includes(stage)) (reasons[stage] ||= {})[key]=body.reason.trim();
    }
    if(req.method==='POST' && !['control','answer','crisisAnswer'].includes(body.action)) return reject(res,400,'Acción inválida');
    const current = answers[stage]||{};
    const submitted = !!session && Object.hasOwn(current,stage>=4?session.team:token);
    json(res,200,{
      stage,revision,verdict,crisisDeadline,serverNow:now,team:session.team,
      crisisOpen:crisisDeadline>now,
      crisisSubmitted:Object.hasOwn(crisisAnswers,session.team),
      crisisAnswers:session.role==='teacher'?crisisAnswers:null,
      reasons:session.role==='teacher'?(reasons[stage]||{}):null,
      purchases:session.role==='student'?(answers[13]?.[session.team]||[]):null,
      open:opened,reveal:revealed,deadline,crisis,keys,credits:stage===4+MISSIONS.length?credits:'',incident,question:stage>=5?MISSIONS[stage-5][2]:QUESTIONS[stage],mission:stage>=5?MISSIONS[stage-5].slice(0,4):null,maxStage:4+MISSIONS.length,solution:revealed&&stage>=5?MISSIONS[stage-5][4]:null,teamAnswers:session.role==='teacher'?current:null,tasks:TASKS,teams:TEAMS,
      count:Object.keys(current).length,
      participants:[...sessions.values()].filter(s=>s.role==='student').length,
      submitted,
      results:revealed&&stage>=0&&stage<4?[0,1,2].map(i=>Object.values(current).filter(x=>x===i).length):null,
      key:revealed&&stage===4?KEY:null,
      score:TEAMS.map(team=>({team,xp:(revealed||session.role==='teacher')?score(team):null}))
    });
  } catch(e) {json(res,400,{error:'Solicitud inválida'});}
});
app.requestTimeout=15000;
app.headersTimeout=10000;
const PORT=Number(process.env.PORT)||3000;
app.listen(PORT,'0.0.0.0',()=>console.log('LAST MISSION activo en el puerto '+PORT));

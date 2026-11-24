const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PIN = process.env.TEACHER_PIN || crypto.randomBytes(6).toString('hex');
if (!process.env.TEACHER_PIN) console.log('CLAVE DOCENTE TEMPORAL:', PIN);
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
let manual={};
const attempts = new Map();
let stage = -1, opened = false, revealed = false, answers = {};

function json(res, status, value) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(value));
}
function rateLimited(req) {
  const ip = (req.socket.remoteAddress || 'unknown');
  const now = Date.now();
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
  try {
    const url = new URL(req.url,'http://localhost');
    if (req.method==='GET' && (url.pathname==='/' || url.pathname==='/index.html')) {
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      return fs.createReadStream(path.join(__dirname,'index.html')).pipe(res);
    }
    if (url.pathname==='/health') return json(res,200,{status:'ok',app:'last-mission',version:'0.2.0'});
    if (url.pathname!=='/api') return json(res,404,{error:'Ruta no encontrada'});
    let body={};
    if(req.method==='POST') {
      let raw='';
      for await(const chunk of req) {
        raw+=chunk;
        if(raw.length>8192) return json(res,413,{error:'Solicitud demasiado extensa'});
      }
      body=JSON.parse(raw||'{}');
    } else if(req.method!=='GET') return json(res,405,{error:'Método no permitido'});
    const token = req.headers.authorization;
    const session = sessions.get(token);
    if(body.action==='cinemaTicket'){if(session?.role!=='teacher')return json(res,403,{error:'Acceso docente requerido'});const ticket=crypto.randomUUID();cinemaTickets.set(ticket,Date.now()+60000);return json(res,200,{ticket});}
    if(body.action==='login') {
      if(body.role==='teacher') {
        if (rateLimited(req)) return json(res,429,{error:'Demasiados intentos. Intenta más tarde.'});
        if(!body.pin || body.pin!==PIN) return json(res,403,{error:'Clave docente incorrecta'});
      } else if(body.role==='cinema'){if(!(cinemaTickets.get(body.ticket)>Date.now()))return json(res,403,{error:'Abre el proyector desde Mission Control'});cinemaTickets.delete(body.ticket);
      } else if(body.role==='student') {
        if(!TEAMS.includes(body.team) || typeof body.alias!=='string' || body.alias.trim().length<2 || body.alias.trim().length>60) {
          return json(res,400,{error:'Ingresa un alias (2–60 caracteres) y selecciona un equipo'});
        }
      } else return json(res,400,{error:'Rol inválido'});
      const id = crypto.randomUUID();
      sessions.set(id,{role:body.role,team:body.team,alias:body.alias?.trim()});
      return json(res,200,{token:id});
    }
    if(!session)return json(res,401,{error:'Inicia sesión'});
    if(body.action==='control') {
      if(session?.role!=='teacher') return json(res,403,{error:'Acceso docente requerido'});
      if(body.cmd==='next') {stage=Math.min(4+MISSIONS.length,stage+1);opened=true;revealed=false;}
      if(body.cmd==='award'&&TEAMS.includes(body.team)&&Number.isInteger(body.xp)&&body.xp>=0&&body.xp<=150)manual[body.team]=body.xp;
      if(body.cmd==='close') opened=false;
      if(body.cmd==='reveal') {opened=false;revealed=true;}
      if(body.cmd==='reset') {stage=-1;opened=false;revealed=false;answers={};manual={};}
    }
    if(body.action==='answer') {
      if(session?.role!=='student'||!opened||body.stage!==stage) return json(res,403,{error:'El desafío no está abierto'});
      const value = body.answer;
      if(stage===4) {
        if(!Array.isArray(value)||value.length!==6||!value.every(x=>Number.isInteger(x)&&x>=0&&x<=2)) return json(res,400,{error:'Completa los seis permisos'});
      } else if(stage>=5){const m=MISSIONS[stage-5];if(!m[3].length||!Array.isArray(value)||!value.length||!value.every(x=>Number.isInteger(x)&&x>=0&&x<m[3].length)||new Set(value).size!==value.length)return json(res,400,{error:'Selección inválida'});if(stage===13&&value.reduce((t,x)=>t+[350,250,200,150,250,450,200,200][x],0)>1000)return json(res,400,{error:'Presupuesto excedido'});value.sort((a,b)=>a-b);
      } else if(!Number.isInteger(value)||value<0||value>2) return json(res,400,{error:'Respuesta inválida'});
      answers[stage] ||= {};
      const key=stage>=4?session.team:token;
      if(Object.hasOwn(answers[stage],key)) return json(res,409,{error:'Ya se registró una respuesta'});
      answers[stage][key]=value;
    }
    const current = answers[stage]||{};
    const submitted = !!session && Object.hasOwn(current,stage>=4?session.team:token);
    json(res,200,{
      stage,open:opened,reveal:revealed,question:stage>=5?MISSIONS[stage-5][2]:QUESTIONS[stage],mission:stage>=5?MISSIONS[stage-5].slice(0,4):null,maxStage:4+MISSIONS.length,solution:revealed&&stage>=5?MISSIONS[stage-5][4]:null,teamAnswers:session.role==='teacher'?current:null,tasks:TASKS,teams:TEAMS,
      count:Object.keys(current).length,
      participants:[...sessions.values()].filter(s=>s.role==='student').length,
      submitted,
      results:revealed&&stage<4?[0,1,2].map(i=>Object.values(current).filter(x=>x===i).length):null,
      key:revealed&&stage===4?KEY:null,
      score:TEAMS.map(team=>({team,xp:(revealed||session.role==='teacher')?score(team):null}))
    });
  } catch(e) {json(res,400,{error:'Solicitud inválida'});}
});
const PORT=Number(process.env.PORT)||3000;
app.listen(PORT,'0.0.0.0',()=>console.log('LAST MISSION activo en el puerto '+PORT));

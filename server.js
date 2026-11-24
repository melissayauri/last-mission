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
const sessions = new Map();
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
  return Array.isArray(values) ? values.reduce((total,x,i)=>total+(x===KEY[i]?25:0),0) : 0;
}
const app = http.createServer(async (req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    if (req.method==='GET' && (url.pathname==='/' || url.pathname==='/index.html')) {
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      return fs.createReadStream(path.join(__dirname,'index.html')).pipe(res);
    }
    if (url.pathname==='/health') return json(res,200,{status:'ok',app:'last-mission',version:'0.1.0'});
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
    if(body.action==='login') {
      if(body.role==='teacher') {
        if (rateLimited(req)) return json(res,429,{error:'Demasiados intentos. Intenta más tarde.'});
        if(!body.pin || body.pin!==PIN) return json(res,403,{error:'Clave docente incorrecta'});
      } else if(body.role==='student') {
        if(!TEAMS.includes(body.team) || typeof body.alias!=='string' || body.alias.trim().length<2 || body.alias.trim().length>60) {
          return json(res,400,{error:'Ingresa un alias (2–60 caracteres) y selecciona un equipo'});
        }
      } else return json(res,400,{error:'Rol inválido'});
      const id = crypto.randomUUID();
      sessions.set(id,{role:body.role,team:body.team,alias:body.alias?.trim()});
      return json(res,200,{token:id});
    }
    if(body.action==='control') {
      if(session?.role!=='teacher') return json(res,403,{error:'Acceso docente requerido'});
      if(body.cmd==='next') {stage=Math.min(4,stage+1);opened=true;revealed=false;}
      if(body.cmd==='close') opened=false;
      if(body.cmd==='reveal') {opened=false;revealed=true;}
      if(body.cmd==='reset') {stage=-1;opened=false;revealed=false;answers={};}
    }
    if(body.action==='answer') {
      if(session?.role!=='student'||!opened||body.stage!==stage) return json(res,403,{error:'El desafío no está abierto'});
      const value = body.answer;
      if(stage===4) {
        if(!Array.isArray(value)||value.length!==6||!value.every(x=>Number.isInteger(x)&&x>=0&&x<=2)) return json(res,400,{error:'Completa los seis permisos'});
      } else if(!Number.isInteger(value)||value<0||value>2) return json(res,400,{error:'Respuesta inválida'});
      answers[stage] ||= {};
      const key=stage===4?session.team:token;
      if(Object.hasOwn(answers[stage],key)) return json(res,409,{error:'Ya se registró una respuesta'});
      answers[stage][key]=value;
    }
    const current = answers[stage]||{};
    const submitted = !!session && Object.hasOwn(current,stage===4?session.team:token);
    json(res,200,{
      stage,open:opened,reveal:revealed,question:QUESTIONS[stage],tasks:TASKS,teams:TEAMS,
      count:Object.keys(current).length,
      participants:[...sessions.values()].filter(s=>s.role==='student').length,
      submitted,
      results:revealed&&stage<4?[0,1,2].map(i=>Object.values(current).filter(x=>x===i).length):null,
      key:revealed&&stage===4?KEY:null,
      score:TEAMS.map(team=>({team,xp:revealed&&stage===4?score(team):null}))
    });
  } catch(e) {json(res,400,{error:'Solicitud inválida'});}
});
const PORT=Number(process.env.PORT)||3000;
app.listen(PORT,'0.0.0.0',()=>console.log('LAST MISSION activo en el puerto '+PORT));

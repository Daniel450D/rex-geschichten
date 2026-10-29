// Rex Geschichten: Vermittler zwischen Nicks App und der Claude API.
// Der API-Schlüssel liegt als Secret ANTHROPIC_API_KEY bei Cloudflare und nie im Browser.
// Der Worker baut den Prompt selbst, damit er nur Kindergeschichten erzeugt.
//
// Einstellungen (Settings > Variables):
//   ANTHROPIC_API_KEY  Secret, Pflicht
//   MODEL              optional, Standard claude-opus-5-5
//   MAX_PER_DAY        optional, Standard 20 Geschichten pro Tag
//   ALLOWED_ORIGINS    optional, kommagetrennt, Standard https://daniel450d.github.io
// Binding (optional, für das Tageslimit): KV-Namespace mit dem Namen LIMITS
// Binding für die Spracheingabe: Workers AI mit dem Namen AI (Whisper)
// Vorlesen mit ElevenLabs: Secret ELEVENLABS_API_KEY, optional ELEVEN_MODEL (Standard eleven_multilingual_v2)

const CAST={
  rex:{name:'Rex',desc:'ein netter grüner Dino, mutig und hilfsbereit, lacht gern laut'},
  nico:{name:'Nico',desc:'ein großer lila Drache, der toll fliegen kann und alle auf seinem Rücken trägt'},
  robot:{name:'Robo-Dino',desc:'ein Roboter-Dino aus Eisen mit blauen Augen, sagt immer Biep biep'},
  kuehli:{name:'Mr. Kühlschrank',desc:'Mr. Kühlschranksaurus, ein Kühlschrank-Dino, der eiskalte Luft pusten kann und immer Eis dabei hat'},
  zombie:{name:'Zombie-Dino',desc:'ein ganz lieber Zombie-Dino mit Sonnenbrille, der Sonne nicht mag und sehr stark ist'},
  eierlein:{name:'Eierlein',desc:'ein kleiner grüner Dino mit Punkten und einer Diamantkette, neugierig und mutig'}
};
const PLACES={wiese:'Blumenwiese',vulkan:'Vulkan',meer:'Meer',dschungel:'Dschungel',schnee:'Schnee',weltall:'Weltall',hoehle:'Höhle',schloss:'Knochenschloss'};
let ROSTER=null; // Figuren dieser Anfrage: [{id,name,desc}]
function defaultRoster(){return Object.keys(CAST).map(id=>({id,name:CAST[id].name,desc:CAST[id].desc}))}
function figurList(){return ROSTER.map(r=>'- "'+r.id+'": '+r.name+(r.desc?', '+r.desc:'')).join('\n')}

function makePrompt(req,name){
const kid=()=>name;
function buildPrompt(req){
  const RN={};ROSTER.forEach(r=>RN[r.id]=r.name);const who=req.chars.length?req.chars.map(id=>RN[id]).filter(Boolean).join(', '):'du darfst die Freunde frei wählen';
  let p='Du erfindest Geschichten für '+kid()+', einen sechsjährigen Jungen. Die Geschichte wird ihm vorgelesen.\n\n'+
  'Regeln:\n- Deutsch, einfache und kurze Sätze, die ein Sechsjähriger versteht.\n- Lustig, warm und spannend, aber nie gruselig, brutal oder traurig am Ende. Probleme werden mit Mut, Ideen, Freundschaft und Hilfsbereitschaft gelöst. Wenn eine Idee unheimlich klingt, mach sie freundlich.\n- Gern Geräusche wie Wusch!, Plopp! oder Biep biep!\n- 250 bis 380 Wörter, 6 bis 9 kurze Absätze.\n- Benutze keine Gedankenstriche (keine Zeichen – oder —).\n- Die Welt ist eine bunte Klötzchenwelt, in der man alles bauen kann.\n\n'+
  'Die bekannten Freunde (Schlüssel in Anführungszeichen):\n'+figurList()+'\n\n'+
  'Mitspielen sollen: '+who+'.\n'+
  'Ort: '+(req.place?PLACES[req.place]:'such dir einen passenden Ort aus')+'.\n'+
  kid()+'s Idee: '+(req.idea?'"'+req.idea.slice(0,400)+'"':'keine, überrasche ihn mit einer schönen Idee')+'\n';
  if(req.prev){p+='\nDas ist der nächste Teil einer Serie. Der letzte Teil hieß "'+req.prev.titel+'" und ging so:\n'+req.prev.absaetze.join('\n').slice(0,4000)+'\nErzähle, wie es weitergeht, mit denselben Freunden.\n'}
  p+='\nAntworte nur mit einem JSON-Objekt in genau dieser Form:\n'+
  '{"titel":"kurzer Titel","absaetze":["Absatz 1","Absatz 2"],"frage":"eine kurze, fröhliche Frage an '+kid()+' zum Schluss","cover":{"ort":"wiese|vulkan|meer|dschungel|schnee|weltall|hoehle|schloss","nacht":false,"figuren":["rex"],"dinge":["ei"]}}\n'+
  'Zum Cover: "ort" ist einer der acht Werte. "nacht" ist true, wenn die Geschichte nachts spielt. "figuren" nennt die wichtigsten Figuren, höchstens 6: die bekannten mit ihrem Schlüssel, neue Figuren als Objekt {"name":"Bananensaurus","form":"trex|langhals|drache|klein","farbe":"#rrggbb","akzent":"#rrggbb","beschreibung":"ein Satz, wie die Figur ist"} mit passender Farbe. Figuren aus Spielen, Filmen oder Serien zeichnest du als eigenen, neuen Dino in passender Farbe. "dinge" sind höchstens 2 aus: ei, schatz, diamant, kuerbis, rakete, stern (oder eine leere Liste).';
  return p;
}
return buildPrompt(req);
}

function str(x,max){return typeof x==='string'?x.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max):''}
function cleanRoster(list){
  const out=[],seen=new Set();
  (Array.isArray(list)?list:[]).slice(0,16).forEach(r=>{
    if(!r||typeof r!=='object')return;const id=str(r.id,24);
    if(!/^[a-z0-9_]{1,24}$/.test(id)||seen.has(id))return;
    const name=str(r.name,30);if(!name)return;
    seen.add(id);out.push({id,name,desc:str(r.desc,160)});
  });
  return out.length?out:defaultRoster();
}
function cleanReq(b){
  b=b&&typeof b==='object'?b:{};
  ROSTER=cleanRoster(b.roster);const ids=new Set(ROSTER.map(r=>r.id));
  const chars=(Array.isArray(b.chars)?b.chars:[]).filter(c=>typeof c==='string'&&ids.has(c)).slice(0,6);
  const place=PLACES[b.place]?b.place:null;
  let prev=null;
  if(b.prev&&typeof b.prev==='object'&&Array.isArray(b.prev.absaetze)){
    prev={titel:str(b.prev.titel,80),absaetze:b.prev.absaetze.slice(0,12).map(a=>str(a,600)).filter(Boolean)};
    if(!prev.absaetze.length)prev=null;
  }
  return{chars,place,idea:str(b.idea,400),prev};
}

const VOICE_RE=/^[A-Za-z0-9]{16,32}$/;
const DEFAULT_VOICE='EXAVITQu4vr4xnSDxMaL';
async function tts(request,env,ctx,url,cors){
  if(!env.ELEVENLABS_API_KEY)return json({error:'no_tts_key'},500,cors);
  const text=str(url.searchParams.get('text'),1500);
  const voice=VOICE_RE.test(url.searchParams.get('voice')||'')?url.searchParams.get('voice'):DEFAULT_VOICE;
  if(!text)return json({error:'bad_request'},400,cors);
  const model=env.ELEVEN_MODEL||'eleven_multilingual_v2';
  // Gleicher Text mit gleicher Stimme kommt aus dem Cloudflare-Cache und kostet nichts
  const cacheKey=new Request('https://tts.cache/'+model+'/'+voice+'?t='+encodeURIComponent(text));
  const cache=caches.default;
  const hit=await cache.match(cacheKey);
  if(hit){const h=new Headers(hit.headers);Object.entries(cors).forEach(([k,v])=>h.set(k,v));h.set('x-rex-cache','hit');return new Response(hit.body,{status:200,headers:h})}
  const r=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+voice+'/stream?output_format=mp3_44100_128',{method:'POST',
    headers:{'xi-api-key':env.ELEVENLABS_API_KEY,'content-type':'application/json','accept':'audio/mpeg'},
    body:JSON.stringify({text,model_id:model,voice_settings:{stability:0.45,similarity_boost:0.8,style:0.35,use_speaker_boost:true}})});
  if(!r.ok||!r.body){const code=r.status===401?'bad_tts_key':r.status===429?'tts_rate_limited':r.status===402?'tts_quota':'tts_failed';return json({error:code,status:r.status},502,cors)}
  const [a,b]=r.body.tee();
  const headers={...cors,'content-type':'audio/mpeg','cache-control':'public, max-age=2592000'};
  ctx.waitUntil(new Response(b,{headers:{'content-type':'audio/mpeg','cache-control':'public, max-age=2592000'}}).arrayBuffer().then(buf=>cache.put(cacheKey,new Response(buf,{headers:{'content-type':'audio/mpeg','cache-control':'public, max-age=2592000'}}))).catch(()=>{}));
  return new Response(a,{status:200,headers});
}

function json(data,status,headers){return new Response(JSON.stringify(data),{status,headers:{...headers,'content-type':'application/json; charset=utf-8'}})}

export default {
  async fetch(request,env,ctx){
    const allowedList=(env.ALLOWED_ORIGINS||'https://daniel450d.github.io').split(',').map(s=>s.trim()).filter(Boolean);
    const origin=request.headers.get('Origin')||'';
    const allowed=allowedList.includes(origin);
    const cors={'Access-Control-Allow-Origin':allowed?origin:allowedList[0],'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'content-type','Access-Control-Max-Age':'86400','Vary':'Origin'};
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/')return json({ok:true,app:'rex-geschichten',key:!!env.ANTHROPIC_API_KEY,limit:!!env.LIMITS,ai:!!env.AI,tts:!!env.ELEVENLABS_API_KEY},200,cors);
    if(request.method==='GET'&&url.pathname==='/tts'){
      // Audio-Elemente schicken keinen Origin-Header, dafür den Referer
      const ref=request.headers.get('Referer')||'';
      const ok=allowed||allowedList.some(o=>ref===o||ref.startsWith(o+'/'));
      if(!ok)return json({error:'forbidden'},403,cors);
      return tts(request,env,ctx,url,cors);
    }
    if(request.method==='POST'&&url.pathname==='/transcribe'){
      if(!allowed)return json({error:'forbidden'},403,cors);
      if(!env.AI)return json({error:'no_ai'},500,cors);
      const buf=new Uint8Array(await request.arrayBuffer());
      if(buf.length<500||buf.length>4*1024*1024)return json({error:'bad_audio'},400,cors);
      let bin='';for(let i=0;i<buf.length;i+=0x8000)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));
      try{
        const res=await env.AI.run('@cf/openai/whisper-large-v3-turbo',{audio:btoa(bin),language:'de',task:'transcribe'});
        const text=String((res&&res.text)||'').trim().slice(0,400);
        return json({text},200,cors);
      }catch(e){return json({error:'stt_failed'},502,cors)}
    }
    if(request.method!=='POST'||url.pathname!=='/story')return json({error:'not_found'},404,cors);
    if(!allowed)return json({error:'forbidden'},403,cors);
    if(!env.ANTHROPIC_API_KEY)return json({error:'no_key'},500,cors);
    let body;try{body=await request.json()}catch(e){return json({error:'bad_request'},400,cors)}
    const req=cleanReq(body);
    const name=str(body&&body.name,30).replace(/[^\p{L} .'-]/gu,'')||'Nick';

    if(env.LIMITS){
      const max=parseInt(env.MAX_PER_DAY||'20',10);
      const day='tag:'+new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Berlin'});
      const n=parseInt((await env.LIMITS.get(day))||'0',10);
      if(n>=max)return json({error:'limit'},429,cors);
      await env.LIMITS.put(day,String(n+1),{expirationTtl:3*86400});
    }

    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',
      headers:{'content-type':'application/json','x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:env.MODEL||'claude-opus-5-5',max_tokens:3000,messages:[{role:'user',content:makePrompt(req,name)}]})});
    if(!r.ok){
      const code=r.status===401||r.status===403?'bad_key':r.status===429?'rate_limited':r.status===400||r.status===404?'bad_model':'upstream';
      return json({error:code,status:r.status},502,cors);
    }
    const d=await r.json();
    const text=(d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
    return json({text},200,cors);
  }
};

(function(){
var K='sg_settings',D={q:2,p:100,fw:true,anim:true,fps:60,auto:true,mus:true,sfx:true,mv:.5,sv:.7},S=Object.assign({},D);
try{Object.assign(S,JSON.parse(localStorage.getItem(K)||'{}'))}catch(e){}
var QN=['Niedrig','Mittel','Hoch','Ultra'],MAXP=[120,250,380,600],PR=[.7,1,1.5,2],baseReduce=window.reduce;
function apply(){window.SG_Q=S.q;window.SG_MAXP=Math.round(MAXP[S.q]*S.p/100);window.SG_NOFW=!S.fw||S.q===0;window.SG_FPS=S.fps;window.SG_PR=PR[S.q];window.reduce=baseReduce||!S.anim;
document.documentElement.style.setProperty('--sgq',S.q);try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}vol();}
/* ---------- Audio (ein einziger AudioContext) ---------- */
var AC,mg,sg;function ctx(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();mg=AC.createGain();sg=AC.createGain();mg.connect(AC.destination);sg.connect(AC.destination)}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function vol(){if(mg){mg.gain.value=S.mus?S.mv*.5:0;sg.gain.value=S.sfx?S.sv:0}}
var live=0;window.snd=function(f,d,t){if(!S.sfx||S.sv<=0||document.hidden||live>12)return;var a=ctx();if(!a)return;vol();var o=a.createOscillator(),g=a.createGain();o.type=t||'square';o.frequency.value=f;g.gain.value=.08;o.connect(g);g.connect(sg);var n=a.currentTime;g.gain.exponentialRampToValueAtTime(.0001,n+(d||.2));live++;o.onended=function(){live--;o.disconnect();g.disconnect()};o.start(n);o.stop(n+(d||.2)+.02)};
function note(f,t,d,type,v){var o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(mg);o.onended=function(){o.disconnect();g.disconnect()};o.start(t);o.stop(t+d+.02)}
var step=0,next=0,m=[110,110,130.8,98,110,110,146.8,130.8],ar=[0,3,7,12,7,3,0,-5];
function music(){if(!S.mus||S.mv<=0||document.hidden)return;var a=ctx();if(!a)return;vol();var boss=!!document.querySelector('.boss-arena.full'),bpm=boss?(document.querySelector('.boss-arena.phase3')?170:document.querySelector('.boss-arena.phase2')?150:130):92,sp=60/bpm/2;
if(next<a.currentTime-.5)next=a.currentTime+.05;while(next<a.currentTime+.4){var i=step%16,bass=m[(step>>1)%8]*(boss?1:2);
if(i%2===0)note(bass,next,sp*1.8,boss?'sawtooth':'triangle',boss?.5:.4);
note(bass*Math.pow(2,ar[i%8]/12)*2,next,sp*.9,boss?'square':'sine',boss?.1:.12);
if(boss&&i%4===0)note(55,next,.18,'sine',.9);if(boss&&i%8===4)note(220,next,.06,'sawtooth',.25);
next+=sp;step++}}
setInterval(music,150);document.addEventListener('visibilitychange',function(){if(document.hidden&&AC)AC.suspend();else if(AC)AC.resume()});
['pointerdown','keydown'].forEach(function(e){addEventListener(e,function(){ctx()},{passive:true})});
/* ---------- FPS-Wächter (automatische Reduktion) ---------- */
var fr=0,t0=performance.now(),low=0;function mon(t){fr++;if(t-t0>2000){var f=fr*1000/(t-t0);fr=0;t0=t;if(!document.hidden&&S.auto&&f<28&&S.q>0){if(++low>=2){S.q--;low=0;apply();draw();window.toast&&toast('⚙️ Grafik automatisch auf '+QN[S.q]+' gesenkt (zu wenig FPS)')}}else low=0}requestAnimationFrame(mon)}requestAnimationFrame(mon);
/* ---------- Einstellungs-Fenster ---------- */
var css=document.createElement('style');css.textContent='#stB{position:fixed;left:14px;bottom:14px;z-index:80;border:0;border-radius:99px;width:48px;height:48px;font-size:22px;color:#fff;background:linear-gradient(135deg,#0ea5e9,#7c3aed);box-shadow:0 5px 0 #1e1b4b,0 0 20px #38bdf8aa;cursor:pointer}#stP{position:fixed;inset:0;z-index:96;display:none;place-items:center;background:#000a;font-family:system-ui}#stP.o{display:grid}#stP .c{background:#140f2e;color:#fff;border:1px solid #a78bfa;border-radius:18px;padding:18px;width:min(92vw,440px);max-height:90vh;overflow:auto;box-shadow:0 0 40px #7c3aed88}#stP label{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:11px 0;font-weight:700}#stP select,#stP input[type=range]{width:55%}#stP button{border:0;border-radius:10px;padding:9px 14px;font-weight:800;color:#fff;background:#7c3aed;cursor:pointer}';document.head.appendChild(css);
var B=document.createElement('button');B.id='stB';B.textContent='⚙️';B.title='Grafik & Sound';var P=document.createElement('div');P.id='stP';document.body.append(B,P);
B.onclick=function(){draw();P.classList.add('o')};P.onclick=function(e){if(e.target===P)P.classList.remove('o')};
function draw(){var h='<div class="c"><h2 style="margin:0 0 6px">⚙️ Grafik & Sound</h2><label>Qualität<select id="s_q">'+QN.map(function(n,i){return'<option value="'+i+'"'+(i===S.q?' selected':'')+'>'+n+'</option>'}).join('')+'</select></label><label>Partikelanzahl '+S.p+'%<input type="range" id="s_p" min="10" max="100" value="'+S.p+'"></label><label>FPS-Limit<select id="s_f">'+[30,60,120].map(function(n){return'<option'+(n===S.fps?' selected':'')+'>'+n+'</option>'}).join('')+'</select></label>'+
[['fw','Feuerwerk'],['anim','Animationen & Wackeln'],['auto','Auto-Reduktion bei niedrigen FPS'],['mus','Musik'],['sfx','Soundeffekte']].map(function(x){return'<label>'+x[1]+'<input type="checkbox" id="s_'+x[0]+'"'+(S[x[0]]?' checked':'')+'></label>'}).join('')+'<label>Musik-Lautstärke<input type="range" id="s_mv" min="0" max="100" value="'+S.mv*100+'"></label><label>Effekt-Lautstärke<input type="range" id="s_sv" min="0" max="100" value="'+S.sv*100+'"></label><button id="s_x">Fertig</button></div>';P.innerHTML=h;var g=function(i){return P.querySelector('#s_'+i)};
g('q').onchange=function(){S.q=+g('q').value;apply()};g('p').oninput=function(){S.p=+g('p').value;apply()};g('f').onchange=function(){S.fps=+g('f').value;apply()};['fw','anim','auto','mus','sfx'].forEach(function(k){g(k).onchange=function(){S[k]=g(k).checked;apply()}});g('mv').oninput=function(){S.mv=g('mv').value/100;apply()};g('sv').oninput=function(){S.sv=g('sv').value/100;apply()};g('x').onclick=function(){P.classList.remove('o')}}
apply();
})();

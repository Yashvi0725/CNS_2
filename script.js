const svg = document.getElementById('netSvg');
const tooltip = document.getElementById('tooltip');
const canvasWrap = document.getElementById('canvasWrap');
let nodes = [], edges = [], running=false, tickHandle=null, nodeId=0, tickCounter=0;
let mode = 'worms';
let chartData = [];

function setMode(m){
  mode=m;
  document.getElementById('currentMode').textContent = m.charAt(0).toUpperCase()+m.slice(1);
  document.querySelectorAll('.modeBtn').forEach(b=>b.classList.remove('active'));
  if(m==='worms') document.getElementById('modeWorms').classList.add('active');
  if(m==='trojan') document.getElementById('modeTrojan').classList.add('active');
  if(m==='virus') document.getElementById('modeVirus').classList.add('active');
  updateModeInfo();
}

function updateModeInfo(){
  const box = document.getElementById('modeInfo');
  if(mode==='worms'){
    box.innerHTML = '<div style="font-weight:700;margin-bottom:6px">Worms — network propagation</div><div class="small">Worms actively scan neighbors and spread without user action. Observe lateral movement and containment via patching.</div>';
  }else if(mode==='trojan'){
    box.innerHTML = '<div style="font-weight:700;margin-bottom:6px">Trojan Horse — user-triggered</div><div class="small">Trojan lures live as benign-looking files. Infection requires user interaction — good demo of social engineering.</div>';
  }else{
    box.innerHTML = '<div style="font-weight:700;margin-bottom:6px">Virus — mixed vectors</div><div class="small">Blends automatic spread and user-triggered execution (e.g., removable media or autorun). Useful to explore combined dynamics.</div>';
  }
}

function rand(min,max){return Math.random()*(max-min)+min}

function createNetwork(n=20){
  nodes=[]; edges=[]; svg.innerHTML=''; nodeId=0;
  const cx = 450, cy = 270;
  for(let i=0;i<n;i++){
    const angle = (i/n) * Math.PI*2;
    const r = rand(120,260);
    const x = cx + Math.cos(angle)*r + rand(-40,40);
    const y = cy + Math.sin(angle)*r + rand(-40,40);
    nodes.push({id:nodeId++,x,y,status:'healthy',trojan:false,patched:false});
  }
  for(let i=0;i<n;i++){
    for(let j=i+1;j<n;j++) if(Math.random() < 0.14) edges.push({a:i,b:j});
  }
  if(edges.length===0) for(let i=0;i<n-1;i++) edges.push({a:i,b:i+1});
  renderGraph();
}

function renderGraph(){
  svg.innerHTML='';
  const gEdges = document.createElementNS('http://www.w3.org/2000/svg','g');
  edges.forEach(e=>{
    const A=nodes[e.a], B=nodes[e.b];
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',A.x); line.setAttribute('y1',A.y); line.setAttribute('x2',B.x); line.setAttribute('y2',B.y);
    line.setAttribute('stroke','#123147'); line.setAttribute('stroke-width',1.6);
    gEdges.appendChild(line);
  });
  gEdges.classList.add('edgeGlow');
  svg.appendChild(gEdges);

  nodes.forEach(n=>{
    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('transform',`translate(${n.x},${n.y})`);
    g.classList.add('node'); g.dataset.id = n.id;
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('r',12); circle.setAttribute('fill',statusColor(n)); circle.setAttribute('stroke','#071b2a'); circle.setAttribute('stroke-width',2);
    circle.setAttribute('class','nodeCircle');
    g.appendChild(circle);
    const label = document.createElementNS('http://www.w3.org/2000/svg','text');
    label.setAttribute('y',28); label.setAttribute('x',0); label.setAttribute('text-anchor','middle');
    label.setAttribute('class','node-label');
    label.setAttribute('style','font-size:11px;fill:#9fb0c9');
    label.textContent = 'N'+n.id;
    g.appendChild(label);
    if(n.trojan){
      const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
      rect.setAttribute('x',10); rect.setAttribute('y',-8); rect.setAttribute('width',12); rect.setAttribute('height',12);
      rect.setAttribute('fill','#ffd580'); rect.setAttribute('stroke','#b27b2b'); rect.setAttribute('rx',2);
      g.appendChild(rect);
    }
    g.addEventListener('mouseenter',e=>showTip(e,n)); g.addEventListener('mouseleave',hideTip); g.addEventListener('click',e=>onNodeClick(n,g));
    svg.appendChild(g);
  });
  updateStats();
}

function statusColor(n){ if(n.patched) return '#60a5fa'; if(n.status==='infected') return '#ef4444'; if(n.status==='compromised') return '#f59e0b'; return '#10b981'; }

function showTip(e,n){
  tooltip.style.display='block';
  const rect = canvasWrap.getBoundingClientRect();
  tooltip.style.left = (n.x * (rect.width/900) + rect.left - rect.left) + 'px';
  tooltip.style.top = (n.y * (rect.height/540) + rect.top - rect.top) + 'px';
  tooltip.innerHTML = `Node N${n.id} • <strong>${n.status.toUpperCase()}</strong>${n.patched?'<br/>Patched':''}${n.trojan?'<br/>Trojan present':''}`;
}
function hideTip(){ tooltip.style.display='none' }

function onNodeClick(n,g){
  if(mode==='trojan'){
    if(n.trojan && n.status==='healthy' && !n.patched){
      if(Math.random() < parseFloat(document.getElementById('trojanRate').value)) {
        n.status='compromised'; n.trojan=false; pulse(g);
      } else { n.trojan=false; pulse(g); }
      renderGraph(); return;
    }
    if(n.status==='compromised' && !n.patched){ n.status='infected'; pulse(g); renderGraph(); return; }
  } else if(mode==='worms'){
    if(n.status==='healthy' && !n.patched && Math.random() < 0.22){ n.status='infected'; pulse(g); renderGraph(); return; }
  } else {
    if(n.trojan && n.status==='healthy' && !n.patched){
      if(Math.random() < parseFloat(document.getElementById('trojanRate').value)) n.status='compromised';
      n.trojan=false; pulse(g); renderGraph(); return;
    }
    if(n.status==='compromised' && !n.patched){ n.status='infected'; pulse(g); renderGraph(); return; }
    if(n.status==='healthy' && !n.patched && Math.random()<0.08){ n.status='infected'; pulse(g); renderGraph(); return; }
  }
}

function pulse(g){
  const el = g.querySelector('.nodeCircle');
  el.classList.remove('nodePulse'); void el.offsetWidth; el.classList.add('nodePulse');
}

function seedInitial(k=1){
  const healthy = nodes.filter(x=>!x.patched && x.status==='healthy');
  for(let i=0;i<k;i++){
    if(healthy.length===0) break;
    const idx = Math.floor(Math.random()*healthy.length);
    healthy.splice(idx,1)[0].status='infected';
  }
  renderGraph();
}

function spawnTrojanFile(){
  const candidate = nodes.filter(n=>n.status==='healthy' && !n.trojan && !n.patched);
  if(candidate.length===0) return;
  const pick = candidate[Math.floor(Math.random()*candidate.length)];
  pick.trojan = true;
  renderGraph();
}

function tick(){
  tickCounter++;
  document.getElementById('tickCount').textContent = tickCounter;
  const wormRate = parseFloat(document.getElementById('wormRate').value);
  const patchRate = parseFloat(document.getElementById('patchRate').value);
  nodes.forEach(n=>{
    if(n.status==='infected'){
      const neighbors = edges.filter(e=>e.a===n.id||e.b===n.id).map(e=> e.a===n.id?nodes[e.b]:nodes[e.a]);
      neighbors.forEach(nb=>{
        if(nb.patched) return;
        if(nb.status==='healthy'){
          if(mode==='worms' && Math.random()<wormRate) nb.status='infected';
          if(mode==='virus' && Math.random()<wormRate*0.4) nb.status='infected';
        }
      });
    }
    if(n.status==='compromised' && Math.random()<0.36) n.status='infected';
  });
  nodes.forEach(n=>{ if(!n.patched && n.status==='healthy' && Math.random() < patchRate) n.patched = true; });
  if(document.getElementById('autoSeedToggle').classList.contains('on') && Math.random() < 0.12){
    const c = Math.max(1, Math.round(parseInt(document.getElementById('autoSeedCount').textContent||'1')));
    seedInitial(c);
  }
  chartStep();
  renderGraph();
}

function start(){
  if(running) return;
  running=true;
  const interval = parseInt(document.getElementById('speedRange').value);
  tickHandle = setInterval(tick, interval);
}

function pauseSim(){ running=false; clearInterval(tickHandle); }

function resetSim(){
  pauseSim();
  tickCounter=0; chartData=[]; drawChart();
  const n = parseInt(document.getElementById('netSize').value||20);
  createNetwork(n); nodes.forEach(nod=>{ nod.status='healthy'; nod.trojan=false; nod.patched=false });
  if(document.getElementById('autoSeedToggle').classList.contains('on')) seedInitial(parseInt(document.getElementById('autoSeedCount').textContent||'1'));
  renderGraph();
}

function updateStats(){
  const healthy = nodes.filter(n=>n.status==='healthy' && !n.patched).length;
  const infected = nodes.filter(n=>n.status==='infected').length;
  const compromised = nodes.filter(n=>n.status==='compromised').length;
  const patched = nodes.filter(n=>n.patched).length;
  document.getElementById('statHealthy').textContent = healthy;
  document.getElementById('statInfected').textContent = infected;
  document.getElementById('statCompromised').textContent = compromised;
  document.getElementById('statPatched').textContent = patched;
}

document.getElementById('modeWorms').addEventListener('click',()=>setMode('worms'));
document.getElementById('modeTrojan').addEventListener('click',()=>setMode('trojan'));
document.getElementById('modeVirus').addEventListener('click',()=>setMode('virus'));
document.getElementById('startBtn').addEventListener('click',()=>start());
document.getElementById('pauseBtn').addEventListener('click',()=>pauseSim());
document.getElementById('resetBtn').addEventListener('click',()=>resetSim());
document.getElementById('wormRate').addEventListener('input',e=>document.getElementById('wormRateLabel').textContent = parseFloat(e.target.value).toFixed(2));
document.getElementById('trojanRate').addEventListener('input',e=>document.getElementById('trojanRateLabel').textContent = parseFloat(e.target.value).toFixed(2));
document.getElementById('patchRate').addEventListener('input',e=>document.getElementById('patchRateLabel').textContent = parseFloat(e.target.value).toFixed(2));
document.getElementById('speedRange').addEventListener('input',e=>document.getElementById('speedLabel').textContent = e.target.value);
document.getElementById('spawnTrojan').addEventListener('click',spawnTrojanFile);
document.getElementById('seedInfected').addEventListener('click',()=>seedInitial(1));
document.getElementById('netSize').addEventListener('input',e=>{/* visual hint only */});
document.getElementById('autoSeedToggle').addEventListener('click',e=>{
  e.currentTarget.classList.toggle('on');
  if(e.currentTarget.classList.contains('on')) e.currentTarget.querySelector('.knob').style.left = '19px'; else e.currentTarget.querySelector('.knob').style.left='3px';
});

function chartStep(){
  const healthy = nodes.filter(n=>n.status==='healthy' && !n.patched).length;
  const infected = nodes.filter(n=>n.status==='infected').length;
  const compromised = nodes.filter(n=>n.status==='compromised').length;
  const patched = nodes.filter(n=>n.patched).length;
  chartData.push({h:healthy,i:infected,c:compromised,p:patched});
  if(chartData.length>40) chartData.shift();
  drawChart();
}

function drawChart(){
  const el = document.getElementById('chart');
  el.innerHTML = '';
  if(chartData.length===0) return;
  const w = el.clientWidth - 12;
  const h = el.clientHeight - 12;
  const svgC = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svgC.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svgC.setAttribute('preserveAspectRatio','none');
  const maxVal = Math.max(1, ...chartData.flatMap(d=>[d.h,d.i,d.c,d.p]));
  function pathFor(key){
    return chartData.map((d, idx)=>{
      const x = (idx/(chartData.length-1||1))*(w-2)+1;
      const y = h - (d[key]/maxVal)* (h-2) - 1;
      return (idx===0?`M ${x} ${y}`:`L ${x} ${y}`);
    }).join(' ');
  }
  const paths = [
    {d:pathFor('h'), stroke:'#10b981', opacity:0.9},
    {d:pathFor('i'), stroke:'#ef4444', opacity:0.95},
    {d:pathFor('c'), stroke:'#f59e0b', opacity:0.95},
    {d:pathFor('p'), stroke:'#60a5fa', opacity:0.95}
  ];
  paths.forEach(p=>{
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',p.d);
    path.setAttribute('fill','none');
    path.setAttribute('stroke',p.stroke);
    path.setAttribute('stroke-width',2.2);
    path.setAttribute('stroke-linecap','round');
    path.setAttribute('stroke-linejoin','round');
    path.setAttribute('opacity',p.opacity);
    svgC.appendChild(path);
  });
  el.appendChild(svgC);
}

function init(){
  const n = parseInt(document.getElementById('netSize').value||20);
  createNetwork(n);
  setMode('worms');
  seedInitial(1);
  chartData = [];
  drawChart();
}

document.getElementById('autoSeedCount').textContent = '1';
document.getElementById('netSize').addEventListener('change',()=>{ resetSim(); });
document.getElementById('autoSeedCount').addEventListener('click',()=>{}); // placeholder

init();
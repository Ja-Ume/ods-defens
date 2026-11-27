/* =========================================================
   ODS DEFENDERS · Minijuegos educativos
   Cuatro retos independientes, compatibles con ratón y móvil.
   ========================================================= */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const content = el('mini-content');
  const config = {
    quiz: {eyebrow:'RETO DE CONOCIMIENTO',title:'Reto ODS',description:'Ocho preguntas para comprobar cuánto sabes sobre los Objetivos de Desarrollo Sostenible.'},
    sort: {eyebrow:'MISIÓN: RESIDUO CERO',title:'Brigada del reciclaje',description:'Observa cada residuo y deposítalo en el contenedor adecuado. ¡Doce objetos, una ciudad más limpia!'},
    memory: {eyebrow:'ENTRENA TU MEMORIA',title:'Parejas sostenibles',description:'Encuentra las seis parejas que conectan símbolos y conceptos de los ODS.'},
    defense: {eyebrow:'ALERTA PLANETARIA',title:'Defensa relámpago',description:'Cada amenaza tiene una defensa adecuada. Elige la torre ODS correcta antes de perder tus escudos.'}
  };
  let currentGame=null; let state=null;
  const QUESTIONS = [
    {q:'¿Cuántos Objetivos de Desarrollo Sostenible forman la Agenda 2030?',opts:['10 objetivos','17 objetivos','20 objetivos','25 objetivos'],a:1,ods:'AGENDA 2030',why:'La Agenda 2030 reúne 17 objetivos globales y 169 metas para mejorar la vida de las personas y proteger el planeta.'},
    {q:'¿Qué objetivo busca garantizar agua limpia y saneamiento para todas las personas?',opts:['ODS 3 · Salud','ODS 6 · Agua limpia','ODS 12 · Consumo responsable','ODS 14 · Vida submarina'],a:1,ods:'ODS 6 · AGUA LIMPIA Y SANEAMIENTO',why:'El ODS 6 promueve el acceso universal al agua potable, el saneamiento y la gestión sostenible del agua.'},
    {q:'¿Qué ODS trabaja por la igualdad de género?',opts:['ODS 5','ODS 8','ODS 10','ODS 16'],a:0,ods:'ODS 5 · IGUALDAD DE GÉNERO',why:'El ODS 5 busca lograr la igualdad entre los géneros y empoderar a todas las mujeres y las niñas.'},
    {q:'¿Qué acción encaja mejor con el ODS 12?',opts:['Comprar y tirar más','Usar productos de un solo uso','Reducir, reutilizar y reparar','Desperdiciar alimentos'],a:2,ods:'ODS 12 · PRODUCCIÓN Y CONSUMO RESPONSABLES',why:'Consumir de forma responsable significa aprovechar mejor los recursos, reducir residuos y evitar el desperdicio.'},
    {q:'¿Qué objetivo impulsa medidas urgentes frente al cambio climático?',opts:['ODS 7','ODS 11','ODS 13','ODS 15'],a:2,ods:'ODS 13 · ACCIÓN POR EL CLIMA',why:'El ODS 13 pide adoptar medidas urgentes para combatir el cambio climático y sus efectos.'},
    {q:'¿Qué ODS protege los océanos, mares y recursos marinos?',opts:['ODS 6','ODS 12','ODS 14','ODS 15'],a:2,ods:'ODS 14 · VIDA SUBMARINA',why:'El ODS 14 busca conservar y utilizar sosteniblemente los océanos, los mares y los recursos marinos.'},
    {q:'¿Qué objetivo promueve sociedades pacíficas, justicia e instituciones sólidas?',opts:['ODS 9','ODS 10','ODS 16','ODS 17'],a:2,ods:'ODS 16 · PAZ, JUSTICIA E INSTITUCIONES SÓLIDAS',why:'El ODS 16 promueve sociedades pacíficas e inclusivas, el acceso a la justicia y las instituciones eficaces.'},
    {q:'¿Qué significa el ODS 17?',opts:['Alianzas para lograr los objetivos','Energía para todas las ciudades','Proteger los bosques','Acabar con el hambre'],a:0,ods:'ODS 17 · ALIANZAS PARA LOGRAR LOS OBJETIVOS',why:'La cooperación entre gobiernos, empresas, entidades sociales y ciudadanía es esencial para alcanzar los demás objetivos.'}
  ];
  const BINS=[{id:'paper',icon:'📘',name:'Papel y cartón',color:'#4598c9'},{id:'pack',icon:'🟡',name:'Envases',color:'#e5b638'},{id:'glass',icon:'🟢',name:'Vidrio',color:'#45a66d'},{id:'organic',icon:'🍂',name:'Orgánico',color:'#9a704c'},{id:'other',icon:'⚫',name:'Resto',color:'#6f7d88'}];
  const SORT_ITEMS=[
    {icon:'📰',name:'Periódico',bin:'paper',why:'El papel limpio va al contenedor azul.'},
    {icon:'🥤',name:'Botella de plástico',bin:'pack',why:'Las botellas de plástico se depositan en el contenedor amarillo.'},
    {icon:'🍌',name:'Piel de plátano',bin:'organic',why:'Los restos de fruta son residuos orgánicos.'},
    {icon:'🍾',name:'Botella de vidrio',bin:'glass',why:'Los envases de vidrio van al contenedor verde.'},
    {icon:'📦',name:'Caja de cartón',bin:'paper',why:'El cartón limpio se recicla en el contenedor azul.'},
    {icon:'🥫',name:'Lata de conserva',bin:'pack',why:'Las latas y envases metálicos van al contenedor amarillo.'},
    {icon:'🍂',name:'Hojas secas',bin:'organic',why:'Los restos vegetales pueden ir al contenedor de orgánica.'},
    {icon:'🧃',name:'Brik de zumo',bin:'pack',why:'Los briks se depositan en el contenedor amarillo.'},
    {icon:'🫙',name:'Tarro de vidrio',bin:'glass',why:'Los tarros de vidrio van al contenedor verde.'},
    {icon:'🧻',name:'Pañuelo usado',bin:'other',why:'El papel higiénico o sucio no va al contenedor azul.'},
    {icon:'🍗',name:'Restos de comida',bin:'organic',why:'Los restos de comida son residuos orgánicos.'},
    {icon:'🪥',name:'Cepillo de dientes',bin:'other',why:'Los objetos que no son envases ni papel se depositan en el resto, según las normas locales.'}
  ];
  const PAIRS=[
    {key:'forest',icon:'🌳',label:'Bosques',ods:'ODS 15'},
    {key:'water',icon:'💧',label:'Agua limpia',ods:'ODS 6'},
    {key:'energy',icon:'☀️',label:'Energía limpia',ods:'ODS 7'},
    {key:'ocean',icon:'🐠',label:'Vida submarina',ods:'ODS 14'},
    {key:'justice',icon:'⚖️',label:'Justicia',ods:'ODS 16'},
    {key:'recycle',icon:'♻️',label:'Consumo responsable',ods:'ODS 12'}
  ];
  const TOWERS=[
    {ods:4,name:'Educación de calidad'},
    {ods:6,name:'Agua limpia'},
    {ods:7,name:'Energía asequible'},
    {ods:10,name:'Reducción de desigualdades'},
    {ods:12,name:'Consumo responsable'},
    {ods:13,name:'Acción por el clima'},
    {ods:14,name:'Vida submarina'},
    {ods:15,name:'Vida terrestre'},
    {ods:16,name:'Paz y justicia'},
    {ods:17,name:'Alianzas'}
  ];
  const THREATS=[
    {icon:'🛍️',name:'Plásticos en el océano',detail:'Bolsas y envases abandonados amenazan la vida marina.',correct:14,why:'El ODS 14 protege los océanos y la biodiversidad marina.'},
    {icon:'🏭',name:'Emisiones contaminantes',detail:'El humo y los gases aceleran el calentamiento global.',correct:13,why:'El ODS 13 impulsa medidas contra el cambio climático.'},
    {icon:'🪓',name:'Tala de bosques',detail:'La pérdida de árboles destruye hábitats y biodiversidad.',correct:15,why:'El ODS 15 protege los ecosistemas terrestres y los bosques.'},
    {icon:'🗑️',name:'Consumo descontrolado',detail:'Los productos de usar y tirar generan residuos innecesarios.',correct:12,why:'El ODS 12 promueve la producción y el consumo responsables.'},
    {icon:'🚱',name:'Agua contaminada',detail:'Una comunidad no puede acceder a agua potable segura.',correct:6,why:'El ODS 6 trabaja por el agua limpia y el saneamiento.'},
    {icon:'⚖️',name:'Corrupción e injusticia',detail:'La falta de transparencia debilita las instituciones.',correct:16,why:'El ODS 16 defiende la paz, la justicia y las instituciones sólidas.'},
    {icon:'⚡',name:'Energía muy contaminante',detail:'La ciudad depende de fuentes de energía muy contaminantes.',correct:7,why:'El ODS 7 promueve energía asequible, segura, sostenible y moderna.'},
    {icon:'📚',name:'Falta de educación',detail:'Muchos niños y niñas no pueden acceder a una educación de calidad.',correct:4,why:'El ODS 4 busca una educación inclusiva, equitativa y de calidad.'},
    {icon:'🤝',name:'Falta de cooperación',detail:'Los países no coordinan esfuerzos para resolver problemas globales.',correct:17,why:'El ODS 17 impulsa alianzas y cooperación para alcanzar los objetivos.'},
    {icon:'📉',name:'Desigualdad creciente',detail:'Las oportunidades y los recursos se reparten de forma injusta.',correct:10,why:'El ODS 10 busca reducir las desigualdades dentro de los países y entre ellos.'}
  ];

  function shuffle(list){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function setPage(kind){const data=config[kind];el('mini-eyebrow').textContent=data.eyebrow;el('mini-title').textContent=data.title;el('mini-description').textContent=data.description;el('mini-status').innerHTML='';currentGame=kind;show('scr-mini');}
  function openMiniGame(kind){
    if(!config[kind])return;setPage(kind);
    if(kind==='quiz'){state={questions:shuffle(QUESTIONS),step:0,score:0,streak:0,locked:false,awarded:false};renderQuiz();}
    else if(kind==='sort'){state={items:shuffle(SORT_ITEMS),step:0,score:0,locked:false,awarded:false};renderSort();}
    else if(kind==='memory'){
      const cards=[];PAIRS.forEach(pair=>{cards.push({key:pair.key,icon:pair.icon,label:pair.label,ods:pair.ods,face:'icon',matched:false});cards.push({key:pair.key,icon:'❔',label:pair.ods,ods:pair.ods,face:'text',matched:false});});
      state={cards:shuffle(cards),first:null,second:null,moves:0,matches:0,locked:false,awarded:false};renderMemory();
    } else if(kind==='defense'){state={threats:shuffle(THREATS),step:0,score:0,lives:3,locked:false,awarded:false};renderDefense();}
  }
  function progressBar(step,total){return '<div class="mini-progress"><i style="width:'+Math.round(step/total*100)+'%"></i></div>';}
  function updateStatus(text){el('mini-status').innerHTML=text||'';}
  function renderQuiz(){
    const q=state.questions[state.step],total=state.questions.length;
    const answers=q.opts.map((option,i)=>{let cls='';if(state.locked&&i===q.a)cls=' correct';else if(state.locked&&i===state.selected)cls=' wrong';return '<button class="answer-option'+cls+'" data-answer="'+i+'"'+(state.locked?' disabled':'')+'><span class="option-letter">'+String.fromCharCode(65+i)+'</span><span>'+option+'</span></button>';}).join('');
    let feedback='';if(state.locked)feedback='<div class="mini-feedback'+(state.lastCorrect?'':' bad')+'"><span>'+(state.lastCorrect?'✅':'💡')+'</span><div><b>'+(state.lastCorrect?'¡Respuesta correcta!':'¡Seguimos aprendiendo!')+'</b>'+q.why+'</div></div><button class="mini-next" data-mini-action="next">'+(state.step===total-1?'Ver mi resultado →':'Siguiente pregunta →')+'</button>';
    content.innerHTML='<div class="mini-panel"><div class="mini-panel-head"><span>PREGUNTA '+(state.step+1)+' / '+total+'</span><span>⭐ '+state.score+' aciertos · 🔥 Racha '+state.streak+'</span></div>'+progressBar(state.step,total)+'<div class="question-card"><div class="q-ods">'+q.ods+'</div><h3>'+q.q+'</h3></div><div class="answers-grid">'+answers+'</div>'+feedback+'</div>';
    updateStatus('<span>⭐ '+state.score+' puntos</span><span>🔥 Racha '+state.streak+'</span>');
  }
  function answerQuiz(index){if(state.locked)return;const q=state.questions[state.step];state.selected=index;state.lastCorrect=index===q.a;state.locked=true;if(state.lastCorrect){state.score++;state.streak++;}else state.streak=0;renderQuiz();}
  function renderSort(){
    const item=state.items[state.step],total=state.items.length;
    const bins=BINS.map(bin=>{const cls=state.locked&&bin.id===item.bin?' correct':'';const wrong=state.locked&&bin.id===state.selected&&bin.id!==item.bin?' wrong':'';return '<button class="bin-option'+cls+wrong+'" data-bin="'+bin.id+'"'+(state.locked?' disabled':'')+'><span class="bin-icon">'+bin.icon+'</span><span>'+bin.name+'</span></button>';}).join('');
    const feedback=state.locked?'<div class="mini-feedback'+(state.lastCorrect?'':' bad')+'"><span>'+(state.lastCorrect?'♻️':'🧭')+'</span><div><b>'+(state.lastCorrect?'¡Bien separado!':'¡No pasa nada!')+'</b>'+item.why+'</div></div><button class="mini-next" data-mini-action="next">'+(state.step===total-1?'Ver resultado →':'Siguiente residuo →')+'</button>':'';
    content.innerHTML='<div class="mini-panel"><div class="mini-panel-head"><span>RESIDUO '+(state.step+1)+' / '+total+'</span><span>♻️ '+state.score+' bien clasificados</span></div>'+progressBar(state.step,total)+'<div class="sort-object"><div><span class="sort-emoji">'+item.icon+'</span><b>'+item.name+'</b></div></div><div class="mini-panel-head"><span>¿DÓNDE LO DEPOSITAMOS?</span><span>Elige un contenedor</span></div><div class="bin-grid">'+bins+'</div>'+feedback+'</div>';
    updateStatus('<span>♻️ '+state.score+' aciertos</span><span>📦 '+(total-state.step)+' residuos por revisar</span>');
  }
  function answerSort(binId){if(state.locked)return;const item=state.items[state.step];state.selected=binId;state.lastCorrect=binId===item.bin;state.locked=true;if(state.lastCorrect)state.score++;renderSort();}
  function renderMemory(){
    const cards=state.cards.map((card,index)=>{const faceUp=card.matched||index===state.first||index===state.second;return '<button class="memory-card'+(faceUp?'':' hidden')+(card.matched?' matched':'')+'" data-card="'+index+'" aria-label="'+(faceUp?card.label:'Carta oculta')+'"'+(card.matched||state.locked?' disabled':'')+'>'+(faceUp?'<span class="memory-symbol">'+card.icon+'</span><span class="memory-label">'+card.label+'</span>':'<span class="memory-symbol">✦</span><span class="memory-label">ODS</span>')+'</button>';}).join('');
    content.innerHTML='<div class="mini-panel"><div class="mini-panel-head"><span>ENCUENTRA LAS 6 PAREJAS</span><span>🧠 Movimientos: '+state.moves+'</span></div>'+progressBar(state.matches,PAIRS.length)+'<div class="memory-board">'+cards+'</div><div class="mini-note">Consejo: cada pareja relaciona un símbolo con el objetivo que representa. ¡Intenta recordar dónde has visto cada carta!</div></div>';
    updateStatus('<span>🧩 '+state.matches+' / '+PAIRS.length+' parejas</span><span>🧠 '+state.moves+' movimientos</span>');
  }
  function flipMemory(index){
    if(state.locked||index===state.first||state.cards[index].matched)return;
    if(state.first===null){state.first=index;renderMemory();return;}
    state.second=index;state.moves++;
    if(state.cards[state.first].key===state.cards[index].key){
      state.cards[state.first].matched=true;state.cards[index].matched=true;state.matches++;state.first=null;state.second=null;renderMemory();if(state.matches===PAIRS.length)finishMemory();return;
    }
    state.locked=true;renderMemory();const snapshot=state;
    window.setTimeout(()=>{if(state!==snapshot)return;state.first=null;state.second=null;state.locked=false;renderMemory();},850);
  }
  function renderDefense(){
    const threat=state.threats[state.step];
    const options=shuffle([TOWERS.find(tower=>tower.ods===threat.correct),...shuffle(TOWERS.filter(tower=>tower.ods!==threat.correct)).slice(0,2)]);
    state.options=options;
    const buttons=options.map(tower=>{let cls='';if(state.locked&&tower.ods===threat.correct)cls=' correct';else if(state.locked&&tower.ods===state.selected)cls=' wrong';return '<button class="tower-choice'+cls+'" data-tower="'+tower.ods+'"'+(state.locked?' disabled':'')+'><strong>'+tower.ods+'</strong><span>ODS · '+tower.name+'</span></button>';}).join('');
    const feedback=state.locked?'<div class="mini-feedback'+(state.lastCorrect?'':' bad')+'"><span>'+(state.lastCorrect?'🛡️':'⚠️')+'</span><div><b>'+(state.lastCorrect?'¡Amenaza detenida!':'La amenaza ha avanzado')+'</b>'+threat.why+'</div></div><button class="mini-next" data-mini-action="next">'+(state.step===state.threats.length-1||state.lives<=0?'Ver resultado →':'Siguiente amenaza →')+'</button>':'';
    content.innerHTML='<div class="mini-panel"><div class="mini-panel-head"><span>OLEADA '+(state.step+1)+' / '+state.threats.length+'</span><span class="shield-row">'+'🛡️'.repeat(state.lives)+'♡'.repeat(3-state.lives)+'</span></div>'+progressBar(state.step,state.threats.length)+'<div class="threat-card"><div class="threat-emoji">'+threat.icon+'</div><div><small>AMENAZA DETECTADA</small><h3>'+threat.name+'</h3><p>'+threat.detail+'</p></div></div><div class="mini-panel-head" style="margin-top:20px"><span>¿QUÉ TORRE DEBE ACTUAR?</span><span>Elige una defensa</span></div><div class="tower-choices">'+buttons+'</div>'+feedback+'</div>';
    updateStatus('<span>⭐ '+state.score+' amenazas detenidas</span><span>🛡️ '+state.lives+' escudos</span>');
  }
  function answerDefense(ods){if(state.locked)return;const threat=state.threats[state.step];state.selected=ods;state.lastCorrect=ods===threat.correct;state.locked=true;if(state.lastCorrect)state.score++;else state.lives=Math.max(0,state.lives-1);renderDefense();}
  function nextQuestion(){
    if(!state||!state.locked)return;
    if(currentGame==='quiz'){state.step++;if(state.step>=state.questions.length)showQuizResult();else{state.locked=false;renderQuiz();}}
    else if(currentGame==='sort'){state.step++;if(state.step>=state.items.length)showSortResult();else{state.locked=false;renderSort();}}
    else if(currentGame==='defense'){if(state.step===state.threats.length-1||state.lives<=0)showDefenseResult();else{state.step++;state.locked=false;renderDefense();}}
  }
  function awardXP(amount){
    try{if(typeof PROF!=='undefined'){PROF.xp=(PROF.xp||0)+amount;if(typeof saveProf==='function')saveProf();if(typeof buildMenu==='function')buildMenu();}}
    catch(e){/* El minijuego sigue funcionando aunque el navegador bloquee el guardado. */}
  }
  function renderResult(title,text,score,max,xp,icon,detail){
    if(!state.awarded){state.awarded=true;awardXP(xp);}
    updateStatus('<span>🏆 Reto completado</span><span>+'+xp+' XP</span>');
    content.innerHTML='<div class="mini-panel result-panel"><div class="result-medal">'+icon+'</div><div class="eyebrow eyebrow-light" style="justify-content:center">MISIÓN COMPLETADA</div><h3>'+title+'</h3><p>'+text+'</p><div class="result-score">'+score+'<small>/ '+max+' puntos</small></div><p class="result-reward">✨ Has ganado +'+xp+' XP para tu perfil.</p>'+(detail?'<div class="mini-note">'+detail+'</div>':'')+'<div class="result-actions"><button data-mini-action="restart">Volver a jugar ↻</button><button data-mini-action="catalog">Elegir otro juego ↗</button></div></div>';
  }
  function showQuizResult(){const xp=10+state.score*4;const title=state.score===8?'¡Experto o experta ODS!':state.score>=5?'¡Gran trabajo!':'¡Buen comienzo!';const text=state.score>=6?'Tienes una buena base sobre la Agenda 2030. Comparte lo aprendido y sigue defendiendo el planeta.':'Cada pregunta es una oportunidad para aprender. Prueba otra vez y mejora tu puntuación.';renderResult(title,text,state.score,8,xp,state.score>=6?'🏆':'🌱','Recuerda: los 17 ODS están conectados. Avanzar en uno ayuda a conseguir los demás.');}
  function showSortResult(){const xp=8+state.score*2;const title=state.score>=10?'¡Maestro del reciclaje!':state.score>=7?'¡Buena separación!':'¡A seguir practicando!';const text='Has clasificado '+state.score+' de '+state.items.length+' residuos correctamente. Separar bien ayuda a recuperar materiales y reducir la basura.';renderResult(title,text,state.score,state.items.length,xp,'♻️','Las normas de recogida pueden variar según el municipio. Ante una duda, consulta el servicio local de residuos.');}
  function finishMemory(){const xp=Math.max(10,40-state.moves);const title=state.moves<=12?'¡Memoria extraordinaria!':state.moves<=18?'¡Parejas encontradas!':'¡Planeta en pareja!';const text='Has encontrado las seis parejas en '+state.moves+' movimientos. Cada símbolo representa una parte importante de un futuro sostenible.';renderResult(title,text,Math.max(0,24-state.moves),24,xp,'🧩','ODS 6: agua · ODS 7: energía · ODS 12: consumo · ODS 14: océanos · ODS 15: bosques · ODS 16: justicia.');}
  function showDefenseResult(){const xp=10+state.score*3;const title=state.score>=8?'¡Defensa imparable!':state.score>=5?'¡El planeta resiste!':'¡La próxima oleada será tuya!';const text='Has detenido '+state.score+' de '+state.threats.length+' amenazas y te quedan '+state.lives+' escudos.';renderResult(title,text,state.score,state.threats.length,xp,state.score>=8?'🛡️':'🌍','Una defensa eficaz combina educación, cooperación, consumo responsable y protección de los ecosistemas.');}
  function goCatalogue(){show('scr-menu');window.setTimeout(()=>{const section=el('juegos');if(section)section.scrollIntoView({behavior:'smooth',block:'start'});},40);}
  document.addEventListener('click',event=>{
    const miniButton=event.target.closest('[data-mini]');
    if(miniButton){event.preventDefault();openMiniGame(miniButton.dataset.mini);return;}
    if(event.target.closest('#b-play-card')){if(typeof buildMaps==='function')buildMaps();show('scr-maps');return;}
    if(event.target.closest('#b-mini')){const section=el('juegos');if(section)section.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(event.target.closest('#mini-home')||event.target.closest('#mini-catalogue')){event.preventDefault();goCatalogue();}
  });
  content.addEventListener('click',event=>{
    if(!state)return;
    const answer=event.target.closest('[data-answer]');if(answer&&currentGame==='quiz'){answerQuiz(Number(answer.dataset.answer));return;}
    const bin=event.target.closest('[data-bin]');if(bin&&currentGame==='sort'){answerSort(bin.dataset.bin);return;}
    const card=event.target.closest('[data-card]');if(card&&currentGame==='memory'){flipMemory(Number(card.dataset.card));return;}
    const tower=event.target.closest('[data-tower]');if(tower&&currentGame==='defense'){answerDefense(Number(tower.dataset.tower));return;}
    const action=event.target.closest('[data-mini-action]');if(!action)return;
    if(action.dataset.miniAction==='next')nextQuestion();
    else if(action.dataset.miniAction==='restart')openMiniGame(currentGame);
    else if(action.dataset.miniAction==='catalog')goCatalogue();
  });
  el('mini-home').addEventListener('click',event=>event.preventDefault());
})();
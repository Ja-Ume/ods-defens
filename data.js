'use strict';
/* =========================================================
   ODS DEFENDERS — datos del juego
   Torres (17 ODS), mejoras, enemigos, héroes, mapas, modos
   ========================================================= */

const AB = (n, cd, a, v, x) => Object.assign({ id: n, n, cd, a, v }, x || {});
const U = (n, c, d, m) => ({ n, c, d, m });

/* ---------- ENEMIGOS: los problemas que frenan las ODS ---------- */
const E = {
  bolsa:  { n:'Bolsa de plástico', hp:1, spd:1.0,  kids:[], tags:['plastic','trash'], imm:[], r:12, rew:1,
            info:'Una bolsa de plástico puede tardar hasta 400 años en degradarse. (ODS 12 y 14)' },
  colilla:{ n:'Colilla', hp:1, spd:1.35, kids:['bolsa'], tags:['trash'], imm:[], r:10, rew:1,
            info:'Las colillas son el residuo más común del mundo y contaminan el agua.' },
  botella:{ n:'Botella de plástico', hp:1, spd:1.8, kids:['colilla'], tags:['plastic','trash'], imm:[], r:11, rew:1,
            info:'Cada minuto se compran un millón de botellas de plástico en el planeta.' },
  lata:   { n:'Lata', hp:1, spd:2.4, kids:['botella'], tags:['trash'], imm:[], r:11, rew:1,
            info:'El aluminio se recicla infinitas veces, pero muchas latas acaban en vertederos.' },
  humo:   { n:'Nube de CO₂', hp:1, spd:3.1, kids:['lata'], tags:['smoke'], imm:[], r:12, rew:1,
            info:'Las emisiones de CO₂ calientan el planeta y causan el cambio climático. (ODS 13)' },
  barril: { n:'Barril de petróleo', hp:1, spd:1.9, kids:['humo','humo'], tags:['oil'], imm:['explosive'], r:13, rew:1,
            info:'El petróleo contamina el aire, el mar y el clima. Inmune a las explosiones.' },
  micro:  { n:'Microplásticos', hp:1, spd:2.0, kids:['humo','humo'], tags:['plastic'], imm:['cold'], r:12, rew:1,
            info:'Los microplásticos ya están en el agua, el aire y los alimentos. Inmune al frío. (ODS 14)' },
  plomo:  { n:'Residuo tóxico', hp:1, spd:1.0, kids:['barril','barril'], tags:['toxic'], imm:['sharp'], r:13, rew:1,
            info:'Los residuos tóxicos envenenan suelos y ríos. Inmune a ataques punzantes.' },
  tala:   { n:'Tala ilegal', hp:1, spd:1.9, kids:['barril','micro'], tags:['forest'], imm:['explosive','cold'], r:14, rew:1,
            info:'La deforestación destruye hábitats y acelera el cambio climático. (ODS 15)' },
  smog:   { n:'Smog tóxico', hp:1, spd:2.3, kids:['tala','tala'], tags:['smoke'], imm:[], r:14, rew:1,
            info:'La contaminación del aire causa millones de muertes prematuras cada año.' },
  corrup: { n:'Corrupción', hp:8, spd:2.5, kids:['smog','smog'], tags:['corrupt'], imm:[], r:15, rew:3,
            info:'La corrupción frena el desarrollo y roba recursos a quien más los necesita. (ODS 16)' },
  fake:   { n:'Desinformación', hp:120, spd:2.8, kids:['corrup','corrup','corrup'], tags:['corrupt'], imm:['explosive'], r:19, rew:12, boss:true, noOver:true,
            info:'Los bulos dividen a la sociedad y bloquean la acción colectiva. Rápida y camuflada.' },
  fabrica:{ n:'Fábrica contaminante', hp:120, spd:0.9, kids:['corrup','corrup','corrup','corrup'], tags:['smoke','industry'], imm:[], r:30, rew:15, boss:true, noOver:true,
            info:'Industria sin control: emite humo y vierte residuos. (ODS 9 y 12)' },
  petro:  { n:'Petrolero', hp:500, spd:0.5, kids:['fabrica','fabrica','fabrica','fabrica'], tags:['oil','industry'], imm:[], r:42, rew:50, boss:true, noOver:true,
            info:'Los vertidos de petróleo arruinan la vida marina durante décadas. (ODS 14)' },
  clima:  { n:'Cambio climático', hp:3000, spd:0.35, kids:['petro','petro','petro','petro'], tags:['climate'], imm:[], r:54, rew:150, boss:true, noOver:true,
            info:'El mayor reto de nuestra era. Si llega a la meta, todo se pierde. (ODS 13)' }
};
for (const k in E) if (!E[k].boss) E[k].r = Math.round(E[k].r * 1.35);
// RBE (vida total acumulada) para el coste en vidas y la "fuerza"
(function () {
  const memo = {};
  const f = (t) => { if (memo[t]) return memo[t]; let v = E[t].hp; for (const k of E[t].kids) v += f(k); return (memo[t] = v); };
  for (const t in E) E[t].rbe = f(t);
})();
// Cadena de "regeneración" (los enemigos con regrow recuperan capas)
const UP = { bolsa: 'colilla', colilla: 'botella', botella: 'lata', lata: 'humo' };
const CHAIN = ['bolsa', 'colilla', 'botella', 'lata', 'humo'];

/* ---------- TORRES (una por ODS) ----------
   Mods: dmg, range, pierce, shots, fan, rate(x), pspeed(x), splashR/D, chain, bounces,
   blades, blades2, orbitR, spin(x), hitCd(x), cash, cashInt(x), life, interest, icap, discount,
   crit, detect, homing, slowF, slowT, stunT, freezeT, knock, burn, burnT, weak, weakT, bonus{},
   cashPop, cluster, mines, mineR, smart, aR, aRate(x), aRng, aDmg, aDet, aWeak, aSlow, rcash, cone,
   ring, sym, ring2, ability
*/
const TOWERS = [
  { ods:1, id:'pobreza', name:'Banco Solidario', short:'Banco', emoji:'🏦', col:'#E5243B', cost:500, type:'income',
    atk:'Genera dinero sin parar. No ataca.',
    info:'ODS 1 · Fin de la pobreza. Acaba con la pobreza en todas sus formas: este banco reparte recursos para que todos puedan crecer.',
    base:{ range:0, cash:20, cashInt:8 },
    paths:[
      { n:'Microcréditos', u:[
        U('Primer préstamo',250,'+$12 por ciclo',{cash:12}),
        U('Cartilla de ahorro',500,'Ciclos 25% más rápidos',{cashInt:.75}),
        U('Banca comunitaria',1100,'+$40 por ciclo',{cash:40}),
        U('Fondo de inversión',4200,'+$120 y más rápido',{cash:120,cashInt:.8}),
        U('Economía sin pobreza',18000,'+$600 · Hab: Rescate económico',{cash:600,cashInt:.7,ability:AB('Rescate económico',90,'cash',2500)}) ]},
      { n:'Banca ética', u:[
        U('Interés compuesto',300,'2% de interés por ronda',{interest:.02,icap:60}),
        U('Ahorro inteligente',650,'+1% de interés',{interest:.01,icap:60}),
        U('Descuento solidario',1500,'-6% coste de torres y mejoras',{discount:.06,interest:.01,icap:100}),
        U('Banco del tiempo',5200,'-6% más y mayor interés',{discount:.06,interest:.02,icap:400}),
        U('Renta básica universal',20000,'-8% más y gran interés',{discount:.08,interest:.03,icap:2000}) ]},
      { n:'Ayuda humanitaria', u:[
        U('Comedor social',200,'+1 vida por ronda',{life:1}),
        U('Refugio',450,'+1 vida por ronda',{life:1}),
        U('Cooperación internacional',1300,'+2 vidas por ronda y +$20',{life:2,cash:20}),
        U('Corredor humanitario',4800,'+3 vidas · Hab: +25 vidas',{life:3,ability:AB('Ayuda de emergencia',80,'heal',25)}),
        U('Pobreza cero',16000,'+10 vidas/ronda · Hab: +$4000',{life:10,ability:AB('Plan global',100,'cash',4000)}) ]}
    ]},

  { ods:2, id:'hambre', name:'Granjero del Hambre Cero', short:'Granjero', emoji:'🌽', col:'#DDA63A', cost:280, type:'shot',
    atk:'Dispara un abanico de semillas.',
    info:'ODS 2 · Hambre cero. Poner fin al hambre y promover una agricultura sostenible: lanza semillas en abanico.',
    base:{ range:125, rate:1.05, dmg:1, pierce:1, shots:3, fan:.55, pspeed:420, kind:'sharp', vis:'seed' },
    paths:[
      { n:'Cosecha abundante', u:[
        U('Semillas selectas',120,'+1 perforación',{pierce:1}),
        U('Siembra en surco',230,'+2 semillas',{shots:2,fan:.25}),
        U('Cultivo intensivo',750,'Dispara 35% más rápido',{rate:.65,range:12}),
        U('Cosecha total',3400,'+1 daño, +2 semillas',{dmg:1,shots:2,fan:.4,pierce:1}),
        U('Cuerno de la abundancia',15000,'Lluvia en 360º · Hab: Festín',{ring:true,shots:6,dmg:1,rate:.8,pierce:2,ability:AB('Festín mundial',70,'nuke',12)}) ]},
      { n:'Comercio justo', u:[
        U('Venta directa',150,'Cada baja da +$1',{cashPop:1}),
        U('Mercado local',300,'+$1 por baja, +alcance',{cashPop:1,range:10}),
        U('Cooperativa agrícola',900,'+$2 por baja, +1 daño',{cashPop:2,dmg:1}),
        U('Denominación de origen',3600,'+$3 por baja, +perforación',{cashPop:3,pierce:2}),
        U('Soberanía alimentaria',14000,'+$6 por baja · Hab: dinero',{cashPop:6,shots:2,ability:AB('Cosecha de dinero',80,'cash',1800)}) ]},
      { n:'Huerto comunitario', u:[
        U('Tomatazo',140,'Los frutos explotan (zona)',{splashR:26,splashD:1}),
        U('Mermelada pegajosa',320,'Ralentiza enemigos',{slowF:.7,slowT:1.4}),
        U('Compost caliente',950,'Quema a los enemigos',{burn:1.2,burnT:3}),
        U('Biofertilizante',3800,'Zona mayor y más daño',{splashR:22,splashD:2,burn:2}),
        U('Huerto del mundo',15500,'Gran explosión · Hab: Plaga controlada',{splashR:25,splashD:4,slowF:.5,slowT:2,burn:5,ability:AB('Plaga controlada',75,'weakAll',.35,{t:8})}) ]}
    ]},

  { ods:3, id:'salud', name:'Médico de Salud y Bienestar', short:'Médico', emoji:'🩺', col:'#4C9F38', cost:240, type:'shot',
    atk:'Dispara píldoras rápidas y precisas.',
    info:'ODS 3 · Salud y bienestar. Garantizar una vida sana para todos: dispara píldoras rápidas y cuida las vidas del equipo.',
    base:{ range:140, rate:.65, dmg:1, pierce:2, shots:1, fan:0, pspeed:720, kind:'sharp', vis:'pill' },
    paths:[
      { n:'Vacunación', u:[
        U('Jeringa afilada',110,'+1 perforación',{pierce:1}),
        U('Dosis doble',260,'Dispara 2 píldoras',{shots:1,fan:.14}),
        U('Antibiótico',700,'+1 daño',{dmg:1}),
        U('Vacuna universal',3000,'+1 daño, mucho más rápido',{dmg:1,rate:.6}),
        U('Inmunidad de rebaño',13000,'+3 daño · Hab: Campaña de vacunación',{dmg:3,shots:2,rate:.7,ability:AB('Campaña de vacunación',60,'weakAll',.5,{t:10})}) ]},
      { n:'Prevención', u:[
        U('Rayos X',130,'Detecta camuflaje, +alcance',{detect:true,range:15}),
        U('Diagnóstico precoz',280,'Impactados reciben +20% daño',{weak:.2,weakT:2.5}),
        U('Telemedicina',800,'Mucho más alcance',{range:45,weak:.3}),
        U('Epidemiología',3200,'+40% daño recibido, más rápido',{weak:.4,weakT:4,rate:.8}),
        U('Salud global',14000,'Debilita al máximo · Hab: +30 vidas',{weak:.6,life:5,range:30,ability:AB('Cobertura sanitaria',90,'heal',30)}) ]},
      { n:'Cuidados', u:[
        U('Botiquín',150,'+1 vida por ronda',{life:1}),
        U('Primeros auxilios',320,'+1 vida/ronda, +alcance',{life:1,range:8}),
        U('Hospital',900,'+2 vidas/ronda y aturde',{life:2,stunT:.4}),
        U('Medicina preventiva',3600,'+3 vidas/ronda, +1 daño',{life:3,stunT:.8,dmg:1}),
        U('Bienestar para todos',15000,'+6 vidas/ronda · Hab: +50 vidas',{life:6,ability:AB('Plan de bienestar',120,'heal',50)}) ]}
    ]},

  { ods:4, id:'educacion', name:'Maestro de Educación de Calidad', short:'Maestro', emoji:'📚', col:'#C5192D', cost:300, type:'boom',
    atk:'Lanza libros que vuelven como bumerán.',
    info:'ODS 4 · Educación de calidad. Educación inclusiva y equitativa: sus libros atraviesan a muchos enemigos y vuelven.',
    base:{ range:150, rate:1.15, dmg:1, pierce:5, shots:1, fan:0, pspeed:340, kind:'sharp', vis:'book' },
    paths:[
      { n:'Aprendizaje', u:[
        U('Libros afilados',140,'+3 perforación',{pierce:3}),
        U('Lectura rápida',260,'Lanza más rápido',{rate:.8}),
        U('Biblioteca',900,'+1 daño, 2 libros',{dmg:1,shots:1,fan:.3}),
        U('Enciclopedia',3600,'+2 daño, +4 perforación',{dmg:2,pierce:4}),
        U('Universidad para todos',14500,'+3 daño · Hab: Examen final',{dmg:3,shots:1,rate:.75,ability:AB('Examen final',70,'nuke',18)}) ]},
      { n:'Pensamiento crítico', u:[
        U('Anteojos',120,'+alcance',{range:20}),
        U('Pensamiento crítico',300,'Golpes críticos 15%',{crit:.15}),
        U('Método científico',850,'Críticos 30%, +alcance',{crit:.3,range:20}),
        U('Doctorado',3300,'Críticos 45%, +1 daño',{crit:.45,dmg:1}),
        U('Sabiduría ancestral',13500,'Críticos 60%, +3 daño, detecta',{crit:.6,dmg:3,detect:true,range:25}) ]},
      { n:'Escuela abierta', u:[
        U('Pupitres',200,'Torres cercanas +5% velocidad',{aR:140,aRate:.95}),
        U('Clase magistral',420,'Cercanas +alcance y velocidad',{aRate:.95,aRng:8}),
        U('Tutorías',1000,'Cercanas +8% vel., detectan camuflaje',{aRate:.92,aDet:true}),
        U('Becas',3500,'Cercanas +1 daño, más radio',{aDmg:1,aR:30}),
        U('Educación gratuita',14000,'Gran apoyo · Hab: Clase global',{aRate:.8,aRng:15,aDmg:1,aR:60,ability:AB('Clase global',80,'boost',.6,{t:8})}) ]}
    ]},

  { ods:5, id:'genero', name:'Equilibrio de Igualdad de Género', short:'Equilibrio', emoji:'⚖️', col:'#FF3A21', cost:320, type:'shot',
    atk:'Dispara orbes por ambos lados a la vez.',
    info:'ODS 5 · Igualdad de género. Lograr la igualdad y empoderar a mujeres y niñas: sus orbes atacan por ambos lados por igual.',
    base:{ range:130, rate:.85, dmg:1, pierce:2, shots:1, fan:0, pspeed:540, kind:'energy', vis:'orb', sym:true },
    paths:[
      { n:'Equidad', u:[
        U('Balanza',150,'+1 par de orbes',{shots:1,fan:.2}),
        U('Salario igual',320,'+perforación, más rápido',{pierce:2,rate:.9}),
        U('Paridad',900,'+1 daño, +1 par',{dmg:1,shots:1}),
        U('Liderazgo compartido',3600,'+2 daño, mucho más rápido',{dmg:2,rate:.65}),
        U('Igualdad plena',15000,'Orbes enormes · Hab: Ola de igualdad',{dmg:3,shots:2,pierce:3,ability:AB('Ola de igualdad',65,'stunAll',2.5)}) ]},
      { n:'Empoderamiento', u:[
        U('Voz propia',140,'Los orbes buscan enemigos',{homing:4}),
        U('Autonomía',300,'+alcance y velocidad de orbe',{range:20,pspeed:1.3}),
        U('Referentes',850,'Los orbes aturden brevemente',{stunT:.5,homing:7}),
        U('Sororidad',3300,'+1 daño, aturdimiento largo',{dmg:1,stunT:1,rate:.85}),
        U('Empoderamiento global',14000,'Daño enorme · Hab: Voz global',{dmg:6,stunT:1.5,rate:.7,range:30,ability:AB('Voz global',75,'weakAll',.5,{t:8})}) ]},
      { n:'Techo de cristal', u:[
        U('Rompe barreras',160,'+3 perforación',{pierce:3}),
        U('Techo roto',340,'Daño x2 a la corrupción',{bonus:{corrupt:2}}),
        U('Sin brecha salarial',900,'Los orbes estallan al impactar',{splashR:30,splashD:1}),
        U('Ley de igualdad',3500,'x3 corrupción e industria',{bonus:{corrupt:3,industry:3},splashR:15,splashD:2}),
        U('Mundo equitativo',14500,'Explosiones enormes · Hab: Ley universal',{splashR:30,splashD:5,dmg:2,ability:AB('Ley universal',80,'clear','corrupt')}) ]}
    ]},

  { ods:6, id:'agua', name:'Aguador de Agua Limpia', short:'Aguador', emoji:'💧', col:'#26BDE2', cost:350, type:'spray',
    atk:'Chorro de agua continuo en cono que ralentiza.',
    info:'ODS 6 · Agua limpia y saneamiento. Garantizar agua para todos: su chorro lava y ralentiza a los contaminantes.',
    base:{ range:105, rate:.13, dmg:.3, cone:.75, kind:'water', slowF:.8, slowT:.35, knock:.8, vis:'drop' },
    paths:[
      { n:'Presión', u:[
        U('Boquilla',150,'+alcance',{range:15}),
        U('Bomba hidráulica',320,'Más daño por segundo',{dmg:.15}),
        U('Cañón de agua',950,'Más daño y empuje',{dmg:.2,knock:1.2,range:10}),
        U('Hidroeléctrica',3600,'Mucho daño, cono más ancho',{dmg:.5,cone:.45}),
        U('Torrente imparable',15000,'Daño enorme · Hab: Tsunami',{dmg:1.2,rate:.7,knock:2,ability:AB('Tsunami',70,'push',420)}) ]},
      { n:'Saneamiento', u:[
        U('Depuradora',140,'Detecta camuflaje',{detect:true}),
        U('Filtro',300,'Daño x2 a plásticos',{bonus:{plastic:2}}),
        U('Planta de tratamiento',900,'x3 tóxicos, x2 petróleo',{bonus:{toxic:3,oil:2}}),
        U('Cloración',3500,'Daño continuo (quema)',{burn:3,burnT:2.5,dmg:.2}),
        U('Agua limpia universal',14500,'x4 contaminantes · Hab: Gran limpieza',{bonus:{plastic:4,toxic:4,oil:4,smoke:2},ability:AB('Gran limpieza',80,'clear','plastic')}) ]},
      { n:'Inundación', u:[
        U('Agua fría',160,'Ralentiza más',{slowF:.6,slowT:.6}),
        U('Humedad',340,'+alcance, debilita',{range:15,weak:.2,weakT:1}),
        U('Charcos',950,'Ralentiza mucho',{slowF:.4,slowT:1}),
        U('Desbordamiento',3400,'Casi inmoviliza',{slowF:.22,slowT:1.5,weak:.3}),
        U('Marea eterna',14500,'Inmoviliza · Hab: Congelar todo',{slowF:.12,weak:.5,ability:AB('Desbordamiento total',75,'freezeAll',3)}) ]}
    ]},

  { ods:7, id:'energia', name:'Torre de Energía Limpia', short:'Energía', emoji:'☀️', col:'#FCC30B', cost:450, type:'chain',
    atk:'Rayo solar que salta entre enemigos. Detecta camuflaje.',
    info:'ODS 7 · Energía asequible y no contaminante. Energía para todos: rayos solares que saltan de enemigo en enemigo.',
    base:{ range:125, rate:1.25, dmg:1, chain:3, kind:'energy', detect:true, vis:'bolt' },
    paths:[
      { n:'Solar', u:[
        U('Panel solar',200,'+1 salto',{chain:1}),
        U('Concentrador',420,'+1 daño',{dmg:1}),
        U('Central termosolar',1300,'+2 saltos, más rápida',{chain:2,rate:.75}),
        U('Fusión limpia',4800,'+3 daño, +2 saltos',{dmg:3,chain:2}),
        U('Sol artificial',19000,'Rayos masivos · Hab: Sobrecarga',{dmg:6,chain:4,rate:.6,ability:AB('Sobrecarga solar',70,'nuke',30)}) ]},
      { n:'Eólica', u:[
        U('Aerogenerador',180,'+alcance',{range:20}),
        U('Parque eólico',400,'Dispara más rápido',{rate:.8}),
        U('Viento de cola',1100,'Los rayos empujan enemigos',{knock:25,range:15}),
        U('Huracán',4400,'Aturde, +alcance',{stunT:.6,range:30,rate:.8}),
        U('Tormenta perfecta',17000,'Velocidad extrema · Hab: Vendaval',{rate:.45,knock:40,stunT:1,ability:AB('Vendaval',70,'push',500)}) ]},
      { n:'Renovables', u:[
        U('Energía limpia',200,'Daño x2 a humo',{bonus:{smoke:2}}),
        U('Biomasa',420,'x2 petróleo, quema',{bonus:{oil:2},burn:1,burnT:2}),
        U('Geotermia',1200,'x3 contaminación, +$1 por baja',{bonus:{smoke:3,oil:3,industry:2},cashPop:1}),
        U('Red inteligente',4600,'+$2 por baja, +2 saltos',{cashPop:2,chain:2}),
        U('Energía para todos',18000,'Gran bono · Hab: Apagón contaminante',{bonus:{smoke:5,oil:5,industry:4,climate:3},cashPop:3,ability:AB('Apagón contaminante',90,'clear','smoke')}) ]}
    ]},

  { ods:8, id:'trabajo', name:'Obrero de Trabajo Decente', short:'Obrero', emoji:'🔨', col:'#A21942', cost:400, type:'pulse',
    atk:'Martillazo en área alrededor de la torre.',
    info:'ODS 8 · Trabajo decente y crecimiento. Empleo digno para todos: golpea fuerte a su alrededor y mueve la economía.',
    base:{ range:80, rate:1.5, dmg:1, kind:'normal', vis:'hammer' },
    paths:[
      { n:'Productividad', u:[
        U('Martillo reforzado',180,'+1 daño',{dmg:1}),
        U('Turnos eficientes',380,'Golpea más rápido',{rate:.75}),
        U('Maquinaria',1100,'+2 daño, +alcance',{dmg:2,range:15}),
        U('Industria 4.0',4300,'+4 daño',{dmg:4,rate:.8}),
        U('Pleno empleo',16000,'Terremoto · Hab: Huelga general',{dmg:10,rate:.6,range:20,ability:AB('Huelga general',75,'stunAll',3)}) ]},
      { n:'Derechos laborales', u:[
        U('Convenio',170,'El golpe empuja',{knock:25}),
        U('Salario justo',360,'Aturde enemigos',{stunT:.5}),
        U('Seguridad laboral',1000,'Más empuje y aturdimiento',{knock:35,stunT:.8,range:10}),
        U('Sindicato',4000,'Gran control, +2 daño',{knock:60,stunT:1.4,dmg:2}),
        U('Derechos universales',15500,'Inmoviliza · Hab: Paro nacional',{knock:90,stunT:2,ability:AB('Paro nacional',70,'freezeAll',3)}) ]},
      { n:'Crecimiento', u:[
        U('Nómina',200,'+$1 por baja',{cashPop:1}),
        U('Emprendimiento',420,'+$40 al final de ronda',{rcash:40}),
        U('PYMEs',1200,'+$120 por ronda, +$1 por baja',{rcash:120,cashPop:1}),
        U('Economía circular',4500,'+$400 por ronda, +2 daño',{rcash:400,dmg:2}),
        U('Crecimiento inclusivo',17000,'+$1200/ronda · Hab: Inversión',{rcash:1200,ability:AB('Inversión',90,'cash',3000)}) ]}
    ]},

  { ods:9, id:'industria', name:'Ingeniero de Industria e Innovación', short:'Ingeniero', emoji:'🏗️', col:'#FD6925', cost:380, type:'mine',
    atk:'Planta minas en el camino que estallan al paso.',
    info:'ODS 9 · Industria, innovación e infraestructuras. Infraestructuras resilientes: planta minas inteligentes en el camino.',
    base:{ range:150, rate:2.3, dmg:3, mines:4, mineR:46, kind:'explosive', vis:'mine' },
    paths:[
      { n:'Infraestructura', u:[
        U('Minas reforzadas',160,'+2 minas',{mines:2}),
        U('Cargas potentes',340,'+2 daño',{dmg:2}),
        U('Obra pública',1000,'+4 minas, más rápido',{mines:4,rate:.7}),
        U('Megaestructura',4000,'+6 daño, más radio',{dmg:6,mineR:20}),
        U('Ciudad bajo tierra',15000,'Campo minado · Hab: Detonación',{dmg:18,mines:8,rate:.5,mineR:20,ability:AB('Detonación en cadena',65,'nuke',25)}) ]},
      { n:'Innovación', u:[
        U('Sensores',150,'+alcance',{range:25}),
        U('Minas pegajosas',330,'Ralentizan en zona',{slowF:.5,slowT:2}),
        U('Metralla',950,'Explosión en racimo',{cluster:3}),
        U('Nanotecnología',3800,'Más racimos y quema',{cluster:4,burn:3,burnT:3}),
        U('Innovación disruptiva',15500,'Racimos x2 · Hab: Pulso EMP',{cluster:5,dmg:5,ability:AB('Pulso EMP',70,'stunAll',3)}) ]},
      { n:'Drones', u:[
        U('Dron explorador',200,'Detecta camuflaje, +alcance',{detect:true,range:15}),
        U('Dron bombardero',420,'Despliega más rápido',{rate:.75}),
        U('Enjambre de drones',1100,'Minas inteligentes (bajo enemigos)',{smart:true,rate:.8}),
        U('Red logística',4200,'Más rápido y +3 daño',{rate:.6,dmg:3,mines:3}),
        U('Infraestructura resiliente',16000,'Lluvia de drones · Hab: Bombardeo',{rate:.35,dmg:6,mines:6,ability:AB('Bombardeo de drones',65,'nuke',35)}) ]}
    ]},

  { ods:10, id:'desigualdad', name:'Nivelador de Desigualdades', short:'Nivelador', emoji:'🤝', col:'#DD1367', cost:600, type:'aura',
    atk:'Aura: refuerza torres cercanas y debilita enemigos.',
    info:'ODS 10 · Reducción de las desigualdades. Nadie se queda atrás: refuerza a las torres cercanas y debilita a los enemigos.',
    base:{ range:150, aR:150, aRate:.94 },
    paths:[
      { n:'Redistribución', u:[
        U('Impuesto justo',250,'Cercanas +4% velocidad',{aRate:.98}),
        U('Subsidios',500,'Cercanas +alcance',{aRng:12}),
        U('Renta mínima',1300,'Cercanas +8% vel., +1 daño',{aRate:.94,aDmg:1}),
        U('Seguridad social',4800,'Gran refuerzo y radio',{aRate:.9,aR:40,aDmg:1}),
        U('Igualdad de oportunidades',17000,'Refuerzo enorme · Hab: Nivelación',{aRate:.85,aDmg:2,aRng:15,aR:120,ability:AB('Nivelación',70,'boost',.55,{t:8})}) ]},
      { n:'Inclusión', u:[
        U('Accesibilidad',220,'Enemigos en zona +10% daño',{aWeak:.1}),
        U('Visibilidad',450,'Cercanas detectan camuflaje',{aDet:true}),
        U('Diversidad',1200,'Enemigos +25% daño recibido',{aWeak:.15}),
        U('Equidad territorial',4600,'Enemigos +45%, más radio',{aWeak:.2,aR:30}),
        U('Sociedad inclusiva',16500,'Enemigos +80% · Hab: Mano tendida',{aWeak:.35,aR:80,ability:AB('Mano tendida',75,'weakAll',.6,{t:8})}) ]},
      { n:'Cohesión', u:[
        U('Vecindad',230,'Ralentiza ligeramente enemigos en zona',{aSlow:.9}),
        U('Plazas públicas',480,'Más ralentización',{aSlow:.8}),
        U('Cohesión social',1300,'Ralentiza y +$60 por ronda',{aSlow:.7,rcash:60}),
        U('Justicia redistributiva',4700,'Ralentiza mucho, +$200/ronda',{aSlow:.55,rcash:200,aR:30}),
        U('Sociedad sin brechas',17000,'Gran lentitud · Hab: Comunidad unida',{aSlow:.35,rcash:800,aR:60,ability:AB('Comunidad unida',80,'freezeAll',3)}) ]}
    ]},

  { ods:11, id:'ciudades', name:'Urbanista de Ciudades Sostenibles', short:'Urbanista', emoji:'🏙️', col:'#FD9D24', cost:520, type:'bomb',
    atk:'Lanza bombas con explosión en área.',
    info:'ODS 11 · Ciudades y comunidades sostenibles. Ciudades seguras y resilientes: lanza bombas con explosión en área.',
    base:{ range:165, rate:1.8, dmg:1, splashR:55, splashD:0, pspeed:300, kind:'explosive', vis:'bomb' },
    paths:[
      { n:'Edificación', u:[
        U('Cargas mayores',220,'Explosión más grande',{splashR:12}),
        U('Pólvora',450,'+2 daño en zona',{splashD:2,dmg:1}),
        U('Rascacielos',1400,'Dispara más rápido',{rate:.7,splashR:10}),
        U('Demolición controlada',5200,'+6 daño en zona',{splashD:6,dmg:3}),
        U('Metrópolis',19000,'Devastadora · Hab: Demolición total',{splashD:18,splashR:25,rate:.7,dmg:6,ability:AB('Demolición total',70,'nuke',40)}) ]},
      { n:'Planificación', u:[
        U('Plano urbano',210,'+alcance',{range:20}),
        U('Zonificación',440,'Bombas con racimo',{cluster:3}),
        U('Barrios sostenibles',1300,'Más racimos, +alcance',{cluster:3,range:15}),
        U('Smart city',5000,'Racimos potentes',{cluster:4,splashD:2}),
        U('Ciudad resiliente',18000,'Racimos masivos · Hab: Lluvia',{cluster:8,splashD:4,rate:.7,ability:AB('Lluvia de racimos',65,'nuke',30)}) ]},
      { n:'Movilidad', u:[
        U('Carril bici',200,'Explosiones ralentizan',{slowF:.7,slowT:1.2}),
        U('Transporte público',430,'Ralentiza más, detecta camuflaje',{slowF:.5,slowT:1.5,detect:true}),
        U('Peatonalización',1300,'Aturde brevemente',{stunT:.6}),
        U('Ciudad de 15 minutos',4900,'Aturde y debilita',{stunT:1.1,weak:.3,weakT:4}),
        U('Ciudad inclusiva',17500,'Control total · Hab: Cierre de tráfico',{stunT:2,weak:.5,slowF:.3,splashR:15,ability:AB('Cierre de tráfico',75,'stunAll',3)}) ]}
    ]},

  { ods:12, id:'produccion', name:'Reciclador de Consumo Responsable', short:'Reciclador', emoji:'♻️', col:'#BF8B2E', cost:340, type:'bounce',
    atk:'Discos reciclados que rebotan entre enemigos.',
    info:'ODS 12 · Producción y consumo responsables. Reducir, reutilizar, reciclar: sus discos rebotan y destrozan el plástico.',
    base:{ range:145, rate:1.2, dmg:1, pierce:2, bounces:3, shots:1, fan:0, pspeed:480, kind:'sharp', vis:'disc', bonus:{plastic:2} },
    paths:[
      { n:'Reciclaje', u:[
        U('Más rebotes',150,'+3 rebotes',{bounces:3}),
        U('Doble disco',300,'Lanza 2 discos',{shots:1,fan:.3}),
        U('Contenedor amarillo',900,'+1 daño, más rápido',{dmg:1,rate:.8}),
        U('Planta de reciclaje',3500,'+2 daño, +6 rebotes',{dmg:2,bounces:6}),
        U('Residuo cero',14500,'Rebotes casi infinitos · Hab: Reciclado',{dmg:3,bounces:14,shots:1,pierce:2,ability:AB('Reciclado masivo',65,'clear','trash')}) ]},
      { n:'Reutilizar', u:[
        U('Segunda vida',140,'+2 perforación',{pierce:2}),
        U('Reparar',320,'+alcance y velocidad',{range:20,pspeed:1.3}),
        U('Economía circular',900,'+$1 por baja, x3 plástico',{cashPop:1,bonus:{plastic:3}}),
        U('Upcycling',3400,'+$2 por baja, x4 plástico',{cashPop:2,bonus:{plastic:4,trash:2}}),
        U('Cultura de reutilizar',14000,'+$4 por baja · Hab: Mercadillo',{cashPop:4,pierce:3,ability:AB('Mercadillo',80,'cash',2200)}) ]},
      { n:'Reducir', u:[
        U('Ahorra',150,'Detecta camuflaje',{detect:true}),
        U('Compostaje',320,'Debilita al impactar',{weak:.2,weakT:2.5}),
        U('Consumo consciente',900,'+2 daño, debilita más',{dmg:2,weak:.25}),
        U('Producción limpia',3400,'Quema y debilita',{burn:2.5,burnT:3,weak:.35}),
        U('Consumo responsable',14500,'+4 daño · Hab: Cambio de hábitos',{dmg:4,weak:.55,burn:6,ability:AB('Cambio de hábitos',70,'weakAll',.6,{t:8})}) ]}
    ]},

  { ods:13, id:'clima', name:'Guardián de la Acción por el Clima', short:'Clima', emoji:'🌡️', col:'#3F7E44', cost:400, type:'pulse',
    atk:'Pulso helado que ralentiza a todos los cercanos.',
    info:'ODS 13 · Acción por el clima. Combatir el cambio climático: su pulso helado ralentiza y congela a los enemigos.',
    base:{ range:92, rate:1.9, dmg:1, kind:'cold', slowF:.55, slowT:1.8, vis:'ice' },
    paths:[
      { n:'Mitigación', u:[
        U('Frío intenso',170,'Ralentiza más, +alcance',{slowF:.45,range:12}),
        U('Congelación',380,'Congela brevemente',{freezeT:.8}),
        U('Glaciar',1100,'Congela 1,4s, +1 daño',{freezeT:1.4,dmg:1}),
        U('Era glacial',4300,'Congelación larga, más zona',{freezeT:2.2,range:25,rate:.8}),
        U('Invierno nuclear',16500,'Congelación total · Hab: Era de hielo',{freezeT:3,dmg:3,range:25,ability:AB('Era de hielo',80,'freezeAll',4)}) ]},
      { n:'Adaptación', u:[
        U('Ropa térmica',150,'Detecta camuflaje',{detect:true}),
        U('Aislamiento',340,'Debilita enemigos',{weak:.2,weakT:3}),
        U('Resiliencia',1000,'+alcance, debilita más',{weak:.3,range:20}),
        U('Planificación climática',4000,'Mucho debilitamiento',{weak:.5,weakT:5,rate:.75}),
        U('Adaptación total',15500,'Extremo · Hab: Alerta climática',{weak:.9,range:30,ability:AB('Alerta climática',75,'weakAll',.8,{t:8})}) ]},
      { n:'Descarbonización', u:[
        U('Menos CO₂',170,'+1 daño, x2 a humo',{bonus:{smoke:2},dmg:1}),
        U('Captura de carbono',360,'+2 daño, x3 a humo',{dmg:2,bonus:{smoke:3}}),
        U('Neutralidad',1050,'+3 daño, x3 industria',{dmg:3,bonus:{industry:3,oil:2}}),
        U('Emisiones cero',4200,'+6 daño, x4 a todo',{dmg:6,bonus:{smoke:4,industry:4,oil:3,climate:2}}),
        U('Planeta enfriado',16000,'Enorme al clima · Hab: Acuerdo',{dmg:14,bonus:{climate:5,smoke:6,industry:5,oil:4},ability:AB('Acuerdo climático',80,'nuke',35)}) ]}
    ]},

  { ods:14, id:'submarina', name:'Pulpo de Vida Submarina', short:'Pulpo', emoji:'🐙', col:'#0A97D9', cost:360, type:'shot',
    atk:'Burbujas buscadoras, letales contra el plástico.',
    info:'ODS 14 · Vida submarina. Conservar océanos y mares: sus burbujas buscan enemigos y arrasan el plástico y el petróleo.',
    base:{ range:150, rate:.95, dmg:1, pierce:1, shots:1, fan:0, pspeed:400, kind:'normal', homing:5, vis:'bubble', bonus:{plastic:2,oil:2} },
    paths:[
      { n:'Corrientes', u:[
        U('Más burbujas',150,'Lanza 2 burbujas',{shots:1,fan:.3}),
        U('Corriente cálida',320,'+perforación, más rápido',{pierce:2,rate:.85}),
        U('Banco de peces',900,'+2 burbujas, +1 daño',{shots:2,fan:.4,dmg:1}),
        U('Remolino',3500,'Ráfagas rápidas',{rate:.6,dmg:1,pierce:2}),
        U('Océano limpio',14500,'Torrente · Hab: Marea viva',{shots:4,fan:.8,dmg:3,rate:.7,ability:AB('Marea viva',70,'push',380)}) ]},
      { n:'Limpieza de plásticos', u:[
        U('Red de pesca',160,'x3 daño a plástico',{bonus:{plastic:3}}),
        U('Pulpo limpiador',340,'x4 plástico, x3 petróleo',{bonus:{plastic:4,oil:3}}),
        U('Barredor marino',950,'x3 basura, +1 daño',{bonus:{trash:3,plastic:5},dmg:1}),
        U('Isla sin basura',3500,'Daño enorme a contaminantes',{bonus:{plastic:7,oil:6,trash:4,toxic:4},dmg:2}),
        U('Mares sin plástico',14500,'Barre el plástico · Hab: Limpieza',{bonus:{plastic:12,oil:8,trash:6,toxic:6,industry:3},ability:AB('Limpieza oceánica',75,'clear','plastic')}) ]},
      { n:'Biodiversidad', u:[
        U('Sonar',150,'Detecta camuflaje, +alcance',{detect:true,range:20}),
        U('Cardumen',320,'Ralentiza al impactar',{slowF:.6,slowT:1.2}),
        U('Medusa',900,'Aturde al impactar',{stunT:.7}),
        U('Coral protector',3400,'Aturde mucho, +2 daño',{stunT:1.3,dmg:2}),
        U('Arrecife vivo',14000,'Control y daño · Hab: Ola gigante',{stunT:2,dmg:3,slowF:.4,ability:AB('Ola gigante',75,'freezeAll',3)}) ]}
    ]},

  { ods:15, id:'terrestre', name:'Guardián de Ecosistemas Terrestres', short:'Guardián', emoji:'🌳', col:'#56C02B', cost:450, type:'orbit',
    atk:'Hojas afiladas que giran a su alrededor.',
    info:'ODS 15 · Vida de ecosistemas terrestres. Proteger bosques y biodiversidad: hojas que giran como escudo protector.',
    base:{ range:56, orbitR:56, blades:2, dmg:1, spin:3, hitCd:.45, kind:'sharp', vis:'leaf' },
    paths:[
      { n:'Bosque', u:[
        U('Más hojas',200,'+1 hoja',{blades:1}),
        U('Savia',420,'+1 daño',{dmg:1}),
        U('Arboleda',1200,'+2 hojas, giran más rápido',{blades:2,spin:1.3}),
        U('Selva',4600,'+3 daño, +2 hojas',{dmg:3,blades:2}),
        U('Bosque eterno',17000,'Espinas veloces · Hab: Furia',{dmg:5,blades:4,spin:1.4,hitCd:.7,ability:AB('Furia del bosque',70,'nuke',25)}) ]},
      { n:'Raíces', u:[
        U('Raíces',210,'Ralentiza al golpear',{slowF:.6,slowT:1.2}),
        U('Enredaderas',440,'Aturde, +radio',{stunT:.6,orbitR:12,range:12}),
        U('Manglar',1200,'Enraíza mucho tiempo',{stunT:1.2,orbitR:12,range:12}),
        U('Bosque tropical',4700,'Más radio y control, +2 daño',{stunT:1.8,orbitR:20,range:20,dmg:2}),
        U('Guardián ancestral',17500,'Inmoviliza · Hab: Raíces globales',{stunT:2.5,orbitR:15,range:15,ability:AB('Raíces globales',75,'stunAll',4)}) ]},
      { n:'Biodiversidad', u:[
        U('Anillo exterior',230,'Segundo anillo de 2 hojas',{ring2:true,blades2:2}),
        U('Polinizadores',460,'+1 hoja exterior, más veloz',{blades2:1,spin:1.2}),
        U('Corredor ecológico',1300,'+2 hojas exteriores, quema',{blades2:2,burn:1.5,burnT:2}),
        U('Reserva natural',4800,'+3 exteriores, +2 daño, +2 vidas/ronda',{blades2:3,dmg:2,life:2}),
        U('Ecosistema pleno',17500,'+5 vidas/ronda · Hab: Renacer',{blades2:4,dmg:3,life:5,ability:AB('Renacer natural',90,'heal',35)}) ]}
    ]},

  { ods:16, id:'paz', name:'Juez de Paz y Justicia', short:'Juez', emoji:'🕊️', col:'#00689D', cost:700, type:'sniper',
    atk:'Disparo certero a cualquier distancia. Detecta camuflaje.',
    info:'ODS 16 · Paz, justicia e instituciones sólidas. Sociedades pacíficas e instituciones transparentes: su mazo llega a todo el mapa.',
    base:{ range:9999, rate:1.9, dmg:5, pierce:1, kind:'normal', detect:true, vis:'gavel' },
    paths:[
      { n:'Justicia rápida', u:[
        U('Mazo veloz',300,'Dispara más rápido',{rate:.8}),
        U('Fiscalía eficaz',650,'+4 daño',{dmg:4}),
        U('Tribunal supremo',1700,'Mucho más rápido, +4 daño',{rate:.6,dmg:4}),
        U('Justicia universal',6000,'+15 daño',{dmg:15,rate:.7}),
        U('Paz mundial',22000,'Devastador · Hab: Sentencia firme',{dmg:50,rate:.6,ability:AB('Sentencia firme',70,'nuke',60)}) ]},
      { n:'Instituciones sólidas', u:[
        U('Transparencia',280,'x2 a la corrupción',{bonus:{corrupt:2}}),
        U('Auditoría',600,'+$2 por baja, x3 corrupción',{cashPop:2,bonus:{corrupt:3}}),
        U('Anticorrupción',1600,'x5 corrupción, +$3 por baja',{bonus:{corrupt:5},cashPop:3}),
        U('Cumbre anticorrupción',6200,'x8 corrupción, +$5',{bonus:{corrupt:8,industry:3},cashPop:5}),
        U('Instituciones sólidas',22000,'x15 corrupción · Hab: Cero impunidad',{bonus:{corrupt:15,industry:5,climate:3},cashPop:8,ability:AB('Cero impunidad',80,'clear','corrupt')}) ]},
      { n:'Paz', u:[
        U('Mediación',270,'El disparo perfora 3',{pierce:3}),
        U('Diálogo',600,'Aturde al impactar',{stunT:1,pierce:2}),
        U('Cascos azules',1600,'Debilita, perfora 8',{weak:.4,weakT:5,pierce:5}),
        U('Acuerdo de paz',6000,'Aturde 3s, debilita, +6 daño',{stunT:2.5,weak:.6,dmg:6}),
        U('Paz duradera',21500,'Hab: Alto el fuego',{stunT:3.5,weak:1,pierce:8,ability:AB('Alto el fuego',80,'stunAll',4)}) ]}
    ]},

  { ods:17, id:'alianzas', name:'Alianza por los Objetivos', short:'Alianza', emoji:'🌐', col:'#19486A', cost:650, type:'shot',
    atk:'Suelta palomas buscadoras en todas direcciones.',
    info:'ODS 17 · Alianzas para lograr los objetivos. Juntos llegamos más lejos: suelta palomas de la paz y apoya a todas las torres.',
    base:{ range:160, rate:2.4, dmg:1, pierce:2, shots:6, fan:0, ring:true, homing:4, pspeed:300, kind:'normal', vis:'dove', aR:0 },
    paths:[
      { n:'Cooperación', u:[
        U('Más palomas',280,'+3 palomas',{shots:3}),
        U('Pacto',550,'Más rápido, +1 perforación',{rate:.8,pierce:1}),
        U('Coalición',1500,'+1 daño, +4 palomas',{dmg:1,shots:4}),
        U('Alianza global',5800,'+3 daño, ráfagas rápidas',{dmg:3,rate:.7,pierce:3}),
        U('Alianza total',21000,'Enjambre masivo · Hab: Vuelo de la paz',{dmg:5,shots:10,rate:.7,pierce:4,ability:AB('Vuelo de la paz',70,'nuke',45)}) ]},
      { n:'Cooperación internacional', u:[
        U('Mesa redonda',280,'Aliadas cercanas +alcance',{aR:420,aRng:10}),
        U('Convenios',550,'Aliadas +5% velocidad',{aRate:.95}),
        U('Fondo común',1500,'Aliadas +1 daño y detectan',{aDmg:1,aDet:true}),
        U('Agenda 2030',5800,'Aliadas +12% velocidad',{aRate:.88,aRng:10}),
        U('Todos juntos',21000,'Aliadas +20% vel. · Hab: Cumbre',{aRate:.8,aDmg:1,aRng:15,ability:AB('Cumbre mundial',70,'boost',.5,{t:10})}) ]},
      { n:'Financiación', u:[
        U('Donaciones',250,'+$80 por ronda',{rcash:80}),
        U('Cooperación Sur-Sur',520,'+$1 por baja, +$60/ronda',{cashPop:1,rcash:60}),
        U('Fondo verde',1400,'+$200 por ronda, detecta',{rcash:200,cashPop:1,detect:true}),
        U('Financiación global',5600,'+$600 por ronda, +3 vidas/ronda',{rcash:600,life:3}),
        U('Alianza financiera',20500,'+$2000/ronda · Hab: Fondo mundial',{rcash:2000,life:5,ability:AB('Fondo mundial',90,'cash',5000)}) ]}
    ]}
];

/* ---------- HÉROES ---------- */
const HEROES = [
  { id:'gaia', name:'Gaia', title:'Guardiana del Bosque', emoji:'🌿', col:'#43a047', cost:600, type:'shot',
    info:'Dispara semillas buscadoras. Sube de nivel con las rondas. Lvl 3: Raíces. Lvl 7: Renacer.',
    base:{ range:150, rate:.8, dmg:1, pierce:2, shots:2, fan:.25, pspeed:560, kind:'sharp', vis:'seed', homing:3 },
    lv:{ 2:{dmg:1}, 3:{ability:AB('Raíces',60,'stunAll',3)}, 4:{shots:1,range:15}, 5:{rate:.85}, 6:{dmg:1,pierce:1},
         7:{ability:AB('Renacer',90,'heal',30)}, 8:{shots:2,dmg:1}, 9:{rate:.8,range:20}, 10:{dmg:4,shots:2,ability:AB('Renacer',60,'heal',60)} } },
  { id:'nova', name:'Nova', title:'Inventora Verde', emoji:'⚡', col:'#fbc02d', cost:600, type:'chain',
    info:'Descarga rayos que saltan. Detecta camuflaje. Lvl 3: Pulso EMP. Lvl 7: Red global.',
    base:{ range:135, rate:1, dmg:1, chain:3, kind:'energy', detect:true, vis:'bolt' },
    lv:{ 2:{dmg:1}, 3:{ability:AB('Pulso EMP',60,'stunAll',3.5)}, 4:{chain:2}, 5:{range:15,rate:.85}, 6:{dmg:2},
         7:{ability:AB('Red global',80,'boost',.6,{t:8})}, 8:{chain:3,dmg:2}, 9:{rate:.8}, 10:{dmg:6,chain:4,ability:AB('Red global',60,'boost',.45,{t:12})} } },
  { id:'marea', name:'Marea', title:'Surfista de los Océanos', emoji:'🌊', col:'#039be5', cost:600, type:'spray',
    info:'Chorro de agua que empuja. Lvl 3: Tsunami. Lvl 7: Marea alta (congela).',
    base:{ range:110, rate:.12, dmg:.35, cone:.8, kind:'water', slowF:.75, slowT:.4, knock:1, vis:'drop' },
    lv:{ 2:{dmg:.15}, 3:{ability:AB('Tsunami',60,'push',450)}, 4:{range:15}, 5:{dmg:.2,slowF:.6}, 6:{cone:.2,dmg:.2},
         7:{ability:AB('Marea alta',90,'freezeAll',3)}, 8:{dmg:.4}, 9:{range:20}, 10:{dmg:1,ability:AB('Tsunami',45,'push',700)} } }
];
const HERO_LV_ROUNDS = [0, 2, 4, 7, 10, 14, 19, 25, 32, 40];

/* ---------- PODERES (un solo uso por partida) ---------- */
const POWERS = [
  { id:'cash',  n:'Ayuda humanitaria', emoji:'📦', d:'+$1500 al instante', count:2 },
  { id:'freeze',n:'Ola de frío',       emoji:'❄️', d:'Congela todo 4 s',  count:2 },
  { id:'clean', n:'Limpieza global',   emoji:'🧹', d:'Daño 40 a todos',    count:1 },
  { id:'life',  n:'Reforestación',     emoji:'🌱', d:'+40 vidas',          count:1 }
];

/* ---------- DIFICULTADES Y MODOS ---------- */
const DIFFS = [
  { id:'easy', n:'Fácil',   rounds:40,  lives:200, cost:.85, cash:750, d:'40 rondas · 200 vidas · torres -15%', col:'#66bb6a' },
  { id:'med',  n:'Medio',   rounds:60,  lives:150, cost:1,   cash:750, d:'60 rondas · 150 vidas', col:'#ffca28' },
  { id:'hard', n:'Difícil', rounds:80,  lives:100, cost:1.08,cash:750, d:'80 rondas · 100 vidas · torres +8%', col:'#ff7043' },
  { id:'chaos',n:'Caos',    rounds:100, lives:20,  cost:1.2, cash:750, d:'100 rondas · 20 vidas · torres +20%', col:'#ab47bc' }
];
const MODES = [
  { id:'std',  n:'Estándar', d:'La partida clásica.', emoji:'🎯' },
  { id:'rev',  n:'Reverso',  d:'Los enemigos recorren el camino al revés.', emoji:'🔄' },
  { id:'half', n:'Economía austera', d:'Mitad de dinero por bajas y rondas.', emoji:'🪙' },
  { id:'sand', n:'Sandbox',  d:'Dinero infinito y sin derrota. Para probar todo.', emoji:'🧪' }
];

/* ---------- MAPAS ---------- */
const MAPS = [
  { id:'campos', name:'Campos del Hambre Cero', ods:[2], theme:'farm', diff:'Fácil', seed:11, r:46,
    desc:'Un zigzag clásico entre campos de cultivo. Ideal para empezar.',
    paths:[[[-30,110],[800,110],[800,250],[160,250],[160,390],[800,390],[800,530],[160,530],[160,670]]] },
  { id:'lago', name:'Lago Cristalino', ods:[6], theme:'lake', diff:'Fácil', seed:23, r:50,
    desc:'Un espiral hacia el centro del lago. Los enemigos acaban en el corazón.',
    paths:[[[-30,70],[900,70],[900,570],[60,570],[60,180],[790,180],[790,460],[170,460],[170,290],[560,290]]] },
  { id:'solar', name:'Ciudad Solar', ods:[7,11], theme:'city', diff:'Fácil', seed:37, r:20,
    desc:'Escaleras de asfalto entre edificios con paneles solares.',
    paths:[[[-30,570],[230,570],[230,410],[490,410],[490,250],[750,250],[750,90],[990,90]]] },
  { id:'arrecife', name:'Arrecife Coralino', ods:[14], theme:'reef', diff:'Medio', seed:41, smooth:true,
    desc:'Un camino de arena que serpentea entre corales.',
    paths:[[[-30,330],[120,140],[300,510],[480,150],[660,510],[840,150],[990,330]]] },
  { id:'bosque', name:'Bosque Ancestral', ods:[15], theme:'forest', diff:'Medio', seed:53, r:60,
    desc:'El sendero se cruza consigo mismo: ¡una torre puede cubrir dos tramos!',
    paths:[[[-30,110],[640,110],[640,430],[200,430],[200,230],[760,230],[760,570],[990,570]]] },
  { id:'polo', name:'Polo Norte', ods:[13], theme:'arctic', diff:'Medio', seed:67, r:55,
    desc:'Largas olas de hielo. Perfecto para frenar con frío.',
    paths:[[[-30,560],[130,560],[130,90],[330,90],[330,520],[530,520],[530,90],[730,90],[730,520],[990,520]]] },
  { id:'escuela', name:'Escuela del Mundo', ods:[4], theme:'school', diff:'Medio', seed:79, r:34,
    desc:'Un camino diagonal en forma de S entre pupitres y libros.',
    paths:[[[-30,60],[300,60],[120,250],[500,250],[300,440],[690,440],[500,600],[990,600]]] },
  { id:'poligono', name:'Polígono Industrial', ods:[9,8], theme:'factory', diff:'Difícil', seed:83, r:30,
    desc:'Dos entradas que se unen en una cinta transportadora.',
    paths:[[[-30,100],[400,100],[400,320],[720,320],[720,560],[990,560]],
           [[-30,560],[230,560],[230,320],[400,320],[720,320],[720,560],[990,560]]] },
  { id:'desierto', name:'Desierto Esperanza', ods:[1,6], theme:'desert', diff:'Difícil', seed:97, smooth:true,
    desc:'Un sendero largo y retorcido entre dunas y un oasis.',
    paths:[[[-30,500],[200,570],[380,420],[250,260],[420,110],[620,170],[600,330],[780,430],[890,260],[770,100],[990,120]]] },
  { id:'paz', name:'Valle de la Paz', ods:[16], theme:'peace', diff:'Difícil', seed:101, r:30,
    desc:'Dos ejércitos de problemas llegan desde lados opuestos y se funden.',
    paths:[[[-30,110],[260,110],[480,320],[480,430],[220,430],[220,580],[990,580]],
           [[990,110],[700,110],[480,320],[480,430],[220,430],[220,580],[990,580]]] },
  { id:'mercado', name:'Mercado Justo', ods:[8,10,12], theme:'market', diff:'Difícil', seed:113, r:46,
    desc:'Un peine vertical entre puestos de comercio justo.',
    paths:[[[-30,80],[130,80],[130,560],[300,560],[300,80],[470,80],[470,560],[640,560],[640,80],[810,80],[810,560],[990,560]]] },
  { id:'cumbre', name:'Cumbre de Alianzas', ods:[17], theme:'summit', diff:'Experto', seed:127, r:30,
    desc:'Tres frentes convergen en la plaza central. Solo juntos se puede ganar.',
    paths:[[[-30,100],[250,100],[480,320],[480,190],[800,190],[800,70],[990,70]],
           [[-30,560],[250,560],[480,320],[480,190],[800,190],[800,70],[990,70]],
           [[990,330],[700,330],[480,320],[480,190],[800,190],[800,70],[990,70]]] }
];

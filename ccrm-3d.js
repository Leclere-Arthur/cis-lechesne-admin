/* CCRM CIS Le Chesne — modèle procédural léger, zones issues de Supabase. */
(function(){
'use strict';
let libPromise;
function chargerThree(){
 if(window.THREE)return Promise.resolve(window.THREE);
 if(!libPromise)libPromise=new Promise((ok,ko)=>{
  const urls=['https://cdnjs.cloudflare.com/ajax/libs/three.js/r149/three.min.js','https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js'];
  function essayer(i){
   if(i>=urls.length){ko(Error('Moteur 3D indisponible'));return;}
   const s=document.createElement('script');s.src=urls[i];
   s.onload=()=>window.THREE?ok(window.THREE):essayer(i+1);
   s.onerror=()=>essayer(i+1);document.head.appendChild(s);
  }
  essayer(0);
 });return libPromise;
}
 window.creerModeleCCRM3D=async function(host,zones,controles,ouvrir){
 const T=await chargerThree();if(!host.isConnected)return;
 if(host.__ccrmStop)host.__ccrmStop();host.innerHTML='';
 const scene=new T.Scene();scene.background=new T.Color('#e8eff5');
 const camera=new T.PerspectiveCamera(35,1,.1,100);camera.position.set(10,7,12);camera.lookAt(0,1.6,0);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(host.clientWidth||320,host.clientHeight||310);
 if(T.sRGBEncoding)renderer.outputEncoding=T.sRGBEncoding;host.appendChild(renderer.domElement);
 scene.add(new T.HemisphereLight(0xffffff,0x647587,2.4));
 const light=new T.DirectionalLight(0xffffff,2.3);light.position.set(5,10,7);scene.add(light);
 const root=new T.Group();scene.add(root);
 const mat=(c,metal=false)=>new T.MeshStandardMaterial({color:c,roughness:metal?.42:.74,metalness:metal?.26:0});
 const red=mat('#c91622',true),redDark=mat('#97121a'),glass=mat('#263b49',true),yellow=mat('#f2dc22',true),silver=mat('#b9c2c9',true),black=mat('#1d2227'),white=mat('#f5f5f0'),rubber=mat('#16191b'),wheelMetal=mat('#858b8e',true);
 function box(w,h,d,x,y,z,m,parent=root){const a=new T.Mesh(new T.BoxGeometry(w,h,d),m);a.position.set(x,y,z);parent.add(a);return a;}
 function cylinder(r,len,x,y,z,m,axis='z'){const a=new T.Mesh(new T.CylinderGeometry(r,r,len,24),m);a.rotation[axis==='z'?'x':'z']=Math.PI/2;a.position.set(x,y,z);root.add(a);return a;}
 function stripe(w,h,d,x,y,z,angle,m){const q=box(w,h,d,x,y,z,m);q.rotation.z=angle;return q;}
 // X longitudinal: avant +X, gauche du véhicule -Z.
 box(7.3,.24,2.6,-.05,.78,0,black); // châssis
 box(4.05,2.23,2.57,-1.45,2.07,0,red); // cellule arrière
 box(2.7,2.04,2.48,2.02,2.07,0,red); // cabine quatre portes
 box(.72,.85,2.5,3.12,1.35,0,red); // face et capot court
 box(4.2,.16,2.67,-1.45,3.26,0,redDark);
 box(2.75,.14,2.55,2.02,3.16,0,red);
 // Face avant Renault: pare-brise, calandre et pare-chocs jaune haute visibilité.
 box(.075,1.05,2.25,3.43,2.44,0,glass);
 box(.10,.62,1.55,3.51,1.49,0,black);
 for(const z of [-.54,0,.54])box(.12,.08,.35,3.58,1.56,z,silver);
 box(.36,.47,2.65,3.48,.97,0,yellow);
 box(.13,.21,1.18,3.69,1.12,0,black);
 for(const z of [-1.03,1.03]){
  box(.10,.25,.48,3.68,1.12,z,silver);
  box(.11,.12,.29,3.75,1.02,z,white);
 }
 // Pare-brise dégagé : pas de chevrons jaunes devant la vitre.
 // Portes avant/arrière, vitres, poignées, rétroviseurs et marchepieds.
 for(const side of [-1,1]){
  const z=side*1.256;
  box(1.00,.75,.026,2.67,2.55,z,glass);
  box(.94,.72,.026,1.40,2.55,z,glass);
  box(.055,1.9,.045,2.06,2.03,z,redDark);
  box(.06,1.85,.045,.88,2.03,z,redDark);
  for(const x of [1.45,2.72])box(.19,.045,.055,x,1.94,side*1.29,black);
  box(.44,.66,.19,3.12,2.55,side*1.48,black);
  box(.08,.11,.4,3.02,2.49,side*1.34,black);
  // Marquage jaune de la cabine et ligne de caisse.
  box(2.60,.065,.018,1.98,1.43,side*1.286,yellow);
  box(4.1,.075,.028,-1.45,1.32,side*1.322,yellow);
  // Caisson haut portant l'inscription et bandeau jaune.
  box(4.13,.39,.10,-1.45,3.30,side*1.31,yellow);
  box(4.1,.09,.12,-1.45,3.05,side*1.34,redDark);
  // Deux rideaux jaunes séparés de chaque côté.
  for(const [x,w] of [[-2.28,1.88],[-.40,1.62]]){
   box(w,1.40,.11,x,2.28,side*1.34,yellow);
   for(let k=0;k<12;k++)box(w,.012,.119,x,1.62+k*.115,side*1.407,mat('#d0b81e'));
   box(w+.06,.075,.13,x,1.56,side*1.42,black);
   box(w+.09,.065,.12,x,3.03,side*1.42,redDark);
  }
  // Petits coffres bas et damier rouge/jaune.
  box(4.0,.57,.10,-1.45,1.13,side*1.34,red);
  for(let row=0;row<2;row++)for(let k=0;k<14;k++)if((row+k)%2===0){
   box(.285,.25,.014,-3.31+k*.286,.995+row*.26,side*1.402,yellow);
  }
  // Séparations de coffres bas et leurs fermetures.
  for(const x of [-2.50,-.48]){
   box(.035,.51,.13,x,1.11,side*1.415,redDark);
   box(.18,.09,.13,x+.38,1.22,side*1.425,silver);
  }
  // Roues tout-terrain avec jantes et moyeux.
  for(const x of [-2.47,2.17]){
   cylinder(.66,.29,x,.70,side*1.28,rubber);
   cylinder(.43,.305,x,.70,side*1.30,wheelMetal);
   cylinder(.25,.315,x,.70,side*1.31,black);
   for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    cylinder(.046,.32,x+Math.cos(angle)*.32,.70+Math.sin(angle)*.32,side*1.31,silver);
   }
   box(.85,.09,.25,x,1.31,side*1.31,black);
  }
 }
 // Toit, gyrophare, coffret supérieur et échelle métallique sur le toit.
 for(const z of [-.77,.77]){
  const beacon=new T.Mesh(new T.CylinderGeometry(.15,.17,.20,12),mat('#1554a3',true));beacon.position.set(2.58,3.36,z);root.add(beacon);
 }
 box(.96,.42,.8,-2.40,3.58,.43,silver);
 for(const z of [-.48,.48])box(4.15,.09,.09,-.86,3.62,z,silver);
 for(let x=-2.75;x<1.0;x+=.36)box(.075,.09,1.04,x,3.63,0,silver);
 // Accès par échelle jaune latérale (zone cliquable gérée plus bas).
 for(const z of [1.40,1.67])box(.10,1.66,.075,-3.02,2.35,z,yellow);
 for(let y=1.60;y<3.1;y+=.29)box(.10,.065,.34,-3.02,y,1.54,yellow);
 // Arrière: bandes chevrons, plateforme pompe et deux dévidoirs.
 box(.11,2.0,2.6,-3.55,2.12,0,red);
 for(let i=0;i<7;i++){
  const z=-1.2+i*.4;
  const q=box(.026,.22,.43,-3.62,2.68,z,yellow);q.rotation.x=.48;
 }
 box(.32,.82,1.15,-3.73,1.35,0,black);
 for(const z of [-.73,.73]){
  const reel=new T.Mesh(new T.TorusGeometry(.51,.11,10,30),yellow);reel.rotation.y=Math.PI/2;reel.position.set(-3.97,1.89,z);root.add(reel);
  const disc=new T.Mesh(new T.CylinderGeometry(.43,.43,.11,24),red);disc.rotation.z=Math.PI/2;disc.position.set(-4.00,1.89,z);root.add(disc);
  for(let i=0;i<3;i++)box(.03,.09,.55,-4.07,1.66+i*.20,z,yellow);
  box(.2,.12,.15,-4.09,1.89,z,silver);
 }
 box(.16,.15,2.4,-3.75,.91,0,silver);
 const anciensElements=root.children.slice(); // géométrie de secours conservée si le GLB ne charge pas
 const clickable=[];
 const sides={gauche:[],droite:[],bas:[],arriere:[],toit:[],echelle:[],cabine:[],autre:[]};
 for(const zone of zones){
  const s=(zone.nom+' '+(zone.cote||'')).toLocaleLowerCase('fr');
  const roof=/toit|sup[eé]rieur|pavillon/.test(s);
  const ladder=/[eé]chelle|acc[eè]s/.test(s);
  const low=/bas|inf[eé]rieur|soute|marche/.test(s);
  const rear=/arri[eè]re|hayon/.test(s);
  const right=/droit|conducteur/.test(s);
  const left=/gauch|passager/.test(s);
  const cabin=/cabine|vitre|pare.brise|habitacle/.test(s);
  const key=cabin?'cabine':roof?'toit':ladder?'echelle':rear?'arriere':low?'bas':right?'droite':left?'gauche':(sides.gauche.length<=sides.droite.length?'gauche':'droite');
  sides[key].push(zone);
 }
 // Surfaces de contrôle placées DEVANT les rideaux jaunes, et non à l'intérieur.
 // Un matériau légèrement transparent laisse les détails du véhicule visibles.
 function clickableBox(zone,w,h,d,x,y,z){
  const done=Object.prototype.hasOwnProperty.call(controles,zone.id);
  const m=mat(done?'#126039':'#124a96',true);m.transparent=true;m.opacity=.79;m.depthWrite=false;
  const mesh=box(w,h,d,x,y,z,m);
  mesh.userData.zone=zone;clickable.push(mesh);
  const edge=new T.LineSegments(new T.EdgesGeometry(mesh.geometry),new T.LineBasicMaterial({color:done?0x063f25:0x082e69,depthTest:false}));
  edge.position.copy(mesh.position);edge.renderOrder=3;root.add(edge);
  mesh.renderOrder=2;
 }
 // Chaque rideau correspond à une zone lorsqu'elle existe dans Supabase.
 function sideZones(arr,side){
  arr.forEach((zone,i)=>{
   const x=arr.length===2?[-2.28,-.40][i]:-3.13+(i+.5)*3.38/arr.length;
   const width=arr.length===2?[1.82,1.56][i]:Math.min(1.8,3.38/arr.length-.06);
   clickableBox(zone,width,1.36,.035,x,2.29,side*1.495);
  });
 }
 sideZones(sides.gauche,-1);sideZones(sides.droite,1);
 sides.bas.forEach((z,i)=>clickableBox(z,Math.min(1.5,3.6/sides.bas.length-.05),.47,.035,-3.25+(i+.5)*3.6/sides.bas.length,1.12,(i%2?1:-1)*1.49));
 sides.echelle.forEach((z,i)=>clickableBox(z,.65,1.5,.045,-3.03+i*.65,2.31,1.80));
 // La pompe est accessible depuis l'arrière, même avec les dévidoirs.
 sides.arriere.forEach((z,i)=>clickableBox(z,.045,.94,Math.min(1.05,2.2/sides.arriere.length-.05),-4.23,1.50,-1.1+(i+.5)*2.2/sides.arriere.length));
 sides.toit.forEach((z,i)=>clickableBox(z,Math.min(1.2,2.5/sides.toit.length-.07),.08,1.05,-2.6+(i+.5)*2.5/sides.toit.length,3.89,.4));
 // Vitres latérales et pare-brise = zone cabine si elle existe.
 sides.cabine.forEach((z,i)=>{
  if(i===0){
   clickableBox(z,.035,.98,2.17,3.58,2.46,0);
   // surfaces secondaires cliquables reliées à la même zone
   for(const side of [-1,1])for(const x of [1.40,2.67])clickableBox(z,.89,.70,.032,x,2.55,side*1.318);
  }else clickableBox(z,.035,.85,1.8,3.60,2.46,0);
 });
 sides.autre.forEach((z,i)=>clickableBox(z,.75,.63,.04,-2.65+i*.78,1.85,-1.53));
 const ground=box(9,.06,5,0,.07,0,mat('#d6dee4'));
 let dragging=false,moved=false,lastX=0,lastY=0,az=.35,elev=.42,dist=13;
 function position(){camera.position.set(Math.cos(az)*Math.cos(elev)*dist,1.7+Math.sin(elev)*dist,Math.sin(az)*Math.cos(elev)*dist);camera.lookAt(0,1.65,0);}
 position();const ray=new T.Raycaster(),pointer=new T.Vector2();
 function down(e){dragging=true;moved=false;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);}
 function move(e){if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>3)moved=true;az+=dx*.012;elev=Math.max(.08,Math.min(1.25,elev+dy*.007));lastX=e.clientX;lastY=e.clientY;position();render();}
 function up(e){if(!dragging)return;dragging=false;if(moved)return;const r=renderer.domElement.getBoundingClientRect();pointer.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(clickable)[0];if(hit?.object.userData.zone)ouvrir(hit.object.userData.zone.id);}
 function wheel(e){e.preventDefault();dist=Math.max(7,Math.min(21,dist+Math.sign(e.deltaY)*.9));position();render();}
 let pinch=0;
 function touch(e){if(e.touches.length===2){e.preventDefault();const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinch)dist=Math.max(7,Math.min(21,dist*pinch/d));pinch=d;position();render();}else pinch=0;}
 const el=renderer.domElement;el.style.touchAction='pan-y';el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',()=>dragging=false);el.addEventListener('wheel',wheel,{passive:false});el.addEventListener('touchmove',touch,{passive:false});el.addEventListener('touchend',()=>pinch=0);
 const resize=new ResizeObserver(()=>{if(!host.isConnected)return;const w=host.clientWidth||320,h=host.clientHeight||310;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);render();});resize.observe(host);
 function render(){renderer.render(scene,camera);}render();
 // Modèle GLB externe : remplace seulement la carrosserie, jamais les zones tactiles.
 // Si le fichier ou le chargeur manque, le modèle de secours reste visible.
 let modeleCharge=null,actif=true;
 (async()=>{
  try{
   if(!T.GLTFLoader){
    await new Promise((resolve,reject)=>{
     const s=document.createElement('script');
     s.src='https://cdn.jsdelivr.net/npm/three@0.149.0/examples/js/loaders/GLTFLoader.js';
     s.onload=()=>T.GLTFLoader?resolve():reject(Error('Chargeur GLB indisponible'));
     s.onerror=()=>reject(Error('Chargeur GLB inaccessible'));
     document.head.appendChild(s);
    });
   }
   const gltf=await new Promise((resolve,reject)=>{
    new T.GLTFLoader().load('./ccrm-le-chesne.glb',resolve,undefined,reject);
   });
   if(!actif||!host.isConnected)return;
   modeleCharge=gltf.scene;
   scene.add(modeleCharge);
   anciensElements.forEach(element=>{element.visible=false;});
   render();
  }catch(erreur){console.warn('CCRM : modèle GLB non chargé, affichage de secours conservé',erreur);}
 })();
 host.__ccrmStop=()=>{actif=false;resize.disconnect();renderer.dispose();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});};
};
})();

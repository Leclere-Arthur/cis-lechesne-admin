/* CIS Le Chesne — Gestion des véhicules (module isolé) */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={vehicles:[],zones:[],items:[],vehicle:null,zone:null};
const error=e=>{console.error('Gestion véhicules',e);alert(e?.message||'Opération impossible. Vérifie que le SQL Supabase a été installé.');};
const check=(r)=>{if(r.error)throw r.error;return r.data||[]};
const safeId=id=>String(id||'').replace(/[^a-f0-9-]/gi,'');
function status(t){el('veh-status').textContent=t;}
async function load(){
 try{
  state.vehicles=check(await sb.from('cis_vehicules').select('*').order('nom'));
  renderVehicles();
  if(state.vehicle && !state.vehicles.some(v=>v.id===state.vehicle))state.vehicle=null;
  if(!state.vehicle && state.vehicles.length)state.vehicle=state.vehicles[0].id;
  await loadZones();status(state.vehicles.length+' véhicule(s) configuré(s).');
 }catch(e){status('Tables indisponibles : exécute d’abord le fichier SQL fourni dans Supabase.');error(e)}
}
function renderVehicles(){
 el('veh-list').innerHTML=state.vehicles.map(v=>`<button class="retro" style="margin:3px;${v.id===state.vehicle?'font-weight:bold;':''}" onclick="vehSelect('${v.id}')">${esc(v.nom)}${v.code?' ('+esc(v.code)+')':''}</button>`).join('')||'<p>Aucun véhicule.</p>';
 el('veh-editor').style.display=state.vehicle?'block':'none';
 const v=state.vehicles.find(x=>x.id===state.vehicle);
 if(v){el('veh-name').value=v.nom;el('veh-code').value=v.code||'';el('veh-active').checked=v.actif!==false;}
}
async function select(id){state.vehicle=safeId(id);state.zone=null;renderVehicles();await loadZones();}
async function loadZones(){
 state.zones=[];state.items=[];
 if(state.vehicle)state.zones=check(await sb.from('cis_vehicule_zones').select('*').eq('vehicule_id',state.vehicle).order('ordre').order('nom'));
 if(state.zone&&!state.zones.some(z=>z.id===state.zone))state.zone=null;
 renderZones();await loadItems();
}
function renderZones(){
 el('veh-zones').innerHTML=state.zones.map(z=>`<button class="retro" style="margin:3px;${z.id===state.zone?'font-weight:bold;':''}" onclick="vehZoneSelect('${z.id}')">${esc(z.nom)} ${z.actif===false?'(masquée)':''}</button>`).join('')||'<p>Aucune zone. Ajoute les coffres et l’accès derrière l’échelle.</p>';
 const z=state.zones.find(x=>x.id===state.zone);
 el('veh-zone-editor').style.display=z?'block':'none';
 if(z){el('veh-zone-name').value=z.nom;el('veh-zone-side').value=z.cote;el('veh-zone-order').value=z.ordre;el('veh-zone-active').checked=z.actif!==false;}
}
async function zoneSelect(id){state.zone=safeId(id);renderZones();await loadItems();}
async function loadItems(){
 state.items=[];
 if(state.zone)state.items=check(await sb.from('cis_vehicule_materiels').select('*').eq('zone_id',state.zone).order('ordre').order('nom'));
 el('veh-items-wrap').style.display=state.zone?'block':'none';
 el('veh-items').innerHTML=state.items.map(m=>`<div class="card" style="margin:8px 0"><div class="gridform"><label>Matériel</label><input class="retro" id="vm-name-${m.id}" value="${esc(m.nom)}"><label>Quantité attendue</label><input class="retro" type="number" min="1" id="vm-qty-${m.id}" value="${m.quantite}"><label>Ordre</label><input class="retro" type="number" id="vm-order-${m.id}" value="${m.ordre}"><label>État de référence</label><select class="retro" id="vm-condition-${m.id}"><option value="bon" ${m.etat_reference==='bon'?'selected':''}>Bon</option><option value="a_surveiller" ${m.etat_reference==='a_surveiller'?'selected':''}>À surveiller</option><option value="hs" ${m.etat_reference==='hs'?'selected':''}>HS</option></select><label>Notes</label><input class="retro" id="vm-notes-${m.id}" value="${esc(m.notes||'')}"></div><p><button class="retro" onclick="vehItemSave('${m.id}')">Enregistrer</button> <button class="retro danger" onclick="vehItemDelete('${m.id}')">Supprimer</button></p></div>`).join('')||'<p>Pas encore de matériel dans cette zone.</p>';
}
async function createVehicle(){const nom=el('veh-new-name').value.trim(),code=el('veh-new-code').value.trim();if(!nom)return alert('Indique un nom.');try{const d=check(await sb.from('cis_vehicules').insert({nom,code}).select());el('veh-new-name').value='';el('veh-new-code').value='';state.vehicle=d[0].id;state.zone=null;await load()}catch(e){error(e)}}
async function saveVehicle(){const v=state.vehicle;if(!v)return;try{check(await sb.from('cis_vehicules').update({nom:el('veh-name').value.trim(),code:el('veh-code').value.trim(),actif:el('veh-active').checked}).eq('id',v).select());await load()}catch(e){error(e)}}
async function createZone(){if(!state.vehicle)return alert('Choisis un véhicule.');const nom=el('veh-new-zone').value.trim();if(!nom)return alert('Indique le nom du coffre.');try{const d=check(await sb.from('cis_vehicule_zones').insert({vehicule_id:state.vehicle,nom,cote:el('veh-new-side').value,ordre:state.zones.length}).select());el('veh-new-zone').value='';state.zone=d[0].id;await loadZones()}catch(e){error(e)}}
async function saveZone(){if(!state.zone)return;try{check(await sb.from('cis_vehicule_zones').update({nom:el('veh-zone-name').value.trim(),cote:el('veh-zone-side').value,ordre:Number(el('veh-zone-order').value)||0,actif:el('veh-zone-active').checked}).eq('id',state.zone).select());await loadZones()}catch(e){error(e)}}
async function createItem(){if(!state.zone)return;const nom=el('veh-new-item').value.trim();if(!nom)return alert('Indique le matériel.');try{check(await sb.from('cis_vehicule_materiels').insert({zone_id:state.zone,nom,quantite:Math.max(1,Number(el('veh-new-qty').value)||1),ordre:state.items.length}).select());el('veh-new-item').value='';el('veh-new-qty').value='1';await loadItems()}catch(e){error(e)}}
async function saveItem(id){id=safeId(id);try{check(await sb.from('cis_vehicule_materiels').update({nom:el('vm-name-'+id).value.trim(),quantite:Math.max(1,Number(el('vm-qty-'+id).value)||1),ordre:Number(el('vm-order-'+id).value)||0,etat_reference:el('vm-condition-'+id).value,notes:el('vm-notes-'+id).value.trim()}).eq('id',id).select());await loadItems()}catch(e){error(e)}}
async function deleteItem(id){if(!confirm('Supprimer ce matériel de la configuration ? Les historiques passés resteront conservés.'))return;try{check(await sb.from('cis_vehicule_materiels').delete().eq('id',safeId(id)).select());await loadItems()}catch(e){error(e)}}
// Historique immuable : numéro permanent, identité et PDF couleur.
let vehHistoryRecords=[];
const vehNum=r=>r.numero_inventaire!=null?'INV-'+String(r.numero_inventaire).padStart(6,'0'):'ID '+String(r.id||'').slice(0,8).toUpperCase();
const vehDate=d=>{const x=new Date(d);return Number.isNaN(x.getTime())?'Date inconnue':x.toLocaleString('fr-FR');};
const vehPerson=r=>r.controleur_nom||'Identité indisponible (ID : '+String(r.controle_par||'inconnu').slice(0,8)+')';
async function vehHistoryLoad(){
 const st=el('veh-history-status'),list=el('veh-history-list');
 st.textContent='Chargement de l’historique…';list.innerHTML='';
 try{
  let res=await sb.from('cis_inventaires_vehicules').select('id,numero_inventaire,vehicule_nom,controle_par,created_at,details').order('created_at',{ascending:false}).limit(200);
  if(res.error && /numero_inventaire/i.test(res.error.message||'')){
   res=await sb.from('cis_inventaires_vehicules').select('id,vehicule_nom,controle_par,created_at,details').order('created_at',{ascending:false}).limit(200);
   if(!res.error)st.textContent='Installe le SQL v40 pour activer les numéros permanents.';
  }
  if(res.error)throw res.error;
  vehHistoryRecords=res.data||[];
  const ids=[...new Set(vehHistoryRecords.map(r=>r.controle_par).filter(Boolean))];
  if(ids.length){
   // La fonction SQL n'expose que les noms des auteurs d'inventaires à un administrateur autorisé.
   const names=await sb.rpc('cis_veh_inventaire_auteurs');
   if(!names.error && Array.isArray(names.data)){
    const byId=new Map(names.data.map(u=>[String(u.id),[u.prenom,u.nom].filter(Boolean).join(' ').trim()]));
    vehHistoryRecords.forEach(r=>{r.controleur_nom=byId.get(String(r.controle_par))||'';});
   }
  }
  st.textContent=vehHistoryRecords.length+' inventaire(s) visible(s) — 200 plus récents maximum.'+(vehHistoryRecords.some(r=>r.numero_inventaire==null)?' Installe le SQL v40 pour activer les numéros permanents.':'');
  list.innerHTML=vehHistoryRecords.map((r,i)=>{
   const zones=Array.isArray(r.details)?r.details:[];
   const items=zones.flatMap(z=>Array.isArray(z.materiels)?z.materiels:[]);
   const ok=items.filter(m=>m.etat==='bon').length,watch=items.filter(m=>m.etat==='a_surveiller').length,hs=items.filter(m=>m.etat==='hs').length;
   return `<div class="card" style="margin:10px 0;padding:16px"><strong>${esc(vehNum(r))} · ${esc(r.vehicule_nom)}</strong><p>${esc(vehDate(r.created_at))}<br>Enregistré par : <strong>${esc(vehPerson(r))}</strong><br>${zones.length} coffre(s) / zone(s)</p><p><span style="color:#187a3a;font-weight:bold">● ${ok} Bon</span> &nbsp; <span style="color:#a17b00;font-weight:bold">● ${watch} À surveiller</span> &nbsp; <span style="color:#bf2525;font-weight:bold">● ${hs} HS</span></p><button class="retro" onclick="vehHistoryPDF(${i})">Télécharger le PDF</button></div>`;
  }).join('')||'<p>Aucun inventaire enregistré pour le moment.</p>';
 }catch(e){st.textContent='Historique indisponible : '+(e?.message||'Erreur de lecture');console.error('Historique véhicules',e)}
}
function vehHistoryPDF(i){
 const r=vehHistoryRecords[i];if(!r)return;
 const PDF=window.jspdf?.jsPDF;if(!PDF)return alert('Le générateur PDF est indisponible. Recharge la page.');
 const doc=new PDF({unit:'mm',format:'a4'});
 const W=210,H=297,margin=14;let y=0,page=0;
 const palette={bon:[28,134,75],a_surveiller:[189,140,20],hs:[190,43,43],autre:[111,119,130]};
 const label={bon:'BON',a_surveiller:'À SURVEILLER',hs:'HS'};
 const clean=v=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim();
 const text=(value,x,yy,size=10,bold=false,color=[35,45,58])=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);doc.text(clean(value),x,yy);};
 const footer=()=>{doc.setDrawColor(221,226,232);doc.line(margin,282,W-margin,282);text('CIS LE CHESNE  |  DOCUMENT DE TRAÇABILITÉ',margin,288,7,false,[110,119,130]);text('Page '+page,W-margin,288,7,false,[110,119,130]);};
 const newPage=()=>{if(page){footer();doc.addPage();}page++;y=19;text('CIS LE CHESNE',margin,y,11,true,[29,52,72]);text(vehNum(r),W-margin,y,9,true,[29,52,72]);doc.setDrawColor(220,226,232);doc.line(margin,24,W-margin,24);y=31;};
 const ensure=h=>{if(y+h>276)newPage();};
 const wrapped=(value,x,width,size=9,color=[47,56,67],bold=false)=>{
  doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);
  const lines=doc.splitTextToSize(clean(value),width);
  const lineHeight=size*.48+1.3;ensure(lines.length*lineHeight+2);
  doc.setTextColor(...color);lines.forEach(t=>{doc.text(t,x,y);y+=lineHeight;});
 };
 const items=(Array.isArray(r.details)?r.details:[]).flatMap(z=>Array.isArray(z.materiels)?z.materiels:[]);
 const counts={bon:items.filter(m=>m.etat==='bon').length,a_surveiller:items.filter(m=>m.etat==='a_surveiller').length,hs:items.filter(m=>m.etat==='hs').length};
 // jsPDF démarre avec une page vide : on la remplace par une page maîtrisée.
 newPage();
 text('RAPPORT D’INVENTAIRE VÉHICULE',margin,y,16,true,[25,49,72]);y+=9;
 doc.setFillColor(242,246,249);doc.roundedRect(margin,y,W-2*margin,31,2,2,'F');
 text('VÉHICULE',margin+5,y+7,7,true,[102,113,125]);text(r.vehicule_nom,margin+5,y+14,12,true);
 text('N° '+vehNum(r),W-margin-5,y+8,10,true,[25,49,72]);
 text('Date : '+vehDate(r.created_at),margin+5,y+22,9);
 y+=38;
 wrapped('Contrôle réalisé par : '+vehPerson(r),margin,W-2*margin,10,[34,47,62],true);y+=4;
 const cardW=(W-2*margin-8)/3;
 [['bon','BON'],['a_surveiller','À SURVEILLER'],['hs','HS']].forEach(([key,t],idx)=>{
  const x=margin+idx*(cardW+4),c=palette[key];doc.setFillColor(...c);doc.roundedRect(x,y,cardW,19,2,2,'F');
  text(String(counts[key]),x+5,y+9,14,true,[255,255,255]);text(t,x+5,y+15,7,true,[255,255,255]);
 });y+=27;
 for(const z of (Array.isArray(r.details)?r.details:[])){
  ensure(18);doc.setFillColor(36,61,83);doc.roundedRect(margin,y,W-2*margin,11,1.5,1.5,'F');
  text((z.zone_nom||'Zone').toUpperCase(),margin+4,y+7.2,10,true,[255,255,255]);y+=17;
  const zoneItems=Array.isArray(z.materiels)?z.materiels:[];
  if(!zoneItems.length){wrapped('Aucun matériel enregistré',margin+3,W-2*margin-6,9);y+=3;}
  for(const m of zoneItems){
   const key=palette[m.etat]?m.etat:'autre',c=palette[key];
   doc.setFont('helvetica','normal');doc.setFontSize(9);
   const name=clean(m.nom||'Matériel')+'  × '+(m.quantite||1);
   const nameLines=doc.splitTextToSize(name,119);
   const obs=m.observation?doc.splitTextToSize('Observation : '+clean(m.observation),W-2*margin-12):[];
   const height=Math.max(12,6+nameLines.length*4.8+obs.length*4.6);
   ensure(height+3);
   doc.setFillColor(247,249,251);doc.roundedRect(margin,y,W-2*margin,height,1.5,1.5,'F');
   doc.setFillColor(...c);doc.roundedRect(margin+2,y+2,2.5,height-4,1,1,'F');
   doc.setTextColor(42,53,65);doc.setFontSize(9);doc.setFont('helvetica','bold');doc.text(nameLines,margin+8,y+7);
   const badge=label[key]||'NON RENSEIGNÉ';doc.setFontSize(8);doc.setTextColor(...c);doc.text(badge,W-margin-5,y+7,{align:'right'});
   if(obs.length){doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(88,97,107);doc.text(obs,margin+8,y+8+nameLines.length*4.8);}
   y+=height+3;
  }
  y+=5;
 }
 ensure(13);y+=2;wrapped('Référence permanente : '+r.id,margin,W-2*margin,7,[107,117,128]);
 footer();
 const filename='inventaire-'+String(r.numero_inventaire??r.id).replace(/[^a-z0-9-]/gi,'-')+'-'+String(r.vehicule_nom||'vehicule').replace(/[^a-z0-9-]/gi,'-')+'.pdf';
 doc.save(filename);
}
window.vehHistoryLoad=vehHistoryLoad;
window.vehHistoryPDF=vehHistoryPDF;

Object.assign(window,{vehLoad:load,vehSelect:select,vehZoneSelect:zoneSelect,vehCreate:createVehicle,vehSave:saveVehicle,vehZoneCreate:createZone,vehZoneSave:saveZone,vehItemCreate:createItem,vehItemSave:saveItem,vehItemDelete:deleteItem});
})();

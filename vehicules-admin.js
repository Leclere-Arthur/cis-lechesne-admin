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
// Historique immuable des inventaires véhicules, accessible depuis l'application Admin.
let vehHistoryRecords=[];
async function vehHistoryLoad(){
 const st=el('veh-history-status'),list=el('veh-history-list');
 st.textContent='Chargement de l’historique…';list.innerHTML='';
 try{
  const r=await sb.from('cis_inventaires_vehicules').select('id,vehicule_nom,controle_par,created_at,details').order('created_at',{ascending:false}).limit(200);
  if(r.error)throw r.error;
  vehHistoryRecords=r.data||[];
  st.textContent=vehHistoryRecords.length+' inventaire(s) visible(s) — 200 plus récents maximum.'+(vehHistoryRecords.length===0?' Si tu as déjà finalisé des inventaires, vérifie les droits de lecture du compte Admin dans Supabase (RLS).':'');
  list.innerHTML=vehHistoryRecords.map((r,i)=>{
   const zones=Array.isArray(r.details)?r.details:[];
   const anomalies=zones.flatMap(z=>Array.isArray(z.materiels)?z.materiels:[]).filter(m=>m.etat==='hs'||m.etat==='a_surveiller').length;
   return `<div class="card" style="margin:10px 0;padding:12px"><strong>${esc(r.vehicule_nom)}</strong><p>${esc(new Date(r.created_at).toLocaleString('fr-FR'))} · ${zones.length} zone(s) · ${anomalies} anomalie(s)</p><button class="retro" onclick="vehHistoryPDF(${i})">Télécharger le PDF</button></div>`;
  }).join('')||'<p>Aucun inventaire enregistré pour le moment.</p>';
 }catch(e){st.textContent='Historique indisponible : '+(e?.message||'Erreur de lecture')+' — Vérifie les autorisations Supabase du compte Admin.';console.error('Historique véhicules',e)}
}
function vehHistoryPDF(i){
 const r=vehHistoryRecords[i];if(!r)return;
 const PDF=window.jspdf?.jsPDF;if(!PDF)return alert('Le générateur PDF est indisponible. Recharge la page.');
 const doc=new PDF({unit:'mm',format:'a4'});let y=18,page=1;
 const line=(txt,sz=10,bold=false)=>{
  doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(sz);
  const lines=doc.splitTextToSize(String(txt),185);
  for(const l of lines){if(y>278){doc.addPage();page++;y=18;}doc.text(l,13,y);y+=sz*.48+1.7;}
 };
 line('CIS Le Chesne - Inventaire véhicule',16,true);y+=4;
 line('Véhicule : '+r.vehicule_nom,12,true);
 line('Date : '+new Date(r.created_at).toLocaleString('fr-FR'));
 line('Identifiant du contrôle : '+r.id,8);
 line('Utilisateur (identifiant) : '+(r.controle_par||'Non renseigné'),8);y+=5;
 for(const z of (Array.isArray(r.details)?r.details:[])){
  line('ZONE : '+(z.zone_nom||'Zone'),12,true);
  const items=Array.isArray(z.materiels)?z.materiels:[];
  if(!items.length)line('Aucun matériel configuré',9);
  for(const m of items){
   const etat=m.etat==='bon'?'BON':m.etat==='hs'?'HS':m.etat==='a_surveiller'?'A SURVEILLER':'NON RENSEIGNE';
   line('• '+(m.nom||'Matériel')+' (x'+(m.quantite||1)+') : '+etat,9);
   if(m.observation)line('   Observation : '+m.observation,9);
  }
  y+=5;
 }
 const filename='inventaire-'+String(r.vehicule_nom||'vehicule').replace(/[^a-z0-9-]/gi,'-')+'-'+String(r.created_at).slice(0,10)+'.pdf';
 doc.save(filename);
}
window.vehHistoryLoad=vehHistoryLoad;
window.vehHistoryPDF=vehHistoryPDF;

Object.assign(window,{vehLoad:load,vehSelect:select,vehZoneSelect:zoneSelect,vehCreate:createVehicle,vehSave:saveVehicle,vehZoneCreate:createZone,vehZoneSave:saveZone,vehItemCreate:createItem,vehItemSave:saveItem,vehItemDelete:deleteItem});
})();

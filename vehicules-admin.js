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
Object.assign(window,{vehLoad:load,vehSelect:select,vehZoneSelect:zoneSelect,vehCreate:createVehicle,vehSave:saveVehicle,vehZoneCreate:createZone,vehZoneSave:saveZone,vehItemCreate:createItem,vehItemSave:saveItem,vehItemDelete:deleteItem});
})();

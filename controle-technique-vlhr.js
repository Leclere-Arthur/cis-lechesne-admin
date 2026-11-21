/* Annexe 21 : modèle officiel inchangé, saisie exclusivement sur la colonne droite. */
window.CISControleVLHR={
 points:[['radio','Contrôle de la radio'],['tons','Contrôle du 2 Tons'],['gyro','Contrôle Gyrophare et Feux de pénétration'],['joint','Joint de porte et visualisation poignée'],['vitres','Fermeture complète des vitres et état du pare-brise'],['toit','Présence numéro de toit'],['extincteur','Présence Extincteur'],['masques','Masques de fuite (2)'],['pression','Pression des pneumatiques'],['roues','État des Roues']],
 estControle(r){return r?.type==='controle_technique_vlhr'||(Array.isArray(r?.details)&&r.details.some(x=>x.type==='controle_technique_vlhr'));},
 donnees(r){return r?.type==='controle_technique_vlhr'?r:r?.details?.find(x=>x.type==='controle_technique_vlhr');},
 async pdf(r){
  const PDF=await this.chargerPDF();
  const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Modèle officiel indisponible.'));img.src='./controle-technique-vlhr-modele.png';});
  const doc=new PDF({orientation:'landscape',unit:'mm',format:'a4'}),d=this.donnees(r),w=297,h=210;
  doc.addImage(image,'PNG',0,0,w,h);
  const val=v=>String(v||'').replace(/[\r\n]+/g,' ').trim();
  const write=(s,x,y,max=25,size=7)=>{doc.setFont('helvetica','normal');doc.setFontSize(size);doc.setTextColor(0,0,0);doc.text(doc.splitTextToSize(val(s),max).slice(0,2),x,y);};
  // Coordonnées mesurées sur l'Annexe 21 A4 paysage (colonne droite uniquement).
  write(d.date?new Date(d.date+'T12:00:00').toLocaleDateString('fr-FR'):'',263,32,24,8);
  write(d.sis||'',263,42,24,8);write(d.immatriculation||'',263,52,24,8);
  const rows=[65.9,70.1,75.5,82.3,89.3,94.8,98.8,116.4,169.1,174.8];
  this.points.forEach(([key],i)=>{const a=d.reponses?.[key];if(!a)return;doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('X',a.etat==='ok'?214.5:221.4,rows[i],{align:'center'});if(a.observation)write(a.observation,264,rows[i],31,6);});
  write(d.observations||'',180,182.6,100,7);write(d.signature||'',195,190.2,90,7);
  return doc;
 }
};

// Convertit une ligne de la table dédiée au format attendu par le modèle Annexe 21.
window.CISControleVLHR.depuisTable=function(r){
 const reponses={};for(const c of Array.isArray(r.controles)?r.controles:[]){if(c?.cle)reponses[c.cle]={etat:c.etat,observation:c.observation||''};}
 return {type:'controle_technique_vlhr',date:String(r.date_controle||'').slice(0,10),sis:r.sis_appartenance||'',immatriculation:r.immatriculation||'',observations:r.observations||'',signature:[r.verificateur_nom,r.verificateur_grade].filter(Boolean).join(' '),reponses};
};

window.CISControleVLHR.chargerPDF=async function(){
 if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
 if(!this._chargementPDF){
  this._chargementPDF=(async()=>{
   for(const url of ['https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js']){
    try{
     await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(Error('Chargement impossible'));document.head.appendChild(s);});
     if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
    }catch(e){console.warn('Bibliothèque PDF',e);}
   }
   throw Error('Bibliothèque PDF indisponible. Vérifie la connexion Internet et réessaie.');
  })().finally(()=>{this._chargementPDF=null;});
 }
 return this._chargementPDF;
};

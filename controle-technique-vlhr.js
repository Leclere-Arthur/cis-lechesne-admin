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
  // Les observations sont centrées dans LEUR cellule, sans dépasser sur la ligne suivante.
  // Les cellules n'ont pas toutes la même hauteur dans le modèle officiel.
  const limites=[[63.6,68.1],[68.1,72.5],[72.5,78.1],[78.1,85.2],[85.2,92.2],[92.2,96.8],[96.8,101.1],[113.5,118.2],[166.8,171.5],[171.5,177.5]];
  const detailsSupplementaires=[];
  const observationDansCase=(valeur,i)=>{
   const texte=String(valeur||'').replace(/\s+/g,' ').trim();if(!texte)return;
   const [haut,bas]=limites[i],x=262.5,largeur=32.5,marge=0.7;
   const disponible=bas-haut-2*marge;
   let taille=6,lignes=[];
   // Diminuer progressivement la police jusqu'à ce que le texte rentre dans la case.
   for(;taille>=3.5;taille-=0.25){
    doc.setFont('helvetica','normal');doc.setFontSize(taille);
    lignes=doc.splitTextToSize(texte,largeur);
    if(lignes.length*(taille*0.3528*1.12)<=disponible)break;
   }
   taille=Math.max(3.5,taille);doc.setFontSize(taille);
   const hauteurLigne=taille*0.3528*1.12;
   const maxLignes=Math.max(1,Math.floor(disponible/hauteurLigne));
   if(lignes.length>maxLignes){
    detailsSupplementaires.push([this.points[i][1],texte]);
    lignes=lignes.slice(0,maxLignes);
    const derniere=lignes.length-1;
    while(lignes[derniere].length>1 && doc.getTextWidth(lignes[derniere]+'…')>largeur)lignes[derniere]=lignes[derniere].slice(0,-1);
    lignes[derniere]+='…';
   }
   const total=lignes.length*hauteurLigne;
   const depart=haut+(bas-haut-total)/2+hauteurLigne*0.8;
   doc.setTextColor(0,0,0);
   lignes.forEach((ligne,j)=>doc.text(ligne,x,depart+j*hauteurLigne));
  };
  this.points.forEach(([key],i)=>{const a=d.reponses?.[key];if(!a)return;doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('X',a.etat==='ok'?214.5:221.4,rows[i],{align:'center'});if(a.observation)observationDansCase(a.observation,i);});
  // Si une observation est trop longue pour sa cellule, conserver son texte intégral en annexe.

  write(d.observations||'',180,182.6,100,7);
  // Annexe 21 : identité dans la cellule de GAUCHE du document (x 43 à 176 px),
  // signature manuscrite exclusivement dans la cellule de DROITE (x 709 à 1150 px).
  // Coordonnées A4 paysage : 4 pixels du modèle = 1 mm.
  // Une seule ligne en gras dans la case d'identité, à gauche du document.
  const identite=[d.signature,d.grade,d.qualite].map(v=>String(v||'').trim()).filter(Boolean).join('  —  ');
  doc.setFont('helvetica','bold');doc.setTextColor(0,0,0);
  let tailleIdentite=7.3;
  doc.setFontSize(tailleIdentite);
  while(tailleIdentite>4.5 && doc.getTextWidth(identite)>127){tailleIdentite-=0.2;doc.setFontSize(tailleIdentite);}
  doc.text(identite,44,189.4,{maxWidth:127});
  // Image contenue dans la zone de signature, sans étirement ni débordement.
  if(d.signature_png && /^data:image\/(png|jpeg);base64,/.test(d.signature_png)){
   try{
    const type=d.signature_png.startsWith('data:image/png')?'PNG':'JPEG';
    const prop=doc.getImageProperties(d.signature_png);
    const maxW=34,maxH=6.5,ratio=prop.width/prop.height;
    const iw=Math.min(maxW,maxH*ratio),ih=iw/ratio;
    // Positionner immédiatement après « Signature : », sans chevaucher le libellé ni les bordures.
    const x=210.5,y=185.1+(6.5-ih)/2;
    doc.addImage(d.signature_png,type,x,y,iw,ih,undefined,'FAST');
   }catch(e){console.warn('Signature illisible',e);}
  }
  if(detailsSupplementaires.length){
   doc.addPage();doc.setFont('helvetica','bold');doc.setFontSize(13);
   doc.text('Annexe au contrôle technique VLHR — observations complètes',15,18);
   doc.setFont('helvetica','normal');doc.setFontSize(9);
   let y=29;
   for(const [titre,contenu] of detailsSupplementaires){
    const texte=doc.splitTextToSize(titre+' : '+contenu,265);
    if(y+texte.length*5>195){doc.addPage();y=18;}
    doc.text(texte,15,y);y+=texte.length*5+5;
   }
  }
  return doc;
 }
};

// Convertit une ligne de la table dédiée au format attendu par le modèle Annexe 21.
window.CISControleVLHR.depuisTable=function(r){
 const reponses={};for(const c of Array.isArray(r.controles)?r.controles:[]){if(c?.cle)reponses[c.cle]={etat:c.etat,observation:c.observation||''};}
 return {type:'controle_technique_vlhr',date:String(r.date_controle||'').slice(0,10),sis:r.sis_appartenance||'',immatriculation:r.immatriculation||'',observations:r.observations||'',signature:r.verificateur_nom||'',grade:r.verificateur_grade||'',qualite:r.controles?.find(x=>x.cle==='identite_signature')?.qualite||'',signature_png:r.controles?.find(x=>x.cle==='identite_signature')?.signature_png||'',reponses};
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

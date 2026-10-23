/* Lecture locale du tableau SDIS : texte positionné + cases rendues par PDF.js.
   Aucune requête IA, aucun envoi du PDF à un service tiers. */
(function(g){'use strict';
 const F=g.CISFormation,MOIS=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
 let lib;
 async function bibliotheque(){if(!lib){lib=(async()=>{let timer;try{const x=await Promise.race([import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/legacy/build/pdf.mjs'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Délai de lecture dépassé.')),25000);})]);x.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/legacy/build/pdf.worker.mjs';return x;}finally{clearTimeout(timer);}})().catch(e=>{lib=null;throw Error('Lecture PDF indisponible. Vérifie la connexion puis réessaie.');});}return lib;}
 function lignes(items){const rows=[];for(const t of [...items].sort((a,b)=>a.y-b.y||a.x-b.x)){let r=rows.find(r=>Math.abs(r.y-t.y)<1.6);if(!r)rows.push(r={y:t.y,items:[]});r.items.push(t);}return rows.sort((a,b)=>a.y-b.y).map(r=>({...r,items:r.items.sort((a,b)=>a.x-b.x),text:r.items.sort((a,b)=>a.x-b.x).map(t=>t.s).join(' ').replace(/\s+/g,' ').trim()}));}
 function avertissements(sessions){const notes=[];for(const s of sessions){if(s.lieu==='Lieu non précisé')notes.push(`${s.intitule} (${s.code}) : lieu non précisé.`);if(/ ou /i.test(s.lieu))notes.push(`${s.code} : lieu à confirmer (${s.lieu}).`);if(s.type==='autre')notes.push(`${s.intitule} : catégorie à vérifier.`);}const codes=new Map();for(const s of sessions){const k=s.type+'|'+F.norm(s.code),p=codes.get(k);if(p&&F.norm(p.lieu)!==F.norm(s.lieu))notes.push(`${s.code} figure dans plusieurs lieux : sessions conservées séparément.`);codes.set(k,s);}return [...new Set(notes)];}
 async function analyser(file,progress=()=>{},dependances={}){
  if(!file||file.size>20*1024*1024||!file.name.toLowerCase().endsWith('.pdf'))throw Error('Choisis un PDF de 20 Mo maximum.');
  const bytes=new Uint8Array(await file.arrayBuffer());if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Ce fichier n’est pas un PDF.');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const pdfjs=dependances.pdfjs||await bibliotheque();const loading=pdfjs.getDocument({data:bytes,useSystemFonts:true,isEvalSupported:false,stopAtErrors:true});let doc;
  let timeout;try{doc=await Promise.race([loading.promise,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Le PDF ne répond pas. Réessaie avec une connexion stable.')),30000);})]);clearTimeout(timeout);if(doc.numPages>12)throw Error('Ce planning dépasse 12 pages. Importe les semestres séparément.');const tous=[],notes=[];
   for(let pageNo=1;pageNo<=doc.numPages;pageNo++){
    progress(`Lecture de la page ${pageNo} / ${doc.numPages}…`);
    const page=await doc.getPage(pageNo),view=page.getViewport({scale:1}),raw=await page.getTextContent();
    if(view.width<200||view.height<200||view.width>3000||view.height>3000)throw Error(`Page ${pageNo} : dimensions non prises en charge.`);
    const ts=raw.items.filter(x=>x.str?.trim()).map(x=>{const t=pdfjs.Util.transform(view.transform,x.transform);return{s:x.str.trim(),x:t[4],y:t[5],w:x.width,h:Math.hypot(t[2],t[3])};});
    const months=ts.map(t=>{const a=F.norm(t.s).match(/^(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(20\d\d)$/);return a?{...t,month:MOIS.indexOf(a[1])+1,year:+a[2]}:null;}).filter(Boolean).sort((a,b)=>a.y-b.y);
    if(!months.length)throw Error(`Page ${pageNo} : calendrier non reconnu. Utilise le PDF original avec son texte, et non une photo ou un scan.`);
    const scale=Math.min(2,2600/view.width),canvas=dependances.canvas?dependances.canvas(Math.ceil(view.width*scale),Math.ceil(view.height*scale)):document.createElement('canvas');canvas.width=Math.ceil(view.width*scale);canvas.height=Math.ceil(view.height*scale);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});await page.render({canvasContext:ctx,viewport:page.getViewport({scale})}).promise;const img=ctx.getImageData(0,0,canvas.width,canvas.height);
    const pixel=(x,y)=>{const a=(Math.max(0,Math.min(img.height-1,Math.round(y*scale)))*img.width+Math.max(0,Math.min(img.width-1,Math.round(x*scale))))*4;return[img.data[a],img.data[a+1],img.data[a+2]];};
    for(let mi=0;mi<months.length;mi++){
     const mo=months[mi],bottom=months[mi+1]?.y-10||view.height-38;
     const candidates=ts.filter(t=>/^\d{1,2}$/.test(t.s)&&t.x>mo.x+mo.w&&Math.abs(t.y-mo.y)<18);
     const dr=lignes(candidates).sort((a,b)=>b.items.length-a.items.length)[0];const days=dr?.items.filter(t=>+t.s>=1&&+t.s<=31).sort((a,b)=>+a.s-+b.s)||[];
     const n=new Date(mo.year,mo.month,0).getDate();if(days.length!==n||days.some((d,i)=>+d.s!==i+1))throw Error(`${mo.s} : colonnes des jours non reconnues. Publication bloquée pour éviter des dates erronées.`);
     const centers=days.map(t=>t.x+t.w/2),step=(centers[n-1]-centers[0])/(n-1),left=centers[0]-step/2,right=centers[n-1]+step/2;
     if(days.some((d,i)=>Math.abs(centers[i]-(centers[0]+i*step))>step*.12))throw Error(`${mo.s} : colonnes irrégulières, vérifie le format du PDF.`);
     const bounds=[centers[0]-(centers[1]-centers[0])/2,...centers.slice(1).map((c,i)=>(c+centers[i])/2),centers[n-1]+(centers[n-1]-centers[n-2])/2];
     const rows=lignes(ts.filter(t=>t.x<left-2&&t.x>left*.23&&t.y>Math.max(mo.y,dr.y)+12&&t.y<bottom)).filter(r=>/^(fi\s+equipier|chef\s+d|balisage|module\s+secours|brevet|eval)/.test(F.norm(r.text)));
     if(!rows.length){notes.push(`${mo.s} : aucune ligne de formation reconnue.`);continue;}
     for(let ri=0;ri<rows.length;ri++){
      const row=rows[ri],height=Math.min(24,rows[ri+1]?rows[ri+1].y-row.y:ri?row.y-rows[ri-1].y:16),yy=row.y-row.items[0].h*.45;
      const blocks=lignes(ts.filter(t=>t.x>=left-1&&t.x<right&&Math.abs(t.y-row.y)<height*.5)).flatMap(r=>{
       // PDF.js peut scinder les mots d’une même case ; les réunir par proximité.
       const out=[];for(const t of r.items){const last=out[out.length-1];if(last&&t.x-(last.x+last.w)<4&&Math.abs(t.y-last.y)<2){last.s+=' '+t.s;last.w=t.x+t.w-last.x;}else out.push({...t});}return out;
      }).filter(t=>/[a-zéè]/i.test(t.s)&&!/^vacances|cross$/i.test(t.s));
      if(!blocks.length&&F.type(row.text)==='sr0a'&&ts.some(t=>t.x>left&&/SR0A/i.test(t.s)&&Math.abs(t.y-row.y)<height*1.5))continue;
      if(!blocks.length){notes.push(`${mo.s} — ${row.text} : aucune date indiquée.`);continue;}
      // Coloration mesurée en plusieurs points hors de la ligne de texte.
      const fills=centers.map(cx=>{const samples=[];for(const dx of [-.32,.32])for(const dy of [-.30,.30])samples.push(pixel(cx+step*dx,yy+height*dy));return samples.filter(p=>Math.max(...p)-Math.min(...p)>35||Math.max(...p)<175).length>=3;});
      const segments=[];for(let j=0;j<n;j++)if(fills[j]){let end=j;while(end+1<n&&fills[end+1])end++;segments.push([j,end]);j=end;}
      for(const b of blocks){const cx=b.x+b.w/2;let range=segments.find(([a,z])=>cx>centers[a]-step*.55&&cx<centers[z]+step*.55);
       if(!range){
        // Les chefs d’équipe sont représentés par des cases blanches encadrées.
        // Une bordure noire (et non la grille grise) délimite la période.
        const border=x=>[-.27,.27].filter(d=>Math.max(...pixel(x,yy+height*d))<170).length===2;
        let a=null,z=null;for(let k=0;k<=n;k++){const x=bounds[k];let black=false;for(const delta of [-1,-.75,-.5,-.25,0,.25,.5,.75,1])if(border(x+delta))black=true;if(black&&x<cx)a=k;if(black&&x>cx&&z===null)z=k-1;}
        if(a!==null&&z!==null&&z>=a&&z-a<8)range=[a,z];
       }
       if(!range){notes.push(`${mo.s} — ${row.text} (${b.s}) : période non reconnue, à ajouter dans l’aperçu.`);continue;}
       let ty=F.type(row.text);if(/^sr0[ab]$/.test(ty)&&/sr0[ab]/i.test(b.s))ty=/sr0a/i.test(b.s)?'sr0a':'sr0b';if(ty==='ps_suap')ty=/suap/i.test(b.s)?'suap':'ps';
       const code=b.s.replace(/\s+/g,' ').trim();const intitule=F.type(row.text)!==ty&&ri>0&&F.type(rows[ri-1].text)===ty?rows[ri-1].text:row.text;let lieu=F.lieu(row.text);if(/^sr0[ab]$/.test(ty)&&lieu==='Lieu non précisé'&&ri>0&&F.type(rows[ri-1].text)==='sr0a')lieu=F.lieu(rows[ri-1].text);
       const dates=[];for(let d=range[0]+1;d<=range[1]+1;d++)dates.push(`${mo.year}-${String(mo.month).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
       // Le numéro dans la ligne de gauche est prioritaire sur les libellés abrégés.
       const number=code.match(/-\s*(\d+)\s*$/)?.[1]||row.text.match(/(?:SPV|\))\s*[- ]*(\d+)\b/i)?.[1];
       const prefix={integration:'INT',incendie:'INC',ps:'PS',suap:'SUAP',ppabe:'PPABE',ce:'CE',ca1e:'CA1E',cate:'CATE',sr0a:'SR0A',sr0b:'SR0B',sr2:'SR2',ca_sr:'CA-SR',jsp:'BNJSP',eval_ce_cate:'EVAL-CE-CATE',eval_ca1e:'EVAL-CA1E'}[ty]||'FORMATION';
       const jsp=ty==='suap'&&/JSP/i.test(row.text)?'-JSP'+(code.match(/JSP\s*(.+?)(?:\s*\(|$)/i)?.[1]||'').replace(/[^0-9a-z]/gi,''):'';
       const normalized=prefix+(number?'-'+number:'')+jsp;
       const partage=/JSP\s*1\s*et\s*2/i.test(code);if(partage)notes.push(`${mo.s} : deux sessions JSP partagent le même bloc, leur répartition doit être confirmée.`);
       tous.push({type:ty,code:normalized,lieu,intitule,dates,pages:[pageNo],separation:partage?`${mo.year}-${mo.month}`:'',notes:/JSP/i.test(row.text)?(partage?'Deux sessions JSP indiquées ensemble sur le document ; répartition à confirmer.':'Session JSP.'):''});
      }
     }
    }
    page.cleanup();canvas.width=canvas.height=1;
   }
   if(!tous.length)throw Error('Aucune session extraite. Rien ne sera publié.');
   const sessions=F.fusionner([{nom:file.name,sessions:tous}]).map((s,i)=>({...s,id:'s'+i,pages:[...new Set(tous.filter(x=>x.type===s.type&&x.code===s.code&&F.norm(x.lieu)===F.norm(s.lieu)).flatMap(x=>x.pages))],sources:undefined}));
   // Deux journées d’intégration portant le même numéro restent des sessions distinctes.
   const separees=[];for(const s of sessions){if(s.type==='integration'&&s.dates.length>1){notes.push(`${s.code} : code réutilisé pour plusieurs journées d’intégration, journées séparées.`);for(const d of s.dates)separees.push({...s,id:s.id+'-'+d,dates:[d],separation:d});}else separees.push(s);}
   return{nom:file.name,empreinte:hash,sessions:separees,avertissements:[...new Set([...notes,...avertissements(separees)])]};
  }finally{clearTimeout(timeout);await loading.destroy();}
 }
 g.CISFormationImport={analyser,avertissements,lignes};
})(globalThis);

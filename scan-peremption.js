/* CIS Le Chesne — scan des dates : GS1 DataMatrix, code-barres, texte EXP. */
(function(){'use strict';
let dialog=null,stream=null,loop=0;
const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
function dateYYMMDD(s){if(!/^\d{6}$/.test(s))return null;let y=2000+Number(s.slice(0,2)),m=+s.slice(2,4),d=+s.slice(4,6);if(d===0)d=new Date(Date.UTC(y,m,0)).getUTCDate();const x=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;return valid(x)?x:null;}
function parse(s){s=String(s||'').replace(/^<GS>/i,'').replace(/[\u001d\u241d]/g,'\x1d');let gtin=null,lot=null,date=null;
 const a=s.match(/(?:\(01\)|^01)(\d{14})/);if(a)gtin=a[1];
 const b=s.match(/\(17\)(\d{6})/);if(b)date=dateYYMMDD(b[1]);
 if(!date){let m=s.match(/(?:^|\x1d|(?<=\d{14}))17(\d{6})/);if(m)date=dateYYMMDD(m[1]);}
 if(!date){let m=s.match(/\b(?:EXP|EXPIRY|PEREMPTION|PÉREMPTION|EXPIRE|DATE\s*LIMITE)\s*[:.\-]?\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/i);if(m){let y=+m[3];if(y<100)y+=2000;let v=`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;if(valid(v))date=v;}}
 if(!date){let m=s.match(/\b(?:EXP|EXPIRY|PEREMPTION|PÉREMPTION|EXPIRE)\s*[:.\-]?\s*(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/i);if(m){let v=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;if(valid(v))date=v;}}
 if(!date){let m=s.match(/\b(?:EXP|EXPIRY|PEREMPTION|PÉREMPTION|EXPIRE|USE\s*BY|BEST\s*BEFORE)\s*[:.\-]?\s*(\d{1,2})[\/.-](20\d{2}|\d{2})\b/i);if(m){let y=+m[2];if(y<100)y+=2000;let mon=+m[1];if(mon>=1&&mon<=12)date=dateYYMMDD(String(y).slice(2)+String(mon).padStart(2,'0')+'00');}}
 const l=s.match(/\(10\)([^\x1d(]+)/);if(l)lot=l[1];return {date,gtin,lot,raw:s};}
function stop(){loop++;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}if(dialog){dialog.remove();dialog=null;}}
function message(s){const e=dialog?.querySelector('[data-status]');if(e)e.textContent=s;}
async function load(src,globalName){if(window[globalName])return;await new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(Error('Bibliothèque de lecture indisponible (connexion requise).'));document.head.appendChild(s);});}
async function zxingReader(){
 try{await load('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js','ZXingBrowser');return new ZXingBrowser.BrowserMultiFormatReader();}
 catch(e){console.warn('Lecteur navigateur indisponible',e);return null;}
}
let libraryPromise=null;
async function zxingLibrary(){
 if(window.ZXing)return window.ZXing;
 if(!libraryPromise)libraryPromise=load('https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js','ZXing').then(()=>window.ZXing).catch(e=>{libraryPromise=null;throw e;});
 return libraryPromise;
}
function decodeCanvas(canvas,Z){
 const hints=new Map();hints.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.DATA_MATRIX,Z.BarcodeFormat.QR_CODE,Z.BarcodeFormat.CODE_128]);
 hints.set(Z.DecodeHintType.TRY_HARDER,true);
 const reader=new Z.MultiFormatReader();reader.setHints(hints);
 try{
  const source=new Z.HTMLCanvasElementLuminanceSource(canvas);
  const bitmap=new Z.BinaryBitmap(new Z.HybridBinarizer(source));
  const result=reader.decode(bitmap);
  return result?.getText?.()||null;
 }catch(e){return null;}finally{reader.reset();}
}
function imageVariants(image){
 const max=2200;
 const base=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
 return [
  {angle:0,scale:base,threshold:0},{angle:90,scale:base,threshold:0},
  {angle:180,scale:base,threshold:0},{angle:270,scale:base,threshold:0},
  {angle:0,scale:Math.min(2,3200/Math.max(image.naturalWidth,image.naturalHeight)),threshold:0},
  {angle:90,scale:Math.min(2,3200/Math.max(image.naturalWidth,image.naturalHeight)),threshold:0},
  {angle:180,scale:Math.min(2,3200/Math.max(image.naturalWidth,image.naturalHeight)),threshold:0},
  {angle:270,scale:Math.min(2,3200/Math.max(image.naturalWidth,image.naturalHeight)),threshold:0},
  {angle:0,scale:base,threshold:145},{angle:90,scale:base,threshold:145},
  {angle:180,scale:base,threshold:145},{angle:270,scale:base,threshold:145}
 ];
}
function drawVariant(canvas,ctx,image,v){
 const w=Math.max(1,Math.round(image.naturalWidth*v.scale));const h=Math.max(1,Math.round(image.naturalHeight*v.scale));
 const side=v.angle===90||v.angle===270;canvas.width=side?h:w;canvas.height=side?w:h;
 ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(v.angle*Math.PI/180);
 ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore();
 if(v.threshold){const data=ctx.getImageData(0,0,canvas.width,canvas.height);
  for(let i=0;i<data.data.length;i+=4){const c=(data.data[i]*299+data.data[i+1]*587+data.data[i+2]*114)/1000;
   const n=c>=v.threshold?255:0;data.data[i]=data.data[i+1]=data.data[i+2]=n;}
  ctx.putImageData(data,0,0);}
}
async function readImage(file){
 const url=URL.createObjectURL(file);
 try{
  const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Photo illisible.'));img.src=url;});
  const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('Traitement photo indisponible.');
  let Z=null,reader=null,lastError=null;
  try{Z=await zxingLibrary();}catch(e){lastError=e;console.warn('ZXing Library indisponible',e);}
  try{reader=await zxingReader();}catch(e){lastError=e;}
  const variants=imageVariants(image);
  for(let i=0;i<variants.length;i++){
   message(`Décodage Data Matrix, toutes orientations (${i+1}/${variants.length})…`);
   drawVariant(canvas,ctx,image,variants[i]);
   if(window.BarcodeDetector){try{const detector=new BarcodeDetector({formats:['data_matrix','qr_code','code_128']});const hits=await detector.detect(canvas);if(hits.length)return hits[0].rawValue;}catch(e){lastError=e;}}
   if(Z){const result=decodeCanvas(canvas,Z);if(result)return result;}
   if(reader){try{const result=await reader.decodeFromImageUrl(canvas.toDataURL('image/png'));if(result?.getText())return result.getText();}catch(e){lastError=e;}}
  }
  try{message('Code non décodé. Recherche de la date imprimée…');await load('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js','Tesseract');const result=await Tesseract.recognize(file,'eng');if(result.data.text?.trim())return result.data.text;}catch(e){lastError=e;}
  throw Error('Aucun Data Matrix ni date détecté. Cadre le code entier avec une marge blanche et une photo nette. '+(lastError?.message||''));
 }finally{URL.revokeObjectURL(url);}
}
function apply(raw,callback){const r=parse(raw);if(!r.date){message('Aucune date reconnue. Vérifie la photo ou saisis la date manuellement.');return;}const label=r.date.split('-').reverse().join('/');if(!confirm(`Date détectée : ${label}${r.gtin?'\nGTIN : '+r.gtin:''}${r.lot?'\nLot : '+r.lot:''}\n\nUtiliser cette date ?`))return;callback(r);stop();}
async function camera(callback){
 if(!navigator.mediaDevices?.getUserMedia){message('Caméra directe non disponible. Utilise « Prendre une photo ».');return;}
 try{
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  const video=dialog.querySelector('video');video.hidden=false;video.srcObject=stream;await video.play();
  const token=++loop;
  let detector=null;
  if(window.BarcodeDetector){try{detector=new BarcodeDetector({formats:['data_matrix','qr_code','code_128','ean_13','ean_8']});}catch(e){}}
  if(detector){
   message('Place le code dans le cadre…');
   const tick=async()=>{if(token!==loop||!stream)return;try{const results=await detector.detect(video);if(results.length){apply(results[0].rawValue,callback);if(!dialog)return;}}catch(e){}if(token===loop)setTimeout(tick,350);};tick();return;
  }
  message('Activation du lecteur compatible iPhone…');
  stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;
  const reader=await zxingReader();if(token!==loop)return;
  if(!reader){message('Lecteur vidéo indisponible. Utilise « Prendre une photo » ou « Galerie ».');return;}
  const controls=await reader.decodeFromVideoDevice(undefined,video,(result,error)=>{if(token!==loop)return;if(result?.getText()){apply(result.getText(),callback);if(!dialog)controls.stop();}});
  const oldStop=dialog?.querySelector('[data-close]')?.onclick;
  if(dialog){dialog.querySelector('[data-close]').onclick=()=>{controls.stop();oldStop?.();};}
 }catch(e){message('Caméra inaccessible : '+e.message);}
}
function open(callback){stop();dialog=document.createElement('div');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Scanner une péremption');dialog.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0009;display:flex;align-items:center;justify-content:center;padding:12px';dialog.innerHTML='<div style="background:#fff;color:#111;padding:18px;max-width:480px;width:100%;max-height:95vh;overflow:auto;border:2px solid #555;font:16px Arial"><h2 style="font-size:20px;margin:0 0 10px">Scanner une date de péremption</h2><p>Data Matrix GS1, code-barres ou étiquette EXP.</p><p style="font-size:13px">Pour un Data Matrix, prends une photo nette et rapprochée, sans reflet, avec le code entier visible.</p><video playsinline muted hidden style="width:100%;max-height:260px;background:#222"></video><p data-status aria-live="polite">Choisis une méthode de lecture.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" data-camera>Scanner en direct</button><button type="button" data-photo>Prendre une photo</button><button type="button" data-gallery>Galerie</button><button type="button" data-close>Fermer</button></div><input type="file" accept="image/*" capture="environment" data-capture hidden><input type="file" accept="image/*" data-file hidden><p style="font-size:12px">Contrôle toujours la date avant de l’enregistrer. La reconnaissance de texte nécessite une connexion Internet au premier chargement.</p></div>';document.body.appendChild(dialog);dialog.querySelector('[data-close]').onclick=stop;dialog.querySelector('[data-camera]').onclick=()=>camera(callback);dialog.querySelector('[data-photo]').onclick=()=>dialog.querySelector('[data-capture]').click();dialog.querySelector('[data-gallery]').onclick=()=>dialog.querySelector('[data-file]').click();for(const input of dialog.querySelectorAll('input[type=file]'))input.onchange=async()=>{if(!input.files?.[0])return;message('Lecture de la photo…');try{apply(await readImage(input.files[0]),callback);}catch(e){message(e.message);}input.value='';};}
window.CISScanPeremption={open,parse,stop};
})();

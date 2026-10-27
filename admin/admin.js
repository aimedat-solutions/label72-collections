'use strict';
const OWNER='aimedat-solutions', REPO='label72-collections';
const API='https://api.github.com/repos/'+OWNER+'/'+REPO;
const DESIGNS=[
{id:'b1',category:'Blouses',name:'Classic 4-Tuck Blouse'},
{id:'b2',category:'Blouses',name:'Princess-Cut Blouse'},
{id:'b3',category:'Blouses',name:'Katori Blouse'},
{id:'b4',category:'Blouses',name:'Designer Blouse'},
{id:'k1',category:'Kurtas & Sets',name:'Straight Kurta'},
{id:'k2',category:'Kurtas & Sets',name:'A-Line Kurta'},
{id:'k3',category:'Kurtas & Sets',name:'Festive Anarkali'},
{id:'l1',category:'Lehengas',name:'Festive Lehenga'},
{id:'l2',category:'Lehengas',name:'Minimal Lehenga Set'},
{id:'w1',category:'Western Wear',name:'Midi Dress'},
{id:'w2',category:'Western Wear',name:'Maxi Dress'},
{id:'w3',category:'Western Wear',name:'Tailored Co-ord Set'}
];
const el=id=>document.getElementById(id);
let token='',selected='b1',photos={},previewBlob=null,loadedImg=null,loadedObjectUrl='',busy=false;
function setStatus(message,type){const s=el('status');s.textContent=message;s.className='status'+(type?' '+type:'');}
function safePhoto(item){return item&&typeof item.src==='string'&&/^photos\/[a-z0-9_-]+\.webp\?v=\d+$/.test(item.src);}
function sanitize(data){const ret={};if(!data||typeof data!=='object'||Array.isArray(data))return ret;for(const d of DESIGNS){const p=data[d.id];if(safePhoto(p))ret[d.id]={src:p.src,kind:p.kind==='work'?'work':'reference'};}return ret;}
function showSlots(){
 const root=el('slots');root.replaceChildren();
 for(const d of DESIGNS){
  const card=document.createElement('button');card.type='button';card.className='slot'+(d.id===selected?' selected':'');
  const visual=document.createElement('div');visual.className='slotThumb';
  const photo=photos[d.id];
  if(safePhoto(photo)){const img=document.createElement('img');img.src='../'+photo.src;img.alt=d.name;img.loading='lazy';img.onerror=()=>{img.replaceWith(document.createTextNode(d.id.toUpperCase()));};visual.appendChild(img);}
  else visual.textContent=d.id.toUpperCase();
  const label=document.createElement('div');label.className='slotLabel';
  const name=document.createElement('strong');name.textContent=d.name;
  const info=document.createElement('span');info.textContent=photo?(photo.kind==='work'?'Our stitched work':'Reference photo'):'Illustration only';
  label.append(name,info);card.append(visual,label);
  card.addEventListener('click',()=>chooseSlot(d.id));root.appendChild(card);
 }
 el('slotTotal').textContent=Object.keys(photos).length+' photos / 12 slots';
}
function chooseSlot(id){
 selected=id;const d=DESIGNS.find(item=>item.id===id);
 el('selectedTitle').textContent=d.name;
 el('selectedSubtitle').textContent=d.category+' · Photo slot '+id.toUpperCase();
 el('photoInput').value='';previewBlob=null;loadedImg=null;
 if(loadedObjectUrl){URL.revokeObjectURL(loadedObjectUrl);loadedObjectUrl='';}
 el('previewCanvas').hidden=true;el('placeholder').hidden=false;
 const p=photos[id];el('photoKind').value=p&&p.kind==='work'?'work':'reference';
 el('removeBtn').disabled=!token||!p||busy;
 el('publishBtn').disabled=true;
 setStatus(p?'This design has a published photo. Choose a new image to replace it.':'Choose a garment photo for this design slot.');
 showSlots();
}
function setBusy(value){busy=value;el('connectBtn').disabled=value;el('publishBtn').disabled=value||!token||!previewBlob;el('removeBtn').disabled=value||!token||!photos[selected];el('disconnectBtn').disabled=value||!token;}
async function api(method,path,body){
 if(!token)throw new Error('Connect a GitHub token before publishing.');
 const response=await fetch(path.startsWith('https://')?path:API+path,{method,headers:{'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){const err=new Error(data.message||('GitHub request failed: '+response.status));err.status=response.status;throw err;}
 return data;
}
function base64ToText(s){const bin=atob(s.replace(/\s/g,''));const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes);}
function textToBase64(s){const bytes=new TextEncoder().encode(s);let raw='';for(let i=0;i<bytes.length;i++)raw+=String.fromCharCode(bytes[i]);return btoa(raw);}
function fileToBase64(blob){return new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(String(f.result).split(',')[1]);f.onerror=()=>reject(new Error('Could not read image.'));f.readAsDataURL(blob);});}
async function remotePhotoFile(){
 try{const f=await api('GET','/contents/photos.json?ref=main');return {data:sanitize(JSON.parse(base64ToText(f.content))),sha:f.sha};}
 catch(e){if(e.status===404)return {data:{},sha:null};throw e;}
}
async function refreshPhotos(){
 try{const r=await fetch('../photos.json?updated='+Date.now(),{cache:'no-store'});if(r.ok)photos=sanitize(await r.json());}catch(e){}
 showSlots();
}
async function connect(){
 const incoming=el('tokenInput').value.trim();
 if(!incoming){setStatus('Paste your GitHub token first.','error');return;}
 token=incoming;el('tokenInput').value='';
 try{setStatus('Checking GitHub access…');const user=await api('GET','https://api.github.com/user');const remote=await remotePhotoFile();photos=remote.data;el('connectionState').textContent='Connected: '+user.login;el('connectionState').classList.add('connected');el('disconnectBtn').disabled=false;setStatus('Connected to GitHub as '+user.login+'. Upload a photo and publish.','success');chooseSlot(selected);}
 catch(e){token='';el('connectionState').textContent='Not connected';el('connectionState').classList.remove('connected');setStatus('Connection failed: '+e.message+'. Check the repository and Contents permissions.','error');}
}
function disconnect(){
 token='';el('tokenInput').value='';el('connectionState').textContent='Not connected';el('connectionState').classList.remove('connected');el('disconnectBtn').disabled=true;el('publishBtn').disabled=true;el('removeBtn').disabled=true;setStatus('Disconnected. The access token has been discarded.'); 
}
async function loadImage(){
 const file=el('photoInput').files[0];previewBlob=null;el('publishBtn').disabled=true;
 if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setStatus('Use a JPG, PNG or WebP image.','error');return;}
 if(file.size>15*1024*1024){setStatus('Maximum original photo size is 15 MB.','error');return;}
 if(loadedObjectUrl)URL.revokeObjectURL(loadedObjectUrl);
 loadedObjectUrl=URL.createObjectURL(file);const img=new Image();img.decoding='async';
 try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('The photo could not be opened.'));img.src=loadedObjectUrl;});loadedImg=img;await preparePreview();setStatus('Photo ready. Confirm the crop and photo type, then publish.');}
 catch(e){loadedImg=null;setStatus(e.message,'error');}
}
async function preparePreview(){
 if(!loadedImg)return;
 const canvas=el('previewCanvas'),ctx=canvas.getContext('2d');
 canvas.width=900;canvas.height=1200;
 ctx.fillStyle='#efe2d8';ctx.fillRect(0,0,900,1200);
 const w=loadedImg.naturalWidth,h=loadedImg.naturalHeight;if(!w||!h)throw Error('Invalid image dimensions.');
 const mode=el('fitMode').value;
 const scale=mode==='cover'?Math.max(900/w,1200/h):Math.min(900/w,1200/h);
 const dw=w*scale,dh=h*scale;
 ctx.drawImage(loadedImg,(900-dw)/2,(1200-dh)/2,dw,dh);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.83));
 if(!blob||blob.type!=='image/webp')throw Error('Your browser cannot export WebP. Please use Chrome or Edge.');
 previewBlob=blob;el('placeholder').hidden=true;canvas.hidden=false;el('publishBtn').disabled=!token||busy;
}
async function savePhotoMap(next,message){
 const remote=await remotePhotoFile();
 const merged={...remote.data,...next};
 for(const k of Object.keys(merged))if(merged[k]===null)delete merged[k];
 const data={message,content:textToBase64(JSON.stringify(merged,null,2)+'\n'),branch:'main'};
 if(remote.sha)data.sha=remote.sha;
 await api('PUT','/contents/photos.json',data);
 photos=sanitize(merged);showSlots();
 return photos;
}
async function publish(){
 if(!token||!previewBlob)return setStatus('Connect GitHub and select a photo first.','error');
 const id=selected;setBusy(true);
 try{
  setStatus('Publishing image to the repository…');
  const path='photos/'+id+'.webp';
  let sha;try{const f=await api('GET','/contents/'+path+'?ref=main');sha=f.sha;}catch(e){if(e.status!==404)throw e;}
  const content=await fileToBase64(previewBlob);
  const payload={message:'Update collection photo: '+id,content,branch:'main'};
  if(sha)payload.sha=sha;
  await api('PUT','/contents/'+path,payload);
  setStatus('Image uploaded. Updating public collection…');
  await savePhotoMap({[id]:{src:path+'?v='+Date.now(),kind:el('photoKind').value==='work'?'work':'reference'}},'Publish collection photo for '+id);
  setStatus('Photo published to GitHub. GitHub Pages is deploying the update. Check the public gallery after deployment completes.','success');
 }
 catch(e){setStatus('Publishing failed: '+e.message+'. The image may have been uploaded, but the public gallery remains unchanged until its photo configuration is saved. Retry publishing.','error');}
 finally{setBusy(false);}
}
async function restore(){
 if(!token||!photos[selected])return;
 if(!confirm('Restore the original illustration for this design? The previous image will no longer appear in the gallery.'))return;
 setBusy(true);try{setStatus('Restoring original illustration…');await savePhotoMap({[selected]:null},'Restore illustration for '+selected);setStatus('Original illustration restored. GitHub Pages is deploying the update.','success');}
 catch(e){setStatus('Could not restore illustration: '+e.message,'error');}finally{setBusy(false);}
}
el('connectBtn').addEventListener('click',connect);
el('disconnectBtn').addEventListener('click',disconnect);
el('photoInput').addEventListener('change',loadImage);
el('fitMode').addEventListener('change',()=>preparePreview().catch(e=>setStatus(e.message,'error')));
el('publishBtn').addEventListener('click',publish);
el('removeBtn').addEventListener('click',restore);
el('tokenInput').addEventListener('keydown',e=>{if(e.key==='Enter')connect();});
chooseSlot(selected);refreshPhotos();

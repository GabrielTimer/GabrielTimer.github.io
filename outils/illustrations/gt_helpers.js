// À coller dans l'onglet ChatGPT (javascript_tool) pour réinstaller les aides.
window.__gt = {
 load:u=>new Promise((ok,ko)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>ok(i);i.onerror=()=>ko('err '+u);i.src=u}),
 async ref(a,b){const B='https://gabrieltimer.github.io';const [h,f]=await Promise.all([this.load(B+a),this.load(B+b)]);
  const H=640,wh=h.width*H/h.height,wf=f.width*H/f.height,g=80;const c=document.createElement('canvas');c.width=Math.round(wh+wf+g+60);c.height=H+40;
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(h,30,20,wh,H);x.drawImage(f,30+wh+g,20,wf,H);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));return new File([blob],'modele-style.png',{type:'image/png'})},
 async attach(file){const inp=[...document.querySelectorAll('input[type=file]')].find(i=>(i.getAttribute('accept')||'')==='image/*')||document.querySelector('input[type=file]');const dt=new DataTransfer();dt.items.add(file);inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}));return inp.id},
 type(t){const ed=document.querySelector('.ProseMirror');ed.focus();document.execCommand('selectAll');document.execCommand('insertText',false,t);return ed.innerText.length},
 P: d => `Nouvelle image, exactement le même style, les mêmes deux personnages et le même cadrage que l'image de référence (dessin vectoriel propre, fond blanc uni, ombre légère au sol, aucun texte, format paysage). À GAUCHE l'homme (t-shirt bleu vif, short noir, chaussettes blanches, baskets bleues), à DROITE la femme (brassière vert sarcelle, legging gris foncé, baskets blanches, queue de cheval), séparés par un large espace blanc, même pose pour les deux. Flèches bleues pour le mouvement. ${d} Anatomie correcte : deux bras, deux jambes, deux pieds visibles, mains à cinq doigts, articulations dans le bon sens.`,
 async send(desc){this.type(this.P(desc));await new Promise(r=>setTimeout(r,600));const b=document.querySelector('button[data-testid="send-button"]')||[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Envoyer');b.click();return true},
 lastImg:()=>[...document.querySelectorAll('img')].filter(i=>/Image générée/.test(i.alt)&&i.naturalWidth>500).pop(),
 async split(q=0.82){
  const im=this.lastImg();const W=im.naturalWidth,H=im.naturalHeight;const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(im,0,0);
  const px=x.getImageData(0,0,W,H).data;const ink=i=>px[i]<225||px[i+1]<225||px[i+2]<225;
  const colInk=[];for(let cx=0;cx<W;cx++){let n=0;for(let y=0;y<H*0.9;y+=2){if(ink((y*W+cx)*4))n++}colInk.push(n)}
  let best=Math.round(W/2),bl=-1,bv=1e9;let s=-1;
  for(let cx=Math.round(W*0.25);cx<=W*0.75;cx++){const z=colInk[cx]<=1;if(z&&s<0)s=cx;if((!z||cx>=W*0.75)&&s>=0){const len=cx-s;if(len>bl){bl=len;best=Math.round((s+cx)/2)}s=-1}}
  if(bl<0){for(let cx=Math.round(W*0.35);cx<W*0.65;cx++){if(colInk[cx]<bv){bv=colInk[cx];best=cx}}}
  const out=[];
  for(const [a,b] of [[0,best],[best,W]]){
   let x0=b,x1=a,y0=H,y1=0;for(let y=0;y<H;y++){for(let cx=a;cx<b;cx++){if(ink((y*W+cx)*4)){if(cx<x0)x0=cx;if(cx>x1)x1=cx;if(y<y0)y0=y;if(y>y1)y1=y}}}
   const p=24;x0=Math.max(a,x0-p);x1=Math.min(b-1,x1+p);y0=Math.max(0,y0-p);y1=Math.min(H-1,y1+p);
   const w=x1-x0+1,h=y1-y0+1;const sc=Math.min(720/h,900/w,1.5);const o=document.createElement('canvas');o.width=Math.round(w*sc);o.height=Math.round(h*sc);
   const ox=o.getContext('2d');ox.fillStyle='#fff';ox.fillRect(0,0,o.width,o.height);ox.imageSmoothingQuality='high';ox.drawImage(c,x0,y0,w,h,0,0,o.width,o.height);
   out.push({w:o.width,h:o.height,d:o.toDataURL('image/webp',q).split(',')[1]});
  }
  this.parts=out;return {split:best,gap:bl,parts:out.map(o=>[o.w,o.h])}},
 show(k){document.getElementById('__gtov')?.remove();if(k<0)return 'off';const p=this.parts[k];const d=document.createElement('div');d.id='__gtov';d.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;background:#fff;z-index:2147483647;';const i=new Image();i.src='data:image/webp;base64,'+p.d;const s=Math.min(1,(innerWidth-4)/p.w,(innerHeight-4)/p.h);i.style.cssText=`position:absolute;left:0;top:0;width:${p.w*s}px;height:${p.h*s}px;`;d.append(i);document.body.append(d);return [p.w*s,p.h*s]},
 async check(){const im=this.lastImg(); const nouveau = im && im.src!==this.prevSrc; const out={nouveau, busy:!!document.querySelector('[data-testid="stop-button"]')}; if(nouveau){const r=await this.split(); this.prevSrc=im.src; this.show(0); out.parts=r.parts} else out.tail=document.querySelector('main')?.innerText.slice(-300); return out}
};
// Ensuite : capture avec computer zoom [0,0,w,h] (fichier PNG enregistré dans /tmp/claude-tool-results), puis save_img.py.
'ok'

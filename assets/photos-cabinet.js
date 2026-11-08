/* Photos du cabinet : compression avant envoi (une photo doit tenir dans un document Firebase, moins de 1 Mo). */

const MAX_BYTES = 650 * 1024;

function loadImage(file){
  return new Promise((ok, ko) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error("Image illisible")); };
    img.src = url;
  });
}

/** Image redimensionnée (1600 px au plus) et compressée, en data URL. */
export async function compressPhoto(file){
  const img = await loadImage(file);
  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
  const webp = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  const type = webp ? "image/webp" : "image/jpeg";
  let side = 1600, quality = 0.82, out = "";
  for(let i = 0; i < 10; i++){
    const r = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * r));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * r));
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    out = canvas.toDataURL(type, quality);
    if(out.length * 0.75 <= MAX_BYTES) break;
    if(quality > 0.6) quality -= 0.08; else side = Math.round(side * 0.85);
  }
  return out;
}

/* =========================================================
   Fenêtres partagées de l'espace kiné
   ========================================================= */

import { openSheet, esc, icon, toast, accessLink, fmtCode, KINE, prenom } from "./app.js";
import { createPatient, listPatients } from "./cloud.js";
import { qrSVG } from "./qr.js";

/** Fenêtre « Nouveau patient ». Résout avec le patient créé, ou null. */
export function newPatientSheet(){
  return new Promise(resolve => {
    let done = false;
    const s = openSheet({
      title: "Nouveau patient",
      body: `
        <form class="stack" id="np-form" style="--gap:16px" novalidate>
          <div class="field"><label for="np-nom">Prénom et nom</label><input class="input" id="np-nom" autocomplete="off" required placeholder="Ex. Marie Dupont"></div>
          <div class="grid-2">
            <div class="field"><label for="np-tel">Téléphone <span class="faint">(facultatif)</span></label><input class="input" id="np-tel" type="tel" inputmode="tel" autocomplete="off"></div>
            <div class="field"><label for="np-mail">E-mail <span class="faint">(facultatif)</span></label><input class="input" id="np-mail" type="email" inputmode="email" autocomplete="off"></div>
          </div>
          <div class="field"><label for="np-note">Note <span class="faint">(visible par vous seul)</span></label><input class="input" id="np-note" autocomplete="off" placeholder="Ex. LCA genou droit, opéré le 12/09"></div>
          <p class="hint" id="np-dup" hidden></p>
        </form>`,
      foot: `<button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="submit" form="np-form" id="np-ok">${icon("userPlus")}Créer le patient</button>`,
      onClose: () => { if(!done) resolve(null); }
    });
    const nom = s.el.querySelector("#np-nom");
    const dup = s.el.querySelector("#np-dup");
    let existing = [];
    listPatients().then(list => { existing = list; }).catch(() => {});
    nom.addEventListener("input", () => {
      const v = nom.value.trim().toLowerCase();
      const same = existing.find(p => (p.nom || "").toLowerCase() === v);
      dup.hidden = !same;
      dup.textContent = same ? "Un patient porte déjà ce nom. Vous pouvez quand même créer un nouveau dossier." : "";
    });
    s.el.querySelector("#np-form").addEventListener("submit", async e => {
      e.preventDefault();
      if(!nom.value.trim()){ nom.focus(); return; }
      const btn = s.el.querySelector("#np-ok");
      btn.disabled = true;
      try{
        const p = await createPatient({
          nom: nom.value.trim(),
          telephone: s.el.querySelector("#np-tel").value.trim(),
          email: s.el.querySelector("#np-mail").value.trim(),
          note: s.el.querySelector("#np-note").value.trim()
        });
        done = true;
        toast(`${p.nom} est ajouté.`, { type:"ok" });
        s.close();
        resolve(p);
      }catch(err){
        btn.disabled = false;
        toast("Création impossible : " + (err.message || err), { type:"err" });
      }
    });
    setTimeout(() => nom.focus(), 50);
  });
}

/** Message d'invitation envoyé au patient. */
export function invitationText(patient){
  return `Bonjour ${prenom(patient.nom)},

Voici votre accès personnel à vos exercices de kinésithérapie :
${accessLink(patient.cle)}

Ouvrez ce lien sur votre téléphone, puis ajoutez l'application à votre écran d'accueil pour la retrouver facilement.
Ce lien est personnel : ne le partagez pas.

${KINE.nom}
${KINE.titre}`;
}

/** Fenêtre d'accès patient : lien, QR code, envoi. */
export function accessSheet(patient){
  const link = accessLink(patient.cle);
  const text = invitationText(patient);
  const tel = (patient.telephone || "").replace(/[^\d+]/g, "");
  const s = openSheet({
    title: `Accès de ${patient.nom}`,
    body: `
      <div class="stack" style="--gap:18px">
        <div class="access-qr">
          <div class="qr-box">${qrSVG(link, { size:240, label:"QR code d'accès patient" })}</div>
          <div class="stack" style="--gap:6px">
            <p><strong>Faites scanner ce QR code</strong> avec l'appareil photo du téléphone du patient. Ses exercices s'ouvrent directement.</p>
            <p class="small muted">Code d'accès : <span class="num"><strong>${esc(fmtCode(patient.cle))}</strong></span></p>
          </div>
        </div>
        <div class="field">
          <label for="acc-link">Lien personnel</label>
          <div class="row"><input class="input" id="acc-link" readonly value="${esc(link)}"><button class="btn" type="button" id="acc-copy">${icon("copy")}Copier</button></div>
        </div>
        <div class="btn-row">
          ${tel ? `<a class="btn" href="sms:${esc(tel)}?&body=${encodeURIComponent(text)}">${icon("message")}SMS</a>` : ""}
          <a class="btn" href="mailto:${esc(patient.email || "")}?subject=${encodeURIComponent("Vos exercices de kinésithérapie")}&body=${encodeURIComponent(text)}">${icon("mail")}E-mail</a>
          <a class="btn" target="_blank" rel="noopener" href="https://wa.me/${esc(tel.replace(/^0/, "33").replace(/^\+/, ""))}?text=${encodeURIComponent(text)}">${icon("message")}WhatsApp</a>
          ${navigator.share ? `<button class="btn" type="button" id="acc-share">${icon("share")}Partager</button>` : ""}
        </div>
        <p class="hint">Ce lien donne accès au dossier du patient. Si vous pensez qu'il a circulé, générez un nouveau code depuis la fiche patient.</p>
      </div>`,
    foot: `<button class="btn" type="button" id="acc-print">${icon("print")}Imprimer une carte</button><button class="btn primary" type="button" data-close>Terminé</button>`
  });
  s.el.querySelector("#acc-copy").onclick = async () => {
    try{ await navigator.clipboard.writeText(link); toast("Lien copié.", { type:"ok" }); }
    catch(e){ s.el.querySelector("#acc-link").select(); document.execCommand("copy"); toast("Lien copié.", { type:"ok" }); }
  };
  const share = s.el.querySelector("#acc-share");
  if(share) share.onclick = () => navigator.share({ title:"Vos exercices de kinésithérapie", text }).catch(() => {});
  s.el.querySelector("#acc-print").onclick = () => printAccessCard(patient);
  return s;
}

/** Carte imprimable à remettre au patient (format carte de visite ×2). */
export function printAccessCard(patient){
  const link = accessLink(patient.cle);
  const w = window.open("", "_blank");
  if(!w){ toast("Autorisez les fenêtres pour imprimer.", { type:"err" }); return; }
  const card = `
    <div class="card">
      <div class="qr">${qrSVG(link, { size:150 })}</div>
      <div class="txt">
        <div class="brand"><img src="${location.origin}/logo.png" alt=""><div><b>${esc(KINE.nom)}</b><br><span>${esc(KINE.titre)}</span></div></div>
        <p class="who">${esc(patient.nom)}</p>
        <p>Scannez ce code avec l'appareil photo de votre téléphone pour retrouver vos exercices.</p>
        <p class="code">Code : <b>${esc(fmtCode(patient.cle))}</b></p>
      </div>
    </div>`;
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Carte d'accès – ${esc(patient.nom)}</title>
    <style>
      body{font-family:system-ui,sans-serif;margin:16mm;color:#14303A}
      .card{display:flex;gap:6mm;align-items:center;width:150mm;padding:6mm;border:1px dashed #9fb6bc;border-radius:4mm;margin-bottom:8mm}
      .qr svg{width:38mm;height:38mm}
      .brand{display:flex;gap:3mm;align-items:center;font-size:11pt;line-height:1.2}
      .brand img{width:11mm;height:11mm}
      .brand span{color:#47616B;font-size:9pt}
      .who{font-size:13pt;font-weight:700;margin:3mm 0 1mm}
      p{margin:1.5mm 0;font-size:10pt}
      .code{font-family:ui-monospace,monospace;font-size:11pt}
    </style></head><body>${card}${card}<script>window.onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`);
  w.document.close();
}

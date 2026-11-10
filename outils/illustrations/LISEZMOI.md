# Illustrations des exercices avec ChatGPT (outil interne, non utilisé par l'appli)

1. Ouvrir chatgpt.com dans le navigateur intégré de l'appli Claude (compte de Gabriel, ChatGPT Plus jusqu'au 10 déc. 2026).
2. Coller `gt_helpers.js` dans la page (javascript), puis joindre le modèle de style :
   `await __gt.attach(await __gt.ref('/exercises/images/neuro/transfert-poids-debout.webp','/exercises/images/neuro/transfert-poids-debout-f.webp'))`
3. Pour chaque ligne de `queue.json` [id, chemin, description] : `await __gt.send(description)`, attendre ~1 min,
   `await __gt.check()` puis `__gt.show(0)` / `__gt.show(1)` et capturer chaque moitié (zoom 0,0,w,h : PNG enregistré localement).
4. Vérifier l'anatomie et le style, puis `python3 save_img.py homme.png femme.png <chemin> <ID>` (les lignes REDO_ remplacent une image existante),
   `python3 sync_models.py`, commit et push.
Limite ChatGPT : en cas de message de quota, reprendre plus tard.

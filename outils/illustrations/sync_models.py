"""Recopie les images des exercices cabinet (exercises.json) dans les modèles qui les utilisent sans image."""
import json
import os; R=os.environ.get('REPO','/home/claude/gabrieltimer.github.io')
MB=R+'/assets/modeles-base.js'; src=open(MB,encoding='utf-8').read(); PFX='export const MODELES_BASE = '
i=src.index(PFX); head=src[:i]; arr=json.loads(src[i+len(PFX):].rstrip()[:-1])
ex={e['id']:e for e in json.load(open(R+'/exercises/data/exercises.json',encoding='utf-8'))}
n=0
for m in arr:
    for e in m['exercices']:
        if e.get('source')=='CABINET' and e['id'] in ex and ex[e['id']].get('image') and e.get('image')!=ex[e['id']]['image'] and not e.get('image'):
            e['image']=ex[e['id']]['image']; n+=1
open(MB,'w',encoding='utf-8').write(head+PFX+json.dumps(arr,ensure_ascii=False,indent=0)+';\n')
print(n,'images reportées dans les modèles')

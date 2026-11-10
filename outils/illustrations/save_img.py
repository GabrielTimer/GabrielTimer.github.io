"""save_img.py <png homme> <png femme> <dossier/nom> : crée nom-h.webp et nom-f.webp dans exercises/images/ et met à jour variantes.json + exercises.json (ids...)"""
import sys, json, os
from PIL import Image
import os; R=os.environ.get('REPO','/home/claude/gabrieltimer.github.io')
h,f,name=sys.argv[1:4]; ids=sys.argv[4:]
d=os.path.join(R,'exercises/images',os.path.dirname(name)); os.makedirs(d,exist_ok=True)
paths={}
for src,suf in ((h,'h'),(f,'f')):
    im=Image.open(src).convert('RGB')
    from PIL import ImageChops
    bb=ImageChops.difference(im,Image.new('RGB',im.size,'white')).point(lambda v:255 if v>30 else 0).getbbox()
    if bb: im=im.crop((max(0,bb[0]-24),max(0,bb[1]-24),min(im.width,bb[2]+24),min(im.height,bb[3]+24)))
    p=f'/exercises/images/{name}-{suf}.webp'; im.save(R+p,'WEBP',quality=82,method=6); paths[suf]=p
    print(p, os.path.getsize(R+p), im.size)
base=paths['f']
v=json.load(open(R+'/exercises/data/variantes.json'))
v[base]={'defaut':paths['f'],'f':paths['f'],'h':paths['h']}
json.dump(v,open(R+'/exercises/data/variantes.json','w'),ensure_ascii=False,indent=1)
ex=json.load(open(R+'/exercises/data/exercises.json'))
for e in ex:
    if e['id'] in ids: e['image']=base; e.pop('sans_image',None); print('->',e['id'])
json.dump(ex,open(R+'/exercises/data/exercises.json','w'),ensure_ascii=False,indent=2)

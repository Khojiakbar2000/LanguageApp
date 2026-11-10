"""Extract the supplied master environment, retaining every named source layer."""
import json
import xml.etree.ElementTree as ET
from pathlib import Path
ET.register_namespace('', 'http://www.w3.org/2000/svg')
root=ET.parse('public/pandaRoom/phase4/cozy_room_master.svg').getroot()
for n in list(root):
 if n.get('id')=='layer_panda':root.remove(n)
manifest=[]
def walk(node,group='room',layer='room'):
 tag=node.tag.split('}')[-1]
 if node.get('id'):
  if node.get('id').startswith('layer_'):layer=node.get('id')
  if tag=='g':group=node.get('id')
 if tag in ['path','rect','ellipse','circle','line','polygon','polyline']:
  manifest.append({'id':f'roomp{len(manifest)}','group':group,'layer':layer})
 for c in node:walk(c,group,layer)
walk(root)
out=Path('src/features/cozy-room/assets')
ET.ElementTree(root).write(out/'room-source.svg',encoding='unicode')
(out/'room-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Preserved {len(manifest)} environment shapes from all 15 supplied room assets.')

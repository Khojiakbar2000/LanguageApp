"""Read source group IDs/pivots without altering the supplied SVG geometry."""
import json
from pathlib import Path
import xml.etree.ElementTree as ET

source = Path('public/mascot/panda_rive_v2_assets/panda_rig_v2.svg')
root = ET.parse(source).getroot()
manifest = {'source': str(source), 'groups': [], 'shapes': []}
primitives = {'path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line'}

def walk(node, parent=None, hidden=False):
    tag = node.tag.split('}')[-1]
    hidden = hidden or node.get('display') == 'none'
    if tag == 'g':
        group = {'id': node.get('id'), 'parent': parent}
        if node.get('data-pivot'):
            group['pivot'] = [float(v) for v in node.get('data-pivot').split(',')]
        manifest['groups'].append(group)
        parent = group['id']
    elif tag in primitives:
        manifest['shapes'].append({'id': f'v2p{len(manifest["shapes"])}', 'group': parent, 'hidden': hidden})
    for child in node:
        walk(child, parent, hidden)

walk(root)
if len(manifest['shapes']) != 38:
    raise ValueError('Source shape count changed: review the v2 hierarchy before rebuilding.')
Path('src/panda_rive_assets/panda-v2.manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
# Independent visual reference for comparing neutral vector geometry after import.
for group in list(root.iter()):
    for child in list(group):
        if child.get('display') == 'none':
            group.remove(child)
ET.ElementTree(root).write('/tmp/panda-v2-neutral.svg', encoding='unicode')
print(f'Preserved {len(manifest["groups"])} source groups and {len(manifest["shapes"])} shapes.')

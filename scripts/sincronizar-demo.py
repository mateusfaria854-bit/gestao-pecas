#!/usr/bin/env python3
"""Atualiza a cópia JavaScript para executar a demo também com file://."""
from pathlib import Path
import json
root = Path(__file__).resolve().parents[1]
source = root / 'data' / 'demo-data.json'
data = json.loads(source.read_text(encoding='utf-8'))
(root / 'data' / 'demo-data.js').write_text(
    'window.DEMO_DATA = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print('demo-data.js sincronizado a partir de demo-data.json')

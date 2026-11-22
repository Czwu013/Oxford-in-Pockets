"""Pack an edited Blender glTF binary for the single-file edition."""
import argparse
import gzip
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('glb', type=Path)
args = parser.parse_args()
payload = args.glb.read_bytes()
if payload[:4] != b'glTF':
    parser.error('Expected a binary glTF 2.0 model')
target = Path(__file__).resolve().parents[1] / 'src' / 'assets' / (args.glb.stem + '.gz')
target.write_bytes(gzip.compress(payload, compresslevel=9, mtime=0))
print(target)

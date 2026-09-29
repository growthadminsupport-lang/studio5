"""Install the pinned GitHub release weight without overwriting existing artifacts."""
import hashlib
import json
import os
from pathlib import Path
import tempfile
from urllib.request import urlopen


def install():
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / 'manifest.json').read_text())
    folder = root / 'models'
    folder.mkdir(exist_ok=True)
    target = folder / manifest['checkpoint']
    if target.exists():
        with target.open('rb') as source:
            if hashlib.file_digest(source, 'sha256').hexdigest() != manifest['sha256']:
                raise RuntimeError('Existing model checksum mismatch; refusing to overwrite')
        print('Verified existing refine9 checkpoint')
        return
    try:
        with tempfile.NamedTemporaryFile(dir=folder, delete=False) as pending:
            path = Path(pending.name)
            digest = hashlib.sha256()
            size = 0
            with urlopen(manifest['url'], timeout=120) as response:
                while chunk := response.read(1024 * 1024):
                    size += len(chunk)
                    if size > manifest['bytes']:
                        raise RuntimeError('Model download exceeds expected size')
                    digest.update(chunk)
                    pending.write(chunk)
        if size != manifest['bytes'] or digest.hexdigest() != manifest['sha256']:
            raise RuntimeError('Downloaded refine9 checkpoint failed checksum verification')
        # Atomic and exclusive: readers never see a partially copied checkpoint.
        os.link(path, target)
        print('Installed verified refine9 checkpoint')
    finally:
        path.unlink(missing_ok=True)


if __name__ == '__main__':
    install()

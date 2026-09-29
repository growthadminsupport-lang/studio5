"""Refine9 serving, using the vendored training transform and evaluation TTA."""
import hashlib
import json
import math
import os
from pathlib import Path
import threading

ROOT = Path(__file__).resolve().parent
MANIFEST = json.loads((ROOT / 'manifest.json').read_text())
MODEL_MAE_MONTHS = MANIFEST['maeMonths']
MODEL_VERSION = MANIFEST['modelVersion']
SCREENING_NOTE = ('This prediction is a screening aid, not a clinical diagnosis. '
                  'Consult a paediatrician or paediatric endocrinologist for clinical assessment.')
_model = None
# ponytail: one inference at a time per process; use a dedicated worker for higher throughput.
_lock = threading.Lock()


def initialize():
    global _model
    path = ROOT / 'models' / MANIFEST['checkpoint']
    if not path.exists():
        return False
    with path.open('rb') as weights:
        if hashlib.file_digest(weights, 'sha256').hexdigest() != MANIFEST['sha256']:
            raise RuntimeError('Refine9 checkpoint checksum mismatch')
    os.environ['STUDIO5_RUN'] = MANIFEST['run']
    import torch
    from .src.model import BoneAgeModel
    from .src.train import BACKBONE, RUN_TAG
    if RUN_TAG != MANIFEST['run']:
        raise RuntimeError('Training configuration does not match the served model')
    torch.set_num_threads(2)
    # CPU is the hosting baseline. No ImageNet download is needed to load full weights.
    model = BoneAgeModel(backbone=BACKBONE, pretrained=False).eval()
    model.load_state_dict(torch.load(path, map_location='cpu', weights_only=True), strict=True)
    _model = model
    return True


def model_status():
    return {'ready': _model is not None, 'modelVersion': MODEL_VERSION,
            'maeMonths': MODEL_MAE_MONTHS, 'validationSamples': MANIFEST['validationSamples'],
            'accuracyWithin12Months': MANIFEST['accuracyWithin12Months'],
            'screeningNote': SCREENING_NOTE}


def validate_image(raw):
    # Inspect dimensions before decoding a potentially oversized compressed image.
    from io import BytesIO
    from PIL import Image, UnidentifiedImageError
    try:
        with Image.open(BytesIO(raw)) as image:
            if image.format not in ('JPEG', 'PNG'):
                raise ValueError('Use a JPEG or PNG image')
            if image.width * image.height > 16_000_000:
                raise ValueError('Image exceeds 16 megapixels')
            if image.mode not in ('L', 'RGB'):
                raise ValueError('Export an 8-bit grayscale or RGB JPEG/PNG image')
            image.verify()
            return 'image/jpeg' if image.format == 'JPEG' else 'image/png'
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise ValueError('Image is unreadable. Export an 8-bit JPEG or PNG') from error


def predict_bone_age(raw, is_male):
    if _model is None:
        raise RuntimeError('Bone age model is unavailable')
    import torch
    from torchvision.io import decode_image
    from .src.train import val_transform
    from .src.evaluate import tta_predict
    validate_image(raw)
    with _lock, torch.inference_mode():
        decoded = decode_image(torch.frombuffer(bytearray(raw), dtype=torch.uint8))
        image = val_transform(decoded).unsqueeze(0)
        sex = torch.tensor([float(is_male)], dtype=torch.float32)
        months = float(tta_predict(_model, image, sex).item())
    if not math.isfinite(months) or not 0 <= months <= 300:
        raise ValueError('The model could not produce a valid bone age')
    return months

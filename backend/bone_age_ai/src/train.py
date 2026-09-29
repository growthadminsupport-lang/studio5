import os
import random
import time
from datetime import datetime

import cv2
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import transforms

from .dataset import BoneAgeDataset
from .model import BoneAgeModel

# ─────────────────────────────────────────────
# CONFIG — edit these paths/values for your setup
# ─────────────────────────────────────────────
# Resolve paths relative to this file's location (src/), not the current
# working directory — so these work whether you run `python3 main.py` from
# inside src/, from the project root, or anywhere else.
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SRC_DIR)

DATA_DIR = os.path.join(PROJECT_ROOT, "data")
TRAIN_CSV = os.path.join(DATA_DIR, "train.csv")
VAL_CSV = os.path.join(DATA_DIR, "validate.csv")

TRAIN_IMG_DIR = os.path.join(DATA_DIR, "boneage-training-dataset")
VAL_IMG_DIR = os.path.join(DATA_DIR, "boneage-validation-dataset-1")  # already merged with dataset-2

MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
CHECKPOINT_PATH = os.path.join(MODELS_DIR, "best_model_refine8.pth")

# Opt-in experiment: default imports (including serving) retain refine8.
RUN_TAG = os.environ.get("STUDIO5_RUN", "refine8")
if RUN_TAG not in ("refine8", "refine9_b5_456", "refine10_b7_600"):
    raise ValueError(f"Unknown STUDIO5_RUN: {RUN_TAG}")
BACKBONE = {"refine8": "b3", "refine9_b5_456": "b5", "refine10_b7_600": "b7"}[RUN_TAG]
ARTIFACT_PREFIX = "refine9" if RUN_TAG == "refine9_b5_456" else RUN_TAG
SEED = 42
CHECKPOINT_PATH = os.path.join(MODELS_DIR, f"best_model_{RUN_TAG}.pth")

IMG_SIZE = 320            # bumped up from 224 for finer growth-plate detail
BATCH_SIZE = 16           # kept at refine3's value — smoke test showed B3 only needs ~1.6GB VRAM here, plenty of headroom
if RUN_TAG == "refine9_b5_456":
    IMG_SIZE, BATCH_SIZE = 456, 4
elif RUN_TAG == "refine10_b7_600":
    IMG_SIZE, BATCH_SIZE = 600, 2
NUM_EPOCHS = 40           # cosine annealing benefits from a few more epochs than plateau-based training
LEARNING_RATE = 5e-5      # lowered from 1e-4 — less risk of overwriting pretrained features
NUM_WORKERS = 8           # bumped up from 0 — 28 cores available on this WSL box

# Cosine annealing config (single decay over the full run — see refine3 notes)
COSINE_T_MAX = NUM_EPOCHS  # epochs for LR to decay from LEARNING_RATE down to COSINE_ETA_MIN
COSINE_ETA_MIN = 1e-6      # minimum LR at the end of the run

USE_AMP = torch.cuda.is_available()  # mixed precision only helps on CUDA

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


# ─────────────────────────────────────────────
# Image preprocessing + augmentation pipeline
# ─────────────────────────────────────────────
"""
PIPELINE (in order) — refine8, set up 2026-09-07 (see MEMORY.md § 10).
This pass combines refine6's preprocessing (crop_to_hand + letterbox
resize_with_padding, both wired back in below) with refine7's RandomAffine
augmentation, which is left exactly as refine7 ran it.

Rationale: refine6 (crop+letterbox, MAE 8.23) and refine7 (affine aug,
MAE 8.14) each changed ONE thing against refine5's baseline (MAE 8.12) and
were each evaluated in isolation; neither beat it. § 9 item 10a closed out
cropping with the caveat "not recommending further investment in cropping
unless combined with one of the options below" — the crop+affine
combination had never actually been run. This is that run.

1. Crop to the hand bounding box — removes the black background margin,
   MUST run before CLAHE (whose tiled local contrast is distorted when
   most tiles are background)
2. CLAHE contrast enhancement — deterministic, applied to train AND val/test
   (this is preprocessing, not random augmentation, so it must be consistent
   across all splits or train/val distributions won't match)
3. Letterbox resize -> 320x320 — aspect-ratio-preserving scale + pad, NOT a
   squish; refine4 regressed by squishing the variable-aspect crop box
4. Ensure 3 channels (repeat grayscale channel if needed)
5. [TRAIN ONLY] RandomAffine: rotation (+-15 deg) + zoom (+-10%) +
   shear (+-10 deg) + translate (+-5%)
6. [TRAIN ONLY] Brightness/contrast jitter (+-15%)
7. [TRAIN ONLY] Horizontal flip (bone age is laterality-independent, safe to flip)
8. Normalize (ImageNet mean/std, matches pretrained backbone)

KNOWN RISK for this combination: cropping removes the background margin, so
after letterboxing the hand fills the frame much more tightly than in the
no-crop pipeline refine7's RandomAffine was tuned against. The affine's
translate/scale/shear/rotation therefore have less slack before they push
anatomy out of frame — crop_to_hand's pad_frac=0.10 plus the one-axis
letterbox padding is the only buffer. Checked visually before training
(outputs/augmentation_samples_refine8/); flagged here because it is the
main reason these two changes may not be additive.
"""


def crop_to_hand(img, pad_frac=0.10, border_strip_frac=0.02,
                  min_area_frac=0.00015, min_fill_ratio=0.15,
                  marker_intensity_thresh=150, merge_gap_frac=0.10):
    """
    Bounding-box crop around the hand, removing the black background
    margin most RSNA images have. Must run BEFORE apply_clahe: CLAHE's
    tiled local-contrast computation is distorted when most tiles are
    background.

    NOT currently wired into train_transform/val_transform below — this
    is refine4's crop step (git stash "refine4 hand-crop experiment"),
    fixed here (v2) but adopting it into the live pipeline + retraining
    is a separate decision, see MEMORY.md § 9 item 10a.

    img: uint8 tensor, shape [C, H, W] — C may be 1 or 3.

    v2 (fixed): the original refine4 version kept only the single
    largest Otsu-thresholded connected component. That silently dropped
    real anatomy whenever the hand fragmented into multiple components
    — splayed fingers/thumb with a real gap, or a low-contrast joint
    breaking a finger in two. Measured on a 30-image validation sample:
    70% of crops lost part of a finger or the whole thumb this way.

    Fixed by merging back in any component that plausibly belongs to
    the hand, filtering out the three things that made "just merge
    everything nearby" unsafe in the original attempt (which fused in
    the "L/R" laterality marker):
      - too small           -> noise speck from thresholding
      - low fill ratio       -> thin sparse ring/vignette border artifact,
                                not a solid anatomical piece (real
                                fragments measured ~0.3-0.65 fill;
                                border artifacts ~0.01-0.06)
      - high mean intensity  -> radiopaque marker (lead blocks nearly
                                all signal): measured ~150-225 mean
                                intensity here vs ~70-95 for soft
                                tissue/bone, clean gap with no overlap
                                in [132, 155] across 309 components
                                sampled from 40 images
      - too far away         -> unrelated noise/border fragment, not
                                part of this hand (iterative merge
                                against the growing bbox, not just the
                                original largest component, so chained
                                fragments — e.g. fingertip -> finger ->
                                palm — still get picked up)

    Re-validated after the fix on the same 30-image sample: 0/28
    remaining cases lose real anatomy (was 21/30). The largest
    component is always kept unconditionally regardless of its own
    mean intensity — verified safe since the hand is always far larger
    than the marker, including on overall-brighter-exposure images
    where the whole hand's mean intensity can itself exceed
    marker_intensity_thresh.

    v3 (tuning pass, 2026-09-04): re-checked v2 against the original
    30-image sample plus 100 fresh random validation images (using an
    independent measurement — an Otsu mask of the whole original image
    diffed against the crop box, not crop_to_hand's own logic) and
    found no case of real anatomy clipped by the box itself. Every
    high "clipped area" reading traced back to something that should
    be excluded: the L/R marker, a thin scan-artifact line near the
    border, or (id 14325) a second, smaller exposure double-printed
    onto the same film. What did surface: one genuine anatomical
    fragment (a distal-phalanx piece split off by a low-contrast
    joint) missed the merge-back area filter by 9px out of a ~780px
    threshold (774 vs 783) — not visibly clipped in that image only
    because padding happened to cover the gap, but a near-miss that
    isn't safe to rely on in general. Tightened two defaults in
    response: min_area_frac 0.0003 -> 0.00015 (halves the area floor
    for merge-back — still far above real noise specks, which measured
    9-58px on a ~2.6M px image, i.e. 3-4 orders of magnitude below the
    new floor) and pad_frac 0.08 -> 0.10 (cheap extra margin; the crop
    already discards most background so a couple more percent costs
    little). No retrain implied by this alone — still not wired into
    train_transform/val_transform.
    """
    img_np = img[0].numpy() if img.shape[0] in (1, 3) else img.squeeze(0).numpy()
    H, W = img_np.shape

    bs = int(min(H, W) * border_strip_frac)
    work = img_np.copy()
    work[:bs, :] = 0
    work[-bs:, :] = 0
    work[:, :bs] = 0
    work[:, -bs:] = 0

    blurred = cv2.GaussianBlur(work, (5, 5), 0)
    _, th = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    th = cv2.morphologyEx(th, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(th, connectivity=8)
    if num_labels <= 1:
        return img  # no foreground found — keep the original image

    comps = stats[1:]  # drop background row (label 0)
    areas = comps[:, cv2.CC_STAT_AREA]
    largest_idx = int(np.argmax(areas))

    img_area = H * W
    min_area = min_area_frac * img_area
    merge_gap = merge_gap_frac * min(H, W)

    def box_gap(a, b):
        ax0, ay0, aw, ah = a
        ax1, ay1 = ax0 + aw, ay0 + ah
        bx0, by0, bw, bh = b
        bx1, by1 = bx0 + bw, by0 + bh
        dx = max(ax0 - bx1, bx0 - ax1, 0)
        dy = max(ay0 - by1, by0 - ay1, 0)
        return max(dx, dy)

    merged_ids = {largest_idx}
    mx0, my0, mw, mh, _ = comps[largest_idx]
    merged_box = (int(mx0), int(my0), int(mw), int(mh))

    changed = True
    while changed:
        changed = False
        for i in range(len(comps)):
            if i in merged_ids:
                continue
            x, y, w, h, area = comps[i]
            if area < min_area:
                continue
            if area / (w * h) < min_fill_ratio:
                continue
            mask = labels[y:y + h, x:x + w] == (i + 1)
            mean_intensity = work[y:y + h, x:x + w][mask].mean()
            if mean_intensity > marker_intensity_thresh:
                continue
            if box_gap(merged_box, (int(x), int(y), int(w), int(h))) > merge_gap:
                continue
            nx0, ny0 = min(merged_box[0], x), min(merged_box[1], y)
            nx1 = max(merged_box[0] + merged_box[2], x + w)
            ny1 = max(merged_box[1] + merged_box[3], y + h)
            merged_box = (nx0, ny0, nx1 - nx0, ny1 - ny0)
            merged_ids.add(i)
            changed = True

    x0, y0, w, h = merged_box
    x1, y1 = x0 + w, y0 + h

    padx, pady = int(w * pad_frac), int(h * pad_frac)
    x0, y0 = max(0, x0 - padx), max(0, y0 - pady)
    x1, y1 = min(W, x1 + padx), min(H, y1 + pady)

    return img[:, y0:y1, x0:x1]


def apply_clahe(img):
    """
    Contrast Limited Adaptive Histogram Equalization.
    X-rays often have uneven exposure across hospitals/scanners; CLAHE
    enhances local contrast so growth plate boundaries are more visible
    to the model. Must run on a single-channel uint8 image (cv2 requirement),
    so this happens BEFORE dtype conversion and BEFORE channel expansion.

    img: uint8 tensor, shape [C, H, W] — C may be 1 or 3 depending on
         how the source PNG was stored.
    """
    if img.shape[0] == 3:
        # if stored as RGB (channels likely identical for an X-ray), just take one
        img = img[0:1]

    img_np = img.squeeze(0).numpy()  # [H, W], uint8
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(img_np)
    return torch.from_numpy(enhanced).unsqueeze(0)  # back to [1, H, W]


def resize_with_padding(img, size=IMG_SIZE, fill=0):
    """
    Aspect-ratio-preserving resize to size x size ("letterbox"): scales the
    image so its longer side equals `size`, then pads the shorter side with
    `fill` to reach a square. Replaces the plain transforms.Resize call,
    which squishes non-square input to a fixed square.

    Must run AFTER crop_to_hand()/apply_clahe() and BEFORE
    ConvertImageDtype — like the Resize call it replaces, this expects
    (and returns) a uint8 tensor.

    fill=0 (black) matches this dataset's uniformly black scanner
    background — the padding bars are more of a pixel value already
    present pre-crop, not an out-of-distribution constant region.

    Resizes first (uniform scale, no distortion), then pads — padding the
    original crop to a square canvas first would build a canvas as large
    as the crop's longer side before downsampling, wasting compute for an
    identical result.

    refine4 squished the variable-aspect crop box directly to size x size
    and regressed (MEMORY.md § 10, 2026-08-13): crop bbox aspect ratio has
    ~25% higher variance than the original full-frame ratio, so squishing
    it added more shape-distortion noise than squishing the (more
    consistent) full frame did. This removes that squish distortion
    entirely by preserving the true aspect ratio and padding the rest.
    """
    _, h, w = img.shape
    scale = size / max(h, w)
    new_h, new_w = max(1, round(h * scale)), max(1, round(w * scale))
    resized = transforms.functional.resize(img, [new_h, new_w], antialias=True)

    pad_h, pad_w = size - new_h, size - new_w
    top, bottom = pad_h // 2, pad_h - pad_h // 2
    left, right = pad_w // 2, pad_w - pad_w // 2

    return transforms.functional.pad(resized, [left, top, right, bottom], fill=fill)


def ensure_three_channels(img):
    """
    transforms.Grayscale only converts RGB -> grayscale, it does NOT expand
    1-channel -> 3-channel. This handles both cases safely: repeats the
    channel 1->3 if needed, leaves already-3-channel images untouched.
    """
    if img.shape[0] == 1:
        img = img.repeat(3, 1, 1)
    return img


train_transform = transforms.Compose([
    # crop BEFORE apply_clahe: CLAHE's tiled local-contrast computation is
    # distorted when most tiles are background (see crop_to_hand's docstring).
    transforms.Lambda(crop_to_hand),
    transforms.Lambda(apply_clahe),
    # letterbox instead of a plain squish Resize — refine4's postmortem showed
    # the crop bbox's aspect ratio varies ~25% more than the full frame's, so
    # squishing a crop adds more distortion than squishing the full image.
    transforms.Lambda(resize_with_padding),
    transforms.ConvertImageDtype(torch.float32),  # decode_image returns uint8, scale to [0,1]
    transforms.Lambda(ensure_three_channels),
    # RandomAffine folds rotation (unchanged range, ±15°) together with three
    # new geometric augmentations added 2026-09-06 at the user's request, in
    # response to a literature check showing zoom/shear/translation are
    # common alongside rotation+flip in bone-age augmentation pipelines
    # (MEMORY.md § 10): scale=zoom (±10%, similar order to the existing
    # brightness/contrast jitter's ±15%), shear (±10°, a common default seen
    # in Keras-ImageDataGenerator-style bone-age pipelines), translate (±5%
    # of each dimension — kept modest since the hand is already CLAHE/resize-
    # framed and a large shift risks pushing anatomy out of frame). One
    # combined affine op (not a separate RandomAffine stacked after
    # RandomRotation) matches how the literature applies these together as
    # a single transform, and avoids compounding two independent affine
    # warps. fill=0 matches this dataset's black scanner background, same
    # rationale as resize_with_padding's fill (unwired, see § 4).
    transforms.RandomAffine(degrees=15, translate=(0.05, 0.05), scale=(0.9, 1.1), shear=10, fill=0),
    transforms.ColorJitter(brightness=0.15, contrast=0.15),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])

val_transform = transforms.Compose([
    # must mirror train_transform's deterministic preprocessing exactly —
    # crop + letterbox are preprocessing, not augmentation, so train/val
    # distributions only match if both do them (CLAUDE.md).
    transforms.Lambda(crop_to_hand),
    transforms.Lambda(apply_clahe),
    transforms.Lambda(resize_with_padding),
    transforms.ConvertImageDtype(torch.float32),
    transforms.Lambda(ensure_three_channels),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])


# ─────────────────────────────────────────────
# Train / validate loops
# ─────────────────────────────────────────────
if RUN_TAG in ("refine9_b5_456", "refine10_b7_600"):
    # Refine5 preprocessing/augmentation at the approved new resolution.
    train_transform = transforms.Compose([
        transforms.Lambda(apply_clahe),
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ConvertImageDtype(torch.float32),
        transforms.Lambda(ensure_three_channels),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])
    val_transform = transforms.Compose([
        transforms.Lambda(apply_clahe),
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ConvertImageDtype(torch.float32),
        transforms.Lambda(ensure_three_channels),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def seed_run():
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    torch.cuda.manual_seed_all(SEED)


def seed_worker(worker_id):
    worker_seed = torch.initial_seed() % 2**32
    random.seed(worker_seed)
    np.random.seed(worker_seed)


def train_one_epoch(model, loader, optimizer, criterion, device, scaler):
    model.train()
    running_loss = 0.0

    for imgs, genders, targets in loader:
        imgs = imgs.to(device)
        genders = genders.to(device)
        targets = targets.to(device)

        optimizer.zero_grad()
        with torch.autocast(device_type=device.type, enabled=USE_AMP):
            outputs = model(imgs, genders)
            loss = criterion(outputs, targets)

        if not torch.isfinite(loss):
            raise RuntimeError("Non-finite training loss")

        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()

        running_loss += loss.item() * imgs.size(0)

    return running_loss / len(loader.dataset)


@torch.no_grad()
def validate(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0

    for imgs, genders, targets in loader:
        imgs = imgs.to(device)
        genders = genders.to(device)
        targets = targets.to(device)

        with torch.autocast(device_type=device.type, enabled=USE_AMP):
            outputs = model(imgs, genders)
            loss = criterion(outputs, targets)

        running_loss += loss.item() * imgs.size(0)

    return running_loss / len(loader.dataset)


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    if os.path.exists(CHECKPOINT_PATH):
        raise FileExistsError(f"Refusing to overwrite existing run: {CHECKPOINT_PATH}")
    if RUN_TAG in ("refine9_b5_456", "refine10_b7_600") and not USE_AMP:
        raise RuntimeError("Large-backbone runs require CUDA AMP")
    seed_run()
    started = time.monotonic()
    print(f"START {datetime.now().isoformat()} run={RUN_TAG} backbone={BACKBONE} seed={SEED}", flush=True)
    print(f"Image size={IMG_SIZE}, batch={BATCH_SIZE}, epochs={NUM_EPOCHS}, lr={LEARNING_RATE}")
    print(f"Training transform: {train_transform}")
    print(f"Using device: {DEVICE}")
    os.makedirs(MODELS_DIR, exist_ok=True)

    train_dataset = BoneAgeDataset(
        label_dir=TRAIN_CSV,
        img_dir=TRAIN_IMG_DIR,
        transform=train_transform,
    )
    val_dataset = BoneAgeDataset(
        label_dir=VAL_CSV,
        img_dir=VAL_IMG_DIR,
        transform=val_transform,
    )

    print(f"Train samples: {len(train_dataset)} | Val samples: {len(val_dataset)}")

    train_loader = DataLoader(
        train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=NUM_WORKERS,
        worker_init_fn=seed_worker, generator=torch.Generator().manual_seed(SEED)
    )
    val_loader = DataLoader(
        val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS
    )

    model = BoneAgeModel(backbone=BACKBONE).to(DEVICE)
    criterion = nn.L1Loss()  # MAE loss, matches our reported evaluation metric
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=COSINE_T_MAX, eta_min=COSINE_ETA_MIN
    )
    scaler = torch.amp.GradScaler(device=DEVICE.type, enabled=USE_AMP)

    print(f"Mixed precision (AMP): {'ON' if USE_AMP else 'OFF'}")

    best_val_mae = float("inf")

    for epoch in range(1, NUM_EPOCHS + 1):
        epoch_start = time.monotonic()
        if USE_AMP:
            torch.cuda.reset_peak_memory_stats()
        train_mae = train_one_epoch(model, train_loader, optimizer, criterion, DEVICE, scaler)
        val_mae = validate(model, val_loader, criterion, DEVICE)
        scheduler.step()  # cosine annealing steps per-epoch, no metric needed

        current_lr = optimizer.param_groups[0]["lr"]
        print(
            f"Epoch [{epoch}/{NUM_EPOCHS}] "
            f"Train MAE: {train_mae:.2f} months | "
            f"Val MAE: {val_mae:.2f} months | "
            f"LR: {current_lr:.2e} | Seconds: {time.monotonic() - epoch_start:.1f} | "
            f"Time: {datetime.now().isoformat()} | "
            f"Peak reserved MiB: {torch.cuda.max_memory_reserved() / 2**20 if USE_AMP else 0:.0f}",
            flush=True,
        )

        if val_mae < best_val_mae:
            best_val_mae = val_mae
            torch.save(model.state_dict(), CHECKPOINT_PATH)
            print(f"  -> New best model saved (Val MAE: {best_val_mae:.2f} months)")

    print(f"\nTraining complete. Best Val MAE: {best_val_mae:.2f} months")
    print(f"Best model saved to: {CHECKPOINT_PATH}")
    print(f"END {datetime.now().isoformat()} elapsed_seconds={time.monotonic() - started:.1f}", flush=True)


if __name__ == "__main__":
    main()

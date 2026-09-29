import os

import numpy as np
import pandas as pd
import torch
import torchvision.transforms.functional as TF
from torch.utils.data import DataLoader

from .dataset import BoneAgeDataset
from .model import BoneAgeModel
from .train import val_transform, VAL_CSV, VAL_IMG_DIR, CHECKPOINT_PATH, BATCH_SIZE, NUM_WORKERS, DEVICE, PROJECT_ROOT, RUN_TAG, BACKBONE

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
PREDICTIONS_OUTPUT_CSV = os.path.join(PROJECT_ROOT, "outputs", f"val_predictions_{RUN_TAG}.csv")
ACCURACY_WINDOW_MONTHS = 12  # "accuracy within ±12 months" from your performance target slide
USE_TTA = True               # averages predictions across multiple augmented views, no retraining needed


def tta_predict(model, imgs, genders):
    """
    Test-Time Augmentation: runs the model on several augmented views of
    the same image (original, horizontal flip, +5deg, -5deg) and averages
    the predictions. Free accuracy boost — no retraining required.
    Safe to flip/rotate here since these operations commute with the
    Normalize step already baked into val_transform.
    """
    variants = [
        imgs,
        torch.flip(imgs, dims=[3]),   # horizontal flip
        TF.rotate(imgs, angle=5),
        TF.rotate(imgs, angle=-5),
    ]

    preds_sum = torch.zeros(imgs.size(0), device=imgs.device)
    for variant in variants:
        preds_sum += model(variant, genders)

    return preds_sum / len(variants)


@torch.no_grad()
def run_inference(model, loader, device, use_tta=True):
    """
    Runs the model over the full loader once, collecting every
    prediction, ground-truth target, and gender for metric computation
    and later breakdown analysis (e.g. MAE by sex).
    If use_tta=True, averages predictions across multiple augmented
    views of each image instead of a single forward pass.
    """
    model.eval()
    all_preds = []
    all_targets = []
    all_genders = []

    for imgs, genders, targets in loader:
        imgs = imgs.to(device)
        genders_device = genders.to(device)

        if use_tta:
            outputs = tta_predict(model, imgs, genders_device)
        else:
            outputs = model(imgs, genders_device)

        all_preds.append(outputs.cpu().numpy())
        all_targets.append(targets.numpy())
        all_genders.append(genders.numpy())  # 1.0 = male, 0.0 = female

    all_preds = np.concatenate(all_preds)
    all_targets = np.concatenate(all_targets)
    all_genders = np.concatenate(all_genders)

    return all_preds, all_targets, all_genders


def compute_metrics(preds, targets, accuracy_window=12):
    """
    Computes all metrics mentioned in the performance target:
    - MAE (primary)
    - MSE (secondary)
    - R^2 (secondary)
    - Accuracy within +-N months (secondary)
    """
    errors = preds - targets
    abs_errors = np.abs(errors)

    mae = abs_errors.mean()
    mse = (errors ** 2).mean()

    ss_res = ((targets - preds) ** 2).sum()
    ss_tot = ((targets - targets.mean()) ** 2).sum()
    r2 = 1 - (ss_res / ss_tot)

    within_window = (abs_errors <= accuracy_window).mean() * 100

    return {
        "mae": mae,
        "mse": mse,
        "r2": r2,
        "accuracy_within_window_pct": within_window,
    }


def main():
    if os.path.exists(PREDICTIONS_OUTPUT_CSV):
        raise FileExistsError(f"Refusing to overwrite predictions: {PREDICTIONS_OUTPUT_CSV}")
    print(f"Using device: {DEVICE}")

    # Load validation/test dataset
    val_dataset = BoneAgeDataset(
        label_dir=VAL_CSV,
        img_dir=VAL_IMG_DIR,
        transform=val_transform,
    )
    val_loader = DataLoader(
        val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS
    )
    print(f"Evaluation samples: {len(val_dataset)}")

    # Load trained model
    if not os.path.exists(CHECKPOINT_PATH):
        raise FileNotFoundError(
            f"No checkpoint found at {CHECKPOINT_PATH}. Run train.py first."
        )

    model = BoneAgeModel(backbone=BACKBONE, pretrained=False).to(DEVICE)
    model.load_state_dict(torch.load(CHECKPOINT_PATH, map_location=DEVICE, weights_only=True))
    print(f"Loaded checkpoint: {CHECKPOINT_PATH}")
    print(f"Test-Time Augmentation: {'ON (4-way avg)' if USE_TTA else 'OFF'}")

    # Run inference
    preds, targets, genders = run_inference(model, val_loader, DEVICE, use_tta=USE_TTA)

    # Compute overall metrics
    metrics = compute_metrics(preds, targets, accuracy_window=ACCURACY_WINDOW_MONTHS)

    print("\n" + "=" * 50)
    print("FINAL EVALUATION RESULTS")
    print("=" * 50)
    print(f"MAE (Mean Absolute Error):     {metrics['mae']:.2f} months")
    print(f"MSE (Mean Squared Error):      {metrics['mse']:.2f}")
    print(f"R^2 Score:                     {metrics['r2']:.4f}")
    print(
        f"Accuracy within +/-{ACCURACY_WINDOW_MONTHS} months:  "
        f"{metrics['accuracy_within_window_pct']:.1f}%"
    )
    print("=" * 50)

    # Breakdown by sex (male=1.0, female=0.0) — TOR Section 6.3 asks for this
    male_mask = genders == 1.0
    female_mask = genders == 0.0

    male_metrics = compute_metrics(preds[male_mask], targets[male_mask], ACCURACY_WINDOW_MONTHS)
    female_metrics = compute_metrics(preds[female_mask], targets[female_mask], ACCURACY_WINDOW_MONTHS)

    print("\nBREAKDOWN BY SEX")
    print("-" * 50)
    print(f"Male   (n={male_mask.sum():4d}):  MAE = {male_metrics['mae']:.2f} months")
    print(f"Female (n={female_mask.sum():4d}):  MAE = {female_metrics['mae']:.2f} months")
    print("-" * 50)

    # Save per-sample predictions for documentation / report (D4 deliverable)
    os.makedirs(os.path.dirname(PREDICTIONS_OUTPUT_CSV), exist_ok=True)
    results_df = pd.DataFrame({
        "id": pd.read_csv(VAL_CSV)["id"].to_numpy(),
        "true_boneage_months": targets,
        "predicted_boneage_months": preds,
        "abs_error_months": np.abs(preds - targets),
        "male": genders.astype(bool),
    })
    results_df.to_csv(PREDICTIONS_OUTPUT_CSV, index=False, mode="x")
    print(f"\nPer-sample predictions saved to: {PREDICTIONS_OUTPUT_CSV}")


if __name__ == "__main__":
    main()

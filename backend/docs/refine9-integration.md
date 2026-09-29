# Refine9 website integration

The selected checkpoint is `best_model_refine9_b5_456.pth`, EfficientNet-B5 at 456 x 456 pixels, with original, horizontal-flip, +5 degree and -5 degree inference averaged. It predicts months directly. No age conversion or confidence score is invented.

All saved single-model validation CSVs were recomputed on 2026-09-29. Refine9 has the lowest MAE: 7.425048931 months on 1,425 images, with 80.210526% within 12 months. Refine5 is 8.1200224, refine8 is 8.197286886, and refine10 is 20.488415724. These are repeatedly used research validation results, not independent clinical validation. MAE is an average absolute error, not an individual confidence interval.

## Source and weight

`bone_age_ai/src/train.py` is the vendored source of truth for transforms and configuration. `model.py`, `dataset.py` and `evaluate.py` are copied with only relative-import changes. Serving imports `val_transform` and `tta_predict`; it does not implement a second preprocessing pipeline. Source SHA-256 values and the weight SHA-256 are pinned in `bone_age_ai/manifest.json`.

The 115,444,602-byte checkpoint is installed locally at `bone_age_ai/models/`, which is ignored by Git. Its checksum is `18ba920a8d2eada0198477619b2b1945df98f028384aeae0fafc8aa82987491c`.

Publication as a public GitHub release asset is pending explicit approval. Automatic approval review rejected that separate disclosure. Until the release is published, the configured deployment download URL will not work. Once approved, the intended release is `refine9-b5-456-v1` in `growthadminsupport-lang/studio5`.

## Run locally

Use Python 3.12. The web environment is separate from the research CUDA environment.

```powershell
python -m venv venv
venv\Scripts\python -m pip install -r requirements.txt -r requirements-model.txt
venv\Scripts\python -m bone_age_ai.download
```

Before serving, apply `migrations/2026-09-29_refine9_bone_age.sql` to the existing schema. The migration adds status and private image bytes while preserving older completed predictions. Older filesystem images are not imported automatically.

```powershell
psql -v ON_ERROR_STOP=1 -f migrations/2026-09-29_refine9_bone_age.sql
venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The API loads and checksum-verifies the full checkpoint once at startup. `/ready` verifies database connectivity and model readiness, returning 503 when the weight is unavailable. A wrong checksum fails startup. The existing production configuration checks still require a working SMTP or Resend email provider.

## API and persistence

All `/api/bone-age` operations require the existing account access token.

| Operation | Behaviour |
| --- | --- |
| `GET /api/bone-age/model` | Readiness, model version, validation MAE, sample count and screening note |
| `POST /api/bone-age` | Multipart `file` and `childId`; returns 201 with `PENDING` |
| `GET /api/bone-age?childId=UUID` | Owned child's saved history |
| `GET /api/bone-age/UUID/image` | Owned image bytes, `Cache-Control: no-store` |
| `DELETE /api/bone-age/UUID` | Deletes the prediction and its private image bytes together |

Sex comes from the owned child profile. File bytes and dimensions are validated: JPEG/PNG, 10 MiB maximum, 16 megapixels maximum, 8-bit grayscale or RGB. The model does not establish whether an otherwise valid image is a hand X-ray.

X-rays are stored privately in the existing PostgreSQL table, not a public upload directory. History queries defer the image bytes. Child deletion cascades over prediction rows and images. Backups of the database contain medical images and should receive the same protection as the database.

Inference runs outside the request event loop, serially. An advisory transaction lock limits pending work to four jobs globally and one per child. There is one uvicorn worker. Interrupted `PENDING` rows become `FAILED` on startup; the UI asks the parent to upload again. For multiple instances or guaranteed retries, replace in-process background work with a durable worker.

## Website and deployment

The prediction page fetches real owned child profiles, polls only pending predictions, shows the model output and average validation error, and retrieves previews through authenticated requests. The incoming child/profile and CDC growth work is preserved. The prediction page reuses its shared useChildren helper, including selected-child persistence.

Vercel must use root directory `frontend`, build `npm run build`, output `dist`, and environment variable `VITE_API_URL` pointing at the hosted FastAPI service. `frontend/vercel.json` fixes refreshes and direct navigation to React routes.

The root render.yaml blueprint uses root directory `backend`, branch `Backend+AI`, Python 3.12, CPU dependencies, and the verified weight downloader. The existing init_database.py initializer now applies the additive model migration on startup, alongside its authentication/CDC migrations. Initialization was run twice against the disposable database: 1,308 CDC rows added on the first run, zero on the second, existing accounts/predictions preserved. Set `CORS_ORIGINS` to the frontend domain and `APP_BASE_URL` to its URL, along with the existing database/JWT/SMTP configuration.

The existing blueprint is on a free hosting plan. After a real CPU prediction, the Windows API working set was 587.8 MiB and private committed memory was 1,413.5 MiB. These are Windows measurements, not a Linux memory benchmark. Hosting memory fit has not been established. No paid plan was selected or purchased.

On 2026-09-29, the public `studio5-phi.vercel.app` site served the main-branch demo. It had no authentication API or refine9 integration in its JavaScript, and `/login` returned 404. GitHub deployment records confirm that `Backend+AI` produces a Preview deployment. Pushing this branch does not update that production domain.

## Verified locally

- Recomputed nine saved single-model validation files; refine9 remains best.
- Five original validation images, both sexes: ten exact source-versus-serving checks, zero transform or prediction drift in the existing Linux environment.
- Fresh Windows CPU runtime installed from the pinned hosting requirements.
- Real HTTP/PostgreSQL/model check: pending upload, completed result 28.04 months for female validation image 1386, profile sex overriding supplied form sex, persisted history, exact private image roundtrip, guardian isolation, file type/byte/pixel limits, and deletion. End-to-end 1.11 seconds in the final merged local test (2.24 seconds in the first test).
- All twelve backend regression files passed after reconciling the incoming branch changes. Frontend build and targeted lint passed.
- Real browser login and upload displayed 28.0 months and validation average error 7.43 months.

Runnable check, against an explicitly disposable local database and the running API on port 8019:

```powershell
venv\Scripts\python tests/refine9_smoke_test.py --image PATH_TO_VALIDATION_IMAGE_1386_PNG
```

The check refuses a nonlocal/non-test database and seeds synthetic accounts. It does not send email, call Google, or touch production. The original dataset image is not committed.

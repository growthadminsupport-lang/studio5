# Git handoff

Repository: `https://github.com/Peetik0rn/growth-backend.git`
Current handoff branch: `main`.

This handoff includes backend fixes, regression tests, the local demo under `tests/`, and frontend integration documentation. The demo source helps the frontend team reproduce behavior; do not serve the tests directory in production.

## Review locally

From the repository root:

```powershell
git status --short
git diff --cached --stat
git diff --cached
git diff --cached --check
```

Review especially the authentication changes and the new frontend guides. Source, schemas, tests, documentation, and `.env.example` belong in Git. Local `.env`, virtual environments, logs, local demo credentials, database exports, and uploaded images do not.

## Commit and push

Once satisfied with the staged changes:

```powershell
git commit -m "Prepare backend and frontend integration handoff"
git push -u origin main
```

These commands are provided for the repository owner; documentation preparation itself does not publish changes.

If the push is rejected because the remote has newer commits, fetch and review the difference before merging or rebasing:

```powershell
git fetch origin
git log --oneline --left-right HEAD...origin/main
```

Do not force-push over teammates' work. If branch protection requires a pull request, push a feature branch and open a PR instead.

## Frontend team handoff

Share the repository and point the team to:

1. `README.md` for local setup and current scope.
2. `docs/frontend-api.md` for routes, CORS, and request/response examples.
3. `docs/frontend-auth-integration.md` for sessions and Google login.
4. `tests/growth-demo.md` for the local prototype.

Each developer needs their own local configuration and database, or an agreed shared environment. No production URL is verified yet, and local database contents are not included in the source push.

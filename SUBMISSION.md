# Submission guide

A checklist for getting this project reviewed, plus how to push it to a GitHub account that is different from the
one this machine is already signed in to.

## 1. Pre-submission checklist

- [ ] `data/results.json` holds a **full** run: 10 tasks x 8 models = 80 runs, with no errored runs left.
      Check with: `node -e 'const r=require("./data/results.json");console.log(r.source,r.runs.length,r.runs.filter(x=>x.error).length)'`
      (should print `orbio 80 0`). Fill gaps with `npm run bench`, which only redoes missing or errored runs.
- [ ] `npm run typecheck` passes
- [ ] `npm run verify-tasks` prints `ok` for all ten tasks
- [ ] `npm run build` succeeds
- [ ] No secret is tracked: `git ls-files | grep -E '^\.env'` prints only `.env.example`
- [ ] `README.md` clone-and-run steps work from a fresh clone (`npm install && npm run dev`)
- [ ] `NEXT_PUBLIC_SITE_URL` is set on the deployment, and `RACE_TOKEN` is empty
- [ ] Deployed site opens on `/`, `/race`, `/card`

## 2. Push to a different GitHub account

This Mac's default SSH key (`~/.ssh/id_ed25519`) and git identity belong to another account. Do **not** change the
global git config. Use one of the two options below, both scoped to this repo only.

### Option A: HTTPS + personal access token (simplest)

1. On the target GitHub account, create an empty repository (no README, no .gitignore, no licence).
2. Create a token: GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens.
   Scope it to that one repository with **Contents: Read and write**.
3. In this folder:

   ```bash
   git init -b main                                  # skip if already a repo
   git config user.name  "Your Name"                 # repo-local, not --global
   git config user.email "email-linked-to-that-github-account"
   git add -A
   git status                                        # confirm .env.local is NOT listed
   git commit -m "Initial commit"
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

4. When git asks for a password, paste the **token**, not your account password. The username is the GitHub username.
   If macOS Keychain has cached the other account's credentials, clear them first:

   ```bash
   printf 'protocol=https\nhost=github.com\n' | git credential-osxkeychain erase
   ```

### Option B: a dedicated SSH key for this account

1. Make a separate key so the existing one is untouched:

   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_orbio -C "email-linked-to-that-github-account"
   ```

2. Add the public key (`cat ~/.ssh/id_ed25519_orbio.pub`) at GitHub > Settings > SSH and GPG keys on the target account.
3. Add an alias to `~/.ssh/config`:

   ```
   Host github-orbio
     HostName github.com
     User git
     IdentityFile ~/.ssh/id_ed25519_orbio
     IdentitiesOnly yes
   ```

4. Use the alias as the remote host:

   ```bash
   git remote add origin git@github-orbio:<user>/<repo>.git
   git push -u origin main
   ```

   Test the login first with `ssh -T git@github-orbio`. It should greet the target account's username.

### Verify before you share the link

```bash
git log --format='%an <%ae>' | sort -u      # must be the identity you intend to publish
git ls-files | grep -E '\.env|\.zip|node_modules'   # should print only .env.example
```

## 3. If a key was ever committed

Rotate it first (claim a new Orbio key), then remove it from history. Deleting the file in a later commit does not
remove it from earlier ones. Anyone can read old commits.

## 4. Deploy (Vercel)

1. Import the GitHub repo at vercel.com/new.
2. Add the environment variable `NEXT_PUBLIC_SITE_URL` with the production URL. Do not add `ORBIO_API_KEY` or `RACE_TOKEN`.
3. Deploy, then open `/`, `/race` and `/card`.

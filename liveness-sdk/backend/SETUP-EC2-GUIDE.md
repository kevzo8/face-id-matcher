# SVI Liveness Backend — EC2 Setup Guide

Step-by-step guide to deploy the SVI Biometrics liveness backend to an EC2
instance with Docker. Follow these in order. Each section can be done on its own.

---

## 0. What you'll end up with

```
Client (app / SDK)
   │   POST http://<EC2-PUBLIC-IP>:8000/api/v1/liveness
   ▼
EC2 instance (port 8000 open)
   └── Docker container "svi-liveness" → FastAPI app (port 8000)
```

Clients reach the API at the EC2's **public IP/DNS on port 8000**.

---

## 1. Connect to the EC2 instance

You need SSH access (you should have a `.pem` key).

```bash
ssh -i /path/to/your-key.pem ubuntu@<EC2-PUBLIC-IP>
# if the AMI uses ec2-user instead of ubuntu:
# ssh -i /path/to/your-key.pem ec2-user@<EC2-PUBLIC-IP>
```

> If you don't have the key or SSH access, ask your team/DevOps before going further.

---

## 2. Install Docker (if not already installed)

Check first:

```bash
docker --version && docker compose version
```

If Docker is **not** installed (Ubuntu):

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Then **log out and back in** (or run `newgrp docker`) so you can use `docker`
without `sudo`.

Verify:

```bash
docker --version
docker compose version
```

---

## 3. Get the backend files onto the EC2

Two options — pick one.

### Option A — Clone from SVI GitLab (recommended)

```bash
sudo apt-get install -y git
git clone git@gitlab.com:svi.ph/kyc-digital-verification/eKYC/core/web-apps/svi-biometrics-liveness-check-web-sdk.git
cd svi-biometrics-liveness-check-web-sdk/backend
```

> Make sure the EC2 has your SSH key registered in GitLab, or use HTTPS with a
> Personal Access Token.

### Option B — Copy files up (scp)

From your **local** machine:

```bash
# zip the backend folder locally first, then:
scp -i /path/to/your-key.pem -r backend ubuntu@<EC2-PUBLIC-IP>:~/liveness-backend
ssh -i /path/to/your-key.pem ubuntu@<EC2-PUBLIC-IP>
cd ~/liveness-backend
```

You only need the contents of `backend/` (Dockerfile, requirements.txt, run.py,
`.env`, and the `app/` folder).

---

## 4. Create the `.env` file (IMPORTANT)

`.env` holds your secrets. It is git-ignored — you must create it on the server.

```bash
cp .env.example .env
nano .env
```

Edit at minimum:

```ini
ENVIRONMENT=production        # or 'development' for a quick unauthenticated test
API_KEYS=sk_key1,sk_key2      # clients must send one of these as a Bearer token
AWS_ACCESS_KEY_ID=            # AWS Rekognition (optional; leave blank to run fallback-only)
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=ap-southeast-1
SESSION_TTL_MINUTES=5
RATE_LIMIT_PER_MINUTE=10
```

> Tip: keep `ENVIRONMENT=development` for your first smoke test so you don't
> need API keys yet. Switch to `production` when the client is ready.

---

## 5. Build and start with Docker Compose

```bash
docker compose up -d --build
```

Check it's running:

```bash
docker compose ps            # STATUS should be "Up"
```

---

## 6. Verify the API works

From the EC2:

```bash
curl http://localhost:8000/api/v1/health
```

Expected output (JSON with provider status):

```json
{"status":"ok","environment":"production","providers":{"open_face":true,"heuristic":true,"aws_detect_faces":...,"aws_detect_labels":...}}
```

Also test a live check:

```bash
# 1. Create a session
curl -X POST http://localhost:8000/api/v1/session/create \
  -H "Authorization: Bearer sk_key1"

# 2. Run passive liveness (replace <session_id> and <base64>)
curl -X POST http://localhost:8000/api/v1/liveness \
  -H "Authorization: Bearer sk_key1" \
  -H "Content-Type: application/json" \
  -d '{"mode":"passive","session_id":"<session_id>","image":"<base64>"}'
```

---

## 7. Open port 8000 so clients can reach it (AWS console)

This is the **#1 reason clients can't connect** — do not skip it.

1. Go to the **AWS EC2 console** → your instance → **Security** → **Security groups**.
2. Click the inbound rules → **Edit inbound rules**.
3. **Add rule**:
   - Type: **Custom TCP**
   - Port: **8000**
   - Source: **0.0.0.0/0** (or your clients' IP range)
4. Save.

---

## 8. Test from outside / give clients the URL

From **your local** machine (not the EC2):

```bash
curl http://<EC2-PUBLIC-IP>:8000/api/v1/health
```

If that works, clients use:

```
POST http://<EC2-PUBLIC-IP>:8000/api/v1/liveness
```

In the SDK, set `backendUrl` to that address:

```js
SviLiveness.create({
  backendUrl: 'http://<EC2-PUBLIC-IP>:8000',
  mode: 'passive',
  apiKey: 'sk_key1',          // only if ENVIRONMENT=production
  ...
});
```

---

## 9. Everyday commands

```bash
docker compose ps            # status
docker compose logs -f       # live logs
docker compose restart       # restart the app
docker compose down          # stop and remove
docker compose up -d --build # rebuild after code changes
```

To stop/start:

```bash
docker compose stop
docker compose start
```

---

## 10. Common problems & fixes

| Problem | Fix |
|---------|-----|
| `curl` to public IP times out / refused | Port 8000 not open in security group (see §7). |
| 401 "Missing Authorization" | `ENVIRONMENT=production` requires `Authorization: Bearer <key>`. |
| 401 "Invalid API key" | Key not in `API_KEYS` list. |
| 400 "Invalid or expired session" | Create a fresh session per check; sessions are one-time and expire in 5 min. |
| Container exits immediately | Check `docker compose logs`; often missing `.env` or wrong AWS keys. |
| Camera won't start in the browser | Plain HTTP blocks camera on non-localhost — needs HTTPS (see §11). |

---

## 11. Notes / follow-ups

- **HTTPS** — browsers block camera (`getUserMedia`) over plain HTTP except on
  `localhost`. For real clients, put the backend behind HTTPS (AWS **ALB + ACM
  cert**, or Nginx + Let's Encrypt). Not needed for an internal HTTP smoke test.
- **Sessions are in-memory** — they reset on container restart and won't share
  across multiple instances. For horizontal scaling, use Redis.
- **Rate limiting** — `RATE_LIMIT_PER_MINUTE` is a config value; enforce at a
  gateway for production.
- **No AWS keys?** The backend still runs in fallback-only mode (lower
  confidence). It only "fails" if you leave AWS config malformed.

---

*Repo: face-id-matcher → liveness-sdk/backend. This guide mirrors the deployment
documented in CPS-351-svi-biometrics-sdk-documentation.md (§13 Deployment).*

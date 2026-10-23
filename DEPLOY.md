# Deploying Trace on a VPS

## How it runs

```
Browser ──HTTPS──> Nginx ──┬── /            React build (static files)
                           ├── /api/*      ──> Node backend :5000 ──> MongoDB Atlas
                           └── /uploads/*  ──> Node backend :5000
                                                   │
                                                   └──> Python face engine 127.0.0.1:8000
                                                        (only Node can reach it; secret key)
```

Face matching flow:
1. Someone files a missing case with a photo → Node saves it (GPS data removed) and sends it to the face engine.
2. The engine finds the face, turns it into 512 numbers (a face "fingerprint", Facenet512) and saves it.
3. A found-person photo comes in → the engine compares its fingerprint with every saved one and returns the closest cases.
4. Node drops male↔female pairs, saves the rest as **Pending** matches, and an admin/police confirms or rejects them.

Everything runs on the one VPS. Only ports 22, 80 and 443 are open to the internet.

## 1. What VPS to buy

| | Minimum | Comfortable |
| --- | --- | --- |
| RAM | 4 GB (+ 2 GB swap) | 8 GB |
| CPU | 2 vCPU | 4 vCPU |
| Disk | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 or 24.04 LTS | same |

The face model (TensorFlow + Facenet512) alone uses roughly 1.5–2.5 GB of RAM, which is why 2 GB plans fail. No GPU needed. Also buy a **domain** (needed for HTTPS).

## 2. First login and basics

```bash
ssh root@YOUR_VPS_IP
adduser trace && usermod -aG sudo trace     # never run the app as root
su - trace

sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx python3-venv python3-pip libgl1 libglib2.0-0 build-essential

# Node.js 20 + pm2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Firewall: only SSH + web
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# 2 GB swap (important on a 4 GB VPS)
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Point your domain's **A record** (`@` and `www`) to the VPS IP in your domain panel.

## 3. Get the code

```bash
cd ~ && git clone https://github.com/Shaymaa936/National-Missing-Person-AI-Platform.git trace
sudo mkdir -p /var/trace/uploads && sudo chown -R trace:trace /var/trace
```

## 4. Face engine (Python)

```bash
cd ~/trace/face_dtc/face_dtc
python3 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt        # TensorFlow is big: 5–10 min

sudo mkdir -p /etc/trace
sudo cp ~/trace/deploy/face.env.example /etc/trace/face.env
openssl rand -hex 32                            # copy this as the secret
sudo nano /etc/trace/face.env                   # paste it as FACE_ENGINE_SECRET
                                                # keep FACE_STRICT_MODE=0 for the first start

sudo cp ~/trace/deploy/trace-face.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now trace-face
journalctl -u trace-face -f                     # watch it start (Ctrl+C to exit)
```

On the **first start** DeepFace downloads the Facenet512 model (about 90 MB) into `~/.deepface`. That needs internet and takes a minute.

Check it:

```bash
curl -s http://127.0.0.1:8000/api/health -H "X-Engine-Key: YOUR_SECRET"
```

You want `"status":"online"` and `"deepface_available":true`. Then set `FACE_STRICT_MODE=1` in `/etc/trace/face.env` and `sudo systemctl restart trace-face`.

## 5. Backend (Node)

```bash
cd ~/trace/backend
npm ci
cp .env.example .env && nano .env
```

Fill in `.env`:

```
PORT=5000
MONGO_URL=mongodb+srv://...            # from MongoDB Atlas
JWT_SECRET=<openssl rand -hex 32>      # NEW long random value, not the dev one
FACE_ENGINE_URL=http://127.0.0.1:8000
FACE_ENGINE_SECRET=<same secret as /etc/trace/face.env>
UPLOAD_DIR=/var/trace/uploads
CORS_ORIGINS=https://yourdomain.pk,https://www.yourdomain.pk
GROQ_API_KEY=...
PUBLIC_SITE_URL=https://yourdomain.pk   # used in WhatsApp/Facebook share previews
TURNSTILE_SECRET_KEY=                  # captcha, see "Free extras" below
# optional: SMTP_* for emails, NADRA_* when you get access
```

In **MongoDB Atlas → Network Access**, add your VPS IP.

```bash
pm2 start server.js --name trace-api
pm2 save
pm2 startup systemd          # run the command it prints, so it starts after reboot
pm2 logs trace-api           # should show "mongodb atlas connected"
```

## 6. Frontend (React)

```bash
cd ~/trace/frontend/frontend
printf "VITE_API_URL=https://yourdomain.pk\nVITE_TURNSTILE_SITE_KEY=\n" > .env
npm ci && npm run build      # creates dist/
```

## 7. Nginx + HTTPS

```bash
sudo cp ~/trace/deploy/nginx-trace.conf /etc/nginx/sites-available/trace
sudo nano /etc/nginx/sites-available/trace       # replace yourdomain.pk
sudo ln -s /etc/nginx/sites-available/trace /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
chmod o+x /home/trace                            # let nginx read the build folder
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.pk -d www.yourdomain.pk   # choose "redirect"
```

Open `https://yourdomain.pk`. 🎉

## 8. Moving existing cases from your laptop

The face engine on the VPS starts empty. That's fine: log in as admin and click **"Run AI Scan on All"** once. Every case whose face isn't on this engine yet is enrolled again automatically from the photos, then all found reports are scanned. Also copy your old uploaded photos to `/var/trace/uploads` (e.g. with `scp -r backend/uploads/* trace@VPS_IP:/var/trace/uploads/`) before doing this.

## 9. Updating after a change

```bash
cd ~/trace && git pull
cd backend && npm ci && pm2 restart trace-api
cd ../frontend/frontend && npm ci && npm run build
cd ../../face_dtc/face_dtc && venv/bin/pip install -r requirements.txt && sudo systemctl restart trace-face
```

## 10. Backups

```bash
chmod +x ~/trace/deploy/backup.sh
crontab -e        # add:  30 3 * * * /home/trace/trace/deploy/backup.sh
```

Backs up photos + face data daily at 3:30 am, keeps 14 days. MongoDB Atlas backs up the database.

## Free extras

**Captcha (Cloudflare Turnstile, free).** dash.cloudflare.com → Turnstile → Add widget → your domain. Put the *site key* in `frontend/frontend/.env` as `VITE_TURNSTILE_SITE_KEY` (then `npm run build`) and the *secret key* in `backend/.env` as `TURNSTILE_SECRET_KEY` (then `pm2 restart trace-api`). Leave both empty to keep it off.

**Cloudflare free plan (recommended).** Add your domain to Cloudflare, switch the nameservers, keep the A record "Proxied". You get DDoS protection, caching and your VPS IP stays hidden. Set SSL mode to "Full (strict)" after certbot is done.

**Better face detector.** `cd ~/trace/face_dtc/face_dtc && venv/bin/pip install retina-face`, add `FACE_DETECTOR=retinaface` to `/etc/trace/face.env`, then `sudo systemctl restart trace-face`. `/api/health` then shows `"detector":"retinaface"`. Slower on CPU (about 1–2 s per photo) but finds more faces.

**Share previews.** After going live, paste a case's share link into https://developers.facebook.com/tools/debug/ once to check the photo preview.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Admin shows "AI engine offline" | `systemctl status trace-face` and `journalctl -u trace-face -n 50`; secret must match in both env files |
| Engine keeps restarting / killed | Out of memory: add swap or a bigger VPS (`free -h`) |
| 502 Bad Gateway | Backend down: `pm2 logs trace-api` |
| Login works but photos broken | `UPLOAD_DIR` path and folder permissions (`ls -la /var/trace/uploads`) |
| "Not allowed by CORS" / requests blocked | `CORS_ORIGINS` must match the exact URL in the browser (https, with/without www) |
| MongoDB connection error | VPS IP not added in Atlas Network Access |

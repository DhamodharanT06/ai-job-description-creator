# AI Job Description Generator

A Flask-based web application that generates professional job descriptions using AI (OpenRouter API).

## Features

- 🤖 AI-powered job description generation via OpenRouter
- 📄 Professional PDF export with custom styling
- 🎨 Modern, responsive UI with smooth animations
- ✅ Form validation and error handling
- 🔍 Built-in diagnostics for troubleshooting
## AI Job Description Generator

A small Flask web app that generates job descriptions. This project is already configured to deploy on Vercel using the `@vercel/python` builder (`vercel.json` included).

Quick checklist

- Install dependencies locally: `pip install -r requirements.txt`
- Copy `.env.example` → `.env` for local testing and fill `OPENROUTER_API_KEY`
- Deploy to Vercel (instructions below)

Local development

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Copy the example env and add your key:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

3. Run the app locally:

```bash
python app.py
```

Then open http://127.0.0.1:5000

Notes about environment variables

- The app reads `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` and `OPENROUTER_BASE_URL` from the environment (or a local `.env` when present).
- For production on Vercel, do NOT commit `.env`. Add environment variables securely in the Vercel dashboard or via the Vercel CLI (see below).

Deploying to Vercel

This repository already includes `vercel.json` configured to use `app.py` as the Python entrypoint. To deploy:

1. Install the Vercel CLI (if needed):

```bash
npm i -g vercel
# or
pnpm add -g vercel
```

2. Log in and link the project:

```bash
vercel login
vercel link
```

3. Add required environment variables for production. Recommended approach is via the Vercel CLI:

```bash
vercel env add OPENROUTER_API_KEY production
vercel env add OPENROUTER_MODEL production    # optional
vercel env add OPENROUTER_BASE_URL production # optional
```

When prompted, paste the values. Alternatively, set them in the Vercel dashboard under Project → Settings → Environment Variables.

4. Deploy:

```bash
vercel --prod
```

Notes and troubleshooting

- `vercel.json` routes `/static/*` to the `static` folder and sends all other requests to `app.py`.
- The app uses `python-dotenv` for local development. In Vercel production the environment variables come from the platform and `python-dotenv` will be skipped.
- If your AI calls fail in production, confirm `OPENROUTER_API_KEY` is set in Vercel and that your model name in `OPENROUTER_MODEL` is valid.

If you want, I can also:

- Add a small `Makefile` or PowerShell script for local runs
- Add GitHub Actions to automatically deploy on push

---
Updated to ensure the repository is ready for simple Vercel deployment.

# AI Job Description Generator

A Flask-based web application that generates professional job descriptions using AI (OpenRouter API).

## Features

- 🤖 AI-powered job description generation via OpenRouter
- 📄 Professional PDF export with custom styling
- 🎨 Modern, responsive UI with smooth animations
- ✅ Form validation and error handling
- 🔍 Built-in diagnostics for troubleshooting

## Quick Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API Key

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Get your OpenRouter API key from [openrouter.ai/keys](https://openrouter.ai/keys)

3. Edit `.env` and add your key:
   ```
   OPENROUTER_API_KEY=sk-or-v1-YOUR_API_KEY_HERE
   ```

### 3. Run the Application

```bash
python backend.py
```

Visit: http://127.0.0.1:5000

## Troubleshooting

### API Not Working?

Visit the diagnostics page: http://127.0.0.1:5000/diag

This will test:
- DNS resolution for api.openrouter.ai
- HTTPS connectivity
- API key validity
- Network configuration

### Common Issues

**502 Error / API Connection Fails:**
- Check your API key is set correctly in `.env`
- Ensure you have internet connectivity
- If behind a corporate firewall, set proxy in `.env`:
  ```
  HTTPS_PROXY=http://proxy.company.com:8080
  ```

**Text Not Visible in Forms:**
- Fixed! All text is now black regardless of autofill

**No API Key:**
- Get one free at [openrouter.ai](https://openrouter.ai)
- Some models require credits, but many are free-tier

## Project Structure

```
AIJobDC/
├── backend.py              # Flask server & API integration
├── requirements.txt        # Python dependencies
├── .env                    # Your API keys (create from .env.example)
├── static/
│   └── js/
│       ├── generator.js    # Job generator UI logic
│       └── main.js         # Homepage interactions
└── templates/
    ├── index.html          # Landing page
    ├── generator.html      # Job generator form
    ├── navbar.html         # Navigation component
    └── footer.html         # Footer component
```

## API Models

Default: `openai/gpt-4o-mini` (fast, cheap, good quality)

Other options (change in `.env`):
- `anthropic/claude-3.5-sonnet` - Best quality
- `google/gemini-pro` - Google's model
- `meta-llama/llama-3.1-8b-instruct` - Open source

See all models: https://openrouter.ai/models

## Support

For issues or questions, check the diagnostics endpoint first:
http://127.0.0.1:5000/diag

from flask import Flask, render_template, request, jsonify, Response, send_from_directory
import requests
import time
import os
from io import BytesIO
from flask import send_file
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit

try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

app = Flask(__name__)
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'meta-llama/llama-3.3-70b-instruct:free')
# Allow overriding the base API URL (useful for proxies or private networks)
OPENROUTER_BASE_URL = os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api')
openrouter_init_error = None
# simple availability flag; we will use HTTP calls to OpenRouter
openrouter_available = bool(OPENROUTER_API_KEY)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/generator")
def generator():
    return render_template("generator.html")

@app.route("/navbar.html")
def navbar():
    return render_template("navbar.html")

@app.route("/footer.html")
def footer():
    return render_template("footer.html")


@app.route('/static/<path:filename>')
def static_files(filename):
    # Serve static assets explicitly so deployments that route requests to the Flask app
    # (instead of a platform static handler) still return files like JS/CSS.
    return send_from_directory(os.path.join(app.root_path, 'static'), filename)

@app.route("/generate", methods=["POST"])
def generate():
    import traceback
    try:
        data = request.get_json(silent=True) or {}
        print('[generate] request headers:', dict(request.headers))
        print('[generate] request args:', dict(request.args))
        print('[generate] request json keys:', list(data.keys()))
    # Strip leading/trailing spaces from all text fields
    for key in data:
        if isinstance(data[key], str):
            data[key] = data[key].strip()
    
    for f in ('jobTitle','companyName','city','state','jobType','experienceLevel','salary','companyEmail'):
        if not data.get(f):
            return jsonify(success=False,error=f"Missing {f}")

    # Quick debug override: if caller passes ?force_local=1, skip external API
    if request.args.get('force_local', '').lower() in ('1', 'true'):
        jd = generate_local_job_description(data)
        out = {
            'success': True,
            'jobDescription': jd,
            'jobDetails': {
                'title': (data.get('jobTitle') or '').title(),
                'company': (data.get('companyName') or '').title(),
                'location': f"{(data.get('city') or '').title()}, {(data.get('state') or '').title()}",
                'jobType': (data.get('jobType') or '').replace('-', ' ').title(),
                'experienceLevel': get_experience_label(data.get('experienceLevel', '')),
                'salary': (data.get('salary') or ''),
                'email': data.get('companyEmail') or ''
            },
            'metadata': {
                'wordCount': len(jd.split()),
                'fallbackUsed': True,
                'modelAvailable': False,
                'apiAttempted': False,
                'apiError': 'force_local'
            }
        }
        return jsonify(out)

    # Quick debug override: if caller passes ?force_local=1, skip external API
    if request.args.get('force_local', '').lower() in ('1', 'true'):
        jd = generate_local_job_description(data)
        out = {
            'success': True,
            'jobDescription': jd,
            'jobDetails': {
                'title': (data.get('jobTitle') or '').title(),
                'company': (data.get('companyName') or '').title(),
                'location': f"{(data.get('city') or '').title()}, {(data.get('state') or '').title()}",
                'jobType': (data.get('jobType') or '').replace('-', ' ').title(),
                'experienceLevel': get_experience_label(data.get('experienceLevel', '')),
                'salary': (data.get('salary') or ''),
                'email': data.get('companyEmail') or ''
            },
            'metadata': {
                'wordCount': len(jd.split()),
                'fallbackUsed': True,
                'modelAvailable': False,
                'apiAttempted': False,
                'apiError': 'force_local'
            }
        }
        return jsonify(out)
    prompt = f"""Create a professional job description in PLAIN TEXT format (no markdown, no asterisks, no bold markers).

Job Details:
- Title: {data['jobTitle']}
- Company: {data['companyName']}
- Location: {data['city']}, {data['state']}
- Type: {data.get('jobType','')}
- Experience Level: {data.get('experienceLevel','')}
- Required Skills: {data.get('skillsKnown','')}
- Salary: {data.get('salary','')}
- Additional Details: {data.get('additionalDetails','')}

Format the description with these exact sections:

Job Overview:
[Write overview paragraph]

Key Responsibilities:
- [List each responsibility on separate lines starting with dash]

Required Qualifications:
- [List qualifications]

Preferred Qualifications:
- [List preferred qualifications]

What We Offer:
- [List benefits]

How to Apply:
[Application instructions]

IMPORTANT: Use PLAIN TEXT only. Do NOT use markdown formatting, asterisks, or special characters. Use simple dashes (-) for bullet points."""
    jd = None
    # No fallback: if OpenRouter fails or returns no content, return an error
    # Diagnostics for API usage
    model_available = openrouter_available
    api_attempted = False
    api_error = None

    if not model_available:
        # Do not return HTTP 5xx — fall back to local generator instead so frontend still works
        print('[generate] OPENROUTER_API_KEY not configured; falling back to local generator')
        api_attempted = False
        api_error = 'OPENROUTER_API_KEY not configured'
        jd = None
    
    if model_available:
        api_attempted = True
        try:
            headers = {
                'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                'Content-Type': 'application/json',
                'X-Title': 'AI Job Description Generator'
            }
            payload = {
                'model': OPENROUTER_MODEL,
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': 0.7,
                'max_tokens': 1500
            }
            endpoint = f"{OPENROUTER_BASE_URL.rstrip('/')}/v1/chat/completions"
            print(f"[API] Calling OpenRouter at {endpoint} with model {OPENROUTER_MODEL}")
            # Retry on 429 (rate limit) with exponential backoff a few times
            max_retries = 3
            backoff = 1
            resp = None
            last_exc = None
            for attempt in range(1, max_retries + 1):
                try:
                    resp = requests.post(endpoint, headers=headers, json=payload, timeout=30)
                    if resp.status_code == 429 and attempt < max_retries:
                        print(f"[API] Rate limited (429). Retry {attempt}/{max_retries} after {backoff}s")
                        time.sleep(backoff)
                        backoff *= 2
                        continue
                    # break out on success or non-retriable status
                    break
                except Exception as e:
                    last_exc = e
                    print(f"[API] Request attempt {attempt} failed: {e}")
                    if attempt < max_retries:
                        time.sleep(backoff)
                        backoff *= 2
                        continue
                    else:
                        raise
            if resp is None:
                raise last_exc or Exception('No response from OpenRouter')
            if resp.ok:
                j = resp.json()
                print(f"[API] Response received: {j.keys() if isinstance(j, dict) else 'non-dict'}")
                # Prefer the chat-style response structure
                try:
                    jd = j.get('choices', [])[0].get('message', {}).get('content')
                except Exception as parse_err:
                    print(f"[API] Parse error: {parse_err}")
                    jd = None
                if not jd:
                    # fallback to other possible shapes
                    try:
                        jd = j.get('choices', [])[0].get('text')
                    except Exception:
                        jd = None
                
                # Clean markdown formatting from response
                if jd:
                    # Remove markdown bold markers (**text** or __text__)
                    jd = jd.replace('**', '').replace('__', '')
                    # Remove markdown headers (### or ##)
                    import re
                    jd = re.sub(r'^#{1,6}\s+', '', jd, flags=re.MULTILINE)
                    # Clean up any extra whitespace
                    jd = re.sub(r'\n\s*\n\s*\n+', '\n\n', jd)
                    jd = jd.strip()
                
                if not jd:
                    api_error = f'OpenRouter returned empty content. Response: {str(j)[:200]}'
                    print(f'[API] Empty content error: {api_error}')
            else:
                api_error = f"HTTP {resp.status_code}: {resp.text[:500]}"
                print(f'[API] HTTP error {resp.status_code}: {resp.text[:200]}')
                jd = None
        except Exception as e:
            api_error = str(e)
            print('OpenRouter request failed:', api_error)
            jd = None
    # If no content produced by OpenRouter, return an error response (no fallback)
    if not jd:
        # API failed or returned no content — fall back to local generator
        print(f"[generate] OpenRouter failed or returned empty content. api_error={api_error}")
        jd = generate_local_job_description(data)
        fallback = True

        out = {
            'success': True,
            'jobDescription': jd,
            'jobDetails': {
                'title': (data.get('jobTitle') or '').title(),
                'company': (data.get('companyName') or '').title(),
                'location': f"{(data.get('city') or '').title()}, {(data.get('state') or '').title()}",
                'jobType': (data.get('jobType') or '').replace('-', ' ').title(),
                'experienceLevel': get_experience_label(data.get('experienceLevel', '')),
                'salary': (data.get('salary') or ''),
                'email': data.get('companyEmail') or ''
            },
            'metadata': {
                'wordCount': len(jd.split()),
                'fallbackUsed': True,
                'modelAvailable': model_available,
                'apiAttempted': api_attempted,
                'apiError': api_error
            }
        }

        return jsonify(out)
    out = {
        'success': True,
        'jobDescription': jd,
        'jobDetails': {
            'title': (data.get('jobTitle') or '').title(),
            'company': (data.get('companyName') or '').title(),
            'location': f"{(data.get('city') or '').title()}, {(data.get('state') or '').title()}",
            'jobType': (data.get('jobType') or '').replace('-', ' ').title(),
            'experienceLevel': get_experience_label(data.get('experienceLevel', '')),
            'salary': (data.get('salary') or ''),
            'email': data.get('companyEmail') or ''
        },
        'metadata': {
            'wordCount': len(jd.split()),
            'fallbackUsed': False,
            'modelAvailable': model_available,
            'apiAttempted': api_attempted,
            'apiError': api_error
        }
    }

    try:
        return jsonify(out)
    except Exception as e:
        # Log full traceback to server logs (do NOT expose secrets)
        tb = traceback.format_exc()
        print('[generate] Exception:', str(e))
        print(tb)
        return jsonify(success=False, error='Internal server error'), 500

def get_experience_label(level):
    """Convert experience level to readable format"""
    labels = {
        'entry': 'Entry Level (0-2 years)',
        'mid': 'Mid Level (3-5 years)', 
        'senior': 'Senior Level (5-8 years)',
        'lead': 'Lead/Principal (8+ years)'
    }
    return labels.get(level, level.title())


def generate_local_job_description(data: dict) -> str:
    """Simple deterministic job description generator used as a fallback when the API is unavailable.

    This produces a clean, well-structured job posting using the submitted fields. It's intentionally
    simple and safe (no external calls) so it will work under quota conditions.
    """
    title = (data.get('jobTitle') or 'Unknown Position').strip()
    company = (data.get('companyName') or '').strip()
    city = (data.get('city') or '').strip()
    state = (data.get('state') or '').strip()
    job_type = (data.get('jobType') or '').strip()
    exp = get_experience_label(data.get('experienceLevel', ''))
    degree = (data.get('degree') or 'Relevant degree').strip()
    skills = (data.get('skillsKnown') or '').strip()
    salary = (data.get('salary') or '').strip()
    email = (data.get('companyEmail') or '').strip()
    add = (data.get('additionalDetails') or '').strip()

    # Build responsibilities using skills as hints
    skills_list = [s.strip() for s in skills.split(',') if s.strip()]
    responsibilities = [
        f"Design, develop and maintain {title} features using {', '.join(skills_list) if skills_list else 'relevant technologies' }.",
        "Collaborate with cross-functional teams to define, design, and ship new features.",
        "Write clean, maintainable code and unit tests; participate in code reviews.",
        "Troubleshoot, debug and optimize application performance and user experience.",
        "Help document technical designs and contribute to team knowledge sharing."
    ]

    # Qualifications
    required_quals = [
        f"Bachelor's degree in {degree} or equivalent experience.",
        f"{exp} experience level.",
        f"Proven experience with {', '.join(skills_list)}." if skills_list else "Relevant technical skills.",
    ]

    preferred_quals = [
        "Familiarity with version control (Git) and CI/CD pipelines.",
        "Experience working in Agile teams.",
        "Strong problem-solving and communication skills."
    ]

    offer = [
        f"Salary: {salary}" if salary else "Competitive salary.",
        "Opportunities for growth and professional development.",
        "Supportive team environment and flexible working arrangements where applicable."
    ]

    # Assemble text
    lines = []
    lines.append(f"Job Overview:\n{title} at {company} — {city}, {state}\n")
    lines.append(f"{title} at {company} is a {job_type} role targeted at {exp}. The successful candidate will work on building reliable, user-focused applications and collaborate across teams to deliver high-quality software.")
    lines.append("\nKey Responsibilities:")
    for r in responsibilities:
        lines.append(f"- {r}")

    lines.append("\nRequired Qualifications:")
    for q in required_quals:
        lines.append(f"- {q}")

    lines.append("\nPreferred Qualifications:")
    for q in preferred_quals:
        lines.append(f"- {q}")

    if add:
        lines.append("\nAdditional Details:")
        lines.append(f"{add}")

    lines.append("\nWhat We Offer:")
    for o in offer:
        lines.append(f"- {o}")

    lines.append("\nHow to Apply:")
    if email:
        lines.append(f"Please send your resume and a brief cover letter to {email} with the subject '{title} Application'.")
    else:
        lines.append("Please apply through the company's careers page or contact the hiring team for application instructions.")

    return "\n".join(lines)


@app.route('/download_pdf', methods=['POST'])
def download_pdf():
    """Generate a simple PDF from posted jobDetails and jobDescription and return it."""
    data = request.json or {}
    jobDetails = data.get('jobDetails') or {}
    jobDescription = data.get('jobDescription') or ''

    # Create PDF in memory
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    # Create PDF in memory
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 48

    title = (jobDetails.get('title') or 'Job Description')
    company = jobDetails.get('company', '')
    location = jobDetails.get('location', '')

    max_width = width - margin * 2

    # Helper: draw page border and header area. Call after creating a new page.
    def draw_decorations():
        # Outer formal border
        border_pad = 18
        c.setStrokeColorRGB(0.85, 0.78, 0.60)  # soft-gold
        c.setLineWidth(2)
        # sharp-corner outer border (formal look)
        c.rect(border_pad, border_pad, width - border_pad * 2, height - border_pad * 2, stroke=1, fill=0)

        # Header box (light cream background with soft gold border)
        header_h = 92
        header_x = margin
        header_y_top = height - margin
        header_w = width - margin * 2
        header_y = header_y_top - header_h
        c.setFillColorRGB(0.99, 0.97, 0.93)  # light cream
        c.setStrokeColorRGB(0.91, 0.76, 0.33)  # soft gold border
        c.setLineWidth(0.8)
        # sharp-corner header box to match outer border
        c.rect(header_x, header_y, header_w, header_h, stroke=1, fill=1)

        # Badge circle (left)
        badge_r = 26
        badge_cx = header_x + 20 + badge_r
        badge_cy = header_y + header_h / 2
        c.setFillColorRGB(0.88, 0.12, 0.2)
        c.circle(badge_cx, badge_cy, badge_r, stroke=0, fill=1)
        # initial letter
        initial = (company or 'U')[:1].upper()
        c.setFillColorRGB(1, 1, 1)
        c.setFont('Helvetica-Bold', 20)
        c.drawCentredString(badge_cx, badge_cy - 7, initial)

        # Title and subtitle (wrap long text so full names display)
        text_x = badge_cx + badge_r + 12
        title_y = header_y + header_h - 18
        c.setFillColorRGB(0.1, 0.08, 0.08)
        c.setFont('Helvetica-Bold', 18)
        # compute available width for text (leave room for salary pill)
        text_max_width = header_x + header_w - text_x - 120
        wrapped_title = simpleSplit(title, 'Helvetica-Bold', 18, text_max_width)
        cur_y = title_y
        for line in wrapped_title:
            c.drawString(text_x, cur_y, line)
            cur_y -= 20

        # subtitle (company — location), allow wrapping into one or two small lines
        c.setFont('Helvetica', 10)
        c.setFillColorRGB(0.2, 0.2, 0.2)
        sub_text = f"{company} — {location}"
        wrapped_sub = simpleSplit(sub_text, 'Helvetica', 10, text_max_width)
        for sline in wrapped_sub:
            c.drawString(text_x, cur_y, sline)
            cur_y -= 14

        # Chips (jobType + experience) below title
        chip_y = title_y - 38
        chip_x = text_x
        chip_colors = [(0.86,0.1,0.13),(0.93,0.76,0.33)]
        chips = [jobDetails.get('jobType',''), jobDetails.get('experienceLevel','')]
        c.setFont('Helvetica', 9)
        for i, ch in enumerate(chips):
            if not ch: continue
            tw = c.stringWidth(ch, 'Helvetica', 9) + 12
            c.setFillColorRGB(*chip_colors[i % len(chip_colors)])
            c.roundRect(chip_x, chip_y - 6, tw, 16, 6, stroke=0, fill=1)
            c.setFillColorRGB(1,1,1)
            c.drawString(chip_x + 6, chip_y, ch)
            chip_x += tw + 8

        # Salary pill aligned right in header
        salary = jobDetails.get('salary','')
        if salary:
            pill_w = c.stringWidth(salary, 'Helvetica-Bold', 10) + 28
            pill_x = header_x + header_w - pill_w - 18
            pill_y = badge_cy - 12
            c.setFillColorRGB(0.09, 0.61, 0.35)  # green
            c.roundRect(pill_x, pill_y, pill_w, 24, 12, stroke=0, fill=1)
            c.setFillColorRGB(1,1,1)
            c.setFont('Helvetica-Bold', 10)
            c.drawCentredString(pill_x + pill_w/2, pill_y + 6, salary)

        # Return y start for body text below header
        return header_y - 12

    # Initialize first page decorations and starting y
    y = draw_decorations()

    # Body: parse lines and format sections (headers, bullets, paragraphs)
    # Helper to draw text with control over char spacing and leading
    def draw_text_line(x, y_pos, text, fontname='Helvetica', fontsize=11, charspace=0):
        ta = c.beginText()
        ta.setTextOrigin(x, y_pos)
        ta.setFont(fontname, fontsize)
        try:
            if charspace:
                ta.setCharSpace(charspace)
        except Exception:
            pass
        ta.textLine(text)
        c.drawText(ta)

    c.setFillColorRGB(0.2,0.2,0.2)
    base_font = 'Helvetica'
    base_size = 11
    leading = 15
    header_size = 14
    header_leading = 18

    for raw in jobDescription.split('\n'):
        line = raw.strip()
        if not line:
            y -= int(leading * 0.4)
            continue

        # Section header
        if line.endswith(':') or (len(line) < 60 and line.upper() == line and ' ' in line):
            h = line.rstrip(':')
            if y < margin + 80:
                c.showPage(); y = draw_decorations();
            c.setFillColorRGB(0.55, 0.08, 0.08)
            wrapped = simpleSplit(h, 'Helvetica-Bold', header_size, max_width)
            for wline in wrapped:
                draw_text_line(margin, y, wline, fontname='Helvetica-Bold', fontsize=header_size, charspace=0.2)
                y -= header_leading
            c.setFillColorRGB(0.2,0.2,0.2)
            y -= 4
            continue

        # Bullet lines
        if line.startswith('- '):
            btext = line[2:].strip()
            wrap = simpleSplit(btext, base_font, base_size, max_width - 36)
            if y < margin + 80:
                c.showPage(); y = draw_decorations();
            # draw bullet and wrapped lines
            bullet_x = margin + 6
            text_x = margin + 20
            # bullet dot
            c.circle(bullet_x, y + 4, 2.5, stroke=0, fill=1)
            first = True
            for wline in wrap:
                if first:
                    draw_text_line(text_x, y, wline, fontname=base_font, fontsize=base_size, charspace=0.15)
                    first = False
                else:
                    y -= int(base_size * 1.1)
                    if y < margin + 80:
                        c.showPage(); y = draw_decorations();
                    draw_text_line(text_x, y, wline, fontname=base_font, fontsize=base_size, charspace=0.15)
            y -= int(base_size * 1.35)
            continue

        # Normal paragraph
        wrapped = simpleSplit(line, base_font, base_size, max_width)
        for wline in wrapped:
            if y < margin + 80:
                c.showPage(); y = draw_decorations();
            draw_text_line(margin, y, wline, fontname=base_font, fontsize=base_size, charspace=0.1)
            y -= leading

    c.showPage()
    c.save()

    buffer.seek(0)
    filename = f"{title.replace(' ', '_').lower()}_job_description.pdf"
    return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name=filename)


@app.route('/debug', methods=['GET'])
def debug_status():
    """Return lightweight diagnostics about generative API availability (does not return keys)."""
    return jsonify({
        'openrouter_key_present': bool(OPENROUTER_API_KEY),
        'model_available': openrouter_available,
        'model_name': OPENROUTER_MODEL,
        'model_init_error': openrouter_init_error,
        'base_url': OPENROUTER_BASE_URL
    })

@app.route('/diag', methods=['GET'])
def diag():
    """Diagnostic endpoint: test DNS, connectivity, and API health.

    This version avoids using the low-level `socket` module so it can run
    in environments where raw socket operations are restricted.
    """
    import sys
    results = {
        'timestamp': str(__import__('datetime').datetime.now()),
        'python_version': sys.version,
        'dns_checks': {},
        'connectivity_checks': {},
        'api_status': None
    }

    # DNS check via public DNS-over-HTTPS (Google) as a lightweight alternative
    try:
        dns_resp = requests.get('https://dns.google/resolve?name=openrouter.ai', timeout=5)
        if dns_resp.ok:
            j = dns_resp.json()
            answers = j.get('Answer') or j.get('answer') or []
            ips = [a.get('data') for a in answers if isinstance(a, dict) and a.get('type') in (1,)]
            results['dns_checks']['openrouter.ai'] = {'status': 'OK', 'ips': ips}
        else:
            results['dns_checks']['openrouter.ai'] = {'status': f'HTTP {dns_resp.status_code}'}
    except Exception as e:
        results['dns_checks']['openrouter.ai'] = {'status': 'FAILED', 'error': str(e)}

    # HTTPS connectivity check using requests
    try:
        r = requests.get('https://openrouter.ai', timeout=5)
        results['connectivity_checks']['openrouter_https'] = {
            'status': 'OK' if r.ok else f'HTTP {r.status_code}',
            'response_code': r.status_code,
            'headers_preview': dict(list(r.headers.items())[:5])
        }
    except Exception as e:
        results['connectivity_checks']['openrouter_https'] = {'status': 'FAILED', 'error': str(e)}

    # API quick health check (keeps same behavior but uses requests only)
    if OPENROUTER_API_KEY:
        try:
            headers = {
                'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                'Content-Type': 'application/json'
            }
            payload = {
                'model': OPENROUTER_MODEL,
                'messages': [{'role': 'user', 'content': 'Hello'}],
                'temperature': 0.2,
                'max_tokens': 10
            }
            endpoint = f"{OPENROUTER_BASE_URL.rstrip('/')}/v1/chat/completions"
            resp = requests.post(endpoint, headers=headers, json=payload, timeout=10)
            results['api_status'] = {
                'status': 'OK' if resp.ok else f'HTTP {resp.status_code}',
                'response_code': resp.status_code,
                'has_content': len(resp.text) > 0
            }
            if not resp.ok:
                results['api_status']['error_preview'] = resp.text[:200]
        except Exception as e:
            results['api_status'] = {'status': 'FAILED', 'error': str(e)}
    else:
        results['api_status'] = {'status': 'SKIPPED', 'reason': 'OPENROUTER_API_KEY not set'}

    return jsonify(results)
@app.route('/favicon.ico')
def favicon():
    """Return a tiny SVG favicon to avoid 404s in access logs."""
    svg = '''<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="8" fill="#F8EEDF"/>
        <circle cx="20" cy="20" r="12" fill="#8E1616" />
        <text x="36" y="36" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#1F2937">JD</text>
    </svg>'''
    return Response(svg, mimetype='image/svg+xml')

if __name__ == "__main__":
    # Use PORT from environment (Vercel provides this) and bind to 0.0.0.0
    try:
        port = int(os.environ.get('PORT', 5000))
        app.run(host='0.0.0.0', port=port, debug=True)
    except Exception as e:
        # Print full traceback to logs so Vercel shows details for debugging
        import traceback
        traceback.print_exc()
        print('Failed to start Flask app:', e)
        raise

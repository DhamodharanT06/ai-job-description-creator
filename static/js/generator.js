// Generator Page JavaScript
// Global variable to store current job details and description for server PDF generation
let currentJobDetails = null;
let currentJobDescription = '';

document.addEventListener('DOMContentLoaded', function () {
    initializeFormAnimations();
    initializeJobGenerator();
    initializeTooltips();
    initializeInputEffects();

    // Initialize height adjustment
    adjustRightColumnHeight();
    window.addEventListener('resize', adjustRightColumnHeight);

    // Don't initialize mobile menu here - it will be called after navbar loads
});

function adjustRightColumnHeight() {
    const leftCard = document.getElementById('left-card');
    const rightColumn = document.getElementById('right-column');

    if (!leftCard || !rightColumn) return;

    // Check if we are on desktop (md breakpoint is usually 768px in Tailwind)
    if (window.innerWidth >= 768) {
        // Set right column height to match left card
        // We use offsetHeight to get the full height including padding/borders
        rightColumn.style.height = `${leftCard.offsetHeight}px`;
        rightColumn.style.overflowY = 'auto'; // Ensure it scrolls if content is larger
    } else {
        // On mobile, let content flow naturally
        rightColumn.style.height = 'auto';
        rightColumn.style.overflowY = 'visible';
    }
}

// Form animations and interactions
function initializeFormAnimations() {
    const formElements = document.querySelectorAll('.slide-up');
    const slideInElements = document.querySelectorAll('.form-slide-in');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }, { threshold: 0.1 });

    formElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        observer.observe(element);
    });

    // Animate form elements with staggered delay
    slideInElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        setTimeout(() => {
            element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 200 + (index * 100));
    });
}

// Input focus effects
function initializeInputEffects() {
    const inputs = document.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
        // Focus effects with enhanced animations
        input.addEventListener('focus', function () {
            this.style.transform = 'scale(1.02)';
            this.style.boxShadow = '0 0 0 4px rgba(142, 22, 22, 0.1), 0 0 20px rgba(142, 22, 22, 0.3)';

            // Add glow effect to parent container
            this.parentElement.style.transform = 'scale(1.01)';
            this.parentElement.style.filter = 'drop-shadow(0 4px 20px rgba(142, 22, 22, 0.2))';
        });

        input.addEventListener('blur', function () {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = 'none';
            this.parentElement.style.transform = 'scale(1)';
            this.parentElement.style.filter = 'none';
        });

        // Enhanced typing animation with color transitions
        input.addEventListener('input', function () {
            this.style.borderColor = '#8E1616';
            this.style.background = 'rgba(142, 22, 22, 0.1)';

            // Create ripple effect
            const ripple = document.createElement('div');
            ripple.style.position = 'absolute';
            ripple.style.top = '50%';
            ripple.style.left = '50%';
            ripple.style.width = '0';
            ripple.style.height = '0';
            ripple.style.background = 'rgba(142, 22, 22, 0.3)';
            ripple.style.borderRadius = '50%';
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.pointerEvents = 'none';
            ripple.style.transition = 'all 0.6s ease';

            this.parentElement.style.position = 'relative';
            this.parentElement.appendChild(ripple);

            setTimeout(() => {
                ripple.style.width = '100px';
                ripple.style.height = '100px';
                ripple.style.opacity = '0';
            }, 10);

            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
                this.style.borderColor = 'rgba(232, 201, 153, 0.3)';
                this.style.background = 'rgba(248, 238, 223, 0.2)';
            }, 600);
        });

        // Hover effects
        input.addEventListener('mouseenter', function () {
            if (this !== document.activeElement) {
                this.style.borderColor = 'rgba(142, 22, 22, 0.3)';
                this.style.background = 'rgba(248, 238, 223, 0.25)';
            }
        });

        input.addEventListener('mouseleave', function () {
            if (this !== document.activeElement) {
                this.style.borderColor = 'rgba(232, 201, 153, 0.3)';
                this.style.background = 'rgba(248, 238, 223, 0.2)';
            }
        });
    });
}

// Mobile menu functionality
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');

            const icon = mobileMenuBtn.querySelector('i');
            if (mobileMenu.classList.contains('hidden')) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            } else {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            }
        });
    }
}

// Job Description Generator Logic
function initializeJobGenerator() {
    const form = document.getElementById('job-form');
    const generateBtn = document.getElementById('generateBtn');
    const loadingState = document.getElementById('loading-state');
    const resultsSection = document.getElementById('results-section');
    const outputContainer = document.getElementById('job-description-output');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(form);
        const jobData = Object.fromEntries(formData);

        // Trim all string values to remove leading/trailing spaces
        for (let key in jobData) {
            if (typeof jobData[key] === 'string') {
                jobData[key] = jobData[key].trim();
            }
        }

        // Validate required fields
        if (!validateForm(jobData)) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        // Start generation process
        startGeneration();

        try {
            // Generate AI-powered job description
            const formattedJobDescription = await generateJobDescription(jobData);

            // Show results with enhanced formatting
            showResults(formattedJobDescription);

        } catch (error) {
            // console.error('Error generating job description:', error);

            // Show specific error message
            const errorMessage = error.message || 'Error generating job description. Please try again.';
            showToast(errorMessage, 'error');
            resetGenerationState();

            // Show fallback content if needed
            if (error.message.includes('API') || error.message.includes('network')) {
                showFallbackTemplate(jobData);
            }
        }
    });



    // Download functionality (server-side)
    document.getElementById('download-btn').addEventListener('click', function () {
        downloadPdfBackend();
        animateButton(this);
    });

    // Preview functionality (open backend-generated PDF in new tab)
    document.getElementById('preview-btn').addEventListener('click', function () {
        previewPdfBackend();
        animateButton(this);
    });

    // Regenerate functionality
    document.getElementById('regenerate-btn').addEventListener('click', function () {
        const formData = new FormData(form);
        const jobData = Object.fromEntries(formData);

        startGeneration();
        generateJobDescription(jobData).then(showResults);
        animateButton(this);
    });
}

// Form validation
function validateForm(data) {
    const required = ['jobTitle', 'degree', 'skillsKnown', 'companyName', 'companyEmail', 'state', 'city', 'experienceLevel', 'jobType'];
    return required.every(field => data[field] && data[field].trim() !== '');
}

// Start generation animation
function startGeneration() {
    const generateBtn = document.getElementById('generateBtn');
    const btnText = document.getElementById('btn-text');
    const btnLoading = document.getElementById('btn-loading');
    const loadingState = document.getElementById('loading-state');
    const resultsSection = document.getElementById('results-section');

    // Update button state
    generateBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    // Show loading state
    resultsSection.classList.add('hidden');
    loadingState.classList.remove('hidden');
    loadingState.classList.add('fade-in');

    // Scroll to loading area
    loadingState.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Reset generation state
function resetGenerationState() {
    const generateBtn = document.getElementById('generateBtn');
    const btnText = document.getElementById('btn-text');
    const btnLoading = document.getElementById('btn-loading');
    const loadingState = document.getElementById('loading-state');

    generateBtn.disabled = false;
    btnText.classList.remove('hidden');
    btnLoading.classList.add('hidden');
    loadingState.classList.add('hidden');
}

// AI job description generation
// async function generateJobDescription(jobData) {
//     // Simulate API processing delay
//     await new Promise(resolve => setTimeout(resolve, 2000));

//     // Return formatted empty template for user to customize
//     return formatJobDescriptionTemplate(jobData);
// }

// Format job description template
function formatJobDescriptionTemplate(jobData) {
    return `
        <div class="space-y-6">
            <div>
                <h3 class="text-2xl font-bold text-primary-red mb-3">${jobData.jobTitle}</h3>
                <p class="text-gray-700 mb-2"><strong>Company:</strong> ${jobData.companyName}</p>
                <p class="text-gray-700 mb-2"><strong>Location:</strong> ${jobData.city}, ${jobData.state}</p>
                <p class="text-gray-700 mb-2"><strong>Job Type:</strong> ${jobData.jobType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                <p class="text-gray-700"><strong>Experience Level:</strong> ${getExperienceLabel(jobData.experienceLevel)}</p>
            </div>
            
            <div>
                <h4 class="text-xl font-semibold text-dark-text mb-3">Job Overview</h4>
                <p class="text-gray-700 leading-relaxed">
                    [Job description will be generated based on your requirements]
                </p>
            </div>
            
            <div>
                <h4 class="text-xl font-semibold text-dark-text mb-3">Key Responsibilities</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li>[Responsibility 1]</li>
                    <li>[Responsibility 2]</li>
                    <li>[Responsibility 3]</li>
                </ul>
            </div>
            
            <div>
                <h4 class="text-xl font-semibold text-dark-text mb-3">Required Skills & Qualifications</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li>${getExperienceRequirement(jobData.experienceLevel)}</li>
                    <li>Skills: ${jobData.skillsKnown}</li>
                    <li>Education: ${jobData.degree}</li>
                    <li>[Additional qualification]</li>
                </ul>
            </div>
            
            ${jobData.additionalDetails ? `
            <div>
                <h4 class="text-xl font-semibold text-dark-text mb-3">Additional Information</h4>
                <p class="text-gray-700 leading-relaxed">${jobData.additionalDetails}</p>
            </div>
            ` : ''}
            
            <div>
                <h4 class="text-xl font-semibold text-dark-text mb-3">How to Apply</h4>
                <p class="text-gray-700">Please send your application to <a href="mailto:${jobData.companyEmail}" class="text-primary-red hover:underline">${jobData.companyEmail}</a></p>
            </div>
        </div>
    `;
}



// Helper functions
function getExperienceLabel(level) {
    const labels = {
        'entry': 'Entry Level (0-2 years)',
        'mid': 'Mid Level (3-5 years)',
        'senior': 'Senior Level (5-8 years)',
        'lead': 'Lead/Principal (8+ years)'
    };
    return labels[level] || level;
}

function getExperienceRequirement(level) {
    const requirements = {
        'entry': '0-2 years of experience',
        'mid': '3-5 years of experience',
        'senior': '5-8 years of experience',
        'lead': '8+ years of experience'
    };
    return requirements[level] || 'Relevant experience';
}

// Show results with animation
function showResults(content) {
    const loadingState = document.getElementById('loading-state');
    const resultsSection = document.getElementById('results-section');
    const outputContainer = document.getElementById('job-description-output');

    // Hide loading
    loadingState.classList.add('hidden');

    // Show results with animation
    resultsSection.classList.remove('hidden');
    resultsSection.classList.add('slide-up');

    // Set content with enhanced formatting
    outputContainer.innerHTML = content;
    outputContainer.style.opacity = '0';
    outputContainer.style.transform = 'translateY(20px)';

    // Hide tips section
    const tipsSection = document.getElementById('tips-section');
    if (tipsSection) {
        tipsSection.classList.add('hidden');
    }



    // Animate each section with staggered delay
    setTimeout(() => {
        outputContainer.style.transition = 'all 0.6s ease';
        outputContainer.style.opacity = '1';
        outputContainer.style.transform = 'translateY(0)';

        // Animate content elements with stagger
        const elements = outputContainer.querySelectorAll('div > div, h2, h3, p, ul');
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';

            setTimeout(() => {
                element.style.transition = 'all 0.4s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }, 100);

    // Reset button state
    resetGenerationState();

    // Scroll to results with better timing
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Show success message
        showToast('Job description generated successfully!', 'success');

        // Adjust height after content is fully visible and animated
        adjustRightColumnHeight();
    }, 500);
}

// Toast notification system
function showToast(message, type = 'success') {
    const toast = document.getElementById('success-toast');
    const toastMessage = document.getElementById('toast-message');
    const toastContainer = toast.querySelector('div');
    const iconElement = toastContainer.querySelector('i');

    toastMessage.textContent = message;
    toast.classList.remove('hidden');

    // Update icon and color based on type
    if (type === 'error') {
        toastContainer.style.background = 'rgba(220, 38, 38, 0.9)';
        toastContainer.style.borderColor = '#dc2626';
        iconElement.className = 'fas fa-exclamation-circle text-white text-xl';
    } else if (type === 'warning') {
        toastContainer.style.background = 'rgba(245, 158, 11, 0.9)';
        toastContainer.style.borderColor = '#f59e0b';
        iconElement.className = 'fas fa-exclamation-triangle text-white text-xl';
    } else if (type === 'info') {
        toastContainer.style.background = 'rgba(59, 130, 246, 0.9)';
        toastContainer.style.borderColor = '#3b82f6';
        iconElement.className = 'fas fa-info-circle text-white text-xl';
    } else {
        toastContainer.style.background = 'rgba(34, 197, 94, 0.9)';
        toastContainer.style.borderColor = '#22c55e';
        iconElement.className = 'fas fa-check-circle text-white text-xl';
    }

    // Animate in
    setTimeout(() => {
        toastContainer.style.transform = 'translateX(0)';
    }, 10);

    // Auto hide (longer for errors)
    const hideDelay = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        toastContainer.style.transform = 'translateX(100%)';
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 500);
    }, hideDelay);
}

// Button animation
function animateButton(button) {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 150);
}

// Server-side PDF helpers: call backend endpoints to download or preview PDFs
function downloadPdfBackend() {
    if (!currentJobDescription || !currentJobDetails) {
        showToast('No job description to download. Please generate one first.', 'warning');
        return;
    }

    fetch('/download_pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDetails: currentJobDetails, jobDescription: currentJobDescription })
    }).then(resp => {
        if (!resp.ok) throw new Error('Server error while generating PDF');
        return resp.blob();
    }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fname = (currentJobDetails.title || 'job_description').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_job_description.pdf';
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('PDF downloaded', 'success');
    }).catch(err => {
        // console.error(err);
        showToast('Error downloading PDF. Please try again.', 'error');
    });
}

function previewPdfBackend() {
    if (!currentJobDescription || !currentJobDetails) {
        showToast('No job description to preview. Please generate one first.', 'warning');
        return;
    }
    fetch('/download_pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDetails: currentJobDetails, jobDescription: currentJobDescription })
    }).then(resp => {
        if (!resp.ok) throw new Error('Server error while generating PDF');
        return resp.blob();
    }).then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }).catch(err => {
        // console.error(err);
        showToast('Error generating PDF preview. Please try again.', 'error');
    });
}

// Initialize tooltips
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[title]');

    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function () {
            const tooltip = document.createElement('div');
            tooltip.className = 'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg';
            tooltip.textContent = this.getAttribute('title');
            tooltip.style.bottom = '100%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translateX(-50%)';
            tooltip.style.marginBottom = '8px';

            this.style.position = 'relative';
            this.appendChild(tooltip);
            this.removeAttribute('title');
            this.dataset.originalTitle = tooltip.textContent;
        });

        element.addEventListener('mouseleave', function () {
            const tooltip = this.querySelector('.absolute');
            if (tooltip) {
                this.removeChild(tooltip);
                this.setAttribute('title', this.dataset.originalTitle);
            }
        });
    });
}

async function generateJobDescription(jobData) {
    try {
        const response = await fetch("/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jobData)
        });

        // Check if the response is ok
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.jobDescription) {
            return formatJobDescriptionDisplay(result);
        } else {
            throw new Error(result.message || result.error || "Failed to generate job description. Please try again.");
        }
    } catch (error) {
        // console.error("Error in generateJobDescription:", error);

        // Provide more specific error messages
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error("Network error - please check your connection and try again.");
        } else if (error.message.includes('HTTP error')) {
            throw new Error("Server error - please try again in a moment.");
        } else {
            throw new Error(error.message || "Failed to generate job description. Please try again.");
        }
    }
}

// Format the job description for structured display
function formatJobDescriptionDisplay(result) {
    let { jobDescription, jobDetails, metadata } = result;

    // Ensure jobDetails has safe defaults so the UI never shows 'undefined'
    const safeDefaults = {
        title: 'Job Description',
        company: 'Company',
        location: 'Location',
        jobType: '',
        experienceLevel: '',
        salary: '',
        email: ''
    };
    jobDetails = Object.assign(safeDefaults, jobDetails || {});

    // Store job details and description globally for server-side PDF generation
    currentJobDetails = jobDetails;
    currentJobDescription = jobDescription || '';

    // Build a semantic, decorated HTML version of the job description
    function escapeHtml(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

    const lines = (jobDescription || '').split(/\r?\n/).map(l => l.trim());
    const sectionOrder = ['Job Overview', 'Key Responsibilities', 'Required Qualifications', 'Preferred Qualifications', 'What We Offer', 'How to Apply'];
    const sections = { 'Job Overview': [], 'Key Responsibilities': [], 'Required Qualifications': [], 'Preferred Qualifications': [], 'What We Offer': [], 'How to Apply': [] };
    let current = 'Job Overview';

    const headingMap = {
        'job overview': 'Job Overview', 'overview': 'Job Overview',
        'key responsibilities': 'Key Responsibilities', 'responsibilities': 'Key Responsibilities',
        'required qualifications': 'Required Qualifications', 'required': 'Required Qualifications',
        'preferred qualifications': 'Preferred Qualifications', 'preferred': 'Preferred Qualifications',
        'what we offer': 'What We Offer', 'what we offer.': 'What We Offer', 'what we offer:': 'What We Offer',
        'how to apply': 'How to Apply', 'apply': 'How to Apply'
    };

    for (let raw of lines) {
        if (!raw) { sections[current].push(''); continue; }
        const low = raw.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').toLowerCase();
        if (headingMap[low] !== undefined) { current = headingMap[low]; continue; }
        const m = raw.match(/^([A-Za-z ][A-Za-z ]{2,}):$/);
        if (m && headingMap[m[1].toLowerCase()]) { current = headingMap[m[1].toLowerCase()]; continue; }
        sections[current].push(raw);
    }

    // REQUIREMENT: Add an email address to the “How to Apply” section
    const emailStr = jobDetails.email || jobDetails.companyEmail;
    // Only add if we have an email and it's not already clearly in the section (simple check)
    // We'll append it to ensure it's there.
    if (emailStr) {
        sections['How to Apply'].push(`Please send your application to ${emailStr}`);
    }

    // REQUIREMENT: Ensure the same email content is included in the generated/downloaded PDF
    // We reconstruct currentJobDescription from the parsed sections to ensure sync
    let reconstructed = '';
    for (let key of sectionOrder) {
        if (sections[key] && sections[key].length > 0) {
            reconstructed += `${key}:\n`;
            // Join lines, ensure clean spacing
            reconstructed += sections[key].join('\n') + '\n\n';
        }
    }
    currentJobDescription = reconstructed.trim();

    const icons = {
        'Job Overview': 'fas fa-info-circle', 'Key Responsibilities': 'fas fa-tasks',
        'Required Qualifications': 'fas fa-clipboard-list', 'Preferred Qualifications': 'fas fa-star',
        'What We Offer': 'fas fa-gift', 'How to Apply': 'fas fa-paper-plane'
    };

    let bodyHtml = '';
    for (let key of sectionOrder) {
        const items = sections[key].filter(x => x !== undefined && x !== '');
        if (!items || items.length === 0) continue;

        bodyHtml += `<div class="mb-6">`;
        bodyHtml += `<h3 class="text-xl font-bold text-primary-red mb-3 flex items-center"><i class="${icons[key]} mr-3 text-primary-red"></i>${key}</h3>`;

        const bullets = items.filter(line => line.startsWith('- ')).map(l => l.slice(2));
        const paras = items.filter(line => !line.startsWith('- ')).join('\n').trim();

        if (bullets.length) {
            bodyHtml += `<ul class="list-disc list-inside text-gray-700 space-y-2 mb-4">`;
            for (let b of bullets) bodyHtml += `<li>${escapeHtml(b)}</li>`;
            bodyHtml += `</ul>`;
        }
        if (paras) {
            const pblocks = paras.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
            for (let p of pblocks) bodyHtml += `<p class="text-gray-700 leading-relaxed mb-3">${escapeHtml(p)}</p>`;
        }

        bodyHtml += `</div>`;
    }

    const applyEmailRaw = jobDetails.email || jobDetails.companyEmail || '';
    const applyEmailEsc = escapeHtml(applyEmailRaw || '');
    const subject = encodeURIComponent(`${jobDetails.title} Application - ${jobDetails.company || jobDetails.companyName || ''}`);
    const body = encodeURIComponent(`Hello,\n\nI would like to apply for the ${jobDetails.title} position at ${jobDetails.company || jobDetails.companyName || ''}.\n\nRegards,\n[Your Name]\n[Contact Info]`);
    const defaultGmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(applyEmailRaw)}&su=${subject}&body=${body}`;
    const gmailHref = applyEmailRaw ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(applyEmailRaw)}&su=${subject}&body=${body}` : defaultGmail;

    const titleHtml = `
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg sm:text-xl" style="background: linear-gradient(135deg, #E11D48 0%, #F59E0B 100%);">
                ${escapeHtml((jobDetails.company || jobDetails.companyName || 'U').charAt(0).toUpperCase())}
            </div>

            <div class="flex-1 min-w-0">
                <h2 class="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-extrabold text-primary-red leading-tight break-words whitespace-normal">${escapeHtml(jobDetails.title || jobDetails.jobTitle || 'Job Title')}</h2>
                <p class="text-xs sm:text-sm text-gray-600 mt-1 break-words whitespace-normal">${escapeHtml(jobDetails.company || jobDetails.companyName || '')} • ${escapeHtml(jobDetails.location || '')}</p>

                <div class="mt-3 flex flex-wrap gap-2 items-center">
                    ${jobDetails.jobType ? `<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-primary-red text-xs sm:text-sm"><i class="fas fa-briefcase text-[10px]"></i> ${escapeHtml(jobDetails.jobType)}</span>` : ''}
                    ${jobDetails.experienceLevel ? `<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs sm:text-sm"><i class="fas fa-level-up-alt text-[10px]"></i> ${escapeHtml(getExperienceLabel(jobDetails.experienceLevel))}</span>` : ''}
                </div>
            </div>

            <div class="w-full sm:w-auto sm:ml-4 flex flex-col items-start sm:items-end mt-3 sm:mt-0">
                ${jobDetails.salary ? `<div class="text-xs text-gray-500">Estimated</div><div class="mt-1 inline-block px-3 sm:px-4 py-2 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base">${escapeHtml(jobDetails.salary)}</div>` : ''}
            </div>
        </div>
    `;

    return `
        <div class="space-y-6">
            <div class="bg-light-cream/30 backdrop-blur-sm rounded-2xl p-6 border border-soft-gold/30">
                ${titleHtml}
            </div>

            <div class="prose max-w-none text-sm sm:text-base break-words">
                ${bodyHtml}
            </div>
            
            <div class="text-right text-xs text-gray-500 mt-4">
                Generated with ${metadata && metadata.wordCount ? metadata.wordCount : '—'} words
            </div>
        </div>
    `;
}

// Fallback template if AI generation fails
function showFallbackTemplate(jobData) {
    const fallbackContent = formatJobDescriptionTemplate(jobData);
    showResults(fallbackContent);
    showToast('Generated a template for you to customize', 'info');
}

// PDF preview/print now handled by server-side endpoint (/download_pdf). Frontend only calls it.

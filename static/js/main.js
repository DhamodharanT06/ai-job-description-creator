// Main JavaScript for Landing Page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations and interactions
    initializeAnimations();
    // Don't initialize mobile menu here - it will be called after navbar loads
    initializeScrollEffects();
    initializeParallax();
    initializeHoverEffects();
});


// Initialize animations
function initializeAnimations() {
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all elements with data-aos attribute
    document.querySelectorAll('[data-aos]').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

// Mobile menu functionality
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            
            // Animate menu icon
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

// Scroll effects
function initializeScrollEffects() {
    let ticking = false;
    
    function updateScrollEffects() {
        const scrollY = window.scrollY;
        const navbar = document.querySelector('nav');
        
        // Add backdrop blur to navbar on scroll
        if (scrollY > 50 && navbar) {
            navbar.style.backdropFilter = 'blur(20px)';
            navbar.style.background = 'rgba(255, 255, 255, 0.15)';
        } else if (navbar) {
            navbar.style.backdropFilter = 'blur(10px)';
            navbar.style.background = 'rgba(255, 255, 255, 0.1)';
        }
        
        ticking = false;
    }
    
    function requestScrollUpdate() {
        if (!ticking) {
            requestAnimationFrame(updateScrollEffects);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestScrollUpdate);
}

// Parallax effects
function initializeParallax() {
    const particles = document.querySelectorAll('.particle');
    
    window.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        particles.forEach((particle, index) => {
            const speed = (index + 1) * 0.5;
            const x = mouseX * speed * 10;
            const y = mouseY * speed * 10;
            
            particle.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
}

// Hover effects
function initializeHoverEffects() {
    // Feature cards hover effects - removed expansion to prevent unwanted scaling
    const featureCards = document.querySelectorAll('.glassmorphism');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255, 255, 255, 0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255, 255, 255, 0.1)';
        });
    });
    
    // Button glow effects
    const glowButtons = document.querySelectorAll('.animate-glow');
    
    glowButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 0 40px #8E1616, 0 0 60px #E8C999';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.boxShadow = '0 0 20px #8E1616';
        });
    });
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navigate to generator page
document.querySelectorAll('a[href="generator.html"]').forEach(link => {
    link.addEventListener('click', function(e) {
        // Let the default navigation happen
    });
});

// Dynamic particle generation
function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.background = 'linear-gradient(45deg, #8E1616, #E8C999)';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
    
    const container = document.querySelector('.floating-particles');
    if (container) {
        container.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 10000);
    }
}

// Create new particles periodically
setInterval(createParticle, 3000);



// Performance optimization: Debounce scroll events
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func.apply(context, args);
    };
}

// Add smooth reveal animations
const revealElements = document.querySelectorAll('.glassmorphism, .gradient-text');
const revealOnScroll = debounce(() => {
    revealElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
            element.classList.add('fade-in');
        }
    });
}, 10);

window.addEventListener('scroll', revealOnScroll);
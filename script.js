document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if(target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // 2. Video Playback on Hover
    // Works for both main Projects and Creative Cards
    const videoContainers = document.querySelectorAll('.video-container, .mini-visual');

    videoContainers.forEach(container => {
        const video = container.querySelector('video');
        if (video) {
            container.addEventListener('mouseenter', () => {
                video.play().catch(e => { /* Ignore auto-play errors */ });
            });
            container.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
            });
        }
    });

    // 3. DM Mode (Visual Theme Only)
    const dmBtn = document.getElementById('dm-toggle');
    const body = document.body;

    // Check if user has a preference saved (Optional)
    if(localStorage.getItem('theme') === 'dm') {
        body.classList.add('dm-mode');
    }

    dmBtn.addEventListener('click', () => {
        body.classList.toggle('dm-mode');
        
        // Save preference
        if(body.classList.contains('dm-mode')) {
            localStorage.setItem('theme', 'dm');
        } else {
            localStorage.removeItem('theme');
        }
    });
});

// 4. Code Toggle Function (Global scope needed for onclick)
function toggleCode(id) {
    const codeBlock = document.getElementById(`code-${id}`);
    if(codeBlock) {
        codeBlock.classList.toggle('active');
    }
}

// Scroll Spy
const sections = document.querySelectorAll('section');
const navItems = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
            current = section.getAttribute('id');
        }
    });
    navItems.forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('href').includes(current)) {
            a.classList.add('active');
        }
    });
});
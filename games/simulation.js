// simulation.js

// --- 1. SETUP & UTILS ---
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.prepend(canvas);

canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.zIndex = '-1'; 
// Crucial: We need to allow clicks to pass through to links, 
// so we'll handle game clicks via a global window listener instead of canvas events.
canvas.style.pointerEvents = 'none';

// UI: Score Counter
const scoreDiv = document.createElement('div');
scoreDiv.id = 'game-score';
scoreDiv.innerHTML = '<span id="score-label">SYSTEM NORMAL</span> <span id="score-val"></span>';
document.body.appendChild(scoreDiv);

// Vector Math
class Vector2 {
    constructor(x, y) { this.x = x; this.y = y; }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    mult(n) { this.x *= n; this.y *= n; return this; }
    div(n) { this.x /= n; this.y /= n; return this; }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    setMag(n) { return this.norm().mult(n); }
    norm() { 
        let m = this.mag(); 
        if (m > 0) this.div(m); 
        return this; 
    }
    limit(max) {
        if (this.mag() > max) this.setMag(max);
        return this;
    }
    static dist(v1, v2) { return Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)); }
}

// Config
const CONFIG = {
    agentCount: 20,
    agentSize: 12, // Hitbox radius
    perception: 120,
    maxSpeed: 1.5,
    clickRadius: 15 // How generous the click aim is
};

let score = 0;

// --- 2. CLASSES ---

class Particle {
    constructor(x, y, color, isTech) {
        this.pos = new Vector2(x, y);
        this.vel = new Vector2((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
        this.color = color;
        this.isTech = isTech;
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.pos.add(this.vel);
        this.vel.mult(0.95); // Drag
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        
        if (this.isTech) {
            // Digital squares
            ctx.fillRect(this.pos.x, this.pos.y, this.size, this.size);
        } else {
            // Magic sparks
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.size/2, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class Agent {
    constructor() {
        this.reset();
    }

reset() {
        const margin = 50; // How far offscreen to spawn
        const side = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left

        // 1. Teleport Offscreen
        switch(side) {
            case 0: // Top
                this.pos = new Vector2(Math.random() * window.innerWidth, -margin);
                break;
            case 1: // Right
                this.pos = new Vector2(window.innerWidth + margin, Math.random() * window.innerHeight);
                break;
            case 2: // Bottom
                this.pos = new Vector2(Math.random() * window.innerWidth, window.innerHeight + margin);
                break;
            case 3: // Left
                this.pos = new Vector2(-margin, Math.random() * window.innerHeight);
                break;
        }

        // 2. Reset Physics (Give random velocity)
        // Note: In a real game, you might force velocity towards the center so they don't fly away,
        // but since we have world-wrapping in edges(), random is fine.
        this.vel = new Vector2(Math.random() - 0.5, Math.random() - 0.5).setMag(Math.random() * 2 + 0.5);
        this.acc = new Vector2(0, 0);
        
        // 3. Randomize visuals again so it feels like a "new" unit
        this.size = Math.random() * 4 + 3; 
        this.hitbox = CONFIG.agentSize;   
        this.isDead = false;
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(CONFIG.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);
        this.edges();
    }

    edges() {
        if (this.pos.x > window.innerWidth + 50) this.pos.x = -50;
        if (this.pos.x < -50) this.pos.x = window.innerWidth + 50;
        if (this.pos.y > window.innerHeight + 50) this.pos.y = -50;
        if (this.pos.y < -50) this.pos.y = window.innerHeight + 50;
    }

    draw(ctx, isDmMode) {
        if (isDmMode) {
            // Fantasy: Will-o-wisp
            ctx.shadowBlur = 15;
            ctx.shadowColor = "rgba(214, 69, 65, 0.6)";
            ctx.fillStyle = "#e6dcc8";
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            // Tech: Data Node
            ctx.fillStyle = "#00e5ff";
            ctx.fillRect(this.pos.x - this.size, this.pos.y - this.size, this.size * 2, this.size * 2);
            
            // Draw little "glitch" lines occasionally
            if (Math.random() > 0.98) {
                ctx.fillStyle = "white";
                ctx.fillRect(this.pos.x + 5, this.pos.y, 4, 1);
            }
        }
    }
}

// --- 3. SYSTEM MANAGER ---
const agents = [];
const particles = [];

function init() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    agents.length = 0;
    for (let i = 0; i < CONFIG.agentCount; i++) {
        agents.push(new Agent());
    }
}

// --- 4. INPUT & INTERACTION ---
window.addEventListener('mousedown', (e) => {
    // Game Logic: Raycast from mouse to all agents
    const mousePos = new Vector2(e.clientX, e.clientY);
    const isDmMode = document.body.classList.contains('dm-mode');
    let hit = false;

    // We iterate backwards so we can remove/reset seamlessly
    agents.forEach(agent => {
        const d = Vector2.dist(mousePos, agent.pos);
        
        // Did we click it?
        if (d < agent.hitbox + CONFIG.clickRadius) {
            hit = true;
            score++;
            updateScoreUI(isDmMode);
            spawnExplosion(agent.pos, isDmMode);
            agent.reset(); // Respawn elsewhere immediately (Object Pooling style)
        }
    });

    // Optional: Add a visual ripple even on miss
    if(!hit) {
        // can add miss effect here
    }
});

function spawnExplosion(pos, isDmMode) {
    const color = isDmMode ? '#d64541' : '#00e5ff'; // Red vs Cyan
    const count = 12;
    for(let i=0; i<count; i++) {
        particles.push(new Particle(pos.x, pos.y, color, !isDmMode));
    }
}

function updateScoreUI(isDmMode) {
    const label = document.getElementById('score-label');
    const val = document.getElementById('score-val');
    
    val.innerText = `[${score}]`;
    
    if (isDmMode) {
        label.innerText = "SPIRITS BANISHED";
        scoreDiv.style.color = "var(--accent)";
        scoreDiv.style.fontFamily = "'Cinzel', serif";
    } else {
        label.innerText = "BUGS PATCHED";
        scoreDiv.style.color = "var(--accent)";
        scoreDiv.style.fontFamily = "'JetBrains Mono', monospace";
    }
}

window.addEventListener('resize', init);

// --- 5. GAME LOOP ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isDmMode = document.body.classList.contains('dm-mode');

    // Draw Agents & Connections
    ctx.strokeStyle = isDmMode ? "rgba(214, 69, 65, 0.1)" : "rgba(0, 229, 255, 0.1)";
    ctx.lineWidth = 1;

    // 1. Update Agents
    for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        a.update();
        a.draw(ctx, isDmMode);

        // Connect nearby agents
        for (let j = i + 1; j < agents.length; j++) {
            const b = agents[j];
            const d = Vector2.dist(a.pos, b.pos);
            if (d < CONFIG.perception) {
                ctx.beginPath();
                ctx.moveTo(a.pos.x, a.pos.y);
                ctx.lineTo(b.pos.x, b.pos.y);
                ctx.stroke();
            }
        }
    }

    // 2. Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);
        if (p.life <= 0.05) particles.splice(i, 1);
    }

    requestAnimationFrame(gameLoop);
}

// Start
init();
gameLoop();
updateScoreUI(false); // Init text
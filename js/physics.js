// js/physics.js
// Effetto particelle antigravità sulla hero section
// Usa Matter.js come motore fisico 2D

(function () {
    // Eseguito solo se Matter.js è disponibile e se la hero section esiste
    if (typeof Matter === 'undefined') return;

    const heroEl = document.querySelector('.hero-section');
    if (!heroEl) return;

    // --- Setup Canvas ---
    const canvas = document.createElement('canvas');
    canvas.id = 'physics-canvas';
    // Inserisce il canvas come primo figlio (sotto il testo)
    heroEl.insertBefore(canvas, heroEl.firstChild);
    const ctx = canvas.getContext('2d');

    // --- Matter.js ---
    const { Engine, Bodies, Body, World } = Matter;

    const engine = Engine.create();
    engine.gravity.y = 0; // Antigravità: nessuna forza verso il basso
    engine.gravity.x = 0;
    const world = engine.world;

    // --- Dimensioni ---
    let W = 0, H = 0;
    const WALL_T = 200; // Spessore pareti invisibili
    const wallBodies = {};

    function setSize() {
        const rect = heroEl.getBoundingClientRect();
        W = rect.width;
        H = rect.height;
        canvas.width = W;
        canvas.height = H;
    }

    function createWalls() {
        const opts = {
            isStatic: true,
            label: 'wall',
            collisionFilter: { category: 0x0001, mask: 0x0002 },
            restitution: 0.6,
            friction: 0
        };
        wallBodies.top = Bodies.rectangle(W / 2, -WALL_T / 2, W + WALL_T * 2, WALL_T, opts);
        wallBodies.bottom = Bodies.rectangle(W / 2, H + WALL_T / 2, W + WALL_T * 2, WALL_T, opts);
        wallBodies.left = Bodies.rectangle(-WALL_T / 2, H / 2, WALL_T, H + WALL_T * 2, opts);
        wallBodies.right = Bodies.rectangle(W + WALL_T / 2, H / 2, WALL_T, H + WALL_T * 2, opts);
        World.add(world, Object.values(wallBodies));
    }

    function repositionWalls() {
        Body.setPosition(wallBodies.top, { x: W / 2, y: -WALL_T / 2 });
        Body.setPosition(wallBodies.bottom, { x: W / 2, y: H + WALL_T / 2 });
        Body.setPosition(wallBodies.left, { x: -WALL_T / 2, y: H / 2 });
        Body.setPosition(wallBodies.right, { x: W + WALL_T / 2, y: H / 2 });
    }

    // --- Palette colori del brand ---
    const BRAND_COLORS = [
        [140, 0, 255],  // viola #8c00ff
        [7, 76, 255],   // blu #074CFF
    ];

    // Disabilita su mobile (no mouse, meno performance)
    const PARTICLE_COUNT = window.innerWidth < 768 ? 20 : 40;

    const particles = [];
    const driftForces = []; // Forze di deriva lente per ciascuna particella

    function createParticles() {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Dimensioni casuali — rettangolini piccoli come coriandoli
            const pw = 2 + Math.random() * 6;
            const ph = 2 + Math.random() * 6;
            const x = pw / 2 + Math.random() * (W - pw);
            const y = ph / 2 + Math.random() * (H - ph);

            const body = Bodies.rectangle(x, y, pw, ph, {
                frictionAir: 0.010, // Smorzamento leggermente aumentato — galleggia più lento
                restitution: 0.60,
                friction: 0,
                angle: Math.random() * Math.PI,
                label: 'particle',
                // Collisione solo con le pareti (0x0001), NON tra particelle
                collisionFilter: { category: 0x0002, mask: 0x0001 }
            });

            // Colore brand con trasparenza ridotta per effetto più delicato
            const [r, g, b] = BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)];
            const alpha = 0.06 + Math.random() * 0.16; // max ~0.22
            body._color = `rgba(${r},${g},${b},${alpha})`;

            // Salvo dimensioni per il disegno arrotondato
            body._w = pw;
            body._h = ph;

            // Velocità iniziale casuale e lenta
            Body.setVelocity(body, {
                x: (Math.random() - 0.5) * 1.4,
                y: (Math.random() - 0.5) * 1.4
            });

            particles.push(body);
            driftForces.push({ x: 0, y: 0 });
        }
        World.add(world, particles);
    }

    // --- Posizione mouse (relativa al canvas) ---
    let mouse = { x: -9999, y: -9999 };
    const INFLUENCE_RADIUS = 500;     // Raggio di attrazione del mouse in px
    const ATTRACT_STRENGTH = 0.00001; // Intensità attrazione verso il mouse

    document.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    document.addEventListener('mouseleave', () => {
        mouse = { x: -9999, y: -9999 };
    });

    // --- Costanti forze ---
    const DRIFT_MAG = 0.000006; // Intensità della deriva casuale
    const DRIFT_CHANGE_FRAMES = 140;       // Ogni quanti frame cambia direzione di deriva
    const MAX_SPEED = 2.5;      // Velocità massima consentita

    let frame = 0;

    function applyForces() {
        particles.forEach((body, i) => {
            // Rinnova la direzione di deriva in modo sfalsato tra le particelle
            const driftFrame = Math.floor(i * DRIFT_CHANGE_FRAMES / PARTICLE_COUNT);
            if (frame % DRIFT_CHANGE_FRAMES === driftFrame % DRIFT_CHANGE_FRAMES) {
                driftForces[i] = {
                    x: (Math.random() - 0.5) * DRIFT_MAG * 2,
                    y: (Math.random() - 0.5) * DRIFT_MAG * 2
                };
            }

            // Applica forza di deriva
            Body.applyForce(body, body.position, driftForces[i]);

            // Attrazione e vortice del mouse
            const dx = mouse.x - body.position.x;
            const dy = mouse.y - body.position.y;
            const dist2 = dx * dx + dy * dy;
            const r2 = INFLUENCE_RADIUS * INFLUENCE_RADIUS;

            if (dist2 < r2 && dist2 > 200) { // Almeno 10px di distanza per evitare scatti
                const dist = Math.sqrt(dist2);
                // Curva quadratica: la forza cresce più morbida avvicinandosi
                const factor = Math.pow(1 - dist / INFLUENCE_RADIUS, 1.5);

                // Forza diretta verso il mouse
                const forceX = (dx / dist) * ATTRACT_STRENGTH * factor;
                const forceY = (dy / dist) * ATTRACT_STRENGTH * factor;

                // Forza tangenziale per creare un vortice (swirl) intorno al cursore
                const swirlX = -forceY * 0.1; // Perpendicolare
                const swirlY = forceX * 0.1;

                Body.applyForce(body, body.position, {
                    x: forceX + swirlX,
                    y: forceY + swirlY
                });
            }

            // Cap sulla velocità massima
            const spd = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
            if (spd > MAX_SPEED) {
                Body.setVelocity(body, {
                    x: (body.velocity.x / spd) * MAX_SPEED,
                    y: (body.velocity.y / spd) * MAX_SPEED
                });
            }
        });
    }

    // Polyfill roundRect per browser meno recenti
    function roundRect(ctx, x, y, w, h, r) {
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
        } else {
            const minR = Math.min(r, w / 2, h / 2);
            ctx.moveTo(x + minR, y);
            ctx.arcTo(x + w, y, x + w, y + h, minR);
            ctx.arcTo(x + w, y + h, x, y + h, minR);
            ctx.arcTo(x, y + h, x, y, minR);
            ctx.arcTo(x, y, x + w, y, minR);
            ctx.closePath();
        }
    }

    // --- Rendering con rettangoli arrotondati ---
    function draw() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(body => {
            const hw = body._w / 2;
            const hh = body._h / 2;
            const radius = Math.min(hw, hh); // Arrotonda a cerchio se molto piccolo, altrimenti pillola

            ctx.save();
            ctx.translate(body.position.x, body.position.y);
            ctx.rotate(body.angle);
            ctx.fillStyle = body._color;
            ctx.beginPath();
            roundRect(ctx, -hw, -hh, body._w, body._h, radius);
            ctx.fill();
            ctx.restore();
        });
    }

    // --- Loop principale ---
    function loop() {
        frame++;
        applyForces();
        Engine.update(engine, 1000 / 60);
        draw();
        requestAnimationFrame(loop);
    }

    // --- Resize con debounce ---
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            setSize();
            if (wallBodies.top) repositionWalls();
        }, 150);
    });

    // --- Avvio ---
    function init() {
        setSize();
        createWalls();
        createParticles();
        loop();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

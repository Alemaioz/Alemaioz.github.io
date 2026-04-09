// js/physics.js
// Effetto particelle antigravità sulla hero section
// Usa Matter.js come motore fisico 2D

(function () {
    const MATTER_LOCAL = 'js/vendor/matter.min.js';
    const MATTER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';

    function loadMatter() {
        if (window.Matter) return Promise.resolve(window.Matter);
        if (window.__matterLoadingPromise) return window.__matterLoadingPromise;

        window.__matterLoadingPromise = new Promise((resolve, reject) => {
            const injectScript = (src, onError) => {
                const existing = document.querySelector(`script[src="${src}"]`);
                if (existing) {
                    existing.addEventListener('load', () => resolve(window.Matter), { once: true });
                    existing.addEventListener('error', onError, { once: true });
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = () => resolve(window.Matter);
                script.onerror = onError;
                document.head.appendChild(script);
            };

            injectScript(MATTER_LOCAL, () => {
                injectScript(MATTER_CDN, reject);
            });
        });

        return window.__matterLoadingPromise;
    }

    const heroEl = document.querySelector('.hero-section');
    if (!heroEl) return;

    // --- Setup Canvas ---
    const canvas = document.createElement('canvas');
    canvas.id = 'physics-canvas';
    // Inserisce il canvas come primo figlio (sotto il testo)
    heroEl.insertBefore(canvas, heroEl.firstChild);
    const ctx = canvas.getContext('2d');

    // --- Matter.js ---
    let Engine, Bodies, Body, World;
    let engine;
    let world;

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
                x: (Math.random() - 0.5) * (isMobileViewport ? 0.425 : 1.4),
                y: (Math.random() - 0.5) * (isMobileViewport ? 0.425 : 1.4)
            });

            particles.push(body);
            driftForces.push({ x: 0, y: 0 });
        }
        World.add(world, particles);
    }

    // --- Posizione mouse (relativa al canvas) ---
    const isMobileViewport = window.matchMedia('(max-width: 991px)').matches;
    let mouse = { x: -9999, y: -9999 };
    let lastMousePos = { x: -9999, y: -9999 };
    let lastMouseMoveAt = 0;
    const MOUSE_ACTIVE_MS = 140;
    const INFLUENCE_RADIUS = 500;     // Raggio di attrazione del mouse in px
    const ATTRACT_STRENGTH = 0.00001; // Intensità attrazione verso il mouse

    document.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        const moved = Math.hypot(mouse.x - lastMousePos.x, mouse.y - lastMousePos.y) > 0.8;
        if (moved) lastMouseMoveAt = performance.now();
        lastMousePos.x = mouse.x;
        lastMousePos.y = mouse.y;
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
                const mobileDriftFactor = isMobileViewport ? 0.3 : 1;
                driftForces[i] = {
                    x: (Math.random() - 0.5) * DRIFT_MAG * 2 * mobileDriftFactor,
                    y: (Math.random() - 0.5) * DRIFT_MAG * 2 * mobileDriftFactor
                };
            }

            // Applica forza di deriva
            Body.applyForce(body, body.position, driftForces[i]);

            // Attrazione e vortice del mouse (solo desktop)
            const mouseIsActive = !isMobileViewport && (performance.now() - lastMouseMoveAt) <= MOUSE_ACTIVE_MS;
            if (mouseIsActive) {
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
            }

            // Cap sulla velocità massima
            const spd = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
            const maxSpeed = isMobileViewport ? 0.85 : MAX_SPEED;
            if (spd > maxSpeed) {
                Body.setVelocity(body, {
                    x: (body.velocity.x / spd) * maxSpeed,
                    y: (body.velocity.y / spd) * maxSpeed
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
        if (!Engine || !Bodies || !Body || !World) return;
        engine = Engine.create();
        engine.gravity.y = 0; // Antigravità: nessuna forza verso il basso
        engine.gravity.x = 0;
        world = engine.world;

        setSize();
        createWalls();
        createParticles();
        loop();
    }

    async function startPhysicsWhenReady() {
        const MatterLib = await loadMatter();
        if (!MatterLib) return;
        ({ Engine, Bodies, Body, World } = MatterLib);
        init();
    }

    function scheduleStart() {
        const boot = () => {
            startPhysicsWhenReady().catch(() => {
                // Fail silent: la pagina resta funzionale anche senza effetto physics.
            });
        };
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(boot, { timeout: 1200 });
        } else {
            setTimeout(boot, 120);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleStart, { once: true });
    } else {
        scheduleStart();
    }
})();

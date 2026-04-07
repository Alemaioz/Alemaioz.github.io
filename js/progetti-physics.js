// js/progetti-physics.js
// Effetto particelle "hero-like" su tutta la main di Progetti
(function () {
    if (typeof Matter === 'undefined') return;

    const isProgettiPage = document.body.classList.contains('progetti-page');
    if (!isProgettiPage) return;

    const targetEl = document.querySelector('main');
    if (!targetEl) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'progetti-physics-canvas';
    targetEl.insertBefore(canvas, targetEl.firstChild);
    const ctx = canvas.getContext('2d');

    const { Engine, Bodies, Body, World } = Matter;
    const engine = Engine.create();
    engine.gravity.y = 0;
    engine.gravity.x = 0;
    const world = engine.world;

    let W = 0, H = 0;
    const WALL_T = 240;
    const walls = {};
    const particles = [];
    const drifts = [];

    function setSize() {
        const rect = targetEl.getBoundingClientRect();
        W = Math.max(1, Math.floor(rect.width));
        H = Math.max(1, Math.floor(rect.height));
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
        walls.top = Bodies.rectangle(W / 2, -WALL_T / 2, W + WALL_T * 2, WALL_T, opts);
        walls.bottom = Bodies.rectangle(W / 2, H + WALL_T / 2, W + WALL_T * 2, WALL_T, opts);
        walls.left = Bodies.rectangle(-WALL_T / 2, H / 2, WALL_T, H + WALL_T * 2, opts);
        walls.right = Bodies.rectangle(W + WALL_T / 2, H / 2, WALL_T, H + WALL_T * 2, opts);
        World.add(world, Object.values(walls));
    }

    function repositionWalls() {
        Body.setPosition(walls.top, { x: W / 2, y: -WALL_T / 2 });
        Body.setPosition(walls.bottom, { x: W / 2, y: H + WALL_T / 2 });
        Body.setPosition(walls.left, { x: -WALL_T / 2, y: H / 2 });
        Body.setPosition(walls.right, { x: W + WALL_T / 2, y: H / 2 });
    }

    // Palette grigio chiaro/scuro
    const GRAY_COLORS = [
        [60, 60, 60],
        [185, 185, 185]
    ];

    const COUNT = window.innerWidth < 768 ? 42 : 42;

    function createParticles() {
        for (let i = 0; i < COUNT; i++) {
            const pw = 2 + Math.random() * 6;
            const ph = 2 + Math.random() * 6;
            const x = pw / 2 + Math.random() * (W - pw);
            const y = ph / 2 + Math.random() * (H - ph);

            const body = Bodies.rectangle(x, y, pw, ph, {
                frictionAir: 0.012,
                restitution: 0.58,
                friction: 0,
                angle: Math.random() * Math.PI,
                collisionFilter: { category: 0x0002, mask: 0x0001 }
            });

            const [r, g, b] = GRAY_COLORS[Math.floor(Math.random() * GRAY_COLORS.length)];
            const alpha = 0.16 + Math.random() * 0.24;
            body._color = `rgba(${r},${g},${b},${alpha})`;
            body._w = pw;
            body._h = ph;

            Body.setVelocity(body, {
                x: (Math.random() - 0.5) * 1.2,
                y: (Math.random() - 0.5) * 1.2
            });

            particles.push(body);
            drifts.push({ x: 0, y: 0 });
        }

        World.add(world, particles);
    }

    let mouse = { x: -9999, y: -9999 };
    const RADIUS = 420;
    const ATTRACT = 0.000008;
    const DRIFT_MAG = 0.000006;
    const DRIFT_FRAMES = 150;
    const MAX_SPEED = 2.3;
    let frame = 0;

    document.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    function applyForces() {
        particles.forEach((body, i) => {
            const driftFrame = Math.floor(i * DRIFT_FRAMES / COUNT);
            if (frame % DRIFT_FRAMES === driftFrame % DRIFT_FRAMES) {
                drifts[i] = {
                    x: (Math.random() - 0.5) * DRIFT_MAG * 2,
                    y: (Math.random() - 0.5) * DRIFT_MAG * 2
                };
            }

            Body.applyForce(body, body.position, drifts[i]);

            const dx = mouse.x - body.position.x;
            const dy = mouse.y - body.position.y;
            const dist2 = dx * dx + dy * dy;
            const r2 = RADIUS * RADIUS;

            if (dist2 < r2 && dist2 > 180) {
                const dist = Math.sqrt(dist2);
                const factor = Math.pow(1 - dist / RADIUS, 1.4);
                const fx = (dx / dist) * ATTRACT * factor;
                const fy = (dy / dist) * ATTRACT * factor;
                const sx = -fy * 0.08;
                const sy = fx * 0.08;

                Body.applyForce(body, body.position, { x: fx + sx, y: fy + sy });
            }

            const spd = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
            if (spd > MAX_SPEED) {
                Body.setVelocity(body, {
                    x: (body.velocity.x / spd) * MAX_SPEED,
                    y: (body.velocity.y / spd) * MAX_SPEED
                });
            }
        });
    }

    function roundRect(x, y, w, h, r) {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach((body) => {
            const hw = body._w / 2;
            const hh = body._h / 2;
            const r = Math.min(hw, hh);

            ctx.save();
            ctx.translate(body.position.x, body.position.y);
            ctx.rotate(body.angle);
            ctx.fillStyle = body._color;
            ctx.beginPath();
            roundRect(-hw, -hh, body._w, body._h, r);
            ctx.fill();
            ctx.restore();
        });
    }

    function loop() {
        frame++;
        applyForces();
        Engine.update(engine, 1000 / 60);
        draw();
        requestAnimationFrame(loop);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            setSize();
            repositionWalls();
        }, 160);
    });

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


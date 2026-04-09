// js/progetti-physics.js
// Effetto particelle "hero-like" su tutta la main di Progetti
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

    const isProgettiPage = document.body.classList.contains('progetti-page');
    if (!isProgettiPage) return;

    const isDesktopViewport = window.matchMedia('(min-width: 992px)').matches;
    const targetEl = isDesktopViewport
        ? document.querySelector('.progetti-hero')
        : document.querySelector('main');
    if (!targetEl) return;

    function initCtaParticles() {
        const ctaSection = document.querySelector('.project-cta-section');
        if (!ctaSection || ctaSection.dataset.ctaParticlesInit === 'true') return;
        ctaSection.dataset.ctaParticlesInit = 'true';

        const ctaCanvas = document.createElement('canvas');
        ctaCanvas.id = 'progetti-cta-particles';
        ctaSection.insertBefore(ctaCanvas, ctaSection.firstChild);
        const ctaCtx = ctaCanvas.getContext('2d');
        if (!ctaCtx) return;

        let cw = 0;
        let ch = 0;
        const isMobileCta = window.innerWidth < 992;
        const ctaParticles = [];
        const ctaCount = isMobileCta ? 10 : 16;
        let ctaAnimId = 0;
        let wasCtaInView = false;
        let hasFocusKick = false;
        let focusBlend = 0;
        const FOCUS_IN_SPEED = 0.16;
        const FOCUS_OUT_SPEED = 0.075;
        const CTA_FOCUS_PULL = 0.0034;

        function resizeCta() {
            const rect = ctaSection.getBoundingClientRect();
            const prevW = cw;
            const prevH = ch;
            cw = Math.max(1, Math.floor(rect.width));
            ch = Math.max(1, Math.floor(rect.height));
            ctaCanvas.width = cw;
            ctaCanvas.height = ch;

            // Evita "respawn" su mobile/resize: mantiene le posizioni relative.
            if (ctaParticles.length && prevW > 0 && prevH > 0) {
                const sx = cw / prevW;
                const sy = ch / prevH;
                for (let i = 0; i < ctaParticles.length; i++) {
                    const p = ctaParticles[i];
                    p.x = Math.max(p.boundR, Math.min(cw - p.boundR, p.x * sx));
                    p.y = Math.max(p.boundR, Math.min(ch - p.boundR, p.y * sy));
                }
            }
        }

        function spawnCtaParticles() {
            ctaParticles.length = 0;
            for (let i = 0; i < ctaCount; i++) {
                const w = 1.8 + Math.random() * 4.2;
                const h = 1.8 + Math.random() * 4.2;
                ctaParticles.push({
                    x: Math.random() * cw,
                    y: Math.random() * ch,
                    w,
                    h,
                    boundR: Math.max(w, h) * 0.75,
                    vx: (Math.random() - 0.5) * 0.24,
                    vy: (Math.random() - 0.5) * 0.24,
                    alpha: 0.14 + Math.random() * 0.22,
                    pulse: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.01 + Math.random() * 0.013,
                    jitter: 0.002 + Math.random() * 0.0024,
                    isFree: Math.random() < 0.2,
                    bandOffsetX: (Math.random() - 0.5) * (window.innerWidth < 992 ? 210 : 320),
                    bandOffsetY: (Math.random() - 0.5) * (window.innerWidth < 992 ? 26 : 34),
                    angle: Math.random() * Math.PI,
                    va: (Math.random() - 0.5) * 0.014
                });
            }
        }

        function ctaRoundRect(x, y, w, h, r) {
            const rr = Math.min(r, w / 2, h / 2);
            ctaCtx.moveTo(x + rr, y);
            ctaCtx.arcTo(x + w, y, x + w, y + h, rr);
            ctaCtx.arcTo(x + w, y + h, x, y + h, rr);
            ctaCtx.arcTo(x, y + h, x, y, rr);
            ctaCtx.arcTo(x, y, x + w, y, rr);
            ctaCtx.closePath();
        }

        function drawCta() {
            ctaCtx.clearRect(0, 0, cw, ch);
            const now = performance.now();
            const viewportH = window.innerHeight || document.documentElement.clientHeight || ch;
            const ctaRect = ctaSection.getBoundingClientRect();
            const isCtaInView = ctaRect.top < viewportH * 0.8 && ctaRect.bottom > viewportH * 0.2;

            if (isCtaInView && !wasCtaInView) {
                hasFocusKick = false;
            }
            if (!isCtaInView) hasFocusKick = false;
            wasCtaInView = isCtaInView;

            // Transizione continua di stato: niente restart bruschi.
            if (isCtaInView) {
                focusBlend = Math.min(1, focusBlend + FOCUS_IN_SPEED);
            } else {
                focusBlend = Math.max(0, focusBlend - FOCUS_OUT_SPEED);
            }
            const focusEase = focusBlend * focusBlend * (3 - 2 * focusBlend);
            const ctaButtonBlock = ctaSection.querySelector('.cta-buttons');
            const sectionRect = ctaSection.getBoundingClientRect();
            const blockRect = ctaButtonBlock ? ctaButtonBlock.getBoundingClientRect() : null;
            const target = blockRect
                ? {
                    x: blockRect.left - sectionRect.left + blockRect.width / 2,
                    y: blockRect.top - sectionRect.top + blockRect.height / 2
                }
                : null;

            if (!isMobileCta && focusEase > 0.08 && !hasFocusKick && target) {
                hasFocusKick = true;
                for (let i = 0; i < ctaParticles.length; i++) {
                    const p = ctaParticles[i];
                    if (p.isFree) continue;
                    const dx = target.x - p.x;
                    const dy = target.y - p.y;
                    const dist = Math.max(1, Math.hypot(dx, dy));
                    // "Colpo" iniziale come in hero, ma senza swirl.
                    p.vx += (dx / dist) * 0.22;
                    p.vy += (dy / dist) * 0.22;
                }
            }

            for (let i = 0; i < ctaParticles.length; i++) {
                const p = ctaParticles[i];
                // Moto flottante continuo: nessun respawn ciclico.
                p.vx += (Math.random() - 0.5) * p.jitter;
                p.vy += (Math.random() - 0.5) * p.jitter;

                if (focusEase > 0 && target && !p.isFree) {
                    const targetX = target.x + p.bandOffsetX;
                    const targetY = target.y + p.bandOffsetY;
                    const dx = targetX - p.x;
                    const dy = targetY - p.y;
                    const dist = Math.max(0.001, Math.hypot(dx, dy));
                    const nx = dx / dist;
                    const ny = dy / dist;
                    // Banda orizzontale: priorita all'allineamento su X, Y piu morbido.
                    const pullGain = Math.min(1.35, 0.75 + Math.abs(dx) / 180);
                    const radialForce = CTA_FOCUS_PULL * pullGain * focusEase;
                    const jitter = 0.0018;
                    // Solo fluttuazione guidata, senza orbita circolare.
                    p.vx += nx * radialForce + (Math.random() - 0.5) * jitter;
                    p.vy += ny * radialForce * 0.72 + (Math.random() - 0.5) * jitter;
                }

                const maxV = focusEase > 0 ? 0.58 : 0.32;
                p.vx = Math.max(-maxV, Math.min(maxV, p.vx));
                p.vy = Math.max(-maxV, Math.min(maxV, p.vy));
                p.x += p.vx;
                p.y += p.vy;
                p.pulse += p.pulseSpeed;
                p.angle += p.va;

                if (p.x <= p.boundR || p.x >= cw - p.boundR) {
                    p.vx *= -1;
                    p.x = Math.max(p.boundR, Math.min(cw - p.boundR, p.x));
                }
                if (p.y <= p.boundR || p.y >= ch - p.boundR) {
                    p.vy *= -1;
                    p.y = Math.max(p.boundR, Math.min(ch - p.boundR, p.y));
                }

                let a = Math.max(0.08, Math.min(0.34, p.alpha + Math.sin(p.pulse) * 0.06));
                if (focusEase > 0 && target) {
                    const d = Math.hypot(target.x - p.x, target.y - p.y);
                    const near = Math.max(0, 1 - d / 160);
                    a += near * 0.16 * focusEase;
                }
                a = Math.min(0.48, a);

                // Stile hero-like: micro-confetti arrotondati, chiari.
                ctaCtx.save();
                ctaCtx.translate(p.x, p.y);
                ctaCtx.rotate(p.angle);
                ctaCtx.fillStyle = `rgba(255, 255, 255, ${a})`;
                ctaCtx.beginPath();
                ctaRoundRect(-p.w / 2, -p.h / 2, p.w, p.h, Math.min(p.w, p.h) * 0.5);
                ctaCtx.fill();
                ctaCtx.restore();
            }
            ctaAnimId = requestAnimationFrame(drawCta);
        }

        let ctaResizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(ctaResizeTimer);
            ctaResizeTimer = setTimeout(() => {
                resizeCta();
            }, 160);
        }, { passive: true });

        resizeCta();
        spawnCtaParticles();
        ctaAnimId = requestAnimationFrame(drawCta);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(ctaAnimId);
                ctaAnimId = 0;
            } else if (!ctaAnimId) {
                ctaAnimId = requestAnimationFrame(drawCta);
            }
        });
    }

    const canvas = document.createElement('canvas');
    canvas.id = 'progetti-physics-canvas';
    targetEl.insertBefore(canvas, targetEl.firstChild);
    const ctx = canvas.getContext('2d');

    let Engine, Bodies, Body, World;
    let engine;
    let world;
    const isMobileViewport = window.matchMedia('(max-width: 991px)').matches;

    let W = 0, H = 0;
    const WALL_T = 240;
    const walls = {};
    const particles = [];
    const drifts = [];
    const suspendedParticles = [];
    const INTRO_ORBIT_MS = 3500;
    let orbitPhaseStartMs = 0;

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
        const hero = document.querySelector('.progetti-hero');
        const mainRect = targetEl.getBoundingClientRect();
        const heroRect = hero ? hero.getBoundingClientRect() : null;
        const spawnMinX = heroRect ? Math.max(0, heroRect.left - mainRect.left) : 0;
        const spawnMaxX = heroRect ? Math.min(W, heroRect.right - mainRect.left) : W;
        const spawnMinY = heroRect ? Math.max(0, heroRect.top - mainRect.top) : 0;
        const spawnMaxY = heroRect ? Math.min(H, heroRect.bottom - mainRect.top) : Math.min(H, window.innerHeight);
        const spawnW = Math.max(1, spawnMaxX - spawnMinX);
        const spawnH = Math.max(1, spawnMaxY - spawnMinY);

        for (let i = 0; i < COUNT; i++) {
            const pw = 2 + Math.random() * 6;
            const ph = 2 + Math.random() * 6;
            const x = spawnMinX + pw / 2 + Math.random() * Math.max(1, spawnW - pw);
            const y = spawnMinY + ph / 2 + Math.random() * Math.max(1, spawnH - ph);

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
            body._isSuspended = Math.random() < 0.2;

            if (body._isSuspended) {
                // Particelle sospese: si muovono normalmente, ma restano fuori dall'orbita.
                Body.setVelocity(body, {
                    x: (Math.random() - 0.5) * 1.2,
                    y: (Math.random() - 0.5) * 1.2
                });
                suspendedParticles.push({
                    phaseX: Math.random() * Math.PI * 2,
                    phaseY: Math.random() * Math.PI * 2,
                    speedX: 0.008 + Math.random() * 0.01,
                    speedY: 0.007 + Math.random() * 0.009,
                    ampX: 0.000003 + Math.random() * 0.000003,
                    ampY: 0.000003 + Math.random() * 0.000003
                });
            } else {
                suspendedParticles.push(null);
                Body.setVelocity(body, {
                    x: (Math.random() - 0.5) * 1.2,
                    y: (Math.random() - 0.5) * 1.2
                });
            }

            particles.push(body);
            drifts.push({ x: 0, y: 0 });
        }

        World.add(world, particles);
    }

    let mouse = { x: -9999, y: -9999 };
    let pointerInside = false;
    const RADIUS = 420;
    const ATTRACT = 0.000008;
    const DRIFT_MAG = 0.000006;
    const DRIFT_FRAMES = 150;
    const MAX_SPEED = 2.3;
    let frame = 0;
    const ORBIT_RADIUS = 104;
    const ORBIT_PULL = 0.0000105;
    const ORBIT_TANGENTIAL = 0.0000078;
    const ORBIT_MAX_SPEED = 1.35;

    document.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        pointerInside = true;
    });
    document.addEventListener('mouseleave', () => {
        pointerInside = false;
    });

    function getScrollIndicatorCenter() {
        const indicator = document.querySelector('.progetti-hero .scroll-indicator');
        if (!indicator) return null;
        const mainRect = targetEl.getBoundingClientRect();
        const indicatorRect = indicator.getBoundingClientRect();
        return {
            x: indicatorRect.left - mainRect.left + indicatorRect.width / 2,
            y: indicatorRect.top - mainRect.top + indicatorRect.height / 2
        };
    }

    function shouldUseHeroOrbit() {
        const hero = document.querySelector('.progetti-hero');
        const header = document.querySelector('header');
        if (!hero) return false;
        const heroRect = hero.getBoundingClientRect();
        const headerH = header ? header.getBoundingClientRect().height : 70;
        // Orbita attiva quando la hero è la sezione in vista sotto la navbar.
        return heroRect.bottom > headerH + 24 && heroRect.top < headerH + 64;
    }

    let wasHeroOrbitActive = false;
    function applyForces() {
        const heroOrbitActive = shouldUseHeroOrbit();
        const orbitCenter = heroOrbitActive ? getScrollIndicatorCenter() : null;
        const now = performance.now();
        if (heroOrbitActive && !wasHeroOrbitActive) {
            orbitPhaseStartMs = now;
        }
        wasHeroOrbitActive = heroOrbitActive;
        const introProgressRaw = orbitPhaseStartMs ? (now - orbitPhaseStartMs) / INTRO_ORBIT_MS : 1;
        const introProgress = Math.max(0, Math.min(1, introProgressRaw));
        const orbitBlend = introProgress * introProgress * (3 - 2 * introProgress); // smoothstep

        particles.forEach((body, i) => {
            if (body._isSuspended) {
                const meta = suspendedParticles[i];
                const driftFrame = Math.floor(i * DRIFT_FRAMES / COUNT);
                if (frame % DRIFT_FRAMES === driftFrame % DRIFT_FRAMES) {
                    drifts[i] = {
                        x: (Math.random() - 0.5) * DRIFT_MAG * 2,
                        y: (Math.random() - 0.5) * DRIFT_MAG * 2
                    };
                }
                const fx = Math.sin(frame * meta.speedX + meta.phaseX) * meta.ampX;
                const fy = Math.cos(frame * meta.speedY + meta.phaseY) * meta.ampY;
                const driftMultiplier = heroOrbitActive ? 0.7 : 1;
                Body.applyForce(body, body.position, {
                    x: drifts[i].x * driftMultiplier + fx,
                    y: drifts[i].y * driftMultiplier + fy
                });

                const suspendedMaxSpeed = heroOrbitActive ? 1.45 : MAX_SPEED;
                const v = Math.hypot(body.velocity.x, body.velocity.y);
                if (v > suspendedMaxSpeed) {
                    Body.setVelocity(body, {
                        x: (body.velocity.x / v) * suspendedMaxSpeed,
                        y: (body.velocity.y / v) * suspendedMaxSpeed
                    });
                }
                return;
            }

            const driftFrame = Math.floor(i * DRIFT_FRAMES / COUNT);
            if (frame % DRIFT_FRAMES === driftFrame % DRIFT_FRAMES) {
                drifts[i] = {
                    x: (Math.random() - 0.5) * DRIFT_MAG * 2,
                    y: (Math.random() - 0.5) * DRIFT_MAG * 2
                };
            }

            const driftMultiplier = heroOrbitActive ? 0.4 : 1;
            Body.applyForce(body, body.position, {
                x: drifts[i].x * driftMultiplier,
                y: drifts[i].y * driftMultiplier
            });

            if (heroOrbitActive && orbitCenter && orbitBlend > 0) {
                const dxO = orbitCenter.x - body.position.x;
                const dyO = orbitCenter.y - body.position.y;
                const distO = Math.max(0.001, Math.sqrt(dxO * dxO + dyO * dyO));
                const nx = dxO / distO;
                const ny = dyO / distO;
                const radialError = distO - ORBIT_RADIUS;
                // Curva dolce: più stabile vicino al ring, più percepibile quando è lontano.
                const pullGain = Math.min(1.45, 0.65 + Math.abs(radialError) / 120);
                const radialForce = radialError * ORBIT_PULL * pullGain;
                // componente tangenziale per effetto "giro attorno alla freccia"
                const tx = -ny * ORBIT_TANGENTIAL;
                const ty = nx * ORBIT_TANGENTIAL;
                const jitter = 0.0000015;

                Body.applyForce(body, body.position, {
                    x: (nx * radialForce + tx + (Math.random() - 0.5) * jitter) * orbitBlend,
                    y: (ny * radialForce + ty + (Math.random() - 0.5) * jitter) * orbitBlend
                });
            } else if (!isMobileViewport && pointerInside) {
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
            }

            const spd = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
            const maxSpeed = heroOrbitActive ? ORBIT_MAX_SPEED : MAX_SPEED;
            if (spd > maxSpeed) {
                Body.setVelocity(body, {
                    x: (body.velocity.x / spd) * maxSpeed,
                    y: (body.velocity.y / spd) * maxSpeed
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
        if (!Engine || !Bodies || !Body || !World) return;
        engine = Engine.create();
        engine.gravity.y = 0;
        engine.gravity.x = 0;
        world = engine.world;

        setSize();
        createWalls();
        createParticles();
        orbitPhaseStartMs = performance.now();
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
            initCtaParticles();
            startPhysicsWhenReady().catch(() => {
                // Fail silent: la pagina resta usabile senza physics.
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


// js/script.js

//PRELOADER//
window.addEventListener('load', function() {
    // Seleziona l'elemento del preloader
    const preloader = document.getElementById('preloader');

    // Aggiungi la classe 'preloader-hidden' per nasconderlo
    // Questa classe ha le proprietà CSS di opacità e visibilità con transizione
    preloader.classList.add('preloader-hidden');

    // Opzionale: Rimuovi l'elemento dal DOM dopo la transizione
    // Questo è utile per assicurarsi che non interferisca con gli eventi mouse
    preloader.addEventListener('transitionend', function() {
        preloader.remove();
    });
});

// Viewport mobile reale (considera barra indirizzi) + altezza header
// per centrare correttamente le sezioni rispetto allo spazio visibile.
function updateMobileViewportVars() {
    const root = document.documentElement;
    const header = document.querySelector('header');
    const vv = window.visualViewport;
    const viewportHeight = vv ? vv.height : window.innerHeight;
    const headerHeight = header ? header.getBoundingClientRect().height : 70;

    root.style.setProperty('--mobile-vv-height', `${viewportHeight}px`);
    root.style.setProperty('--mobile-header-height', `${headerHeight}px`);
}

window.addEventListener('resize', updateMobileViewportVars, { passive: true });
window.addEventListener('orientationchange', updateMobileViewportVars, { passive: true });
window.addEventListener('scroll', updateMobileViewportVars, { passive: true });
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateMobileViewportVars, { passive: true });
    window.visualViewport.addEventListener('scroll', updateMobileViewportVars, { passive: true });
}
document.addEventListener('DOMContentLoaded', updateMobileViewportVars);
window.addEventListener('load', updateMobileViewportVars);

//HAMBURGHER MENU//

// Aspetta che tutto il contenuto della pagina sia caricato
document.addEventListener('DOMContentLoaded', () => { 

    // Seleziona l'icona hamburger e la lista dei link
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('header nav ul');

    // Aggiungi un "ascoltatore" per l'evento 'click' sull'hamburger
    hamburger.addEventListener('click', () => {
        // Quando cliccato, aggiungi/togli la classe 'is-active' all'hamburger
        hamburger.classList.toggle('is-active');
        
        // Aggiungi/togli la classe 'nav-active' alla lista dei link
        navLinks.classList.toggle('nav-active');
    });

// --- INIZIO BLOCCO PER TRANSIZIONE FLUIDA, QUANDO SI CLICCA SU UN LINK DAL MENU MOBILE.
//  PRIMA SI CHIUDE IL MENU CON ANIMAZIONE POI PARTE IL CARICAMENTO DELLA PAGINA---

    document.querySelectorAll('header nav ul li a, header nav ul a.btn-primary').forEach(link => {
      link.addEventListener('click', function(e) {
        // Solo su mobile e solo se il menu è attivo
        if (window.innerWidth <= 768 && navLinks.classList.contains('nav-active')) {
          e.preventDefault(); // Blocca la navigazione immediata
          // Chiudi il menu (parte l'animazione)
          hamburger.classList.remove('is-active');
          navLinks.classList.remove('nav-active');
          // Dopo la durata della transizione (es. 600ms), vai alla pagina
          setTimeout(() => {
            window.location.href = this.href;
          }, 500); // 600ms = durata transizione clip-path nel CSS
        }
        // Su desktop o se il menu non è attivo, lascia il comportamento normale
      });
    });
// --- FINE BLOCCO PER TRANSIZIONE FLUIDA ---

    document.querySelectorAll('header nav ul li a, header nav ul a.btn-primary').forEach(link => {
      link.addEventListener('click', function(e) {
        const navUl = document.querySelector('header nav ul');
        // Chiudi il menu solo se è attivo (mobile)
        if (navUl.classList.contains('nav-active')) {
          document.querySelector('.hamburger').classList.remove('is-active');
          navUl.classList.remove('nav-active');
        }
        // Lascia che il browser navighi normalmente
      });
    });
});



//HEADER CHE SCOMPARE E RICOMPARE ALLO SCROLL//
// --- Logica per nascondere/mostrare l'header con VELOCITÀ dello scroll (Versione CORRETTA) ---
/* MOMENTANEAMENTE DISATTIVATA
let lastScrollTop = 0;
const header = document.querySelector('header');

// 👇 Puoi modificare questi due valori per trovare il feeling perfetto
const velocityThreshold = 1.2; // "Forza" minima dello scroll (pixel per millisecondo)
const scrollThreshold = 50;  // Distanza minima in pixel prima di reagire

let lastScrollTime = 0;

window.addEventListener('scroll', function() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const currentTime = performance.now();

    // Ignora gli scroll troppo piccoli
    if (Math.abs(scrollTop - lastScrollTop) < scrollThreshold) {
        return;
    }

    // Calcola la velocità solo se è passato un po' di tempo (evita divisioni per zero)
    if (currentTime > lastScrollTime) {
        const scrollVelocity = Math.abs(scrollTop - lastScrollTop) / (currentTime - lastScrollTime);

        // Nascondi l'header solo se...
        if (scrollTop > lastScrollTop &&        // ...stai scorrendo in giù
            scrollTop > header.offsetHeight && // ...hai superato l'altezza dell'header
            scrollVelocity > velocityThreshold) { // ...e stai andando abbastanza veloce
            
            header.classList.add('header-hidden');
        
        } else if (scrollTop < lastScrollTop) { // Se stai scorrendo in su...
            // ...mostra sempre l'header
            header.classList.remove('header-hidden');
        }
    }

    // Aggiorna i valori per il prossimo evento
    lastScrollTop = scrollTop;
    lastScrollTime = currentTime;
});
*/

//HEADER CHE DIVENTA OPACO AL PASSAGGIO DEL MOUSE E ALLO SCROLL//
function updateNavbarScrolledState() {
    const header = document.querySelector('header');
    if (!header) return;

    const scrollRoot = document.scrollingElement || document.documentElement;
    const y = window.scrollY || scrollRoot.scrollTop || document.body.scrollTop || 0;
    const isProgettiMobile = document.body.classList.contains('progetti-page') && window.innerWidth <= 991;
    let isAtTop = y <= 8;

    if (isProgettiMobile) {
        const heroSection = document.querySelector('.progetti-hero');
        const headerHeight = header.getBoundingClientRect().height || 70;
        if (heroSection) {
            const heroRect = heroSection.getBoundingClientRect();
            // "Top reale" solo quando la hero è ancora ben visibile sotto la navbar.
            const heroStillAtTop = heroRect.top >= -8 && heroRect.bottom > headerHeight + 24;
            isAtTop = isAtTop && heroStillAtTop;
        }
    }

    // Base solo quando siamo davvero in cima alla pagina.
    if (!isAtTop) {
        header.classList.add('navbar-scrolled');
    } else {
        header.classList.remove('navbar-scrolled');
    }
}

window.addEventListener('scroll', updateNavbarScrolledState, { passive: true });
updateNavbarScrolledState();

// Fix mirato: su mobile + pagina progetti alcuni browser (es. Samsung Internet)
// possono non aggiornare in modo affidabile window.scrollY.
if (document.body.classList.contains('progetti-page') && window.innerWidth <= 991) {
    const scrollTarget = document.scrollingElement || document.documentElement || document.body;
    scrollTarget.addEventListener('scroll', updateNavbarScrolledState, { passive: true });
    document.body.addEventListener('scroll', updateNavbarScrolledState, { passive: true });
    document.documentElement.addEventListener('scroll', updateNavbarScrolledState, { passive: true });
}

// Uscita dal feed su mobile (solo pagina Progetti):
// CTA entra nello snap, ma dopo averla raggiunta si disattiva lo snap
// per consentire lo scroll normale verso il footer/resto pagina.
if (document.body.classList.contains('progetti-page') && window.innerWidth <= 991) {
    const ctaSection = document.querySelector('.project-cta-section');
    const body = document.body;
    const html = document.documentElement;
    const updateFeedExitState = () => {
        if (!ctaSection) return;
        const ctaRect = ctaSection.getBoundingClientRect();
        const hasReachedCta = ctaRect.top <= 100;
        body.classList.toggle('feed-ended', hasReachedCta);
        html.classList.toggle('feed-ended', hasReachedCta);
    };

    window.addEventListener('scroll', updateFeedExitState, { passive: true });
    (document.scrollingElement || document.documentElement || document.body)
        .addEventListener('scroll', updateFeedExitState, { passive: true });
    window.addEventListener('resize', updateFeedExitState, { passive: true });
    updateFeedExitState();
}


// INTESTAZIONE HERO GRADIENT AL PASSAGGIO DEL MOUSE//


// --- Effetto "spotlight" con maschera sfocata (Versione con dissolvenza) ---
document.querySelectorAll('.hover-text-container').forEach(hoverTextContainer => {
    const hoverText = hoverTextContainer.querySelector('.hover-text');
    hoverTextContainer.addEventListener('mousemove', (e) => {
        const rect = hoverTextContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        hoverText.style.setProperty('--x', `${x}px`);
        hoverText.style.setProperty('--y', `${y}px`);
    });
});



// ANIMAZIONI DI SCROLL //

// Funzione per controllare se un elemento è visibile nel viewport
function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    
    // L'elemento è visibile se è almeno parzialmente nel viewport
    // Aggiungiamo un offset per far partire l'animazione un po' prima
    const offset = 100;
    
    return (
        rect.top <= windowHeight - offset &&
        rect.bottom >= 0
    );
}


// Funzione per gestire le animazioni di scroll
function handleScrollAnimations() {
    const animatedElements = document.querySelectorAll('.scroll-animate');
    
    animatedElements.forEach(element => {
        if (isElementInViewport(element) && !element.classList.contains('animate-in')) {
            element.classList.add('animate-in');
        }
    });
}


// Ottimizzazione delle performance con throttling
let ticking = false;

function updateScrollAnimations() {
    handleScrollAnimations();
    ticking = false;
}

function requestTick() {
    if (!ticking) {
        requestAnimationFrame(updateScrollAnimations);
        ticking = true;
    }
}


// Inizializza le animazioni quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    // Gestisci le animazioni allo scroll
    handleScrollAnimations();

    // Attiva lo scroll lock per la pagina Progetti
    initProgettiScrollLock();
    
    // Aggiungi l'event listener per lo scroll con ottimizzazione
    window.addEventListener('scroll', requestTick);
    
    // Gestisci anche il resize della finestra
    window.addEventListener('resize', () => {
        handleScrollAnimations();
        initProgettiScrollLock();
    });
})


function initProgettiScrollLock() {
    if (!document.body.classList.contains('progetti-page')) return;

    const body = document.body;
    if (body.dataset.progettiScrollInit === 'true') return;
    body.dataset.progettiScrollInit = 'true';

    const container = document.getElementById('progetti-snap');
    const footer = document.querySelector('.project-cta-section');
    if (!container || !footer) return;

    const sections = Array.from(container.querySelectorAll('.progetti-snap'));
    let isAnimating = false;
    let currentSection = 0;

    // Controlla se è mobile/tablet (larghezza <= 992px)
    const isMobile = window.innerWidth <= 992;

    if (isMobile) {
        // Su mobile: scroll fluido con snap CSS, nessun lock JS
        return;
    }

    // Su desktop/tablet: comportamento lock esistente
    function scrollToSection(index) {
        if (isAnimating || index < 0 || index >= sections.length) return;
        isAnimating = true;
        sections[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        currentSection = index;
        setTimeout(() => { isAnimating = false; }, 500);
    }

    function lockScrollToStart() {
        if (isAnimating) return;
        isAnimating = true;
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
            body.classList.add('scroll-locked');
            currentSection = 0;
            isAnimating = false;
        }, 600);
    }

    function unlockScrollToHero() {
        if (isAnimating) return;
        isAnimating = true;

        body.classList.remove('scroll-locked');
        const hero = document.querySelector('.progetti-hero');
        if (hero) {
            hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        setTimeout(() => { isAnimating = false; }, 600);
    }

    function unlockScrollToFooter() {
        if (isAnimating) return;
        isAnimating = true;

        body.classList.remove('scroll-locked');
        footer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setTimeout(() => { isAnimating = false; }, 600);
    }

    function relockToLast() {
        if (isAnimating) return;
        isAnimating = true;

        body.classList.add('scroll-locked');
        currentSection = sections.length - 1;
        sections[currentSection].scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => { isAnimating = false; }, 600);
    }

    window.addEventListener('wheel', function(e) {
        if (isAnimating) {
            e.preventDefault();
            return;
        }

        const isLocked = body.classList.contains('scroll-locked');

        if (!isLocked) {
            // Capiame se siamo nella Hero o nel Footer
            const scrollY = window.scrollY || window.pageYOffset;
            const containerTop = container.offsetTop || (window.innerHeight / 2);

            if (scrollY < containerTop - 10) {
                // Siamo nella Hero
                if (e.deltaY > 0) {
                    e.preventDefault();
                    lockScrollToStart();
                }
                // Se scorriamo in su, lasciamo scorrere normalmente
            } else {
                // Siamo dopo i progetti (nel Footer/CTA)
                if (e.deltaY < 0) {
                    e.preventDefault();
                    relockToLast();
                }
                // Se scorriamo in giù nel footer, lasciamo scorrere normalmente
            }
        } else {
            e.preventDefault();
            if (e.deltaY > 0) {
                if (currentSection < sections.length - 1) {
                    scrollToSection(currentSection + 1);
                } else {
                    unlockScrollToFooter();
                }
            } else if (e.deltaY < 0) {
                if (currentSection > 0) {
                    scrollToSection(currentSection - 1);
                } else {
                    unlockScrollToHero();
                }
            }
        }
    }, { passive: false });
}




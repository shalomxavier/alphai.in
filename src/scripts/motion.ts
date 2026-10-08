import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const EASE = 'expo.out';
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Generic scroll reveals — opt in on any element:
 *   data-animate="fade-up" | "fade-in" | "stagger" | "mask-up"
 *   data-animate-delay="0.15"  (seconds, optional)
 * "stagger" animates the element's direct children as a group.
 * "mask-up" rises through an overflow-hidden parent (no opacity change).
 */
const VARIANTS: Record<string, gsap.TweenVars> = {
  'fade-up': { y: 40, opacity: 0 },
  'fade-in': { opacity: 0 },
  stagger: { y: 28, opacity: 0 },
  'mask-up': { yPercent: 115 },
};

function initReveals() {
  document.querySelectorAll<HTMLElement>('[data-animate]').forEach((el) => {
    const kind = el.dataset.animate ?? 'fade-up';
    const from = VARIANTS[kind];
    if (!from) return;

    const targets = kind === 'stagger' ? el.children : el;
    const delay = Number(el.dataset.animateDelay ?? 0);

    gsap.from(targets, {
      ...from,
      duration: 1.1,
      delay,
      ease: EASE,
      stagger: kind === 'stagger' ? 0.08 : 0,
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true,
      },
    });
  });
}

/**
 * Homepage hero — masthead intro timeline.
 * Pre-states are set synchronously so nothing flashes; the timeline itself
 * waits for document.fonts so the reveal plays in the real typeface.
 */
function initHero() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  const letters = hero.querySelectorAll<HTMLElement>('[data-hero-letter]');
  const metas = hero.querySelectorAll<HTMLElement>('[data-hero-meta]');
  const connector = hero.querySelector<HTMLElement>('[data-hero-connector]');
  const wordmark = hero.querySelector<HTMLElement>('[data-hero-wordmark]');
  const nav = document.getElementById('site-nav');

  gsap.set(letters, { yPercent: 115 });
  gsap.set(metas, { opacity: 0, y: 12 });
  if (connector) gsap.set(connector, { scaleY: 0, transformOrigin: 'top center' });
  if (nav) gsap.set(nav, { opacity: 0, y: -10 });

  document.fonts.ready.then(() => {
    const tl = gsap.timeline({ defaults: { ease: EASE } });
    tl.to(letters, { yPercent: 0, duration: 1.2, stagger: 0.055 });
    if (nav) tl.to(nav, { opacity: 1, y: 0, duration: 0.6 }, '-=0.8');
    tl.to(metas, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06 }, '-=0.5');
    // connector draws last — leads the eye down into the service index
    if (connector)
      tl.to(connector, { scaleY: 1, duration: 0.9 }, '-=0.4');
  });

  // Restrained parallax — masthead drifts slightly as the hero exits
  if (wordmark) {
    gsap.to(wordmark, {
      yPercent: 10,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }
}

/** Nav slides away scrolling down, returns scrolling up. */
function initNavScroll() {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  let hidden = false;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const past = self.scroll() > 140;
      if (self.direction === 1 && past && !hidden) {
        hidden = true;
        gsap.to(nav, { yPercent: -130, duration: 0.6, ease: EASE });
      } else if (self.direction === -1 && hidden) {
        hidden = false;
        gsap.to(nav, { yPercent: 0, duration: 0.6, ease: EASE });
      }
    },
  });
}

/**
 * Subtle scroll-linked drift — data-parallax="8" moves the element ±N%
 * relative to its section while it traverses the viewport.
 */
function initParallax() {
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const amount = Number(el.dataset.parallax ?? 8);
    gsap.to(el, {
      yPercent: amount,
      ease: 'none',
      scrollTrigger: {
        trigger: el.closest('section') ?? el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });
}

function initMotion() {
  if (prefersReducedMotion()) return;
  initHero();
  initNavScroll();
  initReveals();
  initParallax();
}

function teardownMotion() {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  gsap.globalTimeline.clear();
  gsap.set(
    '[data-hero-letter], [data-hero-meta], [data-hero-connector], #site-nav',
    { clearProps: 'all' },
  );
}

document.addEventListener('astro:page-load', initMotion);
document.addEventListener('astro:before-swap', teardownMotion);

/**
 * ============================================================
 *   THE NEBULA — Main JavaScript
 *   Version  : 2.0.0
 *   Author   : Diamondz Technologiez
 *
 *   Modules (IIFE pattern — zero external dependencies):
 *     1. Utils          — shared helper functions
 *     2. OrbInit        — randomise orb float timing for organic motion
 *     3. ParallaxField  — mouse-driven depth parallax on orbs & geometry
 *     4. SubscribeForm  — AJAX-ready email capture with validation
 *     5. GearSwitcher   — floating gear button + 12-theme navigation panel
 *     6. CopyrightYear  — auto-update footer year
 *     7. Boot           — DOMContentLoaded orchestrator
 * ============================================================
 */

'use strict';

/* =========================================
   1. UTILS — Shared Helpers
   ========================================= */
const Utils = (() => {

    /**
     * Simple email regex validator.
     * @param {string} email
     * @returns {boolean}
     */
    const isValidEmail = (email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

    /**
     * Returns a random float between min (inclusive) and max (exclusive).
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    const randBetween = (min, max) => Math.random() * (max - min) + min;

    return { isValidEmail, randBetween };
})();


/* =========================================
   2. ORB INIT
   Assigns random CSS custom properties (--orb-duration, --orb-delay)
   to each orb and geo so they drift organically out of sync.
   ========================================= */
const OrbInit = (() => {

    const init = () => {
        const elements = document.querySelectorAll('.orb, .geo');

        elements.forEach((el) => {
            const duration = Utils.randBetween(10, 26).toFixed(1);
            const delay = Utils.randBetween(0, 12).toFixed(1);

            // Picked up by the CSS animation shorthand in style.css
            el.style.setProperty('--orb-duration', `${duration}s`);
            el.style.setProperty('--orb-delay', `-${delay}s`); // negative = already mid-animation on load
        });
    };

    return { init };
})();


/* =========================================
   3. PARALLAX FIELD
   Mouse-driven depth movement for orbs & geo shapes.

   Each element has a data-depth attribute (0.02 – 0.10).
   On mousemove the element is offset by:
     dx = (cursorX - centerX) * depth * 80
     dy = (cursorY - centerY) * depth * 80

   Position is smoothly lerped each RAF frame so movement
   feels fluid rather than jittery. Disabled on touch-only devices.
   ========================================= */
const ParallaxField = (() => {

    /** @type {NodeListOf<HTMLElement>} */
    let elements;

    /** Viewport centre (updated on resize) */
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;

    /** Current lerped mouse offset (normalised -1 → +1) */
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    /** requestAnimationFrame handle */
    let rafId;

    /** Lerp coefficient — lower = smoother / slower response */
    const LERP = 0.065;

    /**
     * Linear interpolation.
     * @param {number} a  current value
     * @param {number} b  target value
     * @param {number} t  factor 0–1
     * @returns {number}
     */
    const lerp = (a, b, t) => a + (b - a) * t;

    /**
     * RAF animation loop — lerps current → target then applies transforms.
     * Uses translate3d to stay on the GPU compositor thread.
     */
    const animate = () => {
        currentX = lerp(currentX, targetX, LERP);
        currentY = lerp(currentY, targetY, LERP);

        elements.forEach((el) => {
            const depth = parseFloat(el.dataset.depth || 0.05);
            const dx = currentX * depth * 80; // max ~±40px at depth 0.5
            const dy = currentY * depth * 80;
            el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
        });

        rafId = requestAnimationFrame(animate);
    };

    /**
     * Normalise cursor position to [-1, 1] relative to viewport centre.
     * @param {MouseEvent} e
     */
    const onMouseMove = (e) => {
        targetX = (e.clientX - cx) / cx;
        targetY = (e.clientY - cy) / cy;
    };

    /** Keep centre coordinates accurate after a browser resize. */
    const onResize = () => {
        cx = window.innerWidth / 2;
        cy = window.innerHeight / 2;
    };

    /** Returns true when the primary input device has no hover capability. */
    const isTouchOnly = () => window.matchMedia('(hover: none)').matches;

    const init = () => {
        elements = document.querySelectorAll('.orb[data-depth], .geo[data-depth]');
        if (!elements.length || isTouchOnly()) return;

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });
        rafId = requestAnimationFrame(animate);
    };

    const destroy = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(rafId);
    };

    return { init, destroy };
})();


/* =========================================
   4. SUBSCRIBE FORM
   AJAX-ready email capture with glassmorphic validation states.

   ── HOW TO CONNECT YOUR ENDPOINT ────────────────────────────
   Find the sendToApi() function below and replace the
   setTimeout mock with a real fetch() to your API:

   const sendToApi = (email) =>
     fetch('/api/subscribe', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email }),
     }).then(res => res.json());
   ─────────────────────────────────────────────────────────────
   ========================================= */
const SubscribeForm = (() => {

    /** @type {HTMLFormElement} */
    let form;
    /** @type {HTMLInputElement} */
    let emailInput;
    /** @type {HTMLElement} */
    let fieldWrap, messageEl, submitBtn;

    /**
     * Set the form feedback message and type.
     * @param {string} text
     * @param {'success'|'error'|''} type
     */
    const setMessage = (text, type = '') => {
        messageEl.textContent = text;
        messageEl.className = 'subscribe-form__message';
        if (type) messageEl.classList.add(`is-${type}`, 'is-visible');
        else messageEl.classList.remove('is-visible');
    };

    /** Remove all validation state classes. */
    const resetState = () => {
        fieldWrap.classList.remove('is-valid', 'is-error');
        setMessage('');
    };

    /**
     * Simulated API call — replace this body with your real endpoint.
     * @param {string} email
     * @returns {Promise<{ok: boolean, message: string}>}
     */
    const sendToApi = (email) =>
        new Promise((resolve) => {
            // ── REPLACE THIS BLOCK WITH YOUR REAL ENDPOINT ──────────
            //
            // Example:
            // return fetch('/api/subscribe', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({ email }),
            // }).then(res => res.json());
            //
            // ─────────────────────────────────────────────────────────
            setTimeout(() => {
                const success = Math.random() > 0.05; // 95% success for demo
                resolve({
                    ok: success,
                    message: success
                        ? `You're on the list! We'll notify ${email} at launch. 🚀`
                        : 'Oops — something went wrong. Please try again.',
                });
            }, 1400);
        });

    /**
     * Form submit handler.
     * @param {SubmitEvent} e
     */
    const onSubmit = async (e) => {
        e.preventDefault();
        resetState();

        const email = emailInput.value.trim();

        // ── Client-side validation ──
        if (!email) {
            fieldWrap.classList.add('is-error');
            setMessage('Please enter your email address.', 'error');
            emailInput.focus();
            return;
        }

        if (!Utils.isValidEmail(email)) {
            fieldWrap.classList.add('is-error');
            setMessage('Please enter a valid email address.', 'error');
            emailInput.focus();
            return;
        }

        // ── Loading state ──
        submitBtn.disabled = true;
        submitBtn.querySelector('.subscribe-form__btn-text').textContent = 'Sending…';
        setMessage('Transmitting signal into the cosmos…');
        messageEl.classList.add('is-visible');

        // ── API call ──
        try {
            const result = await sendToApi(email);
            if (result.ok) {
                fieldWrap.classList.add('is-valid');
                setMessage(result.message, 'success');
                emailInput.value = '';
            } else {
                fieldWrap.classList.add('is-error');
                setMessage(result.message, 'error');
            }
        } catch {
            fieldWrap.classList.add('is-error');
            setMessage('Connection lost. Please check your network and retry.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.querySelector('.subscribe-form__btn-text').textContent = 'Notify Me';
        }
    };

    const init = () => {
        form = document.getElementById('subscribeForm');
        if (!form) return;

        emailInput = document.getElementById('emailInput');
        fieldWrap = document.getElementById('emailWrap');
        messageEl = document.getElementById('formMessage');
        submitBtn = document.getElementById('subscribeBtn');

        form.addEventListener('submit', onSubmit);
        // Clear error state as the user begins correcting their input
        emailInput.addEventListener('input', resetState);
    };

    return { init };
})();


/* =========================================
   5. GEAR SWITCHER
   Floating gear button that reveals a glassmorphic panel
   containing direct links to all 12 theme HTML files.

   Unlike the old inline data-theme swatch switcher, this
   navigates to separate pages — exactly how buyers will
   use the template. The current page link is highlighted.
   ========================================= */
const GearSwitcher = (() => {

    /** The outer wrapper element */
    let switcher;
    /** The toggle button */
    let btn;
    /** The expandable panel */
    let panel;

    /**
     * Determine which theme page is currently active by matching
     * location.pathname against the href of each link in the panel.
     */
    const highlightCurrentPage = () => {
        const links = panel.querySelectorAll('.gear-switcher__item');
        const currentFile = window.location.pathname.split('/').pop() || 'index-01.html';

        links.forEach((link) => {
            const linkFile = link.getAttribute('href').split('/').pop();
            link.classList.toggle('is-active', linkFile === currentFile);
        });
    };

    /**
     * Toggle the panel open/closed.
     * Manages aria-expanded and aria-hidden for accessibility.
     */
    const toggle = () => {
        const isOpen = switcher.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(isOpen));
        panel.setAttribute('aria-hidden', String(!isOpen));
    };

    /** Close the panel (e.g. when clicking outside). */
    const close = () => {
        switcher.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        panel.setAttribute('aria-hidden', 'true');
    };

    const init = () => {
        switcher = document.getElementById('gearSwitcher');
        if (!switcher) return;

        btn = document.getElementById('gearBtn');
        panel = document.getElementById('gearPanel');

        // Toggle panel on gear button click
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggle();
        });

        // Close when clicking anywhere outside the switcher
        document.addEventListener('click', (e) => {
            if (!switcher.contains(e.target)) close();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
        });

        // Highlight the active page link
        highlightCurrentPage();
    };

    return { init };
})();


/* =========================================
   6. COPYRIGHT YEAR — auto-update footer
   ========================================= */
const CopyrightYear = (() => {
    const init = () => {
        const el = document.getElementById('copyrightYear');
        if (el) el.textContent = new Date().getFullYear();
    };
    return { init };
})();


/* =========================================
   7. BOOT — DOMContentLoaded Orchestrator
   Modules initialise in dependency order.
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {

    // 1. Randomise orb timings before they become visible
    OrbInit.init();

    // 2. Start mouse parallax depth field
    ParallaxField.init();

    // 3. Wire up the subscription form
    SubscribeForm.init();

    // 4. Initialise the gear theme switcher
    GearSwitcher.init();

    // 5. Update copyright year
    CopyrightYear.init();

});

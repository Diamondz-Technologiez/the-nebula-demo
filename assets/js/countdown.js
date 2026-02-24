/**
 * ============================================================
 *   THE NEBULA — Countdown Timer
 *   Version  : 2.0.0
 *   Author   : Diamondz Technologiez
 *
 *   Self-contained IIFE countdown module.
 *   Reads the ISO 8601 date from data-target-date on .countdown.
 *   Updates every second with a digit-flip micro-animation.
 *
 *   ── HOW TO CHANGE YOUR LAUNCH DATE ──────────────────────
 *   In your HTML, find the .countdown element and update the
 *   data-target-date attribute to your target launch date:
 *
 *   <div class="countdown" data-target-date="2027-01-01T00:00:00Z">
 *
 *   Use ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ (UTC)
 *   ─────────────────────────────────────────────────────────
 * ============================================================
 */

'use strict';

(function () {

    /* =========================================
       HELPERS
       ========================================= */

    /**
     * Pad a number to 2 digits with a leading zero.
     * @param {number} n
     * @returns {string}
     */
    const pad2 = (n) => String(n).padStart(2, '0');

    /**
     * Trigger the CSS flip animation on a digit element.
     * Removes and re-adds the class to force a reflow restart.
     * @param {HTMLElement} el
     */
    const triggerFlip = (el) => {
        el.classList.remove('is-flipping');
        void el.offsetWidth; // force reflow
        el.classList.add('is-flipping');
    };

    /**
     * Update a digit element only when its value changes.
     * @param {HTMLElement} el       — the digit span
     * @param {number}      newVal   — calculated value this tick
     * @param {number}      oldVal   — previously displayed value
     * @returns {number} newVal (for storing back into prev)
     */
    const updateDigit = (el, newVal, oldVal) => {
        if (newVal !== oldVal) {
            el.textContent = pad2(newVal);
            triggerFlip(el);
        }
        return newVal;
    };

    /* =========================================
       COUNTDOWN MODULE
       ========================================= */

    /**
     * Initialise the countdown timer.
     * Reads data-target-date from .countdown[data-target-date].
     */
    const init = () => {
        const container = document.querySelector('.countdown[data-target-date]');
        if (!container) return;

        const daysEl = document.getElementById('cd-days');
        const hoursEl = document.getElementById('cd-hours');
        const minsEl = document.getElementById('cd-mins');
        const secsEl = document.getElementById('cd-secs');

        if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

        /** Previous values — used to detect digit changes */
        let prev = { d: -1, h: -1, m: -1, s: -1 };

        /** setInterval handle */
        let intervalId;

        /**
         * Main tick function — recalculates remaining time each second.
         */
        const tick = () => {
            const targetDate = new Date(container.dataset.targetDate);
            const diff = targetDate.getTime() - Date.now();

            if (diff <= 0) {
                // Countdown has finished
                clearInterval(intervalId);
                daysEl.textContent = hoursEl.textContent = minsEl.textContent = secsEl.textContent = '00';
                container.setAttribute('aria-label', 'We have launched!');
                return;
            }

            const totalSecs = Math.floor(diff / 1000);
            const d = Math.floor(totalSecs / 86400);
            const h = Math.floor((totalSecs % 86400) / 3600);
            const m = Math.floor((totalSecs % 3600) / 60);
            const s = totalSecs % 60;

            prev.d = updateDigit(daysEl, d, prev.d);
            prev.h = updateDigit(hoursEl, h, prev.h);
            prev.m = updateDigit(minsEl, m, prev.m);
            prev.s = updateDigit(secsEl, s, prev.s);
        };

        tick(); // immediate first render — no 1s delay on load
        intervalId = setInterval(tick, 1000);
    };

    /* =========================================
       BOOT
       ========================================= */
    document.addEventListener('DOMContentLoaded', init);

})();

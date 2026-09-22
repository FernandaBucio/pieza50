/**
 * Pieza50 — main.js
 * Handles: nav scrolled state, dropdown menus, mobile burger, word cycler
 */

(function () {
  'use strict';

  // ── Nav: add shadow on scroll ─────────────────────────────────────────
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // ── Dropdown menus (hover + keyboard) ─────────────────────────────────
  document.querySelectorAll('.has-dropdown').forEach(function (item) {
    const btn = item.querySelector('.nav-link');

    // Toggle on click (for keyboard / touch users)
    btn && btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      // Close siblings
      document.querySelectorAll('.has-dropdown.open').forEach(function (other) {
        if (other !== item) {
          other.classList.remove('open');
          const ob = other.querySelector('.nav-link');
          ob && ob.setAttribute('aria-expanded', 'false');
        }
      });
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', function () {
    document.querySelectorAll('.has-dropdown.open').forEach(function (item) {
      item.classList.remove('open');
      const btn = item.querySelector('.nav-link');
      btn && btn.setAttribute('aria-expanded', 'false');
    });
  });

  // ── Mobile burger ──────────────────────────────────────────────────────
  const burger   = document.getElementById('nav-burger');
  const navItems = document.getElementById('nav-items');

  burger && burger.addEventListener('click', function () {
    const isOpen = navItems.classList.toggle('open');
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    // Animate burger spans
    const spans = burger.querySelectorAll('span');
    if (isOpen) {
      spans[0].style.transform = 'translateY(7px) rotate(45deg)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity   = '';
      spans[2].style.transform = '';
    }
  });

  // ── Word cycler ────────────────────────────────────────────────────────
  const cyclingEl = document.getElementById('cyclingWord');
  if (cyclingEl) {
    const words    = ['people', 'decisions', 'business', 'products'];
    let   index    = 0;
    const INTERVAL = 2600;   // ms between transitions
    const FADE_MS  = 380;    // ms for each fade leg

    function nextWord() {
      // Exit animation
      cyclingEl.classList.add('exit');

      setTimeout(function () {
        index = (index + 1) % words.length;
        cyclingEl.textContent = words[index];
        cyclingEl.classList.remove('exit');
        cyclingEl.classList.add('enter');

        // Force reflow so the enter class triggers
        void cyclingEl.offsetWidth;
        cyclingEl.classList.remove('enter');
      }, FADE_MS);
    }

    setInterval(nextWord, INTERVAL);
  }

})();

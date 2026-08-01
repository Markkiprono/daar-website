/* Daar — prototype behaviour (Phase 0).
   Rewritten as React components in Phase 3; this exists so the
   static board demonstrates the real interactions. */
(function () {
  'use strict';

  /* --- nav: transparent over the hero, solid once you scroll --- */
  var nav = document.getElementById('nav');
  if (nav && !nav.classList.contains('is-static')) {
    var onScroll = function () {
      nav.classList.toggle('is-solid', window.scrollY > 60);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --- mobile drawer --- */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  if (burger && drawer) {
    var setOpen = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      drawer.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  /* --- scroll reveal --- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* --- menu category filter --- */
  var chips = document.querySelectorAll('.chip[data-filter]');
  var sections = document.querySelectorAll('.menu-section[data-cat]');
  if (chips.length && sections.length) {
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var want = chip.getAttribute('data-filter');
        chips.forEach(function (c) {
          c.setAttribute('aria-pressed', String(c === chip));
        });
        sections.forEach(function (sec) {
          var show = want === 'all' || sec.getAttribute('data-cat') === want;
          sec.hidden = !show;
        });
        // keep the bar in view when narrowing the list
        if (want !== 'all') {
          var target = document.getElementById(want);
          if (target) {
            window.scrollTo({
              top: target.offsetTop - 120,
              behavior: 'smooth'
            });
          }
        }
      });
    });
  }
})();

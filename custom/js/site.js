// Healthy Futures — small UI enhancements
(function () {
  document.documentElement.classList.add('js');

  // Header turns solid once the page scrolls (or the mobile menu opens)
  var header = document.querySelector('.site-header');
  var menu = document.getElementById('navbarNav');
  function updateHeader() {
    var open = menu && menu.classList.contains('show');
    header.classList.toggle('is-solid', window.scrollY > 40 || open);
  }
  if (header) {
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    if (menu) {
      menu.addEventListener('show.bs.collapse', function () { header.classList.add('is-solid'); });
      menu.addEventListener('hidden.bs.collapse', updateHeader);
    }
  }

  // Fade sections in as they scroll into view
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach(function (el) { io.observe(el); });

  // Current year in footer
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();

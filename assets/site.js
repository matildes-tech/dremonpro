/* DREMONPRO — shared subpage JS (burger menu toggle) */
(function () {
  var burger = document.getElementById('navBurger');
  var menu = document.getElementById('navMenu');
  if (!burger || !menu) return;
  function setOpen(open) {
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) menu.removeAttribute('hidden');
    else menu.setAttribute('hidden', '');
  }
  burger.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!menu.classList.contains('is-open'));
  });
  document.addEventListener('click', function (e) {
    if (!menu.classList.contains('is-open')) return;
    if (!menu.contains(e.target) && !burger.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setOpen(false);
      burger.focus();
    }
  });
})();

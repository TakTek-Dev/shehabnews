/* شهاب — المحفوظات (saved.html, Phase 3).

   Reads the list js/article.js keeps in localStorage (sh-saved) and draws it:
   newest first, remove per item, clear all, an honest empty state. No
   account yet; when accounts arrive the same list syncs to the server. */
(function () {
  'use strict';
  var host = document.querySelector('[data-sh-saved-list]');
  if (!host) return;
  var empty = document.querySelector('[data-sh-saved-empty]');
  var count = document.querySelector('[data-sh-saved-count]');
  var clear = document.querySelector('[data-sh-saved-clear]');
  var esc = ShUI.esc;
  function store(v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('sh-saved')) || []; localStorage.setItem('sh-saved', JSON.stringify(v)); } catch (e) { return []; } }

  function render() {
    var list = store();
    host.innerHTML = list.map(function (x, i) {
      return '<article class="sh-saved__row">' +
        '<a class="sh-saved__body" href="' + esc(x.href) + '">' +
        '<span class="sh-meta">' + (x.cat ? '<span class="sh-link">' + esc(x.cat) + '</span>' : '') + '<time class="sh-meta__time" datetime="' + esc(x.at) + '"></time></span>' +
        '<span class="sh-card__title">' + esc(x.t) + '</span></a>' +
        '<button type="button" class="sh-saved__rm" data-sh-saved-rm="' + i + '" aria-label="إزالة من المحفوظات">' + ShUI.icon('xmark') + '</button>' +
        '</article>';
    }).join('');
    ShUI.paintTimes(host);
    if (empty) empty.hidden = list.length > 0;
    // the count beside the title only speaks when there is something to count
    if (count) { count.textContent = list.length === 1 ? 'مادة واحدة' : list.length === 2 ? 'مادتان' : list.length <= 10 ? list.length + ' مواد' : list.length + ' مادة'; count.hidden = !list.length; }
    if (clear) clear.hidden = !list.length;
  }
  host.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sh-saved-rm]');
    if (!b) return;
    var list = store();
    list.splice(parseInt(b.getAttribute('data-sh-saved-rm'), 10), 1);
    store(list);
    render();
    ShUI.toast('اتشالت من المحفوظات');
  });
  if (clear) clear.addEventListener('click', function () { store([]); render(); });
  window.addEventListener('storage', function (e) { if (e.key === 'sh-saved') render(); });
  render();
})();

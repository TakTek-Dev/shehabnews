/* شهاب — تواصل معنا (contact.html).

   The form is a real multipart POST to /api/contact (name, email, kind, org,
   place, message, files). Here it is checked before it leaves — the name, the
   email and the message are required, the email has to read as one — and sent
   with fetch so the reader stays on the page and reads the answer under the
   button. Until the endpoint exists the answer is the failure line, which
   points to Telegram.

   Hooks: form[data-sh-contact], [data-sh-contact-status] (data-state="ok|err"),
   [data-sh-contact-file] and [data-sh-contact-file-name]. */
(function () {
  'use strict';
  var form = document.querySelector('form[data-sh-contact]');
  if (!form) return;
  var EN = window.ShLang && ShLang.get() === 'en';
  function t(ar, en) { return EN ? en : ar; }
  var status = form.querySelector('[data-sh-contact-status]');
  var btn = form.querySelector('button[type="submit"]');
  var file = form.querySelector('[data-sh-contact-file]');
  var fileName = form.querySelector('[data-sh-contact-file-name]');
  var NO_FILE = t('لم يُختر ملف', 'No file chosen');

  function say(state, text) {
    if (!status) return;
    if (state) status.setAttribute('data-state', state); else status.removeAttribute('data-state');
    status.textContent = text;
  }
  function showFiles() {
    if (!file || !fileName) return;
    var n = file.files ? file.files.length : 0;
    fileName.textContent = !n ? NO_FILE : n === 1 ? file.files[0].name : (EN ? n + ' files' : n + ' ملفات');
  }
  if (file) file.addEventListener('change', showFiles);

  // a field marked wrong is cleared as soon as it is filled
  form.addEventListener('input', function (e) {
    var el = e.target;
    if (el.getAttribute('aria-invalid') === 'true' && el.value.trim() && el.checkValidity()) el.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = [].filter.call(form.querySelectorAll('[required]'), function (el) {
      var wrong = !el.value.trim() || !el.checkValidity();
      if (wrong) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      return wrong;
    });
    if (bad.length) {
      var first = bad[0];
      say('err', first.type === 'email' && first.value.trim()
        ? t('صيغة البريد غير صحيحة — مثال: name@example.com', 'That email address looks wrong — e.g. name@example.com')
        : t('أكمل الحقول المطلوبة: الاسم والبريد الإلكتروني والرسالة.', 'Fill in the required fields: name, email and message.'));
      first.focus();
      return;
    }
    if (btn) btn.disabled = true;
    say('', t('جارٍ الإرسال…', 'Sending…'));
    fetch(form.getAttribute('action') || '/api/contact', { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); })
      .then(function () {
        say('ok', t('وصلت رسالتك إلى غرفة الأخبار. سنرد على بريدك.', 'Your message reached the newsroom. We will reply by email.'));
        form.reset();
        showFiles();
      })
      .catch(function () { say('err', t('تعذّر إرسال الرسالة. أعد المحاولة بعد قليل، أو راسلنا على تيليغرام.', 'The message could not be sent. Try again shortly, or reach us on Telegram.')); })
      .then(function () { if (btn) btn.disabled = false; });
  });
})();

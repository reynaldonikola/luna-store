/* Abre Instagram en la app que la clienta ya tiene instalada.
 *
 * En Android, un enlace a instagram.com lo puede resolver el sistema hacia Instagram Lite;
 * si esa app no está instalada, se abre Google Play en vez del perfil o del mensaje.
 * Aquí el enlace se reescribe como intent:// apuntando a com.instagram.android, con la
 * dirección web normal como respaldo para quien no tenga la app. En iPhone y en escritorio
 * no se toca nada: el href de siempre funciona bien.
 */
(function () {
  if (!/Android/i.test(navigator.userAgent)) return;

  function intento(url) {
    var sinEsquema = url.replace(/^https?:\/\//, "");
    return (
      "intent://" + sinEsquema +
      "#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=" +
      encodeURIComponent(url) + ";end"
    );
  }

  var enlaces = document.querySelectorAll('a[href*="instagram.com/"], a[href*="ig.me/"]');
  Array.prototype.forEach.call(enlaces, function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = intento(a.href);
    });
  });
})();

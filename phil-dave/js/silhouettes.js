/* ============================================================================
   Elegant platinum car silhouettes by body style — inlined as SVG (no extra
   HTTP requests). Used on inventory cards + the detail lightbox.
   Add a body style by adding a key here and referencing it from data.js.
   ========================================================================== */
window.SILHOUETTES = (function () {
  // shared <defs> gradient; id is unique per call to avoid collisions
  function wrap(id, inner) {
    return (
      '<svg class="silo" viewBox="0 0 1000 340" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#eceef1"/><stop offset="0.5" stop-color="#9a9ea6"/><stop offset="1" stop-color="#3a3c42"/>' +
        '</linearGradient></defs>' +
        '<g fill="url(#' + id + ')">' + inner + '</g>' +
        '<g fill="#0a0a0b"><circle cx="288" cy="286" r="40"/><circle cx="712" cy="286" r="40"/></g>' +
        '<g fill="#26282c"><circle cx="288" cy="286" r="30"/><circle cx="712" cy="286" r="30"/></g>' +
        '<g fill="#c9ccd1" opacity="0.5"><circle cx="288" cy="286" r="9"/><circle cx="712" cy="286" r="9"/></g>' +
      '</svg>'
    );
  }

  var n = 0;
  function id() { return "g" + (++n); }

  return {
    sedan: function () {
      return wrap(id(),
        '<path d="M120 270 C140 232,196 220,236 216 C272 184,332 162,404 158 C500 152,584 158,648 176 C704 192,772 214,840 222 C892 228,924 240,936 264 C940 276,934 286,918 286 L150 286 C126 286,112 282,120 270 Z"/>' +
        '<path d="M300 214 C332 186,380 170,430 167 C486 164,540 168,584 180 L560 214 Z" fill="#0a0a0b" opacity="0.35"/>');
    },
    coupe: function () {
      return wrap(id(),
        '<path d="M110 274 C132 236,196 224,238 220 C284 178,360 150,452 150 C548 150,628 168,700 196 C758 218,816 232,876 240 C916 246,940 256,940 270 C940 282,930 286,912 286 L140 286 C118 286,104 284,110 274 Z"/>' +
        '<path d="M312 218 C356 180,420 158,486 158 C548 158,604 170,648 192 L612 218 Z" fill="#0a0a0b" opacity="0.35"/>');
    },
    suv: function () {
      return wrap(id(),
        '<path d="M112 268 C120 224,150 206,196 202 C228 168,288 150,360 146 C460 140,560 142,636 152 C720 162,792 178,852 192 C900 204,932 220,936 252 C938 272,930 286,910 286 L142 286 C120 286,108 282,112 268 Z"/>' +
        '<path d="M238 200 C262 170,316 156,372 154 C372 178,372 196,372 200 Z M404 154 C470 152,536 156,592 166 L592 200 L404 200 Z" fill="#0a0a0b" opacity="0.32"/>');
    },
    wagon: function () {
      return wrap(id(),
        '<path d="M116 270 C136 234,196 222,238 218 C276 184,338 162,412 158 C520 152,628 156,712 168 C788 178,852 196,872 196 L876 158 C876 150,884 152,884 160 L884 240 C912 246,936 254,936 268 C938 280,928 286,910 286 L144 286 C122 286,110 282,116 270 Z"/>' +
        '<path d="M306 216 C340 186,392 170,448 168 C520 165,600 168,664 180 L664 216 Z" fill="#0a0a0b" opacity="0.34"/>');
    }
  };
})();

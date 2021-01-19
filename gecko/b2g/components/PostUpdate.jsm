/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

this.EXPORTED_SYMBOLS = [
  "PostUpdate"
];

this.PostUpdate = function(lock, prefs) {

  if (!lock && !prefs) {
    return;
  }

  // device.settings.version is used to track if postupdate is done.
  // To trigger postupdate process need to increase ver by 1.
  let ver = "1";
  let saved_ver = null;

  try {
    saved_ver = prefs.getCharPref("device.settings.version");
  } catch(e) {}

  if (ver !== saved_ver) {

    let req = lock.get('language.current');

    req.addEventListener('success', function onsuccess() {

      if (typeof(req.result['language.current']) != 'undefined') {

        let lang = req.result['language.current'];
        let langMap = {
          "af": "af-ZA",
          "ar": "ar-SA",
          "bn": "bn-IN",
          "de": "de-DE",
          "es-MX": "es-US",
          "es": "es-ES",
          "fr": "fr-FR",
          "hi": "hi-HI",
          "hu": "hu-HU",
          "id": "id-ID",
          "it": "it-IT",
          "ms": "ms-MY",
          "ne": "ne-IN",
          "nl": "nl-NL",
          "pl": "pl-PL",
          "ro": "ro-RO",
          "ru": "ru-RU",
          "sw": "sw-ZA",
          "ta": "ta-IN",
          "th": "th-TH",
          "tr": "tr-TR",
          "ur": "ur-PK",
          "vi": "vi-VN",
          "zu": "zu-ZA"
        };

        if (langMap[lang]) {
          lock.set({'language.current': langMap[lang]});
        }
      }
    });

    prefs.setCharPref("device.settings.version", ver);
  }
};

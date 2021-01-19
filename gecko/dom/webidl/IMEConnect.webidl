/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

[Constructor,
Constructor(unsigned long lid)]
interface IMEConnect {
  [Throws]
  void setLetter (unsigned long hexPrefix, unsigned long hexLetter);

  unsigned long setLanguage(unsigned long lid);

  readonly attribute DOMString candidateWord;

  readonly attribute short totalWord;

  readonly attribute unsigned long currentLID;

  readonly attribute DOMString name;
};

#ifdef ENABLE_KIKA_IQQI
partial interface IMEConnect {
  void setLetterMultiTap(unsigned long keyCode, unsigned long tapCount, unsigned short prevUnichar);

  DOMString getNextWordCandidates(DOMString word);

  DOMString getComposingText(DOMString word, long indicator);

  [Throws]
  void importDictionary(Blob dictionary);
};
#endif

#ifdef ENABLE_NUANCE_XT9
partial interface IMEConnect {
  attribute boolean initEmptyWord;
  attribute DOMString wholeWord;
  attribute long cursorPosition;
};
#endif

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_rt9connect_IMEConnect_h
#define mozilla_dom_rt9connect_IMEConnect_h

#include "nsCOMPtr.h"
#include "nsPIDOMWindow.h"
#include "nsISupports.h"
#include "nsWrapperCache.h"
#include "nsCycleCollectionParticipant.h"
#include "nsAutoPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "MainThreadUtils.h"

extern "C" {
#include "keypad_R9.h"
}

#include <sys/time.h>
#include <stdio.h>

#include <string.h>
#include <errno.h>

#if ANDROID_VERSION >= 23
#include <algorithm>
#else
#include <stl/_algo.h>
#endif

#if defined(MOZ_WIDGET_GONK)
#include <android/log.h>
#define LOG_RT9_TAG "GeckoRt9Connect"
#define RT9_DEBUG 0

#define RT9_LOGW(args...)  __android_log_print(ANDROID_LOG_WARN, LOG_RT9_TAG , ## args)
#define RT9_LOGE(args...)  __android_log_print(ANDROID_LOG_ERROR, LOG_RT9_TAG , ## args)

#if RT9_DEBUG
#define RT9_LOGD(args...)  __android_log_print(ANDROID_LOG_DEBUG, LOG_RT9_TAG , ## args)
#else
#define RT9_LOGD(args...)
#endif

#else

#define RT9_LOGD(args...)
#define RT9_LOGW(args...)
#define RT9_LOGE(args...)

#endif

namespace mozilla {
namespace dom {

static const int BUFFER_LEN_MAX     = 30;

typedef struct {
  nsCString psBuffer;
  unsigned int snBufferLen;
  unsigned int snCursorPos;
  unsigned int pageCount;
  unsigned int pageCursor;
  unsigned int snWordCount;
} demoEditorInfo;;

void EditorInitEmptyWord();
void ClearEditorInfo(demoEditorInfo* const pEditor);
void UpdateTotalWord();
void ClearAllSymbsShort(unsigned short* buffer,int size);
void ClearAllWordString();
void Clear_nsCString(nsCString& str);
void Clear_nsString(nsString& str);
void EditorMoveBackward(demoEditorInfo* const pEditor);
void EditorMoveForward(demoEditorInfo* const pEditor);
void UpdateCandidateWordMultitap(demoEditorInfo* const pEditor);
void UpdateCharList(demoEditorInfo* const pEditor, char ch);
void UpdateCandidateWord(demoEditorInfo* const pEditor);
int Updatesymbol(demoEditorInfo* const pEditor,const unsigned char ch);
int DeleteSymbols(demoEditorInfo* const pEditor);
void CopyRUTF16toUTF16(nsString& mCandidateWord, nsAString& aResult);
void CopynsString(nsString& source, nsString& dest, uint16_t length);


class IMEConnect final : public nsISupports, public nsWrapperCache
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(IMEConnect)

  static already_AddRefed<IMEConnect>
  Constructor(const GlobalObject& aGlobal,
              ErrorResult& aRv);

  static already_AddRefed<IMEConnect>
  Constructor(const GlobalObject& aGlobal,
              uint32_t aLID,
              ErrorResult& aRv);

  bool InitEmptyWord() const
  {
    RT9_LOGD("RT9::This is a dummy fun for InitEmptyWord");
    return (true);
  }

  void SetInitEmptyWord(const bool aResult)
  {
    RT9_LOGD("RT9::This is a dummy fun for SetInitEmptyWord");
  }

  void GetWholeWord(nsAString& aResult)
  {
    RT9_LOGD("RT9::This is a dummy fun for GetWholeWord");
  }

  void SetWholeWord(const nsAString& aResult)
  {
    RT9_LOGD("RT9::This is a dummy fun for SetWholeWord");
  }

  void GetCandidateWord(nsAString& aResult)
  {
    CopyRUTF16toUTF16(mCandidateWord, aResult);
  }

  uint16_t TotalWord() const
  {
    UpdateTotalWord();
    return mTotalWord;
  }

  uint32_t CursorPosition() const
  {
    RT9_LOGD("RT9::This is a dummy fun for CursorPosition");
    return 0;
  }

  void SetCursorPosition(const uint32_t aResult)
  {
    RT9_LOGD("RT9::This is a dummy fun for SetCursorPosition");
  }

  uint32_t CurrentLID() const
  {
    return mCurrentLID;
  }

  void GetName(nsAString& aName) const
  {
    CopyASCIItoUTF16("RT9", aName);
  }

  virtual JSObject* WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) override;

  nsCOMPtr<nsPIDOMWindowInner> mWindow;
  nsPIDOMWindowInner* GetOwner() const { return mWindow; }

  nsPIDOMWindowInner* GetParentObject()
  {
    return GetOwner();
  }

  explicit IMEConnect(nsPIDOMWindowInner* aWindow);

  nsresult Init(uint32_t aLID);

  static void SetLetter(const unsigned long aHexPrefix, const unsigned long aHexLetter, ErrorResult& aRv);
  static uint32_t SetLanguage(const uint32_t lid);

  static nsString mCandidateWord;
  static uint16_t  mTotalWord;
  static uint16_t  lenCandidateWord;
  static uint16_t  lenselectedWord;
  static uint16_t  lenprevSelectedWord;
  static uint32_t mCurrentLID;
  static nsString selectedWord;
  static nsString prevSelectedWord;

private:
  ~IMEConnect();
};
} // namespace dom
} // namespace mozilla

#endif // mozilla_dom_rt9connect_IMEConnect_h

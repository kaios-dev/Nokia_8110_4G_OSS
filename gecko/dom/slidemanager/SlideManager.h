/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_SlideManager_h
#define mozilla_dom_SlideManager_h

#include "mozilla/DOMEventTargetHelper.h"
#include "mozilla/Observer.h"
#include "nsCycleCollectionParticipant.h"

class nsIScriptContext;

namespace mozilla {
namespace dom {

class Promise;

typedef Observer<long> SlideObserver;

class SlideManager final : public DOMEventTargetHelper
                        , public SlideObserver
{
public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(SlideManager, DOMEventTargetHelper)

  explicit SlideManager(nsPIDOMWindowInner* aWindow);

  void Init();
  void Shutdown();

  already_AddRefed<Promise> GetPromise(ErrorResult& aRv);

  void Notify(const long& aIsOpened) override;

  nsPIDOMWindowInner* GetParentObject() const
  {
     return GetOwner();
  }

  virtual JSObject* WrapObject(JSContext* aCx, JS::Handle<JSObject*> aGivenProto) override;

  long CurrentSlideStatus() const
  {
    return mCurrentSlideStatus;
  }

  long LastSlideStatus() const
  {
    return mLastSlideStatus;
  }

  IMPL_EVENT_HANDLER(slidechange)

private:
  ~SlideManager();
  //default status all equal 99
  long mCurrentSlideStatus = 99;
  long mLastSlideStatus = 99;
  nsTArray<RefPtr<Promise>> mPendingSlidePromises;
};

} // namespace dom
} // namespace mozilla

#endif // mozilla_dom_SlideManager_h

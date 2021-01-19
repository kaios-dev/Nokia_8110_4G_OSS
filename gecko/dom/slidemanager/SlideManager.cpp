/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SlideManager.h"
#include "mozilla/DOMEventTargetHelper.h"
#include "mozilla/Hal.h"
#include "mozilla/dom/SlideManagerBinding.h"
#include "mozilla/dom/Promise.h"
#include "nsIDOMClassInfo.h"
#include <android/log.h>

#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "SlideManager", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "SlideManager", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)

namespace mozilla {
namespace dom {

NS_IMPL_CYCLE_COLLECTION_INHERITED(SlideManager, DOMEventTargetHelper,
                                   mPendingSlidePromises)

NS_IMPL_ADDREF_INHERITED(SlideManager, DOMEventTargetHelper)
NS_IMPL_RELEASE_INHERITED(SlideManager, DOMEventTargetHelper)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION_INHERITED(SlideManager)
NS_INTERFACE_MAP_END_INHERITING(DOMEventTargetHelper)

SlideManager::SlideManager(nsPIDOMWindowInner* aWindow)
  : DOMEventTargetHelper(aWindow)
  , mCurrentSlideStatus(0)
{
}

SlideManager::~SlideManager()
{
}

void
SlideManager::Init()
{
  hal::RegisterSlideObserver(this);
}

void
SlideManager::Shutdown()
{
  hal::UnregisterSlideObserver(this);

  for (uint32_t i = 0; i < mPendingSlidePromises.Length(); ++i) {
    mPendingSlidePromises[i]->MaybeReject(NS_ERROR_DOM_ABORT_ERR);
  }
  mPendingSlidePromises.Clear();
}

JSObject*
SlideManager::WrapObject(JSContext* aCx, JS::Handle<JSObject*> aGivenProto)
{
  return SlideManagerBinding::Wrap(aCx, this, aGivenProto);
}

void
SlideManager::Notify(const long& status)
{
  LOG("bandit SlideManager::Notify enter");
  long hasChanged = status;

  for (uint32_t i = 0; i < mPendingSlidePromises.Length(); ++i) {
    mPendingSlidePromises[i]->MaybeResolve(this);
  }
  mPendingSlidePromises.Clear();
  
  if(hasChanged == mCurrentSlideStatus) {
    LOG("bandit SlideManager::Notify slide status did not change , should not notify!!!");
    return ;
  }
  mLastSlideStatus = mCurrentSlideStatus;
  mCurrentSlideStatus = status;
  LOG("bandit SlideManager::Notify send event = %d to gaia!", mCurrentSlideStatus);
  DispatchTrustedEvent(NS_LITERAL_STRING("slidechange"));
  
}

already_AddRefed<Promise>
SlideManager::GetPromise(ErrorResult& aRv)
{
  nsCOMPtr<nsIGlobalObject> go = do_QueryInterface(GetOwner());
  if (!go) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  RefPtr<Promise> promise = Promise::Create(go, aRv);
  if (NS_WARN_IF(aRv.Failed())) {
    return nullptr;
  }

  mPendingSlidePromises.AppendElement(promise);
  hal::RequestCurrentSlideState();

  return promise.forget();
}

} // namespace dom
} // namespace mozilla

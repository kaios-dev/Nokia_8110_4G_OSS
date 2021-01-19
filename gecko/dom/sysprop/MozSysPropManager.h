/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
 /*************************************************
Copyright (C), 1988-1999, TCL. Co., Ltd.
File name: MozJrdFotaManager.h
Author               Version      Date
Han Peng       1.0            2016-2-24
Description: implement the interface defined in webidl and call to FOTA function
Others:
Function List:
History:
Date:             Author:    Modification
2016-02-24    hanpeng     initial implement

*************************************************/

#ifndef mozilla_dom_sysprop_MozSysPropManager_h
#define mozilla_dom_sysprop_MozSysPropManager_h

#include "domstubs.h"
#include "nsXULAppAPI.h"
#include "nsWrapperCache.h"
#include "mozilla/Attributes.h"
#include "nsPIDOMWindow.h"
#include "MozSysPropMessager.h"
#include "MozSysPropMain.h"
#include "sysprop_type.h"

namespace mozilla {
namespace dom {

class IDOMSysPropGetCb;
class IDOMCompleteCb;


namespace sysprop {

class MozSysPropMessager;

class MozSysPropManager MOZ_FINAL
                        : public nsISupports
                        , public nsWrapperCache
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(MozSysPropManager)

  MozSysPropManager(nsPIDOMWindow* aWindow);
  virtual ~MozSysPropManager();

  nsPIDOMWindow* GetParentObject() const { return mWindow; }
  virtual JSObject* WrapObject(JSContext* aCx) MOZ_OVERRIDE;

  /* Impliment the WebIDL interface begin*/
  NS_IMETHODIMP GetSysProp(uint32_t propId,IDOMSysPropGetCb& stringGetCb);

  NS_IMETHODIMP SetSysProp(uint32_t propId, const nsAString& propValue, IDOMCompleteCb& callback);

  NS_IMETHODIMP Execute(uint32_t propId,IDOMCompleteCb& callback);
  /* Imppliment the WebIDL interface end*/

private:
  MozSysPropMessager* mMessager;
protected:
  nsCOMPtr<nsPIDOMWindow> mWindow;

};

class MozSysPropMessager:public SysPropMessager {

public:
  MozSysPropMessager();
  MozSysPropMessager(uint32_t id,SysPropAct act,SysPropDataType dataType,nsCOMPtr<nsISupports> callback);
  MozSysPropMessager(uint32_t id,SysPropAct act,SysPropDataType dataType,const uint32_t value,nsCOMPtr<nsISupports> callback);
  MozSysPropMessager(uint32_t id,SysPropAct act,SysPropDataType dataType,const bool value,nsCOMPtr<nsISupports> callback);
  MozSysPropMessager(uint32_t id,SysPropAct act,SysPropDataType dataType,const nsString* value,nsCOMPtr<nsISupports> callback);
  virtual ~MozSysPropMessager();
  void SetParas(uint32_t id,SysPropAct act,SysPropDataType dataType,nsCOMPtr<nsISupports> callback);
  void Reset();
  inline uint32_t GetID()const{return mID;}
  inline uint32_t GetIndex()const{return index;}
  inline SysPropAct GetAct()const{return mAct;}
  inline SysPropDataType GetDataType()const{return mDataType;}
  inline const void* GetValue()const{return mValue;}

  virtual void SendGetString(const uint32_t id,const nsString& value) MOZ_OVERRIDE;
  virtual void SendGetInt(const uint32_t id,const int32_t value) MOZ_OVERRIDE;
  virtual void SendGetBool(const uint32_t id,const bool value) MOZ_OVERRIDE;
  virtual void SendGetError(const uint32_t id,const nsString& error) MOZ_OVERRIDE;
  virtual void SendCompleteResult(const uint32_t id,const bool isSuccess,const nsString& error) MOZ_OVERRIDE;
private:
  void FreeValue();
  uint32_t mID;
  uint32_t index;
  SysPropAct mAct;
  SysPropDataType mDataType;
  nsCOMPtr<nsISupports> mCb;
  const void* mValue;
  static uint32_t count;

};
} // namespace sysprop
} // namespace dom
} // namespace mozilla


#endif

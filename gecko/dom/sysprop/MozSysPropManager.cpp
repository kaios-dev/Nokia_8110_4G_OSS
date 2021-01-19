/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
 /************************************************************
 Copyright (C), 2005-2009, TCL. Co., Ltd.
 FileName: MozSysPropManager.cpp
 Author:           Version : Date:
 Han Peng	   1.0         2016-12-24
 Description:
 Version: 1.0
 Function List:
***********************************************************/

#include "mozilla/dom/ContentChild.h"
#include "MozSysPropManager.h"
#include "mozilla/dom/MozSysPropManagerBinding.h"
#include <android/log.h>
#include "MozSysPropChild.h"

#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "MozSysPropManager", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "MozSysPropManager", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)

using namespace mozilla;
using namespace mozilla::dom;
using namespace mozilla::dom::sysprop;

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(MozSysPropManager)
  NS_INTERFACE_MAP_ENTRY(nsISupports)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(MozSysPropManager)
NS_IMPL_CYCLE_COLLECTING_RELEASE(MozSysPropManager)

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(MozSysPropManager, mWindow)


MozSysPropManager::MozSysPropManager(nsPIDOMWindow* aWindow)
    : mWindow(aWindow),mMessager(NULL)
{
  /* member initializers and constructor code */
  //SetIsDOMBinding();
  LOG("constructor\n");
  if(GeckoProcessType_Default == XRE_GetProcessType()) {
    mMessager = new MozSysPropMessager();
  }
}

MozSysPropManager::~MozSysPropManager()
{
  /* destructor code */
  if(GeckoProcessType_Default == XRE_GetProcessType()) {
    if (mMessager != NULL){
      delete mMessager;
      mMessager = NULL;
    }
  }
}

JSObject*
MozSysPropManager::WrapObject(JSContext* aCx)
{
  return MozSysPropManagerBinding::Wrap(aCx, this);
}

NS_IMETHODIMP MozSysPropManager::GetSysProp(uint32_t propId,IDOMSysPropGetCb& stringGetCb)
{
  LOG("GetSysProp\n");
  if(GeckoProcessType_Default == XRE_GetProcessType()) {
     LOG("in main process\n");
     #ifdef MOZ_WIDGET_GONK
     SysPropMain* pMain =SysPropMain::getInstance();
     mMessager->SetParas(propId,SYS_PROP_ACT_GET,SYS_PROP_DATA_STR,&stringGetCb);
     pMain->setMessager(mMessager);
     pMain->GetSysProp(propId,true);
     #endif
  } else {
      //Execute child function
     LOG("in child process\n");
     SysPropChild::getInstace(new MozSysPropMessager(propId,SYS_PROP_ACT_GET,SYS_PROP_DATA_STR,&stringGetCb));
  }
  return NS_OK;
}

NS_IMETHODIMP MozSysPropManager::SetSysProp(uint32_t propId, const nsAString& propValue, IDOMCompleteCb& callback)
{
  nsString str(propValue);
  LOG("SetSysProp\n");
  if(GeckoProcessType_Default == XRE_GetProcessType()) {
    int rslt;
    LOG("in main process:value:%s\n",NS_ConvertUTF16toUTF8(str).get());
    #ifdef MOZ_WIDGET_GONK
    SysPropMain* pMain =SysPropMain::getInstance();
    mMessager->SetParas(propId,SYS_PROP_ACT_SET,SYS_PROP_DATA_STR,&callback);
    pMain->setMessager(mMessager);
    pMain->SetSysProp(propId,str,true,&rslt);
    #endif
  } else {
    LOG("in child process:value:%s\n",NS_ConvertUTF16toUTF8(str).get());
    SysPropChild::getInstace(new MozSysPropMessager(propId,SYS_PROP_ACT_SET,SYS_PROP_DATA_STR,&str,&callback));
  }
  return NS_OK;
}

NS_IMETHODIMP MozSysPropManager::Execute(uint32_t propId,IDOMCompleteCb& callback)
{
  LOG("Execute\n");
  if(GeckoProcessType_Default == XRE_GetProcessType()) {
    LOG("in main process\n");
    #ifdef MOZ_WIDGET_GONK
    SysPropMain* pMain =SysPropMain::getInstance();
    mMessager->SetParas(propId,SYS_PROP_ACT_EXE,SYS_PROP_DATA_OTH,&callback);
    pMain->setMessager(mMessager);
    pMain->DoOtherAction(propId,true);
    #endif
  } else {
    LOG("in child process\n");
    SysPropChild::getInstace(new MozSysPropMessager(propId,SYS_PROP_ACT_EXE,SYS_PROP_DATA_OTH,&callback));
  }
  return NS_OK;
}

uint32_t MozSysPropMessager::count = 0;

MozSysPropMessager::MozSysPropMessager()
                    :mID(0xFFFF),
                    mAct(SYS_PROP_ACT_OTH),
                    mDataType(SYS_PROP_DATA_OTH),
                    mValue(NULL),
                    mCb(NULL),
                    index(count++){
}

MozSysPropMessager::MozSysPropMessager(uint32_t id,SysPropAct act,SysPropDataType dataType,nsCOMPtr<nsISupports> callback)
                    :mID(id),
                    mAct(act),
                    mDataType(dataType),
                    mValue(NULL),
                    mCb(callback),
                    index(count++){

}

MozSysPropMessager::MozSysPropMessager(uint32_t id,SysPropAct act,SysPropDataType dataType,const uint32_t value,nsCOMPtr<nsISupports> callback)
                    :mID(id),
                    mAct(act),
                    mDataType(dataType),
                    mCb(callback),
                    index(count++){
  uint32_t* pInt = new uint32_t;
  *pInt = value;
  mValue = pInt;
}
MozSysPropMessager::MozSysPropMessager(uint32_t id,SysPropAct act,SysPropDataType dataType,const bool value,nsCOMPtr<nsISupports> callback)
                    :mID(id),
                    mAct(act),
                    mDataType(dataType),
                    mCb(callback),
                    index(count++){
  bool* pBool = new bool;
  *pBool = value;
  mValue = pBool;
}

MozSysPropMessager::MozSysPropMessager(uint32_t id,SysPropAct act,SysPropDataType dataType,const nsString* value,nsCOMPtr<nsISupports> callback)
                    :mID(id),
                    mAct(act),
                    mDataType(dataType),
                    mCb(callback),
                    index(count++){
  mValue = new nsString(*value);
}

MozSysPropMessager::~MozSysPropMessager(){
  LOG("enter");
  FreeValue();
}

void MozSysPropMessager::FreeValue(){
  if (mValue != NULL){
    if (mDataType == SYS_PROP_DATA_STR) {
      delete (nsString*)mValue;
    } else if (mDataType == SYS_PROP_DATA_INT){
      delete (uint32_t*)mValue;
    } else if (mDataType == SYS_PROP_DATA_BOOL){
      delete (bool*)mValue;
    } else {
      free((void*)mValue);
      LOG("Go here something maybe wrong\n");
    }
    mValue = NULL;
  }
  /*Release the proper link*/
  if (mCb != NULL) {
    mCb = NULL;
  }
}

void MozSysPropMessager::SetParas(uint32_t id,SysPropAct act,SysPropDataType dataType,nsCOMPtr<nsISupports> callback){
  LOG("enter mValue  == NULL ?:%d\n",mValue == NULL);
  FreeValue();
  mID = id;
  mAct = act;
  mDataType = dataType;
  mCb = callback;
}

void MozSysPropMessager::Reset(){
  FreeValue();
  mID = 0xFFFF;
  mAct = SYS_PROP_ACT_OTH;
  mDataType = SYS_PROP_DATA_OTH;
  mCb = NULL;
}
void MozSysPropMessager::SendGetString(const uint32_t id,const nsString& value){
  ErrorResult aRv;
  nsString err;
  LOG("Gecko send to Gaia\n");
  if(mID == id && mDataType == SYS_PROP_DATA_STR && mAct == SYS_PROP_ACT_GET) {
    err.AssignASCII("NoError");
    if (mCb != NULL) {
      nsCOMPtr<IDOMSysPropGetCb> strCb = reinterpret_cast<IDOMSysPropGetCb*>((nsISupports*)(mCb));
      strCb->GetSysProp(id,true,value,err,aRv);
      mCb = NULL;
      strCb = NULL;
      return;
    }
  }
  LOG("id,act,dataType or strGetCb is error\n");
}

void MozSysPropMessager::SendGetInt(const uint32_t id,const int32_t value){
#if 0
  ErrorResult aRv;
  nsString err;
  LOG("Gecko send to Gaia\n");
  if(mID == id && mDataType == SYS_PROP_DATA_INT && mAct == SYS_PROP_ACT_GET) {
    err.AssignASCII("NoError");
    if (mCb != NULL) {
      nsCOMPtr<IDOMLongGetCb> intCb = reinterpret_cast<IDOMLongGetCb*>((nsISupports*)mCb);
      intCb->GetSysProp(id,true,value,err,aRv);
      return;
    }
  }
  LOG("id,act,dataType or strGetCb is error\n");
#endif
}

void MozSysPropMessager::SendGetBool(const uint32_t id,const bool value){
#if 0
  ErrorResult aRv;
  nsString err;
  LOG("Gecko send to Gaia\n");
  if(mID == id && mDataType == SYS_PROP_DATA_BOOL && mAct == SYS_PROP_ACT_GET) {
    err.AssignASCII("NoError");
    if (mCb != NULL) {
      nsCOMPtr<IDOMBooleanGetCb> boolCb = reinterpret_cast<IDOMBooleanGetCb*>((nsISupports*)mCb);
      boolCb->GetSysProp(id,true,value,err,aRv);
      return;
    }
  }
  LOG("id,act,dataType or strGetCb is error\n");
#endif
}

void MozSysPropMessager::SendGetError(const uint32_t id,const nsString& error){
  ErrorResult aRv;
  LOG("id:%d,error:%s",id,NS_ConvertUTF16toUTF8(error).get());
  if(mID == id && mAct == SYS_PROP_ACT_GET) {
    switch (mDataType){
      case SYS_PROP_DATA_STR:
        if (mCb != NULL) {
          nsCOMPtr<IDOMSysPropGetCb> strCb = reinterpret_cast<IDOMSysPropGetCb*>((nsISupports*)(mCb));
          strCb->GetSysProp(id,false,error,error,aRv);
          mCb = NULL;
          strCb = NULL;
        }
        break;
#if 0
      case SYS_PROP_DATA_INT:
        if (mCb != NULL) {
          nsCOMPtr<IDOMLongGetCb> intCb = reinterpret_cast<IDOMLongGetCb*>((nsISupports*)mCb);
          intCb->GetSysProp(id,false,0,error,aRv);
        }
        break;
      case SYS_PROP_DATA_BOOL:
        if (mCb != NULL) {
          nsCOMPtr<IDOMBooleanGetCb> boolCb = reinterpret_cast<IDOMBooleanGetCb*>((nsISupports*)mCb);
          boolCb->GetSysProp(id,false,false,error,aRv);
        }
        break;
#endif
      default:LOG("dataType is error\n");
    }
  } else {
    LOG("id or act is error\n");
  }
}

void MozSysPropMessager::SendCompleteResult(const uint32_t id,const bool isSuccess,const nsString& error){
  ErrorResult aRv;
  LOG("Gecko send to Gaia\n");
  if(mID == id && (mAct == SYS_PROP_ACT_SET || mAct == SYS_PROP_ACT_EXE)) {
    if (mCb != NULL) {
      nsCOMPtr<IDOMCompleteCb> completeCb = reinterpret_cast<IDOMCompleteCb*>((nsISupports*)(mCb));
      completeCb->Complete(id,isSuccess,error,aRv);
      mCb = NULL;
      completeCb = NULL;
      return;
    }
  }
  LOG("id,act,or strGetCb is error\n");
}


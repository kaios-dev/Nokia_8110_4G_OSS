#include "MozSysPropChild.h"
#include "mozilla/dom/ContentChild.h"


#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "MozSysPropChild", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "MozSysPropChild", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)
#define WAIT_RESPONSE_TIME 90*1000/*90s*/

namespace mozilla {
namespace dom {
namespace sysprop {

SysPropChild* SysPropChild::mInstace = NULL;
PSysPropChild* SysPropChild::mChildParent = NULL;


SysPropChild::SysPropChild():mWaitResponse(false),mWaitResponseTimer(NULL) {
  LOG("SysPropChild create object\n");
  MOZ_COUNT_CTOR(SysPropChild);
}

SysPropChild::~SysPropChild() {
  LOG("SysPropChild release object\n");
  MOZ_COUNT_DTOR(SysPropChild);
  mMsgQueue.ClearData();
  mWaitResponseTimer = NULL;
}

SysPropChild* SysPropChild::getInstace(){
  getChildParent();
  if(mInstace == NULL){
    mInstace = (SysPropChild*)mChildParent;
  }
  return mInstace;
}

SysPropChild* SysPropChild::getInstace(MozSysPropMessager* messager){
  getInstace();
  mInstace->PushMessager(messager);
  return mInstace;
}

PSysPropChild* SysPropChild::getChildParent(){
  if(mChildParent == NULL) {
    mChildParent = ContentChild::GetSingleton()->SendPSysPropConstructor();
  }
  return mChildParent;
}

void SysPropChild::ResponseTimerCb(nsITimer *aTimer, void *aClosure){
  SysPropChild* self = (SysPropChild*)aClosure;
  LOG("enter");
  if (self != NULL){
    self->SetWaitResponse(false);
    MozSysPropMessager* msg = self->mMsgQueue.Popback();
    if(msg != NULL) {
      nsString str;
      str.AssignASCII("Time out");
      if (msg->GetAct() == SYS_PROP_ACT_GET){
        msg->SendGetError(msg->GetID(),str);
      } else if (msg->GetAct() == SYS_PROP_ACT_SET || msg->GetAct() == SYS_PROP_ACT_EXE){
        msg->SendCompleteResult(msg->GetID(),false,str);
      }
      delete msg;
    }
    self->ProcessMessager();
  } else {
    LOG("Time callback is error");
  }
}

void SysPropChild::setMessager(MozSysPropMessager* messager){
  LOG("Enter");
  PushMessager(messager);
}

void SysPropChild::PushMessager(MozSysPropMessager* msg){

  LOG("enter");
  if(msg == NULL){
    LOG("This message is null\n");
    return;
  }
  mMsgQueue.Push(msg);
  if (mMsgQueue.Length() <= 1){
    /*immediately send to parent*/
    SetWaitResponse(false);
    Send2Parent(msg);
  }
}

void SysPropChild::ProcessMessager(){
  LOG("enter mWaitResponse = %d\n",mWaitResponse);
  if(mWaitResponse == false) {
    MozSysPropMessager* msg = mMsgQueue.Laster();
    if (msg == NULL && mMsgQueue.Length()<= 0) {
      LOG("ALL requests are done\n");
    } else if (msg != NULL){
      Send2Parent(msg);
    } else {
      LOG("something is error the Queue is not empty\n");
    }
  }
}

void SysPropChild::Send2Parent(MozSysPropMessager* msg){
  LOG("enter mWaitResponse = %d\n",mWaitResponse);
  /*no wait response, just send*/
  if(mWaitResponse == false){
    uint32_t id =msg->GetID();
    SysPropAct act = msg->GetAct();
    SysPropDataType dataType = SYS_PROP_DATA_OTH;
    const void* pValue = NULL;

    if(mWaitResponseTimer == NULL) {
      mWaitResponseTimer = do_CreateInstance("@mozilla.org/timer;1");
    }

    if (act == SYS_PROP_ACT_GET){
      mChildParent->SendGetSysProp(id);
      SetWaitResponse(true);
      mWaitResponseTimer->InitWithFuncCallback(SysPropChild::ResponseTimerCb,this,WAIT_RESPONSE_TIME,nsITimer::TYPE_ONE_SHOT);
    } else if (act == SYS_PROP_ACT_SET){
      dataType = msg->GetDataType();
      pValue = msg->GetValue();
      switch(dataType){
        case SYS_PROP_DATA_STR:
          mChildParent->SendSetSysProp(id,*((const nsString*)pValue));
          SetWaitResponse(true);
          mWaitResponseTimer->InitWithFuncCallback(SysPropChild::ResponseTimerCb,this,WAIT_RESPONSE_TIME,nsITimer::TYPE_ONE_SHOT);
          break;
#if 0
        case SYS_PROP_DATA_INT:
          mChildParent->SendSetSysPropInt(id,*((const uint32_t*)pValue));
          mWaitResponse = true;
          break;
        case SYS_PROP_DATA_BOOL:
          mChildParent->SendSetSysPropBool(id,*((const bool*)pValue));
          mWaitResponse = true;
          break;
#endif
        default:;
      }
   } else if (act == SYS_PROP_ACT_EXE) {
     mChildParent->SendExecute(id);
     SetWaitResponse(true);
     mWaitResponseTimer->InitWithFuncCallback(SysPropChild::ResponseTimerCb,this,WAIT_RESPONSE_TIME,nsITimer::TYPE_ONE_SHOT);
   }
 }
}

bool SysPropChild::RecvSysPropValue(const uint32_t& id,const nsString& sysProp){
  LOG("Enter");

  SetWaitResponse(false);
  mWaitResponseTimer->Cancel();
  MozSysPropMessager* msg = mMsgQueue.Popback();
  if(msg != NULL) {
    msg->SendGetString(id,sysProp);
    delete msg;
  }
  ProcessMessager();
  return true;
}
bool SysPropChild::RecvSysPropValueError(const uint32_t& id,const nsString& error){
  LOG("Enter");

  SetWaitResponse(false);
  mWaitResponseTimer->Cancel();
  SysPropMessager* msg = mMsgQueue.Popback();
  if(msg != NULL) {
    msg->SendGetError(id,error);
    delete msg;
  }
  ProcessMessager();
  return true;
}

bool SysPropChild::RecvCompleteResult(const uint32_t& id,const bool& isSuccess,const nsString& error){
  LOG("Enter");

  SetWaitResponse(false);
  mWaitResponseTimer->Cancel();
  SysPropMessager* msg = mMsgQueue.Popback();
  if(msg != NULL) {
    msg->SendCompleteResult(id,isSuccess,error);
    delete msg;
  }
  ProcessMessager();
  return true;
}

}
}
}

#include "MozSysPropParent.h"
#include "MozSysPropMain.h"

namespace mozilla {
namespace dom {
namespace sysprop{

  NS_INTERFACE_MAP_BEGIN(SysPropParent)
  NS_INTERFACE_MAP_ENTRY(nsISupports)
  NS_INTERFACE_MAP_END
  NS_IMPL_ADDREF(SysPropParent)
  NS_IMPL_RELEASE(SysPropParent)

#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "MozSysPropParent", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "MozSysPropParent", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)


SysPropParent::SysPropParent() {
  LOG("enter\n");
  MOZ_COUNT_CTOR(SysPropParent);
}

SysPropParent::~SysPropParent() {
  LOG("enter\n");
  MOZ_COUNT_DTOR(SysPropParent);
}

void SysPropParent::ActorDestroy(ActorDestroyReason aWhy) {
}

bool SysPropParent::RecvGetSysProp(const uint32_t& id){
  LOG("enter\n");
  SysPropMain::getInstance(this);
  SysPropMain::getInstance()->GetSysProp(id,true);
  return true;
}

bool SysPropParent::RecvExecute(const uint32_t& id){
  LOG("enter\n");
  SysPropMain::getInstance(this);
  SysPropMain::getInstance()->DoOtherAction(id,true);
  return true;
}

bool SysPropParent::RecvSetSysProp(const uint32_t& id,const nsString& sysProp){
  LOG("enter\n");
  SysPropMain::getInstance(this);
  SysPropMain::getInstance()->SetSysProp(id,sysProp,true,NULL);
  return true;
}

void SysPropParent::SendGetString(const uint32_t id,const nsString& value) {
   LOG("SendGetString to child id:%d value:%s",id, NS_ConvertUTF16toUTF8(value).get());
   PSysPropParent::SendSysPropValue(id,value);
}

void SysPropParent::SendGetInt(const uint32_t id,const int32_t value){
   LOG("SendGetInt to child id:%d,value:%d\n",id,value);
   //PSysPropParent::SendSysPropValueInt(id,value);
}

void SysPropParent::SendGetBool(const uint32_t id,const bool value){
   LOG("SendGetBool to child id:%d value:%d\n", id,value);
   //PSysPropParent::SendSysPropValueBool(id,value);
}

void SysPropParent::SendGetError(const uint32_t id,const nsString& error){
   LOG("SendGetError to child id:%d,error: %s\n",id, NS_ConvertUTF16toUTF8(error).get());
   PSysPropParent::SendSysPropValueError(id,error);
}

void SysPropParent::SendCompleteResult(const uint32_t id,const bool isSuccess,const nsString& error){
   LOG("SendCompleteResult to child id:%d,isSuccess:%d,error: %s\n",id,isSuccess,NS_ConvertUTF16toUTF8(error).get());
   PSysPropParent::SendCompleteResult(id,isSuccess,error);
}

} // namespace jrdfota
} // namespace dom
} // namespace mozilla mozilla


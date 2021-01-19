#include "JrdSysProp.h"
#include "nsIDOMClassInfo.h"
#include "MozSysPropMain.h"
#include <android/log.h>
#include "MozSysPropMainThread.h"
#include "MozSysPropChildThread.h"


namespace mozilla {
namespace dom {
namespace sysprop {
#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "JrdSysProp", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "JrdSysProp", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)


/* Implementation file */
NS_INTERFACE_MAP_BEGIN(JrdSysProp)
NS_INTERFACE_MAP_ENTRY(nsIJrdSysProp)
NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_DOM_INTERFACE_MAP_ENTRY_CLASSINFO(JrdSysProp)
NS_INTERFACE_MAP_END
NS_IMPL_ADDREF(JrdSysProp)
NS_IMPL_RELEASE(JrdSysProp);

JrdSysProp::JrdSysProp()
{
  /* member initializers and constructor code */
}

JrdSysProp::~JrdSysProp()
{
  /* destructor code */
}
NS_IMETHODIMP JrdSysProp::GetSysPropByID(int32_t id, nsAString & value, int32_t *errNo)
{
  if (NS_IsMainThread()) {
    SysPropMain::getInstance()->GetSysProp(id,false,value,errNo);
  } else {
    JrdSysPropMainThread* pMain = new JrdSysPropMainThread(id,&value,errNo,SYS_PROP_ACT_GET,SYS_PROP_BY_ID);
    JrdSysPropChildThread::Dispatch2MainThread(pMain);
  }
  return NS_OK;
}

NS_IMETHODIMP JrdSysProp::GetSysPropByNode(const nsAString & node, nsAString & value, int32_t *errNo)
{
  LOG("The tree node:%s\n",NS_ConvertUTF16toUTF8(node).get());
  if (NS_IsMainThread()){
    SysPropMain::getInstance()->GetSysPropByNode(node,false,value,errNo);
  } else {
    JrdSysPropMainThread* pMain = new JrdSysPropMainThread(&node,&value,errNo,SYS_PROP_ACT_GET,SYS_PROP_BY_NODE);
    JrdSysPropChildThread::Dispatch2MainThread(pMain);
  }
  LOG("The tree value:%s,errno:%d\n",NS_ConvertUTF16toUTF8(value).get(),*errNo);
  return NS_OK;
}


NS_IMETHODIMP JrdSysProp::SetSysPropByID(int32_t id, const nsAString & value, bool updatePri, int32_t *errNo)
{
  if (NS_IsMainThread()){
    SysPropMain::getInstance()->SetSysProp(id, value, false, updatePri, errNo);
  } else {
    JrdSysPropMainThread* pMain = new JrdSysPropMainThread(id,&value,updatePri,errNo,SYS_PROP_ACT_SET,SYS_PROP_BY_ID);
    JrdSysPropChildThread::Dispatch2MainThread(pMain);
  }
  return NS_OK;
}

NS_IMETHODIMP JrdSysProp::SetSysPropByNode(const nsAString & node, const nsAString & value, bool updatePri, int32_t *errNo)
{
  LOG("The tree node:%s,value:%s\n",NS_ConvertUTF16toUTF8(node).get(),NS_ConvertUTF16toUTF8(value).get());
  if (NS_IsMainThread()){
    SysPropMain::getInstance()->SetSysPropByNode(node, value, false, updatePri, errNo);
  } else {
    JrdSysPropMainThread* pMain = new JrdSysPropMainThread(&node,&value,updatePri,errNo,SYS_PROP_ACT_SET,SYS_PROP_BY_NODE);
    JrdSysPropChildThread::Dispatch2MainThread(pMain);
  }
  return NS_OK;
}

/* void execute (in DOMString node, [retval] out long errNo); */
NS_IMETHODIMP JrdSysProp::Execute(const nsAString & node, int32_t *errNo)
{
  LOG("The tree node:%s\n",NS_ConvertUTF16toUTF8(node).get());
  if (NS_IsMainThread()){
    SysPropMain::getInstance()->Execute(node,false,errNo);
  } else {
    JrdSysPropMainThread* pMain = new JrdSysPropMainThread(&node,&node,false,errNo,SYS_PROP_ACT_EXE,SYS_PROP_BY_NODE);
    JrdSysPropChildThread::Dispatch2MainThread(pMain);
  }
  return NS_OK;
}

} //namespace sysprop
} //namespace dom
} //namespace mozilla

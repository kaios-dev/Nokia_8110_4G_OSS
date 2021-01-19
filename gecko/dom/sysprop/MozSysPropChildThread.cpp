#include "MozSysPropChildThread.h"
#include <android/log.h>

#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "MozSysPropChildThread", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "MozSysPropChildThread", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)
namespace mozilla {
namespace dom {
namespace sysprop {

JrdSysPropChildThread::~JrdSysPropChildThread(){
  LOG("free the JrdSysPropChildThread");
  if (pMain != NULL){
    delete pMain;
    pMain = NULL;
  }
}

void JrdSysPropChildThread::Dispatch2MainThread(JrdSysPropMainThread* main){
  LOG("enter");
  NS_DispatchToMainThread(new JrdSysPropChildThread(main) ,NS_DISPATCH_SYNC);
}
NS_IMETHODIMP JrdSysPropChildThread::Run(){
  LOG("enter");
  if (pMain != NULL){
    pMain->RunCommand();
  }
  return NS_OK;
}
}
}
}

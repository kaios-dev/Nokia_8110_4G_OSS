#include "MozSysPropMainThread.h"

#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "MozSysPropMainThread", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "MozSysPropMainThread", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)

namespace mozilla {
namespace dom {
namespace sysprop {

JrdSysPropMainThread::JrdSysPropMainThread(const nsAString* node, nsAString* value, int32_t *errNo,SysPropAct act,SysPropOpType opType):
                        mId(-1),
                        mUpdatePri(false),
                        mAct(act),
                        mOpType(opType),
                        mNode(node),
                        mValue(value),
                        mErrNo(errNo){
}

JrdSysPropMainThread::JrdSysPropMainThread(int32_t id, nsAString* value, int32_t *errNo,SysPropAct act,SysPropOpType opType):
                        mId(id),
                        mUpdatePri(false),
                        mAct(act),
                        mOpType(opType),
                        mNode(NULL),
                        mValue(value),
                        mErrNo(errNo){
}

JrdSysPropMainThread::JrdSysPropMainThread(const nsAString* node, const nsAString* value, bool updatePri, int32_t *errNo,SysPropAct act,SysPropOpType opType)
                       :mId(-1),
                        mUpdatePri(updatePri),
                        mAct(act),
                        mOpType(opType),
                        mNode(node),
                        mErrNo(errNo){
  mValue = (nsAString*) value;
}
JrdSysPropMainThread::JrdSysPropMainThread(int32_t id, const nsAString* value, bool updatePri, int32_t *errNo,SysPropAct act,SysPropOpType opType)
                       :mId(id),
                        mUpdatePri(updatePri),
                        mAct(act),
                        mOpType(opType),
                        mNode(NULL),
                        mErrNo(errNo){
  mValue = (nsAString*) value;
}

void JrdSysPropMainThread::RunCommand(){
  SysPropMain* main = SysPropMain::getInstance();
  LOG("enter");
  if (!NS_IsMainThread()) {
    LOG("not in main thread\n");
  } else {
    switch (mAct){
      case SYS_PROP_ACT_GET:
        if (mOpType == SYS_PROP_BY_ID){
          main->GetSysProp(mId,false,*mValue,mErrNo);
        } else if (mOpType == SYS_PROP_BY_NODE){
          main->GetSysPropByNode(*mNode,false,*mValue,mErrNo);
        } else {
          LOG("The operator is error\n");
        }
        break;
      case SYS_PROP_ACT_SET:
        if (mOpType == SYS_PROP_BY_ID){
          main->SetSysProp(mId,*mValue,false,mUpdatePri,mErrNo);
        } else if (mOpType == SYS_PROP_BY_NODE){
          main->SetSysPropByNode(*mNode,*mValue,false,mUpdatePri,mErrNo);
        } else {
          LOG("The operator is error\n");
        }
        break;
      case SYS_PROP_ACT_EXE:
        if (mOpType == SYS_PROP_BY_NODE){
          main->Execute(*mNode,false,mErrNo);
        } else {
          LOG("The operator is error\n");
        }
        break;
      default:LOG("The Act type is error");
    }
  }
}

}
}
}

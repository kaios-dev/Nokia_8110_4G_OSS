#ifndef MOZ_SYS_PROP_MAIN_THREAD_H
#define MOZ_SYS_PROP_MAIN_THREAD_H
#include "MozSysPropMain.h"
#include "sysprop_type.h"

namespace mozilla {
namespace dom {
namespace sysprop {

class JrdSysPropMainThread{
public:
  JrdSysPropMainThread(const nsAString* node, nsAString* value, int32_t *errNo,SysPropAct act,SysPropOpType opType);
  JrdSysPropMainThread(int32_t id, nsAString* value, int32_t *errNo,SysPropAct act,SysPropOpType opType);
  JrdSysPropMainThread(const nsAString* node, const nsAString* value, bool updatePri, int32_t *errNo,SysPropAct act,SysPropOpType opType);
  JrdSysPropMainThread(int32_t id, const nsAString* value, bool updatePri, int32_t *errNo,SysPropAct act,SysPropOpType opType);
  virtual ~JrdSysPropMainThread(){}
  void RunCommand();
private:
  bool mUpdatePri;
  int32_t mId;
  SysPropAct mAct;
  SysPropOpType mOpType;
  const nsAString* mNode;
  nsAString* mValue;
  int32_t *mErrNo;
};
}
}
}
#endif
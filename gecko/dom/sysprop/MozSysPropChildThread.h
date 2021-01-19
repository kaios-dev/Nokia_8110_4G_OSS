#ifndef MOZ_SYS_PROP_CHILD_THREAD_H
#define MOZ_SYS_PROP_CHILD_THREAD_H
#include "nsThreadUtils.h"
#include "MozSysPropMainThread.h"

namespace mozilla {
namespace dom {
namespace sysprop {


class JrdSysPropChildThread : public nsRunnable {
public:
  JrdSysPropChildThread(JrdSysPropMainThread* main):pMain(main){};
  virtual ~JrdSysPropChildThread();
  static void Dispatch2MainThread(JrdSysPropMainThread* main);
protected:
  NS_IMETHOD Run();
private:
  JrdSysPropMainThread* pMain;
};
}
}
}
#endif
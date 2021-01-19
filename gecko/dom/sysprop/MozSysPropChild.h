#ifndef mozilla_dom_sysprop_MozSysPropChild_h
#define mozilla_dom_sysprop_MozSysPropChild_h

#include "mozilla/dom/sysprop/PSysPropChild.h"
#include "MozSysPropMessager.h"
#include "MozSysPropManager.h"
#include "MozSysPropQueue.h"
#include "nsITimer.h"

namespace mozilla {
namespace dom {
namespace sysprop {


class SysPropChild : public PSysPropChild
{
public:
  SysPropChild();
  virtual ~SysPropChild();
  void setMessager(MozSysPropMessager* messager);
  void PushMessager(MozSysPropMessager* msg);
  inline void SetWaitResponse(bool state){mWaitResponse = state;};
  static SysPropChild* getInstace();
  static SysPropChild* getInstace(MozSysPropMessager* messager);
  static PSysPropChild* getChildParent();
  static void ResponseTimerCb(nsITimer *aTimer, void *aClosure);
private:
  void Send2Parent(MozSysPropMessager* msg);
  void ProcessMessager();

protected:
  virtual bool RecvSysPropValue(const uint32_t& id,const nsString& sysProp) MOZ_OVERRIDE;
  virtual bool RecvSysPropValueError(const uint32_t& id,const nsString& error) MOZ_OVERRIDE;
  virtual bool RecvCompleteResult(const uint32_t& id,const bool& isSuccess,const nsString& error) MOZ_OVERRIDE;

private:
  static SysPropChild* mInstace;
  static PSysPropChild* mChildParent;
  bool mWaitResponse;
  nsCOMPtr<nsITimer> mWaitResponseTimer;
  SysProp_Queue<MozSysPropMessager> mMsgQueue;

};
}
}
}
#endif

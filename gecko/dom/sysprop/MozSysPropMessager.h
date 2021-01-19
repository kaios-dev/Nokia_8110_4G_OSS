#ifndef mozilla_dom_sysprop_MozSysPropMassager_h
#define mozilla_dom_sysprop_MozSysPropMassager_h
#include "nsString.h"
namespace mozilla {
namespace dom {
namespace sysprop {

class SysPropMessager {
  public:
    virtual ~SysPropMessager(){}
    virtual void SendGetString(const uint32_t id,const nsString& value)=0;
    virtual void SendGetInt(const uint32_t id,const int32_t value)=0;
    virtual void SendGetBool(const uint32_t id,const bool value)=0;
    virtual void SendGetError(const uint32_t id,const nsString& error)=0;
    virtual void SendCompleteResult(const uint32_t id,const bool isSuccess,const nsString& error)=0;
 };
    }
  }
}
#endif

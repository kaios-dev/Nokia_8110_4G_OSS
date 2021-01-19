#ifndef mozilla_dom_sysprop_SysPropParent_h
#define mozilla_dom_sysprop_SysPropParent_h

#include "mozilla/dom/sysprop/PSysPropParent.h"
#include "MozSysPropMessager.h"

namespace mozilla {
namespace dom {
namespace sysprop {

class SysPropParent : public PSysPropParent
                         , public nsISupports
                         , public SysPropMessager

{
public:
  NS_DECL_ISUPPORTS

  SysPropParent();
  virtual ~SysPropParent();
  virtual void ActorDestroy(ActorDestroyReason aWhy) MOZ_OVERRIDE;
  virtual void SendGetString(const uint32_t id,const nsString& value) MOZ_OVERRIDE;
  virtual void SendGetInt(const uint32_t id,const int32_t value) MOZ_OVERRIDE;
  virtual void SendGetBool(const uint32_t id,const bool value) MOZ_OVERRIDE;
  virtual void SendGetError(const uint32_t id,const nsString& error) MOZ_OVERRIDE;
  virtual void SendCompleteResult(const uint32_t id,const bool isSuccess,const nsString& error) MOZ_OVERRIDE;

protected:
  virtual bool RecvGetSysProp(const uint32_t& id) MOZ_OVERRIDE;
  virtual bool RecvExecute(const uint32_t& id) MOZ_OVERRIDE;
  virtual bool RecvSetSysProp(const uint32_t& id,const nsString& sysProp) MOZ_OVERRIDE;
};

} // namespace sysprop
} // namespace dom
} // namespace mozilla

#endif


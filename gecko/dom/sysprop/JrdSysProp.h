#ifndef JRDSYSPROP_H
#define JRDSYSPROP_H
#include "JrdISysProp.h"


#define JRDSYSPROP_CID NS_IJRDSYSPROP_IID
#define JRDSYSPROP_CONTRACTID "@jrdcom.com/JrdSysProp;1"

namespace mozilla {
  namespace dom {
    namespace sysprop {

class JrdSysProp : public nsIJrdSysProp
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIJRDSYSPROP

  JrdSysProp();

private:
  ~JrdSysProp();

protected:
  /* additional members */
};
    }
  }
}
#endif

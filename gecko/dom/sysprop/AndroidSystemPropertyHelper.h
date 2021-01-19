#ifndef MOZILLA_DOM_SYSPROP_ANDROID_SYSTEM_PROPERTY_HELPER_H
#define MOZILLA_DOM_SYSPROP_ANDROID_SYSTEM_PROPERTY_HELPER_H

#include <map>
#include <string>
#include <sys/system_properties.h>
#include "sysprop.h"
#include "nsServiceManagerUtils.h"
#include "nsString.h"
#include "nsIIccInfo.h"
#include "nsIIccProvider.h"
#include "nsIMobileConnectionInfo.h"
#include "nsIMobileConnectionService.h"
#include "nsStringGlue.h"
#include "nsServiceManagerUtils.h"


#include <stdio.h>
#include <sys/ioctl.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <net/if.h>
#include <string.h>

namespace mozilla {
namespace dom {
namespace sysprop {

using namespace std;

class AndroidSystemPropertyHelper
{
public:
  static bool readFromSystem(SP_ITEM pItem, nsString& value);

private:
  static const char *getMacAddress(const char *const ethName, char *const retBuf);
  static const char *getFirmwareVersion(char *const retBuf);
  static bool getImeiSV(nsAString & aImeisv);
  static inline const char* getPropertyNameByPitemID(const uint32_t id);

protected:
};


    } //namespace sysprop
  }   //namespace dom
}     //namespace mozilla
#endif

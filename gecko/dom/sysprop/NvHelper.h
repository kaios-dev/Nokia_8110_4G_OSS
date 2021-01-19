#ifndef MOZILLA_DOM_SYSPROP_NVHELP_H
#define MOZILLA_DOM_SYSPROP_NVHELP_H

#include "sysprop.h"
#include "nsServiceManagerUtils.h"
#include "nsString.h"
#include "JrdINvAccess.h"

namespace mozilla {
namespace dom {
namespace sysprop {

class NvHelper
{
public:
  static bool readFromNv(SP_ITEM pItem, nsString& value);
  static bool writeToNv(SP_ITEM pItem, const nsString value);

private:
  static bool operatorNv(SP_ITEM pItem, bool isRead, nsString& readedValue, const nsString writeValue);
  static nsCOMPtr<nsIJrdNvAccess> getNvManager();

  // DM Bearer
  
  static bool isLTEEnabled(nsCOMPtr<nsIJrdNvAccess> nvManager, bool &enabled);
  static bool enableLTE(nsCOMPtr<nsIJrdNvAccess> nvManager, bool enabled);
  
  static bool searchBandNodes(SP_ITEM pItem, int& band, int& ratType);
  static bool isSptBandEnabled(nsCOMPtr<nsIJrdNvAccess> nvManager, int type, int band, bool& enabled);
  static bool sptEnableBand(nsCOMPtr<nsIJrdNvAccess> nvManager, int type, int band, bool enabled);
  
  static bool searchBSRTimerNodes(SP_ITEM pItem, int& timerType);
  static bool getSptBSRTimerSetting(nsCOMPtr<nsIJrdNvAccess> nvManager, int timerType, int& time);
  static bool sptSetBSRTimer(nsCOMPtr<nsIJrdNvAccess> nvManager, int timerType, int time);
  
  static bool isSptEHRPDEnabled(nsCOMPtr<nsIJrdNvAccess> nvManager,bool& enabled);
  static bool sptEnableEHRPD(nsCOMPtr<nsIJrdNvAccess> nvManager, bool enabled);
  
  static bool isSptSMSoIPEnabled(nsCOMPtr<nsIJrdNvAccess> nvManager, bool& enabled);
  static bool sptEnableSMSoIP(nsCOMPtr<nsIJrdNvAccess> nvManager, bool enabled);
  
  static bool searchNvIntNodes(SP_ITEM pItem, int& item);
  static bool sptGetNvIntValue(nsCOMPtr<nsIJrdNvAccess> nvManager, int item, int& value);
  static bool sptSetNvIntValue(nsCOMPtr<nsIJrdNvAccess> nvManager, int item, int value);

protected:
};
    } //namespace sysprop
  }   //namespace dom
}     //namespace mozilla
#endif

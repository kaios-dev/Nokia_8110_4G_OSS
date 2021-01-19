#ifndef MOZILLA_DOM_SYSPROP_UICCHELP_H
#define MOZILLA_DOM_SYSPROP_UICCHELP_H

#include "sysprop.h"
#include "nsServiceManagerUtils.h"
#include "nsString.h"
#include "nsIIccInfo.h"
#include "nsIMobileConnectionService.h"

namespace mozilla {
namespace dom {
namespace sysprop {

class UiccHelper
{
public:
  static bool readFromUicc(SP_ITEM pItem, nsString& value);
  static bool writeToUicc(SP_ITEM pItem, const nsString value);

private:
  static nsCOMPtr<nsIIccInfo> getIccInfo();
  static nsCOMPtr<nsICdmaIccInfo> getCdmaIccInfo();
  static nsCOMPtr<nsIMobileConnection> getMobileConnection();

  // DM Bearer
  static bool getSptMdn(nsCOMPtr<nsICdmaIccInfo> cdmaIccInfo, nsAString& mdn);
  static bool getSptPrlVersion(nsCOMPtr<nsICdmaIccInfo> cdmaIccInfo, int& version);
  
  static bool getSptIccid(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& iccid);
  static bool getSptNai(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& nai);
  static bool getSptAaaAuth(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& aaaAuth);
  static bool getSptMin(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& min);
  static bool getSptAaaSpi(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& aaaSpi);
  static bool getSptPriHA(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& priHA);
  static bool getSptSecHA(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& secHA);
  static bool getSptHaAuth(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& haAuth);
  static bool getSptHaSpi(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& haSpi);
  static bool getSptHomeAddr(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& homeAddr);
  static bool getSptIsReverseTunneling(nsCOMPtr<nsIIccInfo> iccInfo, bool& isReverseTunneling);
  static bool getSptPrl(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& prl);
  static bool getSptAccolc(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& accolc);

  // Actually, this is a nsIMobileConnectionService helper function.
  static bool getMeid(nsCOMPtr<nsIMobileConnection> connection, nsAString& meid);

  static bool setCSimObj(SP_ITEM pItem, const nsString value);

protected:
};
    } //namespace sysprop
  }   //namespace dom
}     //namespace mozilla
#endif

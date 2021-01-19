#include "UiccHelper.h"
#include "PropertyFileHelper.h"
#include "nsIIccProvider.h"
#include <android/log.h>
#include "nsIDOMIccOma.h"

#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "UiccHelper", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "UiccHelper", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)

using namespace mozilla::dom::sysprop;

bool
UiccHelper::readFromUicc(SP_ITEM pItem, nsString& value)
{
    if (UICC != pItem.dataSource)
    {
        LOG("readFromUicc error: id = %d", pItem.id);
        return false;
    }

    bool ret = false;

    nsCOMPtr<nsIIccInfo> iccInfo;
    nsCOMPtr<nsICdmaIccInfo> cdmaIccInfo;
    nsCOMPtr<nsIMobileConnection> connection;
#ifdef TARGET_ISP_IS_SPR
    if (pItem.id == SYSPROP_MDN || pItem.id == SYSPROP_PRLID)
    {
        cdmaIccInfo = getCdmaIccInfo();
        if (cdmaIccInfo == nullptr)
        {
            LOG("getCdmaIccInfo failed");
            return ret;
        }
    }
    else if (pItem.id == SYSPROP_DEVID)
    {
        connection = getMobileConnection();
        if (connection == nullptr)
        {
            LOG("getMobileConnection failed");
            return ret;
        }
    }
    else
    {
        iccInfo = getIccInfo();
        if (iccInfo == nullptr)
        {
            LOG("getIccInfo failed");
            return ret;
        }
    }
#endif

    switch (pItem.id)
    {
#ifdef TARGET_ISP_IS_SPR
        case SYSPROP_MDN:
            ret = getSptMdn(cdmaIccInfo, value);
        break;
        case SYSPROP_PRLID:
        {
            int version;
            ret = getSptPrlVersion(cdmaIccInfo, version);
            value = NS_LITERAL_STRING("");
            value.AppendInt(version);
        }
        break;
        case SYSPROP_NAI:
            ret = getSptNai(iccInfo, value);
        break;
        case SYSPROP_SLOT1_AUTH_ALGO_AAA:
            ret = getSptAaaAuth(iccInfo, value);
        break;
        case SYSPROP_MSID:
            ret = getSptMin(iccInfo, value);
        break;
        case SYSPROP_SLOT1_SPI_AAA:
            ret = getSptAaaSpi(iccInfo, value);
        break;
        case SYSPROP_PRIMARY_HOME_AGENT:
            ret = getSptPriHA(iccInfo, value);
        break;
        case SYSPROP_SECONDARY_HOME_AGENT:
            ret = getSptSecHA(iccInfo, value);
        break;
        case SYSPROP_SLOT1_AUTH_ALGO_HA:
            ret = getSptHaAuth(iccInfo, value);
        break;
        case SYSPROP_SLOT1_SPI_HA:
            ret = getSptHaSpi(iccInfo, value);
        break;
        case SYSPROP_SLOT1_MOBILE_IP:
            ret = getSptHomeAddr(iccInfo, value);
        break;
        case SYSPROP_SLOT1_REVERSE_TUNNEL:
        {
            bool isReverseTunneling;
            ret = getSptIsReverseTunneling(iccInfo, isReverseTunneling);
            value = NS_LITERAL_STRING("");
            value.AppendInt(isReverseTunneling);
        }
        break;
        case SYSPROP_PRL:
            ret = getSptPrl(iccInfo, value);
        break;
        case SYSPROP_ICCID:
            ret = getSptIccid(iccInfo, value);
        break;
        case SYSPROP_DEVID:
            ret = getMeid(connection, value);
        break;
        case SYSPROP_ACCOLC:
            ret = getSptAccolc(iccInfo, value);
        break;
#endif
        default:
            LOG("readFromUicc failed(the id is out of the range.): id = %d", pItem.id);

        break;
    }

    return ret;
}

bool
UiccHelper::writeToUicc(SP_ITEM pItem, const nsString value)
{
    if (UICC != pItem.dataSource || value.IsEmpty())
    {
      StringGetter valueGetter(&value);
      LOG("writeToNV error: id = %d, value =%s", pItem.id, valueGetter.get());
      return false;
    }

    bool ret = false;

    //nsCOMPtr<nsIIccInfo> iccInfo = getIccInfo();
    //if (iccInfo == nullptr)
    //{
        //LOG("getIccInfo failed");
        //return ret;
    //}

    switch (pItem.id)
    {
#ifdef TARGET_ISP_IS_SPR
        case SYSPROP_ACCOLC:
    	  case SYSPROP_CSIM_PROV_OBJ:
    	  case SYSPROP_CSIM_COVERAGE_OBJ:
    	  	ret = setCSimObj(pItem, value);
				break;
#endif
        default:
            LOG("writeToUicc failed(the id is out of the range.): id = %d", pItem.id);
        break;
    }

    return ret;
}

nsCOMPtr<nsIIccInfo>
UiccHelper::getIccInfo()
{
    nsCOMPtr<nsIIccInfo> iccInfo = nullptr;
    nsCOMPtr<nsIIccProvider> icc = do_GetService("@mozilla.org/ril/content-helper;1");
    // Need using contract id "NS_RILCONTENTHELPER_CONTRACTID" from "nsRadioInterfaceLayer.h", but which may be turned off by MOZ_B2G_RIL build flag
    // nsCOMPtr<nsIIccProvider> icc = do_GetService(NS_RILCONTENTHELPER_CONTRACTID);
    if (icc)
    {
        icc->GetIccInfo(0, getter_AddRefs(iccInfo));
    }
    return iccInfo;
}

nsCOMPtr<nsICdmaIccInfo>
UiccHelper::getCdmaIccInfo()
{
    nsCOMPtr<nsIIccInfo> iccInfo = getIccInfo();
    if (iccInfo)
    {
        nsCOMPtr<nsICdmaIccInfo> cdmaIccInfo(do_QueryInterface(iccInfo));
        return cdmaIccInfo;
    }
    return nullptr;
}

nsCOMPtr<nsIMobileConnection>
UiccHelper::getMobileConnection()
{
    nsCOMPtr<nsIMobileConnection> connection = nullptr;
    nsCOMPtr<nsIMobileConnectionService> service = do_GetService(NS_MOBILE_CONNECTION_SERVICE_CONTRACTID);
    if (service)
    {
        service->GetItemByServiceId(0, getter_AddRefs(connection));
    }
    return connection;
}

bool
UiccHelper::getSptIccid(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& iccid)
{
    bool ret = NS_SUCCEEDED(iccInfo->GetIccid(iccid));
    if (ret)
      LOG("getSptIccid succeeded");
    else
        LOG("getSptIccid failed");
    return ret;
}

bool
UiccHelper::getSptMdn(nsCOMPtr<nsICdmaIccInfo> cdmaIccInfo, nsAString& mdn)
{
    bool ret = NS_SUCCEEDED(cdmaIccInfo->GetMdn(mdn));
    if (ret)
        LOG("getSptMdn succeeded");
    else
        LOG("getSptMdn failed");
    return ret;
}

bool
UiccHelper::getSptPrlVersion(nsCOMPtr<nsICdmaIccInfo> cdmaIccInfo, int& version)
{
    bool ret = NS_SUCCEEDED(cdmaIccInfo->GetPrlVersion(&version));
    if (ret)
        LOG("getSptPrlVersion succeeded");
    else
        LOG("getSptPrlVersion failed");
    return ret;
}

bool
UiccHelper::getSptNai(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& nai)
{
    bool ret = NS_SUCCEEDED(iccInfo->GetNai(nai));
    if (ret)
        LOG("getSptNai succeeded");
    else
        LOG("getSptNai failed");
    return ret;
}

bool
UiccHelper::getSptAaaAuth(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& aaaAuth)
{
    bool ret = NS_SUCCEEDED(iccInfo->GetAaaAuth(aaaAuth));
    if (ret)
        LOG("getSptAaaAuth succeeded");
    else
        LOG("getSptAaaAuth failed");
    return ret;
}

bool
UiccHelper::getSptMin(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& min)
{
    bool ret = NS_SUCCEEDED(iccInfo->GetMin(min));
    if (ret)
        LOG("getSptMin succeeded");
    else
        LOG("getSptMin failed");
    return ret;
}

bool
UiccHelper::getSptAaaSpi(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& aaaSpi)
{
    bool ret = NS_SUCCEEDED(iccInfo->GetAaaSpi(aaaSpi));
    if (ret)
        LOG("getSptAaaSpi succeeded");
    else
        LOG("getSptAaaSpi failed");
    return ret;
}

bool
UiccHelper::getSptPriHA(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& priHA)
{
    bool ret = NS_SUCCEEDED(iccInfo->GetPriHA(priHA));
    if (ret)
        LOG("getSptPriHA succeeded");
    else
        LOG("getSptPriHA failed");
    return ret;
}

bool
UiccHelper::getSptSecHA(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& secHA)
{
    bool ret = NS_SUCCEEDED(iccInfo->GetSecHA(secHA));
    if (ret)
        LOG("getSptSecHA succeeded");
    else
        LOG("getSptSecHA failed");
    return ret;
}

bool
UiccHelper::getSptHaAuth(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& haAuth)
{
    bool ret = NS_SUCCEEDED(iccInfo->GetHaAuth(haAuth));
    if (ret)
        LOG("getSptHaAuth succeeded");
    else
        LOG("getSptHaAuth failed");
    return ret;
}

bool
UiccHelper::getSptHaSpi(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& haSpi)
{
    bool ret = NS_SUCCEEDED(iccInfo->GetHaSpi(haSpi));
    if (ret)
        LOG("getSptHaSpi succeeded");
    else
        LOG("getSptHaSpi failed");
    return ret;
}

bool
UiccHelper::getSptHomeAddr(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& homeAddr)
{
    bool ret = NS_SUCCEEDED(iccInfo->GetHomeAddr(homeAddr));
    if (ret)
        LOG("getSptHomeAddr succeeded");
    else
        LOG("getSptHomeAddr failed");
    return ret;
}

bool
UiccHelper::getSptIsReverseTunneling(nsCOMPtr<nsIIccInfo> iccInfo, bool& isReverseTunneling)
{
    bool ret = NS_SUCCEEDED(iccInfo->GetIsReverseTunneling(&isReverseTunneling));
    if (ret)
        LOG("getSptIsReverseTunneling succeeded: isReverseTunneling = %d", isReverseTunneling);
    else
        LOG("getSptIsReverseTunneling failed");
    return ret;
}

bool
UiccHelper::getSptPrl(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& prl)
{
    bool ret = NS_SUCCEEDED(iccInfo->GetPrl(prl));
    if (ret)
        LOG("getSptPrl succeeded");
    else
        LOG("getSptPrl failed");
    return ret;
}

bool
UiccHelper::getMeid(nsCOMPtr<nsIMobileConnection> connection, nsAString& meid)
{
    bool ret = NS_SUCCEEDED(connection->GetMeid(meid));
    if (ret)
        LOG("getMeid succeeded");
    else
        LOG("getMeid failed");
    return ret;
}

bool
UiccHelper::getSptAccolc(nsCOMPtr<nsIIccInfo> iccInfo, nsAString& accolc)
{
	int iAccolc = 0;
	bool ret = NS_SUCCEEDED(iccInfo->GetAccolc(&iAccolc));
    if (ret)
        LOG("GetAccolc succeeded: accolc = %d", iAccolc);
    else
        LOG("GetAccolc failed");

  accolc.AppendInt(iAccolc);
	return ret;
}

bool
UiccHelper::setCSimObj(SP_ITEM pItem, const nsString value)
{
	nsCOMPtr<nsIDOMIccOma> IccOma = do_GetService("@tctoma.com/IccOmaJS;1");

	if (!IccOma)
	{
		LOG("do_GetService tctoma failed");
		return false;
	}

	nsresult rv = IccOma->WriteToUicc(value);
	if (NS_FAILED(rv))
	{
		LOG("IccOma->WriteToUicc failed");
		return false;
	}

	return true;

}

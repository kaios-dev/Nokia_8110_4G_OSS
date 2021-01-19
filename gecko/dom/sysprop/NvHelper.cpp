#include "NvHelper.h"
#include "PropertyFileHelper.h"
#include <android/log.h>
#include <cutils/properties.h>

#define BAND_CDMA_10                10
#define BAND_LTE_25                 25
#define BAND_LTE_26                 26
#define BAND_LTE_41                 41
#define RATTYPE_LTE                 0
#define RATTYPE_WCDMA               1
#define RATTYPE_CDMA                2
#define RATTYPE_GSM                 3
#define TIMERTYPE_BSRTimer          0
#define TIMERTYPE_NEXTLTE_TIMER     1
#define TIMERTYPE_BSRMAXTIMER       2


#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "NvHelper", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "NvHelper", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)

using namespace mozilla::dom::sysprop;

bool
NvHelper::readFromNv(SP_ITEM pItem, nsString& value)
{
    if (NV != pItem.dataSource)
    {
        LOG("readFromNV error: id = %d", pItem.id);
        return false;
    }
    nsString nullStr;
    return operatorNv(pItem, true, value, nullStr);
}

bool
NvHelper::writeToNv(SP_ITEM pItem, const nsString value)
{
    if (NV != pItem.dataSource || value.IsEmpty())
    {
        StringGetter valueGetter(&value);
        LOG("writeToNV error: id = %d, value =%s", pItem.id, valueGetter.get()?valueGetter.get():"NULL");
        return false;
    }
    nsString nullStr;
    nsString gotValue;
    if (operatorNv(pItem, true, gotValue, nullStr))
    {
        if (value.Equals(gotValue)) {//The current value is equal to the original value, do nothing
            return true;
        }
        StringGetter valueGetter(&value);
        StringGetter gotValueGetter(&gotValue);
        LOG("writeToNV update nv=%d 's value from value =%s to value =%s", pItem.id, gotValueGetter.get()?gotValueGetter.get():"NULL", valueGetter.get()?valueGetter.get():NULL);
    }
    if(operatorNv(pItem, false, nullStr, value))
    {
       property_set("nv.need.reset", "true");
       return true;
    }
    return false;
}

bool
NvHelper::operatorNv(SP_ITEM pItem, bool isRead, nsString& readedValue, const nsString writeValue)
{
    bool ret = false;

    nsCOMPtr<nsIJrdNvAccess> nvManager = getNvManager();
    if (nvManager == nullptr)
    {
        LOG("getNvManager failed");
        return ret;
    }

    switch (pItem.id)
    {
#ifdef TARGET_ISP_IS_SPR
        case SYSPROP_EHRPD:
        {
            if (isRead)
            {
                bool enabled;
                ret = isSptEHRPDEnabled(nvManager, enabled);
                readedValue = NS_LITERAL_STRING("");
                readedValue.AppendInt(enabled);
            }
            else
            {
                nsresult rv;
                bool enabled = writeValue.ToInteger(&rv);
                if (NS_SUCCEEDED(rv))
                {
                    ret = sptEnableEHRPD(nvManager, enabled);
                }
            }
        }
        break;
        case SYSPROP_SMSOIP_ENABLED:
        {
            if (isRead)
            {
                bool enabled;
                ret = isSptSMSoIPEnabled(nvManager, enabled);
                readedValue = NS_LITERAL_STRING("");
                readedValue.AppendInt(enabled);
            }
            else
            {
                nsresult rv;
                bool enabled = writeValue.ToInteger(&rv);
                if (NS_SUCCEEDED(rv))
                {
                    ret = sptEnableSMSoIP(nvManager, enabled);
                }
            }
        }
        break;
        case SYSPROP_BSRTIMER:
        case SYSPROP_NEXTLTESCAN:
        case SYSPROP_BSRMAXTIME:
        {
            int timerType;
            if (searchBSRTimerNodes(pItem, timerType))
            {
                if (isRead)
                {
                    int time;
                    ret = getSptBSRTimerSetting(nvManager, timerType, time);
                    readedValue = NS_LITERAL_STRING("");
                    readedValue.AppendInt(time);
                }
                else
                {
                    nsresult rv;
                    int time = writeValue.ToInteger(&rv);
                    if (NS_SUCCEEDED(rv))
                    {
                        ret = sptSetBSRTimer(nvManager, timerType, time);
                    }
                }
            }
        }
        break;
        case SYSPROP_ENABLEDLTE:
        {
            if (isRead)
            {
                bool enabled;
                ret = isLTEEnabled(nvManager, enabled);
                readedValue = NS_LITERAL_STRING("");
                readedValue.AppendInt(enabled);
            }
            else
            {
                //remove all impacts between ForceLTE and EnableLTE according to pr 3682126
                /*
                PropertyFileHelper helper;
                nsString strForceLTE;
                nsresult rv;
                bool isLTEForced = false;

                //need to check ./LTE/Service/Forced, if true, cannot disable
                helper.getStringValue(NODE_SYSPROP_FORCELTE, strForceLTE);
                isLTEForced = strForceLTE.ToInteger(&rv);
                if (!NS_SUCCEEDED(rv))
                  isLTEForced = false;

                bool enabled = writeValue.ToInteger(&rv);
                if (NS_SUCCEEDED(rv))
                {
                  //when (isLTEForced = true and enabled = false), do nothing
                  if ((!isLTEForced)||(enabled))
                    ret = enableLTE(nvManager, enabled);
                }
                */
                nsresult rv;
                bool enabled = writeValue.ToInteger(&rv);
                if (NS_SUCCEEDED(rv))
                  ret = enableLTE(nvManager, enabled);
            }
        }
        break;
        case SYSPROP_BC10:
        case SYSPROP_B25_ENABLEMENT:
        case SYSPROP_B26_ENABLEMENT:
        case SYSPROP_B41_ENABLEMENT:
        {
            int type;
            int band;
            if (searchBandNodes(pItem, band, type))
            {
                if (isRead)
                {
                    bool enabled;
                    ret = isSptBandEnabled(nvManager, type, band, enabled);
                    readedValue = NS_LITERAL_STRING("");
                    readedValue.AppendInt(enabled);
                }
                else
                {
                    nsresult rv;
                    bool enabled = writeValue.ToInteger(&rv);
                    if (NS_SUCCEEDED(rv))
                    {
                        ret = sptEnableBand(nvManager, type, band, enabled);
                    }
                }
            }
        }
        break;
        case SYSPROP_SO68:
        case SYSPROP_1XADV_COP0:
        case SYSPROP_1XADV_COP1TO7:
        case SYSPROP_1XADV_ENABLE:
        {
            int item;
            if (searchNvIntNodes(pItem, item))
            {
                if (isRead)
                {
                    int enabled;
                    ret = sptGetNvIntValue(nvManager, item, enabled);
                    readedValue = NS_LITERAL_STRING("");
                    readedValue.AppendInt(enabled);
                }
                else
                {
                    nsresult rv;
                    int enabled = writeValue.ToInteger(&rv);
                    if (NS_SUCCEEDED(rv))
                    {
                        ret = sptSetNvIntValue(nvManager, item, enabled);
                    }
                }
            }
        }
        break;
#endif
        default:
            LOG("operatorNv failed(the id is out of the range.): id = %d", pItem.id);
        break;
    }


    return ret;
}

nsCOMPtr<nsIJrdNvAccess>
NvHelper::getNvManager()
{
    nsCOMPtr<nsIJrdNvAccess> nvManager = do_CreateInstance("@jrdcom.com/JrdNvAccess;1");
    return nvManager;
}

bool
NvHelper::isLTEEnabled(nsCOMPtr<nsIJrdNvAccess> nvManager, bool &enabled)
{
    enabled = false;
    bool b25 = false;
    bool b26 = false;
    bool b41 = false;
    bool ret = isSptBandEnabled(nvManager, RATTYPE_LTE, BAND_LTE_25, b25)
               && isSptBandEnabled(nvManager, RATTYPE_LTE, BAND_LTE_26, b26)
               && isSptBandEnabled(nvManager, RATTYPE_LTE, BAND_LTE_41, b41);
    if (ret)
    {
        enabled = b25 || b26 || b41;
    }
    LOG("isLTEEnabled: ret = %d, enabled = %d, b25 = %d, b26 = %d, b41 = %d", ret, enabled, b25, b26, b41);
    return ret;
}

bool
NvHelper::enableLTE(nsCOMPtr<nsIJrdNvAccess> nvManager, bool enabled)
{
    bool ret = sptEnableBand(nvManager, RATTYPE_LTE, BAND_LTE_25, enabled)
               && sptEnableBand(nvManager, RATTYPE_LTE, BAND_LTE_26, enabled)
               && sptEnableBand(nvManager, RATTYPE_LTE, BAND_LTE_41, enabled);
    // Do we need recover the setting after the enable function failed?
    LOG("isLTEEnabled: ret = %d, enabled = %d", ret, enabled);
    return ret;
}

bool
NvHelper::searchBandNodes(SP_ITEM pItem, int& band, int& ratType)
{
    bool ret = true;
    if (NV != pItem.dataSource)
    {
        LOG("searchBandNodes error: id = %d", pItem.id);
    }
    else
    {
        switch (pItem.id)
        {
#ifdef TARGET_ISP_IS_SPR
            case SYSPROP_BC10:
            band = BAND_CDMA_10;
            ratType = RATTYPE_CDMA;
            break;
            case SYSPROP_B25_ENABLEMENT:
            band = BAND_LTE_25;
            ratType = RATTYPE_LTE;
            break;
            case SYSPROP_B26_ENABLEMENT:
            band = BAND_LTE_26;
            ratType = RATTYPE_LTE;
            break;
            case SYSPROP_B41_ENABLEMENT:
            band = BAND_LTE_41;
            ratType = RATTYPE_LTE;
            break;
#endif
            default:
            ret = false;
            break;
        }
    }
    if (ret)
    {
        LOG("searchBandNodes succeeded: id = %d, RATType = %d, band = %d", pItem.id, ratType, band);
    }
    else
    {
        LOG("searchBandNodes failed: id = %d", pItem.id);
    }
    return ret;
}

bool
NvHelper::isSptBandEnabled(nsCOMPtr<nsIJrdNvAccess> nvManager, int type, int band, bool& enabled)
{
    bool ret = NS_SUCCEEDED(nvManager->IsBandEnabled(band, type, &enabled));
    if (ret)
        LOG("isSptBandEnabled succeeded: type = %d, band = %d, enabled = %d", type, band, enabled);
    else
        LOG("isSptBandEnabled failed: type = %d, band = %d", type, band);
    return ret;
}

bool
NvHelper::sptEnableBand(nsCOMPtr<nsIJrdNvAccess> nvManager, int type, int band, bool enabled)
{
    bool ret = NS_SUCCEEDED(nvManager->EnableBand(band, type, enabled));
    if (ret)
        LOG("sptEnableBand succeeded: type = %d, band = %d, enabled = %d", type, band, enabled);
    else
        LOG("sptEnableBand failed: type = %d, band = %d, enabled = %d", type, band, enabled);
    return ret;
}

bool
NvHelper::searchBSRTimerNodes(SP_ITEM pItem, int& timerType)
{
    bool ret = false;
    if (NV != pItem.dataSource)
    {
        LOG("searchBSRTimerNodes error: id = %d", pItem.id);
    }
    else
    {
        switch (pItem.id)
        {
#ifdef TARGET_ISP_IS_SPR
            case SYSPROP_BSRTIMER:
            timerType = 0;
            ret = true;
            break;
            case SYSPROP_NEXTLTESCAN:
            timerType = 1;
            ret = true;
            break;
            case SYSPROP_BSRMAXTIME:
            timerType = 2;
            ret = true;
            break;
#endif
            default:
            break;
        }
    }
    if (ret)
    {
        LOG("searchBSRTimerNodes succeeded: id = %d, timerType = %d", pItem.id, timerType);
    }
    else
    {
        LOG("searchBSRTimerNodes failed: id = %d", pItem.id);
    }
    return ret;
}

bool
NvHelper::getSptBSRTimerSetting(nsCOMPtr<nsIJrdNvAccess> nvManager, int timerType, int& time)
{
    bool ret = NS_SUCCEEDED(nvManager->GetBSRTimer(timerType, &time));
    if (ret)
        LOG("getSptBSRTimerSetting succeeded: timerType = %d, time = %d", timerType, time);
    else
        LOG("getSptBSRTimerSetting failed: timerType = %d", timerType);
    return ret;
}

bool
NvHelper::sptSetBSRTimer(nsCOMPtr<nsIJrdNvAccess> nvManager, int timerType, int time)
{
    bool ret = NS_SUCCEEDED(nvManager->SetBSRTimer(timerType, time));
    if (ret)
        LOG("sptSetBSRTimer succeeded: timerType = %d, time = %d", timerType, time);
    else
        LOG("sptSetBSRTimer failed: timerType = %d, time = %d", timerType, time);
    return ret;
}

bool
NvHelper::isSptEHRPDEnabled(nsCOMPtr<nsIJrdNvAccess> nvManager, bool& enabled)
{
    bool ret = NS_SUCCEEDED(nvManager->IsEHRPDEnabled(&enabled));
    if (ret)
        LOG("isSptEHRPDEnabled succeeded: enabled = %d", enabled);
    else
        LOG("isSptEHRPDEnabled failed");
    return ret;
}

bool
NvHelper::sptEnableEHRPD(nsCOMPtr<nsIJrdNvAccess> nvManager, bool enabled)
{
    bool ret = NS_SUCCEEDED(nvManager->EnableEHRPD(enabled));
    if (ret)
        LOG("sptEnableEHRPD succeeded: enabled = %d", enabled);
    else
        LOG("sptEnableEHRPD failed: enabled = %d", enabled);
    return ret;
}

bool
NvHelper::isSptSMSoIPEnabled(nsCOMPtr<nsIJrdNvAccess> nvManager, bool& enabled)
{
    bool ret = NS_SUCCEEDED(nvManager->IsSMSOvIPEnabled(&enabled));
    if (ret)
        LOG("isSptSMSoIPEnabled succeeded: enabled = %d", enabled);
    else
        LOG("isSptSMSoIPEnabled failed");
    return ret;
}

bool
NvHelper::sptEnableSMSoIP(nsCOMPtr<nsIJrdNvAccess> nvManager, bool enabled)
{
    bool ret = NS_SUCCEEDED(nvManager->EnableSMSOvIP(enabled));
    if (ret)
        LOG("sptEnableSMSoIP succeeded: enabled = %d", enabled);
    else
        LOG("sptEnableSMSoIP failed: enabled = %d", enabled);
    return ret;
}

bool
NvHelper::searchNvIntNodes(SP_ITEM pItem, int& item)
{
    bool ret = true;
    if (NV != pItem.dataSource)
    {
        LOG("searchNvIntNodes error: id = %d", pItem.id);
    }
    else
    {
        switch (pItem.id)
        {
#ifdef TARGET_ISP_IS_SPR
            case SYSPROP_SO68:
                item = 4102;
            break;
            case SYSPROP_1XADV_COP0:
                item = 65634;
            break;
            case SYSPROP_1XADV_COP1TO7:
                item = 7166;
            break;
            case SYSPROP_1XADV_ENABLE:
                item = 65881;
            break;
#endif
            default:
                ret = false;
            break;
        }
    }
    if (ret)
    {
        LOG("searchNvIntNodes succeeded: id = %d, item = %d", pItem.id, item);
    }
    else
    {
        LOG("searchNvIntNodes failed: id = %d", pItem.id);
    }
    return ret;
}


bool
NvHelper::sptGetNvIntValue(nsCOMPtr<nsIJrdNvAccess> nvManager, int item, int& value)
{
    uint32_t count = 0;
    uint8_t *nvCache = (uint8_t * )malloc(1);
    if( NULL == nvCache )
    {
        LOG("nvcache malloc failed");
        return false;
    }
    memset(nvCache, 0, sizeof(uint8_t));

    bool ret = NS_SUCCEEDED(nvManager->ReadNvitemEx(item, &count, &nvCache));
    if (ret && count == 1)
    {
        value = nvCache[0];
        LOG("sptGetNvIntValue succeeded: value = %d", value);
    }
    else
    {
        LOG("sptGetNvIntValue failed.");
    }

    if(nvCache)
    {
        free(nvCache);
    }
    return ret;
}

bool
NvHelper::sptSetNvIntValue(nsCOMPtr<nsIJrdNvAccess> nvManager, int item, int value)
{
    uint8_t *nvCacheOneByte = (uint8_t * )malloc(1);
    if( NULL == nvCacheOneByte )
    {
        LOG("nvcache malloc failed");
        return false;
    }

    nvCacheOneByte[0] = (uint8_t)value;
    bool ret = NS_SUCCEEDED(nvManager->WriteNvitemEx(item, 1, nvCacheOneByte));
    if (ret)
    {
        LOG("sptSetNvIntValue succeeded: value = %d", value);
    }
    else
    {
        LOG("sptSetNvIntValue failed: value = %d", value);
    }

    if(nvCacheOneByte)
    {
        free(nvCacheOneByte);
    }
    return ret;
}

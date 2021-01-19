#include "AndroidSystemPropertyHelper.h"
#include "nsIIccProvider.h"
#include <android/log.h>

#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "AndroidSystemPropertyHelper", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "AndroidSystemPropertyHelper", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)

#define MAX_ANDROID_PROP_LEN    1024

using namespace mozilla::dom::sysprop;

bool 
AndroidSystemPropertyHelper::readFromSystem(SP_ITEM pItem, nsString& value)
{
    if (ANDROID_PROPERTY != pItem.dataSource)
    {
        LOG("readFromSystem error: id = %d", pItem.id);
        return false;
    }

    char valBuf[MAX_ANDROID_PROP_LEN] = {0};
    const char *aPropName = getPropertyNameByPitemID(pItem.id);
    if (aPropName)
    {
      if (0 == strcmp(aPropName, "ro_def_firmware_version"))
      {
        getFirmwareVersion(valBuf);
      }
  #ifdef MOZ_B2G_OS_NAME
      else if (0 == strcmp(aPropName, "ro.def.os.name"))
      {
        sprintf(valBuf, "%s", MOZ_B2G_OS_NAME);
      }
  #endif
  #ifdef MOZ_B2G_VERSION
      else if (0 == strcmp(aPropName, "ro.def.os.version"))
      {
        sprintf(valBuf, "%s", MOZ_B2G_VERSION);
      }
  #endif
      else if (0 == strcmp(aPropName, "ro.def.wlan0.macaddr"))
      {
        getMacAddress("wlan0", valBuf);
      }
      else if (0 == strcmp(aPropName, "ro.def.imeisv"))
      {
        if (getImeiSV(value)) {
          return true;
        }
        return false;
      }

      else
      {
        __system_property_get(aPropName, valBuf);
      }

      if (strlen(valBuf) > 0)
      {
        value.AssignASCII(valBuf);

        return true;
      }
    }
    
    return false;
}

const char*
AndroidSystemPropertyHelper::getPropertyNameByPitemID(const uint32_t id)
{
  switch (id)
  {
#ifdef TARGET_ISP_IS_SPR
    case SYSPROP_DEVICE_VENDOR:
      return "ro.product.name";
    case SYSPROP_DEVICE_MODEL:
      return "ro.product.model";
    case SYSPROP_DEVICE_SOFTWARE_VERSION:
      return "ro.def.software.svn";
    case SYSPROP_DEVDTL_DEV_TYPE:
      return "ro_def_device_type";
    // FW_VER stored at /data/modem.ver
    case SYSPROP_DEVDTL_FW_VER:
      return "ro_def_firmware_version";
    case SYSPROP_DEVDTL_HW_VER:
      return "ro_def_hardware_version";
    case SYSPROP_DEVINFO_MAN:
      return "ro.product.manufacturer";
#endif
#ifdef TARGET_ISP_IS_ATT
    case SYSPROP_DEVDTL_E_HOST_MAN:
      return "ro.product.manufacturer";
    case SYSPROP_DEVDTL_E_HOST_MOD:
      return "ro.product.model";
    case SYSPROP_DEVDTL_E_HOST_SWV:
      return "ro.def.software.svn";
    case SYSPROP_DEVDTL_E_HOST_PLASMAL_ID:
      return "ro.def.plasmal.id"; //TODO
    case SYSPROP_DEVDTL_E_OS_NAME:
      return "ro.def.os.name";
    case SYSPROP_DEVDTL_E_OS_VER:
      return "ro.def.os.version";
    case SYSPROP_DEVDTL_E_WLAN_MAC_ADDR:
      return "ro.tct.wifimac";
    case SYSPROP_DEVDTL_E_IMEI_SV:
      return "ro.def.imeisv";

#endif
    default:
      return NULL;
  }

  return NULL;
}

const char *
AndroidSystemPropertyHelper::getFirmwareVersion(char *const retBuf)
{
  if (NULL != retBuf)
  {
    FILE* fp = fopen("/data/modem.ver", "r");
    if (fp)
    {
      fgets(retBuf, MAX_ANDROID_PROP_LEN - 1, fp);
      fclose(fp);

      return retBuf;
    }
  }
  return NULL;
}

const char *
AndroidSystemPropertyHelper::getMacAddress(const char *const ethName, char *const retBuf)
{
  struct ifreq ifreq;
  int sock = -1;

  if (NULL != retBuf && NULL != ethName)
  {
    if((sock = socket(AF_INET, SOCK_STREAM, 0)) < 0)
    {
      return NULL;
    }

    strcpy(ifreq.ifr_name, ethName);
    if(ioctl(sock, SIOCGIFHWADDR, &ifreq) < 0)
    {
      return NULL;
    }
    sprintf(retBuf, "%02x:%02x:%02x:%02x:%02x:%02x\n",
                        (unsigned char)ifreq.ifr_hwaddr.sa_data[0],
                        (unsigned char)ifreq.ifr_hwaddr.sa_data[1],
                        (unsigned char)ifreq.ifr_hwaddr.sa_data[2],
                        (unsigned char)ifreq.ifr_hwaddr.sa_data[3],
                        (unsigned char)ifreq.ifr_hwaddr.sa_data[4],
                        (unsigned char)ifreq.ifr_hwaddr.sa_data[5]);

    return retBuf;
  }

  return NULL;
}

bool
AndroidSystemPropertyHelper::getImeiSV(nsAString & aImeisv)
{
  nsCOMPtr<nsIMobileConnectionService> service =
    do_GetService(NS_MOBILE_CONNECTION_SERVICE_CONTRACTID);

  if (!service) {
      return false;
  }

  nsCOMPtr<nsIMobileConnection> connection = NULL;
  service->GetItemByServiceId(0, getter_AddRefs(connection));

  if (connection) {
    connection->GetImei(aImeisv);
    return true;
  }

  return false;
}

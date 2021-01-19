#include "MozSysPropMain.h"
#include "nsCOMPtr.h"
#include "nsComponentManagerUtils.h"
#include "nsITimer.h"
#include "PropertyFileHelper.h"
#include "NvHelper.h"
#include "UiccHelper.h"
#include "sysprop_constants.h"
#include "AndroidSystemPropertyHelper.h"
#include <string.h>
#include <stdio.h>

#ifdef MOZ_B2G_RIL
#include "nsIRadioInterfaceLayer.h"
#endif

#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "MozSysPropMain", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "MozSysPropMain", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)

#ifdef TARGET_PRODUCT_IS_GFLIP2
#define CHAMELEON_OBJ_FILE	"/carrier/chameleonobject.zip"
#else
#define CHAMELEON_OBJ_FILE	"/data/chameleonobject.zip"
#endif

namespace mozilla {
namespace dom {
namespace sysprop{

/*Initial*/
SysPropMain* SysPropMain::mInstance= NULL;

SysPropMain::SysPropMain(){
  LOG("enter");
	PropertyFileHelper helper;
	helper.init();
}

SysPropMain::~SysPropMain(){
  LOG("enter");
  this->messager = NULL;
	PropertyFileHelper helper;
	helper.backupFileIfNeeded();
}

SysPropMain* SysPropMain::getInstance(){
  LOG("enter");
  if(mInstance == NULL)mInstance = new SysPropMain;
  return mInstance;
}

SysPropMain* SysPropMain::getInstance(SysPropMessager* messager){
  LOG("enter");
  if(mInstance == NULL)mInstance = new SysPropMain;
  mInstance->messager = messager;
  return mInstance;
}

void SysPropMain::setMessager(SysPropMessager* messager){
  LOG("enter");
  mInstance->messager = messager;
}

void SysPropMain::sendGetError(int id, const char* errstr)
{
  if(this->messager != NULL) {
    nsString str;
    str.AssignASCII(errstr);
 		this->messager->SendGetError(id, str);
 	}
}

void SysPropMain::sendSetResult(int id, bool result, const char* errstr)
{
  if(this->messager != NULL) {
    nsString str;
    if (NULL != errstr)
    	str.AssignASCII(errstr);
 		this->messager->SendCompleteResult(id, result, str);
 	}
}

bool SysPropMain::GetSysProp(uint32_t id,bool fromJs){
  LOG("GetSysProp");
  return getSysPropUnified(id, NULL, fromJs, NULL, NULL);
}

bool SysPropMain::GetSysProp(uint32_t id,bool fromJs,nsAString& value, int32_t* errNo){
  return getSysPropUnified(id, NULL, fromJs, &value, errNo);
}
bool SysPropMain::GetSysPropByNode(const nsAString & node,bool fromJs,nsAString& value, int32_t* errNo){
  return getSysPropUnified(0, (const nsAString*)&node, fromJs, &value, errNo);
}

bool SysPropMain::SetSysProp(uint32_t id,const nsString& sysProp,bool fromJs,int* errNo){
  return setSysPropUnified(id, NULL, fromJs, &sysProp, errNo);
}

bool SysPropMain::SetSysProp(uint32_t id, const nsAString& sysProp, bool fromJs, bool updatePri, int* errNo){
	nsString strValue(sysProp);
  return setSysPropUnified(id, NULL, fromJs, &strValue, errNo);
}

bool SysPropMain::SetSysPropByNode(const nsAString & node, const nsAString& sysProp, bool fromJs, bool updatePri, int* errNo){
	nsString strValue(sysProp);
  return setSysPropUnified(0, (const nsAString*)&node, fromJs, &strValue, errNo, updatePri);
}


bool SysPropMain::Execute(const nsAString & node,bool fromJs,int* errNo){
  /*execute some node*/
#ifdef TARGET_ISP_IS_SPR
  StringGetter strGetter(&node);
  if(0 == strcmp("./FOTA/Poll", strGetter.get()))
  {
        nsCOMPtr<nsISettingsService> settings =
  	do_GetService("@mozilla.org/settingsService;1");

	nsCOMPtr<nsISettingsServiceLock> settingsLock;

	nsresult rv = settings->CreateLock(nullptr, getter_AddRefs(settingsLock));
	if (NS_FAILED(rv)) {
		LOG("settings->CreateLock failed");
                return false;
	}
	JS::Rooted<JS::Value> value(nsContentUtils::RootingCx());
	value.setInt32(1);
	rv = settingsLock->Set("FOTA.Poll", value, nullptr, nullptr);
	if (NS_FAILED(rv)) {
		LOG("settingsLock->Set failed");
                return false;
	}
   }
#endif
  return true;
}

bool SysPropMain::DoOtherAction(uint32_t id,bool fromJs){
  /*do some action, then send the complete result*/
	if ((id >= 0)&&(id <= 3))
		reset(id);

  if(this->messager != NULL){
    /*send the set result*/
    nsString strTmp;/*error string*/
    this->messager->SendCompleteResult(id,true/*or flase*/,strTmp/* or error*/);
  }
  return true;
}


SP_ITEM* SysPropMain::getSysPropItem(int id)
{
	for (int i = 0; i < _SYSPROP_COUNT; i++)
	{
		if (id == mSysPropTable[i].id)
			return &mSysPropTable[i];
	}
	return NULL;
}

SP_ITEM* SysPropMain::getSysPropItemByNode(const char* node)
{
	for (int i = 0; i < _SYSPROP_COUNT; i++)
	{
		if (0 == strcasecmp(mSysPropTable[i].node, node))
			return &mSysPropTable[i];
	}
	return NULL;
}

bool SysPropMain::getSysPropStringValue(SP_ITEM* pItem, nsString& retVal)
{
	PropertyFileHelper helper;
	switch(pItem->dataSource)
	{
		case DB_CARRIER:
			return helper.getStringValue(pItem->node, retVal);
		case NV:
			return NvHelper::readFromNv(*pItem, retVal);
		case UICC:
			return UiccHelper::readFromUicc(*pItem, retVal);
		case CONSTANT:
			return SyspropConstantsHelper::getConstant(pItem->id, retVal);
		case ANDROID_PROPERTY:
      return AndroidSystemPropertyHelper::readFromSystem(*pItem, retVal);
		default:
			return false;
	}
}

bool SysPropMain::setSysPropStringValue(SP_ITEM* pItem, const nsString& propValue, bool updatePRI)
{
	PropertyFileHelper helper;
	bool ret = false;
  StringGetter propValueGetter(&propValue);
	switch(pItem->dataSource)
	{
		case DB_CARRIER:
#ifdef TARGET_ISP_IS_SPR
			if (OEM_CHAMELEON_OBJECT == pItem->id) //chameleon object need to decoded
			{
					if (helper.decodeBase64ToFile(propValue, CHAMELEON_OBJ_FILE))
						ret = helper.writeStringValue(pItem->node, CHAMELEON_OBJ_FILE, updatePRI);
			}
			else if (SYSPROP_SIM_LOCK == pItem->id) //sim lock object need to do something else
			{
					if (setSimLock(propValue))
						ret = helper.writeStringValue(pItem->node, propValueGetter.get(), updatePRI);
			}
			//remove all impacts between ForceLTE and EnableLTE according to pr 3682126
/*			else if (SYSPROP_FORCELTE == pItem->id) //force lte need to enable lte
			{
          nsresult rv;
          //write forcelte first, because if need to set enablelte, the forcelte must be accessible
					ret = helper.writeStringValue(pItem->node, propValueGetter.get(), updatePRI);
          bool enabled = propValue.ToInteger(&rv);

          if ((NS_SUCCEEDED(rv))&&(ret)&&(enabled)) //forcelte is 1, need to set enablelte
          {
              nsString strEnableLte;
              strEnableLte.AssignASCII("1");
              SP_ITEM* pItemEnableLTE = getSysPropItemByNode(NODE_SYSPROP_ENABLEDLTE);
              NvHelper::writeToNv(*pItemEnableLTE, strEnableLte);
          }
			}
*/
			else
					ret = helper.writeStringValue(pItem->node, propValueGetter.get(), updatePRI);
#else
					ret = helper.writeStringValue(pItem->node, propValueGetter.get(), updatePRI);
#endif
			break;
		case NV:
			ret = NvHelper::writeToNv(*pItem, propValue);
			break;
		case UICC:
			ret =  UiccHelper::writeToUicc(*pItem, propValue);
			break;
		default:
			break;
	}
	if (ret)
	{
#ifdef TARGET_ISP_IS_SPR
		if (OEM_CHAMELEON_OBJECT == pItem->id) //chameleon object is too large to be notified directly
		{
		  nsString strNotify;
		  strNotify.AssignASCII(CHAMELEON_OBJ_FILE);
			notifySettingService(pItem, strNotify);
		}
		else
			notifySettingService(pItem, propValue);
#else
		notifySettingService(pItem, propValue);
#endif
	}
	return ret;
}

void SysPropMain::notifySettingService(SP_ITEM* pItem, const nsString& propValue)
{
	char buf[256];
	strcpy(buf, pItem->node);
	int offset = -1;
	for (int i = 0; i < strlen(buf); i++)
	{
		if ((offset < 0)&&(isalpha(buf[i])))
			offset = i;
		if ('/' == buf[i])
			buf[i] = '.';
	}
	if (offset < 0)
		offset = 0;

  StringGetter propValueGetter(&propValue);
	LOG("notifySettingService, buf=%s", buf);

	nsCOMPtr<nsISettingsService> settings =
  	do_GetService("@mozilla.org/settingsService;1");

	nsCOMPtr<nsISettingsServiceLock> settingsLock;

	nsresult rv = settings->CreateLock(nullptr, getter_AddRefs(settingsLock));
	if (NS_FAILED(rv)) {
		LOG("settings->CreateLock failed");
	}

	mozilla::AutoSafeJSContext cx;
	JSString* jstrValue = JS_NewStringCopyZ(cx, propValueGetter.get());
  JS::Rooted<JS::Value> value(cx, STRING_TO_JSVAL(jstrValue));
	//JS::Rooted<JS::Value> value(nsContentUtils::RootingCx());
	//value.setInt32(1);
	rv = settingsLock->Set(buf+offset, value, nullptr, nullptr);
	if (NS_FAILED(rv)) {
		LOG("settingsLock->Set failed");
	}

}


bool SysPropMain::getSysPropUnified(uint32_t id, const nsAString* pNodeName, bool fromJs, nsAString* pStrValue, int32_t* errNo)
{
  StringGetter nodeNameGetter(pNodeName);
  LOG("getSysPropUnified, id=%d, nodeName=%s, fromJs=%d, pStrValue=%s, errNo=%s",
  	id, (NULL==pNodeName)?"NULL":nodeNameGetter.get(), fromJs,
  	(NULL==pStrValue)?"NULL":"NOT NULL",
  	(NULL==errNo)?"NULL":"NOT NULL");

  nsString strRet;
  SP_ITEM* pItem = NULL;

  if (NULL != pNodeName)
  	pItem = getSysPropItemByNode(nodeNameGetter.get());
  else
  	pItem = getSysPropItem(id);

	if (NULL == pItem)
	{
	  LOG("NULL == pItem");
		if (fromJs)
			sendGetError(id, ERR_STR_UNKNOWN_ITEM);
		else
			*errNo = nsIJrdSysProp::ERR_CODE_UNKNOWN_ITEM;
		return true;
	}

	if (WO == pItem->rw) {
	  LOG("WO == pItem->rw");
		if (fromJs)
			sendGetError(pItem->id, ERR_STR_INVALID_PERM);
		else
			*errNo = nsIJrdSysProp::ERR_CODE_INVALID_PERM;
		return true;
	}

	if (getSysPropStringValue(pItem, strRet))
	{
	  LOG("getSysPropStringValue(pItem, str)");
		if (fromJs)
		{
			if (NULL != this->messager)
				this->messager->SendGetString(pItem->id, strRet);
		}
		else
		{
			if (NULL == pStrValue)
				*errNo = nsIJrdSysProp::ERR_CODE_ERROR_TYPE;
			else //convert nsString strRet to nsAString strValue
				(*pStrValue) = strRet.get();
		}
		return true;
	} else {
	  LOG("!getSysPropValue(pItem, str)");
	  if (fromJs)
		sendGetError(pItem->id, ERR_STR_GET);
	  else
	   *errNo = nsIJrdSysProp::ERR_CODE_GET;
	}

  return true;//should be no use here
}

bool SysPropMain::setSysPropUnified(uint32_t id, const nsAString* pNodeName, bool fromJs, const nsString* pStrValue, int32_t* errNo, bool updatePRI)
{
  StringGetter nodeNameGetter(pNodeName);
  StringGetter valueGetter(pStrValue);

  LOG("setSysPropUnified, id=%d, nodeName=%s, fromJs=%d, pStrValue=%s, errNo=%s",
    id, (NULL==pNodeName)?"NULL":nodeNameGetter.get(), fromJs,
    (NULL==pStrValue)?"NULL":valueGetter.get(),
    (NULL==errNo)?"NULL":"NOT NULL");

  if (NULL != errNo)
    *errNo = 0;

  SP_ITEM* pItem = NULL;
  if (NULL != pNodeName)
    pItem = getSysPropItemByNode(nodeNameGetter.get());
  else
    pItem = getSysPropItem(id);

	if (NULL == pItem) //cannot find item
	{
		if (fromJs)
			sendSetResult(id, false, ERR_STR_UNKNOWN_ITEM);
		else
	    *errNo = nsIJrdSysProp::ERR_CODE_UNKNOWN_ITEM;
		return true;
	}

  if (RO == pItem->rw) //cannot set property
  {
		if (fromJs)
			sendSetResult(pItem->id, false, ERR_STR_INVALID_PERM);
		else
	    *errNo = nsIJrdSysProp::ERR_CODE_INVALID_PERM;
		return true;
	}

	if (NULL == pStrValue)	//type check
	{
		if (fromJs)
			sendSetResult(pItem->id, false, ERR_STR_ERROR_TYPE);
		else
			*errNo = nsIJrdSysProp::ERR_CODE_ERROR_TYPE;
		return true;
	}

	if (setSysPropStringValue(pItem, (*pStrValue), updatePRI)) //succeeded
	{
		if (fromJs)
			sendSetResult(id, true, NULL);
  }
	else
	{
		if (fromJs)
			sendSetResult(pItem->id, false, ERR_STR_SET);
		else
		  *errNo = nsIJrdSysProp::ERR_CODE_SET;
	}
	return true;
}

void SysPropMain::reset(int resetType)
{
	bool isResetNeeded = false;

	PropertyFileHelper helper;

#ifdef TARGET_ISP_IS_SPR
        if(resetType == 0 || resetType == 3) //if resetType is RTN or BRAND , need to delete chameleonobject.zip in carrier partition
        {
                int rmFlag;
                rmFlag = remove(CHAMELEON_OBJ_FILE);
                LOG("delete file = %s, result = %d", CHAMELEON_OBJ_FILE, rmFlag);
        }
#endif

	for (int i = 0; i < _SYSPROP_COUNT; i++)
	{
		if (mSysPropTable[i].dataSource != DB_CARRIER)
			continue;
		switch(resetType)
		{
			case 0: //RTN
				isResetNeeded = mSysPropTable[i].resetOnRtn;
				break;
			case 1: //SCRTN
				isResetNeeded = mSysPropTable[i].resetOnScRtn;
				break;
			case 2: //CLEAR
				isResetNeeded = mSysPropTable[i].resetOnClear;
				break;
			case 3: //BRAND
				isResetNeeded = mSysPropTable[i].resetOnBrand;
				break;
			default:
				isResetNeeded = false;
				break;
		}
		if (isResetNeeded)
		{
				helper.removeProp(mSysPropTable[i].node);
		}
	}
}

bool SysPropMain::setSimLock(nsString value)
{
#ifdef MOZ_B2G_RIL
		bool ret = false;
		nsCOMPtr<nsIRadioInterfaceLayer> ril = do_GetService("@mozilla.org/ril;1");
		nsCOMPtr<nsIRadioInterface> radioInterface;
		if (ril)
		{
			ril->GetRadioInterface(0 /* clientId */, getter_AddRefs(radioInterface));
		}
		if (radioInterface)
		{
			nsresult rv;
			int32_t lockType = static_cast<int>(value.ToInteger(&rv));
			if (!NS_FAILED(rv))
			{
				if ((0 <= lockType)&&(3 >= lockType))
				{
					radioInterface->SetSimLock(lockType);
					ret = true;
				}
			}
		}
		return ret;
#else
		return false;
#endif
}


}//namespace sysprop
}//namespace dom
}//namespace mozilla

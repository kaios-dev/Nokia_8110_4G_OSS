#ifndef _SYSPROP_CONSTANTS_H
#define _SYSPROP_CONSTANTS_H

#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "SyspropConstantsHelper", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "SyspropConstantsHelper", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)

#include "sysprop.h"
#include "nsString.h"

#define CONSTANT_SYSPROP_DEVDTL_LARGE_OBJECT true
#define CONSTANT_SYSPROP_DEVINFO_DM_VER "DM1.2"
#define CONSTANT_SYSPROP_DEVINFO_LANG "EN-US"

class SyspropConstantsHelper
{
	public:
	bool static getConstant(int id, nsString& value)
	{
		bool ret = true;
		switch (id)
		{
#ifdef TARGET_ISP_IS_SPR
			case SYSPROP_DEVDTL_LARGE_OBJECT:
				value = getBoolString(CONSTANT_SYSPROP_DEVDTL_LARGE_OBJECT);
			break;
			case SYSPROP_DEVINFO_DM_VER:
				value = NS_LITERAL_STRING(CONSTANT_SYSPROP_DEVINFO_DM_VER);
			break;
			case SYSPROP_DEVINFO_LANG:
				value = NS_LITERAL_STRING(CONSTANT_SYSPROP_DEVINFO_LANG);
			break;
#endif
			default:
				ret = false;
			break;
		}

		if (ret)
			LOG("getConstant succeeded: id = %d", id);
		else
			LOG("getConstant failed: id = %d", id);
		return ret;
	}

	private:
	static nsString getBoolString(bool b)
	{
		return b ? NS_LITERAL_STRING("1") : NS_LITERAL_STRING("0");
	}
};

#endif //_SYSPROP_CONSTANTS_H

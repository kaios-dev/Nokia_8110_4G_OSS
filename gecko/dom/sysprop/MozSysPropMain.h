#ifndef mozilla_dom_sysprop_MozSysPropMain_h
#define mozilla_dom_sysprop_MozSysPropMain_h

#include "MozSysPropMessager.h"
#include "sysprop.h"
#include "nsISettingsService.h"
#include "nsContentUtils.h"
#include "nsServiceManagerUtils.h"
#include "JrdISysProp.h"

#define ERR_STR_UNKNOWN_ITEM	"Cannot get property item by this id or node name"
#define ERR_STR_INVALID_PERM	"Invalid permission, cannot read or write this property"
#define ERR_STR_UNKNOWN_TYPE	"Unknown type for this property"
#define ERR_STR_ERROR_TYPE	"Error type call for this property"
#define ERR_STR_GET	"Cannot get this property value"
#define ERR_STR_SET	"Cannot set this property value"

namespace mozilla {
namespace dom {
namespace sysprop {

class SysPropMain{
  private:
    static SysPropMain* mInstance;
    SysPropMain();
    SysPropMessager* messager;
    SP_ITEM* getSysPropItem(int id);
    SP_ITEM* getSysPropItemByNode(const char* node);
    void sendGetError(int id, const char* errstr);

    void sendSetResult(int id, bool result, const char* errstr);
      bool getSysPropStringValue(SP_ITEM* pItem, nsString& retVal);
      bool setSysPropStringValue(SP_ITEM* pItem, const nsString& propValue, bool updatePRI);
      void notifySettingService(SP_ITEM* pItem, const nsString& propValue);
		bool getSysPropUnified(uint32_t id, const nsAString* pNodeName, bool fromJs, nsAString* pStrValue, int32_t* errNo);
		bool setSysPropUnified(uint32_t id, const nsAString* pNodeName, bool fromJs, const nsString* pStrValue, int32_t* errNo, bool updatePRI=false);
      SP_ITEM mSysPropTable[_SYSPROP_COUNT] = SP_ITEM_ARRAY;
    bool setSimLock(nsString value);
  public:
    virtual ~SysPropMain();
    static SysPropMain* getInstance();
    static SysPropMain* getInstance(SysPropMessager* messager);
    void setMessager(SysPropMessager* messager);
    inline SysPropMessager* GetMessager()const{return messager;}
    /*From webidl get system property call this function*/
    bool GetSysProp(uint32_t id,bool fromJs);
    bool GetSysProp(uint32_t id,bool fromJs,nsAString& value, int32_t* errNo);
    bool GetSysPropByNode(const nsAString & node,bool fromJs,nsAString& value, int32_t* errNo);
    bool SetSysProp(uint32_t id, const nsString& sysProp, bool fromJs, int* errNo);
    bool SetSysProp(uint32_t id, const nsAString& sysProp, bool fromJs, bool updatePri, int* errNo);
    bool SetSysPropByNode(const nsAString & node, const nsAString& sysProp, bool fromJs, bool updatePri, int* errNo);
    bool Execute(const nsAString & node,bool fromJs,int* errNo);
    bool DoOtherAction(uint32_t id,bool fromJs);
    void reset(int resetType);
};
    }
  }
}
#endif

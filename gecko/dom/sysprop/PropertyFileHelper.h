#ifndef mozilla_dom_sysprop_PropertyFileHelper_h
#define mozilla_dom_sysprop_PropertyFileHelper_h

#include <libxml/encoding.h>
#include <libxml/xmlwriter.h>
#include <libxml/tree.h>
#include <libxml/parser.h>
#include <libxml/xpath.h>
#include <libxml/xpathInternals.h>
#include "mozilla/dom/ContentChild.h"

namespace mozilla {
namespace dom {
namespace sysprop {

class StringGetter {
  public:
    StringGetter(const nsString *pStr);
    StringGetter(const nsAString* pStr);
    char* get();
    ~StringGetter();
  private:
    char* mpStr;
};

class PropertyFileHelper
{
public:
  PropertyFileHelper();
  ~PropertyFileHelper();
  void backupFileIfNeeded();
  void init();
  bool decodeBase64ToFile(const nsString base64Str, const char* filename);
  bool writeStringValue(const char* propName, char* propValue, bool updatePRI=false);
  bool getStringValue(const char* propName, nsString& retVal);
  bool removeProp(const char* propName);

private:
	xmlDocPtr initXmlDoc();
  void copyFile(const char* src, const char* dest);
	bool updateExistXmlNode(xmlDocPtr doc, const char* propName, char* propValue, bool updatePRI);
  bool initPropertyFile(const char *uri);

protected:
};
		}	//namespace sysprop
	}		//namespace dom
}			//namespace mozilla
#endif

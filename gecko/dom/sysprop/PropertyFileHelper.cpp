#include "PropertyFileHelper.h"
#include <fstream>
#include "mozilla/Base64.h"
#include <android/log.h>

#ifdef TARGET_PRODUCT_IS_GFLIP2
#define DEFAULT_PROPERTY_FILE	"/carrier/sysprop.xml"
#define BACKUP_PROPERTY_FILE	"/carrier/sysprop_backup.xml"
#else
#define DEFAULT_PROPERTY_FILE	"/data/sysprop.xml"
#define BACKUP_PROPERTY_FILE	"/data/sysprop_backup.xml"
#endif
#define PRI_PROPERTY_FILE "/system/etc/pri.xml"

#define PRI_PROPERTY_FILE_TEST "/carrier/persist/preload/pri.xml"

#define NODE_ROOT	"CONFIG"
#define NODE_ITEM	"ITEM"
#define NODE_ATTR_NAME	"name"
#define NODE_ATTR_VALUE	"value"
#define NODE_ATTR_PRI	"pri"

#undef LOG
#define LOG(...) do{\
__android_log_print(ANDROID_LOG_DEBUG, "PropertyFileHelper", __VA_ARGS__);\
__android_log_print(ANDROID_LOG_DEBUG, "PropertyFileHelper", ":--(%s:%d) %s: ",__FILE__, __LINE__, __func__);\
}while(0)

using namespace mozilla;
using namespace mozilla::dom;
using namespace mozilla::dom::sysprop;

StringGetter::StringGetter(const nsString *pStr) {
  if (NULL != pStr)
    mpStr = ToNewUTF8String(*pStr);
  else
    mpStr = NULL;
}

StringGetter::StringGetter(const nsAString *pStr) {
  if (NULL != pStr)
    mpStr = ToNewUTF8String(*pStr);
  else
    mpStr = NULL;
}

StringGetter::~StringGetter(){
  nsMemory::Free(mpStr);
}

char* StringGetter::get(){
  return mpStr;
}


PropertyFileHelper::PropertyFileHelper()
{
	//xmlInitParser();
}

PropertyFileHelper::~PropertyFileHelper()
{
	//xmlCleanupParser();
}

void PropertyFileHelper::init()
{
		//try to parse DEFAULT_PROPERTY_FILE
		xmlDocPtr doc = xmlParseFile(DEFAULT_PROPERTY_FILE);
		if (NULL != doc)	//DEFAULT_PROPERTY_FILE is OK, just backup and return
		{
		  copyFile(DEFAULT_PROPERTY_FILE, BACKUP_PROPERTY_FILE);
		  xmlFreeDoc(doc);
			return;
		}

		//try to parse BACKUP_PROPERTY_FILE
		doc = xmlParseFile(BACKUP_PROPERTY_FILE);
		if (NULL != doc)	//BACKUP_PROPERTY_FILE is OK, just recover and return
		{
		  copyFile(BACKUP_PROPERTY_FILE, DEFAULT_PROPERTY_FILE);
		  xmlFreeDoc(doc);
			return;
		}

		// according to 2016-05-09 mail, for test
		doc = xmlParseFile(PRI_PROPERTY_FILE_TEST);
		if (NULL != doc)	//BACKUP_PROPERTY_FILE_TEST is OK, just recover and return
		{
		  copyFile(PRI_PROPERTY_FILE_TEST, DEFAULT_PROPERTY_FILE);
		  copyFile(PRI_PROPERTY_FILE_TEST, BACKUP_PROPERTY_FILE);
		  xmlFreeDoc(doc);
			return;
		}

		//no DEFAULT_PROPERTY_FILE or BACKUP_PROPERTY_FILE, need to copy from pri
		copyFile(PRI_PROPERTY_FILE, DEFAULT_PROPERTY_FILE);
		copyFile(PRI_PROPERTY_FILE, BACKUP_PROPERTY_FILE);
		xmlFreeDoc(doc);
}

void PropertyFileHelper::backupFileIfNeeded()
{
    xmlDocPtr doc = xmlParseFile(DEFAULT_PROPERTY_FILE);
    if (NULL != doc)
    {
      copyFile(DEFAULT_PROPERTY_FILE, BACKUP_PROPERTY_FILE);
		  xmlFreeDoc(doc);
    }
}

void PropertyFileHelper::copyFile(const char* src, const char* dest)
{
    std::ifstream from(src, std::ios::binary);
    std::ofstream to(dest, std::ios::binary);
    to << from.rdbuf();
}

xmlDocPtr PropertyFileHelper::initXmlDoc()
{
    int rc;
    xmlTextWriterPtr writer;

    LOG("initXmlDoc");

    /* Create a new XmlWriter for uri, with no compression. */
    writer = xmlNewTextWriterFilename(DEFAULT_PROPERTY_FILE, 0);
    if (writer == NULL) {
        LOG("testXmlwriterFilename: Error creating the xml writer\n");
        return NULL;
    }

    /* Start the document with the xml default for the version,
     * encoding ISO 8859-1 and the default for the standalone
     * declaration. */
    rc = xmlTextWriterStartDocument(writer, NULL, NULL, NULL);
    if (rc < 0) {
        LOG("testXmlwriterFilename: Error at xmlTextWriterStartDocument\n");
        return NULL;
    }

    /* Start an root element. Since thist is the first
     * element, this will be the root element of the document. */
    rc = xmlTextWriterStartElement(writer, BAD_CAST(NODE_ROOT));
    if (rc < 0) {
        LOG("testXmlwriterFilename: Error at xmlTextWriterStartElement\n");
        return NULL;
    }

    /* Here we could close the elements ORDER and EXAMPLE using the
     * function xmlTextWriterEndElement, but since we do not want to
     * write any other elements, we simply call xmlTextWriterEndDocument,
     * which will do all the work. */
    rc = xmlTextWriterEndDocument(writer);
    if (rc < 0) {
        LOG("testXmlwriterFilename: Error at xmlTextWriterEndDocument\n");
        return NULL;
    }

    xmlFreeTextWriter(writer);
    return xmlParseFile(DEFAULT_PROPERTY_FILE);
}

bool PropertyFileHelper::updateExistXmlNode(xmlDocPtr doc, const char* propName, char* propValue, bool updatePRI)
{
    xmlXPathContextPtr xpathCtx;
    xmlXPathObjectPtr xpathObj;
    xmlNodeSetPtr nodes;

    char* pStr = (char*)malloc(strlen(NODE_ITEM) + strlen(NODE_ATTR_NAME) + strlen(propName) + 10);
    sprintf(pStr, "//%s[@%s='%s']", NODE_ITEM, NODE_ATTR_NAME, propName);
    const xmlChar* xpathExpr = BAD_CAST(pStr);
    const xmlChar* xmlValue = BAD_CAST(propValue);
    bool ret = false;
    int size = 0;

    /* Create xpath evaluation context */
    xpathCtx = xmlXPathNewContext(doc);
    if(xpathCtx == NULL) {
        LOG("Error: unable to create new XPath context\n");
        goto updateend;
    }

    /* Evaluate xpath expression */
    xpathObj = xmlXPathEvalExpression(xpathExpr, xpathCtx);
    if(xpathObj == NULL) {
        LOG("Error: unable to evaluate xpath expression \"%s\"\n", xpathExpr);
        goto updateend;
    }

    nodes = xpathObj->nodesetval;
    size = (nodes) ? nodes->nodeNr : 0;
    if (0 == size)
        goto updateend;

    xmlSetProp(nodes->nodeTab[0], BAD_CAST(NODE_ATTR_VALUE), xmlValue);
    if (updatePRI)
    {
    	//try to get PRI, if got, update PRI
    	char* pri = (char*)xmlGetProp(nodes->nodeTab[0], BAD_CAST(NODE_ATTR_PRI));
    	if (NULL != pri)
    	{
		    xmlSetProp(nodes->nodeTab[0], BAD_CAST(NODE_ATTR_PRI), xmlValue);
		  	xmlFree(pri);
		  }
	  }

    ret = true;

updateend:
    free(pStr);
    if (NULL != xpathObj)
        xmlXPathFreeObject(xpathObj);
    if (NULL != xpathCtx)
        xmlXPathFreeContext(xpathCtx);
        return ret;

}

bool PropertyFileHelper::writeStringValue(const char* propName, char* propValue, bool updatePRI)
{
        LOG("writeStringValue, propName=%s, propValue=%s", propName, propValue);

        xmlDocPtr doc;

    xmlKeepBlanksDefault(0);
    xmlIndentTreeOutput = 1;
    /* Load XML document */
    doc = xmlParseFile(DEFAULT_PROPERTY_FILE);
    if (doc == NULL) {
        LOG("Error: unable to parse file \"%s\"\n", DEFAULT_PROPERTY_FILE);
        return false;
    }

    if (!updateExistXmlNode(doc, propName, propValue, updatePRI))
    {
        LOG("updateExistXmlNode failed");
        //insert a new one
        xmlNodePtr rootNode = xmlDocGetRootElement(doc);
        xmlNodePtr newNode = xmlNewNode(NULL, BAD_CAST(NODE_ITEM));
        xmlSetProp(newNode, BAD_CAST(NODE_ATTR_NAME), BAD_CAST(propName));
        xmlSetProp(newNode, BAD_CAST(NODE_ATTR_VALUE), BAD_CAST(propValue));
        if (updatePRI)
        {
        	//a new node should not have PRI attribute
        }
        xmlAddChild(rootNode, newNode);
    }

    /* dump the resulting document */
    //xmlDocDump(stdout, doc);
    int result = xmlSaveFormatFile(DEFAULT_PROPERTY_FILE, doc, 2);
    LOG("xmlSaveFile result=%d", result);

    /* free the document */
    xmlFreeDoc(doc);

    return (-1 == result)?false:true;
}

bool PropertyFileHelper::getStringValue(const char* propName, nsString& retVal)
{
    LOG("getStringValue, propName=%s", propName);

    xmlDocPtr doc;
    bool ret = false;

    /* Load XML document */
    doc = xmlParseFile(DEFAULT_PROPERTY_FILE);
    if (doc == NULL) {
        LOG("Error: unable to parse file \"%s\"\n", DEFAULT_PROPERTY_FILE);
        return false;
    }

    xmlXPathContextPtr xpathCtx;
    xmlXPathObjectPtr xpathObj;
    xmlNodeSetPtr nodes;

    char* pStr = (char*)malloc(strlen(NODE_ITEM) + strlen(NODE_ATTR_NAME) + strlen(propName) + 10);
    sprintf(pStr, "//%s[@%s='%s']", NODE_ITEM, NODE_ATTR_NAME, propName);
    const xmlChar* xpathExpr = BAD_CAST(pStr);
    int size = 0;
    char* pValue = NULL;

    /* Create xpath evaluation context */
    xpathCtx = xmlXPathNewContext(doc);
    if(xpathCtx == NULL) {
        LOG("Error: unable to create new XPath context\n");
        goto searchend;
    }

    /* Evaluate xpath expression */
    xpathObj = xmlXPathEvalExpression(xpathExpr, xpathCtx);
    if(xpathObj == NULL) {
        LOG("Error: unable to evaluate xpath expression \"%s\"\n", xpathExpr);
        goto searchend;
    }

    nodes = xpathObj->nodesetval;
    size = (nodes) ? nodes->nodeNr : 0;
    if (0 == size)
        goto searchend;

    pValue = (char*)xmlGetProp(nodes->nodeTab[0], BAD_CAST(NODE_ATTR_VALUE));
    retVal.AssignASCII(pValue);
    xmlFree(pValue);
    ret = true;

searchend:
    free(pStr);
    if (NULL != xpathObj)
        xmlXPathFreeObject(xpathObj);
    if (NULL != xpathCtx)
        xmlXPathFreeContext(xpathCtx);
    /* free the document */
    xmlFreeDoc(doc);
    return ret;
}

bool PropertyFileHelper::removeProp(const char* propName)
{
    LOG("getStringValue, propName=%s", propName);

    xmlDocPtr doc;
    bool ret = false;

    xmlKeepBlanksDefault(0);
    xmlIndentTreeOutput = 1;
    /* Load XML document */
    doc = xmlParseFile(DEFAULT_PROPERTY_FILE);
    if (doc == NULL) {
        LOG("Error: unable to parse file \"%s\"\n", DEFAULT_PROPERTY_FILE);
        return false;
    }

    xmlXPathContextPtr xpathCtx;
    xmlXPathObjectPtr xpathObj;
    xmlNodeSetPtr nodes;

    char* pStr = (char*)malloc(strlen(NODE_ITEM) + strlen(NODE_ATTR_NAME) + strlen(propName) + 10);
    sprintf(pStr, "//%s[@%s='%s']", NODE_ITEM, NODE_ATTR_NAME, propName);
    const xmlChar* xpathExpr = BAD_CAST(pStr);
    xmlChar* pri = NULL;
    int size = 0;

    /* Create xpath evaluation context */
    xpathCtx = xmlXPathNewContext(doc);
    if(xpathCtx == NULL) {
        LOG("Error: unable to create new XPath context\n");
        goto searchend;
    }

    /* Evaluate xpath expression */
    xpathObj = xmlXPathEvalExpression(xpathExpr, xpathCtx);
    if(xpathObj == NULL) {
        LOG("Error: unable to evaluate xpath expression \"%s\"\n", xpathExpr);
        goto searchend;
    }

    nodes = xpathObj->nodesetval;
    size = (nodes) ? nodes->nodeNr : 0;
    if (0 == size) {
        ret = true;
        goto searchend;
    }

  	pri = xmlGetProp(nodes->nodeTab[0], BAD_CAST(NODE_ATTR_PRI));
  	if (NULL != pri) //got pri, just update value to pri
  	{
	    xmlSetProp(nodes->nodeTab[0], BAD_CAST(NODE_ATTR_VALUE), pri);
	    xmlFree(pri);
	  }
	  else //if not got pri, just remove
	  {
	    xmlUnlinkNode(nodes->nodeTab[0]);
    	xmlFreeNode(nodes->nodeTab[0]);
    }

    ret = (-1 == xmlSaveFormatFile(DEFAULT_PROPERTY_FILE, doc, 2))?false:true;

searchend:
    free(pStr);
    if (NULL != xpathObj)
        xmlXPathFreeObject(xpathObj);
    if (NULL != xpathCtx)
        xmlXPathFreeContext(xpathCtx);
    /* free the document */
    xmlFreeDoc(doc);

    return ret;
}

bool PropertyFileHelper::initPropertyFile(const char *uri)
{
    int rc;
    xmlTextWriterPtr writer;

    LOG("initPropertyFile");

    /* Create a new XmlWriter for uri, with no compression. */
    writer = xmlNewTextWriterFilename(uri, 0);
    if (writer == NULL) {
        LOG("testXmlwriterFilename: Error creating the xml writer\n");
        return false;
    }

    /* Start the document with the xml default for the version,
     * encoding ISO 8859-1 and the default for the standalone
     * declaration. */
    rc = xmlTextWriterStartDocument(writer, NULL, NULL, NULL);
    if (rc < 0) {
        LOG("testXmlwriterFilename: Error at xmlTextWriterStartDocument\n");
        return false;
    }

    /* Start an element named "CONFIG". Since thist is the first
     * element, this will be the root element of the document. */
    rc = xmlTextWriterStartElement(writer, BAD_CAST "CONFIG");
    if (rc < 0) {
        LOG("testXmlwriterFilename: Error at xmlTextWriterStartElement\n");
        return false;
    }

    /* Start an element named "ITEM" as child of EXAMPLE. */
    rc = xmlTextWriterStartElement(writer, BAD_CAST "ITEM");
    if (rc < 0) {
        LOG("testXmlwriterFilename: Error at xmlTextWriterStartElement\n");
        return false;
    }

    /* Add an attribute with name "version" and value "1.0" to ORDER. */
    rc = xmlTextWriterWriteAttribute(writer, BAD_CAST "name",
                                     BAD_CAST "123");
    if (rc < 0) {
        LOG("testXmlwriterFilename: Error at xmlTextWriterWriteAttribute\n");
        return false;
    }

    /* Add an attribute with name "xml:lang" and value "de" to ORDER. */
    rc = xmlTextWriterWriteAttribute(writer, BAD_CAST "value",
                                     BAD_CAST "456");
    if (rc < 0) {
        LOG("testXmlwriterFilename: Error at xmlTextWriterWriteAttribute\n");
        return false;
    }

    /* Here we could close the elements ORDER and EXAMPLE using the
     * function xmlTextWriterEndElement, but since we do not want to
     * write any other elements, we simply call xmlTextWriterEndDocument,
     * which will do all the work. */
    rc = xmlTextWriterEndDocument(writer);
    if (rc < 0) {
        LOG("testXmlwriterFilename: Error at xmlTextWriterEndDocument\n");
        return false;
    }

    xmlFreeTextWriter(writer);
    return true;
}

bool PropertyFileHelper::decodeBase64ToFile(const nsString base64Str, const char* filename)
{
  NS_ConvertUTF16toUTF8 temp(base64Str);
  temp.StripWhitespace();

  // Re-add padding
  if (temp.Length() % 4 == 3) {
    temp.AppendLiteral("=");
  } else if (temp.Length() % 4 == 2) {
    temp.AppendLiteral("==");
  } if (temp.Length() % 4 == 1) {
    return false; // bad Base64
  }

  // Translate from URL-safe character set to normal
  temp.ReplaceChar('-', '+');
  temp.ReplaceChar('_', '/');

  // Perform the actual base64 decode
  nsCString binaryData;
  nsresult rv = Base64Decode(temp, binaryData);
  if (NS_FAILED(rv))
    return false;

  std::ofstream outfile(filename, std::ofstream::binary);
  outfile.write(binaryData.BeginReading(),
              binaryData.Length());
  outfile.close();

	return true;
}

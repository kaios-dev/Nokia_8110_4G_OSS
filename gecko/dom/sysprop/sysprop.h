#ifndef _SYSPROP_H_H_H_H_
#define _SYSPROP_H_H_H_H_

typedef enum 	{STRING, INT, BYTE, CHAR, BOOLEAN, UINT32, INT16, BYTEARRAY, BASE64} SP_VAL_TYPE;
typedef enum 	{RW, RO, WO} SP_RW_PERM;
typedef enum 	{NON_EXIST, DB_CARRIER, UICC, NV, CONSTANT, ANDROID_PROPERTY/*, SETTINGS, UICC, NV, DB_DATA, PRI*/} SP_DATASOURCE;
//typedef void (*pfWriteFunc)(int,const char*);
//typedef void (*pfReadFunc)(int,const char*);
struct SP_ITEM 
{
		int id;
		const char* node;
		SP_VAL_TYPE type;
		SP_RW_PERM rw;
		SP_DATASOURCE dataSource;
		bool resetOnRtn;
		bool resetOnScRtn;
		bool resetOnClear;
		bool resetOnBrand;
		//bool isReadSync = true;	//do not need this, because data source itself defined sync or async
		//bool isWriteSync = true;//do not need this, because data source itself defined sync or async
		//pfReadFunc extReadFunc;
		//pfWriteFunc extWriteFunc;
};

#define OEM_LIFE_TIMER 9000
#define NODE_OEM_LIFE_TIMER "oem.life.timer"

#define OEM_LIFE_TIMER_CONDITIONAL 9008
#define NODE_OEM_LIFE_TIMER_CONDITIONAL "ome.life.timer.conditional"

#define _SYSPROP_COUNT	2

#define SP_ITEM_ARRAY\
{\
        {OEM_LIFE_TIMER,NODE_OEM_LIFE_TIMER,STRING,RW,DB_CARRIER,true,false,false,false}, \
        {OEM_LIFE_TIMER_CONDITIONAL,NODE_OEM_LIFE_TIMER_CONDITIONAL,STRING,RW,DB_CARRIER,true,false,false,false} \
}

#ifdef TARGET_ISP_IS_SPR
#include "sysprop_sprint.h"
#endif

#ifdef TARGET_ISP_IS_ATT
#include "sysprop_att.h"
#endif

#ifdef TARGET_ISP_IS_TMO
#include "sysprop_tmo.h"
#endif
	
#endif //_SYSPROP_H_H_H_H_

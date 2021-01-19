#ifndef _SYSPROP_TMO_H_H_H_
#define _SYSPROP_TMO_H_H_H_

/*node "oem.life.timer" define in sysprop.h*/
//#define OEM_LIFE_TIMER 9000
//#define NODE_OEM_LIFE_TIMER "oem.life.timer"

#ifdef _SYSPROP_COUNT
#undef _SYSPROP_COUNT
#endif

#define _SYSPROP_COUNT	2

#ifdef SP_ITEM_ARRAY
#undef SP_ITEM_ARRAY
#endif

#define SP_ITEM_ARRAY\
{\
        {OEM_LIFE_TIMER,NODE_OEM_LIFE_TIMER,STRING,RW,DB_CARRIER,true,false,false,false}, \
        {OEM_LIFE_TIMER_CONDITIONAL,NODE_OEM_LIFE_TIMER_CONDITIONAL,STRING,RW,DB_CARRIER,true,false,false,false} \
}
	
#endif //_SYSPROP_TMO_H_H_H_

#ifndef __SYS_PROP_TYPE__
#define __SYS_PROP_TYPE__
namespace mozilla {
namespace dom {
namespace sysprop {

typedef enum {
  SYS_PROP_ACT_GET,
  SYS_PROP_ACT_SET,
  SYS_PROP_ACT_EXE,
  SYS_PROP_ACT_OTH,
}SysPropAct;

typedef enum {
  SYS_PROP_DATA_STR,
  SYS_PROP_DATA_INT,
  SYS_PROP_DATA_BOOL,
  SYS_PROP_DATA_OTH,
}SysPropDataType;

typedef enum {
  SYS_PROP_BY_ID,
  SYS_PROP_BY_NODE,
  SYS_PROP_BY_OTH,
}SysPropOpType;
}
}
}
#endif
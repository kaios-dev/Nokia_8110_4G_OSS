/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "NetIdManager.h"

#undef LOG
#if DEBUG
#define LOG(args...)  __android_log_print(ANDROID_LOG_DEBUG, "NetIdManager" , ## args)
#else
#define LOG(args...)
#endif

#define GET_STR(param) NS_ConvertUTF16toUTF8(param).get()

NetIdManager::NetIdManager()
  : mNextNetId(MIN_NET_ID)
{
}

int NetIdManager::getNextNetId()
{
  // Modified from
  // http://androidxref.com/5.0.0_r2/xref/frameworks/base/services/
  //        core/java/com/android/server/ConnectivityService.java#764

  int netId = mNextNetId;
  if (++mNextNetId > MAX_NET_ID) {
    mNextNetId = MIN_NET_ID;
  }

  return netId;
}

void NetIdManager::acquire(const nsString& aInterfaceName,
                           NetIdInfo* aNetIdInfo, int aType)
{
  // Lookup or create one.
  if (!mInterfaceToNetIdHash.Get(aInterfaceName, aNetIdInfo)) {
    aNetIdInfo->mNetId = getNextNetId();
    aNetIdInfo->mTypes = 0;
  }

  LOG("acquire: (%s/%d)", GET_STR(aInterfaceName), aType);
  addType(aNetIdInfo->mTypes, aType);

  // Update hash and return.
  mInterfaceToNetIdHash.Put(aInterfaceName, *aNetIdInfo);

  return;
}

bool NetIdManager::lookup(const nsString& aInterfaceName,
                          NetIdInfo* aNetIdInfo)
{
  return mInterfaceToNetIdHash.Get(aInterfaceName, aNetIdInfo);
}

bool NetIdManager::release(const nsString& aInterfaceName,
                           NetIdInfo* aNetIdInfo, int aType)
{
  if (!mInterfaceToNetIdHash.Get(aInterfaceName, aNetIdInfo)) {
    return false; // No such key.
  }

  LOG("release: (%s/%d)", GET_STR(aInterfaceName), aType);
  removeType(aNetIdInfo->mTypes, aType);

  // Update the hash if still be referenced.
  if (aNetIdInfo->mTypes != 0){
    mInterfaceToNetIdHash.Put(aInterfaceName, *aNetIdInfo);
    return true;
  }

  // No longer be referenced. Remove the entry.
  mInterfaceToNetIdHash.Remove(aInterfaceName);

  return true;
}

/**
 * Using for adding the network type in bitmask.
 *
 * Refer to nsINetworkInfo interface.
 *  NETWORK_TYPE_MOBILE(1) => 0x02
 *  NETWORK_TYPE_MOBILE_MMS(2) => 0x04
 *  NETWORK_TYPE_MOBILE_SUPL(3) => 0x08
 *
 *  @param aTypes
 *         current network types.
 *         type
 *         network type need to add.
**/
void NetIdManager::addType(NetType& aTypes, int type)
{
  aTypes = aTypes | (0x01 << type);
  LOG("%s: %d",__FUNCTION__,aTypes);
}

/**
 * Using for adding the network type in bitmask.
 *
 * Refer to nsINetworkInfo interface.
 *  NETWORK_TYPE_MOBILE(1) => 0x02
 *  NETWORK_TYPE_MOBILE_MMS(2) => 0x04
 *  NETWORK_TYPE_MOBILE_SUPL(3) => 0x08
 *
 *  @param aTypes
 *         current network types.
 *         type
 *         network type need to add.
**/
void NetIdManager::removeType(NetType& aTypes, int type)
{
  aTypes = aTypes & ~(0x01 << type);
  LOG("%s: %d",__FUNCTION__,aTypes);
}

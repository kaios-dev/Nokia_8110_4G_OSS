/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* Copyright (C) 2016 Kai OS Technologies. All rights reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include "KaiGeolocationProvider.h"

#ifdef MOZ_B2G_RIL
#include "mozstumbler/MozStumbler.h"
#endif
#include "nsGeoPosition.h"

#undef LOG
#undef ERR
#undef DBG
#define LOG(args...)  __android_log_print(ANDROID_LOG_INFO,  "KAI_GEO", ## args)
#define ERR(args...)  __android_log_print(ANDROID_LOG_ERROR, "KAI_GEO", ## args)
#define DBG(args...)  __android_log_print(ANDROID_LOG_DEBUG, "KAI_GEO", ## args)

using namespace mozilla;
using namespace mozilla::dom;

NS_IMPL_ISUPPORTS(KaiGeolocationProvider,
                  nsIGeolocationProvider)

/* static */ KaiGeolocationProvider* KaiGeolocationProvider::sSingleton = nullptr;


KaiGeolocationProvider::KaiGeolocationProvider()
  : mStarted(false)
{
}

KaiGeolocationProvider::~KaiGeolocationProvider()
{
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(!mStarted, "Must call Shutdown before destruction");

  sSingleton = nullptr;
}

already_AddRefed<KaiGeolocationProvider>
KaiGeolocationProvider::GetSingleton()
{
  MOZ_ASSERT(NS_IsMainThread());

  if (!sSingleton) {
    sSingleton = new KaiGeolocationProvider();
  }

  RefPtr<KaiGeolocationProvider> provider = sSingleton;
  return provider.forget();
}

NS_IMETHODIMP
KaiGeolocationProvider::Startup()
{
  MOZ_ASSERT(NS_IsMainThread());

  if (mStarted) {
    return NS_OK;
  }

  mNetworkLocationProvider =
    do_CreateInstance("@mozilla.org/geolocation/mls-provider;1");
  if (mNetworkLocationProvider) {
    nsresult rv = mNetworkLocationProvider->Startup();
    if (NS_SUCCEEDED(rv)) {
      RefPtr<NetworkLocationUpdate> update = new NetworkLocationUpdate();
      mNetworkLocationProvider->Watch(update);
    }
  }

  mGpsLocationProvider =
    do_CreateInstance("@mozilla.org/gonk-gps-geolocation-provider;1");
  if (mGpsLocationProvider) {
    nsresult rv = mGpsLocationProvider->Startup();
    if (NS_SUCCEEDED(rv)) {
      RefPtr<GpsLocationUpdate> update = new GpsLocationUpdate();
      mGpsLocationProvider->Watch(update);
    }
  }

  mStarted = true;
  return NS_OK;
}

NS_IMETHODIMP
KaiGeolocationProvider::Watch(nsIGeolocationUpdate* aCallback)
{
  MOZ_ASSERT(NS_IsMainThread());

  mLocationCallback = aCallback;
  return NS_OK;
}

NS_IMETHODIMP
KaiGeolocationProvider::Shutdown()
{
  MOZ_ASSERT(NS_IsMainThread());

  if (!mStarted) {
    return NS_OK;
  }

  mStarted = false;
  if (mNetworkLocationProvider) {
    mNetworkLocationProvider->Shutdown();
    mNetworkLocationProvider = nullptr;
  }
  if (mGpsLocationProvider) {
    mGpsLocationProvider->Shutdown();
    mGpsLocationProvider = nullptr;
  }

  return NS_OK;
}

NS_IMETHODIMP
KaiGeolocationProvider::SetHighAccuracy(bool highAccuracy)
{
  if (mGpsLocationProvider) {
    mGpsLocationProvider->SetHighAccuracy(highAccuracy);
  }
  return NS_OK;
}

void
KaiGeolocationProvider::AcquireWakelockCallback()
{
}

void
KaiGeolocationProvider::ReleaseWakelockCallback()
{
}

nsCOMPtr<nsIDOMGeoPosition>
KaiGeolocationProvider::FindProperNetworkPos()
{
  if (!mLastQcPosition) {
    return mLastNetworkPosition;
  }

  if (!mLastNetworkPosition) {
    return mLastQcPosition;
  }

  DOMTimeStamp time_ms = 0;
  if (mLastQcPosition) {
    mLastQcPosition->GetTimestamp(&time_ms);
  }
  const int64_t qc_diff_ms = (PR_Now() / PR_USEC_PER_MSEC) - time_ms;

  time_ms = 0;
  if (mLastNetworkPosition) {
    mLastNetworkPosition->GetTimestamp(&time_ms);
  }
  const int64_t network_diff_ms = (PR_Now() / PR_USEC_PER_MSEC) - time_ms;

  const int kMaxTrustTimeDiff = 10000; // 10,000ms

  if (qc_diff_ms < kMaxTrustTimeDiff &&
      network_diff_ms > kMaxTrustTimeDiff) {
    return mLastQcPosition;
  } else if (qc_diff_ms > kMaxTrustTimeDiff &&
             network_diff_ms < kMaxTrustTimeDiff) {
    return mLastNetworkPosition;
  }

  nsCOMPtr<nsIDOMGeoPositionCoords> coords;
  mLastQcPosition->GetCoords(getter_AddRefs(coords));
  if (!coords) {
    return mLastNetworkPosition;
  }
  double qc_acc;
  coords->GetAccuracy(&qc_acc);

  mLastNetworkPosition->GetCoords(getter_AddRefs(coords));
  if (!coords) {
    return mLastQcPosition;
  }
  double network_acc;
  coords->GetAccuracy(&network_acc);

  return qc_acc < network_acc ? mLastQcPosition : mLastNetworkPosition;
}

#ifdef MOZ_B2G_RIL
class RequestWiFiAndCellInfoEvent : public nsRunnable {
  public:
    RequestWiFiAndCellInfoEvent(StumblerInfo *callback)
      : mRequestCallback(callback)
      {}

    NS_IMETHOD Run() {
      MOZ_ASSERT(NS_IsMainThread());

      // TODO: Request for neighboring cells information here.
      //       See Bug 6369 for the details.

      // Set the expected count to 0 since nsIMobileConnection.GetCellInfoList()
      // isn't supported by HAL
      mRequestCallback->SetCellInfoResponsesExpected(0);

      // Get Wifi AP Info
      nsCOMPtr<nsIInterfaceRequestor> ir = do_GetService("@mozilla.org/telephony/system-worker-manager;1");
      nsCOMPtr<nsIWifi> wifi = do_GetInterface(ir);
      if (!wifi) {
        mRequestCallback->SetWifiInfoResponseReceived();
        LOG("Stumbler: can not get nsIWifi interface");
        return NS_OK;
      }
      wifi->GetWifiScanResults(mRequestCallback);
      return NS_OK;
    }
  private:
    RefPtr<StumblerInfo> mRequestCallback;
};
#endif

NS_IMPL_ISUPPORTS(KaiGeolocationProvider::NetworkLocationUpdate,
                  nsIGeolocationUpdate)

NS_IMETHODIMP
KaiGeolocationProvider::NetworkLocationUpdate::Update(nsIDOMGeoPosition *position)
{
  if (!position) {
    return NS_ERROR_FAILURE;
  }
  RefPtr<KaiGeolocationProvider> provider =
    KaiGeolocationProvider::GetSingleton();

  nsCOMPtr<nsIDOMGeoPositionCoords> coords;
  position->GetCoords(getter_AddRefs(coords));
  if (!coords) {
    return NS_ERROR_FAILURE;
  }

  double lat, lon, acc;
  coords->GetLatitude(&lat);
  coords->GetLongitude(&lon);
  coords->GetAccuracy(&acc);

  double delta = -1.0;

  static double sLastNetworkPosLat = 0;
  static double sLastNetworkPosLon = 0;

  if (0 != sLastNetworkPosLon || 0 != sLastNetworkPosLat) {
    // Use spherical law of cosines to calculate difference
    // Not quite as correct as the Haversine but simpler and cheaper
    // Should the following be a utility function? Others might need this calc.
    const double radsInDeg = M_PI / 180.0;
    const double rNewLat = lat * radsInDeg;
    const double rNewLon = lon * radsInDeg;
    const double rOldLat = sLastNetworkPosLat * radsInDeg;
    const double rOldLon = sLastNetworkPosLon * radsInDeg;
    // WGS84 equatorial radius of earth = 6378137m
    double cosDelta = (sin(rNewLat) * sin(rOldLat)) +
                      (cos(rNewLat) * cos(rOldLat) * cos(rOldLon - rNewLon));
    if (cosDelta > 1.0) {
      cosDelta = 1.0;
    } else if (cosDelta < -1.0) {
      cosDelta = -1.0;
    }
    delta = acos(cosDelta) * 6378137;
  }

  sLastNetworkPosLat = lat;
  sLastNetworkPosLon = lon;

  // if the coord change is smaller than this arbitrarily small value
  // assume the coord is unchanged, and stick with the GPS location
  const double kMinCoordChangeInMeters = 10;

  DOMTimeStamp time_ms = 0;
  if (provider->mLastGPSPosition) {
    provider->mLastGPSPosition->GetTimestamp(&time_ms);
  }
  const int64_t diff_ms = (PR_Now() / PR_USEC_PER_MSEC) - time_ms;

  // We want to distinguish between the GPS being inactive completely
  // and temporarily inactive. In the former case, we would use a low
  // accuracy network location; in the latter, we only want a network
  // location that appears to updating with movement.

  const bool isGPSFullyInactive = diff_ms > 1000 * 60 * 2; // two mins
  const bool isGPSTempInactive = diff_ms > 1000 * 10; // 10 secs

  provider->mLastNetworkPosition = position;

  if (provider->mLocationCallback) {
    if (isGPSFullyInactive ||
       (isGPSTempInactive && delta > kMinCoordChangeInMeters))
    {
      if (gDebug_isLoggingEnabled) {
        DBG("geo: Using network location, GPS age:%fs, network Delta:%fm",
          diff_ms / 1000.0, delta);
      }

      provider->mLocationCallback->Update(provider->FindProperNetworkPos());
    } else if (provider->mLastGPSPosition) {
      if (gDebug_isLoggingEnabled) {
        DBG("geo: Using old GPS age:%fs", diff_ms / 1000.0);
      }

      // This is a fallback case so that the GPS provider responds with its last
      // location rather than waiting for a more recent GPS or network location.
      // The service decides if the location is too old, not the provider.
      provider->mLocationCallback->Update(provider->mLastGPSPosition);
    }
  }

  return NS_OK;
}

NS_IMETHODIMP
KaiGeolocationProvider::NetworkLocationUpdate::NotifyError(uint16_t error)
{
  return NS_OK;
}


NS_IMPL_ISUPPORTS(KaiGeolocationProvider::GpsLocationUpdate,
                  nsIGeolocationUpdate)

NS_IMETHODIMP
KaiGeolocationProvider::GpsLocationUpdate::Update(nsIDOMGeoPosition *position)
{
  RefPtr<KaiGeolocationProvider> provider =
    KaiGeolocationProvider::GetSingleton();

  nsCOMPtr<nsIDOMGeoPositionCoords> coords;
  position->GetCoords(getter_AddRefs(coords));
  if (!coords) {
    return NS_ERROR_FAILURE;
  }

  double lat, lon, acc;
  coords->GetLatitude(&lat);
  coords->GetLongitude(&lon);
  coords->GetAccuracy(&acc);

  const double kGpsAccuracyInMeters = 40.000; // meter

  if (acc <= kGpsAccuracyInMeters) {
    provider->mLastGPSPosition = position;

    if (provider->mLocationCallback) {
      provider->mLocationCallback->Update(position);
    }
  } else {
    provider->mLastQcPosition = position;

    if (provider->mLocationCallback) {
      provider->mLocationCallback->Update(provider->FindProperNetworkPos());
    }
  }

#ifdef MOZ_B2G_RIL
  // Note above: Can't use location->timestamp as the time from the satellite is a
  // minimum of 16 secs old (see http://leapsecond.com/java/gpsclock.htm).
  // All code from this point on expects the gps location to be timestamped with the
  // current time, most notably: the geolocation service which respects maximumAge
  // set in the DOM JS.
  RefPtr<nsGeoPosition> somewhere = new nsGeoPosition(coords, PR_Now() / PR_USEC_PER_MSEC);

  const double kMinChangeInMeters = 30.0;
  static int64_t lastTime_ms = 0;
  static double sLastLat = 0.0;
  static double sLastLon = 0.0;
  double delta = -1.0;
  int64_t timediff = (PR_Now() / PR_USEC_PER_MSEC) - lastTime_ms;

  if (0 != sLastLon || 0 != sLastLat) {
    delta = CalculateDeltaInMeter(lat, lon, sLastLat, sLastLon);
  }
  if (gDebug_isLoggingEnabled) {
    DBG("Stumbler: Location. [%f , %f] time_diff:%lld, delta : %f",
      lon, lat, timediff, delta);
  }

  // Consecutive GPS locations must be 30 meters and 3 seconds apart
  if (lastTime_ms == 0 || ((timediff >= STUMBLE_INTERVAL_MS) && (delta > kMinChangeInMeters))) {
    lastTime_ms = (PR_Now() / PR_USEC_PER_MSEC);
    sLastLat = lat;
    sLastLon = lon;
    RefPtr<StumblerInfo> requestCallback = new StumblerInfo(somewhere);
    RefPtr<RequestWiFiAndCellInfoEvent> runnable = new RequestWiFiAndCellInfoEvent(requestCallback);
    NS_DispatchToMainThread(runnable);
  } else {
    if (gDebug_isLoggingEnabled) {
      DBG("Stumbler: GPS locations less than 30 meters and 3 seconds. Ignore!");
    }
  }
#endif

  return NS_OK;
}

NS_IMETHODIMP
KaiGeolocationProvider::GpsLocationUpdate::NotifyError(uint16_t error)
{
  return NS_OK;
}

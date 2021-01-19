/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * http://www.w3.org/TR/geolocation-API
 *
 * Copyright © 2012 W3C® (MIT, ERCIM, Keio), All Rights Reserved. W3C
 * liability, trademark and document use rules apply.
 */

dictionary PositionOptions {
  boolean enableHighAccuracy = false;
  [Clamp] unsigned long timeout = 0xffffffff;
  [Clamp] unsigned long maximumAge = 0;
#if defined(MOZ_WIDGET_GONK) && !defined(KAI_GEOLOC)
  // Delete  specified aiding data for GPS testing
  // 0xFFFF is passed for a cold start.
  // 0x0001 is passed for a warm start.
  // The gpsMode can only be used by the app with "mmi-test" permission.
  [Clamp] unsigned short gpsMode = 0;
#endif

};

[NoInterfaceObject]
interface Geolocation {
  [Throws]
  void getCurrentPosition(PositionCallback successCallback,
                          optional PositionErrorCallback? errorCallback = null,
                          optional PositionOptions options);

  [Throws]
  long watchPosition(PositionCallback successCallback,
                     optional PositionErrorCallback? errorCallback = null,
                     optional PositionOptions options);

  void clearWatch(long watchId);

#ifdef HAS_KOOST_MODULES
  // [Non-standard], an interface for monitoring status of Global Navigation Satellite System
  [Pref="geo.gnssMonitor.enabled"]
  readonly attribute GnssMonitor? gnss;
#endif
};

callback PositionCallback = void (Position position);

callback PositionErrorCallback = void (PositionError positionError);

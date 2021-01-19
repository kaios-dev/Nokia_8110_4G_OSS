/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * SlideMnager reports the current flip status, and dispatch a flipchange event
 * when device has flip opened or closed.
 */
[Pref="dom.slide.enabled", CheckAnyPermissions="slide", AvailableIn=CertifiedApps]
interface SlideManager : EventTarget {
    readonly attribute long CurrentSlideStatus;
    readonly attribute long LastSlideStatus;

    attribute EventHandler onslidechange;
};

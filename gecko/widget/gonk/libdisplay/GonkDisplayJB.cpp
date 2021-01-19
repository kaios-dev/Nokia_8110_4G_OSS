/* Copyright 2013 Mozilla Foundation and Mozilla contributors
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

#include "GonkDisplayJB.h"
#if ANDROID_VERSION == 17
#include <gui/SurfaceTextureClient.h>
#else
#include <gui/Surface.h>
#include <gui/GraphicBufferAlloc.h>
#endif

#include <hardware/hardware.h>
#include <hardware/hwcomposer.h>
#include <hardware/power.h>
#include <suspend/autosuspend.h>

#include "cutils/properties.h"
#if ANDROID_VERSION >= 19
#include "VirtualDisplaySurface.h"
#endif
#include "FramebufferSurface.h"
#if ANDROID_VERSION == 17
#include "GraphicBufferAlloc.h"
#endif
#include "mozilla/Assertions.h"

#include "utils/Log.h"

#define DEFAULT_XDPI 75.0
// This define should be passed from gonk-misc and depends on device config.
// #define GET_FRAMEBUFFER_FORMAT_FROM_HWC

using namespace android;

namespace mozilla {

static GonkDisplayJB* sGonkDisplay = nullptr;

GonkDisplayJB::GonkDisplayJB()
    : mModule(nullptr)
    , mFBModule(nullptr)
    , mHwc(nullptr)
    , mFBDevice(nullptr)
    , mExtFBDevice(nullptr)
    , mPowerModule(nullptr)
    , mList(nullptr)
    , mEnabledCallback(nullptr)
    , mFBEnabled(true) // Initial value should sync with hal::GetScreenEnabled()
    , mExtFBEnabled(true) // Initial value should sync with hal::GetExtScreenEnabled()
{
    int err = hw_get_module(GRALLOC_HARDWARE_MODULE_ID, &mFBModule);
    ALOGW_IF(err, "%s module not found", GRALLOC_HARDWARE_MODULE_ID);
    if (!err) {
        err = framebuffer_open(mFBModule, &mFBDevice);
        ALOGW_IF(err, "could not open framebuffer");
    }

    DisplayNativeData &dispData = mDispNativeData[DISPLAY_PRIMARY];
    if (!err && mFBDevice) {
        dispData.mWidth = mFBDevice->width;
        dispData.mHeight = mFBDevice->height;
        dispData.mXdpi = mFBDevice->xdpi;
        /* The emulator actually reports RGBA_8888, but EGL doesn't return
         * any matching configuration. We force RGBX here to fix it. */
        dispData.mSurfaceformat = HAL_PIXEL_FORMAT_RGBX_8888;
    }

    err = hw_get_module(HWC_HARDWARE_MODULE_ID, &mModule);
    ALOGW_IF(err, "%s module not found", HWC_HARDWARE_MODULE_ID);
    if (!err) {
        err = hwc_open_1(mModule, &mHwc);
        ALOGE_IF(err, "%s device failed to initialize (%s)",
                 HWC_HARDWARE_COMPOSER, strerror(-err));
    }

    /* Fallback on the FB rendering path instead of trying to support HWC 1.0 */
    if (!err && mHwc->common.version == HWC_DEVICE_API_VERSION_1_0) {
        hwc_close_1(mHwc);
        mHwc = nullptr;
    }

    if (!err && mHwc) {
        if (mFBDevice) {
            framebuffer_close(mFBDevice);
            mFBDevice = nullptr;
        }

        int32_t values[4];
        const uint32_t attrs[] = {
            HWC_DISPLAY_WIDTH,
            HWC_DISPLAY_HEIGHT,
            HWC_DISPLAY_DPI_X,
#ifdef GET_FRAMEBUFFER_FORMAT_FROM_HWC
            HWC_DISPLAY_FBFORMAT,
#endif
            HWC_DISPLAY_NO_ATTRIBUTE
        };
        mHwc->getDisplayAttributes(mHwc, 0, 0, attrs, values);

        dispData.mWidth = values[0];
        dispData.mHeight = values[1];
        dispData.mXdpi = values[2] / 1000.0f;
#ifdef GET_FRAMEBUFFER_FORMAT_FROM_HWC
        dispData.mSurfaceformat = values[3];
#else
        dispData.mSurfaceformat = HAL_PIXEL_FORMAT_RGBA_8888;
#endif
    }

    err = hw_get_module(POWER_HARDWARE_MODULE_ID,
                        (hw_module_t const**)&mPowerModule);
    if (!err)
        mPowerModule->init(mPowerModule);
    ALOGW_IF(err, "Couldn't load %s module (%s)", POWER_HARDWARE_MODULE_ID, strerror(-err));

    mAlloc = new GraphicBufferAlloc();

    CreateFramebufferSurface(mSTClient,
                             mDispSurface,
                             dispData.mWidth,
                             dispData.mHeight,
                             dispData.mSurfaceformat);

    mList = (hwc_display_contents_1_t *)calloc(1, sizeof(*mList) + (sizeof(hwc_layer_1_t)*2));

    uint32_t usage = GRALLOC_USAGE_HW_FB | GRALLOC_USAGE_HW_RENDER | GRALLOC_USAGE_HW_COMPOSER;

    if (mHwc) {
        PowerOnDisplay(HWC_DISPLAY_PRIMARY);
        CreateFramebufferSurface(mBootAnimSTClient,
                                 mBootAnimDispSurface,
                                 dispData.mWidth,
                                 dispData.mHeight,
                                 dispData.mSurfaceformat);
    } else if (mFBDevice) {
        // If display uses fb, they can not use single buffer for boot animation
        mSTClient->perform(mSTClient.get(), NATIVE_WINDOW_SET_BUFFER_COUNT, 2);
        mSTClient->perform(mSTClient.get(), NATIVE_WINDOW_SET_USAGE, usage);
    }

    // Set this prop to turn on native framebuffer support for fb1,
    // such as external screen of flip phone.
    // ro.h5.display.fb1_backlightdev=__full_backlight_device_path__
    //
    // ex: Octans will set this prop in device/t2m/octans/octans.mk
    DisplayNativeData &extDispData = mDispNativeData[DISPLAY_EXTERNAL];
    mExtFBDevice = NativeFramebufferDevice::Create();

    if (mExtFBDevice) {
        if (mExtFBDevice->Open()) {
            extDispData.mWidth = mExtFBDevice->mWidth;
            extDispData.mHeight = mExtFBDevice->mHeight;
            extDispData.mSurfaceformat = mExtFBDevice->mSurfaceformat;
            extDispData.mXdpi = mExtFBDevice->mXdpi;

            mExtFBDevice->EnableScreen(true);
            CreateFramebufferSurface(mExtSTClient,
                                     mExtDispSurface,
                                     extDispData.mWidth,
                                     extDispData.mHeight,
                                     extDispData.mSurfaceformat);
            mExtSTClient->perform(mExtSTClient.get(), NATIVE_WINDOW_SET_BUFFER_COUNT, 2);
            mExtSTClient->perform(mExtSTClient.get(), NATIVE_WINDOW_SET_USAGE, usage);
        } else {
            delete mExtFBDevice;
            mExtFBDevice = nullptr;
        }
    }

    if (!mExtFBDevice) {
        // Set mExtFBEnabled to false if no support externl screen.
        mExtFBEnabled = false;
    }
}

GonkDisplayJB::~GonkDisplayJB()
{
    if (mHwc)
        hwc_close_1(mHwc);
    if (mFBDevice)
        framebuffer_close(mFBDevice);
    if (mExtFBDevice)
        delete mExtFBDevice;
    free(mList);
}

void
GonkDisplayJB::CreateFramebufferSurface(android::sp<ANativeWindow>& aNativeWindow,
                                        android::sp<android::DisplaySurface>& aDisplaySurface,
                                        uint32_t aWidth, uint32_t aHeight, int32_t aFormat)
{
#if ANDROID_VERSION >= 21
    sp<IGraphicBufferProducer> producer;
    sp<IGraphicBufferConsumer> consumer;
    BufferQueue::createBufferQueue(&producer, &consumer, mAlloc);
#elif ANDROID_VERSION >= 19
    sp<BufferQueue> consumer = new BufferQueue(mAlloc);
    sp<IGraphicBufferProducer> producer = consumer;
#elif ANDROID_VERSION >= 18
    sp<BufferQueue> consumer = new BufferQueue(true, mAlloc);
    sp<IGraphicBufferProducer> producer = consumer;
#else
    sp<BufferQueue> consumer = new BufferQueue(true, mAlloc);
#endif

    aDisplaySurface = new FramebufferSurface(0, aWidth, aHeight, aFormat, consumer);

#if ANDROID_VERSION == 17
    aNativeWindow = new SurfaceTextureClient(
        static_cast<sp<ISurfaceTexture>>(aDisplaySurface->getBufferQueue()));
#else
    aNativeWindow = new Surface(producer);
#endif
}

void
GonkDisplayJB::CreateVirtualDisplaySurface(android::IGraphicBufferProducer* aSink,
                                           android::sp<ANativeWindow>& aNativeWindow,
                                           android::sp<android::DisplaySurface>& aDisplaySurface)
{
#if ANDROID_VERSION >= 21
    sp<IGraphicBufferProducer> producer;
    sp<IGraphicBufferConsumer> consumer;
    BufferQueue::createBufferQueue(&producer, &consumer, mAlloc);
#elif ANDROID_VERSION >= 19
    sp<BufferQueue> consumer = new BufferQueue(mAlloc);
    sp<IGraphicBufferProducer> producer = consumer;
#endif
/* FIXME: bug 4036, fix the build error in libdisplay
#if ANDROID_VERSION >= 19
    sp<VirtualDisplaySurface> virtualDisplay;
    virtualDisplay = new VirtualDisplaySurface(-1, aSink, producer, consumer, String8("VirtualDisplaySurface"));
    aDisplaySurface = virtualDisplay;
    aNativeWindow = new Surface(virtualDisplay);
#endif*/
}

void
GonkDisplayJB::SetEnabled(bool enabled)
{
    ALOGI("kaioseiffel GonkDisplayJB SetEnabled");
    if (enabled) {
        autosuspend_disable();
        mPowerModule->setInteractive(mPowerModule, true);
    }

    if (!enabled && mEnabledCallback) {
        mEnabledCallback(enabled);
    }

#if ANDROID_VERSION >= 21
    if (mHwc) {
        if (mHwc->common.version >= HWC_DEVICE_API_VERSION_1_4) {
            mHwc->setPowerMode(mHwc, HWC_DISPLAY_PRIMARY,
                (enabled ? HWC_POWER_MODE_NORMAL : HWC_POWER_MODE_OFF));
        } else {
            mHwc->blank(mHwc, HWC_DISPLAY_PRIMARY, !enabled);
        }
    } else if (mFBDevice && mFBDevice->enableScreen) {
        mFBDevice->enableScreen(mFBDevice, enabled);
    }
#else
    if (mHwc && mHwc->blank) {
        mHwc->blank(mHwc, HWC_DISPLAY_PRIMARY, !enabled);
    } else if (mFBDevice && mFBDevice->enableScreen) {
        mFBDevice->enableScreen(mFBDevice, enabled);
    }
#endif
    mFBEnabled = enabled;

    if (enabled && mEnabledCallback) {
        mEnabledCallback(enabled);
    }

    if (!enabled && !mExtFBEnabled) {
        //Task-5556852 Modified-BEGIN by ganghongliu@t2mobile.com 2017.11.7
        char prop[PROPERTY_VALUE_MAX];
        property_get("kaioscallingstatus", prop, "0");
        ALOGI("kaioseiffel GonkDisplayJB : %s", prop);

        if (!strcmp(prop, "0")) {//prop==0--->call off, prop==1--->calling
            ALOGI("kaioseiffel GonkDisplayJB call off state");
            autosuspend_enable(); //go to deep sleep
        }
        //Task-5556852 Modified-END 2017.11.7
        mPowerModule->setInteractive(mPowerModule, false);
    }
}

int GonkDisplayJB::TryLockScreen()
{
    int ret = mPrimaryScreenLock.tryLock();
}

void GonkDisplayJB::UnlockScreen()
{
    mPrimaryScreenLock.unlock();
}

void
GonkDisplayJB::SetExtEnabled(bool enabled)
{
    if (!mExtFBDevice) {
        return;
    }
    if (enabled) {
        autosuspend_disable();
        mPowerModule->setInteractive(mPowerModule, true);
    }

    mExtFBDevice->EnableScreen(enabled);
    mExtFBEnabled = enabled;

    if (!enabled && !mFBEnabled) {
        autosuspend_enable();
        mPowerModule->setInteractive(mPowerModule, false);
    }
}

void
GonkDisplayJB::OnEnabled(OnEnabledCallbackType callback)
{
    mEnabledCallback = callback;
}

void*
GonkDisplayJB::GetHWCDevice()
{
    return mHwc;
}

bool
GonkDisplayJB::IsExtFBDeviceEnabled()
{
    return !!mExtFBDevice;
}

bool
GonkDisplayJB::SwapBuffers(DisplayType aDisplayType)
{
    if (aDisplayType == DISPLAY_PRIMARY) {
        // Should be called when composition rendering is complete for a frame.
        // Only HWC v1.0 needs this call.
        // HWC > v1.0 case, do not call compositionComplete().
        // mFBDevice is present only when HWC is v1.0.
        if (mFBDevice && mFBDevice->compositionComplete) {
            mFBDevice->compositionComplete(mFBDevice);
        }
        return Post(mDispSurface->lastHandle,
                    mDispSurface->GetPrevDispAcquireFd(),
                    DISPLAY_PRIMARY);

    } else if (aDisplayType == DISPLAY_EXTERNAL) {
        if (mExtFBDevice) {
            return Post(mExtDispSurface->lastHandle,
                        mExtDispSurface->GetPrevDispAcquireFd(),
                        DISPLAY_EXTERNAL);
        }

        return false;
    }

    return false;
}

bool
GonkDisplayJB::Post(buffer_handle_t buf, int fence, DisplayType aDisplayType)
{
    if (aDisplayType == DISPLAY_PRIMARY) {
        if (!mHwc) {
            if (fence >= 0) {
                android::sp<Fence> fenceObj = new Fence(fence);
                fenceObj->waitForever("GonkDisplayJB::Post");
            }
            return !mFBDevice->post(mFBDevice, buf);
        }

        DisplayNativeData &dispData = mDispNativeData[DISPLAY_PRIMARY];

        hwc_display_contents_1_t *displays[HWC_NUM_DISPLAY_TYPES] = {NULL};
        const hwc_rect_t r = { 0, 0, static_cast<int>(dispData.mWidth), static_cast<int>(dispData.mHeight) };
        displays[HWC_DISPLAY_PRIMARY] = mList;
        mList->retireFenceFd = -1;
        mList->numHwLayers = 2;
        mList->flags = HWC_GEOMETRY_CHANGED;
#if ANDROID_VERSION >= 18
        mList->outbuf = nullptr;
        mList->outbufAcquireFenceFd = -1;
#endif
        mList->hwLayers[0].compositionType = HWC_FRAMEBUFFER;
        mList->hwLayers[0].hints = 0;
        /* Skip this layer so the hwc module doesn't complain about null handles */
        mList->hwLayers[0].flags = HWC_SKIP_LAYER;
        mList->hwLayers[0].backgroundColor = {0};
        mList->hwLayers[0].acquireFenceFd = -1;
        mList->hwLayers[0].releaseFenceFd = -1;
        /* hwc module checks displayFrame even though it shouldn't */
        mList->hwLayers[0].displayFrame = r;
        mList->hwLayers[1].compositionType = HWC_FRAMEBUFFER_TARGET;
        mList->hwLayers[1].hints = 0;
        mList->hwLayers[1].flags = 0;
        mList->hwLayers[1].handle = buf;
        mList->hwLayers[1].transform = 0;
        mList->hwLayers[1].blending = HWC_BLENDING_NONE;
#if ANDROID_VERSION >= 19
        if (mHwc->common.version >= HWC_DEVICE_API_VERSION_1_3) {
            mList->hwLayers[1].sourceCropf.left = 0;
            mList->hwLayers[1].sourceCropf.top = 0;
            mList->hwLayers[1].sourceCropf.right = dispData.mWidth;
            mList->hwLayers[1].sourceCropf.bottom = dispData.mHeight;
        } else {
            mList->hwLayers[1].sourceCrop = r;
        }
#else
        mList->hwLayers[1].sourceCrop = r;
#endif
        mList->hwLayers[1].displayFrame = r;
        mList->hwLayers[1].visibleRegionScreen.numRects = 1;
        mList->hwLayers[1].visibleRegionScreen.rects = &mList->hwLayers[1].displayFrame;
        mList->hwLayers[1].acquireFenceFd = fence;
        mList->hwLayers[1].releaseFenceFd = -1;
#if ANDROID_VERSION >= 18
        mList->hwLayers[1].planeAlpha = 0xFF;
#endif
        mHwc->prepare(mHwc, HWC_NUM_DISPLAY_TYPES, displays);
        int err = mHwc->set(mHwc, HWC_NUM_DISPLAY_TYPES, displays);
        if (!mBootAnimDispSurface.get()) {
            mDispSurface->setReleaseFenceFd(mList->hwLayers[1].releaseFenceFd);
        } else {
            mBootAnimDispSurface->setReleaseFenceFd(mList->hwLayers[1].releaseFenceFd);
        }

      if (mList->retireFenceFd >= 0)
          close(mList->retireFenceFd);
      return !err;

    } else if (aDisplayType == DISPLAY_EXTERNAL) {
        // Only support fb1 for certain device, use hwc to control
        // external screen in general case.
        if (mExtFBDevice) {
            if (fence >= 0) {
                android::sp<Fence> fenceObj = new Fence(fence);
                fenceObj->waitForever("GonkDisplayJB::Post");
            }
            return mExtFBDevice->Post(buf);
        }

        return false;
    }

    return false;
}

ANativeWindowBuffer*
GonkDisplayJB::DequeueBuffer(DisplayType aDisplayType)
{
    // Check for bootAnim or normal display flow.
    sp<ANativeWindow> nativeWindow;
    if (aDisplayType == DISPLAY_PRIMARY) {
        nativeWindow =
            !mBootAnimSTClient.get() ? mSTClient : mBootAnimSTClient;
    } else if (aDisplayType == DISPLAY_EXTERNAL) {
        if (mExtFBDevice) {
            nativeWindow = mExtSTClient;
        }
    }

    if (!nativeWindow.get()) {
        return nullptr;
    }

    ANativeWindowBuffer *buf;
    int fenceFd = -1;
    nativeWindow->dequeueBuffer(nativeWindow.get(), &buf, &fenceFd);
    sp<Fence> fence(new Fence(fenceFd));
#if ANDROID_VERSION == 17
    fence->waitForever(1000, "GonkDisplayJB_DequeueBuffer");
    // 1000 is what Android uses. It is a warning timeout in ms.
    // This timeout was removed in ANDROID_VERSION 18.
#else
    fence->waitForever("GonkDisplayJB_DequeueBuffer");
#endif
    return buf;
}

bool
GonkDisplayJB::QueueBuffer(ANativeWindowBuffer* buf, DisplayType aDisplayType)
{
    bool success = false;
    int error = DoQueueBuffer(buf, aDisplayType);

    sp<DisplaySurface> displaySurface;
    if (aDisplayType == DISPLAY_PRIMARY) {
        displaySurface =
            !mBootAnimSTClient.get() ? mDispSurface : mBootAnimDispSurface;
    } else if (aDisplayType == DISPLAY_EXTERNAL) {
        if (mExtFBDevice) {
            displaySurface = mExtDispSurface;
        }
    }

    if (!displaySurface.get()) {
        return false;
    }

    success = Post(displaySurface->lastHandle,
                   displaySurface->GetPrevDispAcquireFd(),
                   aDisplayType);

    return error == 0 && success;
}

int
GonkDisplayJB::DoQueueBuffer(ANativeWindowBuffer* buf, DisplayType aDisplayType)
{
    int error = 0;
    sp<ANativeWindow> nativeWindow;
    if (aDisplayType == DISPLAY_PRIMARY) {
        nativeWindow =
            !mBootAnimSTClient.get() ? mSTClient : mBootAnimSTClient;
    } else if (aDisplayType == DISPLAY_EXTERNAL) {
        if (mExtFBDevice) {
            nativeWindow = mExtSTClient;
        }
    }

    if (!nativeWindow.get()) {
        return error;
    }

    error = mSTClient->queueBuffer(nativeWindow.get(), buf, -1);

    return error;
}

void
GonkDisplayJB::UpdateDispSurface(EGLDisplay dpy, EGLSurface sur)
{
    if (sur != EGL_NO_SURFACE) {
      eglSwapBuffers(dpy, sur);
    } else {
      // When BasicCompositor is used as Compositor,
      // EGLSurface does not exit.
      ANativeWindowBuffer* buf = DequeueBuffer(DISPLAY_PRIMARY);
      DoQueueBuffer(buf, DISPLAY_PRIMARY);
    }
}

void
GonkDisplayJB::NotifyBootAnimationStopped()
{
    if (mBootAnimSTClient.get()) {
        mBootAnimSTClient = nullptr;
        mBootAnimDispSurface = nullptr;
    }
}

void
GonkDisplayJB::PowerOnDisplay(int aDpy)
{
    MOZ_ASSERT(mHwc);
#if ANDROID_VERSION >= 21
    if (mHwc->common.version >= HWC_DEVICE_API_VERSION_1_4) {
        mHwc->setPowerMode(mHwc, aDpy, HWC_POWER_MODE_NORMAL);
    } else {
        mHwc->blank(mHwc, aDpy, 0);
    }
#else
    mHwc->blank(mHwc, aDpy, 0);
#endif
}

GonkDisplay::NativeData
GonkDisplayJB::GetNativeData(GonkDisplay::DisplayType aDisplayType,
                             android::IGraphicBufferProducer* aSink)
{
    NativeData data;

    if (aDisplayType == DISPLAY_PRIMARY) {
        data.mNativeWindow = mSTClient;
        data.mDisplaySurface = mDispSurface;
        data.mXdpi = mDispNativeData[DISPLAY_PRIMARY].mXdpi;
        data.mComposer2DSupported = true;
        data.mVsyncSupported = true;
    } else if (aDisplayType == DISPLAY_EXTERNAL) {
        if (mExtFBDevice) {
            data.mNativeWindow = mExtSTClient;
            data.mDisplaySurface = mExtDispSurface;
            data.mXdpi = mDispNativeData[DISPLAY_EXTERNAL].mXdpi;
            data.mComposer2DSupported = false;
            data.mVsyncSupported = false;
        } else {
            int32_t values[3];
            const uint32_t attrs[] = {
                HWC_DISPLAY_WIDTH,
                HWC_DISPLAY_HEIGHT,
                HWC_DISPLAY_DPI_X,
                HWC_DISPLAY_NO_ATTRIBUTE
            };
            mHwc->getDisplayAttributes(mHwc, aDisplayType, 0, attrs, values);
            int width = values[0];
            int height = values[1];
            // FIXME!! values[2] returns 0 for external display, which doesn't
            // sound right, Bug 1169176 is the follow-up bug for this issue.
            data.mXdpi = values[2] ? values[2] / 1000.f : DEFAULT_XDPI;
            data.mComposer2DSupported = true;
            data.mVsyncSupported = false;
            PowerOnDisplay(HWC_DISPLAY_EXTERNAL);
            CreateFramebufferSurface(data.mNativeWindow,
                                     data.mDisplaySurface,
                                     width,
                                     height,
                                     mDispNativeData[DISPLAY_PRIMARY].mSurfaceformat);
        }
    } else if (aDisplayType == DISPLAY_VIRTUAL) {
        data.mXdpi = mDispNativeData[DISPLAY_PRIMARY].mXdpi;
        CreateVirtualDisplaySurface(aSink,
                                    data.mNativeWindow,
                                    data.mDisplaySurface);
    }

    return data;
}

__attribute__ ((visibility ("default")))
GonkDisplay*
GetGonkDisplay()
{
    if (!sGonkDisplay)
        sGonkDisplay = new GonkDisplayJB();
    return sGonkDisplay;
}

} // namespace mozilla

#
# Copyright © 2011 Intel Corporation
#
# Permission is hereby granted, free of charge, to any person obtaining a
# copy of this software and associated documentation files (the "Software"),
# to deal in the Software without restriction, including without limitation
# the rights to use, copy, modify, merge, publish, distribute, sublicense,
# and/or sell copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice (including the next
# paragraph) shall be included in all copies or substantial portions of the
# Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
# THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
# IN THE SOFTWARE.
#

LOCAL_PATH := $(call my-dir)
include $(CLEAR_VARS)

# Import variables LIBDRM_INTEL_FILES, LIBDRM_INTEL_H_FILES
include $(LOCAL_PATH)/Makefile.sources

LOCAL_MODULE := libdrm_intel
LOCAL_MODULE_TAGS := optional

LOCAL_SHARED_LIBRARIES := libdrm

LOCAL_SRC_FILES := $(LIBDRM_INTEL_FILES)
LOCAL_EXPORT_C_INCLUDE_DIRS += \
	$(LOCAL_PATH)/intel

LOCAL_C_INCLUDES := \
	$(LIBDRM_TOP) \
	$(LIBDRM_TOP)/intel \
	$(LIBDRM_TOP)/include/drm \
	external/libpciaccess/include

LOCAL_CFLAGS := \
	-DHAVE_LIBDRM_ATOMIC_PRIMITIVES=1

LOCAL_COPY_HEADERS := $(LIBDRM_INTEL_H_FILES)
LOCAL_COPY_HEADERS_TO := libdrm

LOCAL_SHARED_LIBRARIES := \
	libdrm \
	libpciaccess

include $(BUILD_SHARED_LIBRARY)

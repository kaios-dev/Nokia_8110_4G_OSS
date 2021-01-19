/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html
 *
 * Copyright © 2012 W3C® (MIT, ERCIM, Keio), All Rights Reserved. W3C
 * liability, trademark and document use rules apply.
 */

callback DecodeSuccessCallback = void (AudioBuffer decodedData);
callback DecodeErrorCallback = void ();

enum AudioContextState {
    "suspended",
    "running",
    "closed"
};

[Constructor,
 Constructor(AudioChannel audioChannelType)]
interface AudioContext : EventTarget {

    readonly attribute AudioDestinationNode destination;
    readonly attribute float sampleRate;
    readonly attribute double currentTime;
    readonly attribute AudioListener listener;
    readonly attribute AudioContextState state;
    [Throws]
    Promise<void> suspend();
    [Throws]
    Promise<void> resume();
    [Throws]
    Promise<void> close();
    attribute EventHandler onstatechange;

    [NewObject, Throws]
    AudioBuffer createBuffer(unsigned long numberOfChannels, unsigned long length, float sampleRate);

    [Throws]
    Promise<AudioBuffer> decodeAudioData(ArrayBuffer audioData,
                                         optional DecodeSuccessCallback successCallback,
                                         optional DecodeErrorCallback errorCallback);

    // AudioNode creation
    [NewObject, Throws]
    AudioBufferSourceNode createBufferSource();

    [NewObject, Throws]
    MediaStreamAudioDestinationNode createMediaStreamDestination();

    [NewObject, Throws]
    ScriptProcessorNode createScriptProcessor(optional unsigned long bufferSize = 0,
                                              optional unsigned long numberOfInputChannels = 2,
                                              optional unsigned long numberOfOutputChannels = 2);

    [NewObject, Throws]
    StereoPannerNode createStereoPanner();
    [NewObject, Throws]
    AnalyserNode createAnalyser();
    [NewObject, Throws, UnsafeInPrerendering]
    MediaElementAudioSourceNode createMediaElementSource(HTMLMediaElement mediaElement);
    [NewObject, Throws, UnsafeInPrerendering]
    MediaStreamAudioSourceNode createMediaStreamSource(MediaStream mediaStream);
    [NewObject, Throws]
    GainNode createGain();
    [NewObject, Throws]
    DelayNode createDelay(optional double maxDelayTime = 1);
    [NewObject, Throws]
    BiquadFilterNode createBiquadFilter();
    [NewObject, Throws]
    WaveShaperNode createWaveShaper();
    [NewObject, Throws]
    PannerNode createPanner();
    [NewObject, Throws]
    ConvolverNode createConvolver();

    [NewObject, Throws]
    ChannelSplitterNode createChannelSplitter(optional unsigned long numberOfOutputs = 6);
    [NewObject, Throws]
    ChannelMergerNode createChannelMerger(optional unsigned long numberOfInputs = 6);

    [NewObject, Throws]
    DynamicsCompressorNode createDynamicsCompressor();

    [NewObject, Throws]
    OscillatorNode createOscillator();
    [NewObject, Throws]
    PeriodicWave createPeriodicWave(Float32Array real, Float32Array imag);

    // see https://bugzilla.kaiostech.com/show_bug.cgi?id=10234#c2
    // Please call requestCleanAfterRelease before set AudioContext instance to null,
    // this ensures the underneath audio resources will be released quickly.
    // e.g.
    // context = new AudioContext('ringer');
    // context.requestCleanAfterRelease();
    // context = null;
    void requestCleanAfterRelease();

    // Force the underlying audio channel agent to start playing so the
    // channel can be grabbed immediately before audio data actually
    // reaches destination node. The audio channel will be released when
    // 1) audio data is finished, 2) suspend() is called or 3) close() is
    // called.
    // The caller who called this API should always call close() to make
    // sure the audio channel is released when this AudioContext is no
    // longer needed.
    void forceAudioChannelPlaying();
};

// Mozilla extensions
partial interface AudioContext {
  // Read AudioChannel.webidl for more information about this attribute.
  [Pref="media.useAudioChannelAPI"]
  readonly attribute AudioChannel mozAudioChannelType;

  // These 2 events are dispatched when the AudioContext object is muted by
  // the AudioChannelService. It's call 'interrupt' because when this event is
  // dispatched on a HTMLMediaElement, the audio stream is paused.
  [Pref="media.useAudioChannelAPI"]
  attribute EventHandler onmozinterruptbegin;

  [Pref="media.useAudioChannelAPI"]
  attribute EventHandler onmozinterruptend;

  // This method is for test only.
  [ChromeOnly] AudioChannel testAudioChannelInAudioNodeStream();
};

/* cxk add for provObj/coverageMap */
/* jshint esnext: true */
/* global dump, XPCOMUtils, cpmm, ppmm, Components, libcutils */

'use strict';

/* static functions */
const DEBUG = true;

function debug(aStr) {
  if (DEBUG)
    dump("IccOma.jsm: " + aStr + "\n");
}

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

this.EXPORTED_SYMBOLS = ['IccOmaJsm'];

XPCOMUtils.defineLazyGetter(this, "libcutils", function () {
  Cu.import("resource://gre/modules/systemlibs.js");
  return libcutils;
});

XPCOMUtils.defineLazyServiceGetter(this, "ppmm",
                                   "@mozilla.org/parentprocessmessagemanager;1",
                                   "nsIMessageListenerManager");

XPCOMUtils.defineLazyServiceGetter(this, "iccProvider",
                                   "@mozilla.org/ril/content-helper;1",
                                   "nsIIccProvider");

// TODO: Bug 1118099  - Add multi-sim support.
// In the Multi-sim, there is more than one client.
// For now, use default clientID as 0. Ideally, SE parent process would like to
// know which clients (uicc slot) are connected to CLF over SWP interface.
const PREFERRED_UICC_CLIENTID =
  libcutils.property_get("ro.moz.se.def_client_id", "0");

this.IccOmaJsm = {

  init: function init() {
    debug("init()");
    // Add the messages to be listened to.
    this._messages = ['IccSrv:IccOpenChannel',
      'IccSrv:TransmitAPDU',
      'IccSrv:IccCloseChannel',
      'IccSrv:TransmitWAPAPDU'
    ];
    this._messages.forEach((function(msgName) {
      ppmm.addMessageListener(msgName, this);
    }).bind(this));

    this._mm = null;
  },

  _doIccOpenChannel: function(aid) {
    let self = this;
    let OPEN_RESPONSE = 'IccSrv:IccOpenChannel:';
    iccProvider.iccOpenChannel(PREFERRED_UICC_CLIENTID, aid, {
      notifyOpenChannelSuccess: function(channel) {
        self._mm.sendAsyncMessage(OPEN_RESPONSE + 'OK', {channel: channel});
      },
      notifyError: function(errorMsg) {
        self._mm.sendAsyncMessage(OPEN_RESPONSE + 'KO', {errorMsg: errorMsg});
      }
    });
  },

  _doTransmitAPDU: function(channel, ins, p1, p2, p3, data) {
    let self = this;
    let TRANS_RESPONSE = 'IccSrv:TransmitAPDU:';
    iccProvider.iccExchangeAPDU(PREFERRED_UICC_CLIENTID, channel, channel,
      ins, p1, p2, p3, data, {
        //get sw1 sw2 here
        notifyExchangeAPDUResponse: function(sw1, sw2, simResponse) {
          self._mm.sendAsyncMessage(TRANS_RESPONSE + 'OK', {sw1: sw1, sw2: sw2, simResponse: simResponse});
        },
        notifyError: function(errorMsg) {
          self._mm.sendAsyncMessage(TRANS_RESPONSE + 'KO', {errorMsg: errorMsg});
        }
      });
  },

  _doTransmitWAPAPDU: function(channel, cla, ins, p1, p2, p3, data) {
    let self = this;
    let TRANS_RESPONSE = 'IccSrv:TransmitWAPAPDU:';
    iccProvider.iccExchangeAPDU(PREFERRED_UICC_CLIENTID, channel, cla,
      ins, p1, p2, p3, data, {
        //get sw1 sw2 here
        notifyExchangeAPDUResponse: function(sw1, sw2, simResponse) {
          self._mm.sendAsyncMessage(TRANS_RESPONSE + 'OK', {sw1: sw1, sw2: sw2, simResponse: simResponse});
        },
        notifyError: function(errorMsg) {
          self._mm.sendAsyncMessage(TRANS_RESPONSE + 'KO', {errorMsg: errorMsg});
        }
      });
  },

  _doIccCloseChannel: function(channel) {
    let self = this;
    iccProvider.iccCloseChannel(PREFERRED_UICC_CLIENTID, channel, {
      notifyCloseChannelSuccess: function() {
        self._mm.sendAsyncMessage('IccSrv:IccCloseChannel:Return', {success: 'success'});
      },
      notifyError: function(errorMsg) {
        self._mm.sendAsyncMessage('IccSrv:IccCloseChannel:Return', {errorMsg: errorMsg});
      }
    });
  },

  receiveMessage: function(aMessage) {
    debug('receiveMessage: ' + JSON.stringify(aMessage));
    this._mm = aMessage.target;
    if(!this._mm) {
      debug('cxk --------- target is null');
      return;
    }
    let msg = aMessage.data;

    switch (aMessage.name) {
      case 'IccSrv:IccOpenChannel':
        this._doIccOpenChannel(msg.aid);
        break;

      case 'IccSrv:TransmitAPDU':
        //msg: {channel: channel, ins: ins, p1: PARA_P1, p2: p2, p3: p3, data: data}
        this._doTransmitAPDU(msg.channel, msg.ins, msg.p1, msg.p2, msg.p3, msg.data);
        break;

      case 'IccSrv:TransmitWAPAPDU':
        this._doTransmitWAPAPDU(msg.channel, msg.cla, msg.ins, msg.p1, msg.p2, msg.p3, msg.data);
        break;

      case 'IccSrv:IccCloseChannel':
        this._doIccCloseChannel(msg.channel);
        break;

      default:
        debug('receiveMessage: Can not process the message ' + aMessage.name);
        break;
    }
  }
};

this.IccOmaJsm.init();

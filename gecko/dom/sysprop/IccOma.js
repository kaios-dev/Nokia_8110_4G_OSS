/* cxk add for provObj/coverageMap */
/* jshint esnext: true */
/* global dump, XPCOMUtils, cpmm, Components */

"use strict";

const VERBOSE = true;

function verbose(aStr) {
  if(VERBOSE)
    dump("IccOma.js verbose : " + aStr + "\n");
}

function debug(aStr) {
  dump("IccOma.js: " + aStr + "\n");
}

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import("resource://gre/modules/DOMRequestHelper.jsm");

const ICCOMAJS_CONTRACTID = "@tctoma.com/IccOmaJS;1";
const ICCOMAJS_CID        = Components.ID("{a179af98-c224-4402-bf7c-8ac213d0f150}");

XPCOMUtils.defineLazyServiceGetter(this, "cpmm",
  "@mozilla.org/childprocessmessagemanager;1",
  "nsISyncMessageSender");
XPCOMUtils.defineLazyServiceGetter(this, "mrm",
  "@mozilla.org/memory-reporter-manager;1",
  "nsIMemoryReporterManager");
// cxk add for DM-UICC-21/30
XPCOMUtils.defineLazyGetter(this, "MMS", function() {
  let MMS = {};
  Cu.import("resource://gre/modules/IccOmaWapPDU.jsm", MMS);
  return MMS;
});
// end
// cxk add for DM-UICC-05/22
XPCOMUtils.defineLazyServiceGetter(this, "gRil",
  "@mozilla.org/ril;1",
  "nsIRadioInterfaceLayer");
XPCOMUtils.defineLazyServiceGetter(this, "sysProp",
  "@jrdcom.com/JrdSysProp;1",
  "nsIJrdSysProp");
// end

// cxk add for result report
XPCOMUtils.defineLazyGetter(this, "libcutils", function () {
  Cu.import("resource://gre/modules/systemlibs.js");
  return libcutils;
});

const RESULT_OK            = 'ok';
const ERROR_TRANSMIT       = 'fail';
const ERROR_UNKNOWN        = 'fail';
const ICCID_NOT_MATCH        = 'noMatch';
const NO_CARD        = 'noCard';
// end

const MAX_DATA_LEN_ONCE        = 248;
const INS_START_TRANS        = 0XA1;
const INS_SEND_DATA        = 0XA2;
const INS_END_TRANS        = 0XA3;
const INS_WAP_907B         = 0XC2;
const CLA_WAP_907B         = 0X80;
const PARA_P1        = 0X00;

const kXpcomShutdownObserverTopic    = "xpcom-shutdown";
const WRITE_UICC_FINISH = "write-uicc-finish";
function IccOma () {
  debug("IccOma Constructor");
  this.init();
}

IccOma.prototype = {

  classID: ICCOMAJS_CID,

  /*compare RecoveryService.js,
   if this interface will be called by gaia, must add 'nsIDOMGlobalPropertyInitializer'proptery
   and implement init function, be check permissions otherwise 'Errortype:permission deny'
   */
  QueryInterface : XPCOMUtils.generateQI([Ci.nsIDOMIccOma,
    Ci.nsIDOMGlobalPropertyInitializer,
    Ci.nsISupportsWeakReference]),

  classInfo : XPCOMUtils.generateCI({ classID: ICCOMAJS_CID,
    contractID: ICCOMAJS_CONTRACTID,
    classDescription: "IccOmaJS",
    interfaces: [Ci.nsIDOMIccOma],
    flags: Ci.nsIClassInfo.DOM_OBJECT}),

  init: function() {
    debug("iccOma -------------- init");
    Services.obs.addObserver(this, kXpcomShutdownObserverTopic, false);
    mrm.registerStrongReporter(this);

    let msgs =   ['IccSrv:IccOpenChannel:OK',
      'IccSrv:IccOpenChannel:KO',
      'IccSrv:TransmitAPDU:OK',
      'IccSrv:TransmitAPDU:KO',
      'IccSrv:TransmitWAPAPDU:OK',
      'IccSrv:TransmitWAPAPDU:KO',
      'IccSrv:IccCloseChannel:Return'
    ];

    for (let msg in msgs) {
      cpmm.addMessageListener(msgs[msg], this);
    }

    this._resetGloble(); //delete for reentry
  },

  uninit: function() {
    debug("iccOma uninit");
    Services.obs.removeObserver(this, kXpcomShutdownObserverTopic);
    mrm.unregisterStrongReporter(this);
  },

  observe: function(aSubject, aTopic, aData) {
    debug("observe: " + aTopic);
    if (aTopic === kXpcomShutdownObserverTopic) {
      this.uninit();
    }
  },

  _resetGloble: function() {
    verbose('cxk _resetGloble');
    this._now = 0;
    this._mCount = 0;
    this._data = [];
    this._dataHex = [];
    this._channel = -1;
  },

  _decode: function(data) {
    //to change if any error
    return atob(data);
  },

  _stringToHex:function(str){
    let val="";
    for(let i = 0; i < str.length; i++){
      let hex;
      hex = (str.charCodeAt(i) & 0xff).toString(16);
      hex = (hex.length === 1) ? '0' + hex : hex;
      val += hex;
    }
    return val;
  },

  _statusWordToHex:function(sw1){
    let hex;
    hex = sw1.toString(16);
    hex = (hex.length === 1) ? '0' + hex : hex;
    return hex;
  },

  _formatData: function(data, datalen) {
    if (datalen <= MAX_DATA_LEN_ONCE) {
      this._data[0] = data;
    } else {
      //substr(start, [len])
      let i;
      for (i = 0; i < this._mCount-1; i++) {
        this._data[i] = data.substr(i*MAX_DATA_LEN_ONCE, MAX_DATA_LEN_ONCE);
      }
      this._data[i] = data.substr(i*MAX_DATA_LEN_ONCE);
    }
    for (let j = 0; j < this._data.length; j++) {
      //data[j]转16进制字符串
      //verbose('data[' + j + '] = ' + this._data[j]);
      verbose('data[' + j + '].len = ' + this._data[j].length);
      this._dataHex[j] = this._stringToHex(this._data[j]);
      verbose('dataHex[' + j + '] = ' + this._dataHex[j]);
      verbose('dataHex[' + j + '].len = ' + this._dataHex[j].length);
    }
  },   //to test!!!

  _iccOpenChannel: function(aid) {
    debug('_iccOpenChannel = ' + aid);
    cpmm.sendAsyncMessage('IccSrv:IccOpenChannel', {aid: aid});
  },

  //cla equals channel and p1 will always be 0X00
  _transmitAPDU: function(channel, ins, p2, p3, data) {
    cpmm.sendAsyncMessage('IccSrv:TransmitAPDU',
      {channel: channel, ins: ins, p1: PARA_P1, p2: p2, p3: p3, data: data});
  },

  //cxk add for 0x907b
  _transmitWAPAPDU: function(p2, p3, data) {
    cpmm.sendAsyncMessage('IccSrv:TransmitWAPAPDU',
      {channel: 0, cla: CLA_WAP_907B, ins: INS_WAP_907B, p1: PARA_P1, p2: p2, p3: p3, data: data});
  },

  _iccCloseChannel: function(channel) {
    cpmm.sendAsyncMessage('IccSrv:IccCloseChannel', {channel: channel});
  },

  writeToUicc: function writeToUicc(data) {
    // cardstatus dm-uicc-22
    let radioInterface = gRil.getRadioInterface(0);
    let cardState = radioInterface.rilContext.cardState;
    if(cardState == 0 || cardState >= 40) {
      debug('cardState from ril is ' + cardState + ', return and tell gaia');
      libcutils.property_set('oma.uicc.write', NO_CARD);
      return;
    }

    // uiccid compare dm-uicc-05
    if (radioInterface.rilContext.iccInfo) {
      var iccid = radioInterface.rilContext.iccInfo.iccid;
      debug('iccid from card is ' + iccid);
    }
    let error = {};
    let uiccId = {};
    try{
      error = sysProp.getSysPropByID(519, uiccId);
      debug('getSysPropByID error is ' + error);
    }catch(e){
      debug('getSysPropByID UICCID not available --- still write at present');
    }

    if(error == 0 && uiccId.value != '0' && iccid !== uiccId.value){
      debug('./SIM/UICCID is ' + uiccId.value + ', do not match, return and tell oma');
      libcutils.property_set('oma.uicc.write', ICCID_NOT_MATCH);
      return;
    }
    // end dm-uicc-05/22

    let aid = "A00000003053F11083050101505256";
    this._resend = 0; //cxk add for resend
    this._writeToUicc(data, aid);
  },

  // cxk add for DM-UICC-21/30
  _writeToUicc: function(data, aid) {
    debug('cxk writeToUicc-----data = ' + data);

    let datalen = data.length;
    if (datalen <= 4 || datalen > 255 * MAX_DATA_LEN_ONCE) {
      debug('datalen error from oma, should not be here ! datalen = ' + datalen);
      return;
    }

    // cxk add for resend
    this._dataResend = data;
    this._aidUsing = aid;
    // end

    let decodeData = this._decode(data); //decode function
    this._mCount = Math.floor(decodeData.length / MAX_DATA_LEN_ONCE) + 1; //length of dataArray
    verbose('cxk origin datalen = ' + datalen +
    '  decode datalen = ' + decodeData.length +
    '  this._mCount = ' + this._mCount);
    this._formatData(decodeData, decodeData.length);

    //let aid = "A00000003053F11083050101505256";
    if (!aid) {
      this._transmitWAPAPDU(0X00, this._data[0].length, this._dataHex[0]);
    } else {
      this._iccOpenChannel(aid);
    }
  },

  // ("x-wap-application:ota-server", 0x907A);
  // ("x-wap-application:subman-server", 0x907B);
  receiveWapPush: function(array, length, offset, options, appId) {
    debug('receiveWapPush get called');
    let data = {array: array, offset: offset};
    let msg = MMS.PduHelper.parse(data, null);
    if (!msg) {
      return false;
    }
    debug("receiveWapPush: msg = " + JSON.stringify(msg));
    if (appId === "x-wap-application:ota-server") {  //0x907a
      let aid = "A00000003044F115200201014E4941";
    } else if (appId === "x-wap-application:ota-server") {  // 0x907b
      let aid = null;
    }
    this._resend = 0; //cxk add for resend
    this._writeToUicc(msg.content, aid);
  },
  // end

  receiveMessage: function(aMessage) {
    debug('receiveMessage: ' + JSON.stringify(aMessage));
    let msg = aMessage.data;

    switch (aMessage.name) {
      case 'IccSrv:IccOpenChannel:OK':
        if (msg.channel) {
          this._channel = msg.channel;
          this._transmitAPDU(msg.channel, INS_START_TRANS, 0X00, this._data[0].length, this._dataHex[0]);
        }
        break;

      case 'IccSrv:TransmitAPDU:OK':
        //manage p2 by this._now
        if(msg.sw1 == 0X90 || msg.sw1 == 0X91) { //add 91 as ok too
          this._now++;
          if(this._now < this._mCount) {
            // if this is the last data, ins is A3
            let instruction = (this._now == this._mCount - 1)? INS_END_TRANS: INS_SEND_DATA;
            let p3 = this._data[this._now].length;
            this._transmitAPDU(this._channel, instruction, this._now, p3, this._dataHex[this._now]);
          } else if(1 == this._mCount && 1 == this._now) {
            // DM-UICC-11 if only one data will be transmit
            this._transmitAPDU(this._channel, INS_END_TRANS, this._now, 0x00, null);
          } else {
            // update successfully
            let statusCode = this._statusWordToHex(msg.sw1) + this._statusWordToHex(msg.sw2);
            verbose('cxk sw1/sw2 ok: ' + statusCode);
            //Services.obs.notifyObservers(null,WRITE_UICC_FINISH, statusCode);
            libcutils.property_set('oma.uicc.write', RESULT_OK);
            // close channel
            this._iccCloseChannel(this._channel);
            this._resetGloble();
            //TODO radio reset
          }
        } else {
          // no errorMsg but failed sw1 sw2, report other status word to oma
          let statusCode = this._statusWordToHex(msg.sw1) + this._statusWordToHex(msg.sw2);
          verbose('cxk sw1/sw2 not ok: ' + statusCode);
          this._iccCloseChannel(this._channel);
          this._resetGloble();
          // cxk add for resend
          if (statusCode == '6985' || statusCode == '6d00' || msg.sw1 == 0x67) {
            if (this._resend == 0) {
              this._resend = 1;
              this._writeToUicc(this._dataResend, this._aidUsing);
            } else {
              //Services.obs.notifyObservers(null,WRITE_UICC_FINISH, statusCode);
              libcutils.property_set('oma.uicc.write', ERROR_TRANSMIT);
            }
          } else {
            //Services.obs.notifyObservers(null,WRITE_UICC_FINISH, statusCode);
            libcutils.property_set('oma.uicc.write', ERROR_TRANSMIT);
          }
          // end
        }
        break;
      case 'IccSrv:TransmitWAPAPDU:OK':
        //manage p2 by this._now
        if(msg.sw1 == 0X90 || msg.sw1 == 0X91) { //add 91 as ok too
          this._now++;
          if(this._now < this._mCount) {
            let p3 = this._data[this._now].length;
            this._transmitWAPAPDU(this._now, p3, this._dataHex[this._now]);
          } else {
            // update successfully
            let statusCode = this._statusWordToHex(msg.sw1) + this._statusWordToHex(msg.sw2);
            verbose('cxk sw1/sw2 ok: ' + statusCode);
            //Services.obs.notifyObservers(null,WRITE_UICC_FINISH, statusCode);
            libcutils.property_set('ro.wap.uicc', RESULT_OK);
            //don't close channel，this is basic channel
            this._resetGloble();
            //TODO radio reset
          }
        } else {
          // no errorMsg but failed sw1 sw2, report other status word to oma
          let statusCode = this._statusWordToHex(msg.sw1) + this._statusWordToHex(msg.sw2);
          verbose('cxk sw1/sw2 not ok: ' + statusCode);
          this._resetGloble();
          // cxk add for resend
          if (statusCode == '6985' || statusCode == '6d00' || msg.sw1 == 0x67) {
            if (this._resend == 0) {
              this._resend = 1;
              this._writeToUicc(this._dataResend, this._aidUsing);
            } else {
              //Services.obs.notifyObservers(null,WRITE_UICC_FINISH, statusCode);
              libcutils.property_set('ro.wap.uicc',ERROR_TRANSMIT);
            }
          } else {
            //Services.obs.notifyObservers(null,WRITE_UICC_FINISH, statusCode);
            libcutils.property_set('ro.wap.uicc',ERROR_TRANSMIT);
          }
          // end
        }
        break;

      case 'IccSrv:TransmitAPDU:KO':
        this._iccCloseChannel(this._channel);
      case 'IccSrv:IccOpenChannel:KO':
      case 'IccSrv:TransmitWAPAPDU:KO':
        //Services.obs.notifyObservers(null,WRITE_UICC_FINISH, "channelError");
        libcutils.property_set('oma.uicc.write', ERROR_UNKNOWN);
        this._resetGloble();
        break;

      case 'IccSrv:IccCloseChannel:Return':
        //todo ignore at present
        debug('close Message' + aMessage.name);
        break;

      default:
        debug('Error Message' + aMessage.name);
        break;
    }
  }
};

// if there aren't add 'OmaServiceJS' to Factory, then 'JavaScript Error: NS_ERROR_FACTORY_NOT_REGISTERED'
if ('generateNSGetFactory' in XPCOMUtils) {
  this.NSGetFactory =
    XPCOMUtils.generateNSGetFactory([IccOma]);  // Firefox 4.0 and higher
} else {
  this.NSGetModule =
    XPCOMUtils.generateNSGetModule([IccOma]);    // Firefox 3.x
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/systemlibs.js");
Cu.import("resource://gre/modules/Promise.jsm");

const NETWORKMANAGER_CONTRACTID = "@mozilla.org/network/manager;1";
const NETWORKMANAGER_CID =
  Components.ID("{1ba9346b-53b5-4660-9dc6-58f0b258d0a6}");

const DEFAULT_PREFERRED_NETWORK_TYPE = Ci.nsINetworkInfo.NETWORK_TYPE_ETHERNET;

XPCOMUtils.defineLazyGetter(this, "ppmm", function() {
  return Cc["@mozilla.org/parentprocessmessagemanager;1"]
         .getService(Ci.nsIMessageBroadcaster);
});

XPCOMUtils.defineLazyServiceGetter(this, "gDNSService",
                                   "@mozilla.org/network/dns-service;1",
                                   "nsIDNSService");

XPCOMUtils.defineLazyServiceGetter(this, "gNetworkService",
                                   "@mozilla.org/network/service;1",
                                   "nsINetworkService");

XPCOMUtils.defineLazyServiceGetter(this, "gPACGenerator",
                                   "@mozilla.org/pac-generator;1",
                                   "nsIPACGenerator");

XPCOMUtils.defineLazyServiceGetter(this, "gTetheringService",
                                   "@mozilla.org/tethering/service;1",
                                   "nsITetheringService");

const TOPIC_INTERFACE_REGISTERED     = "network-interface-registered";
const TOPIC_INTERFACE_UNREGISTERED   = "network-interface-unregistered";
const TOPIC_ACTIVE_CHANGED           = "network-active-changed";
const TOPIC_PREF_CHANGED             = "nsPref:changed";
const TOPIC_XPCOM_SHUTDOWN           = "xpcom-shutdown";
const TOPIC_CONNECTION_STATE_CHANGED = "network-connection-state-changed";
const PREF_MANAGE_OFFLINE_STATUS     = "network.gonk.manage-offline-status";
const PREF_NETWORK_DEBUG_ENABLED     = "network.debugging.enabled";

const IPV4_ADDRESS_ANY                 = "0.0.0.0";
const IPV6_ADDRESS_ANY                 = "::0";

const IPV4_MAX_PREFIX_LENGTH           = 32;
const IPV6_MAX_PREFIX_LENGTH           = 128;

// Connection Type for Network Information API
const CONNECTION_TYPE_CELLULAR  = 0;
const CONNECTION_TYPE_BLUETOOTH = 1;
const CONNECTION_TYPE_ETHERNET  = 2;
const CONNECTION_TYPE_WIFI      = 3;
const CONNECTION_TYPE_OTHER     = 4;
const CONNECTION_TYPE_NONE      = 5;

const PROXY_TYPE_MANUAL = Ci.nsIProtocolProxyService.PROXYCONFIG_MANUAL;
const PROXY_TYPE_PAC    = Ci.nsIProtocolProxyService.PROXYCONFIG_PAC;

var debug;
function updateDebug() {
  let debugPref = false; // set default value here.
  try {
    debugPref = debugPref || Services.prefs.getBoolPref(PREF_NETWORK_DEBUG_ENABLED);
  } catch (e) {}

  if (debugPref) {
    debug = function(s) {
      dump("-*- NetworkManager: " + s + "\n");
    };
  } else {
    debug = function(s) {};
  }
}
updateDebug();

function defineLazyRegExp(obj, name, pattern) {
  obj.__defineGetter__(name, function() {
    delete obj[name];
    return obj[name] = new RegExp(pattern);
  });
}

function convertToDataCallType(aNetworkType) {
  switch (aNetworkType) {
    case Ci.nsINetworkInfo.NETWORK_TYPE_WIFI:
      return "wifi";
    case Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE:
      return "default";
    case Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_MMS:
      return "mms";
    case Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_SUPL:
      return "supl";
    case Ci.nsINetworkInfo.NETWORK_TYPE_WIFI_P2P:
      return "wifip2p";
    case Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_IMS:
      return "ims";
    case Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_DUN:
      return "dun";
    case Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_FOTA:
      return "fota";
    case Ci.nsINetworkInfo.NETWORK_TYPE_ETHERNET:
      return "ethernet";
    case Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_HIPRI:
      return "hipri";
    case Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_CBS:
      return "cbs";
    case Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_IA:
      return "ia";
    case Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_ECC:
      return "ecc";
    case Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_XCAP:
      return "xcap";
    default:
      return "unknown";
  }
};

function ExtraNetworkInterface(aNetwork) {
  this.httpproxyhost = aNetwork.httpProxyHost;
  this.httpproxyport = aNetwork.httpProxyPort;
  this.mtuValue = aNetwork.mtu;
  this.info = new ExtraNetworkInfo(aNetwork);
}
ExtraNetworkInterface.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsINetworkInterface]),

  get httpProxyHost() {
    return this.httpproxyhost;
  },

  get httpProxyPort() {
    return this.httpproxyport;
  },

  get mtu() {
    return this.mtuValue;
  },
};

function ExtraNetworkInfo(aNetwork) {
  let ips_length;
  let ips = {};
  let prefixLengths = {};

  this.state = aNetwork.info.state;
  this.type = aNetwork.info.type;
  this.name = aNetwork.info.name;
  this.ips_length = aNetwork.info.getAddresses(ips, prefixLengths);
  this.ips = ips.value;
  this.prefixLengths = prefixLengths.value;
  this.gateways = aNetwork.info.getGateways();
  this.dnses = aNetwork.info.getDnses();
  this.serviceId = aNetwork.info.serviceId;
  this.iccId = aNetwork.info.iccId;
  if (this.type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_MMS) {
    this.mmsc = aNetwork.info.mmsc;
    this.mmsProxy = aNetwork.info.mmsProxy;
    this.mmsPort = aNetwork.info.mmsPort;
  }
  if (this.type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_IMS) {
    this.pcscf = aNetwork.info.getPcscf();
  }
}
ExtraNetworkInfo.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsINetworkInfo,
                                         Ci.nsIRilNetworkInfo]),

  /**
   * nsINetworkInfo Implementation
   */
  getAddresses: function(aIps, aPrefixLengths) {
    aIps.value = this.ips.slice();
    aPrefixLengths.value = this.prefixLengths.slice();

    return this.ips.length;
  },

  getGateways: function(aCount) {
    if (aCount) {
      aCount.value = this.gateways.length;
    }

    return this.gateways.slice();
  },

  getDnses: function(aCount) {
    if (aCount) {
      aCount.value = this.dnses.length;
    }

    return this.dnses.slice();
  },

  /**
   * nsIRilNetworkInfo Implementation
   */
  getPcscf: function(aCount) {
    if (this.type != Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_IMS) {
      debug("-*- NetworkManager: Error! Only IMS network can get pcscf.");
      return "";
    }
    if (aCount) {
      aCount.value = this.pcscf.length;
    }
    return this.pcscf.slice();
  }
};

function NetworkInterfaceLinks()
{
  this.resetLinks();
}
NetworkInterfaceLinks.prototype = {
  linkRoutes: null,
  gateways: null,
  interfaceName: null,
  extraRoutes: null,
  clatd: null,

  setLinks: function(linkRoutes, gateways, interfaceName) {
    this.linkRoutes = linkRoutes;
    this.gateways = gateways;
    this.interfaceName = interfaceName;
  },

  resetLinks: function() {
    this.linkRoutes = [];
    this.gateways = [];
    this.interfaceName = "";
    this.extraRoutes = [];
    this.clatd = null;
  },

  compareGateways: function(gateways) {
    if (this.gateways.length != gateways.length) {
      return false;
    }

    for (let i = 0; i < this.gateways.length; i++) {
      if (this.gateways[i] != gateways[i]) {
        return false;
      }
    }

    return true;
  }
};

function Nat464Xlat(aNetworkInfo) {
  this.clear();
  this.networkInfo = aNetworkInfo;
}
Nat464Xlat.prototype = {
  CLAT_PREFIX: "v4-",
  networkInfo: null,
  ifaceName: null,
  nat464Iface: null,

  isStarted: function() {
    return this.nat464Iface != null;
  },

  clear: function() {
    this.networkInfo = null;
    this.ifaceName = null;
    this.nat464Iface = null;
  },

  start: function() {
    debug("Starting clatd");
    this.ifaceName = this.networkInfo.name;
    if (this.ifaceName == null) {
      debug("clatd: Can't start clatd without providing interface");
      return;
    }

    if (this.isStarted()) {
      debug("clatd: already started");
      return;
    }

    this.nat464Iface = this.CLAT_PREFIX + this.ifaceName;

    debug("Starting clatd on " + this.ifaceName);

    gNetworkService.startClatd(this.ifaceName, (success) => {
      debug("Clatd started : " + success);
    });
  },

  stop: function() {
    if (!this.isStarted()) {
      debug("clatd: already stopped");
      return;
    }

    debug("Stopping clatd");

    gNetworkService.stopClatd(this.ifaceName, (success) => {
      debug("Clatd stopped : " + success);
      if (success) {
        this.clear();
      }
    });
  },
};

/**
 * This component watches for network interfaces changing state and then
 * adjusts routes etc. accordingly.
 */
function NetworkManager() {
  this.networkInterfaces = {};
  this.networkInterfaceLinks = {};

  try {
    this._manageOfflineStatus =
      Services.prefs.getBoolPref(PREF_MANAGE_OFFLINE_STATUS);
  } catch(ex) {
    // Ignore.
  }
  Services.prefs.addObserver(PREF_MANAGE_OFFLINE_STATUS, this, false);
  Services.prefs.addObserver(PREF_NETWORK_DEBUG_ENABLED, this, false);
  Services.obs.addObserver(this, TOPIC_XPCOM_SHUTDOWN, false);

  this.setAndConfigureActive();

  ppmm.addMessageListener('NetworkInterfaceList:ListInterface', this);

  // Used in resolveHostname().
  defineLazyRegExp(this, "REGEXP_IPV4", "^\\d{1,3}(?:\\.\\d{1,3}){3}$");
  defineLazyRegExp(this, "REGEXP_IPV6", "^[\\da-fA-F]{4}(?::[\\da-fA-F]{4}){7}$");
}
NetworkManager.prototype = {
  classID:   NETWORKMANAGER_CID,
  classInfo: XPCOMUtils.generateCI({classID: NETWORKMANAGER_CID,
                                    contractID: NETWORKMANAGER_CONTRACTID,
                                    classDescription: "Network Manager",
                                    interfaces: [Ci.nsINetworkManager]}),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsINetworkManager,
                                         Ci.nsISupportsWeakReference,
                                         Ci.nsIObserver,
                                         Ci.nsISettingsServiceCallback]),
  _stateRequests: [],

  _requestProcessing: false,

  _currentRequest: null,

  queueRequest: function(msg) {
    this._stateRequests.push({
      msg: msg,
    });
    this.nextRequest();
  },

  requestDone: function requestDone() {
    this._currentRequest = null;
    this._requestProcessing = false;
    this.nextRequest();
  },

  nextRequest: function nextRequest() {
    // No request to process
    if (this._stateRequests.length === 0) {
      return;
    }

    // Handling request, wait for it.
    if (this._requestProcessing) {
      return;
    }
    // Hold processing lock
    this._requestProcessing = true;

    // Find next valid request
    this._currentRequest = this._stateRequests.shift();

    this.handleRequest(this._currentRequest);
  },

  handleRequest: function(request) {
    let msg = request.msg;
    debug("handleRequest msg.name=" + msg.name);
    switch (msg.name) {
      case "updateNetworkInterface":
        this.compareNetworkInterface(msg.network, msg.networkId);
        break;
      case "registerNetworkInterface":
        this.onRegisterNetworkInterface(msg.network, msg.networkId);
        break;
      case "unregisterNetworkInterface":
        this.onUnregisterNetworkInterface(msg.network, msg.networkId);
        break;
    }
  },

  // nsIObserver

  observe: function(subject, topic, data) {
    switch (topic) {
      case TOPIC_PREF_CHANGED:
        if (data === PREF_NETWORK_DEBUG_ENABLED) {
          updateDebug();
        } else if (data === PREF_MANAGE_OFFLINE_STATUS) {
          this._manageOfflineStatus =
            Services.prefs.getBoolPref(PREF_MANAGE_OFFLINE_STATUS);
          debug(PREF_MANAGE_OFFLINE_STATUS + " has changed to " + this._manageOfflineStatus);
        }
        break;
      case TOPIC_XPCOM_SHUTDOWN:
        Services.obs.removeObserver(this, TOPIC_XPCOM_SHUTDOWN);
        Services.prefs.removeObserver(PREF_MANAGE_OFFLINE_STATUS, this);
        Services.prefs.removeObserver(PREF_NETWORK_DEBUG_ENABLED, this);
        break;
    }
  },

  receiveMessage: function(aMsg) {
    switch (aMsg.name) {
      case "NetworkInterfaceList:ListInterface": {
        let excludeMms = aMsg.json.excludeMms;
        let excludeSupl = aMsg.json.excludeSupl;
        let excludeIms = aMsg.json.excludeIms;
        let excludeDun = aMsg.json.excludeDun;
        let excludeFota = aMsg.json.excludeFota;
        let interfaces = [];

        for (let key in this.networkInterfaces) {
          let network = this.networkInterfaces[key];
          let i = network.info;
          if ((i.type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_MMS && excludeMms) ||
              (i.type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_SUPL && excludeSupl) ||
              (i.type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_IMS && excludeIms) ||
              (i.type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_DUN && excludeDun) ||
              (i.type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_FOTA && excludeFota)) {
            continue;
          }

          let ips = {};
          let prefixLengths = {};
          i.getAddresses(ips, prefixLengths);

          interfaces.push({
            state: i.state,
            type: i.type,
            name: i.name,
            ips: ips.value,
            prefixLengths: prefixLengths.value,
            gateways: i.getGateways(),
            dnses: i.getDnses()
          });
        }
        return interfaces;
      }
    }
  },

  getNetworkId: function(aNetworkInfo) {
    let id = "device";
    try {
      if (aNetworkInfo instanceof Ci.nsIRilNetworkInfo) {
        let rilInfo = aNetworkInfo.QueryInterface(Ci.nsIRilNetworkInfo);
        id = "ril" + rilInfo.serviceId;
      }
    } catch (e) {}

    return id + "-" + aNetworkInfo.type;
  },

  // nsINetworkManager

  registerNetworkInterface: function(network) {
    debug("registerNetworkInterface. network=" + JSON.stringify(network));
    if (!(network instanceof Ci.nsINetworkInterface)) {
      throw Components.Exception("Argument must be nsINetworkInterface.",
                                 Cr.NS_ERROR_INVALID_ARG);
    }
    let networkId = this.getNetworkId(network.info);
    // Keep a copy of network in case it is modified while we are updating.
    let extNetwork = new ExtraNetworkInterface(network);
    // Send message.
    this.queueRequest({
                        name: "registerNetworkInterface",
                        network: extNetwork,
                        networkId: networkId
                      });
  },

  onRegisterNetworkInterface: function(aNetwork, aNetworkId) {
    if (aNetworkId in this.networkInterfaces) {
      this.requestDone();
      throw Components.Exception("Network with that type already registered!",
                                 Cr.NS_ERROR_INVALID_ARG);
    }
    this.networkInterfaces[aNetworkId] = aNetwork;
    this.networkInterfaceLinks[aNetworkId] = new NetworkInterfaceLinks();

    Services.obs.notifyObservers(aNetwork.info, TOPIC_INTERFACE_REGISTERED, null);
    debug("Network '" + aNetworkId + "' registered.");

    // Update network info.
    this.onUpdateNetworkInterface(aNetwork, null, aNetworkId);
  },

  _addSubnetRoutes: function(aNetworkInfo) {
    let ips = {};
    let prefixLengths = {};
    let length = aNetworkInfo.getAddresses(ips, prefixLengths);
    let promises = [];

    for (let i = 0; i < length; i++) {
      debug('Adding subnet routes: ' + ips.value[i] + '/' + prefixLengths.value[i]);
      promises.push(
        gNetworkService.modifyRoute(Ci.nsINetworkService.MODIFY_ROUTE_ADD,
                                    aNetworkInfo.name, ips.value[i], prefixLengths.value[i])
        .catch(aError => {
          debug("_addSubnetRoutes error: " + aError);
        }));
    }

    return Promise.all(promises);
  },

  _removeSubnetRoutes: function(aNetworkInfo) {
    let ips = {};
    let prefixLengths = {};
    let length = aNetworkInfo.getAddresses(ips, prefixLengths);
    let promises = [];

    for (let i = 0; i < length; i++) {
      debug('Removing subnet routes: ' + ips.value[i] + '/' + prefixLengths.value[i]);
      promises.push(
        gNetworkService.modifyRoute(Ci.nsINetworkService.MODIFY_ROUTE_REMOVE,
                                    aNetworkInfo.name, ips.value[i], prefixLengths.value[i])
        .catch(aError => {
          debug("_removeSubnetRoutes error: " + aError);
        }));
    }

    return Promise.all(promises);
  },

  _isIfaceChanged: function(preIface, newIface) {
    if (!preIface) {
      return true;
    }

    // Check if state changes.
    if (preIface.info.state != newIface.info.state) {
      return true;
    }

    // Check if IP changes.
    if (preIface.info.ips_length != newIface.info.ips_length) {
      return true;
    }

    for (let i in preIface.info.ips) {
      if (newIface.info.ips.indexOf(preIface.info.ips[i]) == -1) {
        return true;
      }
    }

    // Check if gateway changes.
    if (preIface.info.gateways.length != newIface.info.gateways.length) {
      return true;
    }

    for (let i in preIface.info.gateways) {
      if (newIface.info.gateways.indexOf(preIface.info.gateways[i]) == -1) {
        return true;
      }
    }

    // Check if dns changes.
    if (preIface.info.dnses.length != newIface.info.dnses.length) {
      return true;
    }

    for (let i in preIface.info.dnses) {
      if (newIface.info.dnses.indexOf(preIface.info.dnses[i]) == -1) {
        return true;
      }
    }

    // Check if mtu changes.
    if (preIface.mtu != newIface.mtu) {
      return true;
    }

    // Check if httpProxyHost changes.
    if (preIface.httpProxyHost != newIface.httpProxyHost) {
      return true;
    }

    // Check if httpProxyPort changes.
    if (preIface.httpProxyPort != newIface.httpProxyPort) {
      return true;
    }

    return false;
  },

  updateNetworkInterface: function(network) {
    if (!(network instanceof Ci.nsINetworkInterface)) {
      throw Components.Exception("Argument must be nsINetworkInterface.",
                                 Cr.NS_ERROR_INVALID_ARG);
    }
    debug("Network " + convertToDataCallType(network.info.type) + "/" + network.info.name +
          " changed state to " + network.info.state);

    let networkId = this.getNetworkId(network.info);
    // Keep a copy of network in case it is modified while we are updating.
    let extNetwork = new ExtraNetworkInterface(network);
    // Send message.
    this.queueRequest({
                        name: "updateNetworkInterface",
                        network: extNetwork,
                        networkId: networkId
                      });
  },

  compareNetworkInterface: function(aNetwork, aNetworkId) {
    if (!(aNetworkId in this.networkInterfaces)) {
      this.requestDone();
      throw Components.Exception("No network with that type registered.",
                                 Cr.NS_ERROR_INVALID_ARG);
    }

    debug("Process Network " + convertToDataCallType(aNetwork.info.type) + "/" + aNetwork.info.name +
          " changed state to " + aNetwork.info.state);

    // Previous network information.
    let preNetwork = this.networkInterfaces[aNetworkId];


    if (!this._isIfaceChanged(preNetwork, aNetwork)) {
      debug("Identical network interfaces.");
      this.requestDone();
      return;
    }

    // Update networkInterfaces with latest value.
    this.networkInterfaces[aNetworkId] = aNetwork;
    // Update network info.
    this.onUpdateNetworkInterface(aNetwork, preNetwork, aNetworkId);
  },

  onUpdateNetworkInterface: function(aNetwork, preNetwork, aNetworkId) {
    // Latest network information.
    // Add route or connected state using extNetworkInfo.
    let extNetworkInfo = aNetwork && aNetwork.info;
    debug("extNetworkInfo=" + JSON.stringify(extNetworkInfo));

    // Previous network information.
    // Remove route or disconnect state using preNetworkInfo.
    let preNetworkInfo = preNetwork && preNetwork.info;
    debug("preNetworkInfo=" + JSON.stringify(preNetworkInfo));

    // Note that since Lollipop we need to allocate and initialize
    // something through netd, so we add createNetwork/destroyNetwork
    // to deal with that explicitly.

    switch (extNetworkInfo.state) {
      case Ci.nsINetworkInfo.NETWORK_STATE_CONNECTED:

        this._createNetwork(extNetworkInfo.name, extNetworkInfo.type)
          // Remove pre-created default route and let setAndConfigureActive()
          // to set default route only on preferred network
          .then(() => {
            if (preNetworkInfo) {
              return this._removeDefaultRoute(preNetworkInfo);
            } else {
              return Promise.resolve();
            }
          })
          // Set DNS server as early as possible to prevent from
          // premature domain name lookup.
          .then(() => {
            if (extNetworkInfo.type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_IMS) {
              return Promise.resolve();
            }
            return this._setDNS(extNetworkInfo);
          })
          // Config the default route for each interface.
          .then(() => {
            return this._setDefaultRoute(extNetworkInfo);
          })
          .then(() => {
            // Add host route for data calls
            if (!this.isNetworkTypeMobile(extNetworkInfo.type) ||
              extNetworkInfo.type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_IMS) {
              return;
            }

            let currentInterfaceLinks = this.networkInterfaceLinks[aNetworkId];
            let newLinkRoutes = aNetwork.httpProxyHost ? extNetworkInfo.getDnses().concat(aNetwork.httpProxyHost) :
                                                        extNetworkInfo.getDnses();
            // If gateways have changed, remove all old routes first.
            return this._handleGateways(aNetworkId, extNetworkInfo.getGateways())
              .then(() => this._updateRoutes(currentInterfaceLinks.linkRoutes,
                                             newLinkRoutes,
                                             extNetworkInfo.getGateways(),
                                             extNetworkInfo.name))
              .then(() => currentInterfaceLinks.setLinks(newLinkRoutes,
                                                         extNetworkInfo.getGateways(),
                                                         extNetworkInfo.name));
          })
          .then(() => {
            if (extNetworkInfo.type !=
                Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_DUN) {
              return;
            }
            // Dun type is a special case where we add the default route to a
            // secondary table.
            return this.setSecondaryDefaultRoute(extNetworkInfo);
          })
          .then(() => this._addSubnetRoutes(extNetworkInfo))
          .then(() => {
            if (aNetwork.mtu <= 0) {
              return;
            }

            return this._setMtu(aNetwork);
          })
          .then(() => this.setAndConfigureActive())
          .then(() => gTetheringService.onExternalConnectionChanged(extNetworkInfo))
          .then(() => this.updateClat(extNetworkInfo, aNetworkId))
          .then(() => {
            // Update data connection when Wifi connected/disconnected
            if (extNetworkInfo.type ==
                Ci.nsINetworkInfo.NETWORK_TYPE_WIFI && this.mRil) {
              for (let i = 0; i < this.mRil.numRadioInterfaces; i++) {
                this.mRil.getRadioInterface(i).updateRILNetworkInterface();
              }
            }

            // Probing the public network accessibility after routing table is ready
            CaptivePortalDetectionHelper
              .notify(CaptivePortalDetectionHelper.EVENT_CONNECT,
                      this.activeNetworkInfo);
          })
          .then(() => {
            // Notify outer modules like MmsService to start the transaction after
            // the configuration of the network interface is done.
            Services.obs.notifyObservers(extNetworkInfo,
                                         TOPIC_CONNECTION_STATE_CHANGED,
                                         this.convertConnectionType(extNetworkInfo));
          })
          .then(() => {
            this.requestDone();
          })
          .catch(aError => {
            debug("onUpdateNetworkInterface error: " + aError);
            this.requestDone();
          });
        break;
      case Ci.nsINetworkInfo.NETWORK_STATE_DISCONNECTED:
        if (preNetworkInfo) {
          // Keep the previous information but change the state to disconnect.
          preNetworkInfo.state = Ci.nsINetworkInfo.NETWORK_STATE_DISCONNECTED;
          debug("preNetworkInfo = " + JSON.stringify(preNetworkInfo));
        } else {
          debug("preNetworkInfo = undefined nothing to do. Break.");
          this.requestDone();
          break;
        }
        Promise.resolve()
          .then(() => this.updateClat(preNetworkInfo, aNetworkId))
          .then(() => {
            if (!this.isNetworkTypeMobile(preNetworkInfo.type)) {
              return;
            }
            // Remove host route for data calls
            return this._cleanupAllHostRoutes(aNetworkId);
          })
          .then(() => {
            if (preNetworkInfo.type !=
                Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_DUN) {
              return;
            }
            // Remove secondary default route for dun.
            return this.removeSecondaryDefaultRoute(preNetworkInfo);
          })
          .then(() => {
            if (preNetworkInfo.type == Ci.nsINetworkInfo.NETWORK_TYPE_WIFI ||
                preNetworkInfo.type == Ci.nsINetworkInfo.NETWORK_TYPE_ETHERNET) {
              // Remove routing table in /proc/net/route
              return this._resetRoutingTable(preNetworkInfo.name);
            }
            if (this.isNetworkTypeMobile(preNetworkInfo.type)) {
              return this._removeDefaultRoute(preNetworkInfo)
            }
          })
          .then(() => this._removeSubnetRoutes(preNetworkInfo))
          .then(() => {
            // Clear http proxy on active network.
            if (this.activeNetworkInfo &&
                preNetworkInfo.type == this.activeNetworkInfo.type) {
              this.clearNetworkProxy();
            }

            // Abort ongoing captive portal detection on the wifi interface
            CaptivePortalDetectionHelper
              .notify(CaptivePortalDetectionHelper.EVENT_DISCONNECT, preNetworkInfo);
          })
          .then(() => gTetheringService.onExternalConnectionChanged(preNetworkInfo))
          .then(() => this.setAndConfigureActive())
          .then(() => {
            // Update data connection when Wifi connected/disconnected
            if (preNetworkInfo.type ==
                Ci.nsINetworkInfo.NETWORK_TYPE_WIFI && this.mRil) {
              for (let i = 0; i < this.mRil.numRadioInterfaces; i++) {
                this.mRil.getRadioInterface(i).updateRILNetworkInterface();
              }
            }
          })
          .then(() => this._destroyNetwork(preNetworkInfo.name, preNetworkInfo.type))
          .then(() => {
            // Notify outer modules like MmsService to stop the transaction after
            // the configuration of the network interface is done.
            Services.obs.notifyObservers(preNetworkInfo,
                                         TOPIC_CONNECTION_STATE_CHANGED,
                                         this.convertConnectionType(preNetworkInfo));
          })
          .then(() => {
            this.requestDone();
          })
          .catch(aError => {
            debug("onUpdateNetworkInterface error: " + aError);
            this.requestDone();
          });
        break;
      default:
        debug("onUpdateNetworkInterface undefined state.");
        this.requestDone();
        break;
    }
  },

  unregisterNetworkInterface: function(network) {
    if (!(network instanceof Ci.nsINetworkInterface)) {
      throw Components.Exception("Argument must be nsINetworkInterface.",
                                 Cr.NS_ERROR_INVALID_ARG);
    }
    let networkId = this.getNetworkId(network.info);

    // Keep a copy of network in case it is modified while we are updating.
    let extNetwork = new ExtraNetworkInterface(network);

    // Send message.
    this.queueRequest({
                        name: "unregisterNetworkInterface",
                        network: extNetwork,
                        networkId: networkId
                      });
  },

  onUnregisterNetworkInterface: function(aNetwork, aNetworkId) {

    if (!(aNetworkId in this.networkInterfaces)) {
      this.requestDone();
      throw Components.Exception("No network with that type registered.",
                                 Cr.NS_ERROR_INVALID_ARG);
    }

    let preNetwork = this.networkInterfaces[aNetworkId];

    delete this.networkInterfaces[aNetworkId];

    Services.obs.notifyObservers(aNetwork.info, TOPIC_INTERFACE_UNREGISTERED, null);
    debug("Network '" + aNetworkId + "' unregistered.");
    // Update network info.
    this.onUpdateNetworkInterface(aNetwork, preNetwork, aNetworkId);
  },

  _manageOfflineStatus: true,

  networkInterfaces: null,

  networkInterfaceLinks: null,

  _networkTypePriorityList: [Ci.nsINetworkInfo.NETWORK_TYPE_ETHERNET,
                             Ci.nsINetworkInfo.NETWORK_TYPE_WIFI,
                             Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE],
  get networkTypePriorityList() {
    return this._networkTypePriorityList;
  },
  set networkTypePriorityList(val) {
    if (val.length != this._networkTypePriorityList.length) {
      throw "Priority list length should equal to " +
            this._networkTypePriorityList.length;
    }

    // Check if types in new priority list are valid and also make sure there
    // are no duplicate types.
    let list = [Ci.nsINetworkInfo.NETWORK_TYPE_ETHERNET,
                Ci.nsINetworkInfo.NETWORK_TYPE_WIFI,
                Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE];
    while (list.length) {
      let type = list.shift();
      if (val.indexOf(type) == -1) {
        throw "There is missing network type";
      }
    }

    this._networkTypePriorityList = val;
  },

  getPriority: function(type) {
    if (this._networkTypePriorityList.indexOf(type) == -1) {
      // 0 indicates the lowest priority.
      return 0;
    }

    return this._networkTypePriorityList.length -
           this._networkTypePriorityList.indexOf(type);
  },

  get allNetworkInfo() {
    let allNetworkInfo = {};

    for (let networkId in this.networkInterfaces) {
      if (this.networkInterfaces.hasOwnProperty(networkId)) {
        allNetworkInfo[networkId] = this.networkInterfaces[networkId].info;
      }
    }

    return allNetworkInfo;
  },

  _preferredNetworkType: DEFAULT_PREFERRED_NETWORK_TYPE,
  get preferredNetworkType() {
    return this._preferredNetworkType;
  },
  set preferredNetworkType(val) {
    if ([Ci.nsINetworkInfo.NETWORK_TYPE_WIFI,
         Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE,
         Ci.nsINetworkInfo.NETWORK_TYPE_ETHERNET].indexOf(val) == -1) {
      throw "Invalid network type";
    }
    this._preferredNetworkType = val;
  },

  _wifiCaptivePortalLanding: false,
  get wifiCaptivePortalLanding() {
    return this._wifiCaptivePortalLanding;
  },

  _activeNetwork: null,

  get activeNetworkInfo() {
    return this._activeNetwork && this._activeNetwork.info;
  },

  _overriddenActive: null,

  overrideActive: function(network) {
    if ([Ci.nsINetworkInfo.NETWORK_TYPE_WIFI,
         Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE,
         Ci.nsINetworkInfo.NETWORK_TYPE_ETHERNET].indexOf(val) == -1) {
      throw "Invalid network type";
    }

    this._overriddenActive = network;
    this.setAndConfigureActive();
  },

  _updateRoutes: function(oldLinks, newLinks, gateways, interfaceName) {
    // Returns items that are in base but not in target.
    function getDifference(base, target) {
      return base.filter(function(i) { return target.indexOf(i) < 0; });
    }

    let addedLinks = getDifference(newLinks, oldLinks);
    let removedLinks = getDifference(oldLinks, newLinks);

    if (addedLinks.length === 0 && removedLinks.length === 0) {
      return Promise.resolve();
    }

    return this._setHostRoutes(false, removedLinks, interfaceName, gateways)
      .then(this._setHostRoutes(true, addedLinks, interfaceName, gateways));
  },

  _setHostRoutes: function(doAdd, ipAddresses, networkName, gateways) {
    let getMaxPrefixLength = (aIp) => {
      return aIp.match(this.REGEXP_IPV4) ? IPV4_MAX_PREFIX_LENGTH : IPV6_MAX_PREFIX_LENGTH;
    }

    let promises = [];

    ipAddresses.forEach((aIpAddress) => {
      let gateway = this.selectGateway(gateways, aIpAddress);
      if (gateway) {
        promises.push((doAdd)
          ? gNetworkService.modifyRoute(Ci.nsINetworkService.MODIFY_ROUTE_ADD,
                                        networkName, aIpAddress,
                                        getMaxPrefixLength(aIpAddress), gateway)
          : gNetworkService.modifyRoute(Ci.nsINetworkService.MODIFY_ROUTE_REMOVE,
                                        networkName, aIpAddress,
                                        getMaxPrefixLength(aIpAddress), gateway));
      }
    });

    return Promise.all(promises);
  },

  isValidatedNetwork: function(aNetworkInfo) {
    let isValid = false;
    try {
      isValid = (this.getNetworkId(aNetworkInfo) in this.networkInterfaces);
    } catch (e) {
      debug("Invalid network interface: " + e);
    }

    return isValid;
  },

  addHostRoute: function(aNetworkInfo, aHost) {
    if (!this.isValidatedNetwork(aNetworkInfo)) {
      return Promise.reject("Invalid network info.");
    }

    return this.resolveHostname(aNetworkInfo, aHost)
      .then((ipAddresses) => {
        let promises = [];
        let networkId = this.getNetworkId(aNetworkInfo);

        ipAddresses.forEach((aIpAddress) => {
          let promise =
            this._setHostRoutes(true, [aIpAddress], aNetworkInfo.name, aNetworkInfo.getGateways())
              .then(() => this.networkInterfaceLinks[networkId].extraRoutes.push(aIpAddress));

          promises.push(promise);
        });

        return Promise.all(promises);
      });
  },

  removeHostRoute: function(aNetworkInfo, aHost) {
    if (!this.isValidatedNetwork(aNetworkInfo)) {
      return Promise.reject("Invalid network info.");
    }

    return this.resolveHostname(aNetworkInfo, aHost)
      .then((ipAddresses) => {
        let promises = [];
        let networkId = this.getNetworkId(aNetworkInfo);

        ipAddresses.forEach((aIpAddress) => {
          let found = this.networkInterfaceLinks[networkId].extraRoutes.indexOf(aIpAddress);
          if (found < 0) {
            return; // continue
          }

          let promise =
            this._setHostRoutes(false, [aIpAddress], aNetworkInfo.name, aNetworkInfo.getGateways())
              .then(() => {
                this.networkInterfaceLinks[networkId].extraRoutes.splice(found, 1);
              }, () => {
                // We should remove it even if the operation failed.
                this.networkInterfaceLinks[networkId].extraRoutes.splice(found, 1);
              });
          promises.push(promise);
        });

        return Promise.all(promises);
      });
  },

  isNetworkTypeSecondaryMobile: function(type) {
    return (type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_MMS ||
            type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_SUPL ||
            type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_IMS ||
            type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_DUN ||
            type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE_FOTA);
  },

  isNetworkTypeMobile: function(type) {
    return (type == Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE ||
            this.isNetworkTypeSecondaryMobile(type));
  },

  _handleGateways: function(networkId, gateways) {
    let currentNetworkLinks = this.networkInterfaceLinks[networkId];
    if (currentNetworkLinks.gateways.length == 0 ||
        currentNetworkLinks.compareGateways(gateways)) {
      return Promise.resolve();
    }

    let currentExtraRoutes = currentNetworkLinks.extraRoutes;
    let currentInterfaceName = currentNetworkLinks.interfaceName;
    return this._cleanupAllHostRoutes(networkId)
      .then(() => {
        // If gateways have changed, re-add extra host routes with new gateways.
        if (currentExtraRoutes.length > 0) {
          this._setHostRoutes(true,
                              currentExtraRoutes,
                              currentInterfaceName,
                              gateways)
          .then(() => {
            currentNetworkLinks.extraRoutes = currentExtraRoutes;
          });
        }
      });
  },

  _cleanupAllHostRoutes: function(networkId) {
    let currentNetworkLinks = this.networkInterfaceLinks[networkId];
    let hostRoutes = currentNetworkLinks.linkRoutes.concat(
      currentNetworkLinks.extraRoutes);

    if (hostRoutes.length === 0) {
      return Promise.resolve();
    }

    return this._setHostRoutes(false,
                               hostRoutes,
                               currentNetworkLinks.interfaceName,
                               currentNetworkLinks.gateways)
      .catch((aError) => {
        debug("Error (" + aError + ") on _cleanupAllHostRoutes, keep proceeding.");
      })
      .then(() => currentNetworkLinks.resetLinks());
  },

  selectGateway: function(gateways, host) {
    for (let i = 0; i < gateways.length; i++) {
      let gateway = gateways[i];
      if (!host || !gateway) {
        continue;
      }
      if (gateway.match(this.REGEXP_IPV4) && host.match(this.REGEXP_IPV4) ||
          gateway.indexOf(":") != -1 && host.indexOf(":") != -1) {
        return gateway;
      }
    }
    return null;
  },

  _setSecondaryRoute: function(aDoAdd, aInterfaceName, aRoute) {
    return new Promise((aResolve, aReject) => {
      if (aDoAdd) {
        gNetworkService.addSecondaryRoute(aInterfaceName, aRoute,
          (aSuccess) => {
            if (!aSuccess) {
              aReject("addSecondaryRoute failed");
              return;
            }
            aResolve();
        });
      } else {
        gNetworkService.removeSecondaryRoute(aInterfaceName, aRoute,
          (aSuccess) => {
            if (!aSuccess) {
              debug("removeSecondaryRoute failed")
            }
            // Always resolve.
            aResolve();
        });
      }
    });
  },

  setSecondaryDefaultRoute: function(network) {
    let gateways = network.getGateways();
    let promises = [];

    for (let i = 0; i < gateways.length; i++) {
      let isIPv6 = (gateways[i].indexOf(":") != -1) ? true : false;
      // First, we need to add a host route to the gateway in the secondary
      // routing table to make the gateway reachable. Host route takes the max
      // prefix and gateway address 'any'.
      let hostRoute = {
        ip: gateways[i],
        prefix: isIPv6 ? IPV6_MAX_PREFIX_LENGTH : IPV4_MAX_PREFIX_LENGTH,
        gateway: isIPv6 ? IPV6_ADDRESS_ANY : IPV4_ADDRESS_ANY
      };
      // Now we can add the default route through gateway. Default route takes the
      // min prefix and destination ip 'any'.
      let defaultRoute = {
        ip: isIPv6 ? IPV6_ADDRESS_ANY : IPV4_ADDRESS_ANY,
        prefix: 0,
        gateway: gateways[i]
      };

      let promise = this._setSecondaryRoute(true, network.name, hostRoute)
        .then(() => this._setSecondaryRoute(true, network.name, defaultRoute));

      promises.push(promise);
    }

    return Promise.all(promises);
  },

  removeSecondaryDefaultRoute: function(network) {
    let gateways = network.getGateways();
    let promises = [];

    for (let i = 0; i < gateways.length; i++) {
      let isIPv6 = (gateways[i].indexOf(":") != -1) ? true : false;
      // Remove both default route and host route.
      let defaultRoute = {
        ip: isIPv6 ? IPV6_ADDRESS_ANY : IPV4_ADDRESS_ANY,
        prefix: 0,
        gateway: gateways[i]
      };
      let hostRoute = {
        ip: gateways[i],
        prefix: isIPv6 ? IPV6_MAX_PREFIX_LENGTH : IPV4_MAX_PREFIX_LENGTH,
        gateway: isIPv6 ? IPV6_ADDRESS_ANY : IPV4_ADDRESS_ANY
      };

      let promise = this._setSecondaryRoute(false, network.name, defaultRoute)
        .then(() => this._setSecondaryRoute(false, network.name, hostRoute));

      promises.push(promise);
    }

    return Promise.all(promises);
  },

  /**
   * Determine the active interface and configure it.
   */
  setAndConfigureActive: function() {
    debug("Evaluating whether active network needs to be changed.");
    let oldActive = this._activeNetwork;

    if (this._overriddenActive) {
      debug("We have an override for the active network: " +
            this._overriddenActive.info.name);
      // The override was just set, so reconfigure the network.
      if (this._activeNetwork != this._overriddenActive) {
        this._activeNetwork = this._overriddenActive;
        this._setDefaultRouteAndProxy(this._activeNetwork, oldActive);
        Services.obs.notifyObservers(this.activeNetworkInfo,
                                     TOPIC_ACTIVE_CHANGED, null);
      }
      return;
    }

    // The active network is already our preferred type.
    if (this.activeNetworkInfo &&
        this.activeNetworkInfo.state == Ci.nsINetworkInfo.NETWORK_STATE_CONNECTED &&
        this.activeNetworkInfo.type == this._preferredNetworkType) {
      debug("Active network is already our preferred type.");
      return this._setDefaultRouteAndProxy(this._activeNetwork, oldActive);
    }

    // Find a suitable network interface to activate.
    this._activeNetwork = null;
    let anyConnected = false;

    for (let key in this.networkInterfaces) {
      let network = this.networkInterfaces[key];
      if (network.info.state != Ci.nsINetworkInfo.NETWORK_STATE_CONNECTED) {
        continue;
      }
      anyConnected = true;

      // Set active only for default connections.
      if (network.info.type != Ci.nsINetworkInfo.NETWORK_TYPE_WIFI &&
          network.info.type != Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE &&
          network.info.type != Ci.nsINetworkInfo.NETWORK_TYPE_ETHERNET) {
        continue;
      }

      if (network.info.type == this.preferredNetworkType) {
        this._activeNetwork = network;
        debug("Found our preferred type of network: " + network.info.name);
        break;
      }

      // Initialize the active network with the first connected network.
      if (!this._activeNetwork) {
        this._activeNetwork = network;
        continue;
      }

      // Compare the prioriy between two network types. If found incoming
      // network with higher priority, replace the active network.
      if (this.getPriority(this._activeNetwork.info.type) < this.getPriority(network.info.type)) {
        this._activeNetwork = network;
      }
    }

    return Promise.resolve()
      .then(() => {
        if (!this._activeNetwork) {
          return Promise.resolve();
        }

        return this._setDefaultRouteAndProxy(this._activeNetwork, oldActive);
      })
      .then(() => {
        if (this._activeNetwork != oldActive) {
          Services.obs.notifyObservers(this.activeNetworkInfo,
                                       TOPIC_ACTIVE_CHANGED, null);
        }

        if (this._manageOfflineStatus) {
          Services.io.offline = !anyConnected &&
                                (gTetheringService.state ===
                                 Ci.nsITetheringService.TETHERING_STATE_INACTIVE);
        }
      });
  },

  resolveHostname: function(aNetworkInfo, aHostname) {
    // Sanity check for null, undefined and empty string... etc.
    if (!aHostname) {
      return Promise.reject(new Error("hostname is empty: " + aHostname));
    }

    if (aHostname.match(this.REGEXP_IPV4) ||
        aHostname.match(this.REGEXP_IPV6)) {
      return Promise.resolve([aHostname]);
    }

    // Wrap gDNSService.asyncResolveExtended to a promise, which
    // resolves with an array of ip addresses or rejects with
    // the reason otherwise.
    let hostResolveWrapper = aNetId => {
      return new Promise((aResolve, aReject) => {
        // Callback for gDNSService.asyncResolveExtended.
        let onLookupComplete = (aRequest, aRecord, aStatus) => {
          if (!Components.isSuccessCode(aStatus)) {
            aReject(new Error("Failed to resolve '" + aHostname +
                              "', with status: " + aStatus));
            return;
          }

          let retval = [];
          while (aRecord.hasMore()) {
            retval.push(aRecord.getNextAddrAsString());
          }

          if (!retval.length) {
            aReject(new Error("No valid address after DNS lookup!"));
            return;
          }

          debug("hostname is resolved: " + aHostname);
          debug("Addresses: " + JSON.stringify(retval));

          aResolve(retval);
        };

        debug('Calling gDNSService.asyncResolveExtended: ' + aNetId + ', ' + aHostname);
        gDNSService.asyncResolveExtended(aHostname,
                                         0,
                                         aNetId,
                                         onLookupComplete,
                                         Services.tm.mainThread);
      });
    };

    // TODO: |getNetId| will be implemented as a sync call in nsINetworkManager
    //       once Bug 1141903 is landed.
    return gNetworkService.getNetId(aNetworkInfo.name)
      .then(aNetId => hostResolveWrapper(aNetId));
  },

  convertConnectionType: function(aNetworkInfo) {
    // If there is internal interface change (e.g., MOBILE_MMS, MOBILE_SUPL),
    // the function will return null so that it won't trigger type change event
    // in NetworkInformation API. (Check nsAppShell.cpp)
    if (aNetworkInfo.type != Ci.nsINetworkInfo.NETWORK_TYPE_WIFI &&
        aNetworkInfo.type != Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE &&
        aNetworkInfo.type != Ci.nsINetworkInfo.NETWORK_TYPE_ETHERNET) {
      return null;
    }

    if (aNetworkInfo.state == Ci.nsINetworkInfo.NETWORK_STATE_DISCONNECTED) {
      return CONNECTION_TYPE_NONE;
    }

    switch (aNetworkInfo.type) {
      case Ci.nsINetworkInfo.NETWORK_TYPE_WIFI:
        return CONNECTION_TYPE_WIFI;
      case Ci.nsINetworkInfo.NETWORK_TYPE_MOBILE:
        return CONNECTION_TYPE_CELLULAR;
      case Ci.nsINetworkInfo.NETWORK_TYPE_ETHERNET:
        return CONNECTION_TYPE_ETHERNET;
    }
  },

  _setDNS: function(aNetworkInfo) {
    return new Promise((aResolve, aReject) => {
      let dnses = aNetworkInfo.getDnses();
      gNetworkService.setDNS(aNetworkInfo.name, dnses.length, dnses, (aError) => {
        if (aError) {
          aReject("setDNS failed");
          return;
        }
        aResolve();
      });
    });
  },

  _setMtu: function(aNetwork) {
    return new Promise((aResolve, aReject) => {
      gNetworkService.setMtu(aNetwork.info.name, aNetwork.mtu, (aSuccess) => {
        if (!aSuccess) {
          debug("setMtu failed");
        }
        // Always resolve.
        aResolve();
      });
    });
  },

  _createNetwork: function(aInterfaceName, aNetworkType) {
    return new Promise((aResolve, aReject) => {
      gNetworkService.createNetwork(aInterfaceName, aNetworkType, (aSuccess) => {
        if (!aSuccess) {
          aReject("createNetwork failed");
          return;
        }
        aResolve();
      });
    });
  },

  _destroyNetwork: function(aInterfaceName, aNetworkType) {
    return new Promise((aResolve, aReject) => {
      gNetworkService.destroyNetwork(aInterfaceName, aNetworkType, (aSuccess) => {
        if (!aSuccess) {
          debug("destroyNetwork failed")
        }
        // Always resolve.
        aResolve();
      });
    });
  },

  _resetRoutingTable: function(aInterfaceName) {
    return new Promise((aResolve, aReject) => {
      gNetworkService.resetRoutingTable(aInterfaceName, (aSuccess) => {
        if (!aSuccess) {
          debug("resetRoutingTable failed");
        }
        // Always resolve.
        aResolve();
      });
    });
  },

  _removeDefaultRoute: function(aNetworkInfo) {
    return new Promise((aResolve, aReject) => {
      let gateways = aNetworkInfo.getGateways();
      gNetworkService.removeDefaultRoute(aNetworkInfo.name, gateways.length,
                                         gateways, (aSuccess) => {
        if (!aSuccess) {
          debug("removeDefaultRoute failed");
        }
        // Always resolve.
        aResolve();
      });
    });
  },

  _setDefaultRoute: function(aNetworkInfo) {
    debug("_setDefaultRoute for Iface=" + aNetworkInfo.name);
    return new Promise((aResolve, aReject) => {
      let networkInfo = aNetworkInfo;
      let gateways = networkInfo.getGateways();

      gNetworkService.setDefaultRoute(networkInfo.name, gateways.length, gateways,
                                      false, (aSuccess) => {
        if (!aSuccess) {
          debug("setDefaultRoute failed");
        }
        // Always resolve.
        aResolve();
      });
    });
  },

  _setDefaultRouteAndProxy: function(aNetwork, aOldNetwork) {
    if (aOldNetwork) {
      return this._removeDefaultRoute(aOldNetwork.info)
        .then(() => this._setDefaultRouteAndProxy(aNetwork, null));
    }

    return new Promise((aResolve, aReject) => {
      let networkInfo = aNetwork.info;
      let gateways = networkInfo.getGateways();

      gNetworkService.setDefaultRoute(networkInfo.name, gateways.length, gateways,
                                      true, () => {
        this.setNetworkProxy(aNetwork);
        aResolve();
      });
    });
  },

  requestClat: function(aNetworkInfo) {
    let connected = (aNetworkInfo.state == Ci.nsINetworkInfo.NETWORK_STATE_CONNECTED);
    if (!connected) {
      return Promise.resolve(false);
    }

    return new Promise((aResolve, aReject) => {
      let hasIpv4 = false;
      let ips = {};
      let prefixLengths = {};
      let length = aNetworkInfo.getAddresses(ips, prefixLengths);
      for (let i = 0; i < length; i++) {
        debug("requestClat routes: " + ips.value[i] + "/" + prefixLengths.value[i]);
        if (ips.value[i].match(this.REGEXP_IPV4)) {
          hasIpv4 = true;
          break;
        }
      }
      debug("requestClat hasIpv4 = " + hasIpv4);
      aResolve(!hasIpv4);
    });
  },

  updateClat: function(aNetworkInfo, aNetworkId) {
    debug("UpdateClat Type = " + convertToDataCallType(aNetworkInfo.type) + " , networkID = " + aNetworkId);
    if (!this.isNetworkTypeMobile(aNetworkInfo.type) &&
        (aNetworkInfo.type != Ci.nsINetworkInfo.NETWORK_TYPE_WIFI)) {
      return Promise.resolve();
    }

    return new Promise((aResolve, aReject) => {
      let currentIfaceLinks = this.networkInterfaceLinks[aNetworkId];

      let wasRunning = ((currentIfaceLinks.clatd != null) &&
                          currentIfaceLinks.clatd.isStarted());
      this.requestClat(aNetworkInfo)
        .then( (shouldRun) => {
          debug("UpdateClat wasRunning = " + wasRunning + " , shouldRun = " + shouldRun);
          if (!wasRunning && shouldRun) {
            currentIfaceLinks.clatd = new Nat464Xlat(aNetworkInfo);
            currentIfaceLinks.clatd.start();
          } else if (wasRunning && !shouldRun) {
            currentIfaceLinks.clatd.stop();
            currentIfaceLinks.clatd = null;
          }
          aResolve();
        });
    });
  },

  setNetworkProxy: function(aNetwork) {
    try {
      if (!aNetwork.httpProxyHost || aNetwork.httpProxyHost === "") {
        // Sets direct connection to internet.
        this.clearNetworkProxy();

        debug("No proxy support for " + aNetwork.info.name + " network interface.");
        return;
      }

      debug("Going to set proxy settings for " + aNetwork.info.name + " network interface.");

      // Do not use this proxy server for all protocols.
      Services.prefs.setBoolPref("network.proxy.share_proxy_settings", false);
      Services.prefs.setCharPref("network.proxy.http", aNetwork.httpProxyHost);
      Services.prefs.setCharPref("network.proxy.ssl", aNetwork.httpProxyHost);
      let port = aNetwork.httpProxyPort === 0 ? 8080 : aNetwork.httpProxyPort;
      Services.prefs.setIntPref("network.proxy.http_port", port);
      Services.prefs.setIntPref("network.proxy.ssl_port", port);

      let usePAC;
      try {
        usePAC = Services.prefs.getBoolPref("network.proxy.pac_generator");
      } catch (ex) {}

      if (usePAC) {
        Services.prefs.setCharPref("network.proxy.autoconfig_url",
                                   gPACGenerator.generate());
        Services.prefs.setIntPref("network.proxy.type", PROXY_TYPE_PAC);
      } else {
        Services.prefs.setIntPref("network.proxy.type", PROXY_TYPE_MANUAL);
      }
    } catch(ex) {
        debug("Exception " + ex + ". Unable to set proxy setting for " +
              aNetwork.info.name + " network interface.");
    }
  },

  clearNetworkProxy: function() {
    debug("Going to clear all network proxy.");

    Services.prefs.clearUserPref("network.proxy.share_proxy_settings");
    Services.prefs.clearUserPref("network.proxy.http");
    Services.prefs.clearUserPref("network.proxy.http_port");
    Services.prefs.clearUserPref("network.proxy.ssl");
    Services.prefs.clearUserPref("network.proxy.ssl_port");

    let usePAC;
    try {
      usePAC = Services.prefs.getBoolPref("network.proxy.pac_generator");
    } catch (ex) {}

    if (usePAC) {
      Services.prefs.setCharPref("network.proxy.autoconfig_url",
                                 gPACGenerator.generate());
      Services.prefs.setIntPref("network.proxy.type", PROXY_TYPE_PAC);
    } else {
      Services.prefs.clearUserPref("network.proxy.type");
    }
  },
};

var CaptivePortalDetectionHelper = (function() {

  const EVENT_CONNECT = "Connect";
  const EVENT_DISCONNECT = "Disconnect";
  let _ongoingInterface = null;
  let _lastCaptivePortalStatus = EVENT_DISCONNECT;
  let _available = ("nsICaptivePortalDetector" in Ci);
  let getService = function() {
    return Cc['@mozilla.org/toolkit/captive-detector;1']
             .getService(Ci.nsICaptivePortalDetector);
  };

  let _performDetection = function(interfaceName, callback) {
    let capService = getService();
    let capCallback = {
      QueryInterface: XPCOMUtils.generateQI([Ci.nsICaptivePortalCallback]),
      prepare: function() {
        capService.finishPreparation(interfaceName);
      },
      complete: function(success) {
        _ongoingInterface = null;
        callback(success);
      }
    };

    // Abort any unfinished captive portal detection.
    if (_ongoingInterface != null) {
      capService.abort(_ongoingInterface);
      _ongoingInterface = null;
    }
    try {
      capService.checkCaptivePortal(interfaceName, capCallback);
      _ongoingInterface = interfaceName;
    } catch (e) {
      debug('Fail to detect captive portal due to: ' + e.message);
    }
  };

  let _abort = function(interfaceName) {
    if (_ongoingInterface !== interfaceName) {
      return;
    }

    let capService = getService();
    capService.abort(_ongoingInterface);
    _ongoingInterface = null;
  };

  let _sendNotification = function(landing) {
    if (landing == NetworkManager.prototype._wifiCaptivePortalLanding) {
      return;
    }
    NetworkManager.prototype._wifiCaptivePortalLanding = landing;
    let propBag = Cc["@mozilla.org/hash-property-bag;1"].
      createInstance(Ci.nsIWritablePropertyBag);
    propBag.setProperty("landing", landing);
    Services.obs.notifyObservers(propBag, "wifi-captive-portal-result", null);
  };

  return {
    EVENT_CONNECT: EVENT_CONNECT,
    EVENT_DISCONNECT: EVENT_DISCONNECT,
    notify: function(eventType, network) {
      switch (eventType) {
        case EVENT_CONNECT:
          // perform captive portal detection on wifi interface
          if (_available && network &&
              network.type == Ci.nsINetworkInfo.NETWORK_TYPE_WIFI &&
              _lastCaptivePortalStatus !== EVENT_CONNECT) {
            _lastCaptivePortalStatus = EVENT_CONNECT;
            _performDetection(network.name, function(success) {
              _sendNotification(success);
            });
          }

          break;
        case EVENT_DISCONNECT:
          if (_available &&
              network.type == Ci.nsINetworkInfo.NETWORK_TYPE_WIFI &&
              _lastCaptivePortalStatus !== EVENT_DISCONNECT) {
            _lastCaptivePortalStatus = EVENT_DISCONNECT;
            _abort(network.name);
            _sendNotification(false);
          }
          break;
      }
    }
  };
}());

XPCOMUtils.defineLazyGetter(NetworkManager.prototype, "mRil", function() {
  try {
    return Cc["@mozilla.org/ril;1"].getService(Ci.nsIRadioInterfaceLayer);
  } catch (e) {}

  return null;
});

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([NetworkManager]);

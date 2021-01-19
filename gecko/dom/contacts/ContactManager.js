/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const DEBUG = false;
function debug(s) { dump("-*- ContactManager: " + s + "\n"); }

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/DOMRequestHelper.jsm");

XPCOMUtils.defineLazyServiceGetter(Services, "DOMRequest",
                                   "@mozilla.org/dom/dom-request-service;1",
                                   "nsIDOMRequestService");

XPCOMUtils.defineLazyServiceGetter(this, "cpmm",
                                   "@mozilla.org/childprocessmessagemanager;1",
                                   "nsIMessageSender");

const CONTACTS_SENDMORE_MINIMUM = 5;

// We need this to create a copy of the mozContact object in ContactManager.save
// Keep in sync with the interfaces.
const PROPERTIES = [
  "name", "honorificPrefix", "givenName", "additionalName", "familyName",
  "phoneticGivenName", "phoneticFamilyName",
  "honorificSuffix", "nickname", "photo", "category", "org", "jobTitle",
  "bday", "note", "anniversary", "sex", "genderIdentity", "key", "adr", "email",
  "url", "impp", "tel", "ringtone", "group"
];

var mozContactInitWarned = false;

function Contact() { }

Contact.prototype = {
  __init: function(aProp) {
    for (let prop in aProp) {
      this[prop] = aProp[prop];
    }
  },

  init: function(aProp) {
    // init is deprecated, warn once in the console if it's used
    if (!mozContactInitWarned) {
      mozContactInitWarned = true;
      Cu.reportError("mozContact.init is DEPRECATED. Use the mozContact constructor instead. " +
                     "See https://developer.mozilla.org/docs/WebAPI/Contacts for details.");
    }

    for (let prop of PROPERTIES) {
      this[prop] = aProp[prop];
    }
  },

  setMetadata: function(aId, aPublished, aUpdated) {
    this.id = aId;
    if (aPublished) {
      this.published = aPublished;
    }
    if (aUpdated) {
      this.updated = aUpdated;
    }
  },

  classID: Components.ID("{72a5ee28-81d8-4af8-90b3-ae935396cc66}"),
  contractID: "@mozilla.org/contact;1",
  QueryInterface: XPCOMUtils.generateQI([Ci.nsISupports]),
};

function ContactManager() { }

ContactManager.prototype = {
  __proto__: DOMRequestIpcHelper.prototype,
  hasListenPermission: false,
  _cachedContacts: [] ,

  set oncontactchange(aHandler) {
    this.__DOM_IMPL__.setEventHandler("oncontactchange", aHandler);
  },

  get oncontactchange() {
    return this.__DOM_IMPL__.getEventHandler("oncontactchange");
  },

  set onspeeddialchange(aHandler) {
    this.__DOM_IMPL__.setEventHandler("onspeeddialchange", aHandler);
  },

  get onspeeddialchange() {
    return this.__DOM_IMPL__.getEventHandler("onspeeddialchange");
  },

  set oncontactgroupchange(aHandler) {
    this.__DOM_IMPL__.setEventHandler("oncontactgroupchange", aHandler);
  },

  get oncontactgroupchange() {
    return this.__DOM_IMPL__.getEventHandler("oncontactgroupchange");
  },

  _convertContact: function(aContact) {
    if (aContact) {
      let properties = aContact.properties;
      if (properties.photo && properties.photo.length) {
        properties.photo = Cu.cloneInto(properties.photo, this._window);
      }
      let newContact = new this._window.mozContact(aContact.properties);
      newContact.setMetadata(aContact.id, aContact.published, aContact.updated);
      return newContact;
    }
  },

  _convertContacts: function(aContacts) {
    let contacts = new this._window.Array();
    for (let i in aContacts) {
      contacts.push(this._convertContact(aContacts[i]));
    }
    return contacts;
  },

  _convertSpeedDials: function(aSpeedDials) {
    return this._convertWindowObjectArray(aSpeedDials);
  },

  _convertGroups: function(aGroups) {
    return this._convertWindowObjectArray(aGroups);
  },

  _convertGroup: function(aGroup) {
    return this._convertWindowObject(aGroup);
  },

  _convertWindowObjectArray: function(aArray) {
    let objectArray = new this._window.Array();
    for (let i in aArray) {
      let newObject = this._convertWindowObject(aArray[i]);
      objectArray.push(newObject);
    }

    return objectArray;
  },

  _convertWindowObject: function(aSrouce) {
    let newObject = new this._window.Object();
    for (let prop in aSrouce) {
      newObject[prop] = aSrouce[prop];
    }
    return newObject;
  },

  _fireSuccessOrDone: function(aCursor, aResult) {
    if (aResult == null) {
      Services.DOMRequest.fireDone(aCursor);
    } else {
      Services.DOMRequest.fireSuccess(aCursor, aResult);
    }
  },

  _pushArray: function(aArr1, aArr2) {
    aArr1.push.apply(aArr1, aArr2);
  },

  receiveMessage: function(aMessage) {
    if (DEBUG) debug("receiveMessage: " + aMessage.name);
    let msg = aMessage.json;
    let contacts = msg.contacts;

    let req;
    switch (aMessage.name) {
      case "Contacts:Find:Return:OK":
        req = this.getRequest(msg.requestID);
        if (req) {
          let result = this._convertContacts(contacts);
          Services.DOMRequest.fireSuccess(req.request, result);
        } else {
          if (DEBUG) debug("no request stored!" + msg.requestID);
        }
        break;
      case "Contacts:GetAll:Next":
      case "Contacts:FindWithCursor:Return:OK":
        let data = this.getRequest(msg.cursorId);
        if (!data) {
          break;
        }
        let result = contacts || [null];
        if (data.waitingForNext) {
          if (DEBUG) debug("cursor waiting for contact, sending");
          data.waitingForNext = false;
          let contact = result.shift();
          contact = contact ? this._convertContact(contact) : null;
          this._pushArray(data.cachedContacts, result);
          this.nextTick(this._fireSuccessOrDone.bind(this, data.cursor, contact));
          if (!contact) {
            this.removeRequest(msg.cursorId);
          }
        } else {
          if (DEBUG) debug("cursor not waiting, saving");
          this._pushArray(data.cachedContacts, result);
        }
        break;
      case "Contact:Save:Return:OK":
        // If a cached contact was saved and a new contact ID was returned, update the contact's ID
        if (this._cachedContacts[msg.requestID]) {
          if (msg.contactID) {
            this._cachedContacts[msg.requestID].id = msg.contactID;
          }
          delete this._cachedContacts[msg.requestID];
        }
        /* falls through */
      case "Contacts:Clear:Return:OK":
      case "Contact:Remove:Return:OK":
      case "Contacts:RemoveSpeedDial:Return:OK":
      case "Contacts:SetSpeedDial:Return:OK":
      case "Contacts:SaveGroup:Return:OK":
      case "Contacts:RemoveGroup:Return:OK":
        req = this.getRequest(msg.requestID);
        if (req) {
          Services.DOMRequest.fireSuccess(req.request, null);
        }
        break;
      case "Contacts:GetSpeedDials:Return:OK":
        req = this.getRequest(msg.requestID);
        if (req) {
          let result = this._convertSpeedDials(msg.speedDials);
          Services.DOMRequest.fireSuccess(req.request, result);
        }
        break;
      case "Contacts:SpeedDial:Changed":
        // Fire onspeeddailchange event
        if (DEBUG) debug("Contacts:SpeedDialChanged: " + msg.speedDial + ", " + msg.reason);
        let speedDialEvent = new this._window.SpeedDialChangeEvent("speeddialchange", {
          speedDial: msg.speedDial,
          reason: msg.reason
        });
        this.dispatchEvent(speedDialEvent);
        break;
      case "Contacts:Find:Return:KO":
      case "Contact:Save:Return:KO":
      case "Contact:Remove:Return:KO":
      case "Contacts:Clear:Return:KO":
      case "Contacts:GetRevision:Return:KO":
      case "Contacts:Count:Return:KO":
      case "Contacts:GetSpeedDials:Return:KO":
      case "Contacts:SetSpeedDial:Return:KO":
      case "Contacts:RemoveSpeedDial:Return:KO":
      case "Contacts:GetAllGroups:Return:KO":
      case "Contacts:FindGroups:Return:KO":
      case "Contacts:SaveGroup:Return:KO":
      case "Contacts:RemoveGroup:Return:KO":
        req = this.getRequest(msg.requestID);
        if (req) {
          if (req.request) {
            req = req.request;
          }
          Services.DOMRequest.fireError(req, msg.errorMsg);
        }
        break;
      case "Contacts:GetAll:Return:KO":
      case "Contacts:FindWithCursor:Return:KO":
        req = this.getRequest(msg.requestID);
        if (req) {
          Services.DOMRequest.fireError(req.cursor, msg.errorMsg);
        }
        break;
      case "Contact:Changed":
        // Fire oncontactchange event
        if (DEBUG) debug("Contacts:ContactChanged: " + msg.contactID + ", " + msg.reason);
        let event = new this._window.MozContactChangeEvent("contactchange", {
          contactID: msg.contactID,
          reason: msg.reason,
          contact: this._convertContact(msg.contact)
        });
        this.dispatchEvent(event);
        break;
      case "Contacts:Revision":
        if (DEBUG) debug("new revision: " + msg.revision);
        req = this.getRequest(msg.requestID);
        if (req) {
          Services.DOMRequest.fireSuccess(req.request, msg.revision);
        }
        break;
      case "Contacts:Count":
        if (DEBUG) debug("count: " + msg.count);
        req = this.getRequest(msg.requestID);
        if (req) {
          Services.DOMRequest.fireSuccess(req.request, msg.count);
        }
        break;
      case "Contacts:GetAllGroups:Return:OK":
        if (DEBUG) debug("Contacts:GetAllGroups:Return:OK");
        let getAllGroupsData = this.getRequest(msg.cursorId);

        if (!getAllGroupsData) {
          break;
        }
        let getAllGroupsResult = msg.groups;
        if (getAllGroupsData.waitingForNext) {
          getAllGroupsData.waitingForNext = false;
          let group = getAllGroupsResult.shift();
          group = group ? this._convertWindowObject(group) : null;
          this._pushArray(getAllGroupsData.cachedGroups, getAllGroupsResult);
          this.nextTick(this._fireSuccessOrDone.bind(this, getAllGroupsData.cursor, group));
          if (!group) {
            this.removeRequest(msg.cursorId);
          }
        } else {
          if (DEBUG) debug("cursor not waiting, saving");
          this._pushArray(getAllGroupsData.cachedGroups, getAllGroupsResult);
        }
        break;
      case "Contacts:FindGroups:Return:OK":
        if (DEBUG) debug("Contacts:FindGroups:Return:OK");
        req = this.getRequest(msg.requestID);
        if (req) {
          let groups = this._convertGroups(msg.groups);
          Services.DOMRequest.fireSuccess(req.request, groups);
        } else {
          if (DEBUG) debug("no request stored!" + msg.requestID);
        }
        break;
      case "Contacts:Group:Changed":
        // Fire oncontactgroupchange event
        if (DEBUG) debug("Contacts:GroupChanged: " + msg.groupId + ", " + msg.reason);
        let groupEvent = new this._window.ContactGroupChangeEvent("contactgroupchange", {
          groupId: msg.groupId,
          groupName: msg.groupName,
          reason: msg.reason
        });
        this.dispatchEvent(groupEvent);
      break;
      default:
        if (DEBUG) debug("Wrong message: " + aMessage.name);
    }
    this.removeRequest(msg.requestID);
  },

  dispatchEvent: function(event) {
    if (this.hasListenPermission) {
      this.__DOM_IMPL__.dispatchEvent(event);
    }
  },

  askPermission: function (aAccess, aRequest, aAllowCallback, aCancelCallback) {
    if (DEBUG) debug("askPermission for contacts");

    let access;
    switch(aAccess) {
      case "create":
        access = "create";
        break;
      case "update":
      case "remove":
        access = "write";
        break;
      case "find":
      case "listen":
      case "revision":
      case "count":
        access = "read";
        break;
      default:
        access = "unknown";
      }

    // Shortcut for ALLOW_ACTION so we avoid a parent roundtrip
    let principal = this._window.document.nodePrincipal;
    let type = "contacts-" + access;
    let permValue =
      Services.perms.testExactPermissionFromPrincipal(principal, type);
    if (DEBUG) debug("Existing permission " + permValue);
    if (permValue == Ci.nsIPermissionManager.ALLOW_ACTION) {
      if (aAllowCallback) {
        aAllowCallback();
      }
      return;
    } else if (permValue == Ci.nsIPermissionManager.DENY_ACTION ||
               permValue == Ci.nsIPermissionManager.UNKNOWN_ACTION) {
      if (aCancelCallback) {
        aCancelCallback("PERMISSION_DENIED");
      }
      return;
    }

    // Create an array with a single nsIContentPermissionType element.
    type = {
      type: "contacts",
      access: access,
      options: [],
      QueryInterface: XPCOMUtils.generateQI([Ci.nsIContentPermissionType])
    };
    let typeArray = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    typeArray.appendElement(type, false);

    // create a nsIContentPermissionRequest
    let request = {
      types: typeArray,
      principal: principal,
      QueryInterface: XPCOMUtils.generateQI([Ci.nsIContentPermissionRequest]),
      allow: function() {
        aAllowCallback && aAllowCallback();
        DEBUG && debug("Permission granted. Access " + access +"\n");
      },
      cancel: function() {
        aCancelCallback && aCancelCallback("PERMISSION_DENIED");
        DEBUG && debug("Permission denied. Access " + access +"\n");
      },
      window: this._window
    };

    // Using askPermission from nsIDOMWindowUtils that takes care of the
    // remoting if needed.
    let windowUtils = this._window.QueryInterface(Ci.nsIInterfaceRequestor)
                          .getInterface(Ci.nsIDOMWindowUtils);
    windowUtils.askPermission(request);
  },

  save: function save(aContact) {
    // We have to do a deep copy of the contact manually here because
    // nsFrameMessageManager doesn't know how to create a structured clone of a
    // mozContact object.
    let newContact = {properties: {}};

    if (DEBUG) debug("save contact: " + JSON.stringify(aContact));

    try {
      for (let field of PROPERTIES) {
        // This hack makes sure modifications to the sequence attributes get validated.
        aContact[field] = aContact[field];
        if (field === "ringtone" && !aContact[field]) {
          aContact[field] = null;
        }

        newContact.properties[field] = aContact[field];
      }
    } catch (e) {
      // And then make sure we throw a proper error message (no internal file and line #)
      throw new this._window.Error(e.message);
    }

    let request = this.createRequest();
    let requestID = this.getRequestId({request: request});

    let reason;
    if (aContact.id == "undefined") {
      // for example {25c00f01-90e5-c545-b4d4-21E2ddbab9e0} becomes
      // 25c00f0190e5c545b4d421E2ddbab9e0
      aContact.id = this._getRandomId().replace(/[{}-]/g, "");
      // Cache the contact so that its ID may be updated later if necessary
      this._cachedContacts[requestID] = aContact;
      reason = "create";
    } else {
      reason = "update";
    }

    newContact.id = aContact.id;
    newContact.published = aContact.published;
    newContact.updated = aContact.updated;

    if (DEBUG) debug("send: " + JSON.stringify(newContact));

    let options = { contact: newContact, reason: reason };
    let allowCallback = function() {
      cpmm.sendAsyncMessage("Contact:Save", {
        requestID: requestID,
        options: options
      });
    }.bind(this);

    let cancelCallback = function(reason) {
      Services.DOMRequest.fireErrorAsync(request, reason);
    };

    this.askPermission(reason, request, allowCallback, cancelCallback);
    return request;
  },

  find: function(aOptions) {
    if (DEBUG) debug("find! " + JSON.stringify(aOptions));
    let request = this.createRequest();
    let options = { findOptions: aOptions };

    let allowCallback = function() {
      cpmm.sendAsyncMessage("Contacts:Find", {
        requestID: this.getRequestId({request: request, reason: "find"}),
        options: options
      });
    }.bind(this);

    let cancelCallback = function(reason) {
      Services.DOMRequest.fireErrorAsync(request, reason);
    };

    this.askPermission("find", request, allowCallback, cancelCallback);
    return request;
  },

  createCursor: function CM_createCursor(aRequest) {
    let data = {
      cursor: Services.DOMRequest.createCursor(this._window, function() {
        this.handleContinue(id);
      }.bind(this)),
      cachedContacts: [],
      waitingForNext: true,
      cachedGroups: [],
      request: aRequest
    };
    let id = this.getRequestId(data);
    if (DEBUG) debug("saved cursor id: " + id);
    return [id, data.cursor];
  },

  getAll: function CM_getAll(aOptions) {
    return this._getWithCursor("GetAll", aOptions);
  },

  findWithCursor: function CM_findWithCursor(aOptions) {
    return this._getWithCursor("FindWithCursor", aOptions);
  },

  _getWithCursor: function CM_getWithCursor(aRequest, aOptions) {
    if (DEBUG) debug(aRequest + ": " + JSON.stringify(aOptions));
    let [cursorId, cursor] = this.createCursor(aRequest);

    let allowCallback = function() {
      if (DEBUG) debug(aRequest + " send finall asyncmessage");
      let msg = "Contacts:" + aRequest;
      cpmm.sendAsyncMessage(msg, {
        cursorId: cursorId,
        findOptions: aOptions
      });
    }.bind(this);

    let cancelCallback = function(reason) {
      if (DEBUG) debug(aRequest + " cancelCallback");
      Services.DOMRequest.fireErrorAsync(cursor, reason);
    };

    this.askPermission("find", cursor, allowCallback, cancelCallback);
    return cursor;
  },

  nextTick: function nextTick(aCallback) {
    Services.tm.currentThread.dispatch(aCallback, Ci.nsIThread.DISPATCH_NORMAL);
  },

  handleContinue: function CM_handleContinue(aCursorId) {
    if (DEBUG) debug("handleContinue: " + aCursorId);
    let data = this.getRequest(aCursorId);

    switch(data.request) {
      case 'GetAll':
        this._handleContinueGetAll(aCursorId, data);
        break;
      case 'FindWithCursor':
        this._handleContinueFindWithCursor(aCursorId, data);
        break;
      case 'GetAllGroups':
        this._handleContinueGetAllGroups(aCursorId, data);
        break;
      default:
        if (DEBUG) debug('unexpected request: ' + data.request);
        break;
    }
  },

  _handleContinueGetAll: function CM_handleContinueGetAll(aCursorId, aData) {
    if (DEBUG) debug("_handleContinueGetAll: " + aCursorId);
    if (aData.cachedContacts.length > 0) {
      if (DEBUG) debug("contact in cache");
      let contact = aData.cachedContacts.shift();
      contact = contact ? this._convertContact(contact) : null;
      this.nextTick(this._fireSuccessOrDone.bind(this, aData.cursor, contact));
      if (!contact) {
        this.removeRequest(aCursorId);
      } else if (aData.cachedContacts.length === CONTACTS_SENDMORE_MINIMUM) {
        cpmm.sendAsyncMessage("Contacts:GetAll:SendNow", { cursorId: aCursorId });
      }
    } else {
      if (DEBUG) debug("waiting for contact");
      aData.waitingForNext = true;
    }
  },

  _handleContinueFindWithCursor: function CM__handleContinueFindWithCursor(aCursorId, aData) {
    if (DEBUG) debug("_handleContinueFindWithCursor: " + aCursorId);
    let converter = this._convertContact.bind(this);
    this._handleContinueWithCacheAll(aCursorId, aData, aData.cachedContacts, converter);
  },

  _handleContinueGetAllGroups: function CM_handleContinueGetAllGroups(aCursorId, aData) {
    if (DEBUG) debug("_handleContinueGetAllGroups: " + aCursorId);
    let converter = this._convertGroup.bind(this);
    this._handleContinueWithCacheAll(aCursorId, aData, aData.cachedGroups, converter);
  },

  _handleContinueWithCacheAll:
      function CM_handleContinueWithCacheAll(aCursorId, aData, aCachedDatas, aConverter) {
    if (aCachedDatas.length > 0) {
      let cacheData = aCachedDatas.shift();
      if (DEBUG) debug("data in cache");
      let data = aConverter(cacheData);
      this.nextTick(this._fireSuccessOrDone.bind(this, aData.cursor, data));
      if (!data) {
        this.removeRequest(aCursorId);
      }
    } else {
      this.nextTick(this._fireSuccessOrDone.bind(this, aData.cursor, null));
      this.removeRequest(aCursorId);
    }
  },

  remove: function removeContact(aRecordOrId) {
    let request = this.createRequest();
    let id;
    if (typeof aRecordOrId === "string") {
      id = aRecordOrId;
    } else if (!aRecordOrId || !aRecordOrId.id) {
      Services.DOMRequest.fireErrorAsync(request, true);
      return request;
    } else {
      id = aRecordOrId.id;
    }

    let options = { id: id };

    let allowCallback = function() {
      cpmm.sendAsyncMessage("Contact:Remove", {
        requestID: this.getRequestId({request: request, reason: "remove"}),
        options: options
      });
    }.bind(this);

    let cancelCallback = function(reason) {
      Services.DOMRequest.fireErrorAsync(request, reason);
    };

    this.askPermission("remove", request, allowCallback, cancelCallback);
    return request;
  },

  clear: function() {
    if (DEBUG) debug("clear");
    let request = this.createRequest();
    let options = {};

    let allowCallback = function() {
      cpmm.sendAsyncMessage("Contacts:Clear", {
        requestID: this.getRequestId({request: request, reason: "remove"}),
        options: options
      });
    }.bind(this);

    let cancelCallback = function(reason) {
      Services.DOMRequest.fireErrorAsync(request, reason);
    };

    this.askPermission("remove", request, allowCallback, cancelCallback);
    return request;
  },

  getRevision: function() {
    let request = this.createRequest();

    let allowCallback = function() {
      cpmm.sendAsyncMessage("Contacts:GetRevision", {
        requestID: this.getRequestId({ request: request })
      });
    }.bind(this);

    let cancelCallback = function(reason) {
      Services.DOMRequest.fireErrorAsync(request, reason);
    };

    this.askPermission("revision", request, allowCallback, cancelCallback);
    return request;
  },

  getCount: function() {
    let request = this.createRequest();

    let allowCallback = function() {
      cpmm.sendAsyncMessage("Contacts:GetCount", {
        requestID: this.getRequestId({ request: request })
      });
    }.bind(this);

    let cancelCallback = function(reason) {
      Services.DOMRequest.fireErrorAsync(request, reason);
    };

    this.askPermission("count", request, allowCallback, cancelCallback);
    return request;
  },

  getSpeedDials: function() {
    if (DEBUG) debug("getSpeedDials");

    let request = this.createRequest();

    let allowCallback = function() {
      cpmm.sendAsyncMessage("Contacts:GetSpeedDials", {
        requestID: this.getRequestId({ request: request })
      });
    }.bind(this);

    let cancelCallback = function(reason) {
      Services.DOMRequest.fireErrorAsync(request, reason);
    };

    this.askPermission("find", request, allowCallback, cancelCallback);
    return request;
  },

  setSpeedDial: function setSpeedDial(speedDial, tel, contactId) {
    if (DEBUG) debug("setSpeedDial: speedDial " + speedDial + " tel " + tel + (contactId ? (" contactId " + contactId) : ""));

    let request = this.createRequest();

    let allowCallback = function() {
      cpmm.sendAsyncMessage("Contacts:SetSpeedDial", {
        requestID: this.getRequestId({ request: request }),
        options: {
          speedDial: speedDial,
          tel: tel,
          contactId: (contactId ? contactId : null)
        }
      });
    }.bind(this);

    let cancelCallback = function(reason) {
      Services.DOMRequest.fireErrorAsync(request, reason);
    };

    this.askPermission("create", request, allowCallback, cancelCallback);
    return request;
  },

  removeSpeedDial: function removeSpeedDial(speedDial) {
    if (DEBUG) debug("removeSpeedDial: speedDial " + speedDial);

    let request = this.createRequest();

    let allowCallback = function() {
      cpmm.sendAsyncMessage("Contacts:RemoveSpeedDial", {
        requestID: this.getRequestId({ request: request }),
        options: {
          speedDial: speedDial
        }
      });
    }.bind(this);

    let cancelCallback = function(reason) {
      Services.DOMRequest.fireErrorAsync(request, reason);
    };

    this.askPermission("remove", request, allowCallback, cancelCallback);
    return request;
  },

  getAllGroups: function CM_getAllGroups(aOptions) {
    if (DEBUG) debug("getAllGroups " + JSON.stringify(aOptions));
    let [cursorId, cursor] = this.createCursor("GetAllGroups");
    let options = { findOptions: aOptions };

    let allowCallback = function() {
      cpmm.sendAsyncMessage("Contacts:GetAllGroups", {
        cursorId: cursorId,
        options: options
      });
    }.bind(this);

    let cancelCallback = function(reason) {
      Services.DOMRequest.fireErrorAsync(cursor, reason);
    };

    this.askPermission("find", cursor, allowCallback, cancelCallback);

    return cursor;
  },

  findGroups: function CM_findGroup(aOptions) {
    if (DEBUG) debug("findGroup: " + JSON.stringify(aOptions));
    let options = { findOptions: aOptions };
    return this._sendSimpleRequest("Contacts:FindGroups", options, "find");
  },

  saveGroup: function CM_saveGroup(aName, aId) {
    if (DEBUG) debug("saveGroup: " + aName + ", aId: " + aId);

    if (!aName) {
      let request = this.createRequest();
      Services.DOMRequest.fireErrorAsync(request, true);
      return request;
    }

    let permission = "update";
    if (!aId) {
      aId = this._getRandomId().replace(/[{}-]/g, "");
      permission = "create";
    }
    let options = {
      name: aName,
      id: aId,
      reason: permission
    };

    return this._sendSimpleRequest("Contacts:SaveGroup", options, permission);
  },

  removeGroup: function CM_removeGroup(aId) {
    if (DEBUG) debug("removeGroup: " + aId);
    if (!aId) {
      let request = this.createRequest();
      Services.DOMRequest.fireErrorAsync(request, true);
      return request;
    }

    let options = {
      id: aId
    };
    return this._sendSimpleRequest("Contacts:RemoveGroup", options, "remove");
  },

  _sendSimpleRequest: function sendSimpleRequest(aMessage, aOptions, aPermission) {
    let request = this.createRequest();
    let options = aOptions;

    let allowCallback = function() {
      cpmm.sendAsyncMessage(aMessage, {
        requestID: this.getRequestId({ request: request}),
        options: options
      });
    }.bind(this);

    let cancelCallback = function(reason) {
      Services.DOMRequest.fireErrorAsync(request, reason);
    };

    this.askPermission(aPermission, request, allowCallback, cancelCallback);

    return request;
  },

  init: function(aWindow) {
    // DOMRequestIpcHelper.initHelper sets this._window
    this.initDOMRequestHelper(aWindow, ["Contacts:Find:Return:OK", "Contacts:Find:Return:KO",
                              "Contacts:Clear:Return:OK", "Contacts:Clear:Return:KO",
                              "Contact:Save:Return:OK", "Contact:Save:Return:KO",
                              "Contact:Remove:Return:OK", "Contact:Remove:Return:KO",
                              "Contact:Changed",
                              "Contacts:GetAll:Next", "Contacts:GetAll:Return:KO",
                              "Contacts:Count",
                              "Contacts:Revision", "Contacts:GetRevision:Return:KO",
                              "Contacts:GetSpeedDials:Return:OK", "Contacts:GetSpeedDials:Return:KO",
                              "Contacts:SetSpeedDial:Return:OK", "Contacts:SetSpeedDial:Return:KO",
                              "Contacts:SpeedDial:Changed",
                              "Contacts:RemoveSpeedDial:Return:OK", "Contacts:RemoveSpeedDial:Return:KO",
                              "Contacts:GetAllGroups:Return:OK", "Contacts:GetAllGroups:Return:KO",
                              "Contacts:FindGroups:Return:OK", "Contacts:FindGroups:Return:KO",
                              "Contacts:SaveGroup:Return:OK", "Contacts:SaveGroup:Return:KO",
                              "Contacts:RemoveGroup:Return:OK", "Contacts:RemoveGroup:Return:KO",
                              "Contacts:Group:Changed",
                              "Contacts:FindWithCursor:Return:OK", "Contacts:FindWithCursor:Return:KO",]);

    let allowCallback = function() {
      cpmm.sendAsyncMessage("Contacts:RegisterForMessages");
      this.hasListenPermission = true;
    }.bind(this);

    this.askPermission("listen", null, allowCallback);
  },

  classID: Components.ID("{8beb3a66-d70a-4111-b216-b8e995ad3aff}"),
  contractID: "@mozilla.org/contactManager;1",
  QueryInterface: XPCOMUtils.generateQI([Ci.nsISupportsWeakReference,
                                         Ci.nsIObserver,
                                         Ci.nsIDOMGlobalPropertyInitializer]),
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([
  Contact, ContactManager
]);

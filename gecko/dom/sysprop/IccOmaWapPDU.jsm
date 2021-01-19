/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

let WSP = {};
Cu.import("resource://gre/modules/WspPduHelper.jsm", WSP);

Cu.import("resource://gre/modules/mms_consts.js");

Cu.import("resource://gre/modules/PhoneNumberUtils.jsm");

let DEBUG = true; // set to true to see debug messages

/**
 * Header-field = MMS-header | Application-header
 *
 * @see OMA-TS-MMS_ENC-V1_3-20110913-A clause 7.2
 */
this.HeaderField = {
  /**
   * @param data
   *        A wrapped object containing raw PDU data.
   * @param options
   *        Extra context for decoding.
   *
   * @return A decoded object containing `name` and `value` properties or null
   *         in case of a failed parsing. The `name` property must be a string,
   *         but the `value` property can be many different types depending on
   *         `name`.
   */
  decode: function(data, options) {
    return WSP.decodeAlternatives(data, options,
                                  MmsHeader, WSP.ApplicationHeader);
  },
};

/**
 * MMS-header = MMS-field-name MMS-value
 * MMS-field-name = Short-integer
 *
 * @see OMA-TS-MMS_ENC-V1_3-20110913-A clause 7.2
 */
this.MmsHeader = {
  /**
   * @param data
   *        A wrapped object containing raw PDU data.
   * @param options
   *        Extra context for decoding.
   *
   * @return A decoded object containing `name` and `value` properties or null
   *         in case of a failed parsing. The `name` property must be a string,
   *         but the `value` property can be many different types depending on
   *         `name`.
   *
   * @throws NotWellKnownEncodingError if decoded well-known header field
   *         number is not registered or supported.
   */
  decode: function(data, options) {
    let index = WSP.ShortInteger.decode(data);

    let entry = MMS_HEADER_FIELDS[index];
    if (!entry) {
      debug('MmsHeader decode --- !entry');
      throw new WSP.NotWellKnownEncodingError(
        "MMS-header: not well known header " + index);
    }

    let cur = data.offset, value;
    try {
      value = entry.coder.decode(data, options);
    } catch (e) {
      data.offset = cur;

      value = WSP.skipValue(data);
      debug("Skip malformed well known header: "
            + JSON.stringify({name: entry.name, value: value}));

      return null;
    }

    return {
      name: entry.name,
      value: value,
    };
  },
};

this.PduHelper = {
  /**
   * @param data
   *        A wrapped object containing raw PDU data.
   * @param headers
   *        An optional object to store parsed header fields. Created
   *        automatically if undefined.
   *
   * @return A boolean value indicating whether it's followed by message body.
   */
  parseHeaders: function(data, headers) {
    if (!headers) {
      headers = {};
    }

    let header;
    while (data.offset < data.array.length) {
      // There is no `header length` information in MMS PDU. If we just got
      // something wrong in parsing header fields, we might not be able to
      // determine the correct header-content boundary.
      header = HeaderField.decode(data, headers);

      if (header) {
        let orig = headers[header.name];
        if (Array.isArray(orig)) {
          headers[header.name].push(header.value);
        } else if (orig) {
          headers[header.name] = [orig, header.value];
        } else {
          headers[header.name] = header.value;
        }
        if (header.name == "content-type") {
          debug('parseHeaders header.name is content-type');
          // `... if the PDU contains a message body the Content Type MUST be
          // the last header field, followed by message body.` See
          // OMA-TS-MMS_ENC-V1_3-20110913-A section 7.
          break;
        }
      }
    }

    return headers;
  },

  /**
   * @param data
   *        A wrapped object containing raw PDU data.
   * @param msg
   *        A message object to store decoded multipart or octet array content.
   */
  parseContent: function(data, msg) {
    let contentType = msg.headers["content-type"].media;
    if ((contentType == "application/vnd.wap.multipart.related")
        || (contentType == "application/vnd.wap.multipart.mixed")) {
      debug('pduhelper parseContent multipart!');
      msg.parts = WSP.PduHelper.parseMultiPart(data);
      return;
    }

    if (data.offset >= data.array.length) {
      debug('data.offset bigger than data.array.length');
      return;
    }

    debug('pduhelper parseContent');
    msg.content = WSP.Octet.decodeMultiple(data, data.array.length);
    if (false) {
      for (let begin = 0; begin < msg.content.length; begin += 20) {
        debug("content: " + JSON.stringify(msg.content.subarray(begin, begin + 20)));
      }
    }
  },

  /**
   * Check existences of all mandatory fields of a MMS message. Also sets `type`
   * for convenient access.
   *
   * @param msg
   *        A MMS message object.
   *
   * @return The corresponding entry in MMS_PDU_TYPES;
   *
   * @throws FatalCodeError if the PDU type is not supported yet.
   */
  checkMandatoryFields: function(msg) {
    let type = WSP.ensureHeader(msg.headers, "x-mms-message-type");
    let entry = MMS_PDU_TYPES[type];
    if (!entry) {
      throw new WSP.FatalCodeError(
        "checkMandatoryFields: unsupported message type " + type);
    }

    entry.mandatoryFields.forEach(function(name) {
      WSP.ensureHeader(msg.headers, name);
    });

    // Setup convenient alias that referenced frequently.
    msg.type = type;

    return entry;
  },

  /**
   * @param data
   *        A wrapped object containing raw PDU data.
   * @param msg [optional]
   *        Optional target object for decoding.
   *
   * @return A MMS message object or null in case of errors found.
   */
  parse: function(data, msg) {
    debug('pduhelper::parse');
    if (!msg) {
      msg = {};
    }

    try {
      msg.headers = this.parseHeaders(data, msg.headers);
      this.parseContent(data, msg);
    } catch (e) {
      debug("Failed to parse MMS message, error message: " + e.message);
      return null;
    }

    return msg;
  },


const MMS_PDU_TYPES = (function() {
  let pdus = {};
  function add(number, hasContent, mandatoryFields) {
    pdus[number] = {
      number: number,
      hasContent: hasContent,
      mandatoryFields: mandatoryFields,
    };
  }

  add(MMS_PDU_TYPE_SEND_REQ, true, ["x-mms-message-type",
                                    "x-mms-transaction-id",
                                    "x-mms-mms-version",
                                    "from",
                                    "content-type"]);
  add(MMS_PDU_TYPE_SEND_CONF, false, ["x-mms-message-type",
                                      "x-mms-transaction-id",
                                      "x-mms-mms-version",
                                      "x-mms-response-status"]);
  add(MMS_PDU_TYPE_NOTIFICATION_IND, false, ["x-mms-message-type",
                                             "x-mms-transaction-id",
                                             "x-mms-mms-version",
                                             "x-mms-message-class",
                                             "x-mms-message-size",
                                             "x-mms-expiry",
                                             "x-mms-content-location"]);
  add(MMS_PDU_TYPE_RETRIEVE_CONF, true, ["x-mms-message-type",
                                         "x-mms-mms-version",
                                         "date",
                                         "content-type"]);
  add(MMS_PDU_TYPE_NOTIFYRESP_IND, false, ["x-mms-message-type",
                                           "x-mms-transaction-id",
                                           "x-mms-mms-version",
                                           "x-mms-status"]);
  add(MMS_PDU_TYPE_DELIVERY_IND, false, ["x-mms-message-type",
                                         "x-mms-mms-version",
                                         "message-id",
                                         "to",
                                         "date",
                                         "x-mms-status"]);
  add(MMS_PDU_TYPE_ACKNOWLEDGE_IND, false, ["x-mms-message-type",
                                            "x-mms-transaction-id",
                                            "x-mms-mms-version"]);
  add(MMS_PDU_TYPE_READ_REC_IND, false, ["x-mms-message-type",
                                         "message-id",
                                         "x-mms-mms-version",
                                         "to",
                                         "from",
                                         "x-mms-read-status"]);
  add(MMS_PDU_TYPE_READ_ORIG_IND, false, ["x-mms-message-type",
                                          "x-mms-mms-version",
                                          "message-id",
                                          "to",
                                          "from",
                                          "date",
                                          "x-mms-read-status"]);

  return pdus;
})();

/**
 * Header field names and assigned numbers.
 *
 * @see OMA-TS-MMS_ENC-V1_3-20110913-A clause 7.4
 */
const MMS_HEADER_FIELDS = (function() {
  let names = {};
  function add(name, number, coder) {
    let entry = {
      name: name,
      number: number,
      coder: coder,
    };
    names[name] = names[number] = entry;
  }

  add("content-type",                            0x04, WSP.ContentTypeValue);

  return names;
})();

// @see OMA-TS-MMS_ENC-V1_3-20110913-A Table 27: Parameter Name Assignments
const MMS_WELL_KNOWN_PARAMS = (function() {
  let params = {};

  function add(name, number, coder) {
    let entry = {
      name: name,
      number: number,
      coder: coder,
    };
    params[name] = params[number] = entry;
  }

  // Encoding Version: 1.2
  add("type", 0x02, WSP.TypeValue);

  return params;
})();

let debug;
if (DEBUG) {
  debug = function(s) {
    dump("-$- IccOmaWapPDU: " + s + "\n");
  };
} else {
  debug = function(s) {};
}

this.EXPORTED_SYMBOLS = ALL_CONST_SYMBOLS.concat([

  "HeaderField",
  "MmsHeader",
  // Parser
  "PduHelper",
]);
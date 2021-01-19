/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Log.jsm");

// loglevel should be one of "Fatal", "Error", "Warn", "Info", "Config",
// "Debug", "Trace" or "All". If none is specified, "Debug" will be used by
// default.  Note "Debug" is usually appropriate so that when this log is
// included in the Sync file logs we get verbose output.
const PREF_LOG_LEVEL = "identity.kaiaccounts.loglevel";
// The level of messages that will be dumped to the console.  If not specified,
// "Error" will be used.
const PREF_LOG_LEVEL_DUMP = "identity.kaiaccounts.log.appender.dump";

// A pref that can be set so "sensitive" information (eg, personally
// identifiable info, credentials, etc) will be logged.
const PREF_LOG_SENSITIVE_DETAILS = "identity.kaiaccounts.log.sensitive";

let exports = Object.create(null);

XPCOMUtils.defineLazyGetter(exports, 'log', function() {
  let log = Log.repository.getLogger("KaiOSAccounts");
  // We set the log level to debug, but the default dump appender is set to
  // the level reflected in the pref.  Other code that consumes FxA may then
  // choose to add another appender at a different level.
  log.level = Log.Level.Debug;
  let appender = new Log.DumpAppender();
  appender.level = Log.Level.Error;

  log.addAppender(appender);
  try {
    // The log itself.
    let level =
      Services.prefs.getPrefType(PREF_LOG_LEVEL) == Ci.nsIPrefBranch.PREF_STRING
      && Services.prefs.getCharPref(PREF_LOG_LEVEL);
    log.level = Log.Level[level] || Log.Level.Debug;

    // The appender.
    level =
      Services.prefs.getPrefType(PREF_LOG_LEVEL_DUMP) == Ci.nsIPrefBranch.PREF_STRING
      && Services.prefs.getCharPref(PREF_LOG_LEVEL_DUMP);
    appender.level = Log.Level[level] || Log.Level.Error;
  } catch (e) {
    log.error(e);
  }

  return log;
});

// A boolean to indicate if personally identifiable information (or anything
// else sensitive, such as credentials) should be logged.
XPCOMUtils.defineLazyGetter(exports, 'logPII', function() {
  try {
    return Services.prefs.getBoolPref(PREF_LOG_SENSITIVE_DETAILS);
  } catch (_) {
    return false;
  }
});

exports.KAIACCOUNTS_PERMISSION = "kaios-accounts";

exports.DATA_FORMAT_VERSION = 2;
exports.DEFAULT_STORAGE_FILENAME = "signedInUser.json";

// Observer notifications.
exports.ONLOGIN_NOTIFICATION = "fxaccounts:onlogin";
exports.ONVERIFIED_NOTIFICATION = "fxaccounts:onverified";
exports.ONLOGOUT_NOTIFICATION = "fxaccounts:onlogout";
// Internal to services/fxaccounts only
exports.ON_FXA_UPDATE_NOTIFICATION = "fxaccounts:update";

// UI Requests.
exports.UI_REQUEST_SIGN_IN_FLOW = "signInFlow";
exports.UI_REQUEST_REFRESH_AUTH = "refreshAuthentication";

// Server errno.
// From https://github.com/mozilla/fxa-auth-server/blob/master/docs/api.md#response-format
exports.ERRNO_ACCOUNT_ALREADY_EXISTS         = 101;
exports.ERRNO_ACCOUNT_DOES_NOT_EXIST         = 102;
exports.ERRNO_INCORRECT_PASSWORD             = 103;
exports.ERRNO_INTERNAL_INVALID_USER          = 104;
exports.ERRNO_INVALID_ACCOUNTID              = 105;

// Errors.
exports.ERROR_ACCOUNT_ALREADY_EXISTS         = "ACCOUNT_ALREADY_EXISTS";
exports.ERROR_ACCOUNT_DOES_NOT_EXIST         = "ACCOUNT_DOES_NOT_EXIST";
exports.ERROR_ALREADY_SIGNED_IN_USER         = "ALREADY_SIGNED_IN_USER";
exports.ERROR_ENDPOINT_NO_LONGER_SUPPORTED   = "ENDPOINT_NO_LONGER_SUPPORTED";
exports.ERROR_INCORRECT_API_VERSION          = "INCORRECT_API_VERSION";
exports.ERROR_INCORRECT_EMAIL_CASE           = "INCORRECT_EMAIL_CASE";
exports.ERROR_INCORRECT_KEY_RETRIEVAL_METHOD = "INCORRECT_KEY_RETRIEVAL_METHOD";
exports.ERROR_INCORRECT_LOGIN_METHOD         = "INCORRECT_LOGIN_METHOD";
exports.ERROR_INVALID_ACCOUNTID              = "INVALID_ACCOUNTID";
exports.ERROR_INVALID_AUDIENCE               = "INVALID_AUDIENCE";
exports.ERROR_INVALID_AUTH_TOKEN             = "INVALID_AUTH_TOKEN";
exports.ERROR_INVALID_AUTH_TIMESTAMP         = "INVALID_AUTH_TIMESTAMP";
exports.ERROR_INVALID_AUTH_NONCE             = "INVALID_AUTH_NONCE";
exports.ERROR_INVALID_BODY_PARAMETERS        = "INVALID_BODY_PARAMETERS";
exports.ERROR_INVALID_PASSWORD               = "INVALID_PASSWORD";
exports.ERROR_INVALID_VERIFICATION_CODE      = "INVALID_VERIFICATION_CODE";
exports.ERROR_INVALID_REFRESH_AUTH_VALUE     = "INVALID_REFRESH_AUTH_VALUE";
exports.ERROR_INVALID_REQUEST_SIGNATURE      = "INVALID_REQUEST_SIGNATURE";
exports.ERROR_INTERNAL_INVALID_USER          = "INTERNAL_ERROR_INVALID_USER";
exports.ERROR_MISSING_BODY_PARAMETERS        = "MISSING_BODY_PARAMETERS";
exports.ERROR_MISSING_CONTENT_LENGTH         = "MISSING_CONTENT_LENGTH";
exports.ERROR_NO_TOKEN_SESSION               = "NO_TOKEN_SESSION";
exports.ERROR_NO_SILENT_REFRESH_AUTH         = "NO_SILENT_REFRESH_AUTH";
exports.ERROR_NOT_VALID_JSON_BODY            = "NOT_VALID_JSON_BODY";
exports.ERROR_OFFLINE                        = "OFFLINE";
exports.ERROR_PERMISSION_DENIED              = "PERMISSION_DENIED";
exports.ERROR_REQUEST_BODY_TOO_LARGE         = "REQUEST_BODY_TOO_LARGE";
exports.ERROR_SERVER_ERROR                   = "SERVER_ERROR";
exports.ERROR_TOO_MANY_CLIENT_REQUESTS       = "TOO_MANY_CLIENT_REQUESTS";
exports.ERROR_SERVICE_TEMP_UNAVAILABLE       = "SERVICE_TEMPORARY_UNAVAILABLE";
exports.ERROR_UI_ERROR                       = "UI_ERROR";
exports.ERROR_UI_REQUEST                     = "UI_REQUEST";
exports.ERROR_PARSE                          = "PARSE_ERROR";
exports.ERROR_NETWORK                        = "NETWORK_ERROR";
exports.ERROR_UNKNOWN                        = "UNKNOWN_ERROR";
exports.ERROR_UNVERIFIED_ACCOUNT             = "UNVERIFIED_ACCOUNT";

// Status code errors
exports.ERROR_CODE_METHOD_NOT_ALLOWED        = 405;
exports.ERROR_MSG_METHOD_NOT_ALLOWED         = "METHOD_NOT_ALLOWED";

// FxAccounts has the ability to "split" the credentials between a plain-text
// JSON file in the profile dir and in the login manager.
// These constants relate to that.

// Error matching.
exports.SERVER_ERRNO_TO_ERROR = {};

for (let id in exports) {
  this[id] = exports[id];
}

// Allow this file to be imported via Components.utils.import().
this.EXPORTED_SYMBOLS = Object.keys(exports);

// Set these up now that everything has been loaded into |this|.
SERVER_ERRNO_TO_ERROR[ERRNO_ACCOUNT_ALREADY_EXISTS]         = ERROR_ACCOUNT_ALREADY_EXISTS;
SERVER_ERRNO_TO_ERROR[ERRNO_ACCOUNT_DOES_NOT_EXIST]         = ERROR_ACCOUNT_DOES_NOT_EXIST;
SERVER_ERRNO_TO_ERROR[ERRNO_INCORRECT_PASSWORD]             = ERROR_INVALID_PASSWORD;
SERVER_ERRNO_TO_ERROR[ERRNO_INTERNAL_INVALID_USER]          = ERROR_INTERNAL_INVALID_USER;
SERVER_ERRNO_TO_ERROR[ERRNO_INVALID_ACCOUNTID]              = ERROR_INVALID_ACCOUNTID;

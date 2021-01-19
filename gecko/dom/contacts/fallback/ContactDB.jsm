/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Everything but "ContactDB" is only exported here for testing.
this.EXPORTED_SYMBOLS = ["ContactDB", "DB_NAME", "STORE_NAME", "SAVED_GETALL_STORE_NAME",
                         "SPEED_DIALS_STORE_NAME", "REVISION_STORE", "DB_VERSION",
                         "GROUP_STORE_NAME"];

const DEBUG = false;
function debug(s) { dump("-*- ContactDB component: " + s + "\n"); }

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/IndexedDBHelper.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PhoneNumberUtils",
                                  "resource://gre/modules/PhoneNumberUtils.jsm");

XPCOMUtils.defineLazyServiceGetter(this, "gSettingsService",
                                   "@mozilla.org/settingsService;1",
                                   "nsISettingsService");

Cu.importGlobalProperties(["indexedDB"]);

/* all exported symbols need to be bound to this on B2G - Bug 961777 */
this.DB_NAME = "contacts";
this.DB_VERSION = 24;
this.STORE_NAME = "contacts";
this.SAVED_GETALL_STORE_NAME = "getallcache";
this.SPEED_DIALS_STORE_NAME = "speeddials";
const CHUNK_SIZE = 20;
this.REVISION_STORE = "revision";
const REVISION_KEY = "revision";
this.GROUP_STORE_NAME = "group";

const CATEGORY_DEFAULT = ["DEVICE", "KAICONTACT"];
const CATEGORY_DEVICE = "DEVICE";
const CATEGORY_KAICONTACT = "KAICONTACT";
const CATEGORY_SIM = "SIM";

const MIN_MATCH_DIGITS = 7;

const kSettingsLangKey = 'language.current';
const orders = {
 // pl:'&#32;&#97;&#261;&#98;&#99;&#263;&#100;&#101;&#281;&#102;&#103;&#104;&#105;&#106;&#107;&#108;&#322;&#109;&#110;&#324;&#111;&#243;&#112;&#114;&#115;&#347;&#116;&#117;&#119;&#121;&#122;&#378;&#380;',
  zh: {'\u9cdd': 'shan', '\u8e7c': 'pu', '\u8bed': 'yu', '\u8f9e': 'ci', '\u58a9': 'dun', '\u4ed1': 'lun', '\u9a75': 'zu', '\u4e94': 'wu', '\u9e67': 'zhe', '\u987d': 'wan', '\u998b': 'chan', '\u86f4': 'qi', '\u7cbe': 'jing', '\u4f4d': 'wei', '\u8db8': 'dun', '\u668c': 'kui', '\u7728': 'zha', '\u67b0': 'ping', '\u624e': 'zha', '\u9edc': 'chu', '\u56f9': 'ling', '\u9edf': 'yi', '\u7428': 'kun', '\u5e4c': 'huang', '\u88d2': 'pou', '\u8568': 'jue', '\u8116': 'bo', '\u5dee': 'cha', '\u56f5': 'lun', '\u94ba': 'yue', '\u5fa8': 'huang', '\u8377': 'he', '\u82af': 'xin', '\u5e10': 'zhang', '\u72d7': 'gou', '\u8463': 'dong', '\u69ad': 'xie', '\u5e11': 'nu', '\u6baa': 'yi', '\u76ce': 'ang', '\u4e2c': 'zhuang', '\u759f': 'nue', '\u4e98': 'gen', '\u67ec': 'jian', '\u6c57': 'han', '\u77e9': 'ju', '\u9887': 'po', '\u7f23': 'jian', '\u989c': 'yan', '\u829f': 'shan', '\u9e5b': 'mei', '\u7b97': 'suan', '\u8461': 'pu', '\u6f8d': 'shu', '\u660c': 'chang', '\u5146': 'zhao', '\u8c85': 'xiu', '\u84af': 'kuai', '\u7ef6': 'shou', '\u5d74': 'ji', '\u5438': 'xi', '\u9af9': 'xiu', '\u90e8': 'bu', '\u8bec': 'wu', '\u6127': 'kui', '\u6151': 'she', '\u55a7': 'xuan', '\u7096': 'dun', '\u7d77': 'zhi', '\u6f3e': 'yang', '\u6d9d': 'lao', '\u5e26': 'dai', '\u9e64': 'he', '\u6eba': 'ni', '\u963f': 'a', '\u8803': 'guo', '\u56f0': 'kun', '\u761b': 'chi', '\u76cf': 'zhan', '\u7953': 'fei', '\u681d': 'gua', '\u94de': 'diao', '\u6ec2': 'pang', '\u7d6e': 'xu', '\u5a32': 'wa', '\u6aa0': 'qing', '\u5352': 'zu', '\u9539': 'qiao', '\u9b51': 'chi', '\u5bbf': 'su', '\u876e': 'fu', '\u623d': 'hu', '\u768b': 'gao', '\u95f5': 'min', '\u705e': 'ba', '\u85ff': 'he', '\u6b21': 'ci', '\u83f2': 'fei', '\u8404': 'tao', '\u9191': 'xu', '\u783b': 'long', '\u5c18': 'chen', '\u53f8': 'si', '\u79ef': 'ji', '\u7b7e': 'qian', '\u6809': 'zhi', '\u94fa': 'pu', '\u5421': 'bi', '\u4e13': 'zhuan', '\u591c': 'ye', '\u7403': 'qiu', '\u52df': 'mu', '\u4fa0': 'xia', '\u6266': 'qian', '\u7924': 'ca', '\u8bfc': 'zhuo', '\u87d3': 'xiang', '\u6986': 'yu', '\u82f7': 'gan', '\u9eb4': 'qu', '\u5efe': 'gong', '\u7262': 'lao', '\u7801': 'ma', '\u5883': 'jing', '\u83e1': 'han', '\u7ea1': 'yu', '\u8539': 'lian', '\u7adf': 'jing', '\u60b1': 'fei', '\u4e03': 'qi', '\u9009': 'xuan', '\u75ea': 'huan', '\u8112': 'mi', '\u68f9': 'zhao', '\u811e': 'cuo', '\u810a': 'ji', '\u8e0f': 'ta', '\u90f4': 'chen', '\u54fc': 'heng', '\u824f': 'shou', '\u58a8': 'mo', '\u7cd5': 'gao', '\u78a3': 'jie', '\u62bd': 'chou', '\u4e5c': 'nie', '\u9b42': 'hun', '\u762d': 'biao', '\u7237': 'ye', '\u4f5d': 'gou', '\u5149': 'guang', '\u4ed3': 'cang', '\u6248': 'hu', '\u71b3': 'man', '\u955b': 'yong', '\u79c6': 'gan', '\u80d7': 'zhen', '\u7bee': 'lan', '\u8821': 'li', '\u6652': 'shai', '\u9a9c': 'ao', '\u51af': 'feng', '\u8d91': 'ci', '\u6a58': 'ju', '\u94f5': 'an', '\u6691': 'shu', '\u904f': 'e', '\u5f26': 'xian', '\u68e0': 'tang', '\u8e81': 'zao', '\u84b9': 'jian', '\u697c': 'lou', '\u8e9c': 'cuo', '\u6893': 'zi', '\u51f0': 'huang', '\u94ac': 'huo', '\u8360': 'ci', '\u8d5d': 'yan', '\u7a83': 'qie', '\u5373': 'ji', '\u9572': 'cha', '\u6555': 'chi', '\u4e3b': 'zhu', '\u55d4': 'chen', '\u826e': 'gen', '\u68ee': 'sen', '\u9a8b': 'cheng', '\u7b0a': 'zhao', '\u4f43': 'dian', '\u8d1d': 'bei', '\u656b': 'jiao', '\u8c29': 'man', '\u9cd5': 'xue', '\u8d56': 'lai', '\u6c41': 'zhi', '\u4f91': 'you', '\u8004': 'mao', '\u8737': 'quan', '\u526a': 'jian', '\u8bc5': 'zu', '\u5220': 'shan', '\u832d': 'jiao', '\u9f83': 'ju', '\u7261': 'mu', '\u8f6b': 'ren', '\u5f92': 'tu', '\u76b1': 'zhou', '\u9003': 'tao', '\u63ed': 'jie', '\u8e4a': 'qi', '\u90ca': 'jiao', '\u9abc': 'ge', '\u662f': 'shi', '\u5524': 'huan', '\u9677': 'xian', '\u9051': 'huang', '\u5f62': 'xing', '\u80fa': 'an', '\u7967': 'tiao', '\u96e9': 'yu', '\u9cab': 'ji', '\u82ca': 'e', '\u76d4': 'kui', '\u7405': 'lang', '\u70eb': 'theng', '\u8080': 'nie', '\u6de6': 'gan', '\u86ce': 'li', '\u5a92': 'mei', '\u63c9': 'rou', '\u5c7f': 'yu', '\u9a76': 'shi', '\u7eb1': 'sha', '\u83a9': 'fu', '\u5927': 'da', '\u529f': 'gong', '\u620b': 'jian', '\u987e': 'gu', '\u5165': 'ru', '\u55f5': 'tong', '\u562d': 'peng', '\u9c82': 'fang', '\u62ca': 'bu', '\u6d8c': 'yong', '\u79f0': 'chen', '\u919b': 'quan', '\u9886': 'ling', '\u8765': 'mao', '\u90cf': 'jia', '\u8304': 'qie', '\u54d3': 'xiao', '\u502d': 'wei', '\u5f7c': 'bi', '\u9122': 'yan', '\u6297': 'kang', '\u9a77': 'si', '\u6020': 'dai', '\u82de': 'bao', '\u776b': 'jie', '\u54d4': 'bi', '\u8baf': 'xun', '\u8845': 'xin', '\u7bdd': 'gou', '\u9495': 'nv', '\u8e59': 'cu', '\u87cb': 'xi', '\u6734': 'pu', '\u5d3d': 'zai', '\u5202': 'ce', '\u5982': 'ru', '\u5de9': 'gong', '\u573b': 'qi', '\u8d85': 'chao', '\u5782': 'chui', '\u61d4': 'lan', '\u5658': 'jue', '\u6572': 'qiao', '\u6445': 'lu', '\u4f20': 'chuan', '\u86f3': 'si', '\u871c': 'mi', '\u54fd': 'geng', '\u643d': 'cha', '\u63a3': 'che', '\u9e41': 'bo', '\u5f66': 'yan', '\u5b7d': 'nie', '\u553c': 'qie', '\u90b0': 'tai', '\u8764': 'qiu', '\u5709': 'yu', '\u822a': 'hang', '\u6a91': 'lei', '\u68f5': 'ke', '\u576d': 'ni', '\u7f22': 'yi', '\u84fc': 'liao', '\u608c': 'ti', '\u5fee': 'zhi', '\u4e89': 'zheng', '\u560f': 'gu', '\u8fbd': 'liao', '\u90e1': 'jun', '\u9f84': 'ling', '\u68fa': 'guan', '\u4f73': 'jia', '\u711a': 'fen', '\u7aed': 'jie', '\u5ef6': 'yan', '\u86e9': 'gong', '\u5b98': 'guan', '\u77e2': 'shi', '\u6971': 'cou', '\u94ae': 'niu', '\u7f06': 'lan', '\u84d3': 'bei', '\u6eb6': 'rong', '\u82e6': 'ku', '\u7fb2': 'xi', '\u4ffe': 'bi', '\u63b3': 'lu', '\u7e82': 'zuan', '\u7850': 'dong', '\u5ef4': 'zhuo', '\u66fe': 'zeng', '\u65a9': 'zhan', '\u895e': 'bi', '\u97b4': 'bai', '\u5de5': 'gong', '\u891a': 'zhe', '\u8478': 'xi', '\u8d28': 'zhi', '\u7f21': 'li', '\u5199': 'xie', '\u6f2d': 'mang', '\u9975': 'er', '\u7384': 'xuan', '\u786e': 'que', '\u6df9': 'yan', '\u6454': 'shuai', '\u6233': 'chuo', '\u515c': 'dou', '\u751f': 'sheng', '\u8fe6': 'jia', '\u5265': 'bo', '\u6ddd': 'fei', '\u7fb8': 'lei', '\u86cf': 'cheng', '\u87e5': 'huang', '\u9e57': 'e', '\u5a46': 'po', '\u95e8': 'men', '\u7434': 'qin', '\u89e6': 'chu', '\u521b': 'chuang', '\u54b4': 'hai', '\u7857': 'qiao', '\u642d': 'da', '\u52d2': 'le', '\u9988': 'kui', '\u709d': 'qiang', '\u81fe': 'kui', '\u7cbd': 'zong', '\u5141': 'yun', '\u5fa1': 'yu', '\u9a91': 'qi', '\u53db': 'pan', '\u5088': 'li', '\u7bea': 'chi', '\u9674': 'pi', '\u6e58': 'xiang', '\u542f': 'qi', '\u950c': 'xin', '\u8fee': 'ze', '\u62f1': 'gong', '\u8c94': 'pi', '\u9cad': 'qing', '\u6c21': 'dong', '\u5fcf': 'chan', '\u9099': 'mang', '\u600d': 'zha', '\u7a1a': 'zhi', '\u742a': 'qi', '\u9020': 'zao', '\u5bdd': 'qin', '\u5406': 'yao', '\u6478': 'mo', '\u667e': 'liang', '\u7cc8': 'xu', '\u6f9c': 'lan', '\u5f29': 'nu', '\u60df': 'wei', '\u7339': 'cha', '\u94a8': 'wu', '\u7a00': 'xi', '\u8c55': 'shi', '\u7e41': 'fan', '\u5bb4': 'yan', '\u5475': 'he', '\u6d7c': 'mei', '\u643a': 'xie', '\u51fd': 'han', '\u7f35': 'zuan', '\u8c06': 'zhun', '\u62e7': 'ning', '\u60a8': 'nin', '\u7bf7': 'peng', '\u6c76': 'wen', '\u5792': 'lei', '\u8dde': 'li', '\u5218': 'liu', '\u6f8e': 'peng', '\u7fe9': 'pian', '\u8f72': 'ke', '\u63cf': 'miao', '\u952a': 'huo', '\u65ce': 'ni', '\u57a6': 'ken', '\u8098': 'zhou', '\u7ef2': 'gun', '\u6dcb': 'lin', '\u7ed5': 'rao', '\u75de': 'pi', '\u5954': 'ben', '\u9e73': 'guan', '\u85b9': 'tai', '\u7292': 'kao', '\u5eb7': 'kang', '\u8428': 'sa', '\u9564': 'pu', '\u6043': 'shi', '\u8f85': 'fu', '\u829d': 'zhi', '\u8729': 'diao', '\u670a': 'ruan', '\u70c2': 'lan', '\u6ede': 'zhi', '\u8e9e': 'xie', '\u7bc1': 'huang', '\u5482': 'za', '\u6062': 'hui', '\u53ed': 'ba', '\u7785': 'chou', '\u9a71': 'qu', '\u7f24': 'bin', '\u9e3e': 'luan', '\u957f': 'chang', '\u60e6': 'dian', '\u6b47': 'xie', '\u6d4a': 'zhuo', '\u8bd9': 'hui', '\u8c11': 'nue', '\u8028': 'nou', '\u94b6': 'ke', '\u8054': 'lian', '\u7ba1': 'guan', '\u560c': 'piao', '\u814b': 'ye', '\u912f': 'shan', '\u9604': 'jiu', '\u845b': 'ge', '\u8e90': 'lie', '\u9e92': 'qi', '\u5fd1': 'dao', '\u622c': 'jian', '\u6d0e': 'ji', '\u8301': 'zhuo', '\u998f': 'liu', '\u9e66': 'ying', '\u8b6c': 'pi', '\u8201': 'yu', '\u87c6': 'mo', '\u9b54': 'mo', '\u96ce': 'ju', '\u8385': 'li', '\u6eb2': 'sou', '\u64ae': 'cuo', '\u4f5c': 'zuo', '\u6d47': 'jiao', '\u763f': 'ying', '\u5e08': 'shi', '\u61c8': 'xie', '\u8c34': 'qian', '\u516e': 'xi', '\u6ef4': 'di', '\u7948': 'qi', '\u8016': 'chao', '\u5760': 'zhui', '\u675f': 'shu', '\u837b': 'di', '\u7a70': 'rang', '\u7078': 'jiu', '\u51f6': 'xiong', '\u6bb4': 'ou', '\u7fdf': 'di', '\u6551': 'jiu', '\u5530': 'shua', '\u963c': 'zuo', '\u5a76': 'shen', '\u7eba': 'fang', '\u793c': 'li', '\u8ff8': 'beng', '\u8109': 'mai', '\u8bd4': 'lei', '\u503e': 'qing', '\u8813': 'meng', '\u6d52': 'hu', '\u4f46': 'dan', '\u7172': 'bao', '\u6a59': 'cheng', '\u6e6e': 'yan', '\u771a': 'sheng', '\u6772': 'gao', '\u6a31': 'ying', '\u8f79': 'li', '\u86de': 'kuo', '\u94eb': 'tiao', '\u9ad8': 'gao', '\u640b': 'chi', '\u731c': 'cai', '\u7cb1': 'liang', '\u94d5': 'you', '\u763e': 'yin', '\u62e5': 'yong', '\u8919': 'bei', '\u51cb': 'diao', '\u8fa9': 'bian', '\u7a0b': 'cheng', '\u7d2f': 'lei', '\u557e': 'jiu', '\u82fb': 'fu', '\u5948': 'nai', '\u8235': 'duo', '\u749e': 'pu', '\u8fea': 'di', '\u754f': 'wei', '\u5e99': 'miao', '\u4fe3': 'yu', '\u9a82': 'ma', '\u52a0': 'jia', '\u4ec6': 'pu', '\u6bfd': 'jian', '\u6f6d': 'tan', '\u8537': 'qiang', '\u746d': 'tang', '\u771f': 'zhen', '\u5c81': 'sui', '\u8e49': 'cuo', '\u5fc4': 'shu', '\u6041': 'nen', '\u5403': 'chi', '\u80db': 'jia', '\u6124': 'fen', '\u79fb': 'yi', '\u600a': 'chao', '\u8bdb': 'zhu', '\u5f61': 'san', '\u857b': 'gong', '\u7eeb': 'ling', '\u72ef': 'kuai', '\u7168': 'wei', '\u9afb': 'ji', '\u5757': 'kuai', '\u5477': 'ga', '\u6e4e': 'mian', '\u5821': 'bao', '\u7bf1': 'li', '\u540e': 'hou', '\u7b3e': 'bian', '\u8f90': 'fu', '\u9e51': 'chun', '\u65e5': 'ri', '\u5282': 'jue', '\u816d': 'e', '\u82ef': 'ben', '\u73a9': 'wan', '\u75c9': 'jing', '\u573e': 'ji', '\u6a28': 'xi', '\u6e44': 'mei', '\u6c1f': 'fu', '\u77bb': 'zhan', '\u8f9c': 'gu', '\u813e': 'pi', '\u59e3': 'jiao', '\u94f1': 'yi', '\u6768': 'yang', '\u9976': 'rao', '\u608d': 'han', '\u6d6e': 'fu', '\u6a65': 'zhu', '\u8f95': 'yuan', '\u5196': 'mi', '\u7efe': 'wan', '\u68a2': 'shao', '\u4e1d': 'si', '\u968d': 'huang', '\u6a0a': 'fan', '\u52ac': 'qu', '\u909b': 'qiong', '\u815a': 'ding', '\u532e': 'kui', '\u6f62': 'huang', '\u7f36': 'fou', '\u5d34': 'wei', '\u9502': 'li', '\u9139': 'zou', '\u7fbd': 'yu', '\u4f10': 'fa', '\u579b': 'duo', '\u86db': 'zhu', '\u98d2': 'sa', '\u7fce': 'ling', '\u5bbd': 'kuan', '\u5978': 'jian', '\u6a3d': 'zun', '\u9a97': 'pian', '\u54ab': 'zhi', '\u527f': 'jiao', '\u5988': 'ma', '\u4fca': 'jun', '\u4e54': 'qiao', '\u6897': 'geng', '\u8171': 'jian', '\u960a': 'chang', '\u9161': 'dou', '\u6a5b': 'jue', '\u7751': 'jian', '\u5ae3': 'yan', '\u536b': 'wei', '\u5d82': 'zhang', '\u7597': 'liao', '\u6cbb': 'zhi', '\u7256': 'you', '\u57b4': 'nao', '\u803f': 'geng', '\u83b2': 'lian', '\u9e28': 'bao', '\u6bcb': 'wu', '\u6daa': 'fu', '\u97ed': 'jiu', '\u840b': 'qi', '\u8369': 'jin', '\u606a': 'ke', '\u68b3': 'shu', '\u54aa': 'mai', '\u727e': 'wu', '\u6d4d': 'hua', '\u9571': 'yi', '\u4f30': 'gu', '\u71a0': 'yi', '\u7ce0': 'kang', '\u80b4': 'yao', '\u80e1': 'hu', '\u5f11': 'shi', '\u94c6': 'mao', '\u7729': 'xuan', '\u534f': 'xie', '\u9530': 'meng', '\u69d0': 'huai', '\u7c16': 'duan', '\u57d5': 'cheng', '\u591a': 'duo', '\u7334': 'hou', '\u8497': 'lang', '\u5984': 'wang', '\u9701': 'ji', '\u55e1': 'weng', '\u6108': 'yu', '\u5531': 'chang', '\u601b': 'da', '\u70c8': 'lie', '\u9955': 'tao', '\u530d': 'pu', '\u6ee8': 'bin', '\u676d': 'hang', '\u563b': 'xi', '\u82aa': 'chi', '\u901f': 'su', '\u6c15': 'pie', '\u9529': 'juan', '\u4ed5': 'shi', '\u6807': 'biao', '\u56db': 'si', '\u5c5e': 'shu', '\u5495': 'gu', '\u8106': 'cui', '\u69df': 'bing', '\u9602': 'he', '\u9513': 'jin', '\u810f': 'zang', '\u83ca': 'ju', '\u8bca': 'zhen', '\u9aa0': 'biao', '\u69e0': 'zhu', '\u5cab': 'xiu', '\u8eab': 'shen', '\u8865': 'bu', '\u5f87': 'xun', '\u90d0': 'kuai', '\u8bcc': 'zhou', '\u8816': 'huo', '\u8f94': 'pei', '\u6749': 'shan', '\u8511': 'mie', '\u8237': 'xian', '\u79c3': 'tu', '\u6cfc': 'po', '\u6012': 'nu', '\u7889': 'diao', '\u4f88': 'chi', '\u9f86': 'tiao', '\u8bcd': 'ci', '\u9068': 'ao', '\u9006': 'ni', '\u76ef': 'ding', '\u4e8b': 'shi', '\u906d': 'zao', '\u6dd6': 'ne', '\u9523': 'luo', '\u8042': 'nie', '\u60da': 'hu', '\u836a': 'sun', '\u9eea': 'can', '\u9c9a': 'ji', '\u70e6': 'fan', '\u7b1b': 'di', '\u5106': 'jing', '\u6d66': 'pu', '\u7f45': 'xia', '\u8538': 'dou', '\u8459': 'xiang', '\u684a': 'juan', '\u8206': 'yu', '\u902e': 'dai', '\u6657': 'han', '\u70fd': 'feng', '\u80cc': 'bei', '\u8c31': 'pu', '\u8c17': 'chan', '\u5bff': 'shou', '\u6323': 'zheng', '\u59c6': 'mu', '\u7735': 'chi', '\u61ca': 'ao', '\u8089': 'rou', '\u8f96': 'xia', '\u840c': 'meng', '\u6b87': 'shang', '\u54e8': 'shao', '\u7ba2': 'wan', '\u82d2': 'ran', '\u956a': 'qiang', '\u5919': 'su', '\u9603': 'kun', '\u5012': 'dao', '\u954a': 'nie', '\u5426': 'fu', '\u80b1': 'gong', '\u79cd': 'zhong', '\u5be1': 'gua', '\u5bb9': 'rong', '\u7747': 'di', '\u547c': 'hu', '\u652e': 'nang', '\u67cf': 'bai', '\u970f': 'fei', '\u8e6d': 'ceng', '\u6c13': 'meng', '\u9a9f': 'shan', '\u8038': 'song', '\u5e90': 'lu', '\u7b2c': 'di', '\u63e1': 'wo', '\u6f78': 'shan', '\u989b': 'zhuan', '\u98a6': 'pin', '\u5f0f': 'shi', '\u7f50': 'guan', '\u5c98': 'xian', '\u8191': 'bin', '\u879f': 'ming', '\u82ce': 'zhu', '\u8346': 'jing', '\u7504': 'zhen', '\u948f': 'chuan', '\u618e': 'zeng', '\u575a': 'jian', '\u70ec': 'jin', '\u53e8': 'dao', '\u73ca': 'shan', '\u762b': 'tan', '\u7b58': 'kou', '\u6854': 'jie', '\u76c6': 'pen', '\u7abf': 'long', '\u950d': 'liu', '\u80c3': 'wei', '\u8bde': 'dan', '\u9753': 'liang', '\u6bd9': 'bi', '\u61a7': 'chong', '\u5f00': 'kai', '\u7682': 'zao', '\u5957': 'tao', '\u9e68': 'liu', '\u72fa': 'yin', '\u578b': 'xing', '\u7bd3': 'lou', '\u607c': 'nao', '\u6e98': 'ke', '\u8a00': 'yan', '\u8c02': 'shen', '\u5844': 'ling', '\u723b': 'yao', '\u607b': 'ce', '\u68d5': 'zong', '\u7ccc': 'zan', '\u964d': 'jiang', '\u7855': 'shuo', '\u6f15': 'cao', '\u8489': 'kuai', '\u9036': 'wei', '\u51db': 'lin', '\u5a5a': 'hun', '\u6c93': 'ta', '\u7949': 'zhi', '\u520a': 'kan', '\u7f0b': 'hui', '\u831a': 'yin', '\u97f5': 'yun', '\u9ca1': 'li', '\u94e1': 'zha', '\u8169': 'nan', '\u4ef3': 'bi', '\u7cbc': 'lin', '\u571f': 'tu', '\u8292': 'mang', '\u9b23': 'lie', '\u51bd': 'lie', '\u6f2a': 'yi', '\u8bb9': 'e', '\u4eae': 'liang', '\u75e6': 'pi', '\u4e9f': 'qi', '\u905b': 'liu', '\u77ac': 'shun', '\u8334': 'hui', '\u6212': 'jie', '\u5ad8': 'lei', '\u83fd': 'shu', '\u9794': 'man', '\u52fe': 'gou', '\u727a': 'xi', '\u6c16': 'nai', '\u966c': 'zhe', '\u7814': 'yan', '\u70e8': 'ye', '\u772d': 'sui', '\u94fc': 'lai', '\u9e3f': 'hong', '\u708a': 'chui', '\u94b5': 'bo', '\u55d1': 'he', '\u84c1': 'qin', '\u84d6': 'bi', '\u5cb7': 'min', '\u4ec1': 'ren', '\u9053': 'dao', '\u7a86': 'bian', '\u7131': 'yan', '\u8ddf': 'gen', '\u68a8': 'li', '\u57b8': 'huan', '\u63e0': 'ya', '\u73e0': 'zhu', '\u9634': 'yin', '\u7763': 'du', '\u948d': 'tu', '\u6328': 'ai', '\u5eca': 'lang', '\u9b45': 'mei', '\u5f03': 'qi', '\u79bb': 'li', '\u7099': 'zhi', '\u6d69': 'hao', '\u8944': 'xiang', '\u5a04': 'lou', '\u6aa9': 'lin', '\u4f01': 'qi', '\u529e': 'ban', '\u81a8': 'peng', '\u626b': 'sao', '\u4fdf': 'si', '\u6f2f': 'lei', '\u7b51': 'zhu', '\u5f56': 'duan', '\u5a31': 'yu', '\u6963': 'mei', '\u9509': 'cuo', '\u7a95': 'tiao', '\u90b9': 'zou', '\u54fa': 'bu', '\u4e14': 'qie', '\u6797': 'lin', '\u6cbd': 'gu', '\u53e6': 'ling', '\u77db': 'mao', '\u786a': 'e', '\u73c2': 'ke', '\u7f74': 'pi', '\u9a9b': 'wu', '\u6c82': 'yi', '\u5893': 'mu', '\u70df': 'yan', '\u6d77': 'hai', '\u5455': 'ou', '\u8548': 'tan', '\u948a': 'zhao', '\u9891': 'pin', '\u62e3': 'jian', '\u831c': 'xi', '\u86c7': 'she', '\u9a81': 'xiao', '\u8db4': 'pa', '\u6241': 'bian', '\u6654': 'ye', '\u541d': 'lin', '\u94ca': 'shi', '\u62b9': 'mo', '\u5fd2': 'tui', '\u7ead': 'yun', '\u86a3': 'gong', '\u933e': 'zan', '\u7f9f': 'qiang', '\u8f7b': 'qing', '\u5ebe': 'yu', '\u54e7': 'chi', '\u4f7f': 'shi', '\u8693': 'yin', '\u9011': 'qiu', '\u663c': 'zhou', '\u86d1': 'mao', '\u8bd1': 'yi', '\u80eb': 'jing', '\u94bb': 'zuan', '\u8e0c': 'chou', '\u5f8c': 'hou', '\u6726': 'mang', '\u7bcc': 'hou', '\u750f': 'beng', '\u6016': 'bu', '\u8521': 'cai', '\u907f': 'bi', '\u4e3a': 'wei', '\u7c0f': 'lu', '\u640c': 'zhan', '\u7ea7': 'ji', '\u7968': 'piao', '\u6789': 'wang', '\u76df': 'meng', '\u6f6e': 'chao', '\u9685': 'yu', '\u5d99': 'lin', '\u8fc4': 'qi', '\u6e24': 'bo', '\u8027': 'lou', '\u661d': 'zan', '\u6653': 'xiao', '\u683d': 'zai', '\u8471': 'cong', '\u63f8': 'zha', '\u5c0f': 'xiao', '\u50ee': 'tong', '\u915e': 'tai', '\u64d2': 'qin', '\u5176': 'qi', '\u5bd3': 'yu', '\u575b': 'tan', '\u6a50': 'du', '\u9a84': 'jiao', '\u86d0': 'qu', '\u55d2': 'da', '\u6028': 'yuan', '\u5201': 'diao', '\u5411': 'xiang', '\u7525': 'sheng', '\u94b7': 'po', '\u50e6': 'jiu', '\u7893': 'dui', '\u9ccb': 'sao', '\u673d': 'xiu', '\u6ee9': 'tan', '\u721d': 'jue', '\u94d9': 'nao', '\u502a': 'ni', '\u928e': 'qiong', '\u6b83': 'yang', '\u5bf8': 'cun', '\u6620': 'ying', '\u9e38': 'er', '\u531a': 'fang', '\u8d49': 'lai', '\u960e': 'yan', '\u5429': 'fen', '\u8fab': 'bian', '\u789c': 'chen', '\u76ae': 'pi', '\u5541': 'dao', '\u98e7': 'sun', '\u7834': 'po', '\u8e29': 'cai', '\u9562': 'jue', '\u6d82': 'tu', '\u6cf7': 'long', '\u732c': 'wei', '\u9759': 'jing', '\u8305': 'mao', '\u615d': 'ni', '\u5f2d': 'mi', '\u7b3a': 'jian', '\u5462': 'ne', '\u6ce2': 'bo', '\u9883': 'gang', '\u6296': 'dou', '\u863c': 'mi', '\u4edf': 'qian', '\u645e': 'luo', '\u5a29': 'mian', '\u5b63': 'ji', '\u6817': 'li', '\u50ac': 'cui', '\u578c': 'dong', '\u9536': 'si', '\u6c22': 'qing', '\u64ce': 'qing', '\u6851': 'sang', '\u6710': 'chun', '\u4ed4': 'zi', '\u4f57': 'tuo', '\u80ad': 'na', '\u534a': 'ban', '\u66a7': 'ai', '\u52e4': 'qin', '\u8bcf': 'zhao', '\u6367': 'peng', '\u9655': 'shan', '\u7ed2': 'rong', '\u5904': 'chu', '\u7eff': 'lv', '\u90b5': 'shao', '\u9738': 'ba', '\u9e2a': 'gu', '\u718a': 'xiong', '\u7b0b': 'sun', '\u5c15': 'ga', '\u635f': 'sun', '\u7601': 'cui', '\u5ee8': 'xie', '\u9ad1': 'du', '\u6e1a': 'zhu', '\u9035': 'kui', '\u5bbe': 'bin', '\u5993': 'ji', '\u6c46': 'cuan', '\u8d47': 'qiu', '\u8ba3': 'fu', '\u98a7': 'quan', '\u669d': 'ming', '\u8150': 'fu', '\u53b6': 'mou', '\u8d4e': 'shu', '\u56eb': 'hu', '\u9635': 'zhen', '\u9526': 'jin', '\u887e': 'qin', '\u725d': 'pin', '\u7426': 'qi', '\u6dc4': 'zi', '\u961f': 'dui', '\u8110': 'qi', '\u9ee2': 'qu', '\u8bab': 'qi', '\u7f5a': 'fa', '\u6eaa': 'xi', '\u837d': 'lei', '\u9661': 'dou', '\u6052': 'heng', '\u6dec': 'cui', '\u9538': 'cha', '\u6656': 'hui', '\u80b2': 'yu', '\u7596': 'jie', '\u6c26': 'hai', '\u74ee': 'weng', '\u527d': 'piao', '\u9690': 'yin', '\u98df': 'shi', '\u5ba0': 'chong', '\u66fc': 'man', '\u8d37': 'dai', '\u6da8': 'zhang', '\u97ad': 'bian', '\u7f0e': 'duan', '\u96b3': 'hui', '\u9e5e': 'yao', '\u8364': 'hun', '\u738e': 'ding', '\u64cd': 'cao', '\u626e': 'ban', '\u5239': 'sha', '\u766b': 'dian', '\u6ca5': 'li', '\u954f': 'liu', '\u660e': 'ming', '\u8d5c': 'ze', '\u6309': 'an', '\u60fa': 'xing', '\u6d33': 'ru', '\u9497': 'cha', '\u6211': 'wo', '\u7f00': 'zhui', '\u8dc6': 'tai', '\u764d': 'ban', '\u670b': 'peng', '\u6bd4': 'bi', '\u77bd': 'gu', '\u6ca4': 'ou', '\u5c4b': 'wu', '\u6590': 'fei', '\u54c4': 'hong', '\u6fc0': 'ji', '\u4fd7': 'su', '\u8268': 'meng', '\u6c74': 'bian', '\u60eb': 'bei', '\u8712': 'yan', '\u7eb9': 'wen', '\u5623': 'beng', '\u5e97': 'dian', '\u8e41': 'pian', '\u8862': 'qu', '\u5fd8': 'wang', '\u8167': 'shu', '\u6035': 'xu', '\u6988': 'lv', '\u8782': 'lang', '\u8315': 'qiong', '\u9896': 'ying', '\u5937': 'yi', '\u85ae': 'cou', '\u63b7': 'zhi', '\u5364': 'lu', '\u5357': 'nan', '\u5766': 'tan', '\u5907': 'bei', '\u561f': 'du', '\u5a75': 'chan', '\u9cc6': 'fu', '\u9012': 'di', '\u553e': 'tuo', '\u53fd': 'ji', '\u68a7': 'wu', '\u730e': 'lie', '\u6dee': 'huai', '\u719f': 'shu', '\u6101': 'chou', '\u5440': 'ya', '\u54d2': 'da', '\u7877': 'jian', '\u7ea8': 'wan', '\u70c0': 'hu', '\u789b': 'qi', '\u65ab': 'zhuo', '\u7768': 'ni', '\u7fa1': 'xian', '\u80bd': 'tai', '\u6dc0': 'dian', '\u6458': 'zhai', '\u962e': 'ruan', '\u556d': 'zhuan', '\u6cef': 'min', '\u9a88': 'pian', '\u8d33': 'shi', '\u9a92': 'ke', '\u853b': 'kou', '\u7b20': 'li', '\u55e8': 'hai', '\u5e7c': 'you', '\u6ce3': 'qi', '\u6dc6': 'xiao', '\u9492': 'fan', '\u5e84': 'zhuang', '\u6a17': 'chu', '\u5ba1': 'shen', '\u5c9c': 'ba', '\u4f0e': 'ji', '\u7b31': 'gou', '\u5c41': 'pi', '\u5e78': 'xing', '\u9648': 'chen', '\u5b37': 'ma', '\u5339': 'pi', '\u74ff': 'bu', '\u8c8c': 'mao', '\u71e5': 'zao', '\u98d8': 'piao', '\u9709': 'mei', '\u4f9b': 'gong', '\u5162': 'jing', '\u7cfb': 'xi', '\u72f3': 'yu', '\u6e3a': 'miao', '\u8deb': 'qiang', '\u6c88': 'shen', '\u76d6': 'gai', '\u5e94': 'ying', '\u4e66': 'shu', '\u54c8': 'ha', '\u82e0': 'min', '\u6905': 'yi', '\u75c3': 'xuan', '\u5f2f': 'wan', '\u66be': 'tun', '\u7f2b': 'zao', '\u888d': 'pao', '\u51fb': 'ji', '\u946b': 'xin', '\u5230': 'dao', '\u70b7': 'zhu', '\u680b': 'dong', '\u5acc': 'xian', '\u7519': 'dai', '\u87c0': 'shuai', '\u726e': 'jian', '\u6c34': 'shui', '\u8333': 'jiang', '\u738b': 'wang', '\u95f9': 'nao', '\u9ec9': 'hong', '\u9e31': 'chi', '\u5f18': 'hong', '\u9acb': 'kuan', '\u97ab': 'ju', '\u5987': 'fu', '\u76b2': 'jun', '\u7433': 'lin', '\u755c': 'xu', '\u52b3': 'lao', '\u6362': 'huan', '\u87db': 'peng', '\u78f2': 'qu', '\u63aa': 'cuo', '\u7a39': 'bian', '\u867c': 'ge', '\u5e2e': 'bang', '\u63be': 'chuan', '\u605a': 'hui', '\u72c2': 'kuang', '\u5e62': 'chuang', '\u9565': 'lu', '\u7f02': 'ke', '\u9001': 'song', '\u7239': 'die', '\u587e': 'shu', '\u52a2': 'mai', '\u7a84': 'zhai', '\u6613': 'yi', '\u57ed': 'dai', '\u557b': 'chi', '\u521d': 'chu', '\u5233': 'ku', '\u9878': 'an', '\u81f3': 'zhi', '\u8291': 'qi', '\u7941': 'qi', '\u5b8c': 'wan', '\u4f3d': 'jia', '\u7a3f': 'gao', '\u632f': 'zhen', '\u5192': 'mao', '\u90d3': 'yun', '\u917f': 'niang', '\u503c': 'zhi', '\u953e': 'huan', '\u4ed7': 'zhang', '\u9c94': 'wei', '\u7bb1': 'xiang', '\u4e0d': 'bu', '\u6e53': 'pen', '\u75ae': 'chuang', '\u7ecd': 'shao', '\u8457': 'zhu', '\u592e': 'yang', '\u8bc8': 'zha', '\u94f4': 'tang', '\u6e29': 'wen', '\u8584': 'bo', '\u77aa': 'deng', '\u7ad6': 'shu', '\u6c29': 'ya', '\u51e1': 'fan', '\u6eb7': 'hun', '\u6410': 'chu', '\u90a1': 'fang', '\u593c': 'kuang', '\u688f': 'gu', '\u8baa': 'shan', '\u6d48': 'cheng', '\u77cd': 'jue', '\u7856': 'xia', '\u843d': 'luo', '\u797a': 'qi', '\u8bda': 'cheng', '\u6000': 'huai', '\u55ec': 'he', '\u57a9': 'e', '\u7f1d': 'feng', '\u679c': 'guo', '\u5f20': 'zhang', '\u903e': 'yu', '\u949b': 'tai', '\u6d04': 'hui', '\u9885': 'lu', '\u6237': 'hu', '\u9559': 'luo', '\u806a': 'cong', '\u5ced': 'qiao', '\u5f7b': 'che', '\u88e4': 'ku', '\u7011': 'pu', '\u82b9': 'qin', '\u791e': 'meng', '\u5f71': 'ying', '\u918d': 'ti', '\u9f89': 'yu', '\u8be7': 'cha', '\u5abe': 'gou', '\u5a6a': 'lan', '\u8037': 'da', '\u91d1': 'jin', '\u6ca7': 'cang', '\u69ca': 'shuo', '\u846b': 'hu', '\u6614': 'xi', '\u533b': 'yi', '\u69b7': 'que', '\u66e6': 'xi', '\u6cb8': 'fei', '\u70ed': 're', '\u8d42': 'lu', '\u585e': 'sai', '\u915d': 'yun', '\u6844': 'guang', '\u8043': 'dan', '\u5ead': 'ting', '\u63a0': 'lue', '\u626d': 'niu', '\u7c3f': 'bu', '\u7322': 'hu', '\u6251': 'pu', '\u9f87': 'chai', '\u7ed4': 'ku', '\u830f': 'long', '\u77a7': 'qiao', '\u54c6': 'duo', '\u80dd': 'chi', '\u77e7': 'shen', '\u607f': 'yong', '\u731d': 'cu', '\u7626': 'shou', '\u8153': 'fei', '\u5c45': 'ji', '\u6838': 'he', '\u8309': 'mo', '\u9f80': 'chen', '\u7f33': 'huan', '\u9f7f': 'chi', '\u5e16': 'tie', '\u584d': 'cheng', '\u5f2a': 'jing', '\u9b0f': 'jiu', '\u5c09': 'wei', '\u5356': 'mai', '\u96c6': 'ji', '\u79cb': 'qiu', '\u6756': 'zhang', '\u6800': 'zhi', '\u5148': 'xian', '\u90c1': 'yu', '\u6026': 'peng', '\u8c62': 'huan', '\u5cb3': 'yue', '\u6d27': 'wei', '\u8a79': 'zhan', '\u5bd2': 'han', '\u622e': 'lu', '\u695a': 'chu', '\u9a6e': 'tuo', '\u72f8': 'li', '\u7f19': 'jin', '\u7897': 'wan', '\u63d6': 'yi', '\u540f': 'li', '\u7830': 'peng', '\u4ecd': 'reng', '\u6883': 'ting', '\u8c2d': 'tan', '\u723d': 'shuang', '\u4fcf': 'qiao', '\u5632': 'chao', '\u562c': 'chuai', '\u6da1': 'wo', '\u5ce6': 'luan', '\u591f': 'gou', '\u9e6d': 'lu', '\u8f91': 'ji', '\u4fc5': 'qiu', '\u8d23': 'ze', '\u7470': 'gui', '\u96f6': 'ling', '\u852c': 'shu', '\u65a5': 'chi', '\u6d35': 'xuan', '\u54ce': 'ai', '\u70e4': 'kao', '\u4ef2': 'zhong', '\u6d0c': 'lie', '\u949d': 'dun', '\u54ea': 'na', '\u4f50': 'zuo', '\u79ba': 'yu', '\u839e': 'guan', '\u6994': 'lang', '\u5453': 'yi', '\u4f63': 'yong', '\u81aa': 'chuai', '\u8350': 'jian', '\u4e08': 'zhang', '\u6b8d': 'piao', '\u5e0c': 'xi', '\u5587': 'la', '\u6a7c': 'yuan', '\u5c16': 'jian', '\u767d': 'bai', '\u62ed': 'shi', '\u6840': 'jie', '\u5d9d': 'deng', '\u62d8': 'ju', '\u5ce4': 'jiao', '\u5be8': 'zhai', '\u952b': 'pei', '\u592d': 'yao', '\u6289': 'jue', '\u4e45': 'jiu', '\u82e1': 'yi', '\u5f97': 'de', '\u5d0e': 'qi', '\u8378': 'bi', '\u6577': 'fu', '\u9985': 'xian', '\u9730': 'san', '\u6177': 'kang', '\u8d4a': 'she', '\u6c99': 'sha', '\u9f9a': 'gong', '\u9b1f': 'huan', '\u4eff': 'fang', '\u826f': 'liang', '\u5ca3': 'gou', '\u895f': 'jin', '\u8118': 'wan', '\u5f73': 'chi', '\u82e3': 'ju', '\u5320': 'jiang', '\u6321': 'dang', '\u8fc5': 'xun', '\u97f6': 'shao', '\u9644': 'fu', '\u68ad': 'suo', '\u8e4b': 'ta', '\u9792': 'qiao', '\u9998': 'guo', '\u7f72': 'shu', '\u6001': 'tai', '\u5e91': 'wu', '\u6d95': 'ti', '\u54d1': 'ya', '\u9f9b': 'kan', '\u82a8': 'ji', '\u873b': 'qing', '\u7ca4': 'yue', '\u55b1': 'li', '\u82df': 'gou', '\u7352': 'jie', '\u67fd': 'cheng', '\u4f1a': 'hui', '\u6e2d': 'wei', '\u5238': 'quan', '\u9cd4': 'biao', '\u5043': 'yan', '\u6206': 'gang', '\u67b6': 'jia', '\u868c': 'bang', '\u59bb': 'qi', '\u6912': 'jiao', '\u753e': 'zai', '\u6224': 'gai', '\u864f': 'lu', '\u8757': 'huang', '\u62e9': 'ze', '\u647a': 'la', '\u7f9a': 'ling', '\u8bd5': 'shi', '\u6743': 'quan', '\u808b': 'le', '\u6d63': 'huan', '\u538c': 'yan', '\u63ea': 'jiu', '\u5b34': 'ying', '\u9ab1': 'jie', '\u9532': 'qie', '\u6bdb': 'mao', '\u892a': 'tui', '\u8151': 'fu', '\u7f42': 'ying', '\u64b5': 'nian', '\u8bce': 'qu', '\u840f': 'dan', '\u7481': 'cong', '\u809f': 'wo', '\u9569': 'chuan', '\u887f': 'jin', '\u9542': 'lou', '\u82b3': 'fang', '\u8c35': 'zhan', '\u8f84': 'zhe', '\u75a4': 'ba', '\u7b79': 'chou', '\u78f4': 'deng', '\u568f': 'ti', '\u4fee': 'xiu', '\u9ae6': 'mao', '\u9c7f': 'you', '\u96c4': 'xiong', '\u52cb': 'xun', '\u8d25': 'bai', '\u8c00': 'yu', '\u5eb6': 'shu', '\u67e9': 'jiu', '\u5824': 'di', '\u6cd7': 'si', '\u877b': 'nan', '\u95f3': 'hong', '\u75bd': 'ju', '\u9cb8': 'jing', '\u841d': 'luo', '\u94ad': 'dou', '\u6775': 'chu', '\u9675': 'ling', '\u73cf': 'jue', '\u5e8a': 'chuang', '\u7b80': 'jian', '\u75a3': 'you', '\u5999': 'miao', '\u60f3': 'xiang', '\u5b84': 'gui', '\u87ba': 'luo', '\u5bab': 'gong', '\u7c7b': 'lei', '\u6d17': 'xi', '\u6d19': 'zhu', '\u5527': 'ji', '\u9102': 'e', '\u79b3': 'rang', '\u642a': 'tang', '\u8000': 'yao', '\u86a8': 'fu', '\u72f7': 'juan', '\u567c': 'pi', '\u7459': 'nao', '\u82ac': 'fen', '\u7b15': 'jian', '\u7c97': 'cu', '\u5e7d': 'you', '\u6f29': 'xuan', '\u72c3': 'niu', '\u916c': 'chou', '\u88c1': 'cai', '\u9ca9': 'huan', '\u572f': 'yi', '\u72b7': 'guang', '\u9a7d': 'nu', '\u8c23': 'yao', '\u7b19': 'sheng', '\u714e': 'jian', '\u85e4': 'teng', '\u6076': 'e', '\u77d7': 'chu', '\u5484': 'duo', '\u73b2': 'ling', '\u96c1': 'yan', '\u8c18': 'zi', '\u90b1': 'qiu', '\u5cb5': 'hu', '\u8f8d': 'chuo', '\u6caa': 'hu', '\u6d45': 'qian', '\u6307': 'zhi', '\u6f46': 'ying', '\u7edd': 'jue', '\u8086': 'si', '\u91a2': 'hai', '\u9ac0': 'bi', '\u5567': 'ze', '\u951b': 'ben', '\u75b9': 'zhen', '\u539d': 'cuo', '\u817c': 'mian', '\u5b57': 'zi', '\u5ad6': 'piao', '\u6fa1': 'zao', '\u9c85': 'ba', '\u7957': 'zhi', '\u8bb0': 'ji', '\u8e40': 'die', '\u6e5b': 'zhan', '\u6901': 'guo', '\u6f84': 'cheng', '\u9995': 'nang', '\u9e48': 'ti', '\u9501': 'suo', '\u8fc7': 'guo', '\u9e3a': 'xiu', '\u690e': 'zhui', '\u5865': 'ge', '\u9cba': 'shi', '\u87ac': 'cao', '\u9a74': 'lv', '\u67e2': 'di', '\u5537': 'yo', '\u901d': 'shi', '\u9669': 'xian', '\u9e23': 'ming', '\u5546': 'shang', '\u9ee5': 'qing', '\u8ba5': 'ji', '\u675e': 'qi', '\u4edd': 'tong', '\u7511': 'zeng', '\u95f2': 'xian', '\u90f8': 'dan', '\u51c6': 'zhun', '\u4f5e': 'ning', '\u822b': 'fang', '\u62a0': 'kou', '\u7c4d': 'ji', '\u7118': 'dao', '\u81ec': 'nie', '\u62a1': 'liu', '\u7638': 'que', '\u6dde': 'song', '\u7164': 'mei', '\u8e72': 'dun', '\u4fd0': 'li', '\u4f3a': 'si', '\u53fc': 'diao', '\u5254': 'ti', '\u6d32': 'zhou', '\u8d3d': 'zhi', '\u52ad': 'shao', '\u9a7a': 'zhu', '\u7985': 'chan', '\u7f17': 'hun', '\u89de': 'shang', '\u8654': 'qian', '\u8c15': 'yu', '\u65e7': 'jiu', '\u775a': 'ya', '\u6b3a': 'qi', '\u73b3': 'dai', '\u79bd': 'qin', '\u9010': 'zhu', '\u6d9b': 'tao', '\u6485': 'jue', '\u7f57': 'luo', '\u7fc1': 'weng', '\u7984': 'lu', '\u6cee': 'pan', '\u855e': 'zhuo', '\u80bc': 'jing', '\u9ed4': 'qian', '\u8dfa': 'duo', '\u5958': 'zang', '\u8549': 'jiao', '\u8146': 'tian', '\u6619': 'tan', '\u97a3': 'rou', '\u5428': 'dun', '\u9890': 'yi', '\u5ae9': 'nen', '\u5b66': 'xue', '\u4f94': 'mao', '\u5361': 'ka', '\u52d6': 'mao', '\u5d3e': 'yao', '\u82ae': 'rui', '\u9e4f': 'peng', '\u987f': 'dun', '\u614e': 'shen', '\u7ef1': 'shang', '\u5385': 'ting', '\u95e9': 'shuan', '\u6874': 'fu', '\u5881': 'man', '\u4ee8': 'sa', '\u86ed': 'zhi', '\u9704': 'xiao', '\u565c': 'lu', '\u9e9d': 'she', '\u95f4': 'jian', '\u9a8c': 'yan', '\u59a4': 'yu', '\u964b': 'lou', '\u8681': 'yi', '\u796d': 'ji', '\u736d': 'ta', '\u5f27': 'hu', '\u62f3': 'quan', '\u54bf': 'yi', '\u9cb7': 'zhou', '\u7740': 'zhou', '\u80fc': 'pian', '\u7ecc': 'chu', '\u7800': 'dang', '\u8182': 'lv', '\u97e9': 'han', '\u9994': 'xuan', '\u68da': 'peng', '\u65ed': 'xu', '\u7b85': 'bi', '\u51b3': 'jue', '\u577c': 'che', '\u5e31': 'chou', '\u553f': 'hu', '\u624c': 'shou', '\u6c1a': 'chuan', '\u83e9': 'pu', '\u5476': 'nu', '\u858f': 'yi', '\u67c1': 'duo', '\u7548': 'fan', '\u800d': 'shua', '\u56fd': 'guo', '\u4e8f': 'kui', '\u680c': 'lu', '\u4f4f': 'zhu', '\u6518': 'rang', '\u956f': 'shu', '\u7f26': 'man', '\u67a3': 'zao', '\u819d': 'xi', '\u749c': 'huang', '\u5e87': 'bi', '\u53d6': 'qu', '\u4e91': 'yun', '\u9058': 'gou', '\u817a': 'xian', '\u9534': 'jie', '\u7337': 'you', '\u9600': 'fa', '\u94d1': 'lao', '\u80dc': 'sheng', '\u6e2f': 'gang', '\u4f5a': 'die', '\u9aa7': 'xiang', '\u6978': 'qiu', '\u53e3': 'kou', '\u9aef': 'ran', '\u9cb6': 'nian', '\u59ec': 'ji', '\u8d29': 'fan', '\u819c': 'mo', '\u9097': 'han', '\u5f0b': 'yi', '\u8c0f': 'jian', '\u5c0a': 'zun', '\u6f20': 'mo', '\u626c': 'yang', '\u8f93': 'shu', '\u76d0': 'yan', '\u663e': 'xian', '\u86f0': 'zhe', '\u6446': 'bai', '\u6ee5': 'lan', '\u8d44': 'zi', '\u72c1': 'yun', '\u7be1': 'cuan', '\u6eb4': 'chou', '\u89cb': 'xi', '\u641b': 'jian', '\u6444': 'she', '\u5f1b': 'chi', '\u7c73': 'mi', '\u59aa': 'yu', '\u7a17': 'bai', '\u6e6b': 'qiu', '\u9707': 'zhen', '\u918c': 'kun', '\u7272': 'sheng', '\u9a9e': 'qian', '\u94e2': 'zhu', '\u7fbf': 'yi', '\u9a7f': 'yi', '\u8302': 'mao', '\u8fed': 'die', '\u4e22': 'ding', '\u4e00': 'yi', '\u7be6': 'bi', '\u5b64': 'gu', '\u5c1d': 'chang', '\u6eaf': 'su', '\u8868': 'biao', '\u6570': 'shu', '\u8354': 'li', '\u6cc5': 'qiu', '\u82b7': 'zhi', '\u6fee': 'pu', '\u5501': 'yan', '\u5b71': 'chan', '\u5979': 'ta', '\u7eca': 'ban', '\u9521': 'xi', '\u76c8': 'ying', '\u6fb3': 'ao', '\u5c3d': 'jin', '\u529b': 'li', '\u5cbf': 'kui', '\u6fe0': 'hao', '\u699b': 'zhen', '\u7686': 'jie', '\u60b8': 'ji', '\u7630': 'luo', '\u853a': 'lin', '\u72d0': 'hu', '\u68af': 'ti', '\u6b79': 'dai', '\u6bb5': 'duan', '\u5599': 'hui', '\u9552': 'yi', '\u5d4a': 'cheng', '\u96b6': 'li', '\u57d8': 'shi', '\u7b08': 'ji', '\u5355': 'dan', '\u622a': 'jie', '\u9515': 'a', '\u866c': 'qiu', '\u9762': 'mian', '\u4e25': 'yan', '\u8411': 'zhui', '\u900f': 'tou', '\u6c8c': 'chun', '\u7a77': 'qiong', '\u94c5': 'qian', '\u94b4': 'gu', '\u987a': 'shun', '\u82c1': 'cong', '\u611a': 'yu', '\u7e9f': 'jiao', '\u7ebf': 'xian', '\u6295': 'tou', '\u66b9': 'xian', '\u5cb1': 'dai', '\u91ba': 'xun', '\u9609': 'yan', '\u8c82': 'diao', '\u753a': 'ding', '\u664c': 'shang', '\u4ea6': 'yi', '\u6539': 'gai', '\u6e05': 'qing', '\u609d': 'kui', '\u5c48': 'qu', '\u7ea9': 'kuang', '\u6155': 'mu', '\u8ddb': 'bo', '\u7afa': 'zhu', '\u57f8': 'yi', '\u59dc': 'jiang', '\u8864': 'yi', '\u5fd6': 'cun', '\u7737': 'juan', '\u4e56': 'guai', '\u96a7': 'sui', '\u5a18': 'niang', '\u6279': 'pi', '\u953c': 'sou', '\u6e0a': 'yuan', '\u7ae0': 'zhang', '\u7a51': 'se', '\u728d': 'jian', '\u7b9d': 'qian', '\u4e2d': 'zhong', '\u7736': 'kuang', '\u8160': 'cou', '\u539f': 'yuan', '\u6849': 'an', '\u6f8c': 'si', '\u7b54': 'da', '\u8f70': 'hong', '\u7ccd': 'ci', '\u9e63': 'jian', '\u5e19': 'zhi', '\u65c3': 'zhan', '\u7f30': 'jiang', '\u5177': 'ju', '\u5ea7': 'zuo', '\u6c06': 'pu', '\u97ea': 'wei', '\u5bc5': 'yin', '\u5f95': 'lai', '\u4eac': 'jing', '\u6da7': 'jian', '\u636d': 'ba', '\u59a5': 'tuo', '\u6934': 'duan', '\u6c2e': 'dan', '\u81bb': 'shan', '\u6717': 'lang', '\u90c5': 'zhi', '\u62c4': 'zhu', '\u6388': 'shou', '\u57ce': 'cheng', '\u7edf': 'tong', '\u6350': 'juan', '\u9881': 'ban', '\u6de1': 'dan', '\u7ef8': 'chou', '\u88f4': 'pei', '\u6d85': 'nie', '\u574d': 'tan', '\u6735': 'duo', '\u6ed1': 'hua', '\u841c': 'tie', '\u7b45': 'xian', '\u5ce5': 'zheng', '\u8018': 'yun', '\u5ca9': 'yan', '\u5d6c': 'wei', '\u5cfb': 'jun', '\u5a77': 'ting', '\u5f99': 'xi', '\u9192': 'xing', '\u8bfa': 'nuo', '\u7b50': 'kuang', '\u954c': 'juan', '\u9016': 'ti', '\u78d0': 'pan', '\u9511': 'ti', '\u5a25': 'e', '\u60f4': 'chuan', '\u6846': 'kuang', '\u9512': 'lang', '\u79d2': 'miao', '\u76c5': 'zhong', '\u8d3c': 'zei', '\u93ca': 'ao', '\u6042': 'shun', '\u5bf9': 'dui', '\u6b23': 'xin', '\u8d6b': 'he', '\u7f11': 'gou', '\u7618': 'lou', '\u7ee2': 'juan', '\u680e': 'li', '\u865e': 'yu', '\u8797': 'tang', '\u6106': 'qian', '\u4f1e': 'san', '\u68c2': 'ling', '\u6115': 'e', '\u7811': 'ya', '\u57ae': 'kua', '\u5323': 'xia', '\u801c': 'si', '\u8df3': 'tiao', '\u900b': 'bu', '\u69ed': 'qi', '\u8c1f': 'mo', '\u5986': 'zhuang', '\u631a': 'zhi', '\u6b43': 'sha', '\u68f0': 'chui', '\u94b9': 'bo', '\u5434': 'wu', '\u88f3': 'shang', '\u9a6f': 'xun', '\u5415': 'lv', '\u610f': 'yi', '\u73c8': 'jia', '\u74de': 'die', '\u8ff3': 'jing', '\u89d1': 'qu', '\u51eb': 'fu', '\u7678': 'gui', '\u836c': 'mai', '\u65fa': 'wang', '\u809b': 'gang', '\u756a': 'fan', '\u6c89': 'chen', '\u8c32': 'jue', '\u7f5f': 'gu', '\u6c5b': 'xun', '\u67dd': 'tuo', '\u8611': 'mo', '\u6ca1': 'mei', '\u9f3d': 'qiu', '\u63ae': 'qian', '\u916e': 'tong', '\u5df2': 'yi', '\u787c': 'peng', '\u9e7e': 'cuo', '\u70d9': 'lao', '\u9aa4': 'zhou', '\u83b9': 'ying', '\u5fd9': 'mang', '\u94c8': 'shi', '\u800c': 'er', '\u6833': 'lao', '\u8774': 'hu', '\u9519': 'cuo', '\u75d5': 'hen', '\u5065': 'jian', '\u8446': 'bao', '\u8e1f': 'chi', '\u6b32': 'yu', '\u8365': 'xing', '\u510b': 'dan', '\u672f': 'shu', '\u8bf1': 'you', '\u66f4': 'geng', '\u6050': 'kong', '\u7837': 'shen', '\u5a4a': 'biao', '\u740a': 'ya', '\u75c5': 'bing', '\u89dc': 'zi', '\u52ab': 'jie', '\u5bb6': 'jia', '\u9ed1': 'hei', '\u5a1f': 'juan', '\u6c1b': 'fen', '\u542d': 'keng', '\u76f8': 'xiang', '\u5bc4': 'ji', '\u5240': 'kai', '\u86cb': 'dan', '\u828a': 'qian', '\u59a3': 'bi', '\u9c8b': 'chou', '\u873e': 'guo', '\u89e3': 'jie', '\u6215': 'zang', '\u500d': 'bei', '\u8349': 'cao', '\u761f': 'wen', '\u94ee': 'zheng', '\u61ac': 'jing', '\u8343': 'quan', '\u634e': 'shao', '\u4fa5': 'jiao', '\u59af': 'chou', '\u8451': 'feng', '\u5c79': 'yi', '\u56af': 'huo', '\u6491': 'cheng', '\u60ee': 'dan', '\u7f05': 'mian', '\u8273': 'yan', '\u741a': 'ju', '\u8c0d': 'die', '\u846d': 'xia', '\u9546': 'mo', '\u8036': 'ye', '\u7325': 'wei', '\u8eb2': 'duo', '\u5588': 'jie', '\u60a0': 'you', '\u6697': 'an', '\u5bde': 'mo', '\u90a6': 'bang', '\u5d1b': 'jue', '\u602b': 'bei', '\u94a5': 'yue', '\u5685': 'ru', '\u7eb8': 'zhi', '\u767e': 'bai', '\u5b9b': 'wan', '\u7ff1': 'ao', '\u5a3c': 'chang', '\u9716': 'lin', '\u71e0': 'yu', '\u9654': 'gai', '\u8d32': 'bi', '\u66dd': 'pu', '\u87b3': 'tang', '\u827f': 'nai', '\u98a2': 'hao', '\u69db': 'jian', '\u5e7b': 'huan', '\u5386': 'li', '\u4e52': 'ping', '\u76d2': 'he', '\u963d': 'dian', '\u6292': 'shu', '\u6014': 'zheng', '\u94b8': 'xi', '\u75e3': 'zhi', '\u7edb': 'jiang', '\u8ba8': 'tao', '\u7ca2': 'zi', '\u74dc': 'gua', '\u5550': 'zu', '\u752f': 'ning', '\u7f71': 'lan', '\u7acb': 'li', '\u507e': 'fen', '\u77e3': 'yi', '\u6cea': 'lei', '\u81ba': 'ying', '\u830e': 'jing', '\u94ab': 'fang', '\u54cd': 'xiang', '\u9aba': 'hou', '\u8783': 'bang', '\u5c63': 'xi', '\u73b0': 'xian', '\u8fb6': 'chuo', '\u68fc': 'fen', '\u869c': 'ya', '\u61be': 'han', '\u7901': 'jiao', '\u6bd5': 'bi', '\u5533': 'li', '\u7236': 'fu', '\u6482': 'liao', '\u714a': 'xuan', '\u755a': 'ben', '\u8438': 'yu', '\u6c38': 'yong', '\u824b': 'meng', '\u601c': 'lian', '\u9164': 'gu', '\u6c42': 'qiu', '\u51a5': 'ming', '\u91b4': 'li', '\u8299': 'fu', '\u5e95': 'di', '\u9cd0': 'yao', '\u86c0': 'zhu', '\u6b9b': 'ji', '\u9a70': 'chi', '\u6c7d': 'qi', '\u64c5': 'shan', '\u6525': 'zuan', '\u9e43': 'juan', '\u53d7': 'shou', '\u88a4': 'mao', '\u8bc6': 'shi', '\u67ab': 'feng', '\u6714': 'shuo', '\u62c5': 'dan', '\u551b': 'ma', '\u7ee1': 'xiao', '\u6b49': 'qian', '\u8e69': 'bie', '\u5962': 'she', '\u963b': 'zu', '\u89c1': 'jian', '\u5305': 'bao', '\u6cb9': 'you', '\u4e50': 'le', '\u88c6': 'dang', '\u6096': 'bei', '\u9cc4': 'e', '\u638f': 'tao', '\u55cd': 'shuo', '\u51b5': 'kuang', '\u535c': 'bu', '\u7cef': 'nuo', '\u8d2e': 'zhu', '\u8a48': 'li', '\u51ef': 'kai', '\u655e': 'chang', '\u7d22': 'suo', '\u6cbe': 'zhan', '\u5ff8': 'niu', '\u75e2': 'li', '\u7845': 'gui', '\u754e': 'quan', '\u8bad': 'xun', '\u9551': 'bang', '\u7094': 'que', '\u7538': 'dian', '\u5693': 'ca', '\u88e8': 'bi', '\u67d8': 'zhe', '\u59cb': 'shi', '\u7aa5': 'kui', '\u6769': 'ma', '\u74f4': 'ling', '\u7eaf': 'chun', '\u76fc': 'pan', '\u836d': 'hong', '\u8881': 'yuan', '\u4ef7': 'jia', '\u857e': 'lei', '\u9274': 'jian', '\u6fc2': 'lian', '\u864d': 'fu', '\u695e': 'leng', '\u7fd8': 'qiao', '\u8d2b': 'pin', '\u9e69': 'liao', '\u9000': 'tui', '\u601d': 'si', '\u57e4': 'bei', '\u9e82': 'ji', '\u8f69': 'xuan', '\u7a02': 'lang', '\u4f67': 'ka', '\u8859': 'ya', '\u9cdf': 'zun', '\u828d': 'shao', '\u61cb': 'mao', '\u5a55': 'jie', '\u7cb9': 'cui', '\u53a5': 'jue', '\u566c': 'shi', '\u8788': 'yuan', '\u64ad': 'bo', '\u964c': 'mo', '\u817f': 'tui', '\u9095': 'yong', '\u8f6d': 'e', '\u5981': 'shuo', '\u94be': 'jia', '\u4e3d': 'li', '\u5706': 'yuan', '\u5450': 'na', '\u9a73': 'bo', '\u6d4b': 'ce', '\u6120': 'wen', '\u50f3': 'su', '\u6b8a': 'shu', '\u758b': 'pi', '\u4ee5': 'yi', '\u6f88': 'che', '\u978d': 'an', '\u9e20': 'qiu', '\u886e': 'gun', '\u5b7a': 'ru', '\u8015': 'geng', '\u574f': 'huai', '\u8386': 'pu', '\u8170': 'yao', '\u8c25': 'shi', '\u8347': 'xing', '\u8ba9': 'rang', '\u9980': 'ye', '\u75f9': 'bi', '\u520e': 'wen', '\u73b7': 'dian', '\u9e4c': 'an', '\u64b0': 'zhuan', '\u6868': 'jiang', '\u7ec4': 'zu', '\u784c': 'ge', '\u68b5': 'fan', '\u5764': 'kun', '\u86ca': 'gu', '\u943e': 'bei', '\u79e9': 'zhi', '\u8bbc': 'song', '\u996f': 'jian', '\u6b22': 'huan', '\u51a2': 'zhong', '\u6fb6': 'chan', '\u804b': 'long', '\u5175': 'bing', '\u7a98': 'jiong', '\u55f7': 'ao', '\u53fb': 'le', '\u4e18': 'qiu', '\u5c2c': 'ga', '\u956d': 'lei', '\u955f': 'xuan', '\u94b2': 'zheng', '\u5188': 'gang', '\u94aa': 'kang', '\u828e': 'xiong', '\u539a': 'hou', '\u8bc9': 'su', '\u535f': 'bu', '\u52c9': 'mian', '\u7167': 'zhao', '\u94d7': 'jia', '\u7a88': 'yao', '\u7f09': 'ji', '\u6ea2': 'yi', '\u821b': 'chuan', '\u7ce8': 'jiang', '\u5e96': 'pao', '\u90fd': 'du', '\u62fd': 'zhuai', '\u52b1': 'li', '\u7c91': 'ba', '\u65ec': 'xun', '\u8d62': 'ying', '\u62da': 'pin', '\u7c9f': 'su', '\u69c1': 'gao', '\u6f74': 'zhu', '\u6e7f': 'shi', '\u7410': 'suo', '\u7f04': 'jian', '\u58f3': 'ke', '\u6c9b': 'pei', '\u51cf': 'jian', '\u8de8': 'kua', '\u867a': 'hui', '\u51a4': 'yuan', '\u859c': 'bai', '\u5591': 'yin', '\u51f5': 'kan', '\u5360': 'zhan', '\u84dd': 'lan', '\u62f6': 'za', '\u76fe': 'dun', '\u62c7': 'mu', '\u63b8': 'dan', '\u6984': 'lan', '\u656c': 'jing', '\u57c3': 'ai', '\u53a8': 'chu', '\u5858': 'tang', '\u71ac': 'ao', '\u948c': 'liao', '\u8dea': 'gui', '\u72ec': 'du', '\u6979': 'ying', '\u5366': 'gua', '\u4f38': 'shen', '\u63f6': 'ye', '\u91ca': 'shi', '\u9ca0': 'geng', '\u75b8': 'da', '\u6731': 'zhu', '\u8c16': 'xuan', '\u9776': 'ba', '\u9ca8': 'sha', '\u8bd3': 'kuang', '\u75e8': 'lao', '\u5de7': 'qiao', '\u94e0': 'kai', '\u5c7a': 'qi', '\u88ab': 'bei', '\u9487': 'yi', '\u5417': 'ma', '\u5f25': 'mi', '\u4ec7': 'chou', '\u6bd3': 'yu', '\u6e23': 'zha', '\u6f7c': 'tong', '\u54e6': 'ou', '\u623f': 'fang', '\u5739': 'kuang', '\u5916': 'wai', '\u6864': 'qi', '\u5fbc': 'jiao', '\u9169': 'ming', '\u94c1': 'tie', '\u6b96': 'zhi', '\u63c4': 'yu', '\u7a46': 'mu', '\u699c': 'bang', '\u6d1a': 'jiang', '\u9a85': 'hua', '\u8366': 'luo', '\u662d': 'zhao', '\u89ef': 'zhi', '\u86ba': 'tian', '\u9cae': 'ling', '\u9e6b': 'jiu', '\u65e9': 'zao', '\u5185': 'na', '\u9e6c': 'shu', '\u78c5': 'bang', '\u53d1': 'fa', '\u8df8': 'bi', '\u7829': 'fei', '\u823b': 'lu', '\u5cd9': 'zhi', '\u5e93': 'ku', '\u7ade': 'jing', '\u9a87': 'hai', '\u9694': 'ge', '\u556e': 'nie', '\u6b20': 'qian', '\u6602': 'ang', '\u7574': 'chou', '\u5c1c': 'ga', '\u6599': 'liao', '\u6ee6': 'luan', '\u5375': 'luan', '\u4f25': 'chang', '\u5956': 'jiang', '\u6387': 'duo', '\u9686': 'long', '\u7afd': 'yu', '\u5353': 'zhuo', '\u7f81': 'ji', '\u6773': 'yao', '\u788c': 'lu', '\u9f0e': 'ding', '\u80da': 'pei', '\u6e86': 'xu', '\u7594': 'ding', '\u6162': 'man', '\u68f1': 'ling', '\u77fe': 'fan', '\u67da': 'you', '\u65cb': 'xuan', '\u7f58': 'fu', '\u6549': 'mi', '\u5e05': 'shuai', '\u80a2': 'zhi', '\u6aab': 'cha', '\u90a3': 'na', '\u4f59': 'yu', '\u5180': 'ji', '\u840d': 'ping', '\u54a9': 'mie', '\u7825': 'di', '\u7b6e': 'shi', '\u9146': 'feng', '\u829c': 'wu', '\u62bf': 'min', '\u63a9': 'yan', '\u865a': 'xu', '\u75ac': 'li', '\u722c': 'pa', '\u7085': 'gui', '\u9510': 'rui', '\u8f6f': 'ruan', '\u9a79': 'ju', '\u5785': 'long', '\u7f0c': 'si', '\u634b': 'lv', '\u9e8b': 'mi', '\u8ba0': 'yan', '\u5f98': 'pai', '\u6655': 'yun', '\u7cca': 'hu', '\u8dda': 'shan', '\u541f': 'yin', '\u8020': 'huo', '\u94e5': 'diu', '\u91ce': 'ye', '\u9cd6': 'bie', '\u776c': 'cai', '\u53f1': 'chi', '\u60a3': 'huan', '\u62db': 'zhao', '\u5b5f': 'meng', '\u786c': 'ying', '\u9e58': 'gu', '\u77b0': 'kan', '\u9cc3': 'sai', '\u5e54': 'man', '\u82d5': 'shao', '\u54ff': 'ge', '\u55fe': 'sou', '\u85fb': 'zao', '\u7707': 'miao', '\u7b28': 'ben', '\u72ed': 'xia', '\u6c14': 'qi', '\u8e52': 'pan', '\u5b75': 'fu', '\u99a5': 'fu', '\u73e5': 'er', '\u5173': 'guan', '\u590f': 'xia', '\u9e26': 'ya', '\u6345': 'tong', '\u6311': 'tao', '\u8913': 'bao', '\u9a78': 'fu', '\u50ba': 'chi', '\u4e32': 'chuan', '\u7b3c': 'long', '\u541e': 'tun', '\u8c2f': 'qiao', '\u6995': 'rong', '\u6f72': 'shao', '\u5564': 'pi', '\u5378': 'xie', '\u8bbe': 'she', '\u5608': 'cao', '\u7620': 'ji', '\u89ca': 'ji', '\u530f': 'pao', '\u77e5': 'zhi', '\u9647': 'long', '\u7455': 'xia', '\u74ba': 'wen', '\u5c9a': 'lan', '\u577b': 'di', '\u8c05': 'liang', '\u739b': 'ma', '\u575c': 'li', '\u7f25': 'piao', '\u5195': 'mian', '\u5f77': 'fang', '\u64e2': 'zhuo', '\u55b3': 'zha', '\u8d4d': 'ji', '\u65e6': 'dan', '\u72f2': 'sun', '\u8966': 'ru', '\u5151': 'dui', '\u620a': 'wu', '\u5659': 'qin', '\u70ae': 'pao', '\u6ce5': 'ni', '\u8a3e': 'zi', '\u599e': 'niu', '\u90dd': 'hao', '\u6025': 'ji', '\u83df': 'tu', '\u7c7d': 'zi', '\u667a': 'zhi', '\u77bf': 'qu', '\u8d5a': 'zhuan', '\u8bee': 'qiao', '\u83c7': 'gu', '\u6987': 'chen', '\u4f0a': 'yi', '\u78b9': 'xuan', '\u9ea6': 'mai', '\u8bf0': 'gao', '\u5e80': 'pi', '\u5be5': 'liao', '\u6e17': 'shen', '\u87d2': 'mang', '\u8be1': 'gui', '\u7ed9': 'gei', '\u5377': 'juan', '\u75c8': 'yong', '\u7095': 'kang', '\u7a20': 'chou', '\u779f': 'piao', '\u9882': 'song', '\u9535': 'qiang', '\u5835': 'du', '\u6c07': 'lu', '\u8368': 'qian', '\u5472': 'ci', '\u504f': 'pian', '\u5b6a': 'luan', '\u9ccf': 'guan', '\u690b': 'liang', '\u9a93': 'zhui', '\u70f9': 'peng', '\u56de': 'hui', '\u66db': 'xun', '\u53f6': 'ye', '\u54ed': 'ku', '\u9676': 'tao', '\u9570': 'lian', '\u8d75': 'zhao', '\u4f11': 'xiu', '\u75e7': 'sha', '\u56da': 'qiu', '\u6f33': 'zhang', '\u6641': 'chao', '\u6787': 'pi', '\u5321': 'kuang', '\u88f9': 'guo', '\u81ca': 'sao', '\u77f8': 'gan', '\u94ea': 'ge', '\u6867': 'gui', '\u7aac': 'dou', '\u53eb': 'jiao', '\u7b95': 'ji', '\u94ce': 'duo', '\u8424': 'ying', '\u8231': 'cang', '\u9f50': 'qi', '\u74a9': 'qu', '\u76ee': 'mu', '\u79a7': 'xi', '\u57a4': 'die', '\u9ac2': 'ge', '\u9f3e': 'han', '\u7687': 'huang', '\u6708': 'yue', '\u5885': 'shu', '\u87ee': 'shan', '\u4e61': 'xiang', '\u7ef5': 'mian', '\u96c9': 'zhi', '\u6249': 'fei', '\u8bba': 'lun', '\u6a3e': 'yue', '\u57d4': 'pu', '\u629a': 'fu', '\u50ec': 'jiao', '\u9f3b': 'bi', '\u9022': 'feng', '\u4e8e': 'yu', '\u4ea9': 'mu', '\u9ca6': 'tiao', '\u54e9': 'li', '\u77ee': 'ai', '\u6e38': 'you', '\u78a5': 'bian', '\u671d': 'chao', '\u88ce': 'cheng', '\u6fc9': 'sui', '\u8bfb': 'du', '\u7e9b': 'dao', '\u519c': 'nong', '\u629f': 'zhuan', '\u60d8': 'wang', '\u6c27': 'yang', '\u7b0f': 'hu', '\u845c': 'qia', '\u8d2c': 'bian', '\u6760': 'gong', '\u6750': 'cai', '\u8877': 'zhong', '\u6ecf': 'fu', '\u9f51': 'ji', '\u5281': 'qiao', '\u72de': 'ning', '\u4ffa': 'an', '\u6c24': 'yin', '\u7fbc': 'chan', '\u907d': 'ju', '\u535e': 'bian', '\u6fd1': 'lai', '\u6bc1': 'hui', '\u661f': 'xing', '\u54ad': 'ji', '\u7898': 'dian', '\u4fac': 'nong', '\u8ffd': 'zhui', '\u6d94': 'cen', '\u6813': 'shuan', '\u914b': 'qiu', '\u5784': 'long', '\u82a6': 'lu', '\u5bc6': 'mi', '\u7891': 'bei', '\u8df5': 'jian', '\u6276': 'fu', '\u9ab8': 'hai', '\u955c': 'jing', '\u8e1d': 'huai', '\u90fe': 'yan', '\u7ebe': 'shu', '\u9642': 'bei', '\u7766': 'mu', '\u6765': 'lai', '\u64ac': 'qiao', '\u848e': 'pai', '\u8c0e': 'huang', '\u5de2': 'chao', '\u9545': 'mei', '\u8e74': 'zu', '\u5fc9': 'dao', '\u60e8': 'can', '\u670d': 'fu', '\u7321': 'luo', '\u6761': 'tiao', '\u6839': 'gen', '\u6676': 'jing', '\u88d4': 'yi', '\u734d': 'jing', '\u8e2f': 'zhi', '\u8c2a': 'zhe', '\u6f09': 'lu', '\u9550': 'gao', '\u75f0': 'tan', '\u5423': 'qin', '\u606b': 'dong', '\u6079': 'yan', '\u59a8': 'fang', '\u9997': 'kui', '\u7fd5': 'xi', '\u6bf5': 'san', '\u8bd6': 'gua', '\u5c4a': 'jie', '\u8c19': 'an', '\u9f37': 'xi', '\u543c': 'hou', '\u8872': 'na', '\u7caa': 'fen', '\u4ef5': 'wu', '\u8bbd': 'feng', '\u67ff': 'shi', '\u9c87': 'nian', '\u7960': 'si', '\u917e': 'shai', '\u6910': 'ju', '\u53e4': 'gu', '\u61a8': 'han', '\u9c86': 'ping', '\u908b': 'la', '\u58f9': 'yi', '\u9633': 'yang', '\u4fa8': 'qiao', '\u81e3': 'chen', '\u954e': 'na', '\u75d2': 'yang', '\u9cbb': 'zi', '\u6db5': 'han', '\u8ff0': 'shu', '\u5a09': 'ping', '\u5459': 'guo', '\u9e55': 'hu', '\u5c14': 'er', '\u5410': 'tu', '\u97f3': 'yin', '\u70b3': 'bing', '\u7978': 'huo', '\u7316': 'chang', '\u51f3': 'deng', '\u90c4': 'qie', '\u86ee': 'man', '\u90ae': 'you', '\u598a': 'ren', '\u4ebf': 'yi', '\u6078': 'tong', '\u8dcc': 'die', '\u8138': 'lian', '\u6e4d': 'tuan', '\u7279': 'te', '\u812c': 'pao', '\u6f36': 'huan', '\u6853': 'huan', '\u87b5': 'piao', '\u4f65': 'qian', '\u802a': 'pang', '\u6284': 'chao', '\u8e70': 'chu', '\u9e44': 'gu', '\u6f24': 'lan', '\u5047': 'jia', '\u5439': 'chui', '\u6301': 'chi', '\u6e11': 'sheng', '\u62d4': 'ba', '\u55be': 'ku', '\u7b14': 'bi', '\u5ab3': 'xi', '\u783c': 'tong', '\u80d6': 'pang', '\u8f8b': 'wang', '\u7396': 'jiu', '\u66d9': 'shu', '\u6382': 'dian', '\u5174': 'xing', '\u812f': 'fu', '\u540a': 'diao', '\u589a': 'liang', '\u7599': 'ge', '\u80ae': 'ang', '\u80f3': 'ge', '\u962a': 'ban', '\u7f8c': 'qiang', '\u71e7': 'sui', '\u548f': 'yong', '\u988d': 'ying', '\u4eab': 'xiang', '\u6535': 'fan', '\u60e9': 'cheng', '\u6dfc': 'miao', '\u7a23': 'su', '\u5939': 'jia', '\u7a9c': 'cuan', '\u5ae0': 'li', '\u633d': 'wan', '\u5189': 'ran', '\u800b': 'die', '\u95f0': 'run', '\u620d': 'shu', '\u5351': 'bei', '\u72ee': 'shi', '\u65d2': 'liu', '\u6b6a': 'wai', '\u7301': 'li', '\u9e29': 'zhen', '\u8857': 'jie', '\u8c26': 'qian', '\u8753': 'yu', '\u94bd': 'tan', '\u95ea': 'shan', '\u4e36': 'dian', '\u5490': 'fu', '\u5457': 'bei', '\u89f3': 'hu', '\u84ff': 'xu', '\u63d0': 'ti', '\u8e2c': 'zhi', '\u6ea7': 'li', '\u6d93': 'juan', '\u96d2': 'luo', '\u8815': 'ru', '\u6003': 'wu', '\u8083': 'su', '\u9cdc': 'gui', '\u8ba2': 'ding', '\u90b3': 'pi', '\u6f13': 'li', '\u6574': 'zheng', '\u533e': 'bian', '\u715e': 'sha', '\u63ff': 'qin', '\u7b77': 'kuai', '\u8c1d': 'pian', '\u52d0': 'meng', '\u94ec': 'ge', '\u80fd': 'nen', '\u87a8': 'man', '\u56fe': 'tu', '\u954d': 'nie', '\u85a4': 'xie', '\u8e09': 'liang', '\u4e07': 'wan', '\u638e': 'ji', '\u6cbc': 'zhao', '\u868b': 'rui', '\u82cc': 'chang', '\u8392': 'ju', '\u8131': 'tuo', '\u680a': 'long', '\u6da0': 'wei', '\u968b': 'sui', '\u6b27': 'ou', '\u71d5': 'yan', '\u809a': 'du', '\u54b1': 'zai', '\u6cf1': 'yang', '\u5a0c': 'li', '\u7ed8': 'hui', '\u6cf8': 'lu', '\u8be5': 'gai', '\u8fbe': 'da', '\u5bb3': 'hai', '\u9017': 'dou', '\u5ae6': 'chang', '\u9567': 'lan', '\u604b': 'lian', '\u6d88': 'xiao', '\u9879': 'xiang', '\u5f40': 'gou', '\u54c0': 'ai', '\u7b56': 'ce', '\u6d9f': 'lian', '\u7281': 'li', '\u7f14': 'di', '\u6e54': 'jian', '\u676f': 'bei', '\u9894': 'han', '\u6d2a': 'hong', '\u77b5': 'lin', '\u5f90': 'xu', '\u8e47': 'jian', '\u76d7': 'dao', '\u5df4': 'ba', '\u9a86': 'luo', '\u9612': 'qu', '\u75ab': 'yi', '\u8f76': 'die', '\u97e7': 'ren', '\u5f69': 'cai', '\u75b5': 'ci', '\u7622': 'ban', '\u77a9': 'zhu', '\u7b8d': 'gu', '\u57fa': 'ji', '\u80ec': 'nu', '\u4e3e': 'ju', '\u6885': 'mei', '\u8230': 'jian', '\u6da9': 'se', '\u88c9': 'ken', '\u507f': 'chang', '\u80f4': 'dong', '\u8fd9': 'zhe', '\u728f': 'pian', '\u6d5a': 'jun', '\u834f': 'ren', '\u4ec5': 'jin', '\u7f2d': 'liao', '\u8f6e': 'lun', '\u4f7c': 'jiao', '\u740f': 'lian', '\u7476': 'yao', '\u6448': 'bin', '\u9e45': 'e', '\u777f': 'rui', '\u95ef': 'chuang', '\u6634': 'mao', '\u74a8': 'can', '\u4fea': 'li', '\u8ff9': 'ji', '\u505c': 'ting', '\u572c': 'wu', '\u83b7': 'huo', '\u88e2': 'lian', '\u7313': 'guo', '\u89da': 'gu', '\u8c5a': 'tun', '\u828f': 'du', '\u66ae': 'mu', '\u8763': 'you', '\u5618': 'xu', '\u7635': 'ji', '\u7625': 'chai', '\u6bb7': 'yin', '\u4e7e': 'qian', '\u6ed3': 'zi', '\u5306': 'cong', '\u835f': 'hui', '\u9517': 'zhe', '\u8239': 'chuan', '\u7110': 'wu', '\u5769': 'gan', '\u63b4': 'guo', '\u9910': 'can', '\u6de0': 'pei', '\u5d16': 'ya', '\u9171': 'jiang', '\u8e42': 'rou', '\u94df': 'yin', '\u90e2': 'ying', '\u9640': 'tuo', '\u5776': 'mei', '\u6798': 'nen', '\u706f': 'deng', '\u9e87': 'jun', '\u79df': 'zu', '\u8c41': 'huo', '\u74e4': 'rang', '\u73e9': 'hang', '\u6414': 'sao', '\u6841': 'hang', '\u949f': 'zhong', '\u63a2': 'tan', '\u80de': 'bao', '\u4e92': 'hu', '\u572d': 'gui', '\u9cb2': 'kun', '\u9091': 'yi', '\u6c69': 'gu', '\u843c': 'e', '\u50e7': 'seng', '\u631d': 'wo', '\u9514': 'ju', '\u8793': 'qin', '\u781d': 'fa', '\u8bd2': 'yi', '\u60e0': 'hui', '\u5c3a': 'chi', '\u8476': 'ting', '\u86a9': 'chi', '\u63a5': 'jie', '\u96e0': 'chou', '\u961a': 'han', '\u8418': 'nai', '\u67ef': 'ke', '\u61d2': 'lan', '\u6b3e': 'kuan', '\u87af': 'ao', '\u54de': 'mou', '\u70b1': 'tai', '\u4ea7': 'chan', '\u80f6': 'jiao', '\u5944': 'yan', '\u8003': 'kao', '\u52f9': 'bao', '\u7035': 'fen', '\u90ac': 'wu', '\u9528': 'xian', '\u5a07': 'jiao', '\u6c94': 'mian', '\u5b59': 'sun', '\u77eb': 'jiao', '\u88bc': 'ge', '\u8dfb': 'ji', '\u7791': 'ming', '\u8202': 'zhong', '\u864e': 'hu', '\u6ee2': 'ying', '\u82b4': 'wu', '\u83e5': 'si', '\u77dc': 'jin', '\u674e': 'li', '\u5807': 'jin', '\u76cd': 'he', '\u8616': 'nie', '\u767b': 'deng', '\u8bff': 'wei', '\u6682': 'zan', '\u8725': 'xi', '\u8a89': 'yu', '\u57e0': 'bu', '\u7529': 'shuai', '\u83bd': 'mang', '\u8b07': 'jian', '\u4fa7': 'ce', '\u6d2b': 'xu', '\u970d': 'huo', '\u869d': 'hao', '\u64d0': 'huan', '\u5179': 'zi', '\u81ea': 'zi', '\u737e': 'quan', '\u9773': 'jin', '\u72cd': 'pao', '\u8f9b': 'xin', '\u6217': 'qiang', '\u5ca2': 'ke', '\u6e10': 'jian', '\u8c27': 'mi', '\u8882': 'mei', '\u60bb': 'xing', '\u6ca9': 'wei', '\u72f0': 'zheng', '\u76b4': 'cun', '\u6f4d': 'wei', '\u7a06': 'lv', '\u4f09': 'kang', '\u795c': 'hu', '\u57da': 'guo', '\u897f': 'xi', '\u81f4': 'zhi', '\u52a1': 'wu', '\u96d5': 'diao', '\u8159': 'zong', '\u7f9e': 'xiu', '\u83cc': 'jun', '\u628a': 'ba', '\u8f73': 'lu', '\u9004': 'pang', '\u516b': 'ba', '\u8d5b': 'sai', '\u95fc': 'ta', '\u81cc': 'gu', '\u52a9': 'zhu', '\u9540': 'du', '\u5bf0': 'huan', '\u8d60': 'zeng', '\u6c47': 'hui', '\u4e34': 'lin', '\u9699': 'xi', '\u90bb': 'lin', '\u6369': 'li', '\u5446': 'dai', '\u5df3': 'si', '\u59fb': 'yin', '\u98d5': 'sou', '\u919a': 'mi', '\u94a7': 'jun', '\u5288': 'pi', '\u5c3c': 'ni', '\u8fd3': 'ya', '\u54e5': 'ge', '\u64e4': 'xing', '\u98d9': 'biao', '\u5f88': 'hen', '\u8d3a': 'he', '\u6b4c': 'ge', '\u5777': 'ke', '\u7ea3': 'zhou', '\u8e05': 'chi', '\u8427': 'xiao', '\u7bab': 'xiao', '\u6d5e': 'zhuo', '\u88fc': 'ti', '\u83d4': 'fu', '\u998d': 'mo', '\u89c8': 'lan', '\u750d': 'meng', '\u4e27': 'sang', '\u6566': 'dun', '\u88f8': 'luo', '\u94e3': 'xi', '\u8651': 'lv', '\u5a9a': 'mei', '\u6f4b': 'lian', '\u8559': 'hui', '\u8f97': 'zhan', '\u7ad9': 'zhan', '\u5d29': 'beng', '\u81a6': 'lian', '\u5dcd': 'wei', '\u53ca': 'ji', '\u6c19': 'xian', '\u95fb': 'wen', '\u6cf3': 'yong', '\u9972': 'si', '\u7b2b': 'zi', '\u5ed6': 'liao', '\u558b': 'die', '\u780d': 'kan', '\u6b84': 'tian', '\u4f58': 'she', '\u9f2c': 'you', '\u916a': 'lao', '\u604d': 'huang', '\u8dd1': 'pao', '\u7a80': 'tun', '\u7b47': 'qiong', '\u55e6': 'suo', '\u833c': 'tong', '\u8def': 'lu', '\u7252': 'die', '\u7fa7': 'suo', '\u7bac': 'na', '\u79d5': 'bi', '\u6c3d': 'qiu', '\u90b8': 'di', '\u5025': 'kong', '\u7490': 'lu', '\u8671': 'shi', '\u6e20': 'qu', '\u54df': 'yo', '\u94c9': 'xuan', '\u5b53': 'jue', '\u76f1': 'xu', '\u613f': 'yuan', '\u8e3a': 'jian', '\u6c9f': 'gou', '\u4e2b': 'ya', '\u590d': 'fu', '\u7ee7': 'ji', '\u54c7': 'wa', '\u5edb': 'chan', '\u504c': 're', '\u8c8a': 'mo', '\u5fff': 'fen', '\u57f4': 'zhi', '\u5ba5': 'you', '\u72f4': 'bi', '\u8718': 'zhi', '\u906e': 'zhe', '\u6dd9': 'cong', '\u8748': 'guo', '\u4f8d': 'shi', '\u6c90': 'mu', '\u526f': 'fu', '\u8d24': 'xian', '\u825f': 'chong', '\u80a9': 'jian', '\u888b': 'dai', '\u7980': 'bing', '\u6d3b': 'huo', '\u660a': 'hao', '\u6954': 'xie', '\u5e9a': 'geng', '\u733e': 'hua', '\u6ce8': 'zhu', '\u8731': 'miao', '\u75b1': 'pao', '\u8306': 'mao', '\u6253': 'da', '\u874c': 'ke', '\u6d01': 'jie', '\u9e4a': 'que', '\u96ef': 'wen', '\u63f4': 'yuan', '\u53ae': 'si', '\u952f': 'ju', '\u81b3': 'shan', '\u5b95': 'dang', '\u94fe': 'lian', '\u7ed3': 'jie', '\u50ed': 'jian', '\u5730': 'di', '\u85d5': 'ou', '\u8148': 'jing', '\u67b7': 'jia', '\u8be2': 'xun', '\u5319': 'chi', '\u75b2': 'pi', '\u53a2': 'xiang', '\u8dd6': 'zhi', '\u7615': 'xia', '\u96ea': 'xue', '\u5a05': 'ya', '\u80e7': 'long', '\u5370': 'yin', '\u84d0': 'ru', '\u560e': 'ga', '\u6c18': 'dao', '\u851a': 'wei', '\u6cab': 'mo', '\u8031': 'mo', '\u8749': 'chan', '\u543b': 'wen', '\u542b': 'han', '\u96b0': 'xi', '\u6b92': 'yun', '\u6e0d': 'zi', '\u5949': 'feng', '\u7b75': 'yan', '\u7f29': 'suo', '\u55c5': 'xiu', '\u60f6': 'huang', '\u950e': 'kai', '\u5308': 'xiong', '\u7206': 'bao', '\u7ef4': 'wei', '\u86d9': 'wa', '\u6006': 'chuang', '\u84ba': 'ji', '\u5206': 'fen', '\u90db': 'fu', '\u752c': 'yong', '\u7535': 'dian', '\u62a2': 'qiang', '\u56bc': 'jiao', '\u5c42': 'ceng', '\u76e5': 'guan', '\u7aa8': 'xun', '\u5fe4': 'wu', '\u5e01': 'bi', '\u9606': 'lang', '\u8785': 'ci', '\u85b7': 'ru', '\u8bbf': 'fang', '\u94dd': 'lv', '\u6a61': 'xiang', '\u5951': 'qi', '\u72b8': 'ma', '\u6b86': 'dai', '\u8d54': 'pei', '\u73ab': 'mei', '\u71f9': 'bing', '\u523f': 'gui', '\u950b': 'feng', '\u8feb': 'po', '\u777e': 'gao', '\u6c11': 'min', '\u627f': 'cheng', '\u6591': 'ban', '\u5121': 'lei', '\u74e6': 'wa', '\u8288': 'mi', '\u536e': 'zhi', '\u6dcc': 'thang', '\u9544': 'fei', '\u6677': 'gui', '\u9c8e': 'hou', '\u8bc0': 'jue', '\u5293': 'yi', '\u7023': 'xie', '\u7c38': 'bo', '\u94c4': 'shuo', '\u8c2b': 'jian', '\u5e74': 'nian', '\u5676': 'ga', '\u9880': 'ken', '\u70c3': 'ting', '\u8f89': 'hui', '\u7228': 'cuan', '\u4fd1': 'yong', '\u5ba2': 'ke', '\u5544': 'zhou', '\u7592': 'guang', '\u6da6': 'run', '\u786b': 'liu', '\u7406': 'li', '\u7ec6': 'xi', '\u80c2': 'chen', '\u5e5b': 'zhang', '\u8d40': 'zi', '\u5723': 'sheng', '\u8bdc': 'shen', '\u780c': 'qi', '\u4f34': 'ban', '\u8f98': 'lu', '\u8e23': 'pou', '\u6d8e': 'xian', '\u548c': 'he', '\u86f8': 'shao', '\u5947': 'qi', '\u9650': 'xian', '\u5c90': 'qi', '\u5df7': 'xiang', '\u84cd': 'shi', '\u8870': 'shuai', '\u8247': 'ting', '\u5b9a': 'ding', '\u7cdc': 'mi', '\u7fe1': 'fei', '\u652b': 'jue', '\u7977': 'dao', '\u8936': 'die', '\u5c1a': 'shang', '\u5197': 'rong', '\u618b': 'bie', '\u8338': 'rong', '\u5bd0': 'mei', '\u5c11': 'shao', '\u523a': 'ci', '\u5464': 'ling', '\u4e01': 'ding', '\u59dd': 'shu', '\u868d': 'pi', '\u5019': 'hou', '\u5242': 'ji', '\u7bc6': 'zhuan', '\u9e2c': 'lu', '\u67f3': 'liu', '\u782c': 'la', '\u848c': 'liu', '\u8700': 'shu', '\u724d': 'du', '\u5fcd': 'ren', '\u7709': 'mei', '\u745a': 'hu', '\u8c22': 'xie', '\u8c13': 'wei', '\u54cc': 'gu', '\u5fbd': 'hui', '\u8832': 'juan', '\u5f85': 'dai', '\u7cf8': 'mi', '\u61c2': 'dong', '\u6877': 'jue', '\u8650': 'nuenue', '\u607a': 'kai', '\u6593': 'lan', '\u6021': 'yi', '\u71b9': 'xi', '\u664b': 'jin', '\u5c94': 'cha', '\u72fc': 'lang', '\u4e24': 'liang', '\u9f8b': 'qu', '\u69d4': 'gao', '\u7965': 'xiang', '\u6ea5': 'po', '\u7ef3': 'sheng', '\u4e93': 'qi', '\u7ff3': 'yi', '\u8113': 'nong', '\u66a8': 'ji', '\u6cd4': 'gan', '\u7ffb': 'fan', '\u89c7': 'chan', '\u8662': 'guo', '\u9713': 'ni', '\u7f1a': 'fu', '\u8d34': 'tie', '\u75eb': 'xian', '\u87fe': 'chan', '\u84bf': 'gao', '\u67f1': 'zhu', '\u80ea': 'lu', '\u6daf': 'ya', '\u7743': 'suo', '\u8033': 'er', '\u6cc4': 'xie', '\u6cb3': 'he', '\u8c46': 'dou', '\u57fd': 'sao', '\u5261': 'shan', '\u9e32': 'gou', '\u8854': 'xian', '\u9991': 'jin', '\u5510': 'tang', '\u5211': 'xing', '\u6b39': 'qi', '\u7708': 'dan', '\u77a2': 'meng', '\u839b': 'ting', '\u5c22': 'wang', '\u84ec': 'peng', '\u78b3': 'tan', '\u67d9': 'jian', '\u7802': 'sha', '\u501a': 'yi', '\u8bf4': 'shuo', '\u6f89': 'gan', '\u7823': 'tuo', '\u714c': 'huang', '\u6860': 'ya', '\u7eee': 'qi', '\u6e83': 'kui', '\u9646': 'lu', '\u6670': 'xi', '\u7aad': 'ju', '\u638a': 'pei', '\u609b': 'quan', '\u8d27': 'huo', '\u4e8c': 'er', '\u8e6f': 'fan', '\u5761': 'po', '\u7230': 'yuan', '\u61a9': 'qi', '\u8317': 'ming', '\u9143': 'ling', '\u6100': 'qiao', '\u8e14': 'chuo', '\u52c3': 'bo', '\u5fea': 'song', '\u7518': 'gan', '\u5371': 'wei', '\u62ee': 'jia', '\u731e': 'she', '\u9490': 'shan', '\u6d25': 'jin', '\u8111': 'nao', '\u695d': 'lian', '\u6bef': 'tan', '\u9504': 'chu', '\u8fd4': 'fan', '\u5f6a': 'biao', '\u5362': 'lu', '\u759a': 'jiu', '\u90e7': 'yun', '\u676a': 'miao', '\u52d8': 'kan', '\u8844': 'nv', '\u72ce': 'xia', '\u653b': 'gong', '\u881b': 'mie', '\u8c1a': 'yan', '\u6083': 'kun', '\u8760': 'fu', '\u8328': 'ci', '\u5076': 'ou', '\u58ec': 'ren', '\u5eea': 'lin', '\u621b': 'jia', '\u949e': 'chao', '\u9568': 'pu', '\u5a34': 'xian', '\u78c1': 'ci', '\u956c': 'huo', '\u96c0': 'que', '\u503a': 'zhai', '\u658b': 'zhai', '\u7956': 'zu', '\u5bb5': 'xiao', '\u901a': 'tong', '\u8d64': 'chi', '\u9052': 'qiu', '\u91ae': 'jiao', '\u53d9': 'xu', '\u5bc2': 'ji', '\u653e': 'fang', '\u7409': 'liu', '\u4fbf': 'bian', '\u7d2b': 'zi', '\u793a': 'shi', '\u6e1d': 'yu', '\u960d': 'hun', '\u9c90': 'tai', '\u80e9': 'ka', '\u853d': 'bi', '\u54d5': 'hui', '\u603c': 'dui', '\u59d2': 'si', '\u532a': 'fei', '\u4e8d': 'chu', '\u88fe': 'ju', '\u4fe8': 'yan', '\u6dae': 'shua', '\u84df': 'ji', '\u9507': 'e', '\u5347': 'sheng', '\u73ae': 'wei', '\u5c9b': 'dao', '\u90ed': 'guo', '\u7ae6': 'song', '\u7a9f': 'ku', '\u659c': 'xie', '\u70db': 'zhu', '\u6194': 'qiao', '\u7ff0': 'han', '\u57ad': 'e', '\u4f70': 'bai', '\u8d3e': 'jia', '\u4f89': 'kua', '\u8a8a': 'teng', '\u75d6': 'ya', '\u7816': 'zhuan', '\u853c': 'ai', '\u98d1': 'biao', '\u80bf': 'zhong', '\u6509': 'huo', '\u7913': 'jiang', '\u5b83': 'ta', '\u7425': 'hu', '\u7f68': 'yan', '\u82b1': 'hua', '\u513f': 'er', '\u6ccc': 'mi', '\u7719': 'chi', '\u4e86': 'liao', '\u7a7f': 'chuan', '\u9505': 'guo', '\u4e16': 'shi', '\u6059': 'yang', '\u820c': 'she', '\u92c8': 'wu', '\u70ca': 'yang', '\u9177': 'ku', '\u8fdd': 'wei', '\u7f01': 'zi', '\u67dc': 'gui', '\u75d8': 'dou', '\u8d39': 'fei', '\u8c24': 'bang', '\u60f0': 'duo', '\u8574': 'yun', '\u8c89': 'he', '\u7a03': 'fu', '\u5bb0': 'zai', '\u82ad': 'ba', '\u67b3': 'zhi', '\u9174': 'tu', '\u9605': 'yue', '\u6850': 'tong', '\u86a4': 'zao', '\u5cf0': 'feng', '\u95ee': 'wen', '\u54bd': 'yan', '\u5494': 'ka', '\u6b67': 'qi', '\u8bd8': 'jie', '\u53d4': 'shu', '\u76db': 'sheng', '\u7194': 'rong', '\u4fef': 'fu', '\u5561': 'fei', '\u7da6': 'qi', '\u8bc2': 'gu', '\u8f6c': 'zhuan', '\u9c91': 'gui', '\u969c': 'zhang', '\u5577': 'lang', '\u5f13': 'gong', '\u52a8': 'dong', '\u7eb0': 'pi', '\u789a': 'bei', '\u7559': 'liu', '\u6f58': 'pan', '\u975e': 'fei', '\u6bd7': 'pi', '\u5996': 'yao', '\u53bb': 'qu', '\u652f': 'zhi', '\u91dc': 'fu', '\u7338': 'mei', '\u538b': 'ya', '\u9075': 'zun', '\u836e': 'zhou', '\u5934': 'tou', '\u5420': 'fei', '\u7b11': 'xiao', '\u62cd': 'pai', '\u5d4b': 'mei', '\u9ed8': 'mo', '\u83f8': 'yan', '\u54f3': 'zha', '\u66dc': 'yao', '\u51e0': 'ji', '\u7ee0': 'bing', '\u6ec7': 'dian', '\u8be4': 'zheng', '\u6029': 'ni', '\u8dfd': 'ji', '\u9cce': 'die', '\u4e2a': 'ge', '\u961d': 'zuo', '\u72c8': 'bei', '\u73ed': 'ban', '\u9119': 'bi', '\u504e': 'wei', '\u94b3': 'qian', '\u63ac': 'ju', '\u8035': 'ding', '\u90b4': 'bing', '\u9b32': 'ge', '\u53d8': 'bian', '\u5499': 'long', '\u7fc5': 'chi', '\u6d91': 'shu', '\u8c07': 'sui', '\u76f4': 'zhi', '\u9e22': 'yuan', '\u6355': 'bu', '\u90af': 'han', '\u9761': 'mi', '\u9576': 'xiang', '\u8722': 'meng', '\u98a0': 'dian', '\u9785': 'yang', '\u6c85': 'yuan', '\u5902': 'dong', '\u5a7a': 'mou', '\u9992': 'man', '\u6c79': 'xiong', '\u9026': 'li', '\u6094': 'hui', '\u5241': 'duo', '\u8de3': 'sun', '\u6069': 'en', '\u5eb9': 'tuo', '\u677f': 'ban', '\u606c': 'tian', '\u83dc': 'cai', '\u7779': 'du', '\u6982': 'gai', '\u8475': 'kui', '\u6cde': 'ning', '\u7f13': 'huan', '\u6f31': 'shu', '\u75a5': 'jie', '\u541b': 'jun', '\u524c': 'la', '\u55dd': 'ge', '\u517d': 'shou', '\u6865': 'qiao', '\u7f2a': 'miao', '\u786d': 'mang', '\u7656': 'pi', '\u8d5e': 'zan', '\u4ede': 'ren', '\u6700': 'zui', '\u94d8': 'ye', '\u60bc': 'dao', '\u8682': 'ma', '\u5168': 'quan', '\u84c4': 'xu', '\u94fd': 'xin', '\u6263': 'kou', '\u4e4d': 'zha', '\u810d': 'kuai', '\u6837': 'yang', '\u8dc4': 'qiang', '\u4f1f': 'wei', '\u840e': 'wei', '\u9e21': 'ji', '\u6cf5': 'beng', '\u6960': 'nan', '\u5baa': 'xian', '\u4e70': 'mai', '\u745c': 'yu', '\u64b7': 'xie', '\u5f57': 'hui', '\u6f5e': 'lu', '\u5f58': 'zhi', '\u5892': 'shang', '\u66e9': 'nang', '\u60c5': 'qing', '\u91aa': 'lao', '\u9e46': 'yu', '\u7f1f': 'gao', '\u5f3a': 'qiang', '\u5974': 'nu', '\u9ee0': 'xia', '\u4ee3': 'dai', '\u5ed2': 'ao', '\u82a9': 'qin', '\u6500': 'pan', '\u5310': 'fu', '\u5a06': 'rao', '\u65bd': 'shi', '\u6687': 'xia', '\u8f99': 'zhe', '\u7688': 'gui', '\u5942': 'huan', '\u9190': 'hu', '\u9f22': 'fen', '\u51ed': 'ping', '\u5deb': 'wu', '\u6d6a': 'lang', '\u6421': 'sang', '\u911e': 'yin', '\u7cae': 'liang', '\u7483': 'li', '\u758f': 'shu', '\u5178': 'dian', '\u5a40': 'e', '\u54dc': 'ji', '\u5480': 'ju', '\u6c60': 'chi', '\u65d6': 'yi', '\u707e': 'zai', '\u86ac': 'xian', '\u8bb5': 'ju', '\u4e59': 'yi', '\u7bd1': 'kui', '\u95ed': 'bi', '\u5d6b': 'zi', '\u8314': 'ying', '\u62bb': 'chen', '\u79e6': 'qin', '\u9969': 'xi', '\u8f8f': 'cou', '\u816e': 'sai', '\u6e16': 'shen', '\u5e7f': 'guang', '\u5c39': 'yin', '\u64b8': 'lu', '\u82b8': 'yun', '\u5e38': 'chang', '\u80be': 'shen', '\u94f2': 'chan', '\u728b': 'ju', '\u998a': 'sou', '\u9e4e': 'bei', '\u6924': 'luo', '\u7566': 'qi', '\u576a': 'ping', '\u839c': 'di', '\u6492': 'sa', '\u5580': 'ka', '\u9b3b': 'zhou', '\u5576': 'ding', '\u7aff': 'gan', '\u9157': 'xu', '\u6175': 'yong', '\u86c6': 'qu', '\u7b90': 'qing', '\u69a7': 'fei', '\u7430': 'yan', '\u67c4': 'bing', '\u85a8': 'hong', '\u621a': 'qi', '\u6ee1': 'man', '\u8214': 'tian', '\u80d9': 'zuo', '\u80c4': 'zhou', '\u80e4': 'yin', '\u533f': 'ni', '\u53ec': 'zhao', '\u94af': 'ba', '\u814c': 'yan', '\u8717': 'wo', '\u50a5': 'tang', '\u69ab': 'sun', '\u51bc': 'xian', '\u8393': 'mei', '\u7fee': 'he', '\u7a57': 'sui', '\u5236': 'zhi', '\u8200': 'yao', '\u7e3b': 'mi', '\u5f70': 'zhang', '\u74f7': 'ci', '\u8be3': 'yi', '\u86d8': 'yang', '\u916f': 'zhi', '\u6886': 'bang', '\u5316': 'hua', '\u7f61': 'gang', '\u6269': 'kuo', '\u5e3d': 'mao', '\u627c': 'e', '\u8759': 'bian', '\u5107': 'xuan', '\u715c': 'yu', '\u835e': 'qiao', '\u6d78': 'jin', '\u936a': 'mou', '\u8fb9': 'bian', '\u62c2': 'fu', '\u60b4': 'cui', '\u6126': 'kui', '\u5343': 'qian', '\u8770': 'kui', '\u70bd': 'chi', '\u83dd': 'ba', '\u54c1': 'pin', '\u5443': 'e', '\u6c70': 'tai', '\u5256': 'pou', '\u7ea2': 'hong', '\u8902': 'gua', '\u50a9': 'nuo', '\u86af': 'qiu', '\u83d8': 'song', '\u57cf': 'shan', '\u5aeb': 'mo', '\u51bb': 'dong', '\u9f44': 'zha', '\u5fe7': 'you', '\u75cd': 'yi', '\u8839': 'du', '\u7eea': 'xu', '\u5b65': 'nu', '\u9ccc': 'ao', '\u8912': 'bao', '\u5f64': 'tong', '\u7efd': 'zhan', '\u65a1': 'wo', '\u8bc4': 'ping', '\u50da': 'liao', '\u8c1b': 'di', '\u9974': 'yi', '\u7ea5': 'ge', '\u595a': 'xi', '\u80ab': 'chun', '\u751a': 'shen', '\u7f16': 'bian', '\u8c08': 'tan', '\u9a8a': 'li', '\u7ecf': 'jing', '\u65ee': 'ga', '\u74e3': 'ban', '\u6ef9': 'hu', '\u6e25': 'wo', '\u78cb': 'cun', '\u54d0': 'kuang', '\u807f': 'yu', '\u78fa': 'huang', '\u60a6': 'yue', '\u729f': 'jiang', '\u5ae1': 'di', '\u8bf2': 'hui', '\u7b94': 'bo', '\u75ff': 'wei', '\u9cd9': 'yong', '\u5c6f': 'tun', '\u5112': 'ru', '\u5473': 'wei', '\u8921': 'da', '\u9b3c': 'gui', '\u5ba6': 'huan', '\u6b46': 'xin', '\u832b': 'mang', '\u51b6': 'ye', '\u9489': 'ding', '\u6293': 'zhua', '\u84ca': 'weng', '\u9a7c': 'tuo', '\u5601': 'qi', '\u5e73': 'ping', '\u7533': 'shen', '\u8d74': 'fu', '\u56dd': 'jian', '\u5627': 'mi', '\u6832': 'kao', '\u5589': 'hou', '\u67d3': 'ran', '\u67b8': 'ju', '\u83f0': 'gu', '\u8925': 'ru', '\u5367': 'wo', '\u63c6': 'kui', '\u4fda': 'li', '\u8dbf': 'qi', '\u7f20': 'chan', '\u65af': 'si', '\u517c': 'jian', '\u7f51': 'wang', '\u67a8': 'cheng', '\u70af': 'jiong', '\u75fc': 'gu', '\u996c': 'chi', '\u6da4': 'di', '\u7a9d': 'wo', '\u5def': 'qiu', '\u7b1e': 'chi', '\u77ec': 'cuo', '\u9a7e': 'jia', '\u827e': 'ai', '\u9cd3': 'le', '\u84d1': 'sui', '\u4fdd': 'bao', '\u86b4': 'niu', '\u5609': 'jia', '\u775b': 'jing', '\u5b6c': 'nao', '\u7f38': 'gang', '\u7b71': 'xiao', '\u6469': 'mo', '\u54a3': 'gong', '\u7126': 'jiao', '\u61b7': 'chu', '\u5b97': 'zong', '\u501c': 'zhou', '\u7ec8': 'zhong', '\u56e4': 'dun', '\u6ee4': 'lv', '\u6ed7': 'bi', '\u5f6c': 'bin', '\u62ec': 'kuo', '\u5427': 'ba', '\u4e1b': 'cong', '\u5c59': 'e', '\u570a': 'qing', '\u5c27': 'yao', '\u80c0': 'zhang', '\u706c': 'biao', '\u62cc': 'ban', '\u7c41': 'lai', '\u6684': 'xuan', '\u8c33': 'yan', '\u4ea1': 'wang', '\u6bc5': 'yi', '\u9ebd': 'ma', '\u5212': 'hua', '\u8c01': 'shui', '\u96cd': 'yong', '\u6322': 'jiao', '\u8934': 'lan', '\u5435': 'chao', '\u592a': 'tai', '\u6c0d': 'qu', '\u5ea6': 'du', '\u970e': 'sha', '\u641c': 'sou', '\u9e33': 'yuan', '\u6dab': 'guan', '\u8282': 'jie', '\u5018': 'thang', '\u592b': 'fu', '\u9b47': 'yan', '\u4f64': 'wa', '\u8e8f': 'lin', '\u9014': 'tu', '\u6f47': 'xiao', '\u781c': 'feng', '\u8327': 'jian', '\u9e1f': 'niao', '\u6512': 'zan', '\u84b2': 'pu', '\u631e': 'ta', '\u6434': 'qian', '\u8be9': 'xu', '\u4ee1': 'ge', '\u82e5': 'ruo', '\u892b': 'chi', '\u8ddd': 'ju', '\u8d81': 'chen', '\u636e': 'ju', '\u5ed1': 'jin', '\u9732': 'lu', '\u56ca': 'nan', '\u672c': 'ben', '\u5f8b': 'lv', '\u89ce': 'yu', '\u901b': 'guang', '\u6920': 'qian', '\u8680': 'shi', '\u5029': 'qing', '\u4e0e': 'yu', '\u62e2': 'long', '\u78b4': 'cha', '\u85c1': 'gao', '\u59e5': 'lao', '\u63d2': 'cha', '\u83f1': 'ling', '\u9996': 'shou', '\u6ebd': 'ru', '\u748e': 'ying', '\u84b4': 'shuo', '\u5a1c': 'na', '\u9efc': 'fu', '\u7350': 'zhang', '\u4ff1': 'ju', '\u5dfd': 'xun', '\u978b': 'xie', '\u6811': 'shu', '\u9cb3': 'chang', '\u760a': 'hou', '\u8de4': 'jiao', '\u93d6': 'ao', '\u90dc': 'gao', '\u6c86': 'hang', '\u54da': 'duo', '\u5ac2': 'sao', '\u9752': 'qing', '\u7477': 'ai', '\u571c': 'huan', '\u745b': 'ying', '\u9a90': 'qi', '\u5bc7': 'kou', '\u878d': 'rong', '\u64d7': 'pi', '\u64c0': 'gan', '\u7738': 'mou', '\u7f34': 'jiao', '\u6dc7': 'qi', '\u7166': 'xu', '\u98a1': 'sang', '\u5d2e': 'gu', '\u6240': 'suo', '\u5733': 'chou', '\u4f19': 'huo', '\u691f': 'du', '\u94cd': 'pi', '\u5412': 'zha', '\u665a': 'wan', '\u4e48': 'me', '\u5b8f': 'hong', '\u722a': 'zhao', '\u7248': 'ban', '\u996a': 'ren', '\u85c9': 'jie', '\u8f78': 'zhen', '\u9549': 'ge', '\u6600': 'yun', '\u82f9': 'ping', '\u7391': 'ji', '\u5341': 'shi', '\u8488': 'kai', '\u9954': 'yong', '\u5c01': 'feng', '\u5d4c': 'qian', '\u70e7': 'shao', '\u88e5': 'jian', '\u811a': 'jiao', '\u871a': 'fei', '\u971c': 'shuang', '\u65d7': 'qi', '\u6324': 'ji', '\u85b0': 'xun', '\u94e4': 'ding', '\u9ecd': 'shu', '\u5c04': 'she', '\u8426': 'ying', '\u89eb': 'su', '\u5bdf': 'cha', '\u76f9': 'dun', '\u55fd': 'sou', '\u75be': 'ji', '\u5634': 'zui', '\u7b03': 'du', '\u5fdd': 'tian', '\u5ccb': 'xun', '\u51e4': 'feng', '\u847a': 'qi', '\u5156': 'yan', '\u8e51': 'nie', '\u9ecf': 'nian', '\u8367': 'ying', '\u79fd': 'hui', '\u948e': 'qian', '\u75a0': 'li', '\u540d': 'ming', '\u8212': 'shu', '\u9662': 'yuan', '\u9554': 'bin', '\u8d45': 'gai', '\u8a07': 'heng', '\u537f': 'qing', '\u8bf3': 'kuang', '\u5468': 'zhou', '\u6bd6': 'bi', '\u549d': 'si', '\u5e9e': 'pang', '\u59d1': 'gu', '\u80c1': 'xie', '\u5914': 'kui', '\u6781': 'ji', '\u9990': 'xiu', '\u701b': 'ying', '\u80a4': 'fu', '\u4e69': 'ji', '\u7827': 'zhen', '\u5ffd': 'hu', '\u57d2': 'lie', '\u9c81': 'lu', '\u5237': 'shua', '\u7280': 'xi', '\u7ed0': 'dai', '\u8010': 'nai', '\u8be6': 'xiang', '\u965b': 'bi', '\u884c': 'xing', '\u799a': 'zhuo', '\u5b5c': 'zi', '\u5feb': 'kuai', '\u9e4b': 'miao', '\u748b': 'zhang', '\u5143': 'yuan', '\u71a8': 'wei', '\u7f15': 'lv', '\u52b2': 'jing', '\u57a3': 'yuan', '\u5899': 'qiang', '\u94a6': 'qin', '\u7b2e': 'ze', '\u8bf7': 'qing', '\u809c': 'chen', '\u866b': 'chong', '\u9486': 'ga', '\u673a': 'ji', '\u4eec': 'men', '\u86b5': 'he', '\u6b24': 'yu', '\u55e5': 'hao', '\u7ecb': 'fei', '\u9080': 'yao', '\u8d35': 'gui', '\u55bd': 'lou', '\u5600': 'di', '\u7ed7': 'hang', '\u84e3': 'yu', '\u6361': 'jian', '\u9a96': 'can', '\u51c7': 'song', '\u7f55': 'han', '\u5c88': 'ya', '\u5d5b': 'yu', '\u86b1': 'zha', '\u8352': 'huang', '\u69ff': 'jin', '\u5802': 'tang', '\u4f0f': 'fu', '\u90ba': 'ye', '\u9ca2': 'lian', '\u9063': 'qian', '\u7039': 'yao', '\u845a': 'ren', '\u5bfa': 'si', '\u7f79': 'li', '\u778c': 'ke', '\u7119': 'bei', '\u4f53': 'ti', '\u625b': 'kang', '\u5408': 'he', '\u6b59': 'xie', '\u59ae': 'ni', '\u5fe0': 'zhong', '\u6170': 'wei', '\u5555': 'tao', '\u6b65': 'bu', '\u6308': 'qie', '\u8709': 'fu', '\u9044': 'chuan', '\u75f1': 'fei', '\u5f02': 'yi', '\u5de8': 'ju', '\u5229': 'li', '\u9e70': 'ying', '\u7ec1': 'xie', '\u997c': 'bing', '\u78ec': 'qing', '\u655b': 'lian', '\u814a': 'la', '\u886c': 'chen', '\u5c8d': 'qian', '\u5ac9': 'ji', '\u8c78': 'zhi', '\u822d': 'bi', '\u5ffe': 'kai', '\u564c': 'ceng', '\u9558': 'man', '\u547d': 'ming', '\u6bea': 'mu', '\u620e': 'rong', '\u96bd': 'juan', '\u84f0': 'xi', '\u8d4b': 'fu', '\u6cf6': 'xue', '\u6316': 'wa', '\u545b': 'qiang', '\u6499': 'zun', '\u606d': 'gong', '\u8223': 'yi', '\u9e71': 'hu', '\u5ed3': 'kuo', '\u89c2': 'guan', '\u5fc6': 'yi', '\u5a08': 'lian', '\u760c': 'la', '\u5f3c': 'bi', '\u8244': 'shao', '\u9efb': 'fu', '\u6664': 'wu', '\u506c': 'cong', '\u83ba': 'ying', '\u77a5': 'pie', '\u4ff3': 'pai', '\u60ec': 'qie', '\u5c4f': 'ping', '\u83b8': 'you', '\u97b2': 'gou', '\u6f06': 'qi', '\u65a7': 'fu', '\u6cfe': 'jing', '\u9005': 'hou', '\u566a': 'zao', '\u9c7c': 'yu', '\u8c37': 'gu', '\u73d9': 'gong', '\u7f32': 'qiao', '\u886b': 'shan', '\u8e31': 'duo', '\u8eaf': 'qu', '\u6d6f': 'wu', '\u6d12': 'sa', '\u6998': 'ju', '\u7ee6': 'tao', '\u7722': 'yuan', '\u8e2e': 'dian', '\u6390': 'qia', '\u59ab': 'gui', '\u8198': 'biao', '\u83b1': 'lai', '\u65e8': 'zhi', '\u4f8b': 'li', '\u7441': 'mao', '\u871e': 'qi', '\u5216': 'yue', '\u6597': 'dou', '\u8734': 'yi', '\u5203': 'ren', '\u6002': 'song', '\u73d0': 'fa', '\u960b': 'xi', '\u83a8': 'lang', '\u5575': 'bo', '\u77f6': 'ji', '\u9a7b': 'zhu', '\u68a6': 'meng', '\u64ba': 'cuan', '\u5598': 'chuan', '\u4e5d': 'jiu', '\u9cd7': 'man', '\u6866': 'hua', '\u5d06': 'kong', '\u9632': 'fang', '\u9021': 'qun', '\u9adf': 'bia', '\u81c6': 'yi', '\u8188': 'ge', '\u677c': 'zhu', '\u51b0': 'bing', '\u8d61': 'shan', '\u5819': 'yin', '\u5b5b': 'bei', '\u6e9c': 'liu', '\u693d': 'chuan', '\u81fc': 'jiu', '\u5251': 'jian', '\u6210': 'cheng', '\u75c4': 'zha', '\u8272': 'se', '\u8340': 'xun', '\u7c9e': 'xi', '\u6848': 'an', '\u70ac': 'ju', '\u4fa9': 'kuai', '\u50fb': 'pi', '\u654c': 'di', '\u91a3': 'tang', '\u891b': 'lv', '\u68e3': 'di', '\u5549': 'lan', '\u77ed': 'duan', '\u6980': 'pin', '\u8fe4': 'yi', '\u85dc': 'li', '\u548e': 'jiu', '\u609a': 'song', '\u533a': 'qu', '\u630e': 'kua', '\u7178': 'bian', '\u997d': 'bo', '\u55eb': 'nie', '\u707f': 'can', '\u8f81': 'quan', '\u7f2f': 'zeng', '\u5a67': 'jing', '\u67ad': 'xiao', '\u4ebb': 'dan', '\u693f': 'chun', '\u5155': 'si', '\u56df': 'xin', '\u8f9a': 'lin', '\u6cd3': 'hong', '\u9ebb': 'ma', '\u7070': 'hui', '\u59d8': 'pin', '\u9a98': 'zhi', '\u65e0': 'wu', '\u6821': 'xiao', '\u5ce8': 'e', '\u63fd': 'lan', '\u7ea4': 'xian', '\u59ca': 'zi', '\u6c68': 'mi', '\u74d2': 'zan', '\u582a': 'kan', '\u5026': 'juan', '\u7389': 'yu', '\u7bfe': 'mie', '\u642c': 'ban', '\u5708': 'quan', '\u7643': 'long', '\u4f74': 'ji', '\u514b': 'ke', '\u696e': 'chu', '\u7537': 'nan', '\u6bcf': 'mei', '\u537a': 'jin', '\u4f7e': 'yi', '\u4f36': 'ling', '\u8102': 'zhi', '\u9074': 'lin', '\u8019': 'ba', '\u8f67': 'zha', '\u8556': 'qu', '\u94e7': 'hua', '\u8fc8': 'mai', '\u8f8e': 'zi', '\u9739': 'pi', '\u4ec9': 'zhang', '\u788d': 'ai', '\u5ddd': 'chuan', '\u78d9': 'gun', '\u7ed1': 'bang', '\u9672': 'chui', '\u5e15': 'pa', '\u5c3f': 'niao', '\u86f2': 'nao', '\u5d24': 'xiao', '\u7981': 'jin', '\u545c': 'wu', '\u6f66': 'liao', '\u7aef': 'duan', '\u5686': 'hao', '\u7259': 'ya', '\u6e2b': 'die', '\u5924': 'yin', '\u7a92': 'zhi', '\u5c66': 'ju', '\u5478': 'pei', '\u9610': 'chan', '\u6073': 'ken', '\u4e11': 'chou', '\u9ab0': 'gu', '\u5664': 'jin', '\u745e': 'rui', '\u6123': 'leng', '\u6d2e': 'dao', '\u5272': 'ge', '\u5854': 'ta', '\u5742': 'ban', '\u7360': 'liao', '\u65b0': 'xin', '\u4fed': 'jian', '\u5793': 'gai', '\u5267': 'ju', '\u5be4': 'wu', '\u658c': 'bin', '\u52fa': 'shao', '\u832c': 'cha', '\u8228': 'ban', '\u65f1': 'han', '\u88c2': 'lie', '\u8c6a': 'hao', '\u5369': 'dan', '\u61f5': 'meng', '\u9aa5': 'ji', '\u620f': 'xi', '\u7af9': 'zhu', '\u79f8': 'jie', '\u66f3': 'ye', '\u7f94': 'gao', '\u707c': 'zhuo', '\u9093': 'deng', '\u6247': 'shan', '\u5f81': 'zheng', '\u8dcb': 'ba', '\u6b89': 'xun', '\u9617': 'tian', '\u798a': 'xi', '\u6c83': 'wo', '\u79ed': 'zi', '\u9877': 'qing', '\u9172': 'cheng', '\u821c': 'shun', '\u9cb4': 'gu', '\u558f': 'nuo', '\u89c4': 'gui', '\u561b': 'ma', '\u8022': 'liao', '\u62c9': 'la', '\u548b': 'zha', '\u8df9': 'xian', '\u732a': 'zhu', '\u5c8c': 'ji', '\u95fa': 'gui', '\u73ba': 'xi', '\u9c9e': 'xiang', '\u63cd': 'zou', '\u9889': 'jie', '\u9769': 'ge', '\u9708': 'pei', '\u70bc': 'lian', '\u6876': 'tong', '\u6ecb': 'zi', '\u5413': 'xia', '\u9ab6': 'di', '\u5de1': 'xun', '\u6fa7': 'li', '\u58ee': 'zhuang', '\u72c4': 'di', '\u6d31': 'er', '\u8f86': 'liang', '\u7f1b': 'rong', '\u8f68': 'gui', '\u85af': 'shu', '\u8e85': 'zhu', '\u5409': 'ji', '\u53a3': 'yan', '\u4f27': 'cang', '\u62bc': 'ya', '\u5b8b': 'song', '\u9765': 'yan', '\u79be': 'he', '\u6413': 'cuo', '\u7532': 'jia', '\u8dbc': 'jian', '\u6d9e': 'lai', '\u660f': 'hun', '\u63ad': 'tian', '\u65c6': 'pei', '\u94c2': 'bo', '\u91cf': 'liang', '\u94a0': 'na', '\u580b': 'peng', '\u8eac': 'gong', '\u5973': 'nv', '\u9573': 'biao', '\u7387': 'lv', '\u8bb2': 'jiang', '\u4e58': 'cheng', '\u9984': 'hun', '\u7a79': 'qiong', '\u55c4': 'xia', '\u6c5d': 'ru', '\u7a76': 'jiu', '\u80ed': 'yan', '\u5cc4': 'yi', '\u7f27': 'lei', '\u4e0c': 'ji', '\u525c': 'wan', '\u53a6': 'xia', '\u65f0': 'gan', '\u8587': 'wei', '\u6ec1': 'chu', '\u90be': 'zhu', '\u62ce': 'ling', '\u5db7': 'yi', '\u5300': 'yun', '\u58bc': 'ji', '\u4eba': 'ren', '\u4e5e': 'qi', '\u851f': 'chuo', '\u768e': 'jiao', '\u97e6': 'wei', '\u8d2f': 'guan', '\u728a': 'du', '\u6b66': 'wu', '\u904d': 'bian', '\u7076': 'zao', '\u98da': 'biao', '\u6587': 'wen', '\u9e2f': 'yang', '\u900a': 'xun', '\u8d94': 'lie', '\u6709': 'you', '\u9f10': 'nai', '\u4f5b': 'fu', '\u996b': 'yu', '\u79e4': 'cheng', '\u80f2': 'gai', '\u5ab2': 'pi', '\u94f8': 'zhu', '\u90c7': 'huan', '\u90ce': 'lang', '\u91ad': 'bu', '\u62ab': 'pi', '\u9152': 'jiu', '\u9541': 'mei', '\u89d0': 'jin', '\u7113': 'han', '\u7a91': 'yao', '\u62b1': 'bao', '\u5055': 'xie', '\u949c': 'ju', '\u6148': 'ci', '\u8279': 'cao', '\u8f8a': 'gun', '\u4eb2': 'qin', '\u8f9f': 'bi', '\u51b1': 'hu', '\u8c20': 'dang', '\u76f2': 'mang', '\u9774': 'xue', '\u556c': 'se', '\u989d': 'e', '\u98a5': 'ru', '\u6a80': 'tan', '\u65ef': 'la', '\u5085': 'fu', '\u54b8': 'xian', '\u79c0': 'xiu', '\u5080': 'kui', '\u7696': 'wan', '\u81c3': 'yong', '\u80aa': 'fang', '\u78be': 'nian', '\u674c': 'wo', '\u8dcf': 'jia', '\u671f': 'qi', '\u4ed8': 'fu', '\u8fa8': 'bian', '\u70b9': 'dian', '\u7d20': 'su', '\u87f9': 'xie', '\u60cb': 'wan', '\u8c0b': 'mou', '\u9ab7': 'ku', '\u5e9f': 'fei', '\u50d6': 'xi', '\u7b5b': 'shai', '\u5e8f': 'xu', '\u580d': 'tu', '\u793b': 'shi', '\u4e95': 'jing', '\u54af': 'ke', '\u777d': 'kui', '\u772f': 'mi', '\u902d': 'huan', '\u5a36': 'qu', '\u575e': 'wu', '\u5e76': 'bing', '\u6c8f': 'qi', '\u7ef7': 'beng', '\u5e86': 'qing', '\u51a0': 'guan', '\u8c1c': 'mi', '\u83ab': 'mo', '\u8c0a': 'yi', '\u9cbc': 'fen', '\u619d': 'dui', '\u9149': 'you', '\u4eea': 'yi', '\u9cca': 'bian', '\u65f6': 'shi', '\u8be0': 'quan', '\u5382': 'chang', '\u5349': 'hui', '\u94f6': 'yin', '\u5ac1': 'jia', '\u9ee9': 'du', '\u4e53': 'pang', '\u4f18': 'you', '\u795e': 'shen', '\u987b': 'xu', '\u56ed': 'yuan', '\u968f': 'sui', '\u67d2': 'qi', '\u7ec5': 'shen', '\u8bfe': 'ke', '\u5a9b': 'yuan', '\u9667': 'nie', '\u6225': 'deng', '\u7600': 'yu', '\u951f': 'kun', '\u51c9': 'liang', '\u972d': 'ai', '\u507b': 'liu', '\u955e': 'chuo', '\u8fb0': 'chen', '\u81c1': 'lian', '\u5c34': 'gan', '\u87ad': 'chi', '\u5df1': 'ji', '\u5b58': 'cun', '\u5e44': 'wo', '\u75c2': 'jia', '\u9aa8': 'gu', '\u4fe9': 'lian', '\u95f1': 'wei', '\u6e89': 'gai', '\u7b60': 'jun', '\u5786': 'lu', '\u8564': 'rui', '\u6092': 'yi', '\u542e': 'shun', '\u5b32': 'niao', '\u5a13': 'wei', '\u8096': 'xiao', '\u6728': 'mu', '\u8c12': 'ye', '\u8363': 'rong', '\u914f': 'yi', '\u6d0b': 'yang', '\u5e27': 'zheng', '\u9eb8': 'fu', '\u72b0': 'qiu', '\u6484': 'ying', '\u4e49': 'yi', '\u6625': 'chun', '\u72af': 'fan', '\u77ff': 'kuang', '\u83e0': 'bo', '\u7704': 'mian', '\u6746': 'gan', '\u4e19': 'bing', '\u4e73': 'ru', '\u51ac': 'dong', '\u5f01': 'bian', '\u4ea8': 'heng', '\u627e': 'zhao', '\u7583': 'tuan', '\u5b99': 'zhou', '\u75f4': 'chi', '\u5ad4': 'pin', '\u66ff': 'ti', '\u8431': 'xuan', '\u7ec0': 'gan', '\u6881': 'liang', '\u62a4': 'hu', '\u50bb': 'sha', '\u592f': 'hen', '\u70f7': 'wan', '\u7ba6': 'ze', '\u872e': 'guo', '\u5f31': 'ruo', '\u5ea0': 'xiang', '\u64a9': 'liao', '\u4ee4': 'ling', '\u5c38': 'shi', '\u55dc': 'shi', '\u8d76': 'gan', '\u6342': 'wu', '\u7c74': 'di', '\u643f': 'ge', '\u7a1e': 'hua', '\u7275': 'qian', '\u5207': 'qie', '\u57a1': 'fa', '\u6396': 'ye', '\u8ff7': 'mi', '\u8fe8': 'dai', '\u835a': 'jia', '\u7629': 'da', '\u8c04': 'chan', '\u88c5': 'zhuang', '\u4eb5': 'xie', '\u98a4': 'chan', '\u6f14': 'yan', '\u9506': 'gao', '\u9977': 'xiang', '\u70e9': 'hui', '\u5b93': 'mi', '\u9ac5': 'lou', '\u83d6': 'chang', '\u698d': 'xie', '\u5c91': 'cen', '\u7a74': 'xue', '\u8b66': 'jing', '\u909d': 'kuang', '\u672a': 'wei', '\u7ba8': 'tuo', '\u81e7': 'zang', '\u5431': 'zhi', '\u9185': 'pei', '\u704f': 'hao', '\u644a': 'tan', '\u4f2b': 'zhu', '\u96f9': 'bao', '\u5509': 'ai', '\u7136': 'ran', '\u5e02': 'shi', '\u6c2f': 'lv', '\u5ab5': 'sheng', '\u584c': 'ta', '\u82b0': 'ji', '\u989a': 'e', '\u8d48': 'zhen', '\u8154': 'qiang', '\u9e7f': 'lu', '\u524a': 'xiao', '\u74e2': 'piao', '\u8c28': 'jin', '\u8517': 'zhe', '\u6027': 'xing', '\u831b': 'gen', '\u8297': 'xiang', '\u818a': 'bo', '\u8d73': 'jiu', '\u654f': 'min', '\u9508': 'xiu', '\u8284': 'wan', '\u6869': 'zhuang', '\u55f3': 'ai', '\u91cd': 'zhong', '\u9986': 'guan', '\u770d': 'kou', '\u6661': 'bu', '\u63de': 'an', '\u7792': 'man', '\u4eca': 'jin', '\u62df': 'ni', '\u5bfb': 'xun', '\u6a1f': 'zhang', '\u4f5f': 'tong', '\u80e8': 'dong', '\u55e3': 'si', '\u7a8d': 'qiao', '\u59f9': 'cha', '\u641e': 'gao', '\u7bb4': 'jian', '\u9aa3': 'chan', '\u5b50': 'zi', '\u9971': 'bao', '\u5f04': 'long', '\u94a4': 'qian', '\u897b': 'pan', '\u822f': 'zhong', '\u8069': 'kui', '\u795b': 'qu', '\u8f7c': 'shi', '\u4f51': 'you', '\u61e6': 'nuo', '\u751c': 'tian', '\u717d': 'shan', '\u62e8': 'bo', '\u6bcd': 'mu', '\u78f7': 'lin', '\u9f85': 'bao', '\u8e66': 'beng', '\u59d7': 'shan', '\u9ee7': 'li', '\u544b': 'fu', '\u5ba4': 'shi', '\u9c9f': 'xun', '\u7eb5': 'zong', '\u755b': 'zhen', '\u55ea': 'qin', '\u5f6d': 'peng', '\u4f6c': 'lao', '\u8f83': 'jiao', '\u7480': 'cui', '\u7663': 'xuan', '\u53f2': 'shi', '\u79d1': 'ke', '\u7817': 'che', '\u538d': 'she', '\u9083': 'sui', '\u80e5': 'xu', '\u57f9': 'pei', '\u98ce': 'feng', '\u83ea': 'dang', '\u86c4': 'gu', '\u5faa': 'xun', '\u4f9d': 'yi', '\u4e15': 'pi', '\u83bc': 'chun', '\u96c7': 'gu', '\u9efe': 'meng', '\u4f8f': 'zhu', '\u72fb': 'jun', '\u73e7': 'yao', '\u89d6': 'jue', '\u5d47': 'ji', '\u80ce': 'tai', '\u7ab3': 'yu', '\u90aa': 'xie', '\u68cb': 'qi', '\u8ba4': 'ren', '\u70b8': 'zha', '\u6325': 'hui', '\u5154': 'tu', '\u8307': 'ba', '\u8bdf': 'gou', '\u996e': 'yin', '\u852b': 'nian', '\u540c': 'tong', '\u9ef9': 'zhi', '\u6487': 'pie', '\u9aa2': 'cong', '\u621f': 'ji', '\u5077': 'tou', '\u7ea0': 'jiu', '\u594b': 'fen', '\u6d53': 'nong', '\u55d3': 'sang', '\u8f87': 'nian', '\u6674': 'qing', '\u992e': 'tie', '\u86b0': 'zhu', '\u8d43': 'zang', '\u6e0e': 'du', '\u5955': 'yi', '\u9981': 'nei', '\u6371': 'ai', '\u8da3': 'qu', '\u8f74': 'zhou', '\u8d59': 'fu', '\u83c0': 'wan', '\u8e76': 'jue', '\u9622': 'wu', '\u5486': 'pao', '\u8bd7': 'shi', '\u9fa0': 'yue', '\u8d53': 'geng', '\u6d41': 'liu', '\u5740': 'zhi', '\u8d46': 'jin', '\u82cb': 'wan', '\u5584': 'shan', '\u8e94': 'chan', '\u4f2a': 'wei', '\u63e9': 'kai', '\u4e28': 'gun', '\u988f': 'hai', '\u9a80': 'dai', '\u7a96': 'jie', '\u88b7': 'jie', '\u63e3': 'chuan', '\u611f': 'gan', '\u8a93': 'shi', '\u7b5d': 'zheng', '\u949a': 'bu', '\u8236': 'bo', '\u7eab': 'ren', '\u9485': 'jin', '\u5454': 'dai', '\u6563': 'san', '\u544a': 'gao', '\u8351': 'ti', '\u7f08': 'miao', '\u90a2': 'xing', '\u7435': 'pi', '\u5e1c': 'zhi', '\u89d2': 'jiao', '\u53f3': 'you', '\u5021': 'chang', '\u5e72': 'gan', '\u7eed': 'xu', '\u710a': 'han', '\u8e35': 'zhong', '\u7f69': 'zhao', '\u6edf': 'yan', '\u5582': 'wei', '\u8723': 'qiang', '\u7fd4': 'xiang', '\u8335': 'yin', '\u8db3': 'zu', '\u8747': 'ying', '\u86d4': 'hui', '\u8012': 'lei', '\u8e22': 'ti', '\u5f82': 'zu', '\u8336': 'cha', '\u9897': 'ke', '\u7940': 'si', '\u5b51': 'jie', '\u8896': 'xiu', '\u5f8a': 'huai', '\u82d4': 'tai', '\u53f0': 'tai', '\u88d5': 'yu', '\u7784': 'miao', '\u7605': 'dan', '\u6254': 'reng', '\u836f': 'yao', '\u9516': 'qiang', '\u9557': 'tang', '\u6ceb': 'xuan', '\u8c61': 'xiang', '\u5452': 'mu', '\u5416': 'ya', '\u69ce': 'cha', '\u8bf8': 'zhu', '\u8001': 'lao', '\u7d0a': 'wen', '\u581e': 'die', '\u60ed': 'can', '\u5578': 'xiao', '\u58e4': 'rang', '\u6d74': 'yu', '\u8165': 'xing', '\u950f': 'jian', '\u96bc': 'sun', '\u75bc': 'teng', '\u9b08': 'quan', '\u7c9d': 'li', '\u96cf': 'chu', '\u849c': 'suan', '\u55bb': 'yu', '\u7c26': 'deng', '\u76ca': 'yi', '\u9488': 'zhen', '\u6bf9': 'shu', '\u7b5a': 'bi', '\u9cb1': 'fei', '\u773c': 'yan', '\u64c2': 'lei', '\u50a8': 'chu', '\u8d30': 'er', '\u9636': 'jie', '\u83b3': 'shi', '\u6243': 'jiong', '\u5fd0': 'keng', '\u94ed': 'ming', '\u614c': 'huang', '\u82db': 'ke', '\u6668': 'chen', '\u7f8e': 'mei', '\u8052': 'guo', '\u4fc4': 'e', '\u9499': 'gai', '\u5b54': 'kong', '\u9645': 'ji', '\u745f': 'se', '\u5e45': 'fu', '\u69b1': 'cui', '\u7b2a': 'da', '\u8473': 'wei', '\u8389': 'li', '\u8308': 'chai', '\u8715': 'tui', '\u77a0': 'cheng', '\u94ff': 'keng', '\u5c55': 'zhan', '\u7bd9': 'gao', '\u57dd': 'dian', '\u6939': 'shen', '\u8fd8': 'huai', '\u5f08': 'yi', '\u7578': 'ji', '\u5e2d': 'xi', '\u7ef0': 'chuo', '\u4faa': 'chai', '\u59da': 'yao', '\u6320': 'nao', '\u7422': 'zhuo', '\u9e9f': 'lin', '\u5b9d': 'bao', '\u5145': 'chong', '\u5983': 'fei', '\u821e': 'wu', '\u72e8': 'rong', '\u5471': 'gua', '\u5ea5': 'xiu', '\u8bb4': 'xu', '\u765e': 'lai', '\u6db2': 'ye', '\u8c6b': 'yu', '\u6c7e': 'fen', '\u5290': 'hua', '\u69cc': 'chui', '\u696b': 'ji', '\u63b0': 'bai', '\u6751': 'cun', '\u8884': 'ao', '\u593a': 'duo', '\u7075': 'ling', '\u76a4': 'po', '\u7efc': 'zong', '\u5c6e': 'che', '\u6376': 'chui', '\u4f24': 'shang', '\u97ec': 'tao', '\u9e5c': 'wu', '\u6bc2': 'gu', '\u7ece': 'yi', '\u8605': 'heng', '\u5fe1': 'chong', '\u558a': 'han', '\u7ec3': 'lian', '\u793e': 'she', '\u626f': 'che', '\u8713': 'ting', '\u679d': 'zhi', '\u6e0c': 'lu', '\u5f9c': 'chang', '\u5639': 'liao', '\u8721': 'la', '\u9e2b': 'dong', '\u8910': 'he', '\u5f79': 'yi', '\u973e': 'mai', '\u607d': 'yun', '\u552f': 'wei', '\u5fc3': 'xin', '\u8e44': 'ti', '\u9edb': 'dai', '\u686b': 'suo', '\u956b': 'deng', '\u53ef': 'ke', '\u59d4': 'wei', '\u77b3': 'tong', '\u8f7d': 'zai', '\u5458': 'yuan', '\u6df3': 'chun', '\u996d': 'fan', '\u836b': 'yin', '\u747e': 'jin', '\u7530': 'tian', '\u6534': 'zhi', '\u9547': 'zhen', '\u94db': 'dang', '\u877c': 'lou', '\u5ce1': 'xia', '\u4efb': 'ren', '\u5751': 'kang', '\u78d5': 'ke', '\u736c': 'jie', '\u4f17': 'zhong', '\u73c0': 'po', '\u6603': 'ze', '\u7a14': 'ren', '\u5c71': 'shan', '\u87bd': 'zhong', '\u8d2a': 'tan', '\u9150': 'gan', '\u9698': 'ai', '\u6cb1': 'tuo', '\u7eac': 'wei', '\u9970': 'shi', '\u9c88': 'lu', '\u86a7': 'jie', '\u6496': 'han', '\u50b2': 'ao', '\u5170': 'lan', '\u94d0': 'kao', '\u6b93': 'lian', '\u7f8a': 'yang', '\u7f6e': 'zhi', '\u6401': 'ge', '\u7cd7': 'qiu', '\u6545': 'gu', '\u91af': 'xi', '\u67a2': 'shu', '\u5315': 'bi', '\u6f2b': 'man', '\u7a0d': 'shao', '\u7f54': 'wang', '\u7634': 'zhang', '\u877e': 'rong', '\u6fb9': 'dan', '\u9700': 'xu', '\u56d7': 'guo', '\u6816': 'qi', '\u770b': 'kan', '\u5c82': 'qi', '\u634d': 'han', '\u60ad': 'qian', '\u5fad': 'yao', '\u9050': 'xia', '\u5e42': 'mi', '\u7780': 'mao', '\u635e': 'lao', '\u9ca7': 'gun', '\u759d': 'shan', '\u6696': 'nuan', '\u952c': 'tan', '\u90d7': 'xi', '\u54d9': 'guai', '\u4ea2': 'kang', '\u8d1e': 'zhen', '\u9ad3': 'sui', '\u5c3b': 'kao', '\u6cfb': 'xie', '\u7331': 'nao', '\u7b49': 'deng', '\u4f84': 'zhi', '\u5dc5': 'dian', '\u867d': 'sui', '\u7847': 'nao', '\u74ef': 'ou', '\u9668': 'yun', '\u5fed': 'bian', '\u58d1': 'he', '\u4e60': 'xi', '\u4e9a': 'ya', '\u887d': 'ren', '\u73af': 'huan', '\u82be': 'fei', '\u4f26': 'lun', '\u63ba': 'chan', '\u8c2e': 'zen', '\u632a': 'nuo', '\u5398': 'li', '\u987c': 'xu', '\u795f': 'sui', '\u80cd': 'gu', '\u5931': 'shi', '\u4fe1': 'xin', '\u5efa': 'jian', '\u5228': 'pao', '\u7ffc': 'yi', '\u62d7': 'ao', '\u6862': 'zhen', '\u637a': 'na', '\u51c0': 'jing', '\u8482': 'di', '\u4ff8': 'feng', '\u6c32': 'yun', '\u8dd7': 'fu', '\u90d1': 'zheng', '\u9170': 'xian', '\u94a2': 'gang', '\u65bc': 'yu', '\u6d07': 'yan', '\u87ea': 'hui', '\u5c50': 'ji', '\u5432': 'shen', '\u825a': 'cao', '\u6eb1': 'qin', '\u5eb8': 'yong', '\u62c8': 'nian', '\u8679': 'hong', '\u77fd': 'xi', '\u542c': 'ting', '\u6beb': 'hao', '\u86fe': 'e', '\u594e': 'kui', '\u70d8': 'hong', '\u87e0': 'pan', '\u4e88': 'yu', '\u84b8': 'zheng', '\u8bc3': 'he', '\u5d2d': 'zhan', '\u6447': 'yao', '\u555c': 'zhuo', '\u7fcc': 'yi', '\u6c5c': 'si', '\u85aa': 'xin', '\u97a0': 'ju', '\u594f': 'zou', '\u5565': 'sha', '\u877d': 'chun', '\u586b': 'tian', '\u8174': 'yu', '\u7f1c': 'zhen', '\u6015': 'pa', '\u6216': 'huo', '\u9500': 'xiao', '\u8339': 'ru', '\u6222': 'ji', '\u5a01': 'wei', '\u7750': 'lai', '\u94f0': 'jiao', '\u4fde': 'yu', '\u9611': 'lan', '\u4fd8': 'fu', '\u564e': 'ye', '\u508d': 'bang', '\u6ca3': 'feng', '\u6405': 'jiao', '\u5c25': 'liao', '\u520d': 'chu', '\u8025': 'tang', '\u5941': 'lian', '\u51c4': 'qi', '\u665f': 'cheng', '\u9876': 'ding', '\u718f': 'xun', '\u69bb': 'ta', '\u96f3': 'li', '\u7b7b': 'gang', '\u8f7a': 'diao', '\u9e25': 'ou', '\u50cf': 'xiang', '\u902f': 'dai', '\u51f8': 'tu', '\u59d3': 'xing', '\u5c61': 'lv', '\u518d': 'zai', '\u9ce2': 'li', '\u9b48': 'xiao', '\u5f84': 'jing', '\u7ba9': 'luo', '\u5522': 'suo', '\u552a': 'beng', '\u62fe': 'shi', '\u914d': 'pei', '\u9f88': 'yin', '\u7faf': 'jie', '\u6349': 'zhuo', '\u5384': 'e', '\u6d1e': 'dong', '\u67f0': 'nai', '\u5624': 'ying', '\u6e21': 'du', '\u80f8': 'xiong', '\u9edd': 'you', '\u8e3d': 'ju', '\u62f7': 'kao', '\u6302': 'gua', '\u84e5': 'ning', '\u6cbf': 'yan', '\u79e3': 'mo', '\u55f2': 'dia', '\u8fd1': 'jin', '\u7887': 'ding', '\u5a7f': 'xu', '\u6861': 'rao', '\u8c0c': 'chen', '\u4e4f': 'fa', '\u9621': 'qian', '\u5d02': 'lao', '\u552c': 'hu', '\u726f': 'gu', '\u8be8': 'hun', '\u65cc': 'jing', '\u659f': 'zhen', '\u4ed6': 'ta', '\u6db8': 'he', '\u529d': 'quan', '\u6068': 'hen', '\u8c2c': 'miu', '\u9f0b': 'yuan', '\u866e': 'ji', '\u7baa': 'dan', '\u679a': 'mei', '\u5e1a': 'zhou', '\u89c9': 'jue', '\u6109': 'yu', '\u9f39': 'yan', '\u4e1a': 'ye', '\u7bfc': 'dou', '\u54ee': 'xiao', '\u6ebb': 'ta', '\u6a2a': 'heng', '\u7610': 'yu', '\u72b6': 'zhuang', '\u86aa': 'dou', '\u6a18': 'cheng', '\u9608': 'yu', '\u7ee9': 'ji', '\u552e': 'shou', '\u94f7': 'ru', '\u98d3': 'ju', '\u7f2c': 'xie', '\u72e9': 'shou', '\u9ae1': 'kun', '\u8b26': 'qing', '\u8136': 'luo', '\u75ca': 'quan', '\u9556': 'biao', '\u727f': 'gu', '\u62d3': 'tuo', '\u9a9a': 'sao', '\u51ff': 'zao', '\u8fe9': 'er', '\u6845': 'wei', '\u7ae5': 'tong', '\u50a3': 'dai', '\u58f0': 'sheng', '\u6a21': 'mo', '\u4e9b': 'xie', '\u8dbe': 'zhi', '\u54a4': 'zha', '\u96fe': 'wu', '\u6c28': 'an', '\u536f': 'mao', '\u8bef': 'wu', '\u5c99': 'ao', '\u4f6f': 'yang', '\u9cc5': 'qiu', '\u8869': 'cha', '\u82eb': 'shan', '\u6d43': 'jia', '\u5e03': 'bu', '\u60dd': 'chang', '\u5c49': 'ti', '\u8d8b': 'qu', '\u7aa0': 'ke', '\u724c': 'pai', '\u8114': 'ji', '\u4f3c': 'si', '\u8234': 'ze', '\u95f7': 'men', '\u7579': 'wan', '\u890a': 'pian', '\u7cd6': 'tang', '\u8c98': 'mo', '\u53e9': 'kou', '\u88d8': 'qiu', '\u717a': 'tui', '\u781a': 'yan', '\u6556': 'ao', '\u4f4e': 'di', '\u60ac': 'xuan', '\u6d5c': 'bin', '\u6c30': 'qing', '\u6c72': 'ji', '\u4efd': 'fen', '\u51cc': 'ling', '\u7962': 'ni', '\u72ad': 'fan', '\u73c9': 'min', '\u9b49': 'liang', '\u989e': 'nie', '\u9875': 'ye', '\u78c9': 'sang', '\u867e': 'xia', '\u5cbd': 'dong', '\u53f7': 'hao', '\u5ff1': 'chen', '\u5448': 'cheng', '\u83b0': 'kan', '\u6df7': 'hun', '\u6eda': 'gun', '\u9e3d': 'ge', '\u6a79': 'lu', '\u83c1': 'jing', '\u7f3a': 'que', '\u7eb6': 'lun', '\u732b': 'miao', '\u6615': 'cuan', '\u5eff': 'nian', '\u4f22': 'ya', '\u7cdf': 'zao', '\u5269': 'sheng', '\u59a9': 'wu', '\u82c7': 'wei', '\u653f': 'zheng', '\u6805': 'zha', '\u8fd0': 'yun', '\u5171': 'gong', '\u65a4': 'jin', '\u9e42': 'li', '\u4fae': 'wu', '\u5d5d': 'lou', '\u6635': 'ni', '\u72f1': 'yu', '\u5bee': 'liao', '\u6989': 'ju', '\u8406': 'ba', '\u505a': 'zuo', '\u94cb': 'bi', '\u7dae': 'qi', '\u5345': 'sa', '\u5997': 'jin', '\u6339': 'yi', '\u6426': 'nuo', '\u9aed': 'zi', '\u7130': 'yan', '\u5404': 'ge', '\u8017': 'hao', '\u82c4': 'bian', '\u9cb0': 'zou', '\u9614': 'kuo', '\u9c92': 'jie', '\u7457': 'yuan', '\u7e47': 'yao', '\u75d4': 'zhi', '\u8f66': 'che', '\u8006': 'shi', '\u73de': 'li', '\u500f': 'shu', '\u95f8': 'zha', '\u4e09': 'san', '\u53cd': 'fan', '\u5bfc': 'dao', '\u5dde': 'zhou', '\u6dfb': 'tian', '\u5cd2': 'dong', '\u7115': 'huan', '\u8d3b': 'yi', '\u5671': 'xue', '\u7ee3': 'xiu', '\u684e': 'zhi', '\u502c': 'zhuo', '\u5d26': 'yan', '\u4ea0': 'tou', '\u62fc': 'pin', '\u90e6': 'li', '\u9b43': 'ba', '\u9c8d': 'bao', '\u5880': 'chi', '\u7762': 'sui', '\u9cb5': 'ni', '\u666e': 'pu', '\u5f53': 'dang', '\u7cc7': 'hou', '\u6e9f': 'ming', '\u57b2': 'kai', '\u6d59': 'zhe', '\u7b9c': 'kong', '\u725f': 'mou', '\u5915': 'xi', '\u8f75': 'zhi', '\u8058': 'pin', '\u640f': 'bo', '\u6748': 'cha', '\u9522': 'gu', '\u8311': 'niao', '\u5820': 'hou', '\u701a': 'han', '\u67af': 'ku', '\u9697': 'kui', '\u5b69': 'hai', '\u6fde': 'bi', '\u5cc1': 'mao', '\u7528': 'yong', '\u71d4': 'fan', '\u4ea4': 'jiao', '\u60f9': 'ruo', '\u4f55': 'he', '\u7ba7': 'qie', '\u8303': 'fan', '\u76c2': 'yu', '\u846c': 'zang', '\u78b2': 'di', '\u5f80': 'wang', '\u683c': 'ge', '\u7fe5': 'zhu', '\u4e0b': 'xia', '\u7624': 'liu', '\u781f': 'zha', '\u7691': 'ai', '\u94f9': 'lao', '\u7173': 'hu', '\u9e93': 'lu', '\u7c07': 'cu', '\u575f': 'fen', '\u5703': 'pu', '\u88d9': 'qun', '\u67aa': 'qiang', '\u7a3b': 'dao', '\u953a': 'zhong', '\u82d1': 'yuan', '\u62d0': 'guai', '\u54cf': 'gen', '\u821f': 'zhou', '\u4ed9': 'xian', '\u84c9': 'rong', '\u732e': 'xian', '\u4ea5': 'hai', '\u675c': 'du', '\u517b': 'yang', '\u9ebe': 'hui', '\u6d3e': 'pai', '\u8627': 'qu', '\u8fb1': 'ru', '\u7a78': 'xi', '\u6270': 'rao', '\u7ee5': 'sui', '\u84a1': 'bang', '\u835b': 'rao', '\u8298': 'bi', '\u6753': 'zhuo', '\u915a': 'fen', '\u7f7e': 'zeng', '\u9893': 'tui', '\u9e49': 'wu', '\u66f9': 'cao', '\u79d8': 'mi', '\u7765': 'pi', '\u788e': 'sui', '\u822c': 'ban', '\u9561': 'chan', '\u7184': 'xi', '\u88f1': 'biao', '\u7ede': 'jiao', '\u8629': 'fan', '\u83b4': 'wo', '\u80ba': 'fei', '\u7eb3': 'na', '\u53ee': 'ding', '\u8d8a': 'yue', '\u5507': 'chun', '\u6c61': 'wu', '\u5c31': 'jiu', '\u82ab': 'yan', '\u6a71': 'chu', '\u6c5e': 'gong', '\u4f32': 'ni', '\u94ef': 'se', '\u609f': 'wu', '\u730a': 'ni', '\u59d0': 'jie', '\u8179': 'fu', '\u8fe2': 'tiao', '\u96f7': 'lei', '\u82dc': 'mu', '\u5b70': 'shu', '\u8014': 'zi', '\u5c24': 'you', '\u6842': 'gui', '\u5a49': 'wan', '\u56e1': 'nan', '\u550f': 'xi', '\u4ec4': 'ze', '\u7761': 'shui', '\u8210': 'shi', '\u5556': 'dan', '\u6389': 'diao', '\u8071': 'ao', '\u8ece': 'wei', '\u69f2': 'hu', '\u6084': 'qiao', '\u6291': 'yi', '\u634c': 'ba', '\u6c5f': 'jiang', '\u7f62': 'ba', '\u6b62': 'zhi', '\u5728': 'zai', '\u9616': 'he', '\u62ff': 'na', '\u5773': 'ao', '\u9c95': 'er', '\u7726': 'zi', '\u7efa': 'liu', '\u62d2': 'ju', '\u60d5': 'ti', '\u90eb': 'pi', '\u5b5a': 'fu', '\u63ce': 'xuan', '\u602f': 'qie', '\u5800': 'ku', '\u8d4f': 'shang', '\u58d5': 'hao', '\u709c': 'wei', '\u95eb': 'yan', '\u5811': 'qian', '\u5243': 'ti', '\u54b3': 'ke', '\u4e30': 'feng', '\u784e': 'xing', '\u54ac': 'yao', '\u6a97': 'bo', '\u6742': 'za', '\u52f0': 'xie', '\u8d9f': 'theng', '\u91c7': 'cai', '\u5014': 'jue', '\u95fd': 'min', '\u9cc7': 'huang', '\u502e': 'luo', '\u52bf': 'shi', '\u8bb7': 'ne', '\u8ba1': 'ji', '\u8bae': 'yi', '\u522b': 'bie', '\u8f82': 'lu', '\u72b9': 'you', '\u9002': 'shi', '\u51ab': 'sui', '\u7266': 'mao', '\u53c1': 'san', '\u8e2a': 'zong', '\u67d0': 'mou', '\u5523': 'zao', '\u9f20': 'shu', '\u8d50': 'ci', '\u7080': 'yang', '\u708e': 'yan', '\u948b': 'po', '\u5a03': 'wa', '\u764c': 'ai', '\u678b': 'bing', '\u867b': 'meng', '\u88b1': 'fu', '\u4ec0': 'shi', '\u53f9': 'tan', '\u785d': 'xiao', '\u85e9': 'fan', '\u4e4b': 'zhi', '\u8822': 'chun', '\u78a7': 'bi', '\u56e0': 'yin', '\u4f69': 'pei', '\u4ecb': 'jie', '\u6392': 'pai', '\u7c98': 'zhan', '\u5ef7': 'ting', '\u65f7': 'kuang', '\u9b2f': 'chang', '\u7f9d': 'di', '\u7c92': 'li', '\u5182': 'jiong', '\u603b': 'zong', '\u5631': 'zhu', '\u778d': 'sou', '\u8fce': 'ying', '\u524d': 'qian', '\u6d1b': 'luo', '\u52be': 'he', '\u9163': 'han', '\u8885': 'niao', '\u53e5': 'ju', '\u60dc': 'xi', '\u757f': 'ji', '\u9165': 'su', '\u6cd5': 'fa', '\u9e36': 'si', '\u5960': 'dian', '\u574a': 'fang', '\u4ef0': 'yang', '\u57a0': 'ken', '\u763c': 'mo', '\u914c': 'zhuo', '\u6c54': 'qi', '\u7247': 'pian', '\u51b7': 'ling', '\u8d2d': 'gou', '\u997f': 'e', '\u5704': 'yu', '\u9b03': 'zong', '\u9b4f': 'wei', '\u55b5': 'miao', '\u9b4d': 'wang', '\u8d22': 'cai', '\u554a': 'a', '\u5b88': 'shou', '\u67a5': 'li', '\u69fd': 'cao', '\u6e8f': 'tang', '\u5dfe': 'jin', '\u78e8': 'mo', '\u6a84': 'xi', '\u6dbf': 'zhuo', '\u7839': 'ai', '\u5c51': 'xie', '\u8bdd': 'hua', '\u6b64': 'ci', '\u8205': 'jiu', '\u522d': 'jing', '\u6c2a': 'ke', '\u90b6': 'bei', '\u778e': 'xia', '\u716e': 'zhu', '\u965f': 'zhi', '\u5cac': 'jia', '\u64e6': 'ca', '\u8981': 'yao', '\u817b': 'ni', '\u6f5c': 'qian', '\u84e0': 'li', '\u56f1': 'cong', '\u6ed4': 'tao', '\u51b2': 'chong', '\u4e0a': 'shang', '\u7a97': 'chuang', '\u7b62': 'pa', '\u7092': 'chao', '\u5925': 'huo', '\u9518': 'nuo', '\u53bf': 'xian', '\u75b0': 'zhu', '\u629b': 'pao', '\u7238': 'ba', '\u95fe': 'lv', '\u6467': 'cui', '\u952d': 'ding', '\u677e': 'song', '\u82e4': 'pie', '\u7b72': 'shao', '\u8204': 'tuo', '\u9b13': 'bin', '\u8d26': 'zhang', '\u6298': 'zhe', '\u9178': 'suan', '\u5511': 'shi', '\u603f': 'yi', '\u73a2': 'bin', '\u5b17': 'chan', '\u6cca': 'bo', '\u7540': 'bi', '\u8930': 'qian', '\u7f0f': 'bian', '\u8270': 'jian', '\u6f0f': 'lou', '\u83a0': 'xiu', '\u5fc5': 'bi', '\u5d14': 'cui', '\u79eb': 'shu', '\u85cf': 'cang', '\u8c14': 'e', '\u8403': 'cui', '\u8638': 'zhan', '\u5e61': 'fan', '\u79c1': 'si', '\u4f60': 'ni', '\u8ba6': 'jie', '\u5e8b': 'gui', '\u5eb5': 'an', '\u80a5': 'fei', '\u795d': 'zhu', '\u7fe0': 'cui', '\u549b': 'ning', '\u9688': 'wei', '\u6c10': 'di', '\u9088': 'miao', '\u9e5a': 'ci', '\u6636': 'chang', '\u53cc': 'shuang', '\u89c6': 'shi', '\u9798': 'qiao', '\u8046': 'ling', '\u796f': 'zhen', '\u7591': 'yi', '\u80f0': 'yi', '\u73d1': 'long', '\u8543': 'bo', '\u9631': 'jing', '\u82d7': 'miao', '\u8df7': 'qiao', '\u914a': 'ding', '\u5b85': 'zhai', '\u572a': 'yi', '\u5ab8': 'chi', '\u5adc': 'zhang', '\u8db1': 'zan', '\u6715': 'zhen', '\u8c7a': 'chai', '\u7f0d': 'duo', '\u53a9': 'jiu', '\u6218': 'zhan', '\u620c': 'xu', '\u8d77': 'qi', '\u8c03': 'diao', '\u8180': 'bang', '\u62ef': 'zheng', '\u8fd5': 'wu', '\u7720': 'mian', '\u835c': 'bi', '\u523b': 'ke', '\u7ec7': 'zhi', '\u521a': 'gang', '\u612b': 'su', '\u5ec9': 'lian', '\u7b38': 'po', '\u7bad': 'jian', '\u733f': 'yuan', '\u78b1': 'jian', '\u82cd': 'cang', '\u75e4': 'cuo', '\u9a9d': 'liu', '\u77f3': 'shi', '\u7812': 'pi', '\u6234': 'dai', '\u9c9b': 'jiao', '\u9649': 'xing', '\u53c9': 'cha', '\u5e37': 'wei', '\u5669': 'e', '\u8d31': 'jian', '\u5e9c': 'fu', '\u547b': 'shen', '\u9ca3': 'jian', '\u6548': 'xiao', '\u62c6': 'chai', '\u5729': 'xu', '\u823e': 'xi', '\u6441': 'en', '\u4fa6': 'zhen', '\u9f0d': 'tuo', '\u6666': 'hui', '\u6e34': 'ke', '\u62a5': 'bao', '\u68cd': 'gun', '\u7a3d': 'ji', '\u5668': 'qi', '\u6d3d': 'qia', '\u564d': 'jiao', '\u5f52': 'gui', '\u9791': 'da', '\u850c': 'su', '\u8db5': 'bao', '\u6843': 'tao', '\u867f': 'chai', '\u7818': 'dun', '\u58eb': 'shi', '\u818f': 'gao', '\u5b87': 'yu', '\u83aa': 'e', '\u859b': 'xue', '\u830c': 'chi', '\u5e5e': 'fu', '\u53ea': 'zhi', '\u73cd': 'zhen', '\u94dc': 'tong', '\u6808': 'zhan', '\u9ece': 'li', '\u58f6': 'hu', '\u79b9': 'yu', '\u6b7b': 'si', '\u5f55': 'lu', '\u6e56': 'hu', '\u7edc': 'luo', '\u8840': 'xue', '\u6dd1': 'shu', '\u4eeb': 'mu', '\u5466': 'you', '\u5f15': 'yin', '\u8776': 'die', '\u8c21': 'su', '\u6cfa': 'luo', '\u56e2': 'tuan', '\u5456': 'li', '\u69a8': 'zha', '\u6784': 'gou', '\u8513': 'man', '\u5ff5': 'nian', '\u6e7e': 'wan', '\u72ac': 'quan', '\u63f2': 'die', '\u5ffb': 'xin', '\u68b0': 'xie', '\u8249': 'wei', '\u9f2f': 'wu', '\u7934': 'bo', '\u597d': 'hao', '\u98de': 'fei', '\u5c60': 'tu', '\u56f4': 'wei', '\u4e39': 'dan', '\u6627': 'mei', '\u94d2': 'er', '\u86c9': 'ling', '\u62e6': 'lan', '\u8c4c': 'wan', '\u8fa3': 'la', '\u9f17': 'tao', '\u5eb3': 'bi', '\u523d': 'gui', '\u72e1': 'jiao', '\u5e14': 'pei', '\u7ebd': 'niu', '\u4ec3': 'ding', '\u6cd6': 'liu', '\u6a44': 'gan', '\u9ca5': 'shi', '\u525e': 'ji', '\u5048': 'jie', '\u8c79': 'bao', '\u6bf3': 'qiao', '\u5326': 'gui', '\u9563': 'liao', '\u754b': 'tian', '\u65c5': 'lv', '\u5bcc': 'fu', '\u5ddb': 'chuan', '\u7269': 'wu', '\u960c': 'wen', '\u5f50': 'ji', '\u56d4': 'nang', '\u9f8a': 'chuo', '\u6cae': 'ju', '\u574c': 'ben', '\u8bc1': 'zheng', '\u990d': 'yan', '\u81fb': 'zhen', '\u7565': 'lue', '\u4e4e': 'hu', '\u837c': 'tu', '\u4ece': 'cong', '\u8888': 'jia', '\u531d': 'za', '\u67b5': 'xiao', '\u9756': 'jing', '\u672d': 'zha', '\u6346': 'kun', '\u9968': 'tun', '\u666f': 'jing', '\u5e3b': 'ce', '\u65cf': 'zu', '\u84e6': 'mo', '\u7852': 'xi', '\u63a8': 'tui', '\u7315': 'mi', '\u53c8': 'you', '\u5fae': 'wei', '\u9aeb': 'jie', '\u67d1': 'gan', '\u7f2e': 'shan', '\u6d4e': 'ji', '\u6d51': 'hun', '\u8c49': 'chi', '\u559c': 'xi', '\u883c': 'qu', '\u6c49': 'han', '\u7fe6': 'jian', '\u9760': 'kao', '\u706d': 'mie', '\u782d': 'bian', '\u71c3': 'ran', '\u6a35': 'qiao', '\u78a1': 'zhou', '\u96cc': 'ci', '\u65ad': 'duan', '\u820d': 'she', '\u9f9f': 'gui', '\u5f89': 'yang', '\u9b44': 'po', '\u6bb3': 'shu', '\u9987': 'cha', '\u89c5': 'mi', '\u7586': 'jiang', '\u5b73': 'zi', '\u9963': 'shi', '\u5520': 'lao', '\u7b26': 'fu', '\u64de': 'sou', '\u975b': 'dian', '\u7f6a': 'zui', '\u9503': 'zeng', '\u878b': 'sou', '\u827d': 'qiu', '\u5c65': 'lv', '\u8beb': 'jie', '\u8d67': 'nan', '\u5208': 'yi', '\u5c3e': 'wei', '\u72d9': 'ju', '\u80a1': 'gu', '\u9f19': 'pi', '\u795a': 'zuo', '\u5b5d': 'xiao', '\u5d07': 'chong', '\u7fa4': 'qun', '\u57a2': 'gou', '\u8222': 'shan', '\u6b82': 'cu', '\u4e1e': 'sheng', '\u559d': 'he', '\u9cbd': 'die', '\u7cb2': 'can', '\u8e7f': 'cuan', '\u5d03': 'lai', '\u68c0': 'jian', '\u7b24': 'shao', '\u5cb8': 'an', '\u5250': 'gua', '\u81ed': 'chu', '\u884d': 'yan', '\u704c': 'guan', '\u6855': 'jiu', '\u8d58': 'zhui', '\u8499': 'meng', '\u901e': 'cheng', '\u9967': 'tang', '\u7116': 'men', '\u8eba': 'thang', '\u5348': 'wu', '\u950a': 'lue', '\u649e': 'zhuang', '\u7684': 'de', '\u9e47': 'xian', '\u600f': 'yang', '\u6398': 'jue', '\u7545': 'chang', '\u5492': 'zhou', '\u8579': 'weng', '\u94e8': 'quan', '\u6221': 'kan', '\u7741': 'zheng', '\u7f07': 'ti', '\u7b25': 'si', '\u7572': 'she', '\u6cb2': 'chi', '\u7640': 'huang', '\u534e': 'hua', '\u5fb7': 'de', '\u557c': 'ti', '\u833a': 'chong', '\u6628': 'zuo', '\u7840': 'chu', '\u54bb': 'xiao', '\u5219': 'ze', '\u58c5': 'yong', '\u576f': 'peng', '\u82bd': 'ya', '\u67f4': 'chai', '\u7f12': 'zhui', '\u5aaa': 'ao', '\u7b06': 'ba', '\u6dc5': 'xi', '\u76d8': 'pan', '\u7c0c': 'su', '\u5b81': 'ning', '\u94b0': 'yu', '\u67e0': 'nin', '\u9898': 'ti', '\u8dce': 'tuo', '\u566b': 'yi', '\u8d41': 'lin', '\u762a': 'bie', '\u9e39': 'gua', '\u743c': 'qiong', '\u971e': 'xia', '\u6863': 'dang', '\u60e7': 'ju', '\u953f': 'ai', '\u8702': 'feng', '\u575d': 'ba', '\u60ab': 'que', '\u5662': 'ao', '\u8005': 'zhe', '\u6055': 'shu', '\u5fcc': 'ji', '\u5506': 'suo', '\u572e': 'pi', '\u5e55': 'mu', '\u8d21': 'gong', '\u848b': 'jiang', '\u70c1': 'shuo', '\u5ad2': 'ai', '\u753b': 'hua', '\u8469': 'pa', '\u9619': 'que', '\u7bb8': 'zhu', '\u7c9c': 'diao', '\u60b2': 'bei', '\u8bfd': 'fei', '\u79e7': 'yang', '\u8f7f': 'jiao', '\u6c4a': 'cha', '\u5ba3': 'xuan', '\u655d': 'bi', '\u94a3': 'ban', '\u632b': 'cuo', '\u4e3f': 'pie', '\u8fdc': 'yuan', '\u6d46': 'jiang', '\u64d8': 'bo', '\u8983': 'tan', '\u7eb2': 'gang', '\u4f2f': 'bo', '\u96b9': 'cui', '\u674f': 'xing', '\u8fdf': 'chi', '\u6267': 'zhi', '\u4f76': 'ji', '\u72d2': 'fei', '\u52ff': 'wu', '\u4f97': 'dong', '\u7f44': 'qing', '\u817d': 'wa', '\u5514': 'en', '\u9065': 'yao', '\u6420': 'shuo', '\u84bd': 'en', '\u6770': 'jie', '\u60d1': 'huo', '\u838e': 'sha', '\u50f5': 'jiang', '\u57a7': 'shang', '\u75af': 'feng', '\u623e': 'li', '\u589e': 'zeng', '\u88f0': 'duo', '\u938f': 'liu', '\u70ad': 'tan', '\u917d': 'yan', '\u63a7': 'kong', '\u5f39': 'dan', '\u951e': 'guo', '\u671b': 'wang', '\u76d1': 'jian', '\u6c40': 'ting', '\u500c': 'guan', '\u9179': 'lei', '\u4e71': 'luan', '\u646d': 'zhi', '\u55b9': 'kui', '\u966a': 'pei', '\u64a4': 'che', '\u7838': 'za', '\u9047': 'yu', '\u9615': 'kui', '\u6aac': 'meng', '\u59be': 'qie', '\u74e0': 'gu', '\u6280': 'ji', '\u5d27': 'song', '\u6c05': 'chang', '\u81c0': 'tun', '\u7089': 'lu', '\u6b9a': 'dan', '\u82a4': 'kou', '\u54d7': 'hua', '\u672b': 'mo', '\u4fce': 'zu', '\u9965': 'ji', '\u561e': 'le', '\u516c': 'gong', '\u803d': 'dan', '\u725b': 'niu', '\u66f7': 'e', '\u81c2': 'bi', '\u55d6': 'sou', '\u742e': 'cong', '\u5fd7': 'zhi', '\u7b04': 'ji', '\u6e90': 'yuan', '\u8e0a': 'yong', '\u9e88': 'zhu', '\u80f1': 'guang', '\u5b9e': 'shi', '\u519b': 'jun', '\u723f': 'pan', '\u5b80': 'bao', '\u602a': 'guai', '\u4e10': 'gai', '\u57ef': 'an', '\u7cc1': 'san', '\u6643': 'huang', '\u94bc': 'mu', '\u637b': 'nian', '\u880a': 'lian', '\u91cc': 'li', '\u55b7': 'pen', '\u99a8': 'xin', '\u6273': 'ban', '\u7145': 'duan', '\u501f': 'jie', '\u64bc': 'han', '\u53c2': 'can', '\u6e5f': 'huang', '\u6400': 'chan', '\u573a': 'chang', '\u6495': 'si', '\u7c1f': 'dian', '\u518c': 'ce', '\u739f': 'men', '\u809d': 'gan', '\u633a': 'ting', '\u8d36': 'kuang', '\u804c': 'zhi', '\u817e': 'teng', '\u5144': 'xiong', '\u78d4': 'zhe', '\u7a81': 'tu', '\u4fb5': 'qin', '\u7d27': 'jin', '\u7a7a': 'kong', '\u6559': 'jiao', '\u631f': 'xie', '\u6ca6': 'lun', '\u8bf5': 'song', '\u7603': 'zhu', '\u977c': 'da', '\u94c0': 'you', '\u7231': 'ai', '\u5581': 'yu', '\u4ead': 'ting', '\u74f6': 'ping', '\u80c6': 'dan', '\u7ec2': 'fu', '\u70ef': 'xi', '\u57df': 'yu', '\u664f': 'yan', '\u6cf0': 'tai', '\u6deb': 'yin', '\u4e1c': 'dong', '\u5028': 'ju', '\u9a6c': 'ma', '\u9187': 'chun', '\u55cc': 'ai', '\u51fc': 'dang', '\u522e': 'gua', '\u8fdb': 'jin', '\u8c47': 'jiang', '\u8029': 'jiang', '\u80ef': 'kua', '\u9525': 'zhui', '\u5929': 'tian', '\u7ec9': 'chao', '\u7699': 'xi', '\u8f77': 'hu', '\u5965': 'ao', '\u7b4c': 'quan', '\u97eb': 'wen', '\u9f13': 'gu', '\u7f18': 'yuan', '\u50a7': 'bin', '\u94cc': 'ni', '\u52c7': 'yong', '\u918b': 'cu', '\u6942': 'cha', '\u60af': 'min', '\u8d70': 'zou', '\u5a62': 'bi', '\u82d8': 'qing', '\u74a7': 'bi', '\u5594': 'o', '\u58c1': 'bi', '\u804a': 'liao', '\u9acc': 'bin', '\u6380': 'xia', '\u874e': 'xie', '\u54a6': 'yi', '\u543e': 'wu', '\u752d': 'beng', '\u6b8b': 'can', '\u951d': 'de', '\u9524': 'chui', '\u903b': 'luo', '\u5657': 'pu', '\u6c50': 'xi', '\u8258': 'sou', '\u5224': 'pan', '\u8425': 'ying', '\u53f5': 'po', '\u8487': 'chan', '\u610d': 'fen', '\u810e': 'sha', '\u7bc7': 'pian', '\u5b09': 'xi', '\u8c30': 'lan', '\u66b4': 'bao', '\u828b': 'yu', '\u5af1': 'qiang', '\u75db': 'tong', '\u9176': 'mei', '\u8bb6': 'ya', '\u6d39': 'huan', '\u6795': 'zhen', '\u7fb0': 'tang', '\u789f': 'die', '\u65c1': 'pang', '\u6a8e': 'qin', '\u6777': 'ba', '\u7a3c': 'jia', '\u8238': 'ge', '\u868a': 'wen', '\u6ed5': 'teng', '\u6402': 'lou', '\u6167': 'hui', '\u70bb': 'shi', '\u82d3': 'ling', '\u9104': 'juan', '\u6f7a': 'chan', '\u766f': 'qu', '\u59b2': 'da', '\u5b9c': 'yi', '\u765c': 'dian', '\u71b5': 'shang', '\u6343': 'jun', '\u6258': 'tuo', '\u73f2': 'hui', '\u6fd2': 'bin', '\u95f6': 'kang', '\u736f': 'mi', '\u6d54': 'xun', '\u6de4': 'yu', '\u6c55': 'shan', '\u8d6d': 'zhe', '\u8093': 'huang', '\u5e7a': 'yao', '\u5317': 'bei', '\u7329': 'xing', '\u5d6f': 'ci', '\u6bd2': 'du', '\u5496': 'ka', '\u4f1b': 'yu', '\u8084': 'yi', '\u5a20': 'shen', '\u54c9': 'zai', '\u67d4': 'rou', '\u8f7e': 'zhi', '\u4faf': 'hou', '\u56a3': 'xiao', '\u7513': 'pi', '\u6606': 'kun', '\u6fef': 'shuo', '\u5363': 'you', '\u951a': 'mao', '\u7303': 'xian', '\u5b62': 'bao', '\u5b16': 'bi', '\u8132': 'niao', '\u6977': 'kai', '\u9eef': 'an', '\u62a8': 'peng', '\u589f': 'xu', '\u85d3': 'xian', '\u6df1': 'shen', '\u900d': 'xiao', '\u55e4': 'chi', '\u82f1': 'ying', '\u5d58': 'rong', '\u62d6': 'tuo', '\u8585': 'hao', '\u9041': 'dun', '\u952e': 'jian', '\u4f83': 'kan', '\u7654': 'yi', '\u8398': 'xin', '\u94a1': 'bei', '\u6b63': 'zheng', '\u5200': 'dao', '\u997a': 'jiao', '\u5140': 'wu', '\u54a7': 'lei', '\u5a74': 'ying', '\u6064': 'xu', '\u9537': 'e', '\u8331': 'zhu', '\u7b52': 'tong', '\u66f2': 'qu', '\u692d': 'tuo', '\u86f1': 'jia', '\u68d2': 'bang', '\u75b4': 'ke', '\u4f7b': 'tiao', '\u86df': 'jiao', '\u6e43': 'pai', '\u6a47': 'qiao', '\u8986': 'fu', '\u7fb9': 'geng', '\u7235': 'jue', '\u803b': 'chi', '\u6005': 'chang', '\u9531': 'zi', '\u8941': 'qiang', '\u5b89': 'an', '\u94f3': 'chong', '\u83c5': 'jian', '\u5938': 'kua', '\u8274': 'fu', '\u7ee8': 'ti', '\u82a5': 'jie', '\u586c': 'yuan', '\u832f': 'fu', '\u955d': 'di', '\u8f71': 'gu', '\u9601': 'ge', '\u75c7': 'zheng', '\u89cc': 'di', '\u79c9': 'bing', '\u7ae3': 'jun', '\u5783': 'la', '\u5f5d': 'yi', '\u626a': 'men', '\u57d9': 'xun', '\u6332': 'sa', '\u8087': 'zhao', '\u5806': 'dui', '\u7eef': 'fei', '\u8c10': 'xie', '\u5e0f': 'wei', '\u56ff': 'you', '\u659b': 'hu', '\u87ca': 'mao', '\u8e48': 'dao', '\u65b9': 'fang', '\u5583': 'nan', '\u8dec': 'kui', '\u96e8': 'yu', '\u857a': 'ji', '\u60ef': 'guan', '\u56b7': 'rang', '\u4ec2': 'le', '\u94b1': 'qian', '\u86e4': 'ga', '\u773a': 'tiao', '\u559f': 'kui', '\u5543': 'ken', '\u8fc2': 'yu', '\u7436': 'pa', '\u9175': 'jiao', '\u83b6': 'kan', '\u6562': 'gan', '\u742c': 'wan', '\u53cb': 'you', '\u6d4f': 'liu', '\u51f9': 'ao', '\u6631': 'yu', '\u5a23': 'di', '\u5e06': 'fan', '\u53e0': 'die', '\u712f': 'zhuo', '\u86f9': 'yong', '\u53df': 'sou', '\u8d38': 'mao', '\u5747': 'jun', '\u5b55': 'yun', '\u7bda': 'fei', '\u549a': 'dong', '\u8155': 'wan', '\u5401': 'yu', '\u5d69': 'song', '\u76bf': 'min', '\u4fa3': 'lv', '\u8233': 'zhou', '\u9f99': 'long', '\u68c9': 'mian', '\u972a': 'yin', '\u5217': 'lie', '\u66f0': 'yue', '\u5bb8': 'chen', '\u598d': 'yan', '\u961c': 'fu', '\u4fdc': 'ping', '\u88a2': 'pan', '\u9a6d': 'yu', '\u7b33': 'jia', '\u70ab': 'xuan', '\u9e35': 'tuo', '\u9888': 'jing', '\u8d1f': 'fu', '\u6479': 'mo', '\u6063': 'zi', '\u54f2': 'zhe', '\u7619': 'sao', '\u8fe5': 'jiong', '\u6829': 'xu', '\u94bf': 'tian', '\u98e8': 'xiang', '\u60ca': 'jing', '\u8f88': 'bei', '\u6fe1': 'ru', '\u5f0a': 'bi', '\u8221': 'chuan', '\u7199': 'xi', '\u8d3f': 'hui', '\u91b5': 'ju', '\u9993': 'san', '\u83cf': 'he', '\u9566': 'dun', '\u684c': 'zhuo', '\u610e': 'bi', '\u9e2d': 'ya', '\u9082': 'xie', '\u6536': 'shou', '\u7b4f': 'fa', '\u4fc3': 'chun', '\u6be1': 'zhan', '\u9cde': 'lin', '\u8401': 'ji', '\u4e47': 'tuo', '\u7ea6': 'yue', '\u8ba7': 'hong', '\u6019': 'hu', '\u567b': 'sai', '\u72e0': 'hen', '\u6957': 'jian', '\u9e37': 'zhi', '\u9553': 'jia', '\u9aa1': 'luo', '\u7267': 'mu', '\u7b4b': 'jin', '\u638c': 'zhang', '\u61ff': 'yi', '\u8c73': 'ban', '\u8707': 'zhe', '\u9494': 'men', '\u6dd8': 'tao', '\u5cad': 'ling', '\u819b': 'tang', '\u6b81': 'wen', '\u680f': 'lan', '\u57cb': 'mai', '\u4e38': 'wan', '\u953b': 'duan', '\u54c2': 'shen', '\u731b': 'meng', '\u7317': 'yi', '\u6cfd': 'ze', '\u88ad': 'xi', '\u4eb3': 'bo', '\u8c36': 'chan', '\u51dd': 'ning', '\u94a9': 'gou', '\u741b': 'chen', '\u752b': 'fu', '\u7c2a': 'zan', '\u614a': 'qian', '\u605d': 'jia', '\u624b': 'shou', '\u7693': 'hao', '\u85d0': 'miao', '\u5992': 'du', '\u6377': 'jie', '\u91c9': 'you', '\u8708': 'wu', '\u7f31': 'qian', '\u624d': 'cai', '\u683e': 'luan', '\u9b41': 'kui', '\u8861': 'heng', '\u82c8': 'li', '\u73bb': 'bo', '\u7617': 'yi', '\u7eaa': 'ji', '\u87ab': 'shi', '\u6b7c': 'jian', '\u563f': 'hei', '\u6c0f': 'shi', '\u61d1': 'men', '\u682a': 'zhu', '\u7809': 'xu', '\u870d': 'chu', '\u754c': 'jie', '\u7aa6': 'dou', '\u7109': 'yan', '\u52a3': 'lie', '\u7701': 'sheng', '\u94d6': 'cheng', '\u8d66': 'she', '\u6e14': 'yu', '\u59ff': 'zi', '\u4e4c': 'wu', '\u988a': 'jia', '\u6538': 'you', '\u4e43': 'nai', '\u5815': 'duo', '\u94c3': 'ling', '\u5c40': 'ju', '\u7cb3': 'jing', '\u854a': 'rui', '\u62ac': 'tai', '\u80b7': 'qian', '\u631b': 'lian', '\u71ee': 'xie', '\u7531': 'you', '\u5fb5': 'cheng', '\u5768': 'tuo', '\u8026': 'ou', '\u827a': 'yi', '\u6d3c': 'wa', '\u6252': 'ba', '\u6930': 'ye', '\u988c': 'ge', '\u82cf': 'su', '\u606f': 'xi', '\u6a2f': 'qiang', '\u9706': 'ting', '\u6cdb': 'fan', '\u6a90': 'dan', '\u6067': 'nv', '\u89e5': 'gong', '\u82f4': 'ju', '\u9664': 'chu', '\u78b0': 'peng', '\u72b4': 'an', '\u75a1': 'yang', '\u6d60': 'xi', '\u914e': 'zhou', '\u5889': 'yong', '\u8fde': 'lian', '\u90ef': 'tan', '\u9123': 'zhang', '\u67a7': 'jian', '\u9999': 'xiang', '\u68d8': 'ji', '\u7c40': 'zhou', '\u4e5f': 'ye', '\u6da3': 'huan', '\u6089': 'xi', '\u576b': 'dian', '\u7eda': 'xuan', '\u7f03': 'xiang', '\u989f': 'man', '\u6ce1': 'pao', '\u6cad': 'shu', '\u9189': 'zui', '\u6c64': 'tang', '\u82a1': 'qian', '\u5c97': 'gang', '\u6363': 'dao', '\u8892': 'tan', '\u63bc': 'guan', '\u634f': 'nie', '\u59e8': 'yi', '\u6bbf': 'dian', '\u67de': 'zuo', '\u8e1e': 'ju', '\u4f0d': 'wu', '\u600e': 'zen', '\u8572': 'qin', '\u65e2': 'ji', '\u8bf6': 'ai', '\u7efb': 'quan', '\u6168': 'kai', '\u9ca4': 'li', '\u5636': 'si', '\u5566': 'la', '\u8d84': 'ju', '\u7284': 'ji', '\u52aa': 'nu', '\u706b': 'huo', '\u8361': 'dang', '\u808c': 'ji', '\u960f': 'yan', '\u51fa': 'chu', '\u6790': 'xi', '\u5a11': 'suo', '\u5cea': 'yu', '\u7cc5': 'rou', '\u86b6': 'han', '\u798f': 'fu', '\u54a8': 'zi', '\u4fe6': 'chou', '\u7cd9': 'cao', '\u75b3': 'gan', '\u873f': 'wan', '\u8d63': 'gan', '\u7a0e': 'shui', '\u5976': 'nai', '\u783a': 'li', '\u54dd': 'nang', '\u6d89': 'she', '\u6004': 'ou', '\u8dba': 'fu', '\u690d': 'zhi', '\u8bb3': 'hui', '\u5654': 'deng', '\u7946': 'xian', '\u9884': 'yu', '\u55df': 'jie', '\u516d': 'liu', '\u5395': 'ce', '\u5389': 'li', '\u6c81': 'qin', '\u5b40': 'shuang', '\u783e': 'li', '\u55ef': 'en', '\u805a': 'ju', '\u65c4': 'mao', '\u6b37': 'xi', '\u7357': 'jue', '\u7f28': 'ying', '\u6ba1': 'bin', '\u889c': 'wa', '\u7eb7': 'fen', '\u6070': 'qia', '\u535a': 'bo', '\u7ca5': 'zhou', '\u6208': 'ge', '\u9e6a': 'jiao', '\u7be5': 'li', '\u9042': 'sui', '\u9f8c': 'wo', '\u8e39': 'chuai', '\u83f9': 'zu', '\u96c5': 'ya', '\u6ce0': 'ling', '\u6f02': 'piao', '\u8bcb': 'di', '\u8bf9': 'zhou', '\u5851': 'su', '\u8d4c': 'du', '\u7fca': 'yi', '\u78ca': 'lei', '\u6cd0': 'le', '\u4ef6': 'jian', '\u7554': 'pan', '\u5181': 'chan', '\u568e': 'hao', '\u679e': 'cong', '\u5e1d': 'di', '\u9a8f': 'jun', '\u69b4': 'liu', '\u89cf': 'gou', '\u62dc': 'bai', '\u5830': 'yan', '\u9ec4': 'huang', '\u9131': 'po', '\u7c7c': 'xian', '\u6cc9': 'quan', '\u7198': 'liu', '\u80a0': 'chang', '\u60c6': 'chou', '\u7a33': 'wen', '\u5f1f': 'di', '\u5750': 'zuo', '\u92ae': 'luan', '\u8703': 'shen', '\u574e': 'kan', '\u5e1b': 'bo', '\u5c06': 'jiang', '\u5de6': 'zuo', '\u5e18': 'lian', '\u8e87': 'chu', '\u9cd8': 'bie', '\u5e3c': 'guo', '\u62b5': 'di', '\u8d55': 'dan', '\u8bb8': 'xu', '\u71ce': 'liao', '\u903c': 'bi', '\u67c3': 'ling', '\u5f17': 'fu', '\u7c0b': 'gui', '\u556a': 'pa', '\u5374': 'que', '\u88e3': 'chan', '\u6ee0': 'ni', '\u8dc3': 'yue', '\u515a': 'dang', '\u96be': 'nan', '\u7487': 'xuan', '\u81a3': 'zhi', '\u56fa': 'gu', '\u97af': 'jian', '\u57ab': 'dian', '\u51d1': 'cu', '\u804d': 'ning', '\u7826': 'zhai', '\u9c9c': 'xian', '\u6740': 'sha', '\u5c96': 'qu', '\u55c9': 'su', '\u8695': 'can', '\u9062': 'ta', '\u88df': 'sha', '\u7a37': 'ji', '\u5d1e': 'guo', '\u6c35': 'san', '\u514d': 'mian', '\u9ccd': 'qi', '\u7c95': 'po', '\u9493': 'diao', '\u7c27': 'huang', '\u6c6a': 'wang', '\u9038': 'yi', '\u7905': 'dun', '\u7633': 'chou', '\u7c89': 'fen', '\u6e32': 'xuan', '\u6966': 'xuan', '\u8863': 'yi', '\u8e6c': 'deng', '\u870a': 'li', '\u59b9': 'mei', '\u9162': 'zuo', '\u9ac1': 'ke', '\u80af': 'ken', '\u57c2': 'geng', '\u87d1': 'zhang', '\u62f4': 'shuan', '\u5c4e': 'shi', '\u9057': 'yi', '\u62d9': 'zhuo', '\u94e9': 'se', '\u8fc1': 'qian', '\u6e85': 'jian', '\u6452': 'bing', '\u67e5': 'cha'}
};

function localeCompare_v (t, str, lang) {
  var self = t;
  lang = lang.indexOf('CN') == -1 ?  lang : 'zh'; // some error for 'zh-CN'
  var order = orders[lang];
  if (DEBUG) {
    debug('localeCompare_v, t:' + t + ' str:' + str + '  lang:' + lang + 
      ' order = ' + order);
  }
  
  if (!str || '' === str || '' === self || !lang || !order) {
    if (DEBUG) {
      debug('Param not available, localeCompare instead');
    }
    return self.localeCompare(str);
  }

  function convertToPY (ch) {
    var unicode = ch.charCodeAt(0);
    if(unicode > 40869 || unicode < 19968){
        return ch;
    }else{
      //for (var key in orders['zh']){
        //if(-1 !== orders['zh'][key].indexOf(ch)){
            //return key; 
            //break;
        //}
      //}
      
      if (orders['zh'] && orders['zh'][ch]){
        return orders['zh'][ch];
      }
      return ' ';
    }
  }

  function sortByL(a, b) {
    // Chiness
    if ('zh' == lang) {
      a = convertToPY(a);
      b = convertToPY(b)
      return a.localeCompare(b);
    } else {
      a = a.charCodeAt(0);
      b = b.charCodeAt(0);
      return order.indexOf(a) == order.indexOf(b) ? 0 : 
        (order.indexOf(a) > order.indexOf(b) ? 1 : -1);
    }
  }

  var length = self.length > str.length ? str.length : self.length;
  for (var i = 0; i < length; i ++) {
    if (sortByL(self.charAt(i), str.charAt(i)) != 0) {
      return sortByL(self.charAt(i), str.charAt(i));
    }
  }
  return self.length > str.length;
}


function exportContact(aRecord) {
  if (aRecord) {
    delete aRecord.search;
  }
  return aRecord;
}

function ContactDispatcher(aContacts, aFullContacts, aCallback, aNewTxn, aClearDispatcher, aFailureCb) {
  let nextIndex = 0;

  let sendChunk;
  let count = 0;
  if (aFullContacts) {
    sendChunk = function() {
      try {
        let chunk = aContacts.splice(0, CHUNK_SIZE);
        if (chunk.length > 0) {
          aCallback(chunk);
        }
        if (aContacts.length === 0) {
          aCallback(null);
          aClearDispatcher();
        }
      } catch (e) {
        aClearDispatcher();
      }
    };
  } else {
    sendChunk = function() {
      try {
        let start = nextIndex;
        nextIndex += CHUNK_SIZE;
        let chunk = [];
        aNewTxn("readonly", STORE_NAME, function(txn, store) {
          for (let i = start; i < Math.min(start+CHUNK_SIZE, aContacts.length); ++i) {
            store.get(aContacts[i]).onsuccess = function(e) {
              chunk.push(exportContact(e.target.result));
              count++;
              if (count === aContacts.length) {
                aCallback(chunk);
                aCallback(null);
                aClearDispatcher();
              } else if (chunk.length === CHUNK_SIZE) {
                aCallback(chunk);
                chunk.length = 0;
              }
            };
          }
        }, null, function(errorMsg) {
          aFailureCb(errorMsg);
        });
      } catch (e) {
        aClearDispatcher();
      }
    };
  }

  return {
    sendNow: function() {
      sendChunk();
    }
  };
}

this.ContactDB = function ContactDB() {
  if (DEBUG) debug("Constructor");
};

ContactDB.prototype = {
  __proto__: IndexedDBHelper.prototype,

  _dispatcher: {},

  useFastUpgrade: true,

  lang: '',

  upgradeSchema: function upgradeSchema(aTransaction, aDb, aOldVersion, aNewVersion) {
    let loadInitialContacts = function() {
      // Add default contacts
      let jsm = {};
      Cu.import("resource://gre/modules/FileUtils.jsm", jsm);
      Cu.import("resource://gre/modules/NetUtil.jsm", jsm);
      // Loading resource://app/defaults/contacts.json doesn't work because
      // contacts.json is not in the omnijar.
      // So we look for the app dir instead and go from here...
      let contactsFile = jsm.FileUtils.getFile("DefRt", ["contacts.json"], false);
      if (!contactsFile || (contactsFile && !contactsFile.exists())) {
        // For b2g desktop
        contactsFile = jsm.FileUtils.getFile("ProfD", ["contacts.json"], false);
        if (!contactsFile || (contactsFile && !contactsFile.exists())) {
          return;
        }
      }

      let chan = jsm.NetUtil.newChannel({
        uri: jsm.NetUtil.newURI(contactsFile),
        loadUsingSystemPrincipal: true});

      let stream = chan.open2();
      // Obtain a converter to read from a UTF-8 encoded input stream.
      let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                      .createInstance(Ci.nsIScriptableUnicodeConverter);
      converter.charset = "UTF-8";
      let rawstr = converter.ConvertToUnicode(jsm.NetUtil.readInputStreamToString(
                                              stream,
                                              stream.available()) || "");
      stream.close();
      let contacts;
      try {
        contacts = JSON.parse(rawstr);
      } catch(e) {
        if (DEBUG) debug("Error parsing " + contactsFile.path + " : " + e);
        return;
      }

      let idService = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator);
      objectStore = aTransaction.objectStore(STORE_NAME);

      for (let i = 0; i < contacts.length; i++) {
        let contact = {};
        contact.properties = contacts[i];
        contact.id = idService.generateUUID().toString().replace(/[{}-]/g, "");
        contact = this.makeImport(contact);
        this.updateRecordMetadata(contact);
        if (DEBUG) debug("import: " + JSON.stringify(contact));
        objectStore.put(contact);
      }
    }.bind(this);

    function createFinalSchema() {
      if (DEBUG) debug("creating final schema");
      let objectStore = aDb.createObjectStore(STORE_NAME, {keyPath: "id"});
      objectStore.createIndex("familyName", "properties.familyName", { multiEntry: true });
      objectStore.createIndex("givenName",  "properties.givenName",  { multiEntry: true });
      objectStore.createIndex("name",      "properties.name",        { multiEntry: true });
      objectStore.createIndex("familyNameLowerCase", "search.familyName", { multiEntry: true });
      objectStore.createIndex("givenNameLowerCase",  "search.givenName",  { multiEntry: true });
      objectStore.createIndex("nameLowerCase",       "search.name",       { multiEntry: true });
      objectStore.createIndex("telLowerCase",        "search.tel",        { multiEntry: true });
      objectStore.createIndex("emailLowerCase",      "search.email",      { multiEntry: true });
      objectStore.createIndex("tel", "search.exactTel", { multiEntry: true });
      objectStore.createIndex("category", "properties.category", { multiEntry: true });
      objectStore.createIndex("email", "search.email", { multiEntry: true });
      objectStore.createIndex("telMatch", "search.parsedTel", {multiEntry: true});
      objectStore.createIndex("phoneticFamilyName", "properties.phoneticFamilyName", { multiEntry: true });
      objectStore.createIndex("phoneticGivenName", "properties.phoneticGivenName", { multiEntry: true });
      objectStore.createIndex("phoneticFamilyNameLowerCase", "search.phoneticFamilyName", { multiEntry: true });
      objectStore.createIndex("phoneticGivenNameLowerCase",  "search.phoneticGivenName",  { multiEntry: true });
      objectStore.createIndex("speedDial", "properties.speedDial", { unique: true });
      objectStore.createIndex("telFuzzy",  "search.telFuzzy",  { multiEntry: true });
      objectStore.createIndex("group",  "properties.group",  { multiEntry: true });
      aDb.createObjectStore(SAVED_GETALL_STORE_NAME);
      aDb.createObjectStore(SPEED_DIALS_STORE_NAME, {keyPath: "speedDial"});
      aDb.createObjectStore(REVISION_STORE).put(0, REVISION_KEY);
      let groupObjectStore = aDb.createObjectStore(GROUP_STORE_NAME, { keyPath: "id" });
      groupObjectStore.createIndex("name", "properties.name", { unique: true });
      groupObjectStore.createIndex("nameLowerCase", "search.name", { unique: true });
    }

    let valueUpgradeSteps = [];

    function scheduleValueUpgrade(upgradeFunc) {
      var length = valueUpgradeSteps.push(upgradeFunc);
      if (DEBUG) debug("Scheduled a value upgrade function, index " + (length - 1));
    }

    // We always output this debug line because it's useful and the noise ratio
    // very low.
    debug("upgrade schema from: " + aOldVersion + " to " + aNewVersion + " called!");
    let db = aDb;
    let objectStore;

    if (aOldVersion === 0 && this.useFastUpgrade) {
      createFinalSchema();
      loadInitialContacts();
      return;
    }

    let steps = [
      function upgrade0to1() {
        /**
         * Create the initial database schema.
         *
         * The schema of records stored is as follows:
         *
         * {id:            "...",       // UUID
         *  published:     Date(...),   // First published date.
         *  updated:       Date(...),   // Last updated date.
         *  properties:    {...}        // Object holding the ContactProperties
         * }
         */
        if (DEBUG) debug("create schema");
        objectStore = db.createObjectStore(STORE_NAME, {keyPath: "id"});

        // Properties indexes
        objectStore.createIndex("familyName", "properties.familyName", { multiEntry: true });
        objectStore.createIndex("givenName",  "properties.givenName",  { multiEntry: true });

        objectStore.createIndex("familyNameLowerCase", "search.familyName", { multiEntry: true });
        objectStore.createIndex("givenNameLowerCase",  "search.givenName",  { multiEntry: true });
        objectStore.createIndex("telLowerCase",        "search.tel",        { multiEntry: true });
        objectStore.createIndex("emailLowerCase",      "search.email",      { multiEntry: true });
        next();
      },
      function upgrade1to2() {
        if (DEBUG) debug("upgrade 1");

        // Create a new scheme for the tel field. We move from an array of tel-numbers to an array of
        // ContactTelephone.
        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }
        // Delete old tel index.
        if (objectStore.indexNames.contains("tel")) {
          objectStore.deleteIndex("tel");
        }

        // Upgrade existing tel field in the DB.
        objectStore.openCursor().onsuccess = function(event) {
          let cursor = event.target.result;
          if (cursor) {
            if (DEBUG) debug("upgrade tel1: " + JSON.stringify(cursor.value));
            for (let number in cursor.value.properties.tel) {
              cursor.value.properties.tel[number] = {number: number};
            }
            cursor.update(cursor.value);
            if (DEBUG) debug("upgrade tel2: " + JSON.stringify(cursor.value));
            cursor.continue();
          } else {
            next();
          }
        };

        // Create new searchable indexes.
        objectStore.createIndex("tel", "search.tel", { multiEntry: true });
        objectStore.createIndex("category", "properties.category", { multiEntry: true });
      },
      function upgrade2to3() {
        if (DEBUG) debug("upgrade 2");
        // Create a new scheme for the email field. We move from an array of emailaddresses to an array of
        // ContactEmail.
        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }

        // Delete old email index.
        if (objectStore.indexNames.contains("email")) {
          objectStore.deleteIndex("email");
        }

        // Upgrade existing email field in the DB.
        objectStore.openCursor().onsuccess = function(event) {
          let cursor = event.target.result;
          if (cursor) {
            if (cursor.value.properties.email) {
              if (DEBUG) debug("upgrade email1: " + JSON.stringify(cursor.value));
              cursor.value.properties.email =
                cursor.value.properties.email.map(function(address) { return { address: address }; });
              cursor.update(cursor.value);
              if (DEBUG) debug("upgrade email2: " + JSON.stringify(cursor.value));
            }
            cursor.continue();
          } else {
            next();
          }
        };

        // Create new searchable indexes.
        objectStore.createIndex("email", "search.email", { multiEntry: true });
      },
      function upgrade3to4() {
        if (DEBUG) debug("upgrade 3");

        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }

        // Upgrade existing impp field in the DB.
        objectStore.openCursor().onsuccess = function(event) {
          let cursor = event.target.result;
          if (cursor) {
            if (cursor.value.properties.impp) {
              if (DEBUG) debug("upgrade impp1: " + JSON.stringify(cursor.value));
              cursor.value.properties.impp =
                cursor.value.properties.impp.map(function(value) { return { value: value }; });
              cursor.update(cursor.value);
              if (DEBUG) debug("upgrade impp2: " + JSON.stringify(cursor.value));
            }
            cursor.continue();
          }
        };
        // Upgrade existing url field in the DB.
        objectStore.openCursor().onsuccess = function(event) {
          let cursor = event.target.result;
          if (cursor) {
            if (cursor.value.properties.url) {
              if (DEBUG) debug("upgrade url1: " + JSON.stringify(cursor.value));
              cursor.value.properties.url =
                cursor.value.properties.url.map(function(value) { return { value: value }; });
              cursor.update(cursor.value);
              if (DEBUG) debug("upgrade impp2: " + JSON.stringify(cursor.value));
            }
            cursor.continue();
          } else {
            next();
          }
        };
      },
      function upgrade4to5() {
        if (DEBUG) debug("Add international phone numbers upgrade");
        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }

        objectStore.openCursor().onsuccess = function(event) {
          let cursor = event.target.result;
          if (cursor) {
            if (cursor.value.properties.tel) {
              if (DEBUG) debug("upgrade : " + JSON.stringify(cursor.value));
              cursor.value.properties.tel.forEach(
                function(duple) {
                  let parsedNumber = PhoneNumberUtils.parse(duple.value.toString());
                  if (parsedNumber) {
                    if (DEBUG) {
                      debug("InternationalFormat: " + parsedNumber.internationalFormat);
                      debug("InternationalNumber: " + parsedNumber.internationalNumber);
                      debug("NationalNumber: " + parsedNumber.nationalNumber);
                      debug("NationalFormat: " + parsedNumber.nationalFormat);
                    }
                    if (duple.value.toString() !== parsedNumber.internationalNumber) {
                      cursor.value.search.tel.push(parsedNumber.internationalNumber);
                    }
                  } else {
                    dump("Warning: No international number found for " + duple.value + "\n");
                  }
                }
              );
              cursor.update(cursor.value);
            }
            if (DEBUG) debug("upgrade2 : " + JSON.stringify(cursor.value));
            cursor.continue();
          } else {
            next();
          }
        };
      },
      function upgrade5to6() {
        if (DEBUG) debug("Add index for equals tel searches");
        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }

        // Delete old tel index (not on the right field).
        if (objectStore.indexNames.contains("tel")) {
          objectStore.deleteIndex("tel");
        }

        // Create new index for "equals" searches
        objectStore.createIndex("tel", "search.exactTel", { multiEntry: true });

        objectStore.openCursor().onsuccess = function(event) {
          let cursor = event.target.result;
          if (cursor) {
            if (cursor.value.properties.tel) {
              if (DEBUG) debug("upgrade : " + JSON.stringify(cursor.value));
              cursor.value.properties.tel.forEach(
                function(duple) {
                  let number = duple.value.toString();
                  let parsedNumber = PhoneNumberUtils.parse(number);

                  cursor.value.search.exactTel = [number];
                  if (parsedNumber &&
                      parsedNumber.internationalNumber &&
                      number !== parsedNumber.internationalNumber) {
                    cursor.value.search.exactTel.push(parsedNumber.internationalNumber);
                  }
                }
              );
              cursor.update(cursor.value);
            }
            if (DEBUG) debug("upgrade : " + JSON.stringify(cursor.value));
            cursor.continue();
          } else {
            next();
          }
        };
      },
      function upgrade6to7() {
        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }
        let names = objectStore.indexNames;
        let whiteList = ["tel", "familyName", "givenName",  "familyNameLowerCase",
                         "givenNameLowerCase", "telLowerCase", "category", "email",
                         "emailLowerCase"];
        for (var i = 0; i < names.length; i++) {
          if (whiteList.indexOf(names[i]) < 0) {
            objectStore.deleteIndex(names[i]);
          }
        }
        next();
      },
      function upgrade7to8() {
        if (DEBUG) debug("Adding object store for cached searches");
        db.createObjectStore(SAVED_GETALL_STORE_NAME);
        next();
      },
      function upgrade8to9() {
        if (DEBUG) debug("Make exactTel only contain the value entered by the user");
        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }

        objectStore.openCursor().onsuccess = function(event) {
          let cursor = event.target.result;
          if (cursor) {
            if (cursor.value.properties.tel) {
              cursor.value.search.exactTel = [];
              cursor.value.properties.tel.forEach(
                function(tel) {
                  let normalized = PhoneNumberUtils.normalize(tel.value.toString());
                  cursor.value.search.exactTel.push(normalized);
                }
              );
              cursor.update(cursor.value);
            }
            cursor.continue();
          } else {
            next();
          }
        };
      },
      function upgrade9to10() {
        // no-op, see https://bugzilla.mozilla.org/show_bug.cgi?id=883770#c16
        next();
      },
      function upgrade10to11() {
        if (DEBUG) debug("Adding object store for database revision");
        db.createObjectStore(REVISION_STORE).put(0, REVISION_KEY);
        next();
      },
      function upgrade11to12() {
        if (DEBUG) debug("Add a telMatch index with national and international numbers");
        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }
        if (!objectStore.indexNames.contains("telMatch")) {
          objectStore.createIndex("telMatch", "search.parsedTel", {multiEntry: true});
        }
        objectStore.openCursor().onsuccess = function(event) {
          let cursor = event.target.result;
          if (cursor) {
            if (cursor.value.properties.tel) {
              cursor.value.search.parsedTel = [];
              cursor.value.properties.tel.forEach(
                function(tel) {
                  let parsed = PhoneNumberUtils.parse(tel.value.toString());
                  if (parsed) {
                    cursor.value.search.parsedTel.push(parsed.nationalNumber);
                    cursor.value.search.parsedTel.push(PhoneNumberUtils.normalize(parsed.nationalFormat));
                    cursor.value.search.parsedTel.push(parsed.internationalNumber);
                    cursor.value.search.parsedTel.push(PhoneNumberUtils.normalize(parsed.internationalFormat));
                  }
                  cursor.value.search.parsedTel.push(PhoneNumberUtils.normalize(tel.value.toString()));
                }
              );
              cursor.update(cursor.value);
            }
            cursor.continue();
          } else {
            next();
          }
        };
      },
      function upgrade12to13() {
        if (DEBUG) debug("Add phone substring to the search index if appropriate for country");
        if (this.substringMatching) {
          scheduleValueUpgrade(function upgradeValue12to13(value) {
            if (value.properties.tel) {
              value.search.parsedTel = value.search.parsedTel || [];
              value.properties.tel.forEach(
                function(tel) {
                  let normalized = PhoneNumberUtils.normalize(tel.value.toString());
                  if (normalized) {
                    if (this.substringMatching && normalized.length > this.substringMatching) {
                      let sub = normalized.slice(-this.substringMatching);
                      if (value.search.parsedTel.indexOf(sub) === -1) {
                        if (DEBUG) debug("Adding substring index: " + tel + ", " + sub);
                        value.search.parsedTel.push(sub);
                      }
                    }
                  }
                }.bind(this)
              );
              return true;
            } else {
              return false;
            }
          }.bind(this));
        }
        next();
      },
      function upgrade13to14() {
        if (DEBUG) debug("Cleaning up empty substring entries in telMatch index");
        scheduleValueUpgrade(function upgradeValue13to14(value) {
          function removeEmptyStrings(value) {
            if (value) {
              const oldLength = value.length;
              for (let i = 0; i < value.length; ++i) {
                if (!value[i] || value[i] == "null") {
                  value.splice(i, 1);
                }
              }
              return oldLength !== value.length;
            }
          }

          let modified = removeEmptyStrings(value.search.parsedTel);
          let modified2 = removeEmptyStrings(value.search.tel);
          return (modified || modified2);
        });

        next();
      },
      function upgrade14to15() {
        if (DEBUG) debug("Fix array properties saved as scalars");
        const ARRAY_PROPERTIES = ["photo", "adr", "email", "url", "impp", "tel",
                                 "name", "honorificPrefix", "givenName",
                                 "additionalName", "familyName", "honorificSuffix",
                                 "nickname", "category", "org", "jobTitle",
                                 "note", "key"];
        const PROPERTIES_WITH_TYPE = ["adr", "email", "url", "impp", "tel"];

        scheduleValueUpgrade(function upgradeValue14to15(value) {
          let changed = false;

          let props = value.properties;
          for (let prop of ARRAY_PROPERTIES) {
            if (props[prop]) {
              if (!Array.isArray(props[prop])) {
                value.properties[prop] = [props[prop]];
                changed = true;
              }
              if (PROPERTIES_WITH_TYPE.indexOf(prop) !== -1) {
                let subprop = value.properties[prop];
                for (let i = 0; i < subprop.length; ++i) {
                  if (!Array.isArray(subprop[i].type)) {
                    value.properties[prop][i].type = [subprop[i].type];
                    changed = true;
                  }
                }
              }
            }
          }

          return changed;
        });

        next();
      },
      function upgrade15to16() {
        if (DEBUG) debug("Fix Date properties");
        const DATE_PROPERTIES = ["bday", "anniversary"];

        scheduleValueUpgrade(function upgradeValue15to16(value) {
          let changed = false;
          let props = value.properties;
          for (let prop of DATE_PROPERTIES) {
            if (props[prop] && !(props[prop] instanceof Date)) {
              value.properties[prop] = new Date(props[prop]);
              changed = true;
            }
          }

          return changed;
        });

        next();
      },
      function upgrade16to17() {
        if (DEBUG) debug("Fix array with null values");
        const ARRAY_PROPERTIES = ["photo", "adr", "email", "url", "impp", "tel",
                                 "name", "honorificPrefix", "givenName",
                                 "additionalName", "familyName", "honorificSuffix",
                                 "nickname", "category", "org", "jobTitle",
                                 "note", "key"];

        const PROPERTIES_WITH_TYPE = ["adr", "email", "url", "impp", "tel"];

        const DATE_PROPERTIES = ["bday", "anniversary"];

        scheduleValueUpgrade(function upgradeValue16to17(value) {
          let changed;

          function filterInvalidValues(val) {
            let shouldKeep = val != null; // null or undefined
            if (!shouldKeep) {
              changed = true;
            }
            return shouldKeep;
          }

          function filteredArray(array) {
            return array.filter(filterInvalidValues);
          }

          let props = value.properties;

          for (let prop of ARRAY_PROPERTIES) {

            // properties that were empty strings weren't converted to arrays
            // in upgrade14to15
            if (props[prop] != null && !Array.isArray(props[prop])) {
              props[prop] = [props[prop]];
              changed = true;
            }

            if (props[prop] && props[prop].length) {
              props[prop] = filteredArray(props[prop]);

              if (PROPERTIES_WITH_TYPE.indexOf(prop) !== -1) {
                let subprop = props[prop];

                for (let i = 0; i < subprop.length; ++i) {
                  let curSubprop = subprop[i];
                  // upgrade14to15 transformed type props into an array
                  // without checking invalid values
                  if (curSubprop.type) {
                    curSubprop.type = filteredArray(curSubprop.type);
                  }
                }
              }
            }
          }

          for (let prop of DATE_PROPERTIES) {
            if (props[prop] != null && !(props[prop] instanceof Date)) {
              // props[prop] is probably '' and wasn't converted
              // in upgrade15to16
              props[prop] = null;
              changed = true;
            }
          }

          if (changed) {
            value.properties = props;
            return true;
          } else {
            return false;
          }
        });

        next();
      },
      function upgrade17to18() {
        // this upgrade function has been moved to the next upgrade path because
        // a previous version of it had a bug
        next();
      },
      function upgrade18to19() {
        if (DEBUG) {
          debug("Adding the name index");
        }

        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }

        // an earlier version of this code could have run, so checking whether
        // the index exists
        if (!objectStore.indexNames.contains("name")) {
          objectStore.createIndex("name", "properties.name", { multiEntry: true });
          objectStore.createIndex("nameLowerCase", "search.name", { multiEntry: true });
        }

        scheduleValueUpgrade(function upgradeValue18to19(value) {
          value.search.name = [];
          if (value.properties.name) {
            value.properties.name.forEach(function addNameIndex(name) {
              var lowerName = name.toLowerCase();
              // an earlier version of this code could have added it already
              if (value.search.name.indexOf(lowerName) === -1) {
                value.search.name.push(lowerName);
              }
            });
          }
          return true;
        });

        next();
      },
      function upgrade19to20() {
        if (DEBUG) debug("upgrade19to20 create schema(phonetic)");
        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }
        objectStore.createIndex("phoneticFamilyName", "properties.phoneticFamilyName", { multiEntry: true });
        objectStore.createIndex("phoneticGivenName", "properties.phoneticGivenName", { multiEntry: true });
        objectStore.createIndex("phoneticFamilyNameLowerCase", "search.phoneticFamilyName", { multiEntry: true });
        objectStore.createIndex("phoneticGivenNameLowerCase",  "search.phoneticGivenName",  { multiEntry: true });
        next();
      },
      function upgrade20to21() {
        if (DEBUG) debug("Adding object store for speed dials");
        db.createObjectStore(SPEED_DIALS_STORE_NAME, { keyPath: "speedDial" });
        next();
      },
      function upgrade21to22() {
        if (DEBUG) debug("Adding default category");
        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }
        objectStore.openCursor().onsuccess = function(event) {
          let cursor = event.target.result;
          if (cursor) {
            if (cursor.value.properties.category) {
              let changed = false;
              let category = cursor.value.properties.category;
              if (category.indexOf(CATEGORY_KAICONTACT) < 0) {
                category.push(CATEGORY_KAICONTACT);
                changed = true;
              }
              if (category.indexOf(CATEGORY_DEVICE) < 0 &&
                  category.indexOf(CATEGORY_SIM) < 0) {
                category.push(CATEGORY_DEVICE);
                changed = true;
              }
              if (changed) {
                cursor.update(cursor.value);
              }
            } else {
              cursor.value.properties.category = CATEGORY_DEFAULT;
              cursor.update(cursor.value);
            }
            cursor.continue();
          } else {
            next();
          }
        };
      },
      function upgrade22to23() {
        if (DEBUG) debug("Adding the telFuzzy index");
        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }
        objectStore.createIndex("telFuzzy",  "search.telFuzzy",  { multiEntry: true });

        scheduleValueUpgrade(function upgradeValue22to23(value) {
          value.search.telFuzzy = value.search.telFuzzy || [];
          if (value.properties.tel) {
            value.properties.tel.forEach(function addTelFuzzyIndex(tel) {
              let number = tel.value && tel.value.toString();
              if (number) {
                let reversedNum = number.split("").reverse().join("");
                if (value.search.telFuzzy.indexOf(reversedNum) === -1) {
                  value.search.telFuzzy.push(reversedNum);
                }
              }
            });
          }
          return true;
        });

        next();
      },
      function upgrade23to24() {
        if (DEBUG) debug("Adding the group index and create a new ObjectStore for group.");
        if (!objectStore) {
          objectStore = aTransaction.objectStore(STORE_NAME);
        }
        if (DEBUG) debug("add properties.group to group");
        objectStore.createIndex("group", "properties.group", { multiEntry: true });

        if (DEBUG) debug('Adding group store');
        let groupObjectStore = db.createObjectStore(GROUP_STORE_NAME, { keyPath: "id" });
        if (DEBUG) debug('Adding name');
        groupObjectStore.createIndex("name", "properties.name", { unique: true });
        if (DEBUG) debug('Adding nameLowerCase');
        groupObjectStore.createIndex("nameLowerCase", "search.name", { unique: true });

        next();
      },
    ];

    let index = aOldVersion;
    let outer = this;

    /* This function runs all upgrade functions that are in the
     * valueUpgradeSteps array. These functions have the following properties:
     * - they must be synchronous
     * - they must take the value as parameter and modify it directly. They
     *   must not create a new object.
     * - they must return a boolean true/false; true if the value was actually
     *   changed
     */
    function runValueUpgradeSteps(done) {
      if (DEBUG) debug("Running the value upgrade functions.");
      if (!objectStore) {
        objectStore = aTransaction.objectStore(STORE_NAME);
      }
      objectStore.openCursor().onsuccess = function(event) {
        let cursor = event.target.result;
        if (cursor) {
          let changed = false;
          let oldValue;
          let value = cursor.value;
          if (DEBUG) {
            oldValue = JSON.stringify(value);
          }
          valueUpgradeSteps.forEach(function(upgradeFunc, i) {
            if (DEBUG) debug("Running upgrade function " + i);
            changed = upgradeFunc(value) || changed;
          });

          if (changed) {
            cursor.update(value);
          } else if (DEBUG) {
            let newValue = JSON.stringify(value);
            if (newValue !== oldValue) {
              // oops something went wrong
              debug("upgrade: `changed` was false and still the value changed! Aborting.");
              aTransaction.abort();
              return;
            }
          }
          cursor.continue();
        } else {
          done();
        }
      };
    }

    function finish() {
      // We always output this debug line because it's useful and the noise ratio
      // very low.
      debug("Upgrade finished");

      outer.incrementRevision(aTransaction);
    }

    function next() {
      if (index == aNewVersion) {
        runValueUpgradeSteps(finish);
        return;
      }

      try {
        var i = index++;
        if (DEBUG) debug("Upgrade step: " + i + "\n");
        steps[i].call(outer);
      } catch(ex) {
        dump("Caught exception" + ex);
        aTransaction.abort();
        return;
      }
    }

    function fail(why) {
      why = why || "";
      if (this.error) {
        why += " (root cause: " + this.error.name + ")";
      }

      debug("Contacts DB upgrade error: " + why);
      aTransaction.abort();
    }

    if (aNewVersion > steps.length) {
      fail("No migration steps for the new version!");
    }

    this.cpuLock = Cc["@mozilla.org/power/powermanagerservice;1"]
                     .getService(Ci.nsIPowerManagerService)
                     .newWakeLock("cpu");

    function unlockCPU() {
      if (outer.cpuLock) {
        if (DEBUG) debug("unlocking cpu wakelock");
        outer.cpuLock.unlock();
        outer.cpuLock = null;
      }
    }

    aTransaction.addEventListener("complete", unlockCPU);
    aTransaction.addEventListener("abort", unlockCPU);

    next();
  },

  makeImport: function makeImport(aContact) {
    let contact = {properties: {}};

    contact.search = {
      name:            [],
      givenName:       [],
      familyName:      [],
      email:           [],
      category:        [],
      tel:             [],
      exactTel:        [],
      parsedTel:       [],
      telFuzzy:        [],
      phoneticFamilyName:   [],
      phoneticGivenName:    [],
    };

    for (let field in aContact.properties) {
      contact.properties[field] = aContact.properties[field];
      // Add search fields
      if (aContact.properties[field] && contact.search[field]) {
        for (let i = 0; i <= aContact.properties[field].length; i++) {
          if (aContact.properties[field][i]) {
            if (field == "tel" && aContact.properties[field][i].value) {
              let number = aContact.properties.tel[i].value.toString();
              let normalized = PhoneNumberUtils.normalize(number);
              // We use an object here to avoid duplicates
              let containsSearch = {};
              let matchSearch = {};

              if (normalized) {
                // exactTel holds normalized version of entered phone number.
                // normalized: +1 (949) 123 - 4567 -> +19491234567
                contact.search.exactTel.push(normalized);
                // matchSearch holds normalized version of entered phone number,
                // nationalNumber, nationalFormat, internationalNumber, internationalFormat
                matchSearch[normalized] = 1;
                let parsedNumber = PhoneNumberUtils.parse(number);
                if (parsedNumber) {
                  if (DEBUG) {
                    debug("InternationalFormat: " + parsedNumber.internationalFormat);
                    debug("InternationalNumber: " + parsedNumber.internationalNumber);
                    debug("NationalNumber: " + parsedNumber.nationalNumber);
                    debug("NationalFormat: " + parsedNumber.nationalFormat);
                    debug("NationalMatchingFormat: " + parsedNumber.nationalMatchingFormat);
                  }
                  matchSearch[parsedNumber.nationalNumber] = 1;
                  matchSearch[parsedNumber.internationalNumber] = 1;
                  matchSearch[PhoneNumberUtils.normalize(parsedNumber.nationalFormat)] = 1;
                  matchSearch[PhoneNumberUtils.normalize(parsedNumber.internationalFormat)] = 1;
                  matchSearch[PhoneNumberUtils.normalize(parsedNumber.nationalMatchingFormat)] = 1;
                } else if (this.substringMatching && normalized.length > this.substringMatching) {
                  matchSearch[normalized.slice(-this.substringMatching)] = 1;
                }

                // containsSearch holds incremental search values for:
                // normalized number and national format
                for (let i = 0; i < normalized.length; i++) {
                  containsSearch[normalized.substring(i, normalized.length)] = 1;
                }
                if (parsedNumber && parsedNumber.nationalFormat) {
                  let number = PhoneNumberUtils.normalize(parsedNumber.nationalFormat);
                  for (let i = 0; i < number.length; i++) {
                    containsSearch[number.substring(i, number.length)] = 1;
                  }
                }
              }
              for (let num in containsSearch) {
                if (num && num != "null") {
                  contact.search.tel.push(num);
                }
              }
              for (let num in matchSearch) {
                if (num && num != "null") {
                  contact.search.parsedTel.push(num);
                }
              }
              contact.search.telFuzzy.push(number.split("").reverse().join(""));
            } else if ((field == "impp" || field == "email") && aContact.properties[field][i].value) {
              let value = aContact.properties[field][i].value;
              if (value && typeof value == "string") {
                contact.search[field].push(value.toLowerCase());
              }
            } else {
              let val = aContact.properties[field][i];
              if (typeof val == "string") {
                contact.search[field].push(val.toLowerCase());
              }
            }
          }
        }
      }
    }

    contact.updated = aContact.updated;
    contact.published = aContact.published;
    contact.id = aContact.id;

    return contact;
  },

  updateRecordMetadata: function updateRecordMetadata(record) {
    if (!record.id) {
      Cu.reportError("Contact without ID");
    }
    if (!record.published) {
      record.published = new Date();
    }
    record.updated = new Date();
  },

  removeObjectFromCache: function CDB_removeObjectFromCache(aObjectId, aCallback, aFailureCb) {
    if (DEBUG) debug("removeObjectFromCache: " + aObjectId);
    if (!aObjectId) {
      if (DEBUG) debug("No object ID passed");
      return;
    }
    this.newTxn("readwrite", this.dbStoreNames, function(txn, stores) {
      let store = txn.objectStore(SAVED_GETALL_STORE_NAME);
      store.openCursor().onsuccess = function(e) {
        let cursor = e.target.result;
        if (cursor) {
          for (let i = 0; i < cursor.value.length; ++i) {
            if (cursor.value[i] == aObjectId) {
              if (DEBUG) debug("id matches cache");
              cursor.value.splice(i, 1);
              cursor.update(cursor.value);
              break;
            }
          }
          cursor.continue();
        } else {
          aCallback(txn);
        }
      }.bind(this);
    }.bind(this), null, aFailureCb);
  },

  incrementRevision: function CDB_incrementRevision(txn) {
    let revStore = txn.objectStore(REVISION_STORE);
    revStore.get(REVISION_KEY).onsuccess = function(e) {
      revStore.put(parseInt(e.target.result, 10) + 1, REVISION_KEY);
    };
  },

  saveContact: function CDB_saveContact(aContact, successCb, errorCb) {
    let contact = this.makeImport(aContact);
    this.newTxn("readwrite", this.dbStoreNames, function (txn, stores) {
      if (DEBUG) debug("Going to update" + JSON.stringify(contact));
      let store = txn.objectStore(STORE_NAME);

      // Look up the existing record and compare the update timestamp.
      // If no record exists, just add the new entry.
      let newRequest = store.get(contact.id);
      newRequest.onsuccess = function (event) {
        if (!event.target.result) {
          if (DEBUG) debug("new record!");
          this.updateRecordMetadata(contact);
          store.put(contact);
        } else {
          if (DEBUG) debug("old record!");
          if (new Date(typeof contact.updated === "undefined" ? 0 : contact.updated) < new Date(event.target.result.updated)) {
            if (DEBUG) debug("rev check fail!");
            txn.abort();
            return;
          } else {
            if (DEBUG) debug("rev check OK");
            contact.published = event.target.result.published;
            contact.updated = new Date();
            store.put(contact);
          }
        }

        // Return the upated record.
        txn.result = contact;

        // Invalidate the entire cache. It will be incrementally regenerated on demand
        // See getCacheForQuery
        let getAllStore = txn.objectStore(SAVED_GETALL_STORE_NAME);
        getAllStore.clear().onerror = errorCb;
      }.bind(this);

      this.incrementRevision(txn);
    }.bind(this), successCb, errorCb);
  },

  removeContact: function removeContact(aId, aSuccessCb, aErrorCb) {
    if (DEBUG) debug("removeContact: " + aId);
    this.removeObjectFromCache(aId, function(txn) {
      let store = txn.objectStore(STORE_NAME);
      store.delete(aId).onsuccess = function() {
        aSuccessCb();
      };
      this.incrementRevision(txn);
    }.bind(this), aErrorCb);
  },

  clear: function clear(aSuccessCb, aErrorCb) {
    this.newTxn("readwrite", this.dbStoreNames, function (txn, stores) {
      if (DEBUG) debug("Going to clear all!");
      let getAllStore = txn.objectStore(SAVED_GETALL_STORE_NAME);
      getAllStore.clear();
      let store = txn.objectStore(STORE_NAME);
      store.clear();
      let groupStore = txn.objectStore(GROUP_STORE_NAME);
      groupStore.clear();
      this.incrementRevision(txn);
    }.bind(this), aSuccessCb, aErrorCb);
  },

  createCacheForQuery: function CDB_createCacheForQuery(aQuery, aSuccessCb, aFailureCb) {
    this.find(function (aContacts) {
      if (aContacts) {
        let contactsArray = [];
        for (let i in aContacts) {
          contactsArray.push(aContacts[i]);
        }

        let contactIdsArray = contactsArray.map(el => el.id);

        // save contact ids in cache
        this.newTxn("readwrite", SAVED_GETALL_STORE_NAME, function(txn, store) {
          store.put(contactIdsArray, aQuery);
        }, null, aFailureCb);

        // send full contacts
        aSuccessCb(contactsArray, true);
      } else {
        aSuccessCb([], true);
      }
    }.bind(this),
    function (aErrorMsg) { aFailureCb(aErrorMsg); },
    JSON.parse(aQuery));
  },

  getCacheForQuery: function CDB_getCacheForQuery(aQuery, aSuccessCb, aFailureCb) {
    if (DEBUG) debug("getCacheForQuery");
    // Here we try to get the cached results for query `aQuery'. If they don't
    // exist, it means the cache was invalidated and needs to be recreated, so
    // we do that. Otherwise, we just return the existing cache.
    this.newTxn("readonly", SAVED_GETALL_STORE_NAME, function(txn, store) {
      let req = store.get(aQuery);
      req.onsuccess = function(e) {
        if (e.target.result) {
          if (DEBUG) debug("cache exists");
          aSuccessCb(e.target.result, false);
        } else {
          if (DEBUG) debug("creating cache for query " + aQuery);
          this.createCacheForQuery(aQuery, aSuccessCb);
        }
      }.bind(this);
      req.onerror = function(e) {
        aFailureCb(e.target.errorMessage);
      };
    }.bind(this), null, aFailureCb);
  },

  sendNow: function CDB_sendNow(aCursorId) {
    if (aCursorId in this._dispatcher) {
      this._dispatcher[aCursorId].sendNow();
    }
  },

  clearDispatcher: function CDB_clearDispatcher(aCursorId) {
    if (DEBUG) debug("clearDispatcher: " + aCursorId);
    if (aCursorId in this._dispatcher) {
      delete this._dispatcher[aCursorId];
    }
  },

  getAll: function CDB_getAll(aSuccessCb, aFailureCb, aOptions, aCursorId) {
    if (DEBUG) debug("getAll");
    let optionStr = JSON.stringify(aOptions);
    this.getCacheForQuery(optionStr, function(aCachedResults, aFullContacts) {
      // aFullContacts is true if the cache didn't exist and had to be created.
      // In that case, we receive the full contacts since we already have them
      // in memory to create the cache. This allows us to avoid accessing the
      // object store again.
      if (aCachedResults && aCachedResults.length > 0) {
        let newTxnFn = this.newTxn.bind(this);
        let clearDispatcherFn = this.clearDispatcher.bind(this, aCursorId);
        this._dispatcher[aCursorId] = new ContactDispatcher(aCachedResults, aFullContacts,
                                                            aSuccessCb, newTxnFn,
                                                            clearDispatcherFn, aFailureCb);
        this._dispatcher[aCursorId].sendNow();
      } else { // no contacts
        if (DEBUG) debug("query returned no contacts");
        aSuccessCb(null);
      }
    }.bind(this), aFailureCb);
  },

  getRevision: function CDB_getRevision(aSuccessCb, aErrorCb) {
    if (DEBUG) debug("getRevision");
    this.newTxn("readonly", REVISION_STORE, function (txn, store) {
      store.get(REVISION_KEY).onsuccess = function (e) {
        aSuccessCb(e.target.result);
      };
    },null, aErrorCb);
  },

  getCount: function CDB_getCount(aSuccessCb, aErrorCb) {
    if (DEBUG) debug("getCount");
    this.newTxn("readonly", STORE_NAME, function (txn, store) {
      store.count().onsuccess = function (e) {
        aSuccessCb(e.target.result);
      };
    }, null, aErrorCb);
  },

  getSortByParam: function CDB_getSortByParam(aFindOptions) {
    switch (aFindOptions.sortBy) {
      case "familyName":
        return [ "familyName", "givenName" ];
      case "givenName":
        return [ "givenName" , "familyName" ];
      case "phoneticFamilyName":
        return [ "phoneticFamilyName" , "phoneticGivenName" ];
      case "phoneticGivenName":
        return [ "phoneticGivenName" , "phoneticFamilyName" ];
      default:
        return [ "givenName" , "familyName" ];
    }
  },

  /*
   * Sorting the contacts by sortBy field. aSortBy can either be familyName or givenName.
   * If 2 entries have the same sortyBy field or no sortBy field is present, we continue
   * sorting with the other sortyBy field.
   */
  sortResults: function CDB_sortResults(aResults, aFindOptions) {
    if (!aFindOptions)
      return;
    if (DEBUG) {
      debug('sortResults : ' + JSON.stringify(aResults));
    }

    if (aFindOptions.sortBy != "undefined") {
      const sortOrder = aFindOptions.sortOrder;
      const sortBy = this.getSortByParam(aFindOptions);
      const lang = this.lang;
      const sortLanguage = aFindOptions.sortLanguage;

      aResults.sort(function (a, b) {
        let x, y;
        let result = 0;
        let xIndex = 0;
        let yIndex = 0;

        do {
          while (xIndex < sortBy.length && !x) {
            x = a.properties[sortBy[xIndex]];
            if (x) {
              x = x.join("").toLowerCase();
            }
            xIndex++;
          }
          while (yIndex < sortBy.length && !y) {
            y = b.properties[sortBy[yIndex]];
            if (y) {
              y = y.join("").toLowerCase();
            }
            yIndex++;
          }
          if (!x) {
            if (!y) {
              let px, py;
              px = JSON.stringify(a.published);
              py = JSON.stringify(b.published);
              if (px && py) {
                return localeCompare_v(px, py, lang);
              }
            } else {
              return sortOrder == 'descending' ? 1 : -1;
            }
          }
          if (!y) {
            return sortOrder == "ascending" ? 1 : -1;
          }

          result = localeCompare_v(x, y, lang);
          x = null;
          y = null;
        } while (result == 0);

        return sortOrder == "ascending" ? result : -result;
      });
    }
    if (aFindOptions.filterLimit && aFindOptions.filterLimit != 0) {
      if (DEBUG) debug("filterLimit is set: " + aFindOptions.filterLimit);
      aResults.splice(aFindOptions.filterLimit, aResults.length);
    }
  },

  /**
   * @param successCb
   *        Callback function to invoke with result array.
   * @param failureCb [optional]
   *        Callback function to invoke when there was an error.
   * @param options [optional]
   *        Object specifying search options. Possible attributes:
   *        - filterBy
   *        - filterOp
   *        - filterValue
   *        - count
   */
  find: function find(aSuccessCb, aFailureCb, aOptions) {
    if (DEBUG) debug("ContactDB:find val:" + aOptions.filterValue + " by: " + aOptions.filterBy + " op: " + aOptions.filterOp);
    let self = this;
    this.newTxn("readonly", STORE_NAME, function (txn, store) {
      let filterOps = ["equals", "contains", "match", "startsWith", "fuzzyMatch"];
      if (aOptions && (filterOps.indexOf(aOptions.filterOp) >= 0)) {
        self._findWithIndex(txn, store, aOptions);
      } else {
        self._findAll(txn, store, aOptions);
      }
    }, aSuccessCb, aFailureCb);
  },

  _findWithIndex: function _findWithIndex(txn, store, options) {
    if (DEBUG) debug("_findWithIndex: " + options.filterValue +" " + options.filterOp + " " + options.filterBy + " ");
    let fields = options.filterBy;
    for (let key in fields) {
      if (DEBUG) debug("key: " + fields[key]);
      if (!store.indexNames.contains(fields[key]) && fields[key] != "id") {
        if (DEBUG) debug("Key not valid!" + fields[key] + ", " + JSON.stringify(store.indexNames));
        txn.abort();
        return;
      }
    }

    // lookup for all keys
    if (options.filterBy.length == 0) {
      if (DEBUG) debug("search in all fields!" + JSON.stringify(store.indexNames));
      for(let myIndex = 0; myIndex < store.indexNames.length; myIndex++) {
        fields = Array.concat(fields, store.indexNames[myIndex]);
      }
    }

    // Sorting functions takes care of limit if set.
    let limit = options.sortBy === 'undefined' ? options.filterLimit : null;

    let filter_keys = fields.slice();
    for (let key = filter_keys.shift(); key; key = filter_keys.shift()) {
      let request;
      let substringResult = {};
      if (key == "id") {
        // store.get would return an object and not an array
        request = store.mozGetAll(options.filterValue);
      } else if (key == "category") {
        let index = store.index(key);
        request = index.mozGetAll(options.filterValue, limit);
      } else if (options.filterOp == "equals") {
        if (DEBUG) debug("Getting index: " + key);
        // case sensitive
        let index = store.index(key);
        let filterValue = options.filterValue;
        if (key == "tel") {
          filterValue = PhoneNumberUtils.normalize(filterValue,
                                                   /*numbersOnly*/ true);
        }
        request = index.mozGetAll(filterValue, limit);
      } else if (options.filterOp == "match") {
        if (DEBUG) debug("match");
        if (key != "tel") {
          dump("ContactDB: 'match' filterOp only works on tel\n");
          return txn.abort();
        }

        let index = store.index("telMatch");
        let normalized = PhoneNumberUtils.normalize(options.filterValue,
                                                    /*numbersOnly*/ true);

        if (!normalized.length) {
          dump("ContactDB: normalized filterValue is empty, can't perform match search.\n");
          return txn.abort();
        }

        // Some countries need special handling for number matching. Bug 877302
        if (this.substringMatching && normalized.length > this.substringMatching) {
          let substring = normalized.slice(-this.substringMatching);
          if (DEBUG) debug("Substring: " + substring);

          let substringRequest = index.mozGetAll(substring, limit);

          substringRequest.onsuccess = function (event) {
            if (DEBUG) debug("Request successful. Record count: " + event.target.result.length);
            for (let i in event.target.result) {
              substringResult[event.target.result[i].id] = event.target.result[i];
            }
          }.bind(this);
        } else if (normalized[0] !== "+") {
          // We might have an international prefix like '00'
          let parsed = PhoneNumberUtils.parse(normalized);
          if (parsed && parsed.internationalNumber &&
              parsed.nationalNumber  &&
              parsed.nationalNumber !== normalized &&
              parsed.internationalNumber !== normalized) {
            if (DEBUG) debug("Search with " + parsed.internationalNumber);
            let prefixRequest = index.mozGetAll(parsed.internationalNumber, limit);

            prefixRequest.onsuccess = function (event) {
              if (DEBUG) debug("Request successful. Record count: " + event.target.result.length);
              for (let i in event.target.result) {
                substringResult[event.target.result[i].id] = event.target.result[i];
              }
            }.bind(this);
          }
        }

        request = index.mozGetAll(normalized, limit);
      } else if (options.filterOp == 'fuzzyMatch') {
        if (DEBUG) debug("fuzzyMatch");
        if (key != "tel") {
          dump("ContactDB: 'fuzzyMatch' filterOp only works on tel\n");
          return txn.abort();
        }

        let index = store.index("telFuzzy");
        let filterValue = options.filterValue.toString();
        let substringDigits = this._getMinMatchDigits();
        if (filterValue.length >= substringDigits) {
          filterValue = filterValue.slice(-substringDigits);
          filterValue = filterValue.split("").reverse().join("");
          request = index.mozGetAll(IDBKeyRange.bound(filterValue, filterValue + "\uFFFF"), limit);
        } else {
          request = index.mozGetAll(filterValue.split("").reverse().join(""), limit);
        }
      } else {
        // XXX: "contains" should be handled separately, this is "startsWith"
        if (options.filterOp === 'contains' && key !== 'tel') {
          dump("ContactDB: 'contains' only works for 'tel'. Falling back " +
               "to 'startsWith'.\n");
        }
        // not case sensitive
        let lowerCase = options.filterValue.toString().toLowerCase();
        if (key === "tel") {
          let origLength = lowerCase.length;
          let tmp = PhoneNumberUtils.normalize(lowerCase, /*numbersOnly*/ true);
          if (tmp.length != origLength) {
            let NON_SEARCHABLE_CHARS = /[^#+\*\d\s()-]/;
            // e.g. number "123". find with "(123)" but not with "123a"
            if (tmp === "" || NON_SEARCHABLE_CHARS.test(lowerCase)) {
              if (DEBUG) debug("Call continue!");
              continue;
            }
            lowerCase = tmp;
          }
        }
        if (DEBUG) debug("lowerCase: " + lowerCase);
        let range = IDBKeyRange.bound(lowerCase, lowerCase + "\uFFFF");
        let index = store.index(key + "LowerCase");
        request = index.mozGetAll(range, limit);
      }
      if (!txn.result)
        txn.result = {};

      request.onsuccess = function (event) {
        if (DEBUG) debug("Request successful. Record count: " + event.target.result.length);
        if (Object.keys(substringResult).length > 0) {
          for (let attrname in substringResult) {
            event.target.result[attrname] = substringResult[attrname];
          }
        }
        this.sortResults(event.target.result, options);
        for (let i in event.target.result)
          txn.result[event.target.result[i].id] = exportContact(event.target.result[i]);
      }.bind(this);
    }
  },

  _findAll: function _findAll(txn, store, options) {
    if (DEBUG) debug("ContactDB:_findAll:  " + JSON.stringify(options));
    if (!txn.result)
      txn.result = {};

    // Sorting functions takes care of limit if set.
    let limit = options.sortBy === 'undefined' ? options.filterLimit : null;
    store.mozGetAll(null, limit).onsuccess = function (event) {
      if (DEBUG) debug("Request successful. Record count:" + event.target.result.length);
      this.sortResults(event.target.result, options);
      for (let i in event.target.result) {
        txn.result[event.target.result[i].id] = exportContact(event.target.result[i]);
      }
    }.bind(this);
  },

  getSpeedDials: function getSpeedDials(aSuccessCb, aFailureCb) {
    this.newTxn("readonly", SPEED_DIALS_STORE_NAME, function (txn, store) {
      if (!txn.result)
        txn.result = {};

      var req = store.mozGetAll();
      req.onsuccess = function (event) {
        let speedDials = event.target.result;
        if (DEBUG) debug("Request successful. Speed Dials :" + speedDials.length);
        speedDials.sort();
        for (let i in speedDials) {
          txn.result[speedDials[i].speedDial] = speedDials[i];
        }
      }.bind(this);
      req.onerror = function(e) {
        dump("getSpeedDials: " + e);
      }.bind(this);
    }, aSuccessCb, aFailureCb);
  },

  setSpeedDial: function setSpeedDial(aSpeedDial, aTel, aContactId, aSuccessCb, aFailureCb) {
    if (DEBUG) debug("setSpeedDial: aSpeedDial " + aSpeedDial + " aTel " + aTel + " aContactId " + aContactId);

    this.newTxn("readwrite", this.dbStoreNames, function (txn, stores) {
      if (!aSpeedDial || !aTel) {
        dump("ContactDB: speed dial or phone number are empty");
        txn.abort();
        return;
      }
      let speedDialObj = {
        speedDial: aSpeedDial,
        tel: aTel
      };

      if (aContactId) {
        let req = txn.objectStore(STORE_NAME).get(aContactId);
        req.onsuccess = function (event) {
          if (!event.target.result) {
            dump("ContactDB: contact with id " + aContactId + " does not exist!");
            txn.abort();
          }
          speedDialObj.contactId = aContactId;
          txn.objectStore(SPEED_DIALS_STORE_NAME).put(speedDialObj);
          this.incrementRevision(txn);
        }.bind(this);
      } else {
        txn.objectStore(SPEED_DIALS_STORE_NAME).put(speedDialObj);
        this.incrementRevision(txn);
      }
    }.bind(this), aSuccessCb, aFailureCb);
  },

  saveGroup: function saveGroup(aId, aName, aSuccessCb, aFailureCb) {
    if (DEBUG) debug("saveGroup: aId " + aId + " aName " + aName);
    this.newTxn("readwrite", GROUP_STORE_NAME, function (txn, store) {
      if (!aId || !aName) {
        dump("ContactDB: aId or aName is empty");
        txn.abort();
        return;
      }

      let group = {
        id: aId,
        properties: {
          name: aName
        },
        search: {
          name: aName.toLowerCase()
        }
      };

      store.put(group);
      this.incrementRevision(txn);

    }.bind(this), aSuccessCb, aFailureCb);
  },

  removeSpeedDial: function removeSpeedDial(aSpeedDial, aSuccessCb, aFailureCb) {
    if (DEBUG) debug("removeSpeedDial: aSpeedDial " + aSpeedDial);
    this.newTxn("readwrite", this.dbStoreNames, function (txn, store) {
      txn.objectStore(SPEED_DIALS_STORE_NAME).delete(aSpeedDial).onsuccess = function() {
        aSuccessCb();
      }.bind(this);

      this.incrementRevision(txn);
    }.bind(this), null, aFailureCb);
  },

  // Enable special phone number substring matching. Does not update existing DB entries.
  enableSubstringMatching: function enableSubstringMatching(aDigits) {
    if (DEBUG) debug("MCC enabling substring matching " + aDigits);
    this.substringMatching = aDigits;
  },

  disableSubstringMatching: function disableSubstringMatching() {
    if (DEBUG) debug("MCC disabling substring matching");
    delete this.substringMatching;
  },

  _getMinMatchDigits: function _getMinMatchDigits() {
    if (Services.prefs.getPrefType("dom.phonenumber.substringmatching") == Ci.nsIPrefBranch.PREF_INT) {
      return Services.prefs.getIntPref("dom.phonenumber.substringmatching");
    }

    // TODO To customize MIN_MATCH_DIGITS by MCC/MNC
    return MIN_MATCH_DIGITS;
  },

  /**
   * @param aSuccessCb
   *        Callback function to invoke with result array.
   * @param aFailureCb [optional]
   *        Callback function to invoke when there was an error.
   * @param aOptions [optional]
   *        Object specifying search options. Possible attributes:
   *        - filterBy
   *        - filterOp
   *        - filterValue
   *        - filterLimit
   */
  findGroups: function findGroups(aSuccessCb, aFailureCb, aOptions) {
    if (DEBUG) debug("ContactDB:findGroups val:" + aOptions.filterValue + " by: " + aOptions.filterBy + " op: " + aOptions.filterOp);
    this.newTxn("readonly", GROUP_STORE_NAME, function (txn, store) {
      let filterOps = ["equals", "startsWith"];
      if (aOptions && filterOps.indexOf(aOptions.filterOp) >= 0) {
        this._findGrouopsWithIndex(txn, store, aOptions);
      } else {
        this._findAllGroups(txn, store, aOptions);
      }
    }.bind(this), aSuccessCb, aFailureCb);
  },

  removeGroup: function removeGroup(aId, aSuccessCb, aFailureCb) {
    if (DEBUG) debug("removeContactGroup: aId " + aId);
    this._removeGroupFromContacts(aId, function(txn) {
      txn.objectStore(GROUP_STORE_NAME).delete(aId).onsuccess = function() {
        aSuccessCb();
      }.bind(this);
      this.incrementRevision(txn);
    }.bind(this), aFailureCb);
  },

  _removeGroupFromContacts: function CDB_removeGroupFromContacts(aGroupId, aCallback, aFailureCb) {
    if (DEBUG) debug("_removeGroupFromContacts: " + aGroupId);
    if (!aGroupId) {
      if (DEBUG) debug("No group ID passed");
      aFailure("No group ID passed");
      return;
    }

    this.newTxn("readwrite", this.dbStoreNames, function (txn, store) {
      let contactStore = txn.objectStore(STORE_NAME);
      let groupIndex = contactStore.index("group");
      let request = groupIndex.mozGetAll(aGroupId);

      request.onsuccess = function(event) {
        let contacts = event.target.result;
        contacts.forEach((contact)=> {
          if (DEBUG) debug("group contact: " + JSON.stringify(contact));
          if (DEBUG) debug("contact group: " + contact.properties.group);
          let index = contact.properties.group.indexOf(aGroupId);
          if (DEBUG) debug("contact group index: " + index);
          if (index>=0) {
            contact.properties.group.splice(index, 1);
            if (DEBUG) debug("contact group after removed: " + contact.properties.group);
            contactStore.put(contact);
          }
        });

        aCallback(txn);
      }.bind(this);

    }, null, aFailureCb);

  },

  _findGrouopsWithIndex: function _findGrouopsWithIndex(txn, store, options) {
    if (DEBUG) debug("_findGrouopsWithIndex: " + options.filterValue + " " + options.filterOp + " " + options.filterBy + " ");
    let fields = options.filterBy;
    for (let key in fields) {
      if (DEBUG) debug("key: " + fields[key]);
      if (!store.indexNames.contains(fields[key]) && fields[key] != "id") {
        if (DEBUG) debug("Key not valid!" + fields[key] + ", " + JSON.stringify(store.indexNames));
        txn.abort();
        return;
      }
    }

    let limit = options.sortBy === "undefined" ? options.filterLimit : null;
    let filter_keys = fields.slice();
    for (let key = filter_keys.shift(); key; key = filter_keys.shift()) {
      let request;
      if (key === "id") {
        request = store.mozGetAll(options.filterValue, limit);
      } else if (options.filterOp === "equals") {
        if (DEBUG) debug("Getting index: " + key);
        let index = store.index(key);
        request = index.mozGetAll(options.filterValue, limit);
      } else {
        let lowerCase = options.filterValue.toString().toLowerCase();
        if (DEBUG) debug("lowerCase: " + lowerCase);
        let range = IDBKeyRange.bound(lowerCase, lowerCase + "\uFFFF");
        let index = store.index(key + "LowerCase");
        request = index.mozGetAll(range, limit);
      }
      if (!txn.result) {
        txn.result = {};
      }

      request.onsuccess = function(event) {
        if (DEBUG) debug("Request successful. Record count: " + event.target.result.length);
        let groups = event.target.result;
        this._sortGroups(groups, options);
        for (let i in groups) {
          if (DEBUG) debug("Groups i: " + i);
          txn.result[groups[i].id] = {
            id: groups[i].id,
            name: groups[i].properties.name
          };
        }
      }.bind(this);
    }
  },

  _findAllGroups: function _findAllGroups(txn, store, options) {
    if (!txn.result) {
      txn.result = {};
    }

    let req = store.mozGetAll();
    req.onsuccess = function(event) {
      let groups = event.target.result;
      if (DEBUG) debug("Request successful. Groups size: " + groups.length + ", " + JSON.stringify(groups));
      this._sortGroups(groups, options);
      for (let i in groups) {
        if (DEBUG) debug("Groups i: " + i);
        txn.result[groups[i].id] = {
          id: groups[i].id,
          name: groups[i].properties.name
        };
      }
    }.bind(this);

    req.onerror = function (e) {
      dump("findGroups: " + e);
    }.bind(this);
  },

  _sortGroups: function _sortGroups(aGroups, aOptions) {
    if (aOptions.sortOrder) {
      let ascending = aOptions.sortOrder == 'ascending';
      aGroups.sort(function(a, b) {
        let result = a.search.name.localeCompare(b.search.name, aOptions.sortLanguage);
        return ascending ? result : -result;
      });
    }

    if (aOptions.filterLimit) {
      aGroups.splice(aOptions.filterLimit, aGroups.length);
    }
  },

  handle: function _handle(aName, aResult) {
    switch (aName) {
      case kSettingsLangKey:
      if (DEBUG) {
        debug("'" + kSettingsLangKey +
          "' is now " + JSON.stringify(aResult));
      }
      this.lang = JSON.stringify(aResult);
      break;
    }
  },

  observe: function(aSubject, aTopic, aData) {
    if (DEBUG) {
      debug('aSubject:' + JSON.stringify(aSubject));
    }
    if ("wrappedJSObject" in aSubject) {
      aSubject = aSubject.wrappedJSObject;
    }
    this.handle(aSubject.key, aSubject.value);
  },


  init: function init() {
    this.initDBHelper(DB_NAME, DB_VERSION, [STORE_NAME, SPEED_DIALS_STORE_NAME,
                                            SAVED_GETALL_STORE_NAME, REVISION_STORE,
                                            GROUP_STORE_NAME]);


    Services.obs.addObserver(this, "mozsettings-changed", false);

    let lock = gSettingsService.createLock();

    //lock.get(kSettingsLangKey, this); //oops: this call will report error when the handle callback is called

    lock.get(kSettingsLangKey, { handle: (aName, aResult) => {
      switch (aName) {
        case kSettingsLangKey:
          if (DEBUG) {
            debug("'" + kSettingsLangKey +
                  "' is now " + JSON.stringify(aResult));
          }
          this.lang = JSON.stringify(aResult);
          break;
      }}}
    );
  }
};

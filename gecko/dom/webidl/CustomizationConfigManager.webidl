/* (c) 2017 KAI OS TECHNOLOGIES (HONG KONG) LIMITED All rights reserved. This
 * file or any portion thereof may not be reproduced or used in any manner
 * whatsoever without the express written permission of KAI OS TECHNOLOGIES
 * (HONG KONG) LIMITED. KaiOS is the trademark of KAI OS TECHNOLOGIES (HONG KONG)
 * LIMITED or its affiliate company and may be registered in some jurisdictions.
 * All other trademarks are the property of their respective owners.
 */

[JSImplementation="@mozilla.org/dom/customization-api;1",
 NavigatorProperty="customization",
 AvailableIn=CertifiedApps,
 CheckAnyPermissions="customization"]
interface Customization : EventTarget {
  // Customize the device with the variant depending on the matchInfo value.
  Promise<any> applyVariant(optional object matchInfo, optional object blacklist);

  // Returns the value of the customization item.
  Promise<any> getValue(DOMString name);

  // Notify that the customization is change after calling the applyVariant.
  attribute EventHandler onchange;
};

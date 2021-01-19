#ifndef _sysprop_sprint_h
#define _sysprop_sprint_h

#define SYSPROP_MDN                                     1
#define SYSPROP_NAI                                     2
#define SYSPROP_ESN                                     3
#define SYSPROP_BROWSER_HOME_URL                        8
#define SYSPROP_BROWSER_UAPROF_URL                      14
#define SYSPROP_DEVICE_VENDOR                           20
#define SYSPROP_DEVICE_MODEL                            21
#define SYSPROP_DEVICE_SOFTWARE_VERSION                 22
#define SYSPROP_MEID                                    30
#define SYSPROP_MSID                                    35
#define SYSPROP_NAI_SLOT1_PASSWORD                      43
#define SYSPROP_PRIMARY_HOME_AGENT                      50
#define SYSPROP_SECONDARY_HOME_AGENT                    51
#define SYSPROP_DOMDATA_ROAMGUARD                       72
#define SYSPROP_PRL                                     73
#define SYSPROP_SLOT1_REVERSE_TUNNEL                    86
#define SYSPROP_SLOT1_MOBILE_IP                         87
#define SYSPROP_SLOT1_AUTH_ALGO_HA                      90
#define SYSPROP_SLOT1_SPI_HA                            91
#define SYSPROP_SLOT1_HA_PASSWORD                       92
#define SYSPROP_SLOT1_AUTH_ALGO_AAA                     93
#define SYSPROP_SLOT1_SPI_AAA                           94
#define SYSPROP_DEVDTL_DEV_TYPE                         137
#define SYSPROP_DEVDTL_FW_VER                           138
#define SYSPROP_DEVDTL_HW_VER                           139
#define SYSPROP_DEVDTL_LARGE_OBJECT                     140
#define SYSPROP_DEVINFO_MAN                             145
#define SYSPROP_DEVINFO_DM_VER                          146
#define SYSPROP_DEVINFO_LANG                            147
#define SYSPROP_BT_A2DP_FILE_EXTENSIONS                 285
#define SYSPROP_DEVID                                   289
#define SYSPROP_SELFCARE_SERVER_URL                     402
#define SYSPROP_SELFCARE_PROXY_IP                       405
#define SYSPROP_SELFCARE_PROXY_PORT                     406
#define SYSPROP_RTSP_PROXY_ADDRESS                      412
#define SYSPROP_RTSP_PROXY_PORT                         413
#define SYSPROP_SELLER_NAME                             420
#define SYSPROP_BC10                                    421
#define SYSPROP_SO68                                    423
#define SYSPROP_INTLDATA_ROAMGUARD                      424
#define SYSPROP_ENABLEDLTE                              429
#define SYSPROP_FORCELTE                                430
#define SYSPROP_EHRPD                                   431
#define SYSPROP_APN0                                    432
#define SYSPROP_APN1                                    433
#define SYSPROP_APN2                                    434
#define SYSPROP_APN3                                    435
#define SYSPROP_APN4                                    436
#define SYSPROP_APN5                                    437
#define SYSPROP_APN6                                    438
#define SYSPROP_APN7                                    439
#define SYSPROP_B26_ENABLEMENT                          467
#define SYSPROP_B41_ENABLEMENT                          469
#define SYSPROP_B25_ENABLEMENT                          471
#define SYSPROP_DOMDATA_ROAMGUARD_FORCED                476
#define SYSPROP_BARDOMDATA_ROAM                         477
#define SYSPROP_DOMDATA_ROAM_FORCED                     478
#define SYSPROP_DOMVOICE_ROAMGUARD                      479
#define SYSPROP_DOMVOICE_ROAMGUARD_FORCED               480
#define SYSPROP_BARDOMVOICE_ROAM                        481
#define SYSPROP_DOMVOICE_ROAM_FORCED                    482
#define SYSPROP_INTLDATA_ROAMGUARD_FORCED               484
#define SYSPROP_INTLDATA_ROAM                           485
#define SYSPROP_INTLDATA_ROAM_FORCED                    486
#define SYSPROP_INTLVOICE_ROAMGUARD                     488
#define SYSPROP_INTLVOICE_ROAMGUARD_FORCED              489
#define SYSPROP_BARINTLVOICE_ROAM                       490
#define SYSPROP_BARINTLVOICE_ROAM_FORCED                491
#define SYSPROP_OPERATORID                              500
#define SYSPROP_NETWORKCODE                             501
#define SYSPROP_TETHEREDDATA_ENABLED                    505
#define SYSPROP_ACCT_SUBTYPE		                    506
#define SYSPROP_ACCT_TYPE                               507
#define SYSPROP_BAN                                     508
#define SYSPROP_BILLING_DATE                            509
#define SYSPROP_CSA                                     511
#define SYSPROP_SUB_STATE                               512
#define SYSPROP_USAGE_MODE                              513
#define SYSPROP_ACCT_ZIPCODE                            514
#define SYSPROP_1XADV_ENABLE                            516
#define SYSPROP_1XADV_COP0                              517
#define SYSPROP_1XADV_COP1TO7                           518
#define SYSPROP_ICCID                                   519
#define SYSPROP_ACCOLC                                  520
#define SYSPROP_SIM_LOCK                                521
#define SYSPROP_VOWIFI_ENABLED							535
#define SYSPROP_1STCALLINTERCEPT                        549
#define SYSPROP_2NDCALLINTERCEPT                        550
#define SYSPROP_3RDCALLINTERCEPT                        551
#define SYSPROP_4THCALLINTERCEPT                        552
#define SYSPROP_5THCALLINTERCEPT                        553
#define SYSPROP_6THCALLINTERCEPT                        554
#define SYSPROP_7THCALLINTERCEPT                        555
#define SYSPROP_8THCALLINTERCEPT                        556
#define SYSPROP_9THCALLINTERCEPT                        557
#define SYSPROP_10THCALLINTERCEPT                       558
#define SYSPROP_11THCALLINTERCEPT                       559
#define SYSPROP_12THCALLINTERCEPT                       560
#define SYSPROP_1STCNTCTINFO                            561
#define SYSPROP_2NDCNTCTINFO                            562
#define SYSPROP_3RDCNTCTINFO                            563
#define SYSPROP_4THCNTCTINFO                            564
#define SYSPROP_5THCNTCTINFO                            565
#define SYSPROP_6THCNTCTINFO                            566
#define SYSPROP_1STADCINFO                              567
#define SYSPROP_2NDADCINFO                              568
#define SYSPROP_3RDADCINFO                              569
#define SYSPROP_4THADCINFO                              570
#define SYSPROP_5THADCINFO                              571
#define SYSPROP_6THADCINFO                              572
#define SYSPROP_7THADCINFO                              573
#define SYSPROP_8THADCINFO                              574
#define SYSPROP_9THADCINFO                              575
#define SYSPROP_10THADCINFO                             576
#define SYSPROP_11THADCINFO                             577
#define SYSPROP_12THADCINFO                             578
#define SYSPROP_13THADCINFO                             579
#define SYSPROP_14THADCINFO                             580
#define SYSPROP_15THADCINFO                             581
#define SYSPROP_16THADCINFO                             582
#define SYSPROP_17THADCINFO                             583
#define SYSPROP_18THADCINFO                             584
#define SYSPROP_ROAMMENUDISPLAY                         585
#define SYSPROP_ROAMHOMEONLY                            586
#define SYSPROP_DIAGMSLREQ                              587
#define SYSPROP_BRWSRSRCHENGINE                         588
#define SYSPROP_MMSSERVERURL                            589
#define SYSPROP_MMSPROXY                                590
#define SYSPROP_MYACCOUNT                               591
#define SYSPROP_CARRIERHOMEPAGE                         592
#define SYSPROP_EMAIL_SIGNATURE                         593
#define SYSPROP_CUSTOMERCARE                            594
#define SYSPROP_BOOKMARK_01                             595
#define SYSPROP_BOOKMARK_02                             596
#define SYSPROP_BOOKMARK_03                             597
#define SYSPROP_BOOKMARK_04                             598
#define SYSPROP_BOOKMARK_05                             599
#define SYSPROP_CNAP_ENABLED                            600
#define SYSPROP_BOOKMARK_06                             603
#define SYSPROP_BOOKMARK_07                             604
#define SYSPROP_BOOKMARK_08                             605
#define SYSPROP_BOOKMARK_09                             606
#define SYSPROP_BOOKMARK_10                             607
#define SYSPROP_BOOKMARK_11                             608
#define SYSPROP_BOOKMARK_12                             609
#define SYSPROP_BOOKMARK_13                             610
#define SYSPROP_BOOKMARK_14                             611
#define SYSPROP_BOOKMARK_15                             612
#define SYSPROP_BOOKMARK_16                             613
#define SYSPROP_NETGUARD_ENABLED                        616
#define SYSPROP_VENDINGMACHINE_DOMAIN                   617
#define SYSPROP_STOREFRONT_URL                          618
#define SYSPROP_MYSTUFF_MENU                            619
#define SYSPROP_PAYLOAD_CUSTOMID                        620
#define SYSPROP_CA_ENABLE                               622
#define SYSPROP_PRLID									623
#define SYSPROP_BARLTEDATA_ROAM                         624
#define SYSPROP_BARLTEDATA_ROAM_FORCED                  625
#define SYSPROP_LTEDATA_ROAMGUARD_FORCED                627
#define SYSPROP_LTEDATA_ROAM_ENABLED                    626
#define SYSPROP_BARINTL_LTEDATA_ROAM                    628
#define SYSPROP_BARINTL_LTEDATA_ROAM_FORCED             629
#define SYSPROP_INTLLTEDATA_ROAMGUARD                   630
#define SYSPROP_INTLLTEDATA_ROAMGUARD_FORCED            631
#define SYSPROP_OMADM_SERVER_ID                         632
#define SYSPROP_CONTACTCARE                             635
#define SYSPROP_SPEEDDIAL_1                             637
#define SYSPROP_ROAMMENU                                639
#define SYSPROP_GPSONE_PDEIP                            641
#define SYSPROP_GPSONE_PDEPORT                          642
#define SYSPROP_MMS_AUTORETRIEVE_ENABLED                646
#define SYSPROP_MMS_HTTPHEADER                          647
#define SYSPROP_OMADM_CICM                              649
#define SYSPROP_VOWIFI_APP_ENABLED							650
#define SYSPROP_SMSOIP_ENABLED                          651
#define SYSPROP_NEXTLTESCAN                             653
#define SYSPROP_BSRTIMER                                654
#define SYSPROP_BSRMAXTIME                              655
#define SYSPROP_NETWORK_MODE                            657
#define SYSPROP_VOWIFI_VCC_STATE						674
#define SYSPROP_VOWIFI_VDN								676
#define SYSPROP_CSIM_PROV_OBJ                           1001	//A01
#define SYSPROP_CSIM_COVERAGE_OBJ                       1002	//A02
#define SYSPROP_MMSPORT                                 1003
#define SYSPROP_EMAIL_SYNCSCHEDULE                      1004
#define SYSPROP_BOOKMARKS                               1005
#define SYSPROP_USBTETHERMENUDISPLAY                    1006
#define SYSPROP_WIFITETHERMENUDISPLAY                   1007
#define SYSPROP_WIFISSID                                1008
#define SYSPROP_BASEBANDDIAGMENUDISPLAY                 1009



#define NODE_SYSPROP_MDN "./CDMA/NAM/MobDirNum"
#define NODE_SYSPROP_NAI "./CDMA/3GPD/Profile1/NAI"
#define NODE_SYSPROP_ESN "./DevInfo/DevId"
#define NODE_SYSPROP_BROWSER_UAPROF_URL "./Customization/Browser/UAProfURL"
#define NODE_SYSPROP_DEVICE_VENDOR "./DevDetail/OEM"
#define NODE_SYSPROP_DEVICE_MODEL "./DevInfo/Mod"
#define NODE_SYSPROP_DEVICE_SOFTWARE_VERSION "./DevDetail/SwV"
#define NODE_SYSPROP_MEID "./DevInfo/DevId"
#define NODE_SYSPROP_MSID "./CDMA/NAM/CdmaNam"
#define NODE_SYSPROP_PRIMARY_HOME_AGENT "./CDMA/3GPD/Profile1/PriHAIp"
#define NODE_SYSPROP_SECONDARY_HOME_AGENT "./CDMA/3GPD/Profile1/SecHAIp"
#define NODE_SYSPROP_DOMDATA_ROAMGUARD "./SPA/DomDataGuard/Enabled"
#define NODE_SYSPROP_PRL "./CDMA/PRL/PrefRoamList"
#define NODE_SYSPROP_PRLID "./CDMA/PRL/PRLID"
#define NODE_SYSPROP_SLOT1_REVERSE_TUNNEL "./CDMA/3GPD/Profile1/ReverseTunneling"
#define NODE_SYSPROP_SLOT1_MOBILE_IP "./CDMA/3GPD/Profile1/MobileIpAddress"
#define NODE_SYSPROP_SLOT1_AUTH_ALGO_HA "./CDMA/3GPD/Profile1/AuthAlgoHA"
#define NODE_SYSPROP_SLOT1_SPI_HA "./CDMA/3GPD/Profile1/SpiHA"
#define NODE_SYSPROP_SLOT1_AUTH_ALGO_AAA "./CDMA/3GPD/Profile1/AuthAlgoAAA"
#define NODE_SYSPROP_SLOT1_SPI_AAA "./CDMA/3GPD/Profile1/SpiAAA"
#define NODE_SYSPROP_DEVDTL_DEV_TYPE "./DevDetail/DevTyp"
#define NODE_SYSPROP_DEVDTL_FW_VER "./DevDetail/FwV"
#define NODE_SYSPROP_DEVDTL_HW_VER "./DevDetail/HwV"
#define NODE_SYSPROP_DEVDTL_LARGE_OBJECT "./DevDetail/LrgObj"
#define NODE_SYSPROP_DEVINFO_MAN "./DevInfo/Man"
#define NODE_SYSPROP_DEVINFO_DM_VER "./DevInfo/DmV"
#define NODE_SYSPROP_DEVINFO_LANG "./DevInfo/Lang"
#define NODE_SYSPROP_BT_A2DP_FILE_EXTENSIONS "N/A"
#define NODE_SYSPROP_DEVID "./DevInfo/DevId"
#define NODE_SYSPROP_RTSP_PROXY_ADDRESS "./Con/MediaStream/RTSPProxyAddress"
#define NODE_SYSPROP_RTSP_PROXY_PORT "./Con/MediaStream/RTSPProxyPort"
#define NODE_SYSPROP_SELLER_NAME "./Subscriber/CarrierID"
#define NODE_SYSPROP_BC10 "./CDMA/BC10"
#define NODE_SYSPROP_SO68 "./CDMA/SO68"
#define NODE_SYSPROP_INTLDATA_ROAMGUARD "./SPA/IntlDataGuard/Enabled"
#define NODE_SYSPROP_ENABLEDLTE "./LTE/Service/Enabled"
#define NODE_SYSPROP_FORCELTE "./LTE/Service/Forced"
#define NODE_SYSPROP_EHRPD "./CDMA/EHRPD/Enabled"
#define NODE_SYSPROP_APN0 "./LTE/APN/0"
#define NODE_SYSPROP_APN1 "./LTE/APN/1"
#define NODE_SYSPROP_APN2 "./LTE/APN/2"
#define NODE_SYSPROP_APN3 "./LTE/APN/3"
#define NODE_SYSPROP_APN4 "./LTE/APN/4"
#define NODE_SYSPROP_APN5 "./LTE/APN/5"
#define NODE_SYSPROP_APN6 "./LTE/APN/6"
#define NODE_SYSPROP_APN7 "./LTE/APN/7"
#define NODE_SYSPROP_B26_ENABLEMENT "./LTE/B26/enablement"
#define NODE_SYSPROP_B41_ENABLEMENT "./LTE/B41/enablement"
#define NODE_SYSPROP_B25_ENABLEMENT "./LTE/B25/enablement"
#define NODE_SYSPROP_DOMDATA_ROAMGUARD_FORCED "./SPA/DomDataGuard/Forced"
#define NODE_SYSPROP_BARDOMDATA_ROAM "./SPA/BarDomDataRoaming/Enabled"
#define NODE_SYSPROP_DOMDATA_ROAM_FORCED "./SPA/BarDomDataRoaming/Forced"
#define NODE_SYSPROP_DOMVOICE_ROAMGUARD "./SPA/DomVoiceGuard/Enabled"
#define NODE_SYSPROP_DOMVOICE_ROAMGUARD_FORCED "./SPA/DomVoiceGuard/Forced"
#define NODE_SYSPROP_BARDOMVOICE_ROAM "./SPA/BarDomVoiceRoaming/Enabled"
// According to DDF, modified this definition from GTR system property.
#define NODE_SYSPROP_DOMVOICE_ROAM_FORCED "./SPA/BarDomVoiceRoaming/Forced"
#define NODE_SYSPROP_INTLDATA_ROAMGUARD_FORCED "./SPA/IntlDataGuard/Forced"
#define NODE_SYSPROP_INTLDATA_ROAM "./SPA/BarIntlDataRoaming/Enabled"
#define NODE_SYSPROP_INTLDATA_ROAM_FORCED "./SPA/BarIntlDataRoaming/Forced"
#define NODE_SYSPROP_INTLVOICE_ROAMGUARD "./SPA/IntlVoiceGuard/Enabled"
#define NODE_SYSPROP_INTLVOICE_ROAMGUARD_FORCED "./SPA/IntlVoiceGuard/Forced"
#define NODE_SYSPROP_BARINTLVOICE_ROAM "./SPA/BarIntlVoiceRoaming/Enabled"
#define NODE_SYSPROP_BARINTLVOICE_ROAM_FORCED "./SPA/BarIntlVoiceRoaming/Forced"
#define NODE_SYSPROP_OPERATORID "./Customization/BrandAlpha"
#define NODE_SYSPROP_TETHEREDDATA_ENABLED "./Customization/TetheredData"
#define NODE_SYSPROP_ACCT_SUBTYPE "./Subscriber/AcctSubType"
#define NODE_SYSPROP_ACCT_TYPE "./Subscriber/AcctType"
#define NODE_SYSPROP_BAN "./Subscriber/BAN"
#define NODE_SYSPROP_BILLING_DATE "./Subscriber/BillCycleDate"
#define NODE_SYSPROP_CSA "./Subscriber/CSA"
#define NODE_SYSPROP_SUB_STATE "./Subscriber/State"
#define NODE_SYSPROP_USAGE_MODE "./Subscriber/UsageMode"
#define NODE_SYSPROP_ACCT_ZIPCODE "./Subscriber/ZIPCode"
#define NODE_SYSPROP_1XADV_ENABLE "./CDMA/1xA/Enabled"
#define NODE_SYSPROP_1XADV_COP0 "./CDMA/SO73/COP0"
#define NODE_SYSPROP_1XADV_COP1TO7 "./CDMA/SO73/COP1to7"
#define NODE_SYSPROP_ICCID "./SIM/UICCID"
#define NODE_SYSPROP_ACCOLC "./SIM/ACCOLC"
#define NODE_SYSPROP_SIM_LOCK "./SIM/Lock"
#define NODE_SYSPROP_VOWIFI_ENABLED "./VoWifi/Enabled"
#define NODE_SYSPROP_1STCNTCTINFO "./Customization/Contacts/First"
#define NODE_SYSPROP_2NDCNTCTINFO "./Customization/Contacts/Second"
#define NODE_SYSPROP_3RDCNTCTINFO "./Customization/Contacts/Third"
#define NODE_SYSPROP_4THCNTCTINFO "./Customization/Contacts/Fourth"
#define NODE_SYSPROP_5THCNTCTINFO "./Customization/Contacts/Fifth"
#define NODE_SYSPROP_6THCNTCTINFO "./Customization/Contacts/Sixh"
#define NODE_SYSPROP_1STADCINFO	"./Customization/ADC/First"
#define NODE_SYSPROP_2NDADCINFO	"./Customization/ADC/Second"
#define NODE_SYSPROP_3RDADCINFO	"./Customization/ADC/Third"
#define NODE_SYSPROP_4THADCINFO	"./Customization/ADC/Fourth"
#define NODE_SYSPROP_5THADCINFO	"./Customization/ADC/Fifth"
#define NODE_SYSPROP_6THADCINFO	"./Customization/ADC/Sixth"
#define NODE_SYSPROP_7THADCINFO	"./Customization/ADC/Seventh"
#define NODE_SYSPROP_8THADCINFO	"./Customization/ADC/Eigth"
#define NODE_SYSPROP_9THADCINFO	"./Customization/ADC/Ninth"
#define NODE_SYSPROP_10THADCINFO "./Customization/ADC/Tenth"
#define NODE_SYSPROP_11THADCINFO "./Customization/ADC/Elevnth"
#define NODE_SYSPROP_12THADCINFO "./Customization/ADC/Twelfth"
#define NODE_SYSPROP_13THADCINFO "./Customization/ADC/Thirteenth"
#define NODE_SYSPROP_14THADCINFO "./Customization/ADC/Fourteenth"
#define NODE_SYSPROP_15THADCINFO "./Customization/ADC/Fifteenth"
#define NODE_SYSPROP_16THADCINFO "./Customization/ADC/Sixteenth"
#define NODE_SYSPROP_17THADCINFO "./Customization/ADC/Seventeenth"
#define NODE_SYSPROP_18THADCINFO "./Customization/ADC/Eighteenth"
#define NODE_SYSPROP_ROAMMENUDISPLAY "./Customization/RoamPreference/MenuDisplay"
#define NODE_SYSPROP_ROAMHOMEONLY "./Customization/RoamPreference/HomeOnly"
#define NODE_SYSPROP_DIAGMSLREQ "./Customization/DiagMSLReq"
#define NODE_SYSPROP_BRWSRSRCHENGINE "./Customization/Browser/SearchEngine"
#define NODE_SYSPROP_MMSSERVERURL "./Customization/MMS/ServerUrl"
#define NODE_SYSPROP_MMSPROXY "./Customization/MMS/Proxy"
#define NODE_SYSPROP_MMSPORT "./Customization/MMS/Port"
#define NODE_SYSPROP_CARRIERHOMEPAGE "./Customization/CarrierLegal/CarrierHomePage"
#define NODE_SYSPROP_CUSTOMERCARE "./Customization/Contacts/CustomerCare"
#define NODE_SYSPROP_BOOKMARK_01 "./Customization/Browser/BM/1"
#define NODE_SYSPROP_BOOKMARK_02 "./Customization/Browser/BM/2"
#define NODE_SYSPROP_BOOKMARK_03 "./Customization/Browser/BM/3"
#define NODE_SYSPROP_BOOKMARK_04 "./Customization/Browser/BM/4"
#define NODE_SYSPROP_BOOKMARK_05 "./Customization/Browser/BM/5"
#define NODE_SYSPROP_CNAP_ENABLED "./CNAP/CS/Enabled"
#define NODE_SYSPROP_BOOKMARK_06 "./Customization/Browser/BM/6"
#define NODE_SYSPROP_BOOKMARK_07 "./Customization/Browser/BM/7"
#define NODE_SYSPROP_BOOKMARK_08 "./Customization/Browser/BM/8"
#define NODE_SYSPROP_BOOKMARK_09 "./Customization/Browser/BM/9"
#define NODE_SYSPROP_BOOKMARK_10 "./Customization/Browser/BM/10"
#define NODE_SYSPROP_BOOKMARK_11 "./Customization/Browser/BM/11"
#define NODE_SYSPROP_BOOKMARK_12 "./Customization/Browser/BM/12"
#define NODE_SYSPROP_BOOKMARK_13 "./Customization/Browser/BM/13"
#define NODE_SYSPROP_BOOKMARK_14 "./Customization/Browser/BM/14"
#define NODE_SYSPROP_BOOKMARK_15 "./Customization/Browser/BM/15"
#define NODE_SYSPROP_BOOKMARK_16 "./Customization/Browser/BM/16"
#define NODE_SYSPROP_NETGUARD_ENABLED "./Customization/EnabledApps/NetGuard"
#define NODE_SYSPROP_PAYLOAD_CUSTOMID "./Customization/CustID"
#define NODE_SYSPROP_BARLTEDATA_ROAM "./SPA/BarLTEDataRoaming/Enabled"
#define NODE_SYSPROP_BARLTEDATA_ROAM_FORCED "./SPA/BarLTEDataRoaming/Forced"
#define NODE_SYSPROP_LTEDATA_ROAM_ENABLED "./SPA/LTEDataRoamGuard/Enabled"
#define NODE_SYSPROP_LTEDATA_ROAMGUARD_FORCED "./SPA/LTEDataRoamGuard/Forced"
#define NODE_SYSPROP_BARINTL_LTEDATA_ROAM "./SPA/BarIntlLTEDataRoaming/Enabled"
#define NODE_SYSPROP_BARINTL_LTEDATA_ROAM_FORCED "./SPA/BarIntlLTEDataRoaming/Forced"
#define NODE_SYSPROP_INTLLTEDATA_ROAMGUARD "./SPA/IntlLTEDataRoamGuard/Enabled"
#define NODE_SYSPROP_INTLLTEDATA_ROAMGUARD_FORCED "./SPA/IntlLTEDataRoamGuard/Forced"
#define NODE_SYSPROP_OMADM_SERVER_ID "./OMADM/ServerIndicator"
#define NODE_SYSPROP_CONTACTCARE "./Customization/Contacts/Care"
#define NODE_SYSPROP_SPEEDDIAL_1 "./Customization/SpeedDial/1"
#define NODE_SYSPROP_ROAMMENU "./Customization/RoamPreference/Menu"
#define NODE_SYSPROP_GPSONE_PDEIP "./Customization/GPSOne/PDEIP"
#define NODE_SYSPROP_GPSONE_PDEPORT "./Customization/GPSOne/PDEPort"
#define NODE_SYSPROP_MMS_AUTORETRIEVE_ENABLED "./Customization/MMS/AutoRetrieve/Enabled"
#define NODE_SYSPROP_MMS_HTTPHEADER "./Customization/MMS/HTTPHeader"
#define NODE_SYSPROP_OMADM_CICM "./Customization/OMADM/CICM"
#define NODE_SYSPROP_VOWIFI_APP_ENABLED "./AppSupport/VoWIFI/Enabled"
#define NODE_SYSPROP_SMSOIP_ENABLED "./IMSCoreSvc/SMSoIP/Enabled"
#define NODE_SYSPROP_NEXTLTESCAN "./LTE/nextLTEscan"
#define NODE_SYSPROP_BSRTIMER "./LTE/BSRTimer"
#define NODE_SYSPROP_BSRMAXTIME "./LTE/BSRMaxTime"
#define NODE_SYSPROP_NETWORK_MODE "./MobileNetworks/NetworkMode"
#define NODE_SYSPROP_VOWIFI_VCC_STATE "./VoWifi/VCC/State"
#define NODE_SYSPROP_VOWIFI_VDN "./VoWifi/VDN"
#define NODE_SYSPROP_CSIM_PROV_OBJ "./CSIM/ProvObj"
#define NODE_SYSPROP_CSIM_COVERAGE_OBJ "./CSIM/CoverageObj"
#define NODE_SYSPROP_EMAIL_SIGNATURE  "./Customization/email/Signature"
#define NODE_SYSPROP_EMAIL_SYNCSCHEDULE "./Customization/email/SyncSchedule"
#define NODE_SYSPROP_BOOKMARKS "./Customization/Bookmarks"
#define NODE_SYSPROP_MYACCOUNT "./Customization/Browser/Myaccount"
#define NODE_SYSPROP_USBTETHERMENUDISPLAY "./Customization/UsbTetherMenuDisplay"
#define NODE_SYSPROP_WIFITETHERMENUDISPLAY "./Customization/WifiTetherMenuDisplay"
#define NODE_SYSPROP_WIFISSID          "./Customization/WifiSSID"
#define NODE_SYSPROP_BASEBANDDIAGMENUDISPLAY  "./Customization/DiagMenuDisplay"



/*************************/
/*extra defintions of nodes*/
//Hidden Menu parts

/*node "oem.life.timer" define in sysprop.h*/
//#define OEM_LIFE_TIMER 9000
//#define NODE_OEM_LIFE_TIMER "oem.life.timer"

#define OEM_LIFE_CALLS 9001
#define NODE_OEM_LIFE_CALLS "oem.life.calls"
#define OEM_LIFE_DATA 9002
#define NODE_OEM_LIFE_DATA "oem.life.data"
#define OEM_RECONDITIONED_STATUS 9003
#define NODE_OEM_RECONDITIONED_STATUS "oem.reconditioned.status"
#define OEM_RECONDITIONED_DATES 9004
#define NODE_OEM_RECONDITIONED_DATES "oem.reconditioned.dates"
#define OEM_RECONDITIONED_VERSION 9005
#define NODE_OEM_RECONDITIONED_VERSION "oem.reconditioned.version"
#define OEM_ACTIVATION_DATE 9006
#define NODE_OEM_ACTIVATION_DATE "oem.activation.date"
#define OEM_ACTIVATION_STEP 9007
#define NODE_OEM_ACTIVATION_STEP "oem.activation.step"
//HFA parts
#define OEM_HFA_NUMRETRIES 9100
#define NODE_OEM_HFA_NUMRETRIES "./OMADM/HFA/NumRetries"
#define OEM_HFA_RETRYINTERVAL 9101
#define NODE_OEM_HFA_RETRYINTERVAL "./OMADM/HFA/RetryInterval"
//Chameleon parts
#define OEM_CHAMELEON_OBJECT 9200
#define NODE_OEM_CHAMELEON_OBJECT "./Customization/ChameleonObject"
//VOLTE parts
#define OEM_VOLTE_ENABLED 9300
#define NODE_OEM_VOLTE_ENABLED "./IMSCoreSvc/VoLTE/Enabled"

#define OEM_HFA_SWITCH 9400
#define NODE_OEM_HFA_SWITCH "persist.operator_spr.hfa_switch"

/*
	procedure
	1. get SP_ITEM from table
	2. check if type and rw is right, return if error
	3. switch data source, do read/write operation
	4. if cannot read from dsRead, read from dsReadOriginal
	5. do ext Read/Write Func if needed
*/
#ifdef _SYSPROP_COUNT
#undef _SYSPROP_COUNT
#endif

#ifdef SP_ITEM_ARRAY
#undef SP_ITEM_ARRAY
#endif

#define _SYSPROP_COUNT 159

#define SP_ITEM_ARRAY \
{                     \
	/* Roaming Nodes Start 24*/	\
		/*** DomDataGuard ***/	\
	{SYSPROP_DOMDATA_ROAMGUARD,NODE_SYSPROP_DOMDATA_ROAMGUARD,CHAR,RW,DB_CARRIER,true,true,false,false}, \
	{SYSPROP_DOMDATA_ROAMGUARD_FORCED,NODE_SYSPROP_DOMDATA_ROAMGUARD_FORCED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
		/*** BarDomDataRoaming ***/	\
	{SYSPROP_BARDOMDATA_ROAM,NODE_SYSPROP_BARDOMDATA_ROAM,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_DOMDATA_ROAM_FORCED,NODE_SYSPROP_DOMDATA_ROAM_FORCED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
		/*** DomVoiceGuard ***/	\
	{SYSPROP_DOMVOICE_ROAMGUARD,NODE_SYSPROP_DOMVOICE_ROAMGUARD,CHAR,RW,DB_CARRIER,true,true,false,false}, \
	{SYSPROP_DOMVOICE_ROAMGUARD_FORCED,NODE_SYSPROP_DOMVOICE_ROAMGUARD_FORCED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
		/*** BarDomVoiceRoaming ***/	\
	{SYSPROP_BARDOMVOICE_ROAM,NODE_SYSPROP_BARDOMVOICE_ROAM,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_DOMVOICE_ROAM_FORCED,NODE_SYSPROP_DOMVOICE_ROAM_FORCED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
		/*** IntlDataGuard ***/	\
	{SYSPROP_INTLDATA_ROAMGUARD,NODE_SYSPROP_INTLDATA_ROAMGUARD,CHAR,RW,DB_CARRIER,true,true,false,false}, \
	{SYSPROP_INTLDATA_ROAMGUARD_FORCED,NODE_SYSPROP_INTLDATA_ROAMGUARD_FORCED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
		/*** BarIntlDataRoaming ***/	\
	{SYSPROP_INTLDATA_ROAM,NODE_SYSPROP_INTLDATA_ROAM,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_INTLDATA_ROAM_FORCED,NODE_SYSPROP_INTLDATA_ROAM_FORCED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
		/*** IntlVoiceGuard ***/	\
	{SYSPROP_INTLVOICE_ROAMGUARD,NODE_SYSPROP_INTLVOICE_ROAMGUARD,CHAR,RW,DB_CARRIER,true,true,false,false}, \
	{SYSPROP_INTLVOICE_ROAMGUARD_FORCED,NODE_SYSPROP_INTLVOICE_ROAMGUARD_FORCED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
		/*** BarIntlVoiceRoaming ***/	\
	{SYSPROP_BARINTLVOICE_ROAM,NODE_SYSPROP_BARINTLVOICE_ROAM,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_BARINTLVOICE_ROAM_FORCED,NODE_SYSPROP_BARINTLVOICE_ROAM_FORCED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
		/*** BarLTEDataRoaming ***/	\
	{SYSPROP_BARLTEDATA_ROAM,NODE_SYSPROP_BARLTEDATA_ROAM,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_BARLTEDATA_ROAM_FORCED,NODE_SYSPROP_BARLTEDATA_ROAM_FORCED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
		/*** LTEDataRoamGuard ***/	\
	{SYSPROP_LTEDATA_ROAM_ENABLED,NODE_SYSPROP_LTEDATA_ROAM_ENABLED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_LTEDATA_ROAMGUARD_FORCED,NODE_SYSPROP_LTEDATA_ROAMGUARD_FORCED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
		/*** BarIntlLTEDataRoaming ***/	\
	{SYSPROP_BARINTL_LTEDATA_ROAM,NODE_SYSPROP_BARINTL_LTEDATA_ROAM,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_BARINTL_LTEDATA_ROAM_FORCED,NODE_SYSPROP_BARINTL_LTEDATA_ROAM_FORCED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
		/*** IntlLTEDataRoamGuard ***/	\
	{SYSPROP_INTLLTEDATA_ROAMGUARD,NODE_SYSPROP_INTLLTEDATA_ROAMGUARD,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_INTLLTEDATA_ROAMGUARD_FORCED,NODE_SYSPROP_INTLLTEDATA_ROAMGUARD_FORCED,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	/* Roaming Nodes End 24*/	\
	\
	/* Network Mode Nodes Start 1*/	\
	{SYSPROP_NETWORK_MODE,NODE_SYSPROP_NETWORK_MODE,INT,RW,DB_CARRIER,true,false,false,false}, \
	/* Network Mode Nodes End 1*/	\
	\
	/* Hidden Menu Nodes Start 7*/	\
	{OEM_LIFE_TIMER,NODE_OEM_LIFE_TIMER,STRING,RW,DB_CARRIER,false,false,false,false}, \
	{OEM_LIFE_CALLS,NODE_OEM_LIFE_CALLS,STRING,RW,DB_CARRIER,false,false,false,false}, \
	{OEM_LIFE_DATA,NODE_OEM_LIFE_DATA,STRING,RW,DB_CARRIER,false,false,false,false}, \
	{OEM_RECONDITIONED_STATUS,NODE_OEM_RECONDITIONED_STATUS,STRING,RW,DB_CARRIER,true,false,false,false}, \
	{OEM_RECONDITIONED_DATES,NODE_OEM_RECONDITIONED_DATES,STRING,RW,DB_CARRIER,true,false,false,false}, \
	{OEM_RECONDITIONED_VERSION,NODE_OEM_RECONDITIONED_VERSION,STRING,RW,DB_CARRIER,true,false,false,false}, \
	{OEM_ACTIVATION_DATE,NODE_OEM_ACTIVATION_DATE,STRING,RW,DB_CARRIER,false,false,false,false}, \
	{OEM_ACTIVATION_STEP,NODE_OEM_ACTIVATION_STEP,STRING,RW,DB_CARRIER,false,false,false,false}, \
	/* Hidden Menu Nodes End 7*/	\
	\
	/* HFA Nodes Start 2*/	\
	{OEM_HFA_NUMRETRIES,NODE_OEM_HFA_NUMRETRIES,INT,RW,DB_CARRIER,true,false,false,false}, \
	{OEM_HFA_RETRYINTERVAL,NODE_OEM_HFA_RETRYINTERVAL,INT,RW,DB_CARRIER,true,false,false,false}, \
	/* HFA Nodes End 2*/	\
	\
	/* DM Bearer Nodes Start 18*/	\
		/*** CDMA ***/	\
	{SYSPROP_EHRPD,NODE_SYSPROP_EHRPD,INT,RW,NV,false,false,false,false}, \
	{SYSPROP_BC10,NODE_SYSPROP_BC10,INT,RW,NV,false,false,false,false}, \
		/*** LTE ***/	\
	{SYSPROP_ENABLEDLTE,NODE_SYSPROP_ENABLEDLTE,INT,RW,NV,false,false,false,false}, \
	{SYSPROP_FORCELTE,NODE_SYSPROP_FORCELTE,INT,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_B25_ENABLEMENT,NODE_SYSPROP_B25_ENABLEMENT,INT,RW,NV,false,false,false,false}, \
	{SYSPROP_B26_ENABLEMENT,NODE_SYSPROP_B26_ENABLEMENT,INT,RW,NV,false,false,false,false}, \
	{SYSPROP_B41_ENABLEMENT,NODE_SYSPROP_B41_ENABLEMENT,INT,RW,NV,false,false,false,false}, \
	{SYSPROP_BSRTIMER,NODE_SYSPROP_BSRTIMER,INT,RW,NV,false,false,false,false}, \
	{SYSPROP_NEXTLTESCAN,NODE_SYSPROP_NEXTLTESCAN,INT,RW,NV,false,false,false,false}, \
	{SYSPROP_BSRMAXTIME,NODE_SYSPROP_BSRMAXTIME,INT,RW,NV,false,false,false,false}, \
		/*** LTE APN ***/	\
	{SYSPROP_APN0,NODE_SYSPROP_APN0,STRING,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_APN1,NODE_SYSPROP_APN1,STRING,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_APN2,NODE_SYSPROP_APN2,STRING,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_APN3,NODE_SYSPROP_APN3,STRING,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_APN4,NODE_SYSPROP_APN4,STRING,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_APN5,NODE_SYSPROP_APN5,STRING,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_APN6,NODE_SYSPROP_APN6,STRING,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_APN7,NODE_SYSPROP_APN7,STRING,RW,DB_CARRIER,true,false,false,false}, \
	/* DM Bearer Nodes End 18*/	\
	\
	/* UICC Nodes Start 18*/	\
	{SYSPROP_MDN,NODE_SYSPROP_MDN,BASE64,RO,UICC,false,false,false,false}, \
	{SYSPROP_NAI,NODE_SYSPROP_NAI,CHAR,RO,UICC,false,false,false,false}, \
	{SYSPROP_SLOT1_AUTH_ALGO_AAA,NODE_SYSPROP_SLOT1_AUTH_ALGO_AAA,CHAR,RO,UICC,false,false,false,false}, \
	{SYSPROP_MSID,NODE_SYSPROP_MSID,BASE64,RO,UICC,false,false,false,false}, \
	{SYSPROP_SLOT1_SPI_AAA,NODE_SYSPROP_SLOT1_SPI_AAA,CHAR,RO,UICC,false,false,false,false}, \
	{SYSPROP_PRIMARY_HOME_AGENT,NODE_SYSPROP_PRIMARY_HOME_AGENT,CHAR,RO,UICC,false,false,false,false}, \
	{SYSPROP_SECONDARY_HOME_AGENT,NODE_SYSPROP_SECONDARY_HOME_AGENT,CHAR,RO,UICC,false,false,false,false}, \
	{SYSPROP_SLOT1_AUTH_ALGO_HA,NODE_SYSPROP_SLOT1_AUTH_ALGO_HA,CHAR,RO,UICC,false,false,false,false}, \
	{SYSPROP_SLOT1_SPI_HA,NODE_SYSPROP_SLOT1_SPI_HA ,CHAR,RO,UICC,false,false,false,false}, \
	{SYSPROP_SLOT1_MOBILE_IP,NODE_SYSPROP_SLOT1_MOBILE_IP,CHAR,RO,UICC,false,false,false,false}, \
	{SYSPROP_SLOT1_REVERSE_TUNNEL,NODE_SYSPROP_SLOT1_REVERSE_TUNNEL,BOOLEAN,RO,UICC,false,false,false,false}, \
	{SYSPROP_PRL,NODE_SYSPROP_PRL,CHAR,RO,UICC,false,false,false,false}, \
	{SYSPROP_ICCID,NODE_SYSPROP_ICCID,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_PRLID,NODE_SYSPROP_PRLID,INT,RO,UICC,false,false,false,false}, \
	{SYSPROP_SO68,NODE_SYSPROP_SO68,INT,RW,NV,false,false,false,false}, \
	{SYSPROP_1XADV_COP0,NODE_SYSPROP_1XADV_COP0,INT,RW,NV,false,false,false,false}, \
	{SYSPROP_1XADV_COP1TO7,NODE_SYSPROP_1XADV_COP1TO7,INT,RW,NV,false,false,false,false}, \
	{SYSPROP_1XADV_ENABLE,NODE_SYSPROP_1XADV_ENABLE,INT,RW,NV,false,false,false,false}, \
	{SYSPROP_CSIM_PROV_OBJ,NODE_SYSPROP_CSIM_PROV_OBJ,BYTE,WO,UICC,false,false,false,false}, \
	{SYSPROP_CSIM_COVERAGE_OBJ,NODE_SYSPROP_CSIM_COVERAGE_OBJ,BYTE,WO,UICC,false,false,false,false}, \
	{SYSPROP_ACCOLC,NODE_SYSPROP_ACCOLC,STRING,RW,UICC,false,false,false,false}, \
	/* UICC Nodes End 21*/	\
	\
	/* SMS Nodes Start 1*/	\
	{SYSPROP_SMSOIP_ENABLED,NODE_SYSPROP_SMSOIP_ENABLED,INT,RW,NV,false,false,false,false}, \
	/* SMS Nodes End 1*/	\
	\
	/* Customization ADC Nodes Start 18*/ \
	{SYSPROP_1STADCINFO,NODE_SYSPROP_1STADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_2NDADCINFO,NODE_SYSPROP_2NDADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_3RDADCINFO,NODE_SYSPROP_3RDADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_4THADCINFO,NODE_SYSPROP_4THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_5THADCINFO,NODE_SYSPROP_5THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_6THADCINFO,NODE_SYSPROP_6THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_7THADCINFO,NODE_SYSPROP_7THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_8THADCINFO,NODE_SYSPROP_8THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_9THADCINFO,NODE_SYSPROP_9THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_10THADCINFO,NODE_SYSPROP_10THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_11THADCINFO,NODE_SYSPROP_11THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_12THADCINFO,NODE_SYSPROP_12THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_13THADCINFO,NODE_SYSPROP_13THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_14THADCINFO,NODE_SYSPROP_14THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_15THADCINFO,NODE_SYSPROP_15THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_16THADCINFO,NODE_SYSPROP_16THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_17THADCINFO,NODE_SYSPROP_17THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_18THADCINFO,NODE_SYSPROP_18THADCINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	/* Customization ADC Nodes End 18*/ \
	\
	/* Customization Nodes Start 22*/ \
	{SYSPROP_OPERATORID,NODE_SYSPROP_OPERATORID,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_BROWSER_UAPROF_URL,NODE_SYSPROP_BROWSER_UAPROF_URL,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_TETHEREDDATA_ENABLED,NODE_SYSPROP_TETHEREDDATA_ENABLED,INT,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_1STCNTCTINFO,NODE_SYSPROP_1STCNTCTINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_2NDCNTCTINFO,NODE_SYSPROP_2NDCNTCTINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_3RDCNTCTINFO,NODE_SYSPROP_3RDCNTCTINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_4THCNTCTINFO,NODE_SYSPROP_4THCNTCTINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_5THCNTCTINFO,NODE_SYSPROP_5THCNTCTINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_6THCNTCTINFO,NODE_SYSPROP_6THCNTCTINFO,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_ROAMMENUDISPLAY,NODE_SYSPROP_ROAMMENUDISPLAY,INT,RW,DB_CARRIER,true,true,false,true}, \
	{SYSPROP_ROAMHOMEONLY,NODE_SYSPROP_ROAMHOMEONLY,INT,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_DIAGMSLREQ,NODE_SYSPROP_DIAGMSLREQ,INT,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_MMSSERVERURL,NODE_SYSPROP_MMSSERVERURL,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_MMSPROXY,NODE_SYSPROP_MMSPROXY,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_PAYLOAD_CUSTOMID,NODE_SYSPROP_PAYLOAD_CUSTOMID,INT,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_SPEEDDIAL_1,NODE_SYSPROP_SPEEDDIAL_1,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_ROAMMENU,NODE_SYSPROP_ROAMMENU,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_GPSONE_PDEIP,NODE_SYSPROP_GPSONE_PDEIP,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_GPSONE_PDEPORT,NODE_SYSPROP_GPSONE_PDEPORT,INT,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_MMS_AUTORETRIEVE_ENABLED,NODE_SYSPROP_MMS_AUTORETRIEVE_ENABLED,INT,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_MMS_HTTPHEADER,NODE_SYSPROP_MMS_HTTPHEADER,CHAR,RW,DB_CARRIER,true,false,false,true}, \
	{SYSPROP_OMADM_CICM,NODE_SYSPROP_OMADM_CICM,INT,RW,DB_CARRIER,true,false,false,true}, \
	/* Customization Nodes End 22*/ \
	\
	/* RTS Proxy Nodes Start 2*/	\
	{SYSPROP_RTSP_PROXY_ADDRESS,NODE_SYSPROP_RTSP_PROXY_ADDRESS,STRING,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_RTSP_PROXY_PORT,NODE_SYSPROP_RTSP_PROXY_PORT,STRING,RW,DB_CARRIER,true,false,false,false}, \
	/* RTS Proxy Nodes End 2*/	\
	\
	/* Voice Over WIFI Nodes Start */	\
	/* Voice Over WIFI Nodes End */	\
	\
	/* Subscriber Information Nodes Start 9*/	\
	{SYSPROP_ACCT_SUBTYPE,NODE_SYSPROP_ACCT_SUBTYPE,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_ACCT_TYPE,NODE_SYSPROP_ACCT_TYPE,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_BAN,NODE_SYSPROP_BAN,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_BILLING_DATE,NODE_SYSPROP_BILLING_DATE,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_SELLER_NAME,NODE_SYSPROP_SELLER_NAME,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_CSA,NODE_SYSPROP_CSA,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_SUB_STATE,NODE_SYSPROP_SUB_STATE,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_USAGE_MODE,NODE_SYSPROP_USAGE_MODE,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_ACCT_ZIPCODE,NODE_SYSPROP_ACCT_ZIPCODE,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	/* Subscriber Information Nodes End 9*/	\
	\
	/* Device Detail Nodes Start 1*/	\
	{SYSPROP_DEVDTL_LARGE_OBJECT,NODE_SYSPROP_DEVDTL_LARGE_OBJECT,BOOLEAN,RO,CONSTANT,false,false,false,false}, \
	/* Device Detail Nodes End 1*/	\
	\
	/* Device Info Nodes Start 5*/	\
	{SYSPROP_DEVID,NODE_SYSPROP_DEVID,CHAR,RO,UICC,false,false,false,false}, \
	{SYSPROP_MEID,NODE_SYSPROP_MEID,CHAR,RO,UICC,false,false,false,false}, \
	{SYSPROP_ESN,NODE_SYSPROP_ESN,CHAR,RO,UICC,false,false,false,false}, \
	{SYSPROP_DEVINFO_DM_VER,NODE_SYSPROP_DEVINFO_DM_VER,CHAR,RO,CONSTANT,false,false,false,false}, \
	{SYSPROP_DEVINFO_LANG,NODE_SYSPROP_DEVINFO_LANG,CHAR,RO,CONSTANT,false,false,false,false}, \
	/* Device Info Nodes End 5*/	\
	\
	/* OMA DM Server Indicator Nodes Start 1*/	\
	{SYSPROP_OMADM_SERVER_ID,NODE_SYSPROP_OMADM_SERVER_ID,INT,RW,DB_CARRIER,true,false,false,false}, \
	/* OMA DM Server Indicator Nodes End 1*/	\
  	\
	/* ANdroid System property Nodes Start 7*/	\
	{SYSPROP_DEVICE_VENDOR,NODE_SYSPROP_DEVICE_VENDOR,STRING,RO,ANDROID_PROPERTY,false,false,false,false}, \
	{SYSPROP_DEVICE_MODEL,NODE_SYSPROP_DEVICE_MODEL,STRING,RO,ANDROID_PROPERTY,false,false,false,false}, \
	{SYSPROP_DEVICE_SOFTWARE_VERSION,NODE_SYSPROP_DEVICE_SOFTWARE_VERSION,STRING,RO,ANDROID_PROPERTY,false,false,false,false}, \
	{SYSPROP_DEVDTL_DEV_TYPE,NODE_SYSPROP_DEVDTL_DEV_TYPE,STRING,RO,ANDROID_PROPERTY,false,false,false,false}, \
	{SYSPROP_DEVDTL_FW_VER,NODE_SYSPROP_DEVDTL_FW_VER,STRING,RO,ANDROID_PROPERTY,false,false,false,false}, \
	{SYSPROP_DEVDTL_HW_VER,NODE_SYSPROP_DEVDTL_HW_VER,STRING,RO,ANDROID_PROPERTY,false,false,false,false}, \
	{SYSPROP_DEVINFO_MAN,NODE_SYSPROP_DEVINFO_MAN,STRING,RO,ANDROID_PROPERTY,false,false,false,false}, \
	/* ANdroid System property Nodes End 7*/	\
	\
	/* Chameleon Nodes Start 1*/	\
	{OEM_CHAMELEON_OBJECT,NODE_OEM_CHAMELEON_OBJECT,STRING,RW,DB_CARRIER,true,false,false,true}, \
	/* Chameleon Nodes End 1*/	\
	/* VoWifi Nodes Start 2*/	\
	{SYSPROP_VOWIFI_ENABLED,NODE_SYSPROP_VOWIFI_ENABLED,INT,RW,DB_CARRIER,true,false,false,false}, \
	{SYSPROP_VOWIFI_APP_ENABLED,NODE_SYSPROP_VOWIFI_APP_ENABLED,INT,RW,DB_CARRIER,true,false,false,false}, \
	/* VoWifi Nodes End 2*/	\
	/* Sim Nodes Start 1*/	\
	{SYSPROP_SIM_LOCK,NODE_SYSPROP_SIM_LOCK,INT,RW,DB_CARRIER,true,false,false,false}, \
	/* Sim Nodes End 1*/	\
	/* CNAP Nodes Start 1*/	\
	{SYSPROP_CNAP_ENABLED,NODE_SYSPROP_CNAP_ENABLED,INT,RW,DB_CARRIER,true,false,false,false}, \
	/* CNAP Nodes End 1*/	\
    {SYSPROP_MMSPORT,NODE_SYSPROP_MMSPORT,INT,RW,DB_CARRIER,true,false,false,true}, \
    {SYSPROP_EMAIL_SIGNATURE,NODE_SYSPROP_EMAIL_SIGNATURE,STRING,RW,DB_CARRIER,true,false,false,true}, \
    {SYSPROP_EMAIL_SYNCSCHEDULE,NODE_SYSPROP_EMAIL_SYNCSCHEDULE,STRING,RW,DB_CARRIER,true,false,false,true}, \
    {SYSPROP_BRWSRSRCHENGINE,NODE_SYSPROP_BRWSRSRCHENGINE,STRING,RW,DB_CARRIER,true,false,false,true}, \
    {SYSPROP_MYACCOUNT,NODE_SYSPROP_MYACCOUNT,STRING,RW,DB_CARRIER,true,false,false,true}, \
    {SYSPROP_BOOKMARKS,NODE_SYSPROP_BOOKMARKS,STRING,RW,DB_CARRIER,true,false,false,true}, \
    {SYSPROP_USBTETHERMENUDISPLAY,NODE_SYSPROP_USBTETHERMENUDISPLAY,INT,RW,DB_CARRIER,true,false,false,true}, \
    {SYSPROP_WIFITETHERMENUDISPLAY,NODE_SYSPROP_WIFITETHERMENUDISPLAY,INT,RW,DB_CARRIER,true,false,false,true}, \
    {SYSPROP_WIFISSID,NODE_SYSPROP_WIFISSID,STRING,RW,DB_CARRIER,true,false,false,true}, \
    {SYSPROP_BASEBANDDIAGMENUDISPLAY,NODE_SYSPROP_BASEBANDDIAGMENUDISPLAY,INT,RW,DB_CARRIER,true,false,false,true}, \
    {SYSPROP_CUSTOMERCARE,NODE_SYSPROP_CUSTOMERCARE,STRING,RW,DB_CARRIER,true,false,false,true}, \
    {OEM_VOLTE_ENABLED,NODE_OEM_VOLTE_ENABLED,BOOLEAN,RW,DB_CARRIER,true,false,false,false}, \
    {OEM_HFA_SWITCH,NODE_OEM_HFA_SWITCH,BOOLEAN,RW,DB_CARRIER,false,false,false,false}, \
    {OEM_LIFE_TIMER_CONDITIONAL,NODE_OEM_LIFE_TIMER_CONDITIONAL,STRING,RW,DB_CARRIER,true,false,false,false} \
}

	
	// {SYSPROP_VOWIFI_VCC_STATE,NODE_SYSPROP_VOWIFI_VCC_STATE,INT,RW,DB_CARRIER,true,false,false,false}, \
	// {SYSPROP_VOWIFI_VDN,NODE_SYSPROP_VOWIFI_VDN,CHAR,RW,DB_CARRIER,true,false,false,false}, \
	
	
#endif //_sysprop_sprint_h

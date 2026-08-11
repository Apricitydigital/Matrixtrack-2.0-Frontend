"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Bell,
  BrushCleaning,
  ChevronRight,
  CircleAlert,
  Info,
  RefreshCw,
  Toilet,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import { useAuth } from "@hooks/useAuth";

import {
  CityApi,
  CityModulesApi,
  ModuleRecordsApi,
} from "@lib/apiClient";


/* =========================================================
   TYPES
========================================================= */

type AlertSeverity =
  | "CRITICAL"
  | "WARNING"
  | "INFO";


type SystemAlertItem = {
  id: string;

  severity: AlertSeverity;

  moduleKey: string;

  moduleName: string;

  title: string;

  description: string;

  count: number;

  href: string;

  cityName?: string;
};


type SystemAlertsProps = {
  showLabel?: boolean;

  lightMode?: boolean;
};


/* =========================================================
   SUPPORTED MATRIXTRACK MODULES

   These names/routes already exist in the current software.
========================================================= */

const MODULE_DEFINITIONS = [
  {
    identity: "TOILET",
    title: "Cleanliness of Toilets",
    route: "/modules/toilet",
    candidates: ["TOILET"],
  },

  {
    identity: "SWEEPING",
    title: "Sweeping",
    route: "/modules/sweeping",
    candidates: ["SWEEPING"],
  },

  {
    identity: "LITTERBINS",
    title: "Litter Bins / Twinbin",
    route: "/modules/twinbin",
    candidates: [
      "LITTERBINS",
      "TWINBIN",
    ],
  },

  {
    identity: "TASKFORCE",
    title: "CTU / GVP Transformation",
    route: "/modules/taskforce",
    candidates: ["TASKFORCE"],
  },
];


/* =========================================================
   HELPERS
========================================================= */

function normalizeText(
  value: unknown
) {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
}


function getModuleDefinition(
  nameOrKey: string
) {
  const value =
    normalizeText(
      nameOrKey
    );

  if (
    value.includes(
      "TOILET"
    )
  ) {
    return MODULE_DEFINITIONS[0];
  }


  if (
    value.includes(
      "SWEEP"
    )
  ) {
    return MODULE_DEFINITIONS[1];
  }


  if (
    value.includes(
      "LITTER"
    ) ||
    value.includes(
      "TWINBIN"
    ) ||
    value.includes(
      "TWIN BIN"
    ) ||
    value.includes(
      "BIN"
    )
  ) {
    return MODULE_DEFINITIONS[2];
  }


  if (
    value.includes(
      "TASKFORCE"
    ) ||
    value.includes(
      "GVP"
    ) ||
    value.includes(
      "CTU"
    )
  ) {
    return MODULE_DEFINITIONS[3];
  }


  return null;
}


function getModuleIcon(
  moduleKey: string
) {
  const key =
    normalizeText(
      moduleKey
    );

  if (
    key.includes(
      "TOILET"
    )
  ) {
    return (
      <Toilet
        size={17}
      />
    );
  }


  if (
    key.includes(
      "SWEEP"
    )
  ) {
    return (
      <BrushCleaning
        size={17}
      />
    );
  }


  if (
    key.includes(
      "LITTER"
    ) ||
    key.includes(
      "TWIN"
    ) ||
    key.includes(
      "BIN"
    )
  ) {
    return (
      <Trash2
        size={17}
      />
    );
  }


  if (
    key.includes(
      "TASKFORCE"
    ) ||
    key.includes(
      "GVP"
    ) ||
    key.includes(
      "CTU"
    )
  ) {
    return (
      <Truck
        size={17}
      />
    );
  }


  return (
    <Info
      size={17}
    />
  );
}


/* =========================================================
   COMPONENT
========================================================= */

export default function SystemAlerts({
  showLabel = false,
  lightMode = false,
}: SystemAlertsProps) {
  const { user } =
    useAuth();

  const router =
    useRouter();


  /* =======================================================
     UI STATE
  ======================================================= */

  const [
    isOpen,
    setIsOpen,
  ] =
    useState(false);


  const [
    alerts,
    setAlerts,
  ] =
    useState<
      SystemAlertItem[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(false);


  const [
    loadError,
    setLoadError,
  ] =
    useState(false);


  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState<Date | null>(
      null
    );


  /* =======================================================
     ROLE CHECK

     Same role naming already used in current portal.
  ======================================================= */

  const normalizedRoles =
    useMemo(() => {
      const values = [
        user?.role,
        ...(
          user?.roles ||
          []
        ),
      ];

      return Array.from(
        new Set(
          values
            .filter(
              Boolean
            )
            .map(
              (role) =>
                normalizeText(
                  role
                )
            )
        )
      );
    }, [
      user?.role,
      user?.roles,
    ]);


  const isSuperAdmin =
    normalizedRoles.some(
      (role) =>
        [
          "SUPER_ADMIN",
          "HMS_SUPER_ADMIN",
        ].includes(
          role
        )
    );


  const isCityAdmin =
    normalizedRoles.includes(
      "CITY_ADMIN"
    );


  const canUseAlerts =
    isSuperAdmin ||
    isCityAdmin;


  /* =======================================================
     FETCH MODULE STATS

     Some existing parts of the project use LITTERBINS,
     while existing dashboard code also uses TWINBIN.

     We safely try the confirmed candidates and use
     whichever existing API responds.
  ======================================================= */

  const fetchStatsForModule =
    useCallback(
      async ({
        candidates,
        cityId,
      }: {
        candidates: string[];
        cityId?: string;
      }) => {
        for (
          const candidate
          of candidates
        ) {
          try {
            const response =
              await ModuleRecordsApi
                .getRecords(
                  candidate,
                  {
                    ...(cityId
                      ? {
                          cityId,
                        }
                      : {}),
                    limit: 1,
                  }
                );

            return {
              key:
                candidate,

              stats:
                response?.stats ||
                {
                  pending:
                    0,

                  approved:
                    0,

                  total:
                    0,

                  actionRequired:
                    0,

                  actionTaken:
                    0,
                },
            };
          } catch {
            /*
             * Try next valid candidate.
             * Example:
             * LITTERBINS → TWINBIN
             */
          }
        }


        return null;
      },
      []
    );


  /* =======================================================
     CITY ADMIN ALERTS

     Uses:
       CityModulesApi.list()
       ModuleRecordsApi.getRecords()

     Both already exist in apiClient.ts.
  ======================================================= */

  const loadCityAdminAlerts =
    useCallback(
      async () => {
        const result:
          SystemAlertItem[] =
          [];


        const moduleResponse =
          await CityModulesApi
            .list()
            .catch(
              () => []
            );


        const enabledModules =
          (
            Array.isArray(
              moduleResponse
            )
              ? moduleResponse
              : []
          ).filter(
            (module: any) =>
              module.enabled
          );


        for (
          const module
          of enabledModules
        ) {
          const definition =
            getModuleDefinition(
              module.key ||
              module.name
            );


          if (
            !definition
          ) {
            continue;
          }


          const statsResult =
            await fetchStatsForModule(
              {
                candidates:
                  [
                    module.key,
                    ...definition
                      .candidates,
                  ]
                    .filter(
                      Boolean
                    )
                    .map(
                      String
                    ),
              }
            );


          if (
            !statsResult
          ) {
            continue;
          }


          const stats =
            statsResult.stats;


          const actionRequired =
            Number(
              stats
                ?.actionRequired ||
                0
            );


          const pending =
            Number(
              stats?.pending ||
                0
            );


          /* -----------------------------------------------
             CRITICAL
          ----------------------------------------------- */

          if (
            actionRequired >
            0
          ) {
            result.push({
              id:
                `city-${definition.identity}-action-required`,

              severity:
                "CRITICAL",

              moduleKey:
                definition.identity,

              moduleName:
                definition.title,

              title:
                `${actionRequired} ${
                  actionRequired ===
                  1
                    ? "report requires"
                    : "reports require"
                } action`,

              description:
                "Corrective action is pending for submitted inspection reports.",

              count:
                actionRequired,

              href:
                definition.route,

              cityName:
                user?.city
                  ?.name,
            });
          }


          /* -----------------------------------------------
             WARNING
          ----------------------------------------------- */

          if (
            pending > 0
          ) {
            result.push({
              id:
                `city-${definition.identity}-pending`,

              severity:
                "WARNING",

              moduleKey:
                definition.identity,

              moduleName:
                definition.title,

              title:
                `${pending} ${
                  pending ===
                  1
                    ? "inspection is"
                    : "inspections are"
                } pending`,

              description:
                "Inspection records are waiting for review or completion.",

              count:
                pending,

              href:
                definition.route,

              cityName:
                user?.city
                  ?.name,
            });
          }
        }


        return result;
      },
      [
        fetchStatsForModule,
        user?.city?.name,
      ]
    );


  /* =======================================================
     HMS SUPER ADMIN ALERTS

     CityApi.list() response is confirmed to contain:

     city.id
     city.name
     city.enabled
     city.modules[]
       id
       name
       enabled

     For each enabled city/module we use the existing
     ModuleRecordsApi cityId filter.
  ======================================================= */

  const loadSuperAdminAlerts =
    useCallback(
      async () => {
        const result:
          SystemAlertItem[] =
          [];


        const cityResponse =
          await CityApi
            .list()
            .catch(
              () => ({
                cities: [],
              })
            );


        const cities =
          (
            cityResponse
              ?.cities ||
            []
          ).filter(
            (city) =>
              city.enabled
          );


        for (
          const city
          of cities
        ) {
          const enabledModules =
            (
              city.modules ||
              []
            ).filter(
              (module) =>
                module.enabled
            );


          for (
            const module
            of enabledModules
          ) {
            const definition =
              getModuleDefinition(
                module.name
              );


            if (
              !definition
            ) {
              continue;
            }


            const statsResult =
              await fetchStatsForModule(
                {
                  candidates:
                    definition
                      .candidates,

                  cityId:
                    city.id,
                }
              );


            if (
              !statsResult
            ) {
              continue;
            }


            const stats =
              statsResult.stats;


            const actionRequired =
              Number(
                stats
                  ?.actionRequired ||
                  0
              );


            const pending =
              Number(
                stats?.pending ||
                  0
              );


            if (
              actionRequired >
              0
            ) {
              result.push({
                id:
                  `${city.id}-${definition.identity}-action-required`,

                severity:
                  "CRITICAL",

                moduleKey:
                  definition.identity,

                moduleName:
                  definition.title,

                title:
                  `${actionRequired} ${
                    actionRequired ===
                    1
                      ? "report requires"
                      : "reports require"
                  } action`,

                description:
                  `Corrective action is pending in ${city.name}.`,

                count:
                  actionRequired,

                href:
                  definition.route,

                cityName:
                  city.name,
              });
            }


            if (
              pending > 0
            ) {
              result.push({
                id:
                  `${city.id}-${definition.identity}-pending`,

                severity:
                  "WARNING",

                moduleKey:
                  definition.identity,

                moduleName:
                  definition.title,

                title:
                  `${pending} ${
                    pending ===
                    1
                      ? "inspection is"
                      : "inspections are"
                  } pending`,

                description:
                  `Inspection records are pending in ${city.name}.`,

                count:
                  pending,

                href:
                  definition.route,

                cityName:
                  city.name,
              });
            }
          }
        }


        return result;
      },
      [
        fetchStatsForModule,
      ]
    );


  /* =======================================================
     LOAD ALERTS
  ======================================================= */

  const loadAlerts =
    useCallback(
      async () => {
        if (
          !canUseAlerts
        ) {
          setAlerts(
            []
          );

          return;
        }


        try {
          setLoading(
            true
          );

          setLoadError(
            false
          );


          const nextAlerts =
            isSuperAdmin
              ? await loadSuperAdminAlerts()
              : await loadCityAdminAlerts();


          setAlerts(
            nextAlerts
          );


          setLastUpdated(
            new Date()
          );

        } catch (
          error
        ) {
          console.error(
            "Failed to load system alerts",
            error
          );

          setLoadError(
            true
          );

        } finally {
          setLoading(
            false
          );
        }
      },
      [
        canUseAlerts,
        isSuperAdmin,
        loadCityAdminAlerts,
        loadSuperAdminAlerts,
      ]
    );


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    if (
      canUseAlerts
    ) {
      loadAlerts();
    }
  }, [
    canUseAlerts,
    loadAlerts,
  ]);


  /* =======================================================
     ESC KEY CLOSE
  ======================================================= */

  useEffect(() => {
    if (
      !isOpen
    ) {
      return;
    }


    const handleKeyDown =
      (
        event:
          KeyboardEvent
      ) => {
        if (
          event.key ===
          "Escape"
        ) {
          setIsOpen(
            false
          );
        }
      };


    window.addEventListener(
      "keydown",
      handleKeyDown
    );


    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isOpen,
  ]);


  /* =======================================================
     COUNTS

     Badge = number of active alert groups.

     Example:
     295 sweeping reports requiring action = 1 alert group,
     not badge "295".
  ======================================================= */

  const activeAlertCount =
    alerts.length;


  const criticalAlerts =
    alerts.filter(
      (alert) =>
        alert.severity ===
        "CRITICAL"
    );


  const warningAlerts =
    alerts.filter(
      (alert) =>
        alert.severity ===
        "WARNING"
    );


  const infoAlerts =
    alerts.filter(
      (alert) =>
        alert.severity ===
        "INFO"
    );


  const criticalItemCount =
    criticalAlerts.reduce(
      (
        total,
        alert
      ) =>
        total +
        alert.count,
      0
    );


  const warningItemCount =
    warningAlerts.reduce(
      (
        total,
        alert
      ) =>
        total +
        alert.count,
      0
    );


  /* =======================================================
     ROLE NOT SUPPORTED
  ======================================================= */

  if (
    !canUseAlerts
  ) {
    return null;
  }


  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      {/* ===================================================
          HEADER BELL BUTTON
      =================================================== */}

      <button
        type="button"
        onClick={() =>
          setIsOpen(
            true
          )
        }
        title="System Alerts"
        style={{
          minHeight:
            "40px",

          height:
            "40px",

          padding:
            showLabel
              ? "0 13px"
              : "0 11px",

          borderRadius:
            "12px",

          border:
            lightMode
              ? "1px solid #dbe4f0"
              : "1px solid rgba(255,255,255,0.15)",

          background:
            lightMode
              ? "#ffffff"
              : "rgba(255,255,255,0.08)",

          color:
            lightMode
              ? "#334155"
              : "#ffffff",

          display:
            "inline-flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          gap:
            "8px",

          cursor:
            "pointer",

          position:
            "relative",

          flexShrink:
            0,

          boxShadow:
            lightMode
              ? "0 3px 10px rgba(15,23,42,0.05)"
              : "none",

          transition:
            "all 0.2s ease",
        }}
      >
        <Bell
          size={17}
        />


        {showLabel && (
          <span
            style={{
              fontSize:
                "0.75rem",

              fontWeight:
                800,

              whiteSpace:
                "nowrap",
            }}
          >
            Alerts
          </span>
        )}


        {activeAlertCount >
          0 && (
          <span
            style={{
              position:
                showLabel
                  ? "static"
                  : "absolute",

              top:
                showLabel
                  ? undefined
                  : "-6px",

              right:
                showLabel
                  ? undefined
                  : "-6px",

              minWidth:
                "20px",

              height:
                "20px",

              padding:
                "0 5px",

              borderRadius:
                "999px",

              backgroundColor:
                "#dc2626",

              color:
                "#ffffff",

              border:
                "2px solid #ffffff",

              display:
                "inline-flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              fontSize:
                "0.62rem",

              lineHeight:
                1,

              fontWeight:
                900,
            }}
          >
            {activeAlertCount >
            99
              ? "99+"
              : activeAlertCount}
          </span>
        )}
      </button>


      {/* ===================================================
          MODAL
      =================================================== */}

      {isOpen && (
        <div
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setIsOpen(
                false
              );
            }
          }}
          style={{
            position:
              "fixed",

            inset:
              0,

            zIndex:
              9999,

            backgroundColor:
              "rgba(15,23,42,0.48)",

            backdropFilter:
              "blur(5px)",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            padding:
              "12px",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="System Alerts"
            style={{
              width:
                "min(620px, calc(100vw - 24px))",

              maxHeight:
                "min(720px, 84vh)",

              backgroundColor:
                "#ffffff",

              border:
                "1px solid #dbe4f0",

              borderRadius:
                "22px",

              boxShadow:
                "0 30px 80px rgba(15,23,42,0.25)",

              overflow:
                "hidden",

              display:
                "flex",

              flexDirection:
                "column",
            }}
          >

            {/* =============================================
                MODAL HEADER
            ============================================= */}

            <div
              style={{
                padding:
                  "18px 20px",

                borderBottom:
                  "1px solid #e2e8f0",

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                gap:
                  "14px",

                flexShrink:
                  0,

                background:
                  "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    "12px",

                  minWidth:
                    0,
                }}
              >
                <div
                  style={{
                    width:
                      "42px",

                    height:
                      "42px",

                    borderRadius:
                      "13px",

                    backgroundColor:
                      activeAlertCount >
                      0
                        ? "#fef2f2"
                        : "#f0fdf4",

                    border:
                      activeAlertCount >
                      0
                        ? "1px solid #fecaca"
                        : "1px solid #bbf7d0",

                    color:
                      activeAlertCount >
                      0
                        ? "#dc2626"
                        : "#16a34a",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    flexShrink:
                      0,
                  }}
                >
                  <Bell
                    size={19}
                  />
                </div>


                <div
                  style={{
                    minWidth:
                      0,
                  }}
                >
                  <h2
                    style={{
                      margin:
                        0,

                      color:
                        "#0f172a",

                      fontSize:
                        "1rem",

                      fontWeight:
                        900,

                      lineHeight:
                        1.25,
                    }}
                  >
                    System Alerts
                  </h2>


                  <p
                    style={{
                      margin:
                        "3px 0 0",

                      color:
                        "#64748b",

                      fontSize:
                        "0.72rem",

                      lineHeight:
                        1.35,

                      fontWeight:
                        600,
                    }}
                  >
                    {isSuperAdmin
                      ? "Operational alerts across active cities and enabled modules."
                      : `Operational alerts${
                          user?.city
                            ?.name
                            ? ` for ${user.city.name}`
                            : ""
                        }.`}
                  </p>
                </div>
              </div>


              <button
                type="button"
                onClick={() =>
                  setIsOpen(
                    false
                  )
                }
                aria-label="Close alerts"
                style={{
                  width:
                    "36px",

                  height:
                    "36px",

                  borderRadius:
                    "10px",

                  border:
                    "1px solid #e2e8f0",

                  backgroundColor:
                    "#ffffff",

                  color:
                    "#64748b",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  cursor:
                    "pointer",

                  flexShrink:
                    0,
                }}
              >
                <X
                  size={18}
                />
              </button>
            </div>


            {/* =============================================
                MODAL BODY
            ============================================= */}

            <div
              style={{
                overflowY:
                  "auto",

                padding:
                  "18px 20px",

                flex:
                  1,

                minHeight:
                  0,
              }}
            >

              {/* ===========================================
                  LOADING
              =========================================== */}

              {loading &&
              alerts.length ===
                0 ? (
                <div
                  style={{
                    minHeight:
                      "260px",

                    display:
                      "flex",

                    flexDirection:
                      "column",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    gap:
                      "12px",

                    color:
                      "#64748b",
                  }}
                >
                  <RefreshCw
                    size={24}
                    className="system-alert-spin"
                  />

                  <span
                    style={{
                      fontSize:
                        "0.8rem",

                      fontWeight:
                        700,
                    }}
                  >
                    Loading system
                    alerts...
                  </span>
                </div>
              ) : loadError ? (

                /* =========================================
                   ERROR
                ========================================= */

                <div
                  style={{
                    border:
                      "1px solid #fecaca",

                    backgroundColor:
                      "#fef2f2",

                    borderRadius:
                      "14px",

                    padding:
                      "18px",

                    textAlign:
                      "center",
                  }}
                >
                  <AlertTriangle
                    size={22}
                    color="#dc2626"
                  />

                  <div
                    style={{
                      marginTop:
                        "8px",

                      color:
                        "#991b1b",

                      fontSize:
                        "0.82rem",

                      fontWeight:
                        800,
                    }}
                  >
                    Unable to load
                    system alerts.
                  </div>


                  <button
                    type="button"
                    onClick={
                      loadAlerts
                    }
                    style={{
                      marginTop:
                        "12px",

                      height:
                        "34px",

                      padding:
                        "0 12px",

                      borderRadius:
                        "9px",

                      border:
                        "1px solid #fecaca",

                      backgroundColor:
                        "#ffffff",

                      color:
                        "#dc2626",

                      fontSize:
                        "0.72rem",

                      fontWeight:
                        800,

                      cursor:
                        "pointer",
                    }}
                  >
                    Try Again
                  </button>
                </div>

              ) : activeAlertCount ===
                0 ? (

                /* =========================================
                   ALL CLEAR
                ========================================= */

                <div
                  style={{
                    minHeight:
                      "260px",

                    display:
                      "flex",

                    flexDirection:
                      "column",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    textAlign:
                      "center",

                    padding:
                      "20px",
                  }}
                >
                  <div
                    style={{
                      width:
                        "54px",

                      height:
                        "54px",

                      borderRadius:
                        "17px",

                      backgroundColor:
                        "#f0fdf4",

                      border:
                        "1px solid #bbf7d0",

                      color:
                        "#16a34a",

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",
                    }}
                  >
                    <Bell
                      size={23}
                    />
                  </div>


                  <h3
                    style={{
                      margin:
                        "14px 0 4px",

                      fontSize:
                        "0.95rem",

                      fontWeight:
                        900,

                      color:
                        "#0f172a",
                    }}
                  >
                    All Clear
                  </h3>


                  <p
                    style={{
                      margin:
                        0,

                      maxWidth:
                        "360px",

                      color:
                        "#64748b",

                      fontSize:
                        "0.75rem",

                      fontWeight:
                        600,

                      lineHeight:
                        1.5,
                    }}
                  >
                    No active action
                    required or pending
                    inspection alerts were
                    found.
                  </p>
                </div>

              ) : (
                <>

                  {/* =======================================
                      SUMMARY
                  ======================================= */}

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",

                      gap:
                        "10px",

                      marginBottom:
                        "16px",
                    }}
                  >

                    {/* CRITICAL */}

                    <div
                      style={{
                        border:
                          "1px solid #fecaca",

                        backgroundColor:
                          "#fff7f7",

                        borderRadius:
                          "14px",

                        padding:
                          "12px 14px",

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "space-between",

                        gap:
                          "10px",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "center",

                          gap:
                            "9px",
                        }}
                      >
                        <CircleAlert
                          size={17}
                          color="#dc2626"
                        />

                        <div>
                          <div
                            style={{
                              fontSize:
                                "0.68rem",

                              fontWeight:
                                900,

                              color:
                                "#991b1b",

                              textTransform:
                                "uppercase",

                              letterSpacing:
                                "0.04em",
                            }}
                          >
                            Critical
                          </div>

                          <div
                            style={{
                              marginTop:
                                "2px",

                              fontSize:
                                "0.68rem",

                              color:
                                "#b91c1c",

                              fontWeight:
                                600,
                            }}
                          >
                            Action required
                          </div>
                        </div>
                      </div>


                      <strong
                        style={{
                          color:
                            "#dc2626",

                          fontSize:
                            "1.15rem",

                          fontWeight:
                            900,
                        }}
                      >
                        {
                          criticalItemCount
                        }
                      </strong>
                    </div>


                    {/* WARNING */}

                    <div
                      style={{
                        border:
                          "1px solid #fed7aa",

                        backgroundColor:
                          "#fffaf5",

                        borderRadius:
                          "14px",

                        padding:
                          "12px 14px",

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "space-between",

                        gap:
                          "10px",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "center",

                          gap:
                            "9px",
                        }}
                      >
                        <AlertTriangle
                          size={17}
                          color="#ea580c"
                        />

                        <div>
                          <div
                            style={{
                              fontSize:
                                "0.68rem",

                              fontWeight:
                                900,

                              color:
                                "#9a3412",

                              textTransform:
                                "uppercase",

                              letterSpacing:
                                "0.04em",
                            }}
                          >
                            Pending
                          </div>

                          <div
                            style={{
                              marginTop:
                                "2px",

                              fontSize:
                                "0.68rem",

                              color:
                                "#c2410c",

                              fontWeight:
                                600,
                            }}
                          >
                            Awaiting review
                          </div>
                        </div>
                      </div>


                      <strong
                        style={{
                          color:
                            "#ea580c",

                          fontSize:
                            "1.15rem",

                          fontWeight:
                            900,
                        }}
                      >
                        {
                          warningItemCount
                        }
                      </strong>
                    </div>
                  </div>


                  {/* =======================================
                      CRITICAL ALERTS
                  ======================================= */}

                  {criticalAlerts.length >
                    0 && (
                    <AlertSection
                      title="Critical Action Items"
                      severity="CRITICAL"
                      alerts={
                        criticalAlerts
                      }
                      onOpen={(
                        alert
                      ) => {
                        setIsOpen(
                          false
                        );

                        router.push(
                          alert.href
                        );
                      }}
                    />
                  )}


                  {/* =======================================
                      WARNING ALERTS
                  ======================================= */}

                  {warningAlerts.length >
                    0 && (
                    <AlertSection
                      title="Pending Attention"
                      severity="WARNING"
                      alerts={
                        warningAlerts
                      }
                      onOpen={(
                        alert
                      ) => {
                        setIsOpen(
                          false
                        );

                        router.push(
                          alert.href
                        );
                      }}
                    />
                  )}


                  {/* =======================================
                      INFORMATION
                  ======================================= */}

                  {infoAlerts.length >
                    0 && (
                    <AlertSection
                      title="Information"
                      severity="INFO"
                      alerts={
                        infoAlerts
                      }
                      onOpen={(
                        alert
                      ) => {
                        setIsOpen(
                          false
                        );

                        router.push(
                          alert.href
                        );
                      }}
                    />
                  )}
                </>
              )}
            </div>


            {/* =============================================
                FOOTER
            ============================================= */}

            <div
              style={{
                padding:
                  "12px 20px",

                borderTop:
                  "1px solid #e2e8f0",

                backgroundColor:
                  "#f8fafc",

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                gap:
                  "12px",

                flexWrap:
                  "wrap",

                flexShrink:
                  0,
              }}
            >
              <div
                style={{
                  color:
                    "#94a3b8",

                  fontSize:
                    "0.65rem",

                  fontWeight:
                    700,
                }}
              >
                {lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString(
                      "en-IN",
                      {
                        hour:
                          "2-digit",
                        minute:
                          "2-digit",
                        hour12:
                          true,
                      }
                    )}`
                  : "Waiting for update"}
              </div>


              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    "8px",
                }}
              >
                <button
                  type="button"
                  onClick={
                    loadAlerts
                  }
                  disabled={
                    loading
                  }
                  style={{
                    height:
                      "36px",

                    padding:
                      "0 13px",

                    borderRadius:
                      "10px",

                    border:
                      "1px solid #cbd5e1",

                    backgroundColor:
                      "#ffffff",

                    color:
                      "#475569",

                    display:
                      "inline-flex",

                    alignItems:
                      "center",

                    gap:
                      "7px",

                    fontSize:
                      "0.72rem",

                    fontWeight:
                      800,

                    cursor:
                      loading
                        ? "not-allowed"
                        : "pointer",

                    opacity:
                      loading
                        ? 0.7
                        : 1,
                  }}
                >
                  <RefreshCw
                    size={14}
                    className={
                      loading
                        ? "system-alert-spin"
                        : ""
                    }
                  />

                  Refresh
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setIsOpen(
                      false
                    )
                  }
                  style={{
                    height:
                      "36px",

                    padding:
                      "0 15px",

                    borderRadius:
                      "10px",

                    border:
                      "none",

                    backgroundColor:
                      "#0f172a",

                    color:
                      "#ffffff",

                    fontSize:
                      "0.72rem",

                    fontWeight:
                      800,

                    cursor:
                      "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      <style jsx>{`
        .system-alert-spin {
          animation: system-alert-spin 0.8s
            linear infinite;
        }

        @keyframes system-alert-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 540px) {
          .system-alert-summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}


/* =========================================================
   ALERT SECTION
========================================================= */

function AlertSection({
  title,
  severity,
  alerts,
  onOpen,
}: {
  title: string;

  severity:
    AlertSeverity;

  alerts:
    SystemAlertItem[];

  onOpen:
    (
      alert:
        SystemAlertItem
    ) => void;
}) {
  const config =
    severity ===
    "CRITICAL"
      ? {
          dot:
            "#dc2626",

          border:
            "#fecaca",

          background:
            "#fffafa",

          title:
            "#991b1b",
        }

      : severity ===
        "WARNING"
      ? {
          dot:
            "#ea580c",

          border:
            "#fed7aa",

          background:
            "#fffdf9",

          title:
            "#9a3412",
        }

      : {
          dot:
            "#2563eb",

          border:
            "#bfdbfe",

          background:
            "#f8fbff",

          title:
            "#1d4ed8",
        };


  return (
    <div
      style={{
        marginTop:
          "16px",
      }}
    >
      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          gap:
            "7px",

          marginBottom:
            "9px",

          color:
            config.title,

          fontSize:
            "0.7rem",

          fontWeight:
            900,

          textTransform:
            "uppercase",

          letterSpacing:
            "0.05em",
        }}
      >
        <span
          style={{
            width:
              "7px",

            height:
              "7px",

            borderRadius:
              "50%",

            backgroundColor:
              config.dot,

            flexShrink:
              0,
          }}
        />

        {title}
      </div>


      <div
        style={{
          display:
            "flex",

          flexDirection:
            "column",

          gap:
            "9px",
        }}
      >
        {alerts.map(
          (alert) => (
            <div
              key={
                alert.id
              }
              style={{
                border:
                  `1px solid ${config.border}`,

                backgroundColor:
                  config.background,

                borderRadius:
                  "14px",

                padding:
                  "13px 14px",

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                gap:
                  "14px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "flex-start",

                  gap:
                    "11px",

                  minWidth:
                    0,

                  flex:
                    1,
                }}
              >
                <div
                  style={{
                    width:
                      "36px",

                    height:
                      "36px",

                    borderRadius:
                      "10px",

                    backgroundColor:
                      "#ffffff",

                    border:
                      `1px solid ${config.border}`,

                    color:
                      config.dot,

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    flexShrink:
                      0,
                  }}
                >
                  {getModuleIcon(
                    alert.moduleKey
                  )}
                </div>


                <div
                  style={{
                    minWidth:
                      0,
                  }}
                >
                  <div
                    style={{
                      color:
                        "#0f172a",

                      fontSize:
                        "0.77rem",

                      fontWeight:
                        900,

                      lineHeight:
                        1.3,
                    }}
                  >
                    {
                      alert.moduleName
                    }
                  </div>


                  {alert.cityName && (
                    <div
                      style={{
                        marginTop:
                          "2px",

                        color:
                          "#64748b",

                        fontSize:
                          "0.64rem",

                        fontWeight:
                          800,
                      }}
                    >
                      {
                        alert.cityName
                      }
                    </div>
                  )}


                  <div
                    style={{
                      marginTop:
                        "5px",

                      color:
                        "#334155",

                      fontSize:
                        "0.73rem",

                      fontWeight:
                        800,

                      lineHeight:
                        1.4,
                    }}
                  >
                    {
                      alert.title
                    }
                  </div>


                  <div
                    style={{
                      marginTop:
                        "3px",

                      color:
                        "#64748b",

                      fontSize:
                        "0.67rem",

                      fontWeight:
                        500,

                      lineHeight:
                        1.45,
                    }}
                  >
                    {
                      alert.description
                    }
                  </div>
                </div>
              </div>


              <button
                type="button"
                onClick={() =>
                  onOpen(
                    alert
                  )
                }
                style={{
                  height:
                    "32px",

                  padding:
                    "0 10px",

                  borderRadius:
                    "9px",

                  border:
                    `1px solid ${config.border}`,

                  backgroundColor:
                    "#ffffff",

                  color:
                    config.title,

                  display:
                    "inline-flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  gap:
                    "4px",

                  fontSize:
                    "0.67rem",

                  fontWeight:
                    900,

                  cursor:
                    "pointer",

                  whiteSpace:
                    "nowrap",

                  flexShrink:
                    0,
                }}
              >
                View

                <ChevronRight
                  size={13}
                />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
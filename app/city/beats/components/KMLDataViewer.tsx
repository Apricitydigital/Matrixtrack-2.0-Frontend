"use client";

import React from "react";
import { createPortal } from "react-dom";
import {
    X,
    MapPin,
    User,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    Route,
    CalendarDays,
    Navigation,
} from "lucide-react";


interface KMLDataViewerProps {
    beat: any;
    onClose: () => void;
}


export default function KMLDataViewer({
    beat,
    onClose,
}: KMLDataViewerProps) {

    /* =========================================================
       BASIC DATA
    ========================================================= */

    const points =
        Array.isArray(beat?.points)
            ? beat.points
            : [];


    const supervisorName =
        beat?.supervisorsSummary?.[0]?.name ||
        beat?.assignedToName ||
        beat?.segments?.find(
            (segment: any) =>
                segment?.supervisorAssignedToName
        )?.supervisorAssignedToName ||
        null;


    const employeeName =
        beat?.employeesSummary?.[0]?.name ||
        beat?.segments?.find(
            (segment: any) =>
                segment?.employeeAssignedToName
        )?.employeeAssignedToName ||
        null;


    const geometryType =
        beat?.geometry?.type ||
        "Not available";


    const isConfigured =
        !!supervisorName &&
        !!employeeName &&
        points.length === 5;


    const createdAt =
        beat?.createdAt
            ? new Date(
                beat.createdAt
            ).toLocaleString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                }
            )
            : "-";


    /* =========================================================
       POINT VALUE HELPERS
    ========================================================= */

    const getLatitude = (
        point: any
    ) =>
        point?.latitude ??
        point?.lat ??
        "-";


    const getLongitude = (
        point: any
    ) =>
        point?.longitude ??
        point?.lng ??
        point?.lon ??
        "-";


    /* =========================================================
       SMALL INFO CARD
    ========================================================= */

    const InfoCard = ({
        label,
        value,
        icon,
    }: {
        label: string;
        value: React.ReactNode;
        icon: React.ReactNode;
    }) => (
        <div
            style={{
                border:
                    "1px solid #e2e8f0",

                borderRadius:
                    "14px",

                padding:
                    "14px",

                backgroundColor:
                    "#ffffff",

                display:
                    "flex",

                alignItems:
                    "flex-start",

                gap:
                    "11px",

                minWidth:
                    0,
            }}
        >
            <div
                style={{
                    width:
                        "34px",

                    height:
                        "34px",

                    borderRadius:
                        "10px",

                    backgroundColor:
                        "#eff6ff",

                    color:
                        "#2563eb",

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
                {icon}
            </div>

            <div
                style={{
                    minWidth:
                        0,
                }}
            >
                <div
                    style={{
                        fontSize:
                            "0.68rem",

                        fontWeight:
                            800,

                        color:
                            "#94a3b8",

                        textTransform:
                            "uppercase",

                        letterSpacing:
                            "0.05em",

                        marginBottom:
                            "3px",
                    }}
                >
                    {label}
                </div>

                <div
                    style={{
                        fontSize:
                            "0.87rem",

                        fontWeight:
                            700,

                        color:
                            "#0f172a",

                        wordBreak:
                            "break-word",
                    }}
                >
                    {value || "-"}
                </div>
            </div>
        </div>
    );

    if (typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            className="beat-details-overlay"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 99999,

                backgroundColor:
                    "rgba(15, 23, 42, 0.58)",

                backdropFilter:
                    "blur(5px)",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                padding: "16px",
                overflow: "hidden",
            }}
            onClick={onClose}
        >
            <div
                className="beat-details-shell"
                style={{
                    width: "100%",
                    maxWidth: "820px",

                    height:
                        "min(820px, calc(100dvh - 32px))",

                    maxHeight:
                        "calc(100dvh - 32px)",

                    minHeight: 0,

                    backgroundColor: "#ffffff",

                    borderRadius: "20px",

                    overflow: "hidden",

                    display: "flex",
                    flexDirection: "column",

                    border:
                        "1px solid #e2e8f0",

                    boxShadow:
                        "0 24px 60px rgba(15,23,42,0.28)",
                }}
                onClick={(e) =>
                    e.stopPropagation()
                }
            >

                {/* =================================================
                    HEADER
                ================================================= */}

                <div
                    style={{
                        padding:
                            "20px 22px",

                        borderBottom:
                            "1px solid #e2e8f0",

                        display:
                            "flex",

                        justifyContent:
                            "space-between",

                        alignItems:
                            "center",

                        gap:
                            "14px",

                        backgroundColor:
                            "#ffffff",
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
                                    "12px",

                                backgroundColor:
                                    "#eff6ff",

                                color:
                                    "#2563eb",

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
                            <Route
                                size={
                                    21
                                }
                            />
                        </div>

                        <div
                            style={{
                                minWidth:
                                    0,
                            }}
                        >
                            <div
                                style={{
                                    fontSize:
                                        "0.67rem",

                                    color:
                                        "#2563eb",

                                    fontWeight:
                                        900,

                                    textTransform:
                                        "uppercase",

                                    letterSpacing:
                                        "0.08em",
                                }}
                            >
                                Beat Details
                            </div>

                            <h3
                                style={{
                                    margin:
                                        "2px 0 0",

                                    fontSize:
                                        "1.2rem",

                                    fontWeight:
                                        900,

                                    color:
                                        "#0f172a",

                                    whiteSpace:
                                        "nowrap",

                                    overflow:
                                        "hidden",

                                    textOverflow:
                                        "ellipsis",
                                }}
                            >
                                {
                                    beat?.beatName ||
                                    "Unnamed Beat"
                                }
                            </h3>
                        </div>
                    </div>


                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        style={{
                            width:
                                "38px",

                            height:
                                "38px",

                            borderRadius:
                                "11px",

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
                            size={
                                18
                            }
                        />
                    </button>
                </div>


                {/* =================================================
                    BODY
                ================================================= */}

                <div
                    style={{
                        flex:
                            1,

                        overflowY:
                            "auto",

                        padding:
                            "20px",
                    }}
                >

                    {/* STATUS */}

                    <div
                        style={{
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

                            padding:
                                "14px 16px",

                            borderRadius:
                                "14px",

                            backgroundColor:
                                isConfigured
                                    ? "#ecfdf5"
                                    : "#fff7ed",

                            border:
                                isConfigured
                                    ? "1px solid #a7f3d0"
                                    : "1px solid #fed7aa",

                            marginBottom:
                                "18px",
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize:
                                        "0.7rem",

                                    fontWeight:
                                        800,

                                    color:
                                        "#64748b",

                                    textTransform:
                                        "uppercase",

                                    letterSpacing:
                                        "0.05em",
                                }}
                            >
                                Configuration Status
                            </div>

                            <div
                                style={{
                                    marginTop:
                                        "3px",

                                    fontSize:
                                        "0.9rem",

                                    fontWeight:
                                        800,

                                    color:
                                        isConfigured
                                            ? "#047857"
                                            : "#c2410c",
                                }}
                            >
                                {isConfigured
                                    ? "Beat configuration completed"
                                    : "Beat configuration requires attention"}
                            </div>
                        </div>


                        <div
                            style={{
                                display:
                                    "inline-flex",

                                alignItems:
                                    "center",

                                gap:
                                    "6px",

                                padding:
                                    "6px 11px",

                                borderRadius:
                                    "999px",

                                backgroundColor:
                                    "#ffffff",

                                color:
                                    isConfigured
                                        ? "#047857"
                                        : "#c2410c",

                                fontSize:
                                    "0.75rem",

                                fontWeight:
                                    900,
                            }}
                        >
                            {isConfigured ? (
                                <CheckCircle2
                                    size={
                                        15
                                    }
                                />
                            ) : (
                                <AlertTriangle
                                    size={
                                        15
                                    }
                                />
                            )}

                            {isConfigured
                                ? "Configured"
                                : "Needs Setup"}
                        </div>
                    </div>


                    {/* LOCATION */}

                    <div
                        style={{
                            marginBottom:
                                "20px",
                        }}
                    >
                        <h4
                            style={{
                                margin:
                                    "0 0 10px",

                                fontSize:
                                    "0.78rem",

                                fontWeight:
                                    900,

                                color:
                                    "#475569",

                                textTransform:
                                    "uppercase",

                                letterSpacing:
                                    "0.05em",
                            }}
                        >
                            Location
                        </h4>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(180px, 1fr))",

                                gap:
                                    "10px",
                            }}
                        >
                            <InfoCard
                                label="Zone"
                                value={
                                    beat?.zoneName
                                }
                                icon={
                                    <MapPin
                                        size={
                                            17
                                        }
                                    />
                                }
                            />

                            <InfoCard
                                label="Ward"
                                value={
                                    beat?.wardName
                                }
                                icon={
                                    <MapPin
                                        size={
                                            17
                                        }
                                    />
                                }
                            />

                            <InfoCard
                                label="Area"
                                value={
                                    beat?.areaName
                                }
                                icon={
                                    <MapPin
                                        size={
                                            17
                                        }
                                    />
                                }
                            />
                        </div>
                    </div>


                    {/* ASSIGNMENT */}

                    <div
                        style={{
                            marginBottom:
                                "20px",
                        }}
                    >
                        <h4
                            style={{
                                margin:
                                    "0 0 10px",

                                fontSize:
                                    "0.78rem",

                                fontWeight:
                                    900,

                                color:
                                    "#475569",

                                textTransform:
                                    "uppercase",

                                letterSpacing:
                                    "0.05em",
                            }}
                        >
                            Assignment
                        </h4>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(220px, 1fr))",

                                gap:
                                    "10px",
                            }}
                        >
                            <InfoCard
                                label="Employee"
                                value={
                                    employeeName ||
                                    "Not assigned"
                                }
                                icon={
                                    <User
                                        size={
                                            17
                                        }
                                    />
                                }
                            />

                            <InfoCard
                                label="Supervisor"
                                value={
                                    supervisorName ||
                                    "Not assigned"
                                }
                                icon={
                                    <ShieldCheck
                                        size={
                                            17
                                        }
                                    />
                                }
                            />
                        </div>
                    </div>


                    {/* BEAT INFORMATION */}

                    <div
                        style={{
                            marginBottom:
                                "20px",
                        }}
                    >
                        <h4
                            style={{
                                margin:
                                    "0 0 10px",

                                fontSize:
                                    "0.78rem",

                                fontWeight:
                                    900,

                                color:
                                    "#475569",

                                textTransform:
                                    "uppercase",

                                letterSpacing:
                                    "0.05em",
                            }}
                        >
                            Beat Information
                        </h4>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(180px, 1fr))",

                                gap:
                                    "10px",
                            }}
                        >
                            <InfoCard
                                label="Geometry"
                                value={
                                    geometryType
                                }
                                icon={
                                    <Navigation
                                        size={
                                            17
                                        }
                                    />
                                }
                            />

                            <InfoCard
                                label="Configured Points"
                                value={`${points.length}/5`}
                                icon={
                                    <MapPin
                                        size={
                                            17
                                        }
                                    />
                                }
                            />

                            <InfoCard
                                label="Created On"
                                value={
                                    createdAt
                                }
                                icon={
                                    <CalendarDays
                                        size={
                                            17
                                        }
                                    />
                                }
                            />
                        </div>
                    </div>


                    {/* =================================================
                        5 POINT CONFIGURATION
                    ================================================= */}

                    <div>
                        <div
                            style={{
                                display:
                                    "flex",

                                alignItems:
                                    "center",

                                justifyContent:
                                    "space-between",

                                gap:
                                    "10px",

                                marginBottom:
                                    "10px",
                            }}
                        >
                            <h4
                                style={{
                                    margin:
                                        0,

                                    fontSize:
                                        "0.78rem",

                                    fontWeight:
                                        900,

                                    color:
                                        "#475569",

                                    textTransform:
                                        "uppercase",

                                    letterSpacing:
                                        "0.05em",
                                }}
                            >
                                5 Point Configuration
                            </h4>

                            <span
                                style={{
                                    padding:
                                        "4px 8px",

                                    borderRadius:
                                        "999px",

                                    backgroundColor:
                                        points.length === 5
                                            ? "#ecfdf5"
                                            : "#fff7ed",

                                    color:
                                        points.length === 5
                                            ? "#047857"
                                            : "#c2410c",

                                    fontSize:
                                        "0.7rem",

                                    fontWeight:
                                        900,
                                }}
                            >
                                {
                                    points.length
                                }
                                /5
                            </span>
                        </div>


                        {points.length === 0 ? (
                            <div
                                style={{
                                    border:
                                        "1px dashed #cbd5e1",

                                    borderRadius:
                                        "14px",

                                    padding:
                                        "26px",

                                    textAlign:
                                        "center",

                                    color:
                                        "#94a3b8",

                                    backgroundColor:
                                        "#f8fafc",
                                }}
                            >
                                <MapPin
                                    size={
                                        28
                                    }
                                    style={{
                                        margin:
                                            "0 auto 8px",
                                    }}
                                />

                                <div
                                    style={{
                                        fontSize:
                                            "0.82rem",

                                        fontWeight:
                                            700,
                                    }}
                                >
                                    No configured
                                    points found.
                                </div>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display:
                                        "grid",

                                    gap:
                                        "8px",
                                }}
                            >
                                {points.map(
                                    (
                                        point: any,
                                        index: number
                                    ) => (
                                        <div
                                            key={
                                                point?.code ||
                                                index
                                            }
                                            style={{
                                                display:
                                                    "grid",

                                                gridTemplateColumns:
                                                    "44px minmax(0,1fr)",

                                                alignItems:
                                                    "center",

                                                gap:
                                                    "12px",

                                                padding:
                                                    "11px 13px",

                                                border:
                                                    "1px solid #e2e8f0",

                                                borderRadius:
                                                    "12px",

                                                backgroundColor:
                                                    "#ffffff",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width:
                                                        "40px",

                                                    height:
                                                        "40px",

                                                    borderRadius:
                                                        "11px",

                                                    backgroundColor:
                                                        "#eff6ff",

                                                    color:
                                                        "#2563eb",

                                                    display:
                                                        "flex",

                                                    alignItems:
                                                        "center",

                                                    justifyContent:
                                                        "center",

                                                    fontSize:
                                                        "0.76rem",

                                                    fontWeight:
                                                        900,
                                                }}
                                            >
                                                {point?.code ||
                                                    `P${index + 1}`}
                                            </div>


                                            <div
                                                style={{
                                                    minWidth:
                                                        0,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize:
                                                            "0.82rem",

                                                        fontWeight:
                                                            800,

                                                        color:
                                                            "#0f172a",

                                                        marginBottom:
                                                            "4px",
                                                    }}
                                                >
                                                    {point?.name ||
                                                        `Point ${index + 1}`}
                                                </div>


                                                <div
                                                    style={{
                                                        display:
                                                            "flex",

                                                        flexWrap:
                                                            "wrap",

                                                        gap:
                                                            "6px 14px",

                                                        fontSize:
                                                            "0.73rem",

                                                        color:
                                                            "#64748b",
                                                    }}
                                                >
                                                    <span>
                                                        Lat:{" "}
                                                        <strong
                                                            style={{
                                                                color:
                                                                    "#334155",
                                                            }}
                                                        >
                                                            {
                                                                getLatitude(
                                                                    point
                                                                )
                                                            }
                                                        </strong>
                                                    </span>

                                                    <span>
                                                        Lng:{" "}
                                                        <strong
                                                            style={{
                                                                color:
                                                                    "#334155",
                                                            }}
                                                        >
                                                            {
                                                                getLongitude(
                                                                    point
                                                                )
                                                            }
                                                        </strong>
                                                    </span>

                                                    {point?.type && (
                                                        <span>
                                                            Type:{" "}
                                                            <strong
                                                                style={{
                                                                    color:
                                                                        "#334155",
                                                                }}
                                                            >
                                                                {
                                                                    point.type
                                                                }
                                                            </strong>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>


                {/* =================================================
                    FOOTER
                ================================================= */}

                <div
                    style={{
                        padding:
                            "14px 20px",

                        borderTop:
                            "1px solid #e2e8f0",

                        backgroundColor:
                            "#f8fafc",

                        display:
                            "flex",

                        justifyContent:
                            "flex-end",
                    }}
                >
                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        style={{
                            minWidth:
                                "100px",

                            height:
                                "38px",

                            padding:
                                "0 18px",

                            borderRadius:
                                "10px",

                            border:
                                "1px solid #cbd5e1",

                            backgroundColor:
                                "#ffffff",

                            color:
                                "#334155",

                            fontWeight:
                                800,

                            fontSize:
                                "0.78rem",

                            cursor:
                                "pointer",
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
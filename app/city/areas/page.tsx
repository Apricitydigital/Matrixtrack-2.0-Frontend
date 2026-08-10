"use client";

import React, {
  useState,
  useEffect,
  useCallback,
} from "react";

import AreaForm from "./components/AreaForm";

import { apiFetch } from "@lib/apiClient";

import {
  MapPin,
  Plus,
  X,
  Search,
} from "lucide-react";

import { useAuth } from "@hooks/useAuth";
import { TableExportDropdown } from "@components/ui/TableExportDropdown";
import { RoleGuard } from "@components/Guards";


export default function AreasPage() {
  const { user } = useAuth();

  const isReadOnly =
    user?.roles?.some((r) =>
      [
        "COMMISSIONER",
        "ULB_OFFICER",
      ].includes(r)
    );


  /* =========================================================
     AREA DATA
  ========================================================= */

  const [areas, setAreas] =
    useState<any[]>([]);

  const [wards, setWards] =
    useState<any[]>([]);

  const [zones, setZones] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);


  /* =========================================================
     UI STATE
  ========================================================= */

  const [
    showCreateArea,
    setShowCreateArea,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");


  /* =========================================================
     DELETE AREA
  ========================================================= */

  const [
    deleteAreaTarget,
    setDeleteAreaTarget,
  ] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [
    deletingAreaId,
    setDeletingAreaId,
  ] = useState<string | null>(
    null
  );


  /* =========================================================
     LOAD AREAS + WARDS + ZONES
     EXISTING GEO APIs ONLY
  ========================================================= */

  const loadAreas =
    useCallback(async () => {
      try {
        setLoading(true);

        const [
          areaResult,
          wardResult,
          zoneResult,
        ] =
          await Promise.allSettled([
            apiFetch<{
              nodes: any[];
            }>(
              "/city/geo?level=AREA"
            ),

            apiFetch<{
              nodes: any[];
            }>(
              "/city/geo?level=WARD"
            ),

            apiFetch<{
              nodes: any[];
            }>(
              "/city/geo?level=ZONE"
            ),
          ]);


        if (
          areaResult.status ===
          "fulfilled"
        ) {
          setAreas(
            areaResult.value?.nodes ||
              []
          );
        }


        if (
          wardResult.status ===
          "fulfilled"
        ) {
          setWards(
            wardResult.value?.nodes ||
              []
          );
        }


        if (
          zoneResult.status ===
          "fulfilled"
        ) {
          setZones(
            zoneResult.value?.nodes ||
              []
          );
        }

      } catch (err) {
        console.error(
          "Failed to load areas",
          err
        );
      } finally {
        setLoading(false);
      }
    }, []);


  useEffect(() => {
    loadAreas();
  }, [loadAreas]);


  /* =========================================================
     WARD MAP
  ========================================================= */

  const wardMap =
    React.useMemo(() => {
      return new Map(
        wards.map((ward) => [
          ward.id,
          ward,
        ])
      );
    }, [wards]);


  /* =========================================================
     ZONE MAP
  ========================================================= */

  const zoneMap =
    React.useMemo(() => {
      return new Map(
        zones.map((zone) => [
          zone.id,
          zone,
        ])
      );
    }, [zones]);


  /* =========================================================
     AREA TYPE FORMATTER
  ========================================================= */

  const formatAreaType = (
    value: any
  ) => {
    if (!value) return "-";

    return String(value)
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };


  /* =========================================================
     AREA + WARD + ZONE DATA
  ========================================================= */

  const enrichedAreas =
    React.useMemo(() => {
      return areas.map((area) => {

        /*
         * Area parent is normally Ward.
         */
        const ward =
          area.parentId
            ? wardMap.get(
                area.parentId
              )
            : null;


        /*
         * Ward parent is normally Zone.
         */
        const zone =
          ward?.parentId
            ? zoneMap.get(
                ward.parentId
              )
            : null;


        return {
          ...area,

          areaTypeLabel:
            formatAreaType(
              area.areaType ||
                area.type
            ),

          wardName:
            area.wardName ||
            area.ward?.name ||
            ward?.name ||
            "-",

          zoneName:
            area.zoneName ||
            area.zone?.name ||
            zone?.name ||
            "-",
        };
      });
    }, [
      areas,
      wardMap,
      zoneMap,
    ]);


  /* =========================================================
     SEARCH
  ========================================================= */

  const filteredAreas =
    React.useMemo(() => {
      if (!searchQuery.trim()) {
        return enrichedAreas;
      }

      const q =
        searchQuery
          .trim()
          .toLowerCase();

      return enrichedAreas.filter(
        (area) =>
          area.name
            ?.toLowerCase()
            .includes(q) ||

          area.id
            ?.toLowerCase()
            .includes(q) ||

          area.areaTypeLabel
            ?.toLowerCase()
            .includes(q) ||

          area.zoneName
            ?.toLowerCase()
            .includes(q) ||

          area.wardName
            ?.toLowerCase()
            .includes(q) ||

          user?.city?.name
            ?.toLowerCase()
            .includes(q)
      );
    }, [
      enrichedAreas,
      searchQuery,
      user?.city?.name,
    ]);


  /* =========================================================
     DELETE AREA
     SAME EXISTING API
  ========================================================= */

  const confirmDeleteArea =
    async () => {
      if (
        !deleteAreaTarget ||
        isReadOnly
      ) {
        return;
      }

      setDeletingAreaId(
        deleteAreaTarget.id
      );

      try {
        await apiFetch(
          `/city/geo/${deleteAreaTarget.id}`,
          {
            method: "DELETE",
          }
        );

        setDeleteAreaTarget(null);

        await loadAreas();

      } catch (err) {
        console.error(
          "Failed to delete area",
          err
        );

        alert(
          "Failed to delete area"
        );

      } finally {
        setDeletingAreaId(null);
      }
    };


  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <RoleGuard
      roles={[
        "CITY_ADMIN",
        "HMS_SUPER_ADMIN",
        "COMMISSIONER",
        "ULB_OFFICER",
      ]}
    >
      <div
        className="page"
        style={{
          padding: "28px 36px",
          backgroundColor:
            "#f8fafc",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            width: "100%",
          }}
        >

          {/* =================================================
              HEADER
          ================================================= */}

          <div
            style={{
              marginBottom: "28px",
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              justifyContent:
                "space-between",
              alignItems: "center",
              borderBottom:
                "1px solid #e2e8f0",
              paddingBottom: "16px",
            }}
          >

            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  display: "flex",
                  gap: "6px",
                  marginBottom: "4px",
                  fontWeight: 700,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.05em",
                }}
              >
                <span>
                  City Admin
                </span>

                <span>/</span>

                <span
                  style={{
                    color: "#3b82f6",
                  }}
                >
                  Areas
                </span>
              </div>


              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  letterSpacing:
                    "-0.01em",
                }}
              >
                Areas
              </h1>


              <p
                style={{
                  marginTop: "2px",
                  color: "#64748b",
                  fontSize:
                    "0.8125rem",
                  fontWeight: 500,
                }}
              >
                Manage registered
                city areas.
              </p>
            </div>


            {/* AREA ACTIONS */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >

              {/* EXPORT */}

              <TableExportDropdown
                data={filteredAreas.map(
                  (area, index) => ({
                    SrNo:
                      index + 1,

                    AreaName:
                      area.name ||
                      "-",

                    AreaType:
                      area.areaTypeLabel ||
                      "-",

                    CityName:
                      user?.city?.name ||
                      "Indore",

                    Zone:
                      area.zoneName ||
                      "-",

                    Ward:
                      area.wardName ||
                      "-",

                    CreatedOn:
                      area.createdAt
                        ? new Date(
                            area.createdAt
                          ).toLocaleDateString(
                            "en-GB"
                          )
                        : "-",
                  })
                )}
                filename="Registered_Areas"
                title="Registered Areas Report"
              />


              {/* CREATE AREA */}

              {!isReadOnly && (
                <button
                  onClick={() =>
                    setShowCreateArea(
                      true
                    )
                  }
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "6px",
                    height: "40px",
                    padding:
                      "0 16px",
                    borderRadius:
                      "10px",
                    backgroundColor:
                      "#3b82f6",
                    border: "none",
                    color: "white",
                    fontWeight: 700,
                    fontSize:
                      "0.8rem",
                    cursor:
                      "pointer",
                    transition:
                      "all 0.15s",
                    boxShadow:
                      "0 4px 12px rgba(59,130,246,0.2)",
                  }}
                >
                  <Plus
                    size={15}
                  />

                  Create Area
                </button>
              )}
            </div>
          </div>


          {/* =================================================
              TOTAL AREAS CARD
          ================================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(260px, 1fr)",
              maxWidth: "420px",
              gap: "16px",
              marginBottom:
                "24px",
            }}
          >
            <div
              style={{
                backgroundColor:
                  "white",
                padding:
                  "14px 18px",
                borderRadius:
                  "16px",
                border:
                  "1px solid #e2e8f0",
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "14px",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  backgroundColor:
                    "#eff6ff",
                  color:
                    "#2563eb",
                  width:
                    "42px",
                  height:
                    "42px",
                  borderRadius:
                    "12px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  border:
                    "1px solid #dbeafe",
                }}
              >
                <MapPin
                  size={20}
                />
              </div>


              <div>
                <div
                  style={{
                    fontSize:
                      "0.6875rem",
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
                  Total Registered Areas
                </div>

                <div
                  style={{
                    fontSize:
                      "1.2rem",
                    fontWeight:
                      900,
                    color:
                      "#0f172a",
                    lineHeight:
                      1.1,
                  }}
                >
                  {areas.length}
                </div>
              </div>
            </div>
          </div>


          {/* =================================================
              SEARCH
          ================================================= */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              alignItems:
                "center",
              gap: "16px",
              flexWrap:
                "wrap",
              marginBottom:
                "20px",
            }}
          >
            <div
              style={{
                position:
                  "relative",
                minWidth:
                  "300px",
              }}
            >
              <Search
                size={16}
                color="#94a3b8"
                style={{
                  position:
                    "absolute",
                  left: "12px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                }}
              />

              <input
                type="text"
                placeholder="Search areas, type, city, zone or ward..."
                value={
                  searchQuery
                }
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding:
                    "8px 12px 8px 36px",
                  borderRadius:
                    "12px",
                  border:
                    "1px solid #cbd5e1",
                  fontSize:
                    "0.8125rem",
                  fontWeight:
                    700,
                  outline:
                    "none",
                  backgroundColor:
                    "white",
                }}
              />
            </div>
          </div>


          {/* =================================================
              CREATE AREA MODAL
          ================================================= */}

          {!isReadOnly &&
            showCreateArea && (
              <div
                style={{
                  position:
                    "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor:
                    "rgba(15,23,42,0.4)",
                  backdropFilter:
                    "blur(4px)",
                  zIndex: 100,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  padding:
                    "24px",
                }}
              >
                <div
                  style={{
                    backgroundColor:
                      "white",
                    padding:
                      "32px",
                    borderRadius:
                      "24px",
                    border:
                      "1px solid #e2e8f0",
                    boxShadow:
                      "0 25px 50px -12px rgba(0,0,0,0.15)",
                    position:
                      "relative",
                    width:
                      "100%",
                    maxWidth:
                      "560px",
                    overflowY:
                      "auto",
                    maxHeight:
                      "90vh",
                  }}
                >
                  <button
                    onClick={() =>
                      setShowCreateArea(
                        false
                      )
                    }
                    style={{
                      position:
                        "absolute",
                      top:
                        "20px",
                      right:
                        "20px",
                      background:
                        "transparent",
                      border:
                        "none",
                      cursor:
                        "pointer",
                      color:
                        "#64748b",
                      zIndex:
                        2,
                    }}
                  >
                    <X
                      size={20}
                    />
                  </button>


                  <AreaForm
                    onSuccess={async () => {
                      await loadAreas();

                      setShowCreateArea(
                        false
                      );
                    }}
                  />
                </div>
              </div>
            )}


          {/* =================================================
              DELETE AREA CONFIRMATION
          ================================================= */}

          {deleteAreaTarget && (
            <div
              style={{
                position:
                  "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor:
                  "rgba(15,23,42,0.4)",
                backdropFilter:
                  "blur(4px)",
                zIndex:
                  110,
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                padding:
                  "24px",
              }}
            >
              <div
                style={{
                  backgroundColor:
                    "white",
                  borderRadius:
                    "20px",
                  border:
                    "1px solid #e2e8f0",
                  padding:
                    "28px",
                  maxWidth:
                    "420px",
                  width:
                    "100%",
                  boxShadow:
                    "0 20px 25px -5px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "1.1rem",
                    fontWeight:
                      900,
                    color:
                      "#0f172a",
                    marginBottom:
                      "8px",
                  }}
                >
                  Delete Area (
                  {
                    deleteAreaTarget.name
                  }
                  )?
                </div>


                <p
                  style={{
                    fontSize:
                      "0.85rem",
                    color:
                      "#64748b",
                    fontWeight:
                      600,
                    lineHeight:
                      1.5,
                    marginBottom:
                      "20px",
                  }}
                >
                  Are you sure you
                  want to delete this
                  area? This action
                  cannot be undone.
                </p>


                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "flex-end",
                    gap:
                      "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteAreaTarget(
                        null
                      )
                    }
                    style={{
                      padding:
                        "8px 16px",
                      borderRadius:
                        "10px",
                      border:
                        "1px solid #cbd5e1",
                      backgroundColor:
                        "white",
                      color:
                        "#475569",
                      fontSize:
                        "0.8125rem",
                      fontWeight:
                        700,
                      cursor:
                        "pointer",
                    }}
                  >
                    Cancel
                  </button>


                  <button
                    type="button"
                    onClick={
                      confirmDeleteArea
                    }
                    disabled={
                      deletingAreaId ===
                      deleteAreaTarget.id
                    }
                    style={{
                      padding:
                        "8px 18px",
                      borderRadius:
                        "10px",
                      border:
                        "none",
                      backgroundColor:
                        "#dc2626",
                      color:
                        "white",
                      fontSize:
                        "0.8125rem",
                      fontWeight:
                        800,
                      cursor:
                        "pointer",
                    }}
                  >
                    {deletingAreaId ===
                    deleteAreaTarget.id
                      ? "Deleting..."
                      : "Delete Area"}
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* =================================================
              REGISTERED AREAS
          ================================================= */}

          <section>
            {loading ? (
              <div
                style={{
                  padding:
                    "40px",
                  textAlign:
                    "center",
                  backgroundColor:
                    "white",
                  borderRadius:
                    "20px",
                  border:
                    "1px solid #e2e8f0",
                }}
              >
                <div
                  className="animate-spin"
                  style={{
                    width:
                      "32px",
                    height:
                      "32px",
                    border:
                      "4px solid #f3f3f3",
                    borderTop:
                      "4px solid #2563eb",
                    borderRadius:
                      "50%",
                    margin:
                      "0 auto",
                  }}
                />

                <p
                  style={{
                    marginTop:
                      "16px",
                    color:
                      "#64748b",
                    fontWeight:
                      600,
                  }}
                >
                  Loading areas...
                </p>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor:
                    "white",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius:
                    "20px",
                  overflow:
                    "hidden",
                  boxShadow:
                    "0 2px 4px rgba(0,0,0,0.02)",
                }}
              >

                {/* TABLE TITLE */}

                <div
                  style={{
                    padding:
                      "18px 24px",
                    borderBottom:
                      "1px solid #f1f5f9",
                    backgroundColor:
                      "#fcfdfe",
                  }}
                >
                  <h3
                    style={{
                      margin:
                        0,
                      fontSize:
                        "0.95rem",
                      fontWeight:
                        900,
                      color:
                        "#0f172a",
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.04em",
                    }}
                  >
                    Registered Areas (
                    {
                      filteredAreas.length
                    }
                    )
                  </h3>
                </div>


                <div
                  style={{
                    overflowX:
                      "auto",
                  }}
                >
                  <table
                    style={{
                      width:
                        "100%",
                      minWidth:
                        "1050px",
                      borderCollapse:
                        "collapse",
                      textAlign:
                        "left",
                    }}
                  >

                    {/* =========================================
                        TABLE HEADER
                    ========================================= */}

                    <thead
                      style={{
                        backgroundColor:
                          "#f8fafc",
                        borderBottom:
                          "1px solid #e2e8f0",
                      }}
                    >
                      <tr>

                        <th
                          style={
                            headerCell
                          }
                        >
                          Sr No
                        </th>


                        <th
                          style={
                            headerCell
                          }
                        >
                          Area Name
                        </th>


                        <th
                          style={
                            headerCell
                          }
                        >
                          Area Type
                        </th>


                        {/* CITY BEFORE ZONE */}

                        <th
                          style={
                            headerCell
                          }
                        >
                          City Name
                        </th>


                        <th
                          style={
                            headerCell
                          }
                        >
                          Zone
                        </th>


                        <th
                          style={
                            headerCell
                          }
                        >
                          Ward
                        </th>


                        <th
                          style={
                            headerCell
                          }
                        >
                          Registered On
                        </th>


                        <th
                          style={{
                            ...headerCell,
                            textAlign:
                              "right",
                          }}
                        >
                          Actions
                        </th>

                      </tr>
                    </thead>


                    {/* =========================================
                        TABLE BODY
                    ========================================= */}

                    <tbody>

                      {filteredAreas.length ===
                      0 ? (

                        <tr>
                          <td
                            colSpan={
                              8
                            }
                            style={{
                              padding:
                                "40px",
                              textAlign:
                                "center",
                              color:
                                "#94a3b8",
                              fontWeight:
                                600,
                            }}
                          >
                            No matching areas found.
                          </td>
                        </tr>

                      ) : (

                        filteredAreas.map(
                          (
                            area,
                            index
                          ) => {

                            const createdDate =
                              area.createdAt
                                ? new Date(
                                    area.createdAt
                                  ).toLocaleDateString(
                                    "en-GB",
                                    {
                                      day:
                                        "2-digit",
                                      month:
                                        "short",
                                      year:
                                        "numeric",
                                    }
                                  )
                                : "—";


                            const createdTime =
                              area.createdAt
                                ? new Date(
                                    area.createdAt
                                  ).toLocaleTimeString(
                                    "en-IN",
                                    {
                                      hour:
                                        "2-digit",
                                      minute:
                                        "2-digit",
                                      hour12:
                                        true,
                                    }
                                  )
                                : "";


                            return (
                              <tr
                                key={
                                  area.id
                                }
                                style={{
                                  borderBottom:
                                    "1px solid #f1f5f9",
                                }}
                              >

                                {/* SR NO */}

                                <td
                                  style={
                                    tableCell
                                  }
                                >
                                  {
                                    index +
                                    1
                                  }
                                </td>


                                {/* AREA NAME */}

                                <td
                                  style={{
                                    ...tableCell,
                                    fontSize:
                                      "0.875rem",
                                    fontWeight:
                                      800,
                                    color:
                                      "#0f172a",
                                  }}
                                >
                                  {
                                    area.name
                                  }
                                </td>


                                {/* AREA TYPE */}

                                <td
                                  style={
                                    tableCell
                                  }
                                >
                                  <span
                                    style={{
                                      display:
                                        "inline-flex",
                                      alignItems:
                                        "center",
                                      padding:
                                        "5px 9px",
                                      borderRadius:
                                        "999px",
                                      backgroundColor:
                                        "#eff6ff",
                                      border:
                                        "1px solid #dbeafe",
                                      color:
                                        "#2563eb",
                                      fontSize:
                                        "0.7rem",
                                      fontWeight:
                                        800,
                                      whiteSpace:
                                        "nowrap",
                                    }}
                                  >
                                    {
                                      area.areaTypeLabel ||
                                      "-"
                                    }
                                  </span>
                                </td>


                                {/* CITY */}

                                <td
                                  style={{
                                    ...tableCell,
                                    fontWeight:
                                      700,
                                    color:
                                      "#334155",
                                  }}
                                >
                                  {user
                                    ?.city
                                    ?.name ||
                                    "Indore"}
                                </td>


                                {/* ZONE */}

                                <td
                                  style={{
                                    ...tableCell,
                                    fontWeight:
                                      700,
                                    color:
                                      "#334155",
                                  }}
                                >
                                  {
                                    area.zoneName ||
                                    "-"
                                  }
                                </td>


                                {/* WARD */}

                                <td
                                  style={{
                                    ...tableCell,
                                    fontWeight:
                                      700,
                                    color:
                                      "#334155",
                                  }}
                                >
                                  {
                                    area.wardName ||
                                    "-"
                                  }
                                </td>


                                {/* REGISTERED ON */}

                                <td
                                  style={
                                    tableCell
                                  }
                                >
                                  <div
                                    style={{
                                      display:
                                        "flex",
                                      flexDirection:
                                        "column",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize:
                                          "0.8125rem",
                                        fontWeight:
                                          700,
                                        color:
                                          "#1e293b",
                                      }}
                                    >
                                      {
                                        createdDate
                                      }
                                    </span>

                                    <span
                                      style={{
                                        fontSize:
                                          "0.7rem",
                                        fontWeight:
                                          600,
                                        color:
                                          "#94a3b8",
                                      }}
                                    >
                                      {
                                        createdTime
                                      }
                                    </span>
                                  </div>
                                </td>


                                {/* ACTIONS */}

                                <td
                                  style={{
                                    ...tableCell,
                                    textAlign:
                                      "right",
                                    position:
                                      "relative",
                                  }}
                                >
                                  {!isReadOnly && (
                                    <div className="group relative inline-block text-left">

                                      <button
                                        style={{
                                          background:
                                            "transparent",
                                          border:
                                            "none",
                                          cursor:
                                            "pointer",
                                          color:
                                            "#64748b",
                                          padding:
                                            "4px",
                                        }}
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <circle
                                            cx="12"
                                            cy="12"
                                            r="1"
                                          />

                                          <circle
                                            cx="12"
                                            cy="5"
                                            r="1"
                                          />

                                          <circle
                                            cx="12"
                                            cy="19"
                                            r="1"
                                          />
                                        </svg>
                                      </button>


                                      <div className="hidden group-hover:flex absolute right-0 top-full mt-1 w-32 flex-col rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50">

                                        <button
                                          onClick={() =>
                                            alert(
                                              "Edit functionality pending"
                                            )
                                          }
                                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition w-full text-left"
                                        >
                                          Edit Area
                                        </button>


                                        <button
                                          onClick={() =>
                                            setDeleteAreaTarget(
                                              {
                                                id:
                                                  area.id,
                                                name:
                                                  area.name,
                                              }
                                            )
                                          }
                                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition w-full text-left"
                                        >
                                          Delete Area
                                        </button>

                                      </div>

                                    </div>
                                  )}
                                </td>

                              </tr>
                            );
                          }
                        )
                      )}

                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

        </div>


        <style jsx>{`
          .animate-spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

      </div>
    </RoleGuard>
  );
}


/* ===========================================================
   TABLE STYLES
=========================================================== */

const headerCell:
  React.CSSProperties = {
    padding:
      "12px 14px",
    fontSize:
      "0.7rem",
    fontWeight:
      900,
    color:
      "#475569",
    textTransform:
      "uppercase",
    letterSpacing:
      "0.05em",
    whiteSpace:
      "nowrap",
  };


const tableCell:
  React.CSSProperties = {
    padding:
      "14px 14px",
    fontSize:
      "0.8125rem",
    color:
      "#475569",
    verticalAlign:
      "middle",
    whiteSpace:
      "nowrap",
  };
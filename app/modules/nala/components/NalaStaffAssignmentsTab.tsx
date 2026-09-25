"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  GeoApi,
  NalaApi
} from "@lib/apiClient";

type ViewMode =
  | "supervisor"
  | "employee";

export default function NalaStaffAssignmentsTab() {
  const [viewMode, setViewMode] =
    useState<ViewMode>("supervisor");

  const [nalas, setNalas] =
    useState<any[]>([]);

  const [zones, setZones] =
    useState<any[]>([]);

  const [allWards, setAllWards] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [selectedZone, setSelectedZone] =
    useState("");

  const [selectedWard, setSelectedWard] =
    useState("");

  const [selectedNala, setSelectedNala] =
    useState<any | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        nalaResult,
        zoneResult,
        wardResult
      ] = await Promise.allSettled([
        NalaApi.list(),
        GeoApi.list("ZONE"),
        GeoApi.list("WARD")
      ]);

      if (
        nalaResult.status ===
        "fulfilled"
      ) {
        setNalas(
          nalaResult.value.nalas || []
        );
      }

      if (
        zoneResult.status ===
        "fulfilled"
      ) {
        setZones(
          zoneResult.value.nodes || []
        );
      }

      if (
        wardResult.status ===
        "fulfilled"
      ) {
        setAllWards(
          wardResult.value.nodes || []
        );
      }
    } catch (error) {
      console.error(
        "Failed to load NALA assignment data",
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleWards =
    selectedZone
      ? allWards.filter(
          (ward) =>
            ward.parentId ===
              selectedZone ||
            ward.parent?.id ===
              selectedZone
        )
      : allWards;

  const filteredNalas =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return nalas
        .filter((nala) => {
          const pointPeople =
            (
              nala.nalaPoints ||
              []
            )
              .flatMap(
                (point: any) => [
                  point
                    .supervisorAssignedTo
                    ?.name,
                  point
                    .employeeAssignedTo
                    ?.name
                ]
              )
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const matchesSearch =
            !query ||
            String(
              nala.nalaName || ""
            )
              .toLowerCase()
              .includes(query) ||
            String(
              nala.nalaCode || ""
            )
              .toLowerCase()
              .includes(query) ||
            String(
              nala.zoneName || ""
            )
              .toLowerCase()
              .includes(query) ||
            String(
              nala.wardName || ""
            )
              .toLowerCase()
              .includes(query) ||
            String(
              nala.areaName || ""
            )
              .toLowerCase()
              .includes(query) ||
            pointPeople.includes(query);

          const matchesZone =
            !selectedZone ||
            nala.zoneId ===
              selectedZone;

          const matchesWard =
            !selectedWard ||
            nala.wardId ===
              selectedWard;

          return (
            matchesSearch &&
            matchesZone &&
            matchesWard
          );
        })
        .sort(
          (a, b) =>
            String(
              a.nalaName || ""
            ).localeCompare(
              String(
                b.nalaName || ""
              ),
              undefined,
              {
                sensitivity:
                  "base",
                numeric:
                  true
              }
            )
        );
    }, [
      nalas,
      search,
      selectedZone,
      selectedWard
    ]);

  const totalAssignedPeople =
    useMemo(() => {
      const ids =
        new Set<string>();

      nalas.forEach(
        (nala: any) => {
          (
            nala.nalaPoints ||
            []
          ).forEach(
            (point: any) => {
              const person =
                viewMode ===
                "supervisor"
                  ? point
                      .supervisorAssignedTo
                  : point
                      .employeeAssignedTo;

              const id =
                person?.id ||
                person?.userId;

              if (id) {
                ids.add(
                  String(id)
                );
              }
            }
          );
        }
      );

      return ids.size;
    }, [
      nalas,
      viewMode
    ]);

  const handleZoneChange =
    (zoneId: string) => {
      setSelectedZone(zoneId);

      if (
        selectedWard
      ) {
        const ward =
          allWards.find(
            (item) =>
              item.id ===
              selectedWard
          );

        const parentZone =
          ward?.parentId ||
          ward?.parent?.id;

        if (
          zoneId &&
          parentZone !== zoneId
        ) {
          setSelectedWard("");
        }
      }
    };

  const handleWardChange =
    (wardId: string) => {
      setSelectedWard(wardId);

      if (wardId) {
        const ward =
          allWards.find(
            (item) =>
              item.id ===
              wardId
          );

        const parentZone =
          ward?.parentId ||
          ward?.parent?.id;

        if (parentZone) {
          setSelectedZone(
            parentZone
          );
        }
      }
    };

  const isSupervisorView =
    viewMode ===
    "supervisor";

  return (
    <div>
      <div
        style={{
          background:
            "#ffffff",
          borderRadius:
            14,
          border:
            "1px solid #e2e8f0",
          padding:
            "12px 18px",
          marginBottom:
            16
        }}
      >
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            flexWrap:
              "wrap",
            gap:
              10
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              flexWrap:
                "wrap",
              gap:
                8,
              flex:
                1
            }}
          >
            <div
              style={{
                display:
                  "flex",
                gap:
                  4,
                padding:
                  3,
                background:
                  "#f1f5f9",
                borderRadius:
                  8,
                border:
                  "1px solid #e2e8f0"
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setViewMode(
                    "supervisor"
                  )
                }
                style={toggleStyle(
                  isSupervisorView
                )}
              >
                Daroga View
              </button>

              <button
                type="button"
                onClick={() =>
                  setViewMode(
                    "employee"
                  )
                }
                style={toggleStyle(
                  !isSupervisorView
                )}
              >
                Employee View
              </button>
            </div>

            <input
              type="text"
              value={search}
              placeholder="Search Nala, staff, ward..."
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              style={filterStyle}
            />

            <select
              value={
                selectedZone
              }
              onChange={(event) =>
                handleZoneChange(
                  event.target.value
                )
              }
              style={filterStyle}
            >
              <option value="">
                All Zones
              </option>

              {zones.map(
                (zone) => (
                  <option
                    key={zone.id}
                    value={zone.id}
                  >
                    {zone.name}
                  </option>
                )
              )}
            </select>

            <select
              value={
                selectedWard
              }
              onChange={(event) =>
                handleWardChange(
                  event.target.value
                )
              }
              style={filterStyle}
            >
              <option value="">
                All Wards
              </option>

              {visibleWards.map(
                (ward) => (
                  <option
                    key={ward.id}
                    value={ward.id}
                  >
                    {ward.name}
                  </option>
                )
              )}
            </select>

            {Boolean(
              search ||
              selectedZone ||
              selectedWard
            ) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedZone("");
                  setSelectedWard("");
                }}
                style={resetStyle}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display:
              "flex",
            gap:
              10,
            flexWrap:
              "wrap",
            marginTop:
              10
          }}
        >
          <SummaryPill>
            {isSupervisorView
              ? "Total Darogas"
              : "Total Employees"}
            :{" "}
            <strong>
              {totalAssignedPeople}
            </strong>
          </SummaryPill>

          <SummaryPill>
            Nalas:{" "}
            <strong>
              {
                filteredNalas.length
              }
            </strong>
          </SummaryPill>
        </div>
      </div>

      {loading ? (
        <LoadingCard />
      ) : filteredNalas.length ===
        0 ? (
        <EmptyCard />
      ) : (
        <div
          style={{
            background:
              "#ffffff",
            borderRadius:
              14,
            border:
              "1px solid #e2e8f0",
            overflowX:
              "auto"
          }}
        >
          <table
            style={{
              width:
                "100%",
              borderCollapse:
                "collapse"
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#f8fafc"
                }}
              >
                <th style={thStyle}>
                  NALA DETAILS
                </th>

                <th style={thStyle}>
                  ZONE & WARD
                </th>

                <th style={thStyle}>
                  NALA POINTS
                </th>

                <th style={thStyle}>
                  {isSupervisorView
                    ? "ASSIGNED DAROGAS"
                    : "ASSIGNED EMPLOYEES"}
                </th>

                <th
                  style={{
                    ...thStyle,
                    textAlign:
                      "right"
                  }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredNalas.map(
                (nala) => {
                  const points =
                    nala.nalaPoints ||
                    [];

                  const peopleMap =
                    new Map<
                      string,
                      {
                        name:
                          string;
                        count:
                          number;
                      }
                    >();

                  points.forEach(
                    (point: any) => {
                      const person =
                        isSupervisorView
                          ? point
                              .supervisorAssignedTo
                          : point
                              .employeeAssignedTo;

                      if (
                        !person?.name
                      ) {
                        return;
                      }

                      const key =
                        String(
                          person.id ||
                          person.userId ||
                          person.name
                        );

                      const current =
                        peopleMap.get(
                          key
                        );

                      peopleMap.set(
                        key,
                        {
                          name:
                            person.name,
                          count:
                            (
                              current?.count ||
                              0
                            ) +
                            1
                        }
                      );
                    }
                  );

                  const people =
                    Array.from(
                      peopleMap.values()
                    );

                  return (
                    <tr
                      key={nala.id}
                      style={{
                        borderTop:
                          "1px solid #f1f5f9"
                      }}
                    >
                      <td
                        style={tdStyle}
                      >
                        <div
                          style={{
                            fontSize:
                              13,
                            fontWeight:
                              700,
                            color:
                              "#0f172a"
                          }}
                        >
                          {nala.nalaName ||
                            "Unnamed Nala"}
                        </div>

                        <div
                          style={{
                            marginTop:
                              2,
                            fontSize:
                              11,
                            color:
                              "#64748b"
                          }}
                        >
                          {nala.nalaCode
                            ? `Code: ${nala.nalaCode}`
                            : `ID: ${String(
                                nala.id
                              ).slice(
                                0,
                                10
                              )}`}
                        </div>
                      </td>

                      <td
                        style={tdStyle}
                      >
                        <div
                          style={{
                            fontSize:
                              12,
                            fontWeight:
                              600,
                            color:
                              "#334155"
                          }}
                        >
                          {nala.wardName ||
                            "-"}
                        </div>

                        <div
                          style={{
                            fontSize:
                              11,
                            color:
                              "#64748b"
                          }}
                        >
                          {nala.zoneName ||
                            "-"}
                        </div>
                      </td>

                      <td
                        style={tdStyle}
                      >
                        <span
                          style={{
                            display:
                              "inline-flex",
                            padding:
                              "3px 8px",
                            borderRadius:
                              8,
                            background:
                              "#f1f5f9",
                            color:
                              "#334155",
                            fontSize:
                              11,
                            fontWeight:
                              600
                          }}
                        >
                          {points.length}{" "}
                          {points.length ===
                          1
                            ? "NalaPoint"
                            : "NalaPoints"}
                        </span>
                      </td>

                      <td
                        style={tdStyle}
                      >
                        {people.length >
                        0 ? (
                          <div
                            style={{
                              display:
                                "flex",
                              gap:
                                6,
                              flexWrap:
                                "wrap"
                            }}
                          >
                            {people.map(
                              (
                                person
                              ) => (
                                <span
                                  key={
                                    person.name
                                  }
                                  style={{
                                    padding:
                                      "3px 8px",
                                    borderRadius:
                                      8,
                                    background:
                                      isSupervisorView
                                        ? "#eff6ff"
                                        : "#f0fdf4",
                                    color:
                                      isSupervisorView
                                        ? "#2563eb"
                                        : "#15803d",
                                    border:
                                      isSupervisorView
                                        ? "1px solid #bfdbfe"
                                        : "1px solid #bbf7d0",
                                    fontSize:
                                      11,
                                    fontWeight:
                                      600
                                  }}
                                >
                                  {
                                    person.name
                                  }{" "}
                                  (
                                  {
                                    person.count
                                  }{" "}
                                  {
                                    person.count ===
                                    1
                                      ? "point"
                                      : "points"
                                  }
                                  )
                                </span>
                              )
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize:
                                11,
                              color:
                                "#94a3b8"
                            }}
                          >
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "right"
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedNala(
                              nala
                            )
                          }
                          style={assignButtonStyle}
                        >
                          {isSupervisorView
                            ? "Assign Daroga"
                            : "Assign Employee"}
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedNala && (
        <NalaAssignmentModal
          nala={
            selectedNala
          }
          targetRole={
            isSupervisorView
              ? "SUPERVISOR"
              : "EMPLOYEE"
          }
          onClose={() =>
            setSelectedNala(
              null
            )
          }
          onSuccess={async () => {
            setSelectedNala(
              null
            );

            await loadData();
          }}
        />
      )}
    </div>
  );
}

function NalaAssignmentModal({
  nala,
  targetRole,
  onClose,
  onSuccess
}: {
  nala: any;
  targetRole:
    | "SUPERVISOR"
    | "EMPLOYEE";
  onClose: () => void;
  onSuccess: () =>
    void | Promise<void>;
}) {
  const points =
    nala.nalaPoints || [];

  const [
    assignees,
    setAssignees
  ] = useState<any[]>([]);

  const [
    selectedUserId,
    setSelectedUserId
  ] = useState("");

  const [
    selectedPointIds,
    setSelectedPointIds
  ] = useState<string[]>(
    points.map(
      (point: any) =>
        point.id
    )
  );

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    let active =
      true;

    NalaApi
      .listPotentialAssignees(
        nala.id,
        targetRole
      )
      .then((items) => {
        if (active) {
          setAssignees(
            items || []
          );
        }
      })
      .catch((err) => {
        console.error(
          "Failed to load NALA assignees",
          err
        );

        if (active) {
          setError(
            "Unable to load available users."
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active =
        false;
    };
  }, [
    nala.id,
    targetRole
  ]);

  const togglePoint =
    (pointId: string) => {
      setSelectedPointIds(
        (current) =>
          current.includes(
            pointId
          )
            ? current.filter(
                (id) =>
                  id !== pointId
              )
            : [
                ...current,
                pointId
              ]
      );
    };

  const save =
    async () => {
      if (
        selectedPointIds.length ===
        0
      ) {
        setError(
          "Select at least one NalaPoint."
        );
        return;
      }

      if (!selectedUserId) {
        setError(
          "Select a user or choose Unassign."
        );
        return;
      }

      try {
        setSaving(true);
        setError("");

        const userId =
          selectedUserId ===
          "__UNASSIGN__"
            ? null
            : selectedUserId;

        await NalaApi.assign(
          nala.id,
          userId,
          null,
          selectedPointIds,
          targetRole
        );

        await onSuccess();
      } catch (err: any) {
        console.error(
          "Failed to assign NALA",
          err
        );

        setError(
          err?.message ||
            "Assignment failed."
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div
      style={{
        position:
          "fixed",
        inset:
          0,
        background:
          "rgba(15,23,42,0.55)",
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        zIndex:
          1000,
        padding:
          20
      }}
    >
      <div
        style={{
          width:
            "min(720px, 100%)",
          maxHeight:
            "90vh",
          overflowY:
            "auto",
          background:
            "#ffffff",
          borderRadius:
            18,
          padding:
            22,
          boxShadow:
            "0 20px 60px rgba(15,23,42,0.22)"
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            gap:
              14
          }}
        >
          <div>
            <h3
              style={{
                margin:
                  0,
                fontSize:
                  18,
                fontWeight:
                  900,
                color:
                  "#0f172a"
              }}
            >
              Assign{" "}
              {targetRole ===
              "SUPERVISOR"
                ? "Daroga"
                : "Employee"}
            </h3>

            <p
              style={{
                margin:
                  "4px 0 0",
                fontSize:
                  12,
                color:
                  "#64748b"
              }}
            >
              {nala.nalaName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border:
                "none",
              background:
                "transparent",
              fontSize:
                20,
              cursor:
                "pointer",
              color:
                "#64748b"
            }}
          >
            �
          </button>
        </div>

        <div
          style={{
            marginTop:
              18
          }}
        >
          <label
            style={labelStyle}
          >
            {targetRole ===
            "SUPERVISOR"
              ? "Select Daroga"
              : "Select Employee"}
          </label>

          <select
            value={
              selectedUserId
            }
            disabled={loading}
            onChange={(event) =>
              setSelectedUserId(
                event.target.value
              )
            }
            style={modalInputStyle}
          >
            <option value="">
              {loading
                ? "Loading users..."
                : "Select user"}
            </option>

            <option value="__UNASSIGN__">
              Unassign selected NalaPoints
            </option>

            {assignees.map(
              (person) => (
                <option
                  key={person.id}
                  value={person.id}
                >
                  {person.name ||
                    person.email ||
                    person.phone ||
                    person.id}
                  {" - "}
                  {person.currentNalaPointCount ||
                    0}{" "}
                  current points
                </option>
              )
            )}
          </select>
        </div>

        <div
          style={{
            marginTop:
              18
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap:
                12
            }}
          >
            <label
              style={labelStyle}
            >
              NalaPoints
            </label>

            <button
              type="button"
              onClick={() =>
                setSelectedPointIds(
                  selectedPointIds.length ===
                    points.length
                    ? []
                    : points.map(
                        (
                          point: any
                        ) =>
                          point.id
                      )
                )
              }
              style={{
                border:
                  "none",
                background:
                  "transparent",
                color:
                  "#2563eb",
                fontSize:
                  11,
                fontWeight:
                  700,
                cursor:
                  "pointer"
              }}
            >
              {selectedPointIds.length ===
              points.length
                ? "Clear All"
                : "Select All"}
            </button>
          </div>

          <div
            style={{
              marginTop:
                8,
              display:
                "grid",
              gap:
                8
            }}
          >
            {points.map(
              (
                point: any,
                index: number
              ) => {
                const currentPerson =
                  targetRole ===
                  "SUPERVISOR"
                    ? point
                        .supervisorAssignedTo
                    : point
                        .employeeAssignedTo;

                return (
                  <label
                    key={point.id}
                    style={{
                      display:
                        "flex",
                      gap:
                        10,
                      alignItems:
                        "flex-start",
                      padding:
                        "10px 12px",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        10,
                      cursor:
                        "pointer"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPointIds.includes(
                        point.id
                      )}
                      onChange={() =>
                        togglePoint(
                          point.id
                        )
                      }
                    />

                    <div>
                      <div
                        style={{
                          fontSize:
                            12,
                          fontWeight:
                            700,
                          color:
                            "#0f172a"
                        }}
                      >
                        {point.pointName ||
                          `Point ${index + 1}`}
                      </div>

                      <div
                        style={{
                          marginTop:
                            2,
                          fontSize:
                            11,
                          color:
                            "#64748b"
                        }}
                      >
                        {point.pointCode ||
                          `P${index + 1}`}
                        {" � "}
                        Currently:{" "}
                        {currentPerson?.name ||
                          "Unassigned"}
                      </div>
                    </div>
                  </label>
                );
              }
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop:
                14,
              padding:
                "9px 11px",
              borderRadius:
                8,
              background:
                "#fef2f2",
              color:
                "#b91c1c",
              fontSize:
                12
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "flex-end",
            gap:
              8,
            marginTop:
              20
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={secondaryButtonStyle}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={save}
            disabled={
              saving ||
              loading
            }
            style={primaryButtonStyle}
          >
            {saving
              ? "Saving..."
              : "Save Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryPill({
  children
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div
      style={{
        background:
          "#f8fafc",
        padding:
          "6px 12px",
        borderRadius:
          8,
        border:
          "1px solid #e2e8f0",
        fontSize:
          12,
        fontWeight:
          600,
        color:
          "#475569"
      }}
    >
      {children}
    </div>
  );
}

function LoadingCard() {
  return (
    <div
      style={{
        padding:
          40,
        textAlign:
          "center",
        background:
          "#ffffff",
        borderRadius:
          14,
        border:
          "1px solid #e2e8f0"
      }}
    >
      Loading Nala assignments...
    </div>
  );
}

function EmptyCard() {
  return (
    <div
      style={{
        textAlign:
          "center",
        padding:
          "48px 24px",
        background:
          "#ffffff",
        borderRadius:
          14,
        border:
          "1px solid #e2e8f0",
        color:
          "#64748b"
      }}
    >
      No Nalas match the selected filters.
    </div>
  );
}

const filterStyle:
  React.CSSProperties = {
    height:
      34,
    padding:
      "6px 12px",
    borderRadius:
      8,
    border:
      "1px solid #e2e8f0",
    fontSize:
      12,
    background:
      "#ffffff",
    color:
      "#334155"
  };

const resetStyle:
  React.CSSProperties = {
    height:
      34,
    padding:
      "0 10px",
    borderRadius:
      8,
    border:
      "1px solid #cbd5e1",
    background:
      "#f8fafc",
    color:
      "#475569",
    fontSize:
      11,
    fontWeight:
      600,
    cursor:
      "pointer"
  };

const thStyle:
  React.CSSProperties = {
    padding:
      "12px 14px",
    textAlign:
      "left",
    fontSize:
      11,
    fontWeight:
      600,
    color:
      "#64748b",
    letterSpacing:
      "0.04em"
  };

const tdStyle:
  React.CSSProperties = {
    padding:
      "12px 14px"
  };

const assignButtonStyle:
  React.CSSProperties = {
    padding:
      "6px 12px",
    borderRadius:
      8,
    border:
      "none",
    background:
      "#2563eb",
    color:
      "#ffffff",
    fontSize:
      12,
    fontWeight:
      600,
    cursor:
      "pointer"
  };

const labelStyle:
  React.CSSProperties = {
    display:
      "block",
    fontSize:
      12,
    fontWeight:
      700,
    color:
      "#334155"
  };

const modalInputStyle:
  React.CSSProperties = {
    width:
      "100%",
    marginTop:
      6,
    padding:
      "9px 10px",
    borderRadius:
      8,
    border:
      "1px solid #cbd5e1",
    background:
      "#ffffff"
  };

const secondaryButtonStyle:
  React.CSSProperties = {
    padding:
      "8px 14px",
    borderRadius:
      8,
    border:
      "1px solid #cbd5e1",
    background:
      "#ffffff",
    color:
      "#475569",
    fontWeight:
      700,
    cursor:
      "pointer"
  };

const primaryButtonStyle:
  React.CSSProperties = {
    padding:
      "8px 14px",
    borderRadius:
      8,
    border:
      "none",
    background:
      "#2563eb",
    color:
      "#ffffff",
    fontWeight:
      700,
    cursor:
      "pointer"
  };

function toggleStyle(
  active: boolean
): React.CSSProperties {
  return {
    padding:
      "4px 12px",
    borderRadius:
      6,
    border:
      "none",
    fontSize:
      12,
    fontWeight:
      600,
    cursor:
      "pointer",
    background:
      active
        ? "#ffffff"
        : "transparent",
    color:
      active
        ? "#2563eb"
        : "#64748b",
    boxShadow:
      active
        ? "0 1px 4px rgba(0,0,0,0.06)"
        : "none"
  };
}

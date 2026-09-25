"use client";

import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  GeoApi,
  NalaApi,
  NalaPointInput
} from "@lib/apiClient";

import { useAuth } from "@hooks/useAuth";
import ModalPortal from "@components/ui/ModalPortal";

type Props = {
  nalas: any[];
  onRefresh: () => void | Promise<void>;
};

type EditorMode =
  | "create"
  | "edit"
  | "points";

type PointDraft = {
  lat: string;
  lng: string;
  code: string;
  name: string;
  type: string;
};

const emptyPoint = (
  index: number
): PointDraft => ({
  lat: "",
  lng: "",
  code: `P${index + 1}`,
  name: `Point ${index + 1}`,
  type: "ROUTE"
});

export default function NalaMasterTab({
  nalas,
  onRefresh
}: Props) {
  const { user } = useAuth();

  const [search, setSearch] =
    useState("");

  const [selectedZone, setSelectedZone] =
    useState("");

  const [selectedWard, setSelectedWard] =
    useState("");

  const [editor, setEditor] =
    useState<{
      mode: EditorMode;
      nala?: any;
    } | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<any | null>(null);

  const roleValues = [
    user?.role,
    ...(user?.roles || [])
  ]
    .filter(Boolean)
    .map((value) =>
      String(value).toUpperCase()
    );

  const canManage =
    roleValues.includes("CITY_ADMIN");

  const zones = useMemo(() => {
    const map =
      new Map<string, string>();

    nalas.forEach((nala) => {
      if (
        nala.zoneId &&
        nala.zoneName
      ) {
        map.set(
          nala.zoneId,
          nala.zoneName
        );
      }
    });

    return Array.from(
      map.entries()
    )
      .map(([id, name]) => ({
        id,
        name
      }))
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          undefined,
          {
            numeric: true,
            sensitivity: "base"
          }
        )
      );
  }, [nalas]);

  const wards = useMemo(() => {
    const map =
      new Map<
        string,
        {
          id: string;
          name: string;
          zoneId: string;
        }
      >();

    nalas.forEach((nala) => {
      if (
        nala.wardId &&
        nala.wardName
      ) {
        map.set(
          nala.wardId,
          {
            id: nala.wardId,
            name: nala.wardName,
            zoneId:
              nala.zoneId || ""
          }
        );
      }
    });

    return Array.from(
      map.values()
    ).filter(
      (ward) =>
        !selectedZone ||
        ward.zoneId ===
          selectedZone
    );
  }, [
    nalas,
    selectedZone
  ]);

  const filteredNalas =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return [...nalas]
        .filter((nala) => {
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
              .includes(query);

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
        .sort((a, b) =>
          String(
            a.nalaName || ""
          ).localeCompare(
            String(
              b.nalaName || ""
            ),
            undefined,
            {
              numeric: true,
              sensitivity: "base"
            }
          )
        );
    }, [
      nalas,
      search,
      selectedZone,
      selectedWard
    ]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
          padding: "12px 16px",
          background: "#ffffff",
          border:
            "1px solid #e2e8f0",
          borderRadius: 14
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            flex: 1
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search Nala, code, ward..."
            style={filterStyle}
          />

          <select
            value={selectedZone}
            onChange={(event) => {
              setSelectedZone(
                event.target.value
              );
              setSelectedWard("");
            }}
            style={filterStyle}
          >
            <option value="">
              All Zones
            </option>

            {zones.map((zone) => (
              <option
                key={zone.id}
                value={zone.id}
              >
                {zone.name}
              </option>
            ))}
          </select>

          <select
            value={selectedWard}
            onChange={(event) =>
              setSelectedWard(
                event.target.value
              )
            }
            style={filterStyle}
          >
            <option value="">
              All Wards
            </option>

            {wards.map((ward) => (
              <option
                key={ward.id}
                value={ward.id}
              >
                {ward.name}
              </option>
            ))}
          </select>

          {(search ||
            selectedZone ||
            selectedWard) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedZone("");
                setSelectedWard("");
              }}
              style={secondaryButtonStyle}
            >
              Reset
            </button>
          )}
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() =>
              setEditor({
                mode: "create"
              })
            }
            style={primaryButtonStyle}
          >
            + Add Nala
          </button>
        )}
      </div>

      {filteredNalas.length ===
      0 ? (
        <div style={emptyStyle}>
          No Nalas found.
        </div>
      ) : (
        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #e2e8f0",
            borderRadius: 14,
            overflowX: "auto"
          }}
        >
          <table
            style={{
              width: "100%",
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
                  NALA
                </th>

                <th style={thStyle}>
                  LOCATION
                </th>

                <th style={thStyle}>
                  NALA POINTS
                </th>

                <th style={thStyle}>
                  SUPERVISOR
                </th>

                <th style={thStyle}>
                  LATEST STATUS
                </th>

                {canManage && (
                  <th
                    style={{
                      ...thStyle,
                      textAlign:
                        "right"
                    }}
                  >
                    ACTIONS
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredNalas.map(
                (nala) => (
                  <tr
                    key={nala.id}
                    style={{
                      borderTop:
                        "1px solid #f1f5f9"
                    }}
                  >
                    <td style={tdStyle}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#0f172a"
                        }}
                      >
                        {nala.nalaName ||
                          "Unnamed Nala"}
                      </div>

                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 11,
                          color: "#64748b"
                        }}
                      >
                        {nala.nalaCode ||
                          String(
                            nala.id
                          ).slice(0, 10)}
                      </div>
                    </td>

                    <td style={tdStyle}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 12,
                          color: "#334155"
                        }}
                      >
                        {nala.areaName ||
                          "-"}
                      </div>

                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 11,
                          color: "#64748b"
                        }}
                      >
                        {nala.wardName ||
                          "-"}
                        {" � "}
                        {nala.zoneName ||
                          "-"}
                      </div>
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={{
                          padding:
                            "3px 8px",
                          borderRadius: 8,
                          background:
                            "#f1f5f9",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#334155"
                        }}
                      >
                        {nala.pointCount ??
                          nala.nalaPoints
                            ?.length ??
                          0}{" "}
                        NalaPoints
                      </span>
                    </td>

                    <td style={tdStyle}>
                      {nala.assignedTo
                        ?.name ||
                        "Not fully assigned"}
                    </td>

                    <td style={tdStyle}>
                      {nala.latestRecord
                        ?.status ||
                        "NOT SUBMITTED"}
                    </td>

                    {canManage && (
                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "right"
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "flex-end",
                            gap: 6,
                            flexWrap:
                              "wrap"
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setEditor({
                                mode:
                                  "points",
                                nala
                              })
                            }
                            style={
                              secondaryButtonStyle
                            }
                          >
                            NalaPoints
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditor({
                                mode:
                                  "edit",
                                nala
                              })
                            }
                            style={
                              secondaryButtonStyle
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget(
                                nala
                              )
                            }
                            style={
                              dangerButtonStyle
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {editor && (
        <NalaEditorModal
          mode={editor.mode}
          nala={editor.nala}
          onClose={() =>
            setEditor(null)
          }
          onSuccess={async () => {
            setEditor(null);
            await onRefresh();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteNalaModal
          nala={deleteTarget}
          onClose={() =>
            setDeleteTarget(null)
          }
          onSuccess={async () => {
            setDeleteTarget(null);
            await onRefresh();
          }}
        />
      )}
    </div>
  );
}

function NalaEditorModal({
  mode,
  nala,
  onClose,
  onSuccess
}: {
  mode: EditorMode;
  nala?: any;
  onClose: () => void;
  onSuccess: () =>
    void | Promise<void>;
}) {
  const [zones, setZones] =
    useState<any[]>([]);

  const [wards, setWards] =
    useState<any[]>([]);

  const [areas, setAreas] =
    useState<any[]>([]);

  const [zoneId, setZoneId] =
    useState(
      nala?.zoneId || ""
    );

  const [wardId, setWardId] =
    useState(
      nala?.wardId || ""
    );

  const [areaId, setAreaId] =
    useState(
      nala?.areaId || ""
    );

  const [nalaName, setNalaName] =
    useState(
      nala?.nalaName || ""
    );

  const [nalaCode, setNalaCode] =
    useState(
      nala?.nalaCode || ""
    );

  const [points, setPoints] =
    useState<PointDraft[]>(() => {
      const existing =
        nala?.nalaPoints || [];

      if (existing.length) {
        return existing.map(
          (
            point: any,
            index: number
          ) => ({
            lat: String(
              point.lat ??
                point.latitude ??
                point.geometry
                  ?.coordinates?.[1] ??
                ""
            ),
            lng: String(
              point.lng ??
                point.longitude ??
                point.geometry
                  ?.coordinates?.[0] ??
                ""
            ),
            code:
              point.pointCode ||
              point.code ||
              `P${index + 1}`,
            name:
              point.pointName ||
              point.name ||
              `Point ${index + 1}`,
            type:
              point.pointType ||
              point.type ||
              "ROUTE"
          })
        );
      }

      return [
        emptyPoint(0)
      ];
    });

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const isPointsOnly =
    mode === "points";

  useEffect(() => {
    GeoApi
      .list("ZONE")
      .then((res) =>
        setZones(
          res.nodes || []
        )
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!zoneId) {
      setWards([]);
      return;
    }

    GeoApi
      .list("WARD")
      .then((res) =>
        setWards(
          (res.nodes || []).filter(
            (node: any) =>
              node.parentId ===
              zoneId
          )
        )
      )
      .catch(console.error);
  }, [zoneId]);

  useEffect(() => {
    if (!wardId) {
      setAreas([]);
      return;
    }

    GeoApi
      .list("AREA")
      .then((res) =>
        setAreas(
          (res.nodes || []).filter(
            (node: any) =>
              node.parentId ===
              wardId
          )
        )
      )
      .catch(console.error);
  }, [wardId]);

  const updatePoint = (
    index: number,
    key: keyof PointDraft,
    value: string
  ) => {
    setPoints((current) =>
      current.map(
        (point, i) =>
          i === index
            ? {
                ...point,
                [key]: value
              }
            : point
      )
    );
  };

  const addPoint = () => {
    if (
      points.length >= 5
    ) {
      return;
    }

    setPoints((current) => [
      ...current,
      emptyPoint(
        current.length
      )
    ]);
  };

  const removePoint = (
    index: number
  ) => {
    if (
      points.length <= 1
    ) {
      return;
    }

    setPoints((current) =>
      current
        .filter(
          (_, i) =>
            i !== index
        )
        .map(
          (point, i) => ({
            ...point,
            code:
              point.code ||
              `P${i + 1}`,
            name:
              point.name ||
              `Point ${i + 1}`
          })
        )
    );
  };

  const parsedPoints:
    NalaPointInput[] =
    points.map(
      (point) => ({
        lat: Number(
          point.lat
        ),
        lng: Number(
          point.lng
        ),
        code:
          point.code.trim() ||
          undefined,
        name:
          point.name.trim() ||
          undefined,
        type:
          point.type ||
          undefined
      })
    );

  const validate = () => {
    if (!isPointsOnly) {
      if (
        !zoneId ||
        !wardId ||
        !areaId ||
        !nalaName.trim()
      ) {
        return "Zone, Ward, Area and Nala Name are required.";
      }
    }

    if (
      points.length < 1 ||
      points.length > 5
    ) {
      return "Nala must contain between 1 and 5 NalaPoints.";
    }

    for (
      let index = 0;
      index < points.length;
      index++
    ) {
      const point =
        parsedPoints[index];

      if (
        !Number.isFinite(
          point.lat
        ) ||
        !Number.isFinite(
          point.lng
        )
      ) {
        return `Enter valid latitude and longitude for NalaPoint ${index + 1}.`;
      }

      if (
        point.lat < -90 ||
        point.lat > 90
      ) {
        return `Latitude for NalaPoint ${index + 1} must be between -90 and 90.`;
      }

      if (
        point.lng < -180 ||
        point.lng > 180
      ) {
        return `Longitude for NalaPoint ${index + 1} must be between -180 and 180.`;
      }
    }

    return "";
  };

  const save =
    async (
      event:
        React.FormEvent
    ) => {
      event.preventDefault();

      const validation =
        validate();

      if (validation) {
        setError(validation);
        return;
      }

      try {
        setSaving(true);
        setError("");

        if (
          mode === "create"
        ) {
          await NalaApi.create({
            zoneId,
            wardId,
            areaId,
            nalaName:
              nalaName.trim(),
            nalaCode:
              nalaCode.trim() ||
              null,
            points:
              parsedPoints
          });
        } else if (
          mode === "edit"
        ) {
          await NalaApi.update(
            nala.id,
            {
              zoneId,
              wardId,
              areaId,
              nalaName:
                nalaName.trim(),
              nalaCode:
                nalaCode.trim() ||
                null
            }
          );
        } else {
          await NalaApi.updatePoints(
            nala.id,
            parsedPoints
          );
        }

        await onSuccess();
      } catch (err: any) {
        console.error(
          "Failed to save Nala",
          err
        );

        setError(
          err?.message ||
            "Failed to save Nala."
        );
      } finally {
        setSaving(false);
      }
    };

  const title =
    mode === "create"
      ? "Add Nala"
      : mode === "edit"
        ? "Edit Nala"
        : "Configure NalaPoints";

  return (
    <ModalPortal>
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={modalHeaderStyle}>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#0f172a"
                }}
              >
                {title}
              </h3>

              {nala && (
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 12,
                    color: "#64748b"
                  }}
                >
                  {nala.nalaName}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              style={closeButtonStyle}
            >
              �
            </button>
          </div>

          <form
            onSubmit={save}
            style={{
              padding: 22
            }}
          >
            {!isPointsOnly && (
              <>
                <div style={gridStyle}>
                  <Field label="Zone *">
                    <select
                      value={zoneId}
                      required
                      style={inputStyle}
                      onChange={(event) => {
                        setZoneId(
                          event.target.value
                        );
                        setWardId("");
                        setAreaId("");
                      }}
                    >
                      <option value="">
                        Choose Zone
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
                  </Field>

                  <Field label="Ward *">
                    <select
                      value={wardId}
                      required
                      disabled={!zoneId}
                      style={inputStyle}
                      onChange={(event) => {
                        setWardId(
                          event.target.value
                        );
                        setAreaId("");
                      }}
                    >
                      <option value="">
                        Choose Ward
                      </option>

                      {wards.map(
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
                  </Field>

                  <Field label="Area *">
                    <select
                      value={areaId}
                      required
                      disabled={!wardId}
                      style={inputStyle}
                      onChange={(event) =>
                        setAreaId(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Choose Area
                      </option>

                      {areas.map(
                        (area) => (
                          <option
                            key={area.id}
                            value={area.id}
                          >
                            {area.name}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Nala Name *">
                    <input
                      value={nalaName}
                      required
                      style={inputStyle}
                      onChange={(event) =>
                        setNalaName(
                          event.target.value
                        )
                      }
                      placeholder="Enter Nala name"
                    />
                  </Field>

                  <Field label="Nala Code">
                    <input
                      value={nalaCode}
                      style={inputStyle}
                      onChange={(event) =>
                        setNalaCode(
                          event.target.value
                        )
                      }
                      placeholder="Optional code"
                    />
                  </Field>
                </div>
              </>
            )}

            {mode !== "edit" && (
              <div
                style={{
                  marginTop:
                    isPointsOnly
                      ? 0
                      : 22
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: 10,
                    marginBottom: 10
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#0f172a"
                      }}
                    >
                      NalaPoints
                    </div>

                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 11,
                        color: "#64748b"
                      }}
                    >
                      Configure 1�5 GPS points.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addPoint}
                    disabled={
                      points.length >= 5
                    }
                    style={
                      secondaryButtonStyle
                    }
                  >
                    + Add Point
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10
                  }}
                >
                  {points.map(
                    (
                      point,
                      index
                    ) => (
                      <div
                        key={index}
                        style={{
                          padding: 14,
                          border:
                            "1px solid #e2e8f0",
                          borderRadius: 12,
                          background:
                            "#f8fafc"
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            gap: 10,
                            marginBottom: 10
                          }}
                        >
                          <strong
                            style={{
                              fontSize: 12,
                              color: "#334155"
                            }}
                          >
                            NalaPoint{" "}
                            {index + 1}
                          </strong>

                          {points.length >
                            1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removePoint(
                                  index
                                )
                              }
                              style={
                                dangerTextButtonStyle
                              }
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div style={pointGridStyle}>
                          <Field label="Name">
                            <input
                              value={
                                point.name
                              }
                              style={
                                inputStyle
                              }
                              onChange={(
                                event
                              ) =>
                                updatePoint(
                                  index,
                                  "name",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </Field>

                          <Field label="Code">
                            <input
                              value={
                                point.code
                              }
                              style={
                                inputStyle
                              }
                              onChange={(
                                event
                              ) =>
                                updatePoint(
                                  index,
                                  "code",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </Field>

                          <Field label="Latitude *">
                            <input
                              type="number"
                              step="any"
                              required
                              value={
                                point.lat
                              }
                              style={
                                inputStyle
                              }
                              onChange={(
                                event
                              ) =>
                                updatePoint(
                                  index,
                                  "lat",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </Field>

                          <Field label="Longitude *">
                            <input
                              type="number"
                              step="any"
                              required
                              value={
                                point.lng
                              }
                              style={
                                inputStyle
                              }
                              onChange={(
                                event
                              ) =>
                                updatePoint(
                                  index,
                                  "lng",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </Field>

                          <Field label="Point Type">
                            <select
                              value={
                                point.type
                              }
                              style={
                                inputStyle
                              }
                              onChange={(
                                event
                              ) =>
                                updatePoint(
                                  index,
                                  "type",
                                  event
                                    .target
                                    .value
                                )
                              }
                            >
                              <option value="START">
                                Start
                              </option>
                              <option value="ROUTE">
                                Route
                              </option>
                              <option value="END">
                                End
                              </option>
                            </select>
                          </Field>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {error && (
              <div style={errorStyle}>
                {error}
              </div>
            )}

            <div style={footerStyle}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={
                  secondaryButtonStyle
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                style={
                  primaryButtonStyle
                }
              >
                {saving
                  ? "Saving..."
                  : mode ===
                      "create"
                    ? "Create Nala"
                    : mode ===
                        "edit"
                      ? "Save Changes"
                      : "Save NalaPoints"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

function DeleteNalaModal({
  nala,
  onClose,
  onSuccess
}: {
  nala: any;
  onClose: () => void;
  onSuccess: () =>
    void | Promise<void>;
}) {
  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const remove =
    async () => {
      try {
        setDeleting(true);
        setError("");

        await NalaApi.remove(
          nala.id
        );

        await onSuccess();
      } catch (err: any) {
        setError(
          err?.message ||
            "Failed to delete Nala."
        );
      } finally {
        setDeleting(false);
      }
    };

  return (
    <ModalPortal>
      <div style={overlayStyle}>
        <div
          style={{
            ...modalStyle,
            maxWidth: 460
          }}
        >
          <div style={modalHeaderStyle}>
            <h3
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 800
              }}
            >
              Delete Nala
            </h3>

            <button
              type="button"
              onClick={onClose}
              style={closeButtonStyle}
            >
              �
            </button>
          </div>

          <div
            style={{
              padding: 22
            }}
          >
            <p
              style={{
                margin:
                  "0 0 16px",
                color:
                  "#475569",
                fontSize: 13,
                lineHeight: 1.6
              }}
            >
              Delete{" "}
              <strong>
                {nala.nalaName}
              </strong>
              ? This removes it from active
              NALA operations.
            </p>

            {error && (
              <div style={errorStyle}>
                {error}
              </div>
            )}

            <div style={footerStyle}>
              <button
                type="button"
                onClick={onClose}
                disabled={deleting}
                style={
                  secondaryButtonStyle
                }
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                style={
                  dangerButtonStyle
                }
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Nala"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <label>
      <div
        style={{
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 700,
          color: "#334155"
        }}
      >
        {label}
      </div>

      {children}
    </label>
  );
}

const filterStyle:
  React.CSSProperties = {
    minWidth: 160,
    height: 34,
    padding: "6px 10px",
    borderRadius: 8,
    border:
      "1px solid #cbd5e1",
    background: "#ffffff",
    fontSize: 12,
    color: "#334155"
  };

const inputStyle:
  React.CSSProperties = {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 8,
    border:
      "1px solid #cbd5e1",
    background: "#ffffff",
    fontSize: 12
  };

const gridStyle:
  React.CSSProperties = {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 14
  };

const pointGridStyle:
  React.CSSProperties = {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 10
  };

const thStyle:
  React.CSSProperties = {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b"
  };

const tdStyle:
  React.CSSProperties = {
    padding: "13px 14px",
    fontSize: 12,
    color: "#475569"
  };

const primaryButtonStyle:
  React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer"
  };

const secondaryButtonStyle:
  React.CSSProperties = {
    padding: "7px 11px",
    borderRadius: 8,
    border:
      "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#475569",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer"
  };

const dangerButtonStyle:
  React.CSSProperties = {
    padding: "7px 11px",
    borderRadius: 8,
    border:
      "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer"
  };

const dangerTextButtonStyle:
  React.CSSProperties = {
    border: "none",
    background:
      "transparent",
    color: "#dc2626",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer"
  };

const overlayStyle:
  React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background:
      "rgba(15,23,42,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 1100
  };

const modalStyle:
  React.CSSProperties = {
    width:
      "min(820px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: 16,
    boxShadow:
      "0 24px 70px rgba(15,23,42,0.2)"
  };

const modalHeaderStyle:
  React.CSSProperties = {
    padding: "16px 22px",
    borderBottom:
      "1px solid #e2e8f0",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 12
  };

const closeButtonStyle:
  React.CSSProperties = {
    border: "none",
    background:
      "transparent",
    fontSize: 22,
    color: "#64748b",
    cursor: "pointer"
  };

const footerStyle:
  React.CSSProperties = {
    display: "flex",
    justifyContent:
      "flex-end",
    gap: 8,
    marginTop: 20
  };

const errorStyle:
  React.CSSProperties = {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 8,
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: 12
  };

const emptyStyle:
  React.CSSProperties = {
    padding: 40,
    textAlign: "center",
    borderRadius: 14,
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    color: "#64748b",
    fontSize: 13
  };

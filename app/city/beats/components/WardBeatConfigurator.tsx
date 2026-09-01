"use client";

import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import { createPortal } from "react-dom";

import {
    MapContainer,
    TileLayer,
    GeoJSON,
    Marker,
    Tooltip,
    useMap,
    useMapEvents,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import {
    X,
    MapPin,
    Search,
    UserRound,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    Pencil,
} from "lucide-react";

import {
    CityUserApi,
} from "@lib/apiClient";


/* =========================================================
   TYPES
========================================================= */

export interface WardBeatPreviewItem {
    sourceIndex: number;
    sourceName: string;
    beatNumber: string;

    suggestedBeatName: string;

    employeeName: string | null;

    geometry: any;
    geometryType: string;

    employeeStatus:
    | "REGISTERED"
    | "NOT_REGISTERED"
    | "NOT_SPECIFIED"
    | "NOT_IN_SWEEPING"
    | "DUPLICATE";

    employee: {
        id: string;
        name: string;
        email?: string | null;
        phone?: string | null;
    } | null;

    employeeMessage?: string | null;

    existingSubmission?: {
        beatId: string;
        beatName: string;
        beatCode?: string | null;
        areaId?: string | null;
        submittedAt?: string | null;

        employee: {
            id: string;
            name: string;
            email?: string | null;
            phone?: string | null;
        } | null;

        supervisor: {
            id: string;
            name: string;
            email?: string | null;
            phone?: string | null;
        } | null;

        points: Array<{
            lat: number;
            lng: number;
            label: string;
        }>;
    } | null;
}


export interface WardBeatDraft {
    key: string;

    sourceIndex: number;
    beatNumber: string;

    beatName: string;

    geometry: any;

    employeeId: string | null;
    employeeName: string | null;

    supervisorId: string | null;
    supervisorName: string | null;

    submittedBeatId: string | null;
    submittedAt: string | null;

    points: Array<{
        lat: number;
        lng: number;
        label: string;
    }>;
}


interface Props {
    beats: WardBeatPreviewItem[];

    wardName: string;
    zoneName?: string;
    areaName?: string;

    zoneId: string;
    wardId: string;
    areaId: string;

    existingDrafts?: WardBeatDraft[];

    onChange: (
        drafts: WardBeatDraft[]
    ) => void;

    onSaveExistingAssignments?: (
        drafts: WardBeatDraft[]
    ) => Promise<void>;

    onClose: () => void;
}


/* =========================================================
   COLORS
========================================================= */

const BEAT_COLORS = [
    "#2563eb",
    "#7c3aed",
    "#059669",
    "#ea580c",
    "#db2777",
    "#0891b2",
    "#65a30d",
    "#9333ea",
    "#0f766e",
    "#c2410c",
];

function generateFiveBeatPoints(geometry: any) {
    const paths: number[][][] = [];
    const collect = (value: any) => {
        if (!Array.isArray(value) || value.length === 0) return;
        if (
            Array.isArray(value[0]) &&
            value[0].length >= 2 &&
            Number.isFinite(Number(value[0][0])) &&
            Number.isFinite(Number(value[0][1]))
        ) {
            paths.push(value as number[][]);
            return;
        }
        value.forEach(collect);
    };

    collect(geometry?.coordinates);
    const path = paths.sort((a, b) => b.length - a.length)[0] || [];
    const clean = path
        .map((coordinate) => [Number(coordinate[0]), Number(coordinate[1])])
        .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
    if (!clean.length) return [];
    if (clean.length === 1) {
        return Array.from({ length: 5 }, (_, index) => ({
            lat: clean[0][1], lng: clean[0][0], label: `P${index + 1}`,
        }));
    }

    const lengths = [0];
    for (let index = 1; index < clean.length; index += 1) {
        lengths.push(lengths[index - 1] + Math.hypot(
            clean[index][0] - clean[index - 1][0],
            clean[index][1] - clean[index - 1][1]
        ));
    }
    const total = lengths[lengths.length - 1];
    return Array.from({ length: 5 }, (_, pointIndex) => {
        const target = total > 0 ? (total * (pointIndex + 0.5)) / 5 : 0;
        let segmentIndex = lengths.findIndex((length) => length >= target);
        if (segmentIndex <= 0) segmentIndex = 1;
        const startLength = lengths[segmentIndex - 1];
        const endLength = lengths[segmentIndex] || startLength;
        const ratio = endLength > startLength
            ? (target - startLength) / (endLength - startLength)
            : 0;
        const start = clean[segmentIndex - 1];
        const end = clean[segmentIndex] || start;
        return {
            lat: start[1] + (end[1] - start[1]) * ratio,
            lng: start[0] + (end[0] - start[0]) * ratio,
            label: `P${pointIndex + 1}`,
        };
    });
}

const pointIcon = (label: string) => L.divIcon({
    className: "ward-point-marker",
    html: `<span>${String(label).replace(/[^a-zA-Z0-9_-]/g, "")}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
});


/* =========================================================
   MAP FIT
========================================================= */

function FitBeatBounds({
    drafts,
    selectedKey,
}: {
    drafts: WardBeatDraft[];
    selectedKey: string | null;
}) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        map.invalidateSize();

        const timer =
            window.setTimeout(() => {
                const group =
                    new L.FeatureGroup();

                const targets =
                    selectedKey
                        ? drafts.filter(
                            (beat) =>
                                beat.key ===
                                selectedKey
                        )
                        : drafts;

                targets.forEach(
                    (beat) => {
                        if (
                            !beat.geometry
                        ) {
                            return;
                        }

                        try {
                            group.addLayer(
                                L.geoJSON(
                                    beat.geometry
                                )
                            );
                        } catch (
                        error
                        ) {
                            console.error(
                                "Invalid beat geometry",
                                error
                            );
                        }
                    }
                );

                if (
                    group.getLayers()
                        .length === 0
                ) {
                    return;
                }

                const bounds =
                    group.getBounds();

                if (!bounds.isValid()) {
                    return;
                }

                map.fitBounds(
                    bounds,
                    {
                        padding:
                            selectedKey
                                ? [
                                    70,
                                    70,
                                ]
                                : [
                                    35,
                                    35,
                                ],
                        maxZoom:
                            selectedKey
                                ? 18
                                : 16,
                    }
                );
            }, 100);

        return () =>
            window.clearTimeout(
                timer
            );
    }, [
        drafts,
        selectedKey,
        map,
    ]);

    return null;
}

function PointSelectionController({
    enabled,
    pointCount,
    onAddPoint,
}: {
    enabled: boolean;
    pointCount: number;
    onAddPoint: (
        lat: number,
        lng: number
    ) => void;
}) {
    useMapEvents({
        click(e) {
            if (!enabled) return;

            if (pointCount >= 5) {
                return;
            }

            onAddPoint(
                e.latlng.lat,
                e.latlng.lng
            );
        },
    });

    return null;
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function WardBeatConfigurator({
    beats,
    wardName,
    zoneName,
    areaName,

    zoneId,
    wardId,
    areaId,

    existingDrafts = [],

    onChange,
    onSaveExistingAssignments,
    onClose,
}: Props) {
    const [mounted, setMounted] =
        useState(false);

    const [users, setUsers] =
        useState<any[]>([]);

    const [loadingUsers, setLoadingUsers] =
        useState(true);

    const [search, setSearch] =
        useState("");

    const [selectedKey, setSelectedKey] =
        useState<string | null>(
            null
        );

    const [drafts, setDrafts] =
        useState<WardBeatDraft[]>(
            []
        );

    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [bulkSupervisorId, setBulkSupervisorId] = useState("");
    const [bulkEmployeeId, setBulkEmployeeId] = useState("");
    const [dirtyExistingKeys, setDirtyExistingKeys] = useState<string[]>([]);
    const [savingAssignments, setSavingAssignments] = useState(false);

    const [
        pointSelectionMode,
        setPointSelectionMode,
    ] = useState(false);


    /* =====================================================
       MOUNT
    ===================================================== */

    useEffect(() => {
        setMounted(true);

        return () =>
            setMounted(false);
    }, []);


    /* =====================================================
       INITIAL DRAFTS
    ===================================================== */

    useEffect(() => {
        const initial =
            beats.map((beat) => {
                const key =
                    `${beat.beatNumber}-${beat.sourceIndex}`;

                /*
                 * Backend is authoritative for a beat
                 * that has already been submitted.
                 *
                 * This is what restores the beat when
                 * the same KML/KMZ is uploaded again.
                 */
                const submitted =
                    beat.existingSubmission;


                if (submitted?.beatId) {
                    return {
                        key,

                        sourceIndex:
                            beat.sourceIndex,

                        beatNumber:
                            beat.beatNumber,

                        /*
                         * Keep the final saved name.
                         * Example:
                         * Beat 07 -> Gulab Bagh
                         */
                        beatName:
                            submitted.beatName ||
                            beat.suggestedBeatName,

                        /*
                         * Continue using geometry
                         * from the current uploaded file.
                         */
                        geometry:
                            beat.geometry,

                        employeeId:
                            submitted.employee?.id ||
                            null,

                        employeeName:
                            submitted.employee?.name ||
                            null,

                        supervisorId:
                            submitted.supervisor?.id ||
                            null,

                        supervisorName:
                            submitted.supervisor?.name ||
                            null,

                        /*
                         * Restore saved five points.
                         */
                        points:
                            Array.isArray(
                                submitted.points
                            )
                                ? submitted.points
                                    .slice(0, 5)
                                    .map(
                                        (
                                            point,
                                            index
                                        ) => ({
                                            lat:
                                                Number(
                                                    point.lat
                                                ),

                                            lng:
                                                Number(
                                                    point.lng
                                                ),

                                            label:
                                                point.label ||
                                                `P${index + 1}`,
                                        })
                                    )
                                    .filter(
                                        (point) =>
                                            Number.isFinite(
                                                point.lat
                                            ) &&
                                            Number.isFinite(
                                                point.lng
                                            )
                                    )
                                : [],

                        /*
                         * This makes all your existing
                         * Submitted/Locked logic work.
                         */
                        submittedBeatId:
                            submitted.beatId,

                        submittedAt:
                            submitted.submittedAt ||
                            null,
                    };
                }


                /*
                 * Keep current unsaved work from the
                 * same open import session.
                 */
                const old =
                    existingDrafts.find(
                        (item) =>
                            item.key === key
                    );

                if (old) {
                    return old;
                }


                /*
                 * Brand-new pending beat.
                 */
                return {
                    key,

                    sourceIndex:
                        beat.sourceIndex,

                    beatNumber:
                        beat.beatNumber,

                    beatName:
                        beat.suggestedBeatName,

                    geometry:
                        beat.geometry,

                    employeeId:
                        beat.employee?.id ||
                        null,

                    employeeName:
                        beat.employee?.name ||
                        beat.employeeName ||
                        null,

                    supervisorId:
                        null,

                    supervisorName:
                        null,

                    points:
                        generateFiveBeatPoints(beat.geometry),

                    submittedBeatId:
                        null,

                    submittedAt:
                        null,
                };
            });


        setDrafts(initial);
        setSelectedKeys(initial.map((beat) => beat.key));


        /*
         * Prefer first pending beat.
         *
         * If 2 of 41 are already submitted,
         * user immediately lands on one of
         * the remaining 39 instead of a
         * locked submitted beat.
         */
        if (
            initial.length > 0 &&
            !selectedKey
        ) {
            const firstPending =
                initial.find(
                    (beat) =>
                        !beat.submittedBeatId
                );

            setSelectedKey(
                firstPending?.key ||
                initial[0].key
            );
        }

    }, [
        beats,
        existingDrafts,
    ]);


    /* =====================================================
       USERS
    ===================================================== */

    useEffect(() => {
        const loadUsers =
            async () => {
                try {
                    setLoadingUsers(
                        true
                    );

                    const result =
                        await CityUserApi.list();

                    setUsers(
                        result.users || []
                    );
                } catch (
                error
                ) {
                    console.error(
                        "Failed to load beat assignees",
                        error
                    );

                    setUsers([]);
                } finally {
                    setLoadingUsers(
                        false
                    );
                }
            };

        loadUsers();
    }, []);


    /* =====================================================
       SCOPE FILTER
    ===================================================== */

    const matchesLocation = (
        user: any
    ) => {
        const userZoneIds =
            user.zoneIds || [];

        const userWardIds =
            user.wardIds || [];

        const zoneMatches =
            userZoneIds.length ===
            0 ||
            userZoneIds.includes(
                zoneId
            );

        const wardMatches =
            userWardIds.length ===
            0 ||
            userWardIds.includes(
                wardId
            );

        return (
            zoneMatches &&
            wardMatches
        );
    };


    const hasSweeping = (
        user: any
    ) =>
        (user.modules || []).some(
            (module: any) =>
                String(
                    module.key ||
                    module.name ||
                    ""
                )
                    .trim()
                    .toUpperCase() ===
                "SWEEPING"
        );


    const employees =
        useMemo(
            () =>
                users.filter(
                    (user) =>
                        String(
                            user.role
                        ).toUpperCase() ===
                        "EMPLOYEE" &&
                        hasSweeping(
                            user
                        ) &&
                        matchesLocation(
                            user
                        )
                ),
            [
                users,
                zoneId,
                wardId,
            ]
        );


    const supervisors =
        useMemo(
            () =>
                users.filter(
                    (user) =>
                        String(
                            user.role
                        ).toUpperCase() ===
                        "SUPERVISOR" &&
                        hasSweeping(
                            user
                        ) &&
                        matchesLocation(
                            user
                        )
                ),
            [
                users,
                zoneId,
                wardId,
            ]
        );


    /* =====================================================
       SELECTED BEAT
    ===================================================== */

    const selectedBeat =
        drafts.find(
            (beat) =>
                beat.key ===
                selectedKey
        ) || null;

    useEffect(() => {
        setPointSelectionMode(false);
    }, [selectedKey]);


    /* =====================================================
       UPDATE BEAT
    ===================================================== */

    const updateSelectedBeat = (
        patch:
            Partial<WardBeatDraft>
    ) => {
        if (!selectedKey) {
            return;
        }

        setDrafts(
            (current) =>
                current.map(
                    (beat) =>
                        beat.key ===
                            selectedKey
                            ? {
                                ...beat,
                                ...patch,
                            }
                            : beat
                )
        );
    };

    const updateSelectedPoint = (index: number, lat: number, lng: number) => {
        if (!selectedBeat) return;
        updateSelectedBeat({
            points: selectedBeat.points.map((point, pointIndex) =>
                pointIndex === index ? { ...point, lat, lng } : point
            ),
        });
        if (selectedBeat.submittedBeatId) {
            setDirtyExistingKeys((current) => Array.from(new Set([...current, selectedBeat.key])));
        }
    };

    const applyBulkAssignment = (role: "SUPERVISOR" | "EMPLOYEE") => {
        const userId = role === "SUPERVISOR" ? bulkSupervisorId : bulkEmployeeId;
        const candidates = role === "SUPERVISOR" ? supervisors : employees;
        if (!userId || selectedKeys.length === 0) return;
        const person = candidates.find((item) => item.id === userId);
        setDrafts((current) => current.map((beat) => {
            if (!selectedKeys.includes(beat.key)) return beat;
            return role === "SUPERVISOR"
                ? { ...beat, supervisorId: userId, supervisorName: person?.name || null }
                : { ...beat, employeeId: userId, employeeName: person?.name || null };
        }));
        setDirtyExistingKeys((current) => Array.from(new Set([
            ...current,
            ...drafts.filter((beat) => selectedKeys.includes(beat.key) && beat.submittedBeatId).map((beat) => beat.key),
        ])));
    };

    const toggleBeatSelection = (key: string) => {
        setSelectedKeys((current) => current.includes(key)
            ? current.filter((item) => item !== key)
            : [...current, key]);
    };

    const addPointToSelectedBeat = (
        lat: number,
        lng: number
    ) => {
        if (!selectedBeat) {
            return;
        }

        if (
            selectedBeat.points.length >= 5
        ) {
            setPointSelectionMode(false);
            return;
        }

        const nextIndex =
            selectedBeat.points.length + 1;

        const nextPoints = [
            ...selectedBeat.points,
            {
                lat,
                lng,
                label: `P${nextIndex}`,
            },
        ];

        updateSelectedBeat({
            points: nextPoints,
        });

        /*
         * Automatically exit point mode
         * once the fifth point is added.
         */
        if (nextPoints.length >= 5) {
            setPointSelectionMode(false);
        }
    };


    const removeLastPoint = () => {
        if (!selectedBeat) {
            return;
        }

        updateSelectedBeat({
            points:
                selectedBeat.points.slice(
                    0,
                    -1
                ),
        });
    };


    const resetSelectedBeatPoints = () => {
        if (!selectedBeat) {
            return;
        }

        updateSelectedBeat({
            points: [],
        });

        setPointSelectionMode(false);
    };


    /* =====================================================
       SEARCH
    ===================================================== */

    const visibleBeats =
        useMemo(() => {
            const query =
                search
                    .trim()
                    .toLowerCase();

            if (!query) {
                return drafts;
            }

            return drafts.filter(
                (beat) =>
                    beat.beatName
                        .toLowerCase()
                        .includes(
                            query
                        ) ||
                    beat.beatNumber
                        .toLowerCase()
                        .includes(
                            query
                        ) ||
                    String(
                        beat.employeeName ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            query
                        )
            );
        }, [
            drafts,
            search,
        ]);


    /* =====================================================
       COMPLETION
    ===================================================== */

    const isBeatReady = (
        beat: WardBeatDraft
    ) =>
        !!beat.beatName.trim() &&
        !!beat.geometry &&
        beat.points.length === 5;


    const submittedCount =
        drafts.filter(
            (beat) =>
                !!beat.submittedBeatId
        ).length;


    const readyCount =
        drafts.filter(
            (beat) =>
                !beat.submittedBeatId &&
                isBeatReady(beat)
        ).length;


    const pendingCount =
        drafts.filter(
            (beat) =>
                !beat.submittedBeatId &&
                !isBeatReady(beat)
        ).length;

    const configuredCount =
        submittedCount +
        readyCount;

    /* =====================================================
       DONE
    ===================================================== */

    const handleDone = async () => {
        try {
            setSavingAssignments(true);
            if (onSaveExistingAssignments && dirtyExistingKeys.length) {
                await onSaveExistingAssignments(
                    drafts.filter((beat) => dirtyExistingKeys.includes(beat.key))
                );
            }
            onChange(drafts);
            onClose();
        } finally {
            setSavingAssignments(false);
        }
    };


    if (!mounted) {
        return null;
    }


    /* =====================================================
       UI
    ===================================================== */

    return createPortal(
        <div
            className="ward-config-overlay"
        >
            <div
                className="ward-config-shell"
            >
                {/* ======================================
                    HEADER
                ======================================= */}

                <div
                    className="ward-config-header"
                >
                    <div>
                        <div className="ward-config-eyebrow">
                            Ward Beat Configuration
                        </div>

                        <h2>
                            {wardName}
                        </h2>

                        <div className="ward-config-location">
                            <MapPin
                                size={14}
                            />

                            {[
                                zoneName,
                                wardName,
                                areaName,
                            ]
                                .filter(
                                    Boolean
                                )
                                .join(
                                    " • "
                                )}
                        </div>
                    </div>

                    <div className="ward-config-header-actions">
                        <div className="ward-config-summary">
                            <strong>
                                {
                                    drafts.length
                                }
                            </strong>
                            <span>
                                Beats
                            </span>
                        </div>

                        <div className="ward-config-summary ready">
                            <strong>
                                {submittedCount}
                            </strong>
                            <span>
                                Submitted
                            </span>
                        </div>

                        <button
                            type="button"
                            className="ward-config-close"
                            onClick={
                                onClose
                            }
                        >
                            <X
                                size={18}
                            />
                        </button>
                    </div>
                </div>


                <div className="ward-config-bulkbar">
                    <div className="ward-config-selection-actions">
                        <strong>{selectedKeys.length} selected</strong>
                        <button type="button" onClick={() => setSelectedKeys(
                            drafts.map((beat) => beat.key)
                        )}>Select all</button>
                        <button type="button" onClick={() => setSelectedKeys([])}>Clear</button>
                    </div>
                    <div className="ward-config-bulk-control">
                        <select value={bulkSupervisorId} onChange={(event) => setBulkSupervisorId(event.target.value)}>
                            <option value="">Choose supervisor</option>
                            {supervisors.map((supervisor) => (
                                <option key={supervisor.id} value={supervisor.id}>{supervisor.name}</option>
                            ))}
                        </select>
                        <button type="button" disabled={!bulkSupervisorId || !selectedKeys.length}
                            onClick={() => applyBulkAssignment("SUPERVISOR")}>
                            Assign supervisor
                        </button>
                    </div>
                    <div className="ward-config-bulk-control">
                        <select value={bulkEmployeeId} onChange={(event) => setBulkEmployeeId(event.target.value)}>
                            <option value="">Choose employee</option>
                            {employees.map((employee) => (
                                <option key={employee.id} value={employee.id}>{employee.name}</option>
                            ))}
                        </select>
                        <button type="button" disabled={!bulkEmployeeId || !selectedKeys.length}
                            onClick={() => applyBulkAssignment("EMPLOYEE")}>
                            Assign employee
                        </button>
                    </div>
                </div>


                {/* ======================================
                    CONTENT
                ======================================= */}

                <div
                    className="ward-config-content"
                >
                    {/* ==================================
                        LEFT - BEAT LIST
                    =================================== */}

                    <aside
                        className="ward-config-list"
                    >
                        <div className="ward-config-search">
                            <Search
                                size={15}
                            />

                            <input
                                value={
                                    search
                                }
                                onChange={(
                                    e
                                ) =>
                                    setSearch(
                                        e
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Search beat or employee..."
                            />
                        </div>

                        <div className="ward-config-list-scroll">
                            {visibleBeats.map(
                                (
                                    beat,
                                    index
                                ) => {
                                    const active =
                                        beat.key ===
                                        selectedKey;

                                    const submitted =
                                        !!beat.submittedBeatId;

                                    const ready =
                                        !submitted &&
                                        isBeatReady(beat);

                                    const pending =
                                        !submitted &&
                                        !ready;

                                    return (
                                        <button
                                            type="button"
                                            key={
                                                beat.key
                                            }
                                            className={`ward-beat-list-item ${active
                                                ? "active"
                                                : ""
                                                }`}
                                            onClick={() =>
                                                setSelectedKey(
                                                    beat.key
                                                )
                                            }
                                        >
                                            <span
                                                className={`ward-beat-checkbox ${selectedKeys.includes(beat.key) ? "checked" : ""}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleBeatSelection(beat.key);
                                                }}
                                                aria-label={`Select ${beat.beatName}`}
                                            >
                                                {selectedKeys.includes(beat.key) ? "✓" : ""}
                                            </span>
                                            <span
                                                className="ward-beat-number"
                                                style={{
                                                    borderColor:
                                                        BEAT_COLORS[
                                                        index %
                                                        BEAT_COLORS.length
                                                        ],
                                                }}
                                            >
                                                {
                                                    beat.beatNumber
                                                }
                                            </span>

                                            <span className="ward-beat-list-info">
                                                <strong>
                                                    {
                                                        beat.beatName
                                                    }
                                                </strong>

                                                <small>
                                                    {submitted
                                                        ? "Submitted"
                                                        : ready
                                                            ? beat.employeeName || beat.supervisorName
                                                                ? "Ready to import • assigned"
                                                                : "Ready to import • unassigned"
                                                            : beat.employeeName
                                                                ? `Employee: ${beat.employeeName}`
                                                                : "Employee not selected"}
                                                </small>
                                            </span>

                                            {submitted ? (
                                                <CheckCircle2
                                                    size={16}
                                                    color="#047857"
                                                />
                                            ) : ready ? (
                                                <CheckCircle2
                                                    size={16}
                                                    color="#2563eb"
                                                />
                                            ) : (
                                                <AlertTriangle
                                                    size={16}
                                                    color="#d97706"
                                                />
                                            )}
                                        </button>
                                    );
                                }
                            )}
                        </div>
                    </aside>


                    {/* ==================================
                        CENTER - MAP
                    =================================== */}

                    <section
                        className="ward-config-map"
                    >
                        <MapContainer
                            center={[
                                22.7196,
                                75.8577,
                            ]}
                            zoom={13}
                            style={{
                                width:
                                    "100%",
                                height:
                                    "100%",
                            }}
                            zoomControl={
                                true
                            }
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                maxZoom={20}
                            />

                            <FitBeatBounds
                                drafts={
                                    drafts
                                }
                                selectedKey={
                                    selectedKey
                                }
                            />

                            <PointSelectionController
                                enabled={
                                    pointSelectionMode &&
                                    !!selectedBeat &&
                                    !selectedBeat.submittedBeatId
                                }
                                pointCount={
                                    selectedBeat?.points.length ||
                                    0
                                }
                                onAddPoint={
                                    addPointToSelectedBeat
                                }
                            />

                            {drafts.map(
                                (
                                    beat,
                                    index
                                ) => {
                                    const selected =
                                        beat.key ===
                                        selectedKey;

                                    if (
                                        !beat.geometry
                                    ) {
                                        return null;
                                    }

                                    return (
                                        <GeoJSON
                                            key={`${beat.key}-${selected}`}
                                            data={
                                                beat.geometry
                                            }
                                            style={{
                                                color:
                                                    selected
                                                        ? "#2563eb"
                                                        : BEAT_COLORS[
                                                        index %
                                                        BEAT_COLORS.length
                                                        ],

                                                weight:
                                                    selected
                                                        ? 8
                                                        : 4,

                                                opacity:
                                                    selected
                                                        ? 1
                                                        : 0.8,

                                                fillOpacity:
                                                    selected
                                                        ? 0.25
                                                        : 0.08,
                                            }}
                                            eventHandlers={{
                                                click: () =>
                                                    setSelectedKey(
                                                        beat.key
                                                    ),
                                            }}
                                        />
                                    );
                                }
                            )}

                            {selectedBeat?.points.map(
                                (point, index) => (
                                    <Marker
                                        key={`${selectedBeat.key}-editable-point-${index}`}
                                        position={[point.lat, point.lng]}
                                        icon={pointIcon(point.label)}
                                        draggable
                                        eventHandlers={{
                                            dragend: (event: any) => {
                                                const position = event.target.getLatLng();
                                                updateSelectedPoint(index, position.lat, position.lng);
                                            },
                                        }}
                                    >
                                        <Tooltip direction="top" offset={[0, -16]}>
                                            Drag to edit {point.label}
                                        </Tooltip>
                                    </Marker>
                                )
                            )}
                        </MapContainer>

                        <div className="ward-config-map-help">
                            {pointSelectionMode
                                ? `Click on the map to add point ${(selectedBeat?.points.length ||
                                    0) + 1
                                } of 5`
                                : "Click a beat to configure it. Drag its point markers to fine-tune them."}
                        </div>
                    </section>


                    {/* ==================================
                        RIGHT - DETAILS
                    =================================== */}

                    <aside
                        className="ward-config-details"
                    >
                        {!selectedBeat ? (
                            <div className="ward-config-empty">
                                <MapPin
                                    size={28}
                                />

                                Select a beat from
                                the map or list.
                            </div>
                        ) : (
                            <>
                                <div className="ward-config-details-title">
                                    <div>
                                        <small>
                                            Selected
                                            Beat
                                        </small>

                                        <strong>
                                            Beat{" "}
                                            {
                                                selectedBeat.beatNumber
                                            }
                                        </strong>
                                    </div>

                                    <span>
                                        {
                                            selectedBeat.beatNumber
                                        }
                                    </span>
                                </div>


                                {/* BEAT NAME */}

                                <div className="ward-config-field">
                                    <label>
                                        <Pencil
                                            size={
                                                13
                                            }
                                        />
                                        Beat Name
                                    </label>

                                    <input
                                        value={
                                            selectedBeat.beatName
                                        }
                                        disabled={
                                            !!selectedBeat.submittedBeatId
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            updateSelectedBeat(
                                                {
                                                    beatName:
                                                        e
                                                            .target
                                                            .value,
                                                }
                                            )
                                        }
                                        placeholder="Enter beat name"
                                    />
                                </div>

                                {selectedBeat.submittedBeatId && (
                                    <div
                                        style={{
                                            marginTop: "12px",
                                            padding: "10px 12px",
                                            borderRadius: "10px",
                                            background: "#ecfdf5",
                                            border: "1px solid #a7f3d0",
                                            color: "#047857",
                                            fontSize: "10px",
                                            fontWeight: 800,
                                        }}
                                    >
                                        ✓ This beat has already been submitted.
                                    </div>
                                )}


                                {/* EMPLOYEE */}

                                <div className="ward-config-field">
                                    <label>
                                        <UserRound
                                            size={
                                                13
                                            }
                                        />
                                        Employee
                                    </label>

                                    <select
                                        value={
                                            selectedBeat.employeeId ||
                                            ""
                                        }
                                        disabled={
                                            loadingUsers ||
                                            !!selectedBeat.submittedBeatId
                                        }
                                        onChange={(
                                            e
                                        ) => {
                                            const id =
                                                e
                                                    .target
                                                    .value;

                                            const person =
                                                employees.find(
                                                    (
                                                        item
                                                    ) =>
                                                        item.id ===
                                                        id
                                                );

                                            updateSelectedBeat(
                                                {
                                                    employeeId:
                                                        id ||
                                                        null,

                                                    employeeName:
                                                        person?.name ||
                                                        null,
                                                }
                                            );
                                        }}
                                    >
                                        <option value="">
                                            Select
                                            Employee
                                        </option>

                                        {employees.map(
                                            (
                                                employee
                                            ) => (
                                                <option
                                                    key={
                                                        employee.id
                                                    }
                                                    value={
                                                        employee.id
                                                    }
                                                >
                                                    {
                                                        employee.name
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>

                                    {selectedBeat.employeeId ? (
                                        <div className="ward-config-success">
                                            <CheckCircle2
                                                size={
                                                    13
                                                }
                                            />
                                            Employee
                                            mapped
                                        </div>
                                    ) : (
                                        <div className="ward-config-warning">
                                            <AlertTriangle
                                                size={
                                                    13
                                                }
                                            />
                                            Select an
                                            employee
                                            before
                                            saving.
                                        </div>
                                    )}
                                </div>


                                {/* SUPERVISOR */}

                                <div className="ward-config-field">
                                    <label>
                                        <ShieldCheck
                                            size={
                                                13
                                            }
                                        />
                                        Supervisor
                                    </label>

                                    <select
                                        value={
                                            selectedBeat.supervisorId ||
                                            ""
                                        }
                                        disabled={
                                            loadingUsers ||
                                            !!selectedBeat.submittedBeatId
                                        }
                                        onChange={(
                                            e
                                        ) => {
                                            const id =
                                                e
                                                    .target
                                                    .value;

                                            const person =
                                                supervisors.find(
                                                    (
                                                        item
                                                    ) =>
                                                        item.id ===
                                                        id
                                                );

                                            updateSelectedBeat(
                                                {
                                                    supervisorId:
                                                        id ||
                                                        null,

                                                    supervisorName:
                                                        person?.name ||
                                                        null,
                                                }
                                            );
                                        }}
                                    >
                                        <option value="">
                                            Select
                                            Supervisor
                                        </option>

                                        {supervisors.map(
                                            (
                                                supervisor
                                            ) => (
                                                <option
                                                    key={
                                                        supervisor.id
                                                    }
                                                    value={
                                                        supervisor.id
                                                    }
                                                >
                                                    {
                                                        supervisor.name
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>


                                {/* POINTS - NEXT STEP */}

                                <div className="ward-config-points">
                                    <div>
                                        <span>
                                            5 Point Configuration
                                        </span>

                                        <strong
                                            style={{
                                                color:
                                                    selectedBeat.points
                                                        .length === 5
                                                        ? "#059669"
                                                        : "#2563eb",
                                            }}
                                        >
                                            {selectedBeat.points.length}
                                            /5
                                        </strong>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPointSelectionMode(
                                                (current) => !current
                                            )
                                        }
                                        disabled={
                                            !!selectedBeat.submittedBeatId ||
                                            (
                                                selectedBeat.points.length >= 5 &&
                                                !pointSelectionMode
                                            )
                                        }
                                        style={{
                                            background:
                                                pointSelectionMode
                                                    ? "#dc2626"
                                                    : selectedBeat.points
                                                        .length === 5
                                                        ? "#dcfce7"
                                                        : "#2563eb",

                                            color:
                                                pointSelectionMode
                                                    ? "#ffffff"
                                                    : selectedBeat.points
                                                        .length === 5
                                                        ? "#047857"
                                                        : "#ffffff",

                                            cursor:
                                                selectedBeat.points
                                                    .length === 5 &&
                                                    !pointSelectionMode
                                                    ? "default"
                                                    : "pointer",
                                        }}
                                    >
                                        {pointSelectionMode
                                            ? "Stop Adding Points"
                                            : selectedBeat.points
                                                .length === 5
                                                ? "5 Points Added"
                                                : "Add Points on Map"}
                                    </button>

                                    {selectedBeat.points.length >
                                        0 && (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "7px",
                                                    marginTop: "8px",
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={
                                                        removeLastPoint
                                                    }
                                                    disabled={
                                                        !!selectedBeat.submittedBeatId
                                                    }
                                                    style={{
                                                        background: "#fff",
                                                        color: "#475569",
                                                        border:
                                                            "1px solid #cbd5e1",
                                                        cursor: "pointer",
                                                        flex: 1,
                                                    }}
                                                >
                                                    Undo Last
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        resetSelectedBeatPoints
                                                    }
                                                    disabled={
                                                        !!selectedBeat.submittedBeatId
                                                    }
                                                    style={{
                                                        background: "#fff",
                                                        color: "#dc2626",
                                                        border:
                                                            "1px solid #fecaca",
                                                        cursor: "pointer",
                                                        flex: 1,
                                                    }}
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                        )}

                                    {selectedBeat.points.length ===
                                        5 ? (
                                        <small
                                            style={{
                                                color: "#047857",
                                                fontWeight: 700,
                                            }}
                                        >
                                            ✓ Five points configured
                                            successfully.
                                        </small>
                                    ) : (
                                        <small>
                                            Select{" "}
                                            {5 -
                                                selectedBeat.points
                                                    .length}{" "}
                                            more point
                                            {5 -
                                                selectedBeat.points
                                                    .length ===
                                                1
                                                ? ""
                                                : "s"}{" "}
                                            on the map.
                                        </small>
                                    )}
                                </div>
                            </>
                        )}
                    </aside>
                </div>


                {/* ======================================
                    FOOTER
                ======================================= */}

                <div className="ward-config-footer">
                    <div
                        style={{
                            display: "flex",
                            gap: "14px",
                            flexWrap: "wrap",
                        }}
                    >
                        <span>
                            <strong
                                style={{
                                    color: "#047857",
                                }}
                            >
                                {submittedCount}
                            </strong>{" "}
                            Submitted
                        </span>

                        <span>
                            <strong
                                style={{
                                    color: "#2563eb",
                                }}
                            >
                                {readyCount}
                            </strong>{" "}
                            Ready
                        </span>

                        <span>
                            <strong
                                style={{
                                    color: "#d97706",
                                }}
                            >
                                {pendingCount}
                            </strong>{" "}
                            Pending
                        </span>
                    </div>

                    <div>
                        <button
                            type="button"
                            className="secondary"
                            onClick={
                                onClose
                            }
                        >
                            Back
                        </button>

                        <button
                            type="button"
                            className="primary"
                            onClick={
                                handleDone
                            }
                            disabled={savingAssignments}
                        >
                            {savingAssignments ? "Saving..." : "Save Configuration"}
                        </button>
                    </div>
                </div>
            </div>


            <style jsx global>{`
                .ward-config-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 5000;
                    background: rgba(
                        15,
                        23,
                        42,
                        0.56
                    );
                    backdrop-filter: blur(
                        6px
                    );
                    padding: 18px;
                    box-sizing: border-box;
                    overflow: auto;
                }

                .ward-config-shell {
                    width: min(
                        1500px,
                        calc(
                            100vw - 36px
                        )
                    );
                    height: calc(
                        100dvh - 36px
                    );
                    min-height: 600px;
                    margin: 0 auto;
                    background: #fff;
                    border-radius: 20px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 30px 80px
                        rgba(
                            15,
                            23,
                            42,
                            0.28
                        );
                }

                .ward-config-header {
                    min-height: 82px;
                    padding: 15px 20px;
                    border-bottom: 1px
                        solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content:
                        space-between;
                    gap: 20px;
                    flex-shrink: 0;
                }

                .ward-config-eyebrow {
                    color: #2563eb;
                    font-size: 11px;
                    font-weight: 900;
                    text-transform:
                        uppercase;
                    letter-spacing: 0.08em;
                }

                .ward-config-header h2 {
                    margin: 3px 0;
                    color: #0f172a;
                    font-size: 21px;
                }

                .ward-config-location {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: #64748b;
                    font-size: 12px;
                    font-weight: 700;
                }

                .ward-config-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                }

                .ward-config-summary {
                    min-width: 72px;
                    background: #eff6ff;
                    color: #2563eb;
                    border-radius: 11px;
                    padding: 7px 10px;
                    text-align: center;
                }

                .ward-config-summary.ready {
                    background: #ecfdf5;
                    color: #047857;
                }

                .ward-config-summary strong {
                    display: block;
                    font-size: 16px;
                }

                .ward-config-summary span {
                    font-size: 9px;
                    font-weight: 800;
                    text-transform:
                        uppercase;
                }

                .ward-config-close {
                    width: 37px;
                    height: 37px;
                    border: 1px solid
                        #e2e8f0;
                    border-radius: 10px;
                    background: #fff;
                    color: #64748b;
                    display: grid;
                    place-items: center;
                    cursor: pointer;
                }

                .ward-config-content {
                    min-height: 0;
                    flex: 1;
                    display: grid;
                    grid-template-columns:
                        280px minmax(
                            420px,
                            1fr
                        )
                        310px;
                    overflow: hidden;
                }

                .ward-config-bulkbar {
                    min-height: 58px;
                    padding: 9px 18px;
                    border-bottom: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .ward-config-selection-actions,
                .ward-config-bulk-control {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                }

                .ward-config-selection-actions strong {
                    color: #0f172a;
                    font-size: 12px;
                }

                .ward-config-bulkbar select {
                    height: 36px;
                    min-width: 170px;
                    border: 1px solid #cbd5e1;
                    border-radius: 9px;
                    background: #fff;
                    padding: 0 9px;
                    color: #334155;
                    font-size: 12px;
                }

                .ward-config-bulkbar button {
                    height: 34px;
                    border: 1px solid #bfdbfe;
                    border-radius: 8px;
                    background: #eff6ff;
                    color: #1d4ed8;
                    padding: 0 10px;
                    font-size: 11px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .ward-config-bulkbar button:disabled {
                    opacity: 0.45;
                    cursor: not-allowed;
                }

          .ward-config-list {
    min-width: 0;
    min-height: 0;
    height: 100%;
    overflow: hidden;

    border-right: 1px solid #e2e8f0;

    display: flex;
    flex-direction: column;

    background: #fff;
}

                .ward-config-search {
                    margin: 12px;
                    height: 38px;
                    border: 1px solid
                        #dbe3ee;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    padding: 0 10px;
                    color: #94a3b8;
                    flex-shrink: 0;
                }

                .ward-config-search input {
                    width: 100%;
                    min-width: 0;
                    border: none;
                    outline: none;
                    font-size: 12px;
                    color: #334155;
                    background: transparent;
                }

                .ward-config-list-scroll {
                    min-height: 0;
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 8px 10px;
                }

                .ward-config-list-scroll {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
}

.ward-config-list-scroll::-webkit-scrollbar {
    width: 6px;
}

.ward-config-list-scroll::-webkit-scrollbar-track {
    background: transparent;
}

.ward-config-list-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
}

.ward-config-list-scroll::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

                .ward-beat-list-item {
                    width: 100%;
                    border: 1px solid
                        transparent;
                    background: transparent;
                    border-radius: 11px;
                    padding: 9px;
                    margin-bottom: 5px;
                    display: grid;
                    grid-template-columns:
                        22px 38px minmax(
                            0,
                            1fr
                        )
                        18px;
                    gap: 8px;
                    align-items: center;
                    cursor: pointer;
                    text-align: left;
                }

                .ward-beat-checkbox {
                    width: 18px;
                    height: 18px;
                    border: 1px solid #cbd5e1;
                    border-radius: 5px;
                    background: #fff;
                    color: #fff;
                    display: grid;
                    place-items: center;
                    font-size: 12px;
                    font-weight: 900;
                }

                .ward-beat-checkbox.checked {
                    background: #2563eb;
                    border-color: #2563eb;
                }

                .ward-point-marker {
                    border: 0;
                    background: transparent;
                }

                .ward-point-marker span {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: #2563eb;
                    border: 3px solid #fff;
                    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.35);
                    color: #fff;
                    display: grid;
                    place-items: center;
                    font-size: 10px;
                    font-weight: 900;
                }

                .ward-beat-list-item:hover {
                    background: #f8fafc;
                }

                .ward-beat-list-item.active {
                    border-color: #93c5fd;
                    background: #eff6ff;
                }

                .ward-beat-number {
                    width: 34px;
                    height: 34px;
                    border: 2px solid;
                    border-radius: 10px;
                    display: grid;
                    place-items: center;
                    font-size: 11px;
                    font-weight: 900;
                    color: #334155;
                    background: #fff;
                }

                .ward-beat-list-info {
                    min-width: 0;
                }

                .ward-beat-list-info strong {
                    display: block;
                    font-size: 12px;
                    color: #0f172a;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow:
                        ellipsis;
                }

                .ward-beat-list-info small {
                    display: block;
                    margin-top: 3px;
                    color: #64748b;
                    font-size: 10px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow:
                        ellipsis;
                }

                .ward-config-map {
                    min-width: 0;
                    min-height: 0;
                    position: relative;
                    background: #f8fafc;
                }

                .ward-config-map-help {
                    position: absolute;
                    left: 50%;
                    bottom: 15px;
                    transform: translateX(
                        -50%
                    );
                    z-index: 500;
                    padding: 7px 11px;
                    border-radius: 999px;
                    background: rgba(
                        15,
                        23,
                        42,
                        0.86
                    );
                    color: white;
                    font-size: 10px;
                    font-weight: 700;
                    pointer-events: none;
                }

                .ward-config-details {
                    border-left: 1px solid
                        #e2e8f0;
                    background: #fff;
                    padding: 15px;
                    overflow-y: auto;
                    min-width: 0;
                }

                .ward-config-details-title {
                    display: flex;
                    justify-content:
                        space-between;
                    align-items: center;
                    gap: 10px;
                    padding-bottom: 13px;
                    border-bottom: 1px
                        solid #f1f5f9;
                }

                .ward-config-details-title small {
                    display: block;
                    color: #94a3b8;
                    font-size: 9px;
                    font-weight: 900;
                    text-transform:
                        uppercase;
                }

                .ward-config-details-title strong {
                    display: block;
                    margin-top: 2px;
                    color: #0f172a;
                    font-size: 17px;
                }

                .ward-config-details-title
                    > span {
                    background: #eff6ff;
                    color: #2563eb;
                    border-radius: 9px;
                    padding: 7px 9px;
                    font-size: 11px;
                    font-weight: 900;
                }

                .ward-config-field {
                    margin-top: 16px;
                }

                .ward-config-field label {
                    margin-bottom: 6px;
                    color: #475569;
                    font-size: 10px;
                    font-weight: 900;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    text-transform:
                        uppercase;
                }

                .ward-config-field input,
                .ward-config-field select {
                    width: 100%;
                    height: 42px;
                    border: 1px solid
                        #cbd5e1;
                    border-radius: 10px;
                    padding: 0 10px;
                    background: #fff;
                    color: #0f172a;
                    font-size: 12px;
                    font-weight: 700;
                    box-sizing: border-box;
                    outline: none;
                }

                .ward-config-success,
                .ward-config-warning {
                    margin-top: 6px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 10px;
                    font-weight: 700;
                }

                .ward-config-success {
                    color: #047857;
                }

                .ward-config-warning {
                    color: #b45309;
                }

                .ward-config-points {
                    margin-top: 20px;
                    padding: 12px;
                    border: 1px solid
                        #e2e8f0;
                    border-radius: 12px;
                    background: #f8fafc;
                }

                .ward-config-points
                    > div {
                    display: flex;
                    justify-content:
                        space-between;
                    align-items: center;
                    color: #334155;
                    font-size: 11px;
                    font-weight: 800;
                }

            .ward-config-points button {
    width: 100%;
    margin-top: 10px;
    height: 36px;
    border-radius: 9px;
    font-weight: 800;
    font-size: 10px;
}

                .ward-config-points small {
                    display: block;
                    margin-top: 7px;
                    color: #94a3b8;
                    font-size: 9px;
                    line-height: 1.5;
                }

                .ward-config-empty {
                    min-height: 300px;
                    display: grid;
                    place-items: center;
                    align-content: center;
                    gap: 10px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 12px;
                }

                .ward-config-footer {
                    min-height: 62px;
                    padding: 10px 18px;
                    border-top: 1px solid
                        #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content:
                        space-between;
                    gap: 15px;
                    flex-shrink: 0;
                    color: #64748b;
                    font-size: 11px;
                }

                .ward-config-footer
                    > div:last-child {
                    display: flex;
                    gap: 8px;
                }

                .ward-config-footer button {
                    height: 38px;
                    padding: 0 16px;
                    border-radius: 9px;
                    font-size: 11px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .ward-config-footer
                    button.secondary {
                    background: #fff;
                    color: #475569;
                    border: 1px solid
                        #cbd5e1;
                }

                .ward-config-footer
                    button.primary {
                    background: #2563eb;
                    color: #fff;
                    border: 1px solid
                        #2563eb;
                }

                @media (
                    max-width: 1100px
                ) {
                    .ward-config-content {
                        grid-template-columns:
                            230px minmax(
                                380px,
                                1fr
                            );
                    }

                    .ward-config-details {
                        grid-column: 1 /
                            -1;
                        border-left: none;
                        border-top: 1px
                            solid #e2e8f0;
                        max-height: 280px;
                    }
                }

                @media (
                    max-width: 760px
                ) {
                    .ward-config-overlay {
                        padding: 0;
                    }

                    .ward-config-shell {
                        width: 100vw;
                        height: 100dvh;
                        min-height: 0;
                        border-radius: 0;
                    }

                    .ward-config-header {
                        padding: 12px;
                    }

                    .ward-config-header-actions
                        .ward-config-summary {
                        display: none;
                    }

                    .ward-config-content {
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                    }

                    .ward-config-list {
                        min-height: 230px;
                        max-height: 280px;
                        border-right: none;
                        border-bottom: 1px
                            solid #e2e8f0;
                    }

                    .ward-config-map {
                        height: 48dvh;
                        min-height: 360px;
                        flex-shrink: 0;
                    }

                    .ward-config-details {
                        max-height: none;
                        overflow: visible;
                    }

                    .ward-config-footer {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .ward-config-footer
                        > div:last-child {
                        width: 100%;
                    }

                    .ward-config-footer button {
                        flex: 1;
                    }
                }
            `}</style>
        </div>,
        document.body
    );
}

"use client";

import React, {
    useEffect,
    useState,
    useRef,
} from "react";
import {
    apiFetch,
    GeoApi,
    CityUserApi,
    CityModulesApi,
} from "@lib/apiClient";
import WardBeatConfigurator, {
    WardBeatDraft,
} from "./WardBeatConfigurator";
import {
    Upload,
    Loader2,
    CheckCircle2,
    AlertCircle,
    MapPin,
    Route,
    Users,
    UserCheck,
    UserX,
    RefreshCw,
    FileSearch,
} from "lucide-react";

interface BeatFormProps {
    onSuccess: () => void;
    geoVersion?: number;
}

type EmployeeStatus =
    | "REGISTERED"
    | "NOT_REGISTERED"
    | "NOT_SPECIFIED"
    | "NOT_IN_SWEEPING"
    | "DUPLICATE";

interface PreviewBeat {
    sourceIndex: number;
    sourceName: string;
    beatNumber: string;
    suggestedBeatName: string;
    employeeName: string | null;
    geometry: any;
    geometryType: string;

    employeeStatus: EmployeeStatus;

    employee: {
        id: string;
        name: string;
        email?: string | null;
        phone?: string | null;
    } | null;

    employeeMessage?: string | null;
}

interface ImportPreviewResponse {
    preview: {
        fileName: string;
        documentName: string | null;

        detectedWardName: string | null;

        wardMatched: boolean;

        ward: {
            id: string;
            name: string;
        } | null;

        zone: {
            id: string;
            name: string;
        } | null;

        beatCount: number;

        employeeSummary: {
            total: number;
            registered: number;
            notRegistered: number;
            notInSweeping: number;
            duplicate: number;
            notSpecified: number;
        };

        beats: PreviewBeat[];
    };
}

export default function BeatForm({
    onSuccess,
}: BeatFormProps) {
    /*
     * onSuccess is intentionally kept because the parent
     * page already passes it. It will be used when we add
     * final Import Beats in the next backend/frontend step.
     */
    void onSuccess;

    const [file, setFile] =
        useState<File | null>(null);

    const [preview, setPreview] =
        useState<ImportPreviewResponse["preview"] | null>(
            null
        );

    const [zones, setZones] =
        useState<any[]>([]);

    const [wards, setWards] =
        useState<any[]>([]);

    const [areas, setAreas] =
        useState<any[]>([]);

    const [selectedZone, setSelectedZone] =
        useState("");

    const [selectedWard, setSelectedWard] =
        useState("");

    const [selectedArea, setSelectedArea] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [status, setStatus] =
        useState<{
            type: "success" | "error";
            message: string;
        } | null>(null);

    const [registeringBeat, setRegisteringBeat] =
        useState<PreviewBeat | null>(null);

    const [
        showBeatConfigurator,
        setShowBeatConfigurator,
    ] = useState(false);

    const [
        beatDrafts,
        setBeatDrafts,
    ] = useState<WardBeatDraft[]>(
        []
    );

    const [
        importingBeats,
        setImportingBeats,
    ] = useState(false);

    const [employeePhone, setEmployeePhone] =
        useState("");

    const [
        registeringEmployee,
        setRegisteringEmployee,
    ] = useState(false);

    const [
        registrationError,
        setRegistrationError,
    ] = useState("");

    const lastPreviewLocationKey =
        useRef("");

    /* =========================================================
       FILE
    ========================================================= */

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const selectedFile =
            e.target.files?.[0];

        if (!selectedFile) return;

        const fileName =
            selectedFile.name.toLowerCase();

        if (
            !fileName.endsWith(".kml") &&
            !fileName.endsWith(".kmz")
        ) {
            setStatus({
                type: "error",
                message:
                    "Only .kml or .kmz files are allowed",
            });

            setFile(null);
            setPreview(null);
            return;
        }

        if (
            selectedFile.size >
            5 * 1024 * 1024
        ) {
            setStatus({
                type: "error",
                message:
                    "File size exceeds 5MB limit",
            });

            setFile(null);
            setPreview(null);
            return;
        }

        setFile(selectedFile);

        /*
         * New file = old preview is invalid.
         */
        setPreview(null);

        setSelectedZone("");
        setSelectedWard("");
        setSelectedArea("");

        setZones([]);
        setWards([]);
        setAreas([]);

        setStatus(null);
    };

    /* =========================================================
       ANALYSE
    ========================================================= */

    const handleAnalyse = async () => {
        if (!file) {
            setStatus({
                type: "error",
                message:
                    "Please select a KML or KMZ file first",
            });
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            const formData =
                new FormData();

            formData.append(
                "kmlFile",
                file
            );

            const result =
                await apiFetch<ImportPreviewResponse>(
                    "/city/areas/import-preview",
                    {
                        method: "POST",
                        body: formData,
                    }
                );

            const data =
                result.preview;

            setPreview(data);

            /*
             * Load Areas only if backend successfully
             * matched the Ward from the uploaded file.
             */
            const [
                zoneRes,
                wardRes,
                areaRes,
            ] = await Promise.all([
                GeoApi.list("ZONE"),
                GeoApi.list("WARD"),
                GeoApi.list("AREA"),
            ]);

            const allZones =
                zoneRes.nodes || [];

            const allWards =
                wardRes.nodes || [];

            const allAreas =
                areaRes.nodes || [];

            setZones(allZones);

            /*
             * CASE 1:
             * Backend successfully detected and
             * matched the Ward.
             */
            if (
                data.wardMatched &&
                data.ward?.id
            ) {
                const detectedZoneId =
                    data.zone?.id || "";

                setSelectedZone(
                    detectedZoneId
                );

                setSelectedWard(
                    data.ward.id
                );

                /*
                 * Show wards belonging to the
                 * detected Zone.
                 */
                const zoneWards =
                    detectedZoneId
                        ? allWards.filter(
                            (ward: any) =>
                                ward.parentId ===
                                detectedZoneId
                        )
                        : allWards;

                setWards(zoneWards);

                const wardAreas =
                    allAreas.filter(
                        (area: any) =>
                            area.parentId ===
                            data.ward!.id
                    );

                setAreas(wardAreas);

                if (
                    wardAreas.length === 1
                ) {
                    setSelectedArea(
                        wardAreas[0].id
                    );
                } else {
                    setSelectedArea("");
                }
            }

            /*
             * CASE 2:
             * Ward is missing from file
             * OR Ward name could not be matched.
             *
             * Let City Admin select Zone/Ward.
             */
            else {
                setSelectedZone("");
                setSelectedWard("");
                setSelectedArea("");

                setWards([]);
                setAreas([]);
            }

            setStatus({
                type: "success",
                message:
                    `${data.beatCount} beats detected successfully`,
            });
        } catch (err: any) {
            console.error(
                "Failed to analyse beat import",
                err
            );

            setPreview(null);

            setStatus({
                type: "error",
                message:
                    err?.message ||
                    "Failed to analyse KML/KMZ file",
            });
        } finally {
            setLoading(false);
        }
    };

    /* =========================================================
       RESET
    ========================================================= */

    const resetPreview = () => {
        setFile(null);
        setPreview(null);
        setSelectedArea("");
        setAreas([]);
        setStatus(null);

        const input =
            document.getElementById(
                "ward-beat-upload"
            ) as HTMLInputElement | null;

        if (input) {
            input.value = "";
        }
    };

    /* =========================================================
       STATUS HELPERS
    ========================================================= */

    const getStatusConfig = (
        employeeStatus: EmployeeStatus
    ) => {
        switch (employeeStatus) {
            case "REGISTERED":
                return {
                    label: "Registered",
                    bg: "#ecfdf5",
                    color: "#047857",
                    border: "#a7f3d0",
                };

            case "NOT_REGISTERED":
                return {
                    label: "Register Employee",
                    bg: "#fef2f2",
                    color: "#dc2626",
                    border: "#fecaca",
                };

            case "NOT_SPECIFIED":
                return {
                    label: "Select Employee",
                    bg: "#fff7ed",
                    color: "#c2410c",
                    border: "#fed7aa",
                };

            case "NOT_IN_SWEEPING":
                return {
                    label: "Sweeping Access Missing",
                    bg: "#fffbeb",
                    color: "#b45309",
                    border: "#fde68a",
                };

            case "DUPLICATE":
                return {
                    label: "Duplicate Name",
                    bg: "#fff7ed",
                    color: "#c2410c",
                    border: "#fed7aa",
                };

            default:
                return {
                    label: employeeStatus,
                    bg: "#f8fafc",
                    color: "#475569",
                    border: "#e2e8f0",
                };
        }
    };

    const handleZoneChange = async (
        zoneId: string
    ) => {
        setSelectedZone(zoneId);

        setSelectedWard("");
        setSelectedArea("");
        lastPreviewLocationKey.current = "";

        setAreas([]);

        if (!zoneId) {
            setWards([]);
            return;
        }

        const wardRes =
            await GeoApi.list("WARD");

        const zoneWards =
            (wardRes.nodes || []).filter(
                (ward: any) =>
                    ward.parentId ===
                    zoneId
            );

        setWards(zoneWards);
    };


    const handleWardChange = async (
        wardId: string
    ) => {
        setSelectedWard(wardId);
        lastPreviewLocationKey.current = "";
        setSelectedArea("");

        if (!wardId) {
            setAreas([]);
            return;
        }

        const areaRes =
            await GeoApi.list("AREA");

        const wardAreas =
            (areaRes.nodes || []).filter(
                (area: any) =>
                    area.parentId ===
                    wardId
            );

        setAreas(wardAreas);

        if (
            wardAreas.length === 1
        ) {
            setSelectedArea(
                wardAreas[0].id
            );
        }
    };

    const refreshPreviewForLocation = async (
        zoneId: string,
        wardId: string,
        areaId: string
    ) => {
        if (
            !file ||
            !zoneId ||
            !wardId ||
            !areaId
        ) {
            return;
        }

        try {
            setLoading(true);

            const formData =
                new FormData();

            formData.append(
                "kmlFile",
                file
            );

            formData.append(
                "zoneId",
                zoneId
            );

            formData.append(
                "wardId",
                wardId
            );

            formData.append(
                "areaId",
                areaId
            );

            const result =
                await apiFetch<ImportPreviewResponse>(
                    "/city/areas/import-preview",
                    {
                        method: "POST",
                        body: formData,
                    }
                );

            setPreview(
                result.preview
            );

            /*
             * New backend preview is now the
             * source of truth for submitted beats.
             *
             * Do not carry stale unsaved state when
             * changing import location.
             */
            setBeatDrafts([]);

            setStatus({
                type: "success",
                message:
                    `${result.preview.beatCount} beats loaded for the selected location`,
            });

        } catch (err: any) {
            console.error(
                "Failed to refresh beat preview",
                err
            );

            setStatus({
                type: "error",
                message:
                    err?.message ||
                    "Failed to check existing beats for selected location",
            });

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (
            !file ||
            !preview ||
            !selectedZone ||
            !selectedWard ||
            !selectedArea
        ) {
            return;
        }

        const locationKey =
            `${selectedZone}|${selectedWard}|${selectedArea}`;

        /*
         * Do not repeatedly call the preview API
         * for the same confirmed location.
         */
        if (
            lastPreviewLocationKey.current ===
            locationKey
        ) {
            return;
        }

        /*
         * If the current preview already belongs
         * to this selected Ward, no reconciliation
         * is required unless the location changed.
         */
        const previewWardId =
            preview.ward?.id || "";

        if (
            previewWardId === selectedWard &&
            preview.zone?.id === selectedZone
        ) {
            lastPreviewLocationKey.current =
                locationKey;

            return;
        }

        lastPreviewLocationKey.current =
            locationKey;

        refreshPreviewForLocation(
            selectedZone,
            selectedWard,
            selectedArea
        );

    }, [
        file,
        preview,
        selectedZone,
        selectedWard,
        selectedArea,
    ]);

    const openEmployeeRegistration = (
        beat: PreviewBeat
    ) => {
        if (!selectedZone || !selectedWard) {
            setStatus({
                type: "error",
                message:
                    "Please confirm Zone and Ward before registering the employee.",
            });

            return;
        }

        setRegisteringBeat(beat);

        setEmployeePhone("");
        setRegistrationError("");
    };

    const handleRegisterEmployee = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        if (!registeringBeat) return;

        const phone =
            employeePhone.replace(/\D/g, "");

        if (!/^\d{10}$/.test(phone)) {
            setRegistrationError(
                "Please enter a valid 10 digit contact number."
            );
            return;
        }

        if (
            !selectedZone ||
            !selectedWard
        ) {
            setRegistrationError(
                "Please confirm Zone and Ward first."
            );

            return;
        }

        try {
            setRegisteringEmployee(
                true
            );

            setRegistrationError("");

            /* =========================================
               REGISTER EMPLOYEE
            ========================================== */

            await apiFetch(
                "/city/areas/import-register-employee",
                {
                    method: "POST",
                    body: JSON.stringify({
                        name:
                            registeringBeat.employeeName,

                        phone,

                        zoneId:
                            selectedZone,

                        wardId:
                            selectedWard,
                    }),
                }
            );

            /* =========================================
               REFRESH SAME KMZ PREVIEW
            ========================================== */

            if (!file) {
                throw new Error(
                    "Uploaded KML/KMZ file is no longer available."
                );
            }

            const formData =
                new FormData();

            formData.append(
                "kmlFile",
                file
            );

            const result =
                await apiFetch<ImportPreviewResponse>(
                    "/city/areas/import-preview",
                    {
                        method:
                            "POST",

                        body:
                            formData,
                    }
                );

            setPreview(
                result.preview
            );

            setStatus({
                type: "success",

                message:
                    `Employee "${registeringBeat.employeeName}" registered successfully.`,
            });

            setRegisteringBeat(null);

            setEmployeePhone("");
        } catch (err: any) {
            console.error(
                "Failed to register employee",
                err
            );

            setRegistrationError(
                err?.message ||
                "Failed to register employee"
            );
        } finally {
            setRegisteringEmployee(
                false
            );
        }
    };

    const openBeatConfigurator = () => {
        if (!preview) {
            return;
        }

        if (
            !selectedZone ||
            !selectedWard ||
            !selectedArea
        ) {
            setStatus({
                type: "error",
                message:
                    "Please confirm Zone, Ward and Area before configuring beats.",
            });

            return;
        }

        setShowBeatConfigurator(
            true
        );
    };

    const isDraftReady = (
        beat: WardBeatDraft
    ) =>
        !!beat.beatName.trim() &&
        !!beat.employeeId &&
        !!beat.supervisorId &&
        !!beat.geometry &&
        beat.points.length === 5;


    const submittedBeatCount =
        beatDrafts.filter(
            (beat) =>
                !!beat.submittedBeatId
        ).length;


    const readyBeats =
        beatDrafts.filter(
            (beat) =>
                !beat.submittedBeatId &&
                isDraftReady(beat)
        );


    const readyBeatCount =
        readyBeats.length;


    const pendingBeatCount =
        beatDrafts.filter(
            (beat) =>
                !beat.submittedBeatId &&
                !isDraftReady(beat)
        ).length;


    const allBeatsSubmitted =
        !!preview &&
        beatDrafts.length ===
        preview.beatCount &&
        submittedBeatCount ===
        preview.beatCount;

    const handleSubmitReadyBeats =
        async () => {
            if (!preview) {
                return;
            }

            if (
                !selectedZone ||
                !selectedWard ||
                !selectedArea
            ) {
                setStatus({
                    type: "error",
                    message:
                        "Please confirm Zone, Ward and Area.",
                });

                return;
            }

            if (
                readyBeats.length === 0
            ) {
                setStatus({
                    type: "error",
                    message:
                        "No beats are ready to submit. Complete Beat Name, Employee, Supervisor and 5 Points first.",
                });

                return;
            }

            try {
                setImportingBeats(true);
                setStatus(null);

                const beatsBeingSubmitted =
                    [...readyBeats];

                const result =
                    await apiFetch<{
                        success: boolean;
                        message: string;
                        beatCount: number;
                        beatIds: string[];
                    }>(
                        "/city/areas/import-commit",
                        {
                            method: "POST",

                            body:
                                JSON.stringify({
                                    zoneId:
                                        selectedZone,

                                    wardId:
                                        selectedWard,

                                    areaId:
                                        selectedArea,

                                    /*
                                     * IMPORTANT:
                                     * Only READY beats
                                     * are submitted.
                                     */
                                    beats:
                                        beatsBeingSubmitted.map(
                                            (
                                                beat
                                            ) => ({
                                                sourceIndex:
                                                    beat.sourceIndex,

                                                beatNumber:
                                                    beat.beatNumber,

                                                beatName:
                                                    beat.beatName.trim(),

                                                geometry:
                                                    beat.geometry,

                                                employeeId:
                                                    beat.employeeId,

                                                supervisorId:
                                                    beat.supervisorId,

                                                points:
                                                    beat.points.map(
                                                        (
                                                            point
                                                        ) => ({
                                                            lat:
                                                                point.lat,

                                                            lng:
                                                                point.lng,

                                                            label:
                                                                point.label,
                                                        })
                                                    ),
                                            })
                                        ),
                                }),
                        }
                    );

                /*
                 * Backend returns beatIds in the
                 * same order as submitted beats.
                 */
                const now =
                    new Date().toISOString();

                setBeatDrafts(
                    (current) =>
                        current.map(
                            (draft) => {
                                const index =
                                    beatsBeingSubmitted.findIndex(
                                        (
                                            submitted
                                        ) =>
                                            submitted.key ===
                                            draft.key
                                    );

                                if (
                                    index === -1
                                ) {
                                    return draft;
                                }

                                return {
                                    ...draft,

                                    submittedBeatId:
                                        result
                                            .beatIds[
                                        index
                                        ] ||
                                        null,

                                    submittedAt:
                                        now,
                                };
                            }
                        )
                );

                const remaining =
                    preview.beatCount -
                    submittedBeatCount -
                    beatsBeingSubmitted.length;

                setStatus({
                    type: "success",

                    message:
                        `${beatsBeingSubmitted.length} beat${beatsBeingSubmitted.length ===
                            1
                            ? ""
                            : "s"
                        } submitted successfully. ${remaining >
                            0
                            ? `${remaining} beat${remaining ===
                                1
                                ? ""
                                : "s"
                            } still pending.`
                            : "All beats have been submitted."
                        }`,
                });

                /*
                 * Only finish the whole Create Beat
                 * flow when every beat is submitted.
                 */
                if (
                    remaining === 0
                ) {
                    onSuccess();
                }
            } catch (
            err: any
            ) {
                console.error(
                    "Failed to submit ready beats",
                    err
                );

                setStatus({
                    type: "error",
                    message:
                        err?.message ||
                        "Failed to submit ready beats.",
                });
            } finally {
                setImportingBeats(
                    false
                );
            }
        };

    /* =========================================================
       UI
    ========================================================= */

    return (
        <div
            style={{
                display: "grid",
                gap: "18px",
            }}
        >
            {/* =================================================
                STEP 1 - UPLOAD
            ================================================= */}

            <div
                style={{
                    border:
                        "1px solid #e2e8f0",
                    borderRadius:
                        "16px",
                    padding:
                        "18px",
                    background:
                        "#ffffff",
                }}
            >
                <div
                    style={{
                        display:
                            "flex",
                        justifyContent:
                            "space-between",
                        alignItems:
                            "flex-start",
                        gap: "12px",
                        marginBottom:
                            "14px",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize:
                                    "0.72rem",
                                fontWeight:
                                    900,
                                color:
                                    "#2563eb",
                                textTransform:
                                    "uppercase",
                                letterSpacing:
                                    "0.06em",
                            }}
                        >
                            Step 1
                        </div>

                        <h3
                            style={{
                                margin:
                                    "3px 0 2px",
                                fontSize:
                                    "1rem",
                                color:
                                    "#0f172a",
                                fontWeight:
                                    800,
                            }}
                        >
                            Upload Ward Map
                        </h3>

                        <p
                            style={{
                                margin: 0,
                                color:
                                    "#64748b",
                                fontSize:
                                    "0.77rem",
                                lineHeight:
                                    1.5,
                            }}
                        >
                            Upload one KML or KMZ containing
                            the ward beats and employee names.
                        </p>
                    </div>

                    {file && (
                        <button
                            type="button"
                            onClick={
                                resetPreview
                            }
                            style={{
                                border:
                                    "1px solid #e2e8f0",
                                background:
                                    "#fff",
                                borderRadius:
                                    "10px",
                                padding:
                                    "7px 10px",
                                cursor:
                                    "pointer",
                                color:
                                    "#64748b",
                                display:
                                    "flex",
                                alignItems:
                                    "center",
                                gap:
                                    "5px",
                                fontSize:
                                    "0.7rem",
                                fontWeight:
                                    700,
                            }}
                        >
                            <RefreshCw
                                size={13}
                            />
                            Change File
                        </button>
                    )}
                </div>

                <div
                    onClick={() =>
                        document
                            .getElementById(
                                "ward-beat-upload"
                            )
                            ?.click()
                    }
                    style={{
                        border:
                            file
                                ? "1.5px solid #93c5fd"
                                : "1.5px dashed #cbd5e1",

                        borderRadius:
                            "14px",

                        minHeight:
                            "125px",

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
                            "18px",

                        background:
                            file
                                ? "#eff6ff"
                                : "#f8fafc",

                        cursor:
                            "pointer",

                        transition:
                            "all .2s",
                    }}
                >
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius:
                                "13px",
                            display:
                                "grid",
                            placeItems:
                                "center",
                            background:
                                file
                                    ? "#dbeafe"
                                    : "#ffffff",
                            border:
                                "1px solid #e2e8f0",
                            marginBottom:
                                "10px",
                        }}
                    >
                        <Upload
                            size={20}
                            color="#2563eb"
                        />
                    </div>

                    <div
                        style={{
                            color:
                                "#0f172a",
                            fontSize:
                                "0.82rem",
                            fontWeight:
                                800,
                        }}
                    >
                        {file
                            ? file.name
                            : "Click to upload KML / KMZ"}
                    </div>

                    <div
                        style={{
                            marginTop:
                                "4px",
                            color:
                                "#94a3b8",
                            fontSize:
                                "0.68rem",
                            fontWeight:
                                600,
                        }}
                    >
                        Maximum file size 5MB
                    </div>

                    <input
                        id="ward-beat-upload"
                        type="file"
                        accept=".kml,.kmz"
                        onChange={
                            handleFileChange
                        }
                        style={{
                            display:
                                "none",
                        }}
                    />
                </div>

                {!preview && (
                    <button
                        type="button"
                        onClick={
                            handleAnalyse
                        }
                        disabled={
                            loading ||
                            !file
                        }
                        style={{
                            marginTop:
                                "14px",
                            width:
                                "100%",
                            height:
                                "42px",
                            border:
                                "none",
                            borderRadius:
                                "11px",
                            background:
                                file
                                    ? "#2563eb"
                                    : "#cbd5e1",
                            color:
                                "#fff",
                            fontSize:
                                "0.8rem",
                            fontWeight:
                                800,
                            cursor:
                                file &&
                                    !loading
                                    ? "pointer"
                                    : "not-allowed",
                            display:
                                "flex",
                            alignItems:
                                "center",
                            justifyContent:
                                "center",
                            gap:
                                "8px",
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2
                                    size={16}
                                    className="animate-spin"
                                />
                                Analysing File...
                            </>
                        ) : (
                            <>
                                <FileSearch
                                    size={16}
                                />
                                Analyse File
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* =================================================
                MESSAGE
            ================================================= */}

            {status && (
                <div
                    style={{
                        display:
                            "flex",
                        alignItems:
                            "flex-start",
                        gap:
                            "9px",

                        padding:
                            "11px 13px",

                        borderRadius:
                            "11px",

                        border:
                            status.type ===
                                "success"
                                ? "1px solid #bbf7d0"
                                : "1px solid #fecaca",

                        background:
                            status.type ===
                                "success"
                                ? "#f0fdf4"
                                : "#fef2f2",

                        color:
                            status.type ===
                                "success"
                                ? "#15803d"
                                : "#b91c1c",

                        fontSize:
                            "0.75rem",
                        fontWeight:
                            700,
                    }}
                >
                    {status.type ===
                        "success" ? (
                        <CheckCircle2
                            size={16}
                            style={{
                                flexShrink:
                                    0,
                            }}
                        />
                    ) : (
                        <AlertCircle
                            size={16}
                            style={{
                                flexShrink:
                                    0,
                            }}
                        />
                    )}

                    <span>
                        {status.message}
                    </span>
                </div>
            )}

            {/* =================================================
                PREVIEW
            ================================================= */}

            {preview && (
                <>
                    {/* SUMMARY */}

                    <div
                        style={{
                            border:
                                "1px solid #dbeafe",
                            borderRadius:
                                "16px",
                            background:
                                "linear-gradient(135deg,#ffffff,#f8fbff)",
                            padding:
                                "16px",
                        }}
                    >
                        <div
                            style={{
                                display:
                                    "flex",
                                justifyContent:
                                    "space-between",
                                alignItems:
                                    "flex-start",
                                gap:
                                    "14px",
                                flexWrap:
                                    "wrap",
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize:
                                            "0.7rem",
                                        fontWeight:
                                            900,
                                        color:
                                            "#2563eb",
                                        textTransform:
                                            "uppercase",
                                    }}
                                >
                                    Import Preview
                                </div>

                                <div
                                    style={{
                                        marginTop:
                                            "4px",
                                        fontWeight:
                                            900,
                                        color:
                                            "#0f172a",
                                        fontSize:
                                            "1rem",
                                        display:
                                            "flex",
                                        alignItems:
                                            "center",
                                        gap:
                                            "7px",
                                    }}
                                >
                                    <MapPin
                                        size={17}
                                        color="#2563eb"
                                    />

                                    {preview.detectedWardName ||
                                        "Ward not detected"}
                                </div>

                                {preview.zone && (
                                    <div
                                        style={{
                                            marginTop:
                                                "3px",
                                            color:
                                                "#64748b",
                                            fontSize:
                                                "0.72rem",
                                            fontWeight:
                                                600,
                                        }}
                                    >
                                        {
                                            preview
                                                .zone
                                                .name
                                        }
                                    </div>
                                )}
                            </div>

                            <div
                                style={{
                                    display:
                                        "flex",
                                    gap:
                                        "8px",
                                    flexWrap:
                                        "wrap",
                                }}
                            >
                                <SummaryPill
                                    icon={
                                        <Route
                                            size={
                                                14
                                            }
                                        />
                                    }
                                    label="Beats"
                                    value={
                                        preview.beatCount
                                    }
                                    bg="#eff6ff"
                                    color="#2563eb"
                                />

                                <SummaryPill
                                    icon={
                                        <UserCheck
                                            size={
                                                14
                                            }
                                        />
                                    }
                                    label="Matched"
                                    value={
                                        preview
                                            .employeeSummary
                                            .registered
                                    }
                                    bg="#ecfdf5"
                                    color="#047857"
                                />

                                <SummaryPill
                                    icon={
                                        <UserX
                                            size={
                                                14
                                            }
                                        />
                                    }
                                    label="Need Action"
                                    value={
                                        preview.employeeSummary.notRegistered +
                                        preview.employeeSummary.notSpecified +
                                        preview.employeeSummary.notInSweeping +
                                        preview.employeeSummary.duplicate
                                    }
                                    bg="#fef2f2"
                                    color="#dc2626"
                                />
                            </div>
                        </div>

                        {!preview.wardMatched && (
                            <div
                                style={{
                                    marginTop:
                                        "13px",
                                    background:
                                        "#fff7ed",
                                    border:
                                        "1px solid #fed7aa",
                                    borderRadius:
                                        "10px",
                                    padding:
                                        "10px 12px",
                                    color:
                                        "#c2410c",
                                    fontSize:
                                        "0.72rem",
                                    fontWeight:
                                        700,
                                }}
                            >
                                Ward "
                                {preview.detectedWardName ||
                                    "Unknown"}
                                " was detected in the file but
                                could not be matched with the city
                                ward master.
                            </div>
                        )}
                    </div>

                    {/* AREA */}

                    <div
                        style={{
                            border:
                                "1px solid #e2e8f0",
                            borderRadius:
                                "14px",
                            padding:
                                "15px",
                            background:
                                "#fff",
                        }}
                    >
                        <div
                            style={{
                                marginBottom:
                                    "12px",
                            }}
                        >
                            <div
                                style={{
                                    fontSize:
                                        "0.7rem",
                                    fontWeight:
                                        900,
                                    color:
                                        "#2563eb",
                                    textTransform:
                                        "uppercase",
                                    letterSpacing:
                                        "0.05em",
                                }}
                            >
                                Location
                            </div>

                            <div
                                style={{
                                    marginTop:
                                        "2px",
                                    fontSize:
                                        "0.78rem",
                                    fontWeight:
                                        700,
                                    color:
                                        "#64748b",
                                }}
                            >
                                {preview.wardMatched
                                    ? "Ward detected automatically. Confirm the location and select Area."
                                    : "Select Zone, Ward and Area for these imported beats."}
                            </div>
                        </div>

                        {!preview.wardMatched &&
                            preview.detectedWardName && (
                                <div
                                    style={{
                                        marginBottom:
                                            "12px",
                                        padding:
                                            "9px 11px",
                                        background:
                                            "#fff7ed",
                                        border:
                                            "1px solid #fed7aa",
                                        borderRadius:
                                            "9px",
                                        color:
                                            "#c2410c",
                                        fontSize:
                                            "0.68rem",
                                        fontWeight:
                                            700,
                                    }}
                                >
                                    File contains:{" "}
                                    <strong>
                                        {preview.detectedWardName}
                                    </strong>
                                    . It could not be matched automatically,
                                    so please select the correct location.
                                </div>
                            )}

                        <div
                            className="location-grid"
                            style={{
                                display:
                                    "grid",
                                gridTemplateColumns:
                                    "repeat(3,minmax(0,1fr))",
                                gap:
                                    "10px",
                            }}
                        >
                            {/* ZONE */}

                            <div>
                                <label
                                    style={{
                                        display:
                                            "block",
                                        marginBottom:
                                            "6px",
                                        fontSize:
                                            "0.68rem",
                                        color:
                                            "#475569",
                                        fontWeight:
                                            800,
                                    }}
                                >
                                    Zone *
                                </label>

                                <select
                                    value={
                                        selectedZone
                                    }
                                    onChange={(e) =>
                                        handleZoneChange(
                                            e.target.value
                                        )
                                    }
                                    style={
                                        locationSelectStyle
                                    }
                                >
                                    <option value="">
                                        Select Zone
                                    </option>

                                    {zones.map(
                                        (zone: any) => (
                                            <option
                                                key={
                                                    zone.id
                                                }
                                                value={
                                                    zone.id
                                                }
                                            >
                                                {
                                                    zone.name
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            {/* WARD */}

                            <div>
                                <label
                                    style={{
                                        display:
                                            "block",
                                        marginBottom:
                                            "6px",
                                        fontSize:
                                            "0.68rem",
                                        color:
                                            "#475569",
                                        fontWeight:
                                            800,
                                    }}
                                >
                                    Ward *
                                </label>

                                <select
                                    value={
                                        selectedWard
                                    }
                                    disabled={
                                        !selectedZone
                                    }
                                    onChange={(e) =>
                                        handleWardChange(
                                            e.target.value
                                        )
                                    }
                                    style={{
                                        ...locationSelectStyle,
                                        opacity:
                                            selectedZone
                                                ? 1
                                                : 0.55,
                                    }}
                                >
                                    <option value="">
                                        Select Ward
                                    </option>

                                    {wards.map(
                                        (ward: any) => (
                                            <option
                                                key={
                                                    ward.id
                                                }
                                                value={
                                                    ward.id
                                                }
                                            >
                                                {
                                                    ward.name
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            {/* AREA */}

                            <div>
                                <label
                                    style={{
                                        display:
                                            "block",
                                        marginBottom:
                                            "6px",
                                        fontSize:
                                            "0.68rem",
                                        color:
                                            "#475569",
                                        fontWeight:
                                            800,
                                    }}
                                >
                                    Area *
                                </label>

                                <select
                                    value={
                                        selectedArea
                                    }
                                    disabled={
                                        !selectedWard
                                    }
                                    onChange={async (e) => {
                                        const areaId =
                                            e.target.value;

                                        lastPreviewLocationKey.current = "";

                                        setSelectedArea(
                                            areaId
                                        );

                                        if (
                                            areaId &&
                                            selectedZone &&
                                            selectedWard
                                        ) {
                                            await refreshPreviewForLocation(
                                                selectedZone,
                                                selectedWard,
                                                areaId
                                            );
                                        }
                                    }}
                                    style={{
                                        ...locationSelectStyle,
                                        opacity:
                                            selectedWard
                                                ? 1
                                                : 0.55,
                                    }}
                                >
                                    <option value="">
                                        Select Area
                                    </option>

                                    {areas.map(
                                        (area: any) => (
                                            <option
                                                key={
                                                    area.id
                                                }
                                                value={
                                                    area.id
                                                }
                                            >
                                                {
                                                    area.name
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* EMPLOYEE SUMMARY */}

                    <div
                        style={{
                            display:
                                "grid",
                            gridTemplateColumns:
                                "repeat(2,minmax(0,1fr))",
                            gap:
                                "10px",
                        }}
                        className="import-summary-grid"
                    >
                        <SmallStat
                            title="Employees Matched"
                            value={
                                preview
                                    .employeeSummary
                                    .registered
                            }
                            color="#047857"
                            bg="#ecfdf5"
                        />

                        <SmallStat
                            title="Employee Not Specified"
                            value={
                                preview
                                    .employeeSummary
                                    .notSpecified
                            }
                            color="#c2410c"
                            bg="#fff7ed"
                        />

                        <SmallStat
                            title="Not Registered"
                            value={
                                preview
                                    .employeeSummary
                                    .notRegistered
                            }
                            color="#dc2626"
                            bg="#fef2f2"
                        />

                        <SmallStat
                            title="Sweeping Access Missing"
                            value={
                                preview
                                    .employeeSummary
                                    .notInSweeping
                            }
                            color="#b45309"
                            bg="#fffbeb"
                        />

                        <SmallStat
                            title="Duplicate Names"
                            value={
                                preview
                                    .employeeSummary
                                    .duplicate
                            }
                            color="#c2410c"
                            bg="#fff7ed"
                        />
                    </div>

                    {/* BEAT LIST */}

                    <div
                        style={{
                            border:
                                "1px solid #e2e8f0",
                            borderRadius:
                                "16px",
                            overflow:
                                "hidden",
                            background:
                                "#fff",
                        }}
                    >
                        <div
                            style={{
                                padding:
                                    "13px 15px",
                                borderBottom:
                                    "1px solid #f1f5f9",
                                display:
                                    "flex",
                                justifyContent:
                                    "space-between",
                                alignItems:
                                    "center",
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontWeight:
                                            900,
                                        color:
                                            "#0f172a",
                                        fontSize:
                                            "0.82rem",
                                    }}
                                >
                                    Detected Beats
                                </div>

                                <div
                                    style={{
                                        marginTop:
                                            "2px",
                                        color:
                                            "#94a3b8",
                                        fontSize:
                                            "0.66rem",
                                        fontWeight:
                                            600,
                                    }}
                                >
                                    Employee match status from
                                    current employee master
                                </div>
                            </div>

                            <Users
                                size={17}
                                color="#64748b"
                            />
                        </div>

                        <div
                            style={{
                                overflow:
                                    "visible",
                            }}
                        >
                            {preview.beats.map(
                                (
                                    beat,
                                    index
                                ) => {
                                    const config =
                                        getStatusConfig(
                                            beat.employeeStatus
                                        );

                                    return (
                                        <div
                                            key={`${beat.beatNumber}-${index}`}
                                            style={{
                                                padding:
                                                    "12px 15px",
                                                borderBottom:
                                                    index ===
                                                        preview
                                                            .beats
                                                            .length -
                                                        1
                                                        ? "none"
                                                        : "1px solid #f1f5f9",

                                                display:
                                                    "grid",

                                                gridTemplateColumns:
                                                    "46px minmax(0,1fr) auto",

                                                gap:
                                                    "10px",

                                                alignItems:
                                                    "center",
                                            }}
                                            className="preview-beat-row"
                                        >
                                            <div
                                                style={{
                                                    width:
                                                        "38px",
                                                    height:
                                                        "38px",
                                                    borderRadius:
                                                        "11px",
                                                    background:
                                                        "#eff6ff",
                                                    color:
                                                        "#2563eb",
                                                    display:
                                                        "grid",
                                                    placeItems:
                                                        "center",
                                                    fontSize:
                                                        "0.72rem",
                                                    fontWeight:
                                                        900,
                                                }}
                                            >
                                                {
                                                    beat.beatNumber
                                                }
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
                                                            "0.78rem",
                                                        fontWeight:
                                                            800,
                                                    }}
                                                >
                                                    {
                                                        beat.suggestedBeatName
                                                    }
                                                </div>

                                                <div
                                                    style={{
                                                        marginTop:
                                                            "3px",
                                                        color:
                                                            "#64748b",
                                                        fontSize:
                                                            "0.7rem",
                                                        fontWeight:
                                                            600,
                                                        whiteSpace:
                                                            "normal",
                                                    }}
                                                >
                                                    Employee:{" "}
                                                    <strong
                                                        style={{
                                                            color:
                                                                beat.employeeName
                                                                    ? "#334155"
                                                                    : "#c2410c",
                                                        }}
                                                    >
                                                        {beat.employeeName ||
                                                            "Not specified in file"}
                                                    </strong>
                                                </div>

                                                {beat.employeeMessage && (
                                                    <div
                                                        style={{
                                                            marginTop:
                                                                "3px",
                                                            color:
                                                                config.color,
                                                            fontSize:
                                                                "0.64rem",
                                                            fontWeight:
                                                                700,
                                                        }}
                                                    >
                                                        {
                                                            beat.employeeMessage
                                                        }
                                                    </div>
                                                )}
                                            </div>

                                            {beat.employeeStatus ===
                                                "NOT_REGISTERED" ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();

                                                        openEmployeeRegistration(
                                                            beat
                                                        );
                                                    }}
                                                    style={{
                                                        background:
                                                            "#fef2f2",

                                                        color:
                                                            "#dc2626",

                                                        border:
                                                            "1px solid #fecaca",

                                                        padding:
                                                            "6px 10px",

                                                        borderRadius:
                                                            "999px",

                                                        fontSize:
                                                            "0.62rem",

                                                        fontWeight:
                                                            800,

                                                        whiteSpace:
                                                            "nowrap",

                                                        cursor:
                                                            "pointer",
                                                    }}
                                                >
                                                    Register Employee
                                                </button>
                                            ) : (
                                                <span
                                                    style={{
                                                        background:
                                                            config.bg,

                                                        color:
                                                            config.color,

                                                        border:
                                                            `1px solid ${config.border}`,

                                                        padding:
                                                            "5px 8px",

                                                        borderRadius:
                                                            "999px",

                                                        fontSize:
                                                            "0.61rem",

                                                        fontWeight:
                                                            800,

                                                        whiteSpace:
                                                            "nowrap",
                                                    }}
                                                >
                                                    {config.label}
                                                </span>
                                            )}
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </div>

                    {/* NEXT STEP PLACEHOLDER */}

                    <div
                        style={{
                            display: "grid",
                            gap: "9px",
                            padding: "14px",
                            borderRadius: "13px",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gap: "12px",
                                padding: "14px",
                                borderRadius: "13px",
                                background: "#eff6ff",
                                border: "1px solid #bfdbfe",
                            }}
                        >
                            <div
                                style={{
                                    display: "grid",
                                    gap: "12px",
                                    padding: "14px",
                                    borderRadius: "13px",
                                    background: "#eff6ff",
                                    border: "1px solid #bfdbfe",
                                }}
                            >
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(3,minmax(0,1fr))",
                                        gap: "8px",
                                    }}
                                >
                                    <SmallStat
                                        title="Submitted"
                                        value={
                                            submittedBeatCount
                                        }
                                        color="#047857"
                                        bg="#ecfdf5"
                                    />

                                    <SmallStat
                                        title="Ready"
                                        value={
                                            readyBeatCount
                                        }
                                        color="#2563eb"
                                        bg="#eff6ff"
                                    />

                                    <SmallStat
                                        title="Pending"
                                        value={
                                            pendingBeatCount
                                        }
                                        color="#b45309"
                                        bg="#fff7ed"
                                    />
                                </div>

                                {!allBeatsSubmitted && (
                                    <button
                                        type="button"
                                        onClick={
                                            openBeatConfigurator
                                        }
                                        disabled={
                                            importingBeats
                                        }
                                        style={{
                                            width: "100%",
                                            height: "42px",
                                            borderRadius:
                                                "10px",
                                            border:
                                                "1px solid #bfdbfe",
                                            background:
                                                "#ffffff",
                                            color:
                                                "#2563eb",
                                            fontWeight:
                                                900,
                                            cursor:
                                                "pointer",
                                        }}
                                    >
                                        {pendingBeatCount >
                                            0
                                            ? `Configure ${pendingBeatCount} Pending Beats`
                                            : "Review Beat Configuration"}
                                    </button>
                                )}

                                {readyBeatCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={
                                            handleSubmitReadyBeats
                                        }
                                        disabled={
                                            importingBeats
                                        }
                                        style={{
                                            width: "100%",
                                            height: "46px",
                                            border: "none",
                                            borderRadius:
                                                "10px",
                                            background:
                                                "#2563eb",
                                            color: "#ffffff",
                                            fontWeight:
                                                900,
                                            cursor:
                                                importingBeats
                                                    ? "wait"
                                                    : "pointer",
                                        }}
                                    >
                                        {importingBeats
                                            ? "Submitting..."
                                            : `Submit ${readyBeatCount} Ready Beat${readyBeatCount ===
                                                1
                                                ? ""
                                                : "s"
                                            }`}
                                    </button>
                                )}

                                {readyBeatCount === 0 &&
                                    pendingBeatCount >
                                    0 && (
                                        <div
                                            style={{
                                                padding:
                                                    "9px 10px",
                                                borderRadius:
                                                    "9px",
                                                background:
                                                    "#fff7ed",
                                                color:
                                                    "#b45309",
                                                fontSize:
                                                    "0.66rem",
                                                fontWeight:
                                                    700,
                                            }}
                                        >
                                            Complete the 5
                                            points and any
                                            missing assignment
                                            for a pending beat
                                            to enable submission.
                                        </div>
                                    )}

                                {allBeatsSubmitted && (
                                    <div
                                        style={{
                                            padding:
                                                "11px 12px",
                                            borderRadius:
                                                "10px",
                                            background:
                                                "#ecfdf5",
                                            border:
                                                "1px solid #a7f3d0",
                                            color:
                                                "#047857",
                                            textAlign:
                                                "center",
                                            fontWeight:
                                                900,
                                            fontSize:
                                                "0.72rem",
                                        }}
                                    >
                                        ✓ All{" "}
                                        {preview.beatCount}{" "}
                                        beats submitted
                                        successfully.
                                    </div>
                                )}
                            </div>


                        </div>
                    </div>
                </>
            )}

            {registeringBeat && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 3000,

                        background:
                            "rgba(15,23,42,0.48)",

                        backdropFilter:
                            "blur(5px)",

                        display: "flex",

                        alignItems:
                            "flex-start",

                        justifyContent:
                            "center",

                        padding:
                            "24px 16px",

                        overflowY:
                            "auto",

                        boxSizing:
                            "border-box",
                    }}
                    onClick={() => {
                        if (
                            !registeringEmployee
                        ) {
                            setRegisteringBeat(
                                null
                            );
                        }
                    }}
                >
                    <form
                        onSubmit={
                            handleRegisterEmployee
                        }
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                        style={{
                            width:
                                "100%",

                            maxWidth:
                                "440px",

                            background:
                                "#fff",

                            borderRadius:
                                "20px",

                            border:
                                "1px solid #e2e8f0",

                            boxShadow:
                                "0 25px 60px rgba(15,23,42,0.25)",

                            padding:
                                "22px",

                            boxSizing:
                                "border-box",
                        }}
                    >
                        {/* HEADER */}

                        <div
                            style={{
                                display:
                                    "flex",

                                justifyContent:
                                    "space-between",

                                alignItems:
                                    "flex-start",

                                gap:
                                    "12px",

                                paddingBottom:
                                    "15px",

                                borderBottom:
                                    "1px solid #f1f5f9",
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize:
                                            "0.68rem",

                                        color:
                                            "#2563eb",

                                        fontWeight:
                                            900,

                                        textTransform:
                                            "uppercase",
                                    }}
                                >
                                    Register Employee
                                </div>

                                <div
                                    style={{
                                        marginTop:
                                            "4px",

                                        fontSize:
                                            "1rem",

                                        color:
                                            "#0f172a",

                                        fontWeight:
                                            900,
                                    }}
                                >
                                    {
                                        registeringBeat.employeeName
                                    }
                                </div>

                                <div
                                    style={{
                                        marginTop:
                                            "3px",

                                        color:
                                            "#64748b",

                                        fontSize:
                                            "0.7rem",

                                        fontWeight:
                                            600,
                                    }}
                                >
                                    {
                                        registeringBeat.suggestedBeatName
                                    }
                                </div>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    registeringEmployee
                                }
                                onClick={() =>
                                    setRegisteringBeat(
                                        null
                                    )
                                }
                                style={{
                                    width:
                                        "32px",

                                    height:
                                        "32px",

                                    borderRadius:
                                        "9px",

                                    border:
                                        "1px solid #e2e8f0",

                                    background:
                                        "#fff",

                                    color:
                                        "#64748b",

                                    cursor:
                                        "pointer",

                                    fontSize:
                                        "18px",
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* AUTO ASSIGNMENT */}

                        <div
                            style={{
                                marginTop:
                                    "15px",

                                padding:
                                    "11px 12px",

                                borderRadius:
                                    "11px",

                                background:
                                    "#eff6ff",

                                border:
                                    "1px solid #dbeafe",

                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "1fr 1fr",

                                gap:
                                    "8px",
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        color:
                                            "#64748b",

                                        fontSize:
                                            "0.58rem",

                                        fontWeight:
                                            800,

                                        textTransform:
                                            "uppercase",
                                    }}
                                >
                                    Role
                                </div>

                                <div
                                    style={{
                                        marginTop:
                                            "2px",

                                        color:
                                            "#1e40af",

                                        fontSize:
                                            "0.72rem",

                                        fontWeight:
                                            800,
                                    }}
                                >
                                    Employee
                                </div>
                            </div>

                            <div>
                                <div
                                    style={{
                                        color:
                                            "#64748b",

                                        fontSize:
                                            "0.58rem",

                                        fontWeight:
                                            800,

                                        textTransform:
                                            "uppercase",
                                    }}
                                >
                                    Module
                                </div>

                                <div
                                    style={{
                                        marginTop:
                                            "2px",

                                        color:
                                            "#1e40af",

                                        fontSize:
                                            "0.72rem",

                                        fontWeight:
                                            800,
                                    }}
                                >
                                    Sweeping
                                </div>
                            </div>

                            <div>
                                <div
                                    style={{
                                        color:
                                            "#64748b",

                                        fontSize:
                                            "0.58rem",

                                        fontWeight:
                                            800,

                                        textTransform:
                                            "uppercase",
                                    }}
                                >
                                    Zone
                                </div>

                                <div
                                    style={{
                                        marginTop:
                                            "2px",

                                        color:
                                            "#334155",

                                        fontSize:
                                            "0.7rem",

                                        fontWeight:
                                            700,
                                    }}
                                >
                                    {zones.find(
                                        (z: any) =>
                                            z.id ===
                                            selectedZone
                                    )?.name ||
                                        "Selected Zone"}
                                </div>
                            </div>

                            <div>
                                <div
                                    style={{
                                        color:
                                            "#64748b",

                                        fontSize:
                                            "0.58rem",

                                        fontWeight:
                                            800,

                                        textTransform:
                                            "uppercase",
                                    }}
                                >
                                    Ward
                                </div>

                                <div
                                    style={{
                                        marginTop:
                                            "2px",

                                        color:
                                            "#334155",

                                        fontSize:
                                            "0.7rem",

                                        fontWeight:
                                            700,
                                    }}
                                >
                                    {wards.find(
                                        (w: any) =>
                                            w.id ===
                                            selectedWard
                                    )?.name ||
                                        preview?.ward
                                            ?.name ||
                                        "Selected Ward"}
                                </div>
                            </div>
                        </div>

                        {/* NAME */}

                        <div
                            style={{
                                marginTop:
                                    "16px",
                            }}
                        >
                            <label
                                style={{
                                    display:
                                        "block",

                                    fontSize:
                                        "0.68rem",

                                    fontWeight:
                                        800,

                                    color:
                                        "#475569",

                                    marginBottom:
                                        "6px",
                                }}
                            >
                                Employee Name
                            </label>

                            <input
                                value={
                                    registeringBeat.employeeName ?? ""
                                }
                                readOnly
                                style={{
                                    width:
                                        "100%",

                                    height:
                                        "42px",

                                    padding:
                                        "0 12px",

                                    borderRadius:
                                        "10px",

                                    border:
                                        "1px solid #e2e8f0",

                                    background:
                                        "#f8fafc",

                                    color:
                                        "#334155",

                                    fontWeight:
                                        700,

                                    boxSizing:
                                        "border-box",
                                }}
                            />
                        </div>

                        <div
                            style={{
                                marginTop: "16px",
                            }}
                        >
                            <label
                                style={{
                                    display: "block",
                                    fontSize: "0.68rem",
                                    fontWeight: 800,
                                    color: "#475569",
                                    marginBottom: "6px",
                                }}
                            >
                                Contact Number *
                            </label>

                            <input
                                type="tel"
                                inputMode="numeric"
                                value={employeePhone}
                                onChange={(e) => {
                                    const value = e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 10);

                                    setEmployeePhone(value);
                                }}
                                placeholder="Enter 10 digit contact number"
                                required
                                maxLength={10}
                                pattern="[0-9]{10}"
                                style={{
                                    width: "100%",
                                    height: "44px",
                                    padding: "0 12px",
                                    borderRadius: "10px",
                                    border: "1px solid #cbd5e1",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    fontWeight: 700,
                                    color: "#0f172a",
                                }}
                            />
                        </div>

                        {/* ERROR */}

                        {registrationError && (
                            <div
                                style={{
                                    marginTop:
                                        "12px",

                                    padding:
                                        "9px 11px",

                                    background:
                                        "#fef2f2",

                                    border:
                                        "1px solid #fecaca",

                                    borderRadius:
                                        "9px",

                                    color:
                                        "#b91c1c",

                                    fontSize:
                                        "0.68rem",

                                    fontWeight:
                                        700,
                                }}
                            >
                                {
                                    registrationError
                                }
                            </div>
                        )}

                        {/* ACTION */}

                        <button
                            type="submit"
                            disabled={
                                registeringEmployee
                            }
                            style={{
                                marginTop:
                                    "16px",

                                width:
                                    "100%",

                                height:
                                    "44px",

                                border:
                                    "none",

                                borderRadius:
                                    "11px",

                                background:
                                    registeringEmployee
                                        ? "#93c5fd"
                                        : "#2563eb",

                                color:
                                    "#fff",

                                fontWeight:
                                    800,

                                cursor:
                                    registeringEmployee
                                        ? "wait"
                                        : "pointer",
                            }}
                        >
                            {registeringEmployee
                                ? "Registering..."
                                : "Register Employee"}
                        </button>
                    </form>
                </div>
            )}

            {showBeatConfigurator &&
                preview && (
                    <WardBeatConfigurator
                        beats={
                            preview.beats
                        }

                        wardName={
                            wards.find(
                                (ward: any) =>
                                    ward.id === selectedWard
                            )?.name ||
                            preview.ward?.name ||
                            preview.detectedWardName ||
                            "Ward"
                        }

                        zoneName={
                            zones.find(
                                (zone: any) =>
                                    zone.id ===
                                    selectedZone
                            )?.name
                        }

                        areaName={
                            areas.find(
                                (area: any) =>
                                    area.id ===
                                    selectedArea
                            )?.name
                        }

                        zoneId={
                            selectedZone
                        }

                        wardId={
                            selectedWard
                        }

                        areaId={
                            selectedArea
                        }

                        existingDrafts={
                            beatDrafts
                        }

                        onChange={
                            setBeatDrafts
                        }

                        onClose={() =>
                            setShowBeatConfigurator(
                                false
                            )
                        }
                    />
                )}

            <style jsx>{`
                @media (max-width: 640px) {
                    .import-summary-grid {
                        grid-template-columns: 1fr !important;
                    }

                    .preview-beat-row {
                        grid-template-columns: 42px minmax(0, 1fr) !important;
                    }

                    .preview-beat-row > span {
                        grid-column: 2;
                        justify-self: start;
                    }
                }

                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }

                .animate-spin {
                    animation: spin 0.8s linear infinite;
                }
            `}</style>
        </div>
    );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SummaryPill({
    icon,
    label,
    value,
    bg,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    bg: string;
    color: string;
}) {
    return (
        <div
            style={{
                minWidth: "92px",
                padding: "8px 10px",
                borderRadius: "11px",
                background: bg,
                color,
                display: "flex",
                alignItems: "center",
                gap: "7px",
            }}
        >
            {icon}

            <div>
                <div
                    style={{
                        fontSize: "0.78rem",
                        lineHeight: 1,
                        fontWeight: 900,
                    }}
                >
                    {value}
                </div>

                <div
                    style={{
                        fontSize: "0.58rem",
                        marginTop: "3px",
                        fontWeight: 800,
                    }}
                >
                    {label}
                </div>
            </div>
        </div>
    );
}

function SmallStat({
    title,
    value,
    color,
    bg,
}: {
    title: string;
    value: number;
    color: string;
    bg: string;
}) {
    return (
        <div
            style={{
                padding: "11px 12px",
                borderRadius: "12px",
                background: bg,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
            }}
        >
            <span
                style={{
                    color,
                    fontSize: "0.67rem",
                    fontWeight: 800,
                }}
            >
                {title}
            </span>

            <strong
                style={{
                    color,
                    fontSize: "0.9rem",
                }}
            >
                {value}
            </strong>
        </div>
    );
}

const locationSelectStyle:
    React.CSSProperties = {
    width: "100%",
    height: "40px",
    border:
        "1px solid #cbd5e1",
    borderRadius:
        "9px",
    padding:
        "0 10px",
    background:
        "#fff",
    color:
        "#0f172a",
    fontSize:
        "0.72rem",
    fontWeight:
        700,
    outline:
        "none",
};
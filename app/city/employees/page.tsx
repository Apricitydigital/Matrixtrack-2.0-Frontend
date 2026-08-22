"use client";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Download,
    FileSpreadsheet,
    FileText,
    RefreshCw,
    Search,
    UserPlus,
    Users,
    X,
} from "lucide-react";

import { RoleGuard } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";
import { isHmsSuperAdmin } from "@utils/rbac";
import {
    CityUserApi,
    apiFetch,
} from "@lib/apiClient";

import { TableExportDropdown } from "@components/ui/TableExportDropdown";
import * as XLSX from "xlsx";


type GeoNode = {
    id: string;
    name: string;
    parentId?: string | null;
};

type EmployeeRow = {
    id: string;
    employeeId?: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    createdAt: string;
    zoneIds?: string[];
    wardIds?: string[];
    modules?: {
        id: string;
        key: string;
        name: string;
        canWrite: boolean;
        zoneIds?: string[];
        wardIds?: string[];
    }[];
};

type EmployeeImportStatus =
    | "READY"
    | "ALREADY_EXISTS"
    | "INVALID_ZONE"
    | "INVALID_WARD"
    | "INVALID_MOBILE"
    | "INVALID_DATA"
    | "DUPLICATE_ROW";

type EmployeeImportRow = {
    rowNumber: number;
    employeeId?: string;
    employeeName: string;
    mobileNumber: string;
    zoneName: string;
    wardName: string;
    zoneId?: string;
    wardId?: string;
    status: EmployeeImportStatus;
    message: string;
};


export default function EmployeesPage() {
    const { user } = useAuth();
    const isHmsAdmin = isHmsSuperAdmin(user);

    /* =========================================================
       DATA
    ========================================================= */

    const [employees, setEmployees] =
        useState<EmployeeRow[]>([]);

    const [zones, setZones] =
        useState<GeoNode[]>([]);

    const [wards, setWards] =
        useState<GeoNode[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");


    /* =========================================================
       FILTERS
    ========================================================= */

    const [showDownloadDropdown, setShowDownloadDropdown] =
        useState(false);

    const [searchQuery, setSearchQuery] =
        useState("");

    const [selectedZoneId, setSelectedZoneId] =
        useState("");

    const [selectedWardId, setSelectedWardId] =
        useState("");

    /* =========================================================
REGISTER EMPLOYEE
========================================================= */

    const [showRegisterEmployee, setShowRegisterEmployee] =
        useState(false);

    const [employeeName, setEmployeeName] =
        useState("");

    const [employeeCodeId, setEmployeeCodeId] =
        useState("");

    const [employeePhone, setEmployeePhone] =
        useState("");

    const [employeeZoneId, setEmployeeZoneId] =
        useState("");

    const [employeeWardId, setEmployeeWardId] =
        useState("");

    const [registeringEmployee, setRegisteringEmployee] =
        useState(false);

    const [registrationError, setRegistrationError] =
        useState("");


    /* =========================================================
EMPLOYEE EXCEL IMPORT
========================================================= */

    const [showEmployeeImport, setShowEmployeeImport] =
        useState(false);

    const [employeeImportRows, setEmployeeImportRows] =
        useState<EmployeeImportRow[]>([]);

    const [employeeImportFileName, setEmployeeImportFileName] =
        useState("");

    const [employeeImportError, setEmployeeImportError] =
        useState("");

    const [importingEmployees, setImportingEmployees] =
        useState(false);

    const [employeeImportProgress, setEmployeeImportProgress] =
        useState("");


    /* =========================================================
       LOAD EXISTING EMPLOYEES + GEO
    ========================================================= */

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [
                usersResult,
                zonesResult,
                wardsResult,
            ] = await Promise.all([
                CityUserApi.list(),

                apiFetch<{
                    nodes: GeoNode[];
                }>("/city/geo?level=ZONE"),

                apiFetch<{
                    nodes: GeoNode[];
                }>("/city/geo?level=WARD"),
            ]);

            const employeeRows =
                (usersResult.users || []).filter(
                    (user) =>
                        String(user.role || "")
                            .toUpperCase() === "EMPLOYEE"
                );

            setEmployees(employeeRows);
            setZones(zonesResult.nodes || []);
            setWards(wardsResult.nodes || []);

        } catch (err: any) {
            console.error(
                "Failed to load employee master",
                err
            );

            setError(
                err?.message ||
                "Unable to load employees."
            );

        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        loadData();
    }, [loadData]);


    /* =========================================================
       GEO MAPS
    ========================================================= */

    const zoneNameMap = useMemo(
        () =>
            Object.fromEntries(
                zones.map((zone) => [
                    zone.id,
                    zone.name,
                ])
            ),
        [zones]
    );

    const wardNameMap = useMemo(
        () =>
            Object.fromEntries(
                wards.map((ward) => [
                    ward.id,
                    ward.name,
                ])
            ),
        [wards]
    );


    /* =========================================================
       WARD FILTER OPTIONS
    ========================================================= */

    const availableWards = useMemo(() => {
        if (!selectedZoneId) {
            return wards;
        }

        const children = wards.filter(
            (ward) =>
                !ward.parentId ||
                ward.parentId === selectedZoneId
        );

        const resetRegistrationForm = () => {
            setEmployeeName("");
            setEmployeePhone("");
            setEmployeeZoneId("");
            setEmployeeWardId("");
            setRegistrationError("");
        };


        const closeRegistrationModal = () => {
            if (registeringEmployee) return;

            setShowRegisterEmployee(false);
            resetRegistrationForm();
        };


        const handleRegisterEmployee = async (
            e: React.FormEvent
        ) => {
            e.preventDefault();

            const cleanName =
                employeeName
                    .trim()
                    .replace(/\s+/g, " ");

            const cleanPhone =
                employeePhone.replace(/\D/g, "");


            if (!cleanName) {
                setRegistrationError(
                    "Employee name is required."
                );
                return;
            }


            if (!/^\d{10}$/.test(cleanPhone)) {
                setRegistrationError(
                    "Mobile number must be exactly 10 digits."
                );
                return;
            }


            if (!employeeZoneId) {
                setRegistrationError(
                    "Please select a Zone."
                );
                return;
            }


            if (!employeeWardId) {
                setRegistrationError(
                    "Please select a Ward."
                );
                return;
            }


            try {
                setRegisteringEmployee(true);
                setRegistrationError("");


                await apiFetch(
                    "/city/areas/import-register-employee",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            name: cleanName,
                            phone: cleanPhone,
                            zoneId: employeeZoneId,
                            wardId: employeeWardId,
                        }),
                    }
                );


                await loadData();

                setShowRegisterEmployee(false);
                resetRegistrationForm();

            } catch (err: any) {
                console.error(
                    "Employee registration failed",
                    err
                );

                setRegistrationError(
                    err?.message ||
                    "Failed to register employee."
                );

            } finally {
                setRegisteringEmployee(false);
            }
        };

        return children;
    }, [
        wards,
        selectedZoneId,
    ]);

    const registrationWards = useMemo(() => {
        if (!employeeZoneId) return [];

        return wards.filter(
            (ward) =>
                ward.parentId === employeeZoneId
        );
    }, [wards, employeeZoneId]);

    /* =========================================================
       FILTER EMPLOYEES
    ========================================================= */

    const filteredEmployees = useMemo(() => {
        const query =
            searchQuery
                .trim()
                .toLowerCase();

        return employees.filter((employee) => {

            const employeeZoneIds =
                employee.zoneIds || [];

            const employeeWardIds =
                employee.wardIds || [];


            if (
                selectedZoneId &&
                !employeeZoneIds.includes(
                    selectedZoneId
                )
            ) {
                return false;
            }


            if (
                selectedWardId &&
                !employeeWardIds.includes(
                    selectedWardId
                )
            ) {
                return false;
            }


            if (!query) {
                return true;
            }


            const searchableText = [
                employee.name,
                employee.employeeId || "",
                employee.phone || "",
                ...employeeZoneIds.map(
                    (id) =>
                        zoneNameMap[id] || ""
                ),
                ...employeeWardIds.map(
                    (id) =>
                        wardNameMap[id] || ""
                ),
            ]
                .join(" ")
                .toLowerCase();


            return searchableText.includes(
                query
            );
        });

    }, [
        employees,
        searchQuery,
        selectedZoneId,
        selectedWardId,
        zoneNameMap,
        wardNameMap,
    ]);

    const exportEmployeesExcel = useCallback(() => {
        if (!filteredEmployees.length) return;
        const rows = filteredEmployees.map((emp, idx) => {
            const zones = (emp.zoneIds || []).map((id) => zoneNameMap[id]).filter(Boolean).join(", ") || "—";
            const wards = (emp.wardIds || []).map((id) => wardNameMap[id]).filter(Boolean).join(", ") || "—";
            const createdDate = emp.createdAt
                ? new Date(emp.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "—";

            return {
                "S.No": idx + 1,
                "Employee Name": emp.name,
                "Employee ID": emp.employeeId || "—",
                "Mobile Number": emp.phone || "Not added",
                "Zone": zones,
                "Ward": wards,
                "Registered On": createdDate,
                "Status": "Registered"
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = [
            { wch: 8 },
            { wch: 26 },
            { wch: 16 },
            { wch: 18 },
            { wch: 22 },
            { wch: 22 },
            { wch: 18 },
            { wch: 14 }
        ];

        // Format header row (Row 1) with 26pt height, bold font and subtle slate fill
        worksheet["!rows"] = [{ hpt: 26 }];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: 0, c: C });
            if (worksheet[address]) {
                worksheet[address].s = {
                    font: { bold: true, name: "Segoe UI", sz: 11, color: { rgb: "0F172A" } },
                    fill: { fgColor: { rgb: "E2E8F0" } },
                    alignment: { horizontal: "left", vertical: "center" }
                };
            }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
        XLSX.writeFile(workbook, `Employee_Master_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }, [filteredEmployees, zoneNameMap, wardNameMap]);

    const exportEmployeesPdf = useCallback(() => {
        if (!filteredEmployees.length) return;
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        const rowsHtml = filteredEmployees
            .map((emp, idx) => {
                const zones = (emp.zoneIds || []).map((id) => zoneNameMap[id]).filter(Boolean).join(", ") || "—";
                const wards = (emp.wardIds || []).map((id) => wardNameMap[id]).filter(Boolean).join(", ") || "—";
                const createdDate = emp.createdAt
                    ? new Date(emp.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "—";

                return `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px 14px; font-weight: 600; text-align: center;">${idx + 1}</td>
                        <td style="padding: 10px 14px; font-weight: 700; color: #0f172a;">${emp.name}</td>
                        <td style="padding: 10px 14px; font-weight: 700; color: #2563eb;">${emp.employeeId || "—"}</td>
                        <td style="padding: 10px 14px; color: #334155;">${emp.phone || "Not added"}</td>
                        <td style="padding: 10px 14px; color: #1e40af;">${zones}</td>
                        <td style="padding: 10px 14px; color: #475569;">${wards}</td>
                        <td style="padding: 10px 14px; color: #64748b; font-size: 11px;">${createdDate}</td>
                        <td style="padding: 10px 14px; text-align: center;"><span style="background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Registered</span></td>
                    </tr>
                `;
            })
            .join("");

        const htmlContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Employee Master Directory Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 24px; color: #0f172a; }
                        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 12px; }
                        .title { font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0; }
                        .meta { font-size: 12px; color: #64748b; margin-top: 4px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
                        th { background: #f1f5f9; color: #0f172a; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; padding: 12px 14px; text-align: left; border-bottom: 2px solid #cbd5e1; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1 class="title">MatrixTrack 2.0 - Employee Master Directory</h1>
                            <p class="meta">Total Employee Records: ${filteredEmployees.length} | Date: ${new Date().toLocaleDateString('en-IN')}</p>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="text-align: center;">S.No</th>
                                <th>Employee Name</th>
                                <th>Employee ID</th>
                                <th>Mobile Number</th>
                                <th>Zone</th>
                                <th>Ward</th>
                                <th>Registered On</th>
                                <th style="text-align: center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() {
                            window.print();
                        };
                    </script>
                </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }, [filteredEmployees, zoneNameMap, wardNameMap]);

    const handleEmployeeExcelFile = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file =
            e.target.files?.[0];

        e.target.value = "";

        if (!file) return;

        try {
            setEmployeeImportError("");
            setEmployeeImportRows([]);
            setEmployeeImportFileName(
                file.name
            );

            const buffer =
                await file.arrayBuffer();

            const workbook =
                XLSX.read(buffer, {
                    type: "array",
                });

            const sheetName =
                workbook.SheetNames[0];

            if (!sheetName) {
                throw new Error(
                    "Excel file does not contain a worksheet."
                );
            }

            const worksheet =
                workbook.Sheets[
                sheetName
                ];

            const rows =
                XLSX.utils.sheet_to_json<any[]>(
                    worksheet,
                    {
                        header: 1,
                        defval: "",
                    }
                );


            if (!rows.length) {
                throw new Error(
                    "Excel file is empty."
                );
            }


            /* =============================================
               EXACT HEADER FORMAT
            ============================================= */

            const headers =
                (rows[0] || []).map(
                    (value: unknown) =>
                        String(value ?? "")
                            .trim()
                );

            const findColIdx = (queryKeywords: string[], defaultIdx: number) => {
                const found = headers.findIndex((h) => {
                    const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
                    return queryKeywords.some((kw) => norm.includes(kw));
                });
                return found !== -1 ? found : defaultIdx;
            };

            const hasEmpId = headers.some((h) => {
                const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
                return norm.includes("empid") || norm.includes("employeeid");
            });

            const empIdIdx = hasEmpId ? findColIdx(["empid", "employeeid"], 1) : -1;
            const nameIdx = findColIdx(["empname", "employeename", "name"], hasEmpId ? 2 : 1);
            const mobileIdx = findColIdx(["mobile", "phone", "contact"], hasEmpId ? 3 : 2);
            const zoneIdx = findColIdx(["zone"], hasEmpId ? 4 : 3);
            const wardIdx = findColIdx(["ward"], hasEmpId ? 5 : 4);


            /* =============================================
               ZONE LOOKUP
            ============================================= */

            const zonesByName =
                new globalThis.Map<
                    string,
                    GeoNode[]
                >();

            zones.forEach((zone) => {
                const key =
                    normalizeEmployeeImportValue(
                        zone.name
                    );

                const current =
                    zonesByName.get(key) || [];

                current.push(zone);

                zonesByName.set(
                    key,
                    current
                );
            });


            /* =============================================
               WARD LOOKUP
            ============================================= */

            const wardsByZoneAndName =
                new globalThis.Map<
                    string,
                    GeoNode[]
                >();

            wards.forEach((ward) => {
                const key =
                    `${ward.parentId || ""}::${normalizeEmployeeImportValue(
                        ward.name
                    )}`;

                const current =
                    wardsByZoneAndName.get(
                        key
                    ) || [];

                current.push(ward);

                wardsByZoneAndName.set(
                    key,
                    current
                );
            });


            /* =============================================
               EXISTING EMPLOYEE LOOKUP
            ============================================= */

            const existingEmployeeNames =
                new Set(
                    employees.map(
                        (employee) =>
                            normalizeEmployeeImportValue(
                                employee.name
                            )
                    )
                );


            const uploadedEmployeeKeys =
                new Set<string>();


            const parsedRows: EmployeeImportRow[] =
                [];


            rows
                .slice(1)
                .forEach(
                    (
                        rawRow: any[],
                        index
                    ) => {

                        const rowNumber =
                            index + 2;

                        const employeeId =
                            empIdIdx !== -1
                                ? String(rawRow?.[empIdIdx] ?? "").trim()
                                : undefined;

                        const employeeName =
                            String(
                                rawRow?.[nameIdx] ?? ""
                            )
                                .trim()
                                .replace(
                                    /\s+/g,
                                    " "
                                );

                        const mobileNumber =
                            String(
                                rawRow?.[mobileIdx] ?? ""
                            )
                                .replace(
                                    /\D/g,
                                    ""
                                )
                                .trim();

                        const zoneName =
                            String(
                                rawRow?.[zoneIdx] ?? ""
                            )
                                .trim()
                                .replace(
                                    /\s+/g,
                                    " "
                                );

                        const wardName =
                            String(
                                rawRow?.[wardIdx] ?? ""
                            )
                                .trim()
                                .replace(
                                    /\s+/g,
                                    " "
                                );


                        /* Completely blank rows */

                        if (
                            !employeeName &&
                            !mobileNumber &&
                            !zoneName &&
                            !wardName
                        ) {
                            return;
                        }


                        if (
                            !employeeName ||
                            !zoneName ||
                            !wardName
                        ) {
                            parsedRows.push({
                                rowNumber,
                                employeeName,
                                mobileNumber,
                                zoneName,
                                wardName,
                                status:
                                    "INVALID_DATA",
                                message:
                                    "Employee Name, Zone Name and Ward Name are required.",
                            });

                            return;
                        }


                        if (
                            !/^\d{10}$/.test(
                                mobileNumber
                            )
                        ) {
                            parsedRows.push({
                                rowNumber,
                                employeeName,
                                mobileNumber,
                                zoneName,
                                wardName,
                                status:
                                    "INVALID_MOBILE",
                                message:
                                    "Mobile Number must contain exactly 10 digits.",
                            });

                            return;
                        }


                        /* Find Zone */

                        const matchingZones =
                            zonesByName.get(
                                normalizeEmployeeImportValue(
                                    zoneName
                                )
                            ) || [];


                        if (
                            matchingZones.length !==
                            1
                        ) {
                            parsedRows.push({
                                rowNumber,
                                employeeName,
                                mobileNumber,
                                zoneName,
                                wardName,
                                status:
                                    "INVALID_ZONE",
                                message:
                                    `Zone "${zoneName}" could not be matched.`,
                            });

                            return;
                        }


                        const zone =
                            matchingZones[0];


                        /* Find Ward under Zone */

                        const wardKey =
                            `${zone.id}::${normalizeEmployeeImportValue(
                                wardName
                            )}`;

                        const matchingWards =
                            wardsByZoneAndName.get(
                                wardKey
                            ) || [];


                        if (
                            matchingWards.length !==
                            1
                        ) {
                            parsedRows.push({
                                rowNumber,
                                employeeName,
                                mobileNumber,
                                zoneName:
                                    zone.name,
                                wardName,
                                zoneId:
                                    zone.id,
                                status:
                                    "INVALID_WARD",
                                message:
                                    `"${wardName}" is not a valid Ward under ${zone.name}.`,
                            });

                            return;
                        }


                        const ward =
                            matchingWards[0];


                        /* Existing Employee */

                        const normalizedName =
                            normalizeEmployeeImportValue(
                                employeeName
                            );


                        if (
                            existingEmployeeNames.has(
                                normalizedName
                            )
                        ) {
                            parsedRows.push({
                                rowNumber,
                                employeeName,
                                mobileNumber,
                                zoneName:
                                    zone.name,
                                wardName:
                                    ward.name,
                                zoneId:
                                    zone.id,
                                wardId:
                                    ward.id,
                                status:
                                    "ALREADY_EXISTS",
                                message:
                                    "Employee is already registered.",
                            });

                            return;
                        }


                        /*
                         * Duplicate inside same uploaded file.
                         * Name + Zone + Ward are used.
                         */

                        const employeeKey =
                            `${normalizedName}::${zone.id}::${ward.id}`;


                        if (
                            uploadedEmployeeKeys.has(
                                employeeKey
                            )
                        ) {
                            parsedRows.push({
                                rowNumber,
                                employeeName,
                                mobileNumber,
                                zoneName:
                                    zone.name,
                                wardName:
                                    ward.name,
                                zoneId:
                                    zone.id,
                                wardId:
                                    ward.id,
                                status:
                                    "DUPLICATE_ROW",
                                message:
                                    "Duplicate employee row in uploaded Excel.",
                            });

                            return;
                        }


                        uploadedEmployeeKeys.add(
                            employeeKey
                        );


                        parsedRows.push({
                            rowNumber,
                            employeeId,
                            employeeName,
                            mobileNumber,
                            zoneName:
                                zone.name,
                            wardName:
                                ward.name,
                            zoneId:
                                zone.id,
                            wardId:
                                ward.id,
                            status:
                                "READY",
                            message:
                                "Ready to import.",
                        });
                    }
                );


            if (!parsedRows.length) {
                throw new Error(
                    "No employee records were found."
                );
            }


            setEmployeeImportRows(
                parsedRows
            );

        } catch (err: any) {
            console.error(
                "Employee Excel validation failed",
                err
            );

            setEmployeeImportError(
                err?.message ||
                "Unable to read Employee Excel."
            );
        }
    };

    const importReadyEmployees =
        async () => {

            const readyRows =
                employeeImportRows.filter(
                    (row) =>
                        row.status ===
                        "READY"
                );


            if (!readyRows.length) {
                setEmployeeImportError(
                    "There are no valid employees ready to import."
                );

                return;
            }


            try {
                setImportingEmployees(true);
                setEmployeeImportError("");


                let imported = 0;

                const failed: string[] =
                    [];


                /*
                 * Sequential import is intentional.
                 * It avoids sending dozens of employee
                 * creation requests to the backend at once.
                 */

                for (
                    let index = 0;
                    index < readyRows.length;
                    index++
                ) {
                    const row =
                        readyRows[index];

                    setEmployeeImportProgress(
                        `Importing ${index + 1} of ${readyRows.length}...`
                    );


                    try {

                        await apiFetch(
                            "/city/areas/import-register-employee",
                            {
                                method:
                                    "POST",

                                body:
                                    JSON.stringify({
                                        name:
                                            row.employeeName,

                                        phone:
                                            row.mobileNumber,

                                        zoneId:
                                            row.zoneId,

                                        wardId:
                                            row.wardId,

                                        employeeId:
                                            row.employeeId || undefined,
                                    }),
                            }
                        );


                        imported++;

                    } catch (err: any) {

                        failed.push(
                            `${row.employeeName}: ${err?.message ||
                            "Import failed"
                            }`
                        );
                    }
                }


                await loadData();


                if (failed.length) {

                    setEmployeeImportError(
                        `${imported} employee(s) imported. ${failed.length} row(s) failed: ${failed.join(
                            " | "
                        )}`
                    );

                    setEmployeeImportProgress("");

                    return;
                }


                setShowEmployeeImport(
                    false
                );

                setEmployeeImportRows(
                    []
                );

                setEmployeeImportFileName(
                    ""
                );

                setEmployeeImportProgress(
                    ""
                );


            } finally {
                setImportingEmployees(
                    false
                );
            }
        };

    /* =========================================================
       RESET WARD WHEN ZONE CHANGES
    ========================================================= */

    const handleZoneChange = (
        zoneId: string
    ) => {
        setSelectedZoneId(zoneId);
        setSelectedWardId("");
    };

    /* =========================================================
   REGISTER EMPLOYEE HELPERS
========================================================= */




    const resetRegistrationForm = () => {
        setEmployeeName("");
        setEmployeeCodeId("");
        setEmployeePhone("");
        setEmployeeZoneId("");
        setEmployeeWardId("");
        setRegistrationError("");
    };


    const closeRegistrationModal = () => {
        if (registeringEmployee) return;

        setShowRegisterEmployee(false);
        resetRegistrationForm();
    };


    const handleRegisterEmployee = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        const cleanName =
            employeeName
                .trim()
                .replace(/\s+/g, " ");

        const cleanPhone =
            employeePhone.replace(/\D/g, "");


        if (!cleanName) {
            setRegistrationError(
                "Employee name is required."
            );
            return;
        }


        if (!/^\d{10}$/.test(cleanPhone)) {
            setRegistrationError(
                "Mobile number must be exactly 10 digits."
            );
            return;
        }


        if (!employeeZoneId) {
            setRegistrationError(
                "Please select a Zone."
            );
            return;
        }


        if (!employeeWardId) {
            setRegistrationError(
                "Please select a Ward."
            );
            return;
        }


        try {
            setRegisteringEmployee(true);
            setRegistrationError("");


            await apiFetch(
                "/city/areas/import-register-employee",
                {
                    method: "POST",
                    body: JSON.stringify({
                        name: cleanName,
                        phone: cleanPhone,
                        employeeId: employeeCodeId.trim() || undefined,
                        zoneId: employeeZoneId,
                        wardId: employeeWardId,
                    }),
                }
            );


            await loadData();

            setShowRegisterEmployee(false);
            resetRegistrationForm();

        } catch (err: any) {
            console.error(
                "Employee registration failed",
                err
            );

            setRegistrationError(
                err?.message ||
                "Failed to register employee."
            );

        } finally {
            setRegisteringEmployee(false);
        }
    };

    const normalizeEmployeeImportValue = (
        value: unknown
    ) =>
        String(value ?? "")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();

    const downloadEmployeeTemplate = () => {
        const templateRows = [
            [
                "S.No",
                "Employee ID",
                "Employee Name",
                "Mobile Number",
                "Zone Name",
                "Ward Name",
            ],
            [
                1,
                "EMP001",
                "Raisa Bai Aslam",
                "9876543210",
                "Zone 1",
                "1 - Bhairavgarh",
            ],
            [
                2,
                "EMP002",
                "Sanjay",
                "9876543211",
                "Zone 1",
                "2 - Gadhkalika",
            ],
        ];

        const worksheet =
            XLSX.utils.aoa_to_sheet(
                templateRows
            );

        worksheet["!cols"] = [
            { wch: 8 },
            { wch: 16 },
            { wch: 28 },
            { wch: 18 },
            { wch: 20 },
            { wch: 30 },
        ];

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Employees"
        );

        XLSX.writeFile(
            workbook,
            "Employee_Import_Template.xlsx"
        );
    };

    return (
        <RoleGuard
            roles={[
                "CITY_ADMIN",
                "HMS_SUPER_ADMIN",
            ]}
        >
            <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">

                <div className="mx-auto max-w-7xl">


                    {/* =================================================
              HEADER
          ================================================= */}

                    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div className="flex items-center gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                                <Users size={21} />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    Employee Master
                                </h1>

                                <p className="mt-0.5 text-sm text-slate-500">
                                    Employees available for beat assignment.
                                </p>
                            </div>

                        </div>


                        {!isHmsAdmin && (
                            <div className="flex flex-wrap items-center gap-2">

                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 cursor-pointer"
                                        title="Download Employee Directory Options"
                                    >
                                        <Download size={17} className="text-blue-600" />
                                        Download
                                    </button>
                                    {showDownloadDropdown && (
                                        <div className="absolute right-0 top-full mt-2 z-[50] w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowDownloadDropdown(false);
                                                    exportEmployeesExcel();
                                                }}
                                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition cursor-pointer"
                                            >
                                                <FileSpreadsheet size={16} className="text-emerald-600" />
                                                Download Excel (.xlsx)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowDownloadDropdown(false);
                                                    exportEmployeesPdf();
                                                }}
                                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-red-50 hover:text-red-800 transition cursor-pointer"
                                            >
                                                <FileText size={16} className="text-red-600" />
                                                Download PDF
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setEmployeeImportRows([]);
                                        setEmployeeImportFileName("");
                                        setEmployeeImportError("");
                                        setEmployeeImportProgress("");
                                        setShowEmployeeImport(true);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                                >
                                    <FileSpreadsheet size={17} />
                                    Import Excel
                                </button>


                                <button
                                    type="button"
                                    onClick={() => {
                                        resetRegistrationForm();
                                        setShowRegisterEmployee(true);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
                                >
                                    <UserPlus size={17} />
                                    Register Employee
                                </button>

                            </div>
                        )}

                    </div>


                    {/* =================================================
              SUMMARY
          ================================================= */}

                    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Registered Employees
                            </p>

                            <p className="mt-1 text-2xl font-bold text-slate-900">
                                {employees.length}
                            </p>
                        </div>


                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Filtered Results
                            </p>

                            <p className="mt-1 text-2xl font-bold text-blue-600">
                                {filteredEmployees.length}
                            </p>
                        </div>


                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Wards Covered
                            </p>

                            <p className="mt-1 text-2xl font-bold text-slate-900">
                                {
                                    new Set(
                                        employees.flatMap(
                                            (employee) =>
                                                employee.wardIds || []
                                        )
                                    ).size
                                }
                            </p>
                        </div>

                    </div>


                    {/* =================================================
              FILTERS
          ================================================= */}

                    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_auto]">

                            <div className="relative">

                                <Search
                                    size={17}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Search name, employee ID, mobile, zone or ward..."
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />

                            </div>


                            <select
                                value={selectedZoneId}
                                onChange={(e) =>
                                    handleZoneChange(
                                        e.target.value
                                    )
                                }
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                                value={selectedWardId}
                                onChange={(e) =>
                                    setSelectedWardId(
                                        e.target.value
                                    )
                                }
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">
                                    All Wards
                                </option>

                                {availableWards.map(
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


                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={loadData}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                                >
                                    <RefreshCw size={16} />
                                    Refresh
                                </button>

                                <TableExportDropdown
                                    filename="Employee_Master_Directory"
                                    title="Employee Master Directory Report"
                                    data={filteredEmployees.map((emp, idx) => ({
                                        "S.No": idx + 1,
                                        "Employee Name": emp.name,
                                        "Employee ID": emp.employeeId || "—",
                                        "Mobile Number": emp.phone || "Not added",
                                        "Zone": (emp.zoneIds || []).map((id) => zoneNameMap[id]).filter(Boolean).join(", ") || "—",
                                        "Ward": (emp.wardIds || []).map((id) => wardNameMap[id]).filter(Boolean).join(", ") || "—",
                                        "Registered On": emp.createdAt ? new Date(emp.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
                                        "Status": "Registered"
                                    }))}
                                />
                            </div>

                        </div>

                    </div>


                    {/* =================================================
              ERROR
          ================================================= */}

                    {error && (
                        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            {error}
                        </div>
                    )}


                    {/* =================================================
              TABLE
          ================================================= */}

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

                            <div className="flex items-center gap-2">
                                <Users
                                    size={18}
                                    className="text-blue-600"
                                />

                                <h2 className="font-semibold text-slate-900">
                                    Registered Employees
                                </h2>
                            </div>


                            <div className="flex items-center gap-3">
                                {!loading && (
                                    <span className="text-xs font-semibold text-slate-400">
                                        {filteredEmployees.length} employee
                                        {filteredEmployees.length === 1
                                            ? ""
                                            : "s"}
                                    </span>
                                )}

                                <TableExportDropdown
                                    filename="Employee_Master_Directory"
                                    title="Employee Master Directory Report"
                                    data={filteredEmployees.map((emp, idx) => ({
                                        "S.No": idx + 1,
                                        "Employee Name": emp.name,
                                        "Employee ID": emp.employeeId || "—",
                                        "Mobile Number": emp.phone || "Not added",
                                        "Zone": (emp.zoneIds || []).map((id) => zoneNameMap[id]).filter(Boolean).join(", ") || "—",
                                        "Ward": (emp.wardIds || []).map((id) => wardNameMap[id]).filter(Boolean).join(", ") || "—",
                                        "Registered On": emp.createdAt ? new Date(emp.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
                                        "Status": "Registered"
                                    }))}
                                />
                            </div>

                        </div>


                        <div className="overflow-x-auto">

                            <table className="min-w-full">

                                <thead className="bg-slate-50">

                                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                                        <th className="px-5 py-3">
                                            S.No
                                        </th>

                                        <th className="px-5 py-3">
                                            Employee Name
                                        </th>

                                        <th className="px-5 py-3">
                                            Employee ID
                                        </th>

                                        <th className="px-5 py-3">
                                            Mobile Number
                                        </th>

                                        <th className="px-5 py-3">
                                            Zone
                                        </th>

                                        <th className="px-5 py-3">
                                            Ward
                                        </th>

                                        <th className="px-5 py-3">
                                            Registered On
                                        </th>

                                        <th className="px-5 py-3">
                                            Status
                                        </th>

                                    </tr>

                                </thead>


                                <tbody className="divide-y divide-slate-100">

                                    {loading ? (

                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-5 py-14 text-center text-sm text-slate-500"
                                            >
                                                Loading employees...
                                            </td>
                                        </tr>

                                    ) : filteredEmployees.length === 0 ? (

                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-5 py-14 text-center"
                                            >

                                                <div className="mx-auto flex max-w-sm flex-col items-center">

                                                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                                        <Users size={21} />
                                                    </div>

                                                    <p className="font-semibold text-slate-700">
                                                        No employees found
                                                    </p>

                                                    <p className="mt-1 text-sm text-slate-500">
                                                        Change the filters or register employees for beat assignment.
                                                    </p>

                                                </div>

                                            </td>
                                        </tr>

                                    ) : (

                                        filteredEmployees.map(
                                            (employee, empIdx) => {

                                                const employeeZones =
                                                    (employee.zoneIds || [])
                                                        .map(
                                                            (id) =>
                                                                zoneNameMap[id]
                                                        )
                                                        .filter(Boolean);

                                                const employeeWards =
                                                    (employee.wardIds || [])
                                                        .map(
                                                            (id) =>
                                                                wardNameMap[id]
                                                        )
                                                        .filter(Boolean);


                                                return (
                                                    <tr
                                                        key={employee.id}
                                                        className="transition hover:bg-slate-50/70"
                                                    >

                                                        <td className="px-5 py-4 text-sm font-semibold text-slate-400">
                                                            {empIdx + 1}
                                                        </td>

                                                        <td className="px-5 py-4 font-semibold text-slate-900">
                                                            {employee.name}
                                                        </td>

                                                        <td className="px-5 py-4 text-sm font-semibold text-blue-600">
                                                            {employee.employeeId || "—"}
                                                        </td>

                                                        <td className="px-5 py-4 text-sm font-medium text-slate-700">
                                                            {employee.phone ||
                                                                "Not added"}
                                                        </td>

                                                        <td className="px-5 py-4">

                                                            <div className="flex max-w-xs flex-wrap gap-1.5">

                                                                {employeeZones.length ? (
                                                                    employeeZones.map(
                                                                        (name) => (
                                                                            <span
                                                                                key={name}
                                                                                className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                                                                            >
                                                                                {name}
                                                                            </span>
                                                                        )
                                                                    )
                                                                ) : (
                                                                    <span className="text-sm text-slate-400">
                                                                        —
                                                                    </span>
                                                                )}

                                                            </div>

                                                        </td>

                                                        <td className="px-5 py-4">

                                                            <div className="flex max-w-xs flex-wrap gap-1.5">

                                                                {employeeWards.length ? (
                                                                    employeeWards.map(
                                                                        (name) => (
                                                                            <span
                                                                                key={name}
                                                                                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                                                                            >
                                                                                {name}
                                                                            </span>
                                                                        )
                                                                    )
                                                                ) : (
                                                                    <span className="text-sm text-slate-400">
                                                                        —
                                                                    </span>
                                                                )}

                                                            </div>

                                                        </td>

                                                        <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                                            {employee.createdAt
                                                                ? new Date(employee.createdAt).toLocaleDateString("en-IN", {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric"
                                                                })
                                                                : "—"}
                                                        </td>

                                                        <td className="px-5 py-4">

                                                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                                Registered
                                                            </span>

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

                </div>

            </div>
            {showRegisterEmployee && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px]"
                    onClick={closeRegistrationModal}
                >
                    <form
                        onSubmit={handleRegisterEmployee}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    >

                        {/* HEADER */}
                        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">

                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                                    Employee Master
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    Register Employee
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Add an employee for beat assignment.
                                </p>
                            </div>


                            <button
                                type="button"
                                disabled={registeringEmployee}
                                onClick={closeRegistrationModal}
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                            >
                                <X size={18} />
                            </button>

                        </div>


                        {/* FORM */}
                        <div className="space-y-5 px-6 py-5">

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Employee Name *
                                </label>

                                <input
                                    value={employeeName}
                                    onChange={(e) =>
                                        setEmployeeName(e.target.value)
                                    }
                                    placeholder="Enter employee name"
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Employee ID <span className="text-xs font-normal text-slate-400">(Optional)</span>
                                </label>

                                <input
                                    value={employeeCodeId}
                                    onChange={(e) =>
                                        setEmployeeCodeId(e.target.value)
                                    }
                                    placeholder="Enter Employee ID (e.g. EMP101)"
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>


                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Mobile Number *
                                </label>

                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    value={employeePhone}
                                    maxLength={10}
                                    onChange={(e) => {
                                        const value =
                                            e.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 10);

                                        setEmployeePhone(value);
                                    }}
                                    placeholder="Enter 10 digit mobile number"
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>


                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                        Zone *
                                    </label>

                                    <select
                                        value={employeeZoneId}
                                        onChange={(e) => {
                                            setEmployeeZoneId(
                                                e.target.value
                                            );
                                            setEmployeeWardId("");
                                        }}
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                                    >
                                        <option value="">
                                            Select Zone
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
                                </div>


                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                        Ward *
                                    </label>

                                    <select
                                        value={employeeWardId}
                                        disabled={!employeeZoneId}
                                        onChange={(e) =>
                                            setEmployeeWardId(
                                                e.target.value
                                            )
                                        }
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none disabled:bg-slate-100"
                                    >
                                        <option value="">
                                            {employeeZoneId
                                                ? "Select Ward"
                                                : "Select Zone first"}
                                        </option>

                                        {registrationWards.map(
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
                                </div>

                            </div>


                            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700">
                                This employee is registered only for beat assignment. No email or login access is created.
                            </div>


                            {registrationError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    {registrationError}
                                </div>
                            )}

                        </div>


                        {/* FOOTER */}
                        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">

                            <button
                                type="button"
                                disabled={registeringEmployee}
                                onClick={closeRegistrationModal}
                                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
                            >
                                Cancel
                            </button>


                            <button
                                type="submit"
                                disabled={registeringEmployee}
                                className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white disabled:bg-blue-300"
                            >
                                <UserPlus size={17} />

                                {registeringEmployee
                                    ? "Registering..."
                                    : "Register Employee"}
                            </button>

                        </div>

                    </form>
                </div>
            )}

            {showEmployeeImport && (

                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px]"
                    onClick={() => {
                        if (
                            !importingEmployees
                        ) {
                            setShowEmployeeImport(
                                false
                            );
                        }
                    }}
                >

                    <div
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                        className="max-h-[calc(100vh-32px)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    >

                        {/* HEADER */}

                        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">

                            <div>

                                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                                    Employee Master
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    Import Employees
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Upload employees for beat assignment using the required Excel format.
                                </p>

                            </div>


                            <button
                                type="button"
                                disabled={
                                    importingEmployees
                                }
                                onClick={() =>
                                    setShowEmployeeImport(
                                        false
                                    )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                            >
                                <X size={18} />
                            </button>

                        </div>


                        <div className="space-y-5 px-6 py-5">


                            {/* TEMPLATE */}

                            <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">

                                <div>

                                    <p className="font-semibold text-blue-900">
                                        Required Excel Format
                                    </p>

                                    <p className="mt-1 text-xs text-blue-700">
                                        S.No | Employee ID | Employee Name | Mobile Number | Zone Name | Ward Name
                                    </p>

                                </div>


                                <button
                                    type="button"
                                    onClick={
                                        downloadEmployeeTemplate
                                    }
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700"
                                >
                                    <Download size={16} />
                                    Download Template
                                </button>

                            </div>


                            {/* UPLOAD */}

                            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center">

                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={
                                        handleEmployeeExcelFile
                                    }
                                    className="hidden"
                                />

                                <FileSpreadsheet
                                    size={28}
                                    className="text-blue-600"
                                />

                                <p className="mt-2 font-semibold text-slate-800">
                                    {employeeImportFileName ||
                                        "Select Employee Excel File"}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                    .xlsx or .xls
                                </p>

                            </label>


                            {/* SUMMARY */}

                            {employeeImportRows.length >
                                0 && (

                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                                        <div className="rounded-xl border border-slate-200 p-3">
                                            <p className="text-xs text-slate-500">
                                                Total Rows
                                            </p>

                                            <p className="mt-1 text-xl font-bold text-slate-900">
                                                {
                                                    employeeImportRows.length
                                                }
                                            </p>
                                        </div>


                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                            <p className="text-xs text-emerald-700">
                                                Ready
                                            </p>

                                            <p className="mt-1 text-xl font-bold text-emerald-700">
                                                {
                                                    employeeImportRows.filter(
                                                        (row) =>
                                                            row.status ===
                                                            "READY"
                                                    ).length
                                                }
                                            </p>
                                        </div>


                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                                            <p className="text-xs text-amber-700">
                                                Existing
                                            </p>

                                            <p className="mt-1 text-xl font-bold text-amber-700">
                                                {
                                                    employeeImportRows.filter(
                                                        (row) =>
                                                            row.status ===
                                                            "ALREADY_EXISTS"
                                                    ).length
                                                }
                                            </p>
                                        </div>


                                        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                                            <p className="text-xs text-red-700">
                                                Need Action
                                            </p>

                                            <p className="mt-1 text-xl font-bold text-red-700">
                                                {
                                                    employeeImportRows.filter(
                                                        (row) =>
                                                            row.status !==
                                                            "READY" &&
                                                            row.status !==
                                                            "ALREADY_EXISTS"
                                                    ).length
                                                }
                                            </p>
                                        </div>

                                    </div>

                                )}


                            {/* PREVIEW */}

                            {employeeImportRows.length >
                                0 && (

                                    <div className="overflow-x-auto rounded-xl border border-slate-200">

                                        <table className="min-w-full text-sm">

                                            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">

                                                <tr>
                                                    <th className="px-3 py-3">
                                                        Row
                                                    </th>

                                                    <th className="px-3 py-3">
                                                        Employee ID
                                                    </th>

                                                    <th className="px-3 py-3">
                                                        Employee
                                                    </th>

                                                    <th className="px-3 py-3">
                                                        Mobile
                                                    </th>

                                                    <th className="px-3 py-3">
                                                        Zone
                                                    </th>

                                                    <th className="px-3 py-3">
                                                        Ward
                                                    </th>

                                                    <th className="px-3 py-3">
                                                        Status
                                                    </th>
                                                </tr>

                                            </thead>


                                            <tbody className="divide-y divide-slate-100">

                                                {employeeImportRows.map(
                                                    (row) => (

                                                        <tr
                                                            key={
                                                                row.rowNumber
                                                            }
                                                        >

                                                            <td className="px-3 py-3">
                                                                {row.rowNumber}
                                                            </td>

                                                            <td className="px-3 py-3 font-semibold text-blue-600">
                                                                {row.employeeId || "—"}
                                                            </td>

                                                            <td className="px-3 py-3 font-semibold">
                                                                {row.employeeName ||
                                                                    "—"}
                                                            </td>

                                                            <td className="px-3 py-3">
                                                                {row.mobileNumber ||
                                                                    "—"}
                                                            </td>

                                                            <td className="px-3 py-3">
                                                                {row.zoneName ||
                                                                    "—"}
                                                            </td>

                                                            <td className="px-3 py-3">
                                                                {row.wardName ||
                                                                    "—"}
                                                            </td>

                                                            <td className="px-3 py-3">

                                                                <span
                                                                    className={
                                                                        row.status ===
                                                                            "READY"
                                                                            ? "font-semibold text-emerald-700"
                                                                            : row.status ===
                                                                                "ALREADY_EXISTS"
                                                                                ? "font-semibold text-amber-700"
                                                                                : "font-semibold text-red-600"
                                                                    }
                                                                >
                                                                    {
                                                                        row.status
                                                                    }
                                                                </span>

                                                            </td>

                                                        </tr>

                                                    ))}

                                            </tbody>

                                        </table>

                                    </div>

                                )}


                            {employeeImportProgress && (
                                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                                    {employeeImportProgress}
                                </div>
                            )}


                            {employeeImportError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    {employeeImportError}
                                </div>
                            )}

                        </div>


                        {/* FOOTER */}

                        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">

                            <button
                                type="button"
                                disabled={
                                    importingEmployees
                                }
                                onClick={() =>
                                    setShowEmployeeImport(
                                        false
                                    )
                                }
                                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                onClick={
                                    importReadyEmployees
                                }
                                disabled={
                                    importingEmployees ||
                                    !employeeImportRows.some(
                                        (row) =>
                                            row.status ===
                                            "READY"
                                    )
                                }
                                className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white disabled:bg-blue-300"
                            >
                                {importingEmployees
                                    ? "Importing..."
                                    : `Import ${employeeImportRows.filter(
                                        (row) =>
                                            row.status ===
                                            "READY"
                                    ).length
                                    } Valid Employee(s)`}
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </RoleGuard>
    );
}
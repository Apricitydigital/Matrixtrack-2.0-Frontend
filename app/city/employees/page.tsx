"use client";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertTriangle,
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    Download,
    Edit2,
    FileSpreadsheet,
    FileText,
    MoreVertical,
    RefreshCw,
    Search,
    Square,
    Trash2,
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
    aadhaar?: string | null;
    employmentType?: string | null;
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
    | "INVALID_AADHAAR"
    | "INVALID_EMPLOYMENT_TYPE"
    | "INVALID_DATA"
    | "DUPLICATE_ROW";

type EmployeeImportRow = {
    rowNumber: number;
    employeeId?: string;
    employeeName: string;
    mobileNumber?: string;
    aadhaarNumber?: string;
    employmentType?: string;
    zoneName: string;
    wardName: string;
    zoneId?: string;
    wardId?: string;
    status: EmployeeImportStatus;
    message: string;
};

function normalizeEmploymentType(input?: string | null): string {
    if (!input) return "Permanent";
    const str = String(input).trim();
    const lower = str.toLowerCase();

    // 1. Outsource: 'Outsource', 'Outsourced', 'आउटसोर्स', 'आउटसोर्सिंग', 'आउट सोर्स'
    if (
        lower.includes("outsource") ||
        str.includes("आउटसोर्स") ||
        str.includes("आउट सोर्स") ||
        str.includes("आउटसोर्सिंग")
    ) {
        return "Outsource";
    }

    // 2. Temporary: 'Temporary', 'अस्थायी' (checked before Permanent)
    if (
        lower.includes("temp") ||
        str.includes("अस्थायी") ||
        str.includes("अस्थाई")
    ) {
        return "Temporary";
    }

    // 3. Regularized: 'Regularized', 'विनियमित', 'विनीयमित'
    if (
        lower.includes("regular") ||
        str.includes("विनियमित") ||
        str.includes("विनीयमित")
    ) {
        return "Regularized";
    }

    // 4. Permanent: 'Permanent', 'स्थायी'
    if (
        lower.includes("perman") ||
        str.includes("स्थायी") ||
        str.includes("स्थाई")
    ) {
        return "Permanent";
    }

    return "Permanent";
}

function normalizeEmployeeCodeId(value: unknown): string {
    return String(value ?? "").trim();
}

function isValidEmployeeCodeId(value: string): boolean {
    return /^[A-Za-z0-9_-]{3,50}$/.test(value);
}

function getEmploymentTypeDisplay(type?: string | null): {
    key: "Permanent" | "Regularized" | "Temporary" | "Outsource";
    labelEn: string;
    labelHi: string;
    badgeLabel: string;
} {
    const normalized = normalizeEmploymentType(type);
    if (normalized === "Outsource") {
        return {
            key: "Outsource",
            labelEn: "Outsource",
            labelHi: "आउटसोर्स",
            badgeLabel: "Outsource / आउटसोर्स",
        };
    }
    if (normalized === "Regularized") {
        return {
            key: "Regularized",
            labelEn: "Regularized",
            labelHi: "विनियमित",
            badgeLabel: "Regularized / विनियमित",
        };
    }
    if (normalized === "Temporary") {
        return {
            key: "Temporary",
            labelEn: "Temporary",
            labelHi: "अस्थायी",
            badgeLabel: "Temporary / अस्थायी",
        };
    }
    return {
        key: "Permanent",
        labelEn: "Permanent",
        labelHi: "स्थायी",
        badgeLabel: "Permanent / स्थायी",
    };
}


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
       FILTERS & PAGINATION
    ========================================================= */

    const [showDownloadDropdown, setShowDownloadDropdown] =
        useState(false);

    const [searchQuery, setSearchQuery] =
        useState("");

    const [selectedZoneId, setSelectedZoneId] =
        useState("");

    const [selectedWardId, setSelectedWardId] =
        useState("");

    const [selectedEmploymentType, setSelectedEmploymentType] =
        useState("");

    const [currentPage, setCurrentPage] =
        useState(1);

    const [pageSize, setPageSize] =
        useState(10);


    /* =========================================================
       SELECTION & BULK ACTIONS
    ========================================================= */

    const [selectedEmployeeIds, setSelectedEmployeeIds] =
        useState<string[]>([]);

    const [openActionMenuId, setOpenActionMenuId] =
        useState<string | null>(null);

    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] =
        useState(false);

    const [deletingBulk, setDeletingBulk] =
        useState(false);


    /* =========================================================
       DELETE SINGLE EMPLOYEE
    ========================================================= */

    const [deleteTarget, setDeleteTarget] =
        useState<{ id: string; name: string } | null>(null);

    const [deletingSingle, setDeletingSingle] =
        useState(false);


    /* =========================================================
       EDIT EMPLOYEE
    ========================================================= */

    const [editingEmployee, setEditingEmployee] =
        useState<EmployeeRow | null>(null);

    const [editName, setEditName] =
        useState("");

    const [editEmployeeCodeId, setEditEmployeeCodeId] =
        useState("");

    const [editPhone, setEditPhone] =
        useState("");

    const [editAadhaar, setEditAadhaar] =
        useState("");

    const [editEmploymentType, setEditEmploymentType] =
        useState<string>("Permanent");

    const [editZoneId, setEditZoneId] =
        useState("");

    const [editWardId, setEditWardId] =
        useState("");

    const [editError, setEditError] =
        useState("");

    const [showEditConfirm, setShowEditConfirm] =
        useState(false);

    const [savingEdit, setSavingEdit] =
        useState(false);


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

    const [employeeAadhaar, setEmployeeAadhaar] =
        useState("");

    const [employeeEmploymentType, setEmployeeEmploymentType] =
        useState<string>("Permanent");

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

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest(".employee-action-menu-container")) {
                setOpenActionMenuId(null);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);


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

        return wards.filter(
            (ward) =>
                !ward.parentId ||
                ward.parentId === selectedZoneId
        );
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

    const editRegistrationWards = useMemo(() => {
        if (!editZoneId) return [];

        return wards.filter(
            (ward) =>
                ward.parentId === editZoneId
        );
    }, [wards, editZoneId]);


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

            if (selectedEmploymentType) {
                const norm = normalizeEmploymentType(employee.employmentType);
                if (norm !== selectedEmploymentType) {
                    return false;
                }
            }


            if (!query) {
                return true;
            }


            const empTypeInfo = getEmploymentTypeDisplay(employee.employmentType);

            const searchableText = [
                employee.name,
                employee.employeeId || "",
                employee.phone || "",
                employee.aadhaar || "",
                employee.employmentType || "",
                empTypeInfo.labelEn,
                empTypeInfo.labelHi,
                empTypeInfo.badgeLabel,
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
        selectedEmploymentType,
        zoneNameMap,
        wardNameMap,
    ]);

    /* =========================================================
       PAGINATION
    ========================================================= */

    const totalPages = Math.max(
        1,
        Math.ceil(filteredEmployees.length / pageSize)
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedZoneId, selectedWardId, selectedEmploymentType]);

    const paginatedEmployees = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredEmployees.slice(start, start + pageSize);
    }, [filteredEmployees, currentPage, pageSize]);


    /* =========================================================
       SELECTION LOGIC
    ========================================================= */

    const isAllPageSelected =
        paginatedEmployees.length > 0 &&
        paginatedEmployees.every((emp) =>
            selectedEmployeeIds.includes(emp.id)
        );

    const toggleSelectAll = () => {
        if (isAllPageSelected) {
            const pageIds = new Set(paginatedEmployees.map((e) => e.id));
            setSelectedEmployeeIds((prev) =>
                prev.filter((id) => !pageIds.has(id))
            );
        } else {
            const newIds = new Set([
                ...selectedEmployeeIds,
                ...paginatedEmployees.map((e) => e.id),
            ]);
            setSelectedEmployeeIds(Array.from(newIds));
        }
    };

    const toggleSelectRow = (id: string) => {
        setSelectedEmployeeIds((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );
    };


    /* =========================================================
       DELETE ACTIONS
    ========================================================= */

    const handleConfirmDeleteSingle = async () => {
        if (!deleteTarget) return;

        try {
            setDeletingSingle(true);
            await CityUserApi.remove(deleteTarget.id);
            await loadData();
            setSelectedEmployeeIds((prev) =>
                prev.filter((id) => id !== deleteTarget.id)
            );
            setDeleteTarget(null);
        } catch (err: any) {
            console.error("Failed to delete employee", err);
            setError(err?.message || "Failed to delete employee.");
        } finally {
            setDeletingSingle(false);
        }
    };

    const handleConfirmBulkDelete = async () => {
        if (!selectedEmployeeIds.length) return;

        try {
            setDeletingBulk(true);
            for (const id of selectedEmployeeIds) {
                try {
                    await CityUserApi.remove(id);
                } catch (err) {
                    console.error(`Failed to delete employee ${id}`, err);
                }
            }
            await loadData();
            setSelectedEmployeeIds([]);
            setShowBulkDeleteConfirm(false);
        } catch (err: any) {
            console.error("Bulk delete failed", err);
            setError(err?.message || "Failed to delete selected employees.");
        } finally {
            setDeletingBulk(false);
        }
    };


    /* =========================================================
       EDIT ACTIONS
    ========================================================= */

    const openEditModal = (emp: EmployeeRow) => {
        setEditingEmployee(emp);
        setEditName(emp.name);
        setEditEmployeeCodeId(emp.employeeId || "");
        setEditPhone(emp.phone || "");
        setEditAadhaar(emp.aadhaar || "");
        setEditEmploymentType(emp.employmentType || "Permanent");
        setEditZoneId(emp.zoneIds?.[0] || "");
        setEditWardId(emp.wardIds?.[0] || "");
        setEditError("");
        setShowEditConfirm(false);
    };

    const closeEditModal = () => {
        if (savingEdit) return;
        setEditingEmployee(null);
        setShowEditConfirm(false);
        setEditError("");
    };

    const handleEditSaveRequest = (e: React.FormEvent) => {
        e.preventDefault();

        const cleanName = editName.trim().replace(/\s+/g, " ");
        const cleanEmployeeId = normalizeEmployeeCodeId(editEmployeeCodeId);
        const cleanPhone = editPhone.replace(/\D/g, "");
        const cleanAadhaar = editAadhaar.replace(/\D/g, "");

        if (!cleanName) {
            setEditError("Employee name is required.");
            return;
        }

        if (!cleanEmployeeId) {
            setEditError("Employee ID is required.");
            return;
        }

        if (!isValidEmployeeCodeId(cleanEmployeeId)) {
            setEditError("Employee ID must be 3 to 50 characters and can contain only letters, numbers, hyphen or underscore.");
            return;
        }

        if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
            setEditError("Mobile number must be exactly 10 digits.");
            return;
        }

        if (cleanAadhaar && !/^\d{12}$/.test(cleanAadhaar)) {
            setEditError("Aadhaar number must be exactly 12 digits.");
            return;
        }

        if (!editZoneId) {
            setEditError("Please select a Zone.");
            return;
        }

        if (!editWardId) {
            setEditError("Please select a Ward.");
            return;
        }

        setShowEditConfirm(true);
    };

    const handleConfirmEditSave = async () => {
        if (!editingEmployee) return;

        const cleanName = editName.trim().replace(/\s+/g, " ");
        const cleanEmployeeId = normalizeEmployeeCodeId(editEmployeeCodeId);
        const cleanPhone = editPhone.replace(/\D/g, "");
        const cleanAadhaar = editAadhaar.replace(/\D/g, "");

        try {
            setSavingEdit(true);
            setEditError("");

            await CityUserApi.update(editingEmployee.id, {
                name: cleanName,
                employeeId: cleanEmployeeId,
                phone: cleanPhone || null,
                aadhaar: cleanAadhaar || null,
                employmentType: editEmploymentType || "Permanent",
                zoneIds: [editZoneId],
                wardIds: [editWardId],
                role: "EMPLOYEE",
            });

            await loadData();
            closeEditModal();
        } catch (err: any) {
            console.error("Failed to update employee", err);
            setEditError(err?.message || "Failed to update employee.");
            setShowEditConfirm(false);
        } finally {
            setSavingEdit(false);
        }
    };


    /* =========================================================
       EXPORT
    ========================================================= */

    const exportEmployeesExcel = useCallback(() => {
        if (!filteredEmployees.length) return;
        const rows = filteredEmployees.map((emp, idx) => {
            const zones = (emp.zoneIds || []).map((id) => zoneNameMap[id]).filter(Boolean).join(", ") || "—";
            const wards = (emp.wardIds || []).map((id) => wardNameMap[id]).filter(Boolean).join(", ") || "—";
            const createdDate = emp.createdAt
                ? new Date(emp.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "—";

            const typeInfo = getEmploymentTypeDisplay(emp.employmentType);

            return {
                "S.No": idx + 1,
                "Employee Name": emp.name,
                "Employee ID": emp.employeeId || "—",
                "Mobile Number": emp.phone || "Not added",
                "Aadhaar Number": emp.aadhaar || "—",
                "Appointment Type": `${typeInfo.labelEn} / ${typeInfo.labelHi}`,
                "Zone": zones,
                "Ward": wards,
                "Registered On": createdDate,
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = [
            { wch: 8 },
            { wch: 26 },
            { wch: 16 },
            { wch: 18 },
            { wch: 18 },
            { wch: 26 },
            { wch: 22 },
            { wch: 22 },
            { wch: 18 },
        ];

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
                const typeInfo = getEmploymentTypeDisplay(emp.employmentType);

                return `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px 14px; font-weight: 600; text-align: center;">${idx + 1}</td>
                        <td style="padding: 10px 14px; font-weight: 700; color: #0f172a;">${emp.name}</td>
                        <td style="padding: 10px 14px; font-weight: 700; color: #2563eb;">${emp.employeeId || "—"}</td>
                        <td style="padding: 10px 14px; color: #334155;">${emp.phone || "Not added"}</td>
                        <td style="padding: 10px 14px; color: #334155; font-family: monospace;">${emp.aadhaar || "—"}</td>
                        <td style="padding: 10px 14px; font-weight: 600; color: #1e40af;">${typeInfo.labelEn} / ${typeInfo.labelHi}</td>
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
                                <th>Aadhaar Number</th>
                                <th>Employment Type</th>
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


    /* =========================================================
       EXCEL IMPORT LOGIC
    ========================================================= */

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
                    const raw = h.toLowerCase().trim();
                    const norm = raw.replace(/[^a-z0-9\u0900-\u097F]/g, "");
                    return queryKeywords.some((kw) => {
                        const cleanKw = kw.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, "");
                        return norm.includes(cleanKw) || raw.includes(kw.toLowerCase());
                    });
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
            const aadhaarIdx = findColIdx(["aadhaar", "aadhar", "uid", "adharnumber", "aadharnumber"], hasEmpId ? 4 : 3);
            const employmentTypeIdx = findColIdx([
                "appointment",
                "employment",
                "employeement",
                "नियुक्ति",
                "नियुक्तिप्रकार",
                "appointmenttype",
                "employmenttype",
                "type",
                "category"
            ], hasEmpId ? 5 : 4);
            const zoneIdx = findColIdx(["zone"], hasEmpId ? 6 : 5);
            const wardIdx = findColIdx(["ward"], hasEmpId ? 7 : 6);


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

            const existingEmployeesByAadhaar = new Map<string, EmployeeRow>();
            const existingEmployeesByEmployeeId = new Map<string, EmployeeRow>();
            const existingEmployeesByName = new Map<string, EmployeeRow[]>();

            employees.forEach((emp) => {
                if (emp.aadhaar) existingEmployeesByAadhaar.set(emp.aadhaar, emp);
                if (emp.employeeId) {
                    existingEmployeesByEmployeeId.set(
                        normalizeEmployeeCodeId(emp.employeeId),
                        emp
                    );
                }
                
                const normName = normalizeEmployeeImportValue(emp.name);
                const arr = existingEmployeesByName.get(normName) || [];
                arr.push(emp);
                existingEmployeesByName.set(normName, arr);
            });


            const uploadedEmployeeKeys =
                new Set<string>();

            const uploadedEmployeeIds = new Set<string>();
            const uploadedAadhaars = new Set<string>();
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
                                ? normalizeEmployeeCodeId(rawRow?.[empIdIdx])
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

                        const rawMobile =
                            mobileIdx !== -1
                                ? String(rawRow?.[mobileIdx] ?? "").replace(/\D/g, "").trim()
                                : "";
                        // If 10 digits, keep it; otherwise blank/null without invalidating the row
                        const mobileNumber = rawMobile.length === 10 ? rawMobile : "";

                        const rawAadhaar =
                            aadhaarIdx !== -1
                                ? String(rawRow?.[aadhaarIdx] ?? "").replace(/\D/g, "").trim()
                                : "";
                        // If 12 digits, keep it; otherwise blank/null without invalidating the row
                        const aadhaarNumber = rawAadhaar.length === 12 ? rawAadhaar : "";

                        const rawEmploymentType =
                            employmentTypeIdx !== -1
                                ? String(rawRow?.[employmentTypeIdx] ?? "").trim()
                                : "";
                        const employmentType = normalizeEmploymentType(rawEmploymentType);

                        const zoneName =
                            zoneIdx !== -1
                                ? String(rawRow?.[zoneIdx] ?? "").trim().replace(/\s+/g, " ")
                                : "";

                        const wardName =
                            wardIdx !== -1
                                ? String(rawRow?.[wardIdx] ?? "").trim().replace(/\s+/g, " ")
                                : "";


                        /* Completely blank rows */

                        if (
                            !employeeName &&
                            !mobileNumber &&
                            !aadhaarNumber &&
                            !zoneName &&
                            !wardName
                        ) {
                            return;
                        }


                        if (
                            !employeeName ||
                            !employeeId ||
                            !zoneName ||
                            !wardName
                        ) {
                            parsedRows.push({
                                rowNumber,
                                employeeName,
                                mobileNumber,
                                aadhaarNumber,
                                employmentType,
                                zoneName,
                                wardName,
                                status:
                                    "INVALID_DATA",
                                message:
                                    "Employee ID, Employee Name, Zone Name and Ward Name are required.",
                            });

                            return;
                        }

                        if (!isValidEmployeeCodeId(employeeId)) {
                            parsedRows.push({
                                rowNumber,
                                employeeId,
                                employeeName,
                                mobileNumber,
                                aadhaarNumber,
                                employmentType,
                                zoneName,
                                wardName,
                                status: "INVALID_DATA",
                                message:
                                    "Employee ID must be 3 to 50 characters and can contain only letters, numbers, hyphen or underscore.",
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
                                aadhaarNumber,
                                employmentType,
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
                                aadhaarNumber,
                                employmentType,
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

                        let isAlreadyExists = false;

                        if (existingEmployeesByEmployeeId.has(employeeId)) {
                            isAlreadyExists = true;
                        } else if (aadhaarNumber && existingEmployeesByAadhaar.has(aadhaarNumber)) {
                            isAlreadyExists = true;
                        } else if (!mobileNumber && !aadhaarNumber) {
                            // If they provide NO phone and NO aadhaar, and the name already exists, 
                            // we flag it to prevent accidental identical named duplicates without identifiers.
                            if (existingEmployeesByName.has(normalizedName)) {
                                isAlreadyExists = true;
                            }
                        }

                        if (isAlreadyExists) {
                            parsedRows.push({
                                rowNumber,
                                employeeName,
                                mobileNumber,
                                aadhaarNumber,
                                employmentType,
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
                         * Use Name + Mobile + Aadhaar + Zone + Ward to be safe for exact duplicates.
                         */

                        const employeeKey =
                            `${normalizedName}::${mobileNumber || ""}::${aadhaarNumber || ""}::${zone.id}::${ward.id}`;

                        if (
                            uploadedEmployeeKeys.has(employeeKey)
                        ) {
                            parsedRows.push({
                                rowNumber,
                                employeeName,
                                mobileNumber,
                                aadhaarNumber,
                                employmentType,
                                zoneName: zone.name,
                                wardName: ward.name,
                                zoneId: zone.id,
                                wardId: ward.id,
                                status: "DUPLICATE_ROW",
                                message: "Exact duplicate employee row in uploaded Excel.",
                            });
                            return;
                        }

                        if (aadhaarNumber && uploadedAadhaars.has(aadhaarNumber)) {
                            parsedRows.push({
                                rowNumber,
                                employeeId,
                                employeeName,
                                mobileNumber,
                                aadhaarNumber,
                                employmentType,
                                zoneName: zone.name,
                                wardName: ward.name,
                                zoneId: zone.id,
                                wardId: ward.id,
                                status: "DUPLICATE_ROW",
                                message: "This Aadhaar number is already used in another row in this Excel.",
                            });
                            return;
                        }

                        if (uploadedEmployeeIds.has(employeeId)) {
                            parsedRows.push({
                                rowNumber,
                                employeeId,
                                employeeName,
                                mobileNumber,
                                aadhaarNumber,
                                employmentType,
                                zoneName: zone.name,
                                wardName: ward.name,
                                zoneId: zone.id,
                                wardId: ward.id,
                                status: "DUPLICATE_ROW",
                                message: "This Employee ID is already used in another row in this Excel.",
                            });
                            return;
                        }

                        uploadedEmployeeKeys.add(employeeKey);
                        uploadedEmployeeIds.add(employeeId);
                        if (aadhaarNumber) uploadedAadhaars.add(aadhaarNumber);


                        parsedRows.push({
                            rowNumber,
                            employeeId,
                            employeeName,
                            mobileNumber,
                            aadhaarNumber,
                            employmentType,
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

                setEmployeeImportProgress(
                    `Importing ${readyRows.length} employees...`
                );

                const result = await apiFetch<{
                    success: boolean;
                    total: number;
                    imported: number;
                    failed: number;
                    failures: Array<{
                        rowNumber: number;
                        employeeId: string | null;
                        name: string;
                        message: string;
                    }>;
                }>(
                    "/city/areas/import-register-employees-bulk",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            employees: readyRows.map((row) => ({
                                rowNumber: row.rowNumber,
                                name: row.employeeName,
                                phone: row.mobileNumber || undefined,
                                aadhaar: row.aadhaarNumber || undefined,
                                employmentType: row.employmentType || "Permanent",
                                zoneId: row.zoneId,
                                wardId: row.wardId,
                                employeeId: row.employeeId,
                            })),
                        }),
                    }
                );


                await loadData();


                if (result.failed) {
                    const failureByRow = new Map(
                        result.failures.map((failure) => [failure.rowNumber, failure.message])
                    );

                    setEmployeeImportRows((currentRows) =>
                        currentRows.map((row) => {
                            if (row.status !== "READY") return row;
                            const failureMessage = failureByRow.get(row.rowNumber);
                            return failureMessage
                                ? { ...row, status: "INVALID_DATA", message: failureMessage }
                                : { ...row, status: "ALREADY_EXISTS", message: "Imported successfully." };
                        })
                    );

                    setEmployeeImportError(
                        `${result.imported} employee(s) imported. ${result.failed} row(s) failed. Review the highlighted rows for exact reasons.`
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

            } catch (err: any) {
                setEmployeeImportError(
                    err?.message || "Employee import failed. No employees were saved."
                );
                setEmployeeImportProgress("");
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
        setEmployeeAadhaar("");
        setEmployeeEmploymentType("Permanent");
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
        const cleanEmployeeId =
            normalizeEmployeeCodeId(employeeCodeId);

        const cleanPhone =
            employeePhone.replace(/\D/g, "");

        const cleanAadhaar =
            employeeAadhaar.replace(/\D/g, "");


        if (!cleanName) {
            setRegistrationError(
                "Employee name is required."
            );
            return;
        }


        if (!cleanEmployeeId) {
            setRegistrationError(
                "Employee ID is required."
            );
            return;
        }

        if (!isValidEmployeeCodeId(cleanEmployeeId)) {
            setRegistrationError(
                "Employee ID must be 3 to 50 characters and can contain only letters, numbers, hyphen or underscore."
            );
            return;
        }

        if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
            setRegistrationError(
                "Mobile number must be exactly 10 digits."
            );
            return;
        }


        if (cleanAadhaar && !/^\d{12}$/.test(cleanAadhaar)) {
            setRegistrationError(
                "Aadhaar number must be exactly 12 digits."
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
                        phone: cleanPhone || undefined,
                        aadhaar: cleanAadhaar || undefined,
                        employmentType: employeeEmploymentType || "Permanent",
                        employeeId: cleanEmployeeId,
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
                "Aadhaar Number",
                "Appointment Type",
                "Zone Name",
                "Ward Name",
            ],
            [
                1,
                "EMP001",
                "Raisa Bai Aslam",
                "9876543210",
                "123456789012",
                "Permanent / स्थायी",
                "Zone 1",
                "1 - Bhairavgarh",
            ],
            [
                2,
                "EMP002",
                "Sanjay",
                "9876543211",
                "987654321098",
                "Regularized / विनियमित",
                "Zone 1",
                "2 - Gadhkalika",
            ],
            [
                3,
                "EMP003",
                "Amit Sharma",
                "",
                "456789012345",
                "Temporary / अस्थायी",
                "Zone 1",
                "3 - Kotwali",
            ],
            [
                4,
                "EMP004",
                "Vikram Singh",
                "9876543212",
                "789012345678",
                "Outsource / आउटसोर्स",
                "Zone 1",
                "4 - Begambagh",
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
                "COMMISSIONER",
            ]}
        >
            <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">

                <div className="mx-auto max-w-7xl">


                    {/* =================================================
                        HEADER
                    ================================================= */}

                    <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                                    <Users size={22} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Master Control</div>
                                    <h1 className="text-xl font-black text-slate-900 tracking-tight">
                                        Employee Master
                                    </h1>
                                </div>
                            </div>

                            {/* ACTIONS */}
                            {!isHmsAdmin && (
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {selectedEmployeeIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowBulkDeleteConfirm(true)}
                                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-100 cursor-pointer"
                                        >
                                            <Trash2 size={15} />
                                            Delete Selected ({selectedEmployeeIds.length})
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setShowEmployeeImport(true)}
                                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                                    >
                                        <FileSpreadsheet size={15} className="text-emerald-600" />
                                        Import Excel
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowRegisterEmployee(true)}
                                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer"
                                    >
                                        <UserPlus size={15} />
                                        Register Employee
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>


                    {/* =================================================
                        SUMMARY
                    ================================================= */}

                    <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Registered Employees
                            </p>

                            <p className="mt-1 text-2xl font-black text-slate-900">
                                {employees.length}
                            </p>
                        </div>


                        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                                Filtered Results
                            </p>

                            <p className="mt-1 text-2xl font-black text-blue-600">
                                {filteredEmployees.length}
                            </p>
                        </div>


                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Wards Covered
                            </p>

                            <p className="mt-1 text-2xl font-black text-slate-900">
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

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_170px_170px_190px_auto]">

                            <div className="relative">

                                <Search
                                    size={16}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Search name, ID, phone, aadhaar..."
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />

                            </div>


                            <select
                                value={selectedZoneId}
                                onChange={(e) =>
                                    handleZoneChange(
                                        e.target.value
                                    )
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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

                            <select
                                value={selectedEmploymentType}
                                onChange={(e) =>
                                    setSelectedEmploymentType(
                                        e.target.value
                                    )
                                }
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">
                                    All Appointment Types
                                </option>
                                <option value="Permanent">
                                    Permanent / स्थायी
                                </option>
                                <option value="Regularized">
                                    Regularized / विनियमित
                                </option>
                                <option value="Temporary">
                                    Temporary / अस्थायी
                                </option>
                                <option value="Outsource">
                                    Outsource / आउटसोर्स
                                </option>
                            </select>


                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={loadData}
                                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                                >
                                    <RefreshCw size={14} />
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
                                        "Aadhaar Number": emp.aadhaar || "—",
                                        "Appointment Type": `${getEmploymentTypeDisplay(emp.employmentType).labelEn} / ${getEmploymentTypeDisplay(emp.employmentType).labelHi}`,
                                        "Zone": (emp.zoneIds || []).map((id) => zoneNameMap[id]).filter(Boolean).join(", ") || "—",
                                        "Ward": (emp.wardIds || []).map((id) => wardNameMap[id]).filter(Boolean).join(", ") || "—",
                                        "Registered On": emp.createdAt ? new Date(emp.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
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
                                        "Aadhaar Number": emp.aadhaar || "—",
                                        "Appointment Type": `${getEmploymentTypeDisplay(emp.employmentType).labelEn} / ${getEmploymentTypeDisplay(emp.employmentType).labelHi}`,
                                        "Zone": (emp.zoneIds || []).map((id) => zoneNameMap[id]).filter(Boolean).join(", ") || "—",
                                        "Ward": (emp.wardIds || []).map((id) => wardNameMap[id]).filter(Boolean).join(", ") || "—",
                                        "Registered On": emp.createdAt ? new Date(emp.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
                                    }))}
                                />
                            </div>

                        </div>


                        <div className="overflow-x-auto">

                            <table className="min-w-full">

                                <thead className="bg-slate-50">

                                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                                        {!isHmsAdmin && (
                                            <th className="w-10 px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={toggleSelectAll}
                                                    className="inline-flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
                                                    title={isAllPageSelected ? "Deselect page" : "Select all on page"}
                                                >
                                                    {isAllPageSelected ? (
                                                        <CheckSquare size={16} className="text-blue-600" />
                                                    ) : (
                                                        <Square size={16} />
                                                    )}
                                                </button>
                                            </th>
                                        )}

                                        <th className="px-4 py-3">
                                            S.No
                                        </th>

                                        <th className="px-4 py-3">
                                            Employee Name
                                        </th>

                                        <th className="px-4 py-3">
                                            Employee ID
                                        </th>

                                        <th className="px-4 py-3">
                                            Mobile Number
                                        </th>

                                        <th className="px-4 py-3">
                                            Aadhaar Number
                                        </th>

                                        <th className="px-4 py-3">
                                            Appointment Type
                                        </th>

                                        <th className="px-4 py-3">
                                            Zone
                                        </th>

                                        <th className="px-4 py-3">
                                            Ward
                                        </th>

                                        <th className="px-4 py-3">
                                            Registered On
                                        </th>

                                        {!isHmsAdmin && (
                                            <th className="px-4 py-3 text-right">
                                                Actions
                                            </th>
                                        )}

                                    </tr>

                                </thead>


                                <tbody className="divide-y divide-slate-100">

                                    {loading ? (

                                        <tr>
                                            <td
                                                colSpan={isHmsAdmin ? 9 : 11}
                                                className="px-5 py-14 text-center text-sm text-slate-500"
                                            >
                                                Loading employees...
                                            </td>
                                        </tr>

                                    ) : filteredEmployees.length === 0 ? (

                                        <tr>
                                            <td
                                                colSpan={isHmsAdmin ? 9 : 11}
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

                                                    {(searchQuery || selectedZoneId || selectedWardId) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSearchQuery("");
                                                                setSelectedZoneId("");
                                                                setSelectedWardId("");
                                                            }}
                                                            className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                                        >
                                                            Reset Filters
                                                        </button>
                                                    )}

                                                </div>

                                            </td>
                                        </tr>

                                    ) : (

                                        paginatedEmployees.map(
                                            (employee, empIdx) => {

                                                const globalIndex = (currentPage - 1) * pageSize + empIdx + 1;
                                                const isSelected = selectedEmployeeIds.includes(employee.id);

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

                                                const formattedAadhaar = employee.aadhaar
                                                    ? employee.aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')
                                                    : "—";

                                                const empType = employee.employmentType || "Permanent";
                                                const empTypeLower = empType.toLowerCase();

                                                return (
                                                    <tr
                                                        key={employee.id}
                                                        className={`transition hover:bg-slate-50/80 ${
                                                            isSelected ? "bg-blue-50/40" : ""
                                                        }`}
                                                    >

                                                        {!isHmsAdmin && (
                                                            <td className="w-10 px-4 py-4 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleSelectRow(employee.id)}
                                                                    className="inline-flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
                                                                >
                                                                    {isSelected ? (
                                                                        <CheckSquare size={16} className="text-blue-600" />
                                                                    ) : (
                                                                        <Square size={16} />
                                                                    )}
                                                                </button>
                                                            </td>
                                                        )}

                                                        <td className="px-4 py-4 text-sm font-semibold text-slate-400">
                                                            {globalIndex}
                                                        </td>

                                                        <td className="px-4 py-4 font-semibold text-slate-900">
                                                            {employee.name}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm font-semibold text-blue-600">
                                                            {employee.employeeId || "—"}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm font-medium text-slate-700">
                                                            {employee.phone ||
                                                                "Not added"}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm font-mono text-slate-700">
                                                            {formattedAadhaar}
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            {(() => {
                                                                const typeInfo = getEmploymentTypeDisplay(employee.employmentType);
                                                                return (
                                                                    <span
                                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                                            typeInfo.key === "Permanent"
                                                                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                                                : typeInfo.key === "Regularized"
                                                                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                                                                : typeInfo.key === "Temporary"
                                                                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                                : "bg-teal-50 text-teal-700 border border-teal-200"
                                                                        }`}
                                                                    >
                                                                        <span>{typeInfo.labelEn}</span>
                                                                        <span className="text-[11px] opacity-75 font-normal">/ {typeInfo.labelHi}</span>
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>

                                                        <td className="px-4 py-4">

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

                                                        <td className="px-4 py-4">

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

                                                        <td className="px-4 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                                            {employee.createdAt
                                                                ? new Date(employee.createdAt).toLocaleDateString("en-IN", {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric"
                                                                })
                                                                : "—"}
                                                        </td>

                                                        {!isHmsAdmin && (
                                                            <td className="px-4 py-4 text-right">
                                                                <div className="relative inline-block text-left employee-action-menu-container">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenActionMenuId(
                                                                                openActionMenuId === employee.id ? null : employee.id
                                                                            );
                                                                        }}
                                                                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition cursor-pointer ${
                                                                            openActionMenuId === employee.id
                                                                                ? "border-blue-300 bg-blue-50 text-blue-700 shadow-xs"
                                                                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                                                        }`}
                                                                        title="Actions"
                                                                    >
                                                                        <MoreVertical size={16} />
                                                                    </button>

                                                                    {openActionMenuId === employee.id && (
                                                                        <div className="absolute right-0 top-full mt-1 z-[60] w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setOpenActionMenuId(null);
                                                                                    openEditModal(employee);
                                                                                }}
                                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                                                                            >
                                                                                <Edit2 size={13} className="text-blue-600" />
                                                                                <span>Edit</span>
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setOpenActionMenuId(null);
                                                                                    setDeleteTarget({ id: employee.id, name: employee.name });
                                                                                }}
                                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                                                                            >
                                                                                <Trash2 size={13} className="text-red-600" />
                                                                                <span>Delete</span>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )}

                                                    </tr>
                                                );
                                            }
                                        )

                                    )}

                                </tbody>

                            </table>

                        </div>

                        {/* PAGINATION FOOTER */}
                        {filteredEmployees.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-slate-500">
                                        Showing{" "}
                                        <strong className="font-bold text-slate-800">
                                            {(currentPage - 1) * pageSize + 1}
                                        </strong>{" "}
                                        to{" "}
                                        <strong className="font-bold text-slate-800">
                                            {Math.min(currentPage * pageSize, filteredEmployees.length)}
                                        </strong>{" "}
                                        of{" "}
                                        <strong className="font-bold text-slate-800">
                                            {filteredEmployees.length}
                                        </strong>{" "}
                                        employees
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-slate-400">Per page:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                                        >
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter((p) => {
                                            if (totalPages <= 5) return true;
                                            if (p === 1 || p === totalPages) return true;
                                            return Math.abs(p - currentPage) <= 1;
                                        })
                                        .map((p, idx, arr) => {
                                            const prev = arr[idx - 1];
                                            const showEllipsis = prev && p - prev > 1;

                                            return (
                                                <React.Fragment key={p}>
                                                    {showEllipsis && (
                                                        <span className="px-1 text-xs text-slate-400">...</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentPage(p)}
                                                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition cursor-pointer ${
                                                            p === currentPage
                                                                ? "bg-blue-600 text-white shadow-xs"
                                                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                        }`}
                                                    >
                                                        {p}
                                                    </button>
                                                </React.Fragment>
                                            );
                                        })}

                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage >= totalPages}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>

                </div>

            </div>

            {/* =========================================================
                EDIT EMPLOYEE MODAL
            ========================================================= */}
            {editingEmployee && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px]"
                    onClick={closeEditModal}
                >
                    <form
                        onSubmit={handleEditSaveRequest}
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
                                    Edit Employee
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Update employee details, type, zone, and ward assignment.
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={savingEdit}
                                onClick={closeEditModal}
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* FORM */}
                        <div className="space-y-4 px-6 py-5 max-h-[calc(100vh-200px)] overflow-y-auto">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Employee Name *
                                </label>
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter employee name"
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Employee ID <span className="text-xs font-normal text-slate-400">(Optional)</span>
                                </label>
                                <input
                                    value={editEmployeeCodeId}
                                    onChange={(e) => setEditEmployeeCodeId(e.target.value)}
                                    placeholder="Enter Employee ID (e.g. EMP101)"
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Mobile Number <span className="text-xs font-normal text-slate-400">(Optional)</span>
                                </label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    value={editPhone}
                                    maxLength={10}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                        setEditPhone(value);
                                    }}
                                    placeholder="Enter 10 digit mobile number"
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Aadhaar Number <span className="text-xs font-normal text-slate-400">(12 Digits - Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={editAadhaar}
                                    maxLength={12}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                                        setEditAadhaar(value);
                                    }}
                                    placeholder="Enter 12 digit Aadhaar number"
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Appointment Type
                                </label>
                                <select
                                    value={editEmploymentType}
                                    onChange={(e) => setEditEmploymentType(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="Permanent">Permanent / स्थायी</option>
                                    <option value="Regularized">Regularized / विनियमित</option>
                                    <option value="Temporary">Temporary / अस्थायी</option>
                                    <option value="Outsource">Outsource / आउटसोर्स</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                        Zone *
                                    </label>
                                    <select
                                        value={editZoneId}
                                        onChange={(e) => {
                                            setEditZoneId(e.target.value);
                                            setEditWardId("");
                                        }}
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                                        required
                                    >
                                        <option value="">Select Zone</option>
                                        {zones.map((zone) => (
                                            <option key={zone.id} value={zone.id}>
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
                                        value={editWardId}
                                        disabled={!editZoneId}
                                        onChange={(e) => setEditWardId(e.target.value)}
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none disabled:bg-slate-100"
                                        required
                                    >
                                        <option value="">
                                            {editZoneId ? "Select Ward" : "Select Zone first"}
                                        </option>
                                        {editRegistrationWards.map((ward) => (
                                            <option key={ward.id} value={ward.id}>
                                                {ward.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {editError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    {editError}
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
                            <button
                                type="button"
                                disabled={savingEdit}
                                onClick={closeEditModal}
                                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={savingEdit}
                                className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white disabled:bg-blue-300"
                            >
                                <Edit2 size={16} />
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* =========================================================
                EDIT CONFIRMATION MODAL
            ========================================================= */}
            {showEditConfirm && (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
                    onClick={() => !savingEdit && setShowEditConfirm(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Edit2 size={24} />
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">
                            Confirm Employee Update
                        </h3>

                        <p className="mt-2 text-sm text-slate-600">
                            Are you sure you want to save changes for employee <strong className="text-slate-900">"{editName}"</strong>?
                        </p>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={savingEdit}
                                onClick={() => setShowEditConfirm(false)}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={savingEdit}
                                onClick={handleConfirmEditSave}
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {savingEdit ? "Updating..." : "Yes, Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================
                SINGLE DELETE CONFIRMATION MODAL
            ========================================================= */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
                    onClick={() => !deletingSingle && setDeleteTarget(null)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <AlertTriangle size={24} />
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">
                            Delete Employee
                        </h3>

                        <p className="mt-2 text-sm text-slate-600">
                            Are you sure you want to delete employee <strong className="text-slate-900">"{deleteTarget.name}"</strong>? This action cannot be undone.
                        </p>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={deletingSingle}
                                onClick={() => setDeleteTarget(null)}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={deletingSingle}
                                onClick={handleConfirmDeleteSingle}
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deletingSingle ? "Deleting..." : "Yes, Delete Employee"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================
                BULK DELETE CONFIRMATION MODAL
            ========================================================= */}
            {showBulkDeleteConfirm && (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
                    onClick={() => !deletingBulk && setShowBulkDeleteConfirm(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <AlertTriangle size={24} />
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">
                            Delete Selected Employees
                        </h3>

                        <p className="mt-2 text-sm text-slate-600">
                            Are you sure you want to delete <strong className="text-red-600">{selectedEmployeeIds.length}</strong> selected employee(s)? This action cannot be undone.
                        </p>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={deletingBulk}
                                onClick={() => setShowBulkDeleteConfirm(false)}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={deletingBulk}
                                onClick={handleConfirmBulkDelete}
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deletingBulk ? "Deleting..." : `Yes, Delete (${selectedEmployeeIds.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================
                REGISTER EMPLOYEE MODAL
            ========================================================= */}
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
                        <div className="space-y-4 px-6 py-5 max-h-[calc(100vh-200px)] overflow-y-auto">

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
                                    required
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
                                    Mobile Number <span className="text-xs font-normal text-slate-400">(Optional)</span>
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

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Aadhaar Number <span className="text-xs font-normal text-slate-400">(12 Digits - Optional)</span>
                                </label>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={employeeAadhaar}
                                    maxLength={12}
                                    onChange={(e) => {
                                        const value =
                                            e.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 12);

                                        setEmployeeAadhaar(value);
                                    }}
                                    placeholder="Enter 12 digit Aadhaar number"
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Appointment Type
                                </label>

                                <select
                                    value={employeeEmploymentType}
                                    onChange={(e) =>
                                        setEmployeeEmploymentType(e.target.value)
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="Permanent">Permanent / स्थायी</option>
                                    <option value="Regularized">Regularized / विनियमित</option>
                                    <option value="Temporary">Temporary / अस्थायी</option>
                                    <option value="Outsource">Outsource / आउटसोर्स</option>
                                </select>
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
                                        required
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
                                        required
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

            {/* =========================================================
                IMPORT EMPLOYEES MODAL
            ========================================================= */}
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
                        className="max-h-[calc(100vh-32px)] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
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
                                        S.No | Employee ID | Employee Name | Mobile Number | Aadhaar Number | Appointment Type | Zone Name | Ward Name
                                    </p>

                                </div>


                                <button
                                    type="button"
                                    onClick={
                                        downloadEmployeeTemplate
                                    }
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 cursor-pointer"
                                >
                                    <Download size={16} />
                                    Download Template
                                </button>

                            </div>


                            {/* UPLOAD */}

                            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center">

                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
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
                                        "Select Employee Excel / CSV File"}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                    .xlsx, .xls, or .csv
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
                                                        Aadhaar
                                                    </th>

                                                    <th className="px-3 py-3">
                                                        Appointment Type
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

                                                            <td className="px-3 py-3 font-mono">
                                                                {row.aadhaarNumber ||
                                                                    "—"}
                                                            </td>

                                                            <td className="px-3 py-3">
                                                                {(() => {
                                                                    const rowTypeInfo = getEmploymentTypeDisplay(row.employmentType);
                                                                    return (
                                                                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                                                            {rowTypeInfo.labelEn} / {rowTypeInfo.labelHi}
                                                                        </span>
                                                                    );
                                                                })()}
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
                                                                        row.status === "READY"
                                                                            ? "Ready"
                                                                            : row.status === "ALREADY_EXISTS"
                                                                            ? "Already Exists"
                                                                            : row.message
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

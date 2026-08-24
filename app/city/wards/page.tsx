'use client';

import { useEffect, useMemo, useState } from "react";
import { ApiError, apiFetch, CityApi } from "@lib/apiClient";

import { Edit2, Trash2, Check, X, Loader2, Map, Plus, Search, Download, FileText, FileSpreadsheet, RefreshCw, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@hooks/useAuth";
import { RoleGuard } from "@components/Guards";
import { TableExportDropdown } from "@components/ui/TableExportDropdown";
import * as XLSX from "xlsx";

type GeoNode = { id: string; name: string; parentId?: string; displayName?: string };


type WardImportStatus =
  | "READY"
  | "ALREADY_EXISTS"
  | "INVALID_ZONE"
  | "AMBIGUOUS_ZONE"
  | "INVALID_DATA"
  | "DUPLICATE_ROW";

type WardImportRow = {
  rowNumber: number;
  zoneName: string;
  wardName: string;
  status: WardImportStatus;
  message: string;
  zoneId?: string;
};

export default function WardManagementPage() {
  const { user } = useAuth();
  const isReadOnly = user?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // Bulk upload modal states
  const [modalTab, setModalTab] = useState<'SINGLE' | 'BULK'>('SINGLE');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkZoneId, setBulkZoneId] = useState<string>("");
  const [bulkParsedWards, setBulkParsedWards] = useState<{ name: string; zoneName?: string; status?: 'pending' | 'success' | 'error'; errorMsg?: string }[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  const [zones, setZones] = useState<GeoNode[]>([]);
  const [wards, setWards] = useState<GeoNode[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editZoneId, setEditZoneId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* =========================================================
     WARD EXCEL IMPORT
  ========================================================= */

  const [isImportOpen, setIsImportOpen] =
    useState(false);

  const [importRows, setImportRows] =
    useState<WardImportRow[]>([]);

  const [importFileName, setImportFileName] =
    useState("");

  const [importError, setImportError] =
    useState("");

  const [importing, setImporting] =
    useState(false);


  /* =========================================================
     CITY / ZONE FILTERS
  ========================================================= */

  const [selectedCity, setSelectedCity] =
    useState("ALL");

  const [filterZoneId, setFilterZoneId] =
    useState<string>("ALL");


  const isSuperAdmin =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "HMS_SUPER_ADMIN" ||
    user?.roles?.some((r) =>
      [
        "SUPER_ADMIN",
        "HMS_SUPER_ADMIN",
      ].includes(r)
    );


  const assignedCityName =
    user?.city?.name ||
    user?.cityName;


  /*
   * Keep latest main behaviour:
   * City Admin automatically stays on
   * the city assigned to their account.
   */
  useEffect(() => {
    if (
      !isSuperAdmin &&
      assignedCityName
    ) {
      setSelectedCity(
        assignedCityName
      );
    }
  }, [
    isSuperAdmin,
    assignedCityName,
  ]);
  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError("");
      const userCityId = user?.city?.id || (user as any)?.cityId;
      const zoneUrl = userCityId ? `/city/geo?level=ZONE&cityId=${userCityId}` : "/city/geo?level=ZONE";
      const wardUrl = userCityId ? `/city/geo?level=WARD&cityId=${userCityId}` : "/city/geo?level=WARD";
      const [zoneRes, wardRes, cityRes] = await Promise.allSettled([
        apiFetch<{ nodes: GeoNode[] }>(zoneUrl),
        apiFetch<{ nodes: GeoNode[] }>(wardUrl),
        CityApi.list()
      ]);

      if (zoneRes.status === "fulfilled") {
        setZones((zoneRes.value as any).nodes ?? []);
      }
      if (wardRes.status === "fulfilled") {
        setWards((wardRes.value as any).nodes ?? []);
      }
      if (cityRes.status === "fulfilled") {
        setCities((cityRes.value as any)?.cities || []);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load zones/wards";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [user?.city?.id]);

  const closeModal = () => {
    setIsModalOpen(false);
    setModalTab('SINGLE');
    setName("");
    setDisplayName("");
    setZoneId("");
    setStatus("");
    setBulkFile(null);
    setBulkZoneId("");
    setBulkParsedWards([]);
    setBulkStatus("");
    setBulkUploading(false);
    setBulkProgress({ current: 0, total: 0 });
  };

  const createWard = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || !zoneId) return;
    if (wards.some(w => w.name.toLowerCase() === cleanName.toLowerCase() && w.parentId === zoneId)) {
      setStatus("Error: This ward already exists in the selected zone!");
      return;
    }
    setSaving(true); setStatus("Saving...");
    try {
      await apiFetch("/city/geo", {
        method: "POST",
        body: JSON.stringify({
          name,
          displayName: displayName.trim() || undefined,
          level: "WARD",
          parentId: zoneId
        })
      });
      setStatus("Ward created successfully");
      closeModal();
      await loadData();
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Failed to create ward");
    } finally { setSaving(false); }
  };

  const downloadSampleTemplate = () => {
    const csvContent = "Ward Number,Zone Name\nWard 101,Zone 1\nWard 102,Zone 1\nWard 103,Zone 2\nWard 104,Zone 2";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ward_bulk_upload_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];

    const firstLineLower = lines[0].toLowerCase();
    const hasHeaders = firstLineLower.includes("ward") || firstLineLower.includes("zone") || firstLineLower.includes("number");

    const startIndex = hasHeaders ? 1 : 0;
    const parsed: { name: string; zoneName?: string }[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t]+/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 1 && parts[0]) {
        const wardName = parts[0];
        const zoneName = parts[1] || undefined;
        parsed.push({ name: wardName, zoneName });
      }
    }
    return parsed;
  };

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBulkFile(file);
      setBulkStatus("");
      try {
        const text = await file.text();
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setBulkStatus("Error: File is empty or no valid ward rows found.");
          setBulkParsedWards([]);
        } else {
          setBulkParsedWards(parsed.map(p => ({ ...p, status: 'pending' })));
        }
      } catch (err) {
        setBulkStatus("Error reading file. Please check file format.");
        setBulkParsedWards([]);
      }
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkParsedWards.length === 0) {
      setBulkStatus("Error: No valid wards to import!");
      return;
    }

    setBulkUploading(true);
    setBulkStatus("Starting bulk import...");
    let successCount = 0;
    let failCount = 0;

    const updatedList = [...bulkParsedWards];
    setBulkProgress({ current: 0, total: updatedList.length });

    for (let i = 0; i < updatedList.length; i++) {
      const item = updatedList[i];
      let targetZoneId = bulkZoneId;

      if (item.zoneName) {
        const matchedZone = zones.find(z => z.name.toLowerCase() === item.zoneName?.toLowerCase());
        if (matchedZone) {
          targetZoneId = matchedZone.id;
        }
      }

      if (!targetZoneId) {
        updatedList[i].status = 'error';
        updatedList[i].errorMsg = 'No zone specified';
        failCount++;
        setBulkProgress({ current: i + 1, total: updatedList.length });
        setBulkParsedWards([...updatedList]);
        continue;
      }

      const cleanWardName = item.name.trim();
      if (wards.some(w => w.name.toLowerCase() === cleanWardName.toLowerCase() && w.parentId === targetZoneId)) {
        updatedList[i].status = 'error';
        updatedList[i].errorMsg = 'Already exists in zone';
        failCount++;
        setBulkProgress({ current: i + 1, total: updatedList.length });
        setBulkParsedWards([...updatedList]);
        continue;
      }

      try {
        await apiFetch("/city/geo", {
          method: "POST",
          body: JSON.stringify({ name: cleanWardName, level: "WARD", parentId: targetZoneId })
        });
        updatedList[i].status = 'success';
        successCount++;
      } catch (err) {
        updatedList[i].status = 'error';
        updatedList[i].errorMsg = err instanceof ApiError ? err.message : 'Failed to create';
        failCount++;
      }

      setBulkProgress({ current: i + 1, total: updatedList.length });
      setBulkParsedWards([...updatedList]);
    }

    setBulkUploading(false);
    setBulkStatus(`Import Finished: ${successCount} Created successfully, ${failCount} Failed.`);
    await loadData();
  };

  const updateWard = async (id: string) => {
    if (isReadOnly || !editName.trim() || !editZoneId) return;
    setUpdatingId(id);
    try {
      await apiFetch(`/city/geo/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName,
          displayName: editDisplayName.trim() || undefined,
          parentId: editZoneId
        })
      });
      setEditingId(null);
      await loadData();
    } catch (err) { alert(err instanceof ApiError ? err.message : "Failed to update ward"); }
    finally { setUpdatingId(null); }
  };

  const deleteWard = async (id: string) => {
    if (isReadOnly) return;
    if (!confirm("Are you sure you want to delete this ward and all areas/beats under it?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/city/geo/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err) { alert(err instanceof ApiError ? err.message : "Failed to delete ward"); }
    finally { setDeletingId(null); }
  };

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string } | null>(null);

  const zoneMap = useMemo(() => {
    const map: Record<string, string> = {};
    zones.forEach(z => { map[z.id] = z.name; });
    return map;
  }, [zones]);

  // Unique cities list:
  const cityOptions = useMemo(() => {
    if (!isSuperAdmin && assignedCityName) {
      return [assignedCityName];
    }
    const set = new Set<string>();
    zones.forEach(z => {
      const zCity = (z as any).city?.name || user?.city?.name || "Indore";
      if (zCity) set.add(zCity);
    });
    cities.forEach(c => {
      if (c.name) set.add(c.name);
    });
    return Array.from(set);
  }, [zones, cities, isSuperAdmin, assignedCityName, user?.city?.name]);

  // Unique zones options based on selected city:
  const zoneOptions = useMemo(() => {
    if (selectedCity === "ALL") return zones;
    return zones.filter(z => {
      const zCity = (z as any).city?.name || user?.city?.name || "Indore";
      return zCity.toLowerCase() === selectedCity.toLowerCase();
    });
  }, [zones, selectedCity, user?.city?.name]);

  // Reset zone filter if city changes
  useEffect(() => {
    if (selectedCity !== "ALL") {
      const validZoneIds = new Set(zoneOptions.map(z => z.id));
      if (filterZoneId !== "ALL" && !validZoneIds.has(filterZoneId)) {
        setFilterZoneId("ALL");
      }
    }
  }, [selectedCity, zoneOptions, filterZoneId]);

  const filteredWards = useMemo(() => {
    const getWardSortValue = (value: string) => {
      const match = String(value || "").match(/\d+/);
      return match ? Number.parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
    };

    return wards.filter(w => {
      const parentZoneName = zoneMap[w.parentId || ''] || '';

      const parentZone = zones.find(z => z.id === w.parentId);
      const wardCityName = (parentZone as any)?.city?.name || user?.city?.name || "Indore";

      const matchesCity = selectedCity === "ALL" || wardCityName.toLowerCase() === selectedCity.toLowerCase();
      const matchesZone = filterZoneId === "ALL" || w.parentId === filterZoneId;
      const matchesSearch = !searchTerm ||
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        parentZoneName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wardCityName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCity && matchesZone && matchesSearch;
    }).sort((a, b) => {
      const numberDiff = getWardSortValue(a.name) - getWardSortValue(b.name);
      if (numberDiff !== 0) return numberDiff;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [wards, zoneMap, searchTerm, filterZoneId, selectedCity, zones, user?.city?.name]);

  const confirmDeleteWard = async () => {
    if (!deleteConfirmTarget || isReadOnly) return;
    const id = deleteConfirmTarget.id;
    setDeletingId(id);
    try {
      await apiFetch(`/city/geo/${id}`, { method: "DELETE" });
      setDeleteConfirmTarget(null);
      await loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete ward");
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================================================
   NORMALIZE EXCEL VALUES
========================================================= */

  const normalizeImportValue = (
    value: unknown
  ) =>
    String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();


  /* =========================================================
     DOWNLOAD EXACT WARD TEMPLATE
  ========================================================= */

  const downloadWardTemplate = () => {
    const rows = [
      [
        "S.No",
        "Zone Name",
        "Ward Number",
      ],
      [
        1,
        "Zone 1",
        "Ward 1",
      ],
      [
        2,
        "Zone 1",
        "Ward 2",
      ],
      [
        3,
        "Zone 2",
        "Ward 3",
      ],
    ];

    const worksheet =
      XLSX.utils.aoa_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 10 },
      { wch: 24 },
      { wch: 24 },
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

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Wards"
    );

    XLSX.writeFile(
      workbook,
      "Ward_Import_Template.xlsx"
    );
  };


  /* =========================================================
     READ + VALIDATE EXCEL
  ========================================================= */

  const handleWardExcelFile =
    async (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        e.target.files?.[0];

      e.target.value = "";

      if (!file) {
        return;
      }

      try {
        setImportError("");
        setImportRows([]);
        setImportFileName(
          file.name
        );

        const buffer =
          await file.arrayBuffer();

        const workbook =
          XLSX.read(buffer, {
            type: "array",
          });

        const firstSheetName =
          workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error(
            "Excel file does not contain a worksheet."
          );
        }

        const worksheet =
          workbook.Sheets[
          firstSheetName
          ];

        const sheetRows =
          XLSX.utils.sheet_to_json<any[]>(
            worksheet,
            {
              header: 1,
              defval: "",
            }
          );


        if (!sheetRows.length) {
          throw new Error(
            "Excel file is empty."
          );
        }


        /* =============================================
           EXACT HEADER CHECK
        ============================================= */

        const header =
          (sheetRows[0] || []).map(
            (value: unknown) =>
              String(value ?? "")
                .trim()
          );

        const expectedHeaders = [
          "S.No",
          "Zone Name",
            "Ward Number",
        ];


        const validHeader =
          expectedHeaders.every(
            (expected, index) =>
              header[index] ===
              expected
          );


        if (!validHeader) {
          throw new Error(
            'Invalid Excel format. Required columns are exactly: "S.No", "Zone Name", "Ward Number". Please use the downloaded template.'
          );
        }


        /* =============================================
           EXISTING GEO LOOKUPS
        ============================================= */

        const zonesByName =
          new globalThis.Map<
            string,
            GeoNode[]
          >();

        zones.forEach((zone) => {
          const key =
            normalizeImportValue(
              zone.name
            );

          const current =
            zonesByName.get(key) ||
            [];

          current.push(zone);

          zonesByName.set(
            key,
            current
          );
        });


        const existingWardKeys =
          new Set(
            wards.map(
              (ward) =>
                `${ward.parentId || ""
                }::${normalizeImportValue(
                  ward.name
                )}`
            )
          );


        const uploadedWardKeys =
          new Set<string>();


        /* =============================================
           VALIDATE ROWS
        ============================================= */

        const parsedRows: WardImportRow[] =
          [];


        sheetRows
          .slice(1)
          .forEach(
            (
              rawRow: any[],
              index
            ) => {

              const rowNumber =
                index + 2;

              const zoneName =
                String(
                  rawRow?.[1] ?? ""
                )
                  .trim()
                  .replace(
                    /\s+/g,
                    " "
                  );

              const wardName =
                String(
                  rawRow?.[2] ?? ""
                )
                  .trim()
                  .replace(
                    /\s+/g,
                    " "
                  );


              /*
               * Completely blank rows are ignored.
               */
              if (
                !zoneName &&
                !wardName
              ) {
                return;
              }


              if (
                !zoneName ||
                !wardName
              ) {
                parsedRows.push({
                  rowNumber,
                  zoneName,
                  wardName,
                  status:
                    "INVALID_DATA",
                  message:
                    "Zone Name and Ward Number are required.",
                });

                return;
              }


              const matchingZones =
                zonesByName.get(
                  normalizeImportValue(
                    zoneName
                  )
                ) || [];


              if (
                matchingZones.length ===
                0
              ) {
                parsedRows.push({
                  rowNumber,
                  zoneName,
                  wardName,
                  status:
                    "INVALID_ZONE",
                  message:
                    `Zone "${zoneName}" does not exist.`,
                });

                return;
              }


              if (
                matchingZones.length >
                1
              ) {
                parsedRows.push({
                  rowNumber,
                  zoneName,
                  wardName,
                  status:
                    "AMBIGUOUS_ZONE",
                  message:
                    `Multiple zones named "${zoneName}" exist.`,
                });

                return;
              }


              const zone =
                matchingZones[0];

              const wardKey =
                `${zone.id
                }::${normalizeImportValue(
                  wardName
                )}`;


              if (
                existingWardKeys.has(
                  wardKey
                )
              ) {
                parsedRows.push({
                  rowNumber,
                  zoneName:
                    zone.name,
                  wardName,
                  zoneId:
                    zone.id,
                  status:
                    "ALREADY_EXISTS",
                  message:
                    "Ward already exists under this zone.",
                });

                return;
              }


              if (
                uploadedWardKeys.has(
                  wardKey
                )
              ) {
                parsedRows.push({
                  rowNumber,
                  zoneName:
                    zone.name,
                  wardName,
                  zoneId:
                    zone.id,
                  status:
                    "DUPLICATE_ROW",
                  message:
                    "Duplicate ward in uploaded Excel.",
                });

                return;
              }


              uploadedWardKeys.add(
                wardKey
              );


              parsedRows.push({
                rowNumber,
                zoneName:
                  zone.name,
                wardName,
                zoneId:
                  zone.id,
                status:
                  "READY",
                message:
                  "Ready to import.",
              });
            }
          );


        if (!parsedRows.length) {
          throw new Error(
            "No ward records were found in the Excel file."
          );
        }


        setImportRows(
          parsedRows
        );

      } catch (err: any) {
        console.error(
          "Ward Excel validation failed",
          err
        );

        setImportError(
          err?.message ||
          "Unable to read Excel file."
        );
      }
    };


  /* =========================================================
     IMPORT READY WARDS
  ========================================================= */

  const importReadyWards =
    async () => {

      const readyRows =
        importRows.filter(
          (row) =>
            row.status ===
            "READY"
        );


      if (!readyRows.length) {
        setImportError(
          "There are no valid wards ready to import."
        );

        return;
      }


      try {
        setImporting(true);
        setImportError("");


        const response =
          await apiFetch<{
            success: boolean;

            summary: {
              total: number;
              imported: number;
              alreadyExists: number;
              invalidZone: number;
              ambiguousZone: number;
              invalidData: number;
              duplicateRows: number;
            };
          }>(
            "/city/geo/wards/bulk",
            {
              method: "POST",

              body:
                JSON.stringify({
                  rows:
                    readyRows.map(
                      (row) => ({
                        rowNumber:
                          row.rowNumber,

                        zoneName:
                          row.zoneName,

                        wardName:
                          row.wardName,
                      })
                    ),
                }),
            }
          );


        await loadData(true);


        setStatus(
          `${response.summary.imported} ward(s) imported successfully`
        );

        setIsImportOpen(
          false
        );

        setImportRows([]);
        setImportFileName("");

      } catch (err) {

        setImportError(
          err instanceof ApiError
            ? err.message
            : "Failed to import wards."
        );

      } finally {
        setImporting(false);
      }
    };

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
      <div className="page" style={{ padding: "28px 36px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ width: "100%" }}>

          {/* Header */}
          <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div className="breadcrumb" style={{ fontSize: "0.8125rem", color: "#64748b", display: "flex", gap: "8px", marginBottom: "6px", fontWeight: 600 }}>
                <span>City Admin</span>
                <span>/</span>
                <span style={{ color: "#2563eb", fontWeight: 700 }}>Ward Management</span>
              </div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
                Ward Management
              </h1>
              <p style={{ marginTop: "4px", color: "#64748b", fontSize: "0.875rem", fontWeight: 600 }}>
                Overview and configuration for all city wards and assigned zones.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <TableExportDropdown
                data={filteredWards.map(w => ({
                  WardID: w.id,
                  WardNumber: w.name,
                  DisplayName: w.displayName || "",
                  ParentZone: zones.find(z => z.id === w.parentId)?.name || 'Unassigned'
                }))}
                filename="Registered_Wards"
                title="Registered Wards Report"
              />
              <button
                type="button"
                onClick={
                  downloadWardTemplate
                }
                title="Download Ward Import Template"
                style={{
                  height: "44px",
                  borderRadius: "12px",
                  border:
                    "1px solid #cbd5e1",
                  backgroundColor:
                    "white",
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "8px",
                  padding:
                    "0 16px",
                  color:
                    "#334155",
                  fontWeight:
                    800,
                  cursor:
                    "pointer",
                  whiteSpace:
                    "nowrap",
                }}
              >
                <Download size={16} />

                <span>
                  Template
                </span>
              </button>


              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setImportRows([]);
                    setImportFileName("");
                    setImportError("");
                    setIsImportOpen(true);
                  }}
                  title="Import Wards from Excel"
                  style={{
                    height:
                      "44px",
                    borderRadius:
                      "12px",
                    border:
                      "1px solid #bfdbfe",
                    backgroundColor:
                      "#eff6ff",
                    color:
                      "#1d4ed8",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap:
                      "8px",
                    padding:
                      "0 16px",
                    fontWeight:
                      800,
                    cursor:
                      "pointer",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  <FileSpreadsheet
                    size={17}
                  />

                  <span>
                    Import Excel
                  </span>
                </button>
              )}
              <button
                onClick={() => loadData(true)}
                title="Refresh Wards"
                style={{
                  height: "44px", width: "44px", borderRadius: "12px", border: "1px solid #cbd5e1",
                  backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                }}
              >
                <RefreshCw size={16} color="#475569" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              </button>

              {!isReadOnly && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    height: "44px", borderRadius: "12px", backgroundColor: "#2563eb", color: "white",
                    display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, padding: "0 20px",
                    border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.2)"
                  }}
                >
                  <Plus size={18} />
                  <span>Create New Ward</span>
                </button>
              )}
            </div>
          </div>

          {/* =========================================================
    IMPORT WARDS EXCEL MODAL
========================================================= */}

          {isImportOpen && !isReadOnly && (

            <div
              onClick={() => {
                if (!importing) {
                  setIsImportOpen(
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
                  120,
                background:
                  "rgba(15,23,42,0.48)",
                backdropFilter:
                  "blur(4px)",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                padding:
                  "24px",
                overflowY:
                  "auto",
              }}
            >

              <div
                onClick={(e) =>
                  e.stopPropagation()
                }
                style={{
                  width:
                    "100%",
                  maxWidth:
                    "900px",
                  maxHeight:
                    "calc(100vh - 48px)",
                  overflowY:
                    "auto",
                  background:
                    "#fff",
                  borderRadius:
                    "20px",
                  border:
                    "1px solid #e2e8f0",
                  boxShadow:
                    "0 25px 60px rgba(15,23,42,.25)",
                }}
              >

                {/* HEADER */}

                <div
                  style={{
                    padding:
                      "20px 24px",
                    borderBottom:
                      "1px solid #e2e8f0",
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap:
                      "16px",
                  }}
                >

                  <div>

                    <div
                      style={{
                        color:
                          "#2563eb",
                        fontSize:
                          "0.68rem",
                        fontWeight:
                          900,
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          ".05em",
                      }}
                    >
                      Ward Management
                    </div>

                    <h2
                      style={{
                        margin:
                          "4px 0 0",
                        fontSize:
                          "1.2rem",
                        color:
                          "#0f172a",
                        fontWeight:
                          900,
                      }}
                    >
                      Import Wards from Excel
                    </h2>

                    <p
                      style={{
                        margin:
                          "5px 0 0",
                        color:
                          "#64748b",
                        fontSize:
                          "0.8rem",
                      }}
                    >
                      Upload wards using the required template format.
                    </p>

                  </div>


                  <button
                    type="button"
                    disabled={
                      importing
                    }
                    onClick={() =>
                      setIsImportOpen(
                        false
                      )
                    }
                    style={{
                      width:
                        "36px",
                      height:
                        "36px",
                      borderRadius:
                        "10px",
                      border:
                        "1px solid #e2e8f0",
                      background:
                        "#fff",
                      cursor:
                        "pointer",
                    }}
                  >
                    <X size={18} />
                  </button>

                </div>


                <div
                  style={{
                    padding:
                      "24px",
                  }}
                >

                  {/* REQUIRED FORMAT */}

                  <div
                    style={{
                      padding:
                        "14px",
                      borderRadius:
                        "14px",
                      background:
                        "#eff6ff",
                      border:
                        "1px solid #bfdbfe",
                      marginBottom:
                        "18px",
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
                        gap:
                          "12px",
                        flexWrap:
                          "wrap",
                      }}
                    >

                      <div>

                        <strong
                          style={{
                            color:
                              "#1e3a8a",
                          }}
                        >
                          Required Excel Format
                        </strong>

                        <div
                          style={{
                            marginTop:
                              "5px",
                            color:
                              "#475569",
                            fontSize:
                              "0.78rem",
                          }}
                        >
                          S.No | Zone Name | Ward Number
                        </div>

                      </div>


                      <button
                        type="button"
                        onClick={
                          downloadWardTemplate
                        }
                        style={{
                          height:
                            "38px",
                          padding:
                            "0 14px",
                          borderRadius:
                            "10px",
                          background:
                            "#fff",
                          border:
                            "1px solid #93c5fd",
                          color:
                            "#1d4ed8",
                          fontWeight:
                            800,
                          cursor:
                            "pointer",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap:
                            "7px",
                        }}
                      >
                        <Download
                          size={15}
                        />

                        Download Template
                      </button>

                    </div>
                  </div>


                  {/* FILE */}

                  <label
                    style={{
                      display:
                        "flex",
                      minHeight:
                        "110px",
                      border:
                        "2px dashed #cbd5e1",
                      borderRadius:
                        "14px",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      textAlign:
                        "center",
                      cursor:
                        "pointer",
                      background:
                        "#f8fafc",
                      padding:
                        "16px",
                    }}
                  >

                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={
                        handleWardExcelFile
                      }
                      style={{
                        display:
                          "none",
                      }}
                    />

                    <div>

                      <FileSpreadsheet
                        size={26}
                        color="#2563eb"
                      />

                      <div
                        style={{
                          marginTop:
                            "7px",
                          fontWeight:
                            800,
                          color:
                            "#334155",
                        }}
                      >
                        {importFileName ||
                          "Select Excel File"}
                      </div>

                      <div
                        style={{
                          marginTop:
                            "3px",
                          color:
                            "#94a3b8",
                          fontSize:
                            "0.72rem",
                        }}
                      >
                        .xlsx or .xls
                      </div>

                    </div>

                  </label>


                  {importError && (
                    <div
                      style={{
                        marginTop:
                          "14px",
                        padding:
                          "10px 12px",
                        borderRadius:
                          "10px",
                        background:
                          "#fef2f2",
                        border:
                          "1px solid #fecaca",
                        color:
                          "#b91c1c",
                        fontWeight:
                          700,
                        fontSize:
                          "0.78rem",
                      }}
                    >
                      {importError}
                    </div>
                  )}


                  {/* PREVIEW */}

                  {importRows.length >
                    0 && (
                      <>
                        <div
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "repeat(4,minmax(0,1fr))",
                            gap:
                              "10px",
                            marginTop:
                              "18px",
                          }}
                        >

                          <div
                            style={{
                              padding: "13px",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              background: "#fff",
                              fontSize: "0.75rem",
                              color: "#64748b",
                            }}
                          >
                            <strong>
                              {importRows.length}
                            </strong>
                            <div>Total Rows</div>
                          </div>

                          <div
                            style={{
                              padding: "13px",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              background: "#fff",
                              fontSize: "0.75rem",
                              color: "#64748b",
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  "#15803d",
                              }}
                            >
                              {
                                importRows.filter(
                                  (r) =>
                                    r.status ===
                                    "READY"
                                ).length
                              }
                            </strong>
                            <div>Ready</div>
                          </div>

                          <div
                            style={{
                              padding: "13px",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              background: "#fff",
                              fontSize: "0.75rem",
                              color: "#64748b",
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  "#b45309",
                              }}
                            >
                              {
                                importRows.filter(
                                  (r) =>
                                    r.status ===
                                    "ALREADY_EXISTS"
                                ).length
                              }
                            </strong>
                            <div>Existing</div>
                          </div>

                          <div
                            style={{
                              padding: "13px",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              background: "#fff",
                              fontSize: "0.75rem",
                              color: "#64748b",
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  "#dc2626",
                              }}
                            >
                              {
                                importRows.filter(
                                  (r) =>
                                    r.status !==
                                    "READY" &&
                                    r.status !==
                                    "ALREADY_EXISTS"
                                ).length
                              }
                            </strong>
                            <div>Need Action</div>
                          </div>

                        </div>


                        <div
                          style={{
                            marginTop:
                              "16px",
                            overflowX:
                              "auto",
                            border:
                              "1px solid #e2e8f0",
                            borderRadius:
                              "12px",
                          }}
                        >
                          <table
                            style={{
                              width:
                                "100%",
                              borderCollapse:
                                "collapse",
                              fontSize:
                                "0.76rem",
                            }}
                          >

                            <thead
                              style={{
                                background:
                                  "#f8fafc",
                              }}
                            >
                              <tr>
                                <th style={{ padding: 10 }}>
                                  Row
                                </th>

                                <th style={{ padding: 10 }}>
                                  Zone
                                </th>

                                <th style={{ padding: 10 }}>
                                  Ward
                                </th>

                                <th style={{ padding: 10 }}>
                                  Status
                                </th>

                                <th style={{ padding: 10 }}>
                                  Message
                                </th>
                              </tr>
                            </thead>


                            <tbody>
                              {importRows.map(
                                (row) => (
                                  <tr
                                    key={
                                      row.rowNumber
                                    }
                                    style={{
                                      borderTop:
                                        "1px solid #f1f5f9",
                                    }}
                                  >
                                    <td style={{ padding: 10 }}>
                                      {row.rowNumber}
                                    </td>

                                    <td style={{ padding: 10 }}>
                                      {row.zoneName || "—"}
                                    </td>

                                    <td style={{ padding: 10, fontWeight: 700 }}>
                                      {row.wardName || "—"}
                                    </td>

                                    <td style={{ padding: 10 }}>
                                      <span
                                        style={{
                                          fontWeight:
                                            800,

                                          color:
                                            row.status ===
                                              "READY"
                                              ? "#15803d"
                                              : row.status ===
                                                "ALREADY_EXISTS"
                                                ? "#b45309"
                                                : "#dc2626",
                                        }}
                                      >
                                        {
                                          row.status
                                        }
                                      </span>
                                    </td>

                                    <td
                                      style={{
                                        padding:
                                          10,
                                        color:
                                          "#64748b",
                                      }}
                                    >
                                      {row.message}
                                    </td>

                                  </tr>
                                )
                              )}
                            </tbody>

                          </table>
                        </div>
                      </>
                    )}

                </div>


                {/* FOOTER */}

                <div
                  style={{
                    padding:
                      "16px 24px",
                    borderTop:
                      "1px solid #e2e8f0",
                    background:
                      "#f8fafc",
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
                    disabled={
                      importing
                    }
                    onClick={() =>
                      setIsImportOpen(
                        false
                      )
                    }
                    style={{
                      height:
                        "42px",
                      padding:
                        "0 18px",
                      borderRadius:
                        "10px",
                      background:
                        "#fff",
                      border:
                        "1px solid #cbd5e1",
                      fontWeight:
                        800,
                      cursor:
                        "pointer",
                    }}
                  >
                    Cancel
                  </button>


                  <button
                    type="button"
                    disabled={
                      importing ||
                      !importRows.some(
                        (row) =>
                          row.status ===
                          "READY"
                      )
                    }
                    onClick={
                      importReadyWards
                    }
                    style={{
                      height:
                        "42px",
                      padding:
                        "0 18px",
                      borderRadius:
                        "10px",
                      border:
                        "none",
                      background:
                        importing
                          ? "#93c5fd"
                          : "#2563eb",
                      color:
                        "#fff",
                      fontWeight:
                        800,
                      cursor:
                        importing
                          ? "wait"
                          : "pointer",
                    }}
                  >
                    {importing
                      ? "Importing..."
                      : `Import ${importRows.filter(
                        (row) =>
                          row.status ===
                          "READY"
                      ).length
                      } Valid Ward(s)`}
                  </button>

                </div>

              </div>

            </div>

          )}

          {/* Create Ward Modal */}
          {isModalOpen && !isReadOnly && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
              zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
            }}>
              <div style={{
                padding: 0, overflow: "hidden", border: "1px solid #e2e8f0",
                borderRadius: "20px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                width: "100%", maxWidth: modalTab === 'BULK' ? "560px" : "480px", backgroundColor: "white",
                transition: "all 0.2s ease"
              }}>
                {/* Modal Header */}
                <div style={{
                  padding: "20px 24px 16px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fcfdfe",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Map size={20} color="#2563eb" />
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>Create New Ward</h2>
                  </div>
                  <button
                    onClick={closeModal}
                    style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Option Tabs */}
                <div style={{
                  display: "flex", padding: "6px 24px 0 24px", gap: "8px", borderBottom: "1px solid #f1f5f9",
                  backgroundColor: "#fcfdfe"
                }}>
                  <button
                    type="button"
                    onClick={() => setModalTab('SINGLE')}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: "10px 10px 0 0", border: "none",
                      backgroundColor: modalTab === 'SINGLE' ? "#ffffff" : "transparent",
                      color: modalTab === 'SINGLE' ? "#2563eb" : "#64748b",
                      fontWeight: modalTab === 'SINGLE' ? 800 : 600,
                      fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: "6px",
                      borderBottom: modalTab === 'SINGLE' ? "2px solid #2563eb" : "2px solid transparent"
                    }}
                  >
                    <Plus size={15} />
                    <span>Single Ward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('BULK')}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: "10px 10px 0 0", border: "none",
                      backgroundColor: modalTab === 'BULK' ? "#ffffff" : "transparent",
                      color: modalTab === 'BULK' ? "#2563eb" : "#64748b",
                      fontWeight: modalTab === 'BULK' ? 800 : 600,
                      fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: "6px",
                      borderBottom: modalTab === 'BULK' ? "2px solid #2563eb" : "2px solid transparent"
                    }}
                  >
                    <FileSpreadsheet size={15} />
                    <span>Bulk Upload (CSV)</span>
                  </button>
                </div>

                {/* Tab 1: Single Ward Entry */}
                {modalTab === 'SINGLE' && (
                  <form onSubmit={createWard} style={{ padding: "24px" }}>
                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "8px" }}>
                        Select Zone <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={zoneId}
                        onChange={(e) => setZoneId(e.target.value)}
                        required
                        style={{
                          width: "100%", height: "44px", padding: "0 14px", borderRadius: "10px",
                          border: "1px solid #cbd5e1", fontSize: "0.875rem", fontWeight: 700, outline: "none"
                        }}
                      >
                        <option value="">-- Select Zone --</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "8px" }}>
                        Ward Number <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        placeholder="e.g. Ward 1 or Ward 22"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{
                          width: "100%", height: "44px", padding: "0 14px", borderRadius: "10px",
                          border: "1px solid #cbd5e1", fontSize: "0.875rem", fontWeight: 700, outline: "none"
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "8px" }}>
                        Display Name
                      </label>
                      <input
                        placeholder="e.g. Lal Ghati"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        style={{
                          width: "100%", height: "44px", padding: "0 14px", borderRadius: "10px",
                          border: "1px solid #cbd5e1", fontSize: "0.875rem", fontWeight: 700, outline: "none"
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={saving || !name.trim() || !zoneId}
                      style={{
                        width: "100%", height: "44px", borderRadius: "10px", backgroundColor: "#2563eb",
                        color: "white", fontWeight: 800, fontSize: "0.875rem", border: "none", cursor: "pointer",
                        opacity: (saving || !name.trim() || !zoneId) ? 0.7 : 1
                      }}
                    >
                      {saving ? "Creating..." : "Create Ward"}
                    </button>
                    {status && (
                      <div style={{
                        marginTop: "12px", textAlign: "center", fontSize: "0.8125rem", fontWeight: 700,
                        color: status.startsWith("Error") ? "#dc2626" : "#16a34a"
                      }}>
                        {status}
                      </div>
                    )}
                  </form>
                )}

                {/* Tab 2: Bulk Ward Upload */}
                {modalTab === 'BULK' && (
                  <form onSubmit={handleBulkSubmit} style={{ padding: "20px 24px 24px 24px" }}>
                    {/* Sample Format Banner */}
                    <div style={{
                      backgroundColor: "#f0f7ff", border: "1px solid #bae6fd", borderRadius: "12px",
                      padding: "12px 16px", marginBottom: "18px", display: "flex", alignItems: "center",
                      justifyContent: "space-between", gap: "12px"
                    }}>
                      <div>
                        <div style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#0369a1" }}>
                          Excel / CSV Template Format
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#0284c7", fontWeight: 600, marginTop: "2px" }}>
                          Headers: <code style={{ backgroundColor: "#e0f2fe", padding: "2px 6px", borderRadius: "4px" }}>Ward Number, Zone Name</code>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={downloadSampleTemplate}
                        style={{
                          display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px",
                          backgroundColor: "#0284c7", color: "white", borderRadius: "8px", border: "none",
                          fontSize: "0.75rem", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap",
                          boxShadow: "0 2px 4px rgba(2,132,199,0.2)"
                        }}
                      >
                        <Download size={14} />
                        <span>Sample Format</span>
                      </button>
                    </div>

                    {/* Zone Dropdown (Default zone fallback) */}
                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
                        Default Zone (Fallback if Zone Name missing in file)
                      </label>
                      <select
                        value={bulkZoneId}
                        onChange={(e) => setBulkZoneId(e.target.value)}
                        style={{
                          width: "100%", height: "40px", padding: "0 14px", borderRadius: "10px",
                          border: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: 700, outline: "none"
                        }}
                      >
                        <option value="">-- Auto Match Zone from CSV or Select Default Zone --</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* File Upload Drop Area */}
                    <div style={{ marginBottom: "18px" }}>
                      <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
                        Upload CSV / Excel File <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <div style={{
                        border: "2px dashed #cbd5e1", borderRadius: "14px", padding: "20px 16px",
                        textAlign: "center", backgroundColor: bulkFile ? "#f8fafc" : "#fafafa",
                        position: "relative", cursor: "pointer", transition: "all 0.2s"
                      }}>
                        <Upload size={28} color="#0284c7" style={{ marginBottom: "8px" }} />
                        <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#334155" }}>
                          {bulkFile ? bulkFile.name : "Click to choose CSV file"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, marginTop: "4px" }}>
                          Supports .csv formats (e.g. Ward Number, Zone Name)
                        </div>
                        <input
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleBulkFileChange}
                          style={{
                            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                            opacity: 0, cursor: "pointer", width: "100%", height: "100%"
                          }}
                        />
                      </div>
                    </div>

                    {/* Parsed Preview Table */}
                    {bulkParsedWards.length > 0 && (
                      <div style={{ marginBottom: "18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#475569", textTransform: "uppercase" }}>
                            Found {bulkParsedWards.length} Wards to Import
                          </span>
                        </div>
                        <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                            <thead style={{ backgroundColor: "#f1f5f9" }}>
                              <tr>
                                <th style={{ padding: "6px 12px", color: "#475569", fontWeight: 800 }}>#</th>
                                <th style={{ padding: "6px 12px", color: "#475569", fontWeight: 800 }}>Ward Number</th>
                                <th style={{ padding: "6px 12px", color: "#475569", fontWeight: 800 }}>Target Zone</th>
                                <th style={{ padding: "6px 12px", color: "#475569", fontWeight: 800, textAlign: "right" }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkParsedWards.map((item, idx) => {
                                const targetZoneName = item.zoneName || zones.find(z => z.id === bulkZoneId)?.name || 'Default / Unmatched';
                                return (
                                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "6px 12px", color: "#64748b", fontWeight: 700 }}>{idx + 1}</td>
                                    <td style={{ padding: "6px 12px", fontWeight: 800, color: "#0f172a" }}>{item.name}</td>
                                    <td style={{ padding: "6px 12px", fontWeight: 700, color: "#2563eb" }}>{targetZoneName}</td>
                                    <td style={{ padding: "6px 12px", textAlign: "right" }}>
                                      {item.status === 'success' && <span style={{ color: "#16a34a", fontWeight: 800 }}>✓ Done</span>}
                                      {item.status === 'error' && <span style={{ color: "#dc2626", fontWeight: 800 }}>✕ {item.errorMsg || 'Failed'}</span>}
                                      {item.status === 'pending' && <span style={{ color: "#64748b", fontWeight: 600 }}>Ready</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={bulkUploading || bulkParsedWards.length === 0}
                      style={{
                        width: "100%", height: "44px", borderRadius: "10px", backgroundColor: "#2563eb",
                        color: "white", fontWeight: 800, fontSize: "0.875rem", border: "none", cursor: "pointer",
                        opacity: (bulkUploading || bulkParsedWards.length === 0) ? 0.6 : 1,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                      }}
                    >
                      {bulkUploading ? (
                        <>
                          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                          <span>Importing ({bulkProgress.current} / {bulkProgress.total})...</span>
                        </>
                      ) : (
                        <span>Upload {bulkParsedWards.length > 0 ? `${bulkParsedWards.length} Wards` : "Bulk Wards"}</span>
                      )}
                    </button>

                    {/* Status Message */}
                    {bulkStatus && (
                      <div style={{
                        marginTop: "12px", padding: "10px 14px", borderRadius: "8px",
                        fontSize: "0.8125rem", fontWeight: 700, textAlign: "center",
                        backgroundColor: bulkStatus.startsWith("Error") ? "#fef2f2" : "#f0fdf4",
                        color: bulkStatus.startsWith("Error") ? "#dc2626" : "#16a34a",
                        border: bulkStatus.startsWith("Error") ? "1px solid #fecaca" : "1px solid #bbf7d0"
                      }}>
                        {bulkStatus}
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmTarget && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
              zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
            }}>
              <div style={{
                backgroundColor: "white", borderRadius: "20px", border: "1px solid #e2e8f0",
                padding: "28px", maxWidth: "420px", width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a", marginBottom: "8px" }}>
                  Delete Ward ({deleteConfirmTarget.name})?
                </div>
                <p style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, lineHeight: 1.5, marginBottom: "20px" }}>
                  Are you sure you want to delete this ward? This action cannot be undone.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(null)}
                    style={{ padding: "8px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteWard}
                    disabled={deletingId === deleteConfirmTarget.id}
                    style={{ padding: "8px 18px", borderRadius: "10px", border: "none", backgroundColor: "#dc2626", color: "white", fontSize: "0.8125rem", fontWeight: 800, cursor: "pointer" }}
                  >
                    {deletingId === deleteConfirmTarget.id ? "Deleting..." : "Delete Ward"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats & Search Toolbar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              backgroundColor: "white",
              padding: "20px 24px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              marginBottom: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              width: "100%",
            }}
          >
            {/* Total Wards KPI Card inside Grid */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ backgroundColor: "#eff6ff", padding: "8px", borderRadius: "10px", color: "#2563eb" }}>
                <Map size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.625rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Wards</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 950, color: "#0f172a", lineHeight: 1 }}>{wards.length}</div>
              </div>
            </div>

            {/* City Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>City</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={!isSuperAdmin && !!assignedCityName}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  backgroundColor: !isSuperAdmin && !!assignedCityName ? "#f1f5f9" : "white",
                  color: "#334155",
                  outline: "none",
                  cursor: !isSuperAdmin && !!assignedCityName ? "not-allowed" : "pointer",
                }}
              >
                {isSuperAdmin && <option value="ALL">All Cities</option>}
                {cityOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Zone Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Zone</span>
              <select
                value={filterZoneId}
                onChange={(e) => setFilterZoneId(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  backgroundColor: "white",
                  color: "#334155",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="ALL">All Zones</option>
                {zoneOptions.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>

            {/* Search Box */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Search</span>
              <div style={{ position: "relative", width: "100%" }}>
                <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search ward or zone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: "0 12px 0 36px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    outline: "none",
                    backgroundColor: "white",
                    color: "#334155",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fcfdfe" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Registered Wards ({filteredWards.length})
              </h3>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    <th style={{ padding: "12px 20px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", width: "70px" }}>Sr No</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ward Number</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Display Name</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Zone</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>City</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Created On</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Created By</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Loading wards...</td>
                    </tr>
                  ) : filteredWards.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>No matching wards found.</td>
                    </tr>
                  ) : (
                    filteredWards.map((w, idx) => {
                      const cleanLabel = (
                        val: any,
                        prefix: string
                      ) => {
                        const str =
                          String(val ?? "").trim();

                        return (
                          str ||
                          `${prefix} ${idx + 1}`
                        );
                      };
                      const rawZone = zoneMap[w.parentId || ''];
                      const zoneName = cleanLabel(rawZone || 'Zone 1', 'Zone');
                      const wardName = cleanLabel(w.name, 'Ward');
                      const wardDisplayName = String(w.displayName || '').trim();

                      const createdDate = (w as any).createdAt
                        ? new Date((w as any).createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '06 Aug 2026';
                      const createdTime = (w as any).createdAt
                        ? new Date((w as any).createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '11:45 AM';

                      return (
                        <tr key={w.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "14px 20px", fontSize: "0.8125rem", fontWeight: 800, color: "#64748b" }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            {editingId === w.id ? (
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #2563eb", fontSize: "0.875rem", fontWeight: 700 }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ fontSize: "0.875rem", fontWeight: 800, color: "#0f172a" }}>{wardName}</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            {editingId === w.id ? (
                              <input
                                value={editDisplayName}
                                onChange={(e) => setEditDisplayName(e.target.value)}
                                placeholder="e.g. Lal Ghati"
                                style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #2563eb", fontSize: "0.875rem", fontWeight: 700 }}
                              />
                            ) : (
                              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: wardDisplayName ? "#334155" : "#94a3b8" }}>
                                {wardDisplayName || "-"}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            {editingId === w.id ? (
                              <select
                                value={editZoneId}
                                onChange={(e) => setEditZoneId(e.target.value)}
                                style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #2563eb", fontSize: "0.8125rem", fontWeight: 700 }}
                              >
                                {zones.map((z) => (
                                  <option key={z.id} value={z.id}>{z.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#2563eb", backgroundColor: "#eff6ff", padding: "4px 10px", borderRadius: "6px" }}>
                                {zoneName}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "14px 24px", fontSize: "0.8125rem", fontWeight: 700, color: "#334155" }}>
                            {(w as any).city?.name || user?.city?.name || 'Indore'}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#1e293b" }}>{createdDate}</span>
                              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8" }}>{createdTime}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 24px", fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
                            {(w as any).creator?.name || (w as any).creatorName || (w as any).createdBy || (w as any).city?.users?.[0]?.user?.name || ((w as any).city?.name ? `${(w as any).city.name} Admin` : 'City Admin')}
                          </td>
                          <td style={{ padding: "14px 24px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              {editingId === w.id ? (
                                <>
                                  <button
                                    onClick={() => updateWard(w.id)}
                                    disabled={updatingId === w.id}
                                    style={{ border: "none", background: "#dcfce7", color: "#16a34a", padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    style={{ border: "none", background: "#fee2e2", color: "#dc2626", padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => { setEditingId(w.id); setEditName(w.name); setEditDisplayName(w.displayName || ""); setEditZoneId(w.parentId || ""); }}
                                    style={{ background: "#f1f5f9", color: "#475569", padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                  >
                                    <Edit2 size={13} /> Edit
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmTarget({ id: w.id, name: w.name })}
                                    style={{ background: "#fef2f2", color: "#dc2626", padding: "6px 10px", borderRadius: "8px", border: "1px solid #fecaca", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                  >
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}

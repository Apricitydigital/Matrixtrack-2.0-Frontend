import type { ZoneExportData, ZoneExportModuleRow, ZoneExportWard, ZoneExportZone } from "@lib/zoneExportApi";

type Rgb = [number, number, number];

const COLOR = {
  navy: [15, 42, 74] as Rgb,
  blue: [37, 99, 235] as Rgb,
  ink: [30, 41, 59] as Rgb,
  muted: [100, 116, 139] as Rgb,
  line: [226, 232, 240] as Rgb,
  zebra: [248, 250, 252] as Rgb,
  soft: [241, 245, 249] as Rgb,
  totalFill: [219, 234, 254] as Rgb,
  green: [5, 150, 105] as Rgb,
  greenSoft: [236, 253, 245] as Rgb,
  red: [220, 38, 38] as Rgb,
  redSoft: [254, 242, 242] as Rgb,
  amber: [217, 119, 6] as Rgb,
  violet: [124, 58, 237] as Rgb,
  white: [255, 255, 255] as Rgb,
};

const PAGE = { width: 297, height: 210, margin: 14, headerHeight: 20, contentTop: 28, footerTop: 200 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const num = (value: number) => Math.round(value).toLocaleString("en-IN");

const pct = (value: number | null) => (value === null ? "-" : `${value.toFixed(1)}%`);

function formatDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);

  return `${String(date).padStart(2, "0")} ${MONTHS[month - 1]} ${year}`;
}

function periodText(range: ZoneExportData["range"]) {
  return range.from === range.to
    ? formatDay(range.from)
    : `${formatDay(range.from)} - ${formatDay(range.to)} (${range.days} days)`;
}

function formatStamp(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${time}`;
}

const completionPct = (row: Pick<ZoneExportModuleRow, "target" | "completed">) =>
  row.target > 0 ? Math.min(100, (row.completed / row.target) * 100) : null;

function safeFileName(value: string) {
  return value.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "City";
}

const HEAD = [
  "Module",
  "Assigned Target",
  "Pending Target",
  "Completed",
  "SI Pending",
  "Cleaned",
  "Not Cleaned",
  "Action Required",
  "Action Taken",
  "Action Pending",
];

const moduleCells = (row: ZoneExportModuleRow) => [
  row.label,
  num(row.target),
  num(row.pending),
  num(row.completed),
  num(row.siPending),
  num(row.cleaned),
  num(row.notCleaned),
  num(row.actionRequired),
  num(row.actionTaken),
  num(row.actionPending),
];

/** Text colour of a numeric column in the module table (index 0 is the module name). */
const COLUMN_INK: Record<number, Rgb> = {
  3: COLOR.blue,
  4: COLOR.violet,
  5: COLOR.green,
  6: COLOR.red,
  7: COLOR.amber,
  8: COLOR.green,
  9: COLOR.red,
};

export async function downloadZonePdf(data: ZoneExportData) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageLabels = new Map<number, string>();

  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? PAGE.contentTop;

  const text = (value: string, x: number, y: number, size: number, color: Rgb, style: "normal" | "bold" = "normal", align: "left" | "right" | "center" = "left") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(value, x, y, { align });
  };

  const markPages = (from: number, label: string) => {
    for (let page = from; page <= doc.getNumberOfPages(); page += 1) pageLabels.set(page, label);
  };

  const kpiChips = (chips: Array<{ label: string; value: string; color: Rgb }>, y: number) => {
    const gap = 4;
    const width = (CONTENT_WIDTH - gap * (chips.length - 1)) / chips.length;

    chips.forEach((chip, index) => {
      const x = PAGE.margin + index * (width + gap);

      doc.setFillColor(...COLOR.soft);
      doc.setDrawColor(...COLOR.line);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, width, 15, 2, 2, "FD");
      doc.setFillColor(...chip.color);
      doc.roundedRect(x, y, 1.6, 15, 0.8, 0.8, "F");

      text(chip.label.toUpperCase(), x + 5, y + 5.2, 6.5, COLOR.muted, "bold");
      text(chip.value, x + 5, y + 12, 13, chip.color, "bold");
    });
  };

  const moduleTable = (rows: ZoneExportModuleRow[], total: ZoneExportModuleRow | null, startY: number) => {
    const body = rows.map(moduleCells);
    if (total) body.push(moduleCells(total));
    const totalIndex = total ? body.length - 1 : -1;

    autoTable(doc, {
      startY,
      head: [HEAD],
      body,
      margin: { left: PAGE.margin, right: PAGE.margin, top: PAGE.contentTop },
      theme: "plain",
      styles: { font: "helvetica", fontSize: 9, cellPadding: { top: 2.3, bottom: 2.3, left: 3, right: 3 }, textColor: COLOR.ink, lineColor: COLOR.line, lineWidth: 0 },
      headStyles: { fillColor: COLOR.navy, textColor: COLOR.white, fontStyle: "bold", fontSize: 8, halign: "center", valign: "middle" },
      columnStyles: {
        0: { cellWidth: 48, fontStyle: "bold", halign: "left" },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
        6: { halign: "center" },
        7: { halign: "center" },
        8: { halign: "center" },
        9: { halign: "center" },
      },
      didParseCell: (hook) => {
        if (hook.section !== "body") return;

        const isTotal = hook.row.index === totalIndex;

        if (isTotal) {
          hook.cell.styles.fillColor = COLOR.totalFill;
          hook.cell.styles.fontStyle = "bold";
          hook.cell.styles.textColor = COLOR.navy;
        } else if (hook.row.index % 2 === 1) {
          hook.cell.styles.fillColor = COLOR.zebra;
        }

        const ink = COLUMN_INK[hook.column.index];

        if (ink && !isTotal && hook.cell.raw !== "0") {
          hook.cell.styles.textColor = ink;
          hook.cell.styles.fontStyle = "bold";
        }
      },
      didDrawCell: (hook) => {
        // Hairline under every body row.
        if (hook.section === "body") {
          doc.setDrawColor(...COLOR.line);
          doc.setLineWidth(0.15);
          doc.line(hook.cell.x, hook.cell.y + hook.cell.height, hook.cell.x + hook.cell.width, hook.cell.y + hook.cell.height);
        }
      },
    });
  };

  const wardTable = (title: string, subtitle: string, tone: "good" | "bad", wards: ZoneExportWard[], x: number, y: number, width: number) => {
    const accent = tone === "good" ? COLOR.green : COLOR.red;
    const soft = tone === "good" ? COLOR.greenSoft : COLOR.redSoft;

    doc.setFillColor(...soft);
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, 11, 2, 2, "FD");
    doc.setFillColor(...accent);
    doc.roundedRect(x, y, 1.8, 11, 0.9, 0.9, "F");
    text(title, x + 6, y + 5, 10, accent, "bold");
    text(subtitle, x + 6, y + 9, 7, COLOR.muted);

    const pctHead = tone === "good" ? "Cleaned %" : "Not Cleaned %";
    const targetHead = tone === "good" ? "Target Done %" : "Target Missed %";

    autoTable(doc, {
      startY: y + 13,
      head: [["#", "Ward", pctHead, targetHead, "Score"]],
      body: wards.length
        ? wards.map((ward, index) => [
            String(index + 1),
            ward.wardName,
            pct(tone === "good" ? ward.cleanedPct : ward.notCleanedPct),
            pct(ward.targetPct === null ? null : tone === "good" ? ward.targetPct : 100 - ward.targetPct),
            ward.score.toFixed(1),
          ])
        : [["", "Not enough ward data in this period", "", "", ""]],
      margin: { left: x, right: PAGE.width - x - width },
      tableWidth: width,
      theme: "plain",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: { top: 2.1, bottom: 2.1, left: 2.5, right: 2.5 }, textColor: COLOR.ink },
      headStyles: { fillColor: accent, textColor: COLOR.white, fontStyle: "bold", fontSize: 7.5, halign: "center" },
      columnStyles: {
        0: { cellWidth: 9, halign: "center", fontStyle: "bold", textColor: accent },
        1: { halign: "left" },
        2: { cellWidth: 24, halign: "center" },
        3: { cellWidth: 26, halign: "center" },
        4: { cellWidth: 17, halign: "center", fontStyle: "bold", textColor: accent },
      },
      didParseCell: (hook) => {
        if (hook.section === "body" && hook.row.index % 2 === 1) hook.cell.styles.fillColor = COLOR.zebra;
      },
      didDrawCell: (hook) => {
        if (hook.section === "body") {
          doc.setDrawColor(...COLOR.line);
          doc.setLineWidth(0.15);
          doc.line(hook.cell.x, hook.cell.y + hook.cell.height, hook.cell.x + hook.cell.width, hook.cell.y + hook.cell.height);
        }
      },
    });
  };

  /* ---------------- Overview page (only when several zones) ---------------- */

  if (data.zones.length > 1) {
    const rows = data.zones.filter((zone) => zone.total);
    const grand = rows.reduce(
      (sum, zone) => {
        const t = zone.total!;

        return {
          target: sum.target + t.target,
          pending: sum.pending + t.pending,
          completed: sum.completed + t.completed,
          cleaned: sum.cleaned + t.cleaned,
          siPending: sum.siPending + t.siPending,
          notCleaned: sum.notCleaned + t.notCleaned,
          actionRequired: sum.actionRequired + t.actionRequired,
          actionTaken: sum.actionTaken + t.actionTaken,
          actionPending: sum.actionPending + t.actionPending,
        };
      },
      { target: 0, pending: 0, completed: 0, cleaned: 0, siPending: 0, notCleaned: 0, actionRequired: 0, actionTaken: 0, actionPending: 0 },
    );

    text("Overview - All Selected Zones", PAGE.margin, PAGE.contentTop + 4, 17, COLOR.navy, "bold");
    text(`${data.zones.length} zones selected`, PAGE.margin, PAGE.contentTop + 10, 9, COLOR.muted);

    kpiChips(
      [
        { label: "Assigned Target", value: num(grand.target), color: COLOR.navy },
        { label: "Completed", value: num(grand.completed), color: COLOR.blue },
        { label: "Pending Target", value: num(grand.pending), color: COLOR.amber },
        { label: "SI Pending", value: num(grand.siPending), color: COLOR.violet },
        { label: "Cleaned", value: num(grand.cleaned), color: COLOR.green },
        { label: "Not Cleaned", value: num(grand.notCleaned), color: COLOR.red },
        { label: "Action Pending", value: num(grand.actionPending), color: COLOR.amber },
      ],
      PAGE.contentTop + 16,
    );

    const body = rows.map((zone) => {
      const t = zone.total!;

      return [zone.wardFilter ? `${zone.zoneName} (${zone.wardFilter.selected} of ${zone.wardFilter.total} wards)` : zone.zoneName, num(t.target), num(t.pending), num(t.completed), pct(completionPct(t)), num(t.siPending), num(t.cleaned), num(t.notCleaned), num(t.actionRequired), num(t.actionTaken), num(t.actionPending)];
    });

    body.push([
      "Total",
      num(grand.target),
      num(grand.pending),
      num(grand.completed),
      pct(completionPct(grand)),
      num(grand.siPending),
      num(grand.cleaned),
      num(grand.notCleaned),
      num(grand.actionRequired),
      num(grand.actionTaken),
      num(grand.actionPending),
    ]);

    autoTable(doc, {
      startY: PAGE.contentTop + 38,
      head: [["Zone", "Assigned Target", "Pending Target", "Completed", "Completion", "SI Pending", "Cleaned", "Not Cleaned", "Action Required", "Action Taken", "Action Pending"]],
      body,
      margin: { left: PAGE.margin, right: PAGE.margin, top: PAGE.contentTop },
      theme: "plain",
      styles: { font: "helvetica", fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: COLOR.ink },
      headStyles: { fillColor: COLOR.navy, textColor: COLOR.white, fontStyle: "bold", fontSize: 8, halign: "center" },
      columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" }, 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" }, 6: { halign: "center" }, 7: { halign: "center" }, 8: { halign: "center" }, 9: { halign: "center" }, 10: { halign: "center" } },
      didParseCell: (hook) => {
        if (hook.section !== "body") return;

        if (hook.row.index === body.length - 1) {
          hook.cell.styles.fillColor = COLOR.totalFill;
          hook.cell.styles.fontStyle = "bold";
          hook.cell.styles.textColor = COLOR.navy;
        } else if (hook.row.index % 2 === 1) {
          hook.cell.styles.fillColor = COLOR.zebra;
        }
      },
      didDrawCell: (hook) => {
        if (hook.section === "body") {
          doc.setDrawColor(...COLOR.line);
          doc.setLineWidth(0.15);
          doc.line(hook.cell.x, hook.cell.y + hook.cell.height, hook.cell.x + hook.cell.width, hook.cell.y + hook.cell.height);
        }
      },
    });

    markPages(1, "Overview");
  }

  /* ---------------- One section per zone ---------------- */

  const drawZone = (zone: ZoneExportZone, first: boolean) => {
    if (!first || data.zones.length > 1) doc.addPage();

    const firstPage = doc.getNumberOfPages();
    let y = PAGE.contentTop + 4;

    text(zone.zoneName, PAGE.margin, y, 18, COLOR.navy, "bold");
    if (zone.wardFilter) {
      text(
        `Selected wards only: ${zone.wardFilter.selected} of ${zone.wardFilter.total} wards`,
        PAGE.width - PAGE.margin,
        y,
        9,
        COLOR.blue,
        "bold",
        "right",
      );
    }

    doc.setDrawColor(...COLOR.blue);
    doc.setLineWidth(0.8);
    doc.line(PAGE.margin, y + 2.5, PAGE.margin + 22, y + 2.5);
    y += 8;

    if (!zone.modules.length || !zone.total) {
      doc.setFillColor(...COLOR.soft);
      doc.setDrawColor(...COLOR.line);
      doc.roundedRect(PAGE.margin, y + 4, CONTENT_WIDTH, 28, 3, 3, "FD");
      text("No inspection data for this zone in the selected period.", PAGE.width / 2, y + 20, 11, COLOR.muted, "normal", "center");
      markPages(firstPage, zone.zoneName);
      return;
    }

    const total = zone.total;
    const done = completionPct(total);

    kpiChips(
      [
        { label: "Assigned Target", value: num(total.target), color: COLOR.navy },
        { label: done === null ? "Completed" : `Completed (${done.toFixed(0)}%)`, value: num(total.completed), color: COLOR.blue },
        { label: "Pending Target", value: num(total.pending), color: COLOR.amber },
        { label: "SI Pending", value: num(total.siPending), color: COLOR.violet },
        { label: "Cleaned", value: num(total.cleaned), color: COLOR.green },
        { label: "Not Cleaned", value: num(total.notCleaned), color: COLOR.red },
        { label: "Action Pending", value: num(total.actionPending), color: COLOR.amber },
      ],
      y,
    );
    y += 19;

    moduleTable(zone.modules, total, y);
    y = lastY() + 4;

    text(
      "Completed = inspections counted against the target (never above it).  Pending Target = Assigned Target - Completed.  SI Pending = waiting for SI review.  Action Pending = Action Required - Action Taken.",
      PAGE.margin,
      y + 2,
      6.8,
      COLOR.muted,
    );
    y += 8;

    // Keep both ward tables together on one page (a long ward name takes a second line).
    const tableHeight = (wards: ZoneExportWard[]) =>
      20 + (wards.length ? wards.reduce((sum, ward) => sum + 7.5 + (ward.wardName.length > 34 ? 4 : 0), 0) : 8);
    const wardHeight = Math.max(tableHeight(zone.bestWards), tableHeight(zone.worstWards)) + 3;

    if (y + wardHeight > PAGE.footerTop) {
      doc.addPage();
      y = PAGE.contentTop + 4;
    }

    const half = (CONTENT_WIDTH - 9) / 2;

    const scope = zone.wardFilter ? " - selected wards" : "";

    wardTable("Top 5 Wards", `Highest cleaned % and target completed${scope}`, "good", zone.bestWards, PAGE.margin, y, half);
    wardTable("Bottom 5 Wards", `Highest not cleaned % and target missed${scope}`, "bad", zone.worstWards, PAGE.margin + half + 9, y, half);

    markPages(firstPage, zone.zoneName);
  };

  data.zones.forEach((zone, index) => drawZone(zone, index === 0));

  /* ---------------- Header and footer on every page ---------------- */

  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);

    doc.setFillColor(...COLOR.navy);
    doc.rect(0, 0, PAGE.width, PAGE.headerHeight, "F");
    doc.setFillColor(...COLOR.blue);
    doc.rect(0, PAGE.headerHeight, PAGE.width, 1.2, "F");

    text("Zone-wise Inspection Report", PAGE.margin, 9.5, 14, COLOR.white, "bold");
    text(`MatrixTrack 2.0  |  ${pageLabels.get(page) ?? ""}`, PAGE.margin, 15.5, 8, [186, 205, 235]);

    text(data.city.name, PAGE.width - PAGE.margin, 9.5, 11, COLOR.white, "bold", "right");
    text(periodText(data.range), PAGE.width - PAGE.margin, 15.5, 8, [186, 205, 235], "normal", "right");

    doc.setDrawColor(...COLOR.line);
    doc.setLineWidth(0.2);
    doc.line(PAGE.margin, PAGE.footerTop + 3, PAGE.width - PAGE.margin, PAGE.footerTop + 3);
    text(`Generated on ${formatStamp(data.generatedAt)}`, PAGE.margin, PAGE.footerTop + 8, 7.5, COLOR.muted);
    text(`Page ${page} of ${pages}`, PAGE.width - PAGE.margin, PAGE.footerTop + 8, 7.5, COLOR.muted, "normal", "right");
  }

  doc.save(`Zone_Report_${safeFileName(data.city.name)}_${data.range.from}_to_${data.range.to}.pdf`);
}

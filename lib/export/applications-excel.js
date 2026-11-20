import ExcelJS from "exceljs";

/**
 * National Front Party Branding Colors
 */
const COLORS = {
  darkInk: "15171C",
  gold: "C9A24B",
  darkGold: "8C6A16",
  lightGold: "E6CC85",
  deepGold: "BE953A",
  goldTint: "FBF6E9",
  pageBg: "F4F5F7",
  cardBg: "FFFFFF",
  borders: "E7E9EE",
  mutedText: "5B6270",
  white: "FFFFFF",
  emeraldBg: "ECFDF5",
  emeraldText: "065F46",
  skyBg: "F0F9FF",
  skyText: "075985",
  roseBg: "FFF1F2",
  roseText: "9F1239",
};

const STATUS_LABELS = {
  new: "جديد",
  under_review: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
};

const TYPE_LABELS = {
  member: "عضوية عاملة",
  volunteer: "متطوع",
  follower: "متابع",
};

/**
 * Generates in-cell mini visual bar
 */
function makeMiniBar(count, total, maxBars = 18) {
  if (!total || total <= 0 || !count) return "—";
  const numBars = Math.max(1, Math.round((count / total) * maxBars));
  return "█".repeat(numBars);
}

/**
 * Formats ISO date to readable Arabic string
 */
function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return String(isoStr);
  }
}

/**
 * Builds the complete two-sheet Excel workbook using ExcelJS
 * @param {Array} rows - array of application objects
 * @param {Object} meta - export metadata (activeFilters, exportDate)
 * @returns {Promise<Uint8Array>}
 */
export async function generateApplicationsWorkbook(rows = [], meta = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "حزب الجبهة الوطنية";
  workbook.lastModifiedBy = "بوابة الإدارة المركزية";
  workbook.created = new Date();
  workbook.modified = new Date();

  // -------------------------------------------------------------
  // Data aggregation for Dashboard & KPIs
  // -------------------------------------------------------------
  const totalApps = rows.length;
  const statusCounts = { new: 0, under_review: 0, accepted: 0, rejected: 0 };
  const typeCounts = { member: 0, volunteer: 0, follower: 0 };
  const govCounts = {};
  const dateCounts = {};

  rows.forEach((row) => {
    // Status
    const st = row.status || "new";
    if (statusCounts[st] !== undefined) statusCounts[st] += 1;
    else statusCounts[st] = 1;

    // Type
    const tp = row.application_type || "member";
    if (typeCounts[tp] !== undefined) typeCounts[tp] += 1;
    else typeCounts[tp] = 1;

    // Governorate
    const govName = row.governorate?.name_ar || row.governorate_name || "غير محدد";
    govCounts[govName] = (govCounts[govName] || 0) + 1;

    // Timeline by day
    if (row.created_at) {
      const day = String(row.created_at).slice(0, 10);
      dateCounts[day] = (dateCounts[day] || 0) + 1;
    }
  });

  // Top Governorates sorted
  const sortedGovs = Object.entries(govCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Timeline sorted by date ascending
  const sortedDates = Object.entries(dateCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-10); // last 10 dates with entries

  // -------------------------------------------------------------
  // SHEET 1: الإحصائيات ولوحة المؤشرات (Dashboard)
  // -------------------------------------------------------------
  const ws1 = workbook.addWorksheet("الإحصائيات ولوحة المؤشرات", {
    views: [{ rightToLeft: true, showGridLines: true }],
  });

  // Set standard column widths for dashboard layout
  ws1.columns = [
    { width: 4 },  // A (margin)
    { width: 22 }, // B
    { width: 14 }, // C
    { width: 14 }, // D
    { width: 18 }, // E
    { width: 22 }, // F
    { width: 14 }, // G
    { width: 14 }, // H
    { width: 18 }, // I
    { width: 4 },  // J
  ];

  // Title & Header Block (Rows 2 to 4)
  ws1.mergeCells("B2:I2");
  const titleCell = ws1.getCell("B2");
  titleCell.value = "حزب الجبهة الوطنية • تقرير طلبات الانضمام للعضوية";
  titleCell.font = { name: "Cairo", size: 16, bold: true, color: { argb: COLORS.white } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.darkInk } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(2).height = 40;

  ws1.mergeCells("B3:I3");
  const subCell = ws1.getCell("B3");
  const exportTimeStr = new Date().toLocaleString("ar-EG", { dateStyle: "full", timeStyle: "medium" });
  subCell.value = `National Front Party — Membership Applications Executive Report • تاريخ التصدير: ${exportTimeStr}`;
  subCell.font = { name: "Cairo", size: 10, color: { argb: COLORS.lightGold } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.darkInk } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(3).height = 24;

  // Filter notice bar
  ws1.mergeCells("B4:I4");
  const filterCell = ws1.getCell("B4");
  const filterSummary = meta.filtersText || "جميع الطلبات المسجلة دون فلاتر محددة";
  filterCell.value = `نطاق البيانات المصدرة: ${filterSummary} | إجمالي السجلات: ${totalApps} طلب`;
  filterCell.font = { name: "Cairo", size: 9, bold: true, color: { argb: COLORS.darkGold } };
  filterCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.goldTint } };
  filterCell.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(4).height = 22;

  // Spacing row 5
  ws1.getRow(5).height = 12;

  // Row 6: KPI Header
  ws1.mergeCells("B6:I6");
  const kpiHeader = ws1.getCell("B6");
  kpiHeader.value = "مؤشرات الأداء الرئيسية (KPIs)";
  kpiHeader.font = { name: "Cairo", size: 12, bold: true, color: { argb: COLORS.darkInk } };
  kpiHeader.alignment = { horizontal: "right", vertical: "middle" };
  ws1.getRow(6).height = 26;

  // Rows 7-8: 5 Styled KPI Cards
  // Card 1: Total (B7:B8, C7:C8) -> B7:C8
  // Card 2: New (D7:D8)
  // Card 3: Under Review (E7:F8)
  // Card 4: Accepted (G7:G8)
  // Card 5: Rejected (H7:I8)

  const kpis = [
    { range: "B7:C7", valRange: "B8:C8", title: "إجمالي الطلبات", val: totalApps, bg: COLORS.goldTint, fg: COLORS.darkGold, border: COLORS.gold },
    { range: "D7:D7", valRange: "D8:D8", title: "طلبات جديدة", val: statusCounts.new, bg: COLORS.skyBg, fg: COLORS.skyText, border: "BAE6FD" },
    { range: "E7:F7", valRange: "E8:F8", title: "قيد المراجعة", val: statusCounts.under_review, bg: COLORS.goldTint, fg: COLORS.darkGold, border: COLORS.gold },
    { range: "G7:G7", valRange: "G8:G8", title: "طلبات مقبولة", val: statusCounts.accepted, bg: COLORS.emeraldBg, fg: COLORS.emeraldText, border: "A7F3D0" },
    { range: "H7:I7", valRange: "H8:I8", title: "طلبات مرفوضة", val: statusCounts.rejected, bg: COLORS.roseBg, fg: COLORS.roseText, border: "FECDD3" },
  ];

  kpis.forEach((card) => {
    ws1.mergeCells(card.range);
    const topCell = ws1.getCell(card.range.split(":")[0]);
    topCell.value = card.title;
    topCell.font = { name: "Cairo", size: 10, bold: true, color: { argb: card.fg } };
    topCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: card.bg } };
    topCell.alignment = { horizontal: "center", vertical: "middle" };

    ws1.mergeCells(card.valRange);
    const valCell = ws1.getCell(card.valRange.split(":")[0]);
    valCell.value = card.val;
    valCell.font = { name: "Cairo", size: 16, bold: true, color: { argb: COLORS.darkInk } };
    valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: card.bg } };
    valCell.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws1.getRow(7).height = 24;
  ws1.getRow(8).height = 32;

  // Spacing row 9
  ws1.getRow(9).height = 16;

  // -------------------------------------------------------------
  // Data Visualizations: 4 Comprehensive Breakdown Tables
  // -------------------------------------------------------------
  // Left: Distribution by Status (B10:E16)
  // Right: Distribution by Membership Type (F10:I16)

  // Section Headers (Row 10)
  ws1.mergeCells("B10:E10");
  const vTitle1 = ws1.getCell("B10");
  vTitle1.value = "١. توزيع الطلبات حسب الحالة (Status Breakdown)";
  vTitle1.font = { name: "Cairo", size: 11, bold: true, color: { argb: COLORS.white } };
  vTitle1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.darkInk } };
  vTitle1.alignment = { horizontal: "right", vertical: "middle", indent: 1 };

  ws1.mergeCells("F10:I10");
  const vTitle2 = ws1.getCell("F10");
  vTitle2.value = "٢. توزيع الطلبات حسب نوع الانضمام (Membership Type)";
  vTitle2.font = { name: "Cairo", size: 11, bold: true, color: { argb: COLORS.white } };
  vTitle2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.darkInk } };
  vTitle2.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
  ws1.getRow(10).height = 28;

  // Subheaders (Row 11)
  const subHeaders = [
    { cell: "B11", val: "الحالة" },
    { cell: "C11", val: "العدد" },
    { cell: "D11", val: "النسبة" },
    { cell: "E11", val: "المخطط البياني التوضيحي" },
    { cell: "F11", val: "نوع الانضمام" },
    { cell: "G11", val: "العدد" },
    { cell: "H11", val: "النسبة" },
    { cell: "I11", val: "المخطط البياني التوضيحي" },
  ];
  subHeaders.forEach(({ cell, val }) => {
    const c = ws1.getCell(cell);
    c.value = val;
    c.font = { name: "Cairo", size: 9, bold: true, color: { argb: COLORS.darkInk } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.goldTint } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = { bottom: { style: "thin", color: { argb: COLORS.gold } } };
  });
  ws1.getRow(11).height = 24;

  // Status Rows (12-15)
  const statusRowsData = [
    { label: "جديد", key: "new", count: statusCounts.new, color: "0284C7" },
    { label: "قيد المراجعة", key: "under_review", count: statusCounts.under_review, color: COLORS.darkGold },
    { label: "مقبول", key: "accepted", count: statusCounts.accepted, color: "059669" },
    { label: "مرفوض", key: "rejected", count: statusCounts.rejected, color: "E11D48" },
  ];

  statusRowsData.forEach((item, idx) => {
    const rowNum = 12 + idx;
    const pct = totalApps > 0 ? (item.count / totalApps) : 0;
    ws1.getCell(`B${rowNum}`).value = item.label;
    ws1.getCell(`B${rowNum}`).alignment = { horizontal: "right", indent: 1 };
    ws1.getCell(`C${rowNum}`).value = item.count;
    ws1.getCell(`C${rowNum}`).alignment = { horizontal: "center" };
    ws1.getCell(`D${rowNum}`).value = pct;
    ws1.getCell(`D${rowNum}`).numFmt = "0.0%";
    ws1.getCell(`D${rowNum}`).alignment = { horizontal: "center" };
    ws1.getCell(`E${rowNum}`).value = makeMiniBar(item.count, totalApps);
    ws1.getCell(`E${rowNum}`).font = { name: "Arial", size: 10, bold: true, color: { argb: item.color } };
    ws1.getCell(`E${rowNum}`).alignment = { horizontal: "left" };
    ws1.getRow(rowNum).height = 22;
  });

  // Type Rows (12-14)
  const typeRowsData = [
    { label: "عضوية عاملة", key: "member", count: typeCounts.member },
    { label: "عمل تطوعي", key: "volunteer", count: typeCounts.volunteer },
    { label: "مناصرة ومتابعة", key: "follower", count: typeCounts.follower },
  ];

  typeRowsData.forEach((item, idx) => {
    const rowNum = 12 + idx;
    const pct = totalApps > 0 ? (item.count / totalApps) : 0;
    ws1.getCell(`F${rowNum}`).value = item.label;
    ws1.getCell(`F${rowNum}`).alignment = { horizontal: "right", indent: 1 };
    ws1.getCell(`G${rowNum}`).value = item.count;
    ws1.getCell(`G${rowNum}`).alignment = { horizontal: "center" };
    ws1.getCell(`H${rowNum}`).value = pct;
    ws1.getCell(`H${rowNum}`).numFmt = "0.0%";
    ws1.getCell(`H${rowNum}`).alignment = { horizontal: "center" };
    ws1.getCell(`I${rowNum}`).value = makeMiniBar(item.count, totalApps);
    ws1.getCell(`I${rowNum}`).font = { name: "Arial", size: 10, bold: true, color: { argb: COLORS.deepGold } };
    ws1.getCell(`I${rowNum}`).alignment = { horizontal: "left" };
  });

  // Empty placeholder on row 15 (Type side)
  ws1.getCell("F15").value = "—";
  ws1.getCell("G15").value = "";
  ws1.getCell("H15").value = "";
  ws1.getCell("I15").value = "";

  // Row 16: Spacing
  ws1.getRow(16).height = 16;

  // Row 17: Section Headers for Governorates & Timeline
  ws1.mergeCells("B17:E17");
  const vTitle3 = ws1.getCell("B17");
  vTitle3.value = "٣. أكثر المحافظات تقديماً للطلبات (Top Governorates)";
  vTitle3.font = { name: "Cairo", size: 11, bold: true, color: { argb: COLORS.white } };
  vTitle3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.darkInk } };
  vTitle3.alignment = { horizontal: "right", vertical: "middle", indent: 1 };

  ws1.mergeCells("F17:I17");
  const vTitle4 = ws1.getCell("F17");
  vTitle4.value = "٤. وتيرة تدفق الطلبات عبر الزمن (Applications Timeline)";
  vTitle4.font = { name: "Cairo", size: 11, bold: true, color: { argb: COLORS.white } };
  vTitle4.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.darkInk } };
  vTitle4.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
  ws1.getRow(17).height = 28;

  // Subheaders (Row 18)
  const subHeaders2 = [
    { cell: "B18", val: "المحافظة" },
    { cell: "C18", val: "العدد" },
    { cell: "D18", val: "النسبة" },
    { cell: "E18", val: "الرسم البياني للمحافظة" },
    { cell: "F18", val: "التاريخ" },
    { cell: "G18", val: "الطلبات" },
    { cell: "H18", val: "النسبة اليومية" },
    { cell: "I18", val: "مؤشر الكثافة اليومية" },
  ];
  subHeaders2.forEach(({ cell, val }) => {
    const c = ws1.getCell(cell);
    c.value = val;
    c.font = { name: "Cairo", size: 9, bold: true, color: { argb: COLORS.darkInk } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.goldTint } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = { bottom: { style: "thin", color: { argb: COLORS.gold } } };
  });
  ws1.getRow(18).height = 24;

  // Fill Governorates (Rows 19-26)
  const maxGovRows = 8;
  for (let i = 0; i < maxGovRows; i++) {
    const rowNum = 19 + i;
    ws1.getRow(rowNum).height = 22;
    if (i < sortedGovs.length) {
      const [gName, gCount] = sortedGovs[i];
      const pct = totalApps > 0 ? (gCount / totalApps) : 0;
      ws1.getCell(`B${rowNum}`).value = gName;
      ws1.getCell(`B${rowNum}`).alignment = { horizontal: "right", indent: 1 };
      ws1.getCell(`C${rowNum}`).value = gCount;
      ws1.getCell(`C${rowNum}`).alignment = { horizontal: "center" };
      ws1.getCell(`D${rowNum}`).value = pct;
      ws1.getCell(`D${rowNum}`).numFmt = "0.0%";
      ws1.getCell(`D${rowNum}`).alignment = { horizontal: "center" };
      ws1.getCell(`E${rowNum}`).value = makeMiniBar(gCount, sortedGovs[0][1]);
      ws1.getCell(`E${rowNum}`).font = { name: "Arial", size: 10, bold: true, color: { argb: COLORS.deepGold } };
      ws1.getCell(`E${rowNum}`).alignment = { horizontal: "left" };
    } else {
      ws1.getCell(`B${rowNum}`).value = i === 0 ? "لا توجد بيانات متاحة" : "—";
      ws1.getCell(`C${rowNum}`).value = "";
      ws1.getCell(`D${rowNum}`).value = "";
      ws1.getCell(`E${rowNum}`).value = "";
    }

    // Fill Timeline (F-I)
    if (i < sortedDates.length) {
      const [dName, dCount] = sortedDates[i];
      const pct = totalApps > 0 ? (dCount / totalApps) : 0;
      ws1.getCell(`F${rowNum}`).value = dName;
      ws1.getCell(`F${rowNum}`).alignment = { horizontal: "center" };
      ws1.getCell(`G${rowNum}`).value = dCount;
      ws1.getCell(`G${rowNum}`).alignment = { horizontal: "center" };
      ws1.getCell(`H${rowNum}`).value = pct;
      ws1.getCell(`H${rowNum}`).numFmt = "0.0%";
      ws1.getCell(`H${rowNum}`).alignment = { horizontal: "center" };
      ws1.getCell(`I${rowNum}`).value = makeMiniBar(dCount, totalApps, 14);
      ws1.getCell(`I${rowNum}`).font = { name: "Arial", size: 10, bold: true, color: { argb: "0284C7" } };
      ws1.getCell(`I${rowNum}`).alignment = { horizontal: "left" };
    } else {
      ws1.getCell(`F${rowNum}`).value = i === 0 ? "لا توجد بيانات تاريخية" : "—";
      ws1.getCell(`G${rowNum}`).value = "";
      ws1.getCell(`H${rowNum}`).value = "";
      ws1.getCell(`I${rowNum}`).value = "";
    }
  }

  // Row 28: Summary footer note
  ws1.mergeCells("B28:I28");
  const footerCell = ws1.getCell("B28");
  footerCell.value = "تم استخراج هذا التقرير آلياً من منظومة إدارة العضويات لحزب الجبهة الوطنية • يُحظر تداول هذا الملف لغير المخولين رسمياً";
  footerCell.font = { name: "Cairo", size: 8, italic: true, color: { argb: COLORS.mutedText } };
  footerCell.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(28).height = 20;

  // Add subtle outer borders to Dashboard tables
  const addBoxBorder = (startCol, startRow, endCol, endRow) => {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = ws1.getCell(r, c);
        cell.border = {
          top: { style: r === startRow ? "thin" : "hair", color: { argb: COLORS.borders } },
          bottom: { style: r === endRow ? "thin" : "hair", color: { argb: COLORS.borders } },
          left: { style: c === startCol ? "thin" : "hair", color: { argb: COLORS.borders } },
          right: { style: c === endCol ? "thin" : "hair", color: { argb: COLORS.borders } },
        };
      }
    }
  };
  addBoxBorder(2, 10, 5, 15);
  addBoxBorder(6, 10, 9, 15);
  addBoxBorder(2, 17, 5, 26);
  addBoxBorder(6, 17, 9, 26);

  // -------------------------------------------------------------
  // SHEET 2: بيانات الطلبات التفصيلية (Applications Data)
  // -------------------------------------------------------------
  const ws2 = workbook.addWorksheet("بيانات الطلبات", {
    views: [
      {
        rightToLeft: true,
        state: "frozen",
        xSplit: 0,
        ySplit: 1, // Freeze header row
        showGridLines: true,
      },
    ],
  });

  // Define Columns
  ws2.columns = [
    { header: "رقم الطلب", key: "app_no", width: 14 },
    { header: "الاسم الرباعي للمواطن", key: "full_name", width: 30 },
    { header: "نوع الانضمام", key: "type", width: 16 },
    { header: "حالة الطلب", key: "status", width: 16 },
    { header: "المحافظة", key: "governorate", width: 18 },
    { header: "الموظف المسؤول", key: "staff", width: 22 },
    { header: "تاريخ تقديم الطلب", key: "created_at", width: 22 },
    { header: "تاريخ آخر تحديث", key: "updated_at", width: 22 },
    { header: "تاريخ المراجعة", key: "reviewed_at", width: 22 },
  ];

  // Style Header Row (Row 1)
  const headerRow = ws2.getRow(1);
  headerRow.height = 34;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Cairo", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.darkInk } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      bottom: { style: "medium", color: { argb: COLORS.gold } },
      right: { style: "thin", color: { argb: "33FFFFFF" } },
    };
  });

  // Enable AutoFilter on header row
  ws2.autoFilter = "A1:I1";

  // Insert Application Records
  rows.forEach((row, idx) => {
    const rawNo = row.application_no !== undefined ? String(row.application_no) : "";
    const typeLabel = TYPE_LABELS[row.application_type] || row.application_type || "—";
    const statusLabel = STATUS_LABELS[row.status] || row.status || "—";
    const govName = row.governorate?.name_ar || row.governorate_name || "—";
    const staffName = row.assigned_staff_user?.full_name || row.staff_name || "غير محدد";

    const addedRow = ws2.addRow({
      app_no: rawNo ? `#${rawNo}` : `APP-${idx + 1}`,
      full_name: row.full_name || "—",
      type: typeLabel,
      status: statusLabel,
      governorate: govName,
      staff: staffName,
      created_at: formatDate(row.created_at),
      updated_at: formatDate(row.updated_at),
      reviewed_at: formatDate(row.reviewed_at),
    });

    addedRow.height = 24;

    // Alternating zebra fill
    const isEven = idx % 2 === 1;
    const rowBg = isEven ? COLORS.pageBg : COLORS.white;

    addedRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Cairo", size: 9, color: { argb: COLORS.darkInk } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      cell.border = {
        bottom: { style: "thin", color: { argb: COLORS.borders } },
        right: { style: "thin", color: { argb: COLORS.borders } },
      };

      // Alignment rules
      if (colNumber === 1) {
        // Application number: text format to preserve leading zeros
        cell.numFmt = "@";
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 2) {
        // Name
        cell.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
      } else if (colNumber === 4) {
        // Status with subtle status-specific badge colors
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (row.status === "accepted") {
          cell.font = { name: "Cairo", size: 9, bold: true, color: { argb: COLORS.emeraldText } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.emeraldBg } };
        } else if (row.status === "rejected") {
          cell.font = { name: "Cairo", size: 9, bold: true, color: { argb: COLORS.roseText } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.roseBg } };
        } else if (row.status === "new") {
          cell.font = { name: "Cairo", size: 9, bold: true, color: { argb: COLORS.skyText } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.skyBg } };
        } else {
          cell.font = { name: "Cairo", size: 9, bold: true, color: { argb: COLORS.darkGold } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.goldTint } };
        }
      } else {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
  });

  return await workbook.xlsx.writeBuffer();
}

// ============================================================
// JASA TUGAS - Google Apps Script Backend (v6)
// ============================================================
// ALUR STATUS:
// verifikasi tugas → pembayaran awal → verifikasi pembayaran awal
// → proses pengerjaan → menunggu pelunasan (admin upload hasil)
// → menunggu verifikasi (customer upload bukti pelunasan)
// → cek file (admin verifikasi) → customer pilih Selesai atau Revisi
// → revisi → admin upload hasil revisi → selesai (langsung)
//
// Upload "hasil" saat status "revisi" → selesai
// Upload "hasil" saat status lain → menunggu pelunasan
// Upload "bukti_dp" → verifikasi pembayaran awal
// Upload "bukti_pelunasan" → menunggu verifikasi
// ============================================================

const SPREADSHEET_ID = "1M46VQj9eGn4_Pn_bg0u4IAcuqnaAekEAHo-yeVXV9Eo";
const SHEET_NAME = "Orders";

const COLUMNS = {
  ORDER_ID: 1,
  NAMA: 2,
  WA: 3,
  JENIS: 4,
  HALAMAN: 5,
  DEADLINE: 6,
  NOTE: 7,
  STATUS: 8,
  TIPE_ORDER: 9,
  HARGA: 10,
  DP: 11,
  SISA_BAYAR: 12,
  FILE_TUGAS_URL: 13,
  BUKTI_DP_URL: 14,
  BUKTI_PELUNASAN_URL: 15,
  HASIL_URL: 16,
  CREATED_AT: 17,
  REVISI_CATATAN: 18,
  REVISI_FILE_URLS: 19,
  REVISI_COUNT: 20,
  ESTIMASI_SELESAI: 21,
  ESTIMASI_REVISI: 22
};

const VALID_STATUSES = [
  "verifikasi tugas",
  "pembayaran awal",
  "verifikasi pembayaran awal",
  "proses pengerjaan",
  "menunggu pelunasan",
  "menunggu verifikasi",
  "cek file",
  "revisi",
  "selesai",
  "pending",
  "proses"
];

const VALID_JENIS = ["Makalah", "PPT", "Artikel", "Tugas Harian"];

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "order_id", "nama", "wa", "jenis", "halaman",
      "deadline", "note", "status", "tipe_order",
      "harga", "dp", "sisa_bayar",
      "file_tugas_url", "bukti_dp_url", "bukti_pelunasan_url",
      "hasil_url", "created_at",
      "revisi_catatan", "revisi_file_urls", "revisi_count",
      "estimasi_selesai", "estimasi_revisi"
    ]);
    sheet.getRange(1, 1, 1, 22).setFontWeight("bold");
  }
  return sheet;
}

function generateOrderId() {
  return "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function rowToObject(row) {
  return {
    order_id: row[0],
    nama: row[1],
    wa: row[2],
    jenis: row[3],
    halaman: row[4],
    deadline: row[5],
    note: row[6],
    status: row[7],
    tipe_order: row[8],
    harga: row[9],
    dp: row[10],
    sisa_bayar: row[11],
    file_tugas_url: row[12],
    bukti_dp_url: row[13],
    bukti_pelunasan_url: row[14],
    hasil_url: row[15],
    created_at: row[16],
    revisi_catatan: row[17],
    revisi_file_urls: row[18],
    revisi_count: row[19] || 0,
    estimasi_selesai: row[20] || "",
    estimasi_revisi: row[21] || ""
  };
}

// ─── GET ──────────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === "getOrder") return handleGetOrder(e.parameter.order_id);
    if (action === "getAllOrders") return handleGetAllOrders();
    if (action === "checkWa") return handleCheckWa(e.parameter.wa);
    return jsonResponse({ success: false, message: "Action tidak dikenal" });
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

// ─── POST ─────────────────────────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === "createOrder") return handleCreateOrder(body.data);
    if (body.action === "updateStatus") return handleUpdateStatus(body.order_id, body.status, body.estimasi_selesai);
    if (body.action === "uploadFile") return handleUploadFile(body.order_id, body.tipe, body.fileBase64, body.fileName);
    if (body.action === "submitRevisi") return handleSubmitRevisi(body.order_id, body.catatan, body.files, body.estimasi_revisi);
    if (body.action === "markSelesai") return handleMarkSelesai(body.order_id);
    return jsonResponse({ success: false, message: "Action tidak dikenal" });
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

function handleCheckWa(wa) {
  if (!wa) return jsonResponse({ success: false, message: "WA diperlukan" });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(wa)) {
      return jsonResponse({ success: true, data: { exists: true, nama_sebelumnya: data[i][1] } });
    }
  }
  return jsonResponse({ success: true, data: { exists: false } });
}

function handleCreateOrder(data) {
  if (!data.nama || !data.wa || !data.jenis || !data.halaman) {
    return jsonResponse({ success: false, message: "Data tidak lengkap" });
  }
  if (!VALID_JENIS.includes(data.jenis)) {
    return jsonResponse({ success: false, message: "Jenis tugas tidak valid" });
  }
  const sheet = getSheet();
  const order_id = generateOrderId();
  const dp = 10000;
  const harga = Number(data.harga) || 0;
  sheet.appendRow([
    order_id, data.nama, data.wa, data.jenis, Number(data.halaman),
    data.deadline || "", data.note || "", "verifikasi tugas",
    data.tipe_order || "standar", harga, dp, Math.max(0, harga - dp),
    "", "", "", "", new Date().toISOString(), "", "", 0, "", ""
  ]);
  return jsonResponse({ success: true, order_id });
}

function handleGetOrder(order_id) {
  if (!order_id) return jsonResponse({ success: false, message: "order_id diperlukan" });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order_id) return jsonResponse({ success: true, data: rowToObject(data[i]) });
  }
  return jsonResponse({ success: false, message: "Order tidak ditemukan" });
}

function handleGetAllOrders() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ success: true, data: [] });
  const orders = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) orders.push(rowToObject(data[i]));
  }
  orders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return jsonResponse({ success: true, data: orders });
}

function handleUpdateStatus(order_id, status, estimasi_selesai) {
  if (!order_id || !status) return jsonResponse({ success: false, message: "Parameter kurang" });
  if (!VALID_STATUSES.includes(status)) return jsonResponse({ success: false, message: "Status tidak valid: " + status });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order_id) {
      sheet.getRange(i + 1, COLUMNS.STATUS).setValue(status);
      if (status === "proses pengerjaan" && estimasi_selesai) {
        sheet.getRange(i + 1, COLUMNS.ESTIMASI_SELESAI).setValue(estimasi_selesai);
      }
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, message: "Order tidak ditemukan" });
}

// ─── Upload file ──────────────────────────────────────────────
// bukti_dp       → verifikasi pembayaran awal
// bukti_pelunasan → menunggu verifikasi
// hasil (status normal) → menunggu pelunasan
// hasil (status=revisi)  → selesai (langsung, tanpa perlu ke cek file lagi)
function handleUploadFile(order_id, tipe, fileBase64, fileName) {
  if (!order_id || !tipe || !fileBase64 || !fileName) {
    return jsonResponse({ success: false, message: "Parameter tidak lengkap" });
  }
  const VALID_TIPE = ["bukti_dp", "bukti_pelunasan", "file_tugas", "hasil"];
  if (!VALID_TIPE.includes(tipe)) return jsonResponse({ success: false, message: "Tipe tidak valid" });

  const COLUMN_MAP = {
    file_tugas: COLUMNS.FILE_TUGAS_URL,
    bukti_dp: COLUMNS.BUKTI_DP_URL,
    bukti_pelunasan: COLUMNS.BUKTI_PELUNASAN_URL,
    hasil: COLUMNS.HASIL_URL
  };

  try {
    const folder = DriveApp.getRootFolder();
    const sub = getOrCreateFolder(folder, "JasaTugas-" + order_id);
    const blob = Utilities.newBlob(Utilities.base64Decode(fileBase64), getMimeType(fileName), fileName);
    const file = sub.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl = file.getUrl();

    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === order_id) {
        sheet.getRange(i + 1, COLUMN_MAP[tipe]).setValue(fileUrl);

        // Atur status berdasarkan tipe file & status saat ini
        if (tipe === "bukti_dp") {
          sheet.getRange(i + 1, COLUMNS.STATUS).setValue("verifikasi pembayaran awal");
        } else if (tipe === "bukti_pelunasan") {
          sheet.getRange(i + 1, COLUMNS.STATUS).setValue("menunggu verifikasi");
        } else if (tipe === "hasil") {
          const currentStatus = String(data[i][COLUMNS.STATUS - 1]);
          if (currentStatus === "revisi") {
            // Setelah revisi selesai → langsung selesai
            sheet.getRange(i + 1, COLUMNS.STATUS).setValue("selesai");
          } else {
            // Upload hasil pertama kali → customer perlu bayar pelunasan
            sheet.getRange(i + 1, COLUMNS.STATUS).setValue("menunggu pelunasan");
          }
        }

        return jsonResponse({ success: true, url: fileUrl });
      }
    }
    return jsonResponse({ success: false, message: "Order tidak ditemukan" });
  } catch (err) {
    return jsonResponse({ success: false, message: "Gagal upload: " + err.message });
  }
}

// ─── Submit revisi (customer) ─────────────────────────────────
function handleSubmitRevisi(order_id, catatan, files, estimasi_revisi) {
  if (!order_id) return jsonResponse({ success: false, message: "order_id diperlukan" });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order_id) {
      const revisiCount = Number(data[i][19]) || 0;
      if (revisiCount >= 1) return jsonResponse({ success: false, message: "Revisi gratis sudah habis (maks 1 kali)" });

      const uploadedUrls = [];
      if (files && files.length > 0) {
        const sub = getOrCreateFolder(DriveApp.getRootFolder(), "JasaTugas-" + order_id);
        for (const f of files) {
          try {
            const blob = Utilities.newBlob(Utilities.base64Decode(f.base64), getMimeType(f.name), "revisi_" + f.name);
            const file = sub.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            uploadedUrls.push(file.getUrl());
          } catch (e) { /* lanjut */ }
        }
      }

      sheet.getRange(i + 1, COLUMNS.REVISI_CATATAN).setValue(catatan || "");
      sheet.getRange(i + 1, COLUMNS.REVISI_FILE_URLS).setValue(uploadedUrls.join(","));
      sheet.getRange(i + 1, COLUMNS.REVISI_COUNT).setValue(revisiCount + 1);
      sheet.getRange(i + 1, COLUMNS.STATUS).setValue("revisi");
      if (estimasi_revisi) {
        sheet.getRange(i + 1, COLUMNS.ESTIMASI_REVISI).setValue(estimasi_revisi);
      }
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, message: "Order tidak ditemukan" });
}

// ─── Customer konfirmasi selesai ──────────────────────────────
function handleMarkSelesai(order_id) {
  if (!order_id) return jsonResponse({ success: false, message: "order_id diperlukan" });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order_id) {
      sheet.getRange(i + 1, COLUMNS.STATUS).setValue("selesai");
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, message: "Order tidak ditemukan" });
}

function getOrCreateFolder(parent, name) {
  const iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

function getMimeType(fileName) {
  const ext = fileName.split(".").pop().toLowerCase();
  const types = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return types[ext] || "application/octet-stream";
}

function jsonResponse(data) {
  const out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

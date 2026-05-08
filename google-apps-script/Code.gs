// ============================================================
// JASA TUGAS - Google Apps Script Backend (v2)
// ============================================================
// CARA DEPLOY:
// 1. Buka https://script.google.com dan buka project yang sudah ada
// 2. Hapus semua kode lama, paste seluruh kode ini
// 3. Pastikan SPREADSHEET_ID sudah benar
// 4. Klik "Deploy" > "Manage deployments" > edit deployment yang ada
// 5. Ganti versi ke "New version" lalu klik Deploy
// ============================================================

const SPREADSHEET_ID = "GANTI_DENGAN_SPREADSHEET_ID_KAMU";
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
  CREATED_AT: 17
};

const VALID_STATUSES = [
  "verifikasi tugas",
  "proses pengerjaan",
  "menunggu pelunasan",
  "verifikasi pembayaran",
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
      "hasil_url", "created_at"
    ]);
    sheet.getRange(1, 1, 1, 17).setFontWeight("bold");
  }
  return sheet;
}

function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return "ORD-" + timestamp + "-" + random;
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
    created_at: row[16]
  };
}

// ============================================================
// GET handler
// ============================================================
function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === "getOrder") return handleGetOrder(e.parameter.order_id);
    if (action === "getAllOrders") return handleGetAllOrders();
    if (action === "checkWa") return handleCheckWa(e.parameter.wa);
    return jsonResponse({ success: false, message: "Action tidak dikenal: " + action });
  } catch (err) {
    return jsonResponse({ success: false, message: "Error: " + err.message });
  }
}

// ============================================================
// POST handler
// ============================================================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    if (action === "createOrder") return handleCreateOrder(body.data);
    if (action === "updateStatus") return handleUpdateStatus(body.order_id, body.status);
    if (action === "uploadFile") return handleUploadFile(body.order_id, body.tipe, body.fileBase64, body.fileName);
    return jsonResponse({ success: false, message: "Action tidak dikenal: " + action });
  } catch (err) {
    return jsonResponse({ success: false, message: "Error: " + err.message });
  }
}

// ============================================================
// Cek apakah nomor WA sudah pernah dipakai
// ============================================================
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

// ============================================================
// Buat order baru
// ============================================================
function handleCreateOrder(data) {
  if (!data.nama || !data.wa || !data.jenis || !data.halaman || !data.deadline) {
    return jsonResponse({ success: false, message: "Data tidak lengkap" });
  }
  if (!VALID_JENIS.includes(data.jenis)) {
    return jsonResponse({ success: false, message: "Jenis tugas tidak valid: " + data.jenis });
  }

  const sheet = getSheet();
  const order_id = generateOrderId();
  const created_at = new Date().toISOString();
  const dp = 10000;
  const harga = Number(data.harga) || 0;
  const sisa_bayar = Math.max(0, harga - dp);

  sheet.appendRow([
    order_id,
    data.nama,
    data.wa,
    data.jenis,
    Number(data.halaman),
    data.deadline,
    data.note || "",
    "verifikasi tugas",
    data.tipe_order || "standar",
    harga,
    dp,
    sisa_bayar,
    "",
    "",
    "",
    "",
    created_at
  ]);

  return jsonResponse({ success: true, order_id: order_id });
}

// ============================================================
// Ambil satu order
// ============================================================
function handleGetOrder(order_id) {
  if (!order_id) return jsonResponse({ success: false, message: "order_id diperlukan" });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order_id) {
      return jsonResponse({ success: true, data: rowToObject(data[i]) });
    }
  }
  return jsonResponse({ success: false, message: "Order tidak ditemukan" });
}

// ============================================================
// Ambil semua order
// ============================================================
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

// ============================================================
// Update status
// ============================================================
function handleUpdateStatus(order_id, status) {
  if (!order_id || !status) return jsonResponse({ success: false, message: "order_id dan status diperlukan" });
  if (!VALID_STATUSES.includes(status)) return jsonResponse({ success: false, message: "Status tidak valid: " + status });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order_id) {
      sheet.getRange(i + 1, COLUMNS.STATUS).setValue(status);
      return jsonResponse({ success: true, message: "Status berhasil diupdate" });
    }
  }
  return jsonResponse({ success: false, message: "Order tidak ditemukan" });
}

// ============================================================
// Upload file ke Google Drive
// ============================================================
function handleUploadFile(order_id, tipe, fileBase64, fileName) {
  if (!order_id || !tipe || !fileBase64 || !fileName) {
    return jsonResponse({ success: false, message: "Parameter tidak lengkap" });
  }

  const VALID_TIPE = ["bukti_dp", "bukti_pelunasan", "file_tugas", "hasil"];
  if (!VALID_TIPE.includes(tipe)) {
    return jsonResponse({ success: false, message: "Tipe file tidak valid" });
  }

  const COLUMN_MAP = {
    file_tugas: COLUMNS.FILE_TUGAS_URL,
    bukti_dp: COLUMNS.BUKTI_DP_URL,
    bukti_pelunasan: COLUMNS.BUKTI_PELUNASAN_URL,
    hasil: COLUMNS.HASIL_URL
  };

  try {
    const folder = DriveApp.getRootFolder();
    const subFolder = getOrCreateFolder(folder, "JasaTugas-" + order_id);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(fileBase64),
      getMimeType(fileName),
      fileName
    );
    const file = subFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl = file.getUrl();

    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === order_id) {
        sheet.getRange(i + 1, COLUMN_MAP[tipe]).setValue(fileUrl);
        // Otomatis update status setelah upload bukti pembayaran
        if (tipe === "bukti_dp") {
          sheet.getRange(i + 1, COLUMNS.STATUS).setValue("verifikasi pembayaran");
        }
        if (tipe === "bukti_pelunasan") {
          sheet.getRange(i + 1, COLUMNS.STATUS).setValue("verifikasi pembayaran");
        }
        return jsonResponse({ success: true, url: fileUrl });
      }
    }
    return jsonResponse({ success: false, message: "Order tidak ditemukan" });
  } catch (err) {
    return jsonResponse({ success: false, message: "Gagal upload: " + err.message });
  }
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
    pdf: "application/pdf"
  };
  return types[ext] || "application/octet-stream";
}

// ============================================================
// Helper JSON response
// ============================================================
function jsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

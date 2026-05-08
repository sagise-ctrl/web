// ============================================================
// JASA TUGAS - Google Apps Script Backend
// ============================================================
// CARA DEPLOY:
// 1. Buka https://script.google.com dan buat project baru
// 2. Paste seluruh kode ini ke editor
// 3. Ganti SPREADSHEET_ID di bawah dengan ID Google Sheets kamu
// 4. Klik "Deploy" > "New deployment" > pilih tipe "Web app"
// 5. Execute as: "Me", Who has access: "Anyone"
// 6. Klik "Deploy" dan copy URL yang muncul
// 7. Paste URL tersebut ke environment variable VITE_GAS_URL di project Replit
// ============================================================

// GANTI dengan ID Google Sheets kamu
// (ambil dari URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit)
const SPREADSHEET_ID = "GANTI_DENGAN_SPREADSHEET_ID_KAMU";
const SHEET_NAME = "Orders";

// Kolom sesuai urutan di spreadsheet
const COLUMNS = {
  ORDER_ID: 1,
  NAMA: 2,
  WA: 3,
  JENIS: 4,
  HALAMAN: 5,
  DEADLINE: 6,
  NOTE: 7,
  STATUS: 8,
  CREATED_AT: 9
};

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "order_id", "nama", "wa", "jenis", "halaman",
      "deadline", "note", "status", "created_at"
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight("bold");
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
    created_at: row[8]
  };
}

// ============================================================
// Handler untuk GET requests
// ============================================================
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === "getOrder") {
      return handleGetOrder(e.parameter.order_id);
    } else if (action === "getAllOrders") {
      return handleGetAllOrders();
    } else {
      return jsonResponse({ success: false, message: "Action tidak dikenal: " + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: "Error: " + err.message });
  }
}

// ============================================================
// Handler untuk POST requests
// ============================================================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    
    if (action === "createOrder") {
      return handleCreateOrder(body.data);
    } else if (action === "updateStatus") {
      return handleUpdateStatus(body.order_id, body.status);
    } else {
      return jsonResponse({ success: false, message: "Action tidak dikenal: " + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: "Error: " + err.message });
  }
}

// ============================================================
// Fungsi: Buat order baru
// ============================================================
function handleCreateOrder(data) {
  if (!data.nama || !data.wa || !data.jenis || !data.halaman || !data.deadline) {
    return jsonResponse({ success: false, message: "Data tidak lengkap" });
  }
  
  const sheet = getSheet();
  const order_id = generateOrderId();
  const created_at = new Date().toISOString();
  
  sheet.appendRow([
    order_id,
    data.nama,
    data.wa,
    data.jenis,
    Number(data.halaman),
    data.deadline,
    data.note || "",
    "pending",
    created_at
  ]);
  
  return jsonResponse({ success: true, order_id: order_id });
}

// ============================================================
// Fungsi: Ambil satu order berdasarkan order_id
// ============================================================
function handleGetOrder(order_id) {
  if (!order_id) {
    return jsonResponse({ success: false, message: "order_id diperlukan" });
  }
  
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
// Fungsi: Ambil semua order
// ============================================================
function handleGetAllOrders() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return jsonResponse({ success: true, data: [] });
  }
  
  const orders = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      orders.push(rowToObject(data[i]));
    }
  }
  
  orders.sort((a, b) => {
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA;
  });
  
  return jsonResponse({ success: true, data: orders });
}

// ============================================================
// Fungsi: Update status order
// ============================================================
function handleUpdateStatus(order_id, status) {
  const validStatuses = ["pending", "proses", "selesai"];
  
  if (!order_id || !status) {
    return jsonResponse({ success: false, message: "order_id dan status diperlukan" });
  }
  
  if (!validStatuses.includes(status)) {
    return jsonResponse({ success: false, message: "Status tidak valid. Gunakan: pending, proses, atau selesai" });
  }
  
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
// Helper: Format JSON response dengan CORS headers
// ============================================================
function jsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

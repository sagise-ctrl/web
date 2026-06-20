// ============================================================
// JASA TUGAS - Google Apps Script Backend (v8)
// ============================================================
// ALUR STATUS:
// verifikasi tugas
// → menunggu pembayaran dp (admin approve)
// → proses pengerjaan (webhook Midtrans: DP paid)
// → menunggu pelunasan (admin upload hasil)
// → pelunasan diterima (webhook Midtrans: pelunasan paid)
// → cek file (otomatis)
// → revisi / selesai (customer konfirmasi)
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
  HASIL_URL: 14,
  CREATED_AT: 15,
  REVISI_CATATAN: 16,
  REVISI_FILE_URLS: 17,
  REVISI_COUNT: 18,
  ESTIMASI_SELESAI: 19,
  ESTIMASI_REVISI: 20,
  SNAP_TOKEN: 21,
  PAYMENT_DP_ID: 22,
  PAYMENT_FINAL_ID: 23,
  PENYESUAIAN_NOMINAL: 24,
  PENYESUAIAN_KETERANGAN: 25,
  CEK_FILE_AT: 26,
};

const VALID_STATUSES = [
  "verifikasi tugas",
  "menunggu pembayaran dp",
  "proses pengerjaan",
  "menunggu pelunasan",
  "pelunasan diterima",
  "cek file",
  "revisi",
  "selesai",
];

const VALID_JENIS = ["Makalah", "PPT", "Artikel", "Tugas Harian", "Test"];

// ─── Sheet ────────────────────────────────────────────────────
function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "order_id",
      "nama",
      "wa",
      "jenis",
      "halaman",
      "deadline",
      "note",
      "status",
      "tipe_order",
      "harga",
      "dp",
      "sisa_bayar",
      "file_tugas_url",
      "hasil_url",
      "created_at",
      "revisi_catatan",
      "revisi_file_urls",
      "revisi_count",
      "estimasi_selesai",
      "estimasi_revisi",
      "snap_token",
      "payment_dp_id",
      "payment_final_id",
    ]);
    sheet.getRange(1, 1, 1, 23).setFontWeight("bold");
  }
  return sheet;
}

function generateOrderId() {
  return "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function rowToObject(row) {
  const penyesuaianNominalRaw = row[COLUMNS.PENYESUAIAN_NOMINAL - 1];
  const penyesuaianNominalParsed =
    penyesuaianNominalRaw === "" || penyesuaianNominalRaw == null
      ? null
      : Number(penyesuaianNominalRaw);

  const penyesuaianNominal =
    penyesuaianNominalParsed === null || Number.isNaN(penyesuaianNominalParsed)
      ? null
      : penyesuaianNominalParsed;

  const penyesuaianKeteranganRaw = row[COLUMNS.PENYESUAIAN_KETERANGAN - 1];
  const penyesuaianKeterangan =
    penyesuaianKeteranganRaw == null ||
    String(penyesuaianKeteranganRaw).trim() === ""
      ? null
      : String(penyesuaianKeteranganRaw);

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
    hasil_url: row[13],
    created_at: row[14],
    revisi_catatan: row[15],
    revisi_file_urls: row[16],
    revisi_count: row[17] || 0,
    estimasi_selesai: row[18] || "",
    estimasi_revisi: row[19] || "",
    snap_token: row[20] || "",
    payment_dp_id: row[21] || "",
    payment_final_id: row[22] || "",
    penyesuaian_nominal: penyesuaianNominal,
    penyesuaian_keterangan: penyesuaianKeterangan,
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
    if (body.action === "updateStatus")
      return handleUpdateStatus(
        body.order_id,
        body.status,
        body.estimasi_selesai,
        body.harga,
        body.dp,
        body.sisa_bayar,
        body.penyesuaian_nominal,
        body.penyesuaian_keterangan,
      );
    if (body.action === "uploadFile")
      return handleUploadFile(
        body.order_id,
        body.tipe,
        body.fileBase64,
        body.fileName,
      );
    if (body.action === "submitRevisi")
      return handleSubmitRevisi(
        body.order_id,
        body.catatan,
        body.files,
        body.estimasi_revisi,
      );
    if (body.action === "markSelesai") return handleMarkSelesai(body.order_id);
    if (body.action === "updatePayment")
      return handleUpdatePayment(body.order_id, body.tipe, body.transaction_id);
    if (body.action === "saveSnapToken")
      return handleSaveSnapToken(body.order_id, body.snap_token);
    if (body.action === "updatePaymentStatus")
      return handleUpdatePaymentStatus(body.data);
    return jsonResponse({ success: false, message: "Action tidak dikenal" });
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

// ─── Check WA ─────────────────────────────────────────────────
function handleCheckWa(wa) {
  if (!wa) return jsonResponse({ success: false, message: "WA diperlukan" });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(wa)) {
      return jsonResponse({
        success: true,
        data: { exists: true, nama_sebelumnya: data[i][1] },
      });
    }
  }
  return jsonResponse({ success: true, data: { exists: false } });
}

// ─── Create Order ─────────────────────────────────────────────
function handleCreateOrder(data) {
  if (!data.nama || !data.wa || !data.jenis || !data.halaman) {
    return jsonResponse({ success: false, message: "Data tidak lengkap" });
  }
  if (!VALID_JENIS.includes(data.jenis)) {
    return jsonResponse({ success: false, message: "Jenis tugas tidak valid" });
  }
  const sheet = getSheet();
  const order_id = generateOrderId();
  const harga = Number(data.harga) || 0;
  const dp = Math.ceil(harga * 0.33);
  const sisa_bayar = harga - dp;

  sheet.appendRow([
    order_id,
    data.nama,
    data.wa,
    data.jenis,
    Number(data.halaman),
    data.deadline || "",
    data.note || "",
    "verifikasi tugas",
    data.tipe_order || "standar",
    harga,
    dp,
    sisa_bayar,
    "",
    "",
    new Date().toISOString(),
    "",
    "",
    0,
    "",
    "",
    "",
    "",
    "belum_bayar",
  ]);
  return jsonResponse({ success: true, order_id });
}

// ─── Get Order ────────────────────────────────────────────────
function handleGetOrder(order_id) {
  if (!order_id)
    return jsonResponse({ success: false, message: "order_id diperlukan" });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order_id)
      return jsonResponse({ success: true, data: rowToObject(data[i]) });
  }
  return jsonResponse({ success: false, message: "Order tidak ditemukan" });
}

// ─── Get All Orders ───────────────────────────────────────────
function handleGetAllOrders() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ success: true, data: [] });
  const orders = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) orders.push(rowToObject(data[i]));
  }
  orders.sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );
  return jsonResponse({ success: true, data: orders });
}

// ─── Update Status (admin) ────────────────────────────────────
function handleUpdateStatus(
  order_id,
  status,
  estimasi_selesai,
  harga,
  dp,
  sisa_bayar,
  penyesuaian_nominal,
  penyesuaian_keterangan,
) {
  if (!order_id || !status)
    return jsonResponse({ success: false, message: "Parameter kurang" });
  if (!VALID_STATUSES.includes(status))
    return jsonResponse({
      success: false,
      message: "Status tidak valid: " + status,
    });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order_id) {
      sheet.getRange(i + 1, COLUMNS.STATUS).setValue(status);
      if (status === "proses pengerjaan" && estimasi_selesai) {
        sheet
          .getRange(i + 1, COLUMNS.ESTIMASI_SELESAI)
          .setValue(estimasi_selesai);
      }
      if (harga !== undefined && harga !== null) {
        sheet.getRange(i + 1, COLUMNS.HARGA).setValue(harga);
      }
      if (dp !== undefined && dp !== null) {
        sheet.getRange(i + 1, COLUMNS.DP).setValue(dp);
      }
      if (sisa_bayar !== undefined && sisa_bayar !== null) {
        sheet.getRange(i + 1, COLUMNS.SISA_BAYAR).setValue(sisa_bayar);
      }
      if (penyesuaian_nominal !== undefined && penyesuaian_nominal !== null) {
        sheet
          .getRange(i + 1, COLUMNS.PENYESUAIAN_NOMINAL)
          .setValue(penyesuaian_nominal);
      }
      if (penyesuaian_keterangan) {
        sheet
          .getRange(i + 1, COLUMNS.PENYESUAIAN_KETERANGAN)
          .setValue(penyesuaian_keterangan);
      }
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, message: "Order tidak ditemukan" });
}

// ─── Update Payment (dipanggil webhook Midtrans) ──────────────
// tipe: "dp" atau "final"
function handleUpdatePayment(order_id, tipe, transaction_id) {
  if (!order_id || !tipe)
    return jsonResponse({ success: false, message: "Parameter kurang" });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order_id) {
      const currentStatus = data[i][7];

      if (tipe === "dp") {
        // Pastikan status saat ini memang menunggu DP
        if (currentStatus !== "menunggu pembayaran dp") {
          return jsonResponse({
            success: false,
            message: "Status order tidak sesuai untuk pembayaran DP",
          });
        }
        sheet.getRange(i + 1, COLUMNS.STATUS).setValue("proses pengerjaan");
        // Kalkulasi estimasi selesai otomatis
        var jenis = data[i][COLUMNS.JENIS - 1];
        var halaman = Number(data[i][COLUMNS.HALAMAN - 1]) || 1;
        var tipeOrder = data[i][COLUMNS.TIPE_ORDER - 1] || "standar";
        var jamTotal = 0;
        if (jenis === "Makalah" || jenis === "Artikel") {
          jamTotal = 3 * 24 + (halaman - 10) * 2;
        } else if (jenis === "PPT") {
          jamTotal = 4 * 24 + (halaman - 5) * 2.5;
        } else if (jenis === "Tugas Harian") {
          jamTotal = 3 * 24 + (halaman - 2) * 3;
        } else {
          jamTotal = 3 * 24;
        }
        if (tipeOrder === "ekspres") jamTotal -= 24;
        if (tipeOrder === "super ekspres") jamTotal -= 48;
        var estimasiSelesai = new Date(
          new Date().getTime() + jamTotal * 60 * 60 * 1000,
        );
        sheet
          .getRange(i + 1, COLUMNS.ESTIMASI_SELESAI)
          .setValue(estimasiSelesai.toISOString());
        sheet
          .getRange(i + 1, COLUMNS.PAYMENT_DP_ID)
          .setValue(transaction_id || "");
        sheet.getRange(i + 1, COLUMNS.SNAP_TOKEN).setValue(""); // clear token
      } else if (tipe === "final") {
        // Pastikan status saat ini memang menunggu pelunasan
        if (currentStatus !== "menunggu pelunasan") {
          return jsonResponse({
            success: false,
            message: "Status order tidak sesuai untuk pelunasan",
          });
        }
        sheet.getRange(i + 1, COLUMNS.STATUS).setValue("cek file");
        sheet
          .getRange(i + 1, COLUMNS.PAYMENT_FINAL_ID)
          .setValue(transaction_id || "");
        sheet.getRange(i + 1, COLUMNS.SNAP_TOKEN).setValue(""); // clear token
      }

      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, message: "Order tidak ditemukan" });
}

// ─── Save Snap Token ──────────────────────────────────────────
function handleSaveSnapToken(order_id, snap_token) {
  if (!order_id || !snap_token)
    return jsonResponse({ success: false, message: "Parameter kurang" });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order_id) {
      sheet.getRange(i + 1, COLUMNS.SNAP_TOKEN).setValue(snap_token);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, message: "Order tidak ditemukan" });
}

// ─── Upload File ──────────────────────────────────────────────
// file_tugas → tidak ubah status
// hasil      → menunggu pelunasan (admin upload hasil)
// hasil_revisi → cek file
function handleUploadFile(order_id, tipe, fileBase64, fileName) {
  if (!order_id || !tipe || !fileBase64 || !fileName) {
    return jsonResponse({ success: false, message: "Parameter tidak lengkap" });
  }
  const VALID_TIPE = ["file_tugas", "hasil"];
  if (!VALID_TIPE.includes(tipe)) {
    return jsonResponse({ success: false, message: "Tipe tidak valid" });
  }

  try {
    const folder = DriveApp.getRootFolder();
    const sub = getOrCreateFolder(folder, "JasaTugas-" + order_id);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(fileBase64),
      getMimeType(fileName),
      fileName,
    );
    const file = sub.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl =
      "https://drive.google.com/uc?export=download&id=" + file.getId();

    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === order_id) {
        if (tipe === "file_tugas") {
          sheet.getRange(i + 1, COLUMNS.FILE_TUGAS_URL).setValue(fileUrl);
          // tidak ubah status
        } else if (tipe === "hasil") {
          sheet.getRange(i + 1, COLUMNS.HASIL_URL).setValue(fileUrl);
          const currentStatus = data[i][7];
          if (currentStatus === "proses pengerjaan") {
            // Hasil pertama → minta pelunasan
            sheet
              .getRange(i + 1, COLUMNS.STATUS)
              .setValue("menunggu pelunasan");
          } else if (currentStatus === "revisi") {
            // Hasil revisi → langsung cek file
            sheet.getRange(i + 1, COLUMNS.STATUS).setValue("cek file");
          }
        }

        return jsonResponse({ success: true, url: fileUrl });
      }
    }
    return jsonResponse({ success: false, message: "Order tidak ditemukan" });
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Gagal upload: " + err.message,
    });
  }
}

// ─── Submit Revisi ────────────────────────────────────────────
function handleSubmitRevisi(order_id, catatan, files, estimasi_revisi) {
  if (!order_id)
    return jsonResponse({ success: false, message: "order_id diperlukan" });
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order_id) {
      const revisiCount = Number(data[i][17]) || 0;
      if (revisiCount >= 1) {
        return jsonResponse({
          success: false,
          message: "Revisi gratis sudah habis (maks 1 kali)",
        });
      }

      const uploadedUrls = [];
      if (files && files.length > 0) {
        const sub = getOrCreateFolder(
          DriveApp.getRootFolder(),
          "JasaTugas-" + order_id,
        );
        for (const f of files) {
          try {
            const blob = Utilities.newBlob(
              Utilities.base64Decode(f.base64),
              getMimeType(f.name),
              "revisi_" + f.name,
            );
            const file = sub.createFile(blob);
            file.setSharing(
              DriveApp.Access.ANYONE_WITH_LINK,
              DriveApp.Permission.VIEW,
            );
            uploadedUrls.push(file.getUrl());
          } catch (e) {
            /* lanjut */
          }
        }
      }

      sheet.getRange(i + 1, COLUMNS.REVISI_CATATAN).setValue(catatan || "");
      sheet
        .getRange(i + 1, COLUMNS.REVISI_FILE_URLS)
        .setValue(uploadedUrls.join(","));
      sheet.getRange(i + 1, COLUMNS.REVISI_COUNT).setValue(revisiCount + 1);
      sheet.getRange(i + 1, COLUMNS.STATUS).setValue("revisi");
      var estimasiRevisi = new Date(new Date().getTime() + 12 * 60 * 60 * 1000);
      sheet
        .getRange(i + 1, COLUMNS.ESTIMASI_REVISI)
        .setValue(estimasiRevisi.toISOString());
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, message: "Order tidak ditemukan" });
}

// ─── Mark Selesai ─────────────────────────────────────────────
function handleMarkSelesai(order_id) {
  if (!order_id)
    return jsonResponse({ success: false, message: "order_id diperlukan" });
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

// ─── Update Payment Status (custom) ───────────────────────────
function handleUpdatePaymentStatus(data) {
  if (!data || !data.order_id) {
    return jsonResponse({ success: false, message: "order_id diperlukan" });
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.order_id) {
      if (data.tipe === "dp") {
        sheet.getRange(i + 1, 22).setValue(data.mayar_transaction_id || "");
        sheet.getRange(i + 1, 8).setValue("proses pengerjaan");
        // Kalkulasi estimasi selesai otomatis
        var jenis = rows[i][COLUMNS.JENIS - 1];
        var halaman = Number(rows[i][COLUMNS.HALAMAN - 1]) || 1;
        var tipeOrder = rows[i][COLUMNS.TIPE_ORDER - 1] || "standar";
        var jamTotal = 0;
        if (jenis === "Makalah" || jenis === "Artikel") {
          jamTotal = 3 * 24 + (halaman - 10) * 2;
        } else if (jenis === "PPT") {
          jamTotal = 4 * 24 + (halaman - 5) * 2.5;
        } else if (jenis === "Tugas Harian") {
          jamTotal = 3 * 24 + (halaman - 2) * 3;
        } else {
          jamTotal = 3 * 24;
        }
        if (tipeOrder === "ekspres") jamTotal -= 24;
        if (tipeOrder === "super ekspres") jamTotal -= 48;
        var estimasiSelesai = new Date(
          new Date().getTime() + jamTotal * 60 * 60 * 1000,
        );
        sheet
          .getRange(i + 1, COLUMNS.ESTIMASI_SELESAI)
          .setValue(estimasiSelesai.toISOString());
      } else if (data.tipe === "final") {
        sheet.getRange(i + 1, 23).setValue(data.mayar_transaction_id || "");
        sheet.getRange(i + 1, 8).setValue("cek file");
        sheet
          .getRange(i + 1, COLUMNS.CEK_FILE_AT)
          .setValue(new Date().toISOString());
      }
      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ success: false, message: "order_id tidak ditemukan" });
}

// ─── Helpers ──────────────────────────────────────────────────
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

// ─── Auto Close Orders ────────────────────────────────────────
function autoCloseOrders() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  const BATAS_HARI = 3;

  for (let i = 1; i < data.length; i++) {
    const status = data[i][COLUMNS.STATUS - 1];
    const cekFileAt = data[i][COLUMNS.CEK_FILE_AT - 1];

    if (status !== "cek file") continue;
    if (!cekFileAt) continue;

    const cekFileDate = new Date(cekFileAt);
    const selisihHari = (now - cekFileDate) / (1000 * 60 * 60 * 24);

    if (selisihHari >= BATAS_HARI) {
      sheet.getRange(i + 1, COLUMNS.STATUS).setValue("selesai");
    }
  }
}

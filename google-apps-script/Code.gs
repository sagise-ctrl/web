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
const ADMIN_TOKENS_SHEET = "admin_tokens";
const USERS_SHEET = "users";
const USER_ORDERS_SHEET = "user_orders";
const AFFILIATES_SHEET = "affiliates";
const AFFILIATE_COMMISSIONS_SHEET = "affiliate_commissions";
const WITHDRAWAL_REQUESTS_SHEET = "withdrawal_requests";
const REFERRAL_USAGE_SHEET = "referral_usage";

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
  USER_ID_REF: 27,
  POIN_DIPAKAI: 28,
};

const USER_COLUMNS = {
  USER_ID: 1,
  NAMA: 2,
  WA: 3,
  KODE_REFERRAL: 4,
  STATUS: 5,
  SALDO_POIN: 6,
  CREATED_AT: 7,
  APPROVED_AT: 8,
  WA_SENT: 9,
};

const AFFILIATE_COLUMNS = {
  AFFILIATE_ID: 1,
  KODE_REFERRAL: 2,
  NAMA: 3,
  WA: 4,
  STATUS: 5,
  SALDO_KOMISI: 6,
  CREATED_AT: 7,
  APPROVED_AT: 8,
  WA_SENT: 9,
  REKENING_BANK: 10,
  NOMOR_REKENING: 11,
  ATAS_NAMA: 12,
  REKENING_STATUS: 13,
  REKENING_UPDATED_AT: 14,
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
      "",
      "",
      "",
      "user_id",
    ]);
    sheet.getRange(1, 1, 1, 27).setFontWeight("bold");
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
    if (action === "getAllTokens") return handleGetAllTokens();
    if (action === "getUserAccount")
      return handleGetUserAccount(e.parameter.user_id);
    if (action === "getAffiliateAccount")
      return handleGetAffiliateAccount(e.parameter.affiliate_id);
    if (action === "getAllUsers") return handleGetAllUsers();
    if (action === "getAllAffiliates") return handleGetAllAffiliates();
    if (action === "getWithdrawalHistory")
      return handleGetWithdrawalHistory(e.parameter.affiliate_id);
    if (action === "getAllWithdrawals") return handleGetAllWithdrawals();
    if (action === "checkWa") return handleCheckWa(e.parameter.wa);
    if (action === "getUserOrders") return handleGetUserOrders(e.parameter.user_id);

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
    if (body.action === "registerUser") return handleRegisterUser(body.data);
    if (body.action === "approveUser") return handleApproveUser(body.user_id);
    if (body.action === "deactivateUser") return handleDeactivateUser(body.user_id);
    if (body.action === "activateUser") return handleActivateUser(body.user_id);
    if (body.action === "registerAffiliate")
      return handleRegisterAffiliate(body.data);
    if (body.action === "approveAffiliate")
      return handleApproveAffiliate(body.affiliate_id);
    if (body.action === "deactivateAffiliate")
      return handleDeactivateAffiliate(body.affiliate_id);
    if (body.action === "activateAffiliate")
      return handleActivateAffiliate(body.affiliate_id);
    if (body.action === "requestWithdrawal")
      return handleRequestWithdrawal(body.data);
    if (body.action === "approveWithdrawal")
      return handleApproveWithdrawal(body.withdrawal_id, body.action_type);
    if (body.action === "saveRekening") return handleSaveRekening(body.data);
    if (body.action === "approveRekening")
      return handleApproveRekening(body.affiliate_id);
    if (body.action === "registerToken") return handleRegisterToken(body.token);
    if (body.action === "deleteToken") return handleDeleteToken(body.token);
    if (body.action === "markWaSent")
      return handleMarkWaSent(body.type, body.id);

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

  // Kalkulasi harga final dengan diskon
  var hargaFinal = Number(data.harga) || 0;
  var dpFinal = Number(data.dp) || Math.ceil(hargaFinal * 0.33);
  var sisaBayarFinal =
    Number(data.sisa_bayar) || Math.max(0, hargaFinal - dpFinal);

  // Validasi diskon referral jika ada user_id
  if (data.user_id && data.pakai_diskon_referral) {
    var userSheet = getUserSheet();
    var userRows = userSheet.getDataRange().getValues();
    var userFound = false;
    for (var u = 1; u < userRows.length; u++) {
      if (userRows[u][0] === data.user_id) {
        userFound = true;
        var kodeReferral = userRows[u][USER_COLUMNS.KODE_REFERRAL - 1];
        if (!kodeReferral) {
          return jsonResponse({
            success: false,
            message: "User tidak memiliki kode referral",
          });
        }
        // Cek belum pernah order
        var uoSheet = getUserOrdersSheet();
        var uoRows = uoSheet.getDataRange().getValues();
        var orderCount = 0;
        for (var uo = 1; uo < uoRows.length; uo++) {
          if (uoRows[uo][0] === data.user_id) orderCount++;
        }
        if (orderCount > 0) {
          return jsonResponse({
            success: false,
            message: "Diskon referral hanya berlaku untuk order pertama",
          });
        }
        break;
      }
    }
    if (!userFound) {
      return jsonResponse({
        success: false,
        message: "User ID tidak ditemukan",
      });
    }
  }

  const sheet = getSheet();
  const order_id = generateOrderId();
  const harga = hargaFinal;
  const dp = dpFinal;
  const sisa_bayar = sisaBayarFinal;

  sheet.appendRow([
    order_id,
    data.nama,
    "'" + String(data.wa),
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
    "",
    "",
    "",
    data.user_id || "",
    data.poin_dipakai || 0,
  ]);

  sendAdminNotification(
    "🆕 Order Baru",
    `${data.nama} membuat order ${order_id}`,
    {
      type: "order",
      order_id: String(order_id),
    },
  );

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
        if (currentStatus !== "menunggu pembayaran dp") {
          return jsonResponse({
            success: false,
            message: "Status order tidak sesuai untuk pembayaran DP",
          });
        }
        sheet.getRange(i + 1, COLUMNS.STATUS).setValue("proses pengerjaan");

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
        sheet.getRange(i + 1, COLUMNS.SNAP_TOKEN).setValue("");
      } else if (tipe === "final") {
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
        sheet.getRange(i + 1, COLUMNS.SNAP_TOKEN).setValue("");
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
        } else if (tipe === "hasil") {
          sheet.getRange(i + 1, COLUMNS.HASIL_URL).setValue(fileUrl);
          const currentStatus = data[i][7];
          if (currentStatus === "proses pengerjaan") {
            sheet
              .getRange(i + 1, COLUMNS.STATUS)
              .setValue("menunggu pelunasan");
          } else if (currentStatus === "revisi") {
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

      sendAdminNotification("🔄 Revisi Baru", `${order_id} mengirim revisi`, {
        type: "revision",
        order_id: String(order_id),
      });
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

        var namaCustomer = rows[i][COLUMNS.NAMA - 1] || data.order_id;
        sendAdminNotification(
          "DP Masuk",
          `${namaCustomer} (${data.order_id}) telah membayar DP`,
          {
            type: "payment",
            payment: "dp",
            order_id: String(data.order_id),
          },
        );
      } else if (data.tipe === "final") {
        sheet.getRange(i + 1, 23).setValue(data.mayar_transaction_id || "");
        sheet.getRange(i + 1, 8).setValue("cek file");
        sheet
          .getRange(i + 1, COLUMNS.CEK_FILE_AT)
          .setValue(new Date().toISOString());

        var userIdRef = rows[i][COLUMNS.USER_ID_REF - 1] || "";
        if (userIdRef) {
          var poinDipakai = Number(rows[i][COLUMNS.POIN_DIPAKAI - 1]) || 0;
          handleOrderLunas(data.order_id, userIdRef, Number(rows[i][COLUMNS.HARGA - 1]), poinDipakai);
        }

        var namaCustomerFinal = rows[i][COLUMNS.NAMA - 1] || data.order_id;
        sendAdminNotification(
          "Pelunasan Masuk",
          `${namaCustomerFinal} (${data.order_id}) telah melakukan pelunasan`,
          {
            type: "payment",
            payment: "lunas",
            order_id: String(data.order_id),
          },
        );
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

function sendAdminNotification(title, body, data) {
  try {
    const url = "https://tugasly.my.id/api/notify";
    const payload = {
      title: title,
      body: body,
      data: data || {},
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    const res = UrlFetchApp.fetch(url, options);
    Logger.log(res.getContentText());
    return res;
  } catch (err) {
    Logger.log(err);
    return null;
  }
}

function jsonResponse(data) {
  const out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

// ─── Get or Create Admin Tokens Sheet ────────────────────────
function getTokenSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(ADMIN_TOKENS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ADMIN_TOKENS_SHEET);
    sheet.getRange(1, 1).setValue("token");
    sheet.getRange(1, 2).setValue("created_at");
  }
  return sheet;
}

// ─── Register Admin Token ─────────────────────────────────────
function handleRegisterToken(token) {
  if (!token)
    return jsonResponse({ success: false, message: "token diperlukan" });
  const sheet = getTokenSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      return jsonResponse({ success: true, message: "token sudah terdaftar" });
    }
  }
  sheet.appendRow([token, new Date().toISOString()]);
  return jsonResponse({ success: true, message: "token berhasil didaftarkan" });
}

// ─── Get All Admin Tokens ─────────────────────────────────────
function handleGetAllTokens() {
  const sheet = getTokenSheet();
  const data = sheet.getDataRange().getValues();
  const tokens = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) tokens.push(data[i][0]);
  }
  return jsonResponse({ success: true, tokens });
}

// ─── Delete Admin Token ───────────────────────────────────────
function handleDeleteToken(token) {
  if (!token)
    return jsonResponse({ success: false, message: "token diperlukan" });
  const sheet = getTokenSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: "token dihapus" });
    }
  }
  return jsonResponse({ success: false, message: "token tidak ditemukan" });
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

// ─── Sheet Helpers ────────────────────────────────────────────
function getUserSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(USERS_SHEET);
}

function getUserOrdersSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(USER_ORDERS_SHEET);
}

function getAffiliateSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(AFFILIATES_SHEET);
}

function getAffiliateCommissionsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(AFFILIATE_COMMISSIONS_SHEET);
}

function getWithdrawalSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(WITHDRAWAL_REQUESTS_SHEET);
}

function getReferralUsageSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(REFERRAL_USAGE_SHEET);
}

// ─── Generate ID ──────────────────────────────────────────────
function generateUserId() {
  return "USR-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function generateAffiliateId() {
  return "AFF-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function generateReferralCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "REF-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateWithdrawalId() {
  return "WD-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

// ─── User Registration ────────────────────────────────────────
function handleRegisterUser(data) {
  if (!data.nama || !data.wa)
    return jsonResponse({ success: false, message: "Nama dan WA wajib diisi" });

  const sheet = getUserSheet();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][2]) === String(data.wa)) {
      return jsonResponse({
        success: false,
        message: "Nomor WA sudah terdaftar",
      });
    }
  }

  if (data.kode_referral) {
    const affSheet = getAffiliateSheet();
    const affRows = affSheet.getDataRange().getValues();
    let validReferral = false;
    for (let i = 1; i < affRows.length; i++) {
      if (
        affRows[i][1] === data.kode_referral &&
        affRows[i][AFFILIATE_COLUMNS.STATUS - 1] === "active"
      ) {
        if (String(affRows[i][3]) === String(data.wa)) {
          return jsonResponse({
            success: false,
            message: "Tidak bisa pakai kode referral sendiri",
          });
        }
        validReferral = true;
        break;
      }
    }
    if (!validReferral) {
      return jsonResponse({
        success: false,
        message: "Kode referral tidak valid atau tidak aktif",
      });
    }

    const refSheet = getReferralUsageSheet();
    const refRows = refSheet.getDataRange().getValues();
    for (let i = 1; i < refRows.length; i++) {
      if (String(refRows[i][3]) === String(data.wa)) {
        return jsonResponse({
          success: false,
          message: "WA ini sudah pernah pakai kode referral",
        });
      }
    }
  }

  const userId = generateUserId();
  sheet.appendRow([
    userId,
    data.nama,
    "'" + String(data.wa),
    data.kode_referral || "",
    "pending",
    0,
    new Date().toISOString(),
    "",
    false,
  ]);

  return jsonResponse({
    success: true,
    user_id: userId,
    message: "Registrasi berhasil, tunggu konfirmasi admin via WA",
  });
}

// ─── Approve User (Admin) ─────────────────────────────────────
function handleApproveUser(user_id) {
  if (!user_id)
    return jsonResponse({ success: false, message: "user_id diperlukan" });

  const sheet = getUserSheet();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === user_id) {
      if (rows[i][4] === "active") {
        return jsonResponse({ success: false, message: "User sudah aktif" });
      }

      sheet.getRange(i + 1, 5).setValue("active");
      sheet.getRange(i + 1, 8).setValue(new Date().toISOString());

      const kodeReferral = rows[i][3];
      if (kodeReferral) {
        const affSheet = getAffiliateSheet();
        const affRows = affSheet.getDataRange().getValues();
        let affiliateId = "";
        for (let j = 1; j < affRows.length; j++) {
          if (affRows[j][1] === kodeReferral) {
            affiliateId = affRows[j][0];
            break;
          }
        }
        const refSheet = getReferralUsageSheet();
        refSheet.appendRow([
          kodeReferral,
          affiliateId,
          user_id,
          String(rows[i][2]),
          new Date().toISOString(),
        ]);
      }

      return jsonResponse({
        success: true,
        message: "User berhasil diaktifkan",
      });
    }
  }

  return jsonResponse({ success: false, message: "User tidak ditemukan" });
}

// ─── Get User Account ─────────────────────────────────────────
function handleGetUserAccount(user_id) {
  if (!user_id)
    return jsonResponse({ success: false, message: "user_id diperlukan" });

  const sheet = getUserSheet();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === user_id) {
      if (rows[i][USER_COLUMNS.STATUS - 1] === "inactive") {
        return jsonResponse({
          success: false,
          message: "Akun non-aktif, hubungi CS untuk informasi lebih lanjut",
          code: "INACTIVE",
        });
      }
      if (rows[i][USER_COLUMNS.STATUS - 1] !== "active") {
        return jsonResponse({ success: false, message: "Akun belum aktif" });
      }

      const uoSheet = getUserOrdersSheet();
      const uoRows = uoSheet.getDataRange().getValues();
      const orders = [];
      for (let j = 1; j < uoRows.length; j++) {
        if (uoRows[j][0] === user_id) {
          orders.push({
            order_id: uoRows[j][1],
            harga_order: uoRows[j][2],
            poin_dipakai: uoRows[j][3],
            diskon_poin: uoRows[j][4],
            harga_dibayar: uoRows[j][5],
            poin_didapat: uoRows[j][6],
            created_at: uoRows[j][7],
          });
        }
      }

      // Hitung jumlah order user dari user_orders sheet
      const uoSheet2 = getUserOrdersSheet();
      const uoRows2 = uoSheet2.getDataRange().getValues();
      let orderCount = 0;
      for (let j = 1; j < uoRows2.length; j++) {
        if (uoRows2[j][0] === user_id) orderCount++;
      }

      // Eligible diskon referral: punya kode referral dan belum pernah order
      const eligibleReferralDiscount =
        !!rows[i][USER_COLUMNS.KODE_REFERRAL - 1] && orderCount === 0;

      return jsonResponse({
        success: true,
        data: {
          user_id: rows[i][0],
          nama: rows[i][1],
          wa: rows[i][2],
          kode_referral: rows[i][3],
          saldo_poin: rows[i][5],
          created_at: rows[i][6],
          orders,
          order_count: orderCount,
          eligible_referral_discount: eligibleReferralDiscount,
        },
      });
    }
  }

  return jsonResponse({
    success: false,
    message: "User tidak ditemukan atau belum aktif",
  });
}

// ─── Affiliate Registration ───────────────────────────────────
function handleRegisterAffiliate(data) {
  if (!data.nama || !data.wa)
    return jsonResponse({ success: false, message: "Nama dan WA wajib diisi" });

  const sheet = getAffiliateSheet();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][3]) === String(data.wa)) {
      return jsonResponse({
        success: false,
        message: "Nomor WA sudah terdaftar sebagai affiliate",
      });
    }
  }

  const affiliateId = generateAffiliateId();
  const kodeReferral = generateReferralCode();

  sheet.appendRow([
    affiliateId,
    kodeReferral,
    data.nama,
    "'" + String(data.wa),
    "pending",
    0,
    new Date().toISOString(),
    "",
    false,
  ]);

  return jsonResponse({
    success: true,
    message: "Registrasi affiliate berhasil, tunggu konfirmasi admin via WA",
  });
}

// ─── Approve Affiliate (Admin) ───────────────────────────────
function handleApproveAffiliate(affiliate_id) {
  if (!affiliate_id)
    return jsonResponse({ success: false, message: "affiliate_id diperlukan" });

  const sheet = getAffiliateSheet();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === affiliate_id) {
      if (rows[i][4] === "active") {
        return jsonResponse({
          success: false,
          message: "Affiliate sudah aktif",
        });
      }
      sheet.getRange(i + 1, 5).setValue("active");
      sheet.getRange(i + 1, 8).setValue(new Date().toISOString());
      return jsonResponse({
        success: true,
        affiliate_id,
        kode_referral: rows[i][1],
        message: "Affiliate berhasil diaktifkan",
      });
    }
  }

  return jsonResponse({ success: false, message: "Affiliate tidak ditemukan" });
}

// ─── Get Affiliate Account ───────────────────────────────────
function handleGetAffiliateAccount(affiliate_id) {
  if (!affiliate_id)
    return jsonResponse({ success: false, message: "affiliate_id diperlukan" });

  const sheet = getAffiliateSheet();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === affiliate_id) {
      if (rows[i][AFFILIATE_COLUMNS.STATUS - 1] === "inactive") {
        return jsonResponse({
          success: false,
          message: "Akun non-aktif, hubungi CS untuk informasi lebih lanjut",
          code: "INACTIVE",
        });
      }
      if (rows[i][AFFILIATE_COLUMNS.STATUS - 1] !== "active") {
        return jsonResponse({ success: false, message: "Akun belum aktif" });
      }

      const commSheet = getAffiliateCommissionsSheet();
      const commRows = commSheet.getDataRange().getValues();
      const commissions = [];
      for (let j = 1; j < commRows.length; j++) {
        if (commRows[j][0] === affiliate_id) {
          commissions.push({
            user_id: commRows[j][1],
            order_id: commRows[j][2],
            order_ke: commRows[j][3],
            harga_order: commRows[j][4],
            persen_komisi: commRows[j][5],
            nominal_komisi: commRows[j][6],
            created_at: commRows[j][7],
          });
        }
      }

      return jsonResponse({
        success: true,
        data: {
          affiliate_id: rows[i][0],
          kode_referral: rows[i][1],
          nama: rows[i][2],
          wa: rows[i][3],
          saldo_komisi: rows[i][5],
          rekening_bank: rows[i][AFFILIATE_COLUMNS.REKENING_BANK - 1] || "",
          nomor_rekening: rows[i][AFFILIATE_COLUMNS.NOMOR_REKENING - 1] || "",
          atas_nama: rows[i][AFFILIATE_COLUMNS.ATAS_NAMA - 1] || "",
          rekening_status: rows[i][AFFILIATE_COLUMNS.REKENING_STATUS - 1] || "",
          rekening_updated_at:
            rows[i][AFFILIATE_COLUMNS.REKENING_UPDATED_AT - 1] || "",
          commissions,
        },
      });
    }
  }

  return jsonResponse({
    success: false,
    message: "Affiliate tidak ditemukan atau belum aktif",
  });
}

// ─── Hitung Komisi ────────────────────────────────────────────
function hitungKomisiAffiliate(orderKe) {
  if (orderKe < 1 || orderKe > 10) return 0;
  return (30 - (orderKe - 1) * 3) / 100;
}

// ─── Proses Poin & Komisi setelah Order Lunas ────────────────
function handleOrderLunas(order_id, user_id, harga_order, poin_dipakai) {
  if (!order_id || !user_id) return;

  // Cek status user - kalau inactive, skip poin dan komisi
  const userSheet0 = getUserSheet();
  const userRows0 = userSheet0.getDataRange().getValues();
  let userActive = false;
  for (let i = 1; i < userRows0.length; i++) {
    if (userRows0[i][0] === user_id) {
      userActive = userRows0[i][USER_COLUMNS.STATUS - 1] === "active";
      break;
    }
  }
  if (!userActive) return; // user inactive, skip semua

  const diskon_poin = poin_dipakai * 1000;
  const harga_dibayar = harga_order - diskon_poin;
  const poin_didapat = Math.floor(harga_order / 15000);

  const userSheet = getUserSheet();
  const userRows = userSheet.getDataRange().getValues();
  for (let i = 1; i < userRows.length; i++) {
    if (userRows[i][0] === user_id) {
      const saldoSekarang = Number(userRows[i][5]) || 0;
      const saldoBaru = saldoSekarang - poin_dipakai + poin_didapat;
      userSheet.getRange(i + 1, 6).setValue(saldoBaru);
      break;
    }
  }

  const uoSheet = getUserOrdersSheet();
  uoSheet.appendRow([
    user_id,
    order_id,
    harga_order,
    poin_dipakai,
    diskon_poin,
    harga_dibayar,
    poin_didapat,
    new Date().toISOString(),
  ]);

  const userSheet2 = getUserSheet();
  const userRows2 = userSheet2.getDataRange().getValues();
  let kodeReferral = "";
  for (let i = 1; i < userRows2.length; i++) {
    if (userRows2[i][0] === user_id) {
      kodeReferral = userRows2[i][3];
      break;
    }
  }

  if (!kodeReferral) return;

  const affSheet = getAffiliateSheet();
  const affRows = affSheet.getDataRange().getValues();
  let affiliateId = "";
  for (let i = 1; i < affRows.length; i++) {
    if (affRows[i][1] === kodeReferral) {
      affiliateId = affRows[i][0];
      break;
    }
  }

  if (!affiliateId) return;

  const commSheet = getAffiliateCommissionsSheet();
  const commRows = commSheet.getDataRange().getValues();
  let orderKe = 1;
  for (let i = 1; i < commRows.length; i++) {
    if (commRows[i][0] === affiliateId && commRows[i][1] === user_id) {
      orderKe++;
    }
  }

  if (orderKe > 10) return;

  const persenKomisi = hitungKomisiAffiliate(orderKe);
  const nominalKomisi = Math.floor(harga_order * persenKomisi);

  commSheet.appendRow([
    affiliateId,
    user_id,
    order_id,
    orderKe,
    harga_order,
    persenKomisi * 100,
    nominalKomisi,
    new Date().toISOString(),
  ]);

  for (let i = 1; i < affRows.length; i++) {
    if (affRows[i][0] === affiliateId) {
      const saldoSekarang = Number(affRows[i][5]) || 0;
      affSheet.getRange(i + 1, 6).setValue(saldoSekarang + nominalKomisi);
      break;
    }
  }
}

// ─── Deactivate/Activate User ─────────────────────────────────
function handleDeactivateUser(user_id) {
  if (!user_id)
    return jsonResponse({ success: false, message: "user_id diperlukan" });
  const sheet = getUserSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === user_id) {
      sheet.getRange(i + 1, USER_COLUMNS.STATUS).setValue("inactive");
      return jsonResponse({
        success: true,
        message: "User berhasil dinonaktifkan",
      });
    }
  }
  return jsonResponse({ success: false, message: "User tidak ditemukan" });
}

function handleActivateUser(user_id) {
  if (!user_id)
    return jsonResponse({ success: false, message: "user_id diperlukan" });
  const sheet = getUserSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === user_id) {
      sheet.getRange(i + 1, USER_COLUMNS.STATUS).setValue("active");
      return jsonResponse({ success: true, message: "User berhasil diaktifkan" });
    }
  }
  return jsonResponse({ success: false, message: "User tidak ditemukan" });
}

// ─── Deactivate/Activate Affiliate ───────────────────────────
function handleDeactivateAffiliate(affiliate_id) {
  if (!affiliate_id)
    return jsonResponse({ success: false, message: "affiliate_id diperlukan" });
  const sheet = getAffiliateSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === affiliate_id) {
      sheet.getRange(i + 1, AFFILIATE_COLUMNS.STATUS).setValue("inactive");
      return jsonResponse({
        success: true,
        message: "Affiliate berhasil dinonaktifkan",
      });
    }
  }
  return jsonResponse({ success: false, message: "Affiliate tidak ditemukan" });
}

function handleActivateAffiliate(affiliate_id) {
  if (!affiliate_id)
    return jsonResponse({ success: false, message: "affiliate_id diperlukan" });
  const sheet = getAffiliateSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === affiliate_id) {
      sheet.getRange(i + 1, AFFILIATE_COLUMNS.STATUS).setValue("active");
      return jsonResponse({ success: true, message: "Affiliate berhasil diaktifkan" });
    }
  }
  return jsonResponse({ success: false, message: "Affiliate tidak ditemukan" });
}

// ─── Request Pencairan ────────────────────────────────────────
function handleRequestWithdrawal(data) {
  if (
    !data.affiliate_id ||
    !data.nominal ||
    !data.rekening_bank ||
    !data.nomor_rekening ||
    !data.atas_nama
  )
    return jsonResponse({ success: false, message: "Data tidak lengkap" });

  if (data.nominal < 50000)
    return jsonResponse({
      success: false,
      message: "Minimal pencairan Rp 50.000",
    });

  const affSheet = getAffiliateSheet();
  const affRows = affSheet.getDataRange().getValues();
  for (let i = 1; i < affRows.length; i++) {
    if (affRows[i][0] === data.affiliate_id) {
      const saldo = Number(affRows[i][5]) || 0;
      if (saldo < data.nominal) {
        return jsonResponse({
          success: false,
          message: "Saldo komisi tidak cukup",
        });
      }

      const withdrawalId = generateWithdrawalId();
      const wdSheet = getWithdrawalSheet();
      wdSheet.appendRow([
        withdrawalId,
        data.affiliate_id,
        data.nominal,
        data.rekening_bank,
        data.nomor_rekening,
        data.atas_nama,
        "pending",
        new Date().toISOString(),
        "",
      ]);

      affSheet.getRange(i + 1, 6).setValue(saldo - data.nominal);
      return jsonResponse({
        success: true,
        withdrawal_id: withdrawalId,
        message: "Request pencairan berhasil dikirim",
      });
    }
  }

  return jsonResponse({ success: false, message: "Affiliate tidak ditemukan" });
}

// ─── Approve/Reject Withdrawal (Admin) ───────────────────────
function handleApproveWithdrawal(withdrawal_id, action) {
  if (!withdrawal_id || !action)
    return jsonResponse({ success: false, message: "Parameter kurang" });

  const wdSheet = getWithdrawalSheet();
  const wdRows = wdSheet.getDataRange().getValues();

  for (let i = 1; i < wdRows.length; i++) {
    if (wdRows[i][0] === withdrawal_id) {
      if (wdRows[i][6] !== "pending") {
        return jsonResponse({
          success: false,
          message: "Request sudah diproses sebelumnya",
        });
      }

      if (action === "approve") {
        wdSheet.getRange(i + 1, 7).setValue("approved");
        wdSheet.getRange(i + 1, 9).setValue(new Date().toISOString());
        return jsonResponse({ success: true, message: "Pencairan disetujui" });
      } else if (action === "reject") {
        wdSheet.getRange(i + 1, 7).setValue("rejected");
        wdSheet.getRange(i + 1, 9).setValue(new Date().toISOString());

        const affSheet = getAffiliateSheet();
        const affRows = affSheet.getDataRange().getValues();
        for (let j = 1; j < affRows.length; j++) {
          if (affRows[j][0] === wdRows[i][1]) {
            const saldo = Number(affRows[j][5]) || 0;
            affSheet.getRange(j + 1, 6).setValue(saldo + wdRows[i][2]);
            break;
          }
        }
        return jsonResponse({
          success: true,
          message: "Pencairan ditolak, saldo dikembalikan",
        });
      }
    }
  }

  return jsonResponse({ success: false, message: "Request tidak ditemukan" });
}

// ─── Get All Users (Admin) ────────────────────────────────────
function handleGetAllUsers() {
  const sheet = getUserSheet();
  const rows = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    users.push({
      user_id: rows[i][USER_COLUMNS.USER_ID - 1],
      nama: rows[i][USER_COLUMNS.NAMA - 1],
      wa: String(rows[i][USER_COLUMNS.WA - 1]).replace(/^'/, ""),
      kode_referral: rows[i][USER_COLUMNS.KODE_REFERRAL - 1] || "",
      status: rows[i][USER_COLUMNS.STATUS - 1],
      saldo_poin: rows[i][USER_COLUMNS.SALDO_POIN - 1] || 0,
      created_at: rows[i][USER_COLUMNS.CREATED_AT - 1],
      approved_at: rows[i][USER_COLUMNS.APPROVED_AT - 1] || "",
      wa_sent: rows[i][USER_COLUMNS.WA_SENT - 1] || false,
    });
  }
  return jsonResponse({ success: true, data: users });
}

// ─── Get All Affiliates (Admin) ───────────────────────────────
function handleGetAllAffiliates() {
  const sheet = getAffiliateSheet();
  const rows = sheet.getDataRange().getValues();
  const affiliates = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    affiliates.push({
      affiliate_id: rows[i][AFFILIATE_COLUMNS.AFFILIATE_ID - 1],
      kode_referral: rows[i][AFFILIATE_COLUMNS.KODE_REFERRAL - 1],
      nama: rows[i][AFFILIATE_COLUMNS.NAMA - 1],
      wa: String(rows[i][AFFILIATE_COLUMNS.WA - 1]).replace(/^'/, ""),
      status: rows[i][AFFILIATE_COLUMNS.STATUS - 1],
      saldo_komisi: rows[i][AFFILIATE_COLUMNS.SALDO_KOMISI - 1] || 0,
      created_at: rows[i][AFFILIATE_COLUMNS.CREATED_AT - 1],
      approved_at: rows[i][AFFILIATE_COLUMNS.APPROVED_AT - 1] || "",
      wa_sent: rows[i][AFFILIATE_COLUMNS.WA_SENT - 1] || false,
      rekening_bank: rows[i][AFFILIATE_COLUMNS.REKENING_BANK - 1] || "",
      nomor_rekening: rows[i][AFFILIATE_COLUMNS.NOMOR_REKENING - 1] || "",
      atas_nama: rows[i][AFFILIATE_COLUMNS.ATAS_NAMA - 1] || "",
      rekening_status: rows[i][AFFILIATE_COLUMNS.REKENING_STATUS - 1] || "",
      rekening_updated_at:
        rows[i][AFFILIATE_COLUMNS.REKENING_UPDATED_AT - 1] || "",
    });
  }
  return jsonResponse({ success: true, data: affiliates });
}

// ─── Mark WA Sent ─────────────────────────────────────────────
function handleMarkWaSent(type, id) {
  if (!type || !id)
    return jsonResponse({ success: false, message: "Parameter kurang" });

  if (type === "user") {
    const sheet = getUserSheet();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        sheet.getRange(i + 1, USER_COLUMNS.WA_SENT).setValue(true);
        return jsonResponse({ success: true });
      }
    }
  } else if (type === "affiliate") {
    const sheet = getAffiliateSheet();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        sheet.getRange(i + 1, AFFILIATE_COLUMNS.WA_SENT).setValue(true);
        return jsonResponse({ success: true });
      }
    }
  }

  return jsonResponse({ success: false, message: "Data tidak ditemukan" });
}

// Save/Edit Rekening Affiliate
function handleSaveRekening(data) {
  if (
    !data.affiliate_id ||
    !data.rekening_bank ||
    !data.nomor_rekening ||
    !data.atas_nama
  )
    return jsonResponse({
      success: false,
      message: "Data rekening tidak lengkap",
    });

  const sheet = getAffiliateSheet();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.affiliate_id) {
      const wdSheet = getWithdrawalSheet();
      const wdRows = wdSheet.getDataRange().getValues();
      for (let j = 1; j < wdRows.length; j++) {
        if (wdRows[j][1] === data.affiliate_id && wdRows[j][6] === "pending") {
          return jsonResponse({
            success: false,
            message: "Tidak bisa edit rekening saat ada pencairan pending",
          });
        }
      }

      const lastUpdated = rows[i][AFFILIATE_COLUMNS.REKENING_UPDATED_AT - 1];
      if (lastUpdated) {
        const lastDate = new Date(lastUpdated);
        const now = new Date();
        const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) {
          const nextEdit = new Date(
            lastDate.getTime() + 7 * 24 * 60 * 60 * 1000,
          );
          return jsonResponse({
            success: false,
            message:
              "Rekening bisa diedit lagi pada " +
              nextEdit.toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }),
          });
        }
      }

      sheet
        .getRange(i + 1, AFFILIATE_COLUMNS.REKENING_BANK)
        .setValue(data.rekening_bank);
      sheet
        .getRange(i + 1, AFFILIATE_COLUMNS.NOMOR_REKENING)
        .setValue(data.nomor_rekening);
      sheet
        .getRange(i + 1, AFFILIATE_COLUMNS.ATAS_NAMA)
        .setValue(data.atas_nama);
      sheet
        .getRange(i + 1, AFFILIATE_COLUMNS.REKENING_STATUS)
        .setValue("pending");
      sheet
        .getRange(i + 1, AFFILIATE_COLUMNS.REKENING_UPDATED_AT)
        .setValue(new Date().toISOString());

      return jsonResponse({
        success: true,
        message: "Rekening berhasil diajukan, menunggu verifikasi admin",
      });
    }
  }

  return jsonResponse({ success: false, message: "Affiliate tidak ditemukan" });
}

// Approve Rekening (Admin)
function handleApproveRekening(affiliate_id) {
  if (!affiliate_id)
    return jsonResponse({
      success: false,
      message: "affiliate_id diperlukan",
    });

  const sheet = getAffiliateSheet();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === affiliate_id) {
      if (rows[i][AFFILIATE_COLUMNS.REKENING_STATUS - 1] !== "pending") {
        return jsonResponse({
          success: false,
          message: "Tidak ada rekening pending untuk diapprove",
        });
      }
      sheet
        .getRange(i + 1, AFFILIATE_COLUMNS.REKENING_STATUS)
        .setValue("active");
      return jsonResponse({
        success: true,
        message: "Rekening berhasil diverifikasi",
      });
    }
  }

  return jsonResponse({ success: false, message: "Affiliate tidak ditemukan" });
}

// Get Withdrawal History (Affiliate)
function handleGetWithdrawalHistory(affiliate_id) {
  if (!affiliate_id)
    return jsonResponse({
      success: false,
      message: "affiliate_id diperlukan",
    });

  const wdSheet = getWithdrawalSheet();
  const wdRows = wdSheet.getDataRange().getValues();
  const history = [];

  for (let i = 1; i < wdRows.length; i++) {
    if (wdRows[i][1] === affiliate_id) {
      history.push({
        withdrawal_id: wdRows[i][0],
        nominal: wdRows[i][2],
        rekening_bank: wdRows[i][3],
        nomor_rekening: wdRows[i][4],
        atas_nama: wdRows[i][5],
        status: wdRows[i][6],
        created_at: wdRows[i][7],
        approved_at: wdRows[i][8] || "",
      });
    }
  }

  return jsonResponse({ success: true, data: history });
}

// ─── Get All Withdrawal Requests (Admin) ──────────────────────
function handleGetAllWithdrawals() {
  const wdSheet = getWithdrawalSheet();
  const wdRows = wdSheet.getDataRange().getValues();
  const affSheet = getAffiliateSheet();
  const affRows = affSheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < wdRows.length; i++) {
    if (!wdRows[i][0]) continue;
    const affiliateId = wdRows[i][1];
    let nama = "";
    let wa = "";
    for (let j = 1; j < affRows.length; j++) {
      if (affRows[j][0] === affiliateId) {
        nama = affRows[j][AFFILIATE_COLUMNS.NAMA - 1];
        wa = String(affRows[j][AFFILIATE_COLUMNS.WA - 1]).replace(/^'/, "");
        break;
      }
    }
    results.push({
      withdrawal_id: wdRows[i][0],
      affiliate_id: affiliateId,
      nama,
      wa,
      nominal: wdRows[i][2],
      rekening_bank: wdRows[i][3],
      nomor_rekening: wdRows[i][4],
      atas_nama: wdRows[i][5],
      status: wdRows[i][6],
      created_at: wdRows[i][7],
      approved_at: wdRows[i][8] || "",
    });
  }

  return jsonResponse({ success: true, data: results });
}

// ─── Get User Orders by USER_ID_REF ──────────────────────────
function handleGetUserOrders(user_id) {
  if (!user_id)
    return jsonResponse({ success: false, message: "user_id diperlukan" });

  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const orders = [];

  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    if (rows[i][COLUMNS.USER_ID_REF - 1] === user_id) {
      orders.push({
        order_id: rows[i][COLUMNS.ORDER_ID - 1],
        jenis: rows[i][COLUMNS.JENIS - 1],
        halaman: rows[i][COLUMNS.HALAMAN - 1],
        status: rows[i][COLUMNS.STATUS - 1],
        harga: rows[i][COLUMNS.HARGA - 1] || 0,
        tipe_order: rows[i][COLUMNS.TIPE_ORDER - 1] || "standar",
        created_at: rows[i][COLUMNS.CREATED_AT - 1] || "",
      });
    }
  }

  // Sort by created_at terbaru
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return jsonResponse({ success: true, data: orders });
}

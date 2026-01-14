// assets/script.js
document.addEventListener("DOMContentLoaded", () => {
  const cekForm = document.getElementById("cekResiForm");
  const hasilDiv = document.getElementById("hasilCek");
  const historyContainer = document.getElementById("historyContainer");

  const isAdminPath = /\/admin(\/|$)/i.test(location.pathname);
  const ROOT = isAdminPath ? "../" : "";
  const isResiPage = location.pathname.toLowerCase().includes("resi.html");

  // ====== AUTH STATE (cek login sekali di awal) ======
  const AUTH = { loggedIn: false, user: null };
  (async () => {
    try {
      const r = await fetch(`${ROOT}api_auth.php?action=me`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const d = await r.json();
      if (d.status === 200 && d.user) {
        AUTH.loggedIn = true;
        AUTH.user = d.user;
      }
    } catch { }
  })();

  /* ---------- INDEX: submit tanpa simpan ---------- */
  if (cekForm) {
    cekForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const resi = document.getElementById("resi").value.trim();
      const kurir = document.getElementById("kurir").value.trim();

      hasilDiv.innerHTML = `<div class="d-flex justify-content-center py-5"><div class="loading"></div></div>`;
      try {
        const res = await fetch(`${ROOT}api.php?action=cekResi`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resi, kurir, save: 0 }), // tidak simpan
        });
        const data = await res.json();
        if (data.status === 200 && data.data) {
          hasilDiv.innerHTML = renderTrackingInfo(data.data, {
            resi,
            kurir,
          });
        } else {
          hasilDiv.innerHTML = `<div class="alert alert-danger">Gagal: ${data.message || "Error tidak diketahui"
            }</div>`;
        }
      } catch (err) {
        hasilDiv.innerHTML = `<div class="alert alert-danger">Terjadi kesalahan: ${err.message}</div>`;
      }
    });
  }

  /* ---------- HISTORY: milik user + hapus checkbox ---------- */
  if (historyContainer) {
    historyContainer.innerHTML = `<div class="d-flex justify-content-center py-5"><div class="loading"></div></div>`;
    fetch(`${ROOT}api.php?action=getcekresi`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((list) => {
        if (!Array.isArray(list) || list.length === 0) {
          historyContainer.innerHTML = `<div class="alert alert-secondary">Belum ada riwayat.</div>`;
          return;
        }

        let rows = list
          .map((item) => {
            let summary = {};
            try {
              summary = JSON.parse(item.response_json).summary || {};
            } catch { }
            const status = summary.status || "-";
            const date = summary.date || item.created_at || "-";
            const link = `resi.html?resi=${encodeURIComponent(
              item.resi
            )}&kurir=${encodeURIComponent(item.kurir)}`;
            return `
            <tr>
              <td style="width:36px;"><input type="checkbox" class="sel" value="${item.id}"></td>
              <td><a class="text-warning" href="${link}">${item.resi}</a></td>
              <td>${item.kurir}</td>
              <td>${status}</td>
              <td>${date}</td>
            </tr>`;
          })
          .join("");

        historyContainer.innerHTML = `
          <div class="card bg-dark text-white">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">Riwayat Resi Saya</h5>
                <button id="btnDeleteSel" class="btn btn-outline-danger btn-sm"><i class="bi bi-trash"></i> Hapus Terpilih</button>
              </div>
              <div class="table-responsive">
                <table class="table table-dark table-striped table-bordered align-middle">
                  <thead>
                    <tr>
                      <th></th><th>Nomor Resi</th><th>Kurir</th><th>Status</th><th>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            </div>
          </div>
        `;

        document
          .getElementById("btnDeleteSel")
          .addEventListener("click", async () => {
            const ids = Array.from(
              document.querySelectorAll(".sel:checked")
            ).map((i) => parseInt(i.value, 10));
            if (ids.length === 0) {
              alert("Pilih data terlebih dahulu");
              return;
            }
            if (!confirm(`Hapus ${ids.length} item?`)) return;
            const r = await fetch(`${ROOT}api.php?action=deletecekresi`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ ids }),
            });
            const d = await r.json();
            if (d.status === 200) {
              location.reload();
            } else {
              alert(d.message || "Gagal menghapus");
            }
          });
      })
      .catch(() => {
        historyContainer.innerHTML = `<div class="alert alert-danger">Gagal memuat riwayat.</div>`;
      });
  }

  /* ---------- RESI.HTML: auto load dari query + tombol UPDATE (simpan) ---------- */
  const params = new URLSearchParams(window.location.search);
  const resiParam = params.get("resi");
  const kurirParam = params.get("kurir");

  if (resiParam && kurirParam && hasilDiv && isResiPage) {
    hasilDiv.innerHTML = `<div class="d-flex justify-content-center py-5"><div class="loading"></div></div>`;
    fetch(`${ROOT}api.php?action=cekResi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resi: resiParam, kurir: kurirParam, save: 0 }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 200 && data.data) {
          hasilDiv.innerHTML = renderTrackingInfo(data.data, {
            resi: resiParam,
            kurir: kurirParam,
          });
        } else {
          hasilDiv.innerHTML = `<div class="alert alert-danger">Gagal: ${data.message || "Error tidak diketahui"
            }</div>`;
        }
      })
      .catch((err) => {
        hasilDiv.innerHTML = `<div class="alert alert-danger">Terjadi kesalahan: ${err.message}</div>`;
      });
  }

  /* ---------- CONTACT (di index.html#kritik-saran-section) ---------- */
  const contactForm = document.getElementById("contactForm");
  const contactMsg = document.getElementById("contactMsg");
  const contactGuestHint = document.getElementById("contactGuestHint");
  const contactLoginBtn = document.getElementById("contactLoginBtn");

  (async () => {
    if (!contactForm) return;

    // Cek login untuk menampilkan hint
    let isLogged = false;
    try {
      const r = await fetch(`${ROOT}api_auth.php?action=me`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const d = await r.json();
      isLogged = d?.status === 200 && !!d.user;
    } catch { }

    if (!isLogged) {
      contactGuestHint?.classList.remove("d-none");
      contactLoginBtn?.classList.remove("d-none");
    }

    // Validasi HTML5
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!contactForm.checkValidity()) {
        contactForm.classList.add("was-validated");
        return;
      }

      const subject = (document.getElementById("subject")?.value || "").trim();
      const message = (document.getElementById("message")?.value || "").trim();

      contactMsg.className = "mt-3 text-muted";
      contactMsg.textContent = "Mengirim...";

      try {
        const r = await fetch(`${ROOT}api_contact.php?action=send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ subject, message }),
        });
        const d = await r.json();
        if (d.status === 200) {
          contactMsg.className = "mt-3 text-success";
          contactMsg.textContent = "Pesan terkirim.";
          contactForm.reset();
          contactForm.classList.remove("was-validated");
        } else if (d.status === 401) {
          contactMsg.className = "mt-3 text-danger";
          contactMsg.innerHTML =
            'Anda harus login terlebih dahulu. <a href="login.html" class="text-warning">Login</a>';
        } else {
          contactMsg.className = "mt-3 text-danger";
          contactMsg.textContent = d.message || "Gagal mengirim pesan.";
        }
      } catch (err) {
        contactMsg.className = "mt-3 text-danger";
        contactMsg.textContent = err.message || "Terjadi kesalahan.";
      }
    });
  })();

  /* ---------- Render Tabel Tracking + tombol Update / Simpan ---------- */
  function renderTrackingInfo(data, opts = {}) {
    const { summary, history } = data;
    const resi = opts.resi || summary.awb;
    const kurir = opts.kurir || summary.courier || "";

    let statusBadgeClass = "bg-secondary";
    const s = (summary.status || "").toLowerCase();
    if (s.includes("deliver")) statusBadgeClass = "bg-success";
    else if (s.includes("transit") || s.includes("process"))
      statusBadgeClass = "bg-primary";
    else if (s.includes("fail") || s.includes("gagal"))
      statusBadgeClass = "bg-danger";

    const historyRows = (history || [])
      .map(
        (h) => `
      <tr>
        <td style="white-space:nowrap">${h.date || ""}</td>
        <td>${h.desc || ""}</td>
        <td>${h.location || ""}</td>
      </tr>`
      )
      .join("");

    // tombol: Update selalu ada; Simpan hanya jika LOGIN & page = index.html
    const showSave = AUTH.loggedIn && !isResiPage;

    const buttonsHtml = `
      <div class="d-flex gap-2 mt-3">
        <button id="btnUpdate" class="btn btn-outline-info">
          <i class="bi bi-arrow-repeat me-1"></i>Update
        </button>
        ${showSave
        ? `<button id="btnSave" class="btn btn-warning">
                 <i class="bi bi-save2 me-1"></i>Simpan ke Riwayat
               </button>`
        : ``
      }
      </div>`;

    const html = `
      <div class="row justify-content-center">
        <div class="col-12 col-lg-10">
          <div class="card shadow-2-strong mb-4">
            <div class="card-body p-4">
              <h3 class="text-warning text-center mb-4">${summary.awb} (${summary.courier})</h3>
              <div class="table-responsive">
                <table class="table table-dark table-borderless mb-4">
                  <tbody>
                    <tr><th style="width:180px">No. Resi</th><td>${summary.awb}</td></tr>
                    <tr><th>Kurir</th><td>${summary.courier}</td></tr>
                    <tr><th>Status</th><td><span class="badge fs-6 ${statusBadgeClass}">${summary.status}</span></td></tr>
                    <tr><th>Tanggal</th><td>${summary.date || ""}</td></tr>
                  </tbody>
                </table>
              </div>

              <h5 class="text-center mt-5 mb-3">Riwayat Perjalanan Paket</h5>
              <div class="table-responsive">
                <table class="table table-dark table-striped table-bordered">
                  <thead><tr><th style="width:220px">Waktu</th><th>Keterangan</th><th style="width:220px">Lokasi</th></tr></thead>
                  <tbody>${historyRows}</tbody>
                </table>
              </div>
              ${buttonsHtml}
              <div id="updateMsg" class="mt-3"></div>
            </div>
          </div>
        </div>
      </div>`;

    // handler update & simpan
    setTimeout(() => {
      const msg = document.getElementById("updateMsg");

      const btnUpdate = document.getElementById("btnUpdate");
      if (btnUpdate) {
        btnUpdate.addEventListener("click", async () => {
          msg.className = "text-muted";
          msg.textContent = isResiPage
            ? "Memperbarui & menyimpan..."
            : "Memperbarui...";
          try {
            const r = await fetch(`${ROOT}api.php?action=cekResi`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ resi, kurir, save: isResiPage ? 1 : 0 }), // resi.html -> simpan otomatis
            });
            const d = await r.json();
            if (d.status === 200) {
              const fresh = renderTrackingInfo(d.data, { resi, kurir });
              document.getElementById("hasilCek").innerHTML = fresh;
            } else {
              msg.className = "text-danger";
              msg.textContent = d.message || "Gagal update.";
            }
          } catch (e) {
            msg.className = "text-danger";
            msg.textContent = e.message;
          }
        });
      }

      const btnSave = document.getElementById("btnSave");
      if (btnSave) {
        btnSave.addEventListener("click", async () => {
          btnSave.disabled = true;
          btnSave.innerHTML =
            '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...';
          try {
            // panggil cekResi dengan save=1 agar di-upsert
            const r = await fetch(`${ROOT}api.php?action=cekResi`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ resi, kurir, save: 1 }),
            });
            const d = await r.json();
            if (d.status === 200) {
              btnSave.classList.remove("btn-warning");
              btnSave.classList.add("btn-success");
              btnSave.innerHTML =
                '<i class="bi bi-check2-circle me-1"></i>Tersimpan';
            } else {
              btnSave.disabled = false;
              btnSave.innerHTML =
                '<i class="bi bi-save2 me-1"></i>Simpan ke Riwayat';
              msg.className = "text-danger";
              msg.textContent = d.message || "Gagal menyimpan.";
            }
          } catch (e) {
            btnSave.disabled = false;
            btnSave.innerHTML =
              '<i class="bi bi-save2 me-1"></i>Simpan ke Riwayat';
            msg.className = "text-danger";
            msg.textContent = e.message;
          }
        });
      }
    }, 0);

    return html;
  }
});

/* ===========================
   Hubungi Admin (User)
=========================== */
(function () {
  const form = document.getElementById("contactFormUser");
  const subEl = document.getElementById("contactSubject");
  const msgEl = document.getElementById("contactMessage");
  const alertEl = document.getElementById("contactAlert");
  const hintEl = document.getElementById("contactHint");

  const listWrap = document.getElementById("myMessagesList");
  const emptyWrap = document.getElementById("myMessagesEmpty");

  // Cari endpoint relatif agar jalan dari / atau subfolder
  async function pickAPI(urls) {
    for (const u of urls) {
      try {
        const r = await fetch(u + (u.includes("?") ? "&" : "?") + "ping=1", {
          cache: "no-store",
        });
        if (r.ok) return u.split("?")[0]; // base saja
      } catch { }
    }
    return null;
  }

  let API_CONTACT_BASE = null;

  async function ensureBase() {
    if (API_CONTACT_BASE) return API_CONTACT_BASE;
    API_CONTACT_BASE = await pickAPI([
      "api_contact.php?action=me",
      "../api_contact.php?action=me",
      "/api_contact.php?action=me",
    ]);
    return API_CONTACT_BASE;
  }

  async function sendMessage(e) {
    e.preventDefault();
    alertEl.innerHTML = "";
    hintEl.textContent = "Mengirim...";

    const base = await ensureBase();
    if (!base) {
      hintEl.textContent = "";
      alertEl.innerHTML = `<div class="alert alert-danger">Gagal menemukan endpoint API.</div>`;
      return;
    }

    try {
      const r = await fetch(`${base}?action=send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          subject: subEl.value.trim(),
          message: msgEl.value.trim(),
        }),
      });
      const d = await r.json();
      hintEl.textContent = "";
      if (d.status === 200) {
        alertEl.innerHTML = `<div class="alert alert-success">Pesan terkirim.</div>`;
        form.reset();
        await loadMyMessages(); // refresh list
      } else if (d.status === 401) {
        alertEl.innerHTML = `<div class="alert alert-warning">Silakan login untuk mengirim pesan.</div>`;
      } else {
        alertEl.innerHTML = `<div class="alert alert-danger">${d.message || "Gagal mengirim pesan."
          }</div>`;
      }
    } catch (err) {
      hintEl.textContent = "";
      alertEl.innerHTML = `<div class="alert alert-danger">Terjadi kesalahan: ${err.message}</div>`;
    }
  }

  function badge(status) {
    const s = (status || "").toLowerCase();
    if (s === "replied" || s === "closed")
      return '<span class="badge bg-success">Dibalas</span>';
    return '<span class="badge bg-secondary">Menunggu</span>';
  }

  function messageCard(row) {
    const created = row.created_at
      ? `<span class="small text-muted">${row.created_at}</span>`
      : "";
    const reply = row.reply_text
      ? `
      <div class="mt-3 p-3 rounded" style="background:#1f2327;border:1px solid rgba(255,255,255,.08);">
        <div class="mb-1 fw-semibold"><i class="bi bi-reply-fill me-1"></i>Balasan Admin</div>
        <div>${row.reply_text}</div>
        ${row.updated_at ? `<div class="small text-muted mt-2">${row.updated_at}</div>` : ""}
      </div>`
      : "";

    return `
      <div class="card bg-dark text-white border-0 shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-3">
            <div>
              <div class="fw-semibold">${row.subject || "(tanpa subjek)"}</div>
              ${created}
            </div>
            <div>${badge(row.status)}</div>
          </div>
          <div class="mt-3" style="white-space:pre-wrap;">${row.message || ""}</div>
          ${reply}
        </div>
      </div>
    `;
  }

  async function loadMyMessages() {
    if (!listWrap || !emptyWrap) return;

    listWrap.innerHTML = "";
    emptyWrap.textContent = "Memuat...";

    const base = await ensureBase();
    if (!base) {
      emptyWrap.innerHTML = `<span class="text-danger">API tidak ditemukan.</span>`;
      return;
    }

    try {
      const r = await fetch(`${base}?action=my_messages`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const d = await r.json();
      if (d.status === 401) {
        emptyWrap.innerHTML = `<span class="text-warning">Silakan login untuk melihat riwayat pesan.</span>`;
        return;
      }
      if (d.status !== 200 || !Array.isArray(d.data)) {
        emptyWrap.innerHTML = `<span class="text-danger">Gagal memuat riwayat.</span>`;
        return;
      }

      if (d.data.length === 0) {
        emptyWrap.innerHTML = `<span class="text-muted">Belum ada pesan.</span>`;
        return;
      }

      emptyWrap.textContent = "";
      listWrap.innerHTML = d.data.map(messageCard).join("");
    } catch (err) {
      emptyWrap.innerHTML = `<span class="text-danger">Kesalahan: ${err.message}</span>`;
    }
  }

  if (form) {
    form.addEventListener("submit", sendMessage);
    loadMyMessages();
  }
})();

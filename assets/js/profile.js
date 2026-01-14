// assets/js/profile.js — logika halaman profil
(function () {
    const form = document.getElementById('profileForm');
    const msg = document.getElementById('profileMsg');

    const nameInp = document.getElementById('name');
    const emailInp = document.getElementById('email');
    const curPwdInp = document.getElementById('currentPassword');
    const newPwdInp = document.getElementById('newPassword');
    const repPwdInp = document.getElementById('confirmNewPassword');

    const btnDelete = document.getElementById('btnDelete');
    const delModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    const delForm = document.getElementById('deleteForm');
    const delPwdInp = document.getElementById('deleteCurrentPassword');
    const delText = document.getElementById('confirmText');
    const delMsg = document.getElementById('deleteMsg');

    const ROOT = ''; // file ini dipanggil dari root (profile.html)

    const api = (qs) => `${ROOT}api_auth.php${qs}`;

    // Prefill user
    async function loadMe() {
        try {
            const r = await fetch(api('?action=me'), { credentials: 'same-origin', cache: 'no-store' });
            const d = await r.json();
            if (d.status !== 200 || !d.user) {
                location.href = 'login.html';
                return;
            }
            nameInp.value = d.user.name || '';
            emailInp.value = d.user.email || '';
        } catch {
            location.href = 'login.html';
        }
    }

    // Validasi front-end
    function validate() {
        msg.className = 'small mt-3 text-muted';
        msg.textContent = '';

        if (!nameInp.value.trim() || !emailInp.value.trim() || !curPwdInp.value) {
            msg.className = 'small mt-3 text-danger';
            msg.textContent = 'Nama, email, dan password saat ini wajib diisi.';
            return false;
        }

        const hasNew = !!newPwdInp.value;
        if (hasNew) {
            if (newPwdInp.value.length < 6) {
                msg.className = 'small mt-3 text-danger';
                msg.textContent = 'Password baru minimal 6 karakter.';
                return false;
            }
            if (newPwdInp.value !== repPwdInp.value) {
                msg.className = 'small mt-3 text-danger';
                msg.textContent = 'Ulangi password baru tidak sama.';
                return false;
            }
        }
        return true;
    }

    // Submit update profil
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validate()) return;

        msg.className = 'small mt-3 text-muted';
        msg.textContent = 'Menyimpan...';

        try {
            const r = await fetch(api('?action=update_profile'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: nameInp.value.trim(),
                    email: emailInp.value.trim(),
                    current_password: curPwdInp.value,
                    new_password: newPwdInp.value || ''
                })
            });
            const d = await r.json();
            if (d.status === 200) {
                msg.className = 'small mt-3 text-success';
                msg.textContent = 'Profil berhasil diperbarui.';
                // reset pw fields
                curPwdInp.value = '';
                newPwdInp.value = '';
                repPwdInp.value = '';
            } else {
                msg.className = 'small mt-3 text-danger';
                msg.textContent = d.message || 'Gagal memperbarui profil.';
            }
        } catch (err) {
            msg.className = 'small mt-3 text-danger';
            msg.textContent = err.message || 'Kesalahan jaringan.';
        }
    });

    // Hapus akun
    btnDelete?.addEventListener('click', () => {
        delMsg.textContent = '';
        delMsg.className = 'small';
        delPwdInp.value = '';
        delText.value = '';
        delModal.show();
    });

    delForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        delMsg.textContent = '';
        delMsg.className = 'small text-muted';

        if (!delPwdInp.value) {
            delMsg.className = 'small text-danger';
            delMsg.textContent = 'Password saat ini wajib diisi.';
            return;
        }
        if (delText.value.trim().toUpperCase() !== 'HAPUS') {
            delMsg.className = 'small text-danger';
            delMsg.textContent = 'Ketik HAPUS dengan benar untuk konfirmasi.';
            return;
        }

        delMsg.textContent = 'Memproses...';

        try {
            const r = await fetch(api('?action=delete_account'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ current_password: delPwdInp.value })
            });
            const d = await r.json();
            if (d.status === 200) {
                delMsg.className = 'small text-success';
                delMsg.textContent = 'Akun dihapus. Mengalihkan...';
                setTimeout(() => location.href = 'index.html', 600);
            } else {
                delMsg.className = 'small text-danger';
                delMsg.textContent = d.message || 'Gagal menghapus akun.';
            }
        } catch (err) {
            delMsg.className = 'small text-danger';
            delMsg.textContent = err.message || 'Kesalahan jaringan.';
        }
    });

    loadMe();
})();

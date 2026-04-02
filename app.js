// Cấu hình URL App Script Webhook do người dùng cung cấp
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJNXWlh54qmutfpRVy_7Hsa3u195DaetsB3skn62J0zUp5LejpNxmEvcQiuMnPXfBg1g/exec';

document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra xem user đã login chưa, nếu có thì redirect thẳng luôn
    const sessionUser = sessionStorage.getItem('warehouse_user');
    if (sessionUser) {
        window.location.href = 'dashboard.html';
        return;
    }

    const form = document.getElementById('loginForm');
    const alertBox = document.getElementById('loginAlert');
    const btnSubmit = document.getElementById('btnLogin');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!email || !password) {
                showAlert('Vui lòng nhập Email và Mật khẩu hợp lệ.');
                return;
            }

            // Gọi hàm submit
            await handleLogin(email, password, btnSubmit, alertBox);
        });
    }
});

/**
 * Hiển thị thông báo trên UI Login
 */
function showAlert(message) {
    const alertBox = document.getElementById('loginAlert');
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = 'alert error'; // Force error style only now
    }
}

/**
 * Xử lý gọi API Login tới Google Apps Script
 */
async function handleLogin(email, password, btnBtn, alertBox) {
    btnBtn.classList.add('loading');
    alertBox.style.display = 'none';

    try {
        const payload = {
            action: 'login',
            email: email,
            password: password
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            // Lưu thông tin người dùng vào Session Storage
            sessionStorage.setItem('warehouse_user', JSON.stringify(data.user));

            // Redirect tới phần dashboard
            window.location.href = 'dashboard.html';
        } else {
            showAlert(data.message || 'Đăng nhập thất bại.');
            alertBox.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi khi gọi API:', error);
        showAlert('Hệ thống đang bảo trì hoặc mất kết nối mạng. ' + error.message);
        alertBox.style.display = 'block';
    } finally {
        btnBtn.classList.remove('loading');
    }
}

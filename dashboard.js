document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra session
    const sessionStr = sessionStorage.getItem('warehouse_user');
    
    if (!sessionStr) {
        // Chưa đăng nhập thì cút ra index
        window.location.href = 'index.html';
        return;
    }

    // Hiển thị Layout sau khi pass session check
    document.getElementById('dashboardLayout').style.display = 'flex';

    // 2. Parse thông tin user
    try {
        const user = JSON.parse(sessionStr);
        document.getElementById('userName').textContent = user.name || 'Người dùng';
        document.getElementById('userRole').textContent = user.role || 'Staff';
        
        // Avatar bằng chữ cái đầu tiên
        if (user.name) {
            document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
        }
    } catch (e) {
        console.error("Lỗi parse data user");
    }

    // 3. Tab switching logic
    const navLinks = document.querySelectorAll('.nav-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const pageTitle = document.getElementById('pageTitle');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Xoá active cũ
            navLinks.forEach(l => l.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // Set active mới
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Set Title header
            const textContent = link.textContent.trim();
            pageTitle.textContent = textContent;
        });
    });

    // 4. Logout logic
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('warehouse_user');
            window.location.href = 'index.html';
        });
    }
});

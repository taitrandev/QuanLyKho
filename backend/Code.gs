/**
 * Hàm hỗ trợ nhúng nội dung file HTML con vào file HTML chính
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Hàm điều hướng hiển thị trang dựa theo tham số URL (?page=...)
 */
function doGet(e) {
  let page = e.parameter.page;
  if (!page) {
    page = 'Index'; // Trang mặc định là Đăng nhập
  } else {
    // Chữ cái đầu viết hoa cho đúng tên file: vd ?page=dashboard -> Dashboard
    page = page.charAt(0).toUpperCase() + page.slice(1);
  }

  // Khởi tạo template để có thể render các thẻ <?!= include('...') ?>
  try {
    let template = HtmlService.createTemplateFromFile(page);
    let output = template.evaluate();
    output.setTitle('Kho Hệ Sinh Thái');
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    // Thêm thẻ meta viewport để Responsive
    output.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    return output;
  } catch (error) {
    // Return to index if page not found
    return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('Kho Hệ Sinh Thái');
  }
}

/**
 * Hàm hỗ trợ lấy web app url
 */
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

/**
 * Thực thi Server Script để kiểm tra Đăng Nhập
 * Được gọi trực tiếp từ client qua google.script.run.login(...)
 */
function login(email, password) {
  try {
    const sheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    
    if (!sheet) {
       return { success: false, message: "Không tìm thấy Sheet 'Users' trong bảng tính này." };
    }

    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    
    const emailIndex = headers.indexOf("Email");
    const passwordIndex = headers.indexOf("Password");
    const activeIndex = headers.indexOf("Active");
    const roleIndex = headers.indexOf("Role");
    const nameIndex = headers.indexOf("Full_Name");

    if (emailIndex === -1 || passwordIndex === -1) {
       return { success: false, message: "Cấu trúc cột không hợp lệ. Không tìm thấy cột Email hoặc Password." };
    }

    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (row[emailIndex] === email) {
            if (row[passwordIndex].toString() === password.toString()) {
                const isActive = row[activeIndex] === true || row[activeIndex] === "TRUE" || row[activeIndex] === "true" || row[activeIndex] === 1;
                
                if (!isActive) {
                    return { success: false, message: "Tài khoản đang bị khóa. Hãy liên hệ Quản trị viên." };
                }

                // Thành công
                return { 
                    success: true, 
                    message: "Đăng nhập thành công",
                    user: {
                        name: row[nameIndex],
                        email: row[emailIndex],
                        role: row[roleIndex]
                    }
                };
            } else {
               return { success: false, message: "Mật khẩu không chính xác." };
            }
        }
    }

    return { success: false, message: "Không tìm thấy Email này." };
  } catch (error) {
    return { success: false, message: "Lỗi hệ thống: " + error.toString() };
  }
}

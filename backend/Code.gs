/**
 * Hàm hỗ trợ nhúng HTML con vào HTML chính
 */
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}

/**
 * Điều hướng trang qua ?page=...
 * Sử dụng Layout.html làm Master Page
 */
function doGet(e) {
  let page = e.parameter.page;
  
  // Nếu là trang Index (Login) hoặc không có truyền tham số -> trả về Index
  if (!page || page.toLowerCase() === 'index') {
    let output = HtmlService.createTemplateFromFile('Index').evaluate();
    output.setTitle('Đăng nhập - Quản Lý Kho');
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    output.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    return output;
  }

  // Chuẩn hóa tên trang bắt đầu bằng chữ hoa
  page = page.charAt(0).toUpperCase() + page.slice(1);
  
  // Nếu không phải trang Index, nhúng nó vào trong Layout
  try {
    let template = HtmlService.createTemplateFromFile('Layout');
    // Truyền biến contentPage xuống cho Layout render đoạn lõi
    template.contentPage = page;
    let output = template.evaluate();
    output.setTitle('Hệ Sinh Thái Kho');
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    output.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    return output;
  } catch (error) {
    // Fallback khi page bị khai báo lỗi không có file
    let errorTemplate = HtmlService.createTemplateFromFile('Layout');
    errorTemplate.contentPage = 'NotFound'; // Xử lý nếu cần
    return errorTemplate.evaluate();
  }
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

/**
 * Hàm lấy cấu trúc dữ liệu 1 Sheet biến thành Array Objects dễ đọc
 */
function getSheetDataAsObjects(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Empty or only header

  const headers = data[0];
  const objects = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    obj['_rowIndex'] = i + 1; // Giữ lại rowIndex phòng khi cần Cập nhật/Xoá
    objects.push(obj);
  }
  return objects;
}



/**
 * Đăng nhập Backend API
 */
function login(email, password) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    if (!sheet) return { success: false, message: "Không tìm thấy Sheet Users." };

    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const emailIndex = headers.indexOf("Email");
    const passwordIndex = headers.indexOf("Password");
    const activeIndex = headers.indexOf("Active");
    const roleIndex = headers.indexOf("Role");
    const nameIndex = headers.indexOf("Full_Name");

    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (row[emailIndex] === email && row[passwordIndex].toString() === password.toString()) {
            const isActive = row[activeIndex] === true || row[activeIndex] === "TRUE";
            if (!isActive) return { success: false, message: "Tài khoản bị khóa." };

            return { 
                success: true, 
                user: { name: row[nameIndex], email: row[emailIndex], role: row[roleIndex] }
            };
        }
    }
    return { success: false, message: "Sai Email hoặc Mật khẩu." };
  } catch (error) {
    return { success: false, message: "Lỗi Server: " + error.toString() };
  }
}

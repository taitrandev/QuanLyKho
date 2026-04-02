/**
 * ========================================================
 * CONTROLLER: QUẢN LÝ NGƯỜI DÙNG (USERS)
 * ========================================================
 */

function getUsersData() {
  try {
    const users = getSheetDataAsObjects('Users');
    // Hide password before sending to client for security
    const safeUsers = users.map(u => {
        let sc = {...u};
        sc.Password = '***'; 
        return sc;
    });
    return { success: true, data: safeUsers };
  } catch(error) {
    return { success: false, message: error.toString() };
  }
}

function saveUser(formObj) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    if (!sheet) return { success: false, message: "Không tìm thấy CSDL Users" };
    
    const isEdit = !!formObj.rowIndex;
    
    if (!isEdit) {
       const existing = getSheetDataAsObjects("Users");
       const isDup = existing.some(u => u.User_ID === formObj.userId || u.Email === formObj.email);
       if (isDup) return { success: false, message: "Mã Hoặc Email User này đã tồn tại!" };
       
       // Columns: User_ID, Email, Password, Full_Name, Role, Active
       // Default Active = TRUE
       const rowData = [
         formObj.userId, 
         formObj.email, 
         formObj.password, 
         formObj.fullName, 
         formObj.role, 
         true
       ];
       sheet.appendRow(rowData);
       return { success: true, message: "Đã thêm Người dùng mới!" };
    } else {
       // Edit: In edit mode, we only update certain columns or fetch the row to keep original Password if left blank
       const rowIndex = parseInt(formObj.rowIndex);
       const dataRange = sheet.getRange(rowIndex, 1, 1, 6); // 6 cols
       const dataValues = dataRange.getValues()[0];
       
       // If no password sent, keep old
       const finalPassword = formObj.password ? formObj.password : dataValues[2];
       
       const rowData = [
         formObj.userId, // keep old logic if needed
         formObj.email,
         finalPassword,
         formObj.fullName,
         formObj.role,
         dataValues[5] // Keep previous Active state
       ];
       
       dataRange.setValues([rowData]);
       return { success: true, message: "Đã cập nhật Người dùng!" };
    }
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function toggleUserStatus(userId, turnOn) {
   try {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
     const data = sheet.getDataRange().getValues(); // Load whole
     
     for (let i = 1; i < data.length; i++) {
        if (data[i][0] === userId) {
           const rowIndex = i + 1;
           // Active is Column F (index 6, but in getRange it's 6)
           sheet.getRange(rowIndex, 6).setValue(turnOn ? true : false);
           return { success: true, message: turnOn ? "Đã Kích hoạt tài khoản!" : "Đã Vô hiệu hóa tài khoản!" };
        }
     }
     
     return { success: false, message: "Không tìm thấy User." };
   } catch (err) {
     return { success: false, message: err.toString() };
   }
}

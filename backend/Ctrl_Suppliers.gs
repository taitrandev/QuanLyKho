/**
 * ========================================================
 * CONTROLLER: NHÀ CUNG CẤP (SUPPLIERS)
 * ========================================================
 */

function getSuppliersData() {
  try {
    const suppliers = getSheetDataAsObjects('Suppliers');
    return { success: true, data: suppliers };
  } catch(error) {
    return { success: false, message: error.toString() };
  }
}

function saveSupplier(formObj) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Suppliers");
    if (!sheet) return { success: false, message: "Không tìm thấy CSDL Suppliers" };
    
    const isEdit = !!formObj.rowIndex;
    
    if (!isEdit) {
       const existing = getSheetDataAsObjects("Suppliers");
       const isDup = existing.some(s => s.Supplier_ID === formObj.supplierId);
       if (isDup) return { success: false, message: "Mã Nhà Cung Cấp này đã tồn tại!" };
    }

    // Default assume columns: Supplier_ID, Supplier_Name, Contact_Person, Phone, Email, Address
    const rowData = [
      formObj.supplierId, 
      formObj.supplierName, 
      formObj.contactPerson || "", // Thêm Contact_Person vào đúng thứ tự Cột C
      formObj.phone, 
      formObj.email, 
      formObj.address
    ];

    if (isEdit) {
       const rowIndex = parseInt(formObj.rowIndex);
       sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
       return { success: true, message: "Đã cập nhật Nhà Cung Cấp!" };
    } else {
       sheet.appendRow(rowData);
       return { success: true, message: "Đã thêm Nhà Cung Cấp mới!" };
    }
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function deleteSupplier(supplierId) {
   try {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Suppliers");
     const data = sheet.getDataRange().getValues();
     
     for (let i = 1; i < data.length; i++) {
        if (data[i][0] === supplierId) {
           sheet.deleteRow(i + 1);
           return { success: true, message: "Đã xoá nhà cung cấp " + supplierId };
        }
     }
     
     return { success: false, message: "Không tìm thấy nhà cung cấp." };
   } catch (err) {
     return { success: false, message: err.toString() };
   }
}

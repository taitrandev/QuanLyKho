/**
 * ========================================================
 * CONTROLLER: MODULE SẢN PHẨM
 * ========================================================
 */

/**
 * API Lấy và tổng hợp dữ liệu (Join) cho trang Sản phẩm
 */
function getProductsData() {
  try {
    const products = getSheetDataAsObjects('Products');
    const categories = getSheetDataAsObjects('Categories');
    const suppliers = getSheetDataAsObjects('Suppliers');
    const transactions = getSheetDataAsObjects('Transactions');

    let stockMap = {};
    products.forEach(p => stockMap[p.Product_ID] = 0);
    
    transactions.forEach(t => {
      let qty = Number(t.Quantity) || 0;
      if (!stockMap[t.Product_ID]) stockMap[t.Product_ID] = 0;
      if (t.Type === 'Nhập' || t.Type === 'Nhap') stockMap[t.Product_ID] += qty;
      else if (t.Type === 'Xuất' || t.Type === 'Xuat') stockMap[t.Product_ID] -= qty;
    });

    let catMap = {}; categories.forEach(c => catMap[c.Cat_ID] = c.Cat_Name);
    let supMap = {}; suppliers.forEach(s => supMap[s.Supplier_ID] = s.Supplier_Name);

    const finalData = products.map(p => {
      let currentStock = stockMap[p.Product_ID] || 0;
      let minStock = Number(p.Min_Stock) || 0;

      let statusStr = "ok"; 
      if (currentStock <= minStock) statusStr = "empty";
      else if (currentStock <= minStock * 1.5) statusStr = "low";

      return {
        Product_ID: p.Product_ID,
        Product_Name: p.Product_Name,
        Category_Name: catMap[p.Cat_ID] || "N/A",
        Supplier_Name: supMap[p.Supplier_ID] || "N/A",
        Unit: p.Unit,
        Unit_Price: p.Unit_Price,
        Current_Stock: currentStock,
        Status: statusStr,
        Cat_ID: p.Cat_ID,
        Supplier_ID: p.Supplier_ID,
        Min_Stock: minStock,
        _rowIndex: p._rowIndex
      };
    });

    return { success: true, data: finalData };
  } catch(error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Dữ liệu phục vụ việc dựng thẻ Select/Dropdown trong Form Add/Edit
 */
function getFormDataOptions() {
  try {
    const cats = getSheetDataAsObjects('Categories').map(c => ({ id: c.Cat_ID, name: c.Cat_Name }));
    const sups = getSheetDataAsObjects('Suppliers').map(s => ({ id: s.Supplier_ID, name: s.Supplier_Name }));
    return { success: true, categories: cats, suppliers: sups };
  } catch(error) { return { success: false, message: error.toString() }; }
}

/**
 * Thêm hoặc Cập nhật Sản Phẩm
 */
function saveProduct(formObj) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Products");
    if (!sheet) return { success: false, message: "Không tìm thấy CSDL Products" };
    
    // Kiểm tra trùng lắp Mã ID nếu là Tạo mới
    const isEdit = !!formObj.rowIndex;
    
    if (!isEdit) {
       const existingProducts = getSheetDataAsObjects("Products");
       const isDuplicate = existingProducts.some(p => p.Product_ID === formObj.productId);
       if (isDuplicate) return { success: false, message: "Mã Sản phẩm này đã tồn tại trong kho!" };
    }

    // Các trường dữ liệu tương ứng cấu trúc cột (Trích từ thiết kế)
    // Cột: Product_ID | Product_Name | Cat_ID | Supplier_ID | Unit | Unit_Price | Min_Stock
    const rowData = [
      formObj.productId, 
      formObj.productName, 
      formObj.catId, 
      formObj.supplierId, 
      formObj.unit, 
      formObj.unitPrice, 
      formObj.minStock
    ];

    if (isEdit) {
       // Index mảng truyền từ HTML đang ở dạng 1-indexed (Cộng thêm Header là +1, nên rowIndex sẽ khớp thứ tự trên Google Sheet)
       const rowIndex = parseInt(formObj.rowIndex);
       sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
       return { success: true, message: "Đã cập nhật sản phẩm thành công!" };
    } else {
       sheet.appendRow(rowData);
       return { success: true, message: "Đã thêm mới sản phẩm thành công!" };
    }
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Xóa vật lý một Sản phẩm
 */
function deleteProduct(productId) {
   try {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Products");
     const data = sheet.getDataRange().getValues();
     
     // Bắt đầu từ 1 để bỏ qua Header
     for (let i = 1; i < data.length; i++) {
        if (data[i][0] === productId) { // Cột A là Product_ID 
           const rowIndex = i + 1; // Google Sheet dùng 1-based index
           sheet.deleteRow(rowIndex);
           return { success: true, message: "Đã xoá sản phẩm " + productId };
        }
     }
     
     return { success: false, message: "Không tìm thấy sản phẩm có mã này." };
   } catch (err) {
     return { success: false, message: err.toString() };
   }
}

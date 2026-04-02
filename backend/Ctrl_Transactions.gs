/**
 * ========================================================
 * CONTROLLER: NHẬP/XUẤT KHO (TRANSACTIONS)
 * ========================================================
 */

function getTransactionsData() {
  try {
    const transactions = getSheetDataAsObjects('Transactions').reverse(); // Mới nhất lên đầu
    // Lấy tên SP và Nhà QC để Join cho hiển thị
    const products = getSheetDataAsObjects('Products');
    const suppliers = getSheetDataAsObjects('Suppliers');
    
    // Chỉ giới hạn 20 dòng gần nhất
    const limitedTxns = transactions.slice(0, 20);
    
    const joined = limitedTxns.map(t => {
      const p = products.find(prod => prod.Product_ID === t.Product_ID);
      const s = suppliers.find(sup => sup.Supplier_ID === t.Supplier_ID);
      return {
        ...t,
        Product_Name: p ? p.Product_Name : t.Product_ID,
        Supplier_Name: s ? s.Supplier_Name : t.Supplier_ID
      };
    });
    
    const safeData = JSON.parse(JSON.stringify(joined));
    return { success: true, data: safeData };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// Hàm lấy dữ liệu cho Dropdown và Validation Tồn kho
function getTxnFormData() {
  try {
    const productsBase = getSheetDataAsObjects('Products');
    const transactions = getSheetDataAsObjects('Transactions');
    const suppliers = getSheetDataAsObjects('Suppliers');
    
    // Map tồn kho cho list mảng SP
    const productsWithStock = productsBase.map(p => {
       const txns = transactions.filter(t => t.Product_ID === p.Product_ID);
       let stock = parseInt(p.Initial_Stock || 0);
       txns.forEach(t => {
         let qty = parseInt(t.Quantity || 0);
         if (t.Type === "Nhập") stock += qty;
         else if (t.Type === "Xuất") stock -= qty;
       });
       return {
         Product_ID: p.Product_ID,
         Product_Name: p.Product_Name,
         Current_Stock: stock
       };
    });
    
    const suppList = suppliers.map(s => ({
       Supplier_ID: s.Supplier_ID,
       Supplier_Name: s.Supplier_Name
    }));
    
    const safeProducts = JSON.parse(JSON.stringify(productsWithStock));
    const safeSupps = JSON.parse(JSON.stringify(suppList));
    
    return {
      success: true, 
      products: safeProducts,
      suppliers: safeSupps
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function saveTransaction(formObj) {
  try {
     checkPermission(formObj.userEmail, ['admin', 'warehouse_staff']);
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Transactions");
     if (!sheet) return { success: false, message: "Không tìm thấy Sheet Transactions" };
     
     // 1. Double check điều kiện ở Server
     if (formObj.type === "Xuất") {
        const formData = getTxnFormData();
        if(!formData.success) throw new Error("Lỗi khi kiểm tra Tồn kho từ server");
        const prod = formData.products.find(p => p.Product_ID === formObj.productId);
        if(!prod) return { success: false, message: "Sản phẩm không có thực" };
        
        let qty = parseInt(formObj.quantity);
        if(qty > prod.Current_Stock) {
           return { success: false, message: `Thất bại: Tồn kho thực tế của ${prod.Product_ID} chỉ còn ${prod.Current_Stock}` };
        }
     }
     
     // 2. Generate ID
     // Format: TXN + YYYYMMDD + XXX
     const today = new Date();
     const yyyy = today.getFullYear();
     const mm = String(today.getMonth() + 1).padStart(2, '0');
     const dd = String(today.getDate()).padStart(2, '0');
     const datePrefix = "TXN" + yyyy + mm + dd;
     
     // Đọc Txn hiện tại để lấy số XXX
     const allTxns = getSheetDataAsObjects('Transactions');
     const todayTxns = allTxns.filter(t => (t.Trans_ID || "").startsWith(datePrefix));
     const count = todayTxns.length + 1;
     const newId = datePrefix + String(count).padStart(3, '0');
     
     // 3. Mapping data (Col: Trans_ID, Product_ID, Type, Quantity, Supplier_ID, Note, Created_By, Created_At)
     const timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
     
     // Supplier_ID để trống nếu loại là "Xuất"
     const suppId = formObj.type === "Xuất" ? "" : formObj.supplierId;
     
     const rowData = [
       newId,
       formObj.productId,
       formObj.type,
       formObj.quantity,
       suppId,
       formObj.note,
       formObj.userEmail, // Do Client truyền vào dựa trên sessionStorage
       timeStr
     ];
     
     sheet.appendRow(rowData);
     
     // 4. Kiểm tra và bắn cảnh báo ngay lập tức nếu xuất kho làm rớt tồn
     if (formObj.type === "Xuất") {
         checkAndNotifyLowStock(formObj.productId);
     }
     
     return { success: true, message: `Thành công! Mã Phiếu: ${newId}` };
     
  } catch(err) {
     return { success: false, message: err.toString() };
  }
}

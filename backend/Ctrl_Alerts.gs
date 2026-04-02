/**
 * ========================================================
 * CONTROLLER: CẢNH BÁO TỒN KHO (ALERTS)
 * ========================================================
 */

function getLowStockProducts() {
  try {
     const products = getSheetDataAsObjects('Products');
     const transactions = getSheetDataAsObjects('Transactions');
     const suppliers = getSheetDataAsObjects('Suppliers');
     
     let lowStockList = [];
     
     products.forEach(p => {
        let stock = parseInt(p.Initial_Stock || 0);
        let minStock = parseInt(p.Min_Stock || 0);
        
        // Tính tồn kho
        const pTxns = transactions.filter(t => t.Product_ID === p.Product_ID);
        pTxns.forEach(t => {
           let qty = parseInt(t.Quantity || 0);
           if(t.Type === "Nhập") stock += qty;
           else if (t.Type === "Xuất") stock -= qty;
        });
        
        // So sánh
        if (stock <= minStock) {
           // Gắn kèm Supplier
           const sup = suppliers.find(s => s.Supplier_ID === p.Supplier_ID);
           lowStockList.push({
               Product_ID: p.Product_ID,
               Product_Name: p.Product_Name,
               Category: p.Category || 'Chưa phân loại',
               Unit: p.Unit || 'Cái',
               Current_Stock: stock,
               Min_Stock: minStock,
               Supplier_Name: sup ? sup.Supplier_Name : p.Supplier_ID,
               Supplier_Phone: sup ? (sup.Contact_Phone || sup.Phone || '-') : '-'
           });
        }
     });
     
     return { success: true, data: lowStockList };
  } catch (err) {
     return { success: false, message: err.toString() };
  }
}

function triggerAlertEmail() {
   try {
      // 1. Phân tích data kho
      const alertData = getLowStockProducts();
      if(!alertData.success) throw new Error(alertData.message);
      
      const list = alertData.data;
      if(list.length === 0) return { success: true, message: "Không có sản phẩm nào cần cảnh báo. Tồn kho vẫn ổn định!" };
      
      // 2. Lấy danh sách Email nhận cảnh báo
      const sheetRecipients = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("AlertRecipients");
      if(!sheetRecipients) return { success: false, message: "Không tìm thấy Sheet AlertRecipients" };
      
      const recData = sheetRecipients.getDataRange().getValues();
      if (recData.length < 2) return { success: false, message: "Danh bạ nhận Email đang trống." };
      
      const headers = recData[0];
      const rows = recData.slice(1);
      
      let emailList = [];
      rows.forEach(r => {
         let email = r[0]; // Email col
         let active = r[2]; // Active col (TRUE/FALSE)
         if ((active === true || active === 'TRUE' || active === true) && email) {
             emailList.push(email);
         }
      });
      
      if (emailList.length === 0) return { success: false, message: "Không có Email nào đang ở trạng thái Hoạt Động!" };
      
      // 3. Render HTML Body cho nhiều sản phẩm
      let productBlocks = '';
      list.forEach(p => {
          productBlocks += `
            <div style="margin-bottom: 20px;">
              Sản phẩm: ${p.Product_Name} (Mã: ${p.Product_ID})<br>
              Danh mục: ${p.Category}<br>
              Tồn kho hiện tại: <span style="color: #ef4444; font-weight: bold;">${p.Current_Stock}</span> [${p.Unit}]<br>
              Mức tối thiểu: ${p.Min_Stock} [${p.Unit}]<br>
              Nhà cung cấp: ${p.Supplier_Name} - SĐT: ${p.Supplier_Phone}<br>
            </div>
          `;
      });
      
      const htmlBody = `
        <div style="background-color: #1e1e1e; color: #e5e5e5; font-family: 'Courier New', Courier, monospace; padding: 20px; border-radius: 8px; width: fit-content; min-width: 400px;">
          <h2 style="color: #fbbf24; margin-top: 0; font-size: 18px;">⚠️ CẢNH BÁO TỒN KHO THẤP</h2>
          <br>
          <div style="line-height: 1.6; font-size: 14px;">
            ${productBlocks}
            Vui lòng liên hệ nhà cung cấp để đặt hàng bổ sung!
            <br><br>
            ---<br>
            Hệ thống Quản lý Kho – Thông báo tự động
          </div>
        </div>
      `;
      
      // 4. Gửi Mail
      const toEmails = emailList.join(',');
      const timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
      
      MailApp.sendEmail({
         to: toEmails,
         subject: "⚠️ CẢNH BÁO TỒN KHO - " + timeStr,
         htmlBody: htmlBody
      });
      
      return { success: true, message: `Thành công! Đã gửi mail báo động đến ${emailList.length} địa chỉ.` };
      
   } catch(err) {
      return { success: false, message: err.toString() };
   }
}

// 5. Hàm bắn email ngay khi xuất kho
function checkAndNotifyLowStock(productId) {
    const alertData = getLowStockProducts();
    if (alertData.success) {
        const prod = alertData.data.find(p => p.Product_ID === productId);
        if (prod) {
            triggerSingleAlertEmail(prod);
        }
    }
}

function triggerSingleAlertEmail(p) {
   try {
      const sheetRecipients = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("AlertRecipients");
      if(!sheetRecipients) return;
      
      const recData = sheetRecipients.getDataRange().getValues();
      if (recData.length < 2) return;
      const rows = recData.slice(1);
      
      let emailList = [];
      rows.forEach(r => {
         let email = r[0];
         let active = r[2];
         if ((active === true || active === 'TRUE' || active === true) && email) {
             emailList.push(email);
         }
      });
      if (emailList.length === 0) return;

      const htmlBody = `
        <div style="background-color: #1e1e1e; color: #e5e5e5; font-family: 'Courier New', Courier, monospace; padding: 20px; border-radius: 8px; width: fit-content; min-width: 400px;">
          <h2 style="color: #fbbf24; margin-top: 0; font-size: 18px;">⚠️ CẢNH BÁO TỒN KHO THẤP</h2>
          <br>
          <div style="line-height: 1.6; font-size: 14px;">
            Sản phẩm: ${p.Product_Name} (Mã: ${p.Product_ID})<br>
            Danh mục: ${p.Category}<br>
            Tồn kho hiện tại: <span style="color: #ef4444; font-weight: bold;">${p.Current_Stock}</span> [${p.Unit}]<br>
            Mức tối thiểu: ${p.Min_Stock} [${p.Unit}]<br>
            Nhà cung cấp: ${p.Supplier_Name} - SĐT: ${p.Supplier_Phone}<br>
            <br>
            Vui lòng liên hệ nhà cung cấp để đặt hàng bổ sung!
            <br><br>
            ---<br>
            Hệ thống Quản lý Kho – Thông báo tự động
          </div>
        </div>
      `;

      const toEmails = emailList.join(',');
      const timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
      MailApp.sendEmail({
         to: toEmails,
         subject: "⚠️ CẢNH BÁO: Tồn kho thấp - " + p.Product_ID,
         htmlBody: htmlBody
      });
      
   } catch(err) {
      console.error("Auto Alert Error: ", err);
   }
}

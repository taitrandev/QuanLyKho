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
      
      // 3. Render HTML Body
      let tableRows = '';
      list.forEach(p => {
          tableRows += `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>${p.Product_ID}</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${p.Product_Name}</td>
              <td style="padding: 10px; border: 1px solid #ddd; color: red; font-weight: bold;">${p.Current_Stock}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${p.Min_Stock}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${p.Supplier_Name} (${p.Supplier_Phone})</td>
            </tr>
          `;
      });
      
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
          <h2 style="color: #ef4444;">🚨 Cảnh báo Tồn Kho Dưới Định Mức</h2>
          <p>Kính gửi bộ phận Mua hàng,</p>
          <p>Hệ thống ghi nhận có <strong>${list.length}</strong> sản phẩm đã chạm mức tồn kho tối thiểu. Vui lòng liên hệ Nhà Cung Cấp để tiến hành nhập hàng nhằm đảm bảo sản xuất.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead style="background-color: #f3f4f6;">
              <tr>
                <th style="padding: 10px; border: 1px solid #ddd;">Mã SP</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Tên Sản Phẩm</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Tồn Thực Tế</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Định Mức (Min)</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Nhà Cung Cấp</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <br>
          <p><em>Email được tạo tự động từ phần mềm Quản Lý Kho. Vui lòng không trả lời.</em></p>
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

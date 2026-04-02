function getDashboardStats() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const wsProducts = ss.getSheetByName("Products");
        const wsTransactions = ss.getSheetByName("Transactions");
        const wsCats = ss.getSheetByName("Categories");
        
        let totalProducts = 0;
        let totalInventoryValue = 0;
        let lowStockProductsCount = 0;
        let catMap = {}; // Cat_ID -> stock count
        let prodRanking = []; // { name, stock }
        
        // 1. Phân tích Giao dịch để tính Tồn kho và Số lượng Giao dịch trong tháng
        let totalTransactionsThisMonth = 0;
        let stockMap = {}; // Product_ID -> stock
        
        if (wsTransactions) {
            let transData = wsTransactions.getDataRange().getDisplayValues();
            if(transData.length > 1) {
                let transHeaders = transData[0];
                let tRows = transData.slice(1).filter(r => r[0] !== "");
                let dateIdx = transHeaders.indexOf("Created_At");
                let pIdIdx = transHeaders.indexOf("Product_ID");
                let typeIdx = transHeaders.indexOf("Type");
                let qtyIdx = transHeaders.indexOf("Quantity");
                
                let currentMonth = new Date().getMonth();
                let currentYear = new Date().getFullYear();
                
                tRows.forEach(r => {
                    // Check transactions in month
                    if (dateIdx >= 0) {
                        let dObj = parseCommonDate(r[dateIdx]);
                        if (dObj && dObj.getMonth() === currentMonth && dObj.getFullYear() === currentYear) {
                            totalTransactionsThisMonth++;
                        }
                    }
                    
                    // Accumulate stock
                    if (pIdIdx >= 0 && typeIdx >= 0 && qtyIdx >= 0) {
                         let pid = r[pIdIdx];
                         let type = r[typeIdx].trim().toLowerCase();
                         let qty = parseFloat(String(r[qtyIdx]).replace(/,/g, '')) || 0;
                         if (!stockMap[pid]) stockMap[pid] = 0;
                         if (type === 'nhập' || type === 'nhap') {
                             stockMap[pid] += qty;
                         } else if (type === 'xuất' || type === 'xuat') {
                             stockMap[pid] -= qty;
                         }
                    }
                });
            }
        }
        
        // 2. Phân tích Dữ liệu Products
        if (wsProducts) {
            const prodData = wsProducts.getDataRange().getDisplayValues();
            const prodHeaders = prodData[0];
            const pRows = prodData.slice(1).filter(r => r[0] !== "");
            
            totalProducts = pRows.length;
            
            let minStockIdx = prodHeaders.indexOf("Min_Stock");
            let priceIdx = prodHeaders.indexOf("Unit_Price");
            let nameIdx = prodHeaders.indexOf("Product_Name");
            let catIdIdx = prodHeaders.indexOf("Cat_ID");
            let pIdIdx = prodHeaders.indexOf("Product_ID");
            
            pRows.forEach(row => {
                let pid = pIdIdx >= 0 ? row[pIdIdx] : null;
                let stock = pid ? (stockMap[pid] || 0) : 0;
                
                let priceStr = String(row[priceIdx] || '0');
                let price = parseFloat(priceStr.replace(/\./g, "").replace(/,/g, '')) || 0;
                
                let minStockStr = String(row[minStockIdx] || '0');
                let minStock = parseFloat(minStockStr.replace(/,/g, '')) || 0;
                
                let catId = catIdIdx >= 0 ? row[catIdIdx] : 'Unknown';
                let prodName = nameIdx >= 0 ? row[nameIdx] : 'Unknown';
                
                totalInventoryValue += (stock * price);
                if (stock <= minStock) lowStockProductsCount++;
                
                if (!catMap[catId]) catMap[catId] = 0;
                catMap[catId] += stock;
                
                prodRanking.push({
                    name: prodName,
                    stock: stock
                });
            });
        }
        
        // 3. Chuyển Map Danh mục (Cat_ID -> Name) cho Pie Chart
        let pieChartData = [['Danh mục', 'Số lượng tồn']];
        if (wsCats) {
            const catData = wsCats.getDataRange().getDisplayValues();
            const catDict = {};
            catData.slice(1).forEach(r => catDict[r[0]] = r[1]); // Cat_ID -> Cat_Name
            
            for (let catId in catMap) {
                if (catMap[catId] > 0) { // Only draw if > 0
                    pieChartData.push([catDict[catId] || catId, catMap[catId]]);
                }
            }
        }
        
        // 4. Top 5 Products Bar Chart
        prodRanking.sort((a,b) => b.stock - a.stock);
        let barChartData = [['Sản phẩm', 'Số lượng tồn']];
        prodRanking.slice(0, 5).forEach(p => {
            if(p.stock > 0) {
                barChartData.push([p.name, p.stock]);
            }
        });
        
        return {
            success: true,
            stats: {
                totalProducts: totalProducts,
                totalTransactionsThisMonth: totalTransactionsThisMonth,
                lowStockCount: lowStockProductsCount,
                totalValue: totalInventoryValue
            },
            pieChartData: pieChartData,
            barChartData: barChartData
        };
        
    } catch(err) {
        return { success: false, message: err.toString() };
    }
}

// Helper date vì sheet hay sinh text kiểu: "03/12/2023 14:05:01" 
function parseCommonDate(str) {
    if (!str) return null;
    try {
        let onlyDate = str.split(' ')[0]; // lấy phần "DD/MM/YYYY" hoặc "MM/DD/YYYY"
        let parts = onlyDate.split('/');
        if (parts.length === 3) {
            // Mặc định Apps script lấy múi giờ VN là dạng DD/MM
            return new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
        }
        return new Date(str);
    } catch(e) {
        return new Date(); 
    }
}

function doPost(e) {
  try {
    const sheetId = SpreadsheetApp.getActiveSpreadsheet().getId(); // Assuming script is bound to the sheet, or use openById
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    
    // Sometimes payload comes as e.postData.contents depending on how fetch is called
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch(err) {
      // Fallback for form data
      data = e.parameter;
    }

    const action = data.action;

    if (action === "login") {
      const email = data.email;
      const password = data.password;

      // Ensure sheet exists
      if (!sheet) {
         return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          message: "Sheet 'Users' not found in this spreadsheet." 
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const values = sheet.getDataRange().getValues();
      const headers = values[0];
      
      const emailIndex = headers.indexOf("Email");
      const passwordIndex = headers.indexOf("Password");
      const activeIndex = headers.indexOf("Active");
      const roleIndex = headers.indexOf("Role");
      const nameIndex = headers.indexOf("Full_Name");
      const idIndex = headers.indexOf("User_ID");

      if (emailIndex === -1 || passwordIndex === -1) {
         return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          message: "Invalid table structure. Cannot find Email or Password columns." 
        })).setMimeType(ContentService.MimeType.JSON);
      }

      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (row[emailIndex] === email) {
          if (row[passwordIndex].toString() === password.toString()) {
            // Check Active status, be careful with boolean or string representation
            const isActive = row[activeIndex] === true || row[activeIndex] === "TRUE" || row[activeIndex] === "true" || row[activeIndex] === 1;
            
            if (!isActive) {
              return ContentService.createTextOutput(JSON.stringify({ 
                success: false, 
                message: "Account is inactive. Please contact administrator." 
              })).setMimeType(ContentService.MimeType.JSON);
            }

            // Login successful
            return ContentService.createTextOutput(JSON.stringify({ 
              success: true, 
              message: "Login successful",
              user: {
                id: row[idIndex],
                name: row[nameIndex],
                email: row[emailIndex],
                role: row[roleIndex]
              }
            })).setMimeType(ContentService.MimeType.JSON);
          } else {
             return ContentService.createTextOutput(JSON.stringify({ 
              success: false, 
              message: "Incorrect password" 
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }

      // Email not found
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        message: "Email not found" 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        message: "Invalid action" 
      })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        message: "Server Error: " + error.toString() 
      })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Ensure preflight standard responds properly (OPTIONS method)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JAVASCRIPT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

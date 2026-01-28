function doGet(e) {
  const sheetName = e.parameter.sheet;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Sheet not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const json = rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify(json))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const sheetName = params.sheet;
    const data = params.data;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sheet not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "add") {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const newRow = headers.map(header => data[header] || "");
      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Row added" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "import") {
      // keys: array of column names in the order of the values
      // rows: array of arrays of values
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const rowsToAppend = data.rows.map(rowObj => {
        return headers.map(header => rowObj[header] || "");
      });
      
      if (rowsToAppend.length > 0) {
        // appendRow only does one, generic getRange + setValues is better for bulk
        const lastRow = sheet.getLastRow();
        const numRows = rowsToAppend.length;
        const numCols = rowsToAppend[0].length;
        
        sheet.getRange(lastRow + 1, 1, numRows, numCols).setValues(rowsToAppend);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: `${rowsToAppend.length} rows imported` }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
     return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

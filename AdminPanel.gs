/**
 * KHUROSON CARGO BOT - Admin Panel Entry Point
 * 
 * @file AdminPanel.gs
 * @description Separate entry point for admin panel Web App
 */

/**
 * Serve admin panel HTML - doGet for Web App deployment
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(e) {
  try {
    const userId = sanitizeUserId(e.parameter.uid);
    
    // Check if admin
    if (!userId || !isAdmin(userId)) {
      return HtmlService.createHtmlOutput(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Access Denied</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #F2F2F7;
              padding: 20px;
              text-align: center;
            }
            .error {
              background: #FF3B30;
              color: white;
              padding: 20px;
              border-radius: 14px;
              margin-top: 50px;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>🚫 Access Denied</h1>
            <p>Admin access only</p>
          </div>
        </body>
        </html>
      `);
    }
    
    const template = HtmlService.createTemplateFromFile('AdminApp');
    template.userId = userId;
    
    return template.evaluate()
      .setTitle('Khuroson Cargo - Admin Panel')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    return HtmlService.createHtmlOutput(`<h1>Error</h1><p>${error.message}</p>`);
  }
}

/**
 * Sanitize user ID
 * @param {string} id
 * @returns {string}
 */
function sanitizeUserId(id) {
  if (!id) return "";
  return String(id).replace(/[^\d]/g, "").substring(0, 20);
}

/**
 * Check if user is admin
 * @param {string} userId
 * @returns {boolean}
 */
function isAdmin(userId) {
  const adminIds = (PropertiesService.getScriptProperties().getProperty("ADMIN_IDS") || "").split(",");
  return adminIds.includes(userId);
}

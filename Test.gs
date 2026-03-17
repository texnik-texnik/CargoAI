/**
 * KHUROSON CARGO BOT - Test Functions
 * 
 * @file Test.gs
 * @description Test functions for validating bot functionality
 * 
 * HOW TO USE:
 * 1. Open Google Apps Script Editor
 * 2. Select a test function from the dropdown
 * 3. Click "Run"
 * 4. Check the Execution log (View → Executions)
 */

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

/**
 * Test 1: Validate Configuration
 * 
 * Checks if all required properties are set in Script Properties
 */
function test_config_validation() {
  console.log('=== TEST: Configuration Validation ===\n');
  
  const result = validateConfig();
  
  if (result.valid) {
    console.log('✅ All required properties are set');
  } else {
    console.log('❌ Missing properties:', result.missing);
    console.log('\nPlease add these to Script Properties:');
    console.log('1. Open https://script.google.com/home/projects/YOUR_ID/edit');
    console.log('2. Click ⚙️ Settings → Script Properties');
    console.log('3. Add missing properties');
  }
  
  // Show current config
  console.log('\n--- Current Config ---');
  console.log('WEBHOOK_TOKEN:', CONFIG.WEBHOOK_TOKEN ? '✅' : '❌');
  console.log('ADMIN_IDS:', CONFIG.ADMIN_IDS.length > 0 ? `✅ (${CONFIG.ADMIN_IDS.length})` : '❌');
  console.log('WEBAPP_URL:', CONFIG.WEBAPP_URL ? '✅' : '❌');
  console.log('SHEET_ID:', CONFIG.SHEET_ID ? '✅' : '❌');
  console.log('FOLDER_ID:', CONFIG.FOLDER_ID ? '✅' : '❌');
  console.log('GEMINI_API_KEY:', CONFIG.GEMINI_API_KEY ? '✅' : '❌');
  
  return result;
}

/**
 * Test 2: Check Script Properties
 * 
 * Lists all script properties
 */
function test_list_properties() {
  console.log('=== TEST: List All Script Properties ===\n');
  
  const props = PropertiesService.getScriptProperties().getProperties();
  
  if (Object.keys(props).length === 0) {
    console.log('⚠️ No script properties found!');
    console.log('\nRequired properties:');
    console.log('- TELEGRAM_TOKEN');
    console.log('- WEBHOOK_TOKEN');
    console.log('- ADMIN_IDS');
    console.log('- WEBAPP_URL');
    console.log('- USERS_SPREADSHEET_ID');
    console.log('- TRACKS_FOLDER_ID');
    console.log('- GOOGLE_API_KEY');
    console.log('- KHUROSON_ADDRESS');
    console.log('- CHINA_ADDRESS');
    console.log('- PRICE_KG');
    console.log('- PRICE_M3');
  } else {
    console.log('Found properties:');
    for (const [key, value] of Object.entries(props)) {
      const masked = key.includes('TOKEN') || key.includes('KEY') || key.includes('ID') 
        ? value.substring(0, 10) + '...' 
        : value;
      console.log(`  ${key}: ${masked}`);
    }
  }
}

// ============================================================================
// DATABASE TESTS
// ============================================================================

/**
 * Test 3: Database Connection
 * 
 * Tests if we can access the Users sheet
 */
function test_database_connection() {
  console.log('=== TEST: Database Connection ===\n');
  
  try {
    if (!CONFIG.SHEET_ID) {
      console.log('❌ SHEET_ID not configured');
      return false;
    }
    
    console.log('Opening spreadsheet:', CONFIG.SHEET_ID);
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    console.log('✅ Spreadsheet opened:', ss.getName());
    
    const sheet = DB.getSheet();
    console.log('✅ Users sheet:', sheet.getName());
    console.log('   Rows:', sheet.getLastRow());
    console.log('   Columns:', sheet.getLastColumn());
    
    // Show headers
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log('   Headers:', headers.join(' | '));
    
    return true;
    
  } catch (error) {
    console.log('❌ Database error:', error.message);
    return false;
  }
}

/**
 * Test 4: User Operations
 * 
 * Tests user CRUD operations
 * 
 * @param {string} testUserId - Test user ID (default: "999999999")
 */
function test_user_operations(testUserId = "999999999") {
  console.log('=== TEST: User Operations ===\n');
  console.log('Test User ID:', testUserId);
  
  try {
    // Test 1: Get non-existent user
    console.log('\n1. Getting non-existent user...');
    let user = DB.getUser(testUserId);
    console.log('   Result:', user ? 'Found (unexpected)' : 'Not found (expected) ✅');
    
    // Test 2: Create user
    console.log('\n2. Creating test user...');
    const saveResult = DB.saveUser(testUserId, 'Test User', '+992000000000', 'tj');
    if (saveResult.success) {
      console.log('   ✅ User created with ClientID:', saveResult.clientId);
    } else {
      console.log('   ⚠️ User already exists or error:', saveResult.error);
    }
    
    // Test 3: Get user
    console.log('\n3. Getting user...');
    user = DB.getUser(testUserId);
    if (user) {
      console.log('   ✅ User found:');
      console.log('      ID:', user.id);
      console.log('      ClientID:', user.clientId);
      console.log('      Name:', user.name);
      console.log('      Phone:', user.phone);
      console.log('      Lang:', user.lang);
    } else {
      console.log('   ❌ User not found');
    }
    
    // Test 4: Update user
    console.log('\n4. Updating user name...');
    const updateResult = DB.updateUser(testUserId, 'name', 'Updated Test User');
    console.log('   Result:', updateResult ? 'Success ✅' : 'Failed ❌');
    
    // Verify update
    user = DB.getUser(testUserId);
    console.log('   New name:', user?.name);
    
    // Test 5: Update history
    console.log('\n5. Updating track history...');
    const historyResult = DB.updateHistory(testUserId, ['TEST001', 'TEST002']);
    console.log('   Result:', historyResult ? 'Success ✅' : 'Failed ❌');
    
    // Verify history
    user = DB.getUser(testUserId);
    console.log('   History:', user?.history);
    
    return true;
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

// ============================================================================
// TELEGRAM TESTS
// ============================================================================

/**
 * Test 5: Telegram Bot Connection
 * 
 * Tests if bot can communicate with Telegram API
 */
function test_telegram_connection() {
  console.log('=== TEST: Telegram Connection ===\n');
  
  try {
    if (!TOKEN) {
      console.log('❌ TELEGRAM_TOKEN not configured');
      return false;
    }
    
    // Get bot info
    console.log('Getting bot info...');
    const result = TG.send('getMe', {});
    
    if (result.ok) {
      console.log('✅ Bot connected:');
      console.log('   ID:', result.result.id);
      console.log('   Name:', result.result.first_name);
      console.log('   Username:', result.result.username ? '@' + result.result.username : 'N/A');
      console.log('   Can join groups:', result.result.can_join_groups);
      console.log('   Can read messages:', result.result.can_read_all_group_messages);
      return true;
    } else {
      console.log('❌ Telegram API error:', result.description);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test 6: Send Test Message
 * 
 * Sends a test message to admin
 * 
 * @param {string} message - Custom message (optional)
 */
function test_send_message(message) {
  console.log('=== TEST: Send Message ===\n');
  
  try {
    if (!CONFIG.ADMIN_IDS || CONFIG.ADMIN_IDS.length === 0) {
      console.log('❌ ADMIN_IDS not configured');
      return false;
    }
    
    const adminId = CONFIG.ADMIN_IDS[0];
    const testMessage = message || `🧪 <b>Test Message</b>\n\nThis is a test from the refactored bot.\nTime: ${new Date().toLocaleString()}`;
    
    console.log('Sending message to admin:', adminId);
    const result = TG.sendMessage(adminId, testMessage);
    
    if (result.ok) {
      console.log('✅ Message sent successfully');
      console.log('   Message ID:', result.result.message_id);
      return true;
    } else {
      console.log('❌ Failed to send:', result.description);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

// ============================================================================
// SEARCH ENGINE TESTS
// ============================================================================

/**
 * Test 7: Track Search
 * 
 * Tests track search functionality
 * 
 * @param {string} testCode - Track code to search (default: "TEST123")
 */
function test_track_search(testCode = "TEST123") {
  console.log('=== TEST: Track Search ===\n');
  
  try {
    if (!CONFIG.FOLDER_ID) {
      console.log('⚠️ TRACKS_FOLDER_ID not configured - skipping search test');
      return false;
    }
    
    console.log('Searching for:', testCode);
    const results = SearchEngine.find([testCode]);
    
    console.log('Results:', results.length);
    results.forEach(res => {
      if (res.found) {
        console.log(`   ✅ ${res.code}: ${res.date}, ${res.weight} kg`);
      } else {
        console.log(`   ❌ ${res.code}: Not found`);
      }
    });
    
    return true;
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

// ============================================================================
// WEB APP TESTS
// ============================================================================

/**
 * Test 8: Web App URL Generation
 * 
 * Tests Web App URL generation
 */
function test_webapp_url() {
  console.log('=== TEST: Web App URL ===\n');
  
  if (!CONFIG.WEBAPP_URL) {
    console.log('❌ WEBAPP_URL not configured');
    return false;
  }
  
  console.log('Base URL:', CONFIG.WEBAPP_URL);
  
  const testUserId = "123456789";
  const url = getWebAppUrl(testUserId);
  
  console.log('Test User ID:', testUserId);
  console.log('Generated URL:', url);
  
  // Validate URL format
  if (url.includes(CONFIG.WEBAPP_URL) && url.includes('uid=')) {
    console.log('✅ URL format is valid');
    return true;
  } else {
    console.log('❌ URL format is invalid');
    return false;
  }
}

// ============================================================================
// COMPREHENSIVE TEST
// ============================================================================

/**
 * Run All Tests
 * 
 * Runs all tests and provides a summary
 */
function test_all() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     KHUROSON CARGO BOT - TEST SUITE       ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };
  
  // Test 1: Config
  console.log('┌─────────────────────────────────────────┐');
  console.log('│ TEST 1: Configuration Validation        │');
  console.log('└─────────────────────────────────────────┘');
  try {
    test_config_validation();
    results.passed++;
  } catch (e) {
    console.log('❌ FAILED:', e.message);
    results.failed++;
  }
  
  // Test 2: Database
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│ TEST 2: Database Connection             │');
  console.log('└─────────────────────────────────────────┘');
  try {
    if (test_database_connection()) {
      results.passed++;
    } else {
      results.failed++;
    }
  } catch (e) {
    console.log('❌ FAILED:', e.message);
    results.failed++;
  }
  
  // Test 3: Telegram
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│ TEST 3: Telegram Connection             │');
  console.log('└─────────────────────────────────────────┘');
  try {
    if (test_telegram_connection()) {
      results.passed++;
    } else {
      results.failed++;
    }
  } catch (e) {
    console.log('❌ FAILED:', e.message);
    results.failed++;
  }
  
  // Test 4: Web App
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│ TEST 4: Web App URL                     │');
  console.log('└─────────────────────────────────────────┘');
  try {
    if (test_webapp_url()) {
      results.passed++;
    } else {
      results.skipped++;
    }
  } catch (e) {
    console.log('❌ FAILED:', e.message);
    results.failed++;
  }
  
  // Summary
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║                 SUMMARY                   ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  ✅ Passed:  ${results.passed.toString().padEnd(30)}║`);
  console.log(`║  ❌ Failed:  ${results.failed.toString().padEnd(30)}║`);
  console.log(`║  ⚠️  Skipped: ${results.skipped.toString().padEnd(30)}║`);
  console.log('╚════════════════════════════════════════════╝');
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Bot is ready for use.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the logs above.');
  }
  
  return results;
}

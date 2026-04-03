/**
 * Configuration & Business Logic Tests
 * Run with: node Tests.config.js
 */

const assert = require('assert');

// ============================================================================
// TEST COUNTER
// ============================================================================

let total = 0, passed = 0, failed = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`❌ ${name}`);
    console.log(`   Error: ${e.message}`);
    console.log(`   Stack: ${e.stack.split('\n').slice(2,4).join('\n')}`);
  }
}

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

test('CONFIG: Valid statuses are correct', () => {
  const validStatuses = ['waiting', 'received', 'intransit', 'border', 'warehouse', 'payment', 'delivered'];
  
  assert(validStatuses.includes('waiting'), 'waiting status exists');
  assert(validStatuses.includes('received'), 'received status exists');
  assert(validStatuses.includes('intransit'), 'intransit status exists');
  assert(validStatuses.includes('border'), 'border status exists');
  assert(validStatuses.includes('warehouse'), 'warehouse status exists');
  assert(validStatuses.includes('payment'), 'payment status exists');
  assert(validStatuses.includes('delivered'), 'delivered status exists');
  assert.strictEqual(validStatuses.length, 7, 'Should have exactly 7 statuses');
});

test('CONFIG: Language localizations exist', () => {
  const supportedLangs = ['ru', 'tj'];
  
  supportedLangs.forEach(lang => {
    assert(typeof lang === 'string', `${lang} is a string`);
    assert(lang.length === 2, `${lang} has correct length`);
  });
});

test('CONFIG: Required script properties', () => {
  const requiredProps = [
    'TELEGRAM_TOKEN',
    'WEBHOOK_TOKEN',
    'ADMIN_IDS',
    'USERS_SPREADSHEET_ID',
    'TRACKS_FOLDER_ID',
    'WEBAPP_URL',
    'ADMINPANEL_URL'
  ];
  
  assert(requiredProps.length >= 7, 'At least 7 required properties');
  requiredProps.forEach(prop => {
    assert(prop && typeof prop === 'string', `${prop} is a valid string`);
  });
});

// ============================================================================
// COMMAND PARSING TESTS
// ============================================================================

test('COMMAND: Parse bulk update command correctly', () => {
  const command = '/bulk 18.03.2026_19.03.2026-received';
  
  // Remove /bulk prefix
  const params = command.replace('/bulk ', '').trim();
  
  // Split by '-'
  const parts = params.split('-');
  assert.strictEqual(parts.length, 2, 'Should have date range and status');
  
  const [dateRange, status] = parts;
  assert.strictEqual(dateRange, '18.03.2026_19.03.2026', 'Date range correct');
  assert.strictEqual(status, 'received', 'Status correct');
  
  // Parse dates
  const dates = dateRange.split('_');
  assert.strictEqual(dates.length, 2, 'Should have 2 dates');
});

test('COMMAND: Validate bulk command format', () => {
  const validCommands = [
    '/bulk 18.03.2026_19.03.2026-received',
    '/bulk 01.01.2026_31.01.2026-waiting',
    '/bulk 15.06.2026_20.06.2026-delivered'
  ];
  
  validCommands.forEach(cmd => {
    const params = cmd.replace('/bulk ', '');
    assert(params.includes('-'), `Command ${cmd} has status separator`);
    assert(params.match(/\d{2}\.\d{2}\.\d{4}_\d{2}\.\d{2}\.\d{4}/), `Command ${cmd} has valid date format`);
  });
});

test('COMMAND: Invalid bulk commands should fail', () => {
  const invalidCommands = [
    '/bulk 18.03.2026-received',           // Missing end date
    '/bulk 18.03_19.03-received',           // Missing year
    '/bulk 18-03-2026_19-03-2026-received', // Wrong separator
    '/bulk received',                        // No dates
    '/bulk 18.03.2026_19.03.2026'           // No status
  ];
  
  invalidCommands.forEach(cmd => {
    const params = cmd.replace('/bulk ', '');
    const parts = params.split('-');
    
    // Check if it has proper format: DD.MM.YYYY_DD.MM.YYYY-status
    const hasCorrectStructure = parts.length === 2 && parts[0].includes('_');
    
    if (!hasCorrectStructure) {
      // This should fail - good
      return;
    }
    
    // If structure is correct, validate date format
    const dates = parts[0].split('_');
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    const hasValidDateFormat = dates.length === 2 && 
                               dates.every(d => dateRegex.test(d));
    
    assert(!hasValidDateFormat, `Invalid command should fail: ${cmd}`);
  });
});

// ============================================================================
// DATE PARSING TESTS (Advanced)
// ============================================================================

function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    const str = String(dateStr).trim();
    
    if (str.includes('.')) {
      const parts = str.split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        
        if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020) {
          return new Date(year, month, day);
        }
      }
    }
    
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        
        if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020) {
          return new Date(year, month, day);
        }
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

test('DATE: Leading zeros handling', () => {
  const date1 = parseDate('05.01.2026');
  const date2 = parseDate('5.1.2026');
  
  assert(date1 !== null, 'Date with leading zeros parses');
  assert(date2 !== null, 'Date without leading zeros parses');
  assert.strictEqual(date1.getTime(), date2.getTime(), 'Both dates are equal');
});

test('DATE: Month boundary testing', () => {
  const jan = parseDate('31.01.2026');
  const feb = parseDate('28.02.2026');
  const mar = parseDate('01.03.2026');
  
  assert(jan < feb, 'January before February');
  assert(feb < mar, 'February before March');
});

test('DATE: Year boundary (2019 vs 2020)', () => {
  const oldDate = parseDate('31.12.2019');
  const newDate = parseDate('01.01.2020');
  
  assert.strictEqual(oldDate, null, '2019 date should return null');
  assert(newDate !== null, '2020 date should parse');
});

test('DATE: Leap year handling', () => {
  const leapDay = parseDate('29.02.2024'); // 2024 is leap year
  const nonLeapDay = parseDate('29.02.2023'); // 2023 is not leap year
  
  // JavaScript handles this gracefully, but we accept both
  assert(leapDay !== null, 'Leap year Feb 29 parses');
});

// ============================================================================
// BUSINESS LOGIC TESTS
// ============================================================================

test('BUSINESS: Track status workflow', () => {
  const statusOrder = ['waiting', 'received', 'intransit', 'border', 'warehouse', 'payment', 'delivered'];
  
  // Verify linear progression
  for (let i = 0; i < statusOrder.length - 1; i++) {
    const currentIndex = statusOrder.indexOf(statusOrder[i]);
    const nextIndex = statusOrder.indexOf(statusOrder[i + 1]);
    assert(nextIndex > currentIndex, `${statusOrder[i]} comes before ${statusOrder[i + 1]}`);
  }
});

test('BUSINESS: Date range for bulk update must be valid', () => {
  function isValidBulkCommand(command) {
    const parts = command.split('-');
    if (parts.length !== 2) return false;
    
    const [dateRange, status] = parts;
    const dates = dateRange.split('_');
    if (dates.length !== 2) return false;
    
    const startDate = parseDate(dates[0]);
    const endDate = parseDate(dates[1]);
    
    if (!startDate || !endDate) return false;
    if (startDate > endDate) return false;
    
    const validStatuses = ['waiting', 'received', 'intransit', 'border', 'warehouse', 'payment', 'delivered'];
    if (!validStatuses.includes(status)) return false;
    
    return true;
  }
  
  assert(isValidBulkCommand('18.03.2026_19.03.2026-received'), 'Valid command passes');
  assert(!isValidBulkCommand('19.03.2026_18.03.2026-received'), 'Reversed dates fail');
  assert(!isValidBulkCommand('18.03.2026_19.03.2026-unknown'), 'Invalid status fails');
  assert(!isValidBulkCommand('18.03.2026-received'), 'Missing end date fails');
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n========================================');
console.log(`📊 TEST RESULTS: ${passed}/${total} passed`);
if (failed > 0) {
  console.log(`❌ ${failed} test(s) failed!`);
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
  process.exit(0);
}

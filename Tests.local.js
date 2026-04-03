/**
 * Local Test Suite - Date Parsing & Bulk Update Logic
 * Run with: node Tests.local.js
 */

const assert = require('assert');

// ============================================================================
// IMPLEMENTATION COPIES (from Admin.gs - for local testing)
// ============================================================================

/**
 * Parse date string DD.MM.YYYY to Date object
 * @param {string} dateStr
 * @returns {Date|null}
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  try {
    const str = String(dateStr).trim();

    // Try DD.MM.YYYY format
    if (str.includes('.')) {
      const parts = str.split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-11
        const year = parseInt(parts[2], 10);

        if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020) {
          return new Date(year, month, day);
        }
      }
    }

    // Try YYYY-MM-DD format (ISO)
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

    // Try to parse as Date object directly
    const date = new Date(str);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 2020) {
      return date;
    }

    return null;
  } catch (e) {
    return null;
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const validStatuses = ['waiting', 'received', 'intransit', 'border', 'warehouse', 'payment', 'delivered'];

// ============================================================================
// TEST RUNNER
// ============================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`✅ PASS: ${name}`);
  } catch (e) {
    failedTests++;
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${e.message}`);
  }
}

// ============================================================================
// TESTS: parseDate function
// ============================================================================

test('parseDate: DD.MM.YYYY format', () => {
  const date = parseDate('18.03.2026');
  assert(date !== null, 'Should parse date');
  assert.strictEqual(date.getDate(), 18, 'Day mismatch');
  assert.strictEqual(date.getMonth(), 2, 'Month mismatch (expected 2 for March)');
  assert.strictEqual(date.getFullYear(), 2026, 'Year mismatch');
});

test('parseDate: DD.MM.YYYY with single digit month', () => {
  const date = parseDate('5.1.2026');
  assert(date !== null, 'Should parse date');
  assert.strictEqual(date.getDate(), 5, 'Day mismatch');
  assert.strictEqual(date.getMonth(), 0, 'Month mismatch (January)');
  assert.strictEqual(date.getFullYear(), 2026, 'Year mismatch');
});

test('parseDate: YYYY-MM-DD ISO format', () => {
  const date = parseDate('2026-03-18');
  assert(date !== null, 'Should parse ISO date');
  assert.strictEqual(date.getDate(), 18, 'Day mismatch');
  assert.strictEqual(date.getMonth(), 2, 'Month mismatch');
  assert.strictEqual(date.getFullYear(), 2026, 'Year mismatch');
});

test('parseDate: invalid date returns null', () => {
  const date = parseDate('invalid');
  assert.strictEqual(date, null, 'Invalid date should return null');
});

test('parseDate: empty string returns null', () => {
  const date = parseDate('');
  assert.strictEqual(date, null, 'Empty string should return null');
});

test('parseDate: null returns null', () => {
  const date = parseDate(null);
  assert.strictEqual(date, null, 'Null should return null');
});

test('parseDate: invalid day (32) returns null', () => {
  const date = parseDate('32.03.2026');
  assert.strictEqual(date, null, 'Day 32 should return null');
});

test('parseDate: invalid month (13) returns null', () => {
  const date = parseDate('18.13.2026');
  assert.strictEqual(date, null, 'Month 13 should return null');
});

test('parseDate: old year (2019) returns null', () => {
  const date = parseDate('18.03.2019');
  assert.strictEqual(date, null, 'Year before 2020 should return null');
});

// ============================================================================
// TESTS: Date Comparison
// ============================================================================

test('Date comparison: start < end is valid', () => {
  const start = parseDate('18.03.2026');
  const end = parseDate('19.03.2026');
  assert(start < end, 'Start should be before end');
});

test('Date comparison: start > end is invalid', () => {
  const start = parseDate('19.03.2026');
  const end = parseDate('18.03.2026');
  assert(start > end, 'Start should be after end (invalid case)');
});

test('Date comparison: start == end is valid (same day)', () => {
  const start = parseDate('18.03.2026');
  const end = parseDate('18.03.2026');
  assert.strictEqual(start.getTime(), end.getTime(), 'Same dates should be equal');
});

// ============================================================================
// TESTS: Command Parsing
// ============================================================================

test('Command parsing: valid format', () => {
  const command = '18.03.2026_19.03.2026-received';
  const parts = command.split('-');
  assert.strictEqual(parts.length, 2, 'Should have 2 parts');
  assert.strictEqual(parts[0], '18.03.2026_19.03.2026', 'Date range mismatch');
  assert.strictEqual(parts[1], 'received', 'Status mismatch');
});

test('Command parsing: missing status', () => {
  const command = '18.03.2026_19.03.2026';
  const parts = command.split('-');
  assert.notStrictEqual(parts.length, 2, 'Should fail without status');
});

test('Command parsing: invalid date range', () => {
  const command = '18.03.2026-received';
  const dateRange = command.split('-')[0];
  const dates = dateRange.split('_');
  assert.notStrictEqual(dates.length, 2, 'Should fail with single date');
});

// ============================================================================
// TESTS: Status Validation
// ============================================================================

test('Status validation: valid statuses', () => {
  const validStatuses = ['waiting', 'received', 'intransit', 'border', 'warehouse', 'payment', 'delivered'];
  assert.strictEqual(validStatuses.length, 7, 'Should have 7 valid statuses');
});

test('Status validation: invalid status', () => {
  const validStatuses = ['waiting', 'received', 'intransit', 'border', 'warehouse', 'payment', 'delivered'];
  const invalidStatus = 'unknown';
  assert(!validStatuses.includes(invalidStatus), 'Unknown status should be invalid');
});

// ============================================================================
// TESTS: Real-world Scenarios
// ============================================================================

test('Real scenario: valid command 18.03_19.03-received', () => {
  const command = '18.03.2026_19.03.2026-received';
  const parts = command.split('-');
  const dates = parts[0].split('_');

  const startDate = parseDate(dates[0]);
  const endDate = parseDate(dates[1]);
  const status = parts[1];

  assert(startDate !== null, 'Start date should parse');
  assert(endDate !== null, 'End date should parse');
  assert(startDate <= endDate, 'Start should be <= end');
  assert(validStatuses.includes(status), 'Status should be valid');
});

test('Invalid scenario: reversed dates 19.03_18.03-received', () => {
  const command = '19.03.2026_18.03.2026-received';
  const parts = command.split('-');
  const dates = parts[0].split('_');

  const startDate = parseDate(dates[0]);
  const endDate = parseDate(dates[1]);

  assert(startDate > endDate, 'Start should be > end (invalid)');
});

test('Edge case: same day range 18.03_18.03-received', () => {
  const command = '18.03.2026_18.03.2026-received';
  const parts = command.split('-');
  const dates = parts[0].split('_');

  const startDate = parseDate(dates[0]);
  const endDate = parseDate(dates[1]);

  assert(startDate !== null, 'Start date should parse');
  assert.strictEqual(startDate.getTime(), endDate.getTime(), 'Start and end should be same day');
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n========================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} passed`);
if (failedTests > 0) {
  console.log(`❌ ${failedTests} test(s) failed!`);
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
  process.exit(0);
}

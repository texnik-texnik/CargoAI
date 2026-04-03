/**
 * TEST SUITE - Date Parsing & Bulk Update Logic
 * Tests for Admin.gs functions
 */

// ============================================================================
// TEST RUNNER
// ============================================================================

function runAllTests() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, fn) {
    results.total++;
    try {
      fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      Logger.log(`✅ PASS: ${name}`);
    } catch (e) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: e.message });
      Logger.log(`❌ FAIL: ${name}\n   Error: ${e.message}`);
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  function assertEquals(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message || 'Assertion failed'}\n   Expected: ${expected}\n   Actual: ${actual}`);
    }
  }

  // ============================================================================
  // TESTS: parseDate function
  // ============================================================================

  test('parseDate: DD.MM.YYYY format', function() {
    const date = parseDate('18.03.2026');
    assert(date !== null, 'Should parse date');
    assertEquals(date.getDate(), 18, 'Day');
    assertEquals(date.getMonth(), 2, 'Month (0-indexed)'); // March = 2
    assertEquals(date.getFullYear(), 2026, 'Year');
  });

  test('parseDate: DD.MM.YYYY with single digit month', function() {
    const date = parseDate('5.1.2026');
    assert(date !== null, 'Should parse date');
    assertEquals(date.getDate(), 5, 'Day');
    assertEquals(date.getMonth(), 0, 'Month (January)');
    assertEquals(date.getFullYear(), 2026, 'Year');
  });

  test('parseDate: YYYY-MM-DD ISO format', function() {
    const date = parseDate('2026-03-18');
    assert(date !== null, 'Should parse ISO date');
    assertEquals(date.getDate(), 18, 'Day');
    assertEquals(date.getMonth(), 2, 'Month');
    assertEquals(date.getFullYear(), 2026, 'Year');
  });

  test('parseDate: invalid date returns null', function() {
    const date = parseDate('invalid');
    assertEquals(date, null, 'Invalid date should return null');
  });

  test('parseDate: empty string returns null', function() {
    const date = parseDate('');
    assertEquals(date, null, 'Empty string should return null');
  });

  test('parseDate: null returns null', function() {
    const date = parseDate(null);
    assertEquals(date, null, 'Null should return null');
  });

  test('parseDate: invalid day (32) returns null', function() {
    const date = parseDate('32.03.2026');
    assertEquals(date, null, 'Day 32 should return null');
  });

  test('parseDate: invalid month (13) returns null', function() {
    const date = parseDate('18.13.2026');
    assertEquals(date, null, 'Month 13 should return null');
  });

  test('parseDate: old year (2019) returns null', function() {
    const date = parseDate('18.03.2019');
    assertEquals(date, null, 'Year before 2020 should return null');
  });

  // ============================================================================
  // TESTS: Date Comparison
  // ============================================================================

  test('Date comparison: start < end is valid', function() {
    const start = parseDate('18.03.2026');
    const end = parseDate('19.03.2026');
    assert(start < end, 'Start should be before end');
  });

  test('Date comparison: start > end is invalid', function() {
    const start = parseDate('19.03.2026');
    const end = parseDate('18.03.2026');
    assert(start > end, 'Start should be after end (invalid case)');
  });

  test('Date comparison: start == end is valid (same day)', function() {
    const start = parseDate('18.03.2026');
    const end = parseDate('18.03.2026');
    assert(start.getTime() === end.getTime(), 'Same dates should be equal');
  });

  // ============================================================================
  // TESTS: Command Parsing
  // ============================================================================

  test('Command parsing: valid format', function() {
    const command = '18.03.2026_19.03.2026-received';
    const parts = command.split('-');
    assertEquals(parts.length, 2, 'Should have 2 parts');
    assertEquals(parts[0], '18.03.2026_19.03.2026', 'Date range');
    assertEquals(parts[1], 'received', 'Status');
  });

  test('Command parsing: missing status', function() {
    const command = '18.03.2026_19.03.2026';
    const parts = command.split('-');
    assert(parts.length !== 2, 'Should fail without status');
  });

  test('Command parsing: invalid date range', function() {
    const command = '18.03.2026-received';
    const dateRange = command.split('-')[0];
    const dates = dateRange.split('_');
    assert(dates.length !== 2, 'Should fail with single date');
  });

  // ============================================================================
  // TESTS: Status Validation
  // ============================================================================

  test('Status validation: valid statuses', function() {
    const validStatuses = ['waiting', 'received', 'intransit', 'border', 'warehouse', 'payment', 'delivered'];
    assertEquals(validStatuses.length, 7, 'Should have 7 valid statuses');
  });

  test('Status validation: invalid status', function() {
    const validStatuses = ['waiting', 'received', 'intransit', 'border', 'warehouse', 'payment', 'delivered'];
    const invalidStatus = 'unknown';
    assert(!validStatuses.includes(invalidStatus), 'Unknown status should be invalid');
  });

  // ============================================================================
  // TESTS: Real-world Scenarios
  // ============================================================================

  test('Real scenario: valid command 18.03_19.03-received', function() {
    const command = '18.03.2026_19.03.2026-received';
    const parts = command.split('-');
    const dates = parts[0].split('_');

    const startDate = parseDate(dates[0]);
    const endDate = parseDate(dates[1]);
    const status = parts[1];

    assert(startDate !== null, 'Start date should parse');
    assert(endDate !== null, 'End date should parse');
    assert(startDate <= endDate, 'Start should be <= end');
    assert(['waiting', 'received', 'intransit', 'border', 'warehouse', 'payment', 'delivered'].includes(status), 'Status should be valid');
  });

  test('Invalid scenario: reversed dates 19.03_18.03-received', function() {
    const command = '19.03.2026_18.03.2026-received';
    const parts = command.split('-');
    const dates = parts[0].split('_');

    const startDate = parseDate(dates[0]);
    const endDate = parseDate(dates[1]);

    assert(startDate > endDate, 'Start should be > end (invalid)');
  });

  test('Edge case: same day range 18.03_18.03-received', function() {
    const command = '18.03.2026_18.03.2026-received';
    const parts = command.split('-');
    const dates = parts[0].split('_');

    const startDate = parseDate(dates[0]);
    const endDate = parseDate(dates[1]);

    assert(startDate !== null, 'Start date should parse');
    assert(startDate.getTime() === endDate.getTime(), 'Start and end should be same day');
  });

  // ============================================================================
  // RESULTS
  // ============================================================================

  Logger.log('\n========================================');
  Logger.log(`TEST RESULTS: ${results.passed}/${results.total} passed`);
  if (results.failed > 0) {
    Logger.log(`❌ ${results.failed} test(s) failed!`);
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      Logger.log(`   - ${t.name}: ${t.error}`);
    });
  } else {
    Logger.log('✅ All tests passed!');
  }
  Logger.log('========================================\n');

  return results;
}

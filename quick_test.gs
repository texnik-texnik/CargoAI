/**
 * Quick Test - Shows test results clearly
 * Run with: gas-fakes -f quick_test.gs
 */

function main() {
  const results = [];
  
  // Test 1: Config constants exist
  try {
    if (TIMEOUT_STANDARD === 30000) {
      results.push('✅ Config constants loaded');
    } else {
      results.push('❌ Config constants wrong');
    }
  } catch (e) {
    results.push('❌ Config error: ' + e.message);
  }
  
  // Test 2: Localization works
  try {
    const tjWelcome = TEXT.tj.welcome('Test');
    const ruWelcome = TEXT.ru.welcome('Test');
    if (tjWelcome.includes('Test') && ruWelcome.includes('Test')) {
      results.push('✅ Localization working');
    } else {
      results.push('❌ Localization broken');
    }
  } catch (e) {
    results.push('❌ Localization error: ' + e.message);
  }
  
  // Test 3: Validation functions
  try {
    const phoneValid = isValidPhone('+992900123456');
    const phoneInvalid = isValidPhone('123');
    const nameValid = isValidName('Emomali');
    const nameInvalid = isValidName('Ab');
    
    if (phoneValid && !phoneInvalid && nameValid && !nameInvalid) {
      results.push('✅ Validation functions working');
    } else {
      results.push('❌ Validation functions broken');
    }
  } catch (e) {
    results.push('❌ Validation error: ' + e.message);
  }
  
  // Test 4: getLocalization
  try {
    const loc = getLocalization('tj');
    if (loc === TEXT.tj) {
      results.push('✅ getLocalization working');
    } else {
      results.push('❌ getLocalization broken');
    }
  } catch (e) {
    results.push('❌ getLocalization error: ' + e.message);
  }
  
  // Test 5: CONFIG object
  try {
    if (CONFIG.WEBHOOK_TOKEN && CONFIG.ADMIN_IDS) {
      results.push('✅ CONFIG object loaded');
    } else {
      results.push('⚠️ CONFIG missing some properties (expected in local test)');
    }
  } catch (e) {
    results.push('❌ CONFIG error: ' + e.message);
  }
  
  // Output results
  Logger.log('=== KHUROSON CARGO BOT - QUICK TEST ===\n');
  results.forEach(r => Logger.log(r));
  Logger.log('\n=== TEST COMPLETE ===');
  
  return results.filter(r => r.startsWith('✅')).length + '/' + results.length + ' passed';
}

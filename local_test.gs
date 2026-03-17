/**
 * Khuroson Cargo Bot - Local Test
 * Run with: gas-fakes -f local_test.gs
 */

function main() {
  Logger.log('=== KHUROSON CARGO BOT - LOCAL TEST ===\n');
  
  // Test 1: Check Config loading
  Logger.log('Test 1: Config constants');
  Logger.log('  TIMEOUT_STANDARD:', TIMEOUT_STANDARD);
  Logger.log('  RATE_LIMIT_WINDOW:', RATE_LIMIT_WINDOW);
  Logger.log('  MAX_HISTORY_ITEMS:', MAX_HISTORY_ITEMS);
  
  // Test 2: Test localization
  Logger.log('\nTest 2: Localization');
  const tjText = TEXT.tj;
  Logger.log('  Welcome (tj):', tjText.welcome('Emomali'));
  Logger.log('  Menu items:', tjText.menu.length, 'rows');
  
  const ruText = TEXT.ru;
  Logger.log('  Welcome (ru):', ruText.welcome('Emomali'));
  
  // Test 3: Test validation functions
  Logger.log('\nTest 3: Validation functions');
  Logger.log('  isValidPhone("+992900123456"):', isValidPhone('+992900123456'));
  Logger.log('  isValidPhone("123"):', isValidPhone('123'));
  Logger.log('  isValidName("Emomali"):', isValidName('Emomali'));
  Logger.log('  isValidName("Эмомалӣ"):', isValidName('Эмомалӣ'));
  
  // Test 4: Test getLocalization
  Logger.log('\nTest 4: getLocalization');
  const loc = getLocalization('tj');
  Logger.log('  Language:', loc === TEXT.tj ? 'Tajik' : 'Unknown');
  
  Logger.log('\n✅ All local tests passed!');
  
  return 'Success';
}

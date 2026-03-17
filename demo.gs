/**
 * Simple gas-fakes demo
 * Run with: gas-fakes -f demo.gs
 */

function main() {
  Logger.log('=== GAS-FAKES DEMO ===');
  Logger.log('Current time:', new Date().toLocaleString());
  
  // Test basic GAS APIs
  Logger.log('\nTesting Logger...');
  Logger.log('Hello from Logger!');
  
  Logger.log('\nTesting console...');
  console.log('Hello from console!');
  
  Logger.log('\n✅ gas-fakes is working!');
  
  return 'Success!';
}

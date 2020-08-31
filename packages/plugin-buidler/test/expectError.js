async function expectError(fn, expectedError) {
  try {
    await fn();
    console.error('Test run was expected to raise errors but got none instead\n');
    console.error('    Expected error:', expectedError);
    process.exit(1);
  } catch (error) {
    const [actualError] = error.message.split('\n');
    if (actualError !== expectedError) {
      console.error('Test run raised a different error than expected\n');
      console.error('    Expected error:', expectedError);
      console.error('    Actual error:  ', actualError);
      process.exit(1);
    }
    process.exit(0);
  }
}

module.exports = expectError;

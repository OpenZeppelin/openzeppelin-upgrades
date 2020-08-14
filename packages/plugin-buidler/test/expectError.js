function expectError(fn, expectedError) {
  fn()
    .then(() => {
      console.error('Test run was expected to raise errors but got none instead');
      console.error('Expected error:', expectedError);
      process.exit(1);
    })
    .catch(error => {
      const actualError = error.message.split('\n')[0];
      if (actualError !== expectedError) {
        console.error('Test run raised a different error than expected');
        console.error('Expected error:', expectedError);
        console.error('Actual error:  ', actualError);
        process.exit(1);
      }

      process.exit(0);
    });
}

module.exports = expectError;

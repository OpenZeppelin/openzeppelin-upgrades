const test = require('ava');
const proc = require('promisified/child_process');

function testFile(name) {
  test(name, async t => {
    try {
      const child = await proc.execFile('node', [name], { cwd: 'test' });
      t.pass();
    } catch (e) {
      t.fail(e.stderr);
    }
  });
}

testFile('01');

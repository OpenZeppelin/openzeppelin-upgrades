const test = require('ava');
const proc = require('promisified/child_process');
const events = require('events');
const { promisify } = require('util');

const rimraf = promisify(require('rimraf'));

test.beforeEach(async () => {
  await rimraf('test/.openzeppelin');
});

test.before(async t => {
  const compile = proc.spawn('buidler', ['compile'], {
    cwd: 'test',
    stdio: 'inherit',
  });
  const [status] = await events.once(compile, 'exit');
  t.is(status, 0, 'compilation failed');
});

function testFile(name) {
  test.serial(name, async t => {
    try {
      await proc.execFile('node', [name], { cwd: 'test' });
      t.pass();
    } catch (e) {
      t.log(e.stdout);
      t.fail(e.stderr);
    }
  });
}

testFile('happy-path');
testFile('happy-path-with-library');
testFile('happy-path-with-structs');
testFile('happy-path-with-enums');
testFile('linked-libraries');
testFile('change-admin-happy-path');
testFile('transfer-admin-ownership-happy-path');
testFile('deploy-validation');
testFile('upgrade-validation');
testFile('upgrade-storage');
testFile('admin-validation');
testFile('initializers');

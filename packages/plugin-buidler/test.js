const test = require('ava');
const proc = require('promisified/child_process');
const events = require('events');
const { promisify } = require('util');

const rimraf = promisify(require('rimraf'));

test.before(async t => {
  await rimraf('test/.openzeppelin');
  const compile = proc.spawn('buidler', ['compile'], {
    cwd: 'test',
    stdio: 'inherit',
  });
  const [status] = await events.once(compile, 'exit');
  t.is(status, 0, 'compilation failed');
});

function testFile(name) {
  test(name, async t => {
    try {
      await proc.execFile('node', [name], { cwd: 'test' });
      t.pass();
    } catch (e) {
      t.log(e.stdout);
      t.fail(e.stderr);
    }
  });
}

testFile('01');

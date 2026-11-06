import {spawn} from 'node:child_process';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = '/tmp/tracardi-qa';
const project = '/home/swumplurd/Documentos/devsarrollo/repos/tracardi-mastv';
const out = root + '/final-regression-evidence';
await mkdir(out, {recursive: true});
const runs = [];
for (const id of ['001','002','003']) {
  const command = 'node ' + root + '/final-us' + id + '.mjs';
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [root + '/final-us' + id + '.mjs'], {cwd: project, stdio: 'inherit'});
    child.once('error', reject); child.once('exit', resolve);
  });
  const results = JSON.parse(await readFile(root + '/final-us' + id + '-evidence/results.json', 'utf8'));
  runs.push({story: 'US-' + id, command, cwd: project, exitCode: code, results: results.results});
}
const hashes = {};
for (const file of ['index.html','css/styles.css','js/app.js','js/catalog.js','js/config.js','js/tracking.js','js/interests.js','js/location.js']) hashes[file] = createHash('sha256').update(await readFile(project + '/' + file)).digest('hex');
await writeFile(out + '/source-hashes.json', JSON.stringify(hashes, null, 2));
await writeFile(out + '/results.json', JSON.stringify({scope: '13 casos de regresión por cambios US004', date: new Date().toISOString(), runs}, null, 2));
const flat = runs.flatMap(run => run.results);
const failed = flat.filter(result => result.status !== 'PASS').length;
console.log(JSON.stringify({total: flat.length, passed: flat.length - failed, failed}));
process.exitCode = failed || flat.length !== 13 || runs.some(run => run.exitCode !== 0) ? 1 : 0;

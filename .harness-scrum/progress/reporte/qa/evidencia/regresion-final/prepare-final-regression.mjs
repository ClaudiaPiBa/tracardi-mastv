import {readFile, writeFile} from 'node:fs/promises';
const root = '/tmp/tracardi-qa';
const plans = [
  {input: 'us001.mjs', output: 'final-us001.mjs', oldDir: 'us001-evidence', newDir: 'final-us001-evidence', oldLoop: 'of cases){', newLoop: 'of cases.filter((_, index) => [1,3,4,6,7,10].includes(index))){'},
  {input: 'us002-revision2.mjs', output: 'final-us002.mjs', oldDir: 'us002-r2-evidence', newDir: 'final-us002-evidence', oldLoop: 'cases.filter((_,index)=>[11,15,16].includes(index))', newLoop: 'cases.filter((_,index)=>[8,11,15,16].includes(index))'},
  {input: 'us003.mjs', output: 'final-us003.mjs', oldDir: 'us003-evidence', newDir: 'final-us003-evidence', oldLoop: 'of cases){', newLoop: 'of cases.filter((_, index) => [8,14,15].includes(index))){'}
];
for (const plan of plans) {
  let code = await readFile(root + '/' + plan.input, 'utf8');
  if (!code.includes(plan.oldLoop) || !code.includes(plan.oldDir)) throw Error('Runner fuente cambió: ' + plan.input);
  code = code.replace(plan.oldLoop, plan.newLoop).replaceAll(plan.oldDir, plan.newDir);
  code = code.replace(/scope:'[^']*'/g, "scope:'Regresión final focal de superficies modificadas por US004'");
  await writeFile(root + '/' + plan.output, '// Preparación QA: regresión focal; no ejecutar antes de baseline final.\n' + code);
}
console.log('Preparados 3 runners focales, 13 casos: catálogo6, tracking4, intereses3. No se ejecutó Chrome.');

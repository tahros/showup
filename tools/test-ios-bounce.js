// Native-project fixture tests are part of the standard release suite.
const {spawnSync}=require('child_process'),path=require('path');
const r=spawnSync(process.env.PYTHON||(process.platform==='win32'?'python':'python3'),
 [path.join(__dirname,'test-ios-config.py'),process.argv[2]||'.'],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
if(r.error)console.error(r.error);
process.exit(r.status===0?0:1);

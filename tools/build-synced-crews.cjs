// Build genuine 60fps sheets from the approved 3D sources, not old WebP frames.
// Unwrapped source seconds. Preserve every part of the original loop; map
// right arrival (13.6s) and left arrival (22.4s / 6.4s) to opposite half cycles.
// The smooth correction has matching speed and acceleration at the loop seam.
// Unlike the old piecewise map, it never fast-forwards a turnaround/first hop.
function sourceSeconds(u){return 13.6+16*u+.8*Math.sin(Math.PI*u)**2;}
module.exports={sourceSeconds};
if(require.main===module){
 const path=require('path'),root=path.resolve(process.argv[2]||'.');
 const result=require('child_process').spawnSync(process.execPath,[path.join(__dirname,'render-synced-60.cjs'),path.dirname(root)],{stdio:'inherit'});
 process.exit(result.status??1);
}

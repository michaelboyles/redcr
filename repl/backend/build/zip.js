// ================================================================================================
// This build script takes the output of ./dist and creates a zip file suitable for uploading to
// AWS.
// ================================================================================================

const fs = require('fs');
const archiver = require('archiver');

const output = fs.createWriteStream('./dist/redcr.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function() {
    console.log(`Server zip file size: ${archive.pointer()} bytes`);
});
archive.on('error', err => { throw err; });
archive.on('warning', warning => {
    if (warning.code === 'ENOENT') {
        console.warn(warning);
    } else {
        throw warning;
    }
});

archive.pipe(output);
archive.glob('*.js', {cwd: './dist'});
archive.glob('node_modules/**', {cwd: './dist'});
archive.finalize();

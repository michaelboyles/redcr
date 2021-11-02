// ================================================================================================
// This build script copies some of TypeScript's lib directory from node modules into dist. They
// are needed at runtime to provide type-checking, which is needed for some of redcr's
// functionality. The REPL compilation can work without these, but the compiled result might differ
// from the true output of the compilation when running normally.
// ================================================================================================

const fs = require('fs');
const util = require('util');
const path = require('path');
const copyFile = util.promisify(fs.copyFile);

const nodeModules = './node_modules/typescript/lib/';
const filenames = fs.readdirSync(nodeModules);
filenames.forEach(async (filename) => {
    if (filename.startsWith('lib') && filename.endsWith('.d.ts')) {
        const inputPath = nodeModules + filename;
        const outputPath = './dist/' + inputPath;
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        try {
            await copyFile(inputPath, outputPath);
        }
        catch (err) {
            throw Error(`Failed to copy ${inputPath} to ${outputPath}. Cause: ${err}`);
        }
    }
});

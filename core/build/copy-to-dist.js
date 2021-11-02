const fs = require('fs');

const includedFiles = ['package.json', '../LICENSE', '../README.md'];
includedFiles.forEach(file => {
    const fileName = file.substring(file.lastIndexOf('/'));
    fs.copyFile(file, 'dist/' + fileName, err => {
        if (err) throw err;
    });
});

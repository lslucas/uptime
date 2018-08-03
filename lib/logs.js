const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.logs/');

// append a string to a file. Create the file if it does not exist.
lib.append = function(file, str, callback) {
  fs.open(lib.baseDir + file + '.log', 'a', function(err, fileDescriptor) {
    if (!err && fileDescriptor) {
      fs.appendFile(fileDescriptor, str + "\n", function(err) {
        if (!err) {
          fs.close(fileDescriptor, function(err) {
            if (!err) {
              callback(false);
            } else {
              callback('Error closing file that was being appended');
            }
          });
        } else {
          callback('Error appending to log file');
        }
      });
    } else {
      callback('Could not open log file');
    }
  })
};

module.exports = lib;
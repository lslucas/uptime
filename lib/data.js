/**
 * Library for storing and editing data
 */

const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// container
let lib = {};

lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = function(dir, file, data, callback) {
  // open file to +w
  fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function(err, fileDescriptor) {
    if (!err && fileDescriptor) {
      // format data
      let stringData = JSON.stringify(data);

      fs.writeFile(fileDescriptor, stringData, function(err) {
        if (!err) {
          fs.close(fileDescriptor, function(err) {
            if (!err) {
              callback(false);
            } else {
              callback('Error closing new file');
            }
          });
        } else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('Could not create new file, it may already exist');
    }
  });
};

lib.read = function(dir, file, callback) {
  fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', function(err, data) {
    if (!err && data) {
      let parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    } else {
      callback(err, data);
    }
  });
};

lib.update = function(dir, file, data, callback) {
  fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function(err, fileDescriptor) {
    if (!err && fileDescriptor) {
      // format data
      let stringData = JSON.stringify(data);

      // truncate because maybe already exist data
      fs.truncate(fileDescriptor, function(err) {
        if (!err) {
          fs.writeFile(fileDescriptor, stringData, function(err) {
            if (!err) {
              fs.close(fileDescriptor, function(err) {
                if (!err) {
                    callback(false);
                } else {
                    callback('Error closing new file');
                }
              });
            } else {
              callback('Error writing to new file');
            }
          });
        } else {
          callback('Error truncating file');
        }
      })

    } else {
      callback('Could not open the file for update. Maybe it doesn\'t exist');
    }
  });
};

lib.delete = function(dir, file, callback) {
  fs.unlink(lib.baseDir + dir + '/' + file + '.json', function(err) {
    if (!err) {
      callback(false);
    } else {
      callback('Could not delete ');
    }
  });
};

// list all the items in a dir
lib.list = function(dir, callback) {
  fs.readdir(lib.baseDir + dir + '/', function(err, data) {
    if (!err && data && data.length > 0) {
      let trimmedFileNames = [];
      data.forEach(function(fileName) {
        trimmedFileNames.push(fileName.replace('.json', ''));
      });

      callback(false, trimmedFileNames);
    } else {
      callback(err, data);
    }
  })
};



// export
module.exports = lib;
/**
 * Helpers for helping
 */
const crypto = require('crypto');
const config = require('./config');

let helpers = {};


// SHA256
helpers.hash = function(str) {
  if (typeof(str) == 'string' && str.length) {
    let hash = crypto.createHmac('sha256', config.salt).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

helpers.parseJsonToObject = function(str) {
  try {
    let obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

helpers.createRandomString = function(strLength) {
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;

  if (!strLength) {
    return false;
  }

  let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz012456789';

  let str = '';
  for (var i = 0; i < strLength; i++) {
    str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
  }

  return str;
};

module.exports = helpers;
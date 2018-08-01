/**
 * Helpers for helping
 */
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');

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

/**
 * Send sms message with twilio
 * @param {*} phone with country code
 * @param {*} msg the message
 * @param {*} callback 
 * 
 * Example:
 * helpers.sendTwilioSms('somephonenumber with countrycode', 'Hello!', function(err) { console.log('this was an error', err); });
 */
helpers.sendTwilioSms = function(phone, msg, callback) {
  // validate parameters
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length < 1600 ? msg.trim() : false;

  if (!phone && !msg) {
    callback('Given parameters were missing or invalid');
  }

  // configure payload
  payload = {
    'From': config.twilio.fromPhone,
    'To': phone,
    'Body': msg
  };

  stringPayload = querystring.stringify(payload);

  // configure request details
  requestDetails = {
    'protocol': 'https:',
    'hostname': 'api.twilio.com',
    'method': 'POST',
    'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
    'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(stringPayload)
    }
  };

  // instantiate the request obj
  req = https.request(requestDetails, function(res) {
    // grab the status of the sent request
    status = res.statusCode;

    if (status == 200 || status == 201) {
      callback(false);
    } else {
      callback('Status code returned was '+ status);
    }
  });

  // bind to the error event so it doesn't get thrown
  req.on('error', function(e) {
    callback(e);
  });

  // add the payload
  req.write(stringPayload);

  // end req
  req.end();
}

module.exports = helpers;
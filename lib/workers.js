// deps
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');

// instantiate worker obj
const workers = {};

// lookup all checks, get their data, send to a validator 
workers.gatherAllChecks = function() {
  // get all existing checks
  _data.list('checks', function(err, checks) {
    if (!err && checks && checks.length) {
      checks.forEach(function(check) {
        // read the check data
        _data.read('checks', check, function(err, originalCheckData) {
          if (!err && originalCheckData) {
            // pass the data to the validator
            workers.validateCheckData(originalCheckData);
          } else {
            console.log('Error: reading one of the checks data');
          }
        });
      });
    } else {
      console.log('Error: could not found any checks to process');
    }
  });
};

// sanity-checking the check data
workers.validateCheckData = function(originalCheckData) {
  originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : false;
  originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id : false;
  originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone : false;
  originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
  originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url : false;
  originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(originalCheckData.method.toUpperCase()) > -1 ? originalCheckData.method : false;
  originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

  // Set the keys that may not be set (if the workers have never seen this check before)
  originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
  originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;
  
  // if all checks pass, pass the data to the next step of the process
  if (originalCheckData.id && 
      originalCheckData.userPhone &&
      originalCheckData.protocol &&
      originalCheckData.url &&
      originalCheckData.method &&
      originalCheckData.successCodes &&
      originalCheckData.timeoutSeconds) {
    workers.performCheck(originalCheckData);
  } else {
    console.log('Error: one of the checks is not properly formatted. Skiping it.');
  }
};

// send the original checkdata and outcome to the next step
workers.performCheck = function(originalCheckData) {
  // prepare the initial check outcome
  var checkOutcome = {
    'error': false,
    'responseCode': false
  };

  // mark that the outcome has not been sent yet
  var outcomeSent = false;

  // parse the hostname and path out the original check data
  var parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
  var hostname = parsedUrl.hostname;
  var path = parsedUrl.path; // using path and not pathname because I want the querystring

  // construct the request
  var requestDetails = {
    'protocol': originalCheckData.protocol + ':',
    'hostname': hostname,
    'method': originalCheckData.method.toUpperCase(),
    'path': path,
    'timeout': originalCheckData.timeoutSeconds * 1000
  };
  
  let _module = originalCheckData.protocol == 'http' ? http : https;

  let req = _module.request(requestDetails, function(res) {
    let status = res.statusCode;

    // update the check outcome and pass the data along
    checkOutcome.responseCode = status;

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // bind errors so they dont throw
  req.on('error', function(e) {
    checkOutcome.error = {
      'error': true,
      'value': e
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // bind the timeout
   req.on('timeout', function(e) {
    checkOutcome.error = {
      'error': true,
      'value': 'timeout'
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.end();
};


// process the check outcome and update the check data as needed, trigger an alert to the owner if needed
workers.processCheckOutcome = function(originalCheckData, checkOutcome) {
  // decide if the check is up or down
  let state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

  // decide if an alert is warranted
  let alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;
  
  // update the check data
  let newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  // save the updates to disk
  _data.update('checks', newCheckData.id, newCheckData, function(err) {
    if (!err) {
      // send to the next phase
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log('Nothing changed in the check ' + newCheckData.id);
      }
    } else {
      console.log('Error: trying to save updates to check ' + newCheckData.id);
    }
  })
};

// alert user to a change in their check status data.
workers.alertUserToStatusChange = function(newCheckData) {
  let msg = 'Alert: Your check for '+ newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol+ '//' + newCheckData.url + ' is currently ' + newCheckData.state;

  helpers.sendTwilioSms('+52'+newCheckData.userPhone, msg, function(err) {
    if (!err) {
      console.log('Success: User was alerted to a status change in their check, via sms', msg);
    } else {
      console.log('Error: Could not send sms alert to user who had a state change in their check');
    }
  })
};

// timer to execute the worker process once per minute
workers.loop = function() {
  setInterval(function() {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

workers.init = function() {
  // execute all the checks immediately
  workers.gatherAllChecks();

  // call the loop so the checks will execute later on
  workers.loop();
};


module.exports = workers;
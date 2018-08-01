/**
 * Request handlers
 */

const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');


let handlers = {};


// users
handlers.users = function(data, callback) {
  let acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];
  
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._users = {};

// required fields: firstName, lastName, phone, password, tosAgreement
handlers._users.POST = function(data, callback) {
  // validate required fields
  let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 4 ? data.payload.password.trim() : false;
  let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // check if user exist
    _data.read('users', phone, function(err, data) {
      if (err) {
        // hash pass
        let hashedPassword = helpers.hash(password);

        if (!hashedPassword) {
          callback(500, {'Error': 'Could not hash the user\s password'});
        }

        // the actual user
        let userObj = {
          'firstName': firstName,
          'lastName': lastName,
          'phone': phone,
          'hashedPassword': hashedPassword,
          'tosAgreement': true
        };

        // storing in disk
        _data.create('users', phone, userObj, function(err) {
          if (!err) {
            callback(200);
          } else {
            console.log(err);
            callback(500, {'Error': 'Could not create the new user'});
          }
        });
      } else {
        // user exists
        callback(400, {'Error': 'User with that phone number already exists'});
      }
    });

  } else {
    callback(400, {'Error': 'Missing required fields'});
  }
};

// required phone
handlers._users.GET = function(data, callback) {
  // check for valid phone number
  let phone = typeof(data.queryString.phone) == 'string' && data.queryString.phone.trim().length == 10 ? data.queryString.phone.trim() : false;

  if (phone) {
    // authenticate this guy 
    let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if (tokenIsValid) {
        _data.read('users', phone, function(err, data) {
          if (!err && data) {
            // remove hashedPassword before showing it to the user
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {"Error": "Permission denied."});
      }
    });
  } else {
    callback(400, {'Error': 'Missing phone'});
  }
};

// required phone
handlers._users.PUT = function(data, callback) {
  // validate required fields
  let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

  // optional
  let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 4 ? data.payload.password.trim() : false;

  if (!phone) {
    callback(400, {'Error': 'Missing phone'});
  }

  if (firstName || lastName || password) {
    // authenticate this guy 
    let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if (tokenIsValid) {
        // check if user exist
        _data.read('users', phone, function(err, userData) {
          if (err || !userData) {
            callback(404, {'Error': 'The specified user does not exist'});
          }

          if (firstName) {
            userData.firstName = firstName;
          }
          if (lastName) {
            userData.lastName = lastName;
          }
          if (password) {
            userData.hashedPassword = helpers.hash(password);
          }

          // update in disk
          _data.update('users', phone, userData, function(err) {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, {'Error': 'Could not update the user'});
            }
          });
        });
      } else {
        callback(403, {"Error": "Permission denied."});
      }
    });
  } else {
    callback(400, {'Error': 'Missing fields to update'});
  }

};

handlers._users.DELETE = function(data, callback) {
  let phone = typeof(data.queryString.phone) == 'string' && data.queryString.phone.trim().length == 10 ? data.queryString.phone.trim() : false;

  if (phone) {
    // authenticate this guy 
    let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if (tokenIsValid) {
        _data.read('users', phone, function(err, data) {
          if (!err && data) {
            _data.delete('users', phone, function(err) {
              if (!err) {
                // DELETE each checks associated with the user
                var userChecks = typeof(data.checks) == 'object' && data.checks instanceof Array ? data.checks : [];
                var checksToDelete = userChecks.length;

                if (checksToDelete > 0) {
                  var checksDeleted = 0;
                  var deletionErrors = false;

                  // loop through the checks
                  userChecks.forEach(function(checkId) {
                    _data.delete('checks', checkId, function(err) {
                      if (err) {
                        deletionErrors = true;
                      }
                      checksDeleted++;

                      if (checksDeleted == checksToDelete) {
                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, {'Error': 'Errors encountered while attemping to delete all the user\'s checks. All checks may not have been deleted from the system succesfully.'})
                        }
                      }
                    })
                  });

                } else {
                  callback(200);
                }

              } else {
                callback(500, {'Error': 'Could not delete this user'});
              }
            });
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {"Error": "Permission denied."});
      }
    });
  } else {
    callback(400, {'Error': 'Missing phone'});
  }
};


// toeksn
handlers.tokens = function(data, callback) {
  let acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];
  
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._tokens = {};

// required:phone, password
handlers._tokens.POST = function(data, callback) {
  let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 4 ? data.payload.password.trim() : false;

  if (phone && password) {
    // lookup the user who matches that phone number
     _data.read('users', phone, function(err, userData) {
      if (!err && userData) {
        let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 4 ? data.payload.password.trim() : false;
        
        // create new token that expires in N hour
        if (helpers.hash(password) == userData.hashedPassword) {
          let tokenId = helpers.createRandomString(20);
          let expires = Date.now() + 1000 * 60 * 60;

          let tokenObject = {
            'phone': phone,
            'id': tokenId,
            'expires': expires
          };

          _data.create('tokens', tokenId, tokenObject, function(err) {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, {'Error': 'Could not create the new token.'});
            }
          });
        } else {
          callback(400, {"Error": "Password did not match the specified user\'s store password."});
        }
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {"Error": "Missing required fields"});
  }
};

handlers._tokens.GET = function(data, callback) {
  let id = typeof(data.queryString.id) == 'string' && data.queryString.id.trim().length == 20 ? data.queryString.id.trim() : false;

  if (id) {
    _data.read('tokens', id, function(err, data) {
      if (!err && data) {
        callback(200, data);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {'Error': 'Missing id or it doesn\'t exist'});
  }
};

handlers._tokens.PUT = function(data, callback) {
  let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  let extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

  if (id && extend) {
    _data.read('tokens', id, function(err, data) {
      if (!err && data) {
        if (data.expires > Date.now()) {
          data.expires = Date.now() + 1000 * 60 * 60;

          // storing it
          _data.update('tokens', id, data, function(err) {
            if (!err) {
              callback(200);
            } else {
              callback(400, {"Error": "Could not update token expiration."});
            }
          });
        } else {
          callback(400, {"Error": "Token already expired and can not be extended."});
        }
      } else {
        callback(404, {"Error": "Specified token does not exist"});
      }
    });
  } else {
    callback(400, {'Error': 'Missing required fields or fields are invalid.'});
  }
};

handlers._tokens.DELETE = function(data, callback) {
  let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

  if (id) {
    _data.read('tokens', id, function(err, data) {
      if (!err && data) {
        _data.delete('tokens', id, function(err) {
          if (!err) {
              callback(200);
          } else {
            callback(500, {'Error': 'Could not delete this token'});
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {'Error': 'Missing token'});
  }
};

handlers._tokens.verifyToken = function(id, phone, callback) {
    _data.read('tokens', id, function(err, data) {
      if (!err && data) {
        if (data.phone == phone && data.expires > Date.now()) {
          callback(true);
        } else {
          callback(false);
        }
      } else {
        callback(false);
      }
    });

};


// checks
handlers.checks = function(data, callback) {
  let acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];
  
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._checks = {};

// required: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.POST = function(data, callback) {
  // validation...
  let protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol.trim()) > -1 ? data.payload.protocol.trim() : false;
  let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  let method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method.trim()) > -1 ? data.payload.method.trim() : false;
  let successCodes = typeof(data.payload.successCodes) == 'object' &&  data.payload.successCodes instanceof Array && data.payload.successCodes.length > -1 ? data.payload.successCodes : false;
  let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds > 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
  
  if (protocol && url && method && successCodes && timeoutSeconds) {
    // authenticate this guy 
    let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    _data.read('tokens', token, function(err, data) {

      if (!err && data) {
        let userPhone = data.phone;

        _data.read('users', userPhone, function(err, data) {
          if (!err && data) {
            let userChecks = typeof(data.checks) == 'object' && data.checks instanceof Array ? data.checks : [];

            // check max checks per user
            if (userChecks.length >= config.maxChecks) {
              callback(400, {"Error": "The user already has the maximum number of checks (" + config.maxChecks + ")"});
            }

            let checkId = helpers.createRandomString(20);
            let checkObject = {
              'id': checkId,
              'userPhone': userPhone,
              'protocol': protocol,
              'url': url,
              'method': method,
              'successCodes': successCodes,
              'timeoutSeconds': timeoutSeconds
            };

            _data.create('checks', checkId, checkObject, function(err) {
              if (!err) {
                // add checkId to usersObj
                data.checks = userChecks;
                data.checks.push(checkId);

                _data.update('users', userPhone, data, function(err) {
                  if (!err) {
                    callback(200, checkObject);
                  } else {
                    callback(500, {"Error": "Could not update the user with the new check"});
                  }
                });
              } else {
                callback(500, {"Error": "Could not create the new check"});
              }
            });

          } else {
            callback(403);
          }
        });

      } else {
        callback(403);
      }

    });
  } else {
    callback(400, {"Error": "Missing required fields or fields are invalid"});
  }

};

handlers._checks.GET = function(data, callback) {
  // check for valid phone number
  let id = typeof(data.queryString.id) == 'string' && data.queryString.id.trim().length == 20 ? data.queryString.id.trim() : false;

  if (id) {

    // lookup the check
    _data.read('checks', id, function(err, checkData) {
      if (!err && checkData) {
        // authenticate this guy 
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
          if (tokenIsValid) {
            // return check data
            callback(200, checkData);
          } else {
            callback(403, {"Error": "Permission denied."});
          }
        });
      } else {
        callback(404);
      }

    });

  } else {
    callback(400, {'Error': 'Missing required field'});
  }

};

handlers._checks.PUT = function(data, callback) {
  // validate required fields
  let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

  // optional...
  let protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol.trim()) > -1 ? data.payload.protocol.trim() : false;
  let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  let method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method.trim()) > -1 ? data.payload.method.trim() : false;
  let successCodes = typeof(data.payload.successCodes) == 'object' &&  data.payload.successCodes instanceof Array && data.payload.successCodes.length > -1 ? data.payload.successCodes : false;
  let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds > 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
  
  if (!id) {
    callback(400, {'Error': 'Missing required field'});
  } else {

    if (protocol || url || method || successCodes || timeoutSeconds) {
      _data.read('checks', id, function(err, checkData) {
        if (!err && checkData) {
          // authenticate this guy 
          let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
          handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
            if (tokenIsValid) {
              // update the check where is necessary
              if (protocol) {
                checkData.protocol = protocol;
              }
              if (url) {
                checkData.url = url;
              }
              if (method) {
                checkData.method = method;
              }
              if (successCodes) {
                checkData.successCodes = successCodes;
              }
              if (timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // store the updates
              _data.update('checks', id, checkData, function(err) {
                if (!err) {
                  callback(200, {});
                } else {
                  callback(500, {'Error': 'Could not update the check'});
                }
              })

            } else {
              callback(403, {"Error": "Permission denied."});
            }
          });
        } else {
          callback(400, {'Error': 'Check ID did not exist'});
        }
      });
    } else {
      callback(400, {'Error': 'Missing fields to update'});
    }

  }
};

handlers._checks.DELETE = function(data, callback) {
  let id = typeof(data.queryString.id) == 'string' && data.queryString.id.trim().length == 20 ? data.queryString.id.trim() : false;
  
  if (id) {
    _data.read('checks', id, function(err, checkData) {
      if (!err && checkData) {

        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {

          if (tokenIsValid) {
            // delete check data
            _data.delete('checks', id, function(err) {
              if (!err) {

                _data.read('users', checkData.userPhone, function(err, userData) {
                  if (!err && userData) {
                    let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                    // remove the delete check from their list of checks
                    let checkPosition = userChecks.indexOf(id);
                    if (checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);

                      // resave user data
                      _data.update('users', checkData.userPhone, userData, function(err) {
                        if (!err) {
                            callback(200);
                        } else {
                          callback(500, {'Error': 'Could not update the user'});
                        }
                      });
                    } else {
                      callback(500, {'Error': 'Could not find the check of the users object, so could not remove it'});
                    }
                  } else {
                    callback(500, {'Error': 'Could not find the user who created the check, could not remve the specified check'});
                  }
                });

              } else {
                callback(500, {'Error': 'Could not delete this check'});
              }
            });

          } else {
            callback(403, {"Error": "Permission denied."});
          }
        });
      } else {
        callback(404, {'Error': 'Check not found'});
      }
    });
  } else {
    callback(403, {'Error': 'Missing check id'});
  }
};


// ping
handlers.ping = function(data, callback) {
  callback(200);
};


// not found
handlers.notFound = function(data, callback) {
  callback(404);
};

module.exports = handlers;
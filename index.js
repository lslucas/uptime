/**
 * Primary file for the API
 * // 25 - Tokens 
 */

//deps
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const fs = require('fs');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');


let httpServer = http.createServer(function(req, res) {
  unifiedServer(req, res);
});

httpServer.listen(config.httpPort, function() {
  console.log('The server is listening on port ' + config.httpPort + ' in ' + config.envName);
});

let httpsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert': fs.readFileSync('./https/cert.pem')
};

let httpsServer = https.createServer(httpsServerOptions, function(req, res) {
  unifiedServer(req, res);
});

httpsServer.listen(config.httpsPort, function() {
  console.log('The server is listening on port ' + config.httpsPort + ' in ' + config.envName);
});

let unifiedServer = function(req, res) {

  let parsedUrl = url.parse(req.url, true);

  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+$/g ,'');
  let method = req.method.toUpperCase();
  let queryString = parsedUrl.query;
  let headers = req.headers;

  // get payload, if any
  let decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', function(data) {
    buffer += decoder.write(data);
  });
  req.on('end', function() {
    buffer += decoder.end();

    // chose the handler to go to
    let chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

    let data = {
      'trimmedPath': trimmedPath,
      'queryString': queryString,
      'method': method,
      'headers': headers,
      'payload': helpers.parseJsonToObject(buffer)
    };

    chosenHandler(data, function(statusCode, payload) {
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
      payload = typeof(payload) == 'object' ? payload : {};

      let payloadString = JSON.stringify(payload);

      res.setHeader('Content-type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      console.log('Returning this response: ', statusCode, payloadString);
    });

  });


};

// routing
let router = {
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks,
  'ping': handlers.ping
};
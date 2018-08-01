/**
 * Config vars
 */

// envs
const environments = {};

environments.staging = {
  'httpPort': 3000,
  'httpsPort': 3001,
  'envName': 'staging',
  'salt': 'holaSantiMati',
  'maxChecks': 5,
  'twilio': {
    'accountSid': 'AC700d78adcffea6b424f33df530c5ee52',
    'authToken': '236f82e57795f8d823b35328a905a166',
    'fromPhone': '+18647401738'
  } 
};

environments.production = {
  'httpPort': 5000,
  'httpsPort': 5001,
  'envName': 'production',
  'salt': 'oiSantiMati',
  'maxChecks': 5,
  'twilio': {
    'accountSid': 'AC700d78adcffea6b424f33df530c5ee52',
    'authToken': '236f82e57795f8d823b35328a905a166',
    'fromPhone': '+18647401738'
  } 
};

let currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

let environmentsToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentsToExport;
/**
 * Cache Service
 *
 */

const Redis = require('ioredis');
const _ = require('lodash');

let redisClient = {};
let configuration = {
  cachePort: 6379,
  cacheHost: '127.0.0.1',
  cachePassword: undefined,
  cacheCluster: false
};

/**
 * This function is used to setup the configuration for cache store
 * @param {*} config  User defined configuration for setting up the cache store
 */
const configure = (config = {}) => {
  // Check for env variables first then user configuration
  const cacheHost = process.env.cacheHost || config.cacheHost || configuration.cacheHost;
  const cachePort = process.env.cachePort || config.cachePort || configuration.cachePort;
  const cachePassword = process.env.cachePassword || config.cachePassword || configuration.cachePassword;
  const cacheCluster = process.env.cacheCluster || config.cacheCluster || configuration.cacheCluster

  configuration = Object.assign(configuration, { cacheHost, cachePort, cachePassword, cacheCluster });
};

/**
 * This function is used to run the cache store
 */
const run = () => {
  if (configuration.cacheCluster && configuration.cacheCluster === true) {
    // means cluster needs to be setup
    const clusterNodes = [];
    clusterNodes.push({ host: configuration.cacheHost, port: configuration.cachePort });
    clusterNodes.push({ host: configuration.cacheHost, port: configuration.cachePort });
    
    redisClient = new Redis(
      clusterNodes,
      {
        scaleReads: 'slave',
        enableOfflineQueue: true,
        redisOptions: {
          showFriendlyErrorStack: true
        }
      }
    );
  } else {
    // normal redis setup
    redisClient = new Redis({
      port: configuration.cachePort,
      host: configuration.cacheHost,
      showFriendlyErrorStack: true
    });
  }

  if (configuration.cachePassword) {
    redisClient.auth(process.env.cachePassword);
  }

  handleDefaultEvents();
};

/**
 * This function is used to handle events and console it out
 */
const handleDefaultEvents = () => {
  // events/error handling
  redisClient.on('error', (error) => {
    console.log(`Redis throws error ${error}`);
  });

  redisClient.on('connect', () => {
    console.log('Redis has connected');
  });

  redisClient.on('reconnecting', () => {
    console.log('Redis has lost connection, it is trying to reconnect');
  });

  redisClient.on('ready', () => {
    console.log('Redis is ready to work hard!');
  });
};

/**
 * This function is validating the key for checking undefined and null values
 * @param {String} key The cache key which needs to be validated
 *
 * @private
 */
const validateKey = (key) => {
  if (_.isNil(key) || !_.isString(key)) {
    return false;
  }
  return true;
};

/**
 * This function is used to retrive the value from cache
 * @param {String} key  The key which values needs to retrieve from cache store
 *
 * @public
 */
const get = async (key) => {
  try {
    if (!validateKey(key)) {
      return null;
    }
    const result = await redisClient.get(key);
    if (_.isNil(result)) {
      return undefined;
    }
    return JSON.parse(result);
  } catch (err) {
    return undefined;
  }
};

/**
 * This function is used to retrive the value from cache, but if its not present,
 * it will set the default value in cache and return
 * default value can also be a callback
 * @param {String} key        The cache key which needs to retrieve from cache store
 * @param {Number} expiry     ttl of the cache key
 * @param {Any} defaultValue  if cache doesn't exist, what needs to be stored in cache key, it accepts value or a callback function
 */
const remember = async (key, expiry, defaultValue) => {
  try {
    if (!validateKey(key)) {
      return null;
    }
    const result = await get(key);
    if (_.isNil(result)) {
      throw new Error('Not in cache');
    }
    return result;
  } catch (err) {
    let result;
    if (!_.isNil(defaultValue)) {
      if (_.isFunction(defaultValue)) {
        try {
          result = await defaultValue();
        } catch (error) {
          result = undefined;
        }
      } else {
        result = defaultValue;
      }
      if (!_.isNil(expiry) && !_.isNil(result)) {
        put(key, result, expiry);
      }
    }
    return result;
  }
};

/**
 * This function is used to store value in the cache till expiry
 * @param {String} key      The key against which value needs to be stored
 * @param {Any} value       The actual result which will be stored in cache
 * @param {Number} expiry   Seconds for how long the cache will be stored
 */
const put = async (key, value, expiry) => {
  try {
    if (!validateKey(key)) {
      return false;
    }
    if (!_.isNil(expiry)) {
      await redisClient.set(key, JSON.stringify(value), 'ex', expiry);
    } else {
      await redisClient.set(key, JSON.stringify(value));
    }

    return true;
  } catch (err) {
    return false;
  }
};

/**
 * This function is used to remove the key from cache
 * @param {String} key  The key which needs to be evicted from the cache store
 */
const destroy = (key) => {
  redisClient.del(key);
};

/**
 * This function is used to check the existence of key in cache
 * @param {String} key  The key which needs to be checked if available or not
 */
const has = async (key) => {
  try {
    const exists = await redisClient.exists(key);
    if (exists) {
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
};

/**
 * This function is used to retrive the value from cache and afterwards, remove it
 * @param {String} key  The key whose value needs to be retreive and later clear from cache
 */
const pop = async (key) => {
  try {
    const result = await get(key);
    if (!_.isNil(result)) {
      destroy(key);
    }
    return result;
  } catch (err) {
    return undefined;
  }
};

/**
 * This function is used to retrieves the values associated
 * with the specified fields in the hash stored at key
 * @param {String} key            The name of the set
 * @param {Array<String>} fields  The name of the fields which needs to be retreived from set
 */
const multiget = async (key, fields) => {
  try {
    if (!validateKey(key)) {
      return {};
    }
    const result = await redisClient.hmget(key, fields);
    return result;
  } catch (err) {
    return undefined;
  }
};

/**
 * This function is used to store specified fields to their
 * respective values in the hash stored at key
 * @param {String} key      The name of the set
 * @param {Object} data     The object which needs to be stored
 * @param {Number} expiry   ttl in seconds for the cache key, if not present the key will store permanently
 */
const multiput = async (key, data, expiry) => {
  try {
    if (!validateKey(key)) {
      return false;
    }
    await redisClient.hmset(key, data);
    if (expiry) {
      redisClient.expire(key, expiry);
    }
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * This function is used to get the instance of redisClient
 * which will unleash all the functions native redis can
 * do, use it wisely or never :)
 */
const getIoRedis = () => (redisClient);

module.exports = {
  _client: getIoRedis,
  get,
  put,
  remember,
  destroy,
  has,
  pop,
  multiget,
  multiput,
  configure,
  run
};

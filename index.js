/**
 * Cache Service
 *
 */

const Redis = require('ioredis');
const _ = require('lodash');

let redisClient = {};

if (process.env.cacheHost && process.env.cacheHost.indexOf(',') > 0) {
  // means cluster needs to be setup
  const clusterNodes = [];
  process.env.cacheHost.split(',').forEach((host) => {
    clusterNodes.push({ host, port: process.env.cachePort });
  });
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
    port: process.env.cachePort || 6379,
    host: process.env.cacheHost || '127.0.0.1',
    showFriendlyErrorStack: true
  });
}

if (process.env.cachePassword) {
  redisClient.auth(process.env.cachePassword);
}

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

/**
 * This function is validating the key for checking undefined and null values
 * @param {String} key
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
 * @param {String} key 
 * 
 * @public
 */
const get = async (key) => {
  try {
    if (!validateKey(key)) {
      return null;
    }
    const result = await redisClient.get(key);
    if (_.isNull(result)) {
      return null;
    }
    return JSON.parse(result);
  } catch (err) {
    return null;
  }
};

/**
 * This function is used to retrive the value from cache, but if its not present,
 * it will set the default value in cache and return
 * default value can also be a callback
 * @param {String} key
 * @param {Number} expiry
 * @param {Any} defaultValue
 */
const remember = async (key, expiry, defaultValue) => {
  try {
    if (!validateKey(key)) {
      return null;
    }
    const result = await get(key);
    if (_.isNull(result)) {
      throw new Error('Not in cache');
    }
    return result;
  } catch (err) {
    let result = null;
    if (!_.isNil(defaultValue)) {
      if (_.isFunction(defaultValue)) {
        try {
          result = await defaultValue();
        } catch (error) {
          result = null;
        }
      } else {
        result = defaultValue;
      }
      if (!_.isNil(expiry) && !_.isNull(result)) {
        put(key, result, expiry);
      }
    }
    return result;
  }
};

/**
 * This function is used to store value in the cache till expiry
 * @param {String} key
 * @param {Any} value
 * @param {Number} expiry
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
 * This function is used to store the value in cache permanently
 * @param {String} key 
 * @param {Any} value 
 */
const forever = (key, value) => (put(key, value));

/**
 * This function is used to remove the key from cache
 * @param {String} key
 */
const forget = (key) => {
  redisClient.del(key);
};

/**
 * This function is used to check the existence of key in cache
 * @param {String} key
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
 * @param {String} key
 */
const pull = async (key) => {
  try {
    const result = await get(key);
    if (!_.isNull(result)) {
      forget(key);
    }
    return result;
  } catch (err) {
    return null;
  }
};

/**
 * This function will only add value in cache, if the key doesn't exist already
 * @param {String} key
 * @param {Any} value
 * @param {Number} expiry
 */
const add = async (key, value, expiry) => {
  if (await has(key)) {
    return false;
  }
  return put(key, value, expiry);
};

/**
 * This function is used to retrieves the values associated 
 * with the specified fields in the hash stored at key
 * @param {String} set
 * @param {Array<String>} keys
 */
const multiget = async (set, keys) => {
  try {
    if (!validateKey(set)) {
      return {};
    }
    const result = await redisClient.hmget(set, keys);
    return result;
  } catch (err) {
    return {};
  }
};

/**
 * This function is used to store specified fields to their 
 * respective values in the hash stored at key
 * @param {String} key
 * @param {Any} data
 * @param {Number} expiry
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

module.exports = {
  _client: redisClient,
  get,
  put,
  remember,
  forget,
  forever,
  has,
  pull,
  add,
  multiget,
  multiput
};

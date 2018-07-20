# Astro Cache Service (Redis)

This service reads from env variables to connect from redis store. This service supports cluster and simple
redis setup.

#### ENV VARIABLES

cacheHost // required, default to 127.0.0.1,

cachePort // required, default to 6379

cachePassword // optional

For cluster, give the multiple host comma seperated.

Or you can provide these, configuration in configure function

**This library will first check env variables, then user provided configuration. If both not found it will
use default values**

## Cache Usage
```
const cache = require('@astro-my/cache');

cache.configure();

OR
-----

cache.configure({
  cacheHost: '127.0.0.1',
  cachePort: 6379
});

cache.run();
```

### Retrieving Items From The Cache
The get method on the Cache is used to retrieve items from the cache.

```
const value = async cache.get('key');
```

#### Checking For Item Existence
The has method may be used to determine if an item exists in the cache. This method will return false if the 
value is null or false:

```
const exists = async cache.has('key');
```

#### Retrieve & Store
Sometimes you may wish to retrieve an item from the cache, but also store a default value if the requested 
item doesn't exist. For example, you may wish to retrieve all users from the cache or, if they don't exist, 
retrieve them from the database and add them to the cache.

```
const exists = async cache.remember('key', seconds, () => { return Users.fetch(); });
```

If the item does not exist in the cache, the Closure passed to the remember method will be executed and its 
result will be placed in the cache with ttl of seconds passed as second argument.

#### Retrieve & Delete
If you need to retrieve an item from the cache and then delete the item, you may use the pop method. 
Like the get method, null will be returned if the item does not exist in the cache:

```
const value = async cache.pop('key');
```

#### Retrive fields associated with particular key
Returns the values associated with the specified fields in the hash stored at key.

```
const values = async cache.multiget('key', [...fieldKey (String)]);
```

### Storing data in cache
You may use the put method to store items in the cache. When you place an item in the cache, you need to 
specify the number of seconds for which the value should be cached:
**P.S: all expiry values are in seconds. If not provided, the key will be stored permenantely**

```
const stored = async cache.put('key', value, expiry);
```
The method will return true if the item is stored to the cache

#### Store If Not Present
The add method will only add the item to the cache if it does not already exist in the cache store. 
The method will return true if the item is actually added to the cache. Otherwise, the method will return false:

```
const stored = async cache.add('key', value, expiry);
```

#### Store Set under particular key
Sets the specified fields to their respective values in the hash stored at key. This command overwrites any 
specified fields already existing in the hash. If key does not exist, a new key holding a hash is created.

```
cache.multiset('key', { field1: 'value1', field2: 'value2' }, expiry);
```

### Removing Items From The Cache
You may remove items from the cache using the destroy method:

```
cache.destroy('key');
```
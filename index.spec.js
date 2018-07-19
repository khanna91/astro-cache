/* eslint-disable arrow-body-style */
const sinon = require('sinon');
const { expect } = require('chai');
const service = require('./index');

describe('Service - cache', () => {
  let sandbox;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => sandbox.restore());

  it('should put the value in cache', async () => {
    const value = await service.put('test', '123456');
    expect(value).to.be.true; // eslint-disable-line
  });

  it('should put the value in cache for a 10 seconds', async () => {
    const value = await service.put('test10', '123456', 1);
    expect(value).to.be.true; // eslint-disable-line
  });

  it('should return false for passing invalid key', async () => {
    const value = await service.put(null, '123456');
    expect(value).to.be.false; // eslint-disable-line
  });

  it('should get the value from cache', async () => {
    const value = await service.get('test');
    expect(value).to.be.equal('123456'); // eslint-disable-line
  });

  it('should return false for invalid/not present key', (done) => {
    setTimeout(async () => {
      const value = await service.has('test10');
      expect(value).to.be.false; // eslint-disable-line
      done();
    }, 1100);
  });

  it('should return true for key exists in cache', async () => {
    const value = await service.has('test');
    expect(value).to.be.true; // eslint-disable-line
  });

  it('should store value in cache permanently', async () => {
    await service.forever('testForever', 'Permanent');
    const value = await service.get('testForever');
    expect(value).to.be.equal('Permanent');
    const ttl = await service._client.ttl('testForever');
    expect(ttl).to.be.equal(-1);
  });

  it('should remove the value from cache', async () => {
    await service.forget('testForever');
    const value = await service.has('testForever');
    expect(value).to.be.false; // eslint-disable-line
  });

  it('should not add value in cache since key already exist', async () => {
    const value = await service.add('test', 'newValue', 10);
    expect(value).to.be.false; // eslint-disable-line
  });

  it('should add value in cache since key doesn\'t exist', async () => {
    const value = await service.add('tempNew', 'newValue');
    expect(value).to.be.true; // eslint-disable-line
  });

  it('should get value from cache and delete it', async () => {
    const value = await service.pull('tempNew');
    expect(value).to.be.equal('newValue');
    const keyExists = await service.has('tempNew');
    expect(keyExists).to.be.false; // eslint-disable-line
  });

  it('should run the callback and then store the result in cache', async () => {
    const value = await service.remember('tempNew', 20, () => ('This is a callback value'));
    expect(value).to.be.equal('This is a callback value');
    const keyExists = await service.has('tempNew');
    expect(keyExists).to.be.true; // eslint-disable-line
  });

  it('should run the callback (promise) and then store the result in cache', async () => {
    const value = await service.remember('tempPromise', 20, () => {
      return new Promise((resolve) => {
        resolve('This is a promise return');
      });
    });
    expect(value).to.be.equal('This is a promise return');
    const keyExists = await service.has('tempPromise');
    expect(keyExists).to.be.true; // eslint-disable-line
  });

  it('should not store value in cache if callback fails', async () => {
    const value = await service.remember('tempPromiseFail', 20, () => {
      return new Promise((resolve, reject) => {
        reject();
      });
    });
    expect(value).to.be.null; // eslint-disable-line
    const keyExists = await service.has('tempPromiseFail');
    expect(keyExists).to.be.false; // eslint-disable-line
  });

  it('should store multivalue (object) in cache', async () => {
    const value = await service.multiput('tempSet', {
      tempKey1: 'This is key 1',
      tempKey2: 'This is key 2',
      tempKey3: 'This is key 3'
    }, 10);
    expect(value).to.be.true; // eslint-disable-line
  });

  it('should return multivalue keys from cache', async () => {
    const [tempKey1, tempKey2] = await service.multiget('tempSet', ['tempKey1', 'tempKey2']);
    expect(tempKey1).to.be.equal('This is key 1');
    expect(tempKey2).to.be.equal('This is key 2');
  });

  it('should remove the cache (test)', async () => {
    await service.forget('test');
  });
});

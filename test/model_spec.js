'use strict';

describe('Restmod model class:', function() {

  var $httpBackend, $restmod, Bike;

  beforeEach(module('plRestmod'));

  beforeEach(inject(function($injector) {
    $httpBackend = $injector.get('$httpBackend');
    $restmod = $injector.get('$restmod');
    Bike = $restmod.model('/api/bikes');
  }));

  describe('$single', function() {

    it('should create a resource bound to a given url', function() {
      var bike = Bike.$single('/user/bike');
      expect(bike.$url()).toEqual('/user/bike');
    });
  });

  describe('$fetch', function() {

    it('should call callbacks in proper order', function() {
      var calls = [];

      Bike.$build({ id: 1 })
          .$on('before-fetch', function() { calls.push('bf'); })
          .$on('before-request', function() { calls.push('br'); })
          .$on('after-request', function() { calls.push('ar'); })
          .$on('after-fetch', function() { calls.push('af'); })
          .$fetch();

      $httpBackend.when('GET', '/api/bikes/1').respond(200, {});
      $httpBackend.flush();

      expect(calls).toEqual(['bf','br','ar','af']);
    });

    it('should call error callbacks in proper order', function() {
      var calls = [];

      Bike.$build({ id: 1 })
          .$on('before-fetch', function() { calls.push('bf'); })
          .$on('before-request', function() { calls.push('br'); })
          .$on('after-request-error', function() { calls.push('are'); })
          .$on('after-fetch-error', function() { calls.push('afe'); })
          .$fetch();

      $httpBackend.when('GET', '/api/bikes/1').respond(400, {});
      $httpBackend.flush();

      expect(calls).toEqual(['bf','br','are','afe']);
    });
  });

  describe('$save', function() {

    it('should call callbacks in proper order when creating', function() {
      var calls = [];

      Bike.$build()
          .$on('before-save', function() { calls.push('bs'); })
          .$on('before-create', function() { calls.push('bc'); })
          .$on('before-request', function() { calls.push('br'); })
          .$on('after-request', function() { calls.push('ar'); })
          .$on('after-create', function() { calls.push('ac'); })
          .$on('after-save', function() { calls.push('as'); })
          .$save();

      $httpBackend.when('POST', '/api/bikes').respond(200, {});
      $httpBackend.flush();

      expect(calls).toEqual(['bs','bc','br','ar','ac','as']);
    });
  });

  describe('$destroy', function() {

    it('should call callbacks in proper order', function() {
      var calls = [];

      Bike.$build({ id: 1 })
          .$on('before-destroy', function() { calls.push('bd'); })
          .$on('before-request', function() { calls.push('br'); })
          .$on('after-request', function() { calls.push('ar'); })
          .$on('after-destroy', function() { calls.push('ad'); })
          .$destroy();

      $httpBackend.when('DELETE', '/api/bikes/1').respond(200, {});
      $httpBackend.flush();

      expect(calls).toEqual(['bd','br','ar','ad']);
    });

    it('should remove item from collection if bound to colletion', function() {
      var col = Bike.$collection(),
          bike = col.$build({ id: 1 });

      expect(col.length).toEqual(1);
      bike.$destroy();

      $httpBackend.when('DELETE', '/api/bikes/1').respond(200, {});
      $httpBackend.flush();

      expect(col.length).toEqual(0);
    });
  });

  describe('$decode', function() {

    it('should rename all snake case attributes by default', function() {
      var bike = $restmod.model(null).$build();
      bike.$decode({ snake_case: true });
      expect(bike.snake_case).toBeUndefined();
      expect(bike.snakeCase).toBeDefined();
    });

    it('should rename nested values', function() {
      var bike = $restmod.model(null).$build();
      bike.$decode({ nested: { snake_case: true } });
      expect(bike.nested.snake_case).toBeUndefined();
      expect(bike.nested.snakeCase).toBeDefined();
    });

    it('should rename nested object arrays', function() {
      var bike = $restmod.model(null).$build();
      bike.$decode({ nested: [ { snake_case: true } ] });
      expect(bike.nested[0].snake_case).toBeUndefined();
      expect(bike.nested[0].snakeCase).toBeDefined();
    });

    it('should apply registered decoders', function() {
      var bike = $restmod.model(null, function() {
        this.attrDecoder('size', function(_val) { return _val === 'S' ? 'small' : 'regular'; });
      }).$build();

      bike.$decode({ size: 'S' });
      expect(bike.size).toEqual('small');
    });

    it('should apply decoders to nested values', function() {
      var bike = $restmod.model(null, function() {
        this.attrDecoder('user.name', function(_name) { return 'Mr. ' + _name; });
      }).$build();

      bike.$decode({ user: { name: 'Petty' } });
      expect(bike.user.name).toEqual('Mr. Petty');
    });

    it('should apply decoders to values in nested arrays', function() {
      var bike = $restmod.model(null, function() {
        this.attrDecoder('users.name', function(_name) { return 'Mr. ' + _name; });
      }).$build();

      bike.$decode({ users: [{ name: 'Petty' }] });
      expect(bike.users[0].name).toEqual('Mr. Petty');
    });
  });

  describe('$encode', function() {

    it('should rename all camel case attributes by default', function() {
      var bike = Bike.$build({ camelCase: true }),
          encoded = bike.$encode();

      expect(encoded.camelCase).toBeUndefined();
      expect(encoded.camel_case).toBeDefined();
    });

    it('should rename nested values', function() {
      var bike = $restmod.model(null).$build({ user: { lastName: 'Peat' } }),
          raw = bike.$encode();

      expect(raw.user.lastName).toBeUndefined();
      expect(raw.user.last_name).toBeDefined();
    });

    it('should apply registered encoders', function() {
      var bike = $restmod.model(null, function() {
        this.attrEncoder('size', function(_val) { return _val === 'small' ? 'S' : 'M'; });
      }).$build({ size: 'small' });

      expect(bike.$encode().size).toEqual('S');
    });

    it('should not encode objects with a toJSON implementation', function() {
      var now = new Date(),
          bike = $restmod.model(null).$build({ created: now }),
          raw = bike.$encode();

      expect(raw.created instanceof Date).toBeTruthy();
    });

    it('should ignore relations', function() {
      var User = $restmod.model(null),
          bike = $restmod
            .model(null, { user: { hasOne: User } })
            .$buildRaw({ user: { name: 'Petty' }, size: 'M'}),
          raw = bike.$encode();

      expect(raw.user).toBeUndefined();
    });
  });

  describe('$finally', function() {

    it('should be called on success', function() {
      var spy = jasmine.createSpy('callback');

      Bike.$find(1).$finally(spy);

      $httpBackend.when('GET','/api/bikes/1').respond(200, {});
      $httpBackend.flush();
      expect(spy).toHaveBeenCalledWith();
    });

    it('should be called on error', function() {
      var spy = jasmine.createSpy('callback');

      Bike.$find(1).$finally(spy);

      $httpBackend.when('GET','/api/bikes/1').respond(404);
      $httpBackend.flush();
      expect(spy).toHaveBeenCalledWith();
    });
  });

  describe('$each', function() {

    it('should iterate over non system properties by default', function() {
      var bike = Bike.$build({ brand: 'Trek' }), props = [];
      bike.$each(function(_val, _key) {
        props.push(_key);
      });

      expect(props).toContain('brand');
      expect(props).not.toContain('$pending');
      expect(props).not.toContain('$scope');
    });
  });

  describe('$on', function() {

    it('should register a callback at instance level', function() {
      var bike1 = Bike.$build(),
          bike2 = Bike.$build(),
          spy = jasmine.createSpy('callback');

      bike1.$on('poke', spy);
      bike2.$callback('poke');
      expect(spy).not.toHaveBeenCalled();

      bike1.$callback('poke');
      expect(spy).toHaveBeenCalled();
    });
  });
});

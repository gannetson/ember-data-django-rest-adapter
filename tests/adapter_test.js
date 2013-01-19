var get = Ember.get, set = Ember.set;

var adapter, store, ajaxUrl, ajaxType, ajaxHash;
var Person, person, people;
var Role, role, roles;
var Group, group;
var Task, task;

var REVISION = 11; //ember-data revision

module("DjangoRESTAdapter", {
  setup: function() {
    ajaxUrl = undefined;
    ajaxType = undefined;
    ajaxHash = undefined;

    DS.DjangoRESTAdapter.configure("plurals", {"person" : "people"});

    adapter = DS.DjangoRESTAdapter.create({
      ajax: function(url, type, hash) {
        var success = hash.success, self = this;

        ajaxUrl = url;
        ajaxType = type;
        ajaxHash = hash;

        if (success) {
          hash.success = function(json, type) {
            success.call(self, json);
          };
        }
      }

    });

    store = DS.Store.create({
      adapter: adapter,
      revision: REVISION
    });

    Person = DS.Model.extend({
      name: DS.attr('string'),
      tasks: DS.hasMany('Task')
    });

    Person.toString = function() {
      return "App.Person";
    };

    Group = DS.Model.extend({
      name: DS.attr('string'),
      people: DS.hasMany('Person')
    });

    Group.toString = function() {
      return "App.Group";
    };

    Role = DS.Model.extend({
      name: DS.attr('string')
    });

    Role.toString = function() {
      return "App.Role";
    };

    Task = DS.Model.extend({
      name: DS.attr('string'),
      owner: DS.belongsTo('Person')
    });

    Task.toString = function() {
      return "App.Task";
    };
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();

    if (person) { person.destroy(); }
  }
});

var expectUrl = function(url, desc) {
  equal(ajaxUrl, url, "the URL is " + desc);
};

var expectType = function(type) {
  equal(type, ajaxType, "the HTTP method is " + type);
};

var expectData = function(hash) {
  deepEqual(hash, ajaxHash.data, "the hash was passed along");
};

var expectStateForInstance = function(state, value, model) {
  var flag = "is" + state.charAt(0).toUpperCase() + state.substr(1);
  equal(get(model, flag), value, "the model is " + (value === false ? "not " : "") + state);
};

var expectUrlTypeData = function(url, desc, type, hash) {
  expectUrl(url, desc);
  expectType(type);
  expectData(hash);
};

var expectLoaded = function(model) {
  expectStateForInstance('new', false, model);
  expectStateForInstance('loaded', true, model);
  expectStateForInstance('dirty', false, model);
};

var expectNew = function(model) {
  expectStateForInstance('new', true, model);
  expectStateForInstance('dirty', true, model);
};

test("creating a role makes a POST to /roles/ with the data hash", function() {
  role = store.createRecord(Role, { name: "Admin" });

  expectStateForInstance('new', true, role);
  store.commit();
  expectStateForInstance('saving', true, role);

  expectUrl("/roles/", "the url should be the plural of the model name");
  expectType("POST");
  expectData({ name: "Admin" });

  ajaxHash.success({ id: 1, name: "Admin" });
  expectStateForInstance('saving', false, role);

  result = store.find(Role, 1);
  equal(result.get('name'), "Admin", "it should now possible to retrieve the role by the id supplied");
});

test("updating a role makes a PUT to /roles/:id/ with the data hash", function() {
  store.load(Role, { id: 1, name: "Admin" });
  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  role = store.find(Role, 1);
  expectLoaded(role);

  set(role, 'name', "Developer");

  expectStateForInstance('dirty', true, role);
  store.commit();
  expectStateForInstance('saving', true, role);

  expectUrl("/roles/1/", "the plural of the model name with its id");
  expectType("PUT");

  ajaxHash.success({ id: 1, name: "Developer" });
  expectStateForInstance('saving', false, role);

  result = store.find(Role, 1);

  equal(get(result, 'name'), "Developer", "the hash should be updated");
});

test("deleting a role makes a DELETE to /roles/:id/", function() {
  store.load(Role, { id: 1, name: "Admin" });
  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  role = store.find(Role, 1);

  expectLoaded(role);

  role.deleteRecord();

  expectStateForInstance('dirty', true, role);
  expectStateForInstance('deleted', true, role);
  store.commit();
  expectStateForInstance('saving', true, role);

  expectUrl("/roles/1/", "the plural of the model name with its id");
  expectType("DELETE");

  expectStateForInstance('deleted', true, role);
});

test("finding a role by ID makes a GET to /roles/:id/", function() {
  role = store.find(Role, 1);

  expectStateForInstance('loaded', false, role);
  expectUrl("/roles/1/", "the plural of the model name with the id requested");
  expectType("GET");

  ajaxHash.success({ id: 1, name: "Admin" });

  expectLoaded(role);

  equal(role, store.find(Role, 1), "the record is now in the store, and can be looked up by id without another Ajax request");
});

test("creating a task with associated person should invoke http post using the correct form data and url", function() {
  store.load(Person, {id: 2, name: "Toran Billups"});
  person = store.find(Person, 2);
  expectLoaded(person);

  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  task = Task.createRecord({name: "Todo", owner: person});
  expectNew(task);

  store.commit();

  expectUrlTypeData('/owners/2/tasks/', 'create URL', 'POST', { name: "Todo", owner: "2" });

  ajaxHash.success({ id: 1, name: "Todo", owner: 2 }, Task);
  expectLoaded(task);
});

test("creating a person makes a POST to /people/ with the data hash", function() {
  person = store.createRecord(Person, { name: "Toran" });

  expectStateForInstance('new', true, person);
  store.commit();
  expectStateForInstance('saving', true, person);

  expectUrl("/people/", "the url should be the plural of the model name");
  expectType("POST");
  expectData({ name: "Toran" });

  ajaxHash.success({ id: 1, name: "Toran", tasks: [] });
  expectStateForInstance('saving', false, person);

  result = store.find(Person, 1);
  equal(result.get('name'), "Toran", "it should now possible to retrieve the person by the id supplied");
});

test("updating a person makes a PUT to /people/:id/ with the data hash", function() {
  store.load(Person, { id: 1, name: "Toran" });
  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  person = store.find(Person, 1);
  expectLoaded(person);

  set(person, 'name', "Joel");

  expectStateForInstance('dirty', true, person);
  store.commit();
  expectStateForInstance('saving', true, person);

  expectUrl("/people/1/", "the plural of the model name with its id"); //add trailing slash
  expectType("PUT");

  ajaxHash.success({ id: 1, name: "Joel", tasks: [] });
  expectStateForInstance('saving', false, person);

  result = store.find(Person, 1);

  equal(get(result, 'name'), "Joel", "the hash should be updated");
});

test("deleting a person makes a DELETE to /people/:id/", function() {
  store.load(Person, { id: 1, name: "Toran" });
  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  person = store.find(Person, 1);

  expectLoaded(person);

  person.deleteRecord();

  expectStateForInstance('dirty', true, person);
  expectStateForInstance('deleted', true, person);
  store.commit();
  expectStateForInstance('saving', true, person);

  expectUrl("/people/1/", "the plural of the model name with its id"); //add trailing slash
  expectType("DELETE");

  expectStateForInstance('deleted', true, person);
});

test("finding a person by id makes a GET to /people/:id/", function() {
  person = store.find(Person, 1);

  expectStateForInstance('loaded', false, person);
  expectUrl("/people/1/", "the plural of the model name with the id requested"); //add slash
  expectType("GET");

  ajaxHash.success({ id: 1, name: "Toran", tasks: [] });

  expectLoaded(person);
  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by id without another Ajax request");
});

test("finding all people makes a GET to /people/", function() {
  store.load(Person, {id: 2, name: "Toran", tasks: []});
  store.load(Person, {id: 3, name: "Joel", tasks: []});

  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  people = store.find(Person);
  equal(get(people, 'length'), 2, "there are two people");

  expectUrl("/people/", "the plural of the model"); //add slash
  expectType("GET");
});

test("findMany generates http get request to fetch one-to-many relationship with the correct url", function() {
  store.load(Person, {id: 9, name: "Toran Billups", tasks: [1, 2]});
  person = store.find(Person, 9);
  expectLoaded(person);

  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  var tasks = get(person, 'tasks');

  equal(get(tasks, 'length'), 2, "there are two tasks in the association already");
  tasks.forEach(function(task) {
    equal(get(task, 'isLoaded'), false, "the task is being loaded");
  });

  expectUrl("/people/9/tasks/");
  expectType("GET");

  ajaxHash.success([{"id": 1, "name": "Todo", "person": 9}, {"id": 2, "name": "Done", "person": 9}]);

  equal(get(tasks, 'length'), 2, "there are still two tasks in the association");
  tasks.forEach(function(task) {
    expectLoaded(task);
  });
  equal(get(tasks.objectAt(0), 'name'), 'Todo');
  equal(get(tasks.objectAt(1), 'name'), 'Done');
});

test("findMany generates http get request to fetch m2m relationship with the correct url", function() {
  store.load(Group, {id: 9, name: "Admin", people: [1, 2, 3]});
  group = store.find(Group, 9);
  expectLoaded(group);

  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  var people = get(group, 'people');

  equal(get(people, 'length'), 3, "there are three people in the association already");
  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), false, "the person is being loaded");
  });

  expectUrl("/groups/9/people/");
  expectType("GET");

  ajaxHash.success([{"id": 1, "name": "Toran"}, {"id": 2, "name": "Joel"}, {"id": 3, "name": "Matt"}]);

  equal(get(people, 'length'), 3, "there are still three people in the association");
  people.forEach(function(person) {
    expectLoaded(person);
  });
  equal(get(people.objectAt(0), 'name'), 'Toran');
  equal(get(people.objectAt(1), 'name'), 'Joel');
  equal(get(people.objectAt(2), 'name'), 'Matt');
});

test("if you set a namespace then it will be prepended", function() {
  set(adapter, 'namespace', 'codecamp');
  role = store.find(Role, 1);
  expectUrl("/codecamp/roles/1/", "the namespace, followed by by the plural of the model name and the id");
});
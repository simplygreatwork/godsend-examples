
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function() {
		
		new basic.Server({
			learn : false
		}).start(function() {
			new basic.Authorizer().connect(function() {
				new Agent().start();
				new Sender().start();
				console.log('The example has started.');
			}.bind(this));
		}.bind(this));
	}
});

Agent = Class.extend({
	
	initialize: function(properties) {

		Object.assign(this, properties);
		this.storage = {};
	},
	
	start: function() {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			}
		});
		
		connection.mount({
			id: 'store-all-tasks',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'all',
					collection: 'tasks'
				});
			}.bind(this),
			run: function(stream) {
				var collection = stream.request.pattern.collection;
				this.storage[collection] = this.storage[collection] || {};
				if (stream.object.fields) {
					Object.keys(this.storage[collection]).forEach(function(key) {
						var each = this.storage[collection][key];
						var object = {};
						Object.keys(stream.object.fields).forEach(function(property) {
							object[property] = each[property];
						}.bind(this));
						stream.push(object);
					}.bind(this));
				} else {
					Object.keys(this.storage[collection]).forEach(function(key) {
						var object = this.storage[collection][key];
						stream.push(object);
					}.bind(this));
				}
				stream.next();
			}.bind(this)
		});
		
		connection.mount({
			id: 'store-put',
			cache: false,
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'put'
				});
			}.bind(this),
			run: function(stream) {
				var collection = stream.request.pattern.collection;
				console.log('Putting the object into collection "' + collection + '".');
				var key = stream.object.key;
				this.storage[collection] = this.storage[collection] || {};
				this.storage[collection][key] = stream.object.value;
				stream.push(stream.object);
				stream.next();
			}.bind(this),
			ending: function(stream) {
				stream.push({
					message : 'Put all of the valid tasks.'
				});
				stream.next();
			}.bind(this)
		});

		connection.mount({
			id: 'store-put-tasks-validate',
			before: 'store-put',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'put',
					collection: 'tasks'
				});
			}.bind(this),
			run: function(stream) {
				console.log('Validating the task.');
				if (!stream.object.value.title) {
					stream.err({
						message: 'Invalid task',
						object: stream.object
					});
					stream.next();
				} else {
					stream.push(stream.object);
					stream.next();
				}
			}.bind(this)
		});
		
		connection.mount({
			id: 'store-put-tasks-transform',
			before: 'store-put-tasks-validate',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'put',
					collection: 'tasks'
				});
			}.bind(this),
			run: function(stream) {
				console.log('Transforming the task.');
				if (!stream.object.value.id) stream.object.value.id = stream.object.key;
				if (!stream.object.value.created) stream.object.value.created = new Date();
				stream.object.value.modified = new Date();
				stream.push(stream.object);
				stream.next();
			}.bind(this)
		});
	}
});

Sender = Class.extend({
	
	start: function() {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('sender').username,
				passphrase: basic.Credentials.get('sender').passphrase,
			}
		});
		
		var sequence = basic.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						topic: 'store',
						action: 'put',
						collection: 'tasks'
					},
					write: function(stream) {
						stream.write({
							key: uuid.v4(),
							value: {
								number: 1
							}
						});
						stream.write({
							key: uuid.v4(),
							value: {
								title: 'New Task'
							}
						});
						stream.write({
							key: uuid.v4(),
							value: {
								title: 'Another New Task'
							}
						});
						stream.end();
					}.bind(this),
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});
				
			}.bind(this),
			
			function() {
				
				connection.send({
					pattern: {
						topic: 'store',
						action: 'all',
						collection: 'tasks'
					},
					data: {
						limit: 10,
						fields: {
							id: true,
							title: true,
							created: true
						}
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});

			}.bind(this),
			
			function() {
				
				setTimeout(function() {
					console.log('The example has finished.');
					process.exit(0);
				}.bind(this), 500);
				
			}.bind(this)
			
		);
	}
});

new Example();
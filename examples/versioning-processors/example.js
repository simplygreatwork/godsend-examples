
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function(properties) {
		
		new basic.Server().start(function() {
			new basic.Authorizer({
				users: this.users
			}).connect(function() {
				new Agent().connect(function() {
					new Sender().connect(function() {
						console.log('The example has started.');
					});
				}.bind(this));
			}.bind(this));
		}.bind(this));
	},
	
	users: {
		'agent': {
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			},
			patterns: {
				sendable: [],
				receivable: [{
					topic: 'store',
					action: 'get'
				}]
			}
		},
		'sender': {
			credentials: {
				username: basic.Credentials.get('sender').username,
				passphrase: basic.Credentials.get('sender').passphrase,
			},
			patterns: {
				sendable: [{
					topic: 'store',
					action: 'get',
					collection: 'tasks'
				}],
				receivable: []
			},
			versions: {
				'store-get-tasks-transform': 'version-three'
			}
		}
	}
});

Agent = Class.extend({
	
	connect: function(callback) {
		
		new godsend.Bus({
			address: basic.Utility.local()
		}).connect({
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			},
			initialized : function(connection) {
				this.process(connection);
			}.bind(this),
			connected: function(connection) {
				this.connection = connection;
				callback();
			}.bind(this),
			errored : function(errors) {
				console.error('connection errors: ' + errors);
				callback();
			}.bind(this)
		});
	},

	process: function(connection) {
		
		connection.process({
			id: 'store-get',
			cache: false,
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'get',
					collection: 'tasks'
				});
			}.bind(this),
			run: function(stream) {
				console.log('Getting the task.');
				stream.push({
					title: 'Untitled Task',
					done: false
				});
				stream.next();
			}.bind(this)
		});
		
		connection.process({
			id: 'store-get-tasks-transform',
			after: 'store-get',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'get',
					collection: 'tasks'
				});
			}.bind(this),
			run: function(stream) {
				console.log('Transforming the task. (unversioned)');
				stream.push(stream.object);
				stream.next();
			}.bind(this)
		});
		
		connection.process({
			id: 'store-get-tasks-transform',
			version: {
				name: 'version-two',
				'default': true
			},
			after: 'store-get',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'get',
					collection: 'tasks'
				});
			}.bind(this),
			run: function(stream) {
				console.log('Transforming the task. (v2 : default)');
				stream.push(stream.object);
				stream.next();
			}.bind(this)
		});
		
		connection.process({
			id: 'store-get-tasks-transform',
			version: 'version-three',
			after: 'store-get',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'get',
					collection: 'tasks'
				});
			}.bind(this),
			run: function(stream) {
				console.log('Transforming the task. (v3)');
				stream.push(stream.object);
				stream.next();
			}.bind(this)
		});
	}
});

Sender = Class.extend({
	
	connect: function(callback) {
		
		new godsend.Bus({
			address: basic.Utility.local()
		}).connect({
			credentials: {
				username: basic.Credentials.get('sender').username,
				passphrase: basic.Credentials.get('sender').passphrase,
			},
			initialized : function(connection) {
				this.connection = connection;
			}.bind(this),
			connected: function(connection) {
				this.start(connection);
				callback();
			}.bind(this),
			errored : function(errors) {
				console.error('connection errors: ' + errors);
				callback();
			}.bind(this)
		});
	},
	
	start: function(connection) {
		
		var sequence = basic.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						topic: 'store',
						action: 'get',
						collection: 'tasks'
					},
					data: {
						key: uuid.v4()
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});
				
			}.bind(this),
			
			function() {
				
				console.log('The example has finished.');
				process.exit(0);
				
			}.bind(this)

		);
	}
});

new Example();
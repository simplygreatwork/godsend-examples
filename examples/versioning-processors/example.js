
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function(properties) {
		
		new basic.Server({
			learn : true
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
	
	start: function() {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			}
		});
		
		connection.mount({
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
		
		connection.mount({
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
		
		connection.mount({
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
		
		connection.mount({
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
				
				setTimeout(function() {
					console.log('The example has finished.');
					process.exit(0);
				}.bind(this), 500);
				
			}.bind(this)

		);
	}
});

new Example();
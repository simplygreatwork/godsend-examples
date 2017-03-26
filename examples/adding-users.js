
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
					new Administrator().connect(function() {
						console.log('Everything has been started.');
					});
				}.bind(this));
			});
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
					topic: 'post-message'
				}]
			}
		},
		'administrator': {
			credentials: {
				username: basic.Credentials.get('administrator').username,
				passphrase: basic.Credentials.get('administrator').passphrase,
			},
			patterns : {
				sendable : [{
					topic : 'authentication',
					action : 'get-user'
				}, {
					topic : 'authentication',
					action : 'put-user'
				}, {
					topic : 'authentication',
					action : 'sign-in'
				}],
				receivable : []
			}
		}
	}
});

Agent = Class.extend({

	initialize: function(properties) {

		Object.assign(this, properties);
		this.storage = {};
	},

	connect: function(callback) {
		
		new godsend.Bus({
			address: 'http://127.0.0.1:8080/'
		}).connect({
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			},
			responded: function(result) {
				this.process(result.connection);
				callback();
			}.bind(this)
		});
	},

	process: function(connection) {

		connection.process({
			id: 'post-message',
			on: function(request) {
				request.accept({
					topic: 'post-message'
				});
			}.bind(this),
			run: function(stream) {
				stream.push({
					message: 'Received the secure message from the client!'
				});
				stream.next();
			}.bind(this)
		});
	}
});

Administrator = Class.extend({
	
	connect: function(callback) {
		
		new Bus({
			address: 'http://127.0.0.1:8080'
		}).connect({
			credentials: {
				username: basic.Credentials.get('administrator').username,
				passphrase: basic.Credentials.get('administrator').passphrase,
			},
			responded: function(result) {
				this.start(result.connection);
				callback();
			}.bind(this)
		});
	},
	
	start: function(connection) {
		
		var sequence = Sequence.start(

			function() {
				
				connection.send({
					pattern: {
						topic: 'authentication',
						action: 'put-user'
					},
					data: {
						credentials: {
							username: basic.Credentials.get('new-user').username,
							passphrase: basic.Credentials.get('new-user').passphrase,
						},
						patterns: {
							sendable: [{
								topic: 'post-message'
							}],
							receivable: []
						}
					},
					receive: function(result) {
						console.log('Result: ' + JSON.stringify(result.objects));
						sequence.next();
					}.bind(this)
				});

			}.bind(this),

			function() {

				connection.send({
					pattern: {
						topic: 'authentication',
						action: 'sign-in'
					},
					data: {
						credentials: {
							username: basic.Credentials.get('new-user').username,
							passphrase: basic.Credentials.get('new-user').passphrase,
						}
					},
					receive: function(result) {
						console.log('Result: ' + JSON.stringify(result.objects));
						sequence.next();
					}.bind(this)
				});

			}.bind(this),

			function() {
				
				connection.send({
					pattern: {
						topic: 'post-message'
					},
					data: {
						message: 'Message from user "new-user".'
					},
					receive: function(result) {
						console.log('Result: ' + JSON.stringify(result.objects));
						sequence.next();
					}.bind(this)
				});

			}.bind(this)

		);
	}
});

new Example();

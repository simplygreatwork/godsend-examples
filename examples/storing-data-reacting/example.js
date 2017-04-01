
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function(properties) {
		
		new basic.Server().start(function() {
			new basic.Authorizer({
				users: this.users,
			}).connect(function() {
				new Agent().connect(function() {
					new Client().start(function() {
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
				sendable: [{
					topic: 'store',
					action: 'put-notify',
				}],
				receivable: [{
					topic: 'store',
					action: 'put'
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
					action: 'put',
					collection: 'tasks'
				}, {
					topic: 'store',
					action: 'put',
					collection: 'patients'
				}],
				receivable: []
			}
		},
		'task-receiver': {
			credentials: {
				username: basic.Credentials.get('task-receiver').username,
				passphrase: basic.Credentials.get('task-receiver').passphrase,
			},
			patterns: {
				sendable: [],
				receivable: [{
					topic: 'store',
					action: 'put-notify',
					collection: 'tasks'
				}]
			}
		},
		'patient-receiver': {
			credentials: {
				username: basic.Credentials.get('patient-receiver').username,
				passphrase: basic.Credentials.get('patient-receiver').passphrase,
			},
			patterns: {
				sendable: [],
				receivable: [{
					topic: 'store',
					action: 'put-notify',
					collection: 'patients'
				}]
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
				console.error('Connection errors: ' + errors);
				callback(errors);
			}.bind(this)
		});
	},

	process: function(connection) {

		connection.process({
			id: 'store-put',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'put'
				});
			}.bind(this),
			run: function(stream) {
				console.log('Putting an object.');
				var collection = stream.request.pattern.collection;
				var key = stream.object.key;
				this.storage[collection] = this.storage[collection] || {};
				this.storage[collection][key] = stream.object.value;
				stream.push(stream.object);
				stream.next();
			}.bind(this)
		});
		
		connection.process({
			id: 'store-put-notify',
			after: 'store-put',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'put'
				});
			}.bind(this),
			run: function(stream) {
				connection.send({
					pattern: {
						topic: 'store',
						action: 'put-notify',
						collection: stream.request.pattern.collection
					},
					data: stream.object,
					receive: function(result) {
						stream.push(stream.object);
						stream.next();
					}.bind(this)
				});
			}.bind(this)
		});
	}
});

Client = Class.extend({
	
	start : function(callback) {
		
		new Receiver.Task({
			bus: this.bus = new Bus({
				address: basic.Utility.local()
			})
		}).connect(function() {
			new Receiver.Patient({
				bus: this.bus
			}).connect(function() {
				new Sender({
					bus: this.bus
				}).connect(function(sender) {
					callback();
					sender.start();
				}.bind(this));
			}.bind(this));
		}.bind(this));
	}
});

Sender = Class.extend({
	
	connect: function(callback) {
		
		new Bus({
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
				this.connection = connection;
				callback(this);
			}.bind(this),
			errored : function(errors) {
				console.error('Connection errors: ' + errors);
				callback(this, errors);
			}.bind(this)
		});
	},
	
	start: function() {
		
		var connection = this.connection;
		var sequence = godsend.Sequence.start(

			function() {

				connection.send({
					pattern: {
						topic: 'store',
						action: 'put',
						collection: 'tasks'
					},
					data: {
						key: uuid(),
						value: {
							title: 'New Task'
						}
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result.objects, null, 2));
						sequence.next();
					}.bind(this)
				});

			}.bind(this),

			function() {

				connection.send({
					pattern: {
						topic: 'store',
						action: 'put',
						collection: 'patients'
					},
					data: {
						key: uuid(),
						value: {
							title: 'New Patient'
						}
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result.objects, null, 2));
						sequence.next();
					}.bind(this)
				});

			}.bind(this)

		);
	}
});

Receiver = {

	Task: Class.extend({

		connect: function(callback) {
			
			this.bus.connect({
				credentials: {
					username: basic.Credentials.get('task-receiver').username,
					passphrase: basic.Credentials.get('task-receiver').passphrase,
				},
				initialized : function(connection) {
					this.process(connection);
				}.bind(this),
				connected: function(connection) {
					this.connection = connection;
					callback();
				}.bind(this),
				errored : function(errors) {
					console.error('Connection errors: ' + errors);
					callback(errors);
				}.bind(this)
			});
		},

		process: function(connection) {

			connection.process({
				id: 'store-put-tasks-notify-task-receiver',
				on: function(request) {
					request.accept({
						topic: 'store',
						action: 'put-notify',
						collection: 'tasks'
					});
				}.bind(this),
				run: function(stream) {
					console.log('Task receiver was notified that a task was updated.');
					stream.next();
				}.bind(this)
			});

			connection.process({
				id: 'store-put-patients-notify-task-receiver',
				on: function(request) {
					request.accept({
						topic: 'store',
						action: 'put-notify',
						collection: 'patients'
					});
				}.bind(this),
				run: function(stream) {
					console.log('Task receiver was notified that a patient was updated.');
					stream.next();
				}.bind(this)
			});
		}
	}),

	Patient: Class.extend({

		connect: function(callback) {
			
			this.bus.connect({
				credentials: {
					username: basic.Credentials.get('patient-receiver').username,
					passphrase: basic.Credentials.get('patient-receiver').passphrase,
				},
				initialized : function(connection) {
					this.process(connection);
				}.bind(this),
				connected: function(connection) {
					this.connection = connection;
					callback();
				}.bind(this),
				errored : function(errors) {
					console.error('Connection errors: ' + errors);
					callback(errors);
				}.bind(this)
			});
		},

		process: function(connection) {
			
			connection.process({
				id: 'store-put-tasks-notify-patient-receiver',
				on: function(request) {
					request.accept({
						topic: 'store',
						action: 'put-notify',
						collection: 'tasks'
					});
				}.bind(this),
				run: function(stream) {
					console.log('Patient receiver was notified that a task was updated.');
					stream.next();
				}.bind(this)
			});

			connection.process({
				id: 'store-put-patients-notify-patient-receiver',
				on: function(request) {
					request.accept({
						topic: 'store',
						action: 'put-notify',
						collection: 'patients'
					});
				}.bind(this),
				run: function(stream) {
					console.log('Patient receiver was notified that a patient was updated.');
					stream.next();
				}.bind(this)
			});
		}
	})
};

new Example();
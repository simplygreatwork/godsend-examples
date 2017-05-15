
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
				new Receiver.Task().start();
				new Receiver.Patient().start();
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

	start: function(callback) {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			}
		});
		
		connection.mount({
			id: 'store-put',
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
				stream.push({
					put : stream.object
				});
				stream.next();
			}.bind(this)
		});
		
		connection.mount({
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
					data: {
						key: uuid(),
						value: {
							title: 'New Task'
						}
					},
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

Receiver = {

	Task: Class.extend({

		start: function() {
			
			var connection = godsend.connect({
				address: basic.Utility.local(),
				credentials: {
					username: basic.Credentials.get('task-receiver').username,
					passphrase: basic.Credentials.get('task-receiver').passphrase,
				}
			});
			
			connection.mount({
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
					stream.push({
						notified : true
					});
					stream.next();
				}.bind(this)
			});

			connection.mount({
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
		
		start: function(callback) {
			
			var connection = godsend.connect({
				address: basic.Utility.local(),
				credentials: {
					username: basic.Credentials.get('patient-receiver').username,
					passphrase: basic.Credentials.get('patient-receiver').passphrase,
				}
			});
			
			connection.mount({
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

			connection.mount({
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
					stream.push({
						notified : true
					});
					stream.next();
				}.bind(this)
			});
		}
	})
};

new Example();
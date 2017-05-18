
var godsend = require('godsend');
var basic = require('godsend-basics');
var extras = require('godsend-extras');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function() {
		
		new basic.Server({
			learn : false
		}).start(function() {
			new basic.Authorizer().connect(function() {
				new Agent().start();
				new Watcher().start();
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
		
		connection.install({
			service : new (require('godsend-extras/src/Logger'))({}),
		});
		connection.install({
			service : new (require('godsend-extras/src/Registrar'))({}),
		});
		connection.install({
			service : new (require('godsend-extras/src/store/Level'))({}),
		});
		connection.install({
			service : new (require('godsend-extras/src/Broadcaster'))({}),
		});
		
		connection.mount({
			id: 'store-put-tasks-validate',
			before: 'store-put',
			on: (request) => {
				request.accept({
					topic: 'store',
					action: 'put',
					collection: 'tasks'
				});
			},
			run: (stream) => {
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
			}
		});
		
		connection.mount({
			id: 'store-put-patients-validate',
			before: 'store-put',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'put',
					collection: 'patients'
				});
			}.bind(this),
			run: function(stream) {
				console.log('Validating the patient.');
				if (!stream.object.value.name) {
					stream.err({
						message: 'Invalid patient',
						object: stream.object
					});
					stream.next();
				} else {
					stream.push(stream.object);
					stream.next();
				}
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
						collection : 'tasks'
					},
					data : [{
						key : this.key = uuid.v4(),
						value : {
							title : 'Task ' + Math.floor(Math.random() * 100),
							done : Math.random() > 0.5 ? true : false 
						}
					}],
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
						collection : 'patients'
					},
					data : [{
						key : this.key = uuid.v4(),
						value : {
							name : 'Patient ' + Math.floor(Math.random() * 100),
							insured : Math.random() > 0.5 ? true : false 
						}
					}],
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
						action: 'get',
						collection : 'tasks',
						match : {
							done : false
						},
						sort : {
							title : true
						},
						reduce : {
							offset : 0,
							limit : 5
						},
						pluck : {
							created : true,
							title : true,
							done : true
						}
					},
					data : {},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						console.log('result.objects.length: ' + JSON.stringify(result.objects.length, null, 2));
						sequence.next();
					}.bind(this)
				});
				
			}.bind(this),
			
			function() {
				
				connection.send({			
					pattern: {
						topic: 'store',
						action: 'get',
						collection : 'patients',
						match : {
							id : this.key
						},
						pluck : {
							created : true,
							name : true,
							insured : false
						}
					},
					data : {},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						console.log('result.objects.length: ' + JSON.stringify(result.objects.length, null, 2));
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

Watcher = Class.extend({
	
	start: function() {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('watcher').username,
				passphrase: basic.Credentials.get('watcher').passphrase,
			}
		});
		
		connection.mount({
			id: 'store-put-patients-broadcast',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'put-broadcast',
					collection: 'patients'
				});
			}.bind(this),
			run: function(stream) {
				console.log('The watcher was notified that a patient was put.');
				stream.push({
					notified : true
				});
				stream.next();
			}.bind(this)
		});
	}
});


new Example();

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
			service : new (require('godsend-extras/src/store/Level'))({}),
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
			id: 'store-put-patients-validate',
			weight: -11,
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
							label : 'Task ' + Math.floor(Math.random() * 100),
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
						action: 'get',
						collection : 'tasks',
						match : {
							done : true
						},
						sort : {
							label : true
						},
						reduce : {
							offset : 0,
							limit : 5
						},
						pluck : {
							label : true
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
							name : true,
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
				
				setTimeout(function() {
					console.log('The example has finished.');
					process.exit(0);
				}.bind(this), 500);
				
			}.bind(this)
			
		);
	}
});

new Example();
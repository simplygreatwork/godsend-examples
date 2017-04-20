
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');
var level = require('level');
var levelws = require('level-ws');

Example = Class.extend({
	
	initialize: function(properties) {
		
		new basic.Server().start(function() {
			new basic.Authorizer({
				users: this.users
			}).connect(function() {
				new Agent().start();
				new Sender().start();
				console.log('The example has started.');
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
					topic : 'store',
					action : 'put',
				}, {
					topic : 'store',
					action : 'get',
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
					topic : 'store',
					action : 'put',
				}, {
					topic : 'store',
					action : 'get',
				}],
				receivable: []
			}
		}
	}
});

Agent = Class.extend({

	initialize: function(properties) {
		
		Object.assign(this, properties);
		this.database = level('database')
		this.database = levelws(this.database);
	},
	
	start: function() {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			}
		});
		
		connection.process({
			id: 'store-put',
			on: function(request) {
				request.accept({
					topic : 'store',
					action: 'put'
				});
			}.bind(this),
			run: function(stream) {
				stream.request.writeStream = stream.request.writeStream || this.database.createWriteStream();
				stream.object.value = JSON.stringify(stream.object.value);
				stream.request.writeStream.write(stream.object);
				stream.next();
			}.bind(this),
			ending : function(stream) {
				if (stream.request.writeStream) stream.request.writeStream.end();
				stream.push({
					end: true
				});
				stream.next();
			}
		});
		
		connection.process({
			id: 'store-get',
			on: function(request) {
				request.accept({
					topic : 'store',
					action: 'get'
				});
			}.bind(this),
			run: function(stream) {
				var readstream = this.database.createReadStream();
				readstream.on('readable', function() {
					var data = readstream.read();
					var object = JSON.parse(JSON.stringify(data));
					stream.push(object);
				}.bind(this));
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
						topic : 'store',
						action: 'put'
					},
					write: function(stream) {
						var counter = 0;
						var id = setInterval(function() {
							counter++;
							if (counter < 3) {
								stream.write({
									key: uuid(),
									value : {
										boolean : Math.random() > 0.5 ? true : false
									}
								});
							} else {
								stream.end();
								clearTimeout(id);
							}
						}.bind(this), 1);
					}.bind(this),
					receive: function(result) {
						console.log('put result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}
				});
				
			}.bind(this),
			
			function() {
				
				connection.send({
					pattern: {
						topic : 'store',
						action: 'get'
					},
					data : {
						all : true
					},
					read: function(object) {
						console.log('one get object: ' + JSON.stringify(object, null, 2));
					},
					receive: function(result) {
						console.log('all get results: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}
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
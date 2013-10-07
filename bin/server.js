/**
 * Entry point for the RESTFul PIX Service. 
 *
 * Created by: Julian Jewel
 *
 */
var express = require('express')
var config = require('config');
var _ = require('underscore');
// Export config, so that it can be used anywhere
module.exports.config = config;
// Connect to Oracle Database for Cross Reference
var oracle = require("oracle");
// Connection String from property file
var connectData = { "tns":config.db.connString, "user": config.db.username, "password": config.db.password };
// Generic pool for database connection
var generic_pool = require('generic-pool');

var pool = generic_pool.Pool({
    name: 'oracle',
    max: config.db.pool,
    create: function(callback) {
		oracle.connect(connectData, function(err, connection) {
			if(err) {
				throw err;
			}
			callback(null, connection);
		});
    },
    destroy: function(db) {
        db.close();
    },
	// specifies how long a resource can stay idle in pool before being removed
    idleTimeoutMillis : config.db.timeout,
     // if true, logs via console.log - can also be a function
    log : config.db.debug
	
});

// TODO: Implement Connection Pooling
oracle.connect(connectData, function(err, connection) {
	if(err) {
		throw err;
	}
	createApp(pool);
});
// Create Express App
function createApp(pool) {
    var app = express();

    app.configure(function () {
		// Log
        app.use(express.logger());
        app.use(app.router);
		// Simple Access Control - TODO: Preferences & Authorizations
		// TODO: Implement Security
        if (config.accessControl) {
            var accesscontrol = require('../lib/accesscontrol');
            app.use(accesscontrol.handle);
        }
		// Only for development
		if(config.debug) {
			app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
		}
    });

	// Include Router
	var router = require('../lib/router')(pool);

	// Get the patient identifier cross-reference
	app.get('/:assigningAuthority/:identifier', router.getCorrespondingIds);

	// Listen
    app.listen(config.server.port, config.server.server, function () {
        console.log('PIX server listening on port ' + config.server.port);
    });
}

// Default exception handler
process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});
// Ctrl-C Shutdown
process.on( 'SIGINT', function() {
  console.log( "\nShutting down from  SIGINT (Crtl-C)" )
  process.exit( )
})
// Default exception handler
process.on('exit', function (err) {
	pool.drain(function() {
		pool.destroyAllNow();
	});
});
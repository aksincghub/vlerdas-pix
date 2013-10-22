/**
 * Entry point for the RESTFul PIX Service.
 *
 * Created by: Julian Jewel
 *
 */
var config = require('config');
// Export config, so that it can be used anywhere
var express = require('express')
module.exports.config = config;
var _ = require('underscore');
var Log = require('vcommons').log;
var logger = Log.getLogger('PIX', config.log);
// Connect to Oracle Database for Cross Reference
var oracle = require("oracle");
var http = require("http");
var https = require("https");
var fs = require("fs");
// Connection String from property file

logger.trace('Establishing Connection: ', config.db.connString);
var connectData = {
    "tns" : config.db.connString,
    "user" : config.db.username,
    "password" : config.db.password
};
// Generic pool for database connection
var generic_pool = require('generic-pool');
var https = require('https');

logger.trace('Establishing pool with max:', config.db.pool);
var pool = generic_pool.Pool({
        name : 'oracle',
        max : config.db.pool,
        create : function (callback) {
            logger.trace('Connecting to Oracle..');
            oracle.connect(connectData, function (err, connection) {
                if (err) {
                    logger.error('Could not connect', err);
                    throw err;
                }
                logger.info('Connected to Oracle, Pooling Connection!');
                callback(null, connection);
            });
        },
        destroy : function (db) {
            logger.info('Destroying Oracle Connection');
            db.close();
            logger.info('Destroyed Oracle Connection');
        },
        // specifies how long a resource can stay idle in pool before being removed
        idleTimeoutMillis : config.db.timeout,
        // if true, logs via console.log - can also be a function
        log : config.db.debug

    });

logger.info('Starting PIX Service...');
createApp(pool);
// Create Express App
function createApp(pool) {
    var app = express();

    app.configure(function () {
        // Log
        app.use(express.logger());
        app.use(app.router);
        // Simple Access Control - TODO: Preferences & Authorizations
        if (config.accessControl) {
            logger.trace('Setting up access control');
            var accessControl = require('vcommons').accessControl;
            app.use(accessControl());
        }

        // Only for development
        if (config.debug) {
            app.use(express.errorHandler({
                    showStack : true,
                    dumpExceptions : true
                }));
        }
    });

    // Include Router
    var router = require('../lib/router')(pool);

    // Get the patient identifier cross-reference
    app.get('/pix/v1/2.16.840.1.113883.4.1/:identifier', router.getCorrespondingIds);

    // Listen
    if (!_.isUndefined(config.server) || !_.isUndefined(config.secureServer)) {
        if (!_.isUndefined(config.server)) {
            http.createServer(app).listen(config.server.port, config.server.host, function () {
                logger.info("PIX server listening at http://" + config.server.host + ":" + config.server.port);
            });
        }

        if (!_.isUndefined(config.secureServer)) {
            https.createServer(fixOptions(config.secureServer.options), app).listen(config.secureServer.port, config.secureServer.host, function () {
                logger.info("PIX server listening at https://" + config.secureServer.host + ":" + config.secureServer.port);
            });
        }
    } else {
        logger.error("Configuration must contain a server or secureServer.");
        process.exit();
    }

}


function fixOptions(configOptions)
{
	var options = {};

	if (!_.isUndefined(configOptions.key) && _.isString(configOptions.key)) {
		options.key = fs.readFileSync(configOptions.key);
	}

	if (!_.isUndefined(configOptions.cert) && _.isString(configOptions.cert)) {
		options.cert = fs.readFileSync(configOptions.cert);
	}

	if (!_.isUndefined(configOptions.pfx) && _.isString(configOptions.pfx)) {
		options.pfx = fs.readFileSync(configOptions.pfx);
	}

	return options;
}
// Default exception handler
process.on('uncaughtException', function (err) {
    logger.error('Caught exception: ' + err);
});
// Ctrl-C Shutdown
process.on('SIGINT', function () {
    logger.info("Shutting down from  SIGINT (Crtl-C)")
    process.exit()
})
// Default exception handler
process.on('exit', function (err) {
    logger.info("Exiting, Error:", err);
    logger.info('Destroying pool!');
    pool.drain(function () {

        pool.destroyAllNow();
    });
});

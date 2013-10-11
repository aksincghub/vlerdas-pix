/**
 * Entry point for the RESTFul Mock PIX Service. 
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

createApp();
// Create Express App
function createApp() {
    var app = express();

    app.configure(function () {
		// Log
        app.use(express.logger());
		// Only for development
		if(config.debug) {
			app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
		}
    });

	// Get the patient identifier cross-reference
	app.get('/2.16.840.1.113883.4.1/1234567', function (req, res, next) {
		res.header('Content-Type', 'application/json');
		res.send ('[{"2.16.840.1.113883.3.275":"7654321"}]', 200);
	});

		// Get the patient identifier cross-reference
	app.get('/2.16.840.1.113883.4.1/123123123', function (req, res, next) {
		res.header('Content-Type', 'application/json');
		res.send ('[{"2.16.840.1.113883.3.275":"321321321"}]', 200);
	});

	// Get the patient identifier cross-reference
	app.get('/2.16.840.1.113883.4.1/1111111', function (req, res, next) {
		res.header('Content-Type', 'application/json');
		res.send('[{"2.16.840.1.113883.3.275":"MULTIPLE"}]', 200);
	});


		// Get the patient identifier cross-reference
	app.get('/2.16.840.1.113883.4.1/:identifier', function (req, res, next) {
		res.header('Content-Type', 'application/json');
		res.send ('[{"2.16.840.1.113883.3.275":"UNKNOWN"}]', 200);
	});

	// Listen
    app.listen(config.server.port, config.server.server, function () {
        console.log('PIX Mock server listening on port ' + config.server.port);
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
});

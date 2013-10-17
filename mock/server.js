/**
 * Entry point for the RESTFul Mock PIX Service. 
 *
 * Created by: Julian Jewel
 *
 */
var express = require('express')
var config = require('config');
var _ = require('underscore');
var S = require('string');
// Export config, so that it can be used anywhere
module.exports.config = config;
// Connect to Oracle Database for Cross Reference

createApp();
// Create Express App

var identifier = '{'
  +'"identifier:Identifier": {'
    +'"-xmlns:s": "http://niem.gov/niem/structures/2.0",'
    +'"-xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",'
    +'"-xmlns:identifier": "http://vler.va.gov/vler/schemas/internal/identifier",'
    +'"-xmlns:nc": "http://niem.gov/niem/niem-core/2.0",'
    +'"-xmlns:vler": "http://va.gov/vler/schemas/vlerSupersetSchema/0.7/vler",'
    +'"identifier:CommonData": {'
      +'"vler:Client": {'
        +'"-s:id": "client",'
        +'"vler:ClientIdentifier": ['
          +'{'
            +'"nc:IdentificationID": "UNKNOWN",'
            +'"vler:AssigningAuthority": "2.16.840.1.113883.3.275"'
          +'}'
		+']'
	  +'}'
    +'}'
  +'}'
+'}';
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
	app.get('/2.16.840.1.113883.4.1/:ssn', function (req, res, next) {
		res.header('Content-Type', 'application/json');
		var result = JSON.parse(identifier);
		var ssn = req.params.ssn;
		var aun = 'UNKNOWN';
		if(!_.isUndefined(ssn)) {
			if(S(ssn).startsWith('6')) {
				aun = 'AUN' + ssn;
			} else if (S(ssn).startsWith('111111111')) {
				aun = 'MULTIPLE';
			}
		}
		
		var jsonToAdd = JSON.parse( '{"nc:IdentificationID":"' + aun + '", "vler:AssigningAuthority":"2.16.840.1.113883.3.275" }');
		var clientIdentifierArray = [] ;
		clientIdentifierArray[0] = jsonToAdd;
		result['identifier:Identifier']['identifier:CommonData']['vler:Client']['vler:ClientIdentifier'] = clientIdentifierArray;
		res.send (result, 200);
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

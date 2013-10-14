/*
* Router - For PIX
*
* Created by Julian Jewel
*/
var app = module.parent.exports.app,
    config = module.parent.exports.config;
var _ = require('underscore')
	
var identifierDoc = '{'
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

module.exports = exports = function (pool) {
    return {
        getCorrespondingIds: function (req, res, next) {
			if(!_.isUndefined(req.params.identifier)) {
				pool.acquire(function(err, db) {
					if (err) {
						res.write(500, err);
						res.send();
						return;
					}
					// Replace with a proper query
					db.execute(config.stmt.aun, [req.params.identifier], function(err, results) {
						// TODO: Include getCorrespondingIds from MVI
						if(config.debug)
							console.log(results);
						if ( err ) {
							res.write(500, err);
							res.send();
						} else {
							if(!_.isEmpty(results) && results.length > 0) {
								res.header('Content-Type', 'application/json');
								var result = JSON.parse(identifierDoc);
								var clientIdentifierArray = [] ;
								var identifier;
								if(results.length > 1) {
									identifier = 'MULTIPLE';
								} else {
									identifier = results[0].AUN;
								}
								clientIdentifierArray[0] = JSON.parse( '{"nc:IdentificationID":"' + identifier + '", "vler:AssigningAuthority":"' + config.oids.aun + ' " }');
								result['identifier:Identifier']['identifier:CommonData']['vler:Client']['vler:ClientIdentifier'] = clientIdentifierArray;
								res.send(result, 200);
							}
						}
						// Release connection to the pool
						pool.release(db);
					});

				});
				
			} else {
				throw new Error("Undefined Identifier");
			}
		}
    }

}

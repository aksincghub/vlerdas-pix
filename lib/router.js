/*
* Router - For PIX
*
* Created by Julian Jewel
*/
var app = module.parent.exports.app,
    config = module.parent.exports.config;
var _ = require('underscore')
	
module.exports = exports = function (pool) {
    return {
        getCorrespondingIds: function (req, res, next) {
			if(!_.isUndefined(req.params.identifier)) {
				pool.acquire(function(err, db) {
					if (err) {
						throw err;
					}
					// Replace with a proper query
					db.execute(config.stmt.aun, [req.params.identifier], function(err, results) {
						// TODO: Include getCorrespondingIds from MVI
						if(config.debug)
							console.log(results);
						if ( err ) {
						  throw err;
						} else {
							if(!_.isEmpty(results) && results.length > 0) {
								res.header('Content-Type', 'application/json');
								if(results.length > 1) {
									res.send('[{"2.16.840.1.113883.3.275":"MULTIPLE"}]', 200);
								} else {
									res.send('[{"2.16.840.1.113883.3.275":"' + results[0].AUN + '"}]', 200);
								}
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

/*
* Router - For PIX
*
* Created by Julian Jewel
*/
var app = module.parent.exports.app,
    config = module.parent.exports.config;
var _ = require('underscore')
var retry = require('retry')
var fs = require('fs')
var Log = require('vcommons').log;
var logger = Log.getLogger('PIX_ROUTER', config.log);
	
// NOTE: loading into global space - to avoid asynch, efficiency problem if loading within createJsonFeed()
logger.trace('Loading file', config.templates.identifierTemplate);
var identifierDoc = fs.readFileSync(config.templates.identifierTemplate);

module.exports = exports = function (pool) {
    return {
        getCorrespondingIds: function (req, res, next) {
			logger.trace('Querying for identifier', req.params.identifier);
			if(!_.isUndefined(req.params.identifier)) {
				logger.trace('Acquiring Connection from Pool', ' Name:' + pool.getName(), ' Size:' + pool.getPoolSize(), ' Available:' + pool.availableObjectsCount(), ' Waiting:' + pool.waitingClientsCount());
				var operation = retry.operation(config.db.retry);
				operation.attempt(function (currentAttempt) {
					pool.acquire(function(err, db) {
						
						if (operation.retry(err)) {
							logger.error('Retry to get pool failed with error:', err, 'Attempt:', currentAttempt);
							pool.destroy(db);
							return;
						}
					
						if (err) {
							logger.error('Cound not acquire connection from pool', err);
							res.write(500, err);
							res.send();
							return;
						}
						logger.trace('Executing Query ' , config.stmt.aun, ' with identifier ' + req.params.identifier);
						db.execute(config.stmt.aun, [req.params.identifier], function(err, results) {
							if (operation.retry(err)) {
								logger.error('Retry to get db failed with error:', err, 'Attempt:', currentAttempt);
								pool.destroy(db);
								return;
							}

							// TODO: Include getCorrespondingIds from MVI
							logger.trace('Results from DB: ' + results);
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
									clientIdentifierArray[0] = JSON.parse( '{"nc:IdentificationID":"' + identifier + '", "vler:AssigningAuthority":"' + config.oids.aun + '" }');
									result['identifier:Identifier']['identifier:CommonData']['vler:Client']['vler:ClientIdentifier'] = clientIdentifierArray;
									res.send(result, 200);
								} else {
									var result = JSON.parse(identifierDoc);
									logger.trace('Sending Result: ' + result);
									res.send(result, 200);
								}
							}
							logger.trace('Releasing connection back to pool');
							// Release connection to the pool
							pool.release(db);
						});
					});
				});
			} else {
				logger.error("Recieved request with no identifier");
				res.write(500, "Identifier needs to be present in the URL /2.16.840.1.113883.4.1/:identifier - Ex: /2.16.840.1.113883.4.1/1234567, ");
				res.send();
			}
		}
    }

}
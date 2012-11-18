voter
=====
_It has been said that democracy is the worst form of government except all the others that have been tried._ - Sir Winston Churchill

Voting is one of core foundations of democracy. Big societies needs big solutions. Small communities can get away with smaller tools. This is example of such application. Team needs to find out if git is better than svn or where to organize next Christmas Party? Post topic. Look for ideas and vote.

=====

## Installation

### I. Prerequisites and setup
1. npm install express
2. npm install jade
3. npm install supervisor
    supervisor -p sample.js
4. npm install -g node-inspector
5. npm install nano
6. Redis
 - Download
 - make
 - ./redis-server
 - npm install connect-redis
7. npm install connect-flash
8. couchdb config file changes: /usr/local/etc/couchdb/local.ini
[query_server_config]
reduce_limit = false

### II. Database
Instruction for dumping (exporting) and importing data in CouchDB. 
Note that example dump has necessary data for app functioning like map/reduce functions.
Note that default database used in all examples is named `ideas`. 

Start couchdb: couchdb. Default address and port binding: localhost: 5984. It's fine.

Preparing dump file (only if you have data already - skip during installation):
curl -X GET http://127.0.0.1:5984/ideas/_all_docs?include_docs=true > dump.txt

Warning: To go the other way you can send a file to CouchDB with this command (the -H option is needed on OS X, may not be needed on other systems). Note that the format you get from a CouchDB dump cannot be simply plugged back into CouchDB, sadly.

Loading dump file:
curl -d @dump.txt -H “Content-type: application/json” -X POST http://127.0.0.1:5984/ideas/_bulk_docs

### III. Configuration
See app/config/server.js

Configuration will be extended and described in short time manner.

### IV. Running server
1. Fire your favorite shell.
2. couchdb
3. redis-server
4. node app/app.js

App is listening on port 1337.

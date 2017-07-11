# node-db-init-sqlite3
Initialize/repair/manage sqlite3 databases based on a set of configuration files. Allows declaring tables and static entries
into those tables.

This is mostly designed to make building a project faster and easier, as you can make changes to the database very quickly,
and eliminates the change to screw up when building the database on new computers.
See the qualifications/limitations for details.

# How do I set this up?
There are two steps: building the database in your node project, and writing the database configuration to initialize it.

## Building the database in node.js
 * install using your package manager of choice
    * yarn: `$ yarn add node-db-init-sqlite3`
    * npm:  `$ npm install node-db-init-sqlite3`
 * Use code like this to build your database.
    ```javascript
    const dbinit = require('node-db-init-sqlite3')
    dbinit.initialize(
        DATABASE_PATH,          // File to save sqlite3 database to
        PATH_TO_CONFIGURATION,  // Configuration directory
        function(err, database){
          /* do something with the database */
        })
    ```
 
## Writing the configuration
 * The configuration is a directory containing several things:
    * A `tables.json` file.
    * For each table, a `TABLENAME.txt` file.
    
### The `table.json` file
 * Declare each table, and any static rows that table needs to have.
 * Example file:
    ```json
    [
      { "name": "clients" },
      { "name": "employees" },
      { "name": "titles",
        "staticRows": [
          { "id": 1, "title": "bossman" },
          { "id": 2, "title": "layman" }
         ]
      },
      { "name": "transactions" }
    ]
    ```
    * The name specifies the table name. The table declaration will be loaded from a file in the same directory with the name `NAME.txt`
    * Each key/pair in `staticRows` are the rowname: value pairs that the row must have within the database.
       * The key **must** be a String, and will be used literally **without escaping**.
       * The value will be properly escaped, and can be any valid json raw.
    * Tables are checked, then any missing tables are created in order of declaration within this file. Static rows are created after the table they are in is created.

### The table declaration files
 * Each file is purely the SQL statement to construct your table.
 * An example file might look like
 ```sql
 CREATE TABLE computers (
   id   INTEGER,
   ip   VARCHAR[255]  NOT NULL,
   port INTEGER       NOT NULL,
   PRIMARY KEY  (id)
 );
 ```

# Qualifications / Limitations
 * it **can**...
    * Check for missing tables and add them
    * Check for missing static rows within tables and add them
 * it **cannot**...
    * Detect/change the schema of existing tables
    * It will not delete entries that conflict with declared static rows (it will, however, fail and crash)
    * Delete anything at all
 
# How does it work?
 * Triple nested sequence pattern. It's a little hard to follow.


# How do I contribute?
 * fork -> pull request
 * follow npm-standard formatting guidelines
 * document what you fixed/added
 * wait till I get a look at it

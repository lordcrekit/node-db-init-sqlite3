/**
 * Copyright 2017 Michigan State University
 * Distributed under the terms of the GNU General Public License (LGPL)
 *
 * @author William A. Norman <norman.william.dev@gmail.com>
 */

// Libraries
const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const seriesPattern = require('node-paternal').seriesPattern

var messageListeners = []

/**
 * Add a new listener to the message listeners. They will be fed messages
 * relating to database initialization.
 *
 * @param listener
 *          The new listener. Will be called with listener(message).
 */
const addListener = function (listener) { messageListeners.push(listener) }

/**
 * Initialize the database.
 *
 * @param cb
 *          The callback function, called with cb(error) after database
 *          initialization is complete.
 * @param dbFile
 *          The file that the sqlite3 database will be saved to/loaded from.
 * @param configDir
 *          The configuration directory, where files defining the database are
 *          saved.
 */
const init = function (dbFile, configDir, cb) {
  report('Initializing database...')
  var db = new sqlite3.Database('./.database')

  /**
   *
   */
  const initTable = function(name, cb) {
    fs.readFile(
      configDir + '/' + name + '.txt',
      'ascii',
      function(err, data) {
        if (err) { throw err; }
        report('\tCreating table ' + name)
        db.run(data, function(err1) {
          if (err1) { throw err1; }
          return cb()
        })
      })
  }

  /**
   *
   */
  const initRow = function(name, specs, cb) {
    report('\tCreating table ' + name 
                + ', row ' + JSON.stringify(specs))
    let query = 'INSERT INTO ' + name + '('
    let and = false
    let variables = []
    let appendix = '('
    for (key in specs) {
      if (and) {query += ','; appendix += ',';} else {and=true}
      query += key
      appendix += '?'
      variables.push(specs[key])
    }
    query += ') VALUES ' + appendix + ');'

    db.run(query, variables, function() {cb();})
  }

  let neededTables = require(configDir + '/tables')

  db.serialize(function () {
    db.all(
      'select name from sqlite_master where type=\'table\'',
      function (err, existingTables) {
        // existingTables is in the form of
        //    [<name: 'STRING'>  <'name': 'STRING'>]
        if (err) { throw err; }

        existingTables = existingTables.map(function(i) { return i.name })

        let finderFunctions = []
        let functions = []
        for (let i = 0; i < neededTables.length; i++) {
          let table = neededTables[i]

          if (existingTables.indexOf(table.name) < 0) {
            // We need to create the whole table.
            // No need to generate finderfunctions. We can operate directly on
            //  the functions list. That's because we don't need any callbacks.
            report('\tQueuing table ' + table.name + ' for creation.')
            functions.push(function(cb) { initTable(table.name, cb); })
            if (table.staticRows) {
              for (let j = 0; j < table.staticRows.length; j++ ) {
                report('\tQueuing table ' + table.name
                            + ', row ' + JSON.stringify(table.staticRows[j])
                            + ' for creation.')
                functions.push(function(cb) { 
                  initRow(table.name, table.staticRows[j], cb)
                })
              }
            }

          } else if (table.staticRows) {
            // We need to check the static rows. Because this requires
            //  database searches, we need to create functions for series
            //  pattern to do this.
            for (let j = 0; j < table.staticRows.length; j++) {
              let staticRow = table.staticRows[j]
              finderFunctions.push(function(cb) {
                let query = 'SELECT * FROM ' + table.name + ' WHERE'
                let variables = []
                let and = false
                for (let key in staticRow) {
                  if (and) { query += ' AND'; } else { and = true; }
                  query += ' ' + key + ' = ?'
                  variables.push(staticRow[key])
                }
                db.all(query, variables, function(err, rows) {
                  if ( err ) { throw err; }
                  if ( rows.length <= 0 ) {
                    report('\tQueuing table ' + table.name
                              + ', row ' + JSON.stringify(staticRow))
                    functions.push(function(cb) {
                      initRow(table.name, staticRow, cb)
                    })
                  } 
                  cb()
                })
              })
            }
          }
        }

        seriesPattern(finderFunctions, function() {
          if (err) { cb(err); }
          seriesPattern(functions, function() {cb(null, db);})
        })
      })
  })

}

/**
 * Report to every listener a message.
 *
 * @param message
 *          The message to report to every listener.
 */
function report (message) {
  for (let i = 0; i < messageListeners.length; i++) {
    messageListeners[i](message)
  }
}

module.exports = {
  addMessageListener: addListener,
  initialize: init
}

/**
 * Created by igorgo on 23.05.2016.
 */

var sqlite3 = require("sqlite3").verbose();
var db;
debug = require('debug')('drink-and-smoke:db');
//var debugModule = require('debug');

function openDatabase() {
//    var debug = debugModule("db:openDatabase");
    db = new sqlite3.Database('../drink-and-smoke.db',function(err){
        if (err) debug(err);
        else {
            console.log("sdf");
            debug("Database is open");}
    });
}

exports.openDatabase = openDatabase;

exports.db = db;

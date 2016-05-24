/**
 * Created by igor-go on 23.05.2016.
 */
/**
 * TABLE: prodcodes
 * COLUMNS: [rowid, code, code_zed, name, included->prodcodes.rowid, ptype]
 */

var db = require("./db");
var debug = require('debug')('db:prodcodes');
var cache = require('../cache');

const ALCOHOL_TYPE = "A";
const TOBACCO_TYPE = "T";


function getProdCodes(type) {
    return new Promise(function (resolve, reject) {
        const SQL_SELECT = "SELECT rowid, code, name FROM prodcodes";
        const SQL_WHERE = "WHERE ptype = $ptype";
        const SQL_ORDER = "ORDER BY code";
        var cacheName = cache.PROD_CODES.ALL;
        var sql = [SQL_SELECT];
        var binds = {};
        switch (type.toUpperCase()) {
            case ALCOHOL_TYPE:
                cacheName = cache.PROD_CODES.ALCOHOL;
                sql.push(SQL_WHERE);
                binds = {$ptype: ALCOHOL_TYPE};
                break;
            case TOBACCO_TYPE:
                cacheName = cache.PROD_CODES.TOBACCO;
                sql.push(SQL_WHERE);
                binds = {$ptype: TOBACCO_TYPE};
                break;
        }
        sql.push(SQL_ORDER);
        debug("Querying codes for %s", cacheName);
        db.allCache(cacheName, sql.join(" "), binds)
            .then(resolve)
            .catch(reject);
    })
}

module.exports.getProdCodes = getProdCodes;
module.exports.ALCOHOL_TYPE = ALCOHOL_TYPE;
module.exports.TOBACCO_TYPE = TOBACCO_TYPE;



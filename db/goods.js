/**
 * Created by igor-go on 24.05.2016.
 */
/**
 * TABLE: goods
 * COLUMNS: [rowid, name, volume, prodtype->prodcodes.rowid]
 */
var db = require("./db");
var debug = require('debug')('db:goods');
var prodCodes = require("./prodcodes");
var cache = require('../cache');


function getGoods (type) {
    const SQL_SELECT = "SELECT g.name, g.volume, g.prodtype, p.code as prodcode, p.name as prodname";
    const SQL_FROM = "FROM goods g INNER JOIN prodcodes p ON g.prodtype = p.rowid";
    const SQL_WHERE = "WHERE p.ptype = $type";
    const SQL_ORDER = "ORDER BY g.name, g.volume";
    var sql = [SQL_SELECT, SQL_FROM],
        binds = {},
        cacheName = cashe.GOODS.ALL;
    switch (type) {
        case prodCodes.ALCOHOL_TYPE :
            sql.push(SQL_WHERE);
            binds = {$type: prodCodes.ALCOHOL_TYPE};
            cacheName = cashe.GOODS.ALCOHOL;
            break;
        case prodCodes.TOBACCO_TYPE :
            sql.push(SQL_WHERE);
            binds = {$type: prodCodes.TOBACCO_TYPE};
            cacheName = cashe.GOODS.TOBACCO;
            break;
    }
    sql.push(SQL_ORDER);
    return new Promise(function (resolve, reject) {
        debug("Querying codes for alcohol");
        db.allCache(cacheName, sql.join(" "), binds)
            .then(resolve)
            .catch(reject);
    });
}
module.exports.getGoods = getGoods;

function addGood (name,volume,ptype) {
    return new Promise(function (resolve, reject) {
        debug("Adding a new good (NAME: %s, VOLUME: %s, type: %d", name, volume, ptype);
        // todo: добавление товара
    });
}

module.exports.addGood = addGood;

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

/**
 * Список товаров по категории продукта
 * @param type
 * @returns {Promise}
 */
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

/**
 * Добавление товара
 * @param name
 * @param volume
 * @param ptype
 * @returns {Promise}
 */
function addGood (name,volume,ptype) {
    return new Promise(function (resolve, reject) {
        debug("Adding a new good (NAME: %s, VOLUME: %s, type: %d", name, volume, ptype);
        db.run(
            "INSERT INTO goods (name, volume, prodtype) VALUES ($name,$volume,$ptype)",
            {
                $name: name,
                $volume: volume,
                $ptype: ptype
            },
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

/**
 * Исправление товара
 * @param name
 * @param volume
 * @param ptype
 * @param id
 * @returns {Promise}
 */
function modifyGood (name,volume,ptype,id) {
    return new Promise(function (resolve, reject) {
        debug("Modifying good (ID:%d, NAME: %s, VOLUME: %s, type: %d", id, name, volume, ptype);
        db.run(
            "UPDATE goods SET name=$name, volume=$volume, prodtype=$prodtype WHERE rowid=$id",
            {
                $name: name,
                $volume: volume,
                $ptype: ptype,
                $id:id
            },
            function (err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

module.exports.getGoods = getGoods;
module.exports.addGood = addGood;
module.exports.modifyGood = modifyGood;

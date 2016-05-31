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
const SQL_GET_SELECT = "SELECT g.rowid as id, g.name, g.volume, g.prodtype, coalesce(p.subcode,p.code) as prodcode, p.name as prodname";
const SQL_GET_FROM = "FROM goods g INNER JOIN prodcodes p ON g.prodtype = p.rowid";

/**
 * @typedef {Object} GoodRow
 * @property {Number} id
 * @property {String} name
 * @property {Number} volume
 * @property {Number} prodtype
 * @property {String} prodcode
 * @property {String} prodname
 */

/**
 * Список товаров по категории продукта
 * @param {String} type
 * @returns {Promise<GoodRow[]>}
 */
function getGoods (type) {
    const SQL_WHERE = "WHERE p.ptype = $type";
    const SQL_ORDER = "ORDER BY g.name, g.volume";
    var sql = [SQL_GET_SELECT, SQL_GET_FROM],
        binds = {},
        cacheName = cache.GOODS.ALL;
    switch (type) {
        case prodCodes.ALCOHOL_TYPE :
            sql.push(SQL_WHERE);
            binds = {$type: prodCodes.ALCOHOL_TYPE};
            cacheName = cache.GOODS.ALCOHOL;
            break;
        case prodCodes.TOBACCO_TYPE :
            sql.push(SQL_WHERE);
            binds = {$type: prodCodes.TOBACCO_TYPE};
            cacheName = cache.GOODS.TOBACCO;
            break;
    }
    sql.push(SQL_ORDER);
    return new Promise(function (resolve, reject) {
        debug("Querying goods");
        db.allCache(cacheName, sql.join(" "), binds)
            .then(resolve)
            .catch(reject);
    });
}

/**
 * Считывание товара по id
 * @param id
 * @returns {Promise<GoodRow>}
 */
function getGood (id) {
    return new Promise(function (resolve, reject) {
        const SQL_WHERE = "WHERE g.rowid = $id";
        db.get([SQL_GET_FROM,SQL_GET_FROM,SQL_WHERE].join(" "),{$id:id},function(err,row){
            if (err) reject(err);
            resolve(row);
        });
    });
}

/**
 * Добавление товара
 * @param name
 * @param volume
 * @param ptype
 * @returns {Promise<GoodRow>}
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
                else {
                    var newId = this.lastID;
                    cache.clearGoods()
                        .then(function(){
                            return getGood(newId);
                        })
                        .then(resolve)
                        .catch(reject);
                }
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
                else cache.clearGoods()
                    .then(resolve)
                    .catch(reject);
            }
        );
    });
}

module.exports.getGoods = getGoods;
module.exports.addGood = addGood;
module.exports.modifyGood = modifyGood;

/**
 * Created by igorgo on 23.05.2016.
 */

var sqlite3 = require("sqlite3").verbose();
var debug = require('debug')('db:db');
var cache = require("../cache").cache;

var db = new sqlite3.Database('./drink-and-smoke.db', function (err) {
    if (err) debug("Error: " + err);
    else debug("Database is open");
});


/**
 * Выполнение запроса с проверкой кэша и сохранением в кэш
 * @param key
 * @param sql
 * @param binds
 * @returns {Promise<[Object]>}
 */
db.allCache = function (key,sql,binds) {
    return new Promise(function (resolve, reject) {
        cache.get(key, function (err, value) {
            if (!err) {
                if(value == undefined){
                    debug("Cache is empty. Getting %s from DB...", key);
                    db.all(sql,binds,function(e,r){
                        if (!e) {
                            debug("%s is cached.",key);
                            cache.set(key, r, function (err, success) {
                                if (err) reject(err);
                                else resolve(r);
                            });
                        } else reject(e);
                    })
                }else{
                    debug("%s returned from cache.",key);
                    resolve(value);
                }
            } else reject(err);
        });
    });
};

/**
 * База данных
 * @type {sqlite3.Database}
 */
module.exports = db;

/**
 * Created by igor-go on 23.05.2016.
 */
var NodeCache = require( "node-cache" );
var appCache = new NodeCache();

const PROD_CODES = {
    ALCOHOL: "AlcoholCodes",
    TOBACCO: "TobaccoCodes",
    ALL: "AllCodes"
};

const GOODS = {
    ALCOHOL: "AlcoholGoods",
    TOBACCO: "TobaccoGoods",
    ALL: "AllGoods"
};

/**
 * Очистка кєшей товаров
 * @returns {Promise}
 */
function clearGoods () {
    return new Promise(function (resolve, reject) {
        appCache.del([
            GOODS.ALCOHOL,
            GOODS.TOBACCO,
            GOODS.ALL
        ], function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
}

module.exports.cache = appCache;
module.exports.PROD_CODES = PROD_CODES;
module.exports.GOODS = GOODS;
module.exports.clearGoods = clearGoods;




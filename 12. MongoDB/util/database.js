const mongodb = require("mongodb");

const MongoClient = mongodb.MongoClient;

let _db;

const mongoConnect = (callback) => {
  MongoClient.connect(
    "mongodb+srv://mash:openmongodb@shop.z8tkg.mongodb.net/shop?retryWrites=true&w=majority&appName=Shop"
  )
    .then((client) => {
      console.log("Connected MongoDB!");
      _db = client.db()
      callback();
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

const getDb = () => {
  if(_db){
    return _db;
  }
  throw 'No Database Found!';
}

exports.mongoConnect = mongoConnect;
exports.getDb = getDb;
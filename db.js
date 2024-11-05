const { MongoClient } = require("mongodb");

const url = "mongodb://127.0.0.1:27017";
const client = new MongoClient(url);

exports.connectDB = (dbName) => {
  return new Promise(async (resolve, reject) => {
    try {
      await client.connect();
      console.log("[+] DB connected");
      console.log("[+] DB Name", dbName);
      const db = client.db(dbName);
      resolve(db);
    } catch (error) {
      console.log("[-] DB connection err ", error);
      resolve(null);
    }
  });
};

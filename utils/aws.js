require("dotenv").config();
const AWS = require("aws-sdk");
const config = require("../config");

// AWS S3 configuration
const s3 = new AWS.S3({
  accessKeyId: config.AWS_ACCESS_KEY,
  secretAccessKey: config.AWS_SECRET_KEY,
  region: config.AWS_REGION,
});

// delete user image from S3 bucket
const deleteFromS3 = (params) => {
  return new Promise((resolve, reject) => {
    /* const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    }; */
    s3.deleteObject(params, (err, data) => {
      if (err) {
        console.log(`[-] Error deleting ${params.Key} form AWS S3`);
        reject(err);
      } else {
        console.log(`[+] ${params.Key} Image  deleted  `);
        resolve(`${params.Key} deleted`);
      }
    });
  }).catch((err) => {
    console.log("[-] AWS err: ", err);
    return null;
  });
};

// upload files/imageson S3 bucket
const uploadOnS3bucket = (params) => {
  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) reject(err);
      else return resolve(data);
    });
  }).catch((err) => {
    console.log("[-] AWS err: ", err);
    return null;
  });
};

module.exports = {
  uploadOnS3bucket,
  deleteFromS3,
};

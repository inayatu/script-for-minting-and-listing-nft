require("dotenv").config();

module.exports = {
  RPC_URI_ETH: process.env.RPC_URI_ETH,
  RPC_URI_BSC: process.env.RPC_URI_BSC,
  AWS_REGION: process.AWS_REGION,
  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
  AWS_SECRET_KEY: process.env.AWS_SECRET_KEY,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  METAMASK_ADDRESS: process.env.METAMASK_ADDRESS,
  METAMASK_PRIVATE_KEY: process.env.METAMASK_PRIVATE_KEY,
};



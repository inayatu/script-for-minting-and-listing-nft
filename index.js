require("dotenv").config();
const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");
const ObjectId = require("mongodb").ObjectId;

const { uploadOnS3bucket } = require("./utils/aws");
const { readFile } = require("./utils/index");
const {
  mintNFT,
  ListNFT,
  getOwnerOfToken,
  pendingOrder,
  approveNft,
} = require("./blockchain/web3");

const { METAMASK_ADDRESS, AWS_S3_BUCKET } = require("./config");

console.log("[*] Running script with WALLET: ", METAMASK_ADDRESS);

const markeplaceID = "628cbab1304a41723e85f0c9";
const dbName = "nfts-" + Date.now();
const assetCollectionName = "assets";
const assetEventCollectionName = "assetEvents";
let assetColl = null;
let assetEventColl = null;

const networkDetail = {
  chain_id: 97,
  name: "bnb",
  currency: "bnb",
};

const createAssetEvent = async (collection, data) => {
  try {
    data["transactionHash"] = data.transaction.transactionHash;
    data["blockHash"] = data.transaction.blockHash;
    delete data.transaction;
    await collection.insertOne(data);
  } catch (error) {
    console.log("[-] Err in assetEvent creation");
  }
};

const dumpCsvDataInDB = async () => {
  const db = await require("./db").connectDB(dbName);
  if (!db) return;
  assetColl = db.collection(assetCollectionName);

  fs.createReadStream("./csv/1.csv")
    .pipe(csvParser())
    .on("data", async (row) => {
      if (row.Name == "") return;

      // Create asset/nft object as per your csv data
      const asset = {
        network: networkDetail, 
        park: {
          assets: [],
        },
        token_category: {
          position: {
            x: 0,
            y: 0,
            z: 0,
          },
          rotation: {
            x: 0,
            y: 0,
            z: 0,
          },

          attractionId: 0,
          currentLevel: 0,
          currentValue: 0,
          NextUpgradeUnlockValue: 0,
          NextUpgradeUnlock: 0,
          currentHealth: 0,
          rating: 0,
          NoOfTaskPerform: 0,
          NoOfTickets: 0,
          employeeCurrentLevel: 0,
          CurrentLevelTaskPeform: 0,
          prefabId: parseInt(row.Prefab_id),
          employeeType: null,
          salary: 0,
          categoryType: row.Category,
        },
        attributes: [],
        receipt: [],
        tags: [],
        points: 0,
        is_placed: false,
        status: "created",
        approved_for_marketplace: false,
        listing_status: "nonlisted",
        num_sales: 0,
        in_bundle: false,
        in_lootbox: false,
        is_nft: true,
        is_park: false,
        sell_type: "fixed_price",
        name: row.Name,
        description:
          row.Name +
          " - " +
          "lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum ",
        price: row.Price || 0.00001,
        owner: METAMASK_ADDRESS,
        creator: METAMASK_ADDRESS,
        token_id: Math.floor(Math.random() * 2342344 + Date.now()),
        order_id: Math.floor(Math.random() * 2324335 + Date.now()),
        marketPlace: ObjectId(markeplaceID),
        updated_at: new Date(),
        created_at: new Date(),
      };

      // For Park Asset
      if (row.Category === "park" && row.Park_terrain !== "") {
        asset["park"] = {
          assets: [],
          employee: [],
          revenue: 0,
          rating: 0,
          ranking: 0,
          totalPeepsVisited: 0,
          totalRating: 0,
          rateCount: 0,
          peepPerHour: 0,
          dollarPerHour: 0,
          totalTimePassed: 0,
          terrain: row.Park_terrain || "sm_desert",
        };
        asset["is_park"] = true;
      }

      // Current health based on Category
      if (asset.token_category.categoryType === "shop") {
        asset.token_category.currentHealth = 100;
      } else if (
        asset.token_category.categoryType === "coaster" ||
        asset.token_category.categoryType === "ride"
      ) {
        asset.token_category.currentHealth = 500;
      }

      // Upload image on s3
      console.log("[*] Uploading image on AWS S3");
      const imageContent = await readFile(
        path.resolve(__dirname + `/nfts/images/${row.Image_No}.png`)
      );
      const s3Params = {
        Bucket: AWS_S3_BUCKET,
        Key: `rc/nfts/${Date.now()}-${row.Image_No}.png`,
        Body: imageContent,
      };
      const s3Uploaded = await uploadOnS3bucket(s3Params);
      if (!s3Uploaded) return;
      asset["resource_url"] = s3Uploaded.Location;
      asset["thumbnail_sm"] = s3Uploaded.Location;
      console.log("[*] Uploaded image on S3");

      const copies = parseInt(row.No_of_copies);
      const assets = [];
      for (let i = 0; i < copies; i++) {
        assets.push({
          ...asset,
          ...{
            token_id: Math.floor(Math.random() * 2342344 + Date.now()),
            order_id: Math.floor(Math.random() * 2324335 + Date.now()),
          },
        });
      }
      console.log(assets);

      assetColl.insertMany(assets);
    })
    .on("end", (data) => {
      console.log(
        `[*] All data from csv has been dumped to MongoDB - ${dbName}`
      );
    })
    .on("err", (err) => {
      console.log(`[-] err while dumping data to DB ${dbName} :`, err);
    });
};

const mintAndListAsset = async (dbName) => {
  const db = await require("./db").connectDB(dbName);
  if (!db) return;
  assetColl = db.collection(assetCollectionName);
  assetEventColl = db.collection(assetEventCollectionName);

  let asset = null;
  let counter = 0;
  do {
    try {
      asset = await assetColl.findOne({ listing_status: "nonlisted" });
      if (!asset) {
        console.log("[-] No more asset found");
        break;
      }

      counter++;
      // Mint the token
      console.log("[*] Minting started " + asset._id);
      const owner = await getOwnerOfToken(asset.token_id);
      if (owner && owner.toLowerCase() === METAMASK_ADDRESS.toLowerCase()) {
        await assetColl.updateOne(
          { _id: asset._id },
          { $set: { status: "minted", owner: owner, creator: owner } }
        );
      } else if (
        owner &&
        owner.toLowerCase() !== METAMASK_ADDRESS.toLowerCase()
      ) {
        await assetColl.updateOne(
          { _id: asset._id },
          { $set: { status: "minted", owner: owner, creator: owner } }
        );

        // Add Order won't work so skip this iteration
        continue;
      } else {
        const minTxnDetail = await mintNFT(asset.token_id);
        if (!minTxnDetail) {
          // skip the later steps if minting failed
          continue;
        }
        await assetColl.updateOne(
          { _id: asset._id },
          { $set: { status: "minted", owner: owner, creator: owner } }
        );

        // Create AssetEvent
        let assetEvent = {
          updated_at: new Date(),
          created_at: new Date(),
          is_bundle_transaction: false,
          event_type: "mint",
          network: networkDetail,
          asset_id: ObjectId(asset._id),
          from_account: minTxnDetail.from,
          to_account: minTxnDetail.to,
          transaction: minTxnDetail,
        };
        createAssetEvent(assetEventColl, assetEvent);
      }

      console.log("[*] Mint success");

      // 1. First approve the Contracts(Auction/Fixed-Price) for listing this token
      if (!asset.approved_for_marketplace) {
        const approvedTxn = await approveNft(asset.token_id);
        if (!approveNft) continue;
        await assetColl.updateOne(
          { _id: asset._id },
          { $set: { approved_for_marketplace: true } }
        );
        // Create AssetEvent
        assetEvent = {
          updated_at: new Date(),
          created_at: new Date(),
          is_bundle_transaction: false,
          event_type: "approve",
          network: networkDetail,
          order_id: asset.order_id,
          asset_id: ObjectId(asset._id),
          from_account: approvedTxn.from,
          to_account: approvedTxn.to,
          transaction: approvedTxn,
        };
        createAssetEvent(assetEventColl, assetEvent);
      }

      // List the token
      console.log("[*] BC listing started");
      const listTxh = await ListNFT(asset.token_id, asset.order_id);
      if (!listTxh) continue;

      await assetColl.updateOne(
        { _id: asset._id },
        { $set: { listing_status: "listed", owner: owner, creator: owner } }
      );
      console.log("[*] BC list success");

      // Create AssetEvent
      assetEvent = {
        updated_at: new Date(),
        created_at: new Date(),
        is_bundle_transaction: false,
        event_type: "addorder",
        network: networkDetail,
        order_id: asset.order_id,
        asset_id: ObjectId(asset._id),
        from_account: listTxh.from,
        to_account: listTxh.to,
        transaction: listTxh,
      };
      createAssetEvent(assetEventColl, assetEvent);
    } catch (error) {
      console.log("[-] err in mint or addOrder ");
    }
  } while (asset);

  console.log(`[*] Hurray ${counter} NFTs have been minted and listed`);
  process.exit(1);
};

const checkListedOrder = async (dbName) => {
  const db = await require("./db").connectDB(dbName);
  if (!db) return;
  assetColl = db.collection(assetCollectionName);
  let counter = 0;
  let asset = null;
  do {
    try {
      counter++;
      asset = await assetColl.findOne({ owner: null });
      if (!asset) {
        console.log("[-] No more asset found");
        continue;
      }
      const orderOwner = await pendingOrder(asset.order_id);
      if (orderOwner.seller !== "0x0000000000000000000000000000000000000000") {
        await assetColl.updateOne(
          { _id: asset._id },
          { $set: { owner: orderOwner.seller, creator: orderOwner.seller } }
        );
      }
      console.log("[*] Updated ", counter);
    } catch (error) {
      console.log("[-] error ", error);
    }
  } while (asset);
  console.log("[*] done ");
};

// dumpCsvDataInDB();
mintAndListAsset("nfts-1730555905509");
// checkListedOrder("rc-nfts-1730555905509");

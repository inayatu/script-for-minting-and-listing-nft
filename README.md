# Script to Auto Mint, Approve & List NFT

## First of all get ready with the Data storage

1. Read CSV File - // `dumpCsvDataInDB();` uncomment this line in index.js
2. Create Asset Object `{name,description,price,token_id, order_id}`
3. Upload respective image on S3 (both large & small)
4. Update asset object with s3 object links

## Minting and Listing

1. fetch one record at a time from DB - // Uncomment `mintAndListAsset("data_name");`
2. mint nft
3. update nft status to `'minted'` in DB and store event detail in assetEvents 
4. approve the fixedPrice/Auction Contract to list the NFT
5. updated nft `'approved_for_marketplace=true'` and store event detail in assetEvents 
6. list nft through fixedPrice/Auction Contract
7. update `'listing_status=listed'` in DB and store event detail in assetEvents


## Create following folder and place files 
1. `blockchain/contract.js`
Place the contracts against their network in `contract.js` like the following:
```
{
    bsc: {
        nftContract:{
            address: 0x333,
            abi: []
        },
        fixedPriceContract: {
            address: 0x23322,
            abi: []
        }
    }
}
```

2. Place `.csv` file in the csv folder
3. Place nft images in `nft/images` folder. Name the images in series as per `csv` row number i.e. row one nft image will have name as `1.png`, for row two `2.png` and so on.
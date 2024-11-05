require("dotenv").config();
const { Web3 } = require("web3");
const Tx = require("ethereumjs-tx").Transaction;
const Contract = require("../blockchain/contracts");

const {
  METAMASK_ADDRESS,
  METAMASK_PRIVATE_KEY,
  RPC_URI_BSC,
} = require("../config");
const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URI_BSC));


// Contract network
const contractNetwork = "bsc";

// initialize NFT contract
const nftContract = new web3.eth.Contract(
  Contract[contractNetwork].nft.abi,
  Contract[contractNetwork].nft.address
);

// initialize Fixed Price contract
const fixedPriceContract = new web3.eth.Contract(
  Contract[contractNetwork].fixedPrice.abi,
  Contract[contractNetwork].fixedPrice.address
);

// Mint Specific Token
async function mintNFT(tokenId) {
  try {
    const balance = await web3.eth.getBalance(METAMASK_ADDRESS);
    console.log(web3.utils.fromWei(balance, "ether"));

    const tx = nftContract.methods.mint(
      METAMASK_ADDRESS,
      tokenId,
      "https://rc-v1.vorbit.org", // uri
      "RC Game -token" // payload
    );
    const gas = await tx.estimateGas({ from: METAMASK_ADDRESS });
    const gasPrice = await web3.eth.getGasPrice(); // Fetch the current gas price
    const data = tx.encodeABI();
    const txData = {
      from: METAMASK_ADDRESS,
      to: Contract[contractNetwork].nft.address,
      data,
      gas,
      gasPrice, // Add gasPrice
    };

    const signedTx = await web3.eth.accounts.signTransaction(
      txData,
      METAMASK_PRIVATE_KEY
    );
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );
    console.log("[*] Token minted:", receipt);
    return receipt;
  } catch (error) {
    console.log("[-] Minting failed", error?.reason);
    return null;
  }
}

async function transferFromData(to_Address, tokenId) {
  // Transfer NFT token to user or rewarded nft
  const myData = await nftContract.methods
    .transferFrom(METAMASK_ADDRESS, to_Address, tokenId)
    .encodeABI();

  web3.eth.getTransactionCount(METAMASK_ADDRESS, async (err, txCount) => {
    if (err) {
      console.log("[-] Transfer failed", err);
      return null;
    }

    // Build the transaction
    const txObject = {
      nonce: web3.utils.toHex(txCount),
      to: Contract[2].address, // ?
      value: web3.utils.toHex(web3.utils.toWei("0", "ether")),
      gasLimit: web3.utils.toHex(2100000),
      gasPrice: web3.utils.toHex(web3.utils.toWei("6", "gwei")),
      data: myData,
    };
    const tx = new Tx(txObject, { chain: "rinkeby" });
    let privateKey1 = Buffer.from(METAMASK_PRIVATE_KEY, "hex");
    tx.sign(privateKey1);

    const serializedTx = tx.serialize();
    const raw = "0x" + serializedTx.toString("hex");
    // Broadcast the transaction
    const transaction = await web3.eth.sendSignedTransaction(raw);
    console.log("Trx ", transaction);
    return transaction;
  });
}

async function ListNFT(tokenId, orderId) {
  try {
    const balance = await web3.eth.getBalance(METAMASK_ADDRESS);
    console.log(web3.utils.fromWei(balance, "ether"));

    const tx = fixedPriceContract.methods.addOrder(
      Contract[contractNetwork].nft.address, // NFT address
      tokenId,
      10000000,
      orderId,
      200,
      "bnb"
    );
    const gas = await tx.estimateGas({ from: METAMASK_ADDRESS });
    const gasPrice = await web3.eth.getGasPrice(); // Fetch the current gas price
    const data = tx.encodeABI();
    const txData = {
      from: METAMASK_ADDRESS,
      to: Contract[contractNetwork].fixedPrice.address,
      data,
      gas,
      gasPrice, // Add gasPrice
    };
    const signedTx = await web3.eth.accounts.signTransaction(
      txData,
      METAMASK_PRIVATE_KEY
    );
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );
    console.log("[*] Token Listed", receipt);
    return receipt;
  } catch (error) {
    console.log("[-] Listing failed", error);
    return error;
  }
}

const getOwnerOfToken = async (tokenId) => {
  try {
    const owner = await nftContract.methods.ownerOf(tokenId).call();
    return owner;
  } catch (error) {
    return null;
  }
};

const pendingOrder = async (orderId) => {
  try {
    const order = await fixedPriceContract.methods
      .pendingOrders(orderId)
      .call();
    return order;
  } catch (error) {
    console.log(error);
    return null;
  }
};

async function approveNft(tokenId) {
  try {
    const balance = await web3.eth.getBalance(METAMASK_ADDRESS);
    console.log(web3.utils.fromWei(balance, "ether"));

    const fixedPriceContractAddress =
      Contract[contractNetwork].fixedPrice.address;
    const tx = nftContract.methods.approve(fixedPriceContractAddress, tokenId);
    const gas = await tx.estimateGas({ from: METAMASK_ADDRESS });
    const gasPrice = await web3.eth.getGasPrice(); // Fetch the current gas price
    const data = tx.encodeABI();
    const txData = {
      from: METAMASK_ADDRESS,
      to: Contract[contractNetwork].nft.address,
      data,
      gas,
      gasPrice, // Add gasPrice
    };

    const signedTx = await web3.eth.accounts.signTransaction(
      txData,
      METAMASK_PRIVATE_KEY
    );
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );
    console.log("[*] Token Approved on :", fixedPriceContractAddress);
    return receipt;
  } catch (error) {
    console.log("[-] Token Approval failed", error?.reason);
    return null;
  }
}

module.exports = {
  mintNFT,
  transferFromData,
  ListNFT,
  getOwnerOfToken,
  pendingOrder,
  approveNft,
};


require("dotenv").config();
const fs = require('fs');
const web3 = require("web3");
const { pretty } = require("pretty-bitte");
const ethers = require('ethers');
const web3_WSS = new web3(process.env.WSS_PROVIDER);
const web3_HTTPS = new web3(process.env.HTTPS_PROVIDER);
const { JsonRpcProvider } = require("@ethersproject/providers");
const provider = new JsonRpcProvider(process.env.HTTPS_PROVIDER);
let txCount;
const { address } = web3_HTTPS.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
const privKey = Buffer.from(process.env.PRIVATE_KEY, "hex");
const signer = new ethers.Wallet(privKey, provider);

//ABI
const routersABI = require("./abi/routers.json");
const pairsABI = require("./abi/pairs.json");
const factoriesABI = require("./abi/factories.json");
const tokenABI = require("./abi/abi_token.json");

//setting
const setting = require("./setting/setting.json");
let stop = false;

//Address
const dex_addresses = require("./setting/dex.json");
const pair_addresses = require("./setting/pairs.json");
const runBot = async () => {


  const factories = [];
  const routers = [];
  txCount = await web3_HTTPS.eth.getTransactionCount(address);
  txCount--;
  for (let i = 0; i < dex_addresses.length; i++) {//get factory and router contracts
    const factory = new web3_HTTPS.eth.Contract(
      factoriesABI[i],
      dex_addresses[i].factory
    );
    factories.push(factory);
    const router = new web3_HTTPS.eth.Contract(
      routersABI[i],
      dex_addresses[i].router
    );
    routers.push(router);
  }
  web3_WSS.eth.subscribe("newBlockHeaders")
  .on("data", async (event) => {
    for (let i = 0; i < pair_addresses.length; i++) {
      const pairs = [], pairs_address = [];
      for (let k = 0; k < factories.length; k++) {
        const tmp_pairs = [];
        const tmp_pairs_address = [];
        try {
          const address_tmp = await factories[k].methods.getPair(pair_addresses[i]['token0'], pair_addresses[i]['token1']).call();
          const pair = new ethers.Contract(address_tmp, pairsABI, signer);
          tmp_pairs.push(pair);
          tmp_pairs_address.push(address_tmp);
        } catch (err) {
          tmp_pairs.push(null);
          tmp_pairs_address.push('');
        }

        try {
          const address_tmp = await factories[k].methods.getPair(pair_addresses[i]['token1'], pair_addresses[i]['token2']).call();
          const pair = new ethers.Contract(address_tmp, pairsABI, signer);
          tmp_pairs.push(pair);
          tmp_pairs_address.push(address_tmp);
        } catch (err) {
          tmp_pairs.push(null);
          tmp_pairs_address.push('');
        }
        try {
          const address_tmp = await factories[k].methods.getPair(pair_addresses[i]['token2'], pair_addresses[i]['token0']).call();
          const pair = new ethers.Contract(address_tmp, pairsABI, signer);
          tmp_pairs.push(pair);
          tmp_pairs_address.push(address_tmp);
        } catch (err) {
          tmp_pairs.push(null);
          tmp_pairs_address.push('');
        }
        pairs.push(tmp_pairs);
        pairs_address.push(tmp_pairs_address);
      }
          let from_swap = 0;
          let from_swap_id;
          for (let k = 0; k < routers.length; k++) {
            try {
              // console.log(ethers.utils.parseUnits(setting['amount'].toString(10), pair_addresses[i]['decimal1']).toString());
              let amountIn = await routers[k].methods.getAmountsIn(ethers.utils.parseUnits(setting['amount'].toString(10), pair_addresses[i]['decimal1']).toString(), [pair_addresses[i]['token0'], pair_addresses[i]['token1']]).call();
              const tmp_amountIn = Number(
                ethers.utils.formatUnits(amountIn[0], pair_addresses[i].decimal0)
              );
              if (from_swap == 0) {
                from_swap = tmp_amountIn;
                from_swap_id = k;
              } else if (from_swap > tmp_amountIn) {
                from_swap = tmp_amountIn;
                from_swap_id = k;
              }
            } catch (err) {
              // console.log(err);
            }
          }
          let to_swap1 = 0;
          let to_swap_id1;
          for (let k = 0; k < routers.length; k++) {
            try {
              let amountOut = await routers[k].methods.getAmountsOut(ethers.utils.parseUnits(setting['amount'].toString(10), pair_addresses[i]['decimal1']).toString(), [pair_addresses[i]['token1'], pair_addresses[i]['token2']]).call();
              const tmp_amountOut = Number(
                ethers.utils.formatUnits(amountOut[1], pair_addresses[i].decimal2)
              );
              if (to_swap1 == 0) {
                to_swap1 = tmp_amountOut;
                to_swap_id1 = k;
              } else if (to_swap1 < tmp_amountOut) {
                to_swap1 = tmp_amountOut;
                to_swap_id1 = k;
              }
            } catch (err) {
            }
          }
          let to_swap2 = 0;
          let to_swap_id2;
          for (let k = 0; k < routers.length; k++) {
            try {
              let amountOut = await routers[k].methods.getAmountsOut(ethers.utils.parseUnits(String(to_swap1), pair_addresses[i]['decimal2']).toString(), [pair_addresses[i]['token2'], pair_addresses[i]['token0']]).call();
              const tmp_amountOut = Number(
                ethers.utils.formatUnits(amountOut[1], pair_addresses[i].decimal0)
              );
              if (to_swap2 == 0) {
                to_swap2 = tmp_amountOut;
                to_swap_id2 = k;
              } else if (to_swap2 < tmp_amountOut) {
                to_swap2 = tmp_amountOut;
                to_swap_id2 = k;
              }
            } catch (err) {
              console.log(err)
              // console.log('amountOut failed '+k);
            }
          }
          const arbitrage = to_swap2 - from_swap;
          console.log(arbitrage)
          // console.log(to_swap2,to_swap1,from_swap)
          if (to_swap2 != 0 && to_swap1 != 0 && from_swap != 0) {
            const shouldTrade = arbitrage >= setting['profit'];
            if (!shouldTrade) return;
            if(stop) return;
            stop = true;
            console.log("-------------------------------------------------------------------------------------------------------------------------------------");
            console.log(`Borrow ${pair_addresses[i].token1} Amount:`, setting['amount'] + ` from ${dex_addresses[from_swap_id].router}`);
            console.log(`swap ${pair_addresses[i].token1} Amount:`, setting['amount'] + ` to ${dex_addresses[to_swap_id1].router}`);
            console.log(`swap ${pair_addresses[i].token2} Amount:`, to_swap1 + ` to ${dex_addresses[to_swap_id2].router}`);
            console.log(`Got ${pair_addresses[i].token0} Amount:`, to_swap2-from_swap);
            console.log(`Expected profit : ` + arbitrage);
            console.log(`PROFITABLE? ${shouldTrade}`);
            const gasPrice = (await web3_HTTPS.eth.getGasPrice());

            txCount++;
            const token0 = await pairs[from_swap_id][0].token0();
            const tx = await pairs[from_swap_id][0].swap(
              token0 == pair_addresses[i].token0 ? 0 : ethers.utils.parseUnits(String(setting['amount']), pair_addresses[i].decimal1).toString(),
              0,
              process.env.FLASH_LOANER,
              ethers.utils.arrayify(dex_addresses[from_swap_id].router + dex_addresses[to_swap_id1].router.substring(2) + dex_addresses[to_swap_id2].router.substring(2)+
              pair_addresses[i].token0.substring(2)+pair_addresses[i].token1.substring(2)+pair_addresses[i].token2.substring(2)),
              {
                nonce:txCount,
                // gasLimit: web3_HTTPS.utils.toHex(500000),
                gasPrice: web3_HTTPS.utils.toHex(gasPrice),
                // to: pairs_address[from_swap_id]
              }
            );
            const txHash = tx.hash;
            console.log('hash',txHash);
            const receipt = await tx.wait();
            console.log(`|***********Buy Tx was mined in block: ${receipt.blockNumber}`);
            console.log("Approved DateTime:", Date());
            
          }
          else {
            // console.log('there is no pool')
          }
          console.log(ethers.utils.arrayify(dex_addresses[from_swap_id].router + dex_addresses[to_swap_id1].router.substring(2) + dex_addresses[to_swap_id2].router.substring(2)+
          pair_addresses[i].token0.substring(2)+pair_addresses[i].token1.substring(2)+pair_addresses[i].token2.substring(2)));
      
    }
  });
};
const writeAllPairs = async () => {
  const factories = [];
  for (let i = 0; i < dex_addresses.length; i++) {//get factory and router contracts
    const factory = new web3_HTTPS.eth.Contract(
      factoriesABI[i],
      dex_addresses[i].factory
    );
    factories.push(factory);
  }
  const factory = factories[0];
  const pairABI = pairsABI;
  const allPairsLength = await factory.methods.allPairsLength().call();
  const pairSearchDepth = allPairsLength;
  let tokenList = [];
  console.log('=====> Searching pairs')
  for(let i = 0 ; i < pairSearchDepth ; i++){
    const allPairs = await factory.methods.allPairs(i).call();
    const pairContract = new web3_HTTPS.eth.Contract(pairABI,allPairs);
    const token0 = await pairContract.methods.token0().call();
    const token1 = await pairContract.methods.token1().call();
    const pairExistInOtherDex = await checkPairExist(factories,token0,token1);
    printProgress(Math.floor(1000*i/pairSearchDepth)/10);
    if(pairExistInOtherDex==false) continue;
    const ob = {
      pairAddr:allPairs,
      token0:token0,
      token1:token1,
    };
    tokenList.push(ob);
  }
  fs.writeFile ("allpairs.json", JSON.stringify(tokenList), function(err) {
    if (err) throw err;
    console.log('\nended writing-pairs');
    }
  );
}
const findTriangle = async () => {
  const allpairs = require("./allpairs.json");
  //A-B,B-C,C-A
  let abc = [];
  for(let i = 0 ; i < allpairs.length; i++){
    const pairAB = allpairs[i];
    const pairBCList = findPair(allpairs,pairAB,[pairAB.pairAddr]);
    for(let bc = 0; bc< pairBCList.length; bc++){
      const pairBC = pairBCList[bc];
      if(pairAB.token0 == pairBC.token0){
        const a = pairAB.token1, b = pairAB.token0, c = pairBC.token1;
        const pairExist = checkIfPairExist(allpairs,{token0:a,token1:c});
        if(pairExist) abc.push({token0:a,token1:b,token2:c})
      }
      else if(pairAB.token0 == pairBC.token1){
        const a = pairAB.token1, b = pairAB.token0, c = pairBC.token0;
        const pairExist = checkIfPairExist(allpairs,{token0:a,token1:c});
        if(pairExist) abc.push({token0:a,token1:b,token2:c})
      }
      else if(pairAB.token1 == pairBC.token0){
        const a = pairAB.token0, b = pairAB.token1, c = pairBC.token1;
        const pairExist = checkIfPairExist(allpairs,{token0:a,token1:c});
        if(pairExist) abc.push({token0:a,token1:b,token2:c})
      }
      else if(pairAB.token1 == pairBC.token1){
        const a = pairAB.token0, b = pairAB.token1, c = pairBC.token0;
        const pairExist = checkIfPairExist(allpairs,{token0:a,token1:c});
        if(pairExist) abc.push({token0:a,token1:b,token2:c})
      }
    }
    for(let i = 0 ; i < abc.length; i++){
      const {token0,token1,token2} = abc[i];
      const decimal0 = await new web3_HTTPS.eth.Contract(tokenABI,token0).methods.decimals().call();
      const decimal1 = await new web3_HTTPS.eth.Contract(tokenABI,token1).methods.decimals().call();
      const decimal2 = await new web3_HTTPS.eth.Contract(tokenABI,token2).methods.decimals().call();
      abc[i] = {...abc[i],decimal0,decimal1,decimal2};
    }
  }
  fs.writeFile ("./setting/pairs.json", JSON.stringify(abc), function(err) {
    if (err) throw err;
    console.log('\nended writing-pairs');
    }
  );
}
const checkPairExist = async (factories,token0,token1) => {
  for(let i = 0; i < factories.length; i++){
    try{
      const pairAddress = await factories[i].methods.getPair(token0,token1).call();
      if(pairAddress == "0x0000000000000000000000000000000000000000") return false;
    }catch(e){
      return false;
    }
  }
  return true;
}
const findPair = (tokenList,pair,pairAddrList)=>{
  const pairs = [];
  for(let i =0 ; i < tokenList.length; i++){
    const {token0,token1,pairAddr} = tokenList[i];
    if(pairAddrList.indexOf(pairAddr)==-1 && (pair.token0 == token0 || pair.token0 == token1 || pair.token1 == token0 || pair.token1 == token1)) pairs.push(tokenList[i]);
  }
  return pairs;
}
const checkIfPairExist = (tokenList,pair)=>{
  for(let i =0 ; i < tokenList.length; i++){
    const {token0,token1} = tokenList[i];
    if((pair.token0 == token0 && pair.token1 == token1) || (pair.token0 == token1 && pair.token1 == token0)) return true;
  }
  return false;
}
function printProgress(progress){
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(`[===============> ${progress} % <================]`);
}

const command = process.argv.slice(2);
if(command.length==0){
  console.log("Bot started!");
  runBot();
}else{
  if(command[0]=='--write'){
    console.log("Writing all pairs")
    writeAllPairs();
  }
  else if(command[0]=='--generate'){
    console.log("Finding triangle")
    findTriangle();
  }
}

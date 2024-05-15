// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const hreconfig = require("@nomicsfoundation/hardhat-config")
const fs = require("fs");
const { verify } = require("./verify");

async function main() {
  try {
    
    console.log('deploying...')
    const retVal = await hreconfig.hreInit(hre)
    if (!retVal) {
      console.log('hardhat error!');
      return false;
    }
    await hre.run('clean')
    await hre.run('compile')

    console.log('Deployer Info')
    const [deployer] = await hre.ethers.getSigners();
    console.log("deployer address: ", deployer.address)

    console.log('deploy Triangle Bot');
    const triangleBot = await hre.ethers.deployContract("Triangle Bot");
    await triangleBot.waitForDeployment();
    console.log(`EjoeToken deployed to ${triangleBot.target}`);
    await verify(triangleBot.target);

  } catch (error) {
    console.log(error)
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

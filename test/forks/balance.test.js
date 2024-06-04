const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const IERC20_SOURCE = "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20";

let contract;
let owner;
let addressTest;
let addr1;
let addr2;
let addr3;
let provider;
let IERC20;
let contractUSDT;
let contractUSDC;
const weth = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const usdt = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const usdc = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const router = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

const printBalances = async () => {
  console.log(
    "Contract Native Balance",
    await provider.getBalance(contract.target)
  );
  console.log(
    "Contract USDT Balance",
    await contractUSDT.balanceOf(contract.target)
  );
  console.log(
    "Contract USDC Balance",
    await contractUSDC.balanceOf(contract.target)
  );
};

describe("Balance with No Liq", function () {
  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    addressTest = "0x693fb96fdda3c382fde7f43a622209c3dd028b98";
    await helpers.impersonateAccount(addressTest);
    const impersonatedSigner = await ethers.getSigner(addressTest);

    const ProBalanceNoLiq = await ethers.getContractFactory("ProBalanceNoLiq");
    //IERC20 = await ethers.getContractFactory("IERC20");
    contractUSDT = await ethers.getContractAt(
      IERC20_SOURCE,
      usdt,
      impersonatedSigner
    );
    contractUSDC = await ethers.getContractAt(
      IERC20_SOURCE,
      usdc,
      impersonatedSigner
    );
    provider = ethers.provider;

    console.log("balance", await provider.getBalance(addressTest));
    contract = await ProBalanceNoLiq.deploy(true, weth, usdt, usdc, router);

    console.log("address", contract.target);

    const tx = {
      to: owner,
      value: ethers.parseEther("10"),
    };

    const recieptTx = await impersonatedSigner.sendTransaction(tx);

    await recieptTx.wait();
  });

  it("can swap", async () => {
    console.log("balance", await provider.getBalance(owner));
    const balanceUSDT = await contractUSDT.balanceOf(addressTest);
    const balanceUSDC = await contractUSDC.balanceOf(addressTest);

    console.log("balanceUSDT", balanceUSDT);
    console.log("balanceUSDC", balanceUSDC);

    await contractUSDT.transfer(owner, 10000);

    const balanceUSDTOwner = await contractUSDT.balanceOf(owner);
    const balanceUSDCOwner = await contractUSDC.balanceOf(owner);

    console.log("balanceUSDTOwner", balanceUSDTOwner);
    console.log("balanceUSDCOwner", balanceUSDCOwner);

    await printBalances();
    await contract.addBalance({ value: "1000" });

    await printBalances();

    await contract.addBalanceWithSwap(usdt, 0, 3000, {
      value: "1000000000000000000",
    });

    console.log("completed addBalanceWithSwap");
    await printBalances();

    const contractUSDTOwner = await ethers.getContractAt(
      IERC20_SOURCE,
      usdt,
      owner
    );
    await contractUSDTOwner.approve(contract.target, 100000);
    await contract.addTokenBalance(usdt, 1000);

    await printBalances();

    await contract.addTokenBalanceWithSwap(usdt, usdc, 1000, 0, 3000);

    await printBalances();
  });
});

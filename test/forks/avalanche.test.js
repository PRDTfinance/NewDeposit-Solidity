const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const IERC20_SOURCE = "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20";

let contract;
let owner;
let addressTest = "0x704301A02c646d8bcD757F439b2a52a8e71c8B2e";
let addr1;
let addr2;
let addr3;
let provider;
let IERC20;
let contractUSDT;
let contractUSDC;
const weth = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
const usdt = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";
const usdc = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
const router = "0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE";

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

describe.only("Avax Balance with No Liq", function () {
  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

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
      value: ethers.parseEther("0.1"),
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

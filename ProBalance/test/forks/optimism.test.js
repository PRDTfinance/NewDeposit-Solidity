const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const IERC20_SOURCE = "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20";

let contract;
let owner;
let addressTest = "0xb37275558f02f05104c2ba35199d16adeb43432f";
let addr1;
let addr2;
let addr3;
let provider;
let IERC20;
let contractUSDT;
let contractUSDC;
const weth = "0x4200000000000000000000000000000000000006";
const usdt = "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58";
const usdc = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
const router = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";

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

describe("OPTIMISM Balance with No Liq", function () {
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
      value: ethers.parseEther("0.001"),
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

    await contractUSDC.transfer(owner, 1000000);

    const balanceUSDTOwner = await contractUSDT.balanceOf(owner);
    const balanceUSDCOwner = await contractUSDC.balanceOf(owner);

    console.log("balanceUSDTOwner", balanceUSDTOwner);
    console.log("balanceUSDCOwner", balanceUSDCOwner);

    await printBalances();
    await contract.addBalance({ value: "1000" });

    await printBalances();

    // await contract.addBalanceWithSwap(usdt, 0, 2500, {
    //   value: "1000000000000000000",
    // });

    // console.log("completed addBalanceWithSwap");
    // await printBalances();

    const contractUSDCOwner = await ethers.getContractAt(
      IERC20_SOURCE,
      usdc,
      owner
    );
    await contractUSDCOwner.approve(contract.target, 10000000);
    // await contract.addTokenBalance(usdc, 1000);

    // await printBalances();

    console.log("owner eth balance", await provider.getBalance(owner));
    await contract.addTokenBalanceWithSwap(usdc, usdt, 10000, 900);

    await printBalances();
  });
});

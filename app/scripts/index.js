import '../styles/style.css';
import '../../node_modules/toastr/build/toastr.css';

import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract';
import $ from 'jquery';
import * as toastr from 'toastr';

import { addlottery } from './component';

import ManagerArtifact from '../../build/contracts/Manager.json';
import MarkTwoArtifact from '../../build/contracts/MarkTwo.json';

const Manager = contract(ManagerArtifact);
const MarkTwo = contract(MarkTwoArtifact);

let account = '';
let password = '';
let managerInstance;
let lotteries = [];
let currentAddress;
const gas = 300000000;

function DateToString(date) {
  return date.toString().split('GMT')[0];
}

function getTxInfo(args) {
  return { from: account, gas, ...args };
}

async function setStatus(state) {
  if (state === 'logined') {
    $('#unlogined').hide();
    $('#logined').show();
    $('input[name="address"]').val('');
    $('input[name="password"]').val('');
    $('.lottery-action-btn').removeClass('disabled');
    $('.buy-btn').each(function(index) {
      if (!lotteries[index].canBuy) {
        $(this).addClass('disabled');
      } else {
        $(this).click(setToBuyLottery);
      }
    });
  } else if (state === 'unlogined') {
    $('#logined').hide();
    $('#unlogined').show();
    $('.lottery-action-btn').addClass('disabled');
    $('.buy-btn').off('click', setToBuyLottery);
  }
}

async function login() {
  const address = $('input[name="address"]')[0].value;
  const pwd = $('input[name="password"]')[0].value;
  try {
    await web3.personal.unlockAccount(address, pwd, 0);
    account = address;
    password = pwd;
    for (const l of lotteries) {
      const instance = await MarkTwo.at(l.address);
      if ((await instance.owner()) === account) {
        l.canBuy = false;
      }
      console.log(await instance.record(account));
    }
    toastr.success('Login success');
    await setStatus('logined');
  } catch (err) {
    console.log(err.message);
    toastr.error(err.message);
  }
  return false;
}

async function logout() {
  await web3.personal.lockAccount(account, password, 0);
  account = '';
  password = '';
  toastr.success('Log out');
  setStatus('unlogined');
}

async function sponsor() {
  try {
    const pool = $('#initpool')[0].value;
    const due = $('#duetime')[0].value;
    if (!pool) throw { message: 'Input a positive number' };
    if (!due) throw { message: 'Input the duetime' };

    const timestamp = new Date(due).getTime();
    if (timestamp < Date.now()) throw { message: 'invalid duetime' };

    const instance = await MarkTwo.new(
      timestamp,
      getTxInfo({ value: web3.toWei(pool, 'ether') })
    );
    await managerInstance.append.sendTransaction(instance.address, getTxInfo());
    addlottery(instance.address, DateToString(new Date(due)), pool, 'logined');
    instance.address.canBuy = true;
    lotteries.push({ address: instance.address, canBuy: true });

    toastr.success(`Sponsor a lottey contract: ${instance.address}`);
    console.log(instance.address);
  } catch (err) {
    console.log(err.message);
    toastr.error(err.message);
  }
}

async function getList() {
  const addresses = await managerInstance.getAll();
  for (const l of addresses) {
    const instance = await MarkTwo.at(l);
    const [rawDue, rawPool] = await Promise.all([
      instance.endtime(),
      instance.getPool()
    ]);
    if (rawDue.toNumber() < Date.now() && !(await instance.drawd())) {
      await instance.draw.sendTransaction(getTxInfo());
      lotteries.push({ address: l, canBuy: false })
    } else {
      lotteries.push({ address: l, canBuy: true });
    }
    const due = DateToString(new Date(rawDue.toNumber()));
    const pool = web3.fromWei(rawPool.toNumber());
    addlottery(instance.address, due, pool, 'disabled');
  }
}

function setToBuyLottery() {
  const idx = $('.buy-btn').index(this);
  currentAddress = lotteries[idx].address;
}

async function buy() {
  if (!currentAddress) {
    toastr.error('Cannot get lottery to buy');
    return;
  }
  try {
    const instance = await MarkTwo.at(currentAddress);
    if (account === (await instance.owner())) {
      throw { message: 'You are the owner!' };
    } else if (await instance.bought(account)) {
      throw { message: 'You have bought this lottery' };
    } else if (Date.now() > (await instance.endtime())) {
      throw { message: 'This lottery has been out of date' };
    }
    const nn = $('#normalnumber')[0].value;
    const sn = $('#specialnumber')[0].value;
    const tx = await instance.buy.sendTransaction(
      nn,
      sn,
      getTxInfo({ value: web3.toWei(1, 'ether') })
    );
    console.log(tx);
    toastr.success(`Succeess to buy Tx: ${tx}`);
  } catch (err) {
    console.log(err);
    toastr.error(err.message);
  }
}

function configToastr() {
  toastr.options.closeButton = true;
}

window.addEventListener('load', async function() {
  if (typeof web3 !== 'undefined') {
    window.web3 = new Web3(web3.currentProvider);
  } else {
    window.web3 = new Web3(
      new Web3.providers.HttpProvider('http://127.0.0.1:9545')
    );
  }
  Manager.setProvider(web3.currentProvider);
  MarkTwo.setProvider(web3.currentProvider);

  configToastr();
  $('#login-btn').click(login);
  $('#logout-btn').click(logout);
  $('#submit-sponsor-btn').click(sponsor);
  $('#buy-submit-btn').click(buy);

  managerInstance = await Manager.deployed();
  await getList();
});

window.addEventListener('beforeunload', async function(e) {
  if (account) {
    await web3.personal.lockAccount(account, password, 0);
  }
  e.preventDefault();
  e.returnValue = '';
});

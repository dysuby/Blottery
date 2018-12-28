import '../styles/style.css';
import '../../node_modules/toastr/build/toastr.css';

import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract';
import $ from 'jquery';
import * as toastr from 'toastr';

import { addlottery } from './component';

import ManagerArtifact from '../../build/contracts/Manager.json';
import MaskTwoArtifact from '../../build/contracts/MarkTwo.json';

const Manager = contract(ManagerArtifact);
const MaskTwo = contract(MaskTwoArtifact);

let account = '';
let password = '';
let managerInstance;
const gas = 300000000;

function DateToString(date) {
  return date.toString().split('GMT')[0];
}

function getTxInfo(args) {
  return { from: account, gas, ...args };
}

function setStatus(state) {
  if (state === 'logined') {
    $('#unlogined').hide();
    $('#logined').show();
    $('input[name="address"]').val('');
    $('input[name="password"]').val('');
    $('.lottery-action-btn').removeClass('disabled');
  } else if (state === 'unlogined') {
    $('#logined').hide();
    $('#unlogined').show();
    $('.lottery-action-btn').addClass('disabled');
  }
}

async function login() {
  let address = $('input[name="address"]')[0].value;
  let pwd = $('input[name="password"]')[0].value;
  try {
    await web3.personal.unlockAccount(address, pwd, 0);
    account = address;
    password = pwd;
    toastr.success('Login success');
    setStatus('logined');
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
    if (!pool || pool < 0) throw { message: 'Input a positive number' };
    if (!due) throw { message: 'Input the duetime' };

    const timestamp = new Date(due).getTime();
    if (timestamp < Date.now()) throw { message: 'invalid duetime' };

    const instance = await MaskTwo.new(
      timestamp,
      getTxInfo({ value: web3.toWei(pool, 'ether') })
    );
    await managerInstance.append.sendTransaction(instance.address, getTxInfo());
    addlottery(instance.address, DateToString(new Date(due)), pool, 'logined');

    toastr.success(`Sponsor a lottey ${instance.address}`);
    console.log(instance.address);
  } catch (err) {
    console.log(err.message);
    toastr.error(err.message);
  }
}

async function getList() {
  let lotteries = await managerInstance.getAll();
  for (let l of lotteries) {
    const instance = await MaskTwo.at(l);
    const [rawDue, rawPool] = await Promise.all([
      instance.endtime(),
      instance.getPool()
    ]);
    const due = DateToString(new Date(rawDue.toNumber()));
    const pool = web3.fromWei(rawPool.toNumber());
    addlottery(instance.address, due, pool, 'disabled');
  }
}

async function buy() {}

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
  MaskTwo.setProvider(web3.currentProvider);

  configToastr();
  $('#login-btn').click(login);
  $('#logout-btn').click(logout);
  $('#submit-btn').click(sponsor);

  managerInstance = await Manager.deployed();
  await getList();
});

window.addEventListener('beforeunload', async function (e) {
  if (account) {
    await web3.personal.lockAccount(account, password, 0);
  }
  e.preventDefault();
  e.returnValue = '';
});

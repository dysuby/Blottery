import '../styles/style.css';
import '../../node_modules/toastr/build/toastr.css';

import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract';
import * as toastr from 'toastr';

import { addlottery } from './component';

import ManagerArtifact from '../../build/contracts/Manager.json';
import MarkTwoArtifact from '../../build/contracts/MarkTwo.json';

const Manager = contract(ManagerArtifact);
const MarkTwo = contract(MarkTwoArtifact);

let account = ''; // 当前登录的账号
let password = ''; // 当前登录的密码 (用于 lock)
let managerInstance; // Manager 实例
let lotteries = []; // 当前彩票的所有地址
let currentAddress; // 需要操作的彩票地址(买或领奖)
const gas = 300000000; // 发起交易花费的 gas

/**
 * 转化成显示的日期
 * @param {Date} date
 * @returns {string}
 */
function DateToString(date) {
  return date.toString().split('GMT')[0];
}

/**
 * 获得发起交易的 { from: .... }
 * @param {Object} args
 * @returns
 */
function getTxInfo(args) {
  return { from: account, gas, ...args };
}

/**
 * 转换登录和未登录的状态
 * @param {'logined'|'unlogined'} state
 */
async function setStatus(state) {
  if (state === 'logined') {
    await getList();

    $('#unlogined').hide();
    $('#logined').show();
    $('input[name="address"]').val('');
    $('input[name="password"]').val('');

    // 更新可用行动
    $('.lottery-action-btn').removeClass('disabled');
    $('.buy-btn').each(function(index) {
      if (!lotteries[index].canBuy) {
        $(this).addClass('disabled');
      } else {
        $(this).on('click', setClickLottery);
        $(this).on('click', function() {
          $('#buy-modal').modal();
        });
      }
    });
    $('.award-btn').each(function(index) {
      if (!lotteries[index].canAward) {
        $(this).addClass('disabled');
      } else {
        $(this).click(award);
      }
    });
  } else if (state === 'unlogined') {
    $('#logined').hide();
    $('#unlogined').show();
    $('.lottery-action-btn').addClass('disabled');
    $('.buy-btn').off('click', setClickLottery);
    currentAddress = '';
    await getList();
  }
}

/**
 * 登录
 * @returns {false} 阻止表单动作
 */
async function login() {
  const address = $('input[name="address"]')[0].value;
  const pwd = $('input[name="password"]')[0].value;
  try {
    // unlock account
    await web3.personal.unlockAccount(address, pwd, 0);
    account = address;
    password = pwd;
    toastr.success('Login success');
    await setStatus('logined');
  } catch (err) {
    console.log(err.message);
    toastr.error(err.message);
  }
  return false;
}

/**
 * 登出
 */
async function logout() {
  await web3.personal.lockAccount(account, password, 0);
  account = '';
  password = '';
  toastr.success('Log out');
  setStatus('unlogined');
}

/**
 * 发起彩票
 */
async function sponsor() {
  try {
    const pool = $('#initpool')[0].value;
    const due = $('#duetime')[0].value;
    // 判断合法想
    if (!pool || pool < 0) throw { message: 'Input a positive number' };
    if (!due) throw { message: 'Input the duetime' };

    const timestamp = new Date(due).getTime();
    if (timestamp < Date.now()) throw { message: 'invalid duetime' };

    // 创建新彩票合约
    const instance = await MarkTwo.new(
      timestamp,
      getTxInfo({ value: web3.toWei(pool, 'ether') })
    );

    // 记录到 Manager 上，需挖矿确认
    await managerInstance.append.sendTransaction(instance.address, getTxInfo());

    // 添加到页面上，并记录
    addlottery(instance.address, DateToString(new Date(due)), pool, 'disabled');
    lotteries.push({
      address: instance.address,
      canBuy: false,
      canAward: false
    });

    toastr.success(`Sponsor a lottey contract: ${instance.address}`);
    console.log(instance.address);
  } catch (err) {
    console.log(err.message);
    toastr.error(err.message);
  }
}

/**
 * 获得所有彩票，记录在 lotteries 里
 */
async function getList() {
  // 清空已有设置，并锁定刷新键
  $('#refresh-btn').addClass('disabled');
  $('.lottery').remove();
  lotteries = [];

  const addresses = await managerInstance.getAll();
  for (const l of addresses) {
    let nn = '';
    let sn = '';
    const instance = await MarkTwo.at(l);
    const [rawDue, rawPool] = await Promise.all([
      instance.endtime(),
      instance.getPool()
    ]);

    // 将拿到的数据转换
    let due = DateToString(new Date(rawDue.toNumber()));
    const pool = web3.fromWei(rawPool.toNumber());

    if (rawDue.toNumber() < Date.now()) {
      // 已经过期
      // 不能购买，可以领奖
      lotteries.push({ address: l, canBuy: false, canAward: true });
      const drawed = await instance.drawed();
      if (account && !drawed) {
        // 还未开奖，用当前账号开奖
        const tx = await instance.draw.sendTransaction(getTxInfo());
        console.log(tx);
      }
      if (drawed) {
        // 已经开奖，获得开奖结果
        [nn, sn] = await Promise.all([instance.normal(), instance.extra()]);
      }
      // 更新日期显示
      due = 'Finished';
    } else {
      // 还未过期
      // 可以购买，不能领奖
      lotteries.push({ address: l, canBuy: true, canAward: false });
    }

    // 决定该账号的可用行动
    const [owner, bought] = await Promise.all([
      instance.owner(),
      instance.bought(account)
    ]);
    if (owner === account || bought) {
      // 发起者或已经买过，不能买
      lotteries[lotteries.length - 1].canBuy = false;
    }
    if ((await instance.got(account)) || !bought || owner === account) {
      // 领奖了，没买过，发起者不能领奖
      lotteries[lotteries.length - 1].canAward = false;
    }

    // 先设为不可用，让 setStatus 更新
    addlottery(instance.address, due, pool, 'disabled', nn, sn);
  }
  // 解锁刷新按钮
  $('#refresh-btn').removeClass('disabled');
}

/**
 * 点击 buy 按钮时记录点的是哪一个彩票
 */
function setClickLottery() {
  const idx = $('.buy-btn').index(this);
  currentAddress = lotteries[idx].address;
}

/**
 * 购买彩票
 * @returns {false} 阻止表单动作
 */
async function buy() {
  if (!currentAddress) {
    // 没有记录需要操作彩票地址
    toastr.error('Cannot get lottery to buy');
    return;
  }
  try {
    const instance = await MarkTwo.at(currentAddress);
    if (account === (await instance.owner())) {
      // 发起者不能购买
      throw { message: 'You are the owner!' };
    } else if (await instance.bought(account)) {
      // 买过不能买
      throw { message: 'You have bought this lottery' };
    } else if (Date.now() > (await instance.endtime())) {
      // 过期不能买
      throw { message: 'This lottery has been out of date' };
    }

    // 获得购买的数码判断合法性
    const nn = $('#normalnumber')[0].value;
    const sn = $('#specialnumber')[0].value;
    if (nn <= 0 || nn > 36 || sn <= 0 || sn > 72) {
      throw { message: 'Invalid number' };
    }

    // 购买，需挖矿确认
    const tx = await instance.buy.sendTransaction(
      nn,
      sn,
      getTxInfo({ value: web3.toWei(1, 'ether') })
    );
    console.log(tx);
    toastr.success(
      `Succeess to buy 
Tx: ${tx}`);
  } catch (err) {
    console.log(err);
    toastr.error(err.message);
  }
}

/**
 * 领奖
 */
async function award() {
  // 获得领奖的彩票
  const idx = $('.award-btn').index(this);
  currentAddress = lotteries[idx].address;
  try {
    const instance = await MarkTwo.at(currentAddress);
    if ((await instance.endtime()) > Date.now()) {
      // 还未结束
      throw { message: 'Not Finshed' };
    } else if (!(await instance.bought(account))) {
      // 没买过
      throw { message: 'You did not buy this lottery' };
    } else if (await instance.got(account)) {
      // 已经领过奖
      throw { message: 'You has got prize' };
    }

    // 领奖并获得领奖信息，需挖矿确认
    const [
      tx,
      record,
      normal,
      extra,
      extraprize,
      normalnumber
    ] = await Promise.all([
      instance.giveOnePrize.sendTransaction(getTxInfo()),
      instance.record(account),
      instance.normal(),
      instance.extra(),
      instance.prizes(0),
      instance.prizes(1)
    ]);

    let total = 0;
    if (record[0].toNumber() === extra.toNumber()) {
      // 中了特奖
      total += extraprize.toNumber();
    }
    if (record[1].toNumber() === normal.toNumber()) {
      // 中了普奖
      total += normalnumber.toNumber();
    }

    toastr.success(
      `Congratulations! You has received ${total} ether(s).
Tx: ${tx}`
    );
    $(`.prized-numbers:eq(${$('.buy-btn').index(this)})`).text(
      `${normal}/${extra}`
    );
  } catch (err) {
    console.log(err);
    toastr.error(err.message);
  }
}

/**
 * 配置 toastr
 */
function configToastr() {
  toastr.options.closeButton = true;
}

window.addEventListener('load', async function() {
  // 初始化 web3
  if (typeof web3 !== 'undefined') {
    window.web3 = new Web3(web3.currentProvider);
  } else {
    window.web3 = new Web3(
      new Web3.providers.HttpProvider('http://127.0.0.1:9545')
    );
  }
  // 初始化合约 provider
  Manager.setProvider(web3.currentProvider);
  MarkTwo.setProvider(web3.currentProvider);

  // 用于 Modal
  jQuery.noConflict();

  // 添加各种监听器
  configToastr();
  $('#login-btn').click(login);
  $('#logout-btn').click(logout);
  $('#submit-sponsor-btn').click(sponsor);
  $('#buy-submit-btn').click(buy);
  $('#refresh-btn').click(getList);

  // 获得 Manager 实例
  managerInstance = await Manager.deployed();

  // 初始化列表
  await getList();
});

window.addEventListener('beforeunload', async function(e) {
  // 刷新页面时锁定账号
  if (account) {
    await web3.personal.lockAccount(account, password, 0);
  }
  e.preventDefault();
  e.returnValue = '';
});

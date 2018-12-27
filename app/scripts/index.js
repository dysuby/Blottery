import '../styles/style.css';
import '../../node_modules/toastr/build/toastr.css';

import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract';
import $ from 'jquery';
import * as toastr from 'toastr';

import ManagerArtifact from '../../build/contracts/Manager.json';
import MaskTwoArtifact from '../../build/contracts/MarkTwo.json';

const Manager = contract(ManagerArtifact);
const MaskTwo = contract(MaskTwoArtifact);

let account = '';
let password = '';
let managerInstance;

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

async function logout(message) {
  await web3.personal.lockAccount(account, password, 0);
  account = '';
  password = '';
  toastr.success('Log out');
  setStatus('unlogined');
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

  configToastr();
  $('#login-btn').click(login);
  $('#logout-btn').click(logout);

  Manager.deployed().then(instance => {
    managerInstance = instance;
  });
});

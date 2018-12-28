import $ from 'jquery';

export function addlottery(address, due, pool, state = '') {
  $('#list').append(`
  <div class="row">
    <div class="col-xs-4 col-sm-4 col-md-4 col-lg-4 text-vc">${address}</div>
    <div class="col-xs-2 col-sm-2 col-md-2 col-lg-2 text-vc">${due}</div>
    <div class="col-xs-3 col-sm-3 col-md-3 col-lg-3 text-vc">${pool}</div>
    <div class="col-xs-3 col-sm-3 col-md-3 col-lg-3">
      <buttun class="btn btn-success lottery-action-btn ${state}">Buy</buttun>
      <buttun class="btn btn-primary lottery-action-btn ${state}">Award</buttun>
    </div>
  </div>`);
}

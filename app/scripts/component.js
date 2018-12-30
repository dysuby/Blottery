export function addlottery(address, due, pool, state = '', normal = '', special = '') {
  $('#list').append(`
  <div class="row lottery">
    <div class="col-xs-4 col-sm-4 col-md-4 col-lg-4 text-vc text-center">${address}</div>
    <div class="col-xs-2 col-sm-2 col-md-2 col-lg-2 text-vc text-center">${due}</div>
    <div class="col-xs-1 col-sm-2 col-md-2 col-lg-2 text-vc text-center">${pool}</div>
    <div class="col-xs-1 col-sm-1 col-md-1 col-lg-1 text-vc text-center prized-numbers">${normal}/${special}</div>
    <div class="col-xs-3 col-sm-3 col-md-3 col-lg-3 text-center">
      <buttun class="btn btn-success lottery-action-btn buy-btn ${state}">Buy</buttun>
      <buttun class="btn btn-primary lottery-action-btn award-btn ${state}">Award</buttun>
    </div>
  </div>`);
}

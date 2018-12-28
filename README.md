# Blottery

> a blochain-based lottery app

## start

require node, geth, truffle

`npm i`

`geth .\geth.exe -datadir <data> -networkid 5777 -rpc -rpcaddr '127.0.0.1' -rpccorsdomain "*" --port 9545 --rpcport 9545 --rpcapi="db,eth,net,web3,personal,web3" console 2> log.log`

`truffle networks --clean`

`truffle migrate --reset`

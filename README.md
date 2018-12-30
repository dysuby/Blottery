# Blottery

> a blochain-based lottery app

## start

require node, geth, truffle

`npm i`

`geth .\geth.exe -datadir <data> -networkid 5777 -rpc -rpcaddr '127.0.0.1' -rpccorsdomain "*" --port 9545 --rpcport 9545 --rpcapi="db,eth,net,web3,personal,web3" console 2> log.log`

`truffle networks --clean`

`truffle migrate --reset`

`npm run dev`

may need turn off chrome cors security, such as:

`.\chrome.lnk --disable-web-security --user-data-dir=D:/blockchain`

open [127.0.0.1:8080](http://127.0.0.1:8080)

## Usage

- When you buy or sponsor or award a lottery, don't forget to mine in geth.
- Please don't refresh or close tab directly when you're logining, logout first.
- Be patient and tolerant.

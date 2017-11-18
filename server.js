const getStocks = require('./getStock');

const port = process.env.PORT || 3001;
let STOCKS = {};

var server = require('http').createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://stock-bin.netlify.com');
    res.end();
});
var io = require('socket.io')(server);
let lastCheckTime = 0;
let running = false;

const DEV = process.env.NODE_ENV === 'development';
const realTimeFrom = DEV ? 9 : 1;
const realTimeto = DEV ? 14 : 6;

setInterval(async () => {
  	const now = new Date();
  	const nowH = now.getHours();
  	const isRealTimeMode = nowH >= realTimeFrom && nowH <= realTimeto;
    console.log('realTimeFrom', realTimeFrom, 'realTimeto', realTimeto);
    console.log('lastCheckTime', lastCheckTime, 'isRealTimeMode', isRealTimeMode, 'nowH', nowH);

    if(running){
        console.log('query running');
        return;
    }

  	if(lastCheckTime === 0 || isRealTimeMode){     
        try {
            let lastTime = 0;
            running = true;
            const response = await getStocks(Object.keys(STOCKS));  
            if(response && response.msgArray){
                response.msgArray.forEach(msg => {
                    STOCKS[msg.c] = {
                        ...STOCKS[msg.c],
                        updatedTime: msg.tlong,
                        lastPrice: msg.y,
                        nowPrice: msg.z
                    }
                    if(msg.tlong > lastTime){
                        lastTime = msg.tlong;
                    }
                });     
                if(lastTime > lastCheckTime){
                    lastCheckTime = lastTime;
                    io.emit('updateStocks', STOCKS);
                }   
            }       
        }
        catch (e) {
            console.log(e);
            running = false;
        }   
  	}

    running = false;

}, 10000);

io.on('connection', function(client){
	let initInfo = false;
	console.log('connection');

  	client.on('registStocks', stock_ids => {
  		// console.log('registStocks', stock_ids)
  		stock_ids.forEach(id => {
  			if(!STOCKS[id]){
  				STOCKS[id] = {
  					id: id,
  					updatedTime: false
  				}
  				lastCheckTime = 0;
  			}
  		});

        if(!initInfo){
            client.emit('updateStocks', STOCKS);
            initInfo = true;
        }
  	});

  	client.on('disconnect', function(){
  		console.log('disconnect');
  	});
});
server.listen(port, () => {
    console.log(`Server is running on port ${port}`)
});
const puppeteer = require('puppeteer');
const htmlToJson = require('html-to-json');
const stockDB = require('./stockDB.json');
let browser = false;

async function getStockInfo(keys){
    console.log('getStockInfo', keys);

    let now = new Date();
    const page = await browser.newPage();
    await page.goto(
        `http://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${keys}&json=1&delay=0&_=${now.getTime()}`, 
        // {waitUntil: 'networkidle'}
    );
    const bodyHandle = await page.$('body');
    const html = await page.evaluate(body => body.innerHTML, bodyHandle);
    await page.close();
    return JSON.parse(html);
}

async function getStock(stock_id){
    console.log('[getStock id] ', stock_id);

    now = new Date();
    const page = await browser.newPage();
    await page.goto(`http://mis.twse.com.tw/stock/api/getStock.jsp?ch=${stock_id}.tw&json=1&_=${now.getTime()}`);
    const bodyHandle = await page.$('body');
    const html = await page.evaluate(body => body.innerHTML, bodyHandle);
    const res = JSON.parse(html);
    await page.close();
    return res;
}

async function getStocks(stock_ids){
    // console.log('[getStocks ids] ', stock_ids);
    let result = false;

    stock_ids = [].concat(stock_ids);
    if(stock_ids.length > 0){
        let queryKeys = [];

        // start brwoser
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
            // headless: false,
            // slowMo: 250 // slow down by 250ms
        });

        // get cookies
        const page = await browser.newPage();
        await page.goto(`http://mis.twse.com.tw/stock/fibest.jsp?lang=zh_tw&stock=${stock_ids[0]}`);
        // const cookies = await page.cookies();
        // console.log(cookies);

        // get query keys
        let count = 0;
        let queryGroup;
        for(let id of stock_ids){
            let queryKey = false;
            const stock = stockDB[id];
            if(stock){
                const prefix = stock.isOtc ? 'otc' : 'tse';
                queryKey = `${prefix}_${id}.tw`;
            }
            if(queryKey){                
                if(count % 10 === 0){
                    queryGroup = [queryKey];
                    queryKeys.push(queryGroup);
                }else{
                    queryGroup.push(queryKey);
                }
                count++;
            }
        }

        // console.log('[getStocks queryKeys] ', queryKeys);

        if(queryKeys.length > 0){
            for(let qGroup of queryKeys){
                let keys = qGroup.join('|');
                let info = await getStockInfo(keys);

                if(!result){
                    result = info;
                }else{
                    result.msgArray = result.msgArray.concat(info.msgArray);
                }
            }
        }

        await browser.close();
    }
    
    // console.log('[getStocks return] ', result);
    return result;
}

module.exports = getStocks;

async function crawlGoodInfo(stock_ids){
    // console.log('[getStocks ids] ', stock_ids);
    let result = false;

    stock_ids = [].concat(stock_ids);
    if(stock_ids.length > 0){
        let queryKeys = [];

        // start brwoser
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            // headless: false,
            // slowMo: 250 // slow down by 250ms
        });

        // get cookies
        const page = await browser.newPage();
        await page.goto(`https://goodinfo.tw/StockInfo/StockDetail.asp?STOCK_ID=${stock_ids[0]}`);
        // const cookies = await page.cookies();
        // console.log(cookies);

        const bodyHandle = await page.$('body');
        const html = await page.evaluate(body => body.innerHTML, bodyHandle);
        
        await page.close();

        await htmlToJson.parse(html, {
            'messages': function ($doc) {
                // console.log(this);
                let trArray = this.map('table.solid_1_padding_3_0_tbl tr', function($row, index){
                    return [$row.find('td:nth-child(1)').text(), $row.find('td:nth-child(4)').text(), $row.find('td:nth-child(5)').text()];
                });

                return trArray.filter((item, index) => index > 2 && index < 6)
            }
        })
        .then(function(data){
            console.log(data);
            result = data;
        });

        // console.log('[getStocks queryKeys] ', queryKeys);

        await browser.close();
    }
    
    // console.log('[getStocks return] ', result);
    return result;
}

async function crawlMain(stock_ids){
    // console.log('[getStocks ids] ', stock_ids);
    let result = false;

    stock_ids = [].concat(stock_ids);
    if(stock_ids.length > 0){
        let queryKeys = [];

        // start brwoser
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            // headless: false,
            // slowMo: 250 // slow down by 250ms
        });

        // get cookies
        const page = await browser.newPage();
        await page.goto(`http://www.wantgoo.com/stock/astock/agentstat2?stockno=${stock_ids[0]}`);
        // const cookies = await page.cookies();
        // console.log(cookies);

        const bodyHandle = await page.$('body');
        const html = await page.evaluate(body => body.innerHTML, bodyHandle);
        
        await page.close();

        await htmlToJson.parse(html, {
            'messages': function ($doc) {
                // console.log(this);
                let trArray = this.map('#listMain tbody tr', function($row, index){
                    return $row.children().toArray().innerHTML;
                });

                return trArray.filter((item, index) => index > 2 && index < 6)
            }
        })
        .then(function(data){
            console.log(data);
            result = data;
        });

        // console.log('[getStocks queryKeys] ', queryKeys);

        await browser.close();
    }
    
    // console.log('[getStocks return] ', result);
    return result;
}

Promise.all([crawlMain(['2327', '2890', '6180'])])
.then(message => console.log(message))
.catch(error => console.log(error))
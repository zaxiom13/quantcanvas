
// Generate more powerful and random kdb+ examples
export const generateKdbExamples = () => [
  {
    category: 'Random Data Generation',
    items: [
      {
        q: 'n:1000; trades:([]time:.z.p+n?1000000000;sym:n?`AAPL`GOOGL`MSFT`TSLA`AMZN;price:100.0+n?50.0;size:100+n?1000); trades',
        doc: 'Generate 1000 random trades with timestamps, symbols, prices, and sizes.'
      },
      {
        q: 'quotes:([]sym:`AAPL`GOOGL`MSFT`TSLA`AMZN;bid:100.0+5?20.0;ask:101.0+5?20.0;bsize:100+5?500;asize:100+5?500); quotes',
        doc: 'Create a quotes table with random bid/ask prices and sizes.'
      },
      {
        q: 'sensors:([]time:.z.p-til 100;deviceId:100?`device1`device2`device3;temp:20.0+100?15.0;humidity:50.0+100?30.0); sensors',
        doc: 'Generate 100 IoT sensor readings with temperature and humidity data.'
      },
      {
        q: 'users:([]userId:1000?til 10000;name:1000?`john`jane`bob`alice`charlie;age:18+1000?50;city:1000?`NYC`LA`Chicago`Miami); users',
        doc: 'Create a user table with 1000 random users and demographics.'
      },
    ],
  },
  {
    category: 'Table Operations',
    items: [
      {
        q: 'select avg price, sum size by sym from trades',
        doc: 'Calculate average price and total size by symbol from trades table.'
      },
      {
        q: 'select from trades where price>150, size>500',
        doc: 'Filter trades for high-value, large-size transactions.'
      },
      {
        q: 'trades lj `sym xkey quotes',
        doc: 'Left join trades with quotes table on symbol.'
      },
      {
        q: 'update spread:ask-bid from quotes; quotes',
        doc: 'Add a spread column to quotes table.'
      },
    ],
  },
  {
    category: 'Time Series Analysis',
    items: [
      {
        q: 'select last price by sym from trades',
        doc: 'Get the last traded price for each symbol.'
      },
      {
        q: 'select max price, min price, last price by date:.z.d from trades',
        doc: 'Daily OHLC (Open, High, Low, Close) aggregation.'
      },
      {
        q: 'mavg[10;price] from trades',
        doc: 'Calculate 10-period moving average of prices.'
      },
      {
        q: 'select price, mavg[5;price], mdev[5;price] from trades',
        doc: 'Price with 5-period moving average and standard deviation.'
      },
    ],
  },
  {
    category: 'Advanced Analytics',
    items: [
      {
        q: 'select price, deltas price by sym from trades',
        doc: 'Calculate price changes (deltas) for each symbol.'
      },
      {
        q: 'select sym, price, ratios price by sym from trades',
        doc: 'Calculate price ratios (percentage changes) by symbol.'
      },
      {
        q: 'select cor[price;size] by sym from trades',
        doc: 'Calculate correlation between price and size for each symbol.'
      },
      {
        q: 'select sym, price, rank price by sym from trades',
        doc: 'Rank prices within each symbol group.'
      },
    ],
  },
]; 
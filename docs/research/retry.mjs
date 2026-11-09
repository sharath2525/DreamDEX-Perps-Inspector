import {SomniaMarkets,SOMNIA_HIDEKI_TESTNET_ADDRESSES} from '@somnia-chain/markets-sdk';
import {hidekiTestnet} from '@somnia-chain/markets-sdk/chains';
import {readFileSync,writeFileSync} from 'node:fs';
const previous=JSON.parse(readFileSync(new URL('./live-probe.json',import.meta.url)));
const market=previous.results.markets.result.find(m=>m.baseSymbol==='SOL');
const account='0x0000000000000000000000000000000000000001';
const exchange=new SomniaMarkets({chain:hidekiTestnet,indexerUrl:'https://hideki-dev.smk.somnia.host/v1/graphql',addresses:SOMNIA_HIDEKI_TESTNET_ADDRESSES});
const client=exchange.client;
const results={accessedAt:new Date().toISOString(),mode:'READ_ONLY_NO_SIGNER',results:{}};
const json=v=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x,2);
const checks={
 feed:()=>client.getPerpFeedStatus(market.poolAddress),
 maxSize:()=>client.getMaxPerpOrderSize({pool:market.poolAddress,marginBank:market.marginBank,account,isBid:true,price:BigInt(previous.results.selectedBook.result.asks[0].price),autoPull:false}),
 marginPreview:()=>client.previewPerpOrderMargin({pool:market.poolAddress,marginBank:market.marginBank,account,isBid:true,price:BigInt(previous.results.selectedBook.result.asks[0].price),quantity:BigInt(market.minQuantity),autoPull:false}),
 sync:()=>client.getSyncStatus(50383),
 stream:async()=>{const handle=await client.watchMarket(market.poolAddress);await new Promise(r=>setTimeout(r,2000));const value={watch:client.getWatchStatus(market.poolAddress),live:client.getLiveStatus()};handle.stop();return value;}
};
for(const [name,fn] of Object.entries(checks)) {let timer;try{const value=await Promise.race([fn(),new Promise((_,rej)=>timer=setTimeout(()=>rej(new Error('Bounded research timeout 25s')),25000))]);results.results[name]={status:'PASS',result:value};}catch(e){results.results[name]={status:'ERROR',name:e.name,message:e.message};}finally{clearTimeout(timer);writeFileSync(new URL('./retry-probe.json',import.meta.url),json(results));console.log(name,json(results.results[name]));}}
await exchange.close();

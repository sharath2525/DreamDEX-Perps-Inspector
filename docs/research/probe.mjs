import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from '@somnia-chain/markets-sdk';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import { createPublicClient, http, keccak256 } from 'viem';
import { writeFileSync } from 'node:fs';
const json = v => JSON.stringify(v, (_, x) => typeof x === 'bigint' ? x.toString() : x, 2);
const report = {accessedAt: new Date().toISOString(), sdk: '0.32.1', mode: 'READ_ONLY_NO_SIGNER', results: {}};
const exchange = new SomniaMarkets({chain: hidekiTestnet, indexerUrl: 'https://hideki-dev.smk.somnia.host/v1/graphql', addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES});
const client = exchange.client;
const rpc = createPublicClient({chain: hidekiTestnet, transport: http(undefined, {timeout: 12000, retryCount: 0})});
async function check(name, fn) {
  let timer;
  try { const result = await Promise.race([fn(), new Promise((_, reject) => {timer=setTimeout(()=>reject(new Error('Research check timed out at 20s')),20000)})]); report.results[name]={status:'PASS',result}; console.log(name, 'PASS',json(result).slice(0,1000)); return result; }
  catch(e) {report.results[name]={status:'ERROR',name:e.name,message:e.message}; console.log(name,'ERROR',e.message.slice(0,1000));}
  finally {clearTimeout(timer);writeFileSync(new URL('./live-probe.json',import.meta.url),json(report));}
}
try {
  await check('network',async()=>({chainId:await rpc.getChainId(),block:await rpc.getBlockNumber(),genesis:(await rpc.getBlock({blockNumber:0n})).hash}));
  const system = await check('system',()=>client.getPerpSystemConfig('0x478769E1177C0773c43A593DCCc4Ad15F15F1394'));
  const markets = await check('markets',()=>client.listPerpMarkets({limit:1000}));
  await check('contractCode',async()=>{
    const addresses={marginBank:'0x478769E1177C0773c43A593DCCc4Ad15F15F1394',collateral:'0xed7993A74dAe1e6656B704A424DcD8711aAf4F72',factory:'0xE631fAEE547baeE07353E290f0562ea67d856560',liquidation:'0xA66d3C24Ad4a389d863846905D8173e1017e9F4D',insurance:'0x50826894D47C6D4f3BeA38BFDC7Dc5c5be171b80',voucher:'0x2ACD9EFdA721450906bfE1bef3edE269636E42C4',operatorRegistry:'0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a'};
    const out={}; const blockNumber=await rpc.getBlockNumber();
    for(const [name,address] of Object.entries(addresses)){const code=await rpc.getCode({address,blockNumber});out[name]={address,bytes:code?(code.length-2)/2:0,codeHash:code?keccak256(code):null,blockNumber};}return out;
  });
  if(system) await check('factoryStatuses',()=>client.listPerpPoolStatuses({factory:system.perpPoolFactory}));
  const market=markets?.find(m=>m.baseSymbol==='SOL')??markets?.[0];
  if(market){
    console.log('selected',json(market));
    const state=await check('selectedState',()=>client.getPerpState(market.poolAddress));
    await check('selectedRisk',()=>client.getPerpRiskParams(market.poolAddress));
    await check('selectedBook',()=>client.getSpotOrderBook(market.poolAddress,{depth:5}));
    await check('selectedFeed',()=>client.getPerpFeedStatus(market.poolAddress));
    await check('voucherCampaign',()=>client.getPerpVoucherCampaign(market.marginBank));
    const account='0x0000000000000000000000000000000000000001';
    report.accountNote='Address 0x...01 is an arbitrary read-only diagnostic address, not the user wallet or a trading account.';
    await check('diagnosticAccount',()=>client.getMarginAccount(market.marginBank,account));
    await check('diagnosticPositions',()=>client.listPerpPositionAnalytics({marginBank:market.marginBank,account}));
    if(state?.markPriceOk) await check('diagnosticMaxSize',()=>client.getMaxPerpOrderSize({pool:market.poolAddress,marginBank:market.marginBank,account,isBid:true,price:state.markPrice,autoPull:false}));
    await check('diagnosticPortfolio',()=>client.getPerpPortfolio(account));
    await check('diagnosticHistory',()=>client.listPerpOrderHistory(account,{limit:5}));
    await check('rejectionsSchema',()=>client.listPerpOrderRejections({pool:market.poolAddress,limit:1}));
    await check('stream',async()=>{const handle=await client.watchMarket(market.poolAddress);await new Promise(r=>setTimeout(r,1500));const status=client.getWatchStatus(market.poolAddress);handle.stop?.();return status;});
  }
} finally {await exchange.close();writeFileSync(new URL('./live-probe.json',import.meta.url),json(report));}

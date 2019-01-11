# 微信支付node版  PHP移植版

## 使用方法同官方PHP版本

E:.
│  package.json
│  README.md
│
└─libs
        ksort.js          基础功能
        WxPayApi.js       对接API
        WxPayConfig.js    微信配置文件  需要配置
        WxPayData.js      数据处理
        WxPayException.js 异常
        WxPayNotify.js    通知處理


## STEP1  
    配置 WxPayConfig.js 文件 修改相關的信息 

## STEP2
    使用方法 

<pre>
    <code>
    var WxPayApi = require('./libs/WxPayApi');
    const {WxPayUnifiedOrder, WxPayResults} = require('./libs/WxPayData');
    const WxPayConfig = require('./libs/WxPayConfig');


    let input = new WxPayUnifiedOrder();

    input.SetBody("測試主題");
    input.SetAttach('4005678967890');
    input.SetOut_trade_no('2019010890923378233');
    input.SetTotal_fee(100);
    input.SetSub_Mch_id(WxPayConfig.SUB_MCHID); //子商户号
    input.SetSubAppid(WxPayConfig.SUB_APPID);
    input.SetTrade_type("JSAPI");
    input.SetSpbill_create_ip("1.1.1.1");
    // input.SetOpenid('oqmEM0SVCkeVhrlfMyR8GdVsIfbI');  // 服务商公众号的openid
    input.SetSubOpenid('oqmEM0SVCkeVhrlfMyR8GdVsIfbI');  // 服务商公众号的openid
    input.SetSignType('HMAC-SHA256');

    async function f() {
        let  order =await WxPayApi.unifiedOrder(input, 30);
        console.log(order);
    }

    f();
    </code>
</pre>    

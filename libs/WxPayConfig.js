const  WxPayConfig = {
    APPID:'',  // 服务商商版 ？ 服务商APPID ： 自己的APPID
    MCHID:'',          // 服务商商版 ？ 服务商MCHID ： 自己的MCHID 
    SUB_MCHID:'',      // 服务商商版 ？ 特约商户MCHID  ： 不用配置
    SUB_APPID:'',  // 服务商商版 ？ 子程序APPID  ： 不用配置
    KEY:'',   // 服务商商版 ？ 服务商MCHT KEY  ： 自己的MCHT KEY 
    SUB_APP_SECRET: '',  // 服务商商版 ？ 子账户APP SECRET ： 不用配置
    APP_SECRET:'',  // 服务商商版 ？ 服务商APP SECRET ： 自己的APP SECRET
    //=======【证书路径设置】=====================================
    /**
     * TODO：设置商户证书路径
     * 证书路径,注意应该填写绝对路径（仅退款、撤销订单时需要，可登录商户平台下载，
     * API证书下载地址：https://pay.weixin.qq.com/index.php/account/api_cert，下载之前需要安装商户操作证书）
     * @var path
     */
    SSLCERT_PATH:'Your SSLCERT',
    SSLKEY_PATH:'Your SSLKEY',

    //=======【curl代理设置】===================================
    /**
     * TODO：这里设置代理机器，只有需要代理的时候才设置，不需要代理，请设置为0.0.0.0和0
     * 本例程通过curl使用HTTP POST方法，此处可修改代理服务器，
     * 默认CURL_PROXY_HOST=0.0.0.0和CURL_PROXY_PORT=0，此时不开启代理（如有需要才设置）
     * @var unknown_type
     */
    CURL_PROXY_HOST:"0.0.0.0",//"10.152.18.220",
    CURL_PROXY_PORT:0,//8080,

    //=======【上报信息配置】===================================
    /**
     * TODO：接口调用上报等级，默认紧错误上报（注意：上报超时间为【1s】，上报无论成败【永不抛出异常】，
     * 不会影响接口调用流程），开启上报之后，方便微信监控请求调用的质量，建议至少
     * 开启错误上报。
     * 上报等级，0.关闭上报, 1.仅错误出错上报, 2.全量上报
     * @var int
     */
    REPORT_LEVENL:1, 
    NOTIFY_URL: '/api/notify',   // 通知地址
};


module.exports = WxPayConfig;


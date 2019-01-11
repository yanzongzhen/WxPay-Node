const ApiError = require("./WxPayException");
const xml2js = require("xml2js");
const WxPayConfig = require("./WxPayConfig");
const { ksort, array_key_exists, md5, sha256 } = require("./ksort");

// 数据基础类型
class WxPayDataBase {
  constructor() {
    this.values = {};
  }

  createNonceStr() {
    return Math.random().toString(36).substr(2, 12);
  }

  // 时间戳产生函数
  createTimeStamp() {
    return parseInt(new Date().getTime() / 1000) + '';
  }

  // 设置sign签名
  SetSign() {
    let sign = this.MakeSign();
    this.values["sign"] = sign;
    console.log(this.values['sign']);
    return this.values;
  }

  // 获得签名
  GetSign() {
    return this.values["sign"];
  }

  //  检测是否有签名存在
  IsSignSet() {
    return array_key_exists("sign", this.values);
  }

  /**
   * 输出xml字符
   * @throws ApiError
   **/
  ToXml(rootName = 'xml') {
    const opt = {xmldec: null, rootName, allowSurrogateChars: true, cdata: true};
    return new xml2js.Builder(opt).buildObject(this.values);
  }


  /**
   * 将xml转为array
   * @param  xml
   * @throws ApiError
   */
  FromXml(xml) {
    return new Promise((resolve, reject) =>{
      const opt = {trim: true, explicitArray: false, explicitRoot: false};
      xml2js.parseString(xml, opt, (err, res) => err ? reject(new Error('XMLDataError')) : resolve(res || {}));
    });
  }

  /**
   * 格式化参数格式化成url参数
   */
  ToUrlParams() {
    let buff = "";
    for (let valuesKey in this.values) {
      if (
        valuesKey !== "sign" &&
        this.values[valuesKey] !== "" &&
        !Array.isArray(this.values[valuesKey])
      ) {
        buff += valuesKey + "=" + this.values[valuesKey] + "&";
      }
    }
    buff = buff.substring(0, buff.lastIndexOf("&"));
    return buff;
  }

  /**
   * 生成签名
   * @return string
   */
  MakeSign() {
    this.values = ksort(this.values);
    console.log(this.values);
    //签名步骤一：按字典序排序参数
    let string = this.ToUrlParams();
    console.log("raw: ", string);
    //签名步骤二：在string后加入KEY
    string = string + "&key=" + WxPayConfig.KEY;
    string = string.replace(/\s/g,"");
    console.log("string == ", string);
    //签名步骤三：MD5加密
    try {
      if (this.values['sign_type'] === 'MD5' || this.values['signType'] === 'MD5') {
        return md5(string).toUpperCase();
      } else if (this.values['sign_type'] === 'HMAC-SHA256') {
        return sha256(string, WxPayConfig.KEY).toUpperCase();
      }
    } catch (e) {
      throw  new ApiError(e.message());
    }


  }

  /**
   * 获取设置的值
   */
  GetValues() {
    return this.values;
  }
}

/**
 *
 * 接口调用结果类
 * @author yanzongzhen
 *
 */
class WxPayResults extends WxPayDataBase {
  /**
   *
   * 检测签名
   */
  CheckSign() {
    if (!this.IsSignSet()) {
      throw new ApiError("签名错误！");
    }

    let sign = this.MakeSign();
    return this.GetSign() === sign;
  }

  /**
   *
   * 使用数组初始化
   * @param array array
   */
  FromArray(array) {
    this.values = array;
  }

  /**
   *
   * 使用数组初始化对象
   * @param array array
   * @param noCheckSign
   */
  InitFromArray(array, noCheckSign = false) {
    this.FromArray(array);
    if (noCheckSign === false) {
      this.CheckSign();
    }
    return this;
  }

  /**
   *
   * 设置参数
   * @param key
   * @param value
   */
  SetData(key, value) {
    this.values[key] = value;
  }

  /**
   * 将xml转为array
   * @throws ApiError
   * @param xml
   * @param json
   */
  static async Init(xml, json=false) {
    let that = new WxPayResults();
    let res;
    if (!json) {
      res = await that.FromXml(xml);
    } else {
      res = xml;
    }
    that.FromArray(res);
    if (that.values["return_code"] !== "SUCCESS") {
      return that.GetValues();
    }
    that.CheckSign();
    return that.GetValues();
  }
}

/**
 *
 * 回调基础类
 *
 */
class WxPayNotifyReply extends WxPayDataBase {
  /**
   *
   * 设置错误码 FAIL 或者 SUCCESS
   * @param string
   */
  SetReturn_code(return_code) {
    this.values["return_code"] = return_code;
  }

  /**
   *
   * 获取错误码 FAIL 或者 SUCCESS
   * @return string return_code
   */
  GetReturn_code() {
    return this.values["return_code"];
  }

  /**
   *
   * 设置错误信息
   * @param string return_code
   */
  SetReturn_msg(return_msg) {
    this.values["return_msg"] = return_msg;
  }

  /**
   *
   * 获取错误信息
   * @return string
   */
  GetReturn_msg() {
    return this.values["return_msg"];
  }

  /**
   *
   * 设置返回参数
   * @param string key
   * @param string value
   */
  SetData(key, value) {
    this.values[key] = value;
  }
}

/**
 *
 * 统一下单输入对象
 * @author widyhu
 *
 */
class WxPayUnifiedOrder extends WxPayDataBase {
  /**
   * 设置微信分配的公众账号ID
   * @param  value
   **/
  SetAppid(value) {
    this.values["appid"] = value;
  }
  /**
   * 获取微信分配的公众账号ID的值
   * @return 值
   **/
  GetAppid() {
    return this.values["appid"];
  }
  /**
   * 设置微信子账户APPID
   * @param  value
   **/
  SetSubAppid(value) {
    this.values["sub_appid"] = value;
  }
  /**
   * 获取微信子账户APPID
   * @return 值
   **/
  GetSubAppid() {
    return this.values["sub_appid"];
  }
  /**
   * 判断微信子账户APPID是否存在
   * @return true 或 false
   **/
  IsSubAppidSet() {
    return array_key_exists("sub_appid", this.values);
  }

  /**
   * sub_openid
   * @param  value
   **/
  SetSubOpenid(value) {
    this.values["sub_openid"] = value;
  }
  /**
   * sub_openid
   * @return 值
   **/
  GetSubOpenid() {
    return this.values["sub_openid"];
  }
  /**
   * sub_openid
   * @return true 或 false
   **/
  IsSubOpenidSet() {
    return array_key_exists("sub_openid", this.values);
  }

  /**
   * 设置微信支付分配的商户号
   * @param  value
   **/
  SetMch_id(value) {
    this.values["mch_id"] = value;
  }
  /**
   * 获取微信支付分配的商户号的值
   * @return 值
   **/
  GetMch_id() {
    return this.values["mch_id"];
  }
  /**
   * 判断微信支付分配的商户号是否存在
   * @return true 或 false
   **/
  IsMch_idSet() {
    return array_key_exists("mch_id", this.values);
  }

  /**
   * 设置微信支付分配的子商户号
   * @param  value
   **/
  SetSub_Mch_id(value) {
    this.values["sub_mch_id"] = value;
  }
  /**
   * 获取微信支付分配的子商户号的值
   * @return 值
   **/
  GetSub_Mch_id() {
    return this.values["sub_mch_id"];
  }

  IsSub_Mch_idSet() {
    return array_key_exists("sub_mch_id", this.values);
  }

  /**
   * 设置微信支付分配的终端设备号，商户自定义
   * @param string value
   **/
  SetDevice_info(value) {
    this.values["device_info"] = value;
  }
  /**
   * 获取微信支付分配的终端设备号，商户自定义的值
   * @return 值
   **/
  GetDevice_info() {
    return this.values["device_info"];
  }
  /**
   * 判断微信支付分配的终端设备号，商户自定义是否存在
   * @return true 或 false
   **/
  IsDevice_infoSet() {
    return array_key_exists("device_info", this.values);
  }

  /**
   * 设置随机字符串，不长于32位。推荐随机数生成算法
   * @param  value
   **/
  SetNonce_str(value) {
    this.values["nonce_str"] = value;
  }
  /**
   * 获取随机字符串，不长于32位。推荐随机数生成算法的值
   * @return 值
   **/
  GetNonce_str() {
    return this.values["nonce_str"];
  }
  /**
   * 判断随机字符串，不长于32位。推荐随机数生成算法是否存在
   * @return true 或 false
   **/
  IsNonce_strSet() {
    return array_key_exists("nonce_str", this.values);
  }

  /**
   * 设置商品或支付单简要描述
   * @param  value
   **/
  SetBody(value) {
    this.values["body"] = value;
  }
  /**
   * 获取商品或支付单简要描述的值
   * @return 值
   **/
  GetBody() {
    return this.values["body"];
  }
  /**
   * 判断商品或支付单简要描述是否存在
   * @return true 或 false
   **/
  IsBodySet() {
    return array_key_exists("body", this.values);
  }

  /**
   * 设置商品名称明细列表
   * @param  value
   **/
  SetDetail(value) {
    this.values["detail"] = value;
  }
  /**
   * 获取商品名称明细列表的值
   * @return 值
   **/
  GetDetail() {
    return this.values["detail"];
  }
  /**
   * 判断商品名称明细列表是否存在
   * @return true 或 false
   **/
  IsDetailSet() {
    return array_key_exists("detail", this.values);
  }

  /**
   * 设置附加数据，在查询API和支付通知中原样返回，该字段主要用于商户携带订单的自定义数据
   * @param  value
   **/
  SetAttach(value) {
    this.values["attach"] = value;
  }
  /**
   * 获取附加数据，在查询API和支付通知中原样返回，该字段主要用于商户携带订单的自定义数据的值
   * @return 值
   **/
  GetAttach() {
    return this.values["attach"];
  }
  /**
   * 判断附加数据，在查询API和支付通知中原样返回，该字段主要用于商户携带订单的自定义数据是否存在
   * @return true 或 false
   **/
  IsAttachSet() {
    return array_key_exists("attach", this.values);
  }

  /**
   * 设置商户系统内部的订单号,32个字符内、可包含字母, 其他说明见商户订单号
   * @param  value
   **/
  SetOut_trade_no(value) {
    this.values["out_trade_no"] = value;
  }
  /**
   * 获取商户系统内部的订单号,32个字符内、可包含字母, 其他说明见商户订单号的值
   * @return 值
   **/
  GetOut_trade_no() {
    return this.values["out_trade_no"];
  }
  /**
   * 判断商户系统内部的订单号,32个字符内、可包含字母, 其他说明见商户订单号是否存在
   * @return true 或 false
   **/
  IsOut_trade_noSet() {
    return array_key_exists("out_trade_no", this.values);
  }

  /**
   * 设置符合ISO 4217标准的三位字母代码，默认人民币：CNY，其他值列表详见货币类型
   * @param  value
   **/
  SetFee_type(value) {
    this.values["fee_type"] = value;
  }
  /**
   * 获取符合ISO 4217标准的三位字母代码，默认人民币：CNY，其他值列表详见货币类型的值
   * @return 值
   **/
  GetFee_type() {
    return this.values["fee_type"];
  }
  /**
   * 判断符合ISO 4217标准的三位字母代码，默认人民币：CNY，其他值列表详见货币类型是否存在
   * @return true 或 false
   **/
  IsFee_typeSet() {
    return array_key_exists("fee_type", this.values);
  }

  /**
   * 设置订单总金额，只能为整数，详见支付金额
   * @param  value
   **/
  SetTotal_fee(value) {
    this.values["total_fee"] = value;
  }
  /**
   * 获取订单总金额，只能为整数，详见支付金额的值
   * @return 值
   **/
  GetTotal_fee() {
    return this.values["total_fee"];
  }
  /**
   * 判断订单总金额，只能为整数，详见支付金额是否存在
   * @return true 或 false
   **/
  IsTotal_feeSet() {
    return array_key_exists("total_fee", this.values);
  }

  /**
   * 设置APP和网页支付提交用户端ip，Native支付填调用微信支付API的机器IP。
   * @param string value
   **/
  SetSpbill_create_ip(value) {
    this.values["spbill_create_ip"] = value;
  }
  /**
   * 获取APP和网页支付提交用户端ip，Native支付填调用微信支付API的机器IP。的值
   * @return 值
   **/
  GetSpbill_create_ip() {
    return this.values["spbill_create_ip"];
  }
  /**
   * 判断APP和网页支付提交用户端ip，Native支付填调用微信支付API的机器IP。是否存在
   * @return true 或 false
   **/
  IsSpbill_create_ipSet() {
    return array_key_exists("spbill_create_ip", this.values);
  }

  /**
   * 设置订单生成时间，格式为yyyyMMddHHmmss，如2009年12月25日9点10分10秒表示为20091225091010。其他详见时间规则
   * @param string value
   **/
  SetTime_start(value) {
    this.values["time_start"] = value;
  }
  /**
   * 获取订单生成时间，格式为yyyyMMddHHmmss，如2009年12月25日9点10分10秒表示为20091225091010。其他详见时间规则的值
   * @return 值
   **/
  GetTime_start() {
    return this.values["time_start"];
  }
  /**
   * 判断订单生成时间，格式为yyyyMMddHHmmss，如2009年12月25日9点10分10秒表示为20091225091010。其他详见时间规则是否存在
   * @return true 或 false
   **/
  IsTime_startSet() {
    return array_key_exists("time_start", this.values);
  }

  /**
   * 设置订单失效时间，格式为yyyyMMddHHmmss，如2009年12月27日9点10分10秒表示为20091227091010。其他详见时间规则
   * @param string value
   **/
  SetTime_expire(value) {
    this.values["time_expire"] = value;
  }
  /**
   * 获取订单失效时间，格式为yyyyMMddHHmmss，如2009年12月27日9点10分10秒表示为20091227091010。其他详见时间规则的值
   * @return 值
   **/
  GetTime_expire() {
    return this.values["time_expire"];
  }
  /**
   * 判断订单失效时间，格式为yyyyMMddHHmmss，如2009年12月27日9点10分10秒表示为20091227091010。其他详见时间规则是否存在
   * @return true 或 false
   **/
  IsTime_expireSet() {
    return array_key_exists("time_expire", this.values);
  }

  /**
   * 设置商品标记，代金券或立减优惠功能的参数，说明详见代金券或立减优惠
   * @param string value
   **/
  SetGoods_tag(value) {
    this.values["goods_tag"] = value;
  }
  /**
   * 获取商品标记，代金券或立减优惠功能的参数，说明详见代金券或立减优惠的值
   * @return 值
   **/
  GetGoods_tag() {
    return this.values["goods_tag"];
  }
  /**
   * 判断商品标记，代金券或立减优惠功能的参数，说明详见代金券或立减优惠是否存在
   * @return true 或 false
   **/
  IsGoods_tagSet() {
    return array_key_exists("goods_tag", this.values);
  }

  /**
   * 设置接收微信支付异步通知回调地址
   * @param string value
   **/
  SetNotify_url(value) {
    this.values["notify_url"] = value;
  }
  /**
   * 获取接收微信支付异步通知回调地址的值
   * @return 值
   **/
  GetNotify_url() {
    return this.values["notify_url"];
  }
  /**
   * 判断接收微信支付异步通知回调地址是否存在
   * @return true 或 false
   **/
  IsNotify_urlSet() {
    return array_key_exists("notify_url", this.values);
  }

  /**
   * 设置取值如下：JSAPI，NATIVE，APP，详细说明见参数规定
   * @param  value
   **/
  SetTrade_type(value) {
    this.values["trade_type"] = value;
  }
  /**
   * 获取取值如下：JSAPI，NATIVE，APP，详细说明见参数规定的值
   * @return 值
   **/
  GetTrade_type() {
    return this.values["trade_type"];
  }
  /**
   * 判断取值如下：JSAPI，NATIVE，APP，详细说明见参数规定是否存在
   * @return true 或 false
   **/
  IsTrade_typeSet() {
    return array_key_exists("trade_type", this.values);
  }

  /**
   * 设置trade_type=NATIVE，此参数必传。此id为二维码中包含的商品ID，商户自行定义。
   * @param string value
   **/
  SetProduct_id(value) {
    this.values["product_id"] = value;
  }
  /**
   * 获取trade_type=NATIVE，此参数必传。此id为二维码中包含的商品ID，商户自行定义。的值
   * @return 值
   **/
  GetProduct_id() {
    return this.values["product_id"];
  }
  /**
   * 判断trade_type=NATIVE，此参数必传。此id为二维码中包含的商品ID，商户自行定义。是否存在
   * @return true 或 false
   **/
  IsProduct_idSet() {
    return array_key_exists("product_id", this.values);
  }

  /**
   * 设置trade_type=JSAPI，此参数必传，用户在商户appid下的唯一标识。下单前需要调用【网页授权获取用户信息】接口获取到用户的Openid。
   * @param  value
   **/
  SetOpenid(value) {
    this.values["openid"] = value;
  }
  /**
   * 获取trade_type=JSAPI，此参数必传，用户在商户appid下的唯一标识。下单前需要调用【网页授权获取用户信息】接口获取到用户的Openid。 的值
   * @return 值
   **/
  GetOpenid() {
    return this.values["openid"];
  }
  /**
   * 判断trade_type=JSAPI，此参数必传，用户在商户appid下的唯一标识。下单前需要调用【网页授权获取用户信息】接口获取到用户的Openid。 是否存在
   * @return true 或 false
   **/
  IsOpenidSet() {
    return array_key_exists("openid", this.values);
  }

  SetSceneInfo(value) {
    this.values["scene_info"] = value;
  }

  GetSceneInfo() {
    return this.values["scene_info"];
  }

  IsSceneInfoSet() {
    return array_key_exists("scene_info", this.values);
  }

  /**
   * 设置签名方式
   * @param  value
   **/
  SetSignType(value) {
    this.values["sign_type"] = value;
  }
  /**
   * 获取签名方式
   * @return 值
   **/
  GetSignType() {
    return this.values["sign_type"];
  }
  /**
   * 判断签名方式是否存在
   * @return true 或 false
   **/
  IsSignTypeSet() {
    return array_key_exists("sign_type", this.values);
  }
}

/**
 *
 * 订单查询输入对象
 * @author widyhu
 *
 */
class WxPayOrderQuery extends WxPayDataBase {
  /**
   * 设置微信分配的公众账号ID
   * @param string value
   **/
  SetAppid(value) {
    this.values["appid"] = value;
  }
  /**
   * 获取微信分配的公众账号ID的值
   * @return 值
   **/
  GetAppid() {
    return this.values["appid"];
  }
  /**
   * 判断微信分配的公众账号ID是否存在
   * @return true 或 false
   **/
  IsAppidSet() {
    return array_key_exists("appid", this.values);
  }

  /**
   * 设置微信支付分配的商户号
   * @param string value
   **/
  SetMch_id(value) {
    this.values["mch_id"] = value;
  }
  /**
   * 获取微信支付分配的商户号的值
   * @return 值
   **/
  GetMch_id() {
    return this.values["mch_id"];
  }
  /**
   * 判断微信支付分配的商户号是否存在
   * @return true 或 false
   **/
  IsMch_idSet() {
    return array_key_exists("mch_id", this.values);
  }

  /**
   * 设置微信支付分配的子商户号
   * @param string value
   **/
  SetSub_Mch_id(value) {
    this.values["sub_mch_id"] = value;
  }
  /**
   * 获取微信支付分配的子商户号的值
   * @return 值
   **/
  GetSub_Mch_id() {
    return this.values["sub_mch_id"];
  }

  IsSub_Mch_idSet() {
    return array_key_exists("sub_mch_id", this.values);
  }

  /**
   * 设置微信的订单号，优先使用
   * @param string value
   **/
  SetTransaction_id(value) {
    this.values["transaction_id"] = value;
  }
  /**
   * 获取微信的订单号，优先使用的值
   * @return 值
   **/
  GetTransaction_id() {
    return this.values["transaction_id"];
  }
  /**
   * 判断微信的订单号，优先使用是否存在
   * @return true 或 false
   **/
  IsTransaction_idSet() {
    return array_key_exists("transaction_id", this.values);
  }

  /**
   * 设置商户系统内部的订单号，当没提供transaction_id时需要传这个。
   * @param string value
   **/
  SetOut_trade_no(value) {
    this.values["out_trade_no"] = value;
  }
  /**
   * 获取商户系统内部的订单号，当没提供transaction_id时需要传这个。的值
   * @return 值
   **/
  GetOut_trade_no() {
    return this.values["out_trade_no"];
  }
  /**
   * 判断商户系统内部的订单号，当没提供transaction_id时需要传这个。是否存在
   * @return true 或 false
   **/
  IsOut_trade_noSet() {
    return array_key_exists("out_trade_no", this.values);
  }

  /**
   * 设置随机字符串，不长于32位。推荐随机数生成算法
   * @param string value
   **/
  SetNonce_str(value) {
    this.values["nonce_str"] = value;
  }
  /**
   * 获取随机字符串，不长于32位。推荐随机数生成算法的值
   * @return 值
   **/
  GetNonce_str() {
    return this.values["nonce_str"];
  }
  /**
   * 判断随机字符串，不长于32位。推荐随机数生成算法是否存在
   * @return true 或 false
   **/
  IsNonce_strSet() {
    return array_key_exists("nonce_str", this.values);
  }

  /**
   * 设置签名方式
   * @param  value
   **/
  SetSignType(value) {
    this.values["sign_type"] = value;
  }
  /**
   * 获取签名方式
   * @return 值
   **/
  GetSignType() {
    return this.values["sign_type"];
  }
  /**
   * 判断签名方式是否存在
   * @return true 或 false
   **/
  IsSignTypeSet() {
    return array_key_exists("sign_type", this.values);
  }
}

/**
 *
 * 关闭订单输入对象
 * @author widyhu
 *
 */
class WxPayCloseOrder extends WxPayDataBase {
  /**
   * 设置微信分配的公众账号ID
   * @param string value
   **/
  SetAppid(value) {
    this.values["appid"] = value;
  }
  /**
   * 获取微信分配的公众账号ID的值
   * @return 值
   **/
  GetAppid() {
    return this.values["appid"];
  }
  /**
   * 判断微信分配的公众账号ID是否存在
   * @return true 或 false
   **/
  IsAppidSet() {
    return array_key_exists("appid", this.values);
  }

  /**
   * 设置微信支付分配的商户号
   * @param string value
   **/
  SetMch_id(value) {
    this.values["mch_id"] = value;
  }
  /**
   * 获取微信支付分配的商户号的值
   * @return 值
   **/
  GetMch_id() {
    return this.values["mch_id"];
  }
  /**
   * 判断微信支付分配的商户号是否存在
   * @return true 或 false
   **/
  IsMch_idSet() {
    return array_key_exists("mch_id", this.values);
  }

  /**
   * 设置微信支付分配的子商户号
   * @param string value
   **/
  SetSub_Mch_id(value) {
    this.values["sub_mch_id"] = value;
  }
  /**
   * 获取微信支付分配的子商户号的值
   * @return 值
   **/
  GetSub_Mch_id() {
    return this.values["sub_mch_id"];
  }

  IsSub_Mch_idSet() {
    return array_key_exists("sub_mch_id", this.values);
  }

  /**
   * 设置商户系统内部的订单号
   * @param string value
   **/
  SetOut_trade_no(value) {
    this.values["out_trade_no"] = value;
  }
  /**
   * 获取商户系统内部的订单号的值
   * @return 值
   **/
  GetOut_trade_no() {
    return this.values["out_trade_no"];
  }
  /**
   * 判断商户系统内部的订单号是否存在
   * @return true 或 false
   **/
  IsOut_trade_noSet() {
    return array_key_exists("out_trade_no", this.values);
  }

  /**
   * 设置商户系统内部的订单号,32个字符内、可包含字母, 其他说明见商户订单号
   * @param string value
   **/
  SetNonce_str(value) {
    this.values["nonce_str"] = value;
  }
  /**
   * 获取商户系统内部的订单号,32个字符内、可包含字母, 其他说明见商户订单号的值
   * @return 值
   **/
  GetNonce_str() {
    return this.values["nonce_str"];
  }
  /**
   * 判断商户系统内部的订单号,32个字符内、可包含字母, 其他说明见商户订单号是否存在
   * @return true 或 false
   **/
  IsNonce_strSet() {
    return array_key_exists("nonce_str", this.values);
  }
}

/**
 *
 * 提交退款输入对象
 * @author widyhu
 *
 */
class WxPayRefund extends WxPayDataBase {
  /**
   * 设置微信分配的公众账号ID
   * @param string value
   **/
  SetAppid(value) {
    this.values["appid"] = value;
  }
  /**
   * 获取微信分配的公众账号ID的值
   * @return 值
   **/
  GetAppid() {
    return this.values["appid"];
  }
  /**
   * 判断微信分配的公众账号ID是否存在
   * @return true 或 false
   **/
  IsAppidSet() {
    return array_key_exists("appid", this.values);
  }

  /**
   * 设置微信支付分配的商户号
   * @param string value
   **/
  SetMch_id(value) {
    this.values["mch_id"] = value;
  }
  /**
   * 获取微信支付分配的商户号的值
   * @return 值
   **/
  GetMch_id() {
    return this.values["mch_id"];
  }
  /**
   * 判断微信支付分配的商户号是否存在
   * @return true 或 false
   **/
  IsMch_idSet() {
    return array_key_exists("mch_id", this.values);
  }

  /**
   * 设置微信支付分配的子商户号
   * @param string value
   **/
  SetSub_Mch_id(value) {
    this.values["sub_mch_id"] = value;
  }
  /**
   * 获取微信支付分配的子商户号的值
   * @return 值
   **/
  GetSub_Mch_id() {
    return this.values["sub_mch_id"];
  }

  IsSub_Mch_idSet() {
    return array_key_exists("sub_mch_id", this.values);
  }

  /**
   * 设置微信支付分配的终端设备号，与下单一致
   * @param string value
   **/
  SetDevice_info(value) {
    this.values["device_info"] = value;
  }
  /**
   * 获取微信支付分配的终端设备号，与下单一致的值
   * @return 值
   **/
  GetDevice_info() {
    return this.values["device_info"];
  }
  /**
   * 判断微信支付分配的终端设备号，与下单一致是否存在
   * @return true 或 false
   **/
  IsDevice_infoSet() {
    return array_key_exists("device_info", this.values);
  }

  /**
   * 设置随机字符串，不长于32位。推荐随机数生成算法
   * @param string value
   **/
  SetNonce_str(value) {
    this.values["nonce_str"] = value;
  }
  /**
   * 获取随机字符串，不长于32位。推荐随机数生成算法的值
   * @return 值
   **/
  GetNonce_str() {
    return this.values["nonce_str"];
  }
  /**
   * 判断随机字符串，不长于32位。推荐随机数生成算法是否存在
   * @return true 或 false
   **/
  IsNonce_strSet() {
    return array_key_exists("nonce_str", this.values);
  }

  /**
   * 设置微信订单号
   * @param string value
   **/
  SetTransaction_id(value) {
    this.values["transaction_id"] = value;
  }
  /**
   * 获取微信订单号的值
   * @return 值
   **/
  GetTransaction_id() {
    return this.values["transaction_id"];
  }
  /**
   * 判断微信订单号是否存在
   * @return true 或 false
   **/
  IsTransaction_idSet() {
    return array_key_exists("transaction_id", this.values);
  }

  /**
   * 设置商户系统内部的订单号,transaction_id、out_trade_no二选一，如果同时存在优先级：transaction_id> out_trade_no
   * @param string value
   **/
  SetOut_trade_no(value) {
    this.values["out_trade_no"] = value;
  }
  /**
   * 获取商户系统内部的订单号,transaction_id、out_trade_no二选一，如果同时存在优先级：transaction_id> out_trade_no的值
   * @return 值
   **/
  GetOut_trade_no() {
    return this.values["out_trade_no"];
  }
  /**
   * 判断商户系统内部的订单号,transaction_id、out_trade_no二选一，如果同时存在优先级：transaction_id> out_trade_no是否存在
   * @return true 或 false
   **/
  IsOut_trade_noSet() {
    return array_key_exists("out_trade_no", this.values);
  }

  /**
   * 设置商户系统内部的退款单号，商户系统内部唯一，同一退款单号多次请求只退一笔
   * @param string value
   **/
  SetOut_refund_no(value) {
    this.values["out_refund_no"] = value;
  }
  /**
   * 获取商户系统内部的退款单号，商户系统内部唯一，同一退款单号多次请求只退一笔的值
   * @return 值
   **/
  GetOut_refund_no() {
    return this.values["out_refund_no"];
  }
  /**
   * 判断商户系统内部的退款单号，商户系统内部唯一，同一退款单号多次请求只退一笔是否存在
   * @return true 或 false
   **/
  IsOut_refund_noSet() {
    return array_key_exists("out_refund_no", this.values);
  }

  /**
   * 设置订单总金额，单位为分，只能为整数，详见支付金额
   * @param string value
   **/
  SetTotal_fee(value) {
    this.values["total_fee"] = value;
  }
  /**
   * 获取订单总金额，单位为分，只能为整数，详见支付金额的值
   * @return 值
   **/
  GetTotal_fee() {
    return this.values["total_fee"];
  }
  /**
   * 判断订单总金额，单位为分，只能为整数，详见支付金额是否存在
   * @return true 或 false
   **/
  IsTotal_feeSet() {
    return array_key_exists("total_fee", this.values);
  }

  /**
   * 设置退款总金额，订单总金额，单位为分，只能为整数，详见支付金额
   * @param string value
   **/
  SetRefund_fee(value) {
    this.values["refund_fee"] = value;
  }
  /**
   * 获取退款总金额，订单总金额，单位为分，只能为整数，详见支付金额的值
   * @return 值
   **/
  GetRefund_fee() {
    return this.values["refund_fee"];
  }
  /**
   * 判断退款总金额，订单总金额，单位为分，只能为整数，详见支付金额是否存在
   * @return true 或 false
   **/
  IsRefund_feeSet() {
    return array_key_exists("refund_fee", this.values);
  }

  /**
   * 设置货币类型，符合ISO 4217标准的三位字母代码，默认人民币：CNY，其他值列表详见货币类型
   * @param string value
   **/
  SetRefund_fee_type(value) {
    this.values["refund_fee_type"] = value;
  }
  /**
   * 获取货币类型，符合ISO 4217标准的三位字母代码，默认人民币：CNY，其他值列表详见货币类型的值
   * @return 值
   **/
  GetRefund_fee_type() {
    return this.values["refund_fee_type"];
  }
  /**
   * 判断货币类型，符合ISO 4217标准的三位字母代码，默认人民币：CNY，其他值列表详见货币类型是否存在
   * @return true 或 false
   **/
  IsRefund_fee_typeSet() {
    return array_key_exists("refund_fee_type", this.values);
  }

  /**
   * 设置操作员帐号, 默认为商户号
   * @param string value
   **/
  SetOp_user_id(value) {
    this.values["op_user_id"] = value;
  }
  /**
   * 获取操作员帐号, 默认为商户号的值
   * @return 值
   **/
  GetOp_user_id() {
    return this.values["op_user_id"];
  }
  /**
   * 判断操作员帐号, 默认为商户号是否存在
   * @return true 或 false
   **/
  IsOp_user_idSet() {
    return array_key_exists("op_user_id", this.values);
  }

  /**
   * 设置接收微信异步通知回调地址
   * @param string value
   **/
  SetNotify_url(value) {
    this.values["notify_url"] = value;
  }
  /**
   * 获取接收微信异步通知回调地址的值
   * @return 值
   **/
  GetNotify_url() {
    return this.values["notify_url"];
  }
  /**
   * 判断接收微信异步通知回调地址是否存在
   * @return true 或 false
   **/
  IsNotify_urlSet() {
    return array_key_exists("notify_url", this.values);
  }
}

/**
 *
 * 退款查询输入对象
 * @author widyhu
 *
 */
class WxPayRefundQuery extends WxPayDataBase {
  /**
   * 设置微信分配的公众账号ID
   * @param string value
   **/
  SetAppid(value) {
    this.values["appid"] = value;
  }
  /**
   * 获取微信分配的公众账号ID的值
   * @return 值
   **/
  GetAppid() {
    return this.values["appid"];
  }
  /**
   * 判断微信分配的公众账号ID是否存在
   * @return true 或 false
   **/
  IsAppidSet() {
    return array_key_exists("appid", this.values);
  }

  /**
   * 设置微信支付分配的商户号
   * @param string value
   **/
  SetMch_id(value) {
    this.values["mch_id"] = value;
  }
  /**
   * 获取微信支付分配的商户号的值
   * @return 值
   **/
  GetMch_id() {
    return this.values["mch_id"];
  }
  /**
   * 判断微信支付分配的商户号是否存在
   * @return true 或 false
   **/
  IsMch_idSet() {
    return array_key_exists("mch_id", this.values);
  }

  /**
   * 设置微信支付分配的子商户号
   * @param string value
   **/
  SetSub_Mch_id(value) {
    this.values["sub_mch_id"] = value;
  }
  /**
   * 获取微信支付分配的子商户号的值
   * @return 值
   **/
  GetSub_Mch_id() {
    return this.values["sub_mch_id"];
  }

  IsSub_Mch_idSet() {
    return array_key_exists("sub_mch_id", this.values);
  }

  /**
   * 设置微信支付分配的终端设备号
   * @param string value
   **/
  SetDevice_info(value) {
    this.values["device_info"] = value;
  }
  /**
   * 获取微信支付分配的终端设备号的值
   * @return 值
   **/
  GetDevice_info() {
    return this.values["device_info"];
  }
  /**
   * 判断微信支付分配的终端设备号是否存在
   * @return true 或 false
   **/
  IsDevice_infoSet() {
    return array_key_exists("device_info", this.values);
  }

  /**
   * 设置随机字符串，不长于32位。推荐随机数生成算法
   * @param string value
   **/
  SetNonce_str(value) {
    this.values["nonce_str"] = value;
  }
  /**
   * 获取随机字符串，不长于32位。推荐随机数生成算法的值
   * @return 值
   **/
  GetNonce_str() {
    return this.values["nonce_str"];
  }
  /**
   * 判断随机字符串，不长于32位。推荐随机数生成算法是否存在
   * @return true 或 false
   **/
  IsNonce_strSet() {
    return array_key_exists("nonce_str", this.values);
  }

  /**
   * 设置微信订单号
   * @param string value
   **/
  SetTransaction_id(value) {
    this.values["transaction_id"] = value;
  }
  /**
   * 获取微信订单号的值
   * @return 值
   **/
  GetTransaction_id() {
    return this.values["transaction_id"];
  }
  /**
   * 判断微信订单号是否存在
   * @return true 或 false
   **/
  IsTransaction_idSet() {
    return array_key_exists("transaction_id", this.values);
  }

  /**
   * 设置商户系统内部的订单号
   * @param string value
   **/
  SetOut_trade_no(value) {
    this.values["out_trade_no"] = value;
  }
  /**
   * 获取商户系统内部的订单号的值
   * @return 值
   **/
  GetOut_trade_no() {
    return this.values["out_trade_no"];
  }
  /**
   * 判断商户系统内部的订单号是否存在
   * @return true 或 false
   **/
  IsOut_trade_noSet() {
    return array_key_exists("out_trade_no", this.values);
  }

  /**
   * 设置商户退款单号
   * @param string value
   **/
  SetOut_refund_no(value) {
    this.values["out_refund_no"] = value;
  }
  /**
   * 获取商户退款单号的值
   * @return 值
   **/
  GetOut_refund_no() {
    return this.values["out_refund_no"];
  }
  /**
   * 判断商户退款单号是否存在
   * @return true 或 false
   **/
  IsOut_refund_noSet() {
    return array_key_exists("out_refund_no", this.values);
  }

  /**
   * 设置微信退款单号refund_id、out_refund_no、out_trade_no、transaction_id四个参数必填一个，如果同时存在优先级为：refund_id>out_refund_no>transaction_id>out_trade_no
   * @param string value
   **/
  SetRefund_id(value) {
    this.values["refund_id"] = value;
  }
  /**
   * 获取微信退款单号refund_id、out_refund_no、out_trade_no、transaction_id四个参数必填一个，如果同时存在优先级为：refund_id>out_refund_no>transaction_id>out_trade_no的值
   * @return 值
   **/
  GetRefund_id() {
    return this.values["refund_id"];
  }
  /**
   * 判断微信退款单号refund_id、out_refund_no、out_trade_no、transaction_id四个参数必填一个，如果同时存在优先级为：refund_id>out_refund_no>transaction_id>out_trade_no是否存在
   * @return true 或 false
   **/
  IsRefund_idSet() {
    return array_key_exists("refund_id", this.values);
  }
}

/**
 *
 * 下载对账单输入对象
 * @author widyhu
 *
 */
class WxPayDownloadBill extends WxPayDataBase {
  /**
   * 设置微信分配的公众账号ID
   * @param string value
   **/
  SetAppid(value) {
    this.values["appid"] = value;
  }
  /**
   * 获取微信分配的公众账号ID的值
   * @return 值
   **/
  GetAppid() {
    return this.values["appid"];
  }
  /**
   * 判断微信分配的公众账号ID是否存在
   * @return true 或 false
   **/
  IsAppidSet() {
    return array_key_exists("appid", this.values);
  }

  /**
   * 设置微信支付分配的商户号
   * @param string value
   **/
  SetMch_id(value) {
    this.values["mch_id"] = value;
  }
  /**
   * 获取微信支付分配的商户号的值
   * @return 值
   **/
  GetMch_id() {
    return this.values["mch_id"];
  }
  /**
   * 判断微信支付分配的商户号是否存在
   * @return true 或 false
   **/
  IsMch_idSet() {
    return array_key_exists("mch_id", this.values);
  }

  /**
   * 设置微信支付分配的子商户号
   * @param string value
   **/
  SetSub_Mch_id(value) {
    this.values["sub_mch_id"] = value;
  }
  /**
   * 获取微信支付分配的子商户号的值
   * @return 值
   **/
  GetSub_Mch_id() {
    return this.values["sub_mch_id"];
  }

  IsSub_Mch_idSet() {
    return array_key_exists("sub_mch_id", this.values);
  }

  /**
   * 设置微信支付分配的终端设备号，填写此字段，只下载该设备号的对账单
   * @param string value
   **/
  SetDevice_info(value) {
    this.values["device_info"] = value;
  }
  /**
   * 获取微信支付分配的终端设备号，填写此字段，只下载该设备号的对账单的值
   * @return 值
   **/
  GetDevice_info() {
    return this.values["device_info"];
  }
  /**
   * 判断微信支付分配的终端设备号，填写此字段，只下载该设备号的对账单是否存在
   * @return true 或 false
   **/
  IsDevice_infoSet() {
    return array_key_exists("device_info", this.values);
  }

  /**
   * 设置随机字符串，不长于32位。推荐随机数生成算法
   * @param string value
   **/
  SetNonce_str(value) {
    this.values["nonce_str"] = value;
  }
  /**
   * 获取随机字符串，不长于32位。推荐随机数生成算法的值
   * @return 值
   **/
  GetNonce_str() {
    return this.values["nonce_str"];
  }
  /**
   * 判断随机字符串，不长于32位。推荐随机数生成算法是否存在
   * @return true 或 false
   **/
  IsNonce_strSet() {
    return array_key_exists("nonce_str", this.values);
  }

  /**
   * 设置下载对账单的日期，格式：20140603
   * @param string value
   **/
  SetBill_date(value) {
    this.values["bill_date"] = value;
  }
  /**
   * 获取下载对账单的日期，格式：20140603的值
   * @return 值
   **/
  GetBill_date() {
    return this.values["bill_date"];
  }
  /**
   * 判断下载对账单的日期，格式：20140603是否存在
   * @return true 或 false
   **/
  IsBill_dateSet() {
    return array_key_exists("bill_date", this.values);
  }

  /**
   * 设置ALL，返回当日所有订单信息，默认值SUCCESS，返回当日成功支付的订单REFUND，返回当日退款订单REVOKED，已撤销的订单
   * @param string value
   **/
  SetBill_type(value) {
    this.values["bill_type"] = value;
  }
  /**
   * 获取ALL，返回当日所有订单信息，默认值SUCCESS，返回当日成功支付的订单REFUND，返回当日退款订单REVOKED，已撤销的订单的值
   * @return 值
   **/
  GetBill_type() {
    return this.values["bill_type"];
  }
  /**
   * 判断ALL，返回当日所有订单信息，默认值SUCCESS，返回当日成功支付的订单REFUND，返回当日退款订单REVOKED，已撤销的订单是否存在
   * @return true 或 false
   **/
  IsBill_typeSet() {
    return array_key_exists("bill_type", this.values);
  }
}

/**
 *
 * 测速上报输入对象
 * @author widyhu
 *
 */
class WxPayReport extends WxPayDataBase {
  /**
   * 设置微信分配的公众账号ID
   * @param string value
   **/
  SetAppid(value) {
    this.values["appid"] = value;
  }
  /**
   * 获取微信分配的公众账号ID的值
   * @return 值
   **/
  GetAppid() {
    return this.values["appid"];
  }
  /**
   * 判断微信分配的公众账号ID是否存在
   * @return true 或 false
   **/
  IsAppidSet() {
    return array_key_exists("appid", this.values);
  }

  /**
   * 设置微信支付分配的商户号
   * @param string value
   **/
  SetMch_id(value) {
    this.values["mch_id"] = value;
  }
  /**
   * 获取微信支付分配的商户号的值
   * @return 值
   **/
  GetMch_id() {
    return this.values["mch_id"];
  }
  /**
   * 判断微信支付分配的商户号是否存在
   * @return true 或 false
   **/
  IsMch_idSet() {
    return array_key_exists("mch_id", this.values);
  }

  /**
   * 设置微信支付分配的子商户号
   * @param string value
   **/
  SetSub_Mch_id(value) {
    this.values["sub_mch_id"] = value;
  }
  /**
   * 获取微信支付分配的子商户号的值
   * @return 值
   **/
  GetSub_Mch_id() {
    return this.values["sub_mch_id"];
  }

  IsSub_Mch_idSet() {
    return array_key_exists("sub_mch_id", this.values);
  }

  /**
   * 设置微信支付分配的终端设备号，商户自定义
   * @param string value
   **/
  SetDevice_info(value) {
    this.values["device_info"] = value;
  }
  /**
   * 获取微信支付分配的终端设备号，商户自定义的值
   * @return 值
   **/
  GetDevice_info() {
    return this.values["device_info"];
  }
  /**
   * 判断微信支付分配的终端设备号，商户自定义是否存在
   * @return true 或 false
   **/
  IsDevice_infoSet() {
    return array_key_exists("device_info", this.values);
  }

  /**
   * 设置随机字符串，不长于32位。推荐随机数生成算法
   * @param string value
   **/
  SetNonce_str(value) {
    this.values["nonce_str"] = value;
  }
  /**
   * 获取随机字符串，不长于32位。推荐随机数生成算法的值
   * @return 值
   **/
  GetNonce_str() {
    return this.values["nonce_str"];
  }
  /**
   * 判断随机字符串，不长于32位。推荐随机数生成算法是否存在
   * @return true 或 false
   **/
  IsNonce_strSet() {
    return array_key_exists("nonce_str", this.values);
  }

  /**
   * 设置上报对应的接口的完整URL，类似：https://api.mch.weixin.qq.com/pay/unifiedorder对于被扫支付，为更好的和商户共同分析一次业务行为的整体耗时情况，对于两种接入模式，请都在门店侧对一次被扫行为进行一次单独的整体上报，上报URL指定为：https://api.mch.weixin.qq.com/pay/micropay/total关于两种接入模式具体可参考本文档章节：被扫支付商户接入模式其它接口调用仍然按照调用一次，上报一次来进行。
   * @param string value
   **/
  SetInterface_url(value) {
    this.values["interface_url"] = value;
  }
  /**
   * 获取上报对应的接口的完整URL，类似：https://api.mch.weixin.qq.com/pay/unifiedorder对于被扫支付，为更好的和商户共同分析一次业务行为的整体耗时情况，对于两种接入模式，请都在门店侧对一次被扫行为进行一次单独的整体上报，上报URL指定为：https://api.mch.weixin.qq.com/pay/micropay/total关于两种接入模式具体可参考本文档章节：被扫支付商户接入模式其它接口调用仍然按照调用一次，上报一次来进行。的值
   * @return 值
   **/
  GetInterface_url() {
    return this.values["interface_url"];
  }
  /**
   * 判断上报对应的接口的完整URL，类似：https://api.mch.weixin.qq.com/pay/unifiedorder对于被扫支付，为更好的和商户共同分析一次业务行为的整体耗时情况，对于两种接入模式，请都在门店侧对一次被扫行为进行一次单独的整体上报，上报URL指定为：https://api.mch.weixin.qq.com/pay/micropay/total关于两种接入模式具体可参考本文档章节：被扫支付商户接入模式其它接口调用仍然按照调用一次，上报一次来进行。是否存在
   * @return true 或 false
   **/
  IsInterface_urlSet() {
    return array_key_exists("interface_url", this.values);
  }

  /**
   * 设置接口耗时情况，单位为毫秒
   * @param string value
   **/
  SetExecute_time_(value) {
    this.values["execute_time_"] = value;
  }
  /**
   * 获取接口耗时情况，单位为毫秒的值
   * @return 值
   **/
  GetExecute_time_() {
    return this.values["execute_time_"];
  }
  /**
   * 判断接口耗时情况，单位为毫秒是否存在
   * @return true 或 false
   **/
  IsExecute_time_Set() {
    return array_key_exists("execute_time_", this.values);
  }

  /**
   * 设置SUCCESS/FAIL此字段是通信标识，非交易标识，交易是否成功需要查看trade_state来判断
   * @param string value
   **/
  SetReturn_code(value) {
    this.values["return_code"] = value;
  }
  /**
   * 获取SUCCESS/FAIL此字段是通信标识，非交易标识，交易是否成功需要查看trade_state来判断的值
   * @return 值
   **/
  GetReturn_code() {
    return this.values["return_code"];
  }
  /**
   * 判断SUCCESS/FAIL此字段是通信标识，非交易标识，交易是否成功需要查看trade_state来判断是否存在
   * @return true 或 false
   **/
  IsReturn_codeSet() {
    return array_key_exists("return_code", this.values);
  }

  /**
   * 设置返回信息，如非空，为错误原因签名失败参数格式校验错误
   * @param string value
   **/
  SetReturn_msg(value) {
    this.values["return_msg"] = value;
  }
  /**
   * 获取返回信息，如非空，为错误原因签名失败参数格式校验错误的值
   * @return 值
   **/
  GetReturn_msg() {
    return this.values["return_msg"];
  }
  /**
   * 判断返回信息，如非空，为错误原因签名失败参数格式校验错误是否存在
   * @return true 或 false
   **/
  IsReturn_msgSet() {
    return array_key_exists("return_msg", this.values);
  }

  /**
   * 设置SUCCESS/FAIL
   * @param string value
   **/
  SetResult_code(value) {
    this.values["result_code"] = value;
  }
  /**
   * 获取SUCCESS/FAIL的值
   * @return 值
   **/
  GetResult_code() {
    return this.values["result_code"];
  }
  /**
   * 判断SUCCESS/FAIL是否存在
   * @return true 或 false
   **/
  IsResult_codeSet() {
    return array_key_exists("result_code", this.values);
  }

  /**
   * 设置ORDERNOTEXIST—订单不存在SYSTEMERROR—系统错误
   * @param string value
   **/
  SetErr_code(value) {
    this.values["err_code"] = value;
  }
  /**
   * 获取ORDERNOTEXIST—订单不存在SYSTEMERROR—系统错误的值
   * @return 值
   **/
  GetErr_code() {
    return this.values["err_code"];
  }
  /**
   * 判断ORDERNOTEXIST—订单不存在SYSTEMERROR—系统错误是否存在
   * @return true 或 false
   **/
  IsErr_codeSet() {
    return array_key_exists("err_code", this.values);
  }

  /**
   * 设置结果信息描述
   * @param string value
   **/
  SetErr_code_des(value) {
    this.values["err_code_des"] = value;
  }
  /**
   * 获取结果信息描述的值
   * @return 值
   **/
  GetErr_code_des() {
    return this.values["err_code_des"];
  }
  /**
   * 判断结果信息描述是否存在
   * @return true 或 false
   **/
  IsErr_code_desSet() {
    return array_key_exists("err_code_des", this.values);
  }

  /**
   * 设置商户系统内部的订单号,商户可以在上报时提供相关商户订单号方便微信支付更好的提高服务质量。
   * @param string value
   **/
  SetOut_trade_no(value) {
    this.values["out_trade_no"] = value;
  }
  /**
   * 获取商户系统内部的订单号,商户可以在上报时提供相关商户订单号方便微信支付更好的提高服务质量。 的值
   * @return 值
   **/
  GetOut_trade_no() {
    return this.values["out_trade_no"];
  }
  /**
   * 判断商户系统内部的订单号,商户可以在上报时提供相关商户订单号方便微信支付更好的提高服务质量。 是否存在
   * @return true 或 false
   **/
  IsOut_trade_noSet() {
    return array_key_exists("out_trade_no", this.values);
  }

  /**
   * 设置发起接口调用时的机器IP
   * @param string value
   **/
  SetUser_ip(value) {
    this.values["user_ip"] = value;
  }
  /**
   * 获取发起接口调用时的机器IP 的值
   * @return 值
   **/
  GetUser_ip() {
    return this.values["user_ip"];
  }
  /**
   * 判断发起接口调用时的机器IP 是否存在
   * @return true 或 false
   **/
  IsUser_ipSet() {
    return array_key_exists("user_ip", this.values);
  }

  /**
   * 设置系统时间，格式为yyyyMMddHHmmss，如2009年12月27日9点10分10秒表示为20091227091010。其他详见时间规则
   * @param string value
   **/
  SetTime(value) {
    this.values["time"] = value;
  }
  /**
   * 获取系统时间，格式为yyyyMMddHHmmss，如2009年12月27日9点10分10秒表示为20091227091010。其他详见时间规则的值
   * @return 值
   **/
  GetTime() {
    return this.values["time"];
  }
  /**
   * 判断系统时间，格式为yyyyMMddHHmmss，如2009年12月27日9点10分10秒表示为20091227091010。其他详见时间规则是否存在
   * @return true 或 false
   **/
  IsTimeSet() {
    return array_key_exists("time", this.values);
  }
}

/**
 *
 * 短链转换输入对象
 * @author widyhu
 *
 */
class WxPayShortUrl extends WxPayDataBase {
  /**
   * 设置微信分配的公众账号ID
   * @param string value
   **/
  SetAppid(value) {
    this.values["appid"] = value;
  }
  /**
   * 获取微信分配的公众账号ID的值
   * @return 值
   **/
  GetAppid() {
    return this.values["appid"];
  }
  /**
   * 判断微信分配的公众账号ID是否存在
   * @return true 或 false
   **/
  IsAppidSet() {
    return array_key_exists("appid", this.values);
  }

  /**
   * 设置微信支付分配的商户号
   * @param string value
   **/
  SetMch_id(value) {
    this.values["mch_id"] = value;
  }
  /**
   * 获取微信支付分配的商户号的值
   * @return 值
   **/
  GetMch_id() {
    return this.values["mch_id"];
  }
  /**
   * 判断微信支付分配的商户号是否存在
   * @return true 或 false
   **/
  IsMch_idSet() {
    return array_key_exists("mch_id", this.values);
  }

  /**
   * 设置微信支付分配的子商户号
   * @param string value
   **/
  SetSub_Mch_id(value) {
    this.values["sub_mch_id"] = value;
  }
  /**
   * 获取微信支付分配的子商户号的值
   * @return 值
   **/
  GetSub_Mch_id() {
    return this.values["sub_mch_id"];
  }

  IsSub_Mch_idSet() {
    return array_key_exists("sub_mch_id", this.values);
  }

  /**
   * 设置需要转换的URL，签名用原串，传输需URL encode
   * @param string value
   **/
  SetLong_url(value) {
    this.values["long_url"] = value;
  }
  /**
   * 获取需要转换的URL，签名用原串，传输需URL encode的值
   * @return 值
   **/
  GetLong_url() {
    return this.values["long_url"];
  }
  /**
   * 判断需要转换的URL，签名用原串，传输需URL encode是否存在
   * @return true 或 false
   **/
  IsLong_urlSet() {
    return array_key_exists("long_url", this.values);
  }

  /**
   * 设置随机字符串，不长于32位。推荐随机数生成算法
   * @param string value
   **/
  SetNonce_str(value) {
    this.values["nonce_str"] = value;
  }
  /**
   * 获取随机字符串，不长于32位。推荐随机数生成算法的值
   * @return 值
   **/
  GetNonce_str() {
    return this.values["nonce_str"];
  }
  /**
   * 判断随机字符串，不长于32位。推荐随机数生成算法是否存在
   * @return true 或 false
   **/
  IsNonce_strSet() {
    return array_key_exists("nonce_str", this.values);
  }
}

/**
 *
 * 提交被扫输入对象
 * @author widyhu
 *
 */
class WxPayMicroPay extends WxPayDataBase {
  /**
   * 设置微信分配的公众账号ID
   * @param string value
   **/
  SetAppid(value) {
    this.values["appid"] = value;
  }
  /**
   * 获取微信分配的公众账号ID的值
   * @return 值
   **/
  GetAppid() {
    return this.values["appid"];
  }
  /**
   * 判断微信分配的公众账号ID是否存在
   * @return true 或 false
   **/
  IsAppidSet() {
    return array_key_exists("appid", this.values);
  }

  /**
   * 设置微信支付分配的商户号
   * @param string value
   **/
  SetMch_id(value) {
    this.values["mch_id"] = value;
  }
  /**
   * 获取微信支付分配的商户号的值
   * @return 值
   **/
  GetMch_id() {
    return this.values["mch_id"];
  }
  /**
   * 判断微信支付分配的商户号是否存在
   * @return true 或 false
   **/
  IsMch_idSet() {
    return array_key_exists("mch_id", this.values);
  }

  /**
   * 设置微信支付分配的子商户号
   * @param string value
   **/
  SetSub_Mch_id(value) {
    this.values["sub_mch_id"] = value;
  }
  /**
   * 获取微信支付分配的子商户号的值
   * @return 值
   **/
  GetSub_Mch_id() {
    return this.values["sub_mch_id"];
  }

  IsSub_Mch_idSet() {
    return array_key_exists("sub_mch_id", this.values);
  }

  /**
   * 设置终端设备号(商户自定义，如门店编号)
   * @param string value
   **/
  SetDevice_info(value) {
    this.values["device_info"] = value;
  }
  /**
   * 获取终端设备号(商户自定义，如门店编号)的值
   * @return 值
   **/
  GetDevice_info() {
    return this.values["device_info"];
  }
  /**
   * 判断终端设备号(商户自定义，如门店编号)是否存在
   * @return true 或 false
   **/
  IsDevice_infoSet() {
    return array_key_exists("device_info", this.values);
  }

  /**
   * 设置随机字符串，不长于32位。推荐随机数生成算法
   * @param string value
   **/
  SetNonce_str(value) {
    this.values["nonce_str"] = value;
  }
  /**
   * 获取随机字符串，不长于32位。推荐随机数生成算法的值
   * @return 值
   **/
  GetNonce_str() {
    return this.values["nonce_str"];
  }
  /**
   * 判断随机字符串，不长于32位。推荐随机数生成算法是否存在
   * @return true 或 false
   **/
  IsNonce_strSet() {
    return array_key_exists("nonce_str", this.values);
  }

  /**
   * 设置商品或支付单简要描述
   * @param string value
   **/
  SetBody(value) {
    this.values["body"] = value;
  }
  /**
   * 获取商品或支付单简要描述的值
   * @return 值
   **/
  GetBody() {
    return this.values["body"];
  }
  /**
   * 判断商品或支付单简要描述是否存在
   * @return true 或 false
   **/
  IsBodySet() {
    return array_key_exists("body", this.values);
  }

  /**
   * 设置商品名称明细列表
   * @param string value
   **/
  SetDetail(value) {
    this.values["detail"] = value;
  }
  /**
   * 获取商品名称明细列表的值
   * @return 值
   **/
  GetDetail() {
    return this.values["detail"];
  }
  /**
   * 判断商品名称明细列表是否存在
   * @return true 或 false
   **/
  IsDetailSet() {
    return array_key_exists("detail", this.values);
  }

  /**
   * 设置附加数据，在查询API和支付通知中原样返回，该字段主要用于商户携带订单的自定义数据
   * @param string value
   **/
  SetAttach(value) {
    this.values["attach"] = value;
  }
  /**
   * 获取附加数据，在查询API和支付通知中原样返回，该字段主要用于商户携带订单的自定义数据的值
   * @return 值
   **/
  GetAttach() {
    return this.values["attach"];
  }
  /**
   * 判断附加数据，在查询API和支付通知中原样返回，该字段主要用于商户携带订单的自定义数据是否存在
   * @return true 或 false
   **/
  IsAttachSet() {
    return array_key_exists("attach", this.values);
  }

  /**
   * 设置商户系统内部的订单号,32个字符内、可包含字母, 其他说明见商户订单号
   * @param string value
   **/
  SetOut_trade_no(value) {
    this.values["out_trade_no"] = value;
  }
  /**
   * 获取商户系统内部的订单号,32个字符内、可包含字母, 其他说明见商户订单号的值
   * @return 值
   **/
  GetOut_trade_no() {
    return this.values["out_trade_no"];
  }
  /**
   * 判断商户系统内部的订单号,32个字符内、可包含字母, 其他说明见商户订单号是否存在
   * @return true 或 false
   **/
  IsOut_trade_noSet() {
    return array_key_exists("out_trade_no", this.values);
  }

  /**
   * 设置订单总金额，单位为分，只能为整数，详见支付金额
   * @param string value
   **/
  SetTotal_fee(value) {
    this.values["total_fee"] = value;
  }
  /**
   * 获取订单总金额，单位为分，只能为整数，详见支付金额的值
   * @return 值
   **/
  GetTotal_fee() {
    return this.values["total_fee"];
  }
  /**
   * 判断订单总金额，单位为分，只能为整数，详见支付金额是否存在
   * @return true 或 false
   **/
  IsTotal_feeSet() {
    return array_key_exists("total_fee", this.values);
  }

  /**
   * 设置符合ISO 4217标准的三位字母代码，默认人民币：CNY，其他值列表详见货币类型
   * @param string value
   **/
  SetFee_type(value) {
    this.values["fee_type"] = value;
  }
  /**
   * 获取符合ISO 4217标准的三位字母代码，默认人民币：CNY，其他值列表详见货币类型的值
   * @return 值
   **/
  GetFee_type() {
    return this.values["fee_type"];
  }
  /**
   * 判断符合ISO 4217标准的三位字母代码，默认人民币：CNY，其他值列表详见货币类型是否存在
   * @return true 或 false
   **/
  IsFee_typeSet() {
    return array_key_exists("fee_type", this.values);
  }

  /**
   * 设置调用微信支付API的机器IP
   * @param string value
   **/
  SetSpbill_create_ip(value) {
    this.values["spbill_create_ip"] = value;
  }
  /**
   * 获取调用微信支付API的机器IP 的值
   * @return 值
   **/
  GetSpbill_create_ip() {
    return this.values["spbill_create_ip"];
  }
  /**
   * 判断调用微信支付API的机器IP 是否存在
   * @return true 或 false
   **/
  IsSpbill_create_ipSet() {
    return array_key_exists("spbill_create_ip", this.values);
  }

  /**
   * 设置订单生成时间，格式为yyyyMMddHHmmss，如2009年12月25日9点10分10秒表示为20091225091010。详见时间规则
   * @param string value
   **/
  SetTime_start(value) {
    this.values["time_start"] = value;
  }
  /**
   * 获取订单生成时间，格式为yyyyMMddHHmmss，如2009年12月25日9点10分10秒表示为20091225091010。详见时间规则的值
   * @return 值
   **/
  GetTime_start() {
    return this.values["time_start"];
  }
  /**
   * 判断订单生成时间，格式为yyyyMMddHHmmss，如2009年12月25日9点10分10秒表示为20091225091010。详见时间规则是否存在
   * @return true 或 false
   **/
  IsTime_startSet() {
    return array_key_exists("time_start", this.values);
  }

  /**
   * 设置订单失效时间，格式为yyyyMMddHHmmss，如2009年12月27日9点10分10秒表示为20091227091010。详见时间规则
   * @param string value
   **/
  SetTime_expire(value) {
    this.values["time_expire"] = value;
  }
  /**
   * 获取订单失效时间，格式为yyyyMMddHHmmss，如2009年12月27日9点10分10秒表示为20091227091010。详见时间规则的值
   * @return 值
   **/
  GetTime_expire() {
    return this.values["time_expire"];
  }
  /**
   * 判断订单失效时间，格式为yyyyMMddHHmmss，如2009年12月27日9点10分10秒表示为20091227091010。详见时间规则是否存在
   * @return true 或 false
   **/
  IsTime_expireSet() {
    return array_key_exists("time_expire", this.values);
  }

  /**
   * 设置商品标记，代金券或立减优惠功能的参数，说明详见代金券或立减优惠
   * @param string value
   **/
  SetGoods_tag(value) {
    this.values["goods_tag"] = value;
  }
  /**
   * 获取商品标记，代金券或立减优惠功能的参数，说明详见代金券或立减优惠的值
   * @return 值
   **/
  GetGoods_tag() {
    return this.values["goods_tag"];
  }
  /**
   * 判断商品标记，代金券或立减优惠功能的参数，说明详见代金券或立减优惠是否存在
   * @return true 或 false
   **/
  IsGoods_tagSet() {
    return array_key_exists("goods_tag", this.values);
  }

  /**
   * 设置扫码支付授权码，设备读取用户微信中的条码或者二维码信息
   * @param string value
   **/
  SetAuth_code(value) {
    this.values["auth_code"] = value;
  }
  /**
   * 获取扫码支付授权码，设备读取用户微信中的条码或者二维码信息的值
   * @return 值
   **/
  GetAuth_code() {
    return this.values["auth_code"];
  }
  /**
   * 判断扫码支付授权码，设备读取用户微信中的条码或者二维码信息是否存在
   * @return true 或 false
   **/
  IsAuth_codeSet() {
    return array_key_exists("auth_code", this.values);
  }
}

/**
 *
 * 撤销输入对象
 * @author widyhu
 *
 */
class WxPayReverse extends WxPayDataBase {
  /**
   * 设置微信分配的公众账号ID
   * @param string value
   **/
  SetAppid(value) {
    this.values["appid"] = value;
  }
  /**
   * 获取微信分配的公众账号ID的值
   * @return 值
   **/
  GetAppid() {
    return this.values["appid"];
  }
  /**
   * 判断微信分配的公众账号ID是否存在
   * @return true 或 false
   **/
  IsAppidSet() {
    return array_key_exists("appid", this.values);
  }

  /**
   * 设置微信支付分配的商户号
   * @param string value
   **/
  SetMch_id(value) {
    this.values["mch_id"] = value;
  }
  /**
   * 获取微信支付分配的商户号的值
   * @return 值
   **/
  GetMch_id() {
    return this.values["mch_id"];
  }
  /**
   * 判断微信支付分配的商户号是否存在
   * @return true 或 false
   **/
  IsMch_idSet() {
    return array_key_exists("mch_id", this.values);
  }

  /**
   * 设置微信支付分配的子商户号
   * @param string value
   **/
  SetSub_Mch_id(value) {
    this.values["sub_mch_id"] = value;
  }
  /**
   * 获取微信支付分配的子商户号的值
   * @return 值
   **/
  GetSub_Mch_id() {
    return this.values["sub_mch_id"];
  }

  IsSub_Mch_idSet() {
    return array_key_exists("sub_mch_id", this.values);
  }

  /**
   * 设置微信的订单号，优先使用
   * @param string value
   **/
  SetTransaction_id(value) {
    this.values["transaction_id"] = value;
  }
  /**
   * 获取微信的订单号，优先使用的值
   * @return 值
   **/
  GetTransaction_id() {
    return this.values["transaction_id"];
  }
  /**
   * 判断微信的订单号，优先使用是否存在
   * @return true 或 false
   **/
  IsTransaction_idSet() {
    return array_key_exists("transaction_id", this.values);
  }

  /**
   * 设置商户系统内部的订单号,transaction_id、out_trade_no二选一，如果同时存在优先级：transaction_id> out_trade_no
   * @param string value
   **/
  SetOut_trade_no(value) {
    this.values["out_trade_no"] = value;
  }
  /**
   * 获取商户系统内部的订单号,transaction_id、out_trade_no二选一，如果同时存在优先级：transaction_id> out_trade_no的值
   * @return 值
   **/
  GetOut_trade_no() {
    return this.values["out_trade_no"];
  }
  /**
   * 判断商户系统内部的订单号,transaction_id、out_trade_no二选一，如果同时存在优先级：transaction_id> out_trade_no是否存在
   * @return true 或 false
   **/
  IsOut_trade_noSet() {
    return array_key_exists("out_trade_no", this.values);
  }

  /**
   * 设置随机字符串，不长于32位。推荐随机数生成算法
   * @param string value
   **/
  SetNonce_str(value) {
    this.values["nonce_str"] = value;
  }
  /**
   * 获取随机字符串，不长于32位。推荐随机数生成算法的值
   * @return 值
   **/
  GetNonce_str() {
    return this.values["nonce_str"];
  }
  /**
   * 判断随机字符串，不长于32位。推荐随机数生成算法是否存在
   * @return true 或 false
   **/
  IsNonce_strSet() {
    return array_key_exists("nonce_str", this.values);
  }
}

/**
 *
 * 提交JSAPI输入对象
 * @author widyhu
 *
 */
class WxPayJsApiPay extends WxPayDataBase {
  /**
   * 设置微信分配的公众账号ID
   * @param string value
   **/
  SetAppid(value) {
    this.values["appId"] = value;
  }
  /**
   * 获取微信分配的公众账号ID的值
   * @return 值
   **/
  GetAppid() {
    return this.values["appId"];
  }
  /**
   * 判断微信分配的公众账号ID是否存在
   * @return true 或 false
   **/
  IsAppidSet() {
    return array_key_exists("appId", this.values);
  }

  /**
   * 设置支付时间戳
   * @param  value
   **/
  SetTimeStamp(value) {
    this.values["timeStamp"] = value;
  }
  /**
   * 获取支付时间戳的值
   * @return 值
   **/
  GetTimeStamp() {
    return this.values["timeStamp"];
  }
  /**
   * 判断支付时间戳是否存在
   * @return true 或 false
   **/
  IsTimeStampSet() {
    return array_key_exists("timeStamp", this.values);
  }

  /**
   * 随机字符串
   * @param string value
   **/
  SetNonceStr(value) {
    this.values["nonceStr"] = value;
  }
  /**
   * 获取notify随机字符串值
   * @return 值
   **/
  GetNonceStr() {
    return this.values["nonceStr"];
  }
  /**
   * 判断随机字符串是否存在
   * @return true 或 false
   **/
  IsNonceStrSet() {
    return array_key_exists("nonceStr", this.values);
  }

  /**
   * 设置订单详情扩展字符串
   * @param  value
   **/
  SetPackage(value) {
    this.values["package"] = value;
  }
  /**
   * 获取订单详情扩展字符串的值
   * @return 值
   **/
  GetPackage() {
    return this.values["package"];
  }
  /**
   * 判断订单详情扩展字符串是否存在
   * @return true 或 false
   **/
  IsPackageSet() {
    return array_key_exists("package", this.values);
  }

  /**
   * 设置签名方式
   * @param  value
   **/
  SetPaySign(value) {
    this.values["paySign"] = value;
  }
  /**
   * 获取签名方式
   * @return 值
   **/
  GetPaySign() {
    return this.values["paySign"];
  }
  /**
   * 判断签名方式是否存在
   * @return true 或 false
   **/
  IsPaySignSet() {
    return array_key_exists("paySign", this.values);
  }

  /**
   * 设置签名方式
   * @param  value
   **/
  SetSignType(value) {
    this.values["signType"] = value;
  }
  /**
   * 获取签名方式
   * @return 值
   **/
  GetSignType() {
    return this.values["signType"];
  }
  /**
   * 判断签名方式是否存在
   * @return true 或 false
   **/
  IsSignTypeSet() {
    return array_key_exists("signType", this.values);
  }
}

/**
 *
 * 扫码支付模式一生成二维码参数
 * @author widyhu
 *
 */
class WxPayBizPayUrl extends WxPayDataBase {
  /**
   * 设置微信分配的公众账号ID
   * @param string value
   **/
  SetAppid(value) {
    this.values["appid"] = value;
  }
  /**
   * 获取微信分配的公众账号ID的值
   * @return 值
   **/
  GetAppid() {
    return this.values["appid"];
  }
  /**
   * 判断微信分配的公众账号ID是否存在
   * @return true 或 false
   **/
  IsAppidSet() {
    return array_key_exists("appid", this.values);
  }

  /**
   * 设置微信支付分配的商户号
   * @param string value
   **/
  SetMch_id(value) {
    this.values["mch_id"] = value;
  }
  /**
   * 获取微信支付分配的商户号的值
   * @return 值
   **/
  GetMch_id() {
    return this.values["mch_id"];
  }
  /**
   * 判断微信支付分配的商户号是否存在
   * @return true 或 false
   **/
  IsMch_idSet() {
    return array_key_exists("mch_id", this.values);
  }

  /**
   * 设置微信支付分配的子商户号
   * @param string value
   **/
  SetSub_Mch_id(value) {
    this.values["sub_mch_id"] = value;
  }
  /**
   * 获取微信支付分配的子商户号的值
   * @return 值
   **/
  GetSub_Mch_id() {
    return this.values["sub_mch_id"];
  }

  IsSub_Mch_idSet() {
    return array_key_exists("sub_mch_id", this.values);
  }

  /**
   * 设置支付时间戳
   * @param string value
   **/
  SetTime_stamp(value) {
    this.values["time_stamp"] = value;
  }
  /**
   * 获取支付时间戳的值
   * @return 值
   **/
  GetTime_stamp() {
    return this.values["time_stamp"];
  }
  /**
   * 判断支付时间戳是否存在
   * @return true 或 false
   **/
  IsTime_stampSet() {
    return array_key_exists("time_stamp", this.values);
  }

  /**
   * 设置随机字符串
   * @param string value
   **/
  SetNonce_str(value) {
    this.values["nonce_str"] = value;
  }
  /**
   * 获取随机字符串的值
   * @return 值
   **/
  GetNonce_str() {
    return this.values["nonce_str"];
  }
  /**
   * 判断随机字符串是否存在
   * @return true 或 false
   **/
  IsNonce_strSet() {
    return array_key_exists("nonce_str", this.values);
  }

  /**
   * 设置商品ID
   * @param string value
   **/
  SetProduct_id(value) {
    this.values["product_id"] = value;
  }
  /**
   * 获取商品ID的值
   * @return 值
   **/
  GetProduct_id() {
    return this.values["product_id"];
  }
  /**
   * 判断商品ID是否存在
   * @return true 或 false
   **/
  IsProduct_idSet() {
    return array_key_exists("product_id", this.values);
  }
}


module.exports = {
    WxPayResults: WxPayResults,
    WxPayNotifyReply: WxPayNotifyReply,
    WxPayUnifiedOrder: WxPayUnifiedOrder,
    WxPayOrderQuery: WxPayOrderQuery,
    WxPayCloseOrder: WxPayCloseOrder,
    WxPayRefund: WxPayRefund,
    WxPayRefundQuery: WxPayRefundQuery,
    WxPayDownloadBill: WxPayDownloadBill,
    WxPayReport: WxPayReport,
    WxPayShortUrl: WxPayShortUrl,
    WxPayMicroPay: WxPayMicroPay,
    WxPayReverse: WxPayReverse,
    WxPayJsApiPay: WxPayJsApiPay,
    WxPayBizPayUrl: WxPayBizPayUrl
};
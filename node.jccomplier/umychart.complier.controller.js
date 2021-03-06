/////////////////////////////////////////////////////////////////////////
// 通达信语法 webapi 处理类
//

var JSComplier=require('./umychart.complier.node').JSCommonComplier.JSComplier;


////////////////////////////////////////////////////////////////////////////
// 单脚本  多股票 返回数据>0的股票
//  symbol:[] 股票列表
//  code: 脚本
//  args: 脚本参数 (可选)
//  datecount: 日线数据计算多少天 (可选)
//  daycount： 分钟数据计算多少天 (可选)
//  calccount: 最后统计几天的数据 (可选) 默认1天
//  period:  周期 0=日线 1=周线 2=月线 3=年线 4=1分钟 5=5分钟 6=15分钟 7=30分钟 8=60分钟 (可选)
//  right:   复权 0 不复权 1 前复权 2 后复权(可选)
//  
/*  post 数据:
{
    "symbol":["600000.sh","000001.sz","000008.sz","000017.sz","000056.sz","000338.sz","000408.sz","000415.sz","000498.sz","000557.sz"],
    "code":"LC:= REF(CLOSE,1);RSI1:=SMA(MAX(CLOSE-LC,0),6,1)/SMA(ABS(CLOSE-LC),6,1)*100;OUT:CROSS(RSI1,20);"
    "args":[{"name":"N1","value":10},{"name":"N2","value":12}],
    "datecount":200, 
    "calccount":50
}

返回数据
{
    "ticket":131,
    "data":
    [
        {"date":20181022,"symbols":["000008.sz"],"values":[1]},
        {"date":20181019,"symbols":["000008.sz"],"values":[1]}
    ],
    "code":"VAR2:EVERY(VOL>MA(REF(VOL,1),20)*1.5,3);","error":[]}
*/

function JSComplierController(req,res,next)
{
    this.Request=req;
    this.Response=res;
    this.Next=next;

    this.DateCount=300;
    this.DayCount=20;
    this.Period=0;
    this.Right=0;
    this.CalculateCount=1;

    this.StockList;
    this.Code;
    this.StartTime=new Date();

    this.Result={};     //返回数据
    this.CacheData;
    this.ErrorMessage=[];      //脚本执行错误
    
    this.Post=function()
    {
        var postData=this.Request.body;
        if (!postData) return this.Error({Message:'post data is empty'});

        this.StockList=postData.symbol;
        if (!this.StockList || !this.StockList.length) return this.Error({Message:'symbol is empty'});

        this.Code=postData.code;
        if (!this.Code) return this.Error({Message:'code is empty'});

        var args=[];
        if (postData.args) 
        {
            for(let i in postData.args) //变量全部转成大写
            {
                var item=postData.args[i];
                if (item.name) args.push({Name:item.name, Value:parseFloat(item.value)});  //变量值转数值型
            }
        }

        if (postData.datecount) this.DateCount=postData.datecount;
        if (postData.daycount) this.DayCount=postData.daycount;
        if (postData.period) this.Period=postData.period;
        if (postData.right) this.Right=postData.right;
        if (postData.calccount) this.CalculateCount=postData.calccount;

        var self=this;
        this.CacheData=new Map();

        for(let i in this.StockList)
        {
            var symbol=this.StockList[i];
            let option=
            {
                HQDataType:0,
                Symbol:symbol, Name:null,Data:null,
                MaxReqeustDataCount:this.DateCount, MaxRequestMinuteDayCount:this.DayCount,
                Right:this.Right, Period:this.Period,
                Arguments:args,
                CallbackParam: { Symbol:symbol },
                Callback:function(data,param)       //数据计算完成回调
                { 
                    self.RecvExecuteData(data,param);
                },
                ErrorCallback:function(e,param)
                {
                    self.ErrorExecute(e,param);
                }
            }

            var run=JSComplier.Execute(this.Code,option);
        };

        next();
    }

    this.Get=function()
    {

    }

    //执行脚本返回数据
    this.RecvExecuteData=function(data,param)  
    {
        console.log(data);  //单个股票计算结果
        this.CacheData.set(param.Symbol,data);

        if (this.CacheData.size==this.StockList.length) //等所有股票计算完了 返回数据 result
        {
            this.SendResult();
        }
    }

    //执行脚本错误
    this.ErrorExecute=function(e,param)
    {
        this.CacheData.set(param.Symbol,null);

        this.ErrorMessage.push({Symbol:param.Symbol, Error:e});    //错误信息保存

        if (this.CacheData.size==this.StockList.length) //等所有股票计算完了 返回数据 result
        {
           this.SendResult();
        }
    }

    //统计结果
    this.AnalysisData=function(data) 
    {
        var result=new Map();       //key=日期  Value={Symbol:, Value:}
        for(let item of data)
        {
            var stockData=item[1];
            if (stockData==null || !stockData.length) continue;

            var outData=stockData[0];
            if (!outData.Data || !outData.Data.length) continue;

            var klineData=null;
            for(let i in stockData)
            {
                var itemData=stockData[i];
                if (itemData.Type===100 && itemData.Name==='TradeDate' && itemData.Data.length>outData.Data.length-1)
                {
                    klineData=itemData;
                    break;
                }
            }
            if (!klineData || !klineData.Data || !klineData.Data.length) continue;
            if (klineData.Data.length!=outData.Data.length) continue;

            for(let i=outData.Data.length-1, j=0; i>=0 && j<this.CalculateCount; --i, ++j)
            {
                var value=outData.Data[i];
                if (!value) continue;
                var date=klineData.Data[i];
                if (!date) continue;

                if (result.has(date)) 
                {
                    var temp=result.get(date);
                    temp.Symbols.push(item[0]);
                    temp.Values.push(value);
                }
                else 
                {
                    result.set(date, { Symbols:[item[0]], Values:[value] });
                }
            }
        }

        return result;
    }

    this.SendResult=function()
    {
        this.Result.Data=this.AnalysisData(this.CacheData);
        var nowDate=new Date();
        this.Result.Ticket=nowDate.getTime() - this.StartTime.getTime();

        var data=[];
        for(let item of this.Result.Data)
        {
            data.push({date:item[0], symbols:item[1].Symbols, values:item[1].Values});
        }

        //字段全部小写
        var result={ ticket:this.Result.Ticket, data:data, code:this.Code, error:this.ErrorMessage };
        this.Response.header("Access-Control-Allow-Origin", "*");
        this.Response.send(result);
    }

    this.Error=function(e)
    {

    }
}

JSComplierController.Post=function(req, res, next)
{
    var controller=new JSComplierController(req,res,next);
    controller.Post();
}


///////////////////////////////////////////////////////////////////////
// 多脚本 多股票  交集|并集 开发中
//  symbol:[] 股票列表
//  script[{code:脚本,args:[]脚本参数 (可选)}]:   脚本列表
//  datecount: 日线数据计算多少天 (可选)
//  daycount： 分钟数据计算多少天 (可选)
//  calccount:50 最后统计几天的数据 (可选) 默认1天
//  period:  周期 0=日线 1=周线 2=月线 3=年线 4=1分钟 5=5分钟 6=15分钟 7=30分钟 8=60分钟 (可选)
//  right:   复权 0 不复权 1 前复权 2 后复权(可选)
//  mergetype: 0 脚本都满足  1 有1个脚本满足
//  
/*  post 数据:
{
    "symbol":["600000.sh","000001.sz","000008.sz","000017.sz","000056.sz","000338.sz","000408.sz","000415.sz","000498.sz","000557.sz"],
    script:
    [
        {
            "code":"LC:= REF(CLOSE,1);RSI1:=SMA(MAX(CLOSE-LC,0),6,1)/SMA(ABS(CLOSE-LC),6,1)*100;OUT:CROSS(RSI1,20);"
            "args":[{"name":"N1","value":10},{"name":"N2","value":12}
        },
    ],
    "datecount":200, 
    "mergetype": 0
}
*/
function JSCommonMultiComplier(req,res,next)
{
    this.Request=req;
    this.Response=res;
    this.Next=next;

    this.DateCount=300;
    this.DayCount=20;
    this.Period=0;
    this.Right=0;
    this.CalculateCount=1;

    this.StockList;
    this.Script=[];
    this.StartTime=new Date();
    this.MergeType=0; //0 脚本都满足  1 有1个脚本满足

    this.Result={};     //返回数据
    this.CacheData;

    this.SetScript=function(script)
    {
        if (!script || !script.length) return false;

        for(let i in script)
        {
            var item=script[i];
            if (!item.code) continue;

            var args=[];
            if (item.args && item.args.length)
            {
                var argItem=item.args[i];
                if (argItem.name) args.push({Name:argItem.name, Value:parseFloat(argItem.value)});  //变量值转数值型
            }

            this.Script.push({Code:item.code, Arguments:args});
        }

        return this.Script.length>0;
    }


    this.Post=function()
    {
        var postData=this.Request.body;
        if (!postData) return this.Error({Message:'post data is empty'});

        this.StockList=postData.symbol;
        if (!this.StockList || !this.StockList.length) return this.Error({Message:'symbol is empty'});

        if (!this.SetScript(postData.script)) return this.Error({Message:'code is empty'});

        if (postData.mergetype>=0) this.MergeType=postData.mergetype;
        if (postData.datecount) this.DateCount=postData.datecount;
        if (postData.daycount) this.DayCount=postData.daycount;
        if (postData.period) this.Period=postData.period;
        if (postData.right) this.Right=postData.right;
        if (postData.calccount) this.CalculateCount=postData.calccount;

        var self=this;
        this.CacheData=new Map();
        var scriptID=0;
        for(let i in this.StockList)
        {
            var symbol=this.StockList[i];
            let option=
            {
                HQDataType:0,
                Symbol:symbol, Name:null,Data:null,
                MaxReqeustDataCount:this.DateCount, MaxRequestMinuteDayCount:this.DayCount,
                Right:this.Right, Period:this.Period,
                Arguments:this.Script[scriptID].Arguments,
                CallbackParam: { Symbol:symbol, ScriptID:scriptID, Cache:null },   //脚本索引, 数据缓存
                Callback:function(data,param)                                    //数据计算完成回调
                { 
                    self.RecvExecuteData(data,param);
                },
                ErrorCallback:function(e,param)
                {
                    self.ErrorExecute(e,param);
                }
            }

            var run=JSComplier.Execute(this.Script[scriptID].Code,option);
        };

        next();
    }

    this.RecvExecuteData=function(data,param)
    {
        var analysis=this.AnalysisExecuteData(data,param);

        if (!analysis && this.MergeType===0)
        {
            this.CacheData.set(param.Symbol,null);
        }
        else if (param.ScriptID>=this.Script.length-1)  //脚本都跑完了
        {
            this.CacheData.set(param.Symbol,param.Cache);
        }
        else
        {
            this.RunNextScript(param);
            return;
        }

        if (this.CacheData.size==this.StockList.length) //等所有股票计算完了 返回数据 result
        {
            this.SendResult();
            return;
        }
            
        next();
    }

    //执行下一个脚本
    this.RunNextScript=function(param)  
    {
        var self=this;
        param.ScriptID+=1;

        let option=
        {
            HQDataType:0,
            Symbol:param.Symbol, Name:null,Data:null,
            MaxReqeustDataCount:this.DateCount, MaxRequestMinuteDayCount:this.DayCount,
            Right:this.Right, Period:this.Period,
            Arguments:this.Script[param.ScriptID].Arguments,
            CallbackParam: param,   //脚本索引
            Callback:function(data,param)                          //数据计算完成回调
            { 
                self.RecvExecuteData(data,param);
            },
            ErrorCallback:function(e,param)
            {
                self.ErrorExecute(e,param);
            }
        }

        var run=JSComplier.Execute(this.Script[param.ScriptID].Code,option);

        next();
    }

    //执行脚本错误
    this.ErrorExecute=function(e,param)
    {
        this.RecvExecuteData(null,param)
    }

    //分析单个脚本执行结果
    this.AnalysisExecuteData=function(data, param)
    {
        if (!data || !data.length) return null;
        
        var outData=data[0];
        if (!outData || !outData.Data.length) return null;

        var klineData=null;
        for(let i in data)
        {
            var item=data[i];
            if (item.Type===100 && item.Name==='TradeDate')
            {
                klineData=item;
                break;
            }
        }
        if (!klineData || !klineData.Data.length) return null;
        if (outData.Data.length!=klineData.Data.length) return null;

        var analysisData=[];
        for(let i=outData.Data.length-1, j=0; i>0 && j<this.CalculateCount; ++j, --i)
        {
            var value=outData.Data[i];
            if (!value) continue;
            var date=klineData.Data[i];
            if (!date) continue;

            analysisData.push({Date:date,Value:value});
        }

        if (!param.Cache)
        {
            param.Cache=new Map();
            for(let i in analysisData)
            {
                var item=analysisData[i];
                param.Cache.set(item.Date, { Date:item.Date, ScriptID:[param.ScriptID] } );
            }
        }
        else
        {
            if (this.mergetype==0)
            {
                var mergeData=new Map();    //合并数据
                for(let i in analysisData)  //取交集
                {
                    var item=analysisData[i];
                    if (param.Cache.has(item.Date))
                    {
                        var value=param.Cache.get(item.Date);
                        value.Script.push(param.ScriptID);
                        mergeData.set(item.Date, value);
                    }
                }
                param.Cache=mergeData;
            }
            else
            {
                for(let i in analysisData)  //取并集
                {
                    var item=analysisData[i];
                    if (param.Cache.has(item.Date))
                    {
                        var value=param.Cache.get(item.Date);
                        value.ScriptID.push(param.ScriptID);
                    }
                    else
                    {
                        param.Cache.set(item.Date, { Date:item.Date, ScriptID:[param.ScriptID] });
                    }
                }
            }

        }

        return param.Cache.size;
    }

    this.SendResult=function()
    {
        var dateMap=new Map(); // Key=日期  [Value={Symbol:, ScriptID:[], Value:[]}
        for(let item of this.CacheData)
        {
            var stockData=item[1];
            if (!stockData) continue;

            for(let dateitem of stockData)
            {
                if (dateMap.has(dateitem[0]))
                {
                    var temp=dateMap.get(dateitem[0]);
                    temp.push({Symbol:item[0], ScriptID:dateitem[1].ScriptID});
                }
                else
                {
                    dateMap.set(dateitem[0], [{Symbol:item[0], ScriptID:dateitem[1].ScriptID}]);
                }
            }
        }

        var resultData=[];
        for(let item of dateMap)
        {
            var symbols=[];
            for(let i in item[1])
            {
                symbols.push(item[1][i].Symbol);
            }

            resultData.push({date:item[0], symbols:symbols});
        }
        
        var nowDate=new Date();
        this.Result.Ticket=nowDate.getTime() - this.StartTime.getTime();

        //字段全部小写
        var result={ ticket:this.Result.Ticket, data:resultData };
        this.Response.header("Access-Control-Allow-Origin", "*");
        this.Response.send(result);
    }
}

JSCommonMultiComplier.Post=function(req, res, next)
{
    var controller=new JSCommonMultiComplier(req,res,next);
    controller.Post();
}


//导出统一使用JSCommon命名空间名
module.exports =
{
    JSCommonComplierController:
    {
        JSComplierController: JSComplierController,
        JSCommonMultiComplier: JSCommonMultiComplier,
    },

};


/*  
//测试用例
var server = restify.createServer({name:'jccomplier.testserver'});
server.use(restify.plugins.bodyParser());   //支持json post
server.use(restify.plugins.fullResponse()); //跨域
server.use(restify.plugins.gzipResponse()); //支持压缩

server.post('/api/jscomplier',JSComplierController.Post);
server.post('/api/jsmcomplier',JSCommonMultiComplier.Post);

server.listen(18080, function() 
{
  console.log('%s listening at %s', server.name, server.url);
});
*/
/*
    copyright (c) 2018 jones

    http://www.apache.org/licenses/LICENSE-2.0

    开源项目 https://github.com/jones2000/HQChart

    jones_2000@163.com
    
    标题画法
*/

import 
{
    JSCommonResource_Global_JSChartResource as g_JSChartResource,
} from './umychart.resource.wechat.js'

import 
{
    JSCommon_ChartData as ChartData, JSCommon_HistoryData as HistoryData,
    JSCommon_SingleData as SingleData, JSCommon_MinuteData as MinuteData,
    JSCommon_CUSTOM_DAY_PERIOD_START as CUSTOM_DAY_PERIOD_START,
    JSCommon_CUSTOM_DAY_PERIOD_END as CUSTOM_DAY_PERIOD_END,
    JSCommon_CUSTOM_MINUTE_PERIOD_START as CUSTOM_MINUTE_PERIOD_START,
    JSCommon_CUSTOM_MINUTE_PERIOD_END as CUSTOM_MINUTE_PERIOD_END,
} from "./umychart.data.wechat.js";

import 
{ 
    JSCommonCoordinateData as JSCommonCoordinateData 
} from "./umychart.coordinatedata.wechat.js";

import 
{
    JSCommon_KLINE_INFO_TYPE as KLINE_INFO_TYPE,
} from "./umychart.klineinfo.wechat.js";

import 
{
    JSCommonSplit_IFrameSplitOperator as IFrameSplitOperator,
} from './umychart.framesplit.wechat.js'

var MARKET_SUFFIX_NAME = JSCommonCoordinateData.MARKET_SUFFIX_NAME;

//标题画法基类
function IChartTitlePainting() 
{
    this.Frame;
    this.Data = new Array();
    this.Canvas;                        //画布
    this.IsDynamic = false;               //是否是动态标题
    this.Position = 0;                    //标题显示位置 0 框架里的标题  1 框架上面
    this.CursorIndex;                   //数据索引
    this.Font = g_JSChartResource.DynamicTitleFont;//"12px 微软雅黑";
    this.Title;                         //固定标题(可以为空)
    this.TitleColor = g_JSChartResource.DefaultTextColor;
    this.UpdateUICallback;              //通知外面更新标题
}

var PERIOD_NAME = ["日线", "周线", "月线", "年线", "1分", "5分", "15分", "30分", "60分", "季线", "分笔", "2小时", "4小时", "", ""];
var RIGHT_NAME = ['不复权', '前复权', '后复权'];
//K线标题
function DynamicKLineTitlePainting() 
{
    this.newMethod = IChartTitlePainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.IsDynamic = true;
    this.IsShow = true;       //是否显示
    this.LineCount = 1;         //默认显示1行
    this.SpaceWidth = 1;        //空格宽度    

    this.UpColor = g_JSChartResource.UpTextColor;
    this.DownColor = g_JSChartResource.DownTextColor;
    this.UnchagneColor = g_JSChartResource.UnchagneTextColor;

    this.VolColor = g_JSChartResource.DefaultTextColor;
    this.AmountColor = g_JSChartResource.DefaultTextColor;
    this.DateTimeColor = g_JSChartResource.DefaultTextColor;
    this.NameColor = g_JSChartResource.DefaultTextColor;

    this.Symbol;
    this.Name;
    this.InfoData;
    this.InfoTextHeight = 15;
    this.InfoTextColor = g_JSChartResource.KLine.Info.TextColor;
    this.InfoTextBGColor = g_JSChartResource.KLine.Info.TextBGColor;

    this.IsShowName = true;           //是否显示股票名称
    this.IsShowSettingInfo = true;    //是否显示设置信息(周期 复权)

    this.GetCurrentKLineData = function () //获取当天鼠标位置所在的K线数据
    {
        if (this.CursorIndex == null || !this.Data) return null;
        if (this.Data.length <= 0) return null;

        var index = this.CursorIndex;
        index = parseInt(index.toFixed(0));
        var dataIndex = this.Data.DataOffset + index;
        if (dataIndex >= this.Data.Data.length) dataIndex = this.Data.Data.length - 1;
        if (dataIndex < 0) return null;

        var item = this.Data.Data[dataIndex];
        return item;
    }

    this.GetDataIndex=function()
    {
        if (this.CursorIndex == null || !this.Data) return null;
        if (this.Data.length <= 0) return null;

        var index = this.CursorIndex;
        index = parseInt(index.toFixed(0));
        var dataIndex = this.Data.DataOffset + index;
        if (dataIndex >= this.Data.Data.length) dataIndex = this.Data.Data.length - 1;
        if (dataIndex < 0) return null;

        return dataIndex;
    }

    this.SendUpdateUIMessage = function (funcName) //通知外面 标题变了
    {
        if (!this.UpdateUICallback) return;

        var sendData = {
            TitleName: 'K线标题', CallFunction: funcName, Stock: { Name: this.Name, Symbol: this.Symbol, },
            Rect:
            {
                Left: this.Frame.ChartBorder.GetLeft(), Right: this.Frame.ChartBorder.GetRight(),
                Top: 0, Bottom: this.Frame.ChartBorder.GetTop(),
            }
        };

        //有数据
        if (this.Data && this.Data.Data && this.Data.Data.length > 0) {
            let index = this.Data.Data.length - 1;    //默认最后一天的数据
            if (this.CursorIndex) {
                let cursorIndex = Math.abs(this.CursorIndex - 0.5);
                cursorIndex = parseInt(cursorIndex.toFixed(0));
                index = this.Data.DataOffset + cursorIndex;
                if (index >= this.Data.Data.length) index = this.Data.Data.length - 1;
            }

            if (index >= 0) {
                let item = this.Data.Data[index];
                sendData.Stock.Data =
                    {
                        Date: item.Date,
                        YClose: item.YClose, Open: item.Open, High: item.High, Low: item.Low, Close: item.Close,
                        Vol: item.Vol, Amount: item.Amount
                    }
                if (item.Time) sendData.Stock.Time = item.Time;  //分钟K线才有时间
            }

            if (this.Data.Period != null) sendData.Stock.PeriodName = this.GetPeriodName(this.Data.Period);   //周期名字
            if (this.Data.Right != null) sendData.Stock.RightName = RIGHT_NAME[this.Data.Right];       //复权名字
        }

        //console.log('[DynamicKLineTitlePainting::SendUpdateUIMessage', sendData);
        this.UpdateUICallback(sendData);
    }

    this.GetPeriodName = function (period) {
        var name = '';
        if (period > CUSTOM_MINUTE_PERIOD_START && period <= CUSTOM_MINUTE_PERIOD_END)
            name = (period - CUSTOM_MINUTE_PERIOD_START) + '分';
        else if (period > CUSTOM_DAY_PERIOD_START && period <= CUSTOM_DAY_PERIOD_END)
            name = (period - CUSTOM_DAY_PERIOD_START) + '日';
        else
            name = PERIOD_NAME[period];
        return name;
    }

    this.DrawTitle = function () {
        this.SendUpdateUIMessage('DrawTitle');

        if (!this.IsShow) return;
        if (!this.IsShowName && !this.IsShowSettingInfo) return;
        if (this.LineCount > 1) return;

        if (this.Frame.IsHScreen === true) {
            this.Canvas.save();
            this.HScreenDrawTitle();
            this.Canvas.restore();
            return;
        }

        var left = this.Frame.ChartBorder.GetLeft();
        var bottom = this.Frame.ChartBorder.GetTop();
        var right = this.Frame.ChartBorder.GetRight();
        if (bottom < 5) return;

        this.Canvas.textAlign = "left";
        this.Canvas.textBaseline = "bottom";
        this.Canvas.font = this.Font;
        var position = { Left: left, Bottom: bottom, IsHScreen: false };

        if (this.IsShowName && this.Name) 
        {
            if (!this.DrawKLineText(this.Name, this.NameColor, position)) return;
        }

        if (this.IsShowSettingInfo && this.Data.Period != null && this.Data.Right != null) 
        {
            var periodName = this.GetPeriodName(this.Data.Period);
            var rightName = RIGHT_NAME[this.Data.Right];
            var isIndex = MARKET_SUFFIX_NAME.IsSHSZIndex(this.Symbol); //是否是指数
            var text = "(" + periodName + " " + rightName + ")";
            if (ChartData.IsMinutePeriod(this.Data.Period, true) || isIndex) text = "(" + periodName + ")";//分钟K线 或 指数没有复权
            if (!this.DrawKLineText(text, this.DateTimeColor, position)) return;
        }
    }

    this.HScreenDrawTitle = function () {
        var xText = this.Frame.ChartBorder.GetRight();
        var yText = this.Frame.ChartBorder.GetTop();
        var right = this.Frame.ChartBorder.GetHeight();
        if (this.Frame.ChartBorder.Right < 10) return;

        this.Canvas.translate(xText, yText);
        this.Canvas.rotate(90 * Math.PI / 180);

        this.Canvas.textAlign = "left";
        this.Canvas.textBaseline = "bottom";
        this.Canvas.font = this.Font;

        var left = 2;
        var bottom = -2;
        var position = { Left: left, Bottom: bottom, IsHScreen: false };
        if (this.IsShowName && this.Name) 
        {
            if (!this.DrawKLineText(this.Name, this.NameColor, position)) return;
        }

        if (this.IsShowSettingInfo && this.Data.Period != null && this.Data.Right != null) 
        {
            var periodName = this.GetPeriodName(this.Data.Period);
            var rightName = RIGHT_NAME[this.Data.Right];
            var text = "(" + periodName + " " + rightName + ")";
            var isIndex = MARKET_SUFFIX_NAME.IsSHSZIndex(this.Symbol); //是否是指数
            if (this.Data.Period >= 4 || isIndex) text = "(" + periodName + ")";
            if (!this.DrawKLineText(text, this.DateTimeColor, position)) return;
        }
    }

    this.DrawMulitLine = function (item) //画多行
    {
        var isHScreen = this.Frame.IsHScreen === true;
        var leftSpace = 1;
        var bottomSpace = 1;
        var left = this.Frame.ChartBorder.GetLeft() + leftSpace;;
        var width = this.Frame.ChartBorder.GetWidth();
        var height = this.Frame.ChartBorder.GetTop();
        var defaultfloatPrecision = JSCommonCoordinateData.GetfloatPrecision(this.Symbol);//价格小数位数
        if (isHScreen) {
            var left = leftSpace;;
            var width = this.Frame.ChartBorder.GetHeight();
            var height = this.Frame.ChartBorder.Right;
            var xText = this.Frame.ChartBorder.GetChartWidth();
            var yText = this.Frame.ChartBorder.GetTop();

            this.Canvas.translate(xText, yText);
            this.Canvas.rotate(90 * Math.PI / 180);
        }

        var itemHeight = (height - bottomSpace) / this.LineCount;
        var itemWidth = (width - leftSpace) / 4;
        var bottom = itemHeight;

        this.Canvas.textAlign = "left";
        this.Canvas.textBaseline = "bottom";
        this.Canvas.font = this.Font;

        var text = IFrameSplitOperator.FormatDateString(item.Date);
        this.Canvas.fillStyle = this.UnchagneColor;
        this.Canvas.fillText(text, left, bottom, itemWidth);
        left += itemWidth;

        this.Canvas.textAlign = "left";
        this.Canvas.fillStyle = this.GetColor(item.Open, item.YClose);
        var text = "开:" + item.Open.toFixed(defaultfloatPrecision);
        this.Canvas.fillText(text, left, bottom, itemWidth);
        left += itemWidth;

        this.Canvas.fillStyle = this.GetColor(item.High, item.YClose);
        var text = "高:" + item.High.toFixed(defaultfloatPrecision);
        this.Canvas.fillText(text, left, bottom, itemWidth);
        left += itemWidth;

        var value = (item.Close - item.YClose) / item.YClose * 100;
        this.Canvas.fillStyle = this.GetColor(value, 0);
        var text = "幅:" + value.toFixed(2) + '%';
        this.Canvas.fillText(text, left, bottom, itemWidth);
        left += itemWidth;

        bottom += itemHeight;   //换行
        var left = this.Frame.ChartBorder.GetLeft() + leftSpace;
        if (isHScreen) left = leftSpace;
        if (item.Time != null && !isNaN(item.Time) && item.Time > 0) {
            this.Canvas.fillStyle = this.UnchagneColor;
            var text = IFrameSplitOperator.FormatTimeString(item.Time);
            this.Canvas.fillText(text, left, bottom, itemWidth);
        }
        left += itemWidth;

        this.Canvas.fillStyle = this.GetColor(item.Close, item.YClose);
        var text = "收:" + item.Close.toFixed(defaultfloatPrecision);
        this.Canvas.fillText(text, left, bottom, itemWidth);
        left += itemWidth;

        this.Canvas.fillStyle = this.GetColor(item.Low, item.YClose);
        var text = "低:" + item.Low.toFixed(defaultfloatPrecision);
        this.Canvas.fillText(text, left, bottom, itemWidth);
        left += itemWidth;

        this.Canvas.fillStyle = this.AmountColor;
        var text = "额:" + IFrameSplitOperator.FormatValueString(item.Amount, 2);
        this.Canvas.fillText(text, left, bottom, itemWidth);
        left += itemWidth;
    }

    this.DrawSingleLine = function (item)  //画单行
    {
        var isHScreen = this.Frame.IsHScreen === true;
        var left = this.Frame.ChartBorder.GetLeft();
        //var bottom=this.Frame.ChartBorder.GetTop()-this.Frame.ChartBorder.Top/2;
        var bottom = this.Frame.ChartBorder.GetTop();
        var right = this.Frame.ChartBorder.GetRight();
        var defaultfloatPrecision = JSCommonCoordinateData.GetfloatPrecision(this.Symbol);//价格小数位数

        if (isHScreen) {
            right = this.Frame.ChartBorder.GetHeight();
            if (this.Frame.ChartBorder.Right < 5) return;
            left = 2;
            bottom = -2;
            var xText = this.Frame.ChartBorder.GetRight();
            var yText = this.Frame.ChartBorder.GetTop();
            this.Canvas.translate(xText, yText);
            this.Canvas.rotate(90 * Math.PI / 180);
        }
        else {
            if (bottom < 5) return;
        }

        this.Canvas.textAlign = "left";
        this.Canvas.textBaseline = "bottom";
        this.Canvas.font = this.Font;

        var position = { Left: left, Bottom: bottom, IsHScreen: isHScreen };

        if (this.IsShowName) //名称
        {
            if (!this.DrawKLineText(this.Name, this.UnchagneColor, position, false)) return;
        }

        if (this.IsShowSettingInfo) //周期 复权信息
        {
            this.Canvas.fillStyle = this.UnchagneColor;
            var periodName = this.GetPeriodName(this.Data.Period);
            var rightName = RIGHT_NAME[this.Data.Right];
            var text = "(" + periodName + " " + rightName + ")";
            var isIndex = MARKET_SUFFIX_NAME.IsSHSZIndex(this.Symbol); //是否是指数
            if (item.Time != null || isIndex) text = "(" + periodName + ")";
            if (!this.DrawKLineText(text, this.UnchagneColor, position, false)) return;
        }

        var text = IFrameSplitOperator.FormatDateString(item.Date); //日期
        if (!this.DrawKLineText(text, this.UnchagneColor, position)) return;

        if (item.Time != null && !isNaN(item.Time) && item.Time > 0) //时间
        {
            var text = IFrameSplitOperator.FormatTimeString(item.Time);
            if (!this.DrawKLineText(text, this.UnchagneColor, position)) return;
        }

        var color = this.GetColor(item.Open, item.YClose);
        var text = "开:" + item.Open.toFixed(defaultfloatPrecision);
        if (!this.DrawKLineText(text, color, position)) return;

        var color = this.GetColor(item.High, item.YClose);
        var text = "高:" + item.High.toFixed(defaultfloatPrecision);
        if (!this.DrawKLineText(text, color, position)) return;

        var color = this.GetColor(item.Low, item.YClose);
        var text = "低:" + item.Low.toFixed(defaultfloatPrecision);
        if (!this.DrawKLineText(text, color, position)) return;

        var color = this.GetColor(item.Close, item.YClose);
        var text = "收:" + item.Close.toFixed(defaultfloatPrecision);
        if (!this.DrawKLineText(text, color, position)) return;

        var text = "量:" + IFrameSplitOperator.FormatValueString(item.Vol, 2);
        if (!this.DrawKLineText(text, this.VolColor, position)) return;

        var text = "额:" + IFrameSplitOperator.FormatValueString(item.Amount, 2);
        if (!this.DrawKLineText(text, this.AmountColor, position)) return;
    }

    this.Draw = function () {
        this.SendUpdateUIMessage('Draw');

        if (!this.IsShow) return;
        if (this.CursorIndex == null || !this.Data) return;
        if (this.Data.length <= 0) return;

        this.SpaceWidth = this.Canvas.measureText(' ').width;
        var index = Math.abs(this.CursorIndex - 0.5);
        index = parseInt(index.toFixed(0));
        var dataIndex = this.Data.DataOffset + index;
        if (dataIndex >= this.Data.Data.length) dataIndex = this.Data.Data.length - 1;
        if (dataIndex < 0) return;

        var item = this.Data.Data[dataIndex];

        if (this.Frame.IsHScreen === true) {
            this.Canvas.save();
            if (this.LineCount > 1) this.DrawMulitLine(item);
            else this.DrawSingleLine(item);
            this.Canvas.restore();
            if (!item.Time && item.Date && this.InfoData) this.HSCreenKLineInfoDraw(item.Date);
        }
        else {
            if (this.LineCount > 1) this.DrawMulitLine(item);
            else this.DrawSingleLine(item);

            if (!item.Time && item.Date && this.InfoData) this.KLineInfoDraw(item.Date);
        }
    }


    this.KLineInfoDraw = function (date) {
        var info = this.InfoData.get(date.toString());
        if (!info) return;
        var invesotrCount = 0;    //互动易统计
        var researchCouunt = 0;
        var reportCount = 0;
        var blockTradeCount = 0;  //大宗交易次数
        var tradeDetailCount = 0; //龙虎榜上榜次数
        var policyData = null;
        var reportTitle = null, pforecastTitle = null;
        //console.log(info);
        for (var i in info.Data) {
            var item = info.Data[i];
            switch (item.InfoType) {
                case KLINE_INFO_TYPE.INVESTOR:
                    ++invesotrCount;
                    break;
                case KLINE_INFO_TYPE.PFORECAST:
                    pforecastTitle = item.Title;
                    break;
                case KLINE_INFO_TYPE.ANNOUNCEMENT:
                    ++reportCount;
                    break;
                case KLINE_INFO_TYPE.ANNOUNCEMENT_QUARTER_1:
                case KLINE_INFO_TYPE.ANNOUNCEMENT_QUARTER_2:
                case KLINE_INFO_TYPE.ANNOUNCEMENT_QUARTER_3:
                case KLINE_INFO_TYPE.ANNOUNCEMENT_QUARTER_4:
                    reportTitle = item.Title;
                    break;
                case KLINE_INFO_TYPE.RESEARCH:
                    ++researchCouunt;
                    break;
                case KLINE_INFO_TYPE.BLOCKTRADING:
                    ++blockTradeCount;
                    break;
                case KLINE_INFO_TYPE.TRADEDETAIL:
                    ++tradeDetailCount;
                    break;
                case KLINE_INFO_TYPE.POLICY:
                    policyData = item;
                    break;
            }
        }

        var isHScreen = (this.Frame.IsHScreen === true);
        var right = this.Frame.ChartBorder.GetRight() - 4;
        var top = this.Frame.ChartBorder.GetTopEx();
        if (isHScreen) {
            right = this.Frame.ChartBorder.GetBottom() - 4;
            top = this.Frame.ChartBorder.GetRightEx();
            this.Canvas.translate(top, right);
            this.Canvas.rotate(90 * Math.PI / 180);
            right = 0; top = 0;
        }

        this.Canvas.font = this.Font;

        var aryTitle = [];
        var position = { Top: top, Right: right, IsHScreen: isHScreen };

        aryTitle.push(IFrameSplitOperator.FormatDateString(date));
        if (reportTitle) aryTitle.push(reportTitle);        //季报
        if (pforecastTitle) aryTitle.push(pforecastTitle);  //业绩预告  
        if (reportCount > 0) aryTitle.push('公告数量:' + reportCount);
        if (researchCouunt > 0) aryTitle.push('机构调研次数:' + researchCouunt);
        if (tradeDetailCount > 0) aryTitle.push('龙虎榜上榜次数:' + tradeDetailCount);
        if (invesotrCount > 0) aryTitle.push('互动易数量:' + invesotrCount);
        if (blockTradeCount > 0) aryTitle.push('大宗交易次数:' + blockTradeCount);
        if (policyData) //策略选股
        {
            for (let i in policyData.ExtendData)    //显示满足的策略
            {
                aryTitle.push(policyData.ExtendData[i].Name);
            }
        }

        var maxWidth = 0, textBGHeight = 0;
        for (let i in aryTitle) {
            var item = aryTitle[i];
            var textWidth = this.Canvas.measureText(item).width + 2;    //后空2个像素
            if (maxWidth < textWidth) maxWidth = textWidth;
            textBGHeight += this.InfoTextHeight;
        }

        this.Canvas.fillStyle = this.InfoTextBGColor;
        if (isHScreen) this.Canvas.fillRect(position.Right - maxWidth, position.Top, maxWidth + 2, textBGHeight + 2);
        else this.Canvas.fillRect(position.Right - maxWidth, position.Top, maxWidth + 2, textBGHeight + 2);

        for (let i in aryTitle) {
            var item = aryTitle[i];
            this.DrawInfoText(item, position);
        }
    }

    this.HSCreenKLineInfoDraw = function (date) {
        this.Canvas.save();
        this.KLineInfoDraw(date);
        this.Canvas.restore();
    }

    this.GetColor = function (price, yclse) {
        if (price > yclse) return this.UpColor;
        else if (price < yclse) return this.DownColor;
        else return this.UnchagneColor;
    }

    this.DrawInfoText = function (title, position) {
        if (!title) return true;

        this.Canvas.textAlign = "right";
        this.Canvas.textBaseline = "top";
        this.Canvas.fillStyle = this.InfoTextColor;
        this.Canvas.fillText(title, position.Right, position.Top);
        position.Top += this.InfoTextHeight;
        return true;
    }

    this.DrawKLineText = function (title, color, position, isShow) {
        if (!title) return true;

        var isHScreen = this.Frame.IsHScreen === true;
        var right = this.Frame.ChartBorder.GetRight();
        if (isHScreen) right = this.Frame.ChartBorder.GetHeight();

        this.Canvas.fillStyle = color;
        var textWidth = this.Canvas.measureText(title).width;
        if (position.Left + textWidth > right) return false;
        if (!(isShow === false)) this.Canvas.fillText(title, position.Left, position.Bottom, textWidth);

        position.Left += textWidth + this.SpaceWidth;
        return true;
    }

}

//分时图标题
function DynamicMinuteTitlePainting() 
{
    this.newMethod = DynamicKLineTitlePainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.YClose;
    this.IsShowDate = false;  //标题是否显示日期
    this.IsShowName = true;   //标题是否显示股票名字
    this.Symbol;
    this.LastShowData;  //保存最后显示的数据 给tooltip用

    this.GetCurrentKLineData = function () //获取当天鼠标位置所在的K线数据
    {
        if (this.LastShowData) return this.LastShowData;
        if (this.CursorIndex == null || !this.Data) return null;
        if (this.Data.length <= 0) return null;

        var index = Math.abs(this.CursorIndex - 0.5);
        index = parseInt(index.toFixed(0));
        var dataIndex = this.Data.DataOffset + index;
        if (dataIndex >= this.Data.Data.length) dataIndex = this.Data.Data.length - 1;
        if (dataIndex < 0) return null;

        var item = this.Data.Data[dataIndex];
        return item;
    }

    this.SendUpdateUIMessage = function (funcName) //通知外面 标题变了
    {
        if (!this.UpdateUICallback) return;

        var sendData =
        {
            TitleName: '分钟标题', CallFunction: funcName, Stock: { Name: this.Name, Symbol: this.Symbol, },
            Rect:
            {
                Left: this.Frame.ChartBorder.GetLeft(), Right: this.Frame.ChartBorder.GetRight(),
                Top: 0, Bottom: this.Frame.ChartBorder.GetTop(),
            }
        };

        //有数据
        if (this.Data && this.Data.Data && this.Data.Data.length > 0) {
            let index = this.Data.Data.length - 1;    //默认最后1分钟的数据
            if (this.CursorIndex) {
                let cursorIndex = Math.abs(this.CursorIndex - 0.5);
                cursorIndex = parseInt(cursorIndex.toFixed(0));
                index = this.Data.DataOffset + cursorIndex;
                if (index >= this.Data.Data.length) index = this.Data.Data.length - 1;
            }

            if (index >= 0) {
                let item = this.Data.Data[index];
                this.LastShowData = item;
                sendData.Stock.Data =
                    {
                        Time: item.Time, Close: item.Close, AvPrice: item.AvPrice,
                        Vol: item.Vol, Amount: item.Amount
                    }
                if (item.Time) sendData.Stock.Time = item.Time;  //分钟K线才有时间
            }
        }
        this.UpdateUICallback(sendData);
    }

    this.DrawTitle = function () {
        this.SendUpdateUIMessage('DrawTitle');
    }

    this.GetDecimal = function (symbol) {
        return JSCommonCoordinateData.GetfloatPrecision(symbol);//价格小数位数
    }

    this.DrawMulitLine = function (item) //画多行
    {
        var leftSpace = 5;
        var bottomSpace = 2;
        var left = this.Frame.ChartBorder.GetLeft() + leftSpace;;
        var right = this.Frame.ChartBorder.GetRight();
        var width = this.Frame.ChartBorder.GetWidth();
        var height = this.Frame.ChartBorder.GetTop();

        var defaultfloatPrecision = this.GetDecimal(this.Symbol);    //价格小数位数
        var itemHeight = (height - bottomSpace) / this.LineCount;
        var bottom = itemHeight;

        this.Canvas.textAlign = "left";
        this.Canvas.textBaseline = "bottom";
        this.Canvas.font = this.Font;
        this.Canvas.fillStyle = this.UnchagneColor;

        this.Canvas.fillStyle = this.UnchagneColor;
        var text = IFrameSplitOperator.FormatDateTimeString(item.DateTime, this.IsShowDate ? 'YYYY-MM-DD' : 'HH-MM');
        var timeWidth = this.Canvas.measureText(text).width + 5;    //后空5个像素
        this.Canvas.fillText(text, left, bottom, timeWidth);

        if (this.IsShowDate) {
            var text = IFrameSplitOperator.FormatDateTimeString(item.DateTime, 'HH-MM');
            this.Canvas.fillText(text, left, bottom + itemHeight, timeWidth);
        }

        var itemWidth = (width - leftSpace - timeWidth) / 2;
        left += timeWidth;

        if (item.Close != null) {
            this.Canvas.fillStyle = this.GetColor(item.Close, this.YClose);
            var text = "价:" + item.Close.toFixed(defaultfloatPrecision);
            this.Canvas.fillText(text, left, bottom, itemWidth);
            left += itemWidth;
        }

        if (item.Increase != null) {
            this.Canvas.fillStyle = this.GetColor(item.Increase, 0);
            var text = "幅:" + item.Increase.toFixed(2) + '%';
            this.Canvas.fillText(text, left, bottom, itemWidth);
            left += itemWidth;
        }

        bottom += itemHeight;   //换行
        var left = this.Frame.ChartBorder.GetLeft() + leftSpace + timeWidth;

        this.Canvas.fillStyle = this.VolColor;
        var text = "量:" + IFrameSplitOperator.FormatValueString(item.Vol, 2);
        this.Canvas.fillText(text, left, bottom, itemWidth);
        left += itemWidth;

        this.Canvas.fillStyle = this.AmountColor;
        var text = "额:" + IFrameSplitOperator.FormatValueString(item.Amount, 2);
        this.Canvas.fillText(text, left, bottom, itemWidth);
        left += itemWidth;
    }

    this.DrawItem = function (item) {
        var isHScreen = this.Frame.IsHScreen === true;
        var left = this.Frame.ChartBorder.GetLeft();;
        var bottom = this.Frame.ChartBorder.GetTop() - this.Frame.ChartBorder.Top / 2;
        var right = this.Frame.ChartBorder.GetRight();
        var defaultfloatPrecision = this.GetDecimal(this.Symbol);    //价格小数位数

        if (isHScreen) {
            if (this.Frame.ChartBorder.Right < 5) return;
            var left = 2;
            var bottom = this.Frame.ChartBorder.Right / 2;    //上下居中显示
            var right = this.Frame.ChartBorder.GetHeight();
            var xText = this.Frame.ChartBorder.GetChartWidth();
            var yText = this.Frame.ChartBorder.GetTop();
            this.Canvas.translate(xText, yText);
            this.Canvas.rotate(90 * Math.PI / 180);
        }
        else {
            if (bottom < 5) return;
        }

        this.Canvas.textAlign = "left";
        this.Canvas.textBaseline = "middle";
        this.Canvas.font = this.Font;

        if (this.IsShowName) {
            this.Canvas.fillStyle = this.UnchagneColor;
            var textWidth = this.Canvas.measureText(this.Name).width + 2;    //后空2个像素
            if (left + textWidth > right) return;
            this.Canvas.fillText(this.Name, left, bottom, textWidth);
            left += textWidth;
        }

        this.Canvas.fillStyle = this.UnchagneColor;
        var text = IFrameSplitOperator.FormatDateTimeString(item.DateTime, this.IsShowDate ? 'YYYY-MM-DD HH-MM' : 'HH-MM');
        var textWidth = this.Canvas.measureText(text).width + 2;    //后空2个像素
        if (left + textWidth > right) return;
        this.Canvas.fillText(text, left, bottom, textWidth);
        left += textWidth;

        if (item.Close != null) {
            this.Canvas.fillStyle = this.GetColor(item.Close, this.YClose);
            var text = "价:" + item.Close.toFixed(defaultfloatPrecision);
            var textWidth = this.Canvas.measureText(text).width + 2;    //后空2个像素
            if (left + textWidth > right) return;
            this.Canvas.fillText(text, left, bottom, textWidth);
            left += textWidth;
        }

        if (item.Increase != null) {
            this.Canvas.fillStyle = this.GetColor(item.Increase, 0);
            var text = "幅:" + item.Increase.toFixed(2) + '%';
            var textWidth = this.Canvas.measureText(text).width + 2;    //后空2个像素
            if (left + textWidth > right) return;
            this.Canvas.fillText(text, left, bottom, textWidth);
            left += textWidth;
        }

        if (item.AvPrice != null) {
            this.Canvas.fillStyle = this.GetColor(item.AvPrice, this.YClose);
            var text = "均:" + item.AvPrice.toFixed(defaultfloatPrecision);
            var textWidth = this.Canvas.measureText(text).width + 2;    //后空2个像素
            if (left + textWidth > right) return;
            this.Canvas.fillText(text, left, bottom, textWidth);
            left += textWidth;
        }

        this.Canvas.fillStyle = this.VolColor;
        var text = "量:" + IFrameSplitOperator.FormatValueString(item.Vol, 2);
        var textWidth = this.Canvas.measureText(text).width + 2;    //后空2个像素
        if (left + textWidth > right) return;
        this.Canvas.fillText(text, left, bottom, textWidth);
        left += textWidth;

        this.Canvas.fillStyle = this.AmountColor;
        var text = "额:" + IFrameSplitOperator.FormatValueString(item.Amount, 2);
        var textWidth = this.Canvas.measureText(text).width + 2;    //后空2个像素
        if (left + textWidth > right) return;
        this.Canvas.fillText(text, left, bottom, textWidth);
        left += textWidth;
    }

    this.Draw = function () {
        this.LastShowData = null;
        this.SendUpdateUIMessage('Draw');
        if (!this.IsShow) return;
        if (this.CursorIndex == null || !this.Data || !this.Data.Data) return;
        if (this.Data.Data.length <= 0) return;

        var index = this.CursorIndex;
        index = parseInt(index.toFixed(0));
        var dataIndex = index + this.Data.DataOffset;
        if (dataIndex >= this.Data.Data.length) dataIndex = this.Data.Data.length - 1;

        var item = this.Data.Data[dataIndex];
        this.LastShowData = item;

        if (this.LineCount > 1 && !(this.Frame.IsHScreen === true)) {
            this.DrawMulitLine(item);
            return;
        }

        this.Canvas.save();
        this.DrawItem(item);
        this.Canvas.restore();
    }
}

//字符串输出格式
var STRING_FORMAT_TYPE =
{
    DEFAULT: 1,     //默认 2位小数 单位自动转化 (万 亿)
    ORIGINAL: 2,     //原始数据
    THOUSANDS: 21,   //千分位分割
};

function DynamicTitleData(data, name, color)    //指标标题数据
{
    this.Data = data;
    this.Name = name;
    this.Color = color;   //字体颜色
    this.DataType;      //数据类型
    this.StringFormat = STRING_FORMAT_TYPE.DEFAULT;   //字符串格式
    this.FloatPrecision = 2;                          //小数位数
    this.GetTextCallback;                           //自定义数据转文本回调
}

//指标标题
function DynamicChartTitlePainting() 
{
    this.newMethod = IChartTitlePainting;   //派生
    this.newMethod();
    delete this.newMethod;

    this.IsDynamic = true;
    this.Data = new Array();
    this.Explain;
    this.TitleBG;             //标题背景色
    this.TitleBGHeight = 20;  //标题背景色高度
    this.TitleAlign = 'middle';//对其方式
    this.TitleBottomDistance = 1; //标题靠底部输出的时候 字体和底部的间距
    this.Text = new Array();  //副标题 Text:'文本', Color:'颜色'
    this.EraseRect;
    this.EraseColor = g_JSChartResource.BGColor;  //用来擦出的背景色

    this.FormatValue = function (value, item) 
    {
        if (item.StringFormat == STRING_FORMAT_TYPE.DEFAULT)
            return IFrameSplitOperator.FormatValueString(value, item.FloatPrecision);
        else if (item.StringFormat = STRING_FORMAT_TYPE.THOUSANDS)
            return IFrameSplitOperator.FormatValueThousandsString(value, item.FloatPrecision);
        else if (item.StringFormat == STRING_FORMAT_TYPE.ORIGINAL)
            return value.toFixed(item.FloatPrecision).toString();
    }

    this.FormatMultiReport = function (data, format) {
        var text = "";
        for (var i in data) {
            var item = data[i];
            let quarter = item.Quarter;
            let year = item.Year;
            let value = item.Value;

            if (text.length > 0) text += ',';

            text += year.toString();
            switch (quarter) {
                case 1:
                    text += '一季报 ';
                    break;
                case 2:
                    text += '半年报 ';
                    break;
                case 3:
                    text += '三季报 ';
                    break;
                case 4:
                    text += '年报 ';
                    break;
            }

            text += this.FormatValue(value, format);
        }

        return text;
    }

    this.SendUpdateUIMessage = function (funcName) //通知外面 标题变了
    {
        if (!this.UpdateUICallback) return;

        var sendData = {
            TitleName: '指标标题', CallFunction: funcName,
            TitleData: { Title: this.Title, Identify: this.Frame.Identify, Data: [] },
            Rect:   //标题的位置
            {
                Top: this.Frame.ChartBorder.GetTop(), Left: this.Frame.ChartBorder.GetLeft(),
                Right: this.Frame.ChartBorder.GetRight(), Bottom: this.Frame.ChartBorder.GetBottom()
            }
        };

        for (var i in this.Data) {
            var item = this.Data[i];
            if (!item || !item.Data || !item.Data.Data) continue;
            if (item.Data.Data.length <= 0) continue;

            var titleItem = { Name: item.Name, Color: item.Color };
            if (item.DataType) titleItem.DataType = item.DataType;

            if (item.DataType == "StraightLine")  //直线只有1个数据
            {
                titleItem.Value = item.Data.Data[0];
            }
            else {
                var index = item.Data.Data.length - 1;
                if (this.CursorIndex != null) {
                    var cursorIndex = Math.abs(this.CursorIndex - 0.5);
                    cursorIndex = parseInt(cursorIndex.toFixed(0));
                    index = item.Data.DataOffset + cursorIndex
                }
                if (index >= item.Data.Data.length) index = item.Data.Data.length - 1;

                titleItem.Value = item.Data.Data[index];
            }

            sendData.TitleData.Data.push(titleItem);
        }

        //console.log('[DynamicChartTitlePainting::SendUpdateUIMessage', sendData);
        this.UpdateUICallback(sendData);
    }

    this.DrawTitle = function () {
        this.EraseRect = null;
        this.SendUpdateUIMessage('DrawTitle');
        if (this.Frame.ChartBorder.TitleHeight < 5) return;
        if (this.Frame.IsShowTitle == false) return;

        if (this.Frame.IsHScreen === true) {
            this.Canvas.save();
            this.HScreenDrawTitle();
            this.Canvas.restore();
            return;
        }

        let left = this.Frame.ChartBorder.GetLeft() + 1;
        let bottom = this.Frame.ChartBorder.GetTop() + this.Frame.ChartBorder.TitleHeight / 2;    //上下居中显示
        if (this.TitleAlign == 'bottom') bottom = this.Frame.ChartBorder.GetTopEx() - this.TitleBottomDistance;
        let right = this.Frame.ChartBorder.GetRight();

        this.Canvas.textAlign = "left";
        this.Canvas.textBaseline = this.TitleAlign;
        this.Canvas.font = this.Font;

        let textWidth = 10;
        if (this.TitleBG && this.Title) {
            textWidth = this.Canvas.measureText(this.Title).width + 2;
            let height = this.Frame.ChartBorder.TitleHeight;
            let top = this.Frame.ChartBorder.GetTop();
            if (height > 20) {
                top += (height - 20) / 2 + (height - 45) / 2;
                height = 20;
            }

            if (this.TitleAlign == 'bottom')  //底部输出文字
            {
                top = this.Frame.ChartBorder.GetTopEx() - 20;
                if (top < 0) top = 0;
            }

            this.Canvas.fillStyle = this.TitleBG;
            this.Canvas.fillRect(left, top, textWidth, height);
        }

        if (this.Title) {
            this.Canvas.fillStyle = this.TitleColor;
            const metrics = this.Canvas.measureText(this.Title);
            textWidth = metrics.width + 2;
            this.Canvas.fillText(this.Title, left, bottom, textWidth);
            left += textWidth;
        }

        if (this.Text && this.Text.length > 0) {
            for (let i in this.Text) {
                let item = this.Text[i];
                this.Canvas.fillStyle = item.Color;
                textWidth = this.Canvas.measureText(item.Text).width + 2;
                this.Canvas.fillText(item.Text, left, bottom, textWidth);
                left += textWidth;
            }
        }

        left += 4;
        var eraseRight = left, eraseLeft = left;
        for (var i in this.Data) {
            var item = this.Data[i];
            if (!item || !item.Data || !item.Data.Data) continue;
            if (item.Data.Data.length <= 0) continue;

            var indexName = '●' + item.Name;
            this.Canvas.fillStyle = item.Color;
            textWidth = this.Canvas.measureText(indexName).width + 4;
            if (left + textWidth >= right) break;
            this.Canvas.fillText(indexName, left, bottom, textWidth);
            left += textWidth;
            eraseRight = left;
        }

        if (eraseRight > eraseLeft) {
            this.EraseRect = { Left: eraseLeft, Right: eraseRight, Top: this.Frame.ChartBorder.GetTop() + 1, Width: eraseRight - eraseLeft, Height: this.Frame.ChartBorder.TitleHeight - 2 };
        }
    }

    this.EraseTitle = function () {
        if (!this.EraseRect) return;
        this.Canvas.fillStyle = this.EraseColor;
        this.Canvas.fillRect(this.EraseRect.Left, this.EraseRect.Top, this.EraseRect.Width, this.EraseRect.Height);
    }

    this.Draw = function () {
        this.SendUpdateUIMessage('Draw');

        if (this.CursorIndex == null) return;
        if (!this.Data) return;
        if (this.Frame.ChartBorder.TitleHeight < 5) return;
        if (this.Frame.IsShowTitle == false) return;

        if (this.Frame.IsHScreen === true) {
            this.Canvas.save();
            this.HScreenDraw();
            this.Canvas.restore();
            return;
        }

        this.EraseTitle();

        var left = this.Frame.ChartBorder.GetLeft() + 1;
        var bottom = this.Frame.ChartBorder.GetTop() + this.Frame.ChartBorder.TitleHeight / 2;    //上下居中显示
        if (this.TitleAlign == 'bottom') bottom = this.Frame.ChartBorder.GetTopEx() - this.TitleBottomDistance;
        var right = this.Frame.ChartBorder.GetRight();

        this.Canvas.textAlign = "left";
        this.Canvas.textBaseline = this.TitleAlign;
        this.Canvas.font = this.Font;

        if (this.Title) {
            this.Canvas.fillStyle = this.TitleColor;
            let textWidth = this.Canvas.measureText(this.Title).width + 2;
            //this.Canvas.fillText(this.Title,left,bottom,textWidth);
            left += textWidth;
        }

        if (this.Text && this.Text.length > 0) {
            for (let i in this.Text) {
                let item = this.Text[i];
                this.Canvas.fillStyle = item.Color;
                let textWidth = this.Canvas.measureText(item.Text).width + 2;
                //this.Canvas.fillText(item.Text, left, bottom, textWidth);
                left += textWidth;
            }
        }

        for (var i in this.Data) {
            var item = this.Data[i];
            if (!item || !item.Data || !item.Data.Data) continue;

            if (item.Data.Data.length <= 0) continue;

            var value = null;
            var valueText = null;
            if (item.DataType == "StraightLine")  //直线只有1个数据
            {
                value = item.Data.Data[0];
                valueText = this.FormatValue(value, item);
            }
            else {
                var index = Math.abs(this.CursorIndex - 0.5);
                index = parseInt(index.toFixed(0));
                if (item.Data.DataOffset + index >= item.Data.Data.length) continue;

                value = item.Data.Data[item.Data.DataOffset + index];
                if (value == null) continue;

                if (item.DataType == "HistoryData-Vol") {
                    value = value.Vol;
                    valueText = this.FormatValue(value, item);
                }
                else if (item.DataType == "MultiReport") {
                    valueText = this.FormatMultiReport(value, item);
                }
                else {
                    if (item.GetTextCallback) valueText = item.GetTextCallback(value, item);
                    else valueText = this.FormatValue(value, item);
                }
            }

            this.Canvas.fillStyle = item.Color;

            var text = item.Name + ":" + valueText;
            var textWidth = this.Canvas.measureText(text).width + 2;    //后空2个像素
            this.Canvas.fillText(text, left, bottom, textWidth);
            left += textWidth;
        }

        if (this.Explain)   //说明信息
        {
            this.Canvas.fillStyle = this.TitleColor;
            var text = "说明:" + this.Explain;
            var textWidth = this.Canvas.measureText(text).width + 2;
            if (left + textWidth < right) {
                this.Canvas.fillText(text, left, bottom, textWidth);
                left += textWidth;
            }
        }
    }

    this.HScreenDraw = function () {
        var xText = this.Frame.ChartBorder.GetRightTitle();
        var yText = this.Frame.ChartBorder.GetTop();
        this.Canvas.translate(xText, yText);
        this.Canvas.rotate(90 * Math.PI / 180);

        this.EraseTitle();

        var left = 1;
        var bottom = -this.Frame.ChartBorder.TitleHeight / 2;    //上下居中显示
        var right = this.Frame.ChartBorder.GetHeight();

        this.Canvas.textAlign = "left";
        this.Canvas.textBaseline = "middle";
        this.Canvas.font = this.Font;

        if (this.Title) {
            this.Canvas.fillStyle = this.TitleColor;
            var textWidth = this.Canvas.measureText(this.Title).width + 2;
            //this.Canvas.fillText(this.Title, left, bottom, textWidth);
            left += textWidth;
        }

        if (this.Text && this.Text.length > 0) {
            for (let i in this.Text) {
                let item = this.Text[i];
                this.Canvas.fillStyle = item.Color;
                let textWidth = this.Canvas.measureText(item.Text).width + 2;
                //this.Canvas.fillText(item.Text, left, bottom, textWidth);
                left += textWidth;
            }
        }

        for (var i in this.Data) {
            var item = this.Data[i];
            if (!item || !item.Data || !item.Data.Data || !item.Name) continue;

            if (item.Data.Data.length <= 0) continue;

            var value = null;
            var valueText = null;
            if (item.DataType == "StraightLine")  //直线只有1个数据
            {
                value = item.Data.Data[0];
                valueText = this.FormatValue(value, item);
            }
            else {
                var index = Math.abs(this.CursorIndex - 0.5);
                index = parseInt(index.toFixed(0));
                if (item.Data.DataOffset + index >= item.Data.Data.length) continue;

                value = item.Data.Data[item.Data.DataOffset + index];
                if (value == null) continue;

                if (item.DataType == "HistoryData-Vol") {
                    value = value.Vol;
                    valueText = this.FormatValue(value, item);
                }
                else if (item.DataType == "MultiReport") {
                    valueText = this.FormatMultiReport(value, item);
                }
                else {
                    if (item.GetTextCallback) valueText = item.GetTextCallback(value, item);
                    else valueText = this.FormatValue(value, item);
                }
            }

            this.Canvas.fillStyle = item.Color;

            var text = item.Name + ":" + valueText;
            var textWidth = this.Canvas.measureText(text).width + 2;    //后空2个像素
            this.Canvas.fillText(text, left, bottom, textWidth);
            left += textWidth;
        }

        if (this.Explain)   //说明信息
        {
            this.Canvas.fillStyle = this.TitleColor;
            var text = "说明:" + this.Explain;
            var textWidth = this.Canvas.measureText(text).width + 2;
            if (left + textWidth < right) {
                this.Canvas.fillText(text, left, bottom, textWidth);
                left += textWidth;
            }
        }
    }

    this.HScreenDrawTitle = function () {
        this.EraseRect = null;
        var xText = this.Frame.ChartBorder.GetRightTitle();
        var yText = this.Frame.ChartBorder.GetTop();

        this.Canvas.translate(xText, yText);
        this.Canvas.rotate(90 * Math.PI / 180);

        let left = 1;
        let bottom = -(this.Frame.ChartBorder.TitleHeight / 2);    //上下居中显示
        if (this.TitleAlign == 'bottom') bottom = -this.TitleBottomDistance;
        let right = this.Frame.ChartBorder.GetHeight();

        this.Canvas.textAlign = "left";
        this.Canvas.textBaseline = this.TitleAlign;
        this.Canvas.font = this.Font;

        let textWidth = 10;
        if (this.TitleBG && this.Title) {
            textWidth = this.Canvas.measureText(this.Title).width + 2;
            let height = this.Frame.ChartBorder.TitleHeight;
            let top = this.Frame.ChartBorder.GetTop();
            if (height > 20) {
                top += (height - 20) / 2 + (height - 45) / 2;
                height = 20;
            }

            if (this.TitleAlign == 'bottom')  //底部输出文字
            {
                top = this.Frame.ChartBorder.GetTopEx() - 20;
                if (top < 0) top = 0;
            }

            this.Canvas.fillStyle = this.TitleBG;
            this.Canvas.fillRect(left, top, textWidth, height);
        }

        if (this.Title) {
            this.Canvas.fillStyle = this.TitleColor;
            const metrics = this.Canvas.measureText(this.Title);
            textWidth = metrics.width + 2;
            this.Canvas.fillText(this.Title, left, bottom, textWidth);
            left += textWidth;
        }

        if (this.Text && this.Text.length > 0) {
            for (let i in this.Text) {
                let item = this.Text[i];
                this.Canvas.fillStyle = item.Color;
                textWidth = this.Canvas.measureText(item.Text).width + 2;
                this.Canvas.fillText(item.Text, left, bottom, textWidth);
                left += textWidth;
            }
        }

        left += 4;
        var eraseRight = left, eraseLeft = left;
        for (var i in this.Data) {
            var item = this.Data[i];
            if (!item || !item.Data || !item.Data.Data) continue;
            if (item.Data.Data.length <= 0) continue;

            var indexName = '●' + item.Name;
            this.Canvas.fillStyle = item.Color;
            textWidth = this.Canvas.measureText(indexName).width + 4;
            if (left + textWidth >= right) break;
            this.Canvas.fillText(indexName, left, bottom, textWidth);
            left += textWidth;
            eraseRight = left;
        }

        if (eraseRight > eraseLeft) {
            this.EraseRect = { Left: eraseLeft, Right: eraseRight, Top: -(this.Frame.ChartBorder.TitleHeight - 1), Width: eraseRight - eraseLeft, Height: this.Frame.ChartBorder.TitleHeight - 2 };
        }
    }
}



//导出统一使用JSCommon命名空间名
module.exports =
{
    JSCommonChartTitle:
    {
        IChartTitlePainting: IChartTitlePainting,
        DynamicKLineTitlePainting: DynamicKLineTitlePainting,
        DynamicMinuteTitlePainting: DynamicMinuteTitlePainting,
        DynamicChartTitlePainting: DynamicChartTitlePainting,
        DynamicTitleData: DynamicTitleData,
        STRING_FORMAT_TYPE: STRING_FORMAT_TYPE,
    },

    //单个类导出
    JSCommonChartTitle_IChartTitlePainting: IChartTitlePainting, 
    JSCommonChartTitle_DynamicKLineTitlePainting: DynamicKLineTitlePainting,
    JSCommonChartTitle_DynamicMinuteTitlePainting: DynamicMinuteTitlePainting,
    JSCommonChartTitle_DynamicChartTitlePainting: DynamicChartTitlePainting,
    JSCommonChartTitle_DynamicTitleData: DynamicTitleData,
    JSCommonChartTitle_STRING_FORMAT_TYPE: STRING_FORMAT_TYPE,
};
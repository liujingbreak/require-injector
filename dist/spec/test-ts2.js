"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const BKLib = tslib_1.__importStar(require("@bk/mf-share"));
const core_1 = require("@angular/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const env_1 = require("@bk/env");
window.BKLib = BKLib;
var mf_share_1 = require("@bk/mf-share");
exports.PayStatus = mf_share_1.PayStatus;
/**
 * @see https://confluence.bkjk-inc.com/pages/viewpage.action?pageId=25533352
 *
 * ! 这里返回的 observable 应该是 pure 的，不要做任何处理
 *
 * @export
 * @class BKLibService
 */
let BKLibService = class BKLibService {
    constructor() {
        this.cashier = {
            /**
             * 使用订单号唤起收银台
             *
             * @param {string} orderId
             * @returns
             */
            launchByOrderId(orderId) {
                return rxjs_1.from(BKLib.cashier.launchByOrderId({ orderId }));
                // return from<{ payStatus: PayStatus }>(
                //   new Promise(resolve => {
                //     setTimeout(() => {
                //       resolve({ payStatus: PayStatus.BK_PAY_SUCCESS });
                //     }, 2000);
                //   })
                // );
            }
        };
        // 全局变量 BKLib
        if (!window.BKLib) {
            throw Error('can not find BKLib');
        }
    }
    /**
     * 退出 native 当前视图
     *
     * @returns
     * @memberof BKLibService
     */
    pop() {
        // catchError 是刘晶加的
        return rxjs_1.from(BKLib.pop()).pipe(
        // LJ: We want to tolerate BKlib's any error when exiting web view
        operators_1.catchError((err) => {
            if (env_1.environment.devFriendly) {
                alert('[Debug] 退出App web view: ' + err);
            }
            return rxjs_1.of(true);
        }));
    }
    /**
     * 获取 SDK 基础信息
     *
     * @returns
     * @memberof BKLibService
     */
    getWalletInfo() {
        return rxjs_1.from(BKLib.getWalletInfo({ force: true }));
    }
};
BKLibService = tslib_1.__decorate([
    core_1.Injectable({
        providedIn: 'root'
    }),
    tslib_1.__metadata("design:paramtypes", [])
], BKLibService);
exports.BKLibService = BKLibService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC10czIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9zcGVjL3Rlc3QtdHMyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDREQUFzQztBQUN0Qyx3Q0FBMkM7QUFDM0MsK0JBQWdDO0FBQ2hDLDhDQUE0QztBQUM1QyxpQ0FBNkM7QUFDNUMsTUFBYyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7QUFFOUIseUNBQXVDO0FBQS9CLCtCQUFBLFNBQVMsQ0FBQTtBQUNqQjs7Ozs7OztHQU9HO0FBSUgsSUFBYSxZQUFZLEdBQXpCLE1BQWEsWUFBWTtJQW9CdkI7UUFuQkEsWUFBTyxHQUFHO1lBQ1I7Ozs7O2VBS0c7WUFDSCxlQUFlLENBQUMsT0FBZTtnQkFDN0IsT0FBTyxXQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hELHlDQUF5QztnQkFDekMsNkJBQTZCO2dCQUM3Qix5QkFBeUI7Z0JBQ3pCLDBEQUEwRDtnQkFDMUQsZ0JBQWdCO2dCQUNoQixPQUFPO2dCQUNQLEtBQUs7WUFDUCxDQUFDO1NBQ0YsQ0FBQztRQUdBLGFBQWE7UUFDYixJQUFJLENBQUUsTUFBYyxDQUFDLEtBQUssRUFBRTtZQUMxQixNQUFNLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1NBQ25DO0lBQ0gsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsR0FBRztRQUNELG1CQUFtQjtRQUNuQixPQUFPLFdBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJO1FBQzNCLGtFQUFrRTtRQUNsRSxzQkFBVSxDQUFDLENBQUMsR0FBUSxFQUFFLEVBQUU7WUFDdEIsSUFBSSxpQkFBRyxDQUFDLFdBQVcsRUFBRTtnQkFDbkIsS0FBSyxDQUFDLDBCQUEwQixHQUFHLEdBQUcsQ0FBQyxDQUFDO2FBQ3pDO1lBQ0QsT0FBTyxTQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILGFBQWE7UUFDWCxPQUFPLFdBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDO0NBQ0YsQ0FBQTtBQXZEWSxZQUFZO0lBSHhCLGlCQUFVLENBQUM7UUFDVixVQUFVLEVBQUUsTUFBTTtLQUNuQixDQUFDOztHQUNXLFlBQVksQ0F1RHhCO0FBdkRZLG9DQUFZIn0=
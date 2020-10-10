export { PayStatus } from '@bk/mf-share';
/**
 * @see https://confluence.bkjk-inc.com/pages/viewpage.action?pageId=25533352
 *
 * ! 这里返回的 observable 应该是 pure 的，不要做任何处理
 *
 * @export
 * @class BKLibService
 */
export declare class BKLibService {
    cashier: {
        /**
         * 使用订单号唤起收银台
         *
         * @param {string} orderId
         * @returns
         */
        launchByOrderId(orderId: string): any;
    };
    constructor();
    /**
     * 退出 native 当前视图
     *
     * @returns
     * @memberof BKLibService
     */
    pop(): any;
    /**
     * 获取 SDK 基础信息
     *
     * @returns
     * @memberof BKLibService
     */
    getWalletInfo(): any;
}

// pages/my/my.js
const util = require('../../utils/util.js');
// 定义一个常量，表示页面上最多显示的品牌数量
const BRAND_DISPLAY_LIMIT = 6;

Page({
  data: {
    statusBarHeight: wx.getSystemInfoSync().statusBarHeight,
    // 用于存储按杯数排序后的完整品牌列表
    allSortedBrands: [],
    // 用于在页面上直接显示的品牌列表（可能是截取后的）
    displayedBrands: [],
    // 判断品牌数量是否超过上限，用于控制“展开”按钮的显示
    isBrandOverflow: false,
    // 控制品牌弹窗和帮助弹窗的显示
    isBrandModalShow: false,
    isHelpModalShow: false,

  },

  onShow() {
    this.processMyBrands();
  },

  // 【核心修改】处理我的品牌数据，包括计数、排序和截取
  processMyBrands() {
    const allRecords = wx.getStorageSync('milkTeaRecords') || [];
    
    // 1. 统计每个品牌的杯数
    const brandCounts = allRecords.reduce((acc, record) => {
      acc[record.brand] = (acc[record.brand] || 0) + 1;
      return acc;
    }, {});

    // 2. 将统计结果转换为数组，并按杯数降序排序
    const sortedBrands = Object.entries(brandCounts)
      .map(([brand, cups]) => ({ brand, cups }))
      .sort((a, b) => b.cups - a.cups);
      
    // 3. 根据品牌总数和上限，决定页面上显示哪些品牌
    const isOverflow = sortedBrands.length > BRAND_DISPLAY_LIMIT;
    const displayList = isOverflow ? sortedBrands.slice(0, BRAND_DISPLAY_LIMIT) : sortedBrands;

    // 4. 更新页面数据
    this.setData({
      allSortedBrands: sortedBrands,
      displayedBrands: displayList,
      isBrandOverflow: isOverflow
    });
  },

  // 清空记录
  handleClearData() {
    wx.showModal({
      title: '确认操作',
      content: '确定要清空所有奶茶记录吗？此操作不可恢复！',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('milkTeaRecords');
          // 清空后，立即刷新品牌列表
          this.processMyBrands(); 
          wx.showToast({ title: '已清空' });
        }
      }
    })
  },

  // 【新增】显示/隐藏全部品牌弹窗
  showBrandModal() {
    this.setData({ isBrandModalShow: true });
  },
  hideBrandModal() {
    this.setData({ isBrandModalShow: false });
  },

  // 【新增】显示/隐藏使用说明弹窗
  showHelpModal() {
    this.setData({ isHelpModalShow: true });
  },
  hideHelpModal() {
    this.setData({ isHelpModalShow: false });
  },
});
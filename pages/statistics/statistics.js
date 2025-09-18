// pages/statistics/statistics.js
const util = require('../../utils/util.js');

Page({
  data: {
    statusBarHeight: wx.getSystemInfoSync().statusBarHeight,
    filterType: 'month', // month, year, custom
    selectedMonth: '', 
    selectedYear: '',
    currentDate: '', 
    startDate: '',
    endDate: '',
    allRecords: [],
    summary: {
      totalCups: 0,
      totalAmount: 0,
      avgPrice: 0,
    },
    brandStats: [],
    sort: {
      key: 'cups',
      order: 'desc'
    },
    isDetailModalShow: false,
    currentBrandDetails: {
      brand: '',
      records: []
    }
  },

  fullBrandStats: [],

  /**
   * onShow生命周期函数：
   * 每次页面展示时执行，负责初始化或更新数据。
   * 这里是实现【默认选中当月/当年】功能的核心。
   */
  onShow() {
    // 1. 获取当前日期
    const today = new Date();
    const formattedToday = util.formatDate(today);
    const currentYear = today.getFullYear().toString();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');

    // 2. 通过setData设置所有日期选择器的初始/默认值
    this.setData({
      allRecords: wx.getStorageSync('milkTeaRecords') || [],
      // 【实现需求】初始化月统计选择器的默认值为当前月份
      selectedMonth: `${currentYear}-${currentMonth}`,
      // 【实现需求】初始化年统计选择器的默认值为当前年份
      selectedYear: currentYear,
      // 初始化自定义时间段的默认值
      startDate: util.formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: formattedToday,
      // 设置picker的最大可选日期为今天，防止选择未来日期
      currentDate: formattedToday,
    });
    
    // 3. 使用默认值立即执行一次统计计算
    this.calculateStats();
  },

  changeFilterType(e) {
    this.setData({ filterType: e.currentTarget.dataset.type });
    this.calculateStats();
  },

  onMonthChange(e) {
    this.setData({
      selectedMonth: e.detail.value
    });
    this.calculateStats();
  },

  onYearChange(e) {
    this.setData({
      selectedYear: e.detail.value
    });
    this.calculateStats();
  },

  onDateChange(e) {
    const { type } = e.currentTarget.dataset;
    if (type === 'start') {
      this.setData({ startDate: e.detail.value });
    } else {
      this.setData({ endDate: e.detail.value });
    }
    this.calculateStats();
  },

  calculateStats() {
    const { allRecords, filterType, selectedMonth, selectedYear, startDate, endDate } = this.data;
    
    const filteredRecords = allRecords.filter(record => {
      const recordDate = new Date(record.date);
      
      if (filterType === 'month') {
        const [year, month] = selectedMonth.split('-').map(Number);
        return recordDate.getFullYear() === year && (recordDate.getMonth() + 1) === month;
      }
      
      if (filterType === 'year') {
        const year = Number(selectedYear);
        return recordDate.getFullYear() === year;
      }

      if (filterType === 'custom') {
        return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
      }
      return false;
    });

    const totalCups = filteredRecords.length;
    const recordsWithPrice = filteredRecords.filter(r => r.price != null);
    const totalAmount = recordsWithPrice.reduce((sum, r) => sum + r.price, 0);
    const avgPrice = totalCups > 0 && recordsWithPrice.length > 0 ? totalAmount / recordsWithPrice.length : 0;
    
    this.setData({
      'summary.totalCups': totalCups,
      'summary.totalAmount': totalAmount.toFixed(2),
      'summary.avgPrice': avgPrice.toFixed(2),
    });

    const stats = {};
    filteredRecords.forEach(record => {
      if (!stats[record.brand]) {
        stats[record.brand] = { brand: record.brand, cups: 0, amount: 0, records: [] };
      }
      stats[record.brand].cups++;
      stats[record.brand].amount += (record.price || 0);
      stats[record.brand].records.push(record);
    });
    
    this.fullBrandStats = Object.values(stats);
    this.sortBrandStats();
  
  },
  
  handleSort(e) {
    // 1. 获取被点击的列的key，例如 'cups' 或 'amount'
    const key = e.currentTarget.dataset.key;
    const { sort } = this.data;
    let newOrder = 'desc';

    // 2. 判断排序规则：如果当前就是按此列排序，并且是降序，则切换为升序
    if (sort.key === key && sort.order === 'desc') {
      newOrder = 'asc';
    }
    
    // 3. 更新 data 中的排序状态
    this.setData({
      sort: { key, order: newOrder }
    });
    
    // 4. 【核心步骤】立即调用排序函数，应用新的排序规则并刷新视图
    this.sortBrandStats();
  },

  sortBrandStats() {
    const { sort } = this.data;
    
    // 1. 对原始统计数据 this.fullBrandStats 进行排序
    //    这里的 a.amount 和 b.amount 都是数字，可以正确比较
    const sortedStats = [...this.fullBrandStats].sort((a, b) => {
      if (sort.order === 'asc') {
        return a[sort.key] - b[sort.key];
      } else {
        return b[sort.key] - a[sort.key];
      }
    });

    // 2. 对排序后的结果进行格式化（例如将金额转为两位小数的字符串）
    // sortedStats.forEach(item => {
    //     item.amount = item.amount.toFixed(2);
    // });

    // 2. 【核心修复】使用 .map() 方法创建一个全新的数组用于页面渲染
    //    这个新数组中的对象是全新的，amount 属性被格式化为字符串
    //    而 this.fullBrandStats 中的原始对象完全不受影响
    const formattedForDisplay = sortedStats.map(item => {
      return {
        ...item, // 复制原始对象的所有属性
        amount: item.amount.toFixed(2) // 仅覆盖 amount 属性为格式化后的字符串
      };
    });    
    
    // 3. 将最终用于展示的列表更新到 data 中，触发页面刷新
    this.setData({ brandStats: formattedForDisplay });
  },

  
  showBrandDetails(e) {
    const brand = e.currentTarget.dataset.brand;
    // 从 fullBrandStats (包含完整信息) 中查找数据
    const brandData = this.fullBrandStats.find(item => item.brand === brand);
    if (brandData) {
        this.setData({
            currentBrandDetails: brandData,
            isDetailModalShow: true // 设置为 true，显示弹窗
        });
    }
},

// 【关键代码】隐藏弹窗的函数
hideDetailModal() {
    this.setData({ isDetailModalShow: false }); // 设置为 false，隐藏弹窗
}
});
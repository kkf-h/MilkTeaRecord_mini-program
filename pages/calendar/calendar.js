// pages/calendar/calendar.js
const util = require('../../utils/util.js');

Page({
  data: {
    statusBarHeight: wx.getSystemInfoSync().statusBarHeight,
    currentMonthForPicker: '', 
    currentDate: util.formatDate(new Date()),
    //用于判断表单内容是否被修改
    isFormDirty: false, 
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    days: [],
    allRecords: [],
    monthlyRecords: [],
    isModalShow: false,
    modalMode: 'add', // 'add' 或 'edit'
    formData: {
      id: null,
      date: util.formatDate(new Date()),
      brand: '',
      name: '',
      price: '',
      rating: '',
      notes: ''
    },
    sort: {
      key: 'date',
      order: 'desc'
    }
  },

  originalFormData: {},//保存一份表单的初始数据

  onShow() {
    this.loadRecords();
    this.updateCurrentMonthPicker();
  },
  
  //更新月份选择器的值
  updateCurrentMonthPicker() {
    this.setData({
      currentMonthForPicker: `${this.data.currentYear}-${String(this.data.currentMonth).padStart(2, '0')}`
    })
  },

  // 【新增】响应月份选择器的变化
  onMonthPickerChange(e) {
    const [year, month] = e.detail.value.split('-').map(Number);
    this.setData({ currentYear: year, currentMonth: month });
    this.generateCalendar(year, month);
    this.filterMonthlyRecords();
    this.updateCurrentMonthPicker();
  },

// 监听所有表单项的变化
  onFormInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;

    // 更新当前表单数据
    const newFormData = { ...this.data.formData, [field]: value };
    this.setData({
      formData: newFormData
    });
    
    // 检查是否与原始数据不同
    // 使用 JSON.stringify 来进行深比较，简单高效
    const isDirty = JSON.stringify(newFormData) !== JSON.stringify(this.originalFormData);
    if (isDirty !== this.data.isFormDirty) {
      this.setData({ isFormDirty: isDirty });
    }
  },

  loadRecords() {
    const allRecords = wx.getStorageSync('milkTeaRecords') || [];
    this.setData({ allRecords });
    this.generateCalendar(this.data.currentYear, this.data.currentMonth);
    this.filterMonthlyRecords();
  },

  generateCalendar(year, month) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = [];

    for (let i = 0; i < firstDay; i++) {
      daysArray.push({ day: '', hasRecord: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const fullDate = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const hasRecord = this.data.allRecords.some(record => record.date === fullDate);
      daysArray.push({ day: i, hasRecord: hasRecord, fullDate: fullDate });
    }
    
    this.setData({
      days: daysArray,
      currentYear: year,
      currentMonth: month,
    });
  },

  filterMonthlyRecords() {
    const { currentYear, currentMonth, allRecords, sort } = this.data;
    const records = allRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === currentYear && recordDate.getMonth() + 1 === currentMonth;
    });

    records.sort((a, b) => {
      let valA = a[sort.key];
      let valB = b[sort.key];
      if (sort.key === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }
      if (sort.order === 'asc') {
        return valA - valB;
      } else {
        return valB - valA;
      }
    });

    this.setData({ monthlyRecords: records });
  },

  handlePrevMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 1) {
      currentYear -= 1;
      currentMonth = 12;
    } else {
      currentMonth -= 1;
    }
    this.generateCalendar(currentYear, currentMonth);
    this.filterMonthlyRecords();
  },

  handleNextMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 12) {
      currentYear += 1;
      currentMonth = 1;
    } else {
      currentMonth += 1;
    }
    this.generateCalendar(currentYear, currentMonth);
    this.filterMonthlyRecords();
  },

  // 【修改】点击日历日期，也视为新增
  handleDayClick(e) {
    const date = e.currentTarget.dataset.date;
    if (date) {
      this.showAddModal({ detail: { date: date } });
    }
  },

  // 【修改】显示新增模态框
  showAddModal(e) {
    // 如果是从日历点击传入的日期，则使用该日期，否则用今天
    const date = e.detail.date || util.formatDate(new Date());
    const newFormData = { id: null, date, brand: '', name: '', price: '', rating: '', notes: '' };

    this.originalFormData = { ...newFormData }; // 保存初始状态
    this.setData({
      isModalShow: true,
      modalMode: 'add',
      formData: newFormData,
      isFormDirty: false // 重置状态
    });
  },

  // 【新增】处理列表项点击，显示编辑模态框
  handleRecordClick(e) {
    const recordId = e.currentTarget.dataset.id;
    const recordToEdit = this.data.allRecords.find(r => r.id === recordId);
    if (recordToEdit) {
      this.originalFormData = { ...recordToEdit }; // 保存初始状态
      this.setData({
        isModalShow: true,
        modalMode: 'edit',
        formData: { ...recordToEdit },
        isFormDirty: false // 重置状态
      });
    }
  },

  hideModal() {
    this.setData({ isModalShow: false, isFormDirty: false }); // 关闭时也重置
  },
  
  // 【新增】处理日期选择器变化
  onDateChange(e) {
      this.setData({
          'formData.date': e.detail.value
      })
  },

  // 【重大修改】统一处理表单提交（新增与编辑）
  handleFormSubmit(e) {
    const formData = e.detail.value;
    const { modalMode, allRecords } = this.data;
    const recordId = this.data.formData.id; // 获取当前表单的ID

    // --- 数据校验 ---
    if (!formData.brand || !formData.name) {
      wx.showToast({ title: '品牌和名称不能为空', icon: 'none' });
      return;
    }
    const price = parseFloat(formData.price);
    if (formData.price && (isNaN(price) || price < 0 || price > 500)) {
        wx.showToast({ title: '请检查价格是否正确', icon: 'none' });
        return;
    }
    const decimalPart = price.toString().split('.')[1];
    if (decimalPart && decimalPart.length > 2) {
      wx.showToast({ title: '价格最多保留两位小数', icon: 'none' });
      return;
    }
    const rating = parseInt(formData.rating);
    if (formData.rating && (isNaN(rating) || rating < 1 || rating > 5)) {
        wx.showToast({ title: '评分必须是1-5之间的整数', icon: 'none' });
        return;
    }
    // --- 校验结束 ---

    // 准备要保存的数据
    const processedData = {
        ...formData,
        date: this.data.formData.date, // picker的数据不直接在form event里，需手动获取
        price: formData.price ? price : null,
        rating: formData.rating ? rating : null,
    }

    if (modalMode === 'add') {
      // 新增逻辑
      processedData.id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      allRecords.push(processedData);
    } else {
      // 编辑逻辑
      const index = allRecords.findIndex(r => r.id === recordId);
      if (index > -1) {
        allRecords[index] = { ...allRecords[index], ...processedData };
      }
    }

    wx.setStorageSync('milkTeaRecords', allRecords);
    wx.showToast({ title: '保存成功' });
    this.hideModal();
    this.loadRecords(); // 重新加载所有数据并刷新UI
  },

  // 【新增】处理删除记录
  handleDeleteRecord() {
    const recordId = this.data.formData.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          let allRecords = this.data.allRecords;
          const updatedRecords = allRecords.filter(r => r.id !== recordId);
          wx.setStorageSync('milkTeaRecords', updatedRecords);
          wx.showToast({ title: '删除成功' });
          this.hideModal();
          this.loadRecords();
        }
      }
    });
  },

  handleSort(e) {
    const key = e.currentTarget.dataset.key;
    const { sort } = this.data;
    let newOrder = 'desc';
    if (sort.key === key && sort.order === 'desc') {
      newOrder = 'asc';
    }
    this.setData({
      sort: { key, order: newOrder }
    });
    this.filterMonthlyRecords();
  }
});
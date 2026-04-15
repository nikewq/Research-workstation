Component({
  data: {
    selected: 'pages/overview/overview',
    tabs: [
      { path: 'pages/overview/overview',      icon: '📊', text: '概览'  },
      { path: 'pages/tasks/tasks',            icon: '✅', text: '任务'  },
      { path: 'pages/focus/focus',            icon: '🍅', text: '专注'  },
      { path: 'pages/submissions/submissions',icon: '📄', text: '投稿'  },
      { path: 'pages/mine/mine',              icon: '👤', text: '我的'  },
    ]
  },
  methods: {
    switchTab(e) {
      const path = e.currentTarget.dataset.path
      wx.switchTab({ url: '/' + path })
      this.setData({ selected: path })
    }
  }
})

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}
function pad(n) { return String(n).padStart(2, '0') }
function formatTime(secs) {
  return `${pad(Math.floor(secs/60))}:${pad(secs%60)}`
}
function phdDay(startDate) {
  if (!startDate) return '?'
  const d = Math.floor((new Date() - new Date(startDate)) / 86400000) + 1
  return d > 0 ? d : '?'
}
function workTime(ci, co) {
  if (!ci || !co) return null
  const [ih, im] = ci.split(':').map(Number)
  const [oh, om] = co.split(':').map(Number)
  const m = (oh*60+om) - (ih*60+im)
  return m > 0 ? `${Math.floor(m/60)}h${m%60}m` : null
}
function nowTime() {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function nowTimeWithSec() {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
function last7Days() {
  return Array.from({length:7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i)
    return d.toISOString().slice(0, 10)
  })
}
function dayLabel(dateStr) {
  return ['日','一','二','三','四','五','六'][new Date(dateStr+'T12:00').getDay()]
}

module.exports = { uid, today, pad, formatTime, phdDay, workTime, nowTime, nowTimeWithSec, last7Days, dayLabel }

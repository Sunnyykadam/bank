import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportTransactionsPDF(transactions, dateRange = 'All Time') {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.setTextColor(79, 70, 229) // Indigo
  doc.text('FinPulse', 14, 20)
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text('Transaction Report', 14, 28)
  doc.setFontSize(10)
  doc.text(`Period: ${dateRange}`, 14, 35)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 41)

  // Summary
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const net = totalIncome - totalExpense

  doc.setFontSize(10)
  doc.setTextColor(34, 197, 94)
  doc.text(`Total Income: ₹${totalIncome.toLocaleString('en-IN')}`, 14, 52)
  doc.setTextColor(239, 68, 68)
  doc.text(`Total Expenses: ₹${totalExpense.toLocaleString('en-IN')}`, 80, 52)
  doc.setTextColor(79, 70, 229)
  doc.text(`Net: ₹${net.toLocaleString('en-IN')}`, 150, 52)

  // Table
  const tableData = transactions.map(t => [
    new Date(t.date_time).toLocaleDateString('en-IN'),
    t.type,
    t.category,
    `₹${Number(t.amount).toLocaleString('en-IN')}`,
    t.payment_method,
    t.note || '-'
  ])

  autoTable(doc, {
    startY: 58,
    head: [['Date', 'Type', 'Category', 'Amount', 'Method', 'Note']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [245, 245, 250]
    }
  })

  doc.save(`transactions_${new Date().toISOString().split('T')[0]}.pdf`)
}

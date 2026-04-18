export function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    return
  }

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        let cell = row[header] ?? ''
        cell = String(cell).replace(/"/g, '""')
        if (String(cell).includes(',') || String(cell).includes('"') || String(cell).includes('\n')) {
          cell = `"${cell}"`
        }
        return cell
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export function exportTransactionsCSV(transactions) {
  const formatted = transactions.map(t => ({
    Date: new Date(t.date_time).toLocaleDateString('en-IN'),
    Time: new Date(t.date_time).toLocaleTimeString('en-IN'),
    Type: t.type,
    Category: t.category,
    Amount: t.amount,
    'Payment Method': t.payment_method,
    Note: t.note || '',
    'Is Split': t.is_split ? 'Yes' : 'No',
    'Cash Amount': t.split_cash_amount || '',
    'Bank Amount': t.split_bank_amount || ''
  }))
  exportToCSV(formatted, 'transactions')
}

export function exportGoalsCSV(goals) {
  const formatted = goals.map(g => ({
    Name: g.name,
    Status: g.status,
    'Target Amount': g.target_amount,
    'Current Amount': g.current_amount,
    'Target Date': g.target_date,
    'Progress %': ((g.current_amount / g.target_amount) * 100).toFixed(1)
  }))
  exportToCSV(formatted, 'goals_summary')
}

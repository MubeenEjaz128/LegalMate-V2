import React from 'react'

const TransactionsTable = ({ transactions }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-secondary-200">
        <thead className="bg-secondary-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">
              User
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">
              Type
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">
              Amount
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">
              Balance After
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-secondary-200">
          {(transactions || []).map((tx) => (
            <tr key={tx._id}>
              <td className="px-3 py-2 text-sm text-secondary-900">{tx.user?.name || 'Unknown'}</td>
              <td className="px-3 py-2 text-sm text-secondary-900">{tx.type?.replace(/_/g, ' ') || 'N/A'}</td>
              <td className="px-3 py-2 text-sm text-secondary-900">
                {tx.amountPkr < 0 ? '-' : '+'}₨{Math.abs(tx.amountPkr || 0).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-sm text-secondary-900">
                ₨{tx.balanceAfter?.toLocaleString() ?? '0'}
              </td>
              <td className="px-3 py-2 text-sm text-secondary-500">
                {new Date(tx.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TransactionsTable

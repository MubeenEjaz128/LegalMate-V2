import React from 'react'

const UserBalancesTable = ({ balances }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-secondary-200">
        <thead className="bg-secondary-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">User</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Email</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Balance</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Withdrawn</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-secondary-200">
          {(balances || []).map((balance) => (
            <tr key={balance._id || balance.user?._id}>
              <td className="px-3 py-2 text-sm text-secondary-900">{balance.user?.name}</td>
              <td className="px-3 py-2 text-sm text-secondary-500">{balance.user?.email}</td>
              <td className="px-3 py-2 text-sm text-secondary-900">
                ₨{balance.balancePkr?.toLocaleString() ?? 0}
              </td>
              <td className="px-3 py-2 text-sm text-secondary-900">
                ₨{balance.totalWithdrawn?.toLocaleString() ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default UserBalancesTable

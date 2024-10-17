import { FC } from 'react'

interface TransactionDetailProps {
  label: string
  value: string | JSX.Element
}

export const TransactionDetail: FC<TransactionDetailProps> = ({
  label,
  value,
}) => (
  <div className="flex flex-col space-y-2">
    <dt className="text-sm font-medium text-gray-600">{label}</dt>
    <dd className="text-sm text-gray-900 break-all">
      {typeof value === 'string' ? (
        <pre className="whitespace-pre-wrap">{value}</pre>
      ) : (
        value
      )}
    </dd>
  </div>
)

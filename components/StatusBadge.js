export default function StatusBadge({ status }) {
  // Define color and label mappings for different statuses
  const statusConfig = {
    draft: {
      bgColor: 'bg-gray-200',
      textColor: 'text-gray-800',
      label: 'Draft'
    },
    pending: {
      bgColor: 'bg-yellow-200',
      textColor: 'text-yellow-800',
      label: 'Pending Approval'
    },
    approved: {
      bgColor: 'bg-green-200',
      textColor: 'text-green-800',
      label: 'Approved'
    },
    published: {
      bgColor: 'bg-blue-200',
      textColor: 'text-blue-800',
      label: 'Published'
    },
    rejected: {
      bgColor: 'bg-red-200',
      textColor: 'text-red-800',
      label: 'Rejected'
    }
  };

  // Default configuration if status is not recognized
  const config = statusConfig[status?.toLowerCase()] || {
    bgColor: 'bg-gray-200',
    textColor: 'text-gray-800',
    label: status || 'Unknown'
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${config.bgColor} ${config.textColor}`}>
      {config.label}
    </span>
  );
} 
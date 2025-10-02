import {
  HashtagIcon,
  DocumentTextIcon,
  ScaleIcon,
  ListBulletIcon,
  NumberedListIcon
} from '@heroicons/react/24/outline'

export const getMetricTypeInfo = (valueType) => {
  const typeMap = {
    numeric: {
      label: 'Numeric',
      icon: HashtagIcon,
      color: 'text-blue-600',
      background: 'bg-blue-50',
      border: 'border-blue-200'
    },
    text: {
      label: 'Text',
      icon: DocumentTextIcon,
      color: 'text-green-600',
      background: 'bg-green-50',
      border: 'border-green-200'
    },
    boolean: {
      label: 'Boolean',
      icon: ScaleIcon,
      color: 'text-purple-600',
      background: 'bg-purple-50',
      border: 'border-purple-200'
    },
    categorical: {
      label: 'Categorical',
      icon: ListBulletIcon,
      color: 'text-orange-600',
      background: 'bg-orange-50',
      border: 'border-orange-200'
    },
    ordinal: {
      label: 'Ordinal',
      icon: NumberedListIcon,
      color: 'text-indigo-600',
      background: 'bg-indigo-50',
      border: 'border-indigo-200'
    }
  }

  return typeMap[valueType] || typeMap.text
}
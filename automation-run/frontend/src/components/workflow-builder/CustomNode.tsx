import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  BoltIcon,
  ClockIcon,
  EnvelopeIcon,
  DocumentIcon,
  ChatBubbleLeftIcon,
  GlobeAltIcon,
  TableCellsIcon,
  CircleStackIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const iconMap: Record<string, any> = {
  webhook: BoltIcon,
  schedule: ClockIcon,
  email_received: EnvelopeIcon,
  form_submission: DocumentIcon,
  send_email: EnvelopeIcon,
  send_telegram: ChatBubbleLeftIcon,
  send_slack: ChatBubbleLeftIcon,
  http_request: GlobeAltIcon,
  google_sheets: TableCellsIcon,
  database: CircleStackIcon,
  if_else: ArrowsRightLeftIcon,
  delay: ClockIcon,
  loop: ArrowPathIcon,
  transform: AdjustmentsHorizontalIcon,
};

const categoryColors: Record<string, { bg: string; border: string; icon: string }> = {
  webhook: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
  schedule: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
  email_received: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
  form_submission: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
  send_email: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
  send_telegram: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
  send_slack: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
  http_request: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
  google_sheets: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
  database: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
  if_else: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600' },
  delay: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600' },
  loop: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600' },
  transform: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600' },
};

const triggerTypes = ['webhook', 'schedule', 'email_received', 'form_submission'];

function CustomNode({ data, selected }: NodeProps) {
  const Icon = iconMap[data.nodeType] || BoltIcon;
  const colors = categoryColors[data.nodeType] || {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'text-gray-600',
  };
  const isTrigger = triggerTypes.includes(data.nodeType);
  const hasMultipleOutputs = data.nodeType === 'if_else';

  return (
    <div
      className={clsx(
        'px-4 py-3 rounded-lg border-2 min-w-[180px] transition-all',
        colors.bg,
        selected ? 'border-primary-500 shadow-lg' : colors.border
      )}
    >
      {/* Input handle (not for triggers) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}

      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            colors.icon,
            colors.bg
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">{data.label}</p>
          <p className="text-xs text-gray-500 capitalize">
            {data.nodeType.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {/* Output handles */}
      {hasMultipleOutputs ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-white !left-[30%]"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-white !left-[70%]"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2 px-2">
            <span>Да</span>
            <span>Нет</span>
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-primary-500 !border-2 !border-white"
        />
      )}
    </div>
  );
}

export default memo(CustomNode);

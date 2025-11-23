import React from 'react';
import { Wifi, WifiOff, AlertCircle, RotateCcw } from 'lucide-react';

const ConnectionStatus = ({ 
  connectionStatus, 
  connectionError, 
  reconnectAttempt, 
  onReconnect,
  className = "",
  showDetails = false 
}) => {
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'Connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'Connected',
          indicator: '🟢'
        };
      case 'Connecting':
        return {
          icon: RotateCcw,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          text: 'Connecting...',
          indicator: '🟡'
        };
      case 'Disconnected':
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Disconnected',
          indicator: '⚪'
        };
      case 'Error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Connection Error',
          indicator: '🔴'
        };
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Unknown',
          indicator: '⚪'
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  if (!showDetails) {
    // Compact version - just indicator and status
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm">{config.indicator}</span>
        <span className={`text-xs font-medium ${config.color}`}>
          {config.text}
        </span>
        {connectionStatus === 'Connecting' && reconnectAttempt > 0 && (
          <span className="text-xs text-gray-400">
            (Attempt {reconnectAttempt})
          </span>
        )}
      </div>
    );
  }

  // Detailed version - full status card
  return (
    <div className={`rounded-lg border p-3 ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconComponent 
            size={16} 
            className={`${config.color} ${connectionStatus === 'Connecting' ? 'animate-spin' : ''}`} 
          />
          <span className={`text-sm font-medium ${config.color}`}>
            {config.text}
          </span>
          <span className="text-sm">{config.indicator}</span>
        </div>
        
        {(connectionStatus === 'Disconnected' || connectionStatus === 'Error') && onReconnect && (
          <button
            onClick={onReconnect}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Reconnect
          </button>
        )}
      </div>
      
      {connectionError && (
        <div className="mt-2 text-xs text-red-600">
          {connectionError}
        </div>
      )}
      
      {connectionStatus === 'Connecting' && reconnectAttempt > 0 && (
        <div className="mt-2 text-xs text-gray-600">
          Reconnection attempt #{reconnectAttempt}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;

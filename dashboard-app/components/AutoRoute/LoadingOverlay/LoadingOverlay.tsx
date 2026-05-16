import CloseIcon from '@mui/icons-material/Close';
import { IconButton, Typography } from '@mui/material';
import { CaloLoader } from 'components';
import { TimerClock } from '../TimerClock/TimerClock';

interface LoadingOverlayProps {
  isRunning: boolean; // controls timer and overlay visibility
  onCancel?: () => void; // callback when user clicks the "X"
  message?: string; // custom message to display
}
export function LoadingOverlay({ isRunning, onCancel, message }: LoadingOverlayProps) {
  if (!isRunning) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.5)', // slightly opaque
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {/* Loader + Cross Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <CaloLoader />

        {onCancel && (
          <IconButton
            onClick={onCancel}
            style={{
              color: '#333',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: 8
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </div>

      <Typography style={{ marginTop: 16, textAlign: 'center', color: '#333' }}>
        {message || 'Routing is Running, Might Take up to 5 minutes...'}
      </Typography>

      <Typography style={{ marginTop: 8, color: '#333' }}>
        Time since routing started: <TimerClock isRunning={isRunning} />
      </Typography>
    </div>
  );
}

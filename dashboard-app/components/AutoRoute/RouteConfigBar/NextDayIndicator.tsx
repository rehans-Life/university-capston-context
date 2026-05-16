import { Tooltip } from '@mui/material';

interface NextDayIndicatorProps {
  isNextDay: boolean;
  time: string;
  shiftStartTime: string;
}

export const NextDayIndicator = ({ isNextDay, time, shiftStartTime }: NextDayIndicatorProps) => {
  if (!isNextDay) return null;

  return (
    <Tooltip
      title={`${time} is next day (after midnight relative to shift start ${shiftStartTime})`}
      arrow
      placement="top"
      componentsProps={{
        tooltip: {
          sx: {
            fontSize: '13px',
            padding: '8px 12px',
            backgroundColor: '#3b82f6',
            '& .MuiTooltip-arrow': {
              color: '#3b82f6'
            }
          }
        }
      }}
    >
      <span
        style={{
          marginLeft: '6px',
          fontSize: '16px',
          color: '#3b82f6',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          fontWeight: 'bold'
        }}
      >
        ⓘ
      </span>
    </Tooltip>
  );
};

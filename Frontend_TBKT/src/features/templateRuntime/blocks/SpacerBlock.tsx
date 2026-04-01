import React from 'react';
import { Box } from '@mui/material';
import { useTemplateRuntimeContext } from '../runtimeContext';

type SpacerUnit = 'px' | 'vh' | 'rem';
type SpacerPreset = 'compact' | 'normal' | 'large' | 'full_screen' | 'custom';

type Props = {
  height?: number;
  unit?: SpacerUnit;
  preset?: SpacerPreset;
};

const PRESET_HEIGHT: Record<SpacerPreset, string> = {
  compact: '12px',
  normal: '24px',
  large: '48px',
  full_screen: '100vh',
  custom: '',
};

export const SpacerBlockConfig = {
  fields: {
    preset: {
      type: 'select' as const,
      label: 'Preset gian cach',
      options: [
        { label: 'Nho', value: 'compact' },
        { label: 'Trung binh', value: 'normal' },
        { label: 'Lon', value: 'large' },
        { label: 'Full man hinh', value: 'full_screen' },
        { label: 'Tu chinh', value: 'custom' },
      ],
    },
    height: { type: 'number' as const, label: 'Chieu cao (chi dung khi Tu chinh)' },
    unit: {
      type: 'select' as const,
      label: 'Don vi',
      options: [
        { label: 'px', value: 'px' },
        { label: 'vh', value: 'vh' },
        { label: 'rem', value: 'rem' },
      ],
    },
  },
  defaultProps: {
    preset: 'normal',
    height: 24,
    unit: 'px',
  },
  render: ({ height, unit, preset }: Props) => {
    const { isRuntime } = useTemplateRuntimeContext();
    const safePreset: SpacerPreset = preset || 'normal';
    const safeUnit: SpacerUnit = unit || 'px';
    const customHeight = `${Math.max(0, Number(height || 0))}${safeUnit}`;
    const finalHeight =
      safePreset === 'custom' ? customHeight : PRESET_HEIGHT[safePreset] || PRESET_HEIGHT.normal;

    return (
      <Box
        sx={{
          height: finalHeight,
          width: '100%',
          border: isRuntime ? 'none' : '1px dashed',
          borderColor: isRuntime ? 'transparent' : 'divider',
          borderRadius: 1,
          opacity: isRuntime ? 1 : 0.35,
        }}
      />
    );
  },
};
